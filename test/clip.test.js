import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { scoreTurn, bestTurn, clipPace, clipLength, clipCaption, CLIP_MS } from "../web/clip.js";

function rng(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function randomGame(seed, variant = "ncho") {
  const r = rng(seed); let s = newGame(variant); const moves = [];
  while (!s.over && moves.length < 200) { const legal = legalMoves(s); const m = legal[Math.floor(r() * legal.length)]; moves.push(m); s = applyMove(s, m).state; }
  return { moves, state: s };
}

test("a turn is scored by the seeds it wins, the relays it chains and the seeds it hands over", () => {
  const events = [
    { type: "pickup", pit: 2, n: 3 }, { type: "drop", pit: 3 }, { type: "drop", pit: 4 }, { type: "drop", pit: 5 },
    { type: "pickup", pit: 5, n: 4, relay: true }, { type: "drop", pit: 6 }, { type: "capture", pits: [6], by: 0, n: 4 },
    { type: "drop", pit: 7 }, { type: "capture", pits: [7], by: 1, n: 4 }, { type: "drop", pit: 8 }, { type: "drop", pit: 9 },
  ];
  const sc = scoreTurn(events, 0);
  assert.deepEqual({ seeds: sc.seeds, lost: sc.lost, relays: sc.relays, drops: sc.drops }, { seeds: 4, lost: 4, relays: 1, drops: 7 });
  assert.equal(sc.score, 4 * 2 + 3 - 4);
});

test("the best turn is the player's own, its board is the one before the move, and it replays to the same events", () => {
  for (const seed of [1, 7, 42, 99]) {
    const { moves } = randomGame(seed);
    const best = bestTurn(moves);
    assert.ok(best, "a played game always has a clip");
    assert.equal(best.before.turn, 0);
    assert.equal(moves[best.index], best.pit);
    const again = applyMove(best.before, best.pit);
    assert.deepEqual(again.events, best.events);
    // nothing the player did scores higher
    let s = newGame("ncho");
    for (const m of moves) { const r = applyMove(s, m); if (s.turn === 0) assert.ok(scoreTurn(r.events, 0).score <= best.score); s = r.state; }
  }
});

test("the opponent's best turn can be asked for too, and an empty game has no clip", () => {
  const { moves } = randomGame(5);
  const theirs = bestTurn(moves, "ncho", {}, 1);
  assert.equal(theirs.before.turn, 1);
  assert.equal(bestTurn([]), null);
});

test("the clip fits ten seconds: pace shrinks for a long relay turn and stays at the hand's pace for a short one", () => {
  const short = { relays: 0, drops: 4, events: [{ type: "drop" }, { type: "drop" }, { type: "drop" }, { type: "drop" }] };
  assert.equal(clipPace(short, 150), 150);
  const long = { relays: 3, drops: 50, events: Array.from({ length: 2 }, () => ({ type: "capture" })).concat(Array.from({ length: 50 }, () => ({ type: "drop" }))) };
  const p = clipPace(long, 150);
  assert.ok(p < 150 && p >= 45, `pace ${p}`);
  const total = clipLength(long, 150);
  assert.ok(total <= CLIP_MS && total > CLIP_MS - 100, `clip would run ${total} ms`);
  // real games: the player's best turn fits ten seconds unless it is a monster (6+ relays or 3+ captures), and never drags past 25
  for (let seed = 1; seed <= 60; seed++) {
    const best = bestTurn(randomGame(seed).moves); const ms = clipLength(best, 150); const captures = best.events.filter((e) => e.type === "capture").length;
    assert.ok(ms <= 25000, `seed ${seed}: ${ms} ms`);
    if (ms > CLIP_MS) assert.ok(best.relays >= 6 || captures >= 3, `seed ${seed}: an ordinary turn (${best.relays} relays, ${captures} captures) ran ${ms} ms`);
  }
  const absurd = { relays: 40, drops: 400, events: Array.from({ length: 400 }, () => ({ type: "drop" })) };
  assert.equal(clipPace(absurd, 150), 45);
});

test("the caption says what happened in plain words", () => {
  assert.equal(clipCaption({ relays: 2, seeds: 8, drops: 20 }, "Nnamdi"), "My best turn against Nnamdi at Nchò: 2 relays, 8 seeds captured. Ayo & Nchò — Nigerian Mancala in 3D.");
  assert.equal(clipCaption({ relays: 1, seeds: 0, drops: 9 }, "Adaeze", "ayo"), "My best turn against Adaeze at Ayo: 1 relay. Ayo & Nchò — Nigerian Mancala in 3D.");
  assert.match(clipCaption({ relays: 0, seeds: 0, drops: 3 }, "Mama Ngozi"), /3 seeds sown/);
});
