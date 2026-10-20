using System.Text.Json;
using Lumini.Application.Catalog.DTOs;
using Lumini.Application.Pricing.DTOs;

namespace Lumini.Application.Pricing;

public static class QuoteCalculationEngine
{
    private const decimal SquareMillimetersPerSquareMeter = 1_000_000m;
    private const decimal MillimetersPerMeter = 1_000m;
    private const decimal Pi = 3.1415926535897932384626433833m;
    private const string CommercialPolicyWarning = "Esta prévia não aplica impostos, margens, descontos, frete, instalação ou insumos adicionais.";

    private static readonly JsonSerializerOptions SnapshotJsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly IReadOnlyDictionary<string, string> FinishCatalogCodes = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["straight_polish"] = "polimento-simples",
        ["miter_45"] = "meia-esquadria-45",
        ["bullnose"] = "boleado",
        ["half_bullnose"] = "meia-cana",
        ["bevel"] = "bisote-reto",
        ["italian_recess"] = "rebaixo-italiano",
        ["american_recess"] = "rebaixo-americano",
    };

    public static QuotePreviewResponse Calculate(
        Guid projectId,
        Guid revisionId,
        int revisionNumber,
        string snapshotJson,
        PricingTableResponse pricingTable,
        IReadOnlyList<MaterialResponse> materials,
        IReadOnlyList<FinishResponse> finishes)
    {
        try
        {
            return CalculateCore(projectId, revisionId, revisionNumber, snapshotJson, pricingTable, materials, finishes);
        }
        catch (OverflowException exception)
        {
            throw new ArgumentException("O snapshot contém dimensões fora do intervalo suportado para cálculo.", exception);
        }
    }

    private static QuotePreviewResponse CalculateCore(
        Guid projectId,
        Guid revisionId,
        int revisionNumber,
        string snapshotJson,
        PricingTableResponse pricingTable,
        IReadOnlyList<MaterialResponse> materials,
        IReadOnlyList<FinishResponse> finishes)
    {
        if (projectId == Guid.Empty || revisionId == Guid.Empty || revisionNumber < 1)
            throw new ArgumentException("Projeto e revisão válidos são obrigatórios.");

        if (pricingTable.Id == Guid.Empty || pricingTable.Currency != "BRL")
            throw new ArgumentException("A tabela de preços selecionada não é válida para esta prévia.");

        var snapshot = DeserializeSnapshot(snapshotJson);
        var materialById = materials.ToDictionary(item => item.Id);
        var finishByCode = finishes.ToDictionary(item => item.Code, StringComparer.Ordinal);
        var materialRules = pricingTable.Rules
            .Where(rule => rule.MaterialId.HasValue && rule.Basis == "SquareMeter")
            .GroupBy(rule => rule.MaterialId!.Value)
            .ToDictionary(group => group.Key, UniqueRule);
        var finishRules = pricingTable.Rules
            .Where(rule => rule.FinishTypeId.HasValue && rule.Basis == "LinearMeter")
            .GroupBy(rule => rule.FinishTypeId!.Value)
            .ToDictionary(group => group.Key, UniqueRule);
        var lines = new List<QuotePreviewLineResponse>();
        var warnings = new List<QuotePreviewWarning>
        {
            new("COMMERCIAL_POLICIES_PENDING", CommercialPolicyWarning),
        };
        var grossMaterialSubtotal = 0m;
        var netMaterialSubtotal = 0m;
        var finishSubtotal = 0m;
        var complete = true;
        var unpricedMaterialCount = 0;
        var unpricedFinishCount = 0;
        var holeCount = 0;

        var placedParts = snapshot.Placed ?? throw new ArgumentException("A revisão não possui peças para orçar.");
        foreach (var placed in placedParts)
        {
            var part = placed.Part!;
            var outerContour = part.OuterContour!;
            var innerContours = part.InnerContours!;
            var holes = part.Holes!;
            var edges = part.Edges!;
            var grossAreaMm2 = PolygonArea(outerContour);
            var openingsAreaMm2 = innerContours.Sum(contour => PolygonArea(contour.Points!));
            var holesAreaMm2 = holes.Sum(hole => Pi * hole.DiameterMm * hole.DiameterMm / 4m);
            var netAreaMm2 = Math.Max(0m, grossAreaMm2 - openingsAreaMm2 - holesAreaMm2);
            var grossAreaM2 = grossAreaMm2 / SquareMillimetersPerSquareMeter;
            var netAreaM2 = netAreaMm2 / SquareMillimetersPerSquareMeter;
            holeCount += holes.Count;

            if (!Guid.TryParse(part.MaterialId, out var materialId) || !materialById.TryGetValue(materialId, out var material))
            {
                lines.Add(new QuotePreviewLineResponse(part.Id, part.PartCode, "material", part.MaterialName, "m²", grossAreaM2, null, null, null, "missing_material"));
                warnings.Add(new QuotePreviewWarning("MATERIAL_NOT_IN_CATALOG", $"A peça {part.PartCode} referencia um material ausente do catálogo ativo."));
                complete = false;
            }
            else if (!materialRules.TryGetValue(materialId, out var materialRule))
            {
                lines.Add(new QuotePreviewLineResponse(part.Id, part.PartCode, "material", material.Name, "m²", grossAreaM2, null, null, null, "missing_price"));
                warnings.Add(new QuotePreviewWarning("MATERIAL_PRICE_MISSING", $"Não há regra por m² para o material {material.Name}."));
                unpricedMaterialCount++;
                complete = false;
            }
            else
            {
                var grossAmount = Money(grossAreaM2 * materialRule.UnitPrice);
                var netAmount = Money(netAreaM2 * materialRule.UnitPrice);
                grossMaterialSubtotal += grossAmount;
                netMaterialSubtotal += netAmount;
                lines.Add(new QuotePreviewLineResponse(part.Id, part.PartCode, "material", material.Name, "m²", grossAreaM2, materialRule.UnitPrice, grossAmount, netAmount, "priced"));
            }

            foreach (var edge in edges)
            {
                if (edge.Finish == "raw") continue;
                if (!FinishCatalogCodes.TryGetValue(edge.Finish, out var finishCode))
                {
                    lines.Add(new QuotePreviewLineResponse(part.Id, part.PartCode, "finish", edge.Finish, "m", 0m, null, null, null, "unsupported_finish"));
                    warnings.Add(new QuotePreviewWarning("FINISH_MAPPING_MISSING", $"O acabamento '{edge.Finish}' da peça {part.PartCode} não possui mapeamento de catálogo."));
                    unpricedFinishCount++;
                    complete = false;
                    continue;
                }

                if (edge.Finish == "miter_45" && edge.SkirtHeightMm is > 0m)
                    finishCode = "meia-esquadria-45-saia";

                if (!finishByCode.TryGetValue(finishCode, out var finish))
                {
                    lines.Add(new QuotePreviewLineResponse(part.Id, part.PartCode, "finish", finishCode, "m", 0m, null, null, null, "missing_catalog_finish"));
                    warnings.Add(new QuotePreviewWarning("FINISH_NOT_IN_CATALOG", $"O acabamento '{finishCode}' não existe no catálogo ativo."));
                    unpricedFinishCount++;
                    complete = false;
                    continue;
                }

                var lengthMm = SegmentLength(outerContour, edge.StartIndex, edge.EndIndex);
                var lengthM = lengthMm / MillimetersPerMeter;
                if (!finishRules.TryGetValue(finish.Id, out var finishRule))
                {
                    lines.Add(new QuotePreviewLineResponse(part.Id, part.PartCode, "finish", finish.Name, "m", lengthM, null, null, null, "missing_price"));
                    warnings.Add(new QuotePreviewWarning("FINISH_PRICE_MISSING", $"Não há regra por metro linear para o acabamento {finish.Name}."));
                    unpricedFinishCount++;
                    complete = false;
                    continue;
                }

                var amount = Money(lengthM * finishRule.UnitPrice);
                finishSubtotal += amount;
                lines.Add(new QuotePreviewLineResponse(part.Id, part.PartCode, "finish", finish.Name, "m", lengthM, finishRule.UnitPrice, amount, amount, "priced"));
            }
        }

        if (holeCount > 0)
        {
            warnings.Add(new QuotePreviewWarning("HOLE_PRICING_NOT_CONFIGURED", $"A prévia contém {holeCount} furo(s), mas o catálogo atual não possui regra de preço para furação."));
            complete = false;
        }

        if (unpricedMaterialCount > 0)
            warnings.Add(new QuotePreviewWarning("MATERIAL_LINES_UNPRICED", $"{unpricedMaterialCount} linha(s) de material não têm preço e foram excluídas dos subtotais calculados."));
        if (unpricedFinishCount > 0)
            warnings.Add(new QuotePreviewWarning("FINISH_LINES_UNPRICED", $"{unpricedFinishCount} linha(s) de acabamento não têm preço e foram excluídas dos subtotais calculados."));

        decimal? grossTotal = complete ? Money(grossMaterialSubtotal + finishSubtotal) : null;
        decimal? netTotal = complete ? Money(netMaterialSubtotal + finishSubtotal) : null;

        return new QuotePreviewResponse(
            projectId,
            revisionId,
            revisionNumber,
            pricingTable.Id,
            pricingTable.Name,
            pricingTable.Version,
            pricingTable.Currency,
            Money(grossMaterialSubtotal),
            Money(netMaterialSubtotal),
            Money(finishSubtotal),
            grossTotal,
            netTotal,
            lines,
            warnings,
            !complete);
    }

    private static PricingRuleResponse UniqueRule(IGrouping<Guid, PricingRuleResponse> group)
    {
        var rules = group.ToList();
        if (rules.Count != 1)
            throw new InvalidOperationException("A tabela possui regras de preço duplicadas para o mesmo material ou acabamento.");
        return rules[0];
    }

    private static DrawingSnapshot DeserializeSnapshot(string snapshotJson)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(snapshotJson))
                throw new ArgumentException("O snapshot da revisão está vazio.");

            using var document = JsonDocument.Parse(snapshotJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                !document.RootElement.TryGetProperty("schemaVersion", out var schemaVersion) ||
                !schemaVersion.TryGetInt32(out var version) || version != 1)
                throw new ArgumentException("A revisão não usa uma versão de desenho compatível com o cálculo.");

            var snapshot = JsonSerializer.Deserialize<DrawingSnapshot>(snapshotJson, SnapshotJsonOptions)
                ?? throw new ArgumentException("O snapshot da revisão está vazio.");
            if (snapshot.Placed is null || snapshot.Placed.Count == 0)
                throw new ArgumentException("A revisão não possui peças para orçar.");
            if (snapshot.Placed.Any(item => item is null))
                throw new ArgumentException("O snapshot contém uma peça vazia.");

            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (var item in snapshot.Placed)
            {
                if (item.Part is null || string.IsNullOrWhiteSpace(item.Part.Id) || !ids.Add(item.Part.Id))
                    throw new ArgumentException("O snapshot contém peça inválida ou identificador duplicado.");
                if (string.IsNullOrWhiteSpace(item.Part.PartCode) || string.IsNullOrWhiteSpace(item.Part.MaterialId))
                    throw new ArgumentException("Cada peça precisa de código e material associados.");
                if (item.Part.OuterContour is null || item.Part.OuterContour.Count < 3)
                    throw new ArgumentException($"A peça {item.Part.PartCode} não possui contorno externo válido.");
                if (item.Part.OuterContour.Any(point => point is null))
                    throw new ArgumentException($"A peça {item.Part.PartCode} possui ponto externo inválido.");
                if (item.Part.Edges is null || item.Part.InnerContours is null || item.Part.Holes is null)
                    throw new ArgumentException($"A peça {item.Part.PartCode} possui coleções geométricas inválidas.");
                if (item.Part.Edges.Any(edge => edge is null || string.IsNullOrWhiteSpace(edge.Finish)))
                    throw new ArgumentException($"A peça {item.Part.PartCode} possui borda inválida.");
                if (item.Part.InnerContours.Any(contour => contour is null || contour.Points is null || contour.Points.Count < 3 || contour.Points.Any(point => point is null)))
                    throw new ArgumentException($"A peça {item.Part.PartCode} possui recorte interno inválido.");
                foreach (var edge in item.Part.Edges)
                {
                    if (edge.StartIndex < 0 || edge.EndIndex < 0 || edge.StartIndex >= item.Part.OuterContour.Count || edge.EndIndex >= item.Part.OuterContour.Count)
                        throw new ArgumentException($"A peça {item.Part.PartCode} possui uma borda com índices inválidos.");
                }
                if (item.Part.Holes.Any(hole => hole is null || hole.DiameterMm <= 0m))
                    throw new ArgumentException($"A peça {item.Part.PartCode} possui diâmetro de furo inválido.");
            }
            return snapshot;
        }
        catch (JsonException exception)
        {
            throw new ArgumentException("O snapshot da revisão contém JSON inválido.", exception);
        }
        catch (OverflowException exception)
        {
            throw new ArgumentException("O snapshot da revisão contém dimensões fora do intervalo suportado.", exception);
        }
    }

    private static decimal PolygonArea(IReadOnlyList<PointSnapshot> points)
    {
        if (points.Count < 3) throw new ArgumentException("Um contorno interno precisa de pelo menos três pontos.");
        var twiceArea = 0m;
        for (var index = 0; index < points.Count; index++)
        {
            var current = points[index];
            var next = points[(index + 1) % points.Count];
            twiceArea += current.X * next.Y - next.X * current.Y;
        }
        var area = Math.Abs(twiceArea) / 2m;
        if (area <= 0m) throw new ArgumentException("A geometria contém um contorno sem área.");
        return area;
    }

    private static decimal SegmentLength(IReadOnlyList<PointSnapshot> points, int startIndex, int endIndex)
    {
        var start = points[startIndex];
        var end = points[endIndex];
        var deltaX = start.X - end.X;
        var deltaY = start.Y - end.Y;
        var length = DecimalSqrt(deltaX * deltaX + deltaY * deltaY);
        if (length <= 0m) throw new ArgumentException("A geometria contém uma borda sem comprimento.");
        return length;
    }

    private static decimal DecimalSqrt(decimal value)
    {
        if (value < 0m) throw new ArgumentOutOfRangeException(nameof(value));
        if (value == 0m) return 0m;

        var estimate = value >= 1m ? value : 1m;
        for (var iteration = 0; iteration < 64; iteration++)
        {
            var next = (estimate + value / estimate) / 2m;
            if (next == estimate) return next;
            estimate = next;
        }
        return estimate;
    }

    private static decimal Money(decimal amount) => decimal.Round(amount, 2, MidpointRounding.AwayFromZero);

    private sealed record DrawingSnapshot(List<PlacedPartSnapshot>? Placed);
    private sealed record PlacedPartSnapshot(decimal XMm, decimal YMm, PartSnapshot? Part);
    private sealed record PartSnapshot(
        string Id,
        string PartCode,
        string MaterialId,
        string MaterialName,
        List<PointSnapshot> OuterContour,
        List<EdgeSnapshot>? Edges,
        List<HoleSnapshot>? Holes,
        List<ContourSnapshot>? InnerContours);
    private sealed record PointSnapshot(decimal X, decimal Y);
    private sealed record EdgeSnapshot(int StartIndex, int EndIndex, string Finish, decimal? SkirtHeightMm);
    private sealed record HoleSnapshot(decimal DiameterMm);
    private sealed record ContourSnapshot(List<PointSnapshot> Points);
}
