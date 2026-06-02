namespace PadelBackend.Models;

public class Match
{
    public int Id { get; set; }

    public int? CourtId { get; set; }

    public Court? Court { get; set; }

    public int? BookingId { get; set; }

    public Booking? Booking { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string Status { get; set; } = "Scheduled";

    public int? TeamAScore { get; set; }

    public int? TeamBScore { get; set; }

    public string? WinnerTeam { get; set; }

    public List<MatchPlayer> MatchPlayers { get; set; } = new();
}