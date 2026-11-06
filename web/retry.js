// Try again from where it turned (idea 6 Nov): a game lost to the computer ended with the card saying who won, how the lead
// went and (with Gold) every move Mama Ngozi would have played differently — but the only way to play it again was from
// the start, forty moves away from the moment it went wrong. The chess apps all offer it ("retry from this position",
// Lichess's "practice from here"). Now, after a loss against the computer, the Game over card offers "Try again from move
// 14 · where it turned": the seeds fly back to where they lay before your move that let the game go, and you play on from
// there against the same opponent.
//
// Where it turned is read from the lead move by move (web/story.js, replayed through the engine): the move after which
// they led for good, and the last move of yours at or before it — the one that left it open. If that is too near the
// start to be worth going back to (move 1 or 2), the biggest swing against you is used the same way. Never for a win or
// a draw, a game with a friend, two of us, the puzzle or the lesson, and only with a few moves left to play after it.
//
// It is practice, the way a play-out from the daily puzzle is (web/playout.js — the same `from` / `prefix`, so it is only
// a retry while the board's moves still begin with the ones kept): not saved, no record, rating or who-starts, and the
// Game over card leaves out what reads the whole game (replay, clip, how it went, the review). The card then says how it
// went this time against last time, and offers the same move again. Pure functions (no DOM), tested in test/retry.test.js.
import { gameStory } from './story.js';

export const MIN_AT = 2; // move 3 at the earliest: going back to move 1 or 2 is just a new game
export const MIN_LEFT = 2; // and at least your move and their answer to play from there

// Where to go back to in a finished game `moves` you lost from seat `you`: { at, n, then: [yours, theirs] } — `at` is the
// index of your move (the board goes back to just before it, your move), `n` its number as people count — or null.
export function turnPoint(moves, variant = 'ncho', rules = {}, you = 0) {
  if (!Array.isArray(moves) || moves.length < MIN_AT + MIN_LEFT) return null;
  const st = gameStory(moves, variant, rules, you);
  if (!(st.final < 0)) return null; // a loss only
  const mineAtOrBefore = (k) => { for (let i = k; i >= 0; i--) if (st.turns[i].mover === you) return i; return -1; };
  let at = st.forGood === null ? -1 : mineAtOrBefore(st.forGood);
  if (at < MIN_AT) {
    let worst = null; for (const t of st.turns) if (t.swing < 0 && (!worst || t.swing < worst.swing)) worst = t;
    at = worst ? mineAtOrBefore(worst.index) : -1;
  }
  if (at < MIN_AT || moves.length - at < MIN_LEFT) return null;
  return { at, n: at + 1, lead: st.leads[at] };
}

// The retry itself, kept while it is played: shaped like a play-out (web/playout.js isPlayout reads `from` / `prefix`), with
// the move number and how the game it came from ended ([yours, theirs]).
export function retryOf(moves, point, last) {
  const kept = moves.slice(0, point.at);
  return { kind: 'retry', from: kept.length, prefix: kept.join(','), n: point.n, last: [last[0], last[1]] };
}
export const isRetry = (po) => !!po && po.kind === 'retry';

// When the Game over card offers it: against the computer, a game you lost, not a friend's room, two of us, the puzzle or
// the lesson. A retry that is lost (or won) offers the same move again, so the point travels with it.
export function retryOffer({ online = false, local = false, puzzle = false, lesson = false, state, you = 0, retry = null } = {}) {
  if (online || local || puzzle || lesson || !state || !state.over) return null;
  if (isRetry(retry)) return { at: retry.from, n: retry.n, again: true };
  if (state.winner === you || state.winner === 'draw') return null;
  return turnPoint(state.moves, state.variant, state.rules, you);
}

// The words.
export const retryButton = (n) => `Try again from move ${n} · where it turned`;
export const retryToast = (n) => `Back to move ${n}, where it turned — your move`;
export const retryEyebrow = (variant, n, played) => `${variant === 'ayo' ? 'Ayo' : 'Nchò'} · from move ${n} of your last game · ${played} move${played === 1 ? '' : 's'}`;
export const retryLine = (last, now) => `last time ${last[0]}–${last[1]} · this time ${now[0]}–${now[1]}`;
export function retryShare(state, you, name, retry) {
  const a = state.stores[you], b = state.stores[1 - you]; const [x, y] = retry.last;
  const how = state.winner === 'draw' ? `this time a draw, ${a}–${b}` : state.winner === you ? `this time I won ${a}–${b}` : `I lost again, ${a}–${b}`;
  return `Ayo & Nchò — I went back to move ${retry.n} of a game I lost ${x}–${y} to ${name}: ${how}.`;
}
