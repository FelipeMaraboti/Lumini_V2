namespace Lumini.Domain.Identity;

public static class Permissions
{
    // Organização
    public const string OrganizationRead = "organization.read";
    public const string OrganizationManage = "organization.manage";

    // Membros & Papéis
    public const string MembersRead = "members.read";
    public const string MembersManage = "members.manage";
    public const string RolesRead = "roles.read";
    public const string RolesManage = "roles.manage";

    // Clientes
    public const string ClientsRead = "clients.read";
    public const string ClientsCreate = "clients.create";
    public const string ClientsEdit = "clients.edit";
    public const string ClientsArchive = "clients.archive";

    // Projetos
    public const string ProjectsRead = "projects.read";
    public const string ProjectsCreate = "projects.create";
    public const string ProjectsEdit = "projects.edit";
    public const string ProjectsArchive = "projects.archive";

    // Desenho CAD 2D/3D
    public const string DrawingRead = "drawing.read";
    public const string DrawingEdit = "drawing.edit";
    public const string DrawingImport = "drawing.import";
    public const string DrawingExport = "drawing.export";

    // Orçamento & Preços
    public const string QuotesRead = "quotes.read";
    public const string QuotesCreate = "quotes.create";
    public const string QuotesEdit = "quotes.edit";
    public const string QuotesApprove = "quotes.approve";
    public const string QuotesExport = "quotes.export";
    public const string PricingRead = "pricing.read";
    public const string PricingManage = "pricing.manage";

    // Corte & Nesting
    public const string CuttingRead = "cutting.read";
    public const string CuttingCreate = "cutting.create";
    public const string CuttingApprove = "cutting.approve";
    public const string CuttingExport = "cutting.export";

    // Estoque
    public const string InventoryRead = "inventory.read";
    public const string InventoryCreate = "inventory.create";
    public const string InventoryMove = "inventory.move";
    public const string InventoryAdjust = "inventory.adjust";

    // Documentos & PDFs
    public const string DocumentsRead = "documents.read";
    public const string DocumentsCreate = "documents.create";
    public const string DocumentsExport = "documents.export";

    // Auditoria
    public const string AuditRead = "audit.read";

    public static readonly IReadOnlyList<string> All = new[]
    {
        OrganizationRead, OrganizationManage,
        MembersRead, MembersManage, RolesRead, RolesManage,
        ClientsRead, ClientsCreate, ClientsEdit, ClientsArchive,
        ProjectsRead, ProjectsCreate, ProjectsEdit, ProjectsArchive,
        DrawingRead, DrawingEdit, DrawingImport, DrawingExport,
        QuotesRead, QuotesCreate, QuotesEdit, QuotesApprove, QuotesExport,
        PricingRead, PricingManage,
        CuttingRead, CuttingCreate, CuttingApprove, CuttingExport,
        InventoryRead, InventoryCreate, InventoryMove, InventoryAdjust,
        DocumentsRead, DocumentsCreate, DocumentsExport,
        AuditRead
    };
}
