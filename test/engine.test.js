import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, replay, totalSeeds, TOTAL_SEEDS, sideOf, RULES } from "../engine/ayo.js";
import { chooseMove } from "../engine/ai.js";

function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

test("a fresh board has 48 seeds, 4 per pit", () => {
  const g = newGame("ayo");
  assert.equal(totalSeeds(g), TOTAL_SEEDS);
  assert.deepEqual(g.pits, Array(12).fill(4));
});

test("sowing goes anticlockwise and skips the origin pit on a lap", () => {
  let g = newGame("ayo");
  g.pits = [15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  g.stores = [TOTAL_SEEDS - 15, 0];
  const { state } = applyMove(g, 0);
  // 15 seeds: pits 1..11 get one each (11), then 1,2,3,4 get a second (skip pit 0)
  assert.equal(state.pits[0], 0);
  assert.deepEqual(state.pits.slice(1, 5), [2, 2, 2, 2]);
  assert.deepEqual(state.pits.slice(5), [1, 1, 1, 1, 1, 1, 1]);
});

test("captures sweep back through opponent pits of 2 or 3", () => {
  let g = newGame("ayo");
  g.pits = [0, 0, 0, 0, 0, 3, 1, 2, 1, 4, 4, 4];
  g.stores = [TOTAL_SEEDS - 19, 0];
  const { state, events } = applyMove(g, 5);
  // 3 seeds land in 6,7,8 → 2,3,2 → all captured (7 seeds)
  assert.equal(state.stores[0], TOTAL_SEEDS - 19 + 7);
  assert.deepEqual(state.pits.slice(6, 9), [0, 0, 0]);
  assert.ok(events.some((e) => e.type === "capture" && e.n === 7));
});

test("grand slam captures nothing", () => {
  let g = newGame("ayo");
  g.pits = [0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0];
  g.stores = [TOTAL_SEEDS - 4, 0];
  const { state } = applyMove(g, 5);
  assert.equal(state.stores[0], TOTAL_SEEDS - 4); // would have taken all the opponent's seeds
  assert.deepEqual(state.pits.slice(6, 8), [2, 2]);
});

test("feed rule: must give an empty opponent seeds when you can", () => {
  let g = newGame("ayo");
  g.pits = [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0];
  g.stores = [TOTAL_SEEDS - 3, 0];
  assert.deepEqual(legalMoves(g), [5]);
  assert.throws(() => applyMove(g, 0));
});

test("game ends at 25 captured", () => {
  let g = newGame("ayo");
  g.pits = [0, 0, 0, 0, 0, 2, 1, 2, 0, 0, 4, 4];
  g.stores = [23, 12];
  const { state } = applyMove(g, 5);
  assert.equal(state.over, true);
  assert.equal(state.winner, 0);
});

test("seed count is conserved through 300 random games", () => {
  const r = rng(42);
  for (let n = 0; n < 300; n++) {
    let g = newGame(n % 2 ? "ayo" : "ncho");
    let guard = 0;
    while (!g.over && guard++ < 400) {
      const moves = legalMoves(g);
      const m = moves[Math.floor(r() * moves.length)];
      g = applyMove(g, m).state;
      assert.equal(totalSeeds(g), TOTAL_SEEDS);
      for (const p of g.pits) assert.ok(p >= 0);
    }
    assert.ok(g.over, "game should finish");
    assert.equal(replay(g.moves, g.variant).stores.join(), g.stores.join(), "replay matches");
  }
});

test("hard beats easy most of the time", () => {
  const r = rng(7);
  let hardWins = 0;
  for (let n = 0; n < 12; n++) {
    let g = newGame(n % 2 ? "ayo" : "ncho");
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

test("ncho: a pit reaching 4 mid-sow goes to its side's owner; the last seed making 4 on the other side goes to the sower", () => {
  let g = newGame("ncho");
  // player 0 sows 5 seeds from pit 2 into 3,4,5,6,7. Pit 4 has 3 → 4 (own side: mine). Pit 7 has 3 → 4 by the LAST seed on their side: mine too.
  g.pits = [0, 0, 5, 0, 3, 0, 3, 3, 5, 5, 0, 0]; g.stores = [12, 12];
  const { state, events } = applyMove(g, 2);
  assert.equal(state.stores[0], 12 + 8);
  assert.equal(state.stores[1], 12 + 4, "pit 6 reached 4 from a seed that was not the last: the opponent owns that side, so they take it");
  assert.equal(state.pits[6], 0);
});

test("ncho: sowing into the other side and making 4 (not the last seed) gives them the pit", () => {
  let g = newGame("ncho");
  g.pits = [0, 0, 0, 0, 0, 2, 3, 0, 0, 0, 4, 8]; g.stores = [15, 16];
  const { state } = applyMove(g, 5); // seeds land in 6 (3→4, theirs, not last) and 7
  assert.equal(state.stores[1], 20);
  assert.equal(state.stores[0], 15);
});

test("ncho: with 8 seeds left, the next capture takes everything", () => {
  let g = newGame("ncho");
  g.pits = [0, 0, 0, 0, 3, 1, 3, 1, 0, 0, 0, 0]; g.stores = [20, 20];
  const { state } = applyMove(g, 5); // 1 seed: pit 6 3→4, last seed, their side → mine, and the other 4 follow
  assert.equal(state.stores[0], 28);
  assert.equal(state.over, true);
  assert.equal(state.winner, 0);
});

test("ncho: relay sowing — the last seed landing in an occupied pit picks it up and carries on", () => {
  let g = newGame("ncho");
  // player 0 sows 2 seeds from pit 0 into 1 and 2; pit 2 had 1 → 2, so it is picked up and sown into 3, 4; pit 4 had 0 → 1: stop.
  g.pits = [2, 0, 1, 0, 0, 0, 4, 4, 4, 4, 4, 4]; g.stores = [10, 11];
  const { state, events } = applyMove(g, 0);
  assert.ok(events.some((e) => e.type === "pickup" && e.relay && e.pit === 2));
  assert.deepEqual(state.pits.slice(0, 5), [0, 1, 0, 1, 1]);
});

test("ncho: a repeating position within one turn ends the turn, and seeds are conserved", () => {
  let g = newGame("ncho");
  g.pits = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; g.stores = [18, 18];
  const { state } = applyMove(g, 0);
  assert.equal(totalSeeds(state), TOTAL_SEEDS);
});

test("custom rules: Ayo captures with relay sowing on, and Nchò captures as a single lap", () => {
  let g = newGame("ayo", { relay: true });
  g.pits = [2, 0, 1, 0, 0, 0, 4, 4, 4, 4, 4, 4]; g.stores = [10, 11];
  const { events } = applyMove(g, 0);
  assert.ok(events.some((e) => e.type === "pickup" && e.relay), "relay works under Ayo captures");
  let h = newGame("ncho", { relay: false });
  h.pits = [2, 0, 1, 0, 0, 0, 4, 4, 4, 4, 4, 4]; h.stores = [10, 11];
  const r = applyMove(h, 0);
  assert.ok(!r.events.some((e) => e.type === "pickup" && e.relay), "no relay when switched off");
  assert.deepEqual(r.state.pits.slice(0, 3), [0, 1, 2]);
});

test("rule bundles are what the games expect", () => {
  assert.deepEqual(RULES.ncho, { capture: 4, relay: true, last8: true });
  assert.deepEqual(RULES.ayo, { capture: 23, relay: false, last8: false });
});
