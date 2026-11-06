// The score at the table (idea 6 Nov): playing a friend game after game at one room, nothing said who was ahead tonight —
// at a real board the family keeps count ("that's three–one to me"). Each board keeps the room's results itself, by seat, so
// both boards count the same games the same way (the server already says who won each one): wins for each seat and draws,
// counted once per game of the room (the room's `games` count is the game's number), so a reload, a rejoin or a card shown
// twice never counts it again. Pure functions (no DOM), tested in test/tally.test.js; web/game.js shows the line on the Game
// over card (the number that went up ticks) and in the toast when the next game starts.
// Storage shape: { rooms: { "<code>:<rid>": { w: [seat 0 wins, seat 1 wins], d: draws, seen: [game numbers counted], at } } }
// Only the last few rooms are kept (MAX_ROOMS), and only the last MAX_SEEN game numbers of each.

export const MAX_ROOMS = 8;
export const MAX_SEEN = 200;

const fresh = () => ({ w: [0, 0], d: 0, seen: [], at: 0 });
const count = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);

export function parse(raw) {
  const out = { rooms: {} };
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw || 'null') : raw;
    if (!s || typeof s !== 'object' || !s.rooms || typeof s.rooms !== 'object') return out;
    for (const [k, e] of Object.entries(s.rooms)) {
      if (!e || typeof e !== 'object' || typeof k !== 'string' || k.length > 80) continue;
      out.rooms[k] = { w: Array.isArray(e.w) ? [count(e.w[0]), count(e.w[1])] : [0, 0], d: count(e.d), seen: Array.isArray(e.seen) ? e.seen.filter(Number.isInteger).slice(-MAX_SEEN) : [], at: count(e.at) };
    }
  } catch {}
  return out;
}

export function roomKey(code, rid) { return code && rid ? `${code}:${rid}` : null; }

// Count the finished game number `game` of the room, won by seat 0 / 1 or 'draw'. Returns { data, entry, before, counted }:
// before is the entry as it stood before this game (for the tick on the card).
export function record(data, key, game, winner, now = Date.now()) {
  const rooms = {}; for (const [k, e] of Object.entries(data.rooms || {})) rooms[k] = { w: e.w.slice(), d: e.d, seen: e.seen.slice(), at: e.at };
  const d = { rooms };
  if (!key || !Number.isInteger(game) || game < 0 || !(winner === 0 || winner === 1 || winner === 'draw')) return { data: d, entry: key ? rooms[key] || fresh() : fresh(), before: null, counted: false };
  const e = rooms[key] || fresh(); const before = { w: e.w.slice(), d: e.d };
  if (e.seen.includes(game)) { rooms[key] = e; return { data: d, entry: e, before: null, counted: false }; }
  if (winner === 'draw') e.d += 1; else e.w[winner] += 1;
  e.seen = [...e.seen, game].slice(-MAX_SEEN); e.at = now; rooms[key] = e;
  const keys = Object.keys(rooms).sort((a, b) => rooms[b].at - rooms[a].at); for (const k of keys.slice(MAX_ROOMS)) delete rooms[k];
  return { data: d, entry: e, before, counted: true };
}

export function entryOf(data, key) { return (key && data.rooms && data.rooms[key]) || fresh(); }
export function played(e) { return e.w[0] + e.w[1] + e.d; }

// The standing from one seat: "you lead 2–1" / "Tete leads 2–1" / "level 1–1", then "1 drawn" when there were draws.
// Nothing before the first game is finished. Joined with " · " so each part is its own phrase in French.
export function standingParts(e, you, friend = 'Your friend') {
  if (!e || !played(e)) return [];
  const mine = e.w[you], theirs = e.w[1 - you];
  const head = mine > theirs ? `you lead ${mine}–${theirs}` : mine < theirs ? `${friend} leads ${theirs}–${mine}` : `level ${mine}–${theirs}`;
  return e.d ? [head, e.d === 1 ? '1 drawn' : `${e.d} drawn`] : [head];
}

// The Game over card's line: "you lead 2–1 · 1 drawn · 4 games at this board" ("1 game at this board" after the first).
export function cardLine(e, you, friend) {
  const parts = standingParts(e, you, friend); if (!parts.length) return '';
  const n = played(e); return [...parts, n === 1 ? '1 game at this board' : `${n} games at this board`].join(' · ');
}

// The toast when the next game starts: "game 3 · you lead 2–0" (nothing new to say before the second game).
export function startLine(e, you, friend) {
  const parts = standingParts(e, you, friend); if (!parts.length) return '';
  return [`game ${played(e) + 1}`, ...parts].join(' · ');
}

// Which number on the card went up, to tick it from `before`: 'mine', 'theirs' or 'draw' (null when nothing was counted).
export function wentUp(before, e, you) {
  if (!before) return null;
  if (e.w[you] > before.w[you]) return 'mine';
  if (e.w[1 - you] > before.w[1 - you]) return 'theirs';
  return e.d > before.d ? 'draw' : null;
}
