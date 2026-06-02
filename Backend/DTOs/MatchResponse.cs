namespace PadelBackend.DTOs;

public class MatchResponse
{
    public int Id { get; set; }

    public int? CourtId { get; set; }

    public string? CourtName { get; set; }

    public int? BookingId { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string Status { get; set; } = string.Empty;

    public int? TeamAScore { get; set; }

    public int? TeamBScore { get; set; }

    public string? WinnerTeam { get; set; }

    public List<MatchPlayerResponse> Players { get; set; } = new();
}