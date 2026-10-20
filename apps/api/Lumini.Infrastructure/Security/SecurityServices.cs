using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Lumini.Application.Common.Interfaces;
using Lumini.Domain.Identity;
using Microsoft.IdentityModel.Tokens;

namespace Lumini.Infrastructure.Security;

public class PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;

    public string HashPassword(string password)
    {
        using var algorithm = new Rfc2898DeriveBytes(
            password,
            SaltSize,
            Iterations,
            HashAlgorithmName.SHA256
        );
        var key = Convert.ToBase64String(algorithm.GetBytes(KeySize));
        var salt = Convert.ToBase64String(algorithm.Salt);
        return $"{Iterations}.{salt}.{key}";
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        var parts = passwordHash.Split('.', 3);
        if (parts.Length != 3)
            return false;

        var iterations = Convert.ToInt32(parts[0]);
        var salt = Convert.FromBase64String(parts[1]);
        var key = Convert.FromBase64String(parts[2]);

        using var algorithm = new Rfc2898DeriveBytes(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256
        );
        var keyToCheck = algorithm.GetBytes(KeySize);
        return CryptographicOperations.FixedTimeEquals(keyToCheck, key);
    }
}

public class TokenHasher : ITokenHasher
{
    public string HashToken(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }
}

public class JwtTokenService : ITokenService
{
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly TimeSpan _accessTokenLifetime;

    public JwtTokenService(
        string? secretKey = null,
        string issuer = "LuminiApi",
        string audience = "LuminiWeb",
        TimeSpan? accessTokenLifetime = null)
    {
        _secretKey = secretKey ?? "Lumini_Secret_Key_Super_Secure_Production_Grade_2026_Marmoraria!";
        _issuer = issuer;
        _audience = audience;
        _accessTokenLifetime = accessTokenLifetime ?? TimeSpan.FromMinutes(30);
    }

    public string GenerateJwtToken(User user, Guid tenantId, Role role)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_secretKey);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Email, user.Email),
            new("display_name", user.DisplayName),
            new("tenant_id", tenantId.ToString()),
            new(ClaimTypes.Role, role.Name),
            new("role", role.Name)
        };

        foreach (var permission in role.PermissionCodes)
            claims.Add(new Claim("permission", permission));

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.Add(_accessTokenLifetime),
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature
            )
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }
}

/// <summary>
/// Rate limiter em memória: bloqueia após N falhas em uma janela de tempo.
/// Adequado para desenvolvimento; em produção usar Redis/distribuído.
/// </summary>
public class InMemoryLoginRateLimiter : ILoginRateLimiter
{
    private readonly ConcurrentDictionary<string, AttemptWindow> _attempts = new();
    private readonly int _maxFailures;
    private readonly TimeSpan _window;

    public InMemoryLoginRateLimiter(int maxFailures = 5, TimeSpan? window = null)
    {
        _maxFailures = maxFailures;
        _window = window ?? TimeSpan.FromMinutes(15);
    }

    public bool IsBlocked(string key)
    {
        if (!_attempts.TryGetValue(Normalize(key), out var window))
            return false;

        if (DateTime.UtcNow - window.StartedAtUtc > _window)
        {
            _attempts.TryRemove(Normalize(key), out _);
            return false;
        }

        return window.Failures >= _maxFailures;
    }

    public void RecordFailure(string key)
    {
        var normalized = Normalize(key);
        _attempts.AddOrUpdate(
            normalized,
            _ => new AttemptWindow(1, DateTime.UtcNow),
            (_, existing) =>
            {
                if (DateTime.UtcNow - existing.StartedAtUtc > _window)
                    return new AttemptWindow(1, DateTime.UtcNow);
                return existing with { Failures = existing.Failures + 1 };
            });
    }

    public void Reset(string key) => _attempts.TryRemove(Normalize(key), out _);

    private static string Normalize(string key) => key.Trim().ToUpperInvariant();

    private sealed record AttemptWindow(int Failures, DateTime StartedAtUtc);
}
