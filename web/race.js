// The race to 25 (idea 6 Nov): the game is won at 25 seeds (engine/ayo.js WIN_SEEDS — more than half of 48), but the board
// only ever said "captured" under each score, so nobody could see at a glance how close either side was to the finish — the
// Oware apps all show the target. Now, once a side is 10 seeds or fewer from 25 and 25 is still within its reach, the small
// word under its score says "7 to win" instead of "captured", counting down as the score ticks up seed by seed; from 3 it
// turns brass. It reads only the two scores on the board and the seeds in play, so it follows every tick, replay and undo,
// and goes back to "captured" once 25 is out of reach (the other side has 24 or more) or the game is won.
import { WIN_SEEDS, TOTAL_SEEDS } from '../engine/ayo.js';

export const SHOW = 10;  // say it from this many seeds away
export const CLOSE = 3;  // brass from here

// mine / theirs: the scores as shown; total: the seeds in this game (48; the lesson's small board has fewer).
export function raceOf(mine, theirs, total = TOTAL_SEEDS) {
  mine = +mine || 0; theirs = +theirs || 0;
  const need = WIN_SEEDS - mine;
  if (need <= 0 || need > SHOW) return null;      // won already, or still far off
  if (total - theirs < WIN_SEEDS) return null;     // 25 cannot be reached any more: the other side holds 24 or more
  return { need, close: need <= CLOSE };
}

export function raceWords(r) { return r ? `${r.need} to win` : 'captured'; }

// When the label should glint: it has just appeared, or just come within CLOSE.
export function raceGlint(before, after) {
  if (!after) return false;
  if (!before) return true;
  return after.close && !before.close;
}
