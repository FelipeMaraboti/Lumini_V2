using Lumini.Domain.Common;
using Lumini.Domain.Projects;
using Xunit;

namespace Lumini.UnitTests;

public class ProjectRulesTests
{
    [Fact]
    public void ApprovedRevision_RejectsInPlaceSnapshotChange()
    {
        var revision = new ProjectRevision(Guid.NewGuid(), Guid.NewGuid(), 1, "{}", Guid.NewGuid());
        revision.Approve();

        var error = Assert.Throws<InvalidOperationException>(() => revision.ReplaceSnapshot("{\"parts\":[]}"));
        Assert.Contains("imutável", error.Message);
    }

    [Fact]
    public void DraftRevision_AcceptsSnapshotChange()
    {
        var revision = new ProjectRevision(Guid.NewGuid(), Guid.NewGuid(), 1, "{}", Guid.NewGuid());
        revision.ReplaceSnapshot("{\"parts\":[1]}");
        Assert.Equal("{\"parts\":[1]}", revision.SnapshotJson);
    }

    [Fact]
    public void Project_RejectsIllegalTransition()
    {
        var project = new Project(Guid.NewGuid(), Guid.NewGuid(), "PZ-01", "Cozinha", Guid.NewGuid());
        Assert.Throws<InvalidOperationException>(() => project.TransitionTo(ProjectStatus.Approved, project.Version));
    }

    [Fact]
    public void Project_AllowsDraftToReviewThenApprovalPath()
    {
        var project = new Project(Guid.NewGuid(), Guid.NewGuid(), "PZ-01", "Cozinha", Guid.NewGuid());
        var version = project.Version;
        project.TransitionTo(ProjectStatus.InReview, version);
        project.TransitionTo(ProjectStatus.Approved, project.Version);
        Assert.Equal(ProjectStatus.Approved, project.Status);
    }

    [Fact]
    public void Project_RenameAfterApproval_IsRejected()
    {
        var project = new Project(Guid.NewGuid(), Guid.NewGuid(), "PZ-01", "Cozinha", Guid.NewGuid());
        project.TransitionTo(ProjectStatus.InReview, project.Version);
        project.TransitionTo(ProjectStatus.Approved, project.Version);

        Assert.Throws<InvalidOperationException>(() => project.Rename("Novo nome", project.Version));
    }

    [Fact]
    public void Project_StaleVersion_ThrowsConflict()
    {
        var project = new Project(Guid.NewGuid(), Guid.NewGuid(), "PZ-01", "Cozinha", Guid.NewGuid());
        var stale = project.Version;
        project.Rename("Bancada", stale);

        var error = Assert.Throws<ResourceConflictException>(() => project.Rename("Outro", stale));
        Assert.Equal(project.Version, error.CurrentVersion);
    }

    [Fact]
    public void OpenNextRevision_CopiesSnapshotAndReturnsProjectToDraft()
    {
        var tenant = Guid.NewGuid();
        var project = new Project(tenant, Guid.NewGuid(), "PZ-01", "Cozinha", Guid.NewGuid());
        var current = new ProjectRevision(tenant, project.Id, 1, "{\"ok\":true}", Guid.NewGuid());
        current.Approve();
        project.AssignCurrentRevision(current.Id);
        project.TransitionTo(ProjectStatus.InReview, project.Version);
        project.TransitionTo(ProjectStatus.Approved, project.Version);

        var next = project.OpenNextRevision(current, Guid.NewGuid(), project.Version);

        Assert.Equal(2, next.RevisionNumber);
        Assert.Equal(RevisionStatus.Draft, next.Status);
        Assert.Equal("{\"ok\":true}", next.SnapshotJson);
        Assert.Equal(ProjectStatus.Draft, project.Status);
        Assert.Equal(next.Id, project.CurrentRevisionId);
    }
}
