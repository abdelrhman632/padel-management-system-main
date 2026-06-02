namespace PadelBackend.Models;

public class Court
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public List<Booking> Bookings { get; set; } = new();
}