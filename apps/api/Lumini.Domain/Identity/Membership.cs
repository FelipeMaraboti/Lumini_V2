using Lumini.Domain.Common;

namespace Lumini.Domain.Identity;

public class Permission
{
    public string Code { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Module { get; private set; } = string.Empty;

    protected Permission() { }

    public Permission(string code, string description, string module)
    {
        Code = code;
        Description = description;
        Module = module;
    }
}

public class Role : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public bool IsSystemRole { get; private set; }

    private readonly List<string> _permissionCodes = new();
    public IReadOnlyCollection<string> PermissionCodes => _permissionCodes.AsReadOnly();

    protected Role() { }

    public Role(Guid tenantId, string name, string description, bool isSystemRole = false)
    {
        TenantId = tenantId;
        Name = name.Trim();
        Description = description?.Trim() ?? string.Empty;
        IsSystemRole = isSystemRole;
    }

    public void AddPermission(string permissionCode)
    {
        if (!_permissionCodes.Contains(permissionCode))
        {
            _permissionCodes.Add(permissionCode);
            MarkUpdated();
        }
    }

    public void RemovePermission(string permissionCode)
    {
        if (_permissionCodes.Remove(permissionCode))
        {
            MarkUpdated();
        }
    }
}

public class Membership : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; private set; }
    public Guid RoleId { get; private set; }
    public UserStatus Status { get; private set; } = UserStatus.Active;

    public User User { get; private set; } = null!;
    public Organization Organization { get; private set; } = null!;
    public Role Role { get; private set; } = null!;

    protected Membership() { }

    public Membership(Guid tenantId, Guid userId, Guid roleId)
    {
        TenantId = tenantId;
        UserId = userId;
        RoleId = roleId;
    }

    public void ChangeRole(Guid newRoleId)
    {
        RoleId = newRoleId;
        MarkUpdated();
    }

    public void Suspend()
    {
        Status = UserStatus.Suspended;
        MarkUpdated();
    }

    public void Activate()
    {
        Status = UserStatus.Active;
        MarkUpdated();
    }
}
