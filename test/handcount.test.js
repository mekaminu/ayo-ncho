import { test } from "node:test";
import assert from "node:assert/strict";
import { handSteps, handText, handShown } from "../web/handcount.js";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

test("the words: plain for the sowing hand, a plus for a capture, nothing for an empty hand", () => {
  assert.equal(handText(7), "7");
  assert.equal(handText(8, "haul"), "+8");
  assert.equal(handText(0), "");
  assert.equal(handText(null), "");
  assert.equal(handShown(true, false), true);
  assert.equal(handShown(false, false), false);
  assert.equal(handShown(true, true), false);
});

for (const variant of ["ncho", "ayo"]) {
  test(`${variant}: over random games the hand's number is what the hand holds, and every turn ends with it empty`, () => {
    const r = rng(variant === "ncho" ? 7 : 11); let turns = 0, relays = 0;
    for (let g = 0; g < 80; g++) {
      let s = newGame(variant);
      while (!s.over && s.moves.length < 200) {
        const moves = legalMoves(s); const pit = moves[Math.floor(r() * moves.length)];
        const before = s; const { state, events } = applyMove(s, pit); const steps = handSteps(events);
        assert.equal(steps.length, events.length);
        // replay the seeds by hand: the sowing number is always the seeds still to be sown
        let hand = 0; const pits = before.pits.slice(); let hauled = [0, 0];
        events.forEach((e, k) => {
          const st = steps[k];
          if (e.type === "pickup") { assert.equal(hand, 0, "a pit is only picked up with an empty hand"); hand = pits[e.pit]; pits[e.pit] = 0; assert.equal(e.n, hand); if (e.relay) { relays++; assert.equal(st.again, true); } }
          if (e.type === "drop") { hand--; pits[e.pit]++; }
          if (e.type === "capture") { let got = 0; for (const p of e.pits) { got += pits[p]; pits[p] = 0; } assert.equal(st.haul, got, "the copper number is every seed the capture hand sweeps up"); hauled[e.by] += got; }
          assert.equal(st.sow, hand > 0 ? hand : null);
          assert.ok(st.sow == null || st.sow > 0);
        });
        assert.equal(hand, 0, "the turn ends with the hand empty");
        assert.equal(steps[steps.length - 1].sow, null);
        if (!state.over) assert.deepEqual(pits, state.pits); // (a game's end gives the seeds left on a side to its owner — no hand)
        if (!state.over) assert.deepEqual([before.stores[0] + hauled[0], before.stores[1] + hauled[1]], state.stores, "the hauls add up to the scores");
        s = state; turns++;
      }
    }
    assert.ok(turns > 1000);
    if (variant === "ncho") assert.ok(relays > 100); else assert.equal(relays, 0);
  });
}
