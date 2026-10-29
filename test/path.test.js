// Where the seeds will go: the preview is read from the engine's own events, so it can never disagree with the move.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sowPath, pathWords, pickedHint, pitName } from "../web/path.js";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";

test("the opening move under Ayo: four seeds, one per pit, ending on your own side; under Nchò the same pit relays on", () => {
  const a = sowPath(newGame("ayo"), 0);
  assert.deepEqual(a.order, [1, 2, 3, 4], "pit 0's four seeds go into 1, 2, 3, 4");
  assert.equal(a.end, 4); assert.equal(a.drops, 4); assert.deepEqual(a.relays, []); assert.deepEqual(a.captures, []);
  assert.equal(a.got, 0); assert.equal(a.lost, 0); assert.equal(a.over, false);
  const n = sowPath(newGame("ncho"), 0);
  assert.equal(n.relays[0], 4, "the last seed lands in pit 4, which had seeds: picked up and sown on");
  assert.ok(n.drops > 4 && n.order.length > 4);
});

test("a path agrees with the move, every pit and every capture, over hundreds of random games in both games", () => {
  let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let checked = 0, relayTurns = 0, captureTurns = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 60; g++) {
    let s = newGame(variant);
    while (!s.over) {
      const moves = legalMoves(s); const m = moves[Math.floor(rnd() * moves.length)];
      const p = sowPath(s, m); const { state: next, events } = applyMove(s, m);
      // every drop counted, in a copy: the position itself is untouched
      const drops = events.filter((e) => e.type === "drop");
      assert.equal(p.drops, drops.length); assert.equal(p.end, drops[drops.length - 1].pit);
      assert.equal(p.visits.reduce((a, b) => a + b, 0), drops.length);
      for (let i = 0; i < 12; i++) assert.equal(p.visits[i], drops.filter((d) => d.pit === i).length);
      assert.deepEqual([...new Set(drops.map((d) => d.pit))], p.order, "pits in the order first reached");
      assert.deepEqual(p.captures, [...new Set(events.filter((e) => e.type === "capture").flatMap((e) => e.pits))]);
      assert.equal(p.got, next.stores[s.turn] - s.stores[s.turn]); assert.equal(p.lost, next.stores[1 - s.turn] - s.stores[1 - s.turn]);
      assert.equal(p.over, next.over); if (next.over) assert.equal(p.winner, next.winner);
      assert.equal(p.relays.length, events.filter((e) => e.type === "pickup" && e.relay).length);
      if (p.relays.length) relayTurns++; if (p.captures.length) captureTurns++;
      checked++; s = next;
    }
  }
  assert.ok(checked > 2000 && relayTurns > 100 && captureTurns > 100, `${checked} moves, ${relayTurns} relay turns, ${captureTurns} with a capture`);
});

test("a pit that cannot be played has no path: the other side's, an empty one, one barred by the feed rule, a finished game", () => {
  const s = newGame("ncho");
  assert.equal(sowPath(s, 7), null, "their pit"); assert.equal(sowPath(s, 12), null);
  const e = { ...s, pits: s.pits.slice() }; e.pits[2] = 0; assert.equal(sowPath(e, 2), null, "empty");
  // feed rule: the other side is empty; only a move that reaches them is legal
  const f = { ...s, pits: [0, 0, 0, 1, 0, 9, 0, 0, 0, 0, 0, 0], stores: [19, 19] };
  assert.equal(sowPath(f, 3), null, "pit 3's one seed stays on your side: barred"); assert.ok(sowPath(f, 5), "pit 5 feeds them");
  assert.equal(sowPath({ ...s, over: true }, 0), null); assert.equal(sowPath(null, 0), null);
});

test("the words: where it ends, what it takes, relay pick-ups, the end of the game — from either seat", () => {
  const p = sowPath(newGame("ayo"), 0);
  assert.equal(pathWords(p), "ends in your pit 5");
  assert.equal(pitName(4, 0), "your pit 5"); assert.equal(pitName(4, 1), "their pit 5"); assert.equal(pitName(6, 0), "their pit 1"); assert.equal(pitName(11, 1), "your pit 6");
  const words = pathWords({ end: 8, relays: [3, 9], captures: [8], got: 4, lost: 4, over: false, winner: null, order: [], visits: [] });
  assert.equal(words, "picks up again ×2 · ends in their pit 3 · takes 4 · gives 4");
  assert.equal(pathWords({ end: 1, relays: [4], captures: [], got: 0, lost: 0, over: false }), "picks up again once · ends in your pit 2");
  assert.equal(pathWords({ end: 1, relays: [], captures: [1], got: 8, lost: 0, over: true, winner: 0 }), "ends in your pit 2 · takes 8 · wins the game");
  assert.equal(pathWords({ end: 1, relays: [], captures: [], got: 0, lost: 0, over: true, winner: "draw" }), "ends in your pit 2 · ends the game level");
  assert.equal(pathWords({ end: 1, relays: [], captures: [], got: 0, lost: 3, over: true, winner: 1 }, { you: 0 }), "ends in your pit 2 · gives 3 · ends the game");
  assert.equal(pathWords(null), "");
});

test("the hint while a pit is picked, for a finger and for the keys, with and without a path to show", () => {
  const p = sowPath(newGame("ayo"), 2);
  assert.equal(pickedHint(p), "ends in their pit 1 — tap again to sow");
  assert.equal(pickedHint(p, { keys: true, key: "3", seeds: 4 }), "pit 3 · ends in their pit 1 — Enter to sow");
  assert.equal(pickedHint(null), "tap again to sow, or pick another", "with the setting off the old words stay");
  assert.equal(pickedHint(null, { keys: true, key: "3", seeds: 1 }), "pit 3 · 1 seed — Enter to sow, or pick another");
});

test("a real relay turn: the preview counts every pick-up and the capture the move makes", () => {
  // find one in a random game under Nchò rules
  let seed = 3; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let s = newGame("ncho"), found = null;
  while (!s.over && !found) {
    for (const m of legalMoves(s)) { const p = sowPath(s, m); if (p.relays.length >= 1 && p.captures.length >= 1) { found = { s, m, p }; break; } }
    if (!found) { const moves = legalMoves(s); s = applyMove(s, moves[Math.floor(rnd() * moves.length)]).state; }
  }
  assert.ok(found, "a relay turn with a capture turns up");
  const { events } = applyMove(found.s, found.m);
  assert.equal(found.p.relays[0], events.find((e) => e.relay).pit, "the first pick-up is where the engine's is");
  assert.ok(found.p.order.length <= 12 && found.p.visits[found.p.end] >= 1);
  assert.ok(pathWords(found.p).startsWith("picks up again"));
  assert.deepEqual(replay([]).pits, newGame().pits, "nothing here touched the engine's state");
});
