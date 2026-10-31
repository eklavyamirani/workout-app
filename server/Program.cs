using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using server.Configuration;
using server.Data;
using server.Endpoints;
using server.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Runtime contract v1 (design §6b.1): the platform sets PORT; ASPNETCORE_URLS (Dockerfile) is
// the default otherwise. Ignored by the in-memory test server.
if (int.TryParse(builder.Configuration["PORT"], out var port))
{
    builder.WebHost.UseUrls($"http://+:{port}");
}

// Database
// DATABASE_URL (+ DATABASE_PASSWORD_FILE) on the platform; ConnectionStrings:Default with a
// mounted password file locally. The role is whatever the environment provides: the owner for
// the migration job, the runtime role for the API.
var connectionString = ConnectionStringFactory.ResolveDatabase(builder.Configuration)
    ?? throw new InvalidOperationException("DATABASE_URL or ConnectionStrings:Default is required");

if (args.Contains("--migrate"))
{
    // Migration job: apply the schema as the owner and exit; the API never migrates.
    var runtimeRole = builder.Configuration["DATABASE_RUNTIME_ROLE"]
        ?? builder.Configuration["Database:RuntimeRole"];
    await Migrator.RunAsync(connectionString, string.IsNullOrWhiteSpace(runtimeRole) ? null : runtimeRole);
    Console.WriteLine(runtimeRole is null
        ? "Migrations applied (no separate runtime role)."
        : $"Migrations applied; runtime role '{runtimeRole}' granted.");
    return;
}

var seedIndex = Array.IndexOf(args, "--seed");
if (seedIndex >= 0)
{
    // Preview seed job (platform design §5.2): owner role, after --migrate.
    var script = seedIndex + 1 < args.Length ? args[seedIndex + 1] : "";
    await Seeder.RunAsync(connectionString, script);
    Console.WriteLine($"Seed script '{script}' applied.");
    return;
}

builder.Services.AddSingleton(new AppDb(connectionString));

// Authentication: OIDC bearer tokens from the platform IdP (design §6a, `oidc` mode).
// OIDC_ISSUER / OIDC_AUDIENCE come from the platform; Auth:* is the local-dev fallback.
var oidcIssuer = builder.Configuration["OIDC_ISSUER"] ?? builder.Configuration["Auth:Issuer"];
var oidcAudience = builder.Configuration["OIDC_AUDIENCE"]
    ?? builder.Configuration["OIDC_CLIENT_ID"]
    ?? builder.Configuration["Auth:ClientId"];
var platformCaFile = builder.Configuration["PLATFORM_CA_FILE"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep JWT claim names ("sub", "iss", "email") instead of mapping to WS-* URIs.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = oidcIssuer,
            // Audience is per environment (`workout-app-<env>`): a token minted for a preview
            // is rejected by prod (§6a).
            ValidateAudience = true,
            ValidAudience = oidcAudience,
            ValidateLifetime = true,
            NameClaimType = "sub"
        };

        if (!string.IsNullOrWhiteSpace(platformCaFile))
        {
            options.BackchannelHttpHandler = PlatformTrust.CreateHandler(platformCaFile);
        }

        // Local compose only: fetch metadata over the internal Docker network while validating
        // the external issuer URL that appears in tokens.
        var metadataAddress = builder.Configuration["Auth:MetadataAddress"];
        if (!string.IsNullOrEmpty(metadataAddress))
        {
            options.MetadataAddress = metadataAddress;
            options.RequireHttpsMetadata = !metadataAddress.StartsWith("http://", StringComparison.OrdinalIgnoreCase);
        }
        else
        {
            options.Authority = oidcIssuer;
        }
    });

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
            ?? new[] { "http://localhost:4173", "http://localhost:5173" };
        policy.WithOrigins(origins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// User resolver middleware — only for /api/sync routes
app.UseWhen(
    context => context.Request.Path.StartsWithSegments("/api/sync"),
    appBuilder => appBuilder.UseMiddleware<UserResolverMiddleware>()
);

// Health check — verifies the database dependency without disclosing configuration.
app.MapGet("/api/health", async (AppDb appDb, ILoggerFactory loggerFactory, CancellationToken cancellationToken) =>
{
    try
    {
        await appDb.CheckAsync(cancellationToken);
        return Results.Ok(new { status = "healthy", dependencies = new { database = "healthy" } });
    }
    catch (Exception ex)
    {
        loggerFactory.CreateLogger("Health").LogError(ex, "Database health check failed");
        return Results.Json(
            new { status = "unhealthy", dependencies = new { database = "unhealthy" } },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

// Sync endpoints
app.MapSyncEndpoints();

app.Run();

// Make Program class accessible for WebApplicationFactory in tests
public partial class Program { }
