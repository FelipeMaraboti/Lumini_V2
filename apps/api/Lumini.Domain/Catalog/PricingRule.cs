using Lumini.Domain.Common;

namespace Lumini.Domain.Catalog;

public class PricingRule : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid PricingTableId { get; private set; }
    public Guid? MaterialId { get; private set; }
    public Guid? FinishTypeId { get; private set; }
    public PriceBasis Basis { get; private set; }
    public decimal UnitPrice { get; private set; }

    protected PricingRule() { }

    public PricingRule(Guid tenantId, Guid pricingTableId, Guid? materialId, Guid? finishTypeId, PriceBasis basis, decimal unitPrice)
    {
        if (pricingTableId == Guid.Empty)
            throw new ArgumentException("A tabela de preços é obrigatória.", nameof(pricingTableId));

        var hasMaterial = materialId.HasValue && materialId.Value != Guid.Empty;
        var hasFinish = finishTypeId.HasValue && finishTypeId.Value != Guid.Empty;
        if (hasMaterial == hasFinish)
            throw new ArgumentException("A regra deve referenciar um material ou um acabamento.");

        if (hasMaterial && basis != PriceBasis.SquareMeter)
            throw new ArgumentException("Material é precificado por metro quadrado.");

        if (hasFinish && basis != PriceBasis.LinearMeter)
            throw new ArgumentException("Acabamento é precificado por metro linear.");

        if (unitPrice < 0)
            throw new ArgumentException("O preço não pode ser negativo.", nameof(unitPrice));

        var money = decimal.Round(unitPrice, 2, MidpointRounding.AwayFromZero);
        if (money != unitPrice)
            throw new ArgumentException("O preço deve ter no máximo duas casas decimais.", nameof(unitPrice));

        TenantId = tenantId;
        PricingTableId = pricingTableId;
        MaterialId = hasMaterial ? materialId : null;
        FinishTypeId = hasFinish ? finishTypeId : null;
        Basis = basis;
        UnitPrice = money;
    }

    public void ChangePrice(decimal unitPrice, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        if (unitPrice < 0)
            throw new ArgumentException("O preço não pode ser negativo.", nameof(unitPrice));

        var money = decimal.Round(unitPrice, 2, MidpointRounding.AwayFromZero);
        if (money != unitPrice)
            throw new ArgumentException("O preço deve ter no máximo duas casas decimais.", nameof(unitPrice));

        UnitPrice = money;
        MarkUpdated();
    }

    public static PriceBasis ParseBasis(string value)
    {
        if (!Enum.TryParse<PriceBasis>(value, ignoreCase: true, out var basis))
            throw new ArgumentException("A base de preço deve ser SquareMeter ou LinearMeter.", nameof(value));

        return basis;
    }

    public void EnsureVersion(uint expectedVersion)
    {
        if (expectedVersion != Version)
            throw new ResourceConflictException(Version);
    }
}
