using System.Security.Cryptography;
using Lumini.Application.Common.Interfaces;
using Lumini.Application.Identity.DTOs;
using Lumini.Domain.Common;
using Lumini.Domain.Identity;

namespace Lumini.Application.Identity.Services;

public interface IAuthService
{
    Task<LoginResponse> RegisterOrganizationAsync(RegisterOrganizationRequest request, CancellationToken ct = default);
    Task<LoginResponse> LoginAsync(LoginRequest request, string rateLimitKey, CancellationToken ct = default);
    Task<LoginResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default);
    Task LogoutAsync(RefreshTokenRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<MemberResponse>> GetMembersAsync(CancellationToken ct = default);
    Task<InviteMemberResponse> InviteMemberAsync(InviteMemberRequest request, CancellationToken ct = default);
    Task<LoginResponse> AcceptInvitationAsync(AcceptInvitationRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<RoleResponse>> GetRolesAsync(CancellationToken ct = default);
    Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request, CancellationToken ct = default);
}

public class AuthService : IAuthService
{
    private static readonly TimeSpan RefreshTokenValidity = TimeSpan.FromDays(14);
    private static readonly TimeSpan InvitationValidity = TimeSpan.FromDays(3);

    private readonly IIdentityRepository _repository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenHasher _tokenHasher;
    private readonly ITokenService _tokenService;
    private readonly ITenantContext _tenantContext;
    private readonly ILoginRateLimiter _rateLimiter;

    public AuthService(
        IIdentityRepository repository,
        IPasswordHasher passwordHasher,
        ITokenHasher tokenHasher,
        ITokenService tokenService,
        ITenantContext tenantContext,
        ILoginRateLimiter rateLimiter)
    {
        _repository = repository;
        _passwordHasher = passwordHasher;
        _tokenHasher = tokenHasher;
        _tokenService = tokenService;
        _tenantContext = tenantContext;
        _rateLimiter = rateLimiter;
    }

    public async Task<LoginResponse> RegisterOrganizationAsync(RegisterOrganizationRequest request, CancellationToken ct = default)
    {
        ValidatePassword(request.AdminPassword);

        var normalizedEmail = request.AdminEmail.Trim().ToUpperInvariant();
        if (await _repository.EmailExistsAsync(normalizedEmail, ct))
            throw new InvalidOperationException("Este e-mail já está cadastrado.");

        var normalizedSlug = request.Slug.Trim().ToLowerInvariant();
        if (await _repository.SlugExistsAsync(normalizedSlug, ct))
            throw new InvalidOperationException("Este identificador de marmoraria (slug) já está em uso.");

        var org = new Organization(request.OrganizationName, request.Slug, request.DocumentNumber);
        await _repository.AddOrganizationAsync(org, ct);

        var ownerRole = CreateSystemRole(org.Id, "Owner", "Proprietário com acesso total à marmoraria", Permissions.All);
        await _repository.AddRoleAsync(ownerRole, ct);

        // Presets iniciais para operação da marmoraria
        await _repository.AddRoleAsync(CreateSystemRole(org.Id, "Admin", "Administrador operacional", Permissions.All.Where(p => p != Permissions.OrganizationManage).ToList()), ct);
        await _repository.AddRoleAsync(CreateSystemRole(org.Id, "Designer", "Desenhista CAD", new[]
        {
            Permissions.ProjectsRead, Permissions.ProjectsCreate, Permissions.ProjectsEdit,
            Permissions.DrawingRead, Permissions.DrawingEdit, Permissions.DrawingImport, Permissions.DrawingExport,
            Permissions.ClientsRead, Permissions.ClientsCreate, Permissions.DocumentsRead, Permissions.DocumentsExport
        }), ct);
        await _repository.AddRoleAsync(CreateSystemRole(org.Id, "Viewer", "Somente leitura", new[]
        {
            Permissions.ProjectsRead, Permissions.ClientsRead, Permissions.DrawingRead,
            Permissions.QuotesRead, Permissions.DocumentsRead, Permissions.InventoryRead, Permissions.CuttingRead
        }), ct);

        var passwordHash = _passwordHasher.HashPassword(request.AdminPassword);
        var adminUser = new User(request.AdminEmail, request.AdminDisplayName, passwordHash);
        await _repository.AddUserAsync(adminUser, ct);

        var membership = new Membership(org.Id, adminUser.Id, ownerRole.Id);
        await _repository.AddMembershipAsync(membership, ct);
        await _repository.SaveChangesAsync(ct);

        return await IssueTokensAsync(adminUser, org.Id, org.Name, ownerRole, ct);
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, string rateLimitKey, CancellationToken ct = default)
    {
        if (_rateLimiter.IsBlocked(rateLimitKey))
            throw new UnauthorizedAccessException("Muitas tentativas de login. Aguarde alguns minutos e tente novamente.");

        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var user = await _repository.GetUserByEmailAsync(normalizedEmail, ct);

        if (user == null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            _rateLimiter.RecordFailure(rateLimitKey);
            throw new UnauthorizedAccessException("E-mail ou senha incorretos.");
        }

        if (user.Status != UserStatus.Active)
        {
            _rateLimiter.RecordFailure(rateLimitKey);
            throw new UnauthorizedAccessException("Esta conta de usuário está inativa ou suspensa.");
        }

        var memberships = await _repository.GetUserMembershipsAsync(user.Id, ct);
        var activeMemberships = memberships.Where(m => m.Status == UserStatus.Active).ToList();

        if (!activeMemberships.Any())
        {
            _rateLimiter.RecordFailure(rateLimitKey);
            throw new UnauthorizedAccessException("Usuário não possui vínculos ativos com nenhuma empresa.");
        }

        var activeMembership = (_tenantContext.HasTenant
            ? activeMemberships.FirstOrDefault(m => m.TenantId == _tenantContext.RequiredTenantId)
            : null) ?? activeMemberships.First();

        _rateLimiter.Reset(rateLimitKey);
        return await IssueTokensAsync(user, activeMembership.TenantId, activeMembership.Organization.Name, activeMembership.Role, ct);
    }

    public async Task<LoginResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new UnauthorizedAccessException("Refresh token inválido.");

        var hash = _tokenHasher.HashToken(request.RefreshToken);
        var stored = await _repository.GetRefreshTokenByHashAsync(hash, ct);

        if (stored == null || !stored.IsActive)
            throw new UnauthorizedAccessException("Refresh token inválido ou expirado.");

        var user = await _repository.GetUserByIdAsync(stored.UserId, ct)
            ?? throw new UnauthorizedAccessException("Usuário não encontrado.");

        if (user.Status != UserStatus.Active)
            throw new UnauthorizedAccessException("Esta conta de usuário está inativa ou suspensa.");

        var memberships = await _repository.GetUserMembershipsAsync(user.Id, ct);
        var membership = memberships.FirstOrDefault(m => m.TenantId == stored.TenantId && m.Status == UserStatus.Active)
            ?? throw new UnauthorizedAccessException("Vínculo com a empresa não está ativo.");

        // Rotação: revoga o token antigo e emite um novo
        var newRaw = _tokenService.GenerateRefreshToken();
        var newHash = _tokenHasher.HashToken(newRaw);
        stored.Revoke(newHash);

        var replacement = new RefreshToken(user.Id, membership.TenantId, newHash, RefreshTokenValidity);
        await _repository.AddRefreshTokenAsync(replacement, ct);
        await _repository.SaveChangesAsync(ct);

        var accessToken = _tokenService.GenerateJwtToken(user, membership.TenantId, membership.Role);
        return new LoginResponse(
            AccessToken: accessToken,
            RefreshToken: newRaw,
            UserId: user.Id,
            DisplayName: user.DisplayName,
            Email: user.Email,
            TenantId: membership.TenantId,
            OrganizationName: membership.Organization.Name,
            RoleName: membership.Role.Name,
            Permissions: membership.Role.PermissionCodes
        );
    }

    public async Task LogoutAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return;

        var hash = _tokenHasher.HashToken(request.RefreshToken);
        var stored = await _repository.GetRefreshTokenByHashAsync(hash, ct);
        if (stored == null || stored.IsRevoked)
            return;

        stored.Revoke();
        await _repository.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<MemberResponse>> GetMembersAsync(CancellationToken ct = default)
    {
        var tenantId = _tenantContext.RequiredTenantId;
        var members = await _repository.GetOrganizationMembersAsync(tenantId, ct);

        return members.Select(m => new MemberResponse(
            m.Id,
            m.UserId,
            m.User.DisplayName,
            m.User.Email,
            m.Role.Name,
            m.RoleId,
            m.Status.ToString()
        )).ToList();
    }

    public async Task<InviteMemberResponse> InviteMemberAsync(InviteMemberRequest request, CancellationToken ct = default)
    {
        var tenantId = _tenantContext.RequiredTenantId;
        var role = await _repository.GetRoleByIdAsync(request.RoleId, ct)
            ?? throw new ArgumentException("Papel informado não existe.", nameof(request.RoleId));

        if (role.TenantId != tenantId)
            throw new UnauthorizedAccessException("Papel não pertence à marmoraria ativa.");

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var tokenHash = _tokenHasher.HashToken(rawToken);
        var invitation = new Invitation(tenantId, request.Email, request.RoleId, tokenHash, InvitationValidity);

        await _repository.AddInvitationAsync(invitation, ct);
        await _repository.SaveChangesAsync(ct);

        // rawToken é devolvido uma única vez (em produção seria enviado por e-mail; nunca persistido em claro).
        return new InviteMemberResponse(
            Message: "Convite gerado com sucesso.",
            ExpiresAtUtc: invitation.ExpiresAtUtc,
            InviteToken: rawToken
        );
    }

    public async Task<LoginResponse> AcceptInvitationAsync(AcceptInvitationRequest request, CancellationToken ct = default)
    {
        ValidatePassword(request.Password);

        var tokenHash = _tokenHasher.HashToken(request.InviteToken);
        var invitation = await _repository.GetInvitationByTokenHashAsync(tokenHash, ct)
            ?? throw new InvalidOperationException("Convite inválido ou inexistente.");

        invitation.Accept();

        var role = await _repository.GetRoleByIdAsync(invitation.RoleId, ct)
            ?? throw new InvalidOperationException("Papel do convite não encontrado.");

        var org = await _repository.GetOrganizationByIdAsync(invitation.TenantId, ct)
            ?? throw new InvalidOperationException("Organização do convite não encontrada.");

        var normalizedEmail = invitation.Email.Trim().ToUpperInvariant();
        var existingUser = await _repository.GetUserByEmailAsync(normalizedEmail, ct);
        User user;

        if (existingUser != null)
        {
            user = existingUser;
        }
        else
        {
            var passwordHash = _passwordHasher.HashPassword(request.Password);
            user = new User(invitation.Email, request.DisplayName, passwordHash);
            await _repository.AddUserAsync(user, ct);
        }

        var membership = new Membership(invitation.TenantId, user.Id, invitation.RoleId);
        await _repository.AddMembershipAsync(membership, ct);
        await _repository.SaveChangesAsync(ct);

        return await IssueTokensAsync(user, org.Id, org.Name, role, ct);
    }

    public async Task<IReadOnlyList<RoleResponse>> GetRolesAsync(CancellationToken ct = default)
    {
        var tenantId = _tenantContext.RequiredTenantId;
        var roles = await _repository.GetRolesAsync(tenantId, ct);
        return roles.Select(MapRole).ToList();
    }

    public async Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request, CancellationToken ct = default)
    {
        var tenantId = _tenantContext.RequiredTenantId;

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("O nome do papel é obrigatório.", nameof(request.Name));

        var invalid = request.PermissionCodes.Where(p => !Permissions.All.Contains(p)).ToList();
        if (invalid.Count > 0)
            throw new ArgumentException($"Permissões inválidas: {string.Join(", ", invalid)}");

        var role = new Role(tenantId, request.Name, request.Description, isSystemRole: false);
        foreach (var code in request.PermissionCodes.Distinct())
            role.AddPermission(code);

        await _repository.AddRoleAsync(role, ct);
        await _repository.SaveChangesAsync(ct);
        return MapRole(role);
    }

    private async Task<LoginResponse> IssueTokensAsync(User user, Guid tenantId, string organizationName, Role role, CancellationToken ct)
    {
        var accessToken = _tokenService.GenerateJwtToken(user, tenantId, role);
        var rawRefresh = _tokenService.GenerateRefreshToken();
        var refreshHash = _tokenHasher.HashToken(rawRefresh);

        await _repository.AddRefreshTokenAsync(new RefreshToken(user.Id, tenantId, refreshHash, RefreshTokenValidity), ct);
        await _repository.SaveChangesAsync(ct);

        return new LoginResponse(
            AccessToken: accessToken,
            RefreshToken: rawRefresh,
            UserId: user.Id,
            DisplayName: user.DisplayName,
            Email: user.Email,
            TenantId: tenantId,
            OrganizationName: organizationName,
            RoleName: role.Name,
            Permissions: role.PermissionCodes
        );
    }

    private static Role CreateSystemRole(Guid tenantId, string name, string description, IEnumerable<string> permissions)
    {
        var role = new Role(tenantId, name, description, isSystemRole: true);
        foreach (var permission in permissions)
            role.AddPermission(permission);
        return role;
    }

    private static RoleResponse MapRole(Role role) => new(
        role.Id,
        role.Name,
        role.Description,
        role.IsSystemRole,
        role.PermissionCodes
    );

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            throw new ArgumentException("A senha deve ter no mínimo 8 caracteres.");
    }
}
