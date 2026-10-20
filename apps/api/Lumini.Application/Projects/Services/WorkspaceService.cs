using System.Text.Json;
using Lumini.Application.Common.Interfaces;
using Lumini.Application.Projects.DTOs;
using Lumini.Domain.Audit;
using Lumini.Domain.Common;
using Lumini.Domain.Projects;

namespace Lumini.Application.Projects.Services;

public interface IWorkspaceService
{
    Task<ClientResponse> CreateClientAsync(UpsertClientRequest request, string? correlationId, CancellationToken ct = default);
    Task<PagedResponse<ClientResponse>> ListClientsAsync(string? search, int page, int pageSize, CancellationToken ct = default);
    Task<ClientResponse> GetClientAsync(Guid clientId, CancellationToken ct = default);
    Task<ClientResponse> UpdateClientAsync(Guid clientId, UpsertClientRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default);

    Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request, string? correlationId, CancellationToken ct = default);
    Task<PagedResponse<ProjectResponse>> ListProjectsAsync(string? search, Guid? clientId, int page, int pageSize, CancellationToken ct = default);
    Task<ProjectResponse> GetProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<ProjectResponse> UpdateProjectAsync(Guid projectId, UpdateProjectRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default);
    Task<ProjectResponse> TransitionAsync(Guid projectId, string targetStatus, uint expectedVersion, string? correlationId, CancellationToken ct = default);
    Task<RevisionResponse> OpenNextRevisionAsync(Guid projectId, uint expectedVersion, string? correlationId, CancellationToken ct = default);
    Task<RevisionResponse> ReplaceSnapshotAsync(Guid revisionId, string snapshotJson, uint expectedVersion, CancellationToken ct = default);
    Task<IReadOnlyList<RevisionResponse>> ListRevisionsAsync(Guid projectId, CancellationToken ct = default);

    Task<AttachmentResponse> AddAttachmentAsync(Guid projectId, string fileName, string contentType, Stream content, CancellationToken ct = default);
    Task<(ProjectAttachment Meta, Stream Content)> OpenAttachmentAsync(Guid attachmentId, CancellationToken ct = default);
    Task<DownloadUrlResponse> CreateAttachmentDownloadUrlAsync(Guid attachmentId, CancellationToken ct = default);
}

public class WorkspaceService : IWorkspaceService
{
    private const long MaxAttachmentBytes = 10 * 1024 * 1024;

    private readonly IProjectRepository _repository;
    private readonly ITenantContext _tenant;
    private readonly IUserContext _user;
    private readonly IFileStorage _storage;

    public WorkspaceService(
        IProjectRepository repository,
        ITenantContext tenant,
        IUserContext user,
        IFileStorage storage)
    {
        _repository = repository;
        _tenant = tenant;
        _user = user;
        _storage = storage;
    }

    public async Task<ClientResponse> CreateClientAsync(UpsertClientRequest request, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var client = new Client(tenantId, request.Name, request.Email, Digits(request.PhoneDigits), Digits(request.DocumentDigits), request.Notes);
        await _repository.AddClientAsync(client, ct);
        await AuditAsync(tenantId, "client.created", "client", client.Id, correlationId, new { client.Name }, ct);
        await _repository.SaveChangesAsync(ct);
        return Map(client);
    }

    public async Task<PagedResponse<ClientResponse>> ListClientsAsync(string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await _repository.ListClientsAsync(_tenant.RequiredTenantId, search, NormalizePage(page), NormalizePageSize(pageSize), ct);
        return new PagedResponse<ClientResponse>(items.Select(Map).ToList(), NormalizePage(page), NormalizePageSize(pageSize), total);
    }

    public async Task<ClientResponse> GetClientAsync(Guid clientId, CancellationToken ct = default)
    {
        var client = await RequireClientAsync(clientId, ct);
        return Map(client);
    }

    public async Task<ClientResponse> UpdateClientAsync(Guid clientId, UpsertClientRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default)
    {
        var client = await RequireClientAsync(clientId, ct);
        client.Update(request.Name, request.Email, Digits(request.PhoneDigits), Digits(request.DocumentDigits), request.Notes, expectedVersion);
        await AuditAsync(client.TenantId, "client.updated", "client", client.Id, correlationId, new { client.Version }, ct);
        await _repository.SaveChangesAsync(ct);
        return Map(client);
    }

    public async Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request, string? correlationId, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var client = await RequireClientAsync(request.ClientId, ct);
        var code = request.Code.Trim().ToUpperInvariant();

        if (await _repository.ProjectCodeExistsAsync(tenantId, code, ct))
            throw new InvalidOperationException("Já existe um projeto com este código nesta marmoraria.");

        var project = new Project(tenantId, client.Id, code, request.Name, _user.RequiredUserId);
        await _repository.AddProjectAsync(project, ct);
        await _repository.SaveChangesAsync(ct);

        var revision = new ProjectRevision(tenantId, project.Id, 1, "{}", _user.RequiredUserId);
        await _repository.AddRevisionAsync(revision, ct);
        project.AssignCurrentRevision(revision.Id);
        await AuditAsync(tenantId, "project.created", "project", project.Id, correlationId, new { project.Code, revision = 1 }, ct);
        await _repository.SaveChangesAsync(ct);

        return Map(project, client.Name, revision);
    }

    public async Task<PagedResponse<ProjectResponse>> ListProjectsAsync(string? search, Guid? clientId, int page, int pageSize, CancellationToken ct = default)
    {
        var tenantId = _tenant.RequiredTenantId;
        var (items, total) = await _repository.ListProjectsAsync(tenantId, search, clientId, NormalizePage(page), NormalizePageSize(pageSize), ct);
        var mapped = new List<ProjectResponse>();
        foreach (var project in items)
        {
            var client = await _repository.GetClientAsync(tenantId, project.ClientId, ct);
            var revision = project.CurrentRevisionId.HasValue
                ? await _repository.GetRevisionAsync(tenantId, project.CurrentRevisionId.Value, ct)
                : null;
            mapped.Add(Map(project, client?.Name ?? "—", revision));
        }

        return new PagedResponse<ProjectResponse>(mapped, NormalizePage(page), NormalizePageSize(pageSize), total);
    }

    public async Task<ProjectResponse> GetProjectAsync(Guid projectId, CancellationToken ct = default)
    {
        var (project, client, revision) = await LoadGraphAsync(projectId, ct);
        return Map(project, client.Name, revision);
    }

    public async Task<ProjectResponse> UpdateProjectAsync(Guid projectId, UpdateProjectRequest request, uint expectedVersion, string? correlationId, CancellationToken ct = default)
    {
        var (project, client, revision) = await LoadGraphAsync(projectId, ct);
        project.Rename(request.Name, expectedVersion);
        await AuditAsync(project.TenantId, "project.updated", "project", project.Id, correlationId, new { project.Version }, ct);
        await _repository.SaveChangesAsync(ct);
        return Map(project, client.Name, revision);
    }

    public async Task<ProjectResponse> TransitionAsync(Guid projectId, string targetStatus, uint expectedVersion, string? correlationId, CancellationToken ct = default)
    {
        if (!Enum.TryParse<ProjectStatus>(targetStatus, ignoreCase: true, out var target))
            throw new ArgumentException("Status de projeto inválido.", nameof(targetStatus));

        var (project, client, revision) = await LoadGraphAsync(projectId, ct);
        var from = project.Status;

        if (target == ProjectStatus.Approved)
        {
            if (revision == null)
                throw new InvalidOperationException("O projeto não possui revisão para aprovar.");

            revision.Approve();
        }

        project.TransitionTo(target, expectedVersion);
        await AuditAsync(project.TenantId, "project.status_changed", "project", project.Id, correlationId, new { from = from.ToString(), to = target.ToString() }, ct);
        await _repository.SaveChangesAsync(ct);
        return Map(project, client.Name, revision);
    }

    public async Task<RevisionResponse> OpenNextRevisionAsync(Guid projectId, uint expectedVersion, string? correlationId, CancellationToken ct = default)
    {
        var (project, _, current) = await LoadGraphAsync(projectId, ct);
        if (current == null)
            throw new InvalidOperationException("O projeto não possui revisão atual.");

        var next = project.OpenNextRevision(current, _user.RequiredUserId, expectedVersion);
        await _repository.AddRevisionAsync(next, ct);

        await AuditAsync(project.TenantId, "project.revision_opened", "project_revision", next.Id, correlationId, new { next.RevisionNumber }, ct);
        await _repository.SaveChangesAsync(ct);
        return Map(next);
    }

    public async Task<RevisionResponse> ReplaceSnapshotAsync(Guid revisionId, string snapshotJson, uint expectedVersion, CancellationToken ct = default)
    {
        var revision = await _repository.GetRevisionAsync(_tenant.RequiredTenantId, revisionId, ct)
            ?? throw new KeyNotFoundException("Revisão não encontrada.");

        if (revision.Version != expectedVersion)
            throw new ResourceConflictException(revision.Version);

        revision.ReplaceSnapshot(snapshotJson);
        await _repository.SaveChangesAsync(ct);
        return Map(revision);
    }

    public async Task<IReadOnlyList<RevisionResponse>> ListRevisionsAsync(Guid projectId, CancellationToken ct = default)
    {
        await RequireProjectAsync(projectId, ct);
        var revisions = await _repository.ListRevisionsAsync(_tenant.RequiredTenantId, projectId, ct);
        return revisions.Select(Map).ToList();
    }

    public async Task<AttachmentResponse> AddAttachmentAsync(Guid projectId, string fileName, string contentType, Stream content, CancellationToken ct = default)
    {
        var project = await RequireProjectAsync(projectId, ct);
        if (content.Length > MaxAttachmentBytes)
            throw new ArgumentException("O anexo excede o limite de 10 MB.");

        var safeName = Path.GetFileName(fileName);
        var key = $"{project.TenantId:N}/{project.Id:N}/{Guid.NewGuid():N}-{safeName}";
        var stored = await _storage.SaveAsync(key, content, ct);
        var attachment = new ProjectAttachment(project.TenantId, project.Id, stored.ObjectKey, safeName, contentType, stored.SizeBytes, stored.Sha256, _user.RequiredUserId);
        await _repository.AddAttachmentAsync(attachment, ct);
        await AuditAsync(project.TenantId, "project.attachment_added", "project_attachment", attachment.Id, null, new { safeName, stored.SizeBytes }, ct);
        await _repository.SaveChangesAsync(ct);
        return Map(attachment);
    }

    public async Task<(ProjectAttachment Meta, Stream Content)> OpenAttachmentAsync(Guid attachmentId, CancellationToken ct = default)
    {
        var attachment = await _repository.GetAttachmentAsync(_tenant.RequiredTenantId, attachmentId, ct)
            ?? throw new KeyNotFoundException("Anexo não encontrado.");

        var stream = await _storage.OpenReadAsync(attachment.ObjectKey, ct);
        return (attachment, stream);
    }

    public async Task<DownloadUrlResponse> CreateAttachmentDownloadUrlAsync(Guid attachmentId, CancellationToken ct = default)
    {
        var attachment = await _repository.GetAttachmentAsync(_tenant.RequiredTenantId, attachmentId, ct)
            ?? throw new KeyNotFoundException("Anexo não encontrado.");

        var link = await _storage.CreateDownloadUrlAsync(attachment.ObjectKey, TimeSpan.FromMinutes(15), ct);
        return new DownloadUrlResponse(link.Url, link.ExpiresAtUtc);
    }

    private async Task<Client> RequireClientAsync(Guid clientId, CancellationToken ct)
    {
        return await _repository.GetClientAsync(_tenant.RequiredTenantId, clientId, ct)
            ?? throw new KeyNotFoundException("Cliente não encontrado.");
    }

    private async Task<Project> RequireProjectAsync(Guid projectId, CancellationToken ct)
    {
        return await _repository.GetProjectAsync(_tenant.RequiredTenantId, projectId, ct)
            ?? throw new KeyNotFoundException("Projeto não encontrado.");
    }

    private async Task<(Project Project, Client Client, ProjectRevision? Revision)> LoadGraphAsync(Guid projectId, CancellationToken ct)
    {
        var tenantId = _tenant.RequiredTenantId;
        var project = await RequireProjectAsync(projectId, ct);
        var client = await _repository.GetClientAsync(tenantId, project.ClientId, ct)
            ?? throw new KeyNotFoundException("Cliente do projeto não encontrado.");
        var revision = project.CurrentRevisionId.HasValue
            ? await _repository.GetRevisionAsync(tenantId, project.CurrentRevisionId.Value, ct)
            : null;
        return (project, client, revision);
    }

    private async Task AuditAsync(Guid tenantId, string action, string resourceType, Guid resourceId, string? correlationId, object metadata, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(metadata);
        await _repository.AddAuditAsync(new AuditEvent(tenantId, _user.UserId, action, resourceType, resourceId, correlationId, json), ct);
    }

    private static ClientResponse Map(Client client) => new(
        client.Id, client.Name, client.Email, client.PhoneDigits, client.DocumentDigits, client.Notes, client.Status.ToString(), client.Version);

    private static ProjectResponse Map(Project project, string clientName, ProjectRevision? revision) => new(
        project.Id,
        project.ClientId,
        clientName,
        project.Code,
        project.Name,
        project.Status.ToString(),
        project.CurrentRevisionId,
        revision?.RevisionNumber,
        revision?.Status.ToString(),
        project.Version);

    private static RevisionResponse Map(ProjectRevision revision) => new(
        revision.Id, revision.ProjectId, revision.RevisionNumber, revision.Status.ToString(), revision.GeometrySchemaVersion, revision.SnapshotJson, revision.Version);

    private static AttachmentResponse Map(ProjectAttachment attachment) => new(
        attachment.Id, attachment.ProjectId, attachment.FileName, attachment.ContentType, attachment.SizeBytes, attachment.Sha256, attachment.CreatedAtUtc);

    private static int NormalizePage(int page) => page < 1 ? 1 : page;
    private static int NormalizePageSize(int pageSize) => pageSize is < 1 or > 100 ? 20 : pageSize;
    private static string? Digits(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : new string(value.Where(char.IsDigit).ToArray());
}
