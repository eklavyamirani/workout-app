using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using server.Data;
using Testcontainers.PostgreSql;

namespace server.Tests.Fixtures;

public class AppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine")
        .Build();

    public string ConnectionString => _postgres.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _postgres.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Override connection string via configuration so it's available at startup
        builder.UseSetting("ConnectionStrings:Default", ConnectionString);

        builder.ConfigureServices(services =>
        {
            // Remove existing AppDb and re-register with test connection string
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(AppDb));
            if (descriptor != null)
                services.Remove(descriptor);

            var db = new AppDb(ConnectionString);
            services.AddSingleton(db);

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
