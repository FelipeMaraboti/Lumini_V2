using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Lumini.IntegrationTests;

public class ProjectConcurrencyTests : IClassFixture<LuminiApiFactory>
{
    private readonly HttpClient _client;

    public ProjectConcurrencyTests(LuminiApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task StaleIfMatch_SecondUpdate_Returns409()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var register = await _client.PostAsJsonAsync("/api/v1/auth/register-org", new
        {
            organizationName = "Marmoraria Concorrencia",
            slug = $"conc-{suffix}",
            documentNumber = "",
            adminDisplayName = "Admin",
            adminEmail = $"admin-{suffix}@teste.com",
            adminPassword = "SenhaForte123"
        });
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var auth = await register.Content.ReadFromJsonAsync<JsonElement>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.GetProperty("accessToken").GetString());

        var clientResponse = await _client.PostAsJsonAsync("/api/v1/clients", new
        {
            name = "Cliente Obra",
            email = "obra@teste.com",
            phoneDigits = "11999998888",
            documentDigits = (string?)null,
            notes = (string?)null
        });
        Assert.Equal(HttpStatusCode.Created, clientResponse.StatusCode);
        var clientBody = await clientResponse.Content.ReadFromJsonAsync<JsonElement>();

        var projectResponse = await _client.PostAsJsonAsync("/api/v1/projects", new
        {
            clientId = clientBody.GetProperty("id").GetGuid(),
            code = $"PZ-{suffix}",
            name = "Cozinha"
        });
        Assert.Equal(HttpStatusCode.Created, projectResponse.StatusCode);
        var project = await projectResponse.Content.ReadFromJsonAsync<JsonElement>();
        var projectId = project.GetProperty("id").GetGuid();
        var version = projectResponse.Headers.ETag?.Tag.Trim('"')
            ?? project.GetProperty("version").GetRawText();

        var first = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/projects/{projectId}")
        {
            Content = JsonContent.Create(new { name = "Cozinha alterada" })
        };
        first.Headers.TryAddWithoutValidation("If-Match", version);
        var firstResponse = await _client.SendAsync(first);
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        var second = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/projects/{projectId}")
        {
            Content = JsonContent.Create(new { name = "Cozinha conflitante" })
        };
        second.Headers.TryAddWithoutValidation("If-Match", version);
        var secondResponse = await _client.SendAsync(second);

        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
        var error = await secondResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("RESOURCE_CONFLICT", error.GetProperty("error").GetProperty("code").GetString());
    }
}

public class LuminiApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"lumini-it-{Guid.NewGuid():N}.db");

    public LuminiApiFactory()
    {
        Environment.SetEnvironmentVariable("UseSqliteFallback", "true");
        Environment.SetEnvironmentVariable("ConnectionStrings__Sqlite", $"Data Source={_dbPath}");
        Environment.SetEnvironmentVariable("Storage__Provider", "Local");
        Environment.SetEnvironmentVariable("Storage__PublicBaseUrl", "http://localhost");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try
        {
            if (File.Exists(_dbPath))
                File.Delete(_dbPath);
        }
        catch
        {
            // O arquivo pode continuar aberto pelo provedor SQLite até o processo encerrar.
        }
    }
}
