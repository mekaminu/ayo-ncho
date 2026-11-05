// Waiting on you (idea 5 Nov): against the computer the opponent sat silent however long you thought — at a real board the
// person across from you says something, or drums their fingers on the wood. Now, on your move against the computer, after
// a while with no touch, click or key, they say a line of their own (Adaeze is impatient, Auntie Bisi approves of counting,
// Mama Ngozi has sold yams faster) and drum three times on the wood beside the board: three soft knocks, and the seeds in
// their fullest pit shiver with each one. Once a move, three times a game at most, never while a card, a screen, a turn on
// the board or another tab is up, never for two of us, a room, the puzzle or the lesson. Pure functions, tested in node.

import { owner } from '../engine/ayo.js';

export const FIRST_MS = 25000; // a long think, not a slow one: most moves take under 15 s even on Hard
export const PER_GAME = 3; // a nudge, never a nag
export const DRUM_GAP_MS = 120; // three fingers on the wood
export const DRUMS = 3;
export const SHIVER = 0.006; // how far the seeds lift with each drum, a quarter of the last 8's hop

// the face that goes with it: the child impatient, the cousin grinning, the elders calm (but the face still pops)
export const WAIT_MOOD = { easy: 'surprised', steady: 'calm', medium: 'happy', hard: 'calm', master: 'calm' };

// Whether the opponent should speak now. `o`:
//   computer — a game against the computer (not two of us, a room, the puzzle or the lesson)
//   yourMove — your move, nothing playing on the board (no turn, replay, clip), the game not over
//   blocked  — a card, a screen, the hint picking, or the page out of sight
//   idleMs   — since the last touch, click, key, or the start of your move, whichever is later
//   saidThisMove, saidThisGame — what has already been said
export function waitingDue(o) {
  if (!o || !o.computer || !o.yourMove || o.blocked) return false;
  if (o.saidThisMove || (o.saidThisGame || 0) >= PER_GAME) return false;
  return (o.idleMs || 0) >= FIRST_MS;
}

// The bookkeeping, kept apart from the page: `move` is the number of moves played (a new move resets the clock and the
// once-a-move), `game` the game's id (a new game resets everything), `stir()` any input.
export function makeWaiting(now = () => Date.now()) {
  const w = { since: now(), move: -1, game: null, thisMove: false, thisGame: 0, said: 0 };
  w.stir = () => { w.since = now(); };
  w.sync = (move, game) => {
    if (game !== w.game) { w.game = game; w.thisGame = 0; w.move = -1; }
    if (move !== w.move) { w.move = move; w.thisMove = false; w.since = now(); }
  };
  w.due = (o) => waitingDue({ ...o, idleMs: now() - w.since, saidThisMove: w.thisMove, saidThisGame: w.thisGame });
  w.spoke = () => { w.thisMove = true; w.thisGame++; w.said++; w.since = now(); };
  return w;
}

// Which of their pits shivers: their fullest (the later one in sowing order on a tie), or -1 on an empty side.
// Whose pit is whose is the engine's (owner), never worked out here.
export function drumPit(pits, them) {
  let best = -1;
  for (let i = 0; i < 12; i++) if (owner(i) === them && pits[i] > 0 && (best < 0 || pits[i] >= pits[best])) best = i;
  return best;
}

// the lift of a seat of seeds `t` ms into the drum: a quick lift and drop on each of the three knocks
export function shiverAt(t) {
  if (t < 0) return 0;
  const k = Math.floor(t / DRUM_GAP_MS); if (k >= DRUMS) return 0;
  const u = (t - k * DRUM_GAP_MS) / DRUM_GAP_MS; return u < 0.6 ? Math.sin((u / 0.6) * Math.PI) * SHIVER : 0;
}
export const DRUM_MS = DRUMS * DRUM_GAP_MS;
