// The last 8: in Nchò, once 8 seeds or fewer are left on the board, whoever captures next takes every seed still on it
// (and with fewer than 4 left the board is swept at once). Learners never see it coming, so the board says so: the moment
// the count drops to 8 or fewer the seeds still on the board hop and glint, a brass line under the board stays while it
// holds ("Last 8 · 6 seeds left · the next capture takes them all"), and the hint line says when a move would sweep them.
// Pure helpers here (tested in test/last8.test.js); nothing about the rules lives here — the engine does the sweep and
// marks it (a capture event with last8: true); this file only counts and words it.
import { RULES } from '../engine/ayo.js';

export const LAST = 8;

export function seedsLeft(state) { return state ? state.pits.reduce((a, b) => a + b, 0) : 0; }

function rulesOf(state) { return state.rules || RULES[state.variant] || RULES.ncho; }

// is the last-8 rule live on this position: the game plays it, it is not over, and 8 or fewer seeds are left on the board
export function inLast8(state) {
  if (!state || state.over || !rulesOf(state).last8) return false;
  const n = seedsLeft(state); return n > 0 && n <= LAST;
}

// did this move bring the board into the last 8 (the moment worth marking, once a game)
export function crossed(before, after) { return !!before && !inLast8(before) && inLast8(after); }

// the line under the board while it holds
export function last8Words(state) {
  const n = seedsLeft(state); // under the "Last 8" tag (the rule's name): "6 seeds left · the next capture takes them all"
  return `${n} seed${n === 1 ? '' : 's'} left · the next capture takes them all`;
}
export const LAST8_TITLE = 'Last 8';

// the sweep in a move's events, if there is one: { by, n, pits }
export function sweepOf(events) {
  const e = (events || []).find((x) => x.type === 'capture' && x.last8);
  return e ? { by: e.by, n: e.n, pits: e.pits.slice() } : null;
}

// the words for a sweep, from your seat: on the first tap ("the last 6 go to you") and after a turn ("the last 6 went to them")
export function sweepWords(sweep, { you = 0, played = false } = {}) {
  if (!sweep) return '';
  const who = sweep.by === you ? 'you' : 'them';
  return `the last ${sweep.n} ${played ? 'went' : 'go'} to ${who}`;
}

// what the moment says, for the screen reader and the toast
export function crossedWords(state) { return `${seedsLeft(state)} seeds left — the next capture takes them all`; }
