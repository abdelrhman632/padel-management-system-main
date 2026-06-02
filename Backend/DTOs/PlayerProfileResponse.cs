namespace PadelBackend.DTOs;

public class PlayerProfileResponse
{
    public int UserId { get; set; }

    public int PlayerId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public int EloRating { get; set; }

    public int TotalMatches { get; set; }

    public int Wins { get; set; }

    public int Losses { get; set; }

    public string SkillLevel { get; set; } = string.Empty;
}