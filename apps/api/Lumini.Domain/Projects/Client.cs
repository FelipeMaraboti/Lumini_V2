using Lumini.Domain.Common;

namespace Lumini.Domain.Projects;

public class Client : Entity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string Name { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? PhoneDigits { get; private set; }
    public string? DocumentDigits { get; private set; }
    public string? Notes { get; private set; }
    public ClientStatus Status { get; private set; } = ClientStatus.Active;

    protected Client() { }

    public Client(Guid tenantId, string name, string? email, string? phoneDigits, string? documentDigits, string? notes)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome do cliente é obrigatório.", nameof(name));

        TenantId = tenantId;
        Name = name.Trim();
        Email = NormalizeEmail(email);
        PhoneDigits = NormalizeOptional(phoneDigits);
        DocumentDigits = NormalizeOptional(documentDigits);
        Notes = NormalizeOptional(notes);
    }

    public void Rename(string name, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome do cliente é obrigatório.", nameof(name));

        Name = name.Trim();
        MarkUpdated();
    }

    public void UpdateContact(string? email, string? phoneDigits, string? documentDigits, string? notes, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        Email = NormalizeEmail(email);
        PhoneDigits = NormalizeOptional(phoneDigits);
        DocumentDigits = NormalizeOptional(documentDigits);
        Notes = NormalizeOptional(notes);
        MarkUpdated();
    }

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public void Update(string name, string? email, string? phoneDigits, string? documentDigits, string? notes, uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome do cliente é obrigatório.", nameof(name));

        Name = name.Trim();
        Email = NormalizeEmail(email);
        PhoneDigits = NormalizeOptional(phoneDigits);
        DocumentDigits = NormalizeOptional(documentDigits);
        Notes = NormalizeOptional(notes);
        MarkUpdated();
    }

    public void Archive(uint expectedVersion)
    {
        EnsureVersion(expectedVersion);
        if (Status == ClientStatus.Archived)
            return;

        Status = ClientStatus.Archived;
        MarkUpdated();
    }

    public void EnsureVersion(uint expectedVersion)
    {
        if (expectedVersion != Version)
            throw new ResourceConflictException(Version);
    }
}
