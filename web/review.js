// Mama Ngozi's review of a whole game (Gold, L9): from the Game over card she goes back over every move you played, and for
// each one where a clearly better pit was there (the same bar as her take under the board: web/coach.js) the board shows
// the position you moved from, her pit's path and the move played through slowly; Next and Back step through them.
// Pure functions, no DOM. The positions are rebuilt by the engine from the game's own moves, the ratings come from the
// engine's search (engine/ai.js rateMoves at the hard level, asked of the worker one position at a time), so nothing
// about the rules lives here.
import { applyMove, replay, legalMoves } from '../engine/ayo.js';
import { takeOn, takeWords, NAME } from './coach.js';
import { sowPath, pitName } from './path.js';

export { NAME };

// The moves of yours to look at: every position in the game where `seat` was to move with a real choice (two or more legal
// pits — a forced move is never a mistake). { index, before, played } in the order played.
export function reviewPlan(moves, variant = 'ncho', rules = {}, first = 0, seat = 0) {
  const out = []; let s = replay([], variant, rules, first);
  for (let i = 0; i < moves.length; i++) {
    if (s.over) break;
    if (s.turn === seat && legalMoves(s).length > 1) out.push({ index: i, before: s, played: moves[i] });
    s = applyMove(s, moves[i]).state;
  }
  return out;
}

// One entry of the plan with its rating (rateMoves on `before`): null when your move was the move (or near enough);
// otherwise everything the board needs to show it — her pit, its path and events on the position you moved from — and
// the words, from your seat.
export function reviewItem(entry, rated, { you = 0 } = {}) {
  if (!entry || !rated) return null;
  const take = takeOn(rated, entry.played); if (!take) return null;
  const path = sowPath(entry.before, take.pit); if (!path) return null;
  const mine = sowPath(entry.before, entry.played);
  return {
    index: entry.index, move: entry.index + 1, before: entry.before, played: entry.played, pit: take.pit, take, path,
    events: applyMove(entry.before, take.pit).events, mine,
    words: takeWords(take, path, { you }), playedWords: `you played ${pitName(entry.played, you)}${mine && mine.got ? ` (took ${mine.got})` : ''}`,
  };
}

// The whole review from the plan and its ratings (one rated list per plan entry, in order): the moves she would change.
export function reviewOf(plan, rateds, opts = {}) {
  return plan.map((e, k) => reviewItem(e, rateds[k], opts)).filter(Boolean);
}

// The line on the Game over card: while she is still going over the game, then how many moves she would change.
export function summaryWords(items, { done = true, seen = 0, total = 0, locked = false } = {}) {
  if (!done) return total ? `going over the game… ${seen} of ${total}` : 'going over the game…';
  const n = items.length;
  const what = n === 0 ? 'every move as she would have played it' : n === 1 ? 'one move she would have played differently' : `${n} moves she would have played differently`;
  return locked ? `${what} · in Gold` : what;
}

// The words under the board for step k of n: "1 of 3 · move 7 · you played your pit 5 · your pit 3 was the move · takes 8 · 6 seeds better".
export function stepWords(item, k, n) {
  if (!item) return '';
  return `${k + 1} of ${n} · move ${item.move} · ${item.playedWords} · ${item.words}`;
}

// What she says as the review opens, and at its end.
export const OPEN_LINES = ['Sit. We go over it together.', 'Let us count it again, slowly.', 'Every seed has a reason. Look.'];
export const CLEAN_LINE = 'Nothing to change. I would have played it the same.';
export const END_LINE = 'That is all. Next game, count twice.';
