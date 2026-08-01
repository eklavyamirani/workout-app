using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using server.Configuration;
using server.Data;
using server.Endpoints;
using server.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Database
// Non-secret connection information comes from configuration; the password is supplied
// separately through a mounted file (ConnectionStrings__Default__PasswordFile).
var connectionString = ConnectionStringFactory.Resolve(builder.Configuration, "Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is required");
var adminConnectionString = ConnectionStringFactory.Resolve(builder.Configuration, "Admin");
var appRolePasswordFile = builder.Configuration["Database:AppRolePasswordFile"];
var appRolePassword = string.IsNullOrWhiteSpace(appRolePasswordFile)
    ? null
    : ConnectionStringFactory.ReadSecretFile(appRolePasswordFile);
var db = new AppDb(connectionString, adminConnectionString, appRolePassword);
builder.Services.AddSingleton(db);

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var metadataAddress = builder.Configuration["Auth:MetadataAddress"];
        if (!string.IsNullOrEmpty(metadataAddress))
        {
            if (metadataAddress.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            {
                options.RequireHttpsMetadata = false;
            }
            // Use separate internal URL for JWKS/metadata fetching (docker networking)
            // while validating the external issuer URL that appears in tokens
            options.MetadataAddress = metadataAddress;
            options.Authority = null;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = builder.Configuration["Auth:Issuer"],
                ValidateAudience = true,
                ValidAudience = builder.Configuration["Auth:ClientId"],
                ValidateLifetime = true,
                NameClaimType = "email"
            };
        }
        else
        {
            options.Authority = builder.Configuration["Auth:Issuer"];
            options.Audience = builder.Configuration["Auth:ClientId"];
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                NameClaimType = "email"
            };
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

// Initialize database schema
await db.InitializeAsync();

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
