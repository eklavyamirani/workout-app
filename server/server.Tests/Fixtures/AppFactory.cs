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

    protected string PoolerHost => _pgBouncer!.Host;
    protected ushort PoolerPort => _pgBouncer!.HostPort;

    async Task IAsyncLifetime.DisposeAsync() => await DisposeResourcesAsync();

    protected virtual async Task DisposeResourcesAsync()
    {
        if (_pgBouncer is not null)
        {
            await _pgBouncer.DisposeAsync();
        }
        await _postgres.DisposeAsync();
        await _network.DisposeAsync();
    }

    /// <summary>When true, JWT validation is replaced by <see cref="TestAuthHandler"/>.</summary>
    protected virtual bool UseTestAuth => true;

    /// <summary>Settings the host reads at startup (configuration keys or contract env names).</summary>
    protected virtual IEnumerable<KeyValuePair<string, string>> HostSettings()
    {
        yield return new("ConnectionStrings:Default", ConnectionString);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Provide settings via configuration so they are available at startup.
        foreach (var (key, value) in HostSettings())
        {
            builder.UseSetting(key, value);
        }

        builder.UseEnvironment("Testing");
        if (!UseTestAuth)
        {
            return;
        }

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
    }

    public HttpClient CreateAuthenticatedClient(string email)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.TestEmailHeader, email);
        return client;
    }

    /// <summary>A client whose token carries exactly these claims (no email when null).</summary>
    public HttpClient CreateClientForIdentity(string issuer, string subject, string? email = null)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.TestIssuerHeader, issuer);
        client.DefaultRequestHeaders.Add(TestAuthHandler.TestSubjectHeader, subject);
        if (email is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.TestEmailHeader, email);
        }
        return client;
    }
}

/// <summary>The API behind PgBouncer in transaction mode with one server connection.</summary>
public class PooledAppFactory : AppFactory
{
    protected override bool UsePooler => true;
}

/// <summary>
/// The API configured only through runtime contract v1 (design §6b.1), as a platform pod:
/// <c>DATABASE_URL</c> without a password plus <c>DATABASE_PASSWORD_FILE</c>, through the
/// transaction pooler; <c>OIDC_*</c> and <c>PLATFORM_CA_FILE</c> pointing at an HTTPS issuer
/// signed by a private CA; real JWT bearer validation.
/// </summary>
public class ContractAppFactory : AppFactory
{
    public const string ClientId = "workout-app-test";

    private readonly string _passwordFile =
        Path.Combine(Path.GetTempPath(), $"workout-app-db-password-{Guid.NewGuid():N}");

    public StubIdentityProvider Idp { get; } = new();

    protected override bool UsePooler => true;
    protected override bool UseTestAuth => false;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        await File.WriteAllTextAsync(_passwordFile, Database.RuntimePassword + "\n");
        await Idp.StartAsync();
    }

    protected override IEnumerable<KeyValuePair<string, string>> HostSettings()
    {
        yield return new("DATABASE_URL",
            $"postgres://{Database.RuntimeRole}@{PoolerHost}:{PoolerPort}/{Database.Database}");
        yield return new("DATABASE_PASSWORD_FILE", _passwordFile);
        yield return new("OIDC_ISSUER", Idp.Issuer);
        yield return new("OIDC_CLIENT_ID", ClientId);
        yield return new("OIDC_AUDIENCE", ClientId);
        yield return new("PLATFORM_CA_FILE", Idp.CaBundlePath);
    }

    protected override async Task DisposeResourcesAsync()
    {
        await Idp.DisposeAsync();
        File.Delete(_passwordFile);
        await base.DisposeResourcesAsync();
    }
}
