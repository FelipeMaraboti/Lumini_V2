using Lumini.Application.Identity.Authorization;
using Lumini.Application.Pricing;
using Lumini.Application.Pricing.DTOs;
using Lumini.Domain.Identity;

namespace Lumini.Api.Endpoints;

public static class QuoteEndpoints
{
    public static RouteGroupBuilder MapQuoteEndpoints(this RouteGroupBuilder api)
    {
        var projects = api.MapGroup("/projects").WithTags("Orçamentos").RequireAuthorization();

        projects.MapGet("/{projectId:guid}/quotes/pricing-tables", async (
            Guid projectId,
            QuotePreviewService service,
            CancellationToken ct) =>
                Results.Ok(await service.ListTablesAsync(projectId, ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsRead))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.QuotesCreate));

        projects.MapPost("/{projectId:guid}/quotes/preview", async (
            Guid projectId,
            CalculateQuotePreviewRequest request,
            QuotePreviewService service,
            CancellationToken ct) =>
                Results.Ok(await service.CalculateAsync(projectId, request, ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.ProjectsRead))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.QuotesCreate));

        return api;
    }
}
