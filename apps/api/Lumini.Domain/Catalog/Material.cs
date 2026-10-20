using System.Globalization;
using Lumini.Domain.Common;

namespace Lumini.Domain.Catalog;

public class Material : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string Name { get; private set; } = string.Empty;
    public RockKind RockKind { get; private set; }
    public decimal DensityKgPerM3 { get; private set; }
    public IReadOnlyCollection<decimal> ThicknessesMm { get; private set; } = Array.Empty<decimal>();
    public string ColorHex { get; private set; } = "#888888";
    public string? TextureName { get; private set; }
    public CatalogStatus Status { get; private set; } = CatalogStatus.Active;

    protected Material() { }

    public Material(
        Guid tenantId,
        string name,
        RockKind rockKind,
        decimal densityKgPerM3,
        IEnumerable<decimal> thicknessesMm,
        string colorHex,
        string? textureName)
    {
        TenantId = tenantId;
        Name = RequireName(name);
        RockKind = rockKind;
        DensityKgPerM3 = RequireDensity(densityKgPerM3);
        ThicknessesMm = NormalizeThicknesses(thicknessesMm);
        ColorHex = NormalizeColor(colorHex);
        TextureName = string.IsNullOrWhiteSpace(textureName) ? null : textureName.Trim();
    }

    public void Update(
        string name,
        RockKind rockKind,
        decimal densityKgPerM3,
        IEnumerable<decimal> thicknessesMm,
        string colorHex,
        string? textureName,
        uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        Name = RequireName(name);
        RockKind = rockKind;
        DensityKgPerM3 = RequireDensity(densityKgPerM3);
        ThicknessesMm = NormalizeThicknesses(thicknessesMm);
        ColorHex = NormalizeColor(colorHex);
        TextureName = string.IsNullOrWhiteSpace(textureName) ? null : textureName.Trim();
        MarkUpdated();
    }

    public void Archive(uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        Status = CatalogStatus.Archived;
        MarkUpdated();
    }

    public bool Supports(FinishType finish) =>
        ThicknessesMm.Any(finish.AcceptsThickness);

    public void EnsureVersion(uint expectedVersion)
    {
        if (expectedVersion != Version)
            throw new ResourceConflictException(Version);
    }

    public static RockKind ParseKind(string value)
    {
        if (!Enum.TryParse<RockKind>(value, ignoreCase: true, out var kind))
            throw new ArgumentException("Tipo de rocha inválido. Use Marble, Granite ou Quartzite.", nameof(value));

        return kind;
    }

    public static decimal ParseDecimal(string value, string field)
    {
        if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed))
            throw new ArgumentException($"{field} inválido.");

        return parsed;
    }

    private static string RequireName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome do material é obrigatório.", nameof(name));

        var trimmed = name.Trim();
        if (trimmed.Length > 150)
            throw new ArgumentException("O nome do material é longo demais.", nameof(name));

        return trimmed;
    }

    private static decimal RequireDensity(decimal density)
    {
        if (density < 1500m || density > 4000m)
            throw new ArgumentException("A densidade deve estar entre 1500 e 4000 kg/m³.", nameof(density));

        return density;
    }

    private static IReadOnlyCollection<decimal> NormalizeThicknesses(IEnumerable<decimal> thicknessesMm)
    {
        var values = new List<decimal>();
        foreach (var thickness in thicknessesMm)
        {
            if (thickness <= 0 || thickness > 80)
                throw new ArgumentException("Cada espessura deve ser maior que zero e no máximo 80 mm.");

            var rounded = decimal.Round(thickness, 1, MidpointRounding.AwayFromZero);
            if (rounded != thickness)
                throw new ArgumentException("A espessura nominal aceita no máximo uma casa decimal, em milímetros.");

            values.Add(rounded);
        }

        values = values.Distinct().OrderBy(t => t).ToList();
        if (values.Count == 0)
            throw new ArgumentException("Informe ao menos uma espessura em milímetros.");

        return values;
    }

    private static string NormalizeColor(string colorHex)
    {
        if (string.IsNullOrWhiteSpace(colorHex))
            throw new ArgumentException("A cor da amostra é obrigatória.", nameof(colorHex));

        var color = colorHex.Trim();
        if (color.Length != 7 || color[0] != '#')
            throw new ArgumentException("A cor deve estar no formato #RRGGBB.", nameof(colorHex));

        return color.ToUpperInvariant();
    }
}
