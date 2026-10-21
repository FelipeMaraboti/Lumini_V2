using System.Text.Json;
using Lumini.Application.Catalog.Services;
using Lumini.Application.Common.Interfaces;
using Lumini.Application.Pricing.DTOs;
using Lumini.Application.Projects.Services;
using Lumini.Domain.Audit;
using Lumini.Domain.Projects;

namespace Lumini.Application.Pricing;

public sealed class QuotePreviewService
{
    private static readonly JsonSerializerOptions SnapshotJson = new(JsonSerializerDefaults.Web);

    private readonly IWorkspaceService _workspace;
    private readonly ICatalogService _catalog;
    private readonly IProjectRepository _projects;
    private readonly ITenantContext _tenant;
    private readonly IUserContext _user;

    public QuotePreviewService(
        IWorkspaceService workspace,
        ICatalogService catalog,
        IProjectRepository projects,
        ITenantContext tenant,
        IUserContext user)
    {
        _workspace = workspace;
        _catalog = catalog;
        _projects = projects;
        _tenant = tenant;
        _user = user;
    }

    public async Task<IReadOnlyList<QuotePricingTableResponse>> ListTablesAsync(Guid projectId, CancellationToken ct = default)
    {
        _ = await _workspace.GetProjectAsync(projectId, ct);
        var tables = await _catalog.ListPricingTablesAsync(ct);
        return tables.Select(table => new QuotePricingTableResponse(table.Id, table.Name, table.Currency, table.IsDefault)).ToList();
    }

    public async Task<QuotePreviewResponse> CalculateAsync(
        Guid projectId,
        CalculateQuotePreviewRequest request,
        CancellationToken ct = default)
    {
        if (request.RevisionId == Guid.Empty || request.PricingTableId == Guid.Empty)
            throw new ArgumentException("Revisão e tabela de preços são obrigatórias.");

        var project = await _workspace.GetProjectAsync(projectId, ct);
        var revisions = await _workspace.ListRevisionsAsync(projectId, ct);
        var revision = revisions.FirstOrDefault(item => item.Id == request.RevisionId)
            ?? throw new KeyNotFoundException("A revisão não pertence ao projeto ou não está disponível.");
        var tables = await _catalog.ListPricingTablesAsync(ct);
        var table = tables.FirstOrDefault(item => item.Id == request.PricingTableId)
            ?? throw new KeyNotFoundException("Tabela de preços não encontrada nesta marmoraria.");
        var materials = await _catalog.ListMaterialsAsync(ct);
        var finishes = await _catalog.ListFinishesAsync(ct);

        return QuoteCalculationEngine.Calculate(
            project.Id,
            revision.Id,
            revision.RevisionNumber,
            revision.SnapshotJson,
            table,
            materials,
            finishes);
    }

    public async Task<IReadOnlyList<QuoteDraftResponse>> ListDraftsAsync(Guid projectId, CancellationToken ct = default)
    {
        _ = await _workspace.GetProjectAsync(projectId, ct);
        var quotes = await _projects.ListQuotesAsync(_tenant.RequiredTenantId, projectId, ct);
        return quotes.Select(quote => Map(quote)).ToList();
    }

    public async Task<QuoteDraftResponse> SaveDraftAsync(
        Guid projectId,
        SaveQuoteDraftRequest request,
        string? idempotencyKey,
        string? correlationId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            throw new ArgumentException("O cabeçalho Idempotency-Key é obrigatório.");

        var tenantId = _tenant.RequiredTenantId;
        var key = idempotencyKey.Trim();
        var existing = await _projects.GetQuoteByIdempotencyKeyAsync(tenantId, key, ct);
        if (existing is not null)
        {
            if (existing.ProjectId != projectId || existing.RevisionId != request.RevisionId || existing.PricingTableId != request.PricingTableId)
                throw new InvalidOperationException("Esta chave de idempotência já gravou outro orçamento.");

            return Map(existing, replayed: true);
        }

        var preview = await CalculateAsync(projectId, new CalculateQuotePreviewRequest(request.RevisionId, request.PricingTableId), ct);
        var quote = new Quote(
            tenantId,
            projectId,
            preview.RevisionId,
            preview.RevisionNumber,
            preview.PricingTableId,
            preview.PricingTableVersion,
            preview.Currency,
            key,
            JsonSerializer.Serialize(preview, SnapshotJson));

        await _projects.AddQuoteAsync(quote, ct);
        await _projects.AddAuditAsync(
            new AuditEvent(
                tenantId,
                _user.UserId,
                "quote.draft_saved",
                "Quote",
                quote.Id,
                correlationId,
                JsonSerializer.Serialize(new
                {
                    quote.ProjectId,
                    quote.RevisionId,
                    quote.PricingTableId,
                    preview.HasUnpricedGeometryLines,
                })),
            ct);
        await _projects.SaveChangesAsync(ct);
        return Map(quote);
    }

    private static QuoteDraftResponse Map(Quote quote, bool replayed = false)
    {
        var preview = JsonSerializer.Deserialize<QuotePreviewResponse>(quote.SnapshotJson, SnapshotJson)
            ?? throw new InvalidOperationException("O snapshot do orçamento está ilegível.");

        return new QuoteDraftResponse(
            quote.Id,
            quote.ProjectId,
            quote.RevisionId,
            quote.RevisionNumber,
            quote.PricingTableId,
            preview.PricingTableName,
            quote.Currency,
            quote.Status.ToString(),
            preview.GrossAreaScenarioTotal,
            preview.NetAreaScenarioTotal,
            preview.HasUnpricedGeometryLines,
            quote.Version,
            quote.CreatedAtUtc,
            replayed);
    }
}
