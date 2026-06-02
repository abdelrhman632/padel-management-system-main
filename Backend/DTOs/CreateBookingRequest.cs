namespace PadelBackend.DTOs;

public class CreateBookingRequest
{
    public int CourtId { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }
}