using Lumini.Application.Identity.Authorization;
using Lumini.Application.Projects.DTOs;
using Lumini.Application.Projects.Services;
using Lumini.Domain.Identity;

namespace Lumini.Api.Endpoints;

public static class WorkspaceEndpoints
{
    public static RouteGroupBuilder MapWorkspaceEndpoints(this RouteGroupBuilder api)
    {
        var clients = api.MapGroup("/clients").WithTags("Clientes").RequireAuthorization();

        clients.MapGet("/", async (string? search, int? page, int? pageSize, IWorkspaceService service, CancellationToken ct) =>
        {
            var result = await service.ListClientsAsync(search, page ?? 1, pageSize ?? 20, ct);
            return Results.Ok(result);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ClientsRead));

        clients.MapGet("/{id:guid}", async (Guid id, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
        {
            var client = await service.GetClientAsync(id, ct);
            http.Response.Headers.ETag = Quote(client.Version);
            return Results.Ok(client);
        })
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.ClientsRead));

        clients.MapPost("/", async (UpsertClientRequest request, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
        {
            var created = await service.CreateClientAsync(request, Correlation(http), ct);
            return Results.Created($"/api/v1/clients/{created.Id}", created);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ClientsCreate));

        clients.MapPut("/{id:guid}", async (Guid id, UpsertClientRequest request, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
        {
            var updated = await service.UpdateClientAsync(id, request, RequireVersion(http), Correlation(http), ct);
            http.Response.Headers.ETag = Quote(updated.Version);
            return Results.Ok(updated);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ClientsEdit));

        var projects = api.MapGroup("/projects").WithTags("Projetos").RequireAuthorization();

        projects.MapGet("/", async (string? search, Guid? clientId, int? page, int? pageSize, IWorkspaceService service, CancellationToken ct) =>
            Results.Ok(await service.ListProjectsAsync(search, clientId, page ?? 1, pageSize ?? 20, ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsRead));

        projects.MapGet("/{id:guid}", async (Guid id, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
        {
            var project = await service.GetProjectAsync(id, ct);
            http.Response.Headers.ETag = Quote(project.Version);
            return Results.Ok(project);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsRead));

        projects.MapPost("/", async (CreateProjectRequest request, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
        {
            var created = await service.CreateProjectAsync(request, Correlation(http), ct);
            http.Response.Headers.ETag = Quote(created.Version);
            return Results.Created($"/api/v1/projects/{created.Id}", created);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsCreate));

        projects.MapPut("/{id:guid}", async (Guid id, UpdateProjectRequest request, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
        {
            var updated = await service.UpdateProjectAsync(id, request, RequireVersion(http), Correlation(http), ct);
            http.Response.Headers.ETag = Quote(updated.Version);
            return Results.Ok(updated);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsEdit));

        projects.MapPost("/{id:guid}/transitions", async (Guid id, TransitionProjectRequest request, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
        {
            var updated = await service.TransitionAsync(id, request.Status, RequireVersion(http), Correlation(http), ct);
            http.Response.Headers.ETag = Quote(updated.Version);
            return Results.Ok(updated);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsEdit));

        projects.MapGet("/{id:guid}/revisions", async (Guid id, IWorkspaceService service, CancellationToken ct) =>
            Results.Ok(await service.ListRevisionsAsync(id, ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsRead));

        projects.MapPost("/{id:guid}/revisions", async (Guid id, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
        {
            var revision = await service.OpenNextRevisionAsync(id, RequireVersion(http), Correlation(http), ct);
            return Results.Created($"/api/v1/projects/{id}/revisions/{revision.Id}", revision);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsEdit));

        projects.MapPut("/revisions/{revisionId:guid}/snapshot", async (Guid revisionId, ReplaceSnapshotRequest request, IWorkspaceService service, HttpContext http, CancellationToken ct) =>
            Results.Ok(await service.ReplaceSnapshotAsync(revisionId, request.SnapshotJson, RequireVersion(http), ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.DrawingEdit));

        projects.MapPost("/{id:guid}/attachments", async (Guid id, IFormFile file, IWorkspaceService service, CancellationToken ct) =>
        {
            if (file.Length == 0)
                throw new ArgumentException("Arquivo vazio.");

            await using var stream = file.OpenReadStream();
            var saved = await service.AddAttachmentAsync(id, file.FileName, file.ContentType, stream, ct);
            return Results.Created($"/api/v1/projects/attachments/{saved.Id}", saved);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsEdit)).DisableAntiforgery();

        projects.MapPost("/attachments/{attachmentId:guid}/download-url", async (Guid attachmentId, IWorkspaceService service, CancellationToken ct) =>
            Results.Ok(await service.CreateAttachmentDownloadUrlAsync(attachmentId, ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsRead));

        projects.MapGet("/attachments/{attachmentId:guid}", async (Guid attachmentId, IWorkspaceService service, CancellationToken ct) =>
        {
            var (meta, stream) = await service.OpenAttachmentAsync(attachmentId, ct);
            return Results.File(stream, meta.ContentType, meta.FileName);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsRead));

        return api;
    }

    private static string? Correlation(HttpContext http) =>
        http.Items["CorrelationId"]?.ToString();

    private static uint RequireVersion(HttpContext http)
    {
        var raw = http.Request.Headers.IfMatch.ToString().Trim().Trim('"');
        if (!uint.TryParse(raw, out var version))
            throw new ArgumentException("Cabeçalho If-Match com a versão do recurso é obrigatório.");

        return version;
    }

    private static string Quote(uint version) => $"\"{version}\"";
}
