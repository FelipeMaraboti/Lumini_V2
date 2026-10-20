using Lumini.Application.Common.Interfaces;
using Lumini.Domain.Audit;
using Lumini.Domain.Projects;
using Microsoft.EntityFrameworkCore;

namespace Lumini.Infrastructure.Persistence.Repositories;

public class ProjectRepository : IProjectRepository
{
    private readonly LuminiDbContext _context;

    public ProjectRepository(LuminiDbContext context)
    {
        _context = context;
    }

    public Task AddClientAsync(Client client, CancellationToken ct = default) =>
        _context.Clients.AddAsync(client, ct).AsTask();

    public Task<Client?> GetClientAsync(Guid tenantId, Guid clientId, CancellationToken ct = default) =>
        _context.Clients.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == clientId, ct);

    public async Task<(IReadOnlyList<Client> Items, int Total)> ListClientsAsync(Guid tenantId, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.Clients.IgnoreQueryFilters().Where(c => c.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(c => c.Name.ToLower().Contains(term) || (c.Email != null && c.Email.Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderBy(c => c.Name).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public Task<bool> ClientCodeInUseAsync(Guid tenantId, string code, CancellationToken ct = default) =>
        Task.FromResult(false);

    public Task AddProjectAsync(Project project, CancellationToken ct = default) =>
        _context.Projects.AddAsync(project, ct).AsTask();

    public Task<Project?> GetProjectAsync(Guid tenantId, Guid projectId, CancellationToken ct = default) =>
        _context.Projects.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == projectId, ct);

    public async Task<(IReadOnlyList<Project> Items, int Total)> ListProjectsAsync(Guid tenantId, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _context.Projects.IgnoreQueryFilters().Where(p => p.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(p => p.Name.ToLower().Contains(term) || p.Code.ToLower().Contains(term));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(p => p.CreatedAtUtc).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public Task<bool> ProjectCodeExistsAsync(Guid tenantId, string code, CancellationToken ct = default) =>
        _context.Projects.IgnoreQueryFilters().AnyAsync(p => p.TenantId == tenantId && p.Code == code, ct);

    public Task AddRevisionAsync(ProjectRevision revision, CancellationToken ct = default) =>
        _context.ProjectRevisions.AddAsync(revision, ct).AsTask();

    public Task<ProjectRevision?> GetRevisionAsync(Guid tenantId, Guid revisionId, CancellationToken ct = default) =>
        _context.ProjectRevisions.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Id == revisionId, ct);

    public async Task<IReadOnlyList<ProjectRevision>> ListRevisionsAsync(Guid tenantId, Guid projectId, CancellationToken ct = default) =>
        await _context.ProjectRevisions.IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId && r.ProjectId == projectId)
            .OrderByDescending(r => r.RevisionNumber)
            .ToListAsync(ct);

    public Task AddAttachmentAsync(ProjectAttachment attachment, CancellationToken ct = default) =>
        _context.ProjectAttachments.AddAsync(attachment, ct).AsTask();

    public Task<ProjectAttachment?> GetAttachmentAsync(Guid tenantId, Guid attachmentId, CancellationToken ct = default) =>
        _context.ProjectAttachments.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == attachmentId, ct);

    public async Task<IReadOnlyList<ProjectAttachment>> ListAttachmentsAsync(Guid tenantId, Guid projectId, CancellationToken ct = default) =>
        await _context.ProjectAttachments.IgnoreQueryFilters()
            .Where(a => a.TenantId == tenantId && a.ProjectId == projectId)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync(ct);

    public Task AddAuditAsync(AuditEvent auditEvent, CancellationToken ct = default) =>
        _context.AuditEvents.AddAsync(auditEvent, ct).AsTask();

    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        _context.SaveChangesAsync(ct);
}
