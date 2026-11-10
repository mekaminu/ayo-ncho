// A side run dry (idea 10 Nov, midday). When the player to move has no seeds left and the other side could not (or did not
// have to) give them any, the engine ends the game there and the other side keeps every seed still on its own side (finish()
// in engine/ayo.js). The board flew those seeds into that trough (sweepLeft in game.js) but nothing said why: in Ayo about one
// game in nine ends this way (one in sixty in Nchò), often by those very seeds — 23–22 on the board, then three seeds fly and
// the card says 23–25. Now the first tap on a move that does it says so, their move explained says so, the board says it as
// the seeds go, the Game over card's top line says it, and How to play has the rule.
// Pure functions, no DOM. Nothing about the rule lives here: the engine ends the game and moves the seeds; this file reads the
// move's own events and the stores before and after, and words it.
import { applyMove, replay, opponent, seedsOnSide, WIN_SEEDS, QUIET_LIMIT } from '../engine/ayo.js';

// The run-dry ending a move made, from the position before it, the position after and the move's events:
// { empty (the seat left with nothing to play), keeper (the seat that keeps its side), n (the seeds it kept), fed (false when
// the empty side was already empty before the move: the mover had no move that could reach them) }, else null.
// A game won on 25 by the move's own captures, a game given up or agreed, the 60-move call, and an ending that keeps no seed
// (the board already empty) are not this.
export function dryOf(before, after, events) {
  if (!before || !after || !after.over || after.resigned != null || after.agreed || (after.quiet || 0) >= QUIET_LIMIT) return null;
  const caps = [0, 0]; for (const e of events || []) if (e.type === 'capture') caps[e.by] += e.n;
  const won = [before.stores[0] + caps[0], before.stores[1] + caps[1]];
  if (won[0] >= WIN_SEEDS || won[1] >= WIN_SEEDS) return null;
  const empty = after.turn, keeper = opponent(empty); const n = after.stores[keeper] - won[keeper];
  if (n <= 0) return null;
  return { empty, keeper, n, fed: seedsOnSide(before, empty) > 0 };
}

// The same for a finished game (the Game over card, a reload): its last move played again from the one before.
export function dryEnd(state) {
  if (!state || !state.over || !state.moves || !state.moves.length || state.resigned != null || state.agreed) return null;
  try {
    const before = replay(state.moves.slice(0, -1), state.variant, state.rules, state.first || 0);
    const r = applyMove(before, state.moves[state.moves.length - 1]);
    // a game that did not start from the deal (the daily puzzle, the lesson, a play-out from them) does not replay from its
    // moves: only a replay that lands exactly where the game is speaks for it
    if (r.state.pits.some((n, i) => n !== state.pits[i]) || r.state.stores[0] !== state.stores[0] || r.state.stores[1] !== state.stores[1]) return null;
    return dryOf(before, r.state, r.events);
  } catch (e) { return null; }
}

// The hint line (first tap: you are the mover, so they are the side left dry) and their move explained (they played it):
// two parts, joined by " · " with the rest of the line.
export function dryWords(d, { you = 0, played = false } = {}) {
  if (!d) return '';
  const mine = d.keeper === you;
  if (played) return mine ? `left them nothing to play · you keep the ${d.n} on your side` : `left you nothing to play · they keep the ${d.n} on their side`;
  return mine ? `leaves them nothing to play · you keep the ${d.n} on your side` : `leaves you nothing to play · they keep the ${d.n} on their side`;
}

// What the board says as the kept seeds fly (a toast). `names`: the two seats' names; `you`: the seat nearest (null for a
// game watched, or two of us, where both are named).
export function dryMoment(d, { you = 0, names = ['You', 'They'] } = {}) {
  if (!d) return '';
  if (you === null) return `No seeds left on ${names[d.empty]}'s side — ${names[d.keeper]} keeps the ${d.n} on their side`;
  return d.empty === you ? `No seeds left on your side — ${names[d.keeper]} keeps the ${d.n} on their side` : `No seeds left on ${names[d.empty]}'s side — you keep the ${d.n} on yours`;
}

// The Game over card's top line: "Ayo · 41 moves · their side ran dry".
// `you` null (two of us): the side is named.
export function dryEnded(d, { you = 0, names = [] } = {}) {
  if (!d) return '';
  if (you === null) return `${names[d.empty]}'s side ran dry`;
  return d.empty === you ? 'your side ran dry' : 'their side ran dry';
}

// How to play's line (web/rulesays.js), after the feed rule.
export const DRY_RULE = 'If it is your turn and you have no seeds, the game ends: the other side keeps the seeds still on theirs.';
