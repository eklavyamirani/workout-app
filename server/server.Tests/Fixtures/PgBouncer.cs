using System.Text;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Networks;

namespace server.Tests.Fixtures;

/// <summary>
/// PgBouncer in transaction mode, as the platform runs it (design §5, §6b.1:
/// <c>db.platform:6432</c>). <c>default_pool_size = 1</c> forces every client onto the same
/// server connection, so any session state one request leaves behind is visible to the next.
/// </summary>
public sealed class PgBouncer : IAsyncDisposable
{
    public const string Image = "edoburu/pgbouncer:v1.26.1-p0";
    private const ushort Port = 6432;

    private readonly IContainer _container;

    public PgBouncer(INetwork network, string upstreamHost, IReadOnlyDictionary<string, string> users)
    {
        var ini = $"""
            [databases]
            * = host={upstreamHost} port=5432

            [pgbouncer]
            listen_addr = 0.0.0.0
            listen_port = {Port}
            auth_type = scram-sha-256
            auth_file = /etc/pgbouncer/userlist.txt
            pool_mode = transaction
            default_pool_size = 1
            max_client_conn = 100
            ignore_startup_parameters = extra_float_digits,options
            """;
        var userlist = string.Concat(users.Select(u => $"\"{u.Key}\" \"{u.Value}\"\n"));

        _container = new ContainerBuilder(Image)
            .WithNetwork(network)
            .WithResourceMapping(Encoding.UTF8.GetBytes(ini), "/etc/pgbouncer/pgbouncer.ini")
            .WithResourceMapping(Encoding.UTF8.GetBytes(userlist), "/etc/pgbouncer/userlist.txt")
            .WithPortBinding(Port, assignRandomHostPort: true)
            .WithWaitStrategy(Wait.ForUnixContainer().UntilInternalTcpPortIsAvailable(Port))
            .Build();
    }

    public string Host => _container.Hostname;
    public ushort HostPort => _container.GetMappedPublicPort(Port);

    public Task StartAsync() => _container.StartAsync();

    public ValueTask DisposeAsync() => _container.DisposeAsync();
}
