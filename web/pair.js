// The score between us (idea 8 Nov): two of us on one phone kept no count at all — the Game over card said who won and
// nothing more, because the phone could not tell who sat where. Once both players have typed their names (Settings →
// Opponent → Our names) it can: the count is kept by the pair of names, whichever field each name is in, so "Meka & Tete"
// and "Tete & Meka" are one count, and a different pair (Mum & Dad on the same phone) keeps its own. Counted once per game
// (the game's start time is its id), so a reload or the card shown twice never counts it again. Names that are still
// Player 1 / Player 2 keep nothing. Pure functions (no DOM), tested in test/pair.test.js; web/game.js shows the line on
// the Game over card (the number that went up ticks) and in the toast when the next game starts.
// Storage shape: { pairs: { "<name a>|<name b>" (lower case, in order): { w: [a's wins, b's wins], d, seen: [game ids], at } } }

export const MAX_PAIRS = 8;
export const MAX_SEEN = 200;

const fresh = () => ({ w: [0, 0], d: 0, seen: [], at: 0 });
const count = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);

export function parse(raw) {
  const out = { pairs: {} };
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw || 'null') : raw;
    if (!s || typeof s !== 'object' || !s.pairs || typeof s.pairs !== 'object') return out;
    for (const [k, e] of Object.entries(s.pairs)) {
      if (!e || typeof e !== 'object' || typeof k !== 'string' || k.length > 80 || !k.includes('|')) continue;
      out.pairs[k] = { w: Array.isArray(e.w) ? [count(e.w[0]), count(e.w[1])] : [0, 0], d: count(e.d), seen: Array.isArray(e.seen) ? e.seen.filter((v) => Number.isFinite(v)).slice(-MAX_SEEN) : [], at: count(e.at) };
    }
  } catch {}
  return out;
}

// The pair of names as the count knows them: { key, order } where order[seat] is that seat's place in the key (0 or 1).
// null while either name is still a default (`named` tells which are typed) or the two are the same.
export function pairOf(names, named = [true, true]) {
  if (!Array.isArray(names) || names.length < 2 || !named[0] || !named[1]) return null;
  const a = String(names[0] || '').trim().toLowerCase(), b = String(names[1] || '').trim().toLowerCase();
  if (!a || !b || a === b) return null;
  const swap = b < a; return { key: swap ? `${b}|${a}` : `${a}|${b}`, order: swap ? [1, 0] : [0, 1] };
}

// Count the finished game `id`, won by seat 0 / 1 or 'draw'. Returns { data, entry, before, counted } with entry and
// before turned to the seats of this game (w[seat]), so the lines below read them by seat.
export function record(data, pair, id, winner, now = Date.now()) {
  const pairs = {}; for (const [k, e] of Object.entries(data.pairs || {})) pairs[k] = { w: e.w.slice(), d: e.d, seen: e.seen.slice(), at: e.at };
  const d = { pairs };
  if (!pair || !Number.isFinite(id) || !(winner === 0 || winner === 1 || winner === 'draw')) return { data: d, entry: pair ? bySeat(pairs[pair.key] || fresh(), pair) : fresh(), before: null, counted: false };
  const e = pairs[pair.key] || fresh(); const before = bySeat(e, pair);
  if (e.seen.includes(id)) { pairs[pair.key] = e; return { data: d, entry: before, before: null, counted: false }; }
  if (winner === 'draw') e.d += 1; else e.w[pair.order[winner]] += 1;
  e.seen = [...e.seen, id].slice(-MAX_SEEN); e.at = now; pairs[pair.key] = e;
  const keys = Object.keys(pairs).sort((a, b) => pairs[b].at - pairs[a].at); for (const k of keys.slice(MAX_PAIRS)) delete pairs[k];
  return { data: d, entry: bySeat(e, pair), before, counted: true };
}

// the kept entry read by the seats of this game: w[seat]
export function bySeat(e, pair) { return { w: [e.w[pair.order[0]], e.w[pair.order[1]]], d: e.d }; }
export function entryOf(data, pair) { return pair ? bySeat((data.pairs && data.pairs[pair.key]) || fresh(), pair) : fresh(); }
export function played(e) { return e.w[0] + e.w[1] + e.d; }

// "Meka leads 3–1" / "level 2–2", then "1 drawn" when there were draws. names[seat] are the names in use.
export function standingParts(e, names) {
  if (!e || !played(e)) return [];
  const [x, y] = e.w; const head = x > y ? `${names[0]} leads ${x}–${y}` : y > x ? `${names[1]} leads ${y}–${x}` : `level ${x}–${y}`;
  return e.d ? [head, e.d === 1 ? '1 drawn' : `${e.d} drawn`] : [head];
}

// The Game over card's line: "Meka leads 3–1 · 1 drawn · 5 games between you" ("1 game between you" after the first).
export function cardLine(e, names) {
  const parts = standingParts(e, names); if (!parts.length) return '';
  const n = played(e); return [...parts, n === 1 ? '1 game between you' : `${n} games between you`].join(' · ');
}

// The toast when the next game starts: "game 4 · Meka leads 2–1" (nothing before the first game is finished).
export function startLine(e, names) {
  const parts = standingParts(e, names); if (!parts.length) return '';
  return [`game ${played(e) + 1}`, ...parts].join(' · ');
}

// Which count went up from `before`: 0 or 1 (that seat's wins) or 'draw'; null when nothing was counted.
export function wentUp(before, e) {
  if (!before) return null;
  if (e.w[0] > before.w[0]) return 0;
  if (e.w[1] > before.w[1]) return 1;
  return e.d > before.d ? 'draw' : null;
}
