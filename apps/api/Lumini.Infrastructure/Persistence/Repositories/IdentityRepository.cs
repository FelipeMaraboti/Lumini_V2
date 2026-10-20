using Lumini.Application.Common.Interfaces;
using Lumini.Domain.Identity;
using Microsoft.EntityFrameworkCore;

namespace Lumini.Infrastructure.Persistence.Repositories;

public class IdentityRepository : IIdentityRepository
{
    private readonly LuminiDbContext _context;

    public IdentityRepository(LuminiDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    public async Task<User?> GetUserByEmailAsync(string normalizedEmail, CancellationToken ct = default)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.EmailNormalized == normalizedEmail, ct);
    }

    public async Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct = default)
    {
        return await _context.Users.AnyAsync(u => u.EmailNormalized == normalizedEmail, ct);
    }

    public async Task<bool> SlugExistsAsync(string normalizedSlug, CancellationToken ct = default)
    {
        return await _context.Organizations.AnyAsync(o => o.Slug == normalizedSlug, ct);
    }

    public async Task AddOrganizationAsync(Organization organization, CancellationToken ct = default)
    {
        await _context.Organizations.AddAsync(organization, ct);
    }

    public async Task<Organization?> GetOrganizationByIdAsync(Guid organizationId, CancellationToken ct = default)
    {
        return await _context.Organizations.FirstOrDefaultAsync(o => o.Id == organizationId, ct);
    }

    public async Task AddUserAsync(User user, CancellationToken ct = default)
    {
        await _context.Users.AddAsync(user, ct);
    }

    public async Task AddRoleAsync(Role role, CancellationToken ct = default)
    {
        await _context.Roles.AddAsync(role, ct);
    }

    public async Task<Role?> GetRoleByIdAsync(Guid roleId, CancellationToken ct = default)
    {
        return await _context.Roles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => r.Id == roleId, ct);
    }

    public async Task<IReadOnlyList<Role>> GetRolesAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Roles
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == tenantId)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);
    }

    public async Task AddMembershipAsync(Membership membership, CancellationToken ct = default)
    {
        await _context.Memberships.AddAsync(membership, ct);
    }

    public async Task<IReadOnlyList<Membership>> GetUserMembershipsAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.Memberships
            .IgnoreQueryFilters()
            .Include(m => m.Organization)
            .Include(m => m.Role)
            .Where(m => m.UserId == userId)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Membership>> GetOrganizationMembersAsync(Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Memberships
            .IgnoreQueryFilters()
            .Include(m => m.User)
            .Include(m => m.Role)
            .Where(m => m.TenantId == tenantId)
            .ToListAsync(ct);
    }

    public async Task AddInvitationAsync(Invitation invitation, CancellationToken ct = default)
    {
        await _context.Invitations.AddAsync(invitation, ct);
    }

    public async Task<Invitation?> GetInvitationByTokenHashAsync(string tokenHash, CancellationToken ct = default)
    {
        return await _context.Invitations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.TokenHash == tokenHash, ct);
    }

    public async Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken ct = default)
    {
        await _context.RefreshTokens.AddAsync(refreshToken, ct);
    }

    public async Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken ct = default)
    {
        return await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _context.SaveChangesAsync(ct);
    }
}
