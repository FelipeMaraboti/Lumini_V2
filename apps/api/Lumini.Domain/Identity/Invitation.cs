using Lumini.Domain.Common;

namespace Lumini.Domain.Identity;

public class Invitation : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string Email { get; private set; } = string.Empty;
    public Guid RoleId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime? AcceptedAtUtc { get; private set; }
    public bool IsAccepted => AcceptedAtUtc.HasValue;
    public bool IsExpired => DateTime.UtcNow > ExpiresAtUtc;

    protected Invitation() { }

    public Invitation(Guid tenantId, string email, Guid roleId, string tokenHash, TimeSpan validity)
    {
        TenantId = tenantId;
        Email = email.Trim().ToLowerInvariant();
        RoleId = roleId;
        TokenHash = tokenHash;
        ExpiresAtUtc = DateTime.UtcNow.Add(validity);
    }

    public void Accept()
    {
        if (IsExpired)
            throw new InvalidOperationException("Este convite já expirou.");

        if (IsAccepted)
            throw new InvalidOperationException("Este convite já foi aceito anteriormente.");

        AcceptedAtUtc = DateTime.UtcNow;
        MarkUpdated();
    }
}
