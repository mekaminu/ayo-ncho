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
  if (want !== null) { const w = weeklyPuzzle(key, variant, want, rerollOf(key, variant)); if (w) return w; }
  const p = classicPuzzle(key, variant); return { ...p, level: rate(p.state).level, weekly: false };
}

// From WEEKLY_FROM: random games seeded from the day; every position with player 0 to move (after the opening) and a capture of
// 4 or more is a candidate; of those at the day's level (else the nearest level) the biggest haul is the puzzle, as it always
// was ("capture N in one turn" is better the bigger N is), one of the biggest chosen by the day's seed when several tie.
// `roll` (0 for most days) deals the day's random games again from another seed: see REROLLS.
export function weeklyPuzzle(key, variant, want, roll = 0) {
  const rnd = rngFrom(daySeed(key + ":" + variant + ":week" + (roll ? ":" + roll : ""))); const found = [];
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

// Never the same puzzle twice (idea 9 Nov, night): each day's games are dealt from that day's own seed, but Nchò's positions with a
// big haul are few (the last-8 sweep and the early openings come round again), so left alone 15 days up to the end of 2027 would have set
// pits some earlier day already had (once only a week apart, 13 and 20 Dec 2027), more each year after, and a few days in each game
// would have missed their level. The fix
// can't look back at every earlier day on the phone (a year of days is too slow to deal), so tools/puzzle-years.js deals every
// day from WEEKLY_FROM to REROLLS_UNTIL in order, once, and where a day's puzzle repeats an earlier one's pits or misses the
// week's level, deals it again from the next seed (":1", ":2" …) until it is new and at its level; the days that needed it are
// kept here. Every other day — today and every day before this table, and any day after it — is dealt exactly as before.
// test/years.test.js deals the years again on every push and checks this table is what they give.
export const REROLLS_UNTIL = "2030-12-31";
// <rerolls> written by tools/puzzle-years.js — do not edit by hand
export const REROLLS = {
  ncho: {"2027-03-07":1,"2027-05-01":1,"2027-05-27":1,"2027-08-02":1,"2027-08-20":1,"2027-08-29":2,"2027-09-28":1,"2027-10-16":1,"2027-10-18":1,"2027-10-22":1,"2027-10-23":1,"2027-11-19":1,"2027-11-28":1,"2027-12-09":1,"2027-12-15":1,"2027-12-20":1,"2027-12-30":1,"2028-01-08":1,"2028-02-25":1,"2028-03-04":1,"2028-03-19":1,"2028-03-24":1,"2028-04-14":1,"2028-04-28":1,"2028-04-29":1,"2028-05-02":1,"2028-05-05":1,"2028-06-17":1,"2028-08-12":2,"2028-08-17":1,"2028-09-11":1,"2028-09-27":1,"2028-11-13":1,"2028-11-14":1,"2028-12-06":1,"2028-12-09":2,"2028-12-11":1,"2028-12-30":1,"2029-02-01":1,"2029-02-17":1,"2029-03-31":1,"2029-04-07":1,"2029-04-12":1,"2029-05-06":1,"2029-06-24":1,"2029-06-25":1,"2029-06-27":1,"2029-07-01":1,"2029-07-27":1,"2029-07-30":2,"2029-08-10":1,"2029-08-23":1,"2029-08-26":1,"2029-09-11":1,"2029-09-17":1,"2029-09-25":1,"2029-10-12":1,"2029-10-15":1,"2029-10-16":1,"2029-11-05":1,"2029-11-11":1,"2029-11-26":1,"2029-11-28":2,"2029-12-04":1,"2029-12-07":1,"2029-12-11":2,"2029-12-16":1,"2029-12-19":1,"2029-12-28":1,"2029-12-31":2,"2030-01-10":1,"2030-01-19":1,"2030-01-22":1,"2030-01-24":1,"2030-01-26":1,"2030-01-31":1,"2030-02-01":1,"2030-02-05":2,"2030-02-17":1,"2030-02-23":1,"2030-02-26":1,"2030-03-07":1,"2030-03-13":1,"2030-04-03":1,"2030-04-12":1,"2030-04-24":1,"2030-05-01":1,"2030-05-02":2,"2030-05-09":1,"2030-05-16":1,"2030-05-20":1,"2030-05-22":1,"2030-05-27":1,"2030-06-15":1,"2030-07-01":1,"2030-07-02":1,"2030-07-09":2,"2030-07-18":2,"2030-07-27":1,"2030-07-30":1,"2030-08-01":1,"2030-08-14":1,"2030-08-26":1,"2030-08-28":2,"2030-09-06":1,"2030-09-11":1,"2030-09-19":1,"2030-10-18":1,"2030-11-03":1,"2030-11-07":1,"2030-11-08":1,"2030-11-18":1,"2030-11-19":1,"2030-11-20":1,"2030-11-21":1,"2030-12-04":1,"2030-12-05":1,"2030-12-15":1,"2030-12-24":3},
  ayo: {"2028-07-23":1,"2029-01-26":1,"2029-08-05":1,"2029-12-02":2,"2030-10-13":1},
};
// </rerolls>
export function rerollOf(key, variant) { return (key <= REROLLS_UNTIL && REROLLS[variant] && REROLLS[variant][key]) || 0; }

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
