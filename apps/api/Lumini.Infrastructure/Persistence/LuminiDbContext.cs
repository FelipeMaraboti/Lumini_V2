using Lumini.Application.Common.Interfaces;
using Lumini.Domain.Audit;
using Lumini.Domain.Common;
using Lumini.Domain.Identity;
using Lumini.Domain.Projects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Lumini.Infrastructure.Persistence;

public class LuminiDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    /// <summary>
    /// Exposto para Query Filters dinâmicos por request (EF traduz acesso a propriedades do DbContext).
    /// </summary>
    public Guid? CurrentTenantId => _tenantContext?.TenantId;

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Membership> Memberships => Set<Membership>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectRevision> ProjectRevisions => Set<ProjectRevision>();
    public DbSet<ProjectAttachment> ProjectAttachments => Set<ProjectAttachment>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    public LuminiDbContext(DbContextOptions<LuminiDbContext> options, ITenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.HasIndex(o => o.Slug).IsUnique();
            entity.Property(o => o.Name).HasMaxLength(150).IsRequired();
            entity.Property(o => o.Slug).HasMaxLength(100).IsRequired();
            entity.Property(o => o.DocumentNumber).HasMaxLength(20);
            entity.Property(o => o.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.EmailNormalized).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(255).IsRequired();
            entity.Property(u => u.EmailNormalized).HasMaxLength(255).IsRequired();
            entity.Property(u => u.DisplayName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => new { r.TenantId, r.Name }).IsUnique();
            entity.Property(r => r.Name).HasMaxLength(100).IsRequired();
            entity.Property(r => r.Version).IsConcurrencyToken();

            var permissionComparer = new ValueComparer<IReadOnlyCollection<string>>(
                (a, b) => (a ?? Array.Empty<string>()).SequenceEqual(b ?? Array.Empty<string>()),
                v => v.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
                v => v.ToList());

            entity.Property(r => r.PermissionCodes)
                  .HasConversion(
                      v => string.Join(';', v),
                      v => (IReadOnlyCollection<string>)v.Split(';', StringSplitOptions.RemoveEmptyEntries).ToList()
                  )
                  .Metadata.SetValueComparer(permissionComparer);
        });

        modelBuilder.Entity<Membership>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.HasIndex(m => new { m.TenantId, m.UserId }).IsUnique();
            entity.Property(m => m.Version).IsConcurrencyToken();

            entity.HasOne(m => m.User)
                  .WithMany(u => u.Memberships)
                  .HasForeignKey(m => m.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.Organization)
                  .WithMany(o => o.Memberships)
                  .HasForeignKey(m => m.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.Role)
                  .WithMany()
                  .HasForeignKey(m => m.RoleId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.HasIndex(i => new { i.TenantId, i.Email });
            entity.HasIndex(i => i.TokenHash).IsUnique();
            entity.Property(i => i.Email).HasMaxLength(255).IsRequired();
            entity.Property(i => i.TokenHash).HasMaxLength(128).IsRequired();
            entity.Property(i => i.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.HasIndex(t => new { t.UserId, t.TenantId });
            entity.Property(t => t.TokenHash).HasMaxLength(128).IsRequired();
            entity.Property(t => t.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => new { c.TenantId, c.Name });
            entity.Property(c => c.Name).HasMaxLength(200).IsRequired();
            entity.Property(c => c.Email).HasMaxLength(255);
            entity.Property(c => c.PhoneDigits).HasMaxLength(20);
            entity.Property(c => c.DocumentDigits).HasMaxLength(14);
            entity.Property(c => c.Notes).HasMaxLength(2000);
            entity.Property(c => c.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => new { p.TenantId, p.Code }).IsUnique();
            entity.Property(p => p.Code).HasMaxLength(40).IsRequired();
            entity.Property(p => p.Name).HasMaxLength(200).IsRequired();
            entity.Property(p => p.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<ProjectRevision>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => new { r.ProjectId, r.RevisionNumber }).IsUnique();
            entity.Property(r => r.SnapshotJson).IsRequired();
            entity.Property(r => r.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<ProjectAttachment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.TenantId, a.ProjectId });
            entity.Property(a => a.FileName).HasMaxLength(255).IsRequired();
            entity.Property(a => a.ObjectKey).HasMaxLength(500).IsRequired();
            entity.Property(a => a.Sha256).HasMaxLength(64).IsRequired();
            entity.Property(a => a.Version).IsConcurrencyToken();
        });

        modelBuilder.Entity<AuditEvent>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.TenantId, a.CreatedAtUtc });
            entity.Property(a => a.Action).HasMaxLength(80).IsRequired();
            entity.Property(a => a.ResourceType).HasMaxLength(80).IsRequired();
            entity.Property(a => a.MetadataJson).IsRequired();
        });

        // Query filter dinâmico: CurrentTenantId é lido a cada query (não capturado em Constant)
        modelBuilder.Entity<Role>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
        modelBuilder.Entity<Client>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
        modelBuilder.Entity<Project>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
        modelBuilder.Entity<ProjectRevision>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
        modelBuilder.Entity<ProjectAttachment>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
        modelBuilder.Entity<AuditEvent>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
        modelBuilder.Entity<Membership>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
        modelBuilder.Entity<Invitation>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        if (_tenantContext != null && _tenantContext.HasTenant)
        {
            var tenantId = _tenantContext.RequiredTenantId;
            foreach (var entry in ChangeTracker.Entries<ITenantScoped>())
            {
                if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
                {
                    entry.Entity.TenantId = tenantId;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
