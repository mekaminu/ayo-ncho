// Your week of puzzles (idea 7 Nov): the result card's strip of Mon … Sun.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weekKeys, weekStrip, weekLine, weekLabel, letterOf, solvedIn, weekShare } from "../web/week.js";
import { parse, record, markShown } from "../web/daily.js";
import { translate } from "../web/i18n.js";

test("the week runs Monday to Sunday around any day, across a month's end", () => {
  assert.deepEqual(weekKeys("2026-11-09"), ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
  assert.deepEqual(weekKeys("2026-11-15"), weekKeys("2026-11-09")); // Sunday belongs to the week before it, not after
  assert.deepEqual(weekKeys("2026-11-07"), ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
  assert.deepEqual(weekKeys("2026-12-02"), ["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]);
  for (let d = 1; d <= 60; d++) { const k = new Date(2026, 10, d); const key = `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, "0")}-${String(k.getDate()).padStart(2, "0")}`; const w = weekKeys(key); assert.equal(w.length, 7); assert.ok(w.includes(key)); assert.equal(new Date(...w[0].split("-").map((x, i) => (i === 1 ? x - 1 : +x))).getDay(), 1); }
});

test("each day's state: solved, shown, tried, missed, today open, ahead — this game only", () => {
  let d = parse(null);
  d = record(d, "2026-11-09", "ncho", 8, 8).data;          // Mon solved
  d = record(d, "2026-11-10", "ncho", 3, 8).data;          // Tue tried
  d = record(d, "2026-11-10", "ncho", 4, 8).data;
  d = markShown(d, "2026-11-10", "ncho");                  // …and shown: shown wins over tried
  d = record(d, "2026-11-11", "ayo", 6, 6).data;           // Wed solved, but in Ayo
  d = record(d, "2026-11-12", "ncho", 2, 9).data;          // Thu tried
  const s = weekStrip(d, "2026-11-13", "ncho");            // today is Friday
  assert.deepEqual(s.map((x) => x.state), ["solved", "shown", "missed", "tried", "open", "ahead", "ahead"]);
  assert.deepEqual(s.map((x) => x.today), [false, false, false, false, true, false, false]);
  assert.deepEqual(s.map((x) => x.level), [1, 1, 2, 2, 3, 3, 4]);
  assert.equal(solvedIn(s), 1);
  assert.equal(weekStrip(d, "2026-11-13", "ayo")[2].state, "solved");
  // before the weekly puzzles there is no level to show
  assert.deepEqual(weekStrip(d, "2026-11-07", "ncho").map((x) => x.level), [null, null, null, null, null, null, null]);
});

test("the line: the count, Sunday's the hard one, today's the hard one on Sunday, every day", () => {
  let d = parse(null);
  assert.equal(weekLine(weekStrip(d, "2026-11-11", "ncho")), "This week · none yet · Sunday's the hard one");
  d = record(d, "2026-11-09", "ncho", 5, 5).data; d = record(d, "2026-11-11", "ncho", 7, 7).data;
  assert.equal(weekLine(weekStrip(d, "2026-11-11", "ncho")), "This week · 2 of 7 · Sunday's the hard one");
  assert.equal(weekLine(weekStrip(d, "2026-11-15", "ncho")), "This week · 2 of 7 · today's the hard one");
  d = record(d, "2026-11-15", "ncho", 9, 9).data;
  assert.equal(weekLine(weekStrip(d, "2026-11-15", "ncho")), "This week · 3 of 7");
  for (const k of weekKeys("2026-11-15")) d = record(d, k, "ncho", 9, 9).data;
  assert.equal(weekLine(weekStrip(d, "2026-11-15", "ncho")), "Every day this week ✓");
  // the week before the ramp: just the count
  let o = record(parse(null), "2026-11-05", "ncho", 4, 4).data;
  assert.equal(weekLine(weekStrip(o, "2026-11-07", "ncho")), "This week · 1 of 7");
});

test("every line it can say is French too", () => {
  const lines = ["This week · none yet", "This week · 1 of 7", "This week · 6 of 7 · Sunday's the hard one", "This week · none yet · today's the hard one", "Every day this week ✓", "This week"];
  for (const l of lines) { const f = translate(l, "fr"); assert.notEqual(f, l, l); assert.doesNotMatch(f, /week|hard|none/, l); }
  assert.equal(translate("This week · 3 of 7 · Sunday's the hard one", "fr"), "Cette semaine · 3 sur 7 · dimanche, la plus corsée");
});

test("letters and what a screen reader hears, in both languages", () => {
  assert.equal([0, 1, 2, 3, 4, 5, 6].map((i) => letterOf(i)).join(""), "MTWTFSS");
  assert.equal([0, 1, 2, 3, 4, 5, 6].map((i) => letterOf(i, "fr")).join(""), "LMMJVSD");
  const d = record(parse(null), "2026-11-09", "ncho", 8, 8).data; const s = weekStrip(d, "2026-11-10", "ncho");
  assert.equal(weekLabel(s), "This week, 1 of 7 solved: Monday solved, Tuesday today, not played yet, Wednesday to come, Thursday to come, Friday to come, Saturday to come, Sunday to come");
  assert.match(weekLabel(s, "fr"), /^Cette semaine, 1 sur 7 résolues: lundi résolue, mardi aujourd’hui/);
});

test("the card carries the strip, painted from game.js, and it keeps still for reduced motion", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(html, /id="pzWeek"[^>]*role="img"/); assert.match(html, /id="pzWeekPits"/); assert.match(html, /id="pzWeekLine"/);
  assert.match(html, /prefers-reduced-motion:reduce\)\{[^}]*\.pzWeekPits \.drop \.p i/);
  assert.match(game, /from '\.\/week\.js'/); assert.match(game, /paintWeek\(firstSolve\)/);
});

test("share your week: the share's last line marks Mon … Sun and the count, the same in French", () => {
  let d = parse(null);
  d = record(d, "2026-11-09", "ncho", 8, 8).data;          // Mon solved
  d = record(d, "2026-11-10", "ncho", 3, 8).data; d = markShown(d, "2026-11-10", "ncho"); // Tue shown
  d = record(d, "2026-11-12", "ncho", 2, 9).data;          // Thu tried; Wed missed
  d = record(d, "2026-11-13", "ncho", 9, 9).data;          // Fri (today) solved
  const s = weekStrip(d, "2026-11-13", "ncho");
  assert.equal(weekShare(s), "This week ●◐–○●·· (2 of 7)");
  assert.equal(translate(weekShare(s), "fr"), "Cette semaine ●◐–○●·· (2 sur 7)");
  assert.equal(weekShare(weekStrip(parse(null), "2026-11-09", "ncho")), "This week ······· (0 of 7)");
  let all = parse(null); for (const k of weekKeys("2026-11-15")) all = record(all, k, "ayo", 9, 9).data;
  assert.equal(weekShare(weekStrip(all, "2026-11-15", "ayo")), "This week ●●●●●●● (7 of 7)");
  assert.equal(translate(weekShare(weekStrip(all, "2026-11-15", "ayo")), "fr"), "Cette semaine ●●●●●●● (7 sur 7)");
  for (const st of ["solved", "shown", "tried", "missed", "open", "ahead"]) assert.equal(weekShare(Array.from({ length: 7 }, (_, i) => ({ i, state: st }))).length, "This week ••••••• (0 of 7)".length);
});

test("the puzzle's Share sends today's result, then the week", () => {
  const src = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(src, /shareText\(p, puzzle\.got\) \+ '\\n' \+ weekShare\(weekStrip\(daily, p\.key, p\.variant\)\)/);
});
