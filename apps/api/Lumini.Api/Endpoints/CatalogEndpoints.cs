using Lumini.Application.Catalog.DTOs;
using Lumini.Application.Catalog.Services;
using Lumini.Application.Identity.Authorization;
using Lumini.Domain.Identity;

namespace Lumini.Api.Endpoints;

public static class CatalogEndpoints
{
    public static RouteGroupBuilder MapCatalogEndpoints(this RouteGroupBuilder api)
    {
        var catalog = api.MapGroup("/catalog").WithTags("Catálogo").RequireAuthorization();

        catalog.MapGet("/materials", async (ICatalogService service, CancellationToken ct) =>
            Results.Ok(await service.ListMaterialsAsync(ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingRead));

        catalog.MapPost("/materials", async (UpsertMaterialRequest request, ICatalogService service, HttpContext http, CancellationToken ct) =>
        {
            var created = await service.CreateMaterialAsync(request, Correlation(http), ct);
            http.Response.Headers.ETag = Quote(created.Version);
            return Results.Created($"/api/v1/catalog/materials/{created.Id}", created);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingManage));

        catalog.MapPut("/materials/{id:guid}", async (Guid id, UpsertMaterialRequest request, ICatalogService service, HttpContext http, CancellationToken ct) =>
        {
            var updated = await service.UpdateMaterialAsync(id, request, RequireVersion(http), Correlation(http), ct);
            http.Response.Headers.ETag = Quote(updated.Version);
            return Results.Ok(updated);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingManage));

        catalog.MapGet("/finishes", async (ICatalogService service, CancellationToken ct) =>
            Results.Ok(await service.ListFinishesAsync(ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingRead));

        catalog.MapPost("/finishes", async (UpsertFinishRequest request, ICatalogService service, HttpContext http, CancellationToken ct) =>
        {
            var created = await service.CreateFinishAsync(request, Correlation(http), ct);
            http.Response.Headers.ETag = Quote(created.Version);
            return Results.Created($"/api/v1/catalog/finishes/{created.Id}", created);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingManage));

        catalog.MapPut("/finishes/{id:guid}", async (Guid id, UpdateFinishRequest request, ICatalogService service, HttpContext http, CancellationToken ct) =>
        {
            var updated = await service.UpdateFinishAsync(id, request, RequireVersion(http), Correlation(http), ct);
            http.Response.Headers.ETag = Quote(updated.Version);
            return Results.Ok(updated);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingManage));

        catalog.MapPost("/compatibility", async (CompatibilityRequest request, ICatalogService service, CancellationToken ct) =>
            Results.Ok(await service.CheckCompatibilityAsync(request, ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingRead));

        catalog.MapGet("/pricing-tables", async (ICatalogService service, CancellationToken ct) =>
            Results.Ok(await service.ListPricingTablesAsync(ct)))
            .RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingRead));

        catalog.MapPost("/pricing-tables", async (CreatePricingTableRequest request, ICatalogService service, HttpContext http, CancellationToken ct) =>
        {
            var created = await service.CreatePricingTableAsync(request, Correlation(http), ct);
            return Results.Created($"/api/v1/catalog/pricing-tables/{created.Id}", created);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingManage));

        catalog.MapPost("/pricing-tables/{id:guid}/rules", async (Guid id, CreatePricingRuleRequest request, ICatalogService service, HttpContext http, CancellationToken ct) =>
        {
            var created = await service.AddPricingRuleAsync(id, request, Correlation(http), ct);
            http.Response.Headers.ETag = Quote(created.Version);
            return Results.Created($"/api/v1/catalog/pricing-rules/{created.Id}", created);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingManage));

        catalog.MapPut("/pricing-rules/{id:guid}", async (Guid id, UpdatePricingRuleRequest request, ICatalogService service, HttpContext http, CancellationToken ct) =>
        {
            var updated = await service.UpdatePricingRuleAsync(id, request, RequireVersion(http), Correlation(http), ct);
            http.Response.Headers.ETag = Quote(updated.Version);
            return Results.Ok(updated);
        }).RequireAuthorization(AuthorizationPolicies.For(Permissions.PricingManage));

        return api;
    }

    private static string? Correlation(HttpContext http) =>
        http.Items["CorrelationId"]?.ToString();

    private static uint RequireVersion(HttpContext http)
    {
        var raw = http.Request.Headers.IfMatch.ToString().Trim().Trim('"');
        if (!uint.TryParse(raw, out var version))
            throw new ArgumentException("Cabeçalho If-Match com a versão do recurso é obrigatório.");

        return version;
    }

    private static string Quote(uint version) => $"\"{version}\"";
}
