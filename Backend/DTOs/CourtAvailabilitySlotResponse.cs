namespace PadelBackend.DTOs;

public class CourtAvailabilitySlotResponse
{
    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public bool IsAvailable { get; set; }
}