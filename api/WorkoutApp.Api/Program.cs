using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddSingleton<IDatabaseConnectionFactory, DatabaseConnectionFactory>();

var app = builder.Build();

app.MapGet("/api/health", async (IDatabaseConnectionFactory databaseConnectionFactory, CancellationToken cancellationToken) =>
{
    try
    {
        await using var connection = databaseConnectionFactory.Create();
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand("SELECT 1", connection);
        await command.ExecuteScalarAsync(cancellationToken);
        return Results.Ok(new { status = "ok" });
    }
    catch
    {
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Database unavailable");
    }
});

app.Run();

public interface IDatabaseConnectionFactory
{
    NpgsqlConnection Create();
}

public sealed class DatabaseConnectionFactory : IDatabaseConnectionFactory
{
    public NpgsqlConnection Create()
    {
        var host = RequireEnvironmentVariable("DB_HOST");
        var portRaw = RequireEnvironmentVariable("DB_PORT");
        var database = RequireEnvironmentVariable("DB_NAME");
        var username = RequireEnvironmentVariable("DB_USER");
        var passwordFile = RequireEnvironmentVariable("DB_PASSWORD_FILE");

        if (!int.TryParse(portRaw, out var port) || port <= 0)
        {
            throw new InvalidOperationException("DB_PORT must be a positive integer");
        }

        if (!Path.IsPathRooted(passwordFile))
        {
            throw new InvalidOperationException("DB_PASSWORD_FILE must be an absolute path");
        }

        var password = File.ReadAllText(passwordFile).Trim();
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException("Database password file is empty");
        }

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = port,
            Database = database,
            Username = username,
            Password = password,
            SslMode = SslMode.Prefer,
            Pooling = true,
            Timeout = 5,
            CommandTimeout = 5,
        };

        return new NpgsqlConnection(builder.ConnectionString);
    }

    private static string RequireEnvironmentVariable(string name)
    {
        var value = Environment.GetEnvironmentVariable(name);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Missing required environment variable: {name}");
        }

        return value;
    }
}
