// Walking away counts (web/walkaway.js): a game against the computer ended while you trail is a loss to them; one ended
// level or ahead, two of us, a short game or a finished one costs nothing; the words, in English and in French.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";
import { walkedOf, walkAsk, walkToast } from "../web/walkaway.js";
import { KEEP_MIN_MOVES, playAsks } from "../web/keepgame.js";
import { record, parse as parseRecord } from "../web/record.js";
import { rate, parse as parseRating } from "../web/rating.js";
import { counts, countsFor } from "../web/rated.js";
import { translate } from "../web/i18n.js";

const seeded = (seed = 7) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const play = (s, n, rnd) => { for (let i = 0; i < n && !s.over; i++) { const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state; } return s; };

test("only a game against the computer, a few moves in, still on, and you behind", () => {
  const rnd = seeded(11); let counted = 0, asked = 0;
  for (let g = 0; g < 300; g++) {
    const s0 = play(newGame(g % 2 ? "ayo" : "ncho"), Math.floor(rnd() * 80), rnd);
    const kept = { moves: s0.moves, variant: s0.variant, rules: s0.rules, level: "hard", stats: { started: g, biggest: 0, captures: 0 }, local: false };
    const s = replay(kept.moves, kept.variant, kept.rules);
    const w = walkedOf(kept, s);
    const want = !s.over && s.moves.length >= KEEP_MIN_MOVES && s.stores[0] < s.stores[1];
    assert.equal(!!w, want, `${s.moves.length} moves ${s.stores} over ${s.over}`);
    if (w) { counted++; assert.deepEqual([w.you, w.them, w.level, w.id], [s.stores[0], s.stores[1], "hard", g]); assert.equal(w.first, 0); }
    if (playAsks(s.over ? null : s)) asked++;
    if (w) assert.ok(playAsks(s), "a game that would count is always one Play asks about first");
    assert.equal(walkedOf({ ...kept, local: true }, s), null, "two of us is never counted");
  }
  assert.ok(counted > 20 && asked > counted, `${counted} counted of ${asked} asked`);
  assert.equal(walkedOf(null, newGame()), null); assert.equal(walkedOf({ moves: [] }, null), null);
});

test("counted as a loss: the record and the rating come down, once per game, and a take-back hides no loss", () => {
  const kept = { level: "hard", stats: { started: 42 } }; const s = { moves: [0, 6, 1, 7, 2], stores: [4, 12], over: false, first: 0 };
  const w = walkedOf(kept, s); assert.ok(w);
  const r = record(parseRecord(null), w.level, w.you, w.them, w.id); assert.equal(r.outcome, "loss"); assert.equal(r.entry.l, 1); assert.equal(r.entry.run, -1);
  assert.equal(record(r.data, w.level, w.you, w.them, w.id).counted, false, "never twice");
  const q = rate(parseRating(null), w.level, w.you, w.them, w.id); assert.ok(q.change < 0);
  assert.equal(counts(w.stats), true); assert.equal(counts({ ...w.stats, undos: 2 }), false); assert.equal(countsFor({ ...w.stats, undos: 2 }, "loss"), true, "a take-back hides no loss: still rated");
  assert.equal(walkedOf({ ...kept }, { ...s, stores: [8, 8] }), null, "level: left out"); assert.equal(walkedOf(kept, { ...s, stores: [9, 3] }), null, "ahead: left out");
  assert.equal(walkedOf(kept, { ...s, over: true }), null); assert.equal(walkedOf(kept, { ...s, moves: [0, 6, 1] }), null);
});

test("the words, in English and in French", () => {
  const w = walkAsk({ stores: [4, 12] }, "Mama Ngozi");
  assert.deepEqual(w, { title: "New game?", sub: "Tap again — counts as a loss to Mama Ngozi (you trail 4–12)", label: "Start a new game? Your game in progress counts as a loss to Mama Ngozi — tap again to start one, or Continue to keep it" });
  assert.equal(walkAsk({ stores: [1, 2] }, "Adaeze", { keys: true }).sub, "Click again — counts as a loss to Adaeze (you trail 1–2)");
  assert.equal(walkToast({ you: 4, them: 12 }, "Auntie Bisi"), "Counted as a loss to Auntie Bisi (4–12)");
  const fr = (s) => translate(s, "fr");
  assert.equal(fr(w.sub), "Touchez encore — comptée comme une défaite face à Mama Ngozi (vous êtes mené 4–12)");
  assert.equal(fr("Click again — counts as a loss to Papa Ike (you trail 3–9)"), "Cliquez encore — comptée comme une défaite face à Papa Ike (vous êtes mené 3–9)");
  assert.match(fr(w.label), /^Commencer une nouvelle partie \? La partie en cours sera comptée comme une défaite face à Mama Ngozi — touchez encore/);
  assert.match(fr(walkAsk({ stores: [1, 2] }, "Nnamdi", { keys: true }).label), /appuyez encore/);
  assert.equal(fr("Counted as a loss to Auntie Bisi (4–12)"), "Comptée comme une défaite face à Auntie Bisi (4–12)");
  assert.equal(fr("Counted as a loss to Mama Ngozi (8–16) · You start — the loser goes first"), "Comptée comme une défaite face à Mama Ngozi (8–16) · Vous commencez — le perdant joue en premier", "with the start word after it, as the new game's toast says it");
});

test("the game wires it: Play's second tap and a rule changed mid-game count it before the game goes", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(g, /const walked = countWalkAway\(\); walkWord = walked \? walkToast\(/);
  assert.match(g, /function rulesChanged\(\) \{ const walked = countWalkAway\(\); \/\*/);
  assert.match(g, /walkAsk\(saved/);
});
