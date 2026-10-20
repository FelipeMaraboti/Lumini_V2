using Amazon.S3;
using Amazon.S3.Model;
using Lumini.Application.Common.Interfaces;

namespace Lumini.Infrastructure.Storage;

/// <summary>
/// Armazenamento compatível com S3/MinIO. URLs de download são pré-assinadas e expiram.
/// </summary>
public class S3FileStorage : IFileStorage
{
    private readonly IAmazonS3 _client;
    private readonly string _bucket;

    public S3FileStorage(string serviceUrl, string accessKey, string secretKey, string bucket)
    {
        _bucket = bucket;
        _client = new AmazonS3Client(accessKey, secretKey, new AmazonS3Config
        {
            ServiceURL = serviceUrl,
            ForcePathStyle = true,
            AuthenticationRegion = "us-east-1"
        });
    }

    public async Task<StoredObject> SaveAsync(string objectKey, Stream content, CancellationToken ct = default)
    {
        await EnsureBucketAsync(ct);
        var request = new PutObjectRequest
        {
            BucketName = _bucket,
            Key = objectKey,
            InputStream = content,
            AutoCloseStream = false
        };
        await _client.PutObjectAsync(request, ct);

        var head = await _client.GetObjectMetadataAsync(_bucket, objectKey, ct);
        var hash = head.ETag?.Trim('"') ?? string.Empty;
        return new StoredObject(objectKey, hash, head.ContentLength);
    }

    public async Task<Stream> OpenReadAsync(string objectKey, CancellationToken ct = default)
    {
        var response = await _client.GetObjectAsync(_bucket, objectKey, ct);
        return response.ResponseStream;
    }

    public Task<PresignedDownload> CreateDownloadUrlAsync(string objectKey, TimeSpan ttl, CancellationToken ct = default)
    {
        var expires = DateTime.UtcNow.Add(ttl);
        var url = _client.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = objectKey,
            Expires = expires,
            Verb = HttpVerb.GET
        });
        return Task.FromResult(new PresignedDownload(url, expires));
    }

    private async Task EnsureBucketAsync(CancellationToken ct)
    {
        try
        {
            await _client.PutBucketAsync(new PutBucketRequest { BucketName = _bucket }, ct);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            // O bucket já existe.
        }
    }
}
