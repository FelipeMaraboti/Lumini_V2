using Lumini.Domain.Common;

namespace Lumini.Domain.Projects;

public class Project : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid ClientId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public ProjectStatus Status { get; private set; } = ProjectStatus.Draft;
    public Guid OwnerUserId { get; private set; }
    public Guid? CurrentRevisionId { get; private set; }

    protected Project() { }

    public Project(Guid tenantId, Guid clientId, string code, string name, Guid ownerUserId)
    {
        if (clientId == Guid.Empty)
            throw new ArgumentException("O cliente é obrigatório.", nameof(clientId));

        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("O código do projeto é obrigatório.", nameof(code));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome do projeto é obrigatório.", nameof(name));

        TenantId = tenantId;
        ClientId = clientId;
        Code = code.Trim().ToUpperInvariant();
        Name = name.Trim();
        OwnerUserId = ownerUserId;
    }

    public void Rename(string name, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        EnsureEditable();

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome do projeto é obrigatório.", nameof(name));

        Name = name.Trim();
        MarkUpdated();
    }

    public ProjectRevision OpenNextRevision(ProjectRevision current, Guid createdByUserId, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);

        if (current.ProjectId != Id || current.Status != RevisionStatus.Approved)
            throw new InvalidOperationException("A revisão atual precisa estar aprovada antes de abrir a próxima.");

        if (Status is ProjectStatus.InProduction or ProjectStatus.Completed)
            throw new InvalidOperationException("Não é possível abrir revisão em projeto já em produção ou concluído.");

        var next = new ProjectRevision(TenantId, Id, current.RevisionNumber + 1, current.SnapshotJson, createdByUserId);
        CurrentRevisionId = next.Id;
        Status = ProjectStatus.Draft;
        MarkUpdated();
        return next;
    }

    public void AssignCurrentRevision(Guid revisionId)
    {
        if (revisionId == Guid.Empty)
            throw new ArgumentException("Revisão inválida.", nameof(revisionId));

        CurrentRevisionId = revisionId;
        MarkUpdated();
    }

    public void TransitionTo(ProjectStatus target, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);

        if (!IsAllowed(Status, target))
            throw new InvalidOperationException($"Transição de '{Status}' para '{target}' não é permitida.");

        Status = target;
        MarkUpdated();
    }

    public static bool IsAllowed(ProjectStatus from, ProjectStatus to) => (from, to) switch
    {
        (ProjectStatus.Draft, ProjectStatus.InReview) => true,
        (ProjectStatus.InReview, ProjectStatus.Draft) => true,
        (ProjectStatus.InReview, ProjectStatus.Approved) => true,
        (ProjectStatus.Approved, ProjectStatus.InProduction) => true,
        (ProjectStatus.InProduction, ProjectStatus.Completed) => true,
        _ => false
    };

    public void EnsureVersion(uint expectedVersion)
    {
        if (expectedVersion != Version)
            throw new ResourceConflictException(Version);
    }

    private void EnsureEditable()
    {
        if (Status is ProjectStatus.Approved or ProjectStatus.InProduction or ProjectStatus.Completed)
            throw new InvalidOperationException("Projeto aprovado não pode ser alterado in-place. Abra uma nova revisão.");
    }
}
