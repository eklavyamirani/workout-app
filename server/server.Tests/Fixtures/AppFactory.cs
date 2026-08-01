using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Testcontainers.PostgreSql;

namespace server.Tests.Fixtures;

public class AppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine")
        .Build();

    private readonly string _appRolePassword =
        Convert.ToHexString(RandomNumberGenerator.GetBytes(24));

    private string? _appRolePasswordFile;

    /// <summary>Superuser connection used only for schema/role bootstrapping.</summary>
    public string AdminConnectionString => _postgres.GetConnectionString();

    /// <summary>
    /// Runtime connection used by the API. It deliberately uses the non-superuser
    /// 'workout_app' role so row-level security is actually enforced in tests.
    /// </summary>
    public string ConnectionString
    {
        get
        {
            var builder = new NpgsqlConnectionStringBuilder(AdminConnectionString)
            {
                Username = "workout_app",
                Password = _appRolePassword
            };
            return builder.ConnectionString;
        }
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        _appRolePasswordFile = Path.Combine(Path.GetTempPath(), $"workout-app-role-{Guid.NewGuid():N}");
        await File.WriteAllTextAsync(_appRolePasswordFile, _appRolePassword);
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        if (_appRolePasswordFile is not null && File.Exists(_appRolePasswordFile))
        {
            File.Delete(_appRolePasswordFile);
        }

        await _postgres.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Provide connection settings via configuration so they are available at startup.
        builder.UseSetting("ConnectionStrings:Default", ConnectionString);
        builder.UseSetting("ConnectionStrings:Admin", AdminConnectionString);
        builder.UseSetting("Database:AppRolePasswordFile", _appRolePasswordFile!);

        builder.ConfigureServices(services =>
        {
            // Replace JWT auth with test auth handler
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                TestAuthHandler.SchemeName, _ => { });
        });

        builder.UseEnvironment("Testing");
    }

    public HttpClient CreateAuthenticatedClient(string email)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.TestEmailHeader, email);
        return client;
    }
}
