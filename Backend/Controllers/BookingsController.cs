using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PadelBackend.Data;
using PadelBackend.DTOs;
using PadelBackend.Models;
using System.Security.Claims;

namespace PadelBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public BookingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<BookingResponse>>> GetAllBookings()
    {
        var bookings = await _context.Bookings
            .Include(b => b.Court)
            .Include(b => b.User)
            .OrderByDescending(b => b.StartTime)
            .Select(b => new BookingResponse
            {
                Id = b.Id,
                CourtId = b.CourtId,
                CourtName = b.Court.Name,
                UserId = b.UserId,
                UserFullName = b.User.FullName,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                Status = b.Status,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();

        return Ok(bookings);
    }

    [Authorize]
    [HttpGet("my")]
    public async Task<ActionResult<List<BookingResponse>>> GetMyBookings()
    {
        var userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userIdText == null)
        {
            return Unauthorized("Invalid token.");
        }

        var userId = int.Parse(userIdText);

        var bookings = await _context.Bookings
            .Include(b => b.Court)
            .Include(b => b.User)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.StartTime)
            .Select(b => new BookingResponse
            {
                Id = b.Id,
                CourtId = b.CourtId,
                CourtName = b.Court.Name,
                UserId = b.UserId,
                UserFullName = b.User.FullName,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                Status = b.Status,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();

        return Ok(bookings);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<BookingResponse>> CreateBooking(CreateBookingRequest request)
    {
        var userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userIdText == null)
        {
            return Unauthorized("Invalid token.");
        }

        var userId = int.Parse(userIdText);

        var court = await _context.Courts.FindAsync(request.CourtId);

        if (court == null)
        {
            return NotFound("Court not found.");
        }

        if (!court.IsActive)
        {
            return BadRequest("Court is not active.");
        }

        var startTime = NormalizeToUtc(request.StartTime);
        var endTime = NormalizeToUtc(request.EndTime);

        if (startTime < DateTime.UtcNow)
        {
            return BadRequest("Booking start time cannot be in the past.");
        }

        if (endTime <= startTime)
        {
            return BadRequest("End time must be after start time.");
        }

        // Rule 1: Start and end must be exactly on the hour.
        // Examples allowed: 18:00, 19:00, 20:00
        // Examples rejected: 18:30, 19:15, 20:45
        if (startTime.Minute != 0 || startTime.Second != 0 || startTime.Millisecond != 0 ||
            endTime.Minute != 0 || endTime.Second != 0 || endTime.Millisecond != 0)
        {
            return BadRequest("Booking start and end times must be exactly on the hour.");
        }

        // Rule 2: Duration must be whole hours only.
        // Examples allowed: 1 hour, 2 hours, 3 hours
        // Examples rejected: 30 minutes, 1.5 hours, 2.5 hours
        var duration = endTime - startTime;

        if (duration.TotalHours < 1 || duration.TotalHours % 1 != 0)
        {
            return BadRequest("Booking duration must be at least 1 hour and must be in whole hours only.");
        }

        var hasConflict = await _context.Bookings.AnyAsync(b =>
            b.CourtId == request.CourtId &&
            b.Status == "Confirmed" &&
            startTime < b.EndTime &&
            endTime > b.StartTime
        );

        if (hasConflict)
        {
            return BadRequest("Court is already booked during this time.");
        }

        var booking = new Booking
        {
            CourtId = request.CourtId,
            UserId = userId,
            StartTime = startTime,
            EndTime = endTime,
            Status = "Confirmed"
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        var savedBooking = await _context.Bookings
            .Include(b => b.Court)
            .Include(b => b.User)
            .FirstAsync(b => b.Id == booking.Id);

        return Ok(new BookingResponse
        {
            Id = savedBooking.Id,
            CourtId = savedBooking.CourtId,
            CourtName = savedBooking.Court.Name,
            UserId = savedBooking.UserId,
            UserFullName = savedBooking.User.FullName,
            StartTime = savedBooking.StartTime,
            EndTime = savedBooking.EndTime,
            Status = savedBooking.Status,
            CreatedAt = savedBooking.CreatedAt
        });
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        var userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userIdText == null)
        {
            return Unauthorized("Invalid token.");
        }

        var userId = int.Parse(userIdText);

        var booking = await _context.Bookings.FindAsync(id);

        if (booking == null)
        {
            return NotFound("Booking not found.");
        }

        if (booking.UserId != userId)
        {
            return Forbid();
        }

        if (booking.Status == "Cancelled")
        {
            return BadRequest("Booking is already cancelled.");
        }

        // Prevent cancelling if there's an associated non-cancelled match
        var hasMatch = await _context.Matches.AnyAsync(m => m.BookingId == id && m.Status != "Cancelled");
        if (hasMatch)
        {
            return BadRequest("Cannot cancel booking because a match is associated with it.");
        }

        booking.Status = "Cancelled";
        await _context.SaveChangesAsync();

        return Ok("Booking cancelled successfully.");
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
}
