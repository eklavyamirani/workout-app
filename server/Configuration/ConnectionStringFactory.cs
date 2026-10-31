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
