// The race to 25: the word under each score says "N to win" once a side is close and 25 is still within reach (web/race.js).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, totalSeeds, WIN_SEEDS } from "../engine/ayo.js";
import { raceOf, raceWords, raceGlint, SHOW, CLOSE } from "../web/race.js";
import { translate } from "../web/i18n.js";

function randomGames(variant, n, fn) {
  let x = 7;
  const r = () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; };
  for (let g = 0; g < n; g++) {
    let s = newGame(variant, {}, g % 2);
    while (!s.over) { const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(r() * legal.length)]).state; fn(s); }
  }
}

test("the words: far off and won say captured; close counts down, brass from 3", () => {
  assert.equal(raceWords(raceOf(0, 0)), "captured");
  assert.equal(raceWords(raceOf(14, 10)), "captured", "11 away is still far off");
  assert.equal(raceWords(raceOf(15, 10)), "10 to win");
  assert.deepEqual(raceOf(22, 10), { need: 3, close: true });
  assert.deepEqual(raceOf(21, 10), { need: 4, close: false });
  assert.equal(raceWords(raceOf(24, 0)), "1 to win");
  assert.equal(raceOf(25, 3), null, "won");
  assert.equal(raceOf(30, 18), null);
  assert.equal(SHOW, 10); assert.equal(CLOSE, 3);
});

test("never once 25 is out of reach: the other side holds 24 or more", () => {
  assert.equal(raceOf(20, 24), null);
  assert.equal(raceOf(24, 24), null, "24–24 is the draw");
  assert.deepEqual(raceOf(20, 23), { need: 5, close: false });
  assert.equal(raceOf(10, 5, 16), null, "the lesson's 16 seeds: nobody can reach 25");
});

test("over random games of both kinds, it speaks only when 25 is really still reachable, and the need is exact", () => {
  let said = 0;
  for (const v of ["ncho", "ayo"]) randomGames(v, 80, (s) => {
    for (const p of [0, 1]) {
      const r = raceOf(s.stores[p], s.stores[1 - p], totalSeeds(s));
      const reachable = s.stores[p] + (totalSeeds(s) - s.stores[0] - s.stores[1]) >= WIN_SEEDS;
      if (!r) { assert.ok(s.stores[p] >= WIN_SEEDS || WIN_SEEDS - s.stores[p] > SHOW || !reachable); continue; }
      said++;
      assert.ok(!s.over || s.stores[p] < WIN_SEEDS, "the winner never has a count left");
      assert.equal(r.need, WIN_SEEDS - s.stores[p]); assert.ok(r.need >= 1 && r.need <= SHOW);
      assert.ok(reachable, "the seeds still in play can carry it to 25");
      assert.equal(totalSeeds(s), 48, "seeds kept");
    }
  });
  assert.ok(said > 200, `it spoke often enough to matter (${said})`);
});

test("it glints when it first appears and when it comes within 3, not on every tick", () => {
  assert.equal(raceGlint(null, raceOf(16, 0)), true);
  assert.equal(raceGlint(raceOf(16, 0), raceOf(17, 0)), false);
  assert.equal(raceGlint(raceOf(21, 0), raceOf(22, 0)), true);
  assert.equal(raceGlint(raceOf(22, 0), raceOf(23, 0)), false);
  assert.equal(raceGlint(raceOf(22, 0), null), false);
});

test("in French", () => {
  assert.equal(translate("7 to win", "fr"), "7 pour gagner");
  assert.equal(translate("1 to win", "fr"), "1 pour gagner");
  assert.equal(translate("captured", "fr"), "pris");
});

test("wired: the labels have ids, game.js watches both scores, the offline cache carries race.js", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /id="myScore">0<\/span><span class="lab" id="myLab">captured/);
  assert.match(html, /id="oppScore">0<\/span><span class="lab" id="oppLab">captured/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /from '\.\/race\.js'/);
  assert.match(game, /ob\.observe\(\$\(id\)/);
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/race\.js'/);
});
