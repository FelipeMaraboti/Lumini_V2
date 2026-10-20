using Lumini.Domain.Common;

namespace Lumini.Domain.Identity;

public class User : Entity
{
    public string Email { get; private set; } = string.Empty;
    public string EmailNormalized { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public UserStatus Status { get; private set; } = UserStatus.Active;

    private readonly List<Membership> _memberships = new();
    public IReadOnlyCollection<Membership> Memberships => _memberships.AsReadOnly();

    protected User() { }

    public User(string email, string displayName, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("O e-mail é obrigatório.", nameof(email));

        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("O nome de exibição é obrigatório.", nameof(displayName));

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("O hash da senha é obrigatório.", nameof(passwordHash));

        Email = email.Trim().ToLowerInvariant();
        EmailNormalized = Email.ToUpperInvariant();
        DisplayName = displayName.Trim();
        PasswordHash = passwordHash;
    }

    public void UpdateProfile(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("O nome de exibição é obrigatório.", nameof(displayName));

        DisplayName = displayName.Trim();
        MarkUpdated();
    }

    public void ChangePassword(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new ArgumentException("O novo hash da senha é obrigatório.", nameof(newPasswordHash));

        PasswordHash = newPasswordHash;
        MarkUpdated();
    }
}
