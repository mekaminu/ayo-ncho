import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, replay, totalSeeds, TOTAL_SEEDS, sideOf } from "../engine/ayo.js";
import { chooseMove } from "../engine/ai.js";

function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

test("a fresh board has 48 seeds, 4 per pit", () => {
  const g = newGame();
  assert.equal(totalSeeds(g), TOTAL_SEEDS);
  assert.deepEqual(g.pits, Array(12).fill(4));
});

test("sowing goes anticlockwise and skips the origin pit on a lap", () => {
  let g = newGame();
  g.pits = [15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  g.stores = [TOTAL_SEEDS - 15, 0];
  const { state } = applyMove(g, 0);
  // 15 seeds: pits 1..11 get one each (11), then 1,2,3,4 get a second (skip pit 0)
  assert.equal(state.pits[0], 0);
  assert.deepEqual(state.pits.slice(1, 5), [2, 2, 2, 2]);
  assert.deepEqual(state.pits.slice(5), [1, 1, 1, 1, 1, 1, 1]);
});

test("captures sweep back through opponent pits of 2 or 3", () => {
  let g = newGame();
  g.pits = [0, 0, 0, 0, 0, 3, 1, 2, 1, 4, 4, 4];
  g.stores = [TOTAL_SEEDS - 19, 0];
  const { state, events } = applyMove(g, 5);
  // 3 seeds land in 6,7,8 → 2,3,2 → all captured (7 seeds)
  assert.equal(state.stores[0], TOTAL_SEEDS - 19 + 7);
  assert.deepEqual(state.pits.slice(6, 9), [0, 0, 0]);
  assert.ok(events.some((e) => e.type === "capture" && e.n === 7));
});

test("grand slam captures nothing", () => {
  let g = newGame();
  g.pits = [0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0];
  g.stores = [TOTAL_SEEDS - 4, 0];
  const { state } = applyMove(g, 5);
  assert.equal(state.stores[0], TOTAL_SEEDS - 4); // would have taken all the opponent's seeds
  assert.deepEqual(state.pits.slice(6, 8), [2, 2]);
});

test("feed rule: must give an empty opponent seeds when you can", () => {
  let g = newGame();
  g.pits = [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0];
  g.stores = [TOTAL_SEEDS - 3, 0];
  assert.deepEqual(legalMoves(g), [5]);
  assert.throws(() => applyMove(g, 0));
});

test("game ends at 25 captured", () => {
  let g = newGame();
  g.pits = [0, 0, 0, 0, 0, 2, 1, 2, 0, 0, 4, 4];
  g.stores = [23, 12];
  const { state } = applyMove(g, 5);
  assert.equal(state.over, true);
  assert.equal(state.winner, 0);
});

test("seed count is conserved through 300 random games", () => {
  const r = rng(42);
  for (let n = 0; n < 300; n++) {
    let g = newGame();
    let guard = 0;
    while (!g.over && guard++ < 400) {
      const moves = legalMoves(g);
      const m = moves[Math.floor(r() * moves.length)];
      g = applyMove(g, m).state;
      assert.equal(totalSeeds(g), TOTAL_SEEDS);
      for (const p of g.pits) assert.ok(p >= 0);
    }
    assert.ok(g.over, "game should finish");
    assert.equal(replay(g.moves).stores.join(), g.stores.join(), "replay matches");
  }
});

test("hard beats easy most of the time", () => {
  const r = rng(7);
  let hardWins = 0;
  for (let n = 0; n < 12; n++) {
    let g = newGame();
    const hardIs = n % 2; // alternate sides
    let guard = 0;
    while (!g.over && guard++ < 400) {
      const m = chooseMove(g, g.turn === hardIs ? "hard" : "easy", r);
      g = applyMove(g, m).state;
    }
    if (g.winner === hardIs) hardWins++;
  }
  assert.ok(hardWins >= 9, `hard won ${hardWins}/12`);
});
