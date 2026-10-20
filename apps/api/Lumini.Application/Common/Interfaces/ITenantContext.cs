namespace Lumini.Application.Common.Interfaces;

/// <summary>
/// Provedor do contexto seguro de Tenant resolvido no servidor (RN-001, RN-002, AGENTS.md).
/// O tenant_id é derivado estritamente do token do usuário autenticado, nunca do payload da requisição.
/// </summary>
public interface ITenantContext
{
    Guid? TenantId { get; }
    bool HasTenant => TenantId.HasValue && TenantId.Value != Guid.Empty;
    Guid RequiredTenantId => TenantId ?? throw new UnauthorizedAccessException("TenantContext não resolvido ou inválido.");
}
