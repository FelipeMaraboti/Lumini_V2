using Lumini.Domain.Common;

namespace Lumini.Domain.Projects;

public class ProjectAttachment : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; private set; }
    public string ObjectKey { get; private set; } = string.Empty;
    public string FileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public string Sha256 { get; private set; } = string.Empty;
    public Guid UploadedByUserId { get; private set; }

    protected ProjectAttachment() { }

    public ProjectAttachment(
        Guid tenantId,
        Guid projectId,
        string objectKey,
        string fileName,
        string contentType,
        long sizeBytes,
        string sha256,
        Guid uploadedByUserId)
    {
        if (sizeBytes <= 0)
            throw new ArgumentException("O arquivo está vazio.", nameof(sizeBytes));

        TenantId = tenantId;
        ProjectId = projectId;
        ObjectKey = objectKey;
        FileName = fileName.Trim();
        ContentType = contentType.Trim();
        SizeBytes = sizeBytes;
        Sha256 = sha256;
        UploadedByUserId = uploadedByUserId;
    }
}
