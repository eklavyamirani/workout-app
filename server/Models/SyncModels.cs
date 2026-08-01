using System.Text.Json;
using System.Text.Json.Serialization;

namespace server.Models;

public record SyncChange
{
    [JsonPropertyName("key")]
    public required string Key { get; init; }

    [JsonPropertyName("value")]
    public required JsonElement Value { get; init; }

    [JsonPropertyName("updatedAt")]
    public required string UpdatedAt { get; init; }

    [JsonPropertyName("version")]
    public int Version { get; init; }

    [JsonPropertyName("deleted")]
    public bool Deleted { get; init; }
}

public record PushRequest
{
    [JsonPropertyName("changes")]
    public required List<SyncChange> Changes { get; init; }
}

public record PushResultItem
{
    [JsonPropertyName("key")]
    public required string Key { get; init; }

    [JsonPropertyName("status")]
    public required string Status { get; init; }

    [JsonPropertyName("version")]
    public int Version { get; init; }

    [JsonPropertyName("value")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public JsonElement? Value { get; init; }
}

public record PushResponse
{
    [JsonPropertyName("results")]
    public required List<PushResultItem> Results { get; init; }

    [JsonPropertyName("serverTime")]
    public required string ServerTime { get; init; }
}

public record PullResponse
{
    [JsonPropertyName("changes")]
    public required List<SyncChange> Changes { get; init; }

    [JsonPropertyName("serverTime")]
    public required string ServerTime { get; init; }
}
