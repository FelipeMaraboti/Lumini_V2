namespace Lumini.Application.Pricing.DTOs;

public record CalculateQuotePreviewRequest(Guid RevisionId, Guid PricingTableId);

public record QuotePricingTableResponse(Guid Id, string Name, string Currency, bool IsDefault);

public record QuotePreviewLineResponse(
    string PartId,
    string PartCode,
    string Category,
    string Description,
    string Unit,
    decimal Quantity,
    decimal? UnitPrice,
    decimal? GrossAmount,
    decimal? NetAmount,
    string Status);

public record QuotePreviewWarning(string Code, string Message);

public record QuotePreviewResponse(
    Guid ProjectId,
    Guid RevisionId,
    int RevisionNumber,
    Guid PricingTableId,
    string PricingTableName,
    uint PricingTableVersion,
    string Currency,
    decimal? GrossMaterialSubtotal,
    decimal? NetMaterialSubtotal,
    decimal? FinishSubtotal,
    decimal? GrossAreaScenarioTotal,
    decimal? NetAreaScenarioTotal,
    IReadOnlyList<QuotePreviewLineResponse> Lines,
    IReadOnlyList<QuotePreviewWarning> Warnings,
    bool HasUnpricedGeometryLines);
