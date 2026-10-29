// Keyboard play: what each key means from either seat, when the page keeps a key, and what a screen reader hears about a pit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { KEYS, keyToPit, pitKey, keyAction, pitLabel, pitEnabled, hintText } from "../web/keys.js";
import { newGame, legalMoves, applyMove, sideOf } from "../engine/ayo.js";

test("keys 1–6 are your pits near to far, from either seat", () => {
  assert.deepEqual(KEYS.pits.map((k) => keyToPit(k, 0)), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(KEYS.pits.map((k) => keyToPit(k, 1)), [6, 7, 8, 9, 10, 11], "at the far seat online your own pits are still 1–6");
  for (const you of [0, 1]) for (const pit of sideOf(you)) assert.equal(keyToPit(pitKey(pit, you), you), pit);
  assert.equal(pitKey(7, 0), null, "the other side's pits have no key");
  assert.equal(keyToPit("7"), null); assert.equal(keyToPit("0"), null); assert.equal(keyToPit(3, 0), 2, "a number works like its digit");
});

test("the keys the plan names, and nothing else", () => {
  assert.deepEqual(keyAction({ key: "3" }), { type: "pit", pit: 2 });
  assert.deepEqual(keyAction({ key: "3" }, { you: 1 }), { type: "pit", pit: 8 });
  assert.deepEqual(keyAction({ key: "Enter" }), { type: "sow" }); assert.deepEqual(keyAction({ key: " " }), { type: "sow" });
  assert.deepEqual(keyAction({ key: "u" }), { type: "undo" }); assert.deepEqual(keyAction({ key: "U" }), { type: "undo" });
  assert.deepEqual(keyAction({ key: "h" }), { type: "hint" }); assert.deepEqual(keyAction({ key: "H" }), { type: "hint" });
  assert.deepEqual(keyAction({ key: "Escape" }), { type: "deselect" });
  for (const k of ["a", "7", "Tab", "ArrowUp", "F5", ""]) assert.equal(keyAction({ key: k }), null, k);
  assert.equal(keyAction(null), null);
});

test("the page keeps browser shortcuts, typing in a field, and Enter on a button", () => {
  assert.equal(keyAction({ key: "1", metaKey: true }), null, "⌘1 switches tabs");
  assert.equal(keyAction({ key: "u", ctrlKey: true }), null); assert.equal(keyAction({ key: "h", altKey: true }), null);
  assert.equal(keyAction({ key: "3" }, { tag: "INPUT" }), null, "typing a room code");
  assert.equal(keyAction({ key: "u" }, { tag: "textarea" }), null); assert.equal(keyAction({ key: "h" }, { editable: true }), null);
  assert.equal(keyAction({ key: "Enter" }, { tag: "BUTTON" }), null, "Enter on Undo clicks Undo, not the board");
  assert.equal(keyAction({ key: " " }, { tag: "A" }), null);
  assert.deepEqual(keyAction({ key: "3" }, { tag: "BUTTON" }), { type: "pit", pit: 2 }, "a digit still picks a pit while a chip has focus");
  assert.deepEqual(keyAction({ key: "Escape" }, { tag: "BUTTON" }), { type: "deselect" });
});

test("a pit's label says whose, which key, how many seeds, and whether it is picked or barred", () => {
  assert.equal(pitLabel(2, 4), "Your pit 3 (key 3) · 4 seeds");
  assert.equal(pitLabel(2, 1), "Your pit 3 (key 3) · 1 seed");
  assert.equal(pitLabel(0, 0), "Your pit 1 (key 1) · empty");
  assert.equal(pitLabel(6, 5), "Their pit 1 · 5 seeds", "their pits count from their own near end, no key");
  assert.equal(pitLabel(11, 0), "Their pit 6 · empty");
  assert.equal(pitLabel(8, 2, { you: 1 }), "Your pit 3 (key 3) · 2 seeds", "from the far seat");
  assert.equal(pitLabel(0, 3, { you: 1 }), "Their pit 1 · 3 seeds");
  assert.equal(pitLabel(2, 4, { selected: 2 }), "Your pit 3 (key 3) · 4 seeds · picked — Enter to sow");
  // the feed rule: a pit with seeds that the engine will not allow says why
  const s = newGame("ncho"); s.pits = [0, 0, 1, 0, 0, 5, 0, 0, 0, 0, 0, 0]; s.stores = [20, 22];
  const legal = legalMoves(s); assert.deepEqual(legal, [5], "only the pit that reaches the other side may be played");
  assert.equal(pitLabel(2, 1, { legal }), "Your pit 3 (key 3) · 1 seed · must feed the other side");
  assert.equal(pitLabel(5, 5, { legal }), "Your pit 6 (key 6) · 5 seeds");
});

test("only your own pits with seeds can be reached, and only on your move", () => {
  assert.equal(pitEnabled(0, 4), true); assert.equal(pitEnabled(0, 0), false); assert.equal(pitEnabled(6, 4), false);
  assert.equal(pitEnabled(6, 4, { you: 1 }), true); assert.equal(pitEnabled(0, 4, { mine: false }), false);
});

test("the hint line speaks to a finger or to a keyboard", () => {
  assert.equal(hintText("pick"), "tap a pit on your side to sow");
  assert.equal(hintText("picked"), "tap again to sow, or pick another");
  assert.equal(hintText("puzzle"), "tap a pit on your side");
  assert.equal(hintText("pick", { keys: true }), "click a pit on your side, or press 1–6");
  assert.equal(hintText("puzzle", { keys: true }), "click a pit on your side, or press 1–6");
  assert.equal(hintText("picked", { keys: true, key: "3", seeds: 4 }), "pit 3 · 4 seeds — Enter to sow, or pick another");
});

test("a whole game can be played from the keys alone (every legal move has a digit)", () => {
  let s = newGame("ncho"); let rs = 7; const rnd = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };
  let moves = 0;
  while (!s.over && moves < 400) {
    const legal = legalMoves(s); const pit = legal[Math.floor(rnd() * legal.length)];
    const key = pitKey(pit, s.turn); assert.ok(KEYS.pits.includes(key), "every legal pit has a key for the player to move");
    assert.deepEqual(keyAction({ key }, { you: s.turn }), { type: "pit", pit });
    s = applyMove(s, pit).state; moves++;
  }
  assert.ok(s.over);
});
