using Lumini.Domain.Common;

namespace Lumini.Domain.Identity;

/// <summary>
/// Refresh token de uso controlado. O valor em claro nunca é persistido — apenas o hash.
/// </summary>
public class RefreshToken : Entity
{
    public Guid UserId { get; private set; }
    public Guid TenantId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime? RevokedAtUtc { get; private set; }
    public string? ReplacedByTokenHash { get; private set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;
    public bool IsRevoked => RevokedAtUtc.HasValue;
    public bool IsActive => !IsExpired && !IsRevoked;

    protected RefreshToken() { }

    public RefreshToken(Guid userId, Guid tenantId, string tokenHash, TimeSpan validity)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
            throw new ArgumentException("O hash do refresh token é obrigatório.", nameof(tokenHash));

        UserId = userId;
        TenantId = tenantId;
        TokenHash = tokenHash;
        ExpiresAtUtc = DateTime.UtcNow.Add(validity);
    }

    public void Revoke(string? replacedByTokenHash = null)
    {
        if (IsRevoked)
            return;

        RevokedAtUtc = DateTime.UtcNow;
        ReplacedByTokenHash = replacedByTokenHash;
        MarkUpdated();
    }
}
