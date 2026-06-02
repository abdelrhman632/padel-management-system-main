-- Demo data for rankings, recent matches, ELO progression, and next booking.
-- This script assumes users/players already exist.

INSERT INTO "Courts" ("Name", "Location", "IsActive")
SELECT 'Court A', 'Downtown', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Courts" WHERE "Name" = 'Court A');

INSERT INTO "Courts" ("Name", "Location", "IsActive")
SELECT 'Court B', 'Uptown', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Courts" WHERE "Name" = 'Court B');

WITH selected_players AS (
    SELECT
        p."Id" AS player_id,
        p."UserId" AS user_id,
        ROW_NUMBER() OVER (ORDER BY p."Id") AS rn
    FROM "Players" p
    ORDER BY p."Id"
    LIMIT 4
),
selected_court AS (
    SELECT "Id" AS court_id
    FROM "Courts"
    ORDER BY "Id"
    LIMIT 1
),
recent_matches AS (
    SELECT *
    FROM (
        VALUES
            (NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '1 hour', 6, 4, 'A'),
            (NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '1 hour', 3, 6, 'B'),
            (NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', 6, 2, 'A')
    ) AS matches(start_time, end_time, team_a_score, team_b_score, winner_team)
),
inserted_recent_matches AS (
    INSERT INTO "Matches" ("CourtId", "BookingId", "StartTime", "EndTime", "Status", "TeamAScore", "TeamBScore", "WinnerTeam")
    SELECT
        selected_court.court_id,
        NULL,
        recent_matches.start_time,
        recent_matches.end_time,
        'Completed',
        recent_matches.team_a_score,
        recent_matches.team_b_score,
        recent_matches.winner_team
    FROM recent_matches
    CROSS JOIN selected_court
    WHERE NOT EXISTS (
        SELECT 1
        FROM "Matches" existing
        WHERE existing."StartTime" = recent_matches.start_time
          AND existing."CourtId" = selected_court.court_id
    )
    RETURNING "Id", "StartTime"
),
ordered_recent_matches AS (
    SELECT
        irm."Id" AS match_id,
        ROW_NUMBER() OVER (ORDER BY irm."StartTime") AS rn
    FROM inserted_recent_matches irm
),
recent_match_players AS (
    SELECT
        orm.match_id,
        sp.player_id,
        CASE
            WHEN sp.rn IN (1, 2) THEN 'A'
            ELSE 'B'
        END AS team,
        CASE
            WHEN orm.rn = 1 AND sp.rn IN (1, 2) THEN 1200
            WHEN orm.rn = 1 THEN 1200
            WHEN orm.rn = 2 AND sp.rn IN (1, 2) THEN 1220
            WHEN orm.rn = 2 THEN 1180
            WHEN orm.rn = 3 AND sp.rn IN (1, 2) THEN 1200
            ELSE 1200
        END AS elo_before,
        CASE
            WHEN orm.rn = 1 AND sp.rn IN (1, 2) THEN 1220
            WHEN orm.rn = 1 THEN 1180
            WHEN orm.rn = 2 AND sp.rn IN (1, 2) THEN 1200
            WHEN orm.rn = 2 THEN 1200
            WHEN orm.rn = 3 AND sp.rn IN (1, 2) THEN 1220
            ELSE 1180
        END AS elo_after
    FROM ordered_recent_matches orm
    CROSS JOIN selected_players sp
)
INSERT INTO "MatchPlayers" ("MatchId", "PlayerId", "Team", "EloBeforeMatch", "EloAfterMatch")
SELECT
    rmp.match_id,
    rmp.player_id,
    rmp.team,
    rmp.elo_before,
    rmp.elo_after
FROM recent_match_players rmp
WHERE NOT EXISTS (
    SELECT 1
    FROM "MatchPlayers" existing
    WHERE existing."MatchId" = rmp.match_id
      AND existing."PlayerId" = rmp.player_id
);

WITH selected_players AS (
    SELECT
        p."Id" AS player_id,
        p."UserId" AS user_id,
        ROW_NUMBER() OVER (ORDER BY p."Id") AS rn
    FROM "Players" p
    ORDER BY p."Id"
    LIMIT 4
),
selected_court AS (
    SELECT "Id" AS court_id
    FROM "Courts"
    ORDER BY "Id"
    LIMIT 1
),
upcoming_booking AS (
    INSERT INTO "Bookings" ("CourtId", "UserId", "StartTime", "EndTime", "Status", "CreatedAt")
    SELECT
        selected_court.court_id,
        (SELECT user_id FROM selected_players WHERE rn = 1),
        date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '18 hours',
        date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '19 hours',
        'Confirmed',
        NOW()
    FROM selected_court
    WHERE EXISTS (SELECT 1 FROM selected_players WHERE rn = 1)
      AND NOT EXISTS (
          SELECT 1
          FROM "Bookings" existing
          WHERE existing."CourtId" = selected_court.court_id
            AND existing."UserId" = (SELECT user_id FROM selected_players WHERE rn = 1)
            AND existing."StartTime" = date_trunc('day', NOW()) + INTERVAL '1 day' + INTERVAL '18 hours'
      )
    RETURNING "Id", "CourtId", "StartTime", "EndTime"
)
INSERT INTO "Matches" ("CourtId", "BookingId", "StartTime", "EndTime", "Status", "TeamAScore", "TeamBScore", "WinnerTeam")
SELECT
    ub."CourtId",
    ub."Id",
    ub."StartTime",
    ub."EndTime",
    'Scheduled',
    NULL,
    NULL,
    NULL
FROM upcoming_booking ub
WHERE NOT EXISTS (
    SELECT 1
    FROM "Matches" existing
    WHERE existing."BookingId" = ub."Id"
);

WITH selected_players AS (
    SELECT
        p."Id" AS player_id,
        ROW_NUMBER() OVER (ORDER BY p."Id") AS rn
    FROM "Players" p
    ORDER BY p."Id"
    LIMIT 4
)
UPDATE "Players" p
SET
    "TotalMatches" = 3,
    "Wins" = CASE WHEN sp.rn IN (1, 2) THEN 2 ELSE 1 END,
    "Losses" = CASE WHEN sp.rn IN (1, 2) THEN 1 ELSE 2 END,
    "EloRating" = CASE WHEN sp.rn IN (1, 2) THEN 1220 ELSE 1180 END,
    "SkillLevel" = CASE WHEN sp.rn IN (1, 2) THEN 'Intermediate' ELSE 'Beginner' END
FROM selected_players sp
WHERE p."Id" = sp.player_id;

SELECT 'Players' AS table_name, COUNT(*) AS count FROM "Players"
UNION ALL
SELECT 'Bookings' AS table_name, COUNT(*) AS count FROM "Bookings"
UNION ALL
SELECT 'Matches' AS table_name, COUNT(*) AS count FROM "Matches"
UNION ALL
SELECT 'MatchPlayers' AS table_name, COUNT(*) AS count FROM "MatchPlayers";
