# Padel Mates API Contract

Base URL:

```text
http://localhost:5180
```

Protected endpoints require this header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

# 1. Auth API

## Register

```http
POST /api/Auth/register
```

Requires token: No

Request:

```json
{
  "fullName": "Test Player",
  "email": "player@test.com",
  "password": "123456"
}
```

Response:

```json
{
  "token": "jwt_token_here",
  "userId": 1,
  "fullName": "Test Player",
  "email": "player@test.com",
  "role": "Player"
}
```

Notes:

- Creates a user account.
- Creates a linked player profile.
- Password is stored as a BCrypt hash.

---

## Login

```http
POST /api/Auth/login
```

Requires token: No

Request:

```json
{
  "email": "player@test.com",
  "password": "123456"
}
```

Response:

```json
{
  "token": "jwt_token_here",
  "userId": 1,
  "fullName": "Test Player",
  "email": "player@test.com",
  "role": "Player"
}
```

---

# 2. Players API

## Get all players

```http
GET /api/Players
```

Requires token: No

Response:

```json
[
  {
    "userId": 1,
    "playerId": 1,
    "fullName": "Test Player",
    "email": "player@test.com",
    "eloRating": 1200,
    "totalMatches": 0,
    "wins": 0,
    "losses": 0,
    "skillLevel": "Beginner"
  }
]
```

---

## Get player by ID

```http
GET /api/Players/{id}
```

Requires token: No

Example:

```http
GET /api/Players/1
```

Response:

```json
{
  "userId": 1,
  "playerId": 1,
  "fullName": "Test Player",
  "email": "player@test.com",
  "eloRating": 1200,
  "totalMatches": 0,
  "wins": 0,
  "losses": 0,
  "skillLevel": "Beginner"
}
```

---

## Get current logged-in player

```http
GET /api/Players/me
```

Requires token: Yes

Response:

```json
{
  "userId": 1,
  "playerId": 1,
  "fullName": "Test Player",
  "email": "player@test.com",
  "eloRating": 1200,
  "totalMatches": 0,
  "wins": 0,
  "losses": 0,
  "skillLevel": "Beginner"
}
```

---

# 3. Courts API

## Get all courts

```http
GET /api/Courts
```

Requires token: No

Response:

```json
[
  {
    "id": 1,
    "name": "Court 1",
    "location": "Main Branch",
    "isActive": true,
    "bookings": []
  }
]
```

---

## Get court by ID

```http
GET /api/Courts/{id}
```

Requires token: No

Example:

```http
GET /api/Courts/1
```

Response:

```json
{
  "id": 1,
  "name": "Court 1",
  "location": "Main Branch",
  "isActive": true,
  "bookings": []
}
```

---

## Create court

```http
POST /api/Courts
```

Requires token: Currently No  
Later: Admin only

Request:

```json
{
  "name": "Court 1",
  "location": "Main Branch"
}
```

Response:

```json
{
  "id": 1,
  "name": "Court 1",
  "location": "Main Branch",
  "isActive": true,
  "bookings": []
}
```

---

## Update court

```http
PUT /api/Courts/{id}
```

Requires token: Currently No  
Later: Admin only

Request:

```json
{
  "name": "Court 1 Updated",
  "location": "Main Branch - Outdoor",
  "isActive": true
}
```

Response:

```json
{
  "id": 1,
  "name": "Court 1 Updated",
  "location": "Main Branch - Outdoor",
  "isActive": true,
  "bookings": []
}
```

---

## Deactivate court

```http
DELETE /api/Courts/{id}
```

Requires token: Currently No  
Later: Admin only

Response:

```text
Court deactivated successfully.
```

Notes:

- This does not physically delete the court.
- It sets `isActive` to `false`.

---

# 4. Court Availability API

## Get court availability by date

```http
GET /api/Courts/{courtId}/availability?date=YYYY-MM-DD
```

Requires token: No

Example:

```http
GET /api/Courts/2/availability?date=2026-06-01
```

Response:

```json
[
  {
    "startTime": "2026-06-01T10:00:00Z",
    "endTime": "2026-06-01T11:00:00Z",
    "isAvailable": true
  },
  {
    "startTime": "2026-06-01T18:00:00Z",
    "endTime": "2026-06-01T19:00:00Z",
    "isAvailable": false
  }
]
```

Notes:

- Returns hourly blocks.
- Current working hours are 10:00 AM to 12:00 AM UTC.
- If a booking exists from 18:00 to 19:00, that slot returns `isAvailable: false`.
- Frontend should allow users to select continuous available blocks.

---

# 5. Bookings API

## Get all bookings

```http
GET /api/Bookings
```

Requires token: No

Response:

```json
[
  {
    "id": 1,
    "courtId": 2,
    "courtName": "Court 2",
    "userId": 3,
    "userFullName": "Test Player 2",
    "startTime": "2026-06-01T18:00:00Z",
    "endTime": "2026-06-01T19:00:00Z",
    "status": "Confirmed",
    "createdAt": "2026-05-18T12:00:00Z"
  }
]
```

---

## Get my bookings

```http
GET /api/Bookings/my
```

Requires token: Yes

Response:

```json
[
  {
    "id": 1,
    "courtId": 2,
    "courtName": "Court 2",
    "userId": 3,
    "userFullName": "Test Player 2",
    "startTime": "2026-06-01T18:00:00Z",
    "endTime": "2026-06-01T19:00:00Z",
    "status": "Confirmed",
    "createdAt": "2026-05-18T12:00:00Z"
  }
]
```

---

## Create booking

```http
POST /api/Bookings
```

Requires token: Yes

Request:

```json
{
  "courtId": 2,
  "startTime": "2026-06-01T18:00:00Z",
  "endTime": "2026-06-01T19:00:00Z"
}
```

Response:

```json
{
  "id": 1,
  "courtId": 2,
  "courtName": "Court 2",
  "userId": 3,
  "userFullName": "Test Player 2",
  "startTime": "2026-06-01T18:00:00Z",
  "endTime": "2026-06-01T19:00:00Z",
  "status": "Confirmed",
  "createdAt": "2026-05-18T12:00:00Z"
}
```

Validation rules:

- User must be logged in.
- Court must exist.
- Court must be active.
- End time must be after start time.
- Start and end times must be exactly on the hour.
- Duration must be whole hours only.
- Booking must not overlap another confirmed booking.

Allowed:

```json
{
  "courtId": 2,
  "startTime": "2026-06-01T18:00:00Z",
  "endTime": "2026-06-01T20:00:00Z"
}
```

Not allowed:

```json
{
  "courtId": 2,
  "startTime": "2026-06-01T18:30:00Z",
  "endTime": "2026-06-01T19:30:00Z"
}
```

---

## Cancel booking

```http
DELETE /api/Bookings/{id}
```

Requires token: Yes

Response:

```text
Booking cancelled successfully.
```

Notes:

- Only the user who created the booking can cancel it.
- This does not physically delete the row.
- It sets `status` to `Cancelled`.

---

# 6. Matches API

## Get all matches

```http
GET /api/Matches
```

Requires token: No

Response:

```json
[
  {
    "id": 1,
    "courtId": 2,
    "courtName": "Court 2",
    "bookingId": null,
    "startTime": "2026-06-03T18:00:00Z",
    "endTime": "2026-06-03T19:00:00Z",
    "status": "Scheduled",
    "teamAScore": null,
    "teamBScore": null,
    "winnerTeam": null,
    "players": [
      {
        "playerId": 1,
        "fullName": "Player One",
        "team": "A",
        "eloRating": 1200
      },
      {
        "playerId": 2,
        "fullName": "Player Two",
        "team": "A",
        "eloRating": 1200
      },
      {
        "playerId": 3,
        "fullName": "Player Three",
        "team": "B",
        "eloRating": 1200
      },
      {
        "playerId": 4,
        "fullName": "Player Four",
        "team": "B",
        "eloRating": 1200
      }
    ]
  }
]
```

---

## Get match by ID

```http
GET /api/Matches/{id}
```

Requires token: No

Example:

```http
GET /api/Matches/1
```

Response:

```json
{
  "id": 1,
  "courtId": 2,
  "courtName": "Court 2",
  "bookingId": null,
  "startTime": "2026-06-03T18:00:00Z",
  "endTime": "2026-06-03T19:00:00Z",
  "status": "Scheduled",
  "teamAScore": null,
  "teamBScore": null,
  "winnerTeam": null,
  "players": [
    {
      "playerId": 1,
      "fullName": "Player One",
      "team": "A",
      "eloRating": 1200
    },
    {
      "playerId": 2,
      "fullName": "Player Two",
      "team": "A",
      "eloRating": 1200
    },
    {
      "playerId": 3,
      "fullName": "Player Three",
      "team": "B",
      "eloRating": 1200
    },
    {
      "playerId": 4,
      "fullName": "Player Four",
      "team": "B",
      "eloRating": 1200
    }
  ]
}
```

---

## Create match

```http
POST /api/Matches
```

Requires token: Currently No  
Later: Player/Admin only

Request:

```json
{
  "courtId": 2,
  "bookingId": null,
  "startTime": "2026-06-03T18:00:00Z",
  "endTime": "2026-06-03T19:00:00Z",
  "teamAPlayerIds": [1, 2],
  "teamBPlayerIds": [3, 4]
}
```

Response:

```json
{
  "id": 1,
  "courtId": 2,
  "courtName": "Court 2",
  "bookingId": null,
  "startTime": "2026-06-03T18:00:00Z",
  "endTime": "2026-06-03T19:00:00Z",
  "status": "Scheduled",
  "teamAScore": null,
  "teamBScore": null,
  "winnerTeam": null,
  "players": [
    {
      "playerId": 1,
      "fullName": "Player One",
      "team": "A",
      "eloRating": 1200
    },
    {
      "playerId": 2,
      "fullName": "Player Two",
      "team": "A",
      "eloRating": 1200
    },
    {
      "playerId": 3,
      "fullName": "Player Three",
      "team": "B",
      "eloRating": 1200
    },
    {
      "playerId": 4,
      "fullName": "Player Four",
      "team": "B",
      "eloRating": 1200
    }
  ]
}
```

Validation rules:

- Team A must have exactly 2 players.
- Team B must have exactly 2 players.
- Match must have 4 different players.
- Court must exist.
- Court must be active.
- Match start/end must be on the hour.
- Match duration must be whole hours only.
- If `bookingId` is provided, match time must be within the booking time.

---

## Submit match result

```http
POST /api/Matches/{id}/result
```

Requires token: Currently No  
Later: Player/Admin only

Request:

```json
{
  "teamAScore": 6,
  "teamBScore": 4,
  "winnerTeam": "A"
}
```

Response:

```json
{
  "id": 1,
  "courtId": 2,
  "courtName": "Court 2",
  "bookingId": null,
  "startTime": "2026-06-03T18:00:00Z",
  "endTime": "2026-06-03T19:00:00Z",
  "status": "Completed",
  "teamAScore": 6,
  "teamBScore": 4,
  "winnerTeam": "A",
  "players": [
    {
      "playerId": 1,
      "fullName": "Player One",
      "team": "A",
      "eloRating": 1220
    },
    {
      "playerId": 2,
      "fullName": "Player Two",
      "team": "A",
      "eloRating": 1220
    },
    {
      "playerId": 3,
      "fullName": "Player Three",
      "team": "B",
      "eloRating": 1180
    },
    {
      "playerId": 4,
      "fullName": "Player Four",
      "team": "B",
      "eloRating": 1180
    }
  ]
}
```

Temporary rating logic:

- Winning players: +20 ELO.
- Losing players: -20 ELO.
- Winning players: wins +1.
- Losing players: losses +1.
- All players: total matches +1.

Later:

- This will be replaced by the real FastAPI ELO/ranking service.

Validation rules:

- Winner team must be `A` or `B`.
- Scores cannot be negative.
- Match cannot end in a draw.
- Winner score must be higher than loser score.
- Result cannot be submitted twice.

---

# 7. Time Format

All datetime values currently use ISO 8601 UTC format:

```text
YYYY-MM-DDTHH:mm:ssZ
```

Example:

```text
2026-06-01T18:00:00Z
```

Means:

```text
June 1, 2026 at 18:00 UTC
```

For frontend display, times can later be converted to Cairo local time.

---

# 8. Frontend Booking Logic

The frontend should display hourly blocks from the availability endpoint.

Example:

```text
10:00 - 11:00 Available
11:00 - 12:00 Available
12:00 - 13:00 Booked
```

The user may select one or more continuous available blocks.

Example selected blocks:

```text
11:00 - 12:00
12:00 - 13:00
```

Frontend should send one booking request:

```json
{
  "courtId": 2,
  "startTime": "2026-06-01T11:00:00Z",
  "endTime": "2026-06-01T13:00:00Z"
}
```

Do not send separate bookings for continuous selected blocks.
