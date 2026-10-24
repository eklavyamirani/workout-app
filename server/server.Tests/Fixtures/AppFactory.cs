using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Networks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using server.Data;
using Testcontainers.PostgreSql;

namespace server.Tests.Fixtures;

/// <summary>
/// The API as it runs on the platform: database and roles provisioned by "the platform"
/// (<see cref="PlatformDatabase"/>), schema applied by the migration job as the owner, and the
/// API connected as the NOBYPASSRLS runtime role so row-level security is actually enforced.
/// </summary>
public class AppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string DbAlias = "db";

    private readonly INetwork _network = new NetworkBuilder().Build();
    private readonly PostgreSqlContainer _postgres;
    private PgBouncer? _pgBouncer;

    public PlatformDatabase Database { get; } = PlatformDatabase.Create("workout_app_test");

    public AppFactory()
    {
        _postgres = new PostgreSqlBuilder(PlatformDatabase.PostgresImage)
            .WithNetwork(_network)
            .WithNetworkAliases(DbAlias)
            .Build();
    }

    /// <summary>
    /// When true, the API's runtime connection goes through PgBouncer in transaction mode with a
    /// single server connection, as on the platform.
    /// </summary>
    protected virtual bool UsePooler => false;

    /// <summary>Superuser connection; test setup only (the platform's role).</summary>
    public string SuperuserConnectionString => _postgres.GetConnectionString();

    /// <summary>Database owner, as the migration job connects.</summary>
    public string OwnerConnectionString => Database.OwnerConnectionString(SuperuserConnectionString);

    /// <summary>Runtime role, as the API connects (through the pooler when <see cref="UsePooler"/>).</summary>
    public string ConnectionString
    {
        get
        {
            var builder = new NpgsqlConnectionStringBuilder(
                Database.RuntimeConnectionString(SuperuserConnectionString));
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
        await Database.ProvisionAsync(SuperuserConnectionString);
        await Migrator.RunAsync(OwnerConnectionString, Database.RuntimeRole);

        if (UsePooler)
        {
            _pgBouncer = new PgBouncer(_network, DbAlias, new Dictionary<string, string>
            {
                [Database.OwnerRole] = Database.OwnerPassword,
                [Database.RuntimeRole] = Database.RuntimePassword,
            });
            await _pgBouncer.StartAsync();
        }
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
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
