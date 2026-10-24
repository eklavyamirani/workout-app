using Microsoft.Extensions.Configuration;
using Npgsql;
using server.Configuration;

namespace server.Tests;

/// <summary>DATABASE_URL from runtime contract v1 (design §6b.1) → Npgsql connection string.</summary>
public class DatabaseUrlTests
{
    [Fact]
    public void ContractUrl_IsParsed_ForTheTransactionPooler()
    {
        var cs = new NpgsqlConnectionStringBuilder(ConnectionStringFactory.FromDatabaseUrl(
            "postgres://workout_app_prod_rt:p%40ss%3Aword@db.platform:6432/workout_app_prod", null));

        Assert.Equal("db.platform", cs.Host);
        Assert.Equal(6432, cs.Port);
        Assert.Equal("workout_app_prod", cs.Database);
        Assert.Equal("workout_app_prod_rt", cs.Username);
        Assert.Equal("p@ss:word", cs.Password);
        Assert.True(cs.NoResetOnClose);
    }

    [Fact]
    public void PasswordFile_IsUsed_WhenTheUrlHasNoPassword()
    {
        var file = Path.GetTempFileName();
        try
        {
            File.WriteAllText(file, "from-file\n");
            var cs = new NpgsqlConnectionStringBuilder(ConnectionStringFactory.FromDatabaseUrl(
                "postgresql://role@db.platform/app", file));
            Assert.Equal("from-file", cs.Password);
            Assert.Equal(5432, cs.Port);
        }
        finally
        {
            File.Delete(file);
        }
    }

    [Fact]
    public void SslMode_IsMapped()
    {
        var cs = new NpgsqlConnectionStringBuilder(ConnectionStringFactory.FromDatabaseUrl(
            "postgres://role@db/app?sslmode=verify-full", null));
        Assert.Equal(SslMode.VerifyFull, cs.SslMode);
    }

    [Theory]
    [InlineData("mysql://role:secret-value@db/app")]
    [InlineData("postgres://db/app")]
    [InlineData("postgres://role:secret-value@db/")]
    [InlineData("postgres://role:secret-value@db/app?application_name=x")]
    public void InvalidUrl_IsRejected_WithoutEchoingSecrets(string url)
    {
        var error = Assert.Throws<InvalidOperationException>(() => ConnectionStringFactory.FromDatabaseUrl(url, null));
        Assert.DoesNotContain("secret-value", error.Message);
    }

    [Fact]
    public void DatabaseUrl_WinsOver_LocalConnectionString()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DATABASE_URL"] = "postgres://platform_role:pw@db.platform:6432/platform_db",
            ["ConnectionStrings:Default"] = "Host=localhost;Database=local;Username=local",
        }).Build();

        var cs = new NpgsqlConnectionStringBuilder(ConnectionStringFactory.ResolveDatabase(configuration));
        Assert.Equal("platform_db", cs.Database);
    }
}
