// Count a pit by touch (idea 3 Nov, late afternoon): at a real board you count a pit by touching each seed in turn. On the
// phone, press and hold any pit (yours or theirs) and its seeds are counted one by one — each one hops a little with a
// quiet tick and a tap, a brass number over the pit counts up with them — and the hint line says it ("their pit 2 · 6 seeds").
// The Mac has the mouse for this (web/hover.js); a finger had nothing but the badges, which can be turned off.
// Pure functions, no DOM: game.js asks when a press counts, how fast to count, and what to say. The count is the engine's
// own (state.pits), never worked out here.
import { pitName } from './path.js';
import { seedsWord } from './keys.js';

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
