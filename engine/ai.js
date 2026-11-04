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
  if (level === "master") return masterSearch(state).pit;
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

// ── Master (L7): the fifth strength, above Mama Ngozi. Iterative deepening alpha-beta (negamax) with a transposition
// table, the table's best move tried first, a better evaluation and a quicker win preferred to a slower one. It thinks
// for a fixed budget of positions (so the same position always gets the same answer, in a test or on any phone) with a
// clock as a backstop: on a slow phone the worker stops it at `ms` and plays the deepest search it finished.
export const MASTER = { nodes: 120000, ms: 1400, maxDepth: 40, contempt: 3, traps: 150000, sees: 8, tie: 1 };
const WIN = 1000;

// The position from the side to move, in seeds. Store difference first; then a little for seeds kept on your own side
// (they are yours at a stalemate call and yours to sow), a pit of 3 on their side your sowing could make 4 is a threat to
// them, one of 3 on yours is a threat to you; and in the end game whoever is closer to 25 is worth a touch more.
function masterEval(s) {
  const me = s.turn, you = 1 - me, P = s.pits;
  if (s.over) return s.winner === me ? WIN : s.winner === you ? -WIN : 0;
  let v = s.stores[me] - s.stores[you];
  const mine = me * 6, theirs = you * 6; let sm = 0, st = 0, t3m = 0, t3t = 0;
  for (let k = 0; k < 6; k++) { const a = P[mine + k], b = P[theirs + k]; sm += a; st += b; if (a === 3) t3m++; if (b === 3) t3t++; }
  const four = !s.rules || s.rules.capture === 4;
  v += (sm - st) * 0.12;
  if (four) v += (t3t - t3m) * 0.35; // with relay sowing a 3 rarely survives long; the side to move gets there first
  return v;
}

function ttKey(s) { return s.pits.join(',') + '|' + s.stores[0] + ',' + s.stores[1] + '|' + s.turn + '|' + (s.quiet >= 40 ? s.quiet : 0); }

// One master search. Returns {pit, value, depth, nodes} — value from the mover's side, in seeds (±1000 for a forced result).
export function masterSearch(state, opts = {}) {
  const cfg = { ...MASTER, ...opts };
  const now = opts.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const root = { ...state, moves: [] }; // the history is not part of the position; a short list keeps each move cheap
  const moves = legalMoves(root);
  if (!moves.length) return { pit: null, value: masterEval(root), depth: 0, nodes: 0 };
  if (moves.length === 1) return { pit: moves[0], value: 0, depth: 0, nodes: 0 };
  const me = root.turn; const tt = new Map(); const t0 = now(); let nodes = 0; let stop = false;
  let tick = 0; // the clock is read every 256 inner positions
  let out = () => { if (nodes >= cfg.nodes || ((++tick & 255) === 0 && now() - t0 > cfg.ms)) stop = true; return stop; };
  const kids = new Map(); // a position's children are made once per search, not once per depth
  function children(s, key) {
    let c = kids.get(key); if (c) return c;
    c = legalMoves(s).map((m) => ({ m, s: applyMove(s, m).state }));
    if (kids.size < 400000) kids.set(key, c);
    return c;
  }
  function nega(s, depth, alpha, beta, ply) {
    nodes++;
    if (s.over) { const e = masterEval(s); return e > 0 ? e - ply : e < 0 ? e + ply : (s.turn === me ? -cfg.contempt : cfg.contempt); } // a draw is worth a little less than nothing to Master: she plays to win
    if (depth === 0) return masterEval(s);
    if (out()) return 0;
    const key = ttKey(s); const hit = tt.get(key); const a0 = alpha;
    if (hit && hit.depth >= depth) {
      if (hit.flag === 0) return hit.value;
      if (hit.flag === 1 && hit.value >= beta) return hit.value;
      if (hit.flag === -1 && hit.value <= alpha) return hit.value;
    }
    const list = children(s, key);
    if (!list.length) return masterEval(s);
    const first = hit ? hit.move : -1;
    const order = first >= 0 ? [...list].sort((x, y) => (y.m === first) - (x.m === first)) : list;
    let best = -Infinity, bestMove = order[0].m;
    for (const { m, s: n } of order) {
      // a move hands the turn over (no extra turns in either game), so the child is scored from the other side
      const v = -nega(n, depth - 1, -beta, -alpha, ply + 1);
      if (stop) return 0;
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    tt.set(key, { depth, value: best, flag: best <= a0 ? -1 : best >= beta ? 1 : 0, move: bestMove });
    return best;
  }
  let done = { pit: moves[0], value: 0, depth: 0 }, doneScores = null;
  let rootOrder = moves.slice();
  for (let d = 1; d <= cfg.maxDepth; d++) {
    let alpha = -Infinity, bestPit = rootOrder[0]; const scores = new Map();
    for (const m of rootOrder) {
      const n = applyMove(root, m).state;
      // a window one seed below the best so far, so every move within a seed of the best gets its exact value (the ties)
      const v = -nega(n, d - 1, -Infinity, -(alpha - 1), 1);
      if (stop) break;
      scores.set(m, v);
      if (v > alpha) { alpha = v; bestPit = m; }
    }
    if (stop) break; // an unfinished depth is thrown away: play the deepest one finished
    done = { pit: bestPit, value: alpha, depth: d }; doneScores = scores;
    rootOrder = rootOrder.slice().sort((x, y) => scores.get(y) - scores.get(x) || x - y);
    if (Math.abs(alpha) >= WIN - 100) break; // a forced result is found: deeper search cannot change it
  }
  // Ties: when several moves are worth the same with best play (a level game is often a draw with best play), Master
  // picks the one that sets a trap — where the reply that LOOKS best to a player seeing a few moves less far than her
  // (cfg.sees, half-moves) in fact loses ground against her deeper search. A strong player at a real board does the same.
  if (doneScores && Math.abs(done.value) < WIN - 100 && cfg.traps) {
    const best = done.value; const ties = rootOrder.filter((m) => doneScores.get(m) >= best - cfg.tie);
    if (ties.length > 1) {
      stop = false; const budget = nodes + cfg.traps; const t1 = now(); const depth = Math.max(1, done.depth - 3);
      const saveOut = out; out = () => { if (nodes >= budget || ((++tick & 255) === 0 && now() - t1 > cfg.ms * 0.4)) stop = true; return stop; };
      const shallow = (s, d, a, b) => { // plain alpha-beta, no table: what a shallower player sees
        nodes++; if (s.over || d === 0) return masterEval(s);
        const ms = legalMoves(s); if (!ms.length) return masterEval(s);
        let bv = -Infinity; for (const m of ms) { const v = -shallow(applyMove(s, m).state, d - 1, -b, -a); if (v > bv) bv = v; if (v > a) a = v; if (a >= b) break; } return bv;
      };
      let pick = done.pit, gain = 0;
      for (const m of ties) {
        const n = applyMove(root, m).state; const replies = legalMoves(n); if (replies.length < 2) continue;
        let seen = null, sv = -Infinity; // the reply a shallower player would choose
        for (const r of replies) { const n2 = applyMove(n, r).state; const v = -shallow(n2, cfg.sees - 1, -Infinity, Infinity); if (v > sv) { sv = v; seen = n2; } }
        const v = nega(seen, depth, -Infinity, Infinity, 2); // and what it is really worth to Master
        if (stop) break;
        if (v - best > gain + 0.5) { gain = v - best; pick = m; }
      }
      out = saveOut;
      if (gain > 0) done = { ...done, pit: pick, trap: gain };
    }
  }
  return { ...done, nodes };
}
