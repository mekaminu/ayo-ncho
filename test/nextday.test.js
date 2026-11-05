// The next puzzle: the result card's countdown to the new day's position, and Home's card turning at midnight (web/nextday.js).
process.env.TZ = "Europe/London"; // the phone's own clock; the tests below cross both of its clock changes
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextMidnight, msToNext, spanWords, nextLine, nextTick, dayTurned } from "../web/nextday.js";
import { todayKey, dailyPuzzle } from "../engine/puzzle.js";
import { translate } from "../web/i18n.js";

const at = (y, mo, d, h = 0, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s).getTime();
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

test("the next midnight is the moment the puzzle's day changes, clock changes included", () => {
  for (const [y, mo, d] of [[2026, 11, 5], [2026, 10, 24], [2026, 10, 25], [2026, 3, 28], [2026, 3, 29], [2026, 12, 31], [2028, 2, 28]]) {
    for (const h of [0, 1, 6, 12, 23]) {
      const now = at(y, mo, d, h, 17, 3), mid = nextMidnight(now);
      assert.notEqual(todayKey(new Date(mid)), todayKey(new Date(now)), "the key has changed at midnight");
      assert.equal(todayKey(new Date(mid - 1)), todayKey(new Date(now)), "and not a moment before");
      assert.equal(new Date(mid).getHours(), 0); assert.equal(new Date(mid).getMinutes(), 0);
      assert.equal(dailyPuzzle(todayKey(new Date(mid))).key, todayKey(new Date(mid)), "the new day's puzzle is the one the card opens");
    }
  }
  assert.equal(msToNext(at(2026, 10, 25, 0, 0, 0)), 25 * 3600e3, "the day the clocks go back is 25 hours long");
  assert.equal(msToNext(at(2026, 3, 29, 0, 0, 0)), 23 * 3600e3, "the day they go forward, 23");
  assert.equal(msToNext(at(2026, 11, 5, 23, 59, 59)), 1000);
});

test("the span in words: hours and minutes, whole minutes left, never 0 min", () => {
  assert.equal(spanWords(5 * 3600e3 + 12 * 60e3), "5 h 12 min");
  assert.equal(spanWords(5 * 3600e3 + 12 * 60e3 + 59e3), "5 h 12 min");
  assert.equal(spanWords(5 * 3600e3 + 12 * 60e3 - 1), "5 h 11 min");
  assert.equal(spanWords(3 * 3600e3), "3 h");
  assert.equal(spanWords(42 * 60e3), "42 min");
  assert.equal(spanWords(60e3), "1 min");
  assert.equal(spanWords(119e3), "1 min");
  assert.equal(spanWords(59e3), "under a minute");
  assert.equal(spanWords(0), "under a minute");
  assert.equal(spanWords(24 * 3600e3), "24 h");
  for (let ms = 0; ms < 25 * 3600e3; ms += 977e3) assert.match(spanWords(ms), /^(\d+ h( \d+ min)?|\d+ min|under a minute)$/);
});

test("the line: solved or shown counts down to the next; still open says how long is left; the new day is ready", () => {
  const now = at(2026, 11, 5, 18, 48, 0), key = todayKey(new Date(now));
  assert.deepEqual(nextLine({ got: 8, target: 8, solved: true }, key, now), { text: "Next puzzle in 5 h 12 min", ready: false });
  assert.deepEqual(nextLine({ got: 0, target: 8, solved: false, shown: true }, key, now), { text: "Next puzzle in 5 h 12 min", ready: false });
  assert.deepEqual(nextLine({ got: 5, target: 8, solved: false }, key, now), { text: "5 h 12 min left to solve today's", ready: false });
  assert.deepEqual(nextLine(null, key, now), { text: "5 h 12 min left to solve today's", ready: false });
  const late = at(2026, 11, 5, 23, 59, 30);
  assert.equal(nextLine({ solved: true }, key, late).text, "Next puzzle in under a minute");
  assert.equal(nextLine({ solved: false }, key, late).text, "Under a minute left to solve today's");
  const after = at(2026, 11, 6, 0, 0, 1);
  assert.deepEqual(nextLine({ solved: true }, key, after), { text: "Tomorrow's puzzle is here · tap to play it", ready: true });
  assert.deepEqual(nextLine(null, key, after), { text: "Tomorrow's puzzle is here · tap to play it", ready: true }, "unsolved too: the card's puzzle is yesterday's");
  assert.equal(nextLine({ solved: true }, todayKey(new Date(after)), after).ready, false, "the new day's own card counts down again");
});

test("it looks again on the minute and never past midnight", () => {
  for (let now = at(2026, 11, 5, 23, 40, 7); now < at(2026, 11, 6, 0, 1); now += 7919) {
    const t = nextTick(now);
    assert.ok(t >= 250 && t <= 60050, `${t}`);
    assert.ok(now + t <= nextMidnight(now) + 50 || now + t - 50 <= nextMidnight(now), "midnight is never skipped");
    const after = now + t; const minuteNow = Math.floor(now / 60000), minuteAfter = Math.floor(after / 60000);
    assert.ok(minuteAfter >= minuteNow, "never before the next minute's words could change… ");
    assert.ok(minuteAfter <= minuteNow + 1, "…and never a whole minute late");
  }
  // walking the ticks from a solved card across midnight: the words step down a minute at a time and the day turns once
  const key = "2026-11-05"; let now = at(2026, 11, 5, 23, 55, 12); const seen = [];
  while (now < at(2026, 11, 6, 0, 2)) { const n = nextLine({ solved: true }, key, now); if (seen[seen.length - 1] !== n.text) seen.push(n.text); now += nextTick(now); }
  assert.deepEqual(seen, ["Next puzzle in 4 min", "Next puzzle in 3 min", "Next puzzle in 2 min", "Next puzzle in 1 min", "Next puzzle in under a minute", "Tomorrow's puzzle is here · tap to play it"]);
});

test("Home's card turns with the day", () => {
  assert.equal(dayTurned("2026-11-05", at(2026, 11, 5, 23, 59, 59)), false);
  assert.equal(dayTurned("2026-11-05", at(2026, 11, 6, 0, 0, 0)), true);
  assert.equal(dayTurned(null, at(2026, 11, 6)), false, "a card never painted is left alone");
});

test("in French, every line the card can show", () => {
  const now = at(2026, 11, 5, 18, 48, 0), key = "2026-11-05";
  const cases = [
    [nextLine({ solved: true }, key, now).text, "Prochaine énigme dans 5 h 12 min"],
    [nextLine(null, key, now).text, "Encore 5 h 12 min pour résoudre celle du jour"],
    [nextLine({ solved: true }, key, at(2026, 11, 5, 21)).text, "Prochaine énigme dans 3 h"],
    [nextLine({ solved: true }, key, at(2026, 11, 5, 23, 18)).text, "Prochaine énigme dans 42 min"],
    [nextLine({ solved: true }, key, at(2026, 11, 5, 23, 59, 30)).text, "Prochaine énigme dans moins d’une minute"],
    [nextLine(null, key, at(2026, 11, 5, 23, 59, 30)).text, "Moins d’une minute pour résoudre celle du jour"],
    [nextLine(null, key, at(2026, 11, 6, 0, 1)).text, "La nouvelle énigme est là · touchez pour y jouer"],
  ];
  for (const [en, fr] of cases) assert.equal(translate(en, "fr"), fr, en);
  for (let ms = 0; ms < 25 * 3600e3; ms += 1301e3) {
    for (const e of [null, { solved: true }]) { const en = nextLine(e, key, nextMidnight(now) - ms - 1).text; assert.notEqual(translate(en, "fr"), en, en); }
  }
});

test("the page wires it: the line on the result card, the tap, the minute's tick, Home's card, offline", () => {
  const html = read("web/index.html"), game = read("web/game.js"), sw = read("web/sw.js");
  assert.match(html, /<p class="pzNext" id="pzNext" hidden/);
  assert.ok(html.indexOf('id="pzNext"') > html.indexOf('id="pzRun"') && html.indexOf('id="pzNext"') < html.indexOf('id="pzShare"'), "under your best and the run");
  assert.match(html, /prefers-reduced-motion:reduce\)\{[^}]*\.pzNext\.glint/);
  assert.match(game, /from '\.\/nextday\.js'/);
  assert.match(game, /paintRemindOffer\(\); paintNext\(\);/, "the result card paints it");
  assert.match(game, /\$\('#pzShow'\)\.hidden = true; paintNext\(\);/, "and the shown move's card");
  assert.match(game, /addEventListener\('click', nextPuzzleNow\)/);
  assert.match(game, /dayTurned\(puzzleCardKey\)/);
  assert.match(game, /puzzleCardKey = p\.key/);
  assert.match(sw, /'\.\/nextday\.js'/);
  for (const line of game.split("\n").filter((l) => /\b(paintNext|dayTick|nextPuzzleNow)\b/.test(l))) assert.ok(!/^\s*\/\//.test(line), "nothing left behind a comment");
});
