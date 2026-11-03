// The mouse on the Mac: what the pit under the pointer says, checked against the engine's own legal moves over random games.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hoverAt } from "../web/hover.js";
import { newGame, legalMoves, applyMove, sideOf } from "../engine/ayo.js";

test("a pit you can play: a hand, a ring, and its count in words", () => {
  const s = newGame("ncho");
  assert.deepEqual(hoverAt({ state: s, pit: 2, press: true }), { cursor: "pointer", ring: true, words: "pit 3 · 4 seeds — click to see where they go" });
  const far = newGame("ncho", {}, 1);
  assert.equal(hoverAt({ state: far, pit: 8, you: 1, press: true }).words, "pit 3 · 4 seeds — click to see where they go", "from the far seat your pits are still 1–6");
});

test("with a pit picked, another pit rings but the hint line keeps the path words", () => {
  const s = newGame("ncho");
  assert.deepEqual(hoverAt({ state: s, pit: 4, press: true, selected: 1 }), { cursor: "pointer", ring: true, words: null });
  assert.deepEqual(hoverAt({ state: s, pit: 1, press: true, selected: 1 }), { cursor: "pointer", ring: false, words: null }, "the picked pit has its own ring");
  assert.equal(hoverAt({ state: s, pit: 8, press: true, selected: 1 }).words, null);
});

test("their pits, empty pits and the feed rule", () => {
  const s = newGame("ncho");
  assert.deepEqual(hoverAt({ state: s, pit: 7, press: true }), { cursor: "default", ring: false, words: "their pit 2 · 4 seeds" });
  const e = { ...newGame("ncho"), pits: [0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0] };
  assert.deepEqual(legalMoves(e), [5], "only the pit that reaches them is legal");
  assert.deepEqual(hoverAt({ state: e, pit: 0, press: true }), { cursor: "not-allowed", ring: false, words: "pit 1 is empty" });
  const fed = hoverAt({ state: e, pit: 1, press: true });
  assert.equal(fed.cursor, "not-allowed"); assert.equal(fed.ring, false); assert.match(fed.words, /^pit 2 would leave them nothing/);
  assert.equal(hoverAt({ state: e, pit: 5, press: true }).ring, true);
});

test("off your move, while a turn plays, between pits and while dragging", () => {
  const s = newGame("ncho");
  assert.deepEqual(hoverAt({ state: s, pit: 2, press: false }), { cursor: "default", ring: false, words: null });
  assert.equal(hoverAt({ state: s, pit: 2, hurry: true }).cursor, "pointer", "a click would hurry the turn");
  assert.equal(hoverAt({ state: s, pit: 2, busy: true }).cursor, "progress");
  assert.equal(hoverAt({ state: s, pit: null }).cursor, "grab");
  assert.equal(hoverAt({ state: s, pit: 2, press: true, dragging: true }).cursor, "grabbing");
  const over = { ...s, over: true };
  assert.equal(hoverAt({ state: over, pit: 8 }).words, null, "nothing to say once the game is over");
});

test("over random games of both kinds, a ring only ever lands on a pit the engine would play", () => {
  let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (const v of ["ncho", "ayo"]) for (let g = 0; g < 40; g++) {
    let s = newGame(v);
    for (let m = 0; m < 300 && !s.over; m++) {
      const legal = legalMoves(s); const you = s.turn;
      for (let pit = 0; pit < 12; pit++) {
        const h = hoverAt({ state: s, pit, you, press: true });
        assert.equal(h.ring, legal.includes(pit), `${v} pit ${pit}`);
        if (sideOf(you).includes(pit) && !legal.includes(pit)) assert.equal(h.cursor, "not-allowed");
        assert.ok(h.words, "something is said about every pit with nothing picked");
      }
      s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
    }
  }
});
