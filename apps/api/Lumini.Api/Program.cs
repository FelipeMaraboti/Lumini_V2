using Lumini.Api.Middlewares;
using Lumini.Api.Services;
using Lumini.Application.Common.Interfaces;
using Lumini.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Configuração do DbContext com PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=lumini_v2_db;Username=lumini_user;Password=lumini_password_dev_2026";

builder.Services.AddDbContext<LuminiDbContext>(options =>
{
    options.UseNpgsql(connectionString, b => b.MigrationsAssembly("Lumini.Infrastructure"));
});

// Injeção de dependências dos serviços core
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, TenantContext>();

// Endpoints e Swagger com suporte a Bearer JWT e Versionamento
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

// Configuração de CORS para o frontend Vite
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

// Middlewares obrigatórios de governança (AGENTS.md, RFC-7807)
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseCors("LuminiWebPolicy");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Lumini V2 API v1");
        c.RoutePrefix = "swagger";
    });
}

// Endpoints de Saúde e Versão do Sistema (/api/v1)
var apiGroup = app.MapGroup("/api/v1");

apiGroup.MapGet("/health", (ITenantContext tenantContext) =>
{
    return Results.Ok(new
    {
        status = "healthy",
        service = "Lumini.Api",
        version = "2.0.0-sprint0",
        timestamp = DateTime.UtcNow,
        tenantResolved = tenantContext.HasTenant,
        tenantId = tenantContext.TenantId
    });
})
.WithName("GetSystemHealth")
.WithSummary("Verifica a saúde do serviço e o contexto de multi-tenancy")
.WithOpenApi();

apiGroup.MapGet("/version", () => Results.Ok(new
{
    platform = "Lumini V2",
    build = "2026.10.19-sprint0",
    architecture = "Modular Monolith .NET 8 / PostgreSQL / React"
}))
.WithName("GetSystemVersion")
.WithSummary("Retorna a versão e a arquitetura ativa da plataforma")
.WithOpenApi();

app.Run();
