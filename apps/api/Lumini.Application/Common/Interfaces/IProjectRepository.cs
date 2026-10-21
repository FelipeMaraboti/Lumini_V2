using Lumini.Domain.Audit;
using Lumini.Domain.Projects;

namespace Lumini.Application.Common.Interfaces;

public interface IProjectRepository
{
    Task AddClientAsync(Client client, CancellationToken ct = default);
    Task<Client?> GetClientAsync(Guid tenantId, Guid clientId, CancellationToken ct = default);
    Task<(IReadOnlyList<Client> Items, int Total)> ListClientsAsync(Guid tenantId, string? search, int page, int pageSize, CancellationToken ct = default);
    Task<bool> ClientCodeInUseAsync(Guid tenantId, string code, CancellationToken ct = default);

    Task AddProjectAsync(Project project, CancellationToken ct = default);
    Task<Project?> GetProjectAsync(Guid tenantId, Guid projectId, CancellationToken ct = default);
    Task<(IReadOnlyList<Project> Items, int Total)> ListProjectsAsync(Guid tenantId, string? search, Guid? clientId, int page, int pageSize, CancellationToken ct = default);
    Task<bool> ProjectCodeExistsAsync(Guid tenantId, string code, CancellationToken ct = default);

    Task AddRevisionAsync(ProjectRevision revision, CancellationToken ct = default);
    Task<ProjectRevision?> GetRevisionAsync(Guid tenantId, Guid revisionId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectRevision>> ListRevisionsAsync(Guid tenantId, Guid projectId, CancellationToken ct = default);

    Task AddAttachmentAsync(ProjectAttachment attachment, CancellationToken ct = default);
    Task<ProjectAttachment?> GetAttachmentAsync(Guid tenantId, Guid attachmentId, CancellationToken ct = default);
    Task<IReadOnlyList<ProjectAttachment>> ListAttachmentsAsync(Guid tenantId, Guid projectId, CancellationToken ct = default);

    Task AddAuditAsync(AuditEvent auditEvent, CancellationToken ct = default);

    Task AddQuoteAsync(Quote quote, CancellationToken ct = default);
    Task<Quote?> GetQuoteByIdempotencyKeyAsync(Guid tenantId, string idempotencyKey, CancellationToken ct = default);
    Task<IReadOnlyList<Quote>> ListQuotesAsync(Guid tenantId, Guid projectId, CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
