using Lumini.Domain.Identity;
using Lumini.Infrastructure.Security;
using Xunit;

namespace Lumini.UnitTests;

public class IdentityDomainTests
{
    [Fact]
    public void Invitation_WhenExpired_ShouldRejectAccept()
    {
        var invitation = new Invitation(
            Guid.NewGuid(),
            "designer@marmoraria.com",
            Guid.NewGuid(),
            "hash",
            TimeSpan.FromMilliseconds(-1));

        Assert.True(invitation.IsExpired);
        Assert.Throws<InvalidOperationException>(() => invitation.Accept());
    }

    [Fact]
    public void Invitation_WhenAcceptedTwice_ShouldRejectSecondAccept()
    {
        var invitation = new Invitation(
            Guid.NewGuid(),
            "designer@marmoraria.com",
            Guid.NewGuid(),
            "hash",
            TimeSpan.FromDays(3));

        invitation.Accept();
        Assert.True(invitation.IsAccepted);
        Assert.Throws<InvalidOperationException>(() => invitation.Accept());
    }

    [Fact]
    public void RefreshToken_WhenRevoked_ShouldNotBeActive()
    {
        var token = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "abc", TimeSpan.FromDays(7));
        Assert.True(token.IsActive);

        token.Revoke("replacement");
        Assert.False(token.IsActive);
        Assert.True(token.IsRevoked);
        Assert.Equal("replacement", token.ReplacedByTokenHash);
    }

    [Fact]
    public void PasswordHasher_ShouldVerifyRoundTrip()
    {
        var hasher = new PasswordHasher();
        var hash = hasher.HashPassword("SenhaForte123");

        Assert.True(hasher.VerifyPassword("SenhaForte123", hash));
        Assert.False(hasher.VerifyPassword("errada", hash));
    }

    [Fact]
    public void TokenHasher_ShouldBeDeterministicAndNotPlaintext()
    {
        var hasher = new TokenHasher();
        var raw = "invite-token-plain";
        var hash1 = hasher.HashToken(raw);
        var hash2 = hasher.HashToken(raw);

        Assert.Equal(hash1, hash2);
        Assert.NotEqual(raw, hash1);
    }

    [Fact]
    public void Role_ShouldIsolatePermissionCatalogPerTenant()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var roleA = new Role(tenantA, "Designer", "Tenant A");
        roleA.AddPermission(Permissions.DrawingEdit);

        var roleB = new Role(tenantB, "Designer", "Tenant B");
        roleB.AddPermission(Permissions.QuotesApprove);

        Assert.Equal(tenantA, roleA.TenantId);
        Assert.Equal(tenantB, roleB.TenantId);
        Assert.DoesNotContain(Permissions.QuotesApprove, roleA.PermissionCodes);
        Assert.DoesNotContain(Permissions.DrawingEdit, roleB.PermissionCodes);
    }

    [Fact]
    public void LoginRateLimiter_ShouldBlockAfterMaxFailures()
    {
        var limiter = new InMemoryLoginRateLimiter(maxFailures: 3, window: TimeSpan.FromMinutes(15));
        const string key = "user@test.com|127.0.0.1";

        Assert.False(limiter.IsBlocked(key));
        limiter.RecordFailure(key);
        limiter.RecordFailure(key);
        limiter.RecordFailure(key);

        Assert.True(limiter.IsBlocked(key));
        limiter.Reset(key);
        Assert.False(limiter.IsBlocked(key));
    }
}
