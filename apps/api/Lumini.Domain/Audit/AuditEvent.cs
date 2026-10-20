using Lumini.Domain.Common;

namespace Lumini.Domain.Audit;

/// <summary>
/// Evento append-only (RN-015). A aplicação não atualiza nem remove registros.
/// </summary>
public class AuditEvent : ITenantScoped
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid? ActorUserId { get; private set; }
    public string Action { get; private set; } = string.Empty;
    public string ResourceType { get; private set; } = string.Empty;
    public Guid ResourceId { get; private set; }
    public string? CorrelationId { get; private set; }
    public string MetadataJson { get; private set; } = "{}";
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;

    protected AuditEvent() { }

    public AuditEvent(
        Guid tenantId,
        Guid? actorUserId,
        string action,
        string resourceType,
        Guid resourceId,
        string? correlationId,
        string metadataJson)
    {
        TenantId = tenantId;
        ActorUserId = actorUserId;
        Action = action;
        ResourceType = resourceType;
        ResourceId = resourceId;
        CorrelationId = correlationId;
        MetadataJson = string.IsNullOrWhiteSpace(metadataJson) ? "{}" : metadataJson;
    }
}
