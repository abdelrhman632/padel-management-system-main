using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PadelBackend.Data;
using PadelBackend.DTOs;
using System.Security.Claims;

namespace PadelBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlayersController : ControllerBase
{
    private readonly AppDbContext _context;

    public PlayersController(AppDbContext context)
    {
        _context = context;
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<PlayerProfileResponse>> GetMyProfile()
    {
        var userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userIdText == null)
        {
            return Unauthorized("Invalid token.");
        }

        var userId = int.Parse(userIdText);

        var player = await _context.Players
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (player == null)
        {
            return NotFound("Player profile not found.");
        }

        return Ok(new PlayerProfileResponse
        {
            UserId = player.UserId,
            PlayerId = player.Id,
            FullName = player.User.FullName,
            Email = player.User.Email,
            EloRating = player.EloRating,
            TotalMatches = player.TotalMatches,
            Wins = player.Wins,
            Losses = player.Losses,
            SkillLevel = player.SkillLevel
        });
    }

    [HttpGet]
    public async Task<ActionResult<List<PlayerProfileResponse>>> GetAllPlayers()
    {
        var players = await _context.Players
            .Include(p => p.User)
            .Select(p => new PlayerProfileResponse
            {
                UserId = p.UserId,
                PlayerId = p.Id,
                FullName = p.User.FullName,
                Email = p.User.Email,
                EloRating = p.EloRating,
                TotalMatches = p.TotalMatches,
                Wins = p.Wins,
                Losses = p.Losses,
                SkillLevel = p.SkillLevel
            })
            .ToListAsync();

        return Ok(players);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PlayerProfileResponse>> GetPlayerById(int id)
    {
        var player = await _context.Players
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (player == null)
        {
            return NotFound("Player not found.");
        }

        return Ok(new PlayerProfileResponse
        {
            UserId = player.UserId,
            PlayerId = player.Id,
            FullName = player.User.FullName,
            Email = player.User.Email,
            EloRating = player.EloRating,
            TotalMatches = player.TotalMatches,
            Wins = player.Wins,
            Losses = player.Losses,
            SkillLevel = player.SkillLevel
        });
    }
}