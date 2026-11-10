// Walking away counts (idea 10 Nov, evening): your record and rating against the computer only moved when a game was played
// to its end, so a game you were losing could be dropped — Play → New game, or a rule changed mid-game — and it was as if it
// had never been played: the loss never reached the record, the run against them never broke, and the rating never came
// down. A player who started again whenever Mama Ngozi got ahead saw a number that crept up past what they can really do
// (the same creep "A fair rating" closed for Undo, web/rated.js). At a real board, pushing the board away while behind is
// giving the game up. Now a game against the computer that is ended while you trail — a few moves in, the same games Play
// already asks about (web/keepgame.js) — counts as a loss to that opponent in the record and, when it was rated (no move
// taken back), in the rating; the second tap of Play says so before it happens, and a toast says it was counted. A game
// ended while you lead or are level is simply left out, as before (dropping it cannot flatter you). Two of us, games with a
// friend, the puzzle and its play-outs are never counted, as everywhere else. Pure functions, no DOM (test/walkaway.test.js).
import { KEEP_MIN_MOVES, keptWords } from './keepgame.js';

// The game kept on this phone (as web/game.js keeps it: { moves, level, stats, local }) and its position replayed by the
// engine (`state`). Returns what to count — { level, you, them, id } — or null when walking away costs nothing.
// Against the computer you always sit at seat 0 (web/game.js seat(0)), so stores[0] is yours.
export function walkedOf(kept, state) {
  if (!kept || !state || state.over || kept.local) return null;
  if (!Array.isArray(state.moves) || state.moves.length < KEEP_MIN_MOVES) return null;
  const [you, them] = state.stores || [0, 0];
  if (!(you < them)) return null;
  const stats = kept.stats || {};
  return { level: kept.level || 'medium', you, them, id: stats.started ?? null, stats, first: state.first === 1 ? 1 : 0 };
}

// Play's words while it asks, when the game would count: the title stays "New game?" (web/keepgame.js askWords)
export function walkAsk(saved, name, { keys = false } = {}) {
  return {
    title: 'New game?',
    sub: `${keys ? 'Click' : 'Tap'} again — counts as a loss to ${name} (${keptWords(saved)})`,
    label: `Start a new game? Your game in progress counts as a loss to ${name} — ${keys ? 'press' : 'tap'} again to start one, or Continue to keep it`,
  };
}

// The word once it is counted, leading the new game's first toast: "Counted as a loss to Mama Ngozi (8–14)"
export function walkToast(w, name) { return `Counted as a loss to ${name} (${w.you}–${w.them})`; }
