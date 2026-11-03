import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { gameStory, storyWords, storyPath } from "../web/story.js";

function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function randomGame(seed, variant = "ncho") {
  const r = rng(seed); let s = newGame(variant); const moves = [];
  while (!s.over && moves.length < 300) { const legal = legalMoves(s); const m = legal[Math.floor(r() * legal.length)]; moves.push(m); s = applyMove(s, m).state; }
  return { moves, state: s };
}

test("the lead after every move is the engine's own scores, from the reader's side", () => {
  for (const variant of ["ncho", "ayo"]) for (let seed = 1; seed <= 60; seed++) {
    const { moves, state } = randomGame(seed, variant);
    for (const player of [0, 1]) {
      const st = gameStory(moves, variant, {}, player);
      assert.equal(st.leads.length, moves.length + 1); assert.equal(st.leads[0], 0);
      assert.equal(st.final, state.stores[player] - state.stores[1 - player]);
      // the swings add up to the final lead, and each one is the change in the lead
      assert.equal(st.turns.reduce((a, t) => a + t.swing, 0), st.final);
      st.turns.forEach((t, i) => assert.equal(t.swing, st.leads[i + 1] - st.leads[i]));
      // the biggest turn is the largest swing, the first one on a tie
      const most = Math.max(0, ...st.turns.map((t) => Math.abs(t.swing)));
      if (most === 0) assert.equal(st.biggest, null);
      else { assert.equal(Math.abs(st.biggest.swing), most); assert.equal(st.turns.findIndex((t) => Math.abs(t.swing) === most), st.biggest.index); }
      // ahead for good: from that move on, the final leader never lost the lead, and the move before they were not ahead
      if (st.final === 0) assert.equal(st.forGood, null);
      else {
        const sign = Math.sign(st.final);
        for (let k = st.forGood + 1; k < st.leads.length; k++) assert.equal(Math.sign(st.leads[k]), sign);
        assert.notEqual(Math.sign(st.leads[st.forGood]), sign);
      }
    }
  }
});

test("the same game reads as a mirror from the other seat", () => {
  const { moves } = randomGame(7);
  const a = gameStory(moves, "ncho", {}, 0), b = gameStory(moves, "ncho", {}, 1);
  assert.deepEqual(a.leads.map((v) => 0 - v || 0), b.leads);
  assert.equal(a.forGood, b.forGood); assert.equal(a.biggest.index, b.biggest.index);
});

test("the words say who led for good and the biggest swing, counting moves from 1", () => {
  const st = { moves: 40, final: 6, forGood: 30, maxLead: 10, minLead: -8, biggest: { index: 23, mover: 0, swing: 12 } };
  assert.equal(storyWords(st, { me: "You", them: "Nnamdi" }), "You led for good from move 31 · biggest swing: move 24, 12 seeds your way");
  assert.equal(storyWords({ ...st, final: -6, biggest: { index: 19, mover: 1, swing: -9 } }, { me: "You", them: "Nnamdi" }), "Nnamdi led for good from move 31 · biggest swing: move 20, 9 seeds Nnamdi's way");
  assert.equal(storyWords({ ...st, forGood: 0 }, { me: "You", them: "Nnamdi" }), "You led from the start · biggest swing: move 24, 12 seeds your way");
  assert.equal(storyWords({ ...st, final: 0, forGood: null }, { me: "Player 1", them: "Player 2" }), "Level at the end · biggest swing: move 24, 12 seeds Player 1's way");
  assert.equal(storyWords({ moves: 3, final: 0, forGood: null, maxLead: 0, minLead: 0, biggest: null }), "Level the whole way");
  assert.equal(storyWords({ moves: 0 }), "");
});

test("the line fits its box, level sits in the middle, and the marks sit on the line", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { moves } = randomGame(seed); const st = gameStory(moves); const p = storyPath(st, 300, 64, 4);
    const nums = p.line.replace(/[ML]/g, " ").trim().split(/\s+/).map(Number);
    for (let i = 0; i < nums.length; i += 2) { assert.ok(nums[i] >= 4 && nums[i] <= 296, "x in the box"); assert.ok(nums[i + 1] >= 4 && nums[i + 1] <= 60, "y in the box"); }
    assert.equal(nums[1], 32, "the game starts level, in the middle");
    assert.ok(p.area.endsWith("Z"));
    for (const m of [p.mark, p.big]) if (m) assert.ok(p.line.includes(`${m.x} ${m.y}`), "a mark sits on a point of the line");
  }
});
