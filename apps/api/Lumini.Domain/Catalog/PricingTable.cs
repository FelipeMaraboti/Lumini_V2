using Lumini.Domain.Common;

namespace Lumini.Domain.Catalog;

public class PricingTable : Entity, ITenantScoped
{
    public const string CurrencyBrl = "BRL";

    public Guid TenantId { get; set; }
    public string Name { get; private set; } = string.Empty;
    public string Currency { get; private set; } = CurrencyBrl;
    public bool IsDefault { get; private set; }
    public CatalogStatus Status { get; private set; } = CatalogStatus.Active;

    protected PricingTable() { }

    public PricingTable(Guid tenantId, string name, bool isDefault)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome da tabela de preços é obrigatório.", nameof(name));

        TenantId = tenantId;
        Name = name.Trim();
        Currency = CurrencyBrl;
        IsDefault = isDefault;
    }

    public void Rename(string name, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome da tabela de preços é obrigatório.", nameof(name));

        Name = name.Trim();
        MarkUpdated();
    }

    public void EnsureVersion(uint expectedVersion)
    {
        if (expectedVersion != Version)
            throw new ResourceConflictException(Version);
    }
}
