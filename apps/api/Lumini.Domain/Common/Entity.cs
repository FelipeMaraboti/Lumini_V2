namespace Lumini.Domain.Common;

/// <summary>
/// Contrato de domínio para entidades restritas ao escopo de um Tenant (RN-001).
/// Nenhuma entidade com esta interface pode ser lida ou persistida sem validação de tenant_id.
/// </summary>
public interface ITenantScoped
{
    Guid TenantId { get; set; }
}

public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; protected set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; protected set; }
    public uint Version { get; protected set; } = 1; // Token de concorrência otimista (RN-013)

    public void MarkUpdated()
    {
        UpdatedAtUtc = DateTime.UtcNow;
        Version++;
    }
}
