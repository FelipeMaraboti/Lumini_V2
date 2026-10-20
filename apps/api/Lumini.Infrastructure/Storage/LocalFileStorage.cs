using System.Security.Cryptography;
using Lumini.Application.Common.Interfaces;

namespace Lumini.Infrastructure.Storage;

public class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalFileStorage(string root)
    {
        _root = root;
        Directory.CreateDirectory(_root);
    }

    public async Task<StoredObject> SaveAsync(string objectKey, Stream content, CancellationToken ct = default)
    {
        var path = Resolve(objectKey);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        await using var file = File.Create(path);
        using var sha = SHA256.Create();
        var crypto = new CryptoStream(file, sha, CryptoStreamMode.Write, leaveOpen: true);
        await content.CopyToAsync(crypto, ct);
        await crypto.DisposeAsync();

        var hash = Convert.ToHexString(sha.Hash ?? Array.Empty<byte>());
        var size = new FileInfo(path).Length;
        return new StoredObject(objectKey, hash, size);
    }

    public Task<Stream> OpenReadAsync(string objectKey, CancellationToken ct = default)
    {
        var path = Resolve(objectKey);
        if (!File.Exists(path))
            throw new FileNotFoundException("Arquivo não encontrado no armazenamento.", objectKey);

        Stream stream = File.OpenRead(path);
        return Task.FromResult(stream);
    }

    private string Resolve(string objectKey)
    {
        var full = Path.GetFullPath(Path.Combine(_root, objectKey.Replace('/', Path.DirectorySeparatorChar)));
        var rootFull = Path.GetFullPath(_root);
        if (!full.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Caminho de objeto inválido.");

        return full;
    }
}
