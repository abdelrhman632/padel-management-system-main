namespace PadelBackend.Models;

public class MatchPlayer
{
    public int Id { get; set; }

    public int MatchId { get; set; }

    public Match Match { get; set; } = null!;

    public int PlayerId { get; set; }

    public Player Player { get; set; } = null!;

    public string Team { get; set; } = string.Empty;

    public int? EloBeforeMatch { get; set; }

    public int? EloAfterMatch { get; set; }
}
