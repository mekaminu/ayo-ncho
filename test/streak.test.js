import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, recordDay, daysPlayed, playedToday, unlocked, nextMilestone, homeLine, dayKey, MILESTONES } from "../web/streak.js";

test("a day counts once however many games you play", () => {
  let d = parse(null);
  assert.equal(daysPlayed(d), 0);
  let r = recordDay(d, "2026-10-29"); d = r.data; assert.equal(r.newDay, true); assert.equal(daysPlayed(d), 1);
  r = recordDay(d, "2026-10-29"); d = r.data; assert.equal(r.newDay, false); assert.equal(daysPlayed(d), 1);
  assert.equal(playedToday(d, "2026-10-29"), true); assert.equal(playedToday(d, "2026-10-30"), false);
});

test("missing days is never punished: the count only ever grows", () => {
  let d = parse(null);
  for (const k of ["2026-10-01", "2026-10-09", "2026-10-30"]) d = recordDay(d, k).data;
  assert.equal(daysPlayed(d), 3);
});

test("seven days played unlocks river stones, announced on the day it happens", () => {
  let d = parse(null); let hit = null;
  for (let i = 1; i <= 7; i++) { const r = recordDay(d, `2026-11-${String(i).padStart(2, "0")}`); d = r.data; if (r.unlocked) hit = { day: i, id: r.unlocked.id }; assert.equal(unlocked(d, "stones"), i >= 7); }
  assert.deepEqual(hit, { day: 7, id: "stones" });
  assert.equal(nextMilestone(d), null);
});

test("the Home line says where you are in plain words", () => {
  let d = parse(null);
  assert.match(homeLine(d, "2026-10-29"), /start your calm streak/);
  d = recordDay(d, "2026-10-29").data;
  assert.equal(homeLine(d, "2026-10-29"), "1 day played · today ✓ · 6 more days for river stones");
  assert.equal(homeLine(d, "2026-10-30"), "1 day played · 6 more days for river stones");
  for (let i = 1; i <= 6; i++) d = recordDay(d, `2026-11-0${i}`).data;
  assert.match(homeLine(d, "2026-11-07"), /7 days played · every seed set unlocked/);
});

test("storage survives garbage and old shapes; dayKey is local YYYY-MM-DD", () => {
  assert.deepEqual(parse("not json"), { days: [], seen: [] });
  assert.deepEqual(parse('{"days":["2026-10-29"]}'), { days: ["2026-10-29"], seen: [] });
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.ok(MILESTONES.every((m) => m.days > 0 && m.id && m.name));
});
