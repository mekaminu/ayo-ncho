// Computer opponent: minimax with alpha-beta pruning over the shared rules engine.
import { applyMove, legalMoves, seedsOnSide, opponent, WIN_SEEDS } from "./ayo.js";

export const LEVELS = {
  easy:   { depth: 1, noise: 3.0 },   // plays like a child: shallow, a bit random
  medium: { depth: 4, noise: 0.6 },
  hard:   { depth: 9, noise: 0.0 },
};

function evaluate(state, me) {
  const you = opponent(me);
  if (state.over) {
    if (state.winner === me) return 1000;
    if (state.winner === you) return -1000;
    return 0;
  }
  const storeDiff = state.stores[me] - state.stores[you];
  // seeds on my side are mine to sow; a nearly-empty opponent side is a pressure point
  const sideDiff = (seedsOnSide(state, me) - seedsOnSide(state, you)) * 0.08;
  return storeDiff + sideDiff;
}

function search(state, depth, alpha, beta, me) {
  if (depth === 0 || state.over) return evaluate(state, me);
  const moves = legalMoves(state);
  if (moves.length === 0) return evaluate(state, me);
  const maximising = state.turn === me;
  let best = maximising ? -Infinity : Infinity;
  for (const m of moves) {
    const { state: next } = applyMove(state, m);
    const v = search(next, depth - 1, alpha, beta, me);
    if (maximising) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
    else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

// Returns the pit index the computer plays, or null if it has no move.
export function chooseMove(state, level = "medium", rng = Math.random) {
  const cfg = LEVELS[level] || LEVELS.medium;
  const moves = legalMoves(state);
  if (!moves.length) return null;
  const me = state.turn;
  let bestMove = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const { state: next } = applyMove(state, m);
    let v = search(next, cfg.depth - 1, -Infinity, Infinity, me);
    if (cfg.noise) v += (rng() - 0.5) * 2 * cfg.noise;
    if (v > bestScore) { bestScore = v; bestMove = m; }
  }
  return bestMove;
}

// Every legal move rated at a level's depth, best first (ties by pit), with none of the level's noise: the coach's view of a
// position. The first entry is the move chooseMove would play at that level with its noise off; `value` is in seeds (store
// difference for the player to move after the search), ±1000 for a forced win or loss.
export function rateMoves(state, level = "hard") {
  const cfg = LEVELS[level] || LEVELS.hard;
  const me = state.turn;
  return legalMoves(state)
    .map((m) => { const { state: next } = applyMove(state, m); return { pit: m, value: search(next, cfg.depth - 1, -Infinity, Infinity, me) }; })
    .sort((a, b) => b.value - a.value || a.pit - b.pit);
}
