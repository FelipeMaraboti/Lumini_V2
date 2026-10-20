namespace Lumini.Application.Common.Interfaces;

public interface IFileStorage
{
    Task<StoredObject> SaveAsync(string objectKey, Stream content, CancellationToken ct = default);
    Task<Stream> OpenReadAsync(string objectKey, CancellationToken ct = default);
    Task<PresignedDownload> CreateDownloadUrlAsync(string objectKey, TimeSpan ttl, CancellationToken ct = default);
}

public sealed record StoredObject(string ObjectKey, string Sha256, long SizeBytes);

public sealed record PresignedDownload(string Url, DateTime ExpiresAtUtc);
