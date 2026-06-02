using Microsoft.EntityFrameworkCore;
using PadelBackend.Models;

namespace PadelBackend.Data;

public static class SeedData
{
    private static readonly string[] CairoLocations =
    {
        "Maadi",
        "Zamalek",
        "New Cairo",
        "Heliopolis",
        "Nasr City",
        "6th of October",
        "Sheikh Zayed",
        "Dokki",
        "Mohandessin",
        "Rehab City"
    };

    public static async Task EnsureSeededAsync(AppDbContext db)
    {
        // Safety net: some environments may already have an older DB schema.
        // Ensure the ELO snapshot columns exist before any MatchPlayers inserts.
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "MatchPlayers"
            ADD COLUMN IF NOT EXISTS "EloBeforeMatch" integer NULL;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "MatchPlayers"
            ADD COLUMN IF NOT EXISTS "EloAfterMatch" integer NULL;
            """);

        // Keep seeding idempotent: only add what is missing.
        // Courts: ensure each Cairo location has 7 courts.
        foreach (var location in CairoLocations)
        {
            var existingCount = await db.Courts.CountAsync(c =>
                c.IsActive &&
                c.Location == location
            );

            // If it's below 7, bring it up to 7. If it's already 7+, leave it.
            var minTarget = 7;
            var target = 7;
            var toCreate = existingCount < minTarget ? Math.Max(0, target - existingCount) : 0;
            if (toCreate == 0)
            {
                continue;
            }

            // Make deterministic names per location.
            // Example: "Maadi Court 01", "Maadi Court 02", ...
            var usedNames = await db.Courts
                .Where(c => c.Location == location)
                .Select(c => c.Name)
                .ToListAsync();

            var created = 0;
            var index = 1;
            while (created < toCreate)
            {
                var name = $"{location} Court {index:00}";
                index++;

                if (usedNames.Contains(name))
                {
                    continue;
                }

                db.Courts.Add(new Court
                {
                    Name = name,
                    Location = location,
                    IsActive = true
                });
                created++;
            }
        }

        // Demo players: make sure there are enough players to record matches (needs 4 distinct players).
        // These accounts are optional and only added if missing.
        var demoPassword = "Padel@1234";
        var demoUsers = new[]
        {
            new { FullName = "Demo Player 1", Email = "demo1@padel.local" },
            new { FullName = "Demo Player 2", Email = "demo2@padel.local" },
            new { FullName = "Demo Player 3", Email = "demo3@padel.local" },
            new { FullName = "Demo Player 4", Email = "demo4@padel.local" },
            new { FullName = "Demo Player 5", Email = "demo5@padel.local" },
            new { FullName = "Demo Player 6", Email = "demo6@padel.local" },
        };

        foreach (var demo in demoUsers)
        {
            var exists = await db.Users.AnyAsync(u => u.Email == demo.Email);
            if (exists)
            {
                continue;
            }

            var user = new User
            {
                FullName = demo.FullName,
                Email = demo.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(demoPassword),
                Role = "Player"
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            db.Players.Add(new Player
            {
                UserId = user.Id,
                EloRating = 1200,
                TotalMatches = 0,
                Wins = 0,
                Losses = 0,
                SkillLevel = "Beginner"
            });

            await db.SaveChangesAsync();
        }

        await db.SaveChangesAsync();
    }
}
