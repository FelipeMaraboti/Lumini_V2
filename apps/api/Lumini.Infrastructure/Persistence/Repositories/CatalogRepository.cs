using Lumini.Application.Common.Interfaces;
using Lumini.Domain.Audit;
using Lumini.Domain.Catalog;
using Lumini.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Lumini.Infrastructure.Persistence.Repositories;

public class CatalogRepository : ICatalogRepository
{
    private readonly LuminiDbContext _context;

    public CatalogRepository(LuminiDbContext context)
    {
        _context = context;
    }

    public Task AddMaterialAsync(Material material, CancellationToken ct = default) =>
        _context.Materials.AddAsync(material, ct).AsTask();

    public Task<Material?> GetMaterialAsync(Guid tenantId, Guid materialId, CancellationToken ct = default) =>
        _context.Materials.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.TenantId == tenantId && m.Id == materialId, ct);

    public async Task<IReadOnlyList<Material>> ListMaterialsAsync(Guid tenantId, CancellationToken ct = default) =>
        await _context.Materials.IgnoreQueryFilters()
            .Where(m => m.TenantId == tenantId && m.Status == CatalogStatus.Active)
            .OrderBy(m => m.Name)
            .ToListAsync(ct);

    public Task<bool> MaterialNameExistsAsync(Guid tenantId, string name, Guid? exceptId, CancellationToken ct = default)
    {
        var normalized = name.Trim().ToLowerInvariant();
        return _context.Materials.IgnoreQueryFilters().AnyAsync(
            m => m.TenantId == tenantId
                 && m.Name.ToLower() == normalized
                 && (exceptId == null || m.Id != exceptId),
            ct);
    }

    public Task AddFinishAsync(FinishType finish, CancellationToken ct = default) =>
        _context.FinishTypes.AddAsync(finish, ct).AsTask();

    public Task<FinishType?> GetFinishAsync(Guid tenantId, Guid finishId, CancellationToken ct = default) =>
        _context.FinishTypes.IgnoreQueryFilters().FirstOrDefaultAsync(f => f.TenantId == tenantId && f.Id == finishId, ct);

    public async Task<IReadOnlyList<FinishType>> ListFinishesAsync(Guid tenantId, CancellationToken ct = default) =>
        await _context.FinishTypes.IgnoreQueryFilters()
            .Where(f => f.TenantId == tenantId && f.Status == CatalogStatus.Active)
            .OrderBy(f => f.Name)
            .ToListAsync(ct);

    public Task<bool> FinishCodeExistsAsync(Guid tenantId, string code, CancellationToken ct = default) =>
        _context.FinishTypes.IgnoreQueryFilters().AnyAsync(f => f.TenantId == tenantId && f.Code == code, ct);

    public Task<int> CountFinishesAsync(Guid tenantId, CancellationToken ct = default) =>
        _context.FinishTypes.IgnoreQueryFilters().CountAsync(f => f.TenantId == tenantId, ct);

    public Task AddPricingTableAsync(PricingTable table, CancellationToken ct = default) =>
        _context.PricingTables.AddAsync(table, ct).AsTask();

    public Task<PricingTable?> GetPricingTableAsync(Guid tenantId, Guid tableId, CancellationToken ct = default) =>
        _context.PricingTables.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == tableId, ct);

    public async Task<IReadOnlyList<PricingTable>> ListPricingTablesAsync(Guid tenantId, CancellationToken ct = default) =>
        await _context.PricingTables.IgnoreQueryFilters()
            .Where(t => t.TenantId == tenantId && t.Status == CatalogStatus.Active)
            .OrderByDescending(t => t.IsDefault)
            .ThenBy(t => t.Name)
            .ToListAsync(ct);

    public Task<int> CountPricingTablesAsync(Guid tenantId, CancellationToken ct = default) =>
        _context.PricingTables.IgnoreQueryFilters().CountAsync(t => t.TenantId == tenantId, ct);

    public Task AddPricingRuleAsync(PricingRule rule, CancellationToken ct = default) =>
        _context.PricingRules.AddAsync(rule, ct).AsTask();

    public Task<PricingRule?> GetPricingRuleAsync(Guid tenantId, Guid ruleId, CancellationToken ct = default) =>
        _context.PricingRules.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Id == ruleId, ct);

    public async Task<IReadOnlyList<PricingRule>> ListPricingRulesAsync(Guid tenantId, Guid tableId, CancellationToken ct = default) =>
        await _context.PricingRules.IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId && r.PricingTableId == tableId)
            .OrderBy(r => r.Basis)
            .ToListAsync(ct);

    public Task AddAuditAsync(AuditEvent auditEvent, CancellationToken ct = default) =>
        _context.AuditEvents.AddAsync(auditEvent, ct).AsTask();

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        try
        {
            return await _context.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ResourceConflictException(0);
        }
    }
}
