// Launch L8: Auntie Bisi (Steady) sits between Easy and Medium, and your rating against the computer (web/rating.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { chooseMove, rateMoves, LEVELS } from "../engine/ai.js";
import { parse, rate, homeLine, cardWords, tickAt, expected, kFor, OPPONENT, START, FLOOR, SETTLING } from "../web/rating.js";
import { CHARACTERS, faceFor, runLine } from "../web/characters.js";
import { LEVELS as RECORD_LEVELS } from "../web/record.js";
import { LADDER } from "../web/lesson.js";
import { levelOpen, parseOwned } from "../web/entitle.js";
import { match, seeded } from "../tools/ladder-match.js";

test("Auntie Bisi searches deeper than Adaeze and shallower than Nnamdi, and always plays a legal move", () => {
  assert.ok(LEVELS.steady.depth > LEVELS.easy.depth && LEVELS.steady.depth < LEVELS.medium.depth);
  assert.ok(LEVELS.steady.depth >= 2 && LEVELS.steady.depth <= 3);
  for (const variant of ["ncho", "ayo"]) {
    const rng = seeded(7); let s = newGame(variant, {}, 0), n = 0;
    while (!s.over && n++ < 300) { const m = chooseMove(s, "steady", rng); assert.ok(legalMoves(s).includes(m)); s = applyMove(s, m).state; }
  }
  assert.ok(rateMoves(newGame("ncho"), "steady").length === 6);
});

test("on the ladder she beats Adaeze and loses to Nnamdi (20 games a pair, seeded)", () => {
  const up = match("steady", "easy", 20), down = match("medium", "steady", 20);
  assert.ok(up.score >= 0.65, `steady vs easy ${up.score}`);
  assert.ok(down.score >= 0.6, `medium vs steady ${down.score}`);
});

test("she is a whole character: a face in every mood, lines for every moment, run words; free, on the ladder and in the record", () => {
  const c = CHARACTERS.steady; assert.equal(c.name, "Auntie Bisi"); assert.equal(c.level, "Steady");
  for (const k of Object.keys(CHARACTERS.medium.lines)) assert.ok(c.lines[k] && c.lines[k].length >= 1, k);
  assert.notEqual(faceFor("steady"), faceFor("medium")); assert.ok(faceFor("steady", "happy").includes('stroke="#c8932f"'), "her glasses stay on");
  assert.ok(runLine("steady", 3) && runLine("steady", -5));
  assert.ok(RECORD_LEVELS.includes("steady")); assert.deepEqual(LADDER.slice(0, 3), ["easy", "steady", "medium"]);
  assert.equal(levelOpen("steady", parseOwned("[]")), true);
});

test("the rating starts at 1000 and a win moves it up, a loss down, by Elo against the opponent's rating", () => {
  let d = parse(null); assert.deepEqual(d, { r: START, n: 0, last: null, change: null }); assert.equal(homeLine(d), "");
  let r = rate(d, "medium", 27, 21, 1); assert.equal(r.counted, true); assert.equal(r.before, 1000);
  assert.equal(r.change, Math.round(40 * (1 - expected(1000, 1150)))); assert.ok(r.change > 20); d = r.data;
  r = rate(d, "medium", 27, 21, 1); assert.equal(r.counted, false, "the same game is counted once"); assert.equal(r.data.r, d.r);
  const lossEasy = rate(parse(null), "easy", 20, 28, 9).change, lossHard = rate(parse(null), "hard", 20, 28, 9).change;
  assert.ok(lossEasy < lossHard && lossHard < 0, "losing to a weak opponent costs more than losing to a strong one");
  const winEasy = rate(parse(null), "easy", 28, 20, 9).change, winMaster = rate(parse(null), "master", 28, 20, 9).change;
  assert.ok(winMaster > winEasy && winEasy > 0);
  assert.equal(rate(parse(null), "steady", 24, 24, 3).change, Math.round(40 * (0.5 - expected(1000, OPPONENT.steady))));
  assert.equal(rate(parse(null), "nobody", 28, 20, 4).change, rate(parse(null), "medium", 28, 20, 4).change);
});

test("it settles: K 40 for the first 10 games, then 24; never below 100; ratings line up with the ladder", () => {
  assert.equal(kFor(0), 40); assert.equal(kFor(SETTLING - 1), 40); assert.equal(kFor(SETTLING), 24);
  let d = parse(null); for (let g = 0; g < 200; g++) d = rate(d, "easy", 10, 38, g).data;
  assert.equal(d.r >= FLOOR, true); assert.equal(d.n, 200);
  const order = ["easy", "steady", "medium", "hard", "master"].map((k) => OPPONENT[k]);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  // someone who always beats Nnamdi and always loses to Mama Ngozi ends between them
  d = parse(null); for (let g = 0; g < 400; g++) d = rate(d, g % 2 ? "medium" : "hard", g % 2 ? 30 : 18, g % 2 ? 18 : 30, g).data;
  assert.ok(d.r > OPPONENT.medium && d.r < OPPONENT.hard, d.r);
});

test("the words on Home and the card, and the tick from before to after", () => {
  let d = parse(null); d = rate(d, "medium", 30, 18, 1).data;
  assert.equal(homeLine(d), `Your rating ${d.r} · 9 more games to settle`);
  for (let g = 2; g <= 9; g++) d = rate(d, "medium", 30, 18, g).data;
  assert.equal(homeLine(d), `Your rating ${d.r} · 1 more game to settle`);
  d = rate(d, "medium", 18, 30, 10).data; assert.equal(homeLine(d), `Your rating ${d.r} · −${-d.change} last game`);
  assert.equal(cardWords("hard", 31, "win", "Mama Ngozi"), "+31 for beating Mama Ngozi (1600)");
  assert.equal(cardWords("easy", -35, "loss", "Adaeze"), "−35 for losing to Adaeze (600)");
  assert.equal(cardWords("steady", 0, "draw", "Auntie Bisi"), "±0 for a draw with Auntie Bisi (950)");
  assert.equal(tickAt(1000, 1018, 0), 1000); assert.equal(tickAt(1000, 1018, 1), 1018); assert.equal(tickAt(1000, 980, 0.5), 990); assert.equal(tickAt(1000, 1018, 2), 1018);
  assert.equal(parse("not json").r, 1000); assert.equal(parse('{"r":-5,"n":"x"}').r, 1000); assert.equal(parse('{"r":1234,"n":12,"last":7,"change":-9}').change, -9);
});
