// Play it out (idea 5 Nov): the daily puzzle asks for one move; then the position just sits there. Lichess and the chess
// apps offer "continue from here" against the computer once a puzzle is done, and an Ayo learner wants to know how a
// position like that goes on. Now, after your own move in the puzzle, the result card offers "Play it out vs <opponent>":
// the game carries on from exactly where the seeds lie, against the opponent chosen on Home, their reply first.
//
// The puzzle's position is a real game (engine/puzzle.js plays it out from the start), so its move list starts with the
// moves that made it. A play-out remembers how many those were (`from`) and what they were (`prefix`): the board is a
// play-out only while its moves still begin with them, so any other game that replaces it (a new game, Continue, a room,
// the lesson) is never taken for one. It is practice, so it stays out of what a real game keeps: it is not saved (your
// own game against the computer stays saved and Continue brings it back), it counts for no record, rating or who-starts,
// and the Game over card leaves out what reads the moves from the start of the game (the replay, the clip, how the game
// went, Mama Ngozi's review) — the moves before the puzzle were nobody's. Undo goes back as far as the puzzle and no further.

export function playoutOf(puzzleState) {
  const moves = (puzzleState && puzzleState.moves) || [];
  return { from: moves.length, prefix: moves.join(',') };
}

// Is the board (`state`) the play-out `po`?
export function isPlayout(po, state) {
  if (!po || !state || !Array.isArray(state.moves) || state.moves.length < po.from) return false;
  return state.moves.slice(0, po.from).join(',') === po.prefix;
}

// When the result card offers it: after a move of your own (not Mama Ngozi's shown move, not the lesson, not in a room),
// with the game still going and the other side to move.
export function canPlayOut({ played = false, mine = false, lesson = false, online = false, state } = {}) {
  return !!(played && mine && !lesson && !online && state && !state.over && state.turn === 1);
}

// Moves played since the puzzle (your puzzle move counts: it is the first of the play-out).
export function playedOut(po, state) { return isPlayout(po, state) ? state.moves.length - po.from : 0; }

// Undo in a play-out: the plan (web/takeback.js undoPlan) may keep the puzzle's position but go no further back.
export function undoOk(po, state, plan) {
  if (!plan) return false;
  if (!isPlayout(po, state)) return true;
  return plan.keep.length >= po.from;
}
// …and whether the Undo button has anything to take back: your move and their reply, both after the puzzle.
export function undoReady(po, state) { return !isPlayout(po, state) || playedOut(po, state) >= 2; }

// The words.
export const playoutButton = (name) => `Play it out vs ${name}`;
export const playoutToast = (name) => `Playing it out from today's puzzle — ${name}'s move`;
export const PLAYOUT_TAG = "from today's puzzle";
export const playoutEyebrow = (variant, n) => `${variant === 'ayo' ? 'Ayo' : 'Nchò'} · ${PLAYOUT_TAG} · ${n} move${n === 1 ? '' : 's'}`;
export function playoutShare(state, you, name) {
  const a = state.stores[you], b = state.stores[1 - you];
  const how = state.winner === 'draw' ? 'I drew with' : state.winner === you ? 'I beat' : 'I lost to';
  return `Ayo & Nchò — played out from today's puzzle, ${how} ${name} ${a}–${b}.`;
}
