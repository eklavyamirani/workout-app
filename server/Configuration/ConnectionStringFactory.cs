using Npgsql;

namespace server.Configuration;

/// <summary>
/// Builds Npgsql connection strings from non-secret connection information plus a
/// separately mounted secret file. The password is never required to be present in an
/// environment variable, build argument, image label or log line.
/// </summary>
public static class ConnectionStringFactory
{
    /// <summary>
    /// The database connection for this process. On the platform (runtime contract v1, design
    /// §6b.1) that is <c>DATABASE_URL</c> — the owner role in the migration job, the runtime role
    /// in API pods — with the password in the URL or in <c>DATABASE_PASSWORD_FILE</c>. Local
    /// development falls back to <c>ConnectionStrings:Default</c>.
    /// </summary>
    public static string? ResolveDatabase(IConfiguration configuration)
    {
        var url = configuration["DATABASE_URL"];
        return string.IsNullOrWhiteSpace(url)
            ? Resolve(configuration, "Default")
            : FromDatabaseUrl(url, configuration["DATABASE_PASSWORD_FILE"]);
    }

    /// <summary>
    /// Converts <c>postgres://user[:password]@host[:port]/database[?sslmode=…]</c> to an Npgsql
    /// connection string (Npgsql does not parse URLs). A password in the URL wins over
    /// <paramref name="passwordFile"/>.
    /// </summary>
    public static string FromDatabaseUrl(string url, string? passwordFile)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme is not ("postgres" or "postgresql"))
        {
            // Never echo the value: it may contain a password.
            throw new InvalidOperationException("DATABASE_URL must be a postgres:// URL");
        }

        var database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));
        if (uri.UserInfo.Length == 0 || database.Length == 0)
        {
            throw new InvalidOperationException("DATABASE_URL must include a user and a database");
        }

        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = database,
            Username = Uri.UnescapeDataString(userInfo[0]),
            // The contract URL is PgBouncer in transaction mode. Npgsql's reset on reuse
            // (DISCARD ALL) "makes no sense" there (npgsql.org/doc/compatibility.html); the app
            // keeps no session state anyway (Data/UserScope.cs).
            NoResetOnClose = true,
        };

        if (userInfo.Length == 2 && userInfo[1].Length > 0)
        {
            builder.Password = Uri.UnescapeDataString(userInfo[1]);
        }
        else if (!string.IsNullOrWhiteSpace(passwordFile))
        {
            builder.Password = ReadSecretFile(passwordFile);
        }

        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        foreach (string? key in query.Keys)
        {
            switch (key)
            {
                case "sslmode":
                    builder.SslMode = Enum.Parse<SslMode>(query[key]!.Replace("-", ""), ignoreCase: true);
                    break;
                default:
                    throw new InvalidOperationException($"DATABASE_URL parameter '{key}' is not supported");
            }
        }

        return builder.ConnectionString;
    }

    /// <summary>
    /// Resolves the connection string named <paramref name="name"/>.
    /// The password, when not already present, is read from the file referenced by
    /// <c>ConnectionStrings:{name}:PasswordFile</c>.
    /// </summary>
    public static string? Resolve(IConfiguration configuration, string name)
    {
        var baseConnectionString = configuration.GetSection($"ConnectionStrings:{name}").Value;
        if (string.IsNullOrWhiteSpace(baseConnectionString))
        {
            return null;
        }

        var passwordFile = configuration[$"ConnectionStrings:{name}:PasswordFile"];
        if (string.IsNullOrWhiteSpace(passwordFile))
        {
            return baseConnectionString;
        }

        var builder = new NpgsqlConnectionStringBuilder(baseConnectionString)
        {
            Password = ReadSecretFile(passwordFile)
        };

        return builder.ConnectionString;
    }

    /// <summary>
    /// Reads a secret from a mounted file. Failure messages deliberately omit file contents.
    /// </summary>
    public static string ReadSecretFile(string path)
    {
        if (!File.Exists(path))
        {
            throw new InvalidOperationException($"Secret file '{path}' was not found");
        }

        var value = File.ReadAllText(path).TrimEnd('\r', '\n');
        if (value.Length == 0)
        {
            throw new InvalidOperationException($"Secret file '{path}' is empty");
        }

        return value;
    }
}
