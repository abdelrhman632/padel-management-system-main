using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PadelBackend.Data;
using PadelBackend.DTOs;
using PadelBackend.Models;
using PadelBackend.Services;

namespace PadelBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MatchesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly RatingService _ratingService;

    public MatchesController(AppDbContext context, RatingService ratingService)
    {
        _context = context;
        _ratingService = ratingService;
    }

    [HttpGet]
    public async Task<ActionResult<List<MatchResponse>>> GetAllMatches()
    {
        var matches = await _context.Matches
            .Include(m => m.Court)
            .Include(m => m.MatchPlayers)
                .ThenInclude(mp => mp.Player)
                    .ThenInclude(p => p.User)
            .OrderByDescending(m => m.StartTime)
            .ToListAsync();

        return Ok(matches.Select(ToMatchResponse).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MatchResponse>> GetMatchById(int id)
    {
        var match = await _context.Matches
            .Include(m => m.Court)
            .Include(m => m.MatchPlayers)
                .ThenInclude(mp => mp.Player)
                    .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (match == null)
        {
            return NotFound("Match not found.");
        }

        return Ok(ToMatchResponse(match));
    }

    [HttpPost]
    public async Task<ActionResult<MatchResponse>> CreateMatch(CreateMatchRequest request)
    {
        if (request.TeamAPlayerIds.Count != 2)
        {
            return BadRequest("Team A must have exactly 2 players.");
        }

        if (request.TeamBPlayerIds.Count != 2)
        {
            return BadRequest("Team B must have exactly 2 players.");
        }

        var allPlayerIds = request.TeamAPlayerIds
            .Concat(request.TeamBPlayerIds)
            .ToList();

        if (allPlayerIds.Distinct().Count() != 4)
        {
            return BadRequest("A match must have 4 different players.");
        }

        var startTime = NormalizeToUtc(request.StartTime);
        var endTime = NormalizeToUtc(request.EndTime);

        if (endTime <= startTime)
        {
            return BadRequest("End time must be after start time.");
        }

        if (startTime.Minute != 0 || startTime.Second != 0 || startTime.Millisecond != 0 ||
            endTime.Minute != 0 || endTime.Second != 0 || endTime.Millisecond != 0)
        {
            return BadRequest("Match start and end times must be exactly on the hour.");
        }

        var duration = endTime - startTime;

        if (duration.TotalHours < 1 || duration.TotalHours % 1 != 0)
        {
            return BadRequest("Match duration must be at least 1 hour and must be in whole hours only.");
        }

        var court = await _context.Courts.FindAsync(request.CourtId);

        if (court == null)
        {
            return NotFound("Court not found.");
        }

        if (!court.IsActive)
        {
            return BadRequest("Court is not active.");
        }

        var players = await _context.Players
            .Where(p => allPlayerIds.Contains(p.Id))
            .ToListAsync();

        if (players.Count != 4)
        {
            return BadRequest("One or more players do not exist.");
        }

        if (request.BookingId.HasValue)
        {
            var booking = await _context.Bookings.FindAsync(request.BookingId.Value);

            if (booking == null)
            {
                return NotFound("Booking not found.");
            }

            if (booking.Status != "Confirmed")
            {
                return BadRequest("Booking is not confirmed.");
            }

            if (booking.CourtId != request.CourtId)
            {
                return BadRequest("Booking does not belong to the selected court.");
            }

            if (startTime < booking.StartTime || endTime > booking.EndTime)
            {
                return BadRequest("Match time must be within the booking time.");
            }

            // Prevent using same booking for multiple matches (Scheduled or Completed)
            var existingMatch = await _context.Matches
                .AnyAsync(m => m.BookingId == booking.Id && m.Status != "Cancelled");

            if (existingMatch)
            {
                return BadRequest("This booking is already associated with a match.");
            }
        }
        else
        {
            var hasMatchConflict = await _context.Matches.AnyAsync(m =>
                m.CourtId == request.CourtId &&
                m.Status != "Cancelled" &&
                startTime < m.EndTime &&
                endTime > m.StartTime
            );

            if (hasMatchConflict)
            {
                return BadRequest("There is already a match scheduled on this court during this time.");
            }
        }

        var match = new Match
        {
            CourtId = request.CourtId,
            BookingId = request.BookingId,
            StartTime = startTime,
            EndTime = endTime,
            Status = "Scheduled"
        };

        _context.Matches.Add(match);
        await _context.SaveChangesAsync();

        foreach (var playerId in request.TeamAPlayerIds)
        {
            _context.MatchPlayers.Add(new MatchPlayer
            {
                MatchId = match.Id,
                PlayerId = playerId,
                Team = "A"
            });
        }

        foreach (var playerId in request.TeamBPlayerIds)
        {
            _context.MatchPlayers.Add(new MatchPlayer
            {
                MatchId = match.Id,
                PlayerId = playerId,
                Team = "B"
            });
        }

        await _context.SaveChangesAsync();

        var savedMatch = await _context.Matches
            .Include(m => m.Court)
            .Include(m => m.MatchPlayers)
                .ThenInclude(mp => mp.Player)
                    .ThenInclude(p => p.User)
            .FirstAsync(m => m.Id == match.Id);

        return Ok(ToMatchResponse(savedMatch));
    }

    [HttpPost("{id}/result")]
    public async Task<ActionResult<MatchResponse>> SubmitMatchResult(
        int id,
        SubmitMatchResultRequest request)
    {
        var match = await _context.Matches
            .Include(m => m.Court)
            .Include(m => m.MatchPlayers)
                .ThenInclude(mp => mp.Player)
                    .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (match == null)
        {
            return NotFound("Match not found.");
        }

        if (match.Status == "Completed")
        {
            return BadRequest("Match result has already been submitted.");
        }

        if (request.WinnerTeam != "A" && request.WinnerTeam != "B")
        {
            return BadRequest("WinnerTeam must be either 'A' or 'B'.");
        }

        if (request.TeamAScore < 0 || request.TeamBScore < 0)
        {
            return BadRequest("Scores cannot be negative.");
        }

        if (request.TeamAScore == request.TeamBScore)
        {
            return BadRequest("A match cannot end in a draw.");
        }

        if (request.WinnerTeam == "A" && request.TeamAScore <= request.TeamBScore)
        {
            return BadRequest("Team A score must be higher if Team A is the winner.");
        }

        if (request.WinnerTeam == "B" && request.TeamBScore <= request.TeamAScore)
        {
            return BadRequest("Team B score must be higher if Team B is the winner.");
        }

        match.TeamAScore = request.TeamAScore;
        match.TeamBScore = request.TeamBScore;
        match.WinnerTeam = request.WinnerTeam;
        match.Status = "Completed";

        await _context.SaveChangesAsync();

        await _ratingService.ApplySimpleRatingUpdateAsync(match.Id, request.WinnerTeam);

        var updatedMatch = await _context.Matches
            .Include(m => m.Court)
            .Include(m => m.MatchPlayers)
                .ThenInclude(mp => mp.Player)
                    .ThenInclude(p => p.User)
            .FirstAsync(m => m.Id == id);

        return Ok(ToMatchResponse(updatedMatch));
    }

    private static DateTime NormalizeToUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc)
        {
            return value;
        }

        if (value.Kind == DateTimeKind.Local)
        {
            return value.ToUniversalTime();
        }

        return DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private static MatchResponse ToMatchResponse(Match match)
    {
        return new MatchResponse
        {
            Id = match.Id,
            CourtId = match.CourtId,
            CourtName = match.Court?.Name,
            BookingId = match.BookingId,
            StartTime = match.StartTime,
            EndTime = match.EndTime,
            Status = match.Status,
            TeamAScore = match.TeamAScore,
            TeamBScore = match.TeamBScore,
            WinnerTeam = match.WinnerTeam,
            Players = match.MatchPlayers
                .OrderBy(mp => mp.Team)
                .Select(mp => new MatchPlayerResponse
                {
                    PlayerId = mp.PlayerId,
                    FullName = mp.Player.User.FullName,
                    Team = mp.Team,
                    EloRating = mp.Player.EloRating,
                    EloBeforeMatch = mp.EloBeforeMatch,
                    EloAfterMatch = mp.EloAfterMatch
                })
                .ToList()
        };
    }
}
