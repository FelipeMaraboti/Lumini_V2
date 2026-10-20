namespace Lumini.Application.Identity.DTOs;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    Guid UserId,
    string DisplayName,
    string Email,
    Guid TenantId,
    string OrganizationName,
    string RoleName,
    IReadOnlyCollection<string> Permissions
);

public record RefreshTokenRequest(string RefreshToken);

public record RegisterOrganizationRequest(
    string OrganizationName,
    string Slug,
    string DocumentNumber,
    string AdminDisplayName,
    string AdminEmail,
    string AdminPassword
);

public record InviteMemberRequest(
    string Email,
    Guid RoleId
);

public record InviteMemberResponse(
    string Message,
    DateTime ExpiresAtUtc,
    string? InviteToken = null
);

public record AcceptInvitationRequest(
    string InviteToken,
    string DisplayName,
    string Password
);

public record MemberResponse(
    Guid MembershipId,
    Guid UserId,
    string DisplayName,
    string Email,
    string RoleName,
    Guid RoleId,
    string Status
);

public record RoleResponse(
    Guid Id,
    string Name,
    string Description,
    bool IsSystemRole,
    IReadOnlyCollection<string> PermissionCodes
);

public record CreateRoleRequest(
    string Name,
    string Description,
    IReadOnlyCollection<string> PermissionCodes
);
