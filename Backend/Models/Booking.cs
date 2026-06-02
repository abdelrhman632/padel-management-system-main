namespace PadelBackend.Models;

public class Booking
{
    public int Id { get; set; }

    public int CourtId { get; set; }

    public Court Court { get; set; } = null!;

    public int UserId { get; set; }

    public User User { get; set; } = null!;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string Status { get; set; } = "Confirmed";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}