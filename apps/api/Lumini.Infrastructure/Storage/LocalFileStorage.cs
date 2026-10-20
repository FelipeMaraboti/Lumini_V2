using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Lumini.Application.Common.Interfaces;

namespace Lumini.Infrastructure.Storage;

public class LocalFileStorage : IFileStorage
{
    private readonly string _root;
    private readonly string _publicBaseUrl;
    private readonly byte[] _signingKey;

    public LocalFileStorage(string root, string publicBaseUrl, string signingKey)
    {
        _root = root;
        _publicBaseUrl = publicBaseUrl.TrimEnd('/');
        _signingKey = Encoding.UTF8.GetBytes(signingKey);
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

    public Task<PresignedDownload> CreateDownloadUrlAsync(string objectKey, TimeSpan ttl, CancellationToken ct = default)
    {
        var expires = DateTime.UtcNow.Add(ttl);
        var payload = JsonSerializer.Serialize(new SignedPayload(objectKey, new DateTimeOffset(expires).ToUnixTimeSeconds()));
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = HMACSHA256.HashData(_signingKey, payloadBytes);
        var token = $"{Base64Url(payloadBytes)}.{Base64Url(signature)}";
        var url = $"{_publicBaseUrl}/api/v1/files/{token}";
        return Task.FromResult(new PresignedDownload(url, expires));
    }

    public bool TryReadSignedToken(string token, out string objectKey)
    {
        objectKey = string.Empty;
        var parts = token.Split('.', 2);
        if (parts.Length != 2)
            return false;

        byte[] payloadBytes;
        byte[] signature;
        try
        {
            payloadBytes = FromBase64Url(parts[0]);
            signature = FromBase64Url(parts[1]);
        }
        catch (FormatException)
        {
            return false;
        }

        var expected = HMACSHA256.HashData(_signingKey, payloadBytes);
        if (!CryptographicOperations.FixedTimeEquals(expected, signature))
            return false;

        var payload = JsonSerializer.Deserialize<SignedPayload>(payloadBytes);
        if (payload == null || payload.Exp < DateTimeOffset.UtcNow.ToUnixTimeSeconds())
            return false;

        objectKey = payload.Key;
        return !string.IsNullOrWhiteSpace(objectKey);
    }

    public Task<Stream> OpenReadAsync(string objectKey, CancellationToken ct = default)
    {
        var path = Resolve(objectKey);
        if (!File.Exists(path))
            throw new FileNotFoundException("Arquivo não encontrado no armazenamento.", objectKey);

        Stream stream = File.OpenRead(path);
        return Task.FromResult(stream);
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Convert.FromBase64String(padded);
    }

    private sealed record SignedPayload(string Key, long Exp);

    private string Resolve(string objectKey)
    {
        var full = Path.GetFullPath(Path.Combine(_root, objectKey.Replace('/', Path.DirectorySeparatorChar)));
        var rootFull = Path.GetFullPath(_root);
        if (!full.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Caminho de objeto inválido.");

        return full;
    }
}
