namespace PadelBackend.DTOs;

public class MatchPlayerResponse
{
    public int PlayerId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Team { get; set; } = string.Empty;

    public int EloRating { get; set; }

    public int? EloBeforeMatch { get; set; }

    public int? EloAfterMatch { get; set; }
}
