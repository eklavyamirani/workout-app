using System.Reflection;
using Npgsql;
using Xunit;

namespace WorkoutApp.Api.Tests;

public class DatabaseConnectionFactoryTests
{
    [Fact]
    public void Create_UsesPasswordFileValue()
    {
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, "super-secret\n");

        var original = CaptureEnvironment();

        try
        {
            Environment.SetEnvironmentVariable("DB_HOST", "localhost");
            Environment.SetEnvironmentVariable("DB_PORT", "5432");
            Environment.SetEnvironmentVariable("DB_NAME", "workout");
            Environment.SetEnvironmentVariable("DB_USER", "workout");
            Environment.SetEnvironmentVariable("DB_PASSWORD_FILE", tempFile);

            dynamic factory = CreateFactory();
            using var connection = factory.Create();
            var builder = new NpgsqlConnectionStringBuilder(connection.ConnectionString);

            Assert.Equal("super-secret", builder.Password);
            Assert.Equal("localhost", builder.Host);
            Assert.Equal(5432, builder.Port);
        }
        finally
        {
            RestoreEnvironment(original);
            File.Delete(tempFile);
        }
    }

    [Fact]
    public void Create_Throws_WhenPasswordFileIsRelative()
    {
        var original = CaptureEnvironment();

        try
        {
            Environment.SetEnvironmentVariable("DB_HOST", "localhost");
            Environment.SetEnvironmentVariable("DB_PORT", "5432");
            Environment.SetEnvironmentVariable("DB_NAME", "workout");
            Environment.SetEnvironmentVariable("DB_USER", "workout");
            Environment.SetEnvironmentVariable("DB_PASSWORD_FILE", "relative/path.txt");

            dynamic factory = CreateFactory();
            Assert.Throws<InvalidOperationException>(() => factory.Create());
        }
        finally
        {
            RestoreEnvironment(original);
        }
    }

    private static object CreateFactory()
    {
        var assembly = Assembly.Load("WorkoutApp.Api");
        var type = assembly.GetType("DatabaseConnectionFactory")!;
        return Activator.CreateInstance(type)!;
    }

    private static Dictionary<string, string?> CaptureEnvironment()
    {
        return new Dictionary<string, string?>
        {
            ["DB_HOST"] = Environment.GetEnvironmentVariable("DB_HOST"),
            ["DB_PORT"] = Environment.GetEnvironmentVariable("DB_PORT"),
            ["DB_NAME"] = Environment.GetEnvironmentVariable("DB_NAME"),
            ["DB_USER"] = Environment.GetEnvironmentVariable("DB_USER"),
            ["DB_PASSWORD_FILE"] = Environment.GetEnvironmentVariable("DB_PASSWORD_FILE"),
        };
    }

    private static void RestoreEnvironment(Dictionary<string, string?> values)
    {
        foreach (var (key, value) in values)
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}
