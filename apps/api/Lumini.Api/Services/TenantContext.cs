using System.Security.Claims;
using Lumini.Application.Common.Interfaces;

namespace Lumini.Api.Services;

public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? TenantId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user?.Identity?.IsAuthenticated == true)
            {
                var claim = user.FindFirst("tenant_id") ?? user.FindFirst("org_id");
                if (claim != null && Guid.TryParse(claim.Value, out var tenantGuid))
                    return tenantGuid;
            }

            // Fallback apenas em Development para testes sem JWT
            var env = _httpContextAccessor.HttpContext?.RequestServices
                .GetService<IHostEnvironment>();
            if (env?.IsDevelopment() == true)
            {
                var headerTenant = _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].FirstOrDefault();
                if (Guid.TryParse(headerTenant, out var parsedHeaderGuid))
                    return parsedHeaderGuid;
            }

            return null;
        }
    }
}
