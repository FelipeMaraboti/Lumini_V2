using Lumini.Domain.Catalog;
using Lumini.Domain.Common;
using Xunit;

namespace Lumini.UnitTests;

public class CatalogRulesTests
{
    [Fact]
    public void MeiaCana_RejectsSlabThinnerThan30mm()
    {
        var finish = new FinishType(Guid.NewGuid(), FinishCatalog.Traditional.Single(f => f.Code == "meia-cana"), isSystem: true);

        Assert.False(finish.AcceptsThickness(20m));
        Assert.True(finish.AcceptsThickness(30m));
    }

    [Fact]
    public void StraightPolish_Accepts12mmSlab()
    {
        var finish = new FinishType(Guid.NewGuid(), FinishCatalog.Traditional.Single(f => f.Code == "polimento-simples"), isSystem: true);

        Assert.True(finish.AcceptsThickness(12m));
        Assert.False(finish.AcceptsThickness(10m));
    }

    [Fact]
    public void Material_RejectsEmptyThicknessList()
    {
        Assert.Throws<ArgumentException>(() => new Material(
            Guid.NewGuid(),
            "Branco Paraná",
            RockKind.Marble,
            2700m,
            Array.Empty<decimal>(),
            "#F5F5F5",
            "Liso"));
    }

    [Fact]
    public void PricingRule_RejectsFloatLikeMoney()
    {
        Assert.Throws<ArgumentException>(() => new PricingRule(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            null,
            PriceBasis.SquareMeter,
            10.125m));
    }

    [Fact]
    public void PricingRule_StoresExactCentsForMaterialArea()
    {
        var rule = new PricingRule(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            null,
            PriceBasis.SquareMeter,
            189.90m);

        Assert.Equal(189.90m, rule.UnitPrice);
        Assert.Equal(PriceBasis.SquareMeter, rule.Basis);
    }

    [Fact]
    public void PricingRule_RejectsFinishPricedByArea()
    {
        Assert.Throws<ArgumentException>(() => new PricingRule(
            Guid.NewGuid(),
            Guid.NewGuid(),
            null,
            Guid.NewGuid(),
            PriceBasis.SquareMeter,
            40m));
    }

    [Fact]
    public void PricingRule_StoresHolePricePerUnitWithoutMaterialOrFinish()
    {
        var rule = new PricingRule(Guid.NewGuid(), Guid.NewGuid(), null, null, PriceBasis.Unit, 12.50m);

        Assert.Equal(12.50m, rule.UnitPrice);
        Assert.Null(rule.MaterialId);
        Assert.Null(rule.FinishTypeId);
        Assert.Throws<ArgumentException>(() => new PricingRule(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null, PriceBasis.Unit, 10m));
    }

    [Fact]
    public void TraditionalSeed_CoversFactoryProfiles()
    {
        var codes = FinishCatalog.Traditional.Select(f => f.Code).ToHashSet();
        Assert.Contains("rebaixo-italiano", codes);
        Assert.Contains("rebaixo-americano", codes);
        Assert.Contains("meia-esquadria-45", codes);
        Assert.Contains("meia-esquadria-45-saia", codes);
        Assert.Contains("boleado", codes);
        Assert.Contains("meia-cana", codes);
        Assert.Contains("bisote-reto", codes);
        Assert.Contains("polimento-simples", codes);
        Assert.Contains("engrosso-saia", codes);
    }
}
