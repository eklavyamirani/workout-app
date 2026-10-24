using System.Security.Cryptography;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Networks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Testcontainers.PostgreSql;

namespace server.Tests.Fixtures;

public class AppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string DbAlias = "db";

    private readonly INetwork _network = new NetworkBuilder().Build();
    private readonly PostgreSqlContainer _postgres;
    private PgBouncer? _pgBouncer;

    private readonly string _appRolePassword =
        Convert.ToHexString(RandomNumberGenerator.GetBytes(24));

    private string? _appRolePasswordFile;

    public AppFactory()
    {
        _postgres = new PostgreSqlBuilder("postgres:16-alpine")
            .WithNetwork(_network)
            .WithNetworkAliases(DbAlias)
            .Build();
    }

    /// <summary>
    /// When true, the API's runtime connection goes through PgBouncer in transaction mode with a
    /// single server connection, as on the platform.
    /// </summary>
    protected virtual bool UsePooler => false;

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
            if (_pgBouncer is not null)
            {
                builder.Host = _pgBouncer.Host;
                builder.Port = _pgBouncer.HostPort;
                // Npgsql's DISCARD ALL on reuse "makes no sense" behind a transaction-mode
                // pooler (npgsql.org/doc/compatibility.html), and would mask leaked session state.
                builder.NoResetOnClose = true;
            }
            return builder.ConnectionString;
        }
    }

    public virtual async Task InitializeAsync()
    {
        await _network.CreateAsync();
        await _postgres.StartAsync();

        if (UsePooler)
        {
            _pgBouncer = new PgBouncer(_network, DbAlias,
                new Dictionary<string, string> { ["workout_app"] = _appRolePassword });
            await _pgBouncer.StartAsync();
        }

        _appRolePasswordFile = Path.Combine(Path.GetTempPath(), $"workout-app-role-{Guid.NewGuid():N}");
        await File.WriteAllTextAsync(_appRolePasswordFile, _appRolePassword);
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        if (_appRolePasswordFile is not null && File.Exists(_appRolePasswordFile))
        {
            File.Delete(_appRolePasswordFile);
        }

        if (_pgBouncer is not null)
        {
            await _pgBouncer.DisposeAsync();
        }
        await _postgres.DisposeAsync();
        await _network.DisposeAsync();
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

/// <summary>The API behind PgBouncer in transaction mode with one server connection.</summary>
public class PooledAppFactory : AppFactory
{
    protected override bool UsePooler => true;
}
