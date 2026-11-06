// The game is circling: after 60 moves with no capture the engine calls the game (QUIET_LIMIT in engine/ayo.js) and each
// side keeps the seeds on its own side. Late in a game the last few seeds can just go round and round, and the call came out
// of nowhere — nobody at the board had counted the quiet moves. So, from 12 moves before the call, the board says so: a
// brass line under the board ("Circling · 12 moves with no capture and it ends · each keeps their side: you'd win 26–22"),
// the number ticking down move by move, gone the moment someone captures; the move it starts on sends a slow ripple round
// the board through every pit still holding seeds, the way they have been going round. The first tap on a pit says when
// the move would be the one that ends it, and the Game over card says why the game ended.
// Pure helpers here (tested in test/circling.test.js); nothing about the rules lives here: the engine counts the quiet
// moves and ends the game; this file only reads `quiet` and words it.
import { QUIET_LIMIT, seedsOnSide } from '../engine/ayo.js';

export const WARN = 12; // the line comes up with this many quiet moves left before the call

// moves left before the call on this position, or null when the game is not circling (over, or a capture not long ago)
export function movesLeft(state) {
  if (!state || state.over) return null;
  const left = QUIET_LIMIT - (state.quiet || 0);
  return left > 0 && left <= WARN ? left : null;
}

// what each side would have if the game were called now: its store plus the seeds on its own side
export function keeps(state) { return [0, 1].map((p) => state.stores[p] + seedsOnSide(state, p)); }

// the position is circling: { left, keeps, winner } (winner as the engine would call it: 0, 1 or 'draw'), else null
export function circling(state) {
  const left = movesLeft(state); if (left === null) return null;
  const k = keeps(state);
  return { left, keeps: k, winner: k[0] === k[1] ? 'draw' : k[0] > k[1] ? 0 : 1 };
}

// did this move start the circling (the moment worth marking): the line was not up before and is now
export function began(before, after) { return !!before && movesLeft(before) === null && movesLeft(after) !== null; }

// did this game end by the call (no capture for QUIET_LIMIT moves), rather than by 25 seeds, a side run dry or giving up
export function endedCircling(state) { return !!state && state.over && state.resigned == null && !state.agreed && (state.quiet || 0) >= QUIET_LIMIT; }

// who would win, from your seat: "you'd win 26–22" / "you'd lose 21–27" / "level 24–24"; `me` / `other` name the sides
// when the near player is not "you" (two of us: "Player 2 would win 26–22")
export function standWords(c, { you = 0, me = null } = {}) {
  const a = c.keeps[you], b = c.keeps[1 - you];
  if (c.winner === 'draw') return `level ${a}–${b}`;
  const lead = Math.max(a, b), trail = Math.min(a, b);
  if (me) return c.winner === you ? `${me} would win ${a}–${b}` : `${me} would lose ${a}–${b}`;
  return c.winner === you ? `you'd win ${lead}–${trail}` : `you'd lose ${trail}–${lead}`;
}

// the line under the board while it holds (under the "Circling" tag); the number rides in front in its own place so it can
// tick, so `circlingRest` is the line after it
export function circlingRest(c, opts = {}) {
  if (!c) return '';
  return `move${c.left === 1 ? '' : 's'} with no capture and it ends · each keeps their side: ${standWords(c, opts)}`;
}
export function circlingWords(c, opts = {}) { return c ? `${c.left} ${circlingRest(c, opts)}` : ''; }
export const CALLING = 3; // the last few moves before the call: the line's edge turns ember
export const CIRCLING_TITLE = 'Circling';

// the hint line's words for a move that is the one the game is called on (path.js adds it on the first tap and after a turn)
export function calledWords() { return `no capture in ${QUIET_LIMIT} moves — each keeps their side`; }

// the Game over card's top line, when the game was called
export function endedWords() { return `no capture in ${QUIET_LIMIT} moves`; }

// for the screen reader and the toast, the moment it starts
export function beganWords(c) { return `The seeds are circling — ${c.left} moves with no capture and the game ends; each keeps the seeds on their side`; }
