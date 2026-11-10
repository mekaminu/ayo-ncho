// Who you play, you finish with (web/keepopp.js): a pick of opponent while a game against the computer is under way waits
// for the next game; a game not begun, none kept, or two of us take it at once; the words, in English and in French; and
// game.js routes both pickers (Home's pills, Settings → Opponent) through it, so the record and rating credit the right one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { underWay, choose, waiting, seated, nextWords, withWords } from "../web/keepopp.js";
import { record, parse as parseRecord } from "../web/record.js";
import { translate } from "../web/i18n.js";

const kept = (n, level = "hard", local = false) => ({ moves: Array(n).fill(0), level, local });

test("only a game against the computer with a move in it is under way", () => {
  assert.equal(underWay(null), false);
  assert.equal(underWay(kept(0)), false, "a board just dealt: nothing to keep");
  assert.equal(underWay(kept(1)), true);
  assert.equal(underWay(kept(30, "hard", true)), false, "two of us has no computer opponent");
  assert.equal(underWay({ level: "hard" }), false);
});

test("a pick mid-game waits; a pick with nothing under way sits down at once", () => {
  assert.deepEqual(choose({ kept: kept(12, "hard"), level: "hard", pick: "easy" }), { level: "hard", next: "easy" });
  assert.deepEqual(choose({ kept: kept(12, "hard"), level: "hard", pick: "hard" }), { level: "hard", next: null }, "back to the game's own: nobody waits");
  assert.deepEqual(choose({ kept: null, level: "hard", pick: "easy" }), { level: "easy", next: null });
  assert.deepEqual(choose({ kept: kept(0, "hard"), level: "hard", pick: "easy" }), { level: "easy", next: null });
  assert.deepEqual(choose({ kept: kept(9, "hard", true), level: "hard", pick: "easy" }), { level: "easy", next: null });
  assert.deepEqual(choose({ kept: kept(9, "medium"), level: "easy", pick: "master" }), { level: "medium", next: "master" }, "the kept game's own opponent wins over what the screen held");
});

test("after a reload or Continue the pick still waits; a new game seats it", () => {
  assert.equal(waiting({ kept: kept(5, "hard"), chosen: "easy" }), "easy");
  assert.equal(waiting({ kept: kept(5, "hard"), chosen: "hard" }), null);
  assert.equal(waiting({ kept: null, chosen: "easy" }), null);
  assert.equal(waiting({ kept: kept(5, "hard", true), chosen: "easy" }), null);
  assert.equal(seated("hard", "easy"), "easy");
  assert.equal(seated("hard", null), "hard");
});

test("the hole it closes: a game lost to Mama Ngozi cannot be handed to Adaeze and counted as a win over her", () => {
  // play a real game as the board would: the computer's seat is played by whoever `level` says
  let s = newGame("ncho"); let level = "hard", next = null; const seen = new Set();
  const rnd = ((x) => () => (x = (x * 9301 + 49297) % 233280) / 233280)(5);
  while (!s.over) {
    if (s.moves.length === 10) ({ level, next } = choose({ kept: { moves: s.moves, level, local: false }, level, pick: "easy" }));
    if (s.turn === 1) seen.add(level);
    const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state;
  }
  assert.deepEqual([...seen], ["hard"], "Mama Ngozi played every one of her moves");
  const r = record(parseRecord(null), level, s.stores[0], s.stores[1], 1);
  const games = (e) => e.w + e.l + e.d;
  assert.ok(r.counted && games(r.data.hard) === 1 && games(r.data.easy) === 0, "the result is hers");
  assert.equal(seated(level, next), "easy", "and Adaeze sits down for the next game");
});

test("the words, in English and in French", () => {
  assert.equal(nextWords("easy", "Mama Ngozi", "Adaeze"), "Adaeze next game · Mama Ngozi finishes this one");
  assert.equal(nextWords(null, "Mama Ngozi", "Adaeze"), null);
  assert.equal(withWords("easy", "Mama Ngozi"), "with Mama Ngozi");
  assert.equal(withWords(null, "Mama Ngozi"), "");
  const fr = (s) => translate(s, "fr");
  assert.equal(fr("Adaeze next game · Mama Ngozi finishes this one"), "Adaeze à la prochaine partie · Mama Ngozi termine celle-ci");
  assert.equal(fr("you trail 8 – 14 · 20 moves in · with Mama Ngozi"), "vous êtes mené 8 – 14 · 20 coups joués · contre Mama Ngozi");
  assert.equal(fr("you lead 9 – 4 · 1 move in"), "vous menez 9 – 4 · 1 coup joué", "Continue's own line is French now too");
  assert.equal(fr("level 0 – 0 · 2 moves in"), "à égalité 0 – 0 · 2 coups joués");
});

test("game.js sends both pickers through it, and a new game seats the one waiting", () => {
  const src = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.equal((src.match(/const w = pickOpponent\(b\.dataset\.level\)/g) || []).length, 2, "Home's pills and Settings → Opponent");
  assert.ok(!/level = b\.dataset\.level/.test(src), "no picker swaps the opponent of the game on the board");
  assert.match(src, /level = oppSeated\(level, nextLevel\); nextLevel = null;/);
  assert.match(src, /nextLevel = oppWaiting\(/, "a reload or Continue keeps the pick waiting");
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.ok(sw.includes("'./keepopp.js'"), "kept for offline play");
});
