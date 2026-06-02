using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PadelBackend.Data;
using PadelBackend.DTOs;
using PadelBackend.Models;

namespace PadelBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CourtsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CourtsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<Court>>> GetCourts()
    {
        var courts = await _context.Courts
            .OrderBy(c => c.Id)
            .ToListAsync();

        return Ok(courts);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Court>> GetCourtById(int id)
    {
        var court = await _context.Courts.FindAsync(id);

        if (court == null)
        {
            return NotFound("Court not found.");
        }

        return Ok(court);
    }

    [HttpPost]
    public async Task<ActionResult<Court>> CreateCourt(CreateCourtRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Court name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Location))
        {
            return BadRequest("Court location is required.");
        }

        var court = new Court
        {
            Name = request.Name.Trim(),
            Location = request.Location.Trim(),
            IsActive = true
        };

        _context.Courts.Add(court);
        await _context.SaveChangesAsync();

        return Ok(court);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Court>> UpdateCourt(int id, UpdateCourtRequest request)
    {
        var court = await _context.Courts.FindAsync(id);

        if (court == null)
        {
            return NotFound("Court not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Court name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Location))
        {
            return BadRequest("Court location is required.");
        }

        court.Name = request.Name.Trim();
        court.Location = request.Location.Trim();
        court.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return Ok(court);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCourt(int id)
    {
        var court = await _context.Courts.FindAsync(id);

        if (court == null)
        {
            return NotFound("Court not found.");
        }

        court.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok("Court deactivated successfully.");
    }

    [HttpGet("{courtId}/availability")]
    public async Task<ActionResult<List<CourtAvailabilitySlotResponse>>> GetCourtAvailability(
        int courtId,
        DateTime date)
    {
        var court = await _context.Courts.FindAsync(courtId);

        if (court == null)
        {
            return NotFound("Court not found.");
        }

        if (!court.IsActive)
        {
            return BadRequest("Court is not active.");
        }

        // Swagger may send "2026-06-01" as DateTimeKind.Unspecified.
        // PostgreSQL timestamp with time zone requires UTC DateTime values.
        var selectedDateUtc = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

        // Current working hours:
        // 10:00 AM to 12:00 AM UTC.
        // This generates hourly blocks:
        // 10:00-11:00, 11:00-12:00, 12:00-13:00, etc.
        var dayStart = selectedDateUtc.AddHours(10);
        var dayEnd = selectedDateUtc.AddDays(1);

        var confirmedBookings = await _context.Bookings
            .Where(b =>
                b.CourtId == courtId &&
                b.Status == "Confirmed" &&
                b.StartTime < dayEnd &&
                b.EndTime > dayStart)
            .ToListAsync();

        var slots = new List<CourtAvailabilitySlotResponse>();

        var slotDuration = TimeSpan.FromHours(1);
        var slotStart = dayStart;

        while (slotStart + slotDuration <= dayEnd)
        {
            var slotEnd = slotStart + slotDuration;

            var isBooked = confirmedBookings.Any(b =>
                slotStart < b.EndTime &&
                slotEnd > b.StartTime
            );

            slots.Add(new CourtAvailabilitySlotResponse
            {
                StartTime = slotStart,
                EndTime = slotEnd,
                IsAvailable = !isBooked
            });

            slotStart = slotEnd;
        }

        return Ok(slots);
    }
}