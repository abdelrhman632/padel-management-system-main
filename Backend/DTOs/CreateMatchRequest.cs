namespace PadelBackend.DTOs;

public class CreateMatchRequest
{
    public int CourtId { get; set; }

    public int? BookingId { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public List<int> TeamAPlayerIds { get; set; } = new();

    public List<int> TeamBPlayerIds { get; set; } = new();
}