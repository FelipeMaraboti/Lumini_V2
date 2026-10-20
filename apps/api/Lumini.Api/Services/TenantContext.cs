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
            if (user == null || !user.Identity?.IsAuthenticated == true)
            {
                // Fallback de desenvolvimento local se houver header explicito X-Tenant-Id (apenas para testes)
                var headerTenant = _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"].FirstOrDefault();
                if (Guid.TryParse(headerTenant, out var parsedHeaderGuid))
                {
                    return parsedHeaderGuid;
                }
                return null;
            }

            var claim = user.FindFirst("tenant_id") ?? user.FindFirst("org_id") ?? user.FindFirst(ClaimTypes.GroupSid);
            if (claim != null && Guid.TryParse(claim.Value, out var tenantGuid))
            {
                return tenantGuid;
            }

            return null;
        }
    }
}
