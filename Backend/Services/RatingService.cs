using Microsoft.EntityFrameworkCore;
using PadelBackend.Data;

namespace PadelBackend.Services;

public class RatingService
{
    private readonly AppDbContext _context;

    public RatingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task ApplySimpleRatingUpdateAsync(int matchId, string winnerTeam)
    {
        var matchPlayers = await _context.MatchPlayers
            .Include(mp => mp.Player)
            .Where(mp => mp.MatchId == matchId)
            .ToListAsync();

        foreach (var matchPlayer in matchPlayers)
        {
            var eloBeforeMatch = matchPlayer.Player.EloRating;
            matchPlayer.Player.TotalMatches++;
            matchPlayer.EloBeforeMatch = eloBeforeMatch;

            if (matchPlayer.Team == winnerTeam)
            {
                matchPlayer.Player.Wins++;
                matchPlayer.Player.EloRating += 20;
            }
            else
            {
                matchPlayer.Player.Losses++;
                matchPlayer.Player.EloRating = Math.Max(0, matchPlayer.Player.EloRating - 20);
            }

            matchPlayer.EloAfterMatch = matchPlayer.Player.EloRating;
        }

        await _context.SaveChangesAsync();
    }
}
