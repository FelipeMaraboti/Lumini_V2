using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using Lumini.Application.Catalog.DTOs;
using Lumini.Application.Common.Interfaces;
using Lumini.Domain.Audit;
using Lumini.Domain.Catalog;
using Lumini.Domain.Common;

namespace Lumini.Application.Catalog.Services;

public interface ICatalogService
{
    Task<IReadOnlyList<MaterialResponse>> ListMaterialsAsync(CancellationToken ct = default);
    Task<MaterialResponse> CreateMaterialAsync(UpsertMaterialRequest request, string? correlationId, CancellationToken ct = default);
    Task<MaterialResponse> UpdateMaterialAsync(Guid materialId, UpsertMaterialRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default);

    Task<IReadOnlyList<FinishResponse>> ListFinishesAsync(CancellationToken ct = default);
    Task<FinishResponse> CreateFinishAsync(UpsertFinishRequest request, string? correlationId, CancellationToken ct = default);
    Task<FinishResponse> UpdateFinishAsync(Guid finishId, UpdateFinishRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default);
    Task<CompatibilityResponse> CheckCompatibilityAsync(CompatibilityRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<PricingTableResponse>> ListPricingTablesAsync(CancellationToken ct = default);
    Task<PricingTableResponse> CreatePricingTableAsync(CreatePricingTableRequest request, string? correlationId, CancellationToken ct = default);
    Task<PricingRuleResponse> AddPricingRuleAsync(Guid tableId, CreatePricingRuleRequest request, string? correlationId, CancellationToken ct = default);
    Task<PricingRuleResponse> UpdatePricingRuleAsync(Guid ruleId, UpdatePricingRuleRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default);
}

public class CatalogService : ICatalogService
{
    private static readonly ConcurrentDictionary<Guid, SemaphoreSlim> SeedLocks = new();

    private readonly ICatalogRepository _repository;
    private readonly ITenantContext _tenant;
    private readonly IUserContext _user;

    public CatalogService(ICatalogRepository repository, ITenantContext tenant, IUserContext user)
    {
        _repository = repository;
        _tenant = tenant;
        _user = user;
    }

    public async Task<IReadOnlyList<MaterialResponse>> ListMaterialsAsync(CancellationToken ct = default)
    {
        await EnsureSeedAsync(null, ct);
        var items = await _repository.ListMaterialsAsync(_tenant.RequiredTenantId, ct);
        return items.Select(ToResponse).ToList();
    }

    public async Task<MaterialResponse> CreateMaterialAsync(UpsertMaterialRequest request, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var name = request.Name.Trim();
        if (await _repository.MaterialNameExistsAsync(tenantId, name, null, ct))
            throw new InvalidOperationException("Já existe um material com esse nome nesta marmoraria.");

        var material = new Material(
            tenantId,
            name,
            Material.ParseKind(request.RockKind),
            Material.ParseDecimal(request.DensityKgPerM3, "Densidade"),
            ParseThicknesses(request.ThicknessesMm),
            request.ColorHex,
            request.TextureName);

        await _repository.AddMaterialAsync(material, ct);
        await AuditAsync(tenantId, "catalog.material.created", "Material", material.Id, correlationId, material.Name, ct);
        await _repository.SaveChangesAsync(ct);
        return ToResponse(material);
    }

    public async Task<MaterialResponse> UpdateMaterialAsync(Guid materialId, UpsertMaterialRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var material = await _repository.GetMaterialAsync(tenantId, materialId, ct)
            ?? throw new KeyNotFoundException("Material não encontrado.");

        var name = request.Name.Trim();
        if (await _repository.MaterialNameExistsAsync(tenantId, name, material.Id, ct))
            throw new InvalidOperationException("Já existe um material com esse nome nesta marmoraria.");

        material.Update(
            name,
            Material.ParseKind(request.RockKind),
            Material.ParseDecimal(request.DensityKgPerM3, "Densidade"),
            ParseThicknesses(request.ThicknessesMm),
            request.ColorHex,
            request.TextureName,
            expectedVersion);

        await AuditAsync(tenantId, "catalog.material.updated", "Material", material.Id, correlationId, material.Name, ct);
        await _repository.SaveChangesAsync(ct);
        return ToResponse(material);
    }

    public async Task<IReadOnlyList<FinishResponse>> ListFinishesAsync(CancellationToken ct = default)
    {
        await EnsureSeedAsync(null, ct);
        var items = await _repository.ListFinishesAsync(_tenant.RequiredTenantId, ct);
        return items.Select(ToResponse).ToList();
    }

    public async Task<FinishResponse> CreateFinishAsync(UpsertFinishRequest request, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var code = FinishType.NormalizeCode(request.Code);
        if (await _repository.FinishCodeExistsAsync(tenantId, code, ct))
            throw new InvalidOperationException("Já existe um acabamento com esse código nesta marmoraria.");

        var finish = new FinishType(
            tenantId,
            code,
            request.Name,
            request.Description,
            request.Profile,
            Material.ParseDecimal(request.MinSlabThicknessMm, "Espessura mínima"),
            isSystem: false);

        await _repository.AddFinishAsync(finish, ct);
        await AuditAsync(tenantId, "catalog.finish.created", "FinishType", finish.Id, correlationId, finish.Code, ct);
        await _repository.SaveChangesAsync(ct);
        return ToResponse(finish);
    }

    public async Task<FinishResponse> UpdateFinishAsync(Guid finishId, UpdateFinishRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var finish = await _repository.GetFinishAsync(tenantId, finishId, ct)
            ?? throw new KeyNotFoundException("Acabamento não encontrado.");

        finish.Update(
            request.Name,
            request.Description,
            Material.ParseDecimal(request.MinSlabThicknessMm, "Espessura mínima"),
            expectedVersion);

        await AuditAsync(tenantId, "catalog.finish.updated", "FinishType", finish.Id, correlationId, finish.Code, ct);
        await _repository.SaveChangesAsync(ct);
        return ToResponse(finish);
    }

    public async Task<CompatibilityResponse> CheckCompatibilityAsync(CompatibilityRequest request, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var finish = await _repository.GetFinishAsync(tenantId, request.FinishId, ct)
            ?? throw new KeyNotFoundException("Acabamento não encontrado.");

        var thickness = Material.ParseDecimal(request.ThicknessMm, "Espessura");
        var compatible = finish.AcceptsThickness(thickness);
        var message = compatible
            ? $"{finish.Name} aceita chapa de {thickness.ToString(CultureInfo.InvariantCulture)} mm."
            : $"{finish.Name} exige chapa de pelo menos {finish.MinSlabThicknessMm.ToString(CultureInfo.InvariantCulture)} mm.";

        return new CompatibilityResponse(compatible, thickness, finish.MinSlabThicknessMm, finish.Code, finish.Name, message);
    }

    public async Task<IReadOnlyList<PricingTableResponse>> ListPricingTablesAsync(CancellationToken ct = default)
    {
        await EnsureSeedAsync(null, ct);
        var tenantId = _tenant.RequiredTenantId;
        var tables = await _repository.ListPricingTablesAsync(tenantId, ct);
        var result = new List<PricingTableResponse>();
        foreach (var table in tables)
        {
            var rules = await _repository.ListPricingRulesAsync(tenantId, table.Id, ct);
            result.Add(ToResponse(table, rules));
        }

        return result;
    }

    public async Task<PricingTableResponse> CreatePricingTableAsync(CreatePricingTableRequest request, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var table = new PricingTable(tenantId, request.Name, isDefault: false);
        await _repository.AddPricingTableAsync(table, ct);
        await AuditAsync(tenantId, "catalog.pricing-table.created", "PricingTable", table.Id, correlationId, table.Name, ct);
        await _repository.SaveChangesAsync(ct);
        return ToResponse(table, Array.Empty<PricingRule>());
    }

    public async Task<PricingRuleResponse> AddPricingRuleAsync(Guid tableId, CreatePricingRuleRequest request, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var table = await _repository.GetPricingTableAsync(tenantId, tableId, ct)
            ?? throw new KeyNotFoundException("Tabela de preços não encontrada.");

        if (request.MaterialId.HasValue)
        {
            _ = await _repository.GetMaterialAsync(tenantId, request.MaterialId.Value, ct)
                ?? throw new KeyNotFoundException("Material não encontrado nesta marmoraria.");
        }

        if (request.FinishTypeId.HasValue)
        {
            _ = await _repository.GetFinishAsync(tenantId, request.FinishTypeId.Value, ct)
                ?? throw new KeyNotFoundException("Acabamento não encontrado nesta marmoraria.");
        }

        var rule = new PricingRule(
            tenantId,
            table.Id,
            request.MaterialId,
            request.FinishTypeId,
            PricingRule.ParseBasis(request.Basis),
            Material.ParseDecimal(request.UnitPrice, "Preço"));

        await _repository.AddPricingRuleAsync(rule, ct);
        await AuditAsync(tenantId, "catalog.pricing-rule.created", "PricingRule", rule.Id, correlationId, table.Name, ct);
        await _repository.SaveChangesAsync(ct);
        return ToResponse(rule);
    }

    public async Task<PricingRuleResponse> UpdatePricingRuleAsync(Guid ruleId, UpdatePricingRuleRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var rule = await _repository.GetPricingRuleAsync(tenantId, ruleId, ct)
            ?? throw new KeyNotFoundException("Regra de preço não encontrada.");

        rule.ChangePrice(Material.ParseDecimal(request.UnitPrice, "Preço"), expectedVersion);
        await AuditAsync(tenantId, "catalog.pricing-rule.updated", "PricingRule", rule.Id, correlationId, rule.UnitPrice.ToString(CultureInfo.InvariantCulture), ct);
        await _repository.SaveChangesAsync(ct);
        return ToResponse(rule);
    }

    private async Task EnsureSeedAsync(string? correlationId, CancellationToken ct)
    {
        var tenantId = _tenant.RequiredTenantId;
        var gate = SeedLocks.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            await SeedCoreAsync(tenantId, correlationId, ct);
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task SeedCoreAsync(Guid tenantId, string? correlationId, CancellationToken ct)
    {
        var changed = false;

        if (await _repository.CountFinishesAsync(tenantId, ct) == 0)
        {
            foreach (var definition in FinishCatalog.Traditional)
            {
                await _repository.AddFinishAsync(new FinishType(tenantId, definition, isSystem: true), ct);
            }

            changed = true;
        }

        if (await _repository.CountPricingTablesAsync(tenantId, ct) == 0)
        {
            await _repository.AddPricingTableAsync(new PricingTable(tenantId, "Tabela padrão", isDefault: true), ct);
            changed = true;
        }

        if (changed)
        {
            await AuditAsync(tenantId, "catalog.seeded", "Catalog", tenantId, correlationId, "seed", ct);
            await _repository.SaveChangesAsync(ct);
        }
    }

    private Task AuditAsync(Guid tenantId, string action, string resourceType, Guid resourceId, string? correlationId, string label, CancellationToken ct)
    {
        var metadata = JsonSerializer.Serialize(new { label });
        return _repository.AddAuditAsync(
            new AuditEvent(tenantId, _user.UserId, action, resourceType, resourceId, correlationId, metadata),
            ct);
    }

    private static IEnumerable<decimal> ParseThicknesses(IReadOnlyList<string> values)
    {
        if (values is null || values.Count == 0)
            throw new ArgumentException("Informe ao menos uma espessura em milímetros.");

        return values.Select(v => Material.ParseDecimal(v, "Espessura"));
    }

    private static MaterialResponse ToResponse(Material material) => new(
        material.Id,
        material.Name,
        material.RockKind.ToString(),
        material.DensityKgPerM3,
        material.ThicknessesMm.OrderBy(t => t).ToList(),
        material.ColorHex,
        material.TextureName,
        material.Status.ToString(),
        material.Version);

    private static FinishResponse ToResponse(FinishType finish) => new(
        finish.Id,
        finish.Code,
        finish.Name,
        finish.Description,
        finish.Profile,
        finish.MinSlabThicknessMm,
        finish.IsSystem,
        finish.Status.ToString(),
        finish.Version);

    private static PricingRuleResponse ToResponse(PricingRule rule) => new(
        rule.Id,
        rule.PricingTableId,
        rule.MaterialId,
        rule.FinishTypeId,
        rule.Basis.ToString(),
        rule.UnitPrice,
        rule.Version);

    private static PricingTableResponse ToResponse(PricingTable table, IReadOnlyList<PricingRule> rules) => new(
        table.Id,
        table.Name,
        table.Currency,
        table.IsDefault,
        table.Version,
        rules.Select(ToResponse).ToList());
}
