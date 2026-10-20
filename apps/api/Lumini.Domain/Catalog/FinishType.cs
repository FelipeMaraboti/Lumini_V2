using Lumini.Domain.Common;

namespace Lumini.Domain.Catalog;

public class FinishType : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Profile { get; private set; } = string.Empty;
    public decimal MinSlabThicknessMm { get; private set; }
    public bool IsSystem { get; private set; }
    public CatalogStatus Status { get; private set; } = CatalogStatus.Active;

    protected FinishType() { }

    public FinishType(Guid tenantId, FinishDefinition definition, bool isSystem)
        : this(tenantId, definition.Code, definition.Name, definition.Description, definition.Profile, definition.MinSlabThicknessMm, isSystem)
    {
    }

    public FinishType(Guid tenantId, string code, string name, string description, string profile, decimal minSlabThicknessMm, bool isSystem)
    {
        TenantId = tenantId;
        Code = NormalizeCode(code);
        Name = RequireText(name, "O nome do acabamento é obrigatório.");
        Description = RequireText(description, "A descrição do acabamento é obrigatória.");
        Profile = RequireText(profile, "O perfil ilustrativo é obrigatório.");
        MinSlabThicknessMm = RequireThickness(minSlabThicknessMm);
        IsSystem = isSystem;
    }

    public bool AcceptsThickness(decimal thicknessMm)
    {
        if (thicknessMm <= 0)
            throw new ArgumentException("A espessura da chapa deve ser maior que zero.", nameof(thicknessMm));

        return thicknessMm >= MinSlabThicknessMm;
    }

    public void Update(string name, string description, decimal minSlabThicknessMm, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        Name = RequireText(name, "O nome do acabamento é obrigatório.");
        Description = RequireText(description, "A descrição do acabamento é obrigatória.");
        MinSlabThicknessMm = RequireThickness(minSlabThicknessMm);
        MarkUpdated();
    }

    public void EnsureVersion(uint expectedVersion)
    {
        if (expectedVersion != Version)
            throw new ResourceConflictException(Version);
    }

    public static string NormalizeCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("O código do acabamento é obrigatório.", nameof(code));

        var normalized = code.Trim().ToLowerInvariant().Replace(' ', '-');
        if (normalized.Length > 60)
            throw new ArgumentException("O código do acabamento é longo demais.", nameof(code));

        return normalized;
    }

    private static decimal RequireThickness(decimal thicknessMm)
    {
        if (thicknessMm <= 0 || thicknessMm > 80)
            throw new ArgumentException("A espessura mínima deve ser maior que zero e no máximo 80 mm.", nameof(thicknessMm));

        return thicknessMm;
    }

    private static string RequireText(string value, string message)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException(message);

        return value.Trim();
    }
}
