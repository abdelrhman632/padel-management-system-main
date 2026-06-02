namespace PadelBackend.DTOs;

public class UpdateCourtRequest
{
    public string Name { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}