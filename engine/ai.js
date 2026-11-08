// Computer opponent: minimax with alpha-beta pruning over the shared rules engine.
import { applyMove, legalMoves, seedsOnSide, opponent, WIN_SEEDS } from "./ayo.js";

export const LEVELS = {
  easy:   { depth: 1, noise: 3.0 },   // plays like a child: shallow, a bit random
  steady: { depth: 3, noise: 1.5 },   // Auntie Bisi: counts a move and its answer, not much further (between Easy and Medium)
  medium: { depth: 4, noise: 0.6 },
  hard:   { depth: 9, noise: 0.0, vary: 0.001 }, // no noise; `vary`: in a game, moves exactly as good as her best are all hers to play (playMove)
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

// Who is ahead (idea 8 Nov): Mama Ngozi's count of a position, from seat 0's side — what the brass bead on the board's centre
// line shows. `v` is in seeds: the store difference her search (9 half-moves, no noise) expects with best play from here,
// averaged with the same search one half-move shorter, so the count does not swing back and forth with whose reply the search
// happens to end on. `decided` is +1 / -1 when she sees a forced win for seat 0 / seat 1 (the search reached the end of the
// game), and the same at a finished game (with `over`); 0 otherwise, a draw included.
export function leanOf(state) {
  if (state.over) return { v: state.stores[0] - state.stores[1], decided: state.winner === 0 ? 1 : state.winner === 1 ? -1 : 0, over: true };
  const moves = legalMoves(state); const sg = state.turn === 0 ? 1 : -1, me = state.turn;
  if (!moves.length) return { v: state.stores[0] - state.stores[1], decided: 0 };
  const best = (depth) => { let b = -Infinity; for (const m of moves) { const { state: n } = applyMove(state, m); b = Math.max(b, search(n, depth - 1, -Infinity, Infinity, me)); } return b; };
  const deep = best(LEVELS.hard.depth);
  if (Math.abs(deep) >= 1000) return { v: sg * Math.sign(deep), decided: sg * Math.sign(deep) };
  const near = best(LEVELS.hard.depth - 1);
  const v = Math.abs(near) >= 1000 ? deep : (deep + near) / 2;
  return { v: Math.round(sg * v * 10) / 10 || 0, decided: 0 };
}

// The move the opponent plays in a game (the worker's answer to "your move"). The same as chooseMove, except at a level with
// `vary` (Mama Ngozi): with no noise she would play the same move in the same position every time, so a game won against her
// could be won again by copying it move for move, and two games that open alike stay alike. Here she picks at random among the
// moves her own search scores exactly as high as her best (within `vary`, a thousandth of a seed: ties only, which she used to
// break by taking the lowest pit). A move worse than that is never played, and a decided position (a forced win or loss in
// sight) gets her best, as before. Measured (7 Nov) against her old self: even over both games (Nchò 16–28–52 of 96, Ayo 16–7–1
// of 24), Nnamdi beaten as before (81–1–14 of 96 in Nchò, her old self 84–0–12), and against a player who repeats the same moves two games in three now go their own way.
// Half a seed of leeway was tried and cost her real strength (3–13 against her old self in Nchò), so ties only.
// chooseMove itself stays as it was: the hint, her take, the review and Master's model of her all ask for her one best move.
export function playMove(state, level = "medium", rng = Math.random) {
  const cfg = LEVELS[level];
  if (!cfg || !cfg.vary) return chooseMove(state, level, rng);
  const rated = rateMoves(state, level);
  if (!rated.length) return null;
  return pickNear(rated, cfg.vary, rng);
}
// From a rated list (best first), one of the moves within `tol` seeds of the best, each as likely; the best when it is decided.
export function pickNear(rated, tol, rng = Math.random) {
  const best = rated[0].value;
  if (Math.abs(best) >= 1000) return rated[0].pit;
  const near = rated.filter((r) => r.value >= best - tol - 1e-9);
  return near[Math.min(near.length - 1, Math.floor(rng() * near.length))].pit;
}

// ── Master (L7): the fifth strength, above Mama Ngozi. Iterative deepening alpha-beta (negamax) with a transposition
// table, the table's best move tried first, a better evaluation and a quicker win preferred to a slower one. It thinks
// for a fixed budget of positions (so the same position always gets the same answer, in a test or on any phone) with a
// clock as a backstop: on a slow phone the worker stops it at `ms` and plays the deepest search it finished.
// side/three: his evaluation (seeds kept on his side; 3s that could become 4s — measured at 0 over the match).
// sees/seeSide/seeThree: the player he sets traps for counts 9 half-moves and weighs store and side seeds like Mama Ngozi.
// hope: when his best with best play is a draw or worse, moves up to this many seeds worse are trap candidates too;
// risk: a move worse with best play must promise that much more per seed it gives up (L7, slice 2).
export const MASTER = { nodes: 120000, ms: 1400, maxDepth: 40, contempt: 3, traps: 150000, sees: 9, tie: 1, side: 0.35, three: 0, seeSide: 0.08, seeThree: 0, hope: 6, risk: 0.5 };
const WIN = 1000;

// The position from the side to move, in seeds. Store difference first; then a little for seeds kept on your own side
// (they are yours at a stalemate call and yours to sow), a pit of 3 on their side your sowing could make 4 is a threat to
// them, one of 3 on yours is a threat to you; and in the end game whoever is closer to 25 is worth a touch more.
function masterEval(s, w = MASTER) {
  const me = s.turn, you = 1 - me, P = s.pits;
  if (s.over) return s.winner === me ? WIN : s.winner === you ? -WIN : 0;
  let v = s.stores[me] - s.stores[you];
  const mine = me * 6, theirs = you * 6; let sm = 0, st = 0, t3m = 0, t3t = 0;
  for (let k = 0; k < 6; k++) { const a = P[mine + k], b = P[theirs + k]; sm += a; st += b; if (a === 3) t3m++; if (b === 3) t3t++; }
  const four = !s.rules || s.rules.capture === 4;
  v += (sm - st) * w.side;
  if (four) v += (t3t - t3m) * w.three; // with relay sowing a 3 rarely survives long; the side to move gets there first
  return v;
}

function ttKey(s) { return s.pits.join(',') + '|' + s.stores[0] + ',' + s.stores[1] + '|' + s.turn + '|' + (s.quiet >= 40 ? s.quiet : 0); }

// The move a player who counts `sees` half-moves ahead would choose, weighing positions with `w` (plain alpha-beta, no
// table, first of equals). With sees 9 and Mama Ngozi's weights it is exactly her move: the player Master sets traps for.
// `count` is called for every position looked at; when it returns true the look is abandoned and null comes back.
const STOP = {};
export function counterReply(s, sees, w, count = () => false) {
  const look = (p, d, a, b) => {
    if (count()) throw STOP; if (p.over || d === 0) return masterEval(p, w);
    const ms = legalMoves(p); if (!ms.length) return masterEval(p, w);
    let bv = -Infinity; for (const m of ms) { const v = -look(applyMove(p, m).state, d - 1, -b, -a); if (v > bv) bv = v; if (v > a) a = v; if (a >= b) break; } return bv;
  };
  let best = null, bv = -Infinity;
  try { for (const m of legalMoves(s)) { const v = -look(applyMove(s, m).state, sees - 1, -Infinity, Infinity); if (v > bv) { bv = v; best = m; } } }
  catch (e) { if (e === STOP) return null; throw e; }
  return best;
}

// One master search. Returns {pit, value, depth, nodes} — value from the mover's side, in seeds (±1000 for a forced result).
export function masterSearch(state, opts = {}) {
  const cfg = { ...MASTER, ...opts };
  const now = opts.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const root = { ...state, moves: [] }; // the history is not part of the position; a short list keeps each move cheap
  const moves = legalMoves(root);
  if (!moves.length) return { pit: null, value: masterEval(root, cfg), depth: 0, nodes: 0 };
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
    if (s.over) { const e = masterEval(s, cfg); return e > 0 ? e - ply : e < 0 ? e + ply : (s.turn === me ? -cfg.contempt : cfg.contempt); } // a draw is worth a little less than nothing to Master: she plays to win
    if (depth === 0) return masterEval(s, cfg);
    if (out()) return 0;
    const key = ttKey(s); const hit = tt.get(key); const a0 = alpha;
    if (hit && hit.depth >= depth) {
      if (hit.flag === 0) return hit.value;
      if (hit.flag === 1 && hit.value >= beta) return hit.value;
      if (hit.flag === -1 && hit.value <= alpha) return hit.value;
    }
    const list = children(s, key);
    if (!list.length) return masterEval(s, cfg);
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
  const win = Math.max(1, cfg.tie, cfg.hope || 0); // moves within this much of the best get exact values (the trap candidates)
  for (let d = 1; d <= cfg.maxDepth; d++) {
    let alpha = -Infinity, bestPit = rootOrder[0]; const scores = new Map();
    for (const m of rootOrder) {
      const n = applyMove(root, m).state;
      // a window `win` seeds below the best so far, so every move that close to the best gets its exact value (the trap candidates)
      const v = -nega(n, d - 1, -Infinity, -(alpha - win), 1);
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
  // picks the one that sets a trap — where the reply that LOOKS best to a player seeing a few moves less far than him
  // (cfg.sees, half-moves) in fact loses ground against his deeper search. A strong player at a real board does the same.
  // When his best is only a draw or worse (a bad opening), he looks further down the list (cfg.hope) for a move whose
  // likely reply turns it round, paying cfg.risk for every seed the move gives up against best play.
  if (doneScores && Math.abs(done.value) < WIN - 100 && cfg.traps) {
    const best = done.value; const tol = cfg.tie + (best <= 0 ? (cfg.hope || 0) : 0); const ties = rootOrder.filter((m) => doneScores.get(m) >= best - tol);
    if (ties.length > 1) {
      stop = false; const budget = nodes + cfg.traps; const t1 = now(); const depth = Math.max(1, done.depth - (cfg.tdrop ?? 3));
      const saveOut = out; out = () => { if (nodes >= budget || ((++tick & 255) === 0 && now() - t1 > cfg.ms * 0.4)) stop = true; return stop; };
      const see = { side: cfg.seeSide ?? cfg.side, three: cfg.seeThree ?? cfg.three };
      const count = () => { nodes++; return out(); };
      let pick = done.pit, gain = 0;
      for (const m of ties) {
        const n = applyMove(root, m).state; const replies = legalMoves(n); if (replies.length < 2) continue;
        const reply = counterReply(n, cfg.sees, see, count); if (reply === null) break; // the reply a shallower player would choose
        const seen = applyMove(n, reply).state;
        const v = nega(seen, depth, -Infinity, Infinity, 2); // and what it is really worth to Master
        if (stop) break;
        const g = v - best - (cfg.risk || 0) * (best - doneScores.get(m)); // a move worse with best play must promise more
        if (g > gain + 0.5) { gain = g; pick = m; }
      }
      out = saveOut;
      if (gain > 0) done = { ...done, pit: pick, trap: gain };
    }
  }
  return { ...done, nodes };
}
