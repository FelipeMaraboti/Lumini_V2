using Lumini.Domain.Catalog;

namespace Lumini.Application.Common.Interfaces;

public interface ICatalogRepository
{
    Task AddMaterialAsync(Material material, CancellationToken ct = default);
    Task<Material?> GetMaterialAsync(Guid tenantId, Guid materialId, CancellationToken ct = default);
    Task<IReadOnlyList<Material>> ListMaterialsAsync(Guid tenantId, CancellationToken ct = default);
    Task<bool> MaterialNameExistsAsync(Guid tenantId, string name, Guid? exceptId, CancellationToken ct = default);

    Task AddFinishAsync(FinishType finish, CancellationToken ct = default);
    Task<FinishType?> GetFinishAsync(Guid tenantId, Guid finishId, CancellationToken ct = default);
    Task<IReadOnlyList<FinishType>> ListFinishesAsync(Guid tenantId, CancellationToken ct = default);
    Task<bool> FinishCodeExistsAsync(Guid tenantId, string code, CancellationToken ct = default);
    Task<int> CountFinishesAsync(Guid tenantId, CancellationToken ct = default);

    Task AddPricingTableAsync(PricingTable table, CancellationToken ct = default);
    Task<PricingTable?> GetPricingTableAsync(Guid tenantId, Guid tableId, CancellationToken ct = default);
    Task<IReadOnlyList<PricingTable>> ListPricingTablesAsync(Guid tenantId, CancellationToken ct = default);
    Task<int> CountPricingTablesAsync(Guid tenantId, CancellationToken ct = default);

    Task AddPricingRuleAsync(PricingRule rule, CancellationToken ct = default);
    Task<PricingRule?> GetPricingRuleAsync(Guid tenantId, Guid ruleId, CancellationToken ct = default);
    Task<IReadOnlyList<PricingRule>> ListPricingRulesAsync(Guid tenantId, Guid tableId, CancellationToken ct = default);

    Task AddAuditAsync(Lumini.Domain.Audit.AuditEvent auditEvent, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
