namespace Lumini.Application.Projects.DTOs;

public record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public record ClientResponse(
    Guid Id,
    string Name,
    string? Email,
    string? PhoneDigits,
    string? DocumentDigits,
    string? Notes,
    string Status,
    uint Version
);

public record UpsertClientRequest(
    string Name,
    string? Email,
    string? PhoneDigits,
    string? DocumentDigits,
    string? Notes
);

public record ProjectResponse(
    Guid Id,
    Guid ClientId,
    string ClientName,
    string Code,
    string Name,
    string Status,
    Guid? CurrentRevisionId,
    int? RevisionNumber,
    string? RevisionStatus,
    uint Version
);

public record CreateProjectRequest(Guid ClientId, string Code, string Name);

public record UpdateProjectRequest(string Name);

public record TransitionProjectRequest(string Status);

public record RevisionResponse(
    Guid Id,
    Guid ProjectId,
    int RevisionNumber,
    string Status,
    int GeometrySchemaVersion,
    string SnapshotJson,
    uint Version
);

public record ReplaceSnapshotRequest(string SnapshotJson);

public record DownloadUrlResponse(string Url, DateTime ExpiresAtUtc);

public record AttachmentResponse(
    Guid Id,
    Guid ProjectId,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Sha256,
    DateTime CreatedAtUtc
);
