using Lumini.Application.Catalog.Services;
using Lumini.Application.Pricing.DTOs;
using Lumini.Application.Projects.Services;

namespace Lumini.Application.Pricing;

public sealed class QuotePreviewService
{
    private readonly IWorkspaceService _workspace;
    private readonly ICatalogService _catalog;

    public QuotePreviewService(IWorkspaceService workspace, ICatalogService catalog)
    {
        _workspace = workspace;
        _catalog = catalog;
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
}
