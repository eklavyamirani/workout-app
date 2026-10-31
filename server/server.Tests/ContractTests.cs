using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using server.Configuration;
using server.Models;
using server.Tests.Fixtures;

namespace server.Tests;

/// <summary>
/// The API as a platform pod: configured only by runtime contract v1 variables, behind the
/// transaction pooler, validating real JWTs from an HTTPS issuer it trusts via PLATFORM_CA_FILE.
/// </summary>
public class ContractTests : IClassFixture<ContractAppFactory>
{
    private readonly ContractAppFactory _factory;

    public ContractTests(ContractAppFactory factory)
    {
        _factory = factory;
    }

    private HttpClient ClientWithToken(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task Health_IsHealthy_WithDatabaseUrlAndPasswordFile()
    {
        var response = await _factory.CreateClient().GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task PocketIdShapedToken_WithoutEmail_CanSync()
    {
        var token = _factory.Idp.CreateAccessToken(ContractAppFactory.ClientId, "pocket-user-1");
        var client = ClientWithToken(token);

        var push = await client.PostAsJsonAsync("/api/sync/push", new PushRequest
        {
            Changes =
            [
                new SyncChange
                {
                    Key = "test:contract",
                    Value = JsonSerializer.SerializeToElement(new { ok = true }),
                    UpdatedAt = DateTime.UtcNow.ToString("o"),
                }
            ]
        });
        Assert.Equal(HttpStatusCode.OK, push.StatusCode);

        var pull = await client.GetFromJsonAsync<PullResponse>("/api/sync/pull?since=2000-01-01T00:00:00Z");
        Assert.Contains(pull!.Changes, c => c.Key == "test:contract");
    }

    [Fact]
    public async Task TokenForAnotherEnvironment_IsRejected()
    {
        // §6a: audience is per environment, so a preview's token must not work on prod.
        var token = _factory.Idp.CreateAccessToken("workout-app-pr-42", "pocket-user-2");
        var response = await ClientWithToken(token).GetAsync("/api/sync/pull");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TokenSignedByAnotherKey_IsRejected()
    {
        using var otherKey = RSA.Create(2048);
        var token = _factory.Idp.CreateAccessToken(ContractAppFactory.ClientId, "pocket-user-3", signWith: otherKey);
        var response = await ClientWithToken(token).GetAsync("/api/sync/pull");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task TokenFromAnotherIssuer_IsRejected()
    {
        var token = _factory.Idp.CreateAccessToken(ContractAppFactory.ClientId, "pocket-user-4",
            issuer: "https://id.other.test");
        var response = await ClientWithToken(token).GetAsync("/api/sync/pull");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PlatformCa_IsRequired_ToReachTheIssuer()
    {
        _ = _factory.CreateClient(); // ensure the issuer is running
        var discovery = $"{_factory.Idp.Issuer}/.well-known/openid-configuration";

        using var withCa = new HttpClient(PlatformTrust.CreateHandler(_factory.Idp.CaBundlePath));
        Assert.Equal(HttpStatusCode.OK, (await withCa.GetAsync(discovery)).StatusCode);

        using var systemTrust = new HttpClient();
        await Assert.ThrowsAsync<HttpRequestException>(() => systemTrust.GetAsync(discovery));
    }
}
