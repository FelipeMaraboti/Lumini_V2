using Lumini.Domain.Common;

namespace Lumini.Domain.Identity;

public class Organization : Entity
{
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string DocumentNumber { get; private set; } = string.Empty; // CNPJ/CPF
    public OrganizationStatus Status { get; private set; } = OrganizationStatus.Active;

    private readonly List<Membership> _memberships = new();
    public IReadOnlyCollection<Membership> Memberships => _memberships.AsReadOnly();

    protected Organization() { }

    public Organization(string name, string slug, string documentNumber)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome da marmoraria é obrigatório.", nameof(name));
        
        if (string.IsNullOrWhiteSpace(slug))
            throw new ArgumentException("O slug da marmoraria é obrigatório.", nameof(slug));

        Name = name.Trim();
        Slug = slug.Trim().ToLowerInvariant();
        DocumentNumber = documentNumber?.Trim() ?? string.Empty;
    }

    public void UpdateDetails(string name, string documentNumber)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("O nome da marmoraria é obrigatório.", nameof(name));

        Name = name.Trim();
        DocumentNumber = documentNumber?.Trim() ?? string.Empty;
        MarkUpdated();
    }
}
