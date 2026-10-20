using Lumini.Domain.Common;

namespace Lumini.Domain.Projects;

/// <summary>
/// Snapshot rastreável do projeto (RN-005). Revisões aprovadas são imutáveis.
/// </summary>
public class ProjectRevision : Entity, ITenantScoped
{
    public const int CurrentGeometrySchemaVersion = 1;

    public Guid TenantId { get; set; }
    public Guid ProjectId { get; private set; }
    public int RevisionNumber { get; private set; }
    public RevisionStatus Status { get; private set; } = RevisionStatus.Draft;
    public int GeometrySchemaVersion { get; private set; } = CurrentGeometrySchemaVersion;
    public string SnapshotJson { get; private set; } = "{}";
    public Guid CreatedByUserId { get; private set; }

    protected ProjectRevision() { }

    public ProjectRevision(Guid tenantId, Guid projectId, int revisionNumber, string snapshotJson, Guid createdByUserId)
    {
        if (revisionNumber < 1)
            throw new ArgumentException("O número da revisão deve ser positivo.", nameof(revisionNumber));

        TenantId = tenantId;
        ProjectId = projectId;
        RevisionNumber = revisionNumber;
        SnapshotJson = string.IsNullOrWhiteSpace(snapshotJson) ? "{}" : snapshotJson;
        CreatedByUserId = createdByUserId;
        GeometrySchemaVersion = CurrentGeometrySchemaVersion;
    }

    public void ReplaceSnapshot(string snapshotJson)
    {
        EnsureMutable();
        SnapshotJson = string.IsNullOrWhiteSpace(snapshotJson) ? "{}" : snapshotJson;
        MarkUpdated();
    }

    public void Approve()
    {
        if (Status == RevisionStatus.Approved)
            return;

        Status = RevisionStatus.Approved;
        MarkUpdated();
    }

    public void EnsureMutable()
    {
        if (Status != RevisionStatus.Draft)
            throw new InvalidOperationException("Revisão aprovada é imutável. Crie uma nova revisão.");
    }
}
