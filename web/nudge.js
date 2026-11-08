// A nudge (idea 8 Nov): after a miss on the daily puzzle, Mama Ngozi can narrow it down before she shows the whole move —
// two of your pits lit on the board, the answer and the most tempting wrong one (the pit that takes the most short of the
// target), with one line about what the right one does. The two are given in pit order, so their order gives nothing away.
// A solve after a nudge still counts; the card and the share say "with a nudge". Pure functions (no DOM), tested in node.
import { legalMoves } from '../engine/ayo.js';
import { attempt } from '../engine/puzzle.js';

export const NUDGE_AFTER = 1; // one miss
// offered once a day's puzzle has been missed, until it is solved or shown (a nudge already given stays on the board instead)
export function canNudge(e) { return !!e && !e.solved && !e.shown && !e.nudged && e.tries >= NUDGE_AFTER; }

// The shape of a move from the engine's own events: how many times the hand picks up (a relay picks up again) and how many
// pits it takes from.
function shape(events) {
  const pickups = events.filter((e) => e.type === 'pickup').length;
  const taken = events.filter((e) => e.type === 'capture').reduce((n, e) => n + (e.pits ? e.pits.length : 0), 0);
  return { pickups, taken };
}

// { pits: [a, b] in pit order, answer, decoy, clue } — or null when the puzzle has fewer than three moves (two pits would be the answer).
export function nudgeOf(p) {
  if (!p || !p.state || p.answer === undefined || p.answer === null) return null;
  const legal = legalMoves(p.state); if (legal.length < 3 || !legal.includes(p.answer)) return null;
  const others = legal.filter((m) => m !== p.answer).map((m) => ({ m, r: attempt(p, m) })).filter((o) => !o.r.hit);
  if (!others.length) return null; // every pit solves it: nothing to narrow
  others.sort((a, b) => b.r.got - a.r.got || Math.abs(a.m - p.answer) - Math.abs(b.m - p.answer) || a.m - b.m);
  const decoy = others[0].m; const right = shape(attempt(p, p.answer).events), wrong = shape(others[0].r.events);
  const clue = right.pickups > 1 && right.pickups > wrong.pickups ? 'relay' : right.taken > 1 && right.taken > wrong.taken ? 'many' : 'land';
  // in pit order, so which one is the answer cannot be read from the order
  return { pits: [p.answer, decoy].sort((a, b) => a - b), answer: p.answer, decoy, clue };
}

export const CLUES = {
  relay: 'the right one picks up again where it lands',
  many: 'the right one takes from more than one pit',
  land: 'count where each one’s last seed lands',
};
// the line under the board while the nudge is up: "Mama Ngozi: one of these two — the right one picks up again where it lands"
export function nudgeLine(n, who = 'Mama Ngozi') { return n ? `${who}: one of these two — ${CLUES[n.clue] || CLUES.land}` : ''; }

// Remembered with the day, like "shown": the nudge comes back if the puzzle is opened again, and the solve says it had one.
export function markNudged(data, key, variant) {
  const k = `${key}:${variant}`; const was = data.days[k];
  return { days: { ...data.days, [k]: { ...(was || { got: 0, target: 0, tries: 0, solved: false }), nudged: true } }, solved: data.solved.slice() };
}
// the badge on a solve: "Solved" or "Solved · with a nudge" — only when the nudge came before the first solve
export function solvedBadge(e) { return e && e.nudged ? 'Solved · with a nudge' : 'Solved'; }
// the share line keeps it honest: "… · captured 9/9 · with a nudge"
export function nudgeShare(text, e) { if (!e || !e.nudged || !e.solved) return text; const [first, ...rest] = text.split('\n'); return [first + ' · with a nudge', ...rest].join('\n'); }
