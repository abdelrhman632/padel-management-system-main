import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import { apiFetch } from "./lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const G = {
  green: "#1D9E75", greenDark: "#0F6E56", greenDeep: "#085041", accent: "#04342C",
  greenLight: "#E1F5EE", greenMid: "#9FE1CB", amber: "#EF9F27", amberLight: "#FAEEDA",
  coral: "#D85A30", coralLight: "#FAECE7", surface: "#F4F7F4", card: "#FFFFFF",
  border: "rgba(29,158,117,0.13)", borderMed: "rgba(29,158,117,0.25)",
  text: "#0e1a0e", muted: "#4f5f4f", hint: "#8a9a8a",
};

const CAIRO_LOCATIONS = [
  "Maadi", "Zamalek", "New Cairo", "Heliopolis", "Nasr City",
  "6th of October", "Sheikh Zayed", "Dokki", "Mohandessin", "Rehab City",
];

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const styles = {
  card:     { background: G.card, border: `0.5px solid ${G.border}`, borderRadius: 14, padding: "20px" },
  btn:      { background: G.green, color: "white", border: "none", padding: "10px 20px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  btnGhost: { background: "transparent", color: G.accent, border: `0.5px solid ${G.borderMed}`, padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: "inherit" },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Badge({ children, color = "green" }) {
  const colors = {
    green: { bg: G.greenLight, text: G.greenDark },
    amber: { bg: G.amberLight, text: "#633806" },
    coral: { bg: G.coralLight, text: "#4A1B0C" },
    gray:  { bg: "#f0f0ee",    text: G.muted },
  };
  const c = colors[color] ?? colors.green;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 100, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Avatar({ initials, size = 36, isYou = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: isYou ? G.green : G.greenLight, color: isYou ? "white" : G.greenDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 600, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function StatCard({ label, value, sub, color = G.green }) {
  return (
    <div style={{ ...styles.card, textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "Georgia, serif", letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: G.muted, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: G.hint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: G.accent, letterSpacing: -0.5, margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: G.muted, margin: "4px 0 0", fontWeight: 300 }}>{sub}</p>}
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatShortDate(value) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatShortDateTime(value) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
function formatTime(value) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
}
function formatTimeLabel(value) {
  return formatTime(value);
}
function formatTimeRange(start, end) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}
function overlapsTimeRange(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}
function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function getPlayerEntry(match, playerId) {
  return (match?.players ?? []).find((p) => p.playerId === playerId) ?? null;
}
function buildMatchSummary(match, playerId) {
  const entry = getPlayerEntry(match, playerId);
  if (!entry || match.status !== "Completed") return null;
  const teammates = (match.players ?? []).filter((p) => p.team === entry.team && p.playerId !== playerId);
  const opponents = (match.players ?? []).filter((p) => p.team !== entry.team);
  const eloChange = (entry.eloAfterMatch ?? entry.eloRating) - (entry.eloBeforeMatch ?? entry.eloRating);
  const didWin = match.winnerTeam === entry.team;
  return {
    id: match.id,
    date: formatShortDate(match.startTime),
    partner: teammates.map((p) => p.fullName).join(" & ") || "Solo",
    opponent: opponents.map((p) => p.fullName).join(" & ") || "Unknown",
    score: typeof match.teamAScore === "number" && typeof match.teamBScore === "number"
      ? `${match.teamAScore}-${match.teamBScore}` : "Score pending",
    result: didWin ? "W" : "L",
    eloChange: `${eloChange >= 0 ? "+" : ""}${eloChange}`,
    eloAfterMatch: entry.eloAfterMatch ?? entry.eloRating,
  };
}
function buildMonthlyResults(matches, playerId) {
  const map = new Map();
  matches.forEach((match) => {
    const s = buildMatchSummary(match, playerId);
    if (!s) return;
    const month = new Date(match.startTime).toLocaleDateString("en-US", { month: "short" });
    const cur = map.get(month) ?? { month, wins: 0, losses: 0 };
    s.result === "W" ? cur.wins++ : cur.losses++;
    map.set(month, cur);
  });
  return Array.from(map.values());
}
function bestPartnerName(name) {
  if (!name || name === "—") return "—";
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : name;
}

// ─── LOCAL STORAGE HELPERS for questionnaire data ────────────────────────────
const RADAR_KEY = "padel_skill_radar";
const POSTGAME_KEY = "padel_postgame_responses";
const DISMISSED_POSTGAME_KEY = "dismissedPostGameReviews";

function scopedStorageKey(baseKey, playerId) {
  return playerId ? `${baseKey}_player_${playerId}` : `${baseKey}_unknown`;
}
function saveRadarData(data, playerId) {
  try { localStorage.setItem(scopedStorageKey(RADAR_KEY, playerId), JSON.stringify(data)); } catch (_) {}
}
function loadRadarData(playerId) {
  try { const d = localStorage.getItem(scopedStorageKey(RADAR_KEY, playerId)); return d ? JSON.parse(d) : null; } catch (_) { return null; }
}
function savePostgameResponses(responses, playerId) {
  try { localStorage.setItem(scopedStorageKey(POSTGAME_KEY, playerId), JSON.stringify(responses)); } catch (_) {}
}
function loadPostgameResponses(playerId) {
  try { const d = localStorage.getItem(scopedStorageKey(POSTGAME_KEY, playerId)); return d ? JSON.parse(d) : []; } catch (_) { return []; }
}
function loadDismissedPostgameReviews(playerId) {
  try { const d = localStorage.getItem(scopedStorageKey(DISMISSED_POSTGAME_KEY, playerId)); return d ? JSON.parse(d) : []; } catch (_) { return []; }
}
function saveDismissedPostgameReviews(matchIds, playerId) {
  try { localStorage.setItem(scopedStorageKey(DISMISSED_POSTGAME_KEY, playerId), JSON.stringify(matchIds)); } catch (_) {}
}
function markPostgameReviewDismissed(matchId, playerId) {
  if (!matchId) return;
  const key = String(matchId);
  const dismissed = loadDismissedPostgameReviews(playerId).map(String);
  if (!dismissed.includes(key)) saveDismissedPostgameReviews([...dismissed, key], playerId);
}
function getReviewedOrDismissedPostgameIds(playerId) {
  const reviewed = loadPostgameResponses(playerId).map((r) => String(r.matchId));
  const dismissed = loadDismissedPostgameReviews(playerId).map(String);
  return new Set([...reviewed, ...dismissed]);
}

// ─── POST-GAME QUESTIONNAIRE MODAL ────────────────────────────────────────────
const RADAR_SKILLS = [
  { key: "serve",       label: "Serve Power",      question: "How was your serve today?",             options: ["Struggled", "Inconsistent", "Solid", "Dominant"] },
  { key: "volley",      label: "Net / Volley",      question: "How were your volleys & net play?",     options: ["Struggled", "Inconsistent", "Solid", "Dominant"] },
  { key: "consistency", label: "Consistency",       question: "How consistent was your shot-making?",  options: ["Many errors", "Some errors", "Mostly clean", "Very clean"] },
  { key: "movement",    label: "Court Movement",    question: "How was your footwork & positioning?",  options: ["Slow/wrong pos.", "Average", "Good", "Excellent"] },
  { key: "strategy",    label: "Game Strategy",     question: "How tactical was your play?",           options: ["No plan", "Reactive", "Some tactics", "Strategic"] },
  { key: "mental",      label: "Mental Focus",      question: "How focused & composed were you?",      options: ["Tilted often", "Lost focus", "Mostly focused", "Locked in"] },
];

function PostGameModal({ matchId, playerId, onClose, onSave }) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving]   = useState(false);

  const current = RADAR_SKILLS[step];
  const isLast  = step === RADAR_SKILLS.length - 1;

  const handleSave = (finalAnswers) => {
    setSaving(true);
    try {
      const radar = RADAR_SKILLS.map((s) => {
        const idx = s.options.indexOf(finalAnswers[s.key]);
        const score = idx >= 0 ? Math.round(((idx + 1) / 4) * 100) : 50;
        return { skill: s.label, you: score, avg: 55 };
      });

      const existing = loadRadarData(playerId);
      let merged = radar;
      if (existing && existing.length === radar.length) {
        merged = radar.map((r, i) => ({ ...r, you: Math.round(r.you * 0.4 + existing[i].you * 0.6) }));
      }

      saveRadarData(merged, playerId);

      const responses = loadPostgameResponses(playerId);
      responses.push({ matchId, date: new Date().toISOString(), answers: finalAnswers });
      savePostgameResponses(responses, playerId);

      onSave?.(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const pick = (value) => {
    const next = { ...answers, [current.key]: value };
    setAnswers(next);
    if (!isLast) setStep(step + 1);
    else handleSave(next);
  };

  const optionColors = ["#f0f0ee", G.amberLight, G.greenLight, G.greenLight];
  const optionText   = [G.muted, "#633806", G.greenDark, G.greenDark];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,52,44,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: G.card, borderRadius: 18, padding: "32px 28px", width: 420, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(4,52,44,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: G.green, textTransform: "uppercase", letterSpacing: 0.8 }}>Post-Game Review</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: G.hint, fontSize: 18, fontFamily: "inherit", padding: 0 }}>✕</button>
        </div>

        <div style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, color: G.accent, marginBottom: 6 }}>How did you play?</div>
        <div style={{ fontSize: 12, color: G.muted, marginBottom: 20 }}>This builds your Skills Radar in Analytics</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {RADAR_SKILLS.map((_, i) => (
            <div key={i} style={{ height: 4, flex: 1, borderRadius: 4, background: i < step ? G.green : i === step ? G.greenMid : G.border }} />
          ))}
        </div>

        <div style={{ background: G.greenLight, borderRadius: 8, padding: "6px 12px", display: "inline-block", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: G.greenDark }}>{current.label}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: G.accent, marginBottom: 18 }}>{current.question}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {current.options.map((opt, i) => (
            <button
              key={opt}
              onClick={() => !saving && pick(opt)}
              style={{
                padding: "11px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                textAlign: "left", cursor: saving ? "wait" : "pointer",
                fontFamily: "inherit", border: `0.5px solid ${i >= 2 ? G.borderMed : G.border}`,
                background: optionColors[i], color: optionText[i],
                transition: "all 0.15s", opacity: saving ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = G.green; e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = optionColors[i]; e.currentTarget.style.color = optionText[i]; }}
            >
              {opt}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: G.hint, textAlign: "center" }}>
          {step + 1} of {RADAR_SKILLS.length} · {isLast ? "Last question" : "Click an option to continue"}
        </div>
      </div>
    </div>
  );
}

function RecordMatchModal({ onClose, onRecorded }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [courts, setCourts] = useState([]);
  const [players, setPlayers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);

  const [courtId, setCourtId] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [teamAScore, setTeamAScore] = useState(6);
  const [teamBScore, setTeamBScore] = useState(4);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [courtsResp, playersResp, meResp, bookingsResp, matchesResp] = await Promise.all([
          apiFetch("/courts"),
          apiFetch("/players"),
          apiFetch("/players/me"),
          apiFetch("/bookings/my"),
          apiFetch("/matches"),
        ]);
        if (!mounted) return;
        const activeCourts = (courtsResp || []).filter((c) => c.isActive !== false);
        const now = new Date();
        const bookingsList = (bookingsResp || []).slice();
        const bookingsWithMatch = new Set((matchesResp || [])
          .filter((m) => m.bookingId && m.status !== "Cancelled")
          .map((m) => String(m.bookingId)));

        const confirmedBookings = bookingsList
          .filter((b) => b.status === "Confirmed" && new Date(b.startTime) > now && new Date(b.endTime) > now && !bookingsWithMatch.has(String(b.id)))
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const meId = meResp?.playerId ?? null;
        setCourts(activeCourts);
        setPlayers(playersResp || []);
        setBookings(confirmedBookings);
        setCurrentPlayerId(meId);
        const firstBooking = confirmedBookings[0] ?? null;
        setSelectedBookingId(firstBooking?.id ? String(firstBooking.id) : "");
        setCourtId(firstBooking?.courtId ? String(firstBooking.courtId) : activeCourts[0]?.id ? String(activeCourts[0].id) : "");
        if (meId && (playersResp || []).some((p) => p.playerId === meId)) {
          setA1(String(meId));
        }
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load match form data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const selectedPlayerIds = [a1, a2, b1, b2].filter(Boolean);
  const selectOpts = (currentValue) => [
    { value: "", label: "Select player..." },
    ...players
      .filter((p) => {
        const value = String(p.playerId);
        return value === currentValue || !selectedPlayerIds.includes(value);
      })
      .map((p) => ({ value: String(p.playerId), label: `${p.fullName} (ELO ${p.eloRating})` })),
  ];
  const selectedBooking = bookings.find((b) => String(b.id) === selectedBookingId) ?? null;
  const handleBookingChange = (bookingId) => {
    setSelectedBookingId(bookingId);
    const booking = bookings.find((b) => String(b.id) === bookingId);
    if (booking) setCourtId(String(booking.courtId));
  };

  const submit = async () => {
    setError("");
    const ids = [a1, a2, b1, b2].filter(Boolean);
    if (!courtId || ids.length !== 4) {
      setError("Pick 4 different players and a court.");
      return;
    }
    if (new Set(ids).size !== 4) {
      setError("Each player can only be selected once. Pick 4 different players.");
      return;
    }
    if (currentPlayerId && !ids.includes(String(currentPlayerId))) {
      setError("Include yourself in the match so your stats and ELO update after submission.");
      return;
    }
    if (Number(teamAScore) === Number(teamBScore)) {
      setError("Scores cannot be a draw.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const manualStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));
      const manualEnd = new Date(manualStart.getTime() + 60 * 60 * 1000);
      const matchCourtId = selectedBooking ? selectedBooking.courtId : Number(courtId);
      const matchBookingId = selectedBooking ? selectedBooking.id : null;
      const matchStartTime = selectedBooking ? selectedBooking.startTime : manualStart.toISOString();
      const matchEndTime = selectedBooking ? selectedBooking.endTime : manualEnd.toISOString();

      const match = await apiFetch("/matches", {
        method: "POST",
        body: JSON.stringify({
          courtId: Number(matchCourtId),
          bookingId: matchBookingId,
          startTime: matchStartTime,
          endTime: matchEndTime,
          teamAPlayerIds: [Number(a1), Number(a2)],
          teamBPlayerIds: [Number(b1), Number(b2)],
        }),
      });

      const winnerTeam = Number(teamAScore) > Number(teamBScore) ? "A" : "B";
      await apiFetch(`/matches/${match.id}/result`, {
        method: "POST",
        body: JSON.stringify({
          teamAScore: Number(teamAScore),
          teamBScore: Number(teamBScore),
          winnerTeam,
        }),
      });

      window.dispatchEvent(new CustomEvent("match-recorded"));
      window.dispatchEvent(new CustomEvent("booking-updated"));
      onRecorded?.();
    } catch (err) {
      setError(err.message || "Failed to record match");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,52,44,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: G.card, borderRadius: 18, padding: "28px 24px", width: 520, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(4,52,44,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: G.green, textTransform: "uppercase", letterSpacing: 0.8 }}>Record Match</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: G.hint, fontSize: 18, fontFamily: "inherit", padding: 0 }}>✕</button>
        </div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, color: G.accent, marginBottom: 14 }}>Add a completed match</div>

        {loading ? (
          <div style={{ color: G.muted, fontSize: 13 }}>Loading...</div>
        ) : (
          <>
            {error && <div style={{ background: G.coralLight, border: `0.5px solid ${G.coral}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: G.coral, marginBottom: 12 }}>{error}</div>}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: G.hint, marginBottom: 6 }}>Booking</div>
              <select value={selectedBookingId} onChange={(e) => handleBookingChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${G.borderMed}`, fontFamily: "inherit", fontSize: 13 }}>
                {bookings.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.courtName || `Court ${b.courtId}`} - {formatShortDateTime(b.startTime)} to {formatTimeLabel(b.endTime)}
                  </option>
                ))}
                <option value="">Manual court/time fallback</option>
              </select>
              {selectedBooking && (
                <div style={{ fontSize: 11, color: G.hint, marginTop: 6 }}>Match will use this booking's court and time.</div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: G.hint, marginBottom: 6 }}>Court</div>
                <select value={courtId} onChange={(e) => setCourtId(e.target.value)} disabled={!!selectedBooking} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${G.borderMed}`, fontFamily: "inherit", fontSize: 13, opacity: selectedBooking ? 0.72 : 1 }}>
                  {courts.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name} · {c.location}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: G.hint, marginBottom: 6 }}>Score</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" min="0" value={teamAScore} onChange={(e) => setTeamAScore(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${G.borderMed}`, fontFamily: "inherit", fontSize: 13 }} />
                  <input type="number" min="0" value={teamBScore} onChange={(e) => setTeamBScore(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${G.borderMed}`, fontFamily: "inherit", fontSize: 13 }} />
                </div>
                <div style={{ fontSize: 11, color: G.hint, marginTop: 6 }}>Team A / Team B</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: G.surface, borderRadius: 14, padding: "14px 12px", border: `0.5px solid ${G.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.accent, marginBottom: 10 }}>Team A</div>
                <select value={a1} onChange={(e) => setA1(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${G.borderMed}`, fontFamily: "inherit", fontSize: 13, marginBottom: 8 }}>
                  {selectOpts(a1).map((o) => <option key={`a1-${o.value}`} value={o.value}>{o.label}</option>)}
                </select>
                <select value={a2} onChange={(e) => setA2(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${G.borderMed}`, fontFamily: "inherit", fontSize: 13 }}>
                  {selectOpts(a2).map((o) => <option key={`a2-${o.value}`} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ background: G.surface, borderRadius: 14, padding: "14px 12px", border: `0.5px solid ${G.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.accent, marginBottom: 10 }}>Team B</div>
                <select value={b1} onChange={(e) => setB1(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${G.borderMed}`, fontFamily: "inherit", fontSize: 13, marginBottom: 8 }}>
                  {selectOpts(b1).map((o) => <option key={`b1-${o.value}`} value={o.value}>{o.label}</option>)}
                </select>
                <select value={b2} onChange={(e) => setB2(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `0.5px solid ${G.borderMed}`, fontFamily: "inherit", fontSize: 13 }}>
                  {selectOpts(b2).map((o) => <option key={`b2-${o.value}`} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={onClose} style={{ ...styles.btnGhost, flex: 1 }}>Cancel</button>
              <button onClick={submit} disabled={saving} style={{ ...styles.btn, flex: 1, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Record Match →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const nav = useNavigate();
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  const features = [
    { icon: "🏟️", title: "Smart Court Booking",  desc: "Real-time availability, digital reservations, and zero WhatsApp back-and-forth." },
    { icon: "🤝", title: "AI Matchmaking",        desc: "Groups players into balanced 2v2 matches using skill ratings and availability." },
    { icon: "🏆", title: "ELO Rankings",          desc: "Dynamic post-match recalculation. Beat stronger players, climb faster." },
    { icon: "📊", title: "Performance Analytics", desc: "Win rates, score trends, head-to-head breakdowns, and full match history." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: G.surface, overflowY: "auto", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 32px 60px", opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(20px)", transition: "opacity 0.6s ease, transform 0.6s ease", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: G.greenLight, color: G.greenDark, fontSize: 11, fontWeight: 500, padding: "5px 14px", borderRadius: 100, marginBottom: 28, border: `0.5px solid ${G.borderMed}`, letterSpacing: 0.5, textTransform: "uppercase" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: G.green, display: "inline-block" }} />
          Padel Mates Sports Platform
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 56, fontWeight: 700, color: G.accent, letterSpacing: -2, lineHeight: 1.05, margin: "0 0 20px" }}>
          Padel Mates
        </h1>
        <p style={{ fontSize: 17, color: G.muted, lineHeight: 1.7, maxWidth: 540, margin: "0 auto 36px", fontWeight: 300 }}>
          The all-in-one platform for serious padel players — smart court booking, AI matchmaking, and real-time performance analytics.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => nav("/signin")} style={{ ...styles.btn, padding: "14px 32px", fontSize: 15, boxShadow: `0 6px 24px rgba(29,158,117,0.3)` }}>Sign in →</button>
          <button onClick={() => nav("/signup")} style={{ ...styles.btnGhost, padding: "14px 32px", fontSize: 15 }}>Create account</button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto 60px", padding: "0 32px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { icon: "🎯", label: "Matchmaking found", value: "3 balanced opponents near you", stat: "ELO ±12", statColor: "green" },
          { icon: "📈", label: "Platform win rate",  value: "71% — up 13% this month",      stat: "+13%",   statColor: "green" },
          { icon: "👥", label: "Active players",     value: "1,240+ on Padel Mates",        stat: "Growing", statColor: "amber" },
        ].map((c, i) => (
          <div key={i} style={{ ...styles.card, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 20 }}>{c.icon}</div>
            <div style={{ fontSize: 11, color: G.hint }}>{c.label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: G.accent }}>{c.value}</div>
            <Badge color={c.statColor}>{c.stat}</Badge>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto 80px", padding: "0 32px" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, color: G.accent, textAlign: "center", marginBottom: 8 }}>Everything your club needs</h2>
        <p style={{ color: G.muted, textAlign: "center", fontSize: 14, marginBottom: 28, fontWeight: 300 }}>Five core modules. One smart platform.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} style={{ ...styles.card }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, color: G.accent, marginBottom: 6, fontSize: 14 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto 80px", padding: "0 32px" }}>
        <div style={{ background: G.accent, borderRadius: 18, padding: "40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "white", marginBottom: 6 }}>Ready to dominate the court?</div>
            <div style={{ fontSize: 13, color: G.greenMid, fontWeight: 300 }}>Join 1,240+ players already on Padel Mates</div>
          </div>
          <button onClick={() => nav("/signup")} style={{ background: G.green, color: "white", border: "none", padding: "13px 28px", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Create account →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ user }) {
  const firstName = user?.fullName?.split(" ")[0] || "Player";
  const [playerData,    setPlayerData]    = useState(null);
  const [nextBooking,   setNextBooking]   = useState(null);
  const [chartData,     setChartData]     = useState({ eloHistory: [], winData: [], recentMatches: [] });
  const [userRanking,   setUserRanking]   = useState("—");
  const [totalPlayers,  setTotalPlayers]  = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [pendingMatchId,    setPendingMatchId]    = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [playerResp, matchesResp, playersResp, bookingsResp] = await Promise.all([
        apiFetch("/players/me"),
        apiFetch("/matches"),
        apiFetch("/players"),
        apiFetch("/bookings/my"),
      ]);

      const matches = matchesResp || [];
      const completedMatches = matches
        .filter((m) => m.status === "Completed" && getPlayerEntry(m, playerResp.playerId))
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      const eloHistoryPoints = completedMatches.slice(-12).map((m, i) => {
        const entry = getPlayerEntry(m, playerResp.playerId);
        return { match: `M${i + 1}`, date: formatShortDate(m.startTime), elo: entry?.eloAfterMatch ?? entry?.eloRating ?? playerResp.eloRating };
      });

      const recentMatches = completedMatches.slice(-4).reverse()
        .map((m) => buildMatchSummary(m, playerResp.playerId))
        .filter(Boolean);

      const sortedPlayers = (playersResp || []).slice().sort((a, b) => b.eloRating - a.eloRating);
      const rank = sortedPlayers.findIndex((p) => p.playerId === playerResp.playerId) + 1;

      // Exclude bookings that already have an associated non-cancelled match
      const bookingsList = bookingsResp || [];
      const bookingsWithMatch = new Set((matches || [])
        .filter((m) => m.bookingId && m.status !== "Cancelled")
        .map((m) => String(m.bookingId)));

      const upcoming = bookingsList
        .filter((b) => b.status === "Confirmed" && new Date(b.startTime) > new Date() && !bookingsWithMatch.has(String(b.id)))
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

      const relatedMatch = upcoming
        ? matches.find((m) => m.bookingId === upcoming.id && m.status !== "Cancelled")
        : null;

      setPlayerData(playerResp);
      setTotalPlayers(sortedPlayers.length);
      setUserRanking(rank > 0 ? rank : "—");
      setChartData({
        eloHistory:    eloHistoryPoints.length > 0 ? eloHistoryPoints : [{ match: "Start", elo: playerResp.eloRating }],
        winData:       buildMonthlyResults(completedMatches, playerResp.playerId),
        recentMatches,
      });

      // Check for newly completed matches that were not reviewed or dismissed.
      const reviewedOrDismissed = getReviewedOrDismissedPostgameIds(playerResp.playerId);
      const unreviewed = completedMatches.filter((m) => !reviewedOrDismissed.has(String(m.id)));
      if (unreviewed.length > 0) {
        setPendingMatchId(unreviewed[unreviewed.length - 1].id);
        setShowQuestionnaire(true);
      } else {
        setPendingMatchId(null);
        setShowQuestionnaire(false);
      }

      setNextBooking(upcoming ? {
        id:       upcoming.id,
        court:    upcoming.courtName || `Court ${upcoming.courtId}`,
        location: upcoming.courtLocation || "",
        dateTime: formatShortDateTime(upcoming.startTime),
        time:     formatTimeLabel(upcoming.startTime),
        vs:       relatedMatch ? `Scheduled match on ${relatedMatch.courtName || upcoming.courtName}` : "Court reservation confirmed",
      } : null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    window.addEventListener("booking-created", fetchData);
    window.addEventListener("booking-cancelled", fetchData);
    window.addEventListener("booking-updated", fetchData);
    window.addEventListener("match-recorded", fetchData);
    return () => {
      window.removeEventListener("booking-created", fetchData);
      window.removeEventListener("booking-cancelled", fetchData);
      window.removeEventListener("booking-updated", fetchData);
      window.removeEventListener("match-recorded", fetchData);
    };
  }, [fetchData]);

  if (loading) return <div style={{ padding: "28px 32px", color: G.muted }}>Loading dashboard...</div>;

  const hasPlayed = (playerData?.totalMatches ?? 0) > 0;
  const winRate = hasPlayed ? Math.round((playerData.wins / playerData.totalMatches) * 100) : 0;
  const eloDisplay = hasPlayed ? (playerData?.eloRating?.toLocaleString() || "—") : "Unrated";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      {showQuestionnaire && pendingMatchId && (
          <PostGameModal
          matchId={pendingMatchId}
          playerId={playerData?.playerId}
          onClose={() => {
            markPostgameReviewDismissed(pendingMatchId, playerData?.playerId);
            setShowQuestionnaire(false);
            setPendingMatchId(null);
          }}
          onSave={() => {
            markPostgameReviewDismissed(pendingMatchId, playerData?.playerId);
            setShowQuestionnaire(false);
            setPendingMatchId(null);
            window.dispatchEvent(new CustomEvent("radar-updated"));
          }}
        />
      )}

      <SectionTitle title={`Welcome back, ${firstName} 👋`} sub="Here's your performance snapshot" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Current ELO" value={eloDisplay} sub={hasPlayed ? `Skill: ${playerData?.skillLevel || "—"}` : "Play a match to get rated"} />
        <StatCard label="Win Rate"     value={`${winRate}%`}                      sub={`${playerData?.wins ?? 0}W · ${playerData?.losses ?? 0}L`} color={G.green} />
        <StatCard label="Ranking"      value={`#${userRanking}`}                  sub={`of ${totalPlayers} players`} color={G.amber} />
        <StatCard label="Matches"      value={playerData?.totalMatches ?? 0}      sub="all time" color={G.greenDark} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={styles.card}>
          <div style={{ fontWeight: 600, color: G.accent, fontSize: 14, marginBottom: 16 }}>ELO Progression</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData.eloHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
              <XAxis dataKey="match" tick={{ fontSize: 11, fill: G.hint }} />
              <YAxis tick={{ fontSize: 11, fill: G.hint }} />
              <Tooltip contentStyle={{ background: G.card, border: `0.5px solid ${G.border}`, borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="elo" stroke={G.green} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: G.green }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.card}>
          <div style={{ fontWeight: 600, color: G.accent, fontSize: 14, marginBottom: 14 }}>Recent Matches</div>
          {chartData.recentMatches.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {chartData.recentMatches.slice(0, 4).map((m, i) => (
                <div key={m.id ?? i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.result === "W" ? G.greenLight : G.coralLight, color: m.result === "W" ? G.greenDark : G.coral, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{m.result}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: G.accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>vs {m.opponent}</div>
                    <div style={{ fontSize: 11, color: G.hint }}>{m.date} · {m.score}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: m.result === "W" ? G.green : G.coral, flexShrink: 0 }}>{m.eloChange}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: G.muted, fontSize: 13 }}>No completed matches yet</div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={styles.card}>
          <div style={{ fontWeight: 600, color: G.accent, fontSize: 14, marginBottom: 16 }}>Monthly Results</div>
          {chartData.winData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData.winData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke={G.border} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: G.hint }} />
                <YAxis tick={{ fontSize: 11, fill: G.hint }} />
                <Tooltip contentStyle={{ background: G.card, border: `0.5px solid ${G.border}`, borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="wins"   fill={G.green}      radius={[4,4,0,0]} name="Wins" />
                <Bar dataKey="losses" fill={G.coralLight}  radius={[4,4,0,0]} name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: G.muted, fontSize: 13 }}>Monthly results will appear after your first completed match.</div>
          )}
        </div>

        {/* ── Next Booking card — shows court from Booking page ── */}
        <div style={styles.card}>
          <div style={{ fontWeight: 600, color: G.accent, fontSize: 14, marginBottom: 14 }}>Next Booking</div>
          {nextBooking ? (
            <>
              <div style={{ background: G.accent, borderRadius: 12, padding: "18px 20px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: G.greenMid, marginBottom: 4 }}>UPCOMING</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "white", marginBottom: 2 }}>{nextBooking.court} · {nextBooking.time}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginBottom: 2 }}>{nextBooking.dateTime}</div>
                {nextBooking.location && (
                  <div style={{ fontSize: 11, color: G.greenMid, marginBottom: 2 }}>📍 {nextBooking.location}</div>
                )}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{nextBooking.vs}</div>
              </div>
            </>
          ) : (
            <div style={{ color: G.muted, fontSize: 13 }}>
              No upcoming bookings.{" "}
              <button onClick={() => window.dispatchEvent(new CustomEvent("padel:navigate-booking"))} style={{ background: "none", border: "none", color: G.green, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}>
                Book a court →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING PAGE ─────────────────────────────────────────────────────────────
function BookingPage() {
  const today = getTodayInputValue();

  const [step,             setStep]             = useState("location");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDate,     setSelectedDate]     = useState(today);

  const [allCourts,      setAllCourts]      = useState([]);
  const [locationCourts, setLocationCourts] = useState([]);
  const [availability,   setAvailability]   = useState({});
  const [myBookings,     setMyBookings]     = useState([]);
  const [selected,       setSelected]       = useState({});

  const [loadingCourts,  setLoadingCourts]  = useState(true);
  const [loadingSlots,   setLoadingSlots]   = useState(false);
  const [creating,       setCreating]       = useState(false);
  const [successMsg,     setSuccessMsg]     = useState("");

  const dbLocations   = [...new Set(allCourts.map((c) => c.location).filter(Boolean))];
  const allLocations  = [...new Set([...CAIRO_LOCATIONS, ...dbLocations])];

  // ── Load all courts ───────────────────────────────────────────────────────
  const loadAllCourts = useCallback(async () => {
    setLoadingCourts(true);
    try {
      const resp = await apiFetch("/courts");
      setAllCourts(resp || []);
    } catch (err) {
      console.error("Courts fetch error:", err);
    } finally {
      setLoadingCourts(false);
    }
  }, []);

  useEffect(() => { loadAllCourts(); }, [loadAllCourts]);

  // ── Load slots for a location + date ──────────────────────────────────────
  const loadSlots = useCallback(async (location, date, courts) => {
    const filtered = courts.filter((c) => c.location === location && c.isActive !== false);
    setLocationCourts(filtered);
    if (filtered.length === 0) { setAvailability({}); setMyBookings([]); setSelected({}); return; }

    setLoadingSlots(true);
    try {
      const [avResults, myBk] = await Promise.all([
        Promise.all(
          filtered.map(async (court) => {
            const slotsResp = await apiFetch(`/courts/${court.id}/availability?date=${date}`);
            return { courtId: court.id, slots: slotsResp || [] };
          })
        ),
        apiFetch("/bookings/my"),
      ]);

      const avMap = {};
      avResults.forEach(({ courtId, slots }) => {
        avMap[courtId] = slots.map((s) => ({
          slot: formatTimeLabel(s.startTime),
          rawStart: s.startTime,
          rawEnd: s.endTime,
          isAvailable: s.isAvailable && new Date(s.startTime) >= new Date(),
        }));
      });
      setAvailability(avMap);
      setMyBookings(myBk || []);
      setSelected((prev) => {
        const next = {};
        Object.entries(prev).forEach(([courtId, slotSet]) => {
          const stillAvailable = new Set(
            (avMap[courtId] || [])
              .filter((s) => s.isAvailable && slotSet?.has(s.slot))
              .map((s) => s.slot)
          );
          if (stillAvailable.size > 0) next[courtId] = stillAvailable;
        });
        return next;
      });
    } catch (err) {
      console.error("Availability error:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedLocation || allCourts.length === 0) return;
    const reload = () => loadSlots(selectedLocation, selectedDate, allCourts);
    window.addEventListener("booking-created", reload);
    window.addEventListener("booking-cancelled", reload);
    window.addEventListener("booking-updated", reload);
    window.addEventListener("match-recorded", reload);
    return () => {
      window.removeEventListener("booking-created", reload);
      window.removeEventListener("booking-cancelled", reload);
      window.removeEventListener("booking-updated", reload);
      window.removeEventListener("match-recorded", reload);
    };
  }, [selectedLocation, selectedDate, allCourts, loadSlots]);

  const handleLocationSelect = (loc) => {
    setSelectedLocation(loc);
    setSelected({});
    setStep("slots");
    loadSlots(loc, selectedDate, allCourts);
  };

  const handleDateChange = (date) => {
    const safeDate = date < today ? today : date;
    setSelectedDate(safeDate);
    setSelected({});
    if (selectedLocation) loadSlots(selectedLocation, safeDate, allCourts);
  };

  // ── Toggle slot ───────────────────────────────────────────────────────────
  const toggleSlot = (courtId, slot) => {
    setSelected((prev) => {
      const cur = new Set(prev[courtId] || []);
      cur.has(slot) ? cur.delete(slot) : cur.add(slot);
      return { ...prev, [courtId]: cur };
    });
  };

  // ── Confirm bookings ──────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setCreating(true);
    setSuccessMsg("");
    try {
      for (const [courtIdStr, slotSet] of Object.entries(selected)) {
        if (!slotSet || slotSet.size === 0) continue;
        const courtId   = Number(courtIdStr);
        const courtSlots = availability[courtId] || [];
        const sortedSelected = courtSlots
          .filter((s) => slotSet.has(s.slot))
          .sort((a, b) => new Date(a.rawStart) - new Date(b.rawStart));
        if (sortedSelected.length === 0) continue;

        const groups = [];
        let groupStart = sortedSelected[0], groupEnd = sortedSelected[0];
        for (let i = 1; i < sortedSelected.length; i++) {
          const prevEnd  = new Date(groupEnd.rawStart).getTime() + 3600000;
          const curStart = new Date(sortedSelected[i].rawStart).getTime();
          if (curStart === prevEnd) { groupEnd = sortedSelected[i]; }
          else { groups.push({ start: groupStart, end: groupEnd }); groupStart = sortedSelected[i]; groupEnd = sortedSelected[i]; }
        }
        groups.push({ start: groupStart, end: groupEnd });

        for (const g of groups) {
          const startTime = g.start.rawStart;
          const endTime   = new Date(new Date(g.end.rawStart).getTime() + 3600000).toISOString();
          await apiFetch("/bookings", {
            method: "POST",
            body: JSON.stringify({ courtId, startTime, endTime }),
          });
        }
      }
      setSelected({});
      setSuccessMsg("✓ Booking confirmed! Check your dashboard.");
      await loadSlots(selectedLocation, selectedDate, allCourts);
      window.dispatchEvent(new CustomEvent("booking-created"));
    } catch (err) {
      alert(err.message || "Failed to create booking");
    } finally {
      setCreating(false);
    }
  };

  const totalSelected = Object.values(selected).reduce((acc, s) => acc + (s?.size || 0), 0);
  const locationCourtIds = new Set(locationCourts.map((c) => c.id));
  const myUpcomingHere   = myBookings.filter(
    (b) => b.status === "Confirmed" && locationCourtIds.has(b.courtId) && new Date(b.startTime) > new Date()
  );

  // ── Render: Step 1 — choose location ─────────────────────────────────────
  if (step === "location") {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
        <SectionTitle title="Court Booking" sub="Choose a location in Cairo to see available courts" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <label style={{ fontSize: 13, color: G.muted, fontWeight: 500 }}>Select Date</label>
          <input type="date" value={selectedDate} min={today} onChange={(e) => handleDateChange(e.target.value)} style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontFamily: "inherit", border: `0.5px solid ${G.borderMed}`, background: G.card, color: G.text, outline: "none" }} />
        </div>
        {loadingCourts ? (
          <div style={{ color: G.muted, fontSize: 13 }}>Loading locations...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
            {allLocations.map((loc) => {
              const courtsHere = allCourts.filter((c) => c.location === loc && c.isActive !== false);
              return (
                <button key={loc} onClick={() => handleLocationSelect(loc)} style={{ ...styles.card, cursor: "pointer", textAlign: "left", border: `0.5px solid ${G.borderMed}`, transition: "all 0.15s", padding: "18px 20px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = G.green; e.currentTarget.style.boxShadow = `0 0 0 3px ${G.greenLight}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = G.borderMed; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ fontSize: 20, marginBottom: 8 }}>📍</div>
                  <div style={{ fontWeight: 600, color: G.accent, fontSize: 14, marginBottom: 4 }}>{loc}</div>
                  <div style={{ fontSize: 12, color: G.hint }}>
                    {courtsHere.length > 0 ? `${courtsHere.length} court${courtsHere.length > 1 ? "s" : ""}` : "No courts yet"}
                  </div>
                  {courtsHere.length > 0 && <div style={{ marginTop: 8 }}><Badge color="green">Available</Badge></div>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Render: Step 2 — court timetable + add court ─────────────────────────
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 12 }}>
        <div>
          <button onClick={() => { setStep("location"); setSelected({}); }} style={{ background: "none", border: "none", color: G.green, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            ← Change location
          </button>
          <SectionTitle title={`📍 ${selectedLocation}`} sub={`Courts for ${new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={selectedDate} min={today} onChange={(e) => handleDateChange(e.target.value)} style={{ padding: "8px 12px", borderRadius: 9, fontSize: 13, fontFamily: "inherit", border: `0.5px solid ${G.borderMed}`, background: G.card, color: G.text, outline: "none" }} />
          {totalSelected > 0 && (
            <button onClick={handleConfirm} disabled={creating} style={{ ...styles.btn, fontSize: 13, opacity: creating ? 0.7 : 1 }}>
              {creating ? "Confirming..." : `Confirm ${totalSelected} slot${totalSelected > 1 ? "s" : ""} →`}
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div style={{ background: G.greenLight, border: `0.5px solid ${G.borderMed}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: G.greenDark, fontWeight: 500 }}>
          {successMsg}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Available",    color: G.greenLight,  border: G.borderMed },
          { label: "Booked",       color: "#f0f0ee",      border: "transparent" },
          { label: "Selected",     color: G.green,        border: G.green },
          { label: "Your booking", color: G.amberLight,   border: G.amber },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: l.color, border: `0.5px solid ${l.border}` }} />
            <span style={{ fontSize: 12, color: G.muted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {loadingSlots ? (
        <div style={{ color: G.muted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Loading availability...</div>
      ) : locationCourts.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: "48px 32px", color: G.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏟️</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: G.accent, marginBottom: 6 }}>No courts at this location yet</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>No seeded courts found for this location.</div>
        </div>
      ) : (
        <>
          {/* ── Timetable — courts as columns, times as rows ── */}
          <div style={{ ...styles.card, padding: 0, overflow: "hidden", marginBottom: 20 }}>
            {/* Column headers: Time | Court1 | Court2 | ... */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `160px repeat(${locationCourts.length}, 1fr)`,
              background: G.accent,
              padding: "12px 20px",
              gap: 8,
              alignItems: "center",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5 }}>Time Slot</div>
              {locationCourts.map((court) => (
                <div key={court.id} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>{court.name}</div>
                  <div style={{ fontSize: 10, color: G.greenMid }}>{court.location}</div>
                </div>
              ))}
            </div>

            {(() => {
              const allSlots = Object.values(availability)
                .flatMap((slots) => slots)
                .sort((a, b) => new Date(a.rawStart) - new Date(b.rawStart))
                .filter((slot, index, list) => list.findIndex((s) => s.slot === slot.slot) === index);

              if (allSlots.length === 0) {
                return <div style={{ padding: "28px", textAlign: "center", color: G.muted, fontSize: 13 }}>No time slots available for this date.</div>;
              }

              return allSlots.map((slotRow, rowIdx) => {
                const slot = slotRow.slot;
                return (
                <div
                  key={slot}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `160px repeat(${locationCourts.length}, 1fr)`,
                    padding: "10px 20px",
                    gap: 8,
                    alignItems: "center",
                    borderBottom: rowIdx < allSlots.length - 1 ? `0.5px solid ${G.border}` : "none",
                    background: rowIdx % 2 === 0 ? "transparent" : "rgba(29,158,117,0.02)",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: G.accent }}>
                    {formatTimeRange(slotRow.rawStart, slotRow.rawEnd)}
                    {/*
                    {slot} – {(() => {
                      const [h, m] = slot.split(":").map(Number);
                      const next = new Date(0);
                      next.setUTCHours(h + 1, m, 0, 0);
                      return next.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
                    })()}
                    */}
                  </div>

                  {locationCourts.map((court) => {
                    const courtSlots  = availability[court.id] || [];
                    const slotInfo    = courtSlots.find((s) => s.slot === slot);
                    const isAvailable = slotInfo?.isAvailable ?? false;
                    const isSelected = isAvailable && (selected[court.id]?.has(slot) ?? false);
                    const isPastSlot = slotInfo ? new Date(slotInfo.rawStart) < new Date() : true;
                    const isMyBooking = !!slotInfo && !isPastSlot && myBookings.some(
                      (b) => b.status === "Confirmed" &&
                        b.courtId === court.id &&
                        overlapsTimeRange(slotInfo.rawStart, slotInfo.rawEnd, b.startTime, b.endTime)
                    );

                    let bg, border, color, cursor, label;
                    if (isSelected)      { bg = G.amberLight; border = G.amber;      color = "#633806"; cursor = "pointer";     label = "✓ Selected"; }
                    else if (isMyBooking){ bg = G.amberLight; border = G.amber;      color = "#633806"; cursor = "default";     label = "Your booking"; }
                    else if (!isAvailable){ bg = "#f0f0ee";   border = "transparent"; color = G.hint;   cursor = "not-allowed"; label = "Booked"; }
                    else                 { bg = G.greenLight; border = G.borderMed;  color = G.greenDark; cursor = "pointer";  label = "Available"; }

                    return (
                      <button
                        key={`${court.id}-${slot}`}
                        onClick={() => isAvailable && !isMyBooking && toggleSlot(court.id, slot)}
                        style={{ padding: "8px 10px", borderRadius: 8, fontSize: 11, fontWeight: 500, cursor, fontFamily: "inherit", border: `0.5px solid ${border}`, background: bg, color, transition: "all 0.15s", textAlign: "center", width: "100%", display: "block" }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                );
              });
            })()}
          </div>

          {/* ── My existing bookings at this location ── */}
          {myUpcomingHere.length > 0 && (
            <div style={styles.card}>
              <div style={{ fontWeight: 600, color: G.accent, fontSize: 14, marginBottom: 12 }}>Your Upcoming Bookings Here</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myUpcomingHere.map((b) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: G.amberLight, borderRadius: 9, border: `0.5px solid ${G.amber}` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: G.accent }}>{b.courtName || `Court ${b.courtId}`}</div>
                      <div style={{ fontSize: 12, color: G.muted }}>{formatShortDateTime(b.startTime)} – {formatTimeLabel(b.endTime)}</div>
                    </div>
                    <Badge color="amber">Confirmed</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MATCHMAKING PAGE ─────────────────────────────────────────────────────────
function MatchmakingPage({ user }) {
  const [players,   setPlayers]   = useState([]);
  const [myPlayer,  setMyPlayer]  = useState(null);
  const [filter,    setFilter]    = useState("all");
  const [requested, setRequested] = useState({});
  const [loading,   setLoading]   = useState(true);

  const fetchMatchmaking = useCallback(async () => {
    setLoading(true);
    try {
      const [me, all] = await Promise.all([apiFetch("/players/me"), apiFetch("/players")]);
      setMyPlayer(me);
      setPlayers(all || []);
    } catch (err) {
      console.error("Matchmaking fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatchmaking(); }, [fetchMatchmaking]);
  useEffect(() => {
    window.addEventListener("booking-created", fetchMatchmaking);
    window.addEventListener("booking-cancelled", fetchMatchmaking);
    window.addEventListener("match-recorded", fetchMatchmaking);
    return () => {
      window.removeEventListener("booking-created", fetchMatchmaking);
      window.removeEventListener("booking-cancelled", fetchMatchmaking);
      window.removeEventListener("match-recorded", fetchMatchmaking);
    };
  }, [fetchMatchmaking]);

  const eloOf = (player) => Number(player?.eloRating ?? 0);
  const avgElo = (team) => Math.round(team.reduce((sum, p) => sum + eloOf(p), 0) / team.length);
  const qualityFor = (diff) => {
    if (diff <= 25) return { label: "Excellent", color: "green" };
    if (diff <= 75) return { label: "Good", color: "green" };
    if (diff <= 150) return { label: "Fair", color: "amber" };
    return { label: "Unbalanced", color: "coral" };
  };
  const playerInitials = (player) => player?.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";
  const playerLine = (player, isYou = false) => (
    <div key={player.playerId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `0.5px solid ${G.border}` }}>
      <Avatar initials={playerInitials(player)} size={30} isYou={isYou} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.accent, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {player.fullName} {isYou && <span style={{ fontSize: 11, color: G.green, marginLeft: 4 }}>You</span>}
        </div>
        <div style={{ fontSize: 11, color: G.hint }}>{player.skillLevel || "Beginner"}</div>
      </div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: G.green }}>{eloOf(player).toLocaleString()}</div>
    </div>
  );

  const uniquePlayers = players.filter((p, index, arr) => arr.findIndex((x) => x.playerId === p.playerId) === index);
  const currentPlayer = myPlayer ? uniquePlayers.find((p) => p.playerId === myPlayer.playerId) || myPlayer : null;
  const others = currentPlayer ? uniquePlayers.filter((p) => p.playerId !== currentPlayer.playerId) : [];
  const matchupRecommendations = currentPlayer
    ? others.flatMap((partner) => (
        others
          .filter((p) => p.playerId !== partner.playerId)
          .flatMap((opponentOne, opponentIndex, opponents) => (
            opponents
              .slice(opponentIndex + 1)
              .map((opponentTwo) => {
                const teamA = [currentPlayer, partner];
                const teamB = [opponentOne, opponentTwo];
                const teamAAvg = avgElo(teamA);
                const teamBAvg = avgElo(teamB);
                const eloDiff = Math.abs(teamAAvg - teamBAvg);
                return { teamA, teamB, teamAAvg, teamBAvg, eloDiff, quality: qualityFor(eloDiff) };
              })
          ))
      ))
        .sort((a, b) => a.eloDiff - b.eloDiff)
        .slice(0, 3)
    : [];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <SectionTitle title="Matchmaking" sub="Balanced 2v2 recommendations from player ELO" />
      <div style={{ ...styles.card, marginBottom: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: G.accent, fontWeight: 600 }}>Recommendations are based on balancing team average ELO.</div>
          <div style={{ fontSize: 12, color: G.muted, marginTop: 4 }}>Every matchup includes you and uses the current player list from the backend.</div>
        </div>
        {currentPlayer && <Badge color="green">You: ELO {eloOf(currentPlayer).toLocaleString()}</Badge>}
      </div>

      {loading ? (
        <div style={{ color: G.muted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Building balanced matchups...</div>
      ) : !currentPlayer || uniquePlayers.length < 4 ? (
        <div style={{ ...styles.card, color: G.muted, fontSize: 13, textAlign: "center" }}>At least 4 players are needed for matchmaking.</div>
      ) : matchupRecommendations.length === 0 ? (
        <div style={{ ...styles.card, color: G.muted, fontSize: 13, textAlign: "center" }}>At least 4 players are needed for matchmaking.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {matchupRecommendations.map((rec, idx) => (
            <div key={`${rec.teamA[1].playerId}-${rec.teamB[0].playerId}-${rec.teamB[1].playerId}`} style={{ ...styles.card, border: `0.5px solid ${idx === 0 ? G.borderMed : G.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: G.hint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Recommendation #{idx + 1}</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 800, color: G.accent }}>ELO difference {rec.eloDiff}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Badge color={rec.quality.color}>{rec.quality.label}</Badge>
                  <Badge color="gray">Team A avg {rec.teamAAvg.toLocaleString()}</Badge>
                  <Badge color="gray">Team B avg {rec.teamBAvg.toLocaleString()}</Badge>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
                <div style={{ background: G.surface, borderRadius: 12, padding: "14px 14px 6px", border: `0.5px solid ${G.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: G.accent, marginBottom: 6 }}>Team A</div>
                  {rec.teamA.map((p) => playerLine(p, p.playerId === currentPlayer.playerId))}
                  <div style={{ fontSize: 11, color: G.hint, marginTop: 10 }}>Average ELO</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 800, color: G.green }}>{rec.teamAAvg.toLocaleString()}</div>
                </div>
                <div style={{ background: G.surface, borderRadius: 12, padding: "14px 14px 6px", border: `0.5px solid ${G.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: G.accent, marginBottom: 6 }}>Team B</div>
                  {rec.teamB.map((p) => playerLine(p))}
                  <div style={{ fontSize: 11, color: G.hint, marginTop: 10 }}>Average ELO</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 800, color: G.green }}>{rec.teamBAvg.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const initials = user?.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "ME";

  const enriched = players.map((p) => {
    const eloDiff    = myPlayer ? Math.abs(p.eloRating - myPlayer.eloRating) : 200;
    const compatible = Math.max(0, Math.round(100 - eloDiff / 5));
    const winRate    = p.totalMatches > 0 ? `${Math.round((p.wins / p.totalMatches) * 100)}%` : "0%";
    return { ...p, compatible, winRate, initials: p.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??" };
  }).sort((a, b) => b.compatible - a.compatible);

  const filtered = filter === "all" ? enriched : enriched.filter((p) => (p.skillLevel || "").toLowerCase() === filter);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <SectionTitle title="Matchmaking" sub="AI-matched opponents based on your ELO and proximity" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "beginner", "intermediate", "advanced"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 16px", borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", background: filter === f ? G.accent : G.card, color: filter === f ? "white" : G.muted, border: `0.5px solid ${filter === f ? G.accent : G.border}`, textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div style={{ color: G.muted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Finding players...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: G.muted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>No players found at this skill level.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
          {filtered.map((p) => (
            <div key={p.playerId} style={{ ...styles.card, border: `0.5px solid ${p.compatible >= 90 ? G.borderMed : G.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <Avatar initials={p.initials} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: G.accent, fontSize: 14 }}>{p.fullName}</div>
                  <div style={{ fontSize: 12, color: G.hint }}>ELO {p.eloRating} · {p.skillLevel || "Beginner"}</div>
                </div>
                <div style={{ background: p.compatible >= 90 ? G.green : p.compatible >= 75 ? G.amber : G.hint, color: "white", borderRadius: 100, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{p.compatible}%</div>
              </div>
              <div style={{ background: G.greenLight, borderRadius: 4, height: 4, marginBottom: 14, overflow: "hidden" }}>
                <div style={{ width: `${p.compatible}%`, height: "100%", background: p.compatible >= 90 ? G.green : G.amber, borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <Badge color="gray">{p.skillLevel || "Beginner"}</Badge>
                <Badge color="green">Win {p.winRate}</Badge>
                <Badge color="gray">{p.wins + p.losses} matches</Badge>
              </div>
              <button onClick={() => setRequested((r) => ({ ...r, [p.playerId]: !r[p.playerId] }))} style={{ width: "100%", padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", border: "none", background: requested[p.playerId] ? G.greenLight : G.green, color: requested[p.playerId] ? G.greenDark : "white", transition: "all 0.2s" }}>
                {requested[p.playerId] ? "✓ Request Sent" : "Send Match Request"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RANKINGS PAGE ────────────────────────────────────────────────────────────
function RankingsPage({ user }) {
  const [search,  setSearch]  = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const [playersResp, matchesResp] = await Promise.all([apiFetch("/players"), apiFetch("/matches")]);
      const latestTrend = new Map();
      (matchesResp || [])
        .filter((m) => m.status === "Completed")
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .forEach((m) => {
          (m.players || []).forEach((p) => {
            if (!latestTrend.has(p.playerId)) {
              const change = (p.eloAfterMatch ?? p.eloRating) - (p.eloBeforeMatch ?? p.eloRating);
              latestTrend.set(p.playerId, change);
            }
          });
        });
      const enriched = (playersResp || [])
        .slice()
        .sort((a, b) => b.eloRating - a.eloRating)
        .map((p, idx) => {
          const t = latestTrend.get(p.playerId) ?? 0;
          return {
            rank: idx + 1,
            name: p.fullName,
            initials: p.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?",
            wins: p.wins || 0,
            losses: p.losses || 0,
            elo: p.eloRating,
            trend: `${t >= 0 ? "+" : ""}${t}`,
            isYou: p.userId === user?.userId,
          };
        });
      setPlayers(enriched);
    } catch (err) {
      console.error("Rankings fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);
  useEffect(() => {
    window.addEventListener("booking-created", fetchRankings);
    window.addEventListener("booking-cancelled", fetchRankings);
    window.addEventListener("match-recorded", fetchRankings);
    return () => {
      window.removeEventListener("booking-created", fetchRankings);
      window.removeEventListener("booking-cancelled", fetchRankings);
      window.removeEventListener("match-recorded", fetchRankings);
    };
  }, [fetchRankings]);

  const filtered = players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle title="Rankings" sub="ELO-based live leaderboard · updated after every match" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player..." style={{ padding: "9px 16px", borderRadius: 9, fontSize: 13, fontFamily: "inherit", border: `0.5px solid ${G.borderMed}`, background: G.card, color: G.text, outline: "none", width: 200 }} />
      </div>
      <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 80px 80px 70px 80px", padding: "12px 20px", background: G.surface, borderBottom: `0.5px solid ${G.border}`, fontSize: 11, fontWeight: 500, color: G.hint, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <span>#</span><span>Player</span><span>W</span><span>L</span><span>Trend</span><span style={{ textAlign: "right" }}>ELO</span>
        </div>
        {loading ? (
          <div style={{ padding: "28px", textAlign: "center", color: G.muted }}>Loading leaderboard...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", color: G.muted }}>No players found</div>
        ) : (
          filtered.map((p, idx) => (
            <div key={`${p.name}-${p.rank}`} style={{ display: "grid", gridTemplateColumns: "48px 1fr 80px 80px 70px 80px", padding: "14px 20px", alignItems: "center", borderBottom: idx < filtered.length - 1 ? `0.5px solid ${G.border}` : "none", background: p.isYou ? "rgba(29,158,117,0.06)" : "transparent", transition: "background 0.15s" }}
              onMouseEnter={(e) => !p.isYou && (e.currentTarget.style.background = G.surface)}
              onMouseLeave={(e) => !p.isYou && (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: p.rank <= 3 ? ["#EF9F27","#888","#b07020"][p.rank-1] : G.hint }}>
                {p.rank <= 3 ? ["🥇","🥈","🥉"][p.rank-1] : p.rank}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar initials={p.initials} size={34} isYou={p.isYou} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: p.isYou ? 600 : 500, color: G.accent }}>
                    {p.name} {p.isYou && <span style={{ fontSize: 11, color: G.green, marginLeft: 4 }}>· You</span>}
                  </div>
                  <div style={{ fontSize: 11, color: G.hint }}>{p.wins + p.losses} matches played</div>
                </div>
              </div>
              <span style={{ fontSize: 13, color: G.accent, fontWeight: 500 }}>{p.wins}</span>
              <span style={{ fontSize: 13, color: G.muted }}>{p.losses}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: p.trend.startsWith("+") ? G.green : p.trend.startsWith("-") ? G.coral : G.hint }}>{p.trend}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: G.green }}>{p.elo.toLocaleString()}</div>
                <div style={{ width: 60, height: 3, background: G.greenLight, borderRadius: 4, marginLeft: "auto", marginTop: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min((p.elo / 1900) * 100, 100)}%`, height: "100%", background: G.green, borderRadius: 4 }} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({ user }) {
  const [matchHistory,  setMatchHistory]  = useState([]);
  const [playerData,    setPlayerData]    = useState(null);
  const [radarData,     setRadarData]     = useState([]);
  const [headToHead,    setHeadToHead]    = useState({ bestPartner: "—", toughestRival: "—", bestPartnerRate: "—", toughestRecord: "—" });
  const [eloStats,      setEloStats]      = useState({ avgGain: "—", streak: 0 });
  const [loading,       setLoading]       = useState(true);
  const [hasRadarData,  setHasRadarData]  = useState(false);
  const [showQModal,    setShowQModal]    = useState(false);
  const [showRecordMatch, setShowRecordMatch] = useState(false);
  const [postgameCount, setPostgameCount] = useState(0);
  const analyticsMountedRef = useRef(false);

  const loadRadar = useCallback(() => {
    const saved = loadRadarData(playerData?.playerId);
    if (saved) {
      setRadarData(saved);
      setHasRadarData(true);
    } else {
      // Default empty radar (zeroed) until questionnaire is filled
      setRadarData(RADAR_SKILLS.map((s) => ({ skill: s.label, you: 0, avg: 55 })));
      setHasRadarData(false);
    }
    setPostgameCount(loadPostgameResponses(playerData?.playerId).length);
  }, [playerData?.playerId]);

  useEffect(() => {
    loadRadar();
    window.addEventListener("radar-updated", loadRadar);
    return () => window.removeEventListener("radar-updated", loadRadar);
  }, [loadRadar]);

  const fetchAnalytics = useCallback(async () => {
      try {
        const [playerResp, matchesResp] = await Promise.all([apiFetch("/players/me"), apiFetch("/matches")]);
        const completed = (matchesResp || [])
          .filter((m) => m.status === "Completed" && getPlayerEntry(m, playerResp.playerId))
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        const summaries = completed.slice(0, 10)
          .map((m) => buildMatchSummary(m, playerResp.playerId))
          .filter(Boolean)
          .map((s) => ({ ...s, vs: s.opponent, partner: s.partner }));

        const wins = completed.filter((m) => {
          const e = getPlayerEntry(m, playerResp.playerId);
          return m.winnerTeam === e?.team;
        });
        const gains = wins.map((m) => {
          const e = getPlayerEntry(m, playerResp.playerId);
          return (e?.eloAfterMatch ?? e?.eloRating) - (e?.eloBeforeMatch ?? e?.eloRating);
        }).filter((g) => g > 0);
        const avgGain = gains.length > 0 ? `+${Math.round(gains.reduce((a, b) => a + b, 0) / gains.length)}` : "—";

        let streak = 0;
        for (const m of completed) {
          const e = getPlayerEntry(m, playerResp.playerId);
          if (m.winnerTeam === e?.team) streak++; else break;
        }

        const partnerMap = new Map();
        const rivalMap   = new Map();
        completed.forEach((m) => {
          const e      = getPlayerEntry(m, playerResp.playerId);
          if (!e) return;
          const didWin    = m.winnerTeam === e.team;
          const teammates = (m.players || []).filter((p) => p.team === e.team && p.playerId !== playerResp.playerId);
          const opponents = (m.players || []).filter((p) => p.team !== e.team);
          teammates.forEach((t) => { const c = partnerMap.get(t.fullName) || { wins: 0, total: 0 }; partnerMap.set(t.fullName, { wins: c.wins + (didWin ? 1 : 0), total: c.total + 1 }); });
          opponents.forEach((o) => { const c = rivalMap.get(o.fullName) || { wins: 0, total: 0 }; rivalMap.set(o.fullName, { wins: c.wins + (didWin ? 1 : 0), total: c.total + 1 }); });
        });

        let bestPartner = "—", bestPartnerRate = "—", maxRate = -1;
        partnerMap.forEach((v, name) => { const rate = v.total > 0 ? v.wins / v.total : 0; if (rate > maxRate) { maxRate = rate; bestPartner = name; bestPartnerRate = `${Math.round(rate * 100)}% win rate`; } });

        let toughestRival = "—", toughestRecord = "—", minRate = 2;
        rivalMap.forEach((v, name) => { if (v.total < 2) return; const rate = v.wins / v.total; if (rate < minRate) { minRate = rate; toughestRival = name; toughestRecord = `${v.wins}W ${v.total - v.wins}L`; } });

        if (analyticsMountedRef.current) {
          setPlayerData(playerResp);
          setMatchHistory(summaries);
          setEloStats({ avgGain, streak });
          setHeadToHead({ bestPartner, bestPartnerRate, toughestRival, toughestRecord });
          setLoading(false);
        }
      } catch (err) {
        console.error("Analytics fetch error:", err);
        if (analyticsMountedRef.current) setLoading(false);
      }
  }, []);

  useEffect(() => {
    analyticsMountedRef.current = true;
    fetchAnalytics();
    window.addEventListener("booking-created", fetchAnalytics);
    window.addEventListener("booking-cancelled", fetchAnalytics);
    window.addEventListener("match-recorded", fetchAnalytics);
    return () => {
      analyticsMountedRef.current = false;
      window.removeEventListener("booking-created", fetchAnalytics);
      window.removeEventListener("booking-cancelled", fetchAnalytics);
      window.removeEventListener("match-recorded", fetchAnalytics);
    };
  }, [fetchAnalytics]);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      {showQModal && (
        <PostGameModal
          matchId={`manual-${Date.now()}`}
          playerId={playerData?.playerId}
          onClose={() => setShowQModal(false)}
          onSave={(radar) => { setRadarData(radar); setHasRadarData(true); setShowQModal(false); setPostgameCount(c => c + 1); }}
        />
      )}
      {showRecordMatch && (
        <RecordMatchModal
          onClose={() => setShowRecordMatch(false)}
          onRecorded={() => {
            setShowRecordMatch(false);
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle title="Performance Analytics" sub="Deep dive into your stats, trends, and head-to-head" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={() => setShowRecordMatch(true)} style={{ ...styles.btnGhost, fontSize: 12 }}>
            + Record Match
          </button>
          <button onClick={() => setShowQModal(true)} style={{ ...styles.btn, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            + Log Game Review
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: G.muted, fontSize: 13 }}>Loading analytics...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            <StatCard label="Avg ELO gain/win"    value={eloStats.avgGain}                     sub="per winning match" />
            <StatCard label="Current win streak"   value={eloStats.streak}                      sub="consecutive wins"  color={G.amber} />
            <StatCard label="Best partner"         value={bestPartnerName(headToHead.bestPartner)} sub={headToHead.bestPartnerRate} color={G.greenDark} />
            <StatCard label="Toughest rival"       value={bestPartnerName(headToHead.toughestRival)} sub={headToHead.toughestRecord} color={G.coral} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Skills Radar */}
            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontWeight: 600, color: G.accent, fontSize: 14 }}>Skills Radar</div>
                <Badge color={hasRadarData ? "green" : "gray"}>
                  {hasRadarData ? `${postgameCount} review${postgameCount !== 1 ? "s" : ""}` : "No data yet"}
                </Badge>
              </div>
              <div style={{ fontSize: 11, color: G.hint, marginBottom: 12 }}>Based on your post-game reviews · platform avg shown</div>

              {!hasRadarData ? (
                <div style={{ textAlign: "center", padding: "28px 16px" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: G.accent, marginBottom: 6 }}>Your radar is empty</div>
                  <div style={{ fontSize: 12, color: G.muted, marginBottom: 16, lineHeight: 1.6 }}>
                    After each game, complete a quick 6-question review.<br />Your skills radar updates automatically.
                  </div>
                  <button onClick={() => setShowQModal(true)} style={{ ...styles.btn, fontSize: 12 }}>
                    Fill in your first review →
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={G.border} />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: G.muted }} />
                    <Radar name="You" dataKey="you" stroke={G.green} fill={G.green} fillOpacity={0.2} />
                    <Radar name="Avg" dataKey="avg" stroke={G.amber} fill={G.amber} fillOpacity={0.15} />
                    <Tooltip contentStyle={{ background: G.card, border: `0.5px solid ${G.border}`, borderRadius: 8, fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}

              {/* Skill breakdown bars */}
              {hasRadarData && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {radarData.map((d) => (
                    <div key={d.skill} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 11, color: G.muted, width: 100, flexShrink: 0 }}>{d.skill}</div>
                      <div style={{ flex: 1, background: G.greenLight, borderRadius: 4, height: 5, overflow: "hidden" }}>
                        <div style={{ width: `${d.you}%`, height: "100%", background: d.you >= 70 ? G.green : d.you >= 40 ? G.amber : G.coral, borderRadius: 4, transition: "width 0.4s ease" }} />
                      </div>
                      <div style={{ fontSize: 11, color: G.accent, fontWeight: 600, width: 30, textAlign: "right" }}>{d.you}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Match History */}
            <div style={styles.card}>
              <div style={{ fontWeight: 600, color: G.accent, fontSize: 14, marginBottom: 14 }}>Match History</div>
              {matchHistory.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {matchHistory.map((m, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto auto", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, background: m.result === "W" ? "rgba(29,158,117,0.06)" : "rgba(216,90,48,0.05)" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.result === "W" ? G.greenLight : G.coralLight, color: m.result === "W" ? G.greenDark : G.coral, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                        {m.result}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: G.accent }}>vs {m.vs}</div>
                        <div style={{ fontSize: 11, color: G.hint }}>w/ {m.partner} · {m.date}</div>
                      </div>
                      <div style={{ fontSize: 12, color: G.muted }}>{m.score}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: m.result === "W" ? G.green : G.coral }}>{m.eloChange}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "28px 16px" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: G.accent, marginBottom: 6 }}>No completed matches yet</div>
                  <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.6 }}>Book a court and play your first match to see history here.</div>
                </div>
              )}
            </div>
          </div>

          {/* Post-game review history */}
          {postgameCount > 0 && (
            <div style={{ ...styles.card, marginTop: 16 }}>
              <div style={{ fontWeight: 600, color: G.accent, fontSize: 14, marginBottom: 12 }}>Review History</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {loadPostgameResponses(playerData?.playerId).slice(-5).reverse().map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: G.surface, borderRadius: 9 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: G.greenLight, color: G.greenDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📝</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: G.accent }}>Game Review #{postgameCount - i}</div>
                      <div style={{ fontSize: 11, color: G.hint }}>{formatShortDate(r.date)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {Object.entries(r.answers).slice(0, 3).map(([k, v]) => (
                        <Badge key={k} color="gray">{v}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookingDetailsPage({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [usedBookings, setUsedBookings] = useState([]);
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [courtMap, setCourtMap] = useState({});
  const [matchMap, setMatchMap] = useState({});
  const detailsMountedRef = useRef(false);

  const fetchBookingDetails = useCallback(async () => {
    try {
      const [bookingsResp, courtsResp, matchesResp] = await Promise.all([
        apiFetch("/bookings/my"),
        apiFetch("/courts"),
        apiFetch("/matches"),
      ]);
      const now = new Date();
      const bookingsList = bookingsResp || [];
      const courtsById = (courtsResp || []).reduce((acc, court) => { acc[court.id] = court; return acc; }, {});
      const matchesByBookingId = (matchesResp || []).reduce((acc, match) => { if (match.bookingId) acc[match.bookingId] = match; return acc; }, {});

      const upcoming = bookingsList
        .filter((b) => b.status === "Confirmed" && new Date(b.startTime) > now && !(matchesByBookingId[b.id] && matchesByBookingId[b.id].status !== "Cancelled"))
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      const used = bookingsList
        .filter((b) => b.status === "Confirmed" && matchesByBookingId[b.id] && matchesByBookingId[b.id].status !== "Cancelled")
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      const cancelled = bookingsList.filter((b) => b.status === "Cancelled");

      if (detailsMountedRef.current) {
        setBookings(upcoming);
        setUsedBookings(used);
        setCancelledBookings(cancelled);
        setCourtMap(courtsById);
        setMatchMap(matchesByBookingId);
      }
    } catch (err) {
      console.error("Booking details error:", err);
    } finally {
      if (detailsMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    detailsMountedRef.current = true;
    fetchBookingDetails();
    window.addEventListener("booking-created", fetchBookingDetails);
    window.addEventListener("booking-cancelled", fetchBookingDetails);
    window.addEventListener("booking-updated", fetchBookingDetails);
    window.addEventListener("match-recorded", fetchBookingDetails);
    return () => {
      detailsMountedRef.current = false;
      window.removeEventListener("booking-created", fetchBookingDetails);
      window.removeEventListener("booking-cancelled", fetchBookingDetails);
      window.removeEventListener("booking-updated", fetchBookingDetails);
      window.removeEventListener("match-recorded", fetchBookingDetails);
    };
  }, [fetchBookingDetails]);

  if (loading) {
    return <div style={{ padding: "28px 32px", color: G.muted }}>Loading booking...</div>;
  }

  const handleCancelBooking = async (bookingId) => {
    setCancelLoadingId(bookingId);
    try {
      await apiFetch(`/bookings/${bookingId}`, { method: "DELETE" });
      await fetchBookingDetails();
      window.dispatchEvent(new CustomEvent("booking-cancelled"));
    } catch (err) {
      alert(err.message || "Failed to cancel booking");
    } finally {
      setCancelLoadingId(null);
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: G.green, fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
        ← Back to Booking
      </button>
      <SectionTitle title="Booking Details" sub="Your bookings" />

      {/* Upcoming Bookings (Confirmed, future, and no associated non-cancelled match) */}
      <div style={{ fontSize: 13, fontWeight: 600, color: G.accent, marginBottom: 8 }}>Upcoming Bookings</div>
      {bookings.length === 0 ? (
        <div style={{ ...styles.card, color: G.muted, fontSize: 13, marginBottom: 12 }}>No upcoming bookings.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
          {bookings.map((booking) => {
            const court = courtMap[booking.courtId];
            const courtName = court?.name || booking.courtName || `Court ${booking.courtId}`;
            const bookingMatch = matchMap[booking.id];
            const isCancelling = cancelLoadingId === booking.id;

            return (
              <div key={booking.id} style={{ ...styles.card }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: G.hint, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Court</div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: G.accent, marginBottom: 6 }}>{courtName}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", rowGap: 8, columnGap: 10 }}>
                      <div style={{ fontSize: 12, color: G.hint }}>Date</div>
                      <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatShortDate(booking.startTime)}</div>
                      <div style={{ fontSize: 12, color: G.hint }}>Start</div>
                      <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatTimeLabel(booking.startTime)}</div>
                      <div style={{ fontSize: 12, color: G.hint }}>End</div>
                      <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatTimeLabel(booking.endTime)}</div>
                      <div style={{ fontSize: 12, color: G.hint }}>Status</div>
                      <div><Badge color="green">{booking.status}</Badge></div>
                      <div style={{ fontSize: 12, color: G.hint }}>Match</div>
                      <div>{bookingMatch ? (<Badge color={bookingMatch.status === "Completed" ? "green" : "amber"}>{bookingMatch.status === "Completed" ? "Match recorded" : "Match scheduled"}</Badge>) : (<Badge color="gray">No match yet</Badge>)}</div>
                    </div>
                  </div>
                  <button onClick={() => handleCancelBooking(booking.id)} disabled={isCancelling || (bookingMatch && bookingMatch.status !== "Cancelled")} style={{ background: G.coralLight, color: G.coral, border: "none", padding: "9px 14px", borderRadius: 9, fontSize: 12, cursor: isCancelling ? "wait" : "pointer", fontFamily: "inherit", opacity: isCancelling ? 0.7 : 1 }}>{isCancelling ? "Cancelling..." : "Cancel Booking"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Used / Completed Bookings (have an associated scheduled or completed match) */}
      {usedBookings.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.accent, marginBottom: 8 }}>Completed / Used Bookings</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
            {usedBookings.map((booking) => {
              const court = courtMap[booking.courtId];
              const courtName = court?.name || booking.courtName || `Court ${booking.courtId}`;
              const bookingMatch = matchMap[booking.id];

              return (
                <div key={`used-${booking.id}`} style={{ ...styles.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, color: G.hint, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Court</div>
                      <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: G.accent, marginBottom: 6 }}>{courtName}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", rowGap: 8, columnGap: 10 }}>
                        <div style={{ fontSize: 12, color: G.hint }}>Date</div>
                        <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatShortDate(booking.startTime)}</div>
                        <div style={{ fontSize: 12, color: G.hint }}>Start</div>
                        <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatTimeLabel(booking.startTime)}</div>
                        <div style={{ fontSize: 12, color: G.hint }}>End</div>
                        <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatTimeLabel(booking.endTime)}</div>
                        <div style={{ fontSize: 12, color: G.hint }}>Status</div>
                        <div><Badge color="green">{booking.status}</Badge></div>
                        <div style={{ fontSize: 12, color: G.hint }}>Match</div>
                        <div>{bookingMatch ? (<Badge color={bookingMatch.status === "Completed" ? "green" : "amber"}>{bookingMatch.status === "Completed" ? "Match recorded" : "Match scheduled"}</Badge>) : (<Badge color="gray">No match yet</Badge>)}</div>
                      </div>
                    </div>
                    <div style={{ minWidth: 140 }}>
                      <button disabled style={{ background: G.coralLight, color: G.coral, border: "none", padding: "9px 14px", borderRadius: 9, fontSize: 12, cursor: "not-allowed", fontFamily: "inherit", opacity: 0.7 }}>Cannot cancel</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Cancelled Bookings */}
      {cancelledBookings.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.accent, marginBottom: 8 }}>Cancelled Bookings</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cancelledBookings.map((booking) => {
              const court = courtMap[booking.courtId];
              const courtName = court?.name || booking.courtName || `Court ${booking.courtId}`;
              return (
                <div key={`cancelled-${booking.id}`} style={{ ...styles.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 11, color: G.hint, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Court</div>
                      <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: G.accent, marginBottom: 6 }}>{courtName}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", rowGap: 8, columnGap: 10 }}>
                        <div style={{ fontSize: 12, color: G.hint }}>Date</div>
                        <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatShortDate(booking.startTime)}</div>
                        <div style={{ fontSize: 12, color: G.hint }}>Start</div>
                        <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatTimeLabel(booking.startTime)}</div>
                        <div style={{ fontSize: 12, color: G.hint }}>End</div>
                        <div style={{ fontSize: 12, color: G.accent, fontWeight: 600 }}>{formatTimeLabel(booking.endTime)}</div>
                        <div style={{ fontSize: 12, color: G.hint }}>Status</div>
                        <div><Badge color="gray">Cancelled</Badge></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PLAYER LAYOUT ────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",   icon: "⊞" },
  { id: "booking",     label: "Booking",     icon: "📅" },
  { id: "matchmaking", label: "Matchmaking", icon: "🤝" },
  { id: "rankings",    label: "Rankings",    icon: "🏆" },
  { id: "analytics",   label: "Analytics",   icon: "📊" },
];

function PlayerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [page,           setPage]           = useState("dashboard");
  const [playerData,     setPlayerData]     = useState(null);
  const [sidebarBooking, setSidebarBooking] = useState(null);
  const initials = user?.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "ME";

  const refreshSidebar = useCallback(async () => {
    try {
      const [playerResp, bookingsResp, matchesResp] = await Promise.all([apiFetch("/players/me"), apiFetch("/bookings/my"), apiFetch("/matches")]);
      setPlayerData(playerResp);
      const bookingsList = bookingsResp || [];
      const bookingsWithMatch = new Set((matchesResp || []).filter((m) => m.bookingId && m.status !== "Cancelled").map((m) => String(m.bookingId)));
      const upcoming = bookingsList
        .filter((b) => b.status === "Confirmed" && new Date(b.startTime) > new Date() && !bookingsWithMatch.has(String(b.id)))
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
      setSidebarBooking(upcoming ?? null);
    } catch (_) {}
  }, []);

  useEffect(() => { refreshSidebar(); }, [refreshSidebar]);
  useEffect(() => {
    window.addEventListener("booking-created", refreshSidebar);
    window.addEventListener("booking-cancelled", refreshSidebar);
    window.addEventListener("booking-updated", refreshSidebar);
    window.addEventListener("match-recorded", refreshSidebar);
    return () => {
      window.removeEventListener("booking-created", refreshSidebar);
      window.removeEventListener("booking-cancelled", refreshSidebar);
      window.removeEventListener("booking-updated", refreshSidebar);
      window.removeEventListener("match-recorded", refreshSidebar);
    };
  }, [refreshSidebar]);
  useEffect(() => {
    const go = () => setPage("booking");
    window.addEventListener("padel:navigate-booking", go);
    return () => window.removeEventListener("padel:navigate-booking", go);
  }, []);

  useEffect(() => {
    const openDetails = () => setPage("booking-details");
    window.addEventListener("padel:open-booking-details", openDetails);
    return () => window.removeEventListener("padel:open-booking-details", openDetails);
  }, []);

  const renderPage = () => {
    switch (page) {
      case "dashboard":   return <DashboardPage   user={user} />;
      case "booking":     return <BookingPage />;
      case "booking-details":
        return (
          <BookingDetailsPage
            onBack={() => setPage("booking")}
          />
        );
      case "matchmaking": return <MatchmakingPage user={user} />;
      case "rankings":    return <RankingsPage    user={user} />;
      case "analytics":   return <AnalyticsPage   user={user} />;
      default:            return null;
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", fontSize: 14, display: "flex", height: "100vh", overflow: "hidden", background: G.surface }}>
      <aside style={{ width: 220, background: G.accent, display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 28px", borderBottom: `0.5px solid rgba(255,255,255,0.08)` }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "white", letterSpacing: -0.5 }}>
            Padel <span style={{ color: G.greenMid }}>Mates</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Padel Mates Platform</div>
        </div>
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, marginBottom: 2, background: page === item.id ? "rgba(29,158,117,0.2)" : "transparent", border: page === item.id ? `0.5px solid rgba(29,158,117,0.3)` : "0.5px solid transparent", color: page === item.id ? G.greenMid : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: page === item.id ? 500 : 400, textAlign: "left", transition: "all 0.15s" }}
              onMouseEnter={(e) => page !== item.id && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => page !== item.id && (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: `0.5px solid rgba(255,255,255,0.08)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Avatar initials={initials} size={34} isYou />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "white" }}>{user?.fullName}</div>
            </div>
          </div>
          <div style={{ border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Live Summary</div>
            <div style={{ fontSize: 11, color: "white", marginBottom: 3 }}>
              {playerData?.skillLevel || "Beginner"} · {playerData ? `${playerData.wins}W ${playerData.losses}L` : "0W 0L"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
              {sidebarBooking ? `Next: ${formatShortDateTime(sidebarBooking.startTime)}` : "No upcoming booking"}
            </div>
            <button
              onClick={() => {
                if (sidebarBooking?.id) {
                  window.dispatchEvent(new CustomEvent("padel:open-booking-details"));
                } else {
                  setPage("booking");
                }
              }}
              style={{ width: "100%", padding: "7px", borderRadius: 7, background: "rgba(29,158,117,0.18)", border: "0.5px solid rgba(29,158,117,0.35)", color: G.greenMid, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
            >
              {sidebarBooking ? "View Details" : "Book Court"}
            </button>
          </div>
          <button onClick={() => { logout(); nav("/"); }} style={{ width: "100%", padding: "7px", borderRadius: 7, background: "transparent", border: "0.5px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "16px 32px", background: G.card, borderBottom: `0.5px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ fontSize: 13, color: G.muted }}>
            {NAV_ITEMS.find((n) => n.id === page)?.icon} &nbsp;
            {NAV_ITEMS.find((n) => n.id === page)?.label}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: G.green }} />
            <span style={{ fontSize: 12, color: G.muted }}>Live data</span>
          </div>
        </div>
        {renderPage()}
      </main>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(29,158,117,0.25); border-radius: 4px; }
      `}</style>
    </div>
  );
}

// ─── APP ROUTES ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/"       element={<LandingPage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/player" element={<ProtectedRoute><PlayerLayout /></ProtectedRoute>} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
}
