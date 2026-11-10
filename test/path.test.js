// Where the seeds will go: the preview is read from the engine's own events, so it can never disagree with the move.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sowPath, pathWords, pickedHint, pitName, playedWords } from "../web/path.js";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";
import { endedCircling } from "../web/circling.js";
import { dryOf } from "../web/dry.js";

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
      const kept = (dryOf(s, next, events) || { n: 0 }).n; // a side run dry: the seeds the mover keeps are not taken (web/dry.js)
      assert.equal(p.got, next.stores[s.turn] - s.stores[s.turn] - kept); assert.equal(p.lost, next.stores[1 - s.turn] - s.stores[1 - s.turn]);
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

test("their move, explained: the words for a turn already played, from your seat, short enough for a phone", () => {
  // the opponent (seat 1) plays; the words are read from seat 0
  const you = 0;
  assert.equal(playedWords({ end: 8, relays: [3, 9], captures: [8], got: 4, lost: 4, over: false, winner: null }, { you }), "picked up again twice · took 4 · gave 4");
  assert.equal(playedWords({ end: 2, relays: [4], captures: [], got: 0, lost: 0, over: false }, { you }), "picked up again once");
  assert.equal(playedWords({ end: 2, relays: [4, 7, 1], captures: [2], got: 0, lost: 4, over: false }, { you }), "picked up again ×3 · gave 4");
  assert.equal(playedWords({ end: 2, relays: [], captures: [], got: 0, lost: 0, over: false }, { you }), "ended in your pit 3", "a plain turn says where it ended");
  assert.equal(playedWords({ end: 9, relays: [], captures: [], got: 0, lost: 0, over: false }, { you: 1 }), "ended in your pit 4", "from the far seat the same pit is yours");
  assert.equal(playedWords({ end: null, relays: [], captures: [], got: 0, lost: 0, over: false }, { you }), "sowed nothing");
  assert.equal(playedWords({ end: 1, relays: [], captures: [1], got: 8, lost: 0, over: true, winner: 1 }, { you }), "took 8 · ended in your pit 2 · they win");
  assert.equal(playedWords({ end: 1, relays: [], captures: [], got: 0, lost: 0, over: true, winner: "draw" }, { you }), "ended in your pit 2 · the game ends level");
  assert.equal(playedWords(null), "");
  // a real opponent's move under Nchò: the words agree with the path of the move actually played
  let s = newGame("ncho"); s = applyMove(s, 2).state; // you open; now it is their move
  const m = legalMoves(s)[0]; const p = sowPath(s, m); const w = playedWords(p, { you });
  assert.ok(w.length > 0 && w.length < 60, w);
  if (p.relays.length) assert.ok(w.startsWith("picked up again"), w);
  if (p.got) assert.ok(w.includes(`took ${p.got}`), w);
  if (p.lost) assert.ok(w.includes(`gave ${p.lost}`), w);
  if (!p.relays.length && !p.got && !p.lost) assert.equal(w, `ended in ${pitName(p.end, you)}`);
});

import { answerOf, answerWords } from "../web/path.js";

test("what it leaves open: their richest reply, checked against every reply played by the engine, over random games in both games", () => {
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let checked = 0, warned = 0, wins = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 25; g++) {
    let s = newGame(variant);
    while (!s.over) {
      const moves = legalMoves(s);
      for (const m of moves) {
        const a = answerOf(s, m); const { state: next } = applyMove(s, m);
        if (next.over) { assert.equal(a, null, "a move that ends the game leaves nothing to answer"); continue; }
        let bestGot = 0, canWin = false;
        for (const r of legalMoves(next)) {
          const { state: after, events: ev } = applyMove(next, r); const kept = (dryOf(next, after, ev) || { n: 0 }).n; // kept, not taken
          if (!endedCircling(after)) bestGot = Math.max(bestGot, after.stores[next.turn] - next.stores[next.turn] - kept); // a called game takes nothing: each keeps their side
          if (after.over && after.winner === next.turn) canWin = true;
        }
        assert.equal(a.wins, canWin);
        if (!canWin) assert.equal(a.got, bestGot, "the richest reply");
        if (a.pit !== null) { // the named reply really does take that much, and empties those pits
          const { state: after, events } = applyMove(next, a.pit);
          assert.equal(a.got, endedCircling(after) ? 0 : after.stores[next.turn] - next.stores[next.turn] - (dryOf(next, after, events) || { n: 0 }).n);
          if (!endedCircling(after)) assert.deepEqual(a.captures, [...new Set(events.filter((e) => e.type === "capture").flatMap((e) => e.pits))]);
        } else assert.equal(a.got, 0);
        if (a.got) warned++; if (a.wins) wins++; checked++;
      }
      s = applyMove(s, moves[Math.floor(rnd() * moves.length)]).state;
    }
  }
  assert.ok(checked > 3000 && warned > 300, `${checked} moves checked, ${warned} leave a take, ${wins} leave a win`);
  assert.equal(answerOf(newGame("ncho"), 7), null, "their pit"); assert.equal(answerOf(null, 0), null);
});

test("what it leaves open, in words, at the end of the hint line", () => {
  assert.equal(answerWords(null), ""); assert.equal(answerWords({ got: 0, wins: false }), "");
  assert.equal(answerWords({ got: 8, wins: false }), "then they can take 8"); assert.equal(answerWords({ got: 4, wins: true }), "then they can win");
  const p = { end: 8, relays: [], captures: [8], got: 4, lost: 0, over: false, winner: null, order: [], visits: [] };
  assert.equal(pickedHint(p, { answer: { got: 8, wins: false } }), "ends in their pit 3 · takes 4 · then they can take 8 — tap again to sow");
  assert.equal(pickedHint(p, { answer: { got: 0, wins: false } }), "ends in their pit 3 · takes 4 — tap again to sow");
  assert.equal(pickedHint(p, { keys: true, key: 2, seeds: 5, answer: { got: 4, wins: true } }), "pit 2 · ends in their pit 3 · takes 4 · then they can win — Enter to sow");
});

import { hintedHint } from "../web/path.js";
test("a hint that teaches: the hinted pit's line says whose move it is, for a finger and for the keys", () => {
  const s = newGame("ncho"), p = sowPath(s, 3);
  const finger = pickedHint(p, { you: 0 }), keys = pickedHint(p, { you: 0, keys: true, key: "4", seeds: 4 });
  assert.equal(hintedHint(finger, "Mama Ngozi"), `Mama Ngozi would play this one · ${finger}`);
  assert.ok(hintedHint(finger, "Mama Ngozi").endsWith("— tap again to sow"));
  assert.equal(hintedHint(keys, "Mama Ngozi", { keys: true, key: "4" }), `Mama Ngozi would play ${keys}`);
  // the path setting off: the bare lines
  assert.equal(hintedHint(pickedHint(null), "Mama Ngozi"), "Mama Ngozi would play this one — tap again to sow");
  assert.equal(hintedHint(pickedHint(null, { keys: true, key: "2", seeds: 5 }), "Mama Ngozi", { keys: true, key: "2" }), "Mama Ngozi would play pit 2 · 5 seeds — Enter to sow");
  assert.equal(hintedHint("", "Mama Ngozi"), ""); assert.equal(hintedHint("something else", "Mama Ngozi", { keys: true, key: "1" }), "something else");
});
