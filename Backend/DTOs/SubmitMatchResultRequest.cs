namespace PadelBackend.DTOs;

public class SubmitMatchResultRequest
{
    public int TeamAScore { get; set; }

    public int TeamBScore { get; set; }

    public string WinnerTeam { get; set; } = string.Empty;
}