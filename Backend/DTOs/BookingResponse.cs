namespace PadelBackend.DTOs;

public class BookingResponse
{
    public int Id { get; set; }

    public int CourtId { get; set; }

    public string CourtName { get; set; } = string.Empty;

    public int UserId { get; set; }

    public string UserFullName { get; set; } = string.Empty;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}