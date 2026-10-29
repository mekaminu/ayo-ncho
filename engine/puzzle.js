// Daily puzzle: one position a day, the same for everyone, seeded from the date.
// We play random legal moves from the start under the game's rules, and at each step ask what the best
// single move captures. The position where that is largest (and at least MIN_TARGET) becomes the puzzle:
// "capture N in one turn". Deterministic, so a day's puzzle is identical on every device.
import { newGame, applyMove, legalMoves } from "./ayo.js";

const MIN_TARGET = 6, MAX_PLIES = 40;

function rngFrom(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function daySeed(dateStr) { let h = 2166136261; for (const ch of dateStr) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function todayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

// The best capture available to the player to move, as {pit, seeds}.
export function bestCapture(state) {
  let best = { pit: null, seeds: 0 };
  for (const m of legalMoves(state)) {
    const { state: next } = applyMove(state, m);
    const got = next.stores[state.turn] - state.stores[state.turn];
    if (got > best.seeds) best = { pit: m, seeds: got };
  }
  return best;
}

// Returns { key, state, target, answer } — `state` has player 0 to move.
export function dailyPuzzle(key = todayKey(), variant = "ncho") {
  const rnd = rngFrom(daySeed(key + ":" + variant));
  let g = newGame(variant); let pick = null;
  for (let ply = 0; ply < MAX_PLIES && !g.over; ply++) {
    if (g.turn === 0 && ply >= 6) {
      const b = bestCapture(g);
      if (b.seeds >= MIN_TARGET && (!pick || b.seeds > pick.target)) pick = { state: g, target: b.seeds, answer: b.pit };
    }
    const moves = legalMoves(g); if (!moves.length) break;
    g = applyMove(g, moves[Math.floor(rnd() * moves.length)]).state;
  }
  if (!pick) { // a quiet day: keep replaying with the next seed until a position with a capture turns up
    let tries = 0;
    while (!pick && tries++ < 20) {
      const r2 = rngFrom(daySeed(key + ":" + variant + ":" + tries)); g = newGame(variant);
      for (let ply = 0; ply < MAX_PLIES && !g.over; ply++) {
        if (g.turn === 0 && ply >= 4) { const b = bestCapture(g); if (b.seeds >= 1 && (!pick || b.seeds > pick.target)) pick = { state: g, target: b.seeds, answer: b.pit }; }
        const moves = legalMoves(g); if (!moves.length) break;
        g = applyMove(g, moves[Math.floor(r2() * moves.length)]).state;
      }
    }
  }
  return { key, variant, state: pick.state, target: pick.target, answer: pick.answer };
}

// Score a single attempt: seeds captured by player 0 with that move.
export function attempt(puzzle, pit) {
  const { state, events } = applyMove(puzzle.state, pit);
  return { got: state.stores[0] - puzzle.state.stores[0], hit: state.stores[0] - puzzle.state.stores[0] >= puzzle.target, events, state };
}

// A shareable line: date, result, and a row of seeds (filled = captured, hollow = short of the target).
export function shareText(puzzle, got) {
  const n = Math.max(puzzle.target, got); const row = Array.from({ length: Math.min(n, 16) }, (_, i) => (i < got ? "●" : "○")).join("");
  return `Ayo & Nchò daily · ${puzzle.key} · captured ${got}/${puzzle.target}\n${row}`;
}
