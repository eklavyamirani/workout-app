using System.Net;
using server.Tests.Fixtures;

namespace server.Tests;

public class AuthTests : IClassFixture<AppFactory>
{
    private readonly AppFactory _factory;

    public AuthTests(AppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Push_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/sync/push",
            new StringContent("{\"changes\":[]}", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Pull_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/sync/pull?since=2000-01-01T00:00:00Z");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
