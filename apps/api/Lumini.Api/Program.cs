using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Lumini.Api.Authorization;
using Lumini.Api.Middlewares;
using Lumini.Api.Services;
using Lumini.Application.Common.Interfaces;
using Lumini.Application.Identity.Authorization;
using Lumini.Application.Identity.DTOs;
using Lumini.Application.Identity.Services;
using Lumini.Domain.Identity;
using Lumini.Infrastructure.Persistence;
using Lumini.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]
    ?? "Lumini_Secret_Key_Super_Secure_Production_Grade_2026_Marmoraria!";
const string JwtIssuer = "LuminiApi";
const string JwtAudience = "LuminiWeb";

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=lumini_v2_db;Username=lumini_user;Password=lumini_password_dev_2026";

// Fallback SQLite apenas em Development quando o PostgreSQL do docker-compose não está disponível.
var useSqliteFallback = builder.Environment.IsDevelopment()
    && builder.Configuration.GetValue("UseSqliteFallback", false);

builder.Services.AddDbContext<LuminiDbContext>(options =>
{
    if (useSqliteFallback)
    {
        options.UseSqlite("Data Source=lumini_dev.db");
    }
    else
    {
        options.UseNpgsql(connectionString, b => b.MigrationsAssembly("Lumini.Infrastructure"));
    }
});

builder.Services.AddScoped<DbContext>(sp => sp.GetRequiredService<LuminiDbContext>());
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<IIdentityRepository, Lumini.Infrastructure.Persistence.Repositories.IdentityRepository>();
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<ITokenHasher, TokenHasher>();
builder.Services.AddSingleton<ILoginRateLimiter, InMemoryLoginRateLimiter>();
builder.Services.AddSingleton<ITokenService>(new JwtTokenService(jwtSecretKey, JwtIssuer, JwtAudience));
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = JwtIssuer,
            ValidAudience = JwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddLuminiPermissionPolicies();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth-strict", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Lumini V2 API",
        Version = "v1",
        Description = "API do Modelo Técnico Central e Operações de Marmoraria (Lumini V2)"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Insira o token JWT no formato: Bearer {seu_token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("LuminiWebPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("X-Correlation-Id", "ETag");
    });
});

var app = builder.Build();

// Bootstrap do schema em Development
if (app.Environment.IsDevelopment())
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LuminiDbContext>();
        if (useSqliteFallback)
        {
            await db.Database.EnsureCreatedAsync();
            app.Logger.LogWarning("Usando SQLite de desenvolvimento (lumini_dev.db). Suba o PostgreSQL via docker-compose para o ambiente canônico.");
        }
        else
        {
            await db.Database.MigrateAsync();
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Banco indisponível — schema não aplicado. Suba o docker-compose e reinicie a API.");
    }
}

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors("LuminiWebPolicy");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Lumini V2 API v1");
        c.RoutePrefix = "swagger";
    });
}

var api = app.MapGroup("/api/v1");

api.MapGet("/health", (ITenantContext tenantContext) => Results.Ok(new
{
    status = "healthy",
    service = "Lumini.Api",
    version = "2.0.0-sprint1",
    timestamp = DateTime.UtcNow,
    tenantResolved = tenantContext.HasTenant,
    tenantId = tenantContext.TenantId
}))
.WithName("GetSystemHealth")
.WithTags("Sistema");

var authGroup = api.MapGroup("/auth").WithTags("Autenticação").RequireRateLimiting("auth-strict");

authGroup.MapPost("/register-org", async (RegisterOrganizationRequest request, IAuthService authService, CancellationToken ct) =>
{
    var response = await authService.RegisterOrganizationAsync(request, ct);
    return Results.Created($"/api/v1/organizations/{response.TenantId}", response);
})
.WithName("RegisterOrganization")
.WithSummary("Cadastra uma nova marmoraria (tenant) com usuário Owner");

authGroup.MapPost("/login", async (LoginRequest request, IAuthService authService, HttpContext httpContext, CancellationToken ct) =>
{
    var rateKey = $"{request.Email}|{httpContext.Connection.RemoteIpAddress}";
    var response = await authService.LoginAsync(request, rateKey, ct);
    return Results.Ok(response);
})
.WithName("Login")
.WithSummary("Autentica e retorna access + refresh token");

authGroup.MapPost("/refresh", async (RefreshTokenRequest request, IAuthService authService, CancellationToken ct) =>
{
    var response = await authService.RefreshAsync(request, ct);
    return Results.Ok(response);
})
.WithName("RefreshToken")
.WithSummary("Renova access token com rotação de refresh token");

authGroup.MapPost("/logout", async (RefreshTokenRequest request, IAuthService authService, CancellationToken ct) =>
{
    await authService.LogoutAsync(request, ct);
    return Results.NoContent();
})
.WithName("Logout")
.WithSummary("Revoga o refresh token informado");

authGroup.MapPost("/accept-invitation", async (AcceptInvitationRequest request, IAuthService authService, CancellationToken ct) =>
{
    var response = await authService.AcceptInvitationAsync(request, ct);
    return Results.Ok(response);
})
.WithName("AcceptInvitation")
.WithSummary("Aceita convite e cria vínculo de membership");

authGroup.MapGet("/me", (ClaimsPrincipal user, ITenantContext tenantContext) =>
{
    if (user.Identity?.IsAuthenticated != true)
        return Results.Unauthorized();

    return Results.Ok(new
    {
        userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? user.FindFirst("sub")?.Value,
        email = user.FindFirst(ClaimTypes.Email)?.Value,
        displayName = user.FindFirst("display_name")?.Value,
        tenantId = tenantContext.TenantId,
        role = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value,
        permissions = user.FindAll("permission").Select(c => c.Value).ToList()
    });
})
.RequireAuthorization()
.WithName("GetCurrentUser");

var membersGroup = api.MapGroup("/members").WithTags("Membros").RequireAuthorization();

membersGroup.MapGet("/", async (IAuthService authService, CancellationToken ct) =>
{
    var members = await authService.GetMembersAsync(ct);
    return Results.Ok(members);
})
.RequireAuthorization(AuthorizationPolicies.For(Permissions.MembersRead))
.WithName("GetMembers");

membersGroup.MapPost("/invitations", async (InviteMemberRequest request, IAuthService authService, CancellationToken ct) =>
{
    var result = await authService.InviteMemberAsync(request, ct);
    return Results.Ok(result);
})
.RequireAuthorization(AuthorizationPolicies.For(Permissions.MembersManage))
.WithName("InviteMember");

var rolesGroup = api.MapGroup("/roles").WithTags("Papéis").RequireAuthorization();

rolesGroup.MapGet("/", async (IAuthService authService, CancellationToken ct) =>
{
    var roles = await authService.GetRolesAsync(ct);
    return Results.Ok(roles);
})
.RequireAuthorization(AuthorizationPolicies.For(Permissions.RolesRead))
.WithName("GetRoles");

rolesGroup.MapPost("/", async (CreateRoleRequest request, IAuthService authService, CancellationToken ct) =>
{
    var role = await authService.CreateRoleAsync(request, ct);
    return Results.Created($"/api/v1/roles/{role.Id}", role);
})
.RequireAuthorization(AuthorizationPolicies.For(Permissions.RolesManage))
.WithName("CreateRole");

app.Run();

public partial class Program { }
