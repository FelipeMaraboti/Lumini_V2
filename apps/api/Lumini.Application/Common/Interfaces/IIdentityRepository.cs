using Lumini.Domain.Identity;

namespace Lumini.Application.Common.Interfaces;

public interface IIdentityRepository
{
    Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct = default);
    Task<User?> GetUserByEmailAsync(string normalizedEmail, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string normalizedSlug, CancellationToken ct = default);
    Task AddOrganizationAsync(Organization organization, CancellationToken ct = default);
    Task<Organization?> GetOrganizationByIdAsync(Guid organizationId, CancellationToken ct = default);
    Task AddUserAsync(User user, CancellationToken ct = default);
    Task AddRoleAsync(Role role, CancellationToken ct = default);
    Task<Role?> GetRoleByIdAsync(Guid roleId, CancellationToken ct = default);
    Task<IReadOnlyList<Role>> GetRolesAsync(Guid tenantId, CancellationToken ct = default);
    Task AddMembershipAsync(Membership membership, CancellationToken ct = default);
    Task<IReadOnlyList<Membership>> GetUserMembershipsAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<Membership>> GetOrganizationMembersAsync(Guid tenantId, CancellationToken ct = default);
    Task AddInvitationAsync(Invitation invitation, CancellationToken ct = default);
    Task<Invitation?> GetInvitationByTokenHashAsync(string tokenHash, CancellationToken ct = default);
    Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken ct = default);
    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}