// Good morning, at the right time (idea 6 Nov): web/greet.js picks the opponent's first word of a game from the phone's
// clock and the days you have played; every opponent has a word for each part of the day and for coming back, in French too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PARTS, AWAY_DAYS, partOfDay, daysAway, greetMoment } from "../web/greet.js";
import { CHARACTERS, MOOD_FOR, MOODS, line } from "../web/characters.js";
import { translate } from "../web/i18n.js";

test("the parts of the day on the phone's clock", () => {
  const want = { 0: "night", 4: "night", 5: "morning", 11: "morning", 12: "afternoon", 16: "afternoon", 17: "evening", 21: "evening", 22: "night", 23: "night" };
  for (const [h, p] of Object.entries(want)) assert.equal(partOfDay(+h), p, `${h}:00`);
  assert.equal(partOfDay(24), "night"); assert.equal(partOfDay(-1), "night"); assert.equal(partOfDay(7.9), "morning");
  for (let h = 0; h < 24; h++) assert.ok(PARTS.includes(partOfDay(h)));
});

test("days away counts back to the last day with a move, across a month end", () => {
  assert.equal(daysAway([], "2026-11-06"), 0); // never played: nothing to miss
  assert.equal(daysAway(["2026-11-06"], "2026-11-06"), 0);
  assert.equal(daysAway(["2026-11-01", "2026-11-05"], "2026-11-06"), 1);
  assert.equal(daysAway(["2026-10-30"], "2026-11-02"), 3);
  assert.equal(daysAway(["2026-10-01", "2026-10-28", "2026-10-02"], "2026-11-06"), 9);
  assert.equal(daysAway(["2026-12-31"], "2027-01-03"), 3);
  assert.equal(daysAway(["2026-03-28"], "2026-03-31"), 3); // a clock change in between is still whole days
  assert.equal(daysAway(["2026-11-06"], "bad"), 0);
});

test("the first game in each part of the day greets, the next keeps the usual line", () => {
  const days = ["2026-11-05"]; let last = "";
  const g1 = greetMoment({ days, today: "2026-11-06", hour: 8, last });
  assert.deepEqual(g1, { moment: "morning", key: "2026-11-06:morning" }); last = g1.key;
  assert.equal(greetMoment({ days, today: "2026-11-06", hour: 10, last }).moment, "start");
  const g2 = greetMoment({ days, today: "2026-11-06", hour: 13, last }); assert.equal(g2.moment, "afternoon"); last = g2.key;
  assert.equal(greetMoment({ days, today: "2026-11-06", hour: 15, last }).moment, "start");
  assert.equal(greetMoment({ days, today: "2026-11-06", hour: 19, last }).moment, "evening");
  assert.equal(greetMoment({ days, today: "2026-11-06", hour: 23, last }).moment, "night");
  assert.equal(greetMoment({ days, today: "2026-11-07", hour: 8, last: "2026-11-06:morning" }).moment, "morning"); // a new day greets again
  assert.equal(greetMoment({ today: "2026-11-06", hour: 2 }).moment, "night"); // the first game of all
});

test("coming back after 3 days or more is said once, then the day goes on as usual", () => {
  const days = ["2026-11-01"]; // 5 days ago
  assert.equal(AWAY_DAYS, 3);
  const g = greetMoment({ days, today: "2026-11-06", hour: 9, last: "2026-11-01:evening" });
  assert.deepEqual(g, { moment: "back", key: "2026-11-06:morning" });
  // the game was started but no move played yet (the streak has not counted today): no second "back"
  assert.equal(greetMoment({ days, today: "2026-11-06", hour: 9, last: g.key }).moment, "start");
  assert.equal(greetMoment({ days, today: "2026-11-06", hour: 14, last: g.key }).moment, "afternoon");
  // two days away is not away
  assert.equal(greetMoment({ days: ["2026-11-04"], today: "2026-11-06", hour: 9 }).moment, "morning");
  assert.equal(greetMoment({ days: ["2026-11-03"], today: "2026-11-06", hour: 9 }).moment, "back");
});

test("every opponent has a word for each part of the day and for coming back, with a face, in French", () => {
  for (const [level, c] of Object.entries(CHARACTERS)) for (const m of [...PARTS, "back"]) {
    const l = line(level, m); assert.ok(l, `${c.name} has nothing for ${m}`);
    assert.ok(MOODS.includes(MOOD_FOR[m]));
    assert.notEqual(translate(l, "fr"), l, `${c.name} · ${m}: no French`);
  }
});

test("nobody greets the wrong hour any more", () => {
  const GREET = { morning: /morning|ụtụtụ|káàárọ̀/i, afternoon: /afternoon|ehihie|káàsán/i, evening: /evening|mgbede|káalẹ́/i };
  for (const c of Object.values(CHARACTERS)) for (const [m, arr] of Object.entries(c.lines)) for (const l of arr) for (const [part, re] of Object.entries(GREET)) {
    if (re.test(l) && /good |ọma|ẹ k/i.test(l)) assert.equal(m, part, `${c.name} says «${l}» at ${m}`);
  }
});
