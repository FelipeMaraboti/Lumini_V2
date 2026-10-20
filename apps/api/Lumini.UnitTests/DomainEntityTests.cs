using Lumini.Domain.Common;
using Xunit;

namespace Lumini.UnitTests;

public class TestEntity : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class DomainEntityTests
{
    [Fact]
    public void Entity_WhenCreated_ShouldHaveValidGuidAndInitialVersion()
    {
        // Act
        var entity = new TestEntity { Name = "Bancada Teste" };

        // Assert
        Assert.NotEqual(Guid.Empty, entity.Id);
        Assert.Equal(1u, entity.Version);
        Assert.True(entity.CreatedAtUtc <= DateTime.UtcNow);
        Assert.Null(entity.UpdatedAtUtc);
    }

    [Fact]
    public void Entity_WhenMarkUpdated_ShouldIncrementVersionAndSetTimestamp()
    {
        // Arrange
        var entity = new TestEntity { Name = "Bancada Teste" };

        // Act
        entity.MarkUpdated();

        // Assert
        Assert.Equal(2u, entity.Version);
        Assert.NotNull(entity.UpdatedAtUtc);
        Assert.True(entity.UpdatedAtUtc >= entity.CreatedAtUtc);
    }
}
