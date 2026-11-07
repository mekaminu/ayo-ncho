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

// The week gets harder (from Mon 9 Nov 2026): Monday's and Tuesday's puzzles are gentle, Wednesday's and Thursday's steady,
// Friday's and Saturday's tricky, Sunday's hard — the way the newspaper puzzles go. How hard a position is, is read from the
// position itself (rate): the moves that fall short, whether only one pit does it, the relays the answer goes through (the hand
// is hard to follow), the moves that take something but not enough (they tempt), whether the fullest pit is NOT the answer
// (the first one a learner tries), and a big haul. Days before then keep the puzzle they always had (dailyPuzzle is the
// same as before for them), so a record or a share from those days still names the same position.
export const WEEKLY_FROM = "2026-11-09";
export const LEVEL_WORDS = ["gentle", "steady", "tricky", "hard"];
const STEPS = { ncho: [4, 5.5, 7.5], ayo: [5, 6.5, 7.5] }; // the score where steady, tricky and hard begin (about the quartiles of each game's positions)
const WEEK = [4, 1, 1, 2, 2, 3, 3]; // Sun … Sat
const WEEKLY_GAMES = 12;

// How hard the position is for the player to move: { score, level (1 gentle … 4 hard), target, answer, solvers, relays, decoys }.
export function rate(state) {
  const best = bestCapture(state); const L = legalMoves(state);
  let solvers = 0, decoys = 0, relays = 0;
  for (const m of L) {
    const r = applyMove(state, m); const got = r.state.stores[state.turn] - state.stores[state.turn];
    if (best.seeds > 0 && got >= best.seeds) { solvers++; relays = Math.max(relays, r.events.filter((e) => e.type === "pickup").length - 1); }
    else if (got > 0) decoys++;
  }
  const full = L.reduce((a, b) => (state.pits[b] > state.pits[a] ? b : a), L[0]);
  const fullWorks = full !== undefined && applyMove(state, full).state.stores[state.turn] - state.stores[state.turn] >= best.seeds;
  const score = (L.length - solvers) + (solvers === 1 ? 1 : 0) + Math.min(relays, 4) * 0.75 + decoys * 0.75 + (fullWorks ? 0 : 1) + (best.seeds >= 12 ? 1 : 0);
  const steps = STEPS[state.variant] || STEPS.ncho;
  const level = 1 + steps.filter((t) => score >= t).length;
  return { score, level, target: best.seeds, answer: best.pit, solvers, relays, decoys };
}
// The level the week asks of a day: 1 gentle (Mon, Tue) … 4 hard (Sun). Before WEEKLY_FROM, null (no ask).
export function weekLevel(key) {
  if (key < WEEKLY_FROM) return null;
  const [y, m, d] = key.split("-").map(Number); return WEEK[new Date(y, m - 1, d).getDay()];
}
export function levelWord(level) { return LEVEL_WORDS[Math.min(4, Math.max(1, level)) - 1]; }

// Returns { key, variant, state, target, answer, level, weekly } — `state` has player 0 to move. `level` is how hard it is
// (1–4, see rate); `weekly` says the day was chosen for the week's ramp (from WEEKLY_FROM).
export function dailyPuzzle(key = todayKey(), variant = "ncho") {
  const want = weekLevel(key);
  if (want !== null) { const w = weeklyPuzzle(key, variant, want); if (w) return w; }
  const p = classicPuzzle(key, variant); return { ...p, level: rate(p.state).level, weekly: false };
}

// From WEEKLY_FROM: random games seeded from the day; every position with player 0 to move (after the opening) and a capture of
// 4 or more is a candidate; of those at the day's level (else the nearest level) the biggest haul is the puzzle, as it always
// was ("capture N in one turn" is better the bigger N is), one of the biggest chosen by the day's seed when several tie.
function weeklyPuzzle(key, variant, want) {
  const rnd = rngFrom(daySeed(key + ":" + variant + ":week")); const found = [];
  for (let gn = 0; gn < WEEKLY_GAMES; gn++) {
    let g = newGame(variant);
    for (let ply = 0; ply < MAX_PLIES && !g.over; ply++) {
      if (g.turn === 0 && ply >= 6) { const r = rate(g); if (r.target >= 4) found.push({ state: g, ...r }); }
      const moves = legalMoves(g); if (!moves.length) break;
      g = applyMove(g, moves[Math.floor(rnd() * moves.length)]).state;
    }
  }
  if (!found.length) return null;
  const gap = (c) => Math.abs(c.level - want); const near = Math.min(...found.map(gap));
  const at = found.filter((c) => gap(c) === near); const top = Math.max(...at.map((c) => c.target));
  const pool = at.filter((c) => c.target === top); const c = pool[Math.floor(rnd() * pool.length)];
  return { key, variant, state: c.state, target: c.target, answer: c.answer, level: c.level, weekly: true };
}

// The puzzle as it was chosen up to 8 Nov 2026 (and still is for those days).
function classicPuzzle(key, variant) {
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
// From WEEKLY_FROM it says how hard the day's was ("· tricky").
export function shareText(puzzle, got) {
  const n = Math.max(puzzle.target, got); const row = Array.from({ length: Math.min(n, 16) }, (_, i) => (i < got ? "●" : "○")).join("");
  return `Ayo & Nchò daily · ${puzzle.key}${puzzle.weekly ? " · " + levelWord(puzzle.level) : ""} · captured ${got}/${puzzle.target}\n${row}`;
}
