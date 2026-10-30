import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { seedsLeft, inLast8, crossed, last8Words, sweepOf, sweepWords, crossedWords, LAST } from "../web/last8.js";
import { sowPath, pathWords, playedWords } from "../web/path.js";
import { CHARACTERS, MOOD_FOR } from "../web/characters.js";

function rng(seed) { return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
function games(variant, n, seed, fn) {
  const r = rng(seed);
  for (let g = 0; g < n; g++) {
    let s = newGame(variant); const seen = [];
    while (!s.over && s.moves.length < 400) {
      const legal = legalMoves(s); const m = legal[Math.floor(r() * legal.length)];
      const { state: next, events } = applyMove(s, m); fn(s, m, next, events, seen); s = next;
    }
  }
}

test("the engine marks the last-8 sweep, and only the sweep", () => {
  let sweeps = 0;
  games("ncho", 300, 11, (s, m, next, events) => {
    const caps = events.filter((e) => e.type === "capture"); const sw = caps.filter((e) => e.last8);
    assert.ok(sw.length <= 1, "one sweep at most per move");
    if (sw.length) {
      sweeps++;
      const e = sw[0]; assert.equal(caps[caps.length - 1], e, "the sweep comes after every other capture");
      assert.equal(seedsLeft(next), 0, "a sweep leaves the board empty");
      assert.ok(seedsLeft(s) <= LAST || e.n < 4, "a sweep only happens in the last 8 (or the bankruptcy under 4)");
    }
    for (const e of caps) if (!e.last8) assert.equal(e.n, 4, "every other Nchò capture is a pit of 4");
    // the rule as the board shows it: a move begun in the last 8 that captures anything sweeps whatever is left (to the last capturer)
    if (inLast8(s) && caps.length && caps.reduce((a, e) => a + e.n, 0) < seedsLeft(s)) assert.ok(sw.length, "a capture in the last 8 takes them all");
  });
  assert.ok(sweeps > 50, `sweeps seen: ${sweeps}`);
  games("ayo", 100, 5, (s, m, next, events) => { assert.ok(!events.some((e) => e.last8), "Ayo has no last 8"); assert.equal(inLast8(s), false); });
});

test("the board crosses into the last 8 once a game, and it holds until the end", () => {
  let crossings = 0, games8 = 0;
  const r = rng(3);
  for (let g = 0; g < 200; g++) {
    let s = newGame("ncho"); let n = 0, was = false;
    while (!s.over) {
      const legal = legalMoves(s); const next = applyMove(s, legal[Math.floor(r() * legal.length)]).state;
      if (crossed(s, next)) { n++; assert.ok(seedsLeft(next) <= 8 && seedsLeft(next) >= 4, "with fewer than 4 the board is swept at once"); }
      if (was && !next.over) assert.ok(inLast8(next), "seeds only ever leave the board: once in the last 8, it stays");
      was = was || inLast8(next); s = next;
    }
    assert.ok(n <= 1); crossings += n; games8 += was ? 1 : 0;
    assert.equal(inLast8(s), false, "not once the game is over");
  }
  assert.equal(crossings, games8); assert.ok(crossings > 20, `games reaching the last 8: ${crossings}`);
});

test("the rule switched off in Settings: no last 8", () => {
  const s = newGame("ncho", { last8: false }); s.pits = [2, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 0]; s.stores = [20, 22];
  assert.equal(inLast8(s), false);
  const on = newGame("ncho"); on.pits = s.pits.slice(); on.stores = s.stores.slice();
  assert.equal(inLast8(on), true); assert.equal(seedsLeft(on), 6);
});

test("the words", () => {
  const s = newGame("ncho"); s.pits = [2, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 0]; s.stores = [20, 22];
  assert.equal(last8Words(s), "6 seeds left · the next capture takes them all");
  s.pits = [4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0]; assert.equal(last8Words(s), "8 seeds left · the next capture takes them all");
  assert.equal(crossedWords(s), "8 seeds left — the next capture takes them all");
  assert.equal(sweepWords({ by: 0, n: 6 }, { you: 0 }), "the last 6 go to you");
  assert.equal(sweepWords({ by: 0, n: 6 }, { you: 1, played: true }), "the last 6 went to them");
  assert.equal(sweepWords(null), "");
  assert.equal(sweepOf([{ type: "drop", pit: 1 }]), null);
});

test("the hint line and their move's words say when a move sweeps the last seeds", () => {
  let said = 0;
  games("ncho", 200, 17, (s, m, next, events) => {
    const sw = sweepOf(events); const p = sowPath(s, m);
    assert.deepEqual(p.sweep, sw, "the path carries the engine's own sweep");
    if (!sw) { assert.ok(!pathWords(p, { you: s.turn }).includes("the last ")); return; }
    said++;
    assert.match(pathWords(p, { you: s.turn }), new RegExp(`the last ${sw.n} go to ${sw.by === s.turn ? "you" : "them"}`));
    assert.match(playedWords(p, { you: 1 - s.turn }), new RegExp(`the last ${sw.n} went to ${sw.by === s.turn ? "them" : "you"}`));
  });
  assert.ok(said > 20);
});

test("every opponent has a word for the last 8", () => {
  for (const k of ["easy", "medium", "hard"]) assert.ok(CHARACTERS[k].lines.last8.length >= 2, k);
  assert.equal(MOOD_FOR.last8, "surprised");
});
