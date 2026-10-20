using NetArchTest.Rules;
using Xunit;

namespace Lumini.ArchitectureTests;

public class CleanArchitectureTests
{
    private const string DomainNamespace = "Lumini.Domain";
    private const string ApplicationNamespace = "Lumini.Application";
    private const string InfrastructureNamespace = "Lumini.Infrastructure";
    private const string ApiNamespace = "Lumini.Api";
    private const string WorkersNamespace = "Lumini.Workers";

    [Fact]
    public void Domain_ShouldNotHaveDependencyOnOtherProjects()
    {
        // Arrange
        var assembly = typeof(Lumini.Domain.Common.Entity).Assembly;

        var otherProjects = new[]
        {
            ApplicationNamespace,
            InfrastructureNamespace,
            ApiNamespace,
            WorkersNamespace
        };

        // Act
        var result = Types.InAssembly(assembly)
            .ShouldNot()
            .HaveDependencyOnAny(otherProjects)
            .GetResult();

        // Assert
        Assert.True(result.IsSuccessful, "Lumini.Domain não pode depender de Application, Infrastructure, Api ou Workers.");
    }

    [Fact]
    public void Application_ShouldNotHaveDependencyOnInfrastructureOrApi()
    {
        // Arrange
        var assembly = typeof(Lumini.Application.Common.Interfaces.ITenantContext).Assembly;

        var forbiddenProjects = new[]
        {
            InfrastructureNamespace,
            ApiNamespace,
            WorkersNamespace
        };

        // Act
        var result = Types.InAssembly(assembly)
            .ShouldNot()
            .HaveDependencyOnAny(forbiddenProjects)
            .GetResult();

        // Assert
        Assert.True(result.IsSuccessful, "Lumini.Application não pode depender de Infrastructure, Api ou Workers.");
    }
}
