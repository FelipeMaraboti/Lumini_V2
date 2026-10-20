using Microsoft.AspNetCore.Authorization;

namespace Lumini.Application.Identity.Authorization;

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }

    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }
}

public static class AuthorizationPolicies
{
    public const string PermissionPrefix = "perm:";

    public static string For(string permission) => $"{PermissionPrefix}{permission}";
}
