using Lumini.Domain.Common;

namespace Lumini.Domain.Projects;

/// <summary>
/// Rascunho de orçamento. O cálculo fica congelado no snapshot; aprovação comercial ainda não existe.
/// </summary>
public class Quote : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; private set; }
    public Guid RevisionId { get; private set; }
    public int RevisionNumber { get; private set; }
    public Guid PricingTableId { get; private set; }
    public uint PricingTableVersion { get; private set; }
    public string Currency { get; private set; } = string.Empty;
    public string IdempotencyKey { get; private set; } = string.Empty;
    public string SnapshotJson { get; private set; } = string.Empty;
    public QuoteStatus Status { get; private set; } = QuoteStatus.Draft;

    protected Quote() { }

    public Quote(
        Guid tenantId,
        Guid projectId,
        Guid revisionId,
        int revisionNumber,
        Guid pricingTableId,
        uint pricingTableVersion,
        string currency,
        string idempotencyKey,
        string snapshotJson)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("O tenant é obrigatório.", nameof(tenantId));
        if (projectId == Guid.Empty)
            throw new ArgumentException("O projeto é obrigatório.", nameof(projectId));
        if (revisionId == Guid.Empty)
            throw new ArgumentException("A revisão é obrigatória.", nameof(revisionId));
        if (revisionNumber < 1)
            throw new ArgumentException("A revisão precisa ser positiva.", nameof(revisionNumber));
        if (pricingTableId == Guid.Empty)
            throw new ArgumentException("A tabela de preços é obrigatória.", nameof(pricingTableId));
        if (string.IsNullOrWhiteSpace(currency) || currency.Trim().Length != 3)
            throw new ArgumentException("A moeda precisa ter 3 letras.", nameof(currency));
        if (string.IsNullOrWhiteSpace(idempotencyKey) || idempotencyKey.Trim().Length > 80)
            throw new ArgumentException("A chave de idempotência é obrigatória e tem no máximo 80 caracteres.", nameof(idempotencyKey));
        if (string.IsNullOrWhiteSpace(snapshotJson) || !snapshotJson.TrimStart().StartsWith('{'))
            throw new ArgumentException("O snapshot do cálculo é obrigatório.", nameof(snapshotJson));

        TenantId = tenantId;
        ProjectId = projectId;
        RevisionId = revisionId;
        RevisionNumber = revisionNumber;
        PricingTableId = pricingTableId;
        PricingTableVersion = pricingTableVersion;
        Currency = currency.Trim().ToUpperInvariant();
        IdempotencyKey = idempotencyKey.Trim();
        SnapshotJson = snapshotJson;
        Status = QuoteStatus.Draft;
    }
}

public enum QuoteStatus
{
    Draft = 0,
}
