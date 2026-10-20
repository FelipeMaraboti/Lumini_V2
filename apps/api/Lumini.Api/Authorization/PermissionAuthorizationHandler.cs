using Lumini.Application.Identity.Authorization;
using Lumini.Domain.Identity;
using Microsoft.AspNetCore.Authorization;

namespace Lumini.Api.Authorization;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var permissions = context.User.FindAll("permission").Select(c => c.Value).ToHashSet(StringComparer.Ordinal);

        if (permissions.Contains(requirement.Permission) ||
            permissions.Contains(Permissions.OrganizationManage))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public static class PermissionPolicyExtensions
{
    public static AuthorizationBuilder AddLuminiPermissionPolicies(this AuthorizationBuilder builder)
    {
        foreach (var permission in Permissions.All)
        {
            builder.AddPolicy(AuthorizationPolicies.For(permission), policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.AddRequirements(new PermissionRequirement(permission));
            });
        }

        return builder;
    }
}
