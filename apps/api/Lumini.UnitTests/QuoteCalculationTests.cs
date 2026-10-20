using Lumini.Application.Catalog.DTOs;
using Lumini.Application.Pricing;
using Lumini.Domain.Identity;
using Xunit;

namespace Lumini.UnitTests;

public class QuoteCalculationTests
{
    private static readonly Guid ProjectId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid RevisionId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid TableId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid MaterialId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid FinishId = Guid.Parse("55555555-5555-5555-5555-555555555555");

    [Fact]
    public void CalculatesGrossAndNetMaterialScenariosAndFinishWithExactDecimalAmounts()
    {
        var result = QuoteCalculationEngine.Calculate(
            ProjectId,
            RevisionId,
            2,
            Snapshot,
            Table([Rule(MaterialId, null, "SquareMeter", 100m), Rule(null, FinishId, "LinearMeter", 20m)]),
            [MaterialItem()],
            [FinishItem()]);

        Assert.Equal(50m, result.GrossMaterialSubtotal);
        Assert.Equal(48m, result.NetMaterialSubtotal);
        Assert.Equal(20m, result.FinishSubtotal);
        Assert.Equal(70m, result.GrossAreaScenarioTotal);
        Assert.Equal(68m, result.NetAreaScenarioTotal);
        Assert.False(result.HasUnpricedGeometryLines);
        Assert.Contains(result.Lines, line => line.Category == "finish" && line.Quantity == 1m && line.Status == "priced");
        Assert.Contains(result.Warnings, warning => warning.Code == "COMMERCIAL_POLICIES_PENDING");
    }

    [Fact]
    public void MissingPriceRuleMakesScenarioTotalsUnavailableInsteadOfZeroPriced()
    {
        var result = QuoteCalculationEngine.Calculate(
            ProjectId,
            RevisionId,
            1,
            Snapshot,
            Table([]),
            [MaterialItem()],
            [FinishItem()]);

        Assert.Null(result.GrossAreaScenarioTotal);
        Assert.Null(result.NetAreaScenarioTotal);
        Assert.True(result.HasUnpricedGeometryLines);
        Assert.Contains(result.Warnings, warning => warning.Code == "MATERIAL_PRICE_MISSING");
        Assert.Contains(result.Warnings, warning => warning.Code == "FINISH_PRICE_MISSING");
    }

    [Fact]
    public void HoleWithoutConfiguredPriceIsReportedAndPreventsCompleteTotal()
    {
        var snapshotWithHole = Snapshot.Replace("\"holes\": [],", "\"holes\": [{\"diameterMm\":35}],");
        var result = QuoteCalculationEngine.Calculate(
            ProjectId,
            RevisionId,
            1,
            snapshotWithHole,
            Table([Rule(MaterialId, null, "SquareMeter", 100m), Rule(null, FinishId, "LinearMeter", 20m)]),
            [MaterialItem()],
            [FinishItem()]);

        Assert.True(result.HasUnpricedGeometryLines);
        Assert.Contains(result.Warnings, warning => warning.Code == "HOLE_PRICING_NOT_CONFIGURED");
        Assert.NotNull(result.NetMaterialSubtotal);
    }

    [Fact]
    public void RejectsUnsupportedGeometrySchema()
    {
        Assert.Throws<ArgumentException>(() => QuoteCalculationEngine.Calculate(
            ProjectId,
            RevisionId,
            1,
            "{\"schemaVersion\":2,\"placed\":[]}",
            Table([]),
            [MaterialItem()],
            [FinishItem()]));
    }

    private static PricingTableResponse Table(IReadOnlyList<PricingRuleResponse> rules) =>
        new(TableId, "Tabela de teste", "BRL", true, 7, rules);

    private static PricingRuleResponse Rule(Guid? materialId, Guid? finishId, string basis, decimal price) =>
        new(Guid.NewGuid(), TableId, materialId, finishId, basis, price, 1);

    private static MaterialResponse MaterialItem() =>
        new(MaterialId, "Quartzito", "Quartzite", 2700m, [20m], "#FFFFFF", null, "Active", 1);

    private static FinishResponse FinishItem() =>
        new(FinishId, "meia-esquadria-45-saia", "Meia-esquadria com saia", "Teste", "miter-45-skirt", 20m, true, "Active", 1);

    private const string Snapshot = """
    {
      "schemaVersion": 1,
      "placed": [{
        "xMm": 0,
        "yMm": 0,
        "part": {
          "id": "part-1",
          "partCode": "BC-01",
          "name": "Bancada",
          "materialId": "44444444-4444-4444-4444-444444444444",
          "materialName": "Quartzito",
          "thicknessMm": 20,
          "outerContour": [{"x":0,"y":0},{"x":1000,"y":0},{"x":1000,"y":500},{"x":0,"y":500}],
          "edges": [
            {"id":"e1","startIndex":0,"endIndex":1,"lengthMm":1,"finish":"miter_45","skirtHeightMm":30},
            {"id":"e2","startIndex":1,"endIndex":2,"lengthMm":1,"finish":"raw"},
            {"id":"e3","startIndex":2,"endIndex":3,"lengthMm":1,"finish":"raw"},
            {"id":"e4","startIndex":3,"endIndex":0,"lengthMm":1,"finish":"raw"}
          ],
          "holes": [],
          "innerContours": [{"id":"cut-1","points":[{"x":100,"y":100},{"x":300,"y":100},{"x":300,"y":200},{"x":100,"y":200}]}]
        }
      }],
      "dimensionState": {}
    }
    """;
}
