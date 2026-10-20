using Lumini.Domain.Identity;

namespace Lumini.Application.Common.Interfaces;

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public interface ITokenHasher
{
    string HashToken(string rawToken);
}

public interface ITokenService
{
    string GenerateJwtToken(User user, Guid tenantId, Role role);
    string GenerateRefreshToken();
}
