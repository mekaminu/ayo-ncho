// Count a pit by touch (idea 3 Nov, late afternoon): at a real board you count a pit by touching each seed in turn. On the
// phone, press and hold any pit (yours or theirs) and its seeds are counted one by one — each one hops a little with a
// quiet tick and a tap, a brass number over the pit counts up with them — and the hint line says it ("their pit 2 · 6 seeds").
// The Mac has the mouse for this (web/hover.js); a finger had nothing but the badges, which can be turned off.
// Pure functions, no DOM: game.js asks when a press counts, how fast to count, and what to say. The count is the engine's
// own (state.pits), never worked out here.
import { pitName } from './path.js';
import { seedsWord } from './keys.js';
import { WIN_SEEDS, TOTAL_SEEDS } from '../engine/ayo.js';

export const HOLD_MS = 450;  // how long a finger rests on a pit before it counts (a tap is far shorter)
export const HOLD_SLOP = 10; // px a resting finger may wander; more and it is turning the board, not counting
export const COUNT_STAY_MS = 1400; // how long the number stays after the last seed

// ms between seeds: a steady finger, quicker for a big pit so a count takes at most ~1.6 s (~2 s for the very biggest) (none for an empty one)
export function countPace(n) {
  if (!(n > 0)) return 0;
  return Math.round(Math.max(45, Math.min(130, 1600 / n)));
}
// when each seed is touched, from the start of the count: [0, pace, 2·pace, …]; reduced motion: all at once
export function countPlan(n, { reduce = false } = {}) {
  const p = reduce ? 0 : countPace(n); return Array.from({ length: Math.max(0, n | 0) }, (_, k) => k * p);
}
// may a press start a count now? Not on a screen (Home, Settings, Rooms), in the clip, while a turn plays or is watched again,
// or with two fingers down (a pinch). It works with the count badges off too: that is when it is most wanted
export function canCount({ screen = false, clipping = false, playing = false, replaying = false, fingers = 1 } = {}) {
  return !screen && !clipping && !playing && !replaying && fingers === 1;
}
// a resting finger that has wandered past the slop is dragging the board
export function stillHolding(dx, dy) { return Math.hypot(dx, dy) <= HOLD_SLOP; }

// the words for the hint line: "your pit 3 · 5 seeds" / "their pit 2 is empty"; a pit of 11 reaches every other pit, and
// one of 12 or more goes right round the board, past its own pit (a lap skips the pit it was lifted from, in both games)
export function countWords({ state, pit, you = 0 }) {
  const n = state.pits[pit]; const name = pitName(pit, you);
  if (n === 0) return `${name} is empty`;
  const lap = n >= 12 ? ' · goes right round the board, past its own pit' : n === 11 ? ' · reaches every other pit' : '';
  return `${name} · ${seedsWord(n)}${lap}`;
}

// Count a trough by touch (idea 7 Nov): your winnings lie heaped in the trough at your end, and at a real board you count them
// out to see how close you are. Press and hold either trough and its seeds are counted the same way, and the hint line says how
// many more that side needs to reach 25 ("your trough · 18 seeds · 7 more to win"; "their trough · 25 seeds · 25 reached";
// "· 25 is out of reach" once the other side holds more than half). side: 0 the near player's trough, 1 the far one's (the
// store index, as engine stores are kept); total: the seeds in this game (the lesson's small board has fewer).
export const TROUGHS = ['S0', 'S1'];
export const isTrough = (home) => typeof home === 'string' && TROUGHS.includes(home);
export function troughName(side, you = 0) { return `${side === you ? 'your' : 'their'} trough`; }
export function troughWords({ stores, side, you = 0, total = TOTAL_SEEDS }) {
  const n = stores[side] | 0, other = stores[1 - side] | 0, name = troughName(side, you);
  const need = WIN_SEEDS - n;
  const tail = need <= 0 ? `${WIN_SEEDS} reached` : total - other < WIN_SEEDS ? `${WIN_SEEDS} is out of reach` : `${need} more to win`;
  return n === 0 ? `${name} is empty · ${tail}` : `${name} · ${seedsWord(n)} · ${tail}`;
}
// the count a press shows: a pit's seeds, or a trough's
export function countOf(state, home) { return isTrough(home) ? state.stores[+home[1]] : state.pits[home]; }
// a point on the board's top (x, z) inside a trough's cup? The cups are ellipses round storeCenters, a little forgiving at the rim
export function troughAt(x, z, { centers, rx, rz, slack = 1.15 }) {
  for (let side = 0; side < 2; side++) {
    const [cx, cz] = centers[side]; const u = (x - cx) / rx, v = (z - cz) / rz;
    if (u * u + v * v <= slack * slack) return TROUGHS[side];
  }
  return null;
}
