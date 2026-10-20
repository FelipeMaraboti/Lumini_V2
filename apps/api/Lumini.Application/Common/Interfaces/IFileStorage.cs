namespace Lumini.Application.Common.Interfaces;

public interface IFileStorage
{
    Task<StoredObject> SaveAsync(string objectKey, Stream content, CancellationToken ct = default);
    Task<Stream> OpenReadAsync(string objectKey, CancellationToken ct = default);
}

public sealed record StoredObject(string ObjectKey, string Sha256, long SizeBytes);
