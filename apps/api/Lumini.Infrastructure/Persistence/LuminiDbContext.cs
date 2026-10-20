using System.Linq.Expressions;
using Lumini.Application.Common.Interfaces;
using Lumini.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Lumini.Infrastructure.Persistence;

public class LuminiDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    public LuminiDbContext(DbContextOptions<LuminiDbContext> options, ITenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Aplica filtro global de multi-tenancy para todas as entidades ITenantScoped (RN-001)
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantScoped).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var property = Expression.Property(parameter, nameof(ITenantScoped.TenantId));
                
                // e => _tenantContext.TenantId == null || e.TenantId == _tenantContext.TenantId
                var tenantIdExpr = Expression.Constant(_tenantContext?.TenantId, typeof(Guid?));
                var filter = Expression.Lambda(
                    Expression.Equal(
                        Expression.Convert(property, typeof(Guid?)), 
                        tenantIdExpr
                    ),
                    parameter
                );

                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
                
                // Cria índice automático por TenantId para otimização de busca
                modelBuilder.Entity(entityType.ClrType).HasIndex(nameof(ITenantScoped.TenantId));
            }
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Garante que novas entidades ITenantScoped recebam o TenantId resolvido no servidor
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
