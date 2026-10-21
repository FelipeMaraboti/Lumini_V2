using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Lumini.Api.Authorization;
using Lumini.Api.Endpoints;
using Lumini.Api.Middlewares;
using Lumini.Api.Services;
using Lumini.Application.Catalog.Services;
using Lumini.Application.Common.Interfaces;
using Lumini.Application.Identity.Authorization;
using Lumini.Application.Identity.DTOs;
using Lumini.Application.Identity.Services;
using Lumini.Domain.Identity;
using Lumini.Application.Projects.Services;
using Lumini.Application.Pricing;
using Lumini.Infrastructure.Persistence;
using Lumini.Infrastructure.Security;
using Lumini.Infrastructure.Storage;
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
        var sqliteConnection = builder.Configuration.GetConnectionString("Sqlite") ?? "Data Source=lumini_dev.db";
        options.UseSqlite(sqliteConnection);
    }
    else
    {
        options.UseNpgsql(connectionString, b => b.MigrationsAssembly("Lumini.Infrastructure"));
    }
});

builder.Services.AddScoped<DbContext>(sp => sp.GetRequiredService<LuminiDbContext>());
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<IUserContext, UserContext>();
builder.Services.AddScoped<IIdentityRepository, Lumini.Infrastructure.Persistence.Repositories.IdentityRepository>();
builder.Services.AddScoped<IProjectRepository, Lumini.Infrastructure.Persistence.Repositories.ProjectRepository>();
builder.Services.AddScoped<ICatalogRepository, Lumini.Infrastructure.Persistence.Repositories.CatalogRepository>();
builder.Services.AddScoped<IWorkspaceService, WorkspaceService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<QuotePreviewService>();
var storageProvider = builder.Configuration["Storage:Provider"] ?? "Local";
if (storageProvider.Equals("S3", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<IFileStorage>(_ => new S3FileStorage(
        builder.Configuration["Storage:ServiceUrl"] ?? "http://localhost:9000",
        builder.Configuration["Storage:AccessKey"] ?? "lumini_minio_admin",
        builder.Configuration["Storage:SecretKey"] ?? "lumini_minio_secret_2026",
        builder.Configuration["Storage:Bucket"] ?? "lumini-attachments"));
}
else
{
    builder.Services.AddSingleton<IFileStorage>(_ => new LocalFileStorage(
        Path.Combine(builder.Environment.ContentRootPath, "App_Data", "uploads"),
        builder.Configuration["Storage:PublicBaseUrl"] ?? "http://localhost:5000",
        builder.Configuration["Storage:SigningKey"] ?? jwtSecretKey));
}
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
            if (!await SchemaHasClientsAsync(db))
            {
                await db.Database.EnsureDeletedAsync();
                app.Logger.LogWarning("SQLite de desenvolvimento recriado para incluir o schema de clientes e projetos.");
            }

            await db.Database.EnsureCreatedAsync();
            if (!await SchemaHasTableAsync(db, "Materials"))
            {
                await ApplyCatalogTablesAsync(db);
                app.Logger.LogWarning("Tabelas do catálogo técnico criadas no SQLite de desenvolvimento.");
            }

            if (!await SchemaHasTableAsync(db, "Quotes"))
            {
                await ApplyQuoteTableAsync(db);
                app.Logger.LogWarning("Tabela de rascunhos de orçamento criada no SQLite de desenvolvimento.");
            }

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

api.MapWorkspaceEndpoints();
api.MapCatalogEndpoints();
api.MapQuoteEndpoints();

api.MapGet("/files/{token}", async (string token, IFileStorage storage, CancellationToken ct) =>
{
    if (storage is not LocalFileStorage local || !local.TryReadSignedToken(Uri.UnescapeDataString(token), out var objectKey))
        return Results.NotFound();

    var stream = await local.OpenReadAsync(objectKey, ct);
    return Results.File(stream, "application/octet-stream", Path.GetFileName(objectKey));
}).WithTags("Arquivos").AllowAnonymous();

app.Run();

static async Task<bool> SchemaHasClientsAsync(LuminiDbContext db)
{
    try
    {
        await db.Database.ExecuteSqlRawAsync("SELECT 1 FROM Clients LIMIT 1");
        return true;
    }
    catch
    {
        return false;
    }
}

static async Task<bool> SchemaHasTableAsync(LuminiDbContext db, string table)
{
    var connection = db.Database.GetDbConnection();
    var openedHere = connection.State != System.Data.ConnectionState.Open;
    if (openedHere)
        await connection.OpenAsync();

    try
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = $name";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "$name";
        parameter.Value = table;
        command.Parameters.Add(parameter);
        var found = await command.ExecuteScalarAsync();
        return found is not null;
    }
    finally
    {
        if (openedHere)
            await connection.CloseAsync();
    }
}

static async Task ApplyCatalogTablesAsync(LuminiDbContext db)
{
    const string sql = """
        CREATE TABLE IF NOT EXISTS "Materials" (
            "Id" TEXT NOT NULL CONSTRAINT "PK_Materials" PRIMARY KEY,
            "ColorHex" TEXT NOT NULL,
            "CreatedAtUtc" TEXT NOT NULL,
            "DensityKgPerM3" TEXT NOT NULL,
            "Name" TEXT NOT NULL,
            "RockKind" INTEGER NOT NULL,
            "Status" INTEGER NOT NULL,
            "TenantId" TEXT NOT NULL,
            "TextureName" TEXT NULL,
            "ThicknessesMm" TEXT NOT NULL,
            "UpdatedAtUtc" TEXT NULL,
            "Version" INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_Materials_TenantId_Name" ON "Materials" ("TenantId", "Name");

        CREATE TABLE IF NOT EXISTS "FinishTypes" (
            "Id" TEXT NOT NULL CONSTRAINT "PK_FinishTypes" PRIMARY KEY,
            "Code" TEXT NOT NULL,
            "CreatedAtUtc" TEXT NOT NULL,
            "Description" TEXT NOT NULL,
            "IsSystem" INTEGER NOT NULL,
            "MinSlabThicknessMm" TEXT NOT NULL,
            "Name" TEXT NOT NULL,
            "Profile" TEXT NOT NULL,
            "Status" INTEGER NOT NULL,
            "TenantId" TEXT NOT NULL,
            "UpdatedAtUtc" TEXT NULL,
            "Version" INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_FinishTypes_TenantId_Code" ON "FinishTypes" ("TenantId", "Code");

        CREATE TABLE IF NOT EXISTS "PricingTables" (
            "Id" TEXT NOT NULL CONSTRAINT "PK_PricingTables" PRIMARY KEY,
            "CreatedAtUtc" TEXT NOT NULL,
            "Currency" TEXT NOT NULL,
            "IsDefault" INTEGER NOT NULL,
            "Name" TEXT NOT NULL,
            "Status" INTEGER NOT NULL,
            "TenantId" TEXT NOT NULL,
            "UpdatedAtUtc" TEXT NULL,
            "Version" INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_PricingTables_TenantId_Name" ON "PricingTables" ("TenantId", "Name");

        CREATE TABLE IF NOT EXISTS "PricingRules" (
            "Id" TEXT NOT NULL CONSTRAINT "PK_PricingRules" PRIMARY KEY,
            "Basis" INTEGER NOT NULL,
            "CreatedAtUtc" TEXT NOT NULL,
            "FinishTypeId" TEXT NULL,
            "MaterialId" TEXT NULL,
            "PricingTableId" TEXT NOT NULL,
            "TenantId" TEXT NOT NULL,
            "UnitPrice" TEXT NOT NULL,
            "UpdatedAtUtc" TEXT NULL,
            "Version" INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "IX_PricingRules_TenantId_PricingTableId" ON "PricingRules" ("TenantId", "PricingTableId");
        """;

    foreach (var statement in sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        if (statement.Length == 0)
            continue;

        await db.Database.ExecuteSqlRawAsync(statement);
    }
}

static async Task ApplyQuoteTableAsync(LuminiDbContext db)
{
    const string sql = """
        CREATE TABLE IF NOT EXISTS "Quotes" (
            "Id" TEXT NOT NULL CONSTRAINT "PK_Quotes" PRIMARY KEY,
            "CreatedAtUtc" TEXT NOT NULL,
            "Currency" TEXT NOT NULL,
            "IdempotencyKey" TEXT NOT NULL,
            "PricingTableId" TEXT NOT NULL,
            "PricingTableVersion" INTEGER NOT NULL,
            "ProjectId" TEXT NOT NULL,
            "RevisionId" TEXT NOT NULL,
            "RevisionNumber" INTEGER NOT NULL,
            "SnapshotJson" TEXT NOT NULL,
            "Status" INTEGER NOT NULL,
            "TenantId" TEXT NOT NULL,
            "UpdatedAtUtc" TEXT NULL,
            "Version" INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_Quotes_TenantId_IdempotencyKey" ON "Quotes" ("TenantId", "IdempotencyKey");
        CREATE INDEX IF NOT EXISTS "IX_Quotes_TenantId_ProjectId_CreatedAtUtc" ON "Quotes" ("TenantId", "ProjectId", "CreatedAtUtc");
        """;

    foreach (var statement in sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        if (statement.Length == 0)
            continue;

        await db.Database.ExecuteSqlRawAsync(statement);
    }
}

public partial class Program { }
