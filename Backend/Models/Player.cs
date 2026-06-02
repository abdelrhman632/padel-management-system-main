namespace PadelBackend.Models;

public class Player
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User User { get; set; } = null!;

    public int EloRating { get; set; } = 1200;

    public int TotalMatches { get; set; } = 0;

    public int Wins { get; set; } = 0;

    public int Losses { get; set; } = 0;

    public string SkillLevel { get; set; } = "Beginner";
}