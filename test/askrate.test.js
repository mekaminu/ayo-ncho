// Ask for a rating, at the right moment: the store's own sheet, only in the apps, only after a win, a few times at most.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RULES, shouldAsk, parseAsked, markAsked, daysBetween, winsOf, makeAsker, testReview } from "../web/askrate.js";
import { parse, record } from "../web/record.js";

const ok = { app: true, result: "win", kind: "computer", wins: 3, days: 3, asked: { n: 0, last: null }, today: "2026-11-07" };

test("asks after a win against the computer once there have been a few wins on a few days", () => {
  assert.deepEqual(shouldAsk(ok), { ask: true, why: "ask" });
  assert.equal(shouldAsk({ ...ok, kind: "room" }).ask, true, "a win over a friend in a room counts too");
});

test("never on the web link, never after a loss or a draw, never in two of us, the lesson, the puzzle or a play-out", () => {
  assert.equal(shouldAsk({ ...ok, app: false }).why, "web");
  assert.equal(shouldAsk({ ...ok, result: "loss" }).why, "result");
  assert.equal(shouldAsk({ ...ok, result: "draw" }).why, "result");
  for (const kind of ["local", "lesson", "puzzle", "playout"]) assert.equal(shouldAsk({ ...ok, kind }).why, "kind", kind);
});

test("never on the first evening: wins and days both needed", () => {
  assert.equal(shouldAsk({ ...ok, wins: RULES.wins - 1 }).why, "wins");
  assert.equal(shouldAsk({ ...ok, days: RULES.days - 1 }).why, "days");
});

test("three times at most, months apart", () => {
  let asked = parseAsked(null); const seen = [];
  for (const today of ["2026-11-07", "2026-11-08", "2027-03-06", "2027-03-07", "2027-07-05", "2027-11-30", "2028-06-01"]) {
    const d = shouldAsk({ ...ok, asked, today }); seen.push(d.why); if (d.ask) asked = markAsked(asked, today);
  }
  assert.deepEqual(seen, ["ask", "gap", "gap", "ask", "ask", "most", "most"]);
  assert.equal(daysBetween("2026-11-07", "2027-03-07"), 120);
  assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
});

test("what is kept is checked on the way back in", () => {
  assert.deepEqual(parseAsked('{"n":2,"last":"2026-11-07"}'), { n: 2, last: "2026-11-07" });
  for (const raw of [null, "", "nonsense", '{"n":-1,"last":"yesterday"}', "[]", "7"]) assert.deepEqual(parseAsked(raw), { n: 0, last: null }, String(raw));
  assert.deepEqual(markAsked({ n: 1, last: "2026-01-01" }, "2026-11-07"), { n: 2, last: "2026-11-07" });
});

test("wins are counted across every opponent", () => {
  let data = parse(null);
  data = record(data, "easy", 30, 18, 1).data; data = record(data, "hard", 26, 22, 2).data; data = record(data, "hard", 20, 28, 3).data;
  assert.equal(winsOf(data), 2); assert.equal(winsOf(null), 0);
});

test("the asker: nothing on the web, the plugin's request in the apps, a failure swallowed", async () => {
  assert.equal(makeAsker(null).supported, false); assert.equal(await makeAsker(null).request(), false);
  const fake = testReview(); const a = makeAsker(fake);
  assert.equal(a.supported, true); assert.equal(await a.request(), true); assert.equal(fake.calls.length, 1);
  const bad = makeAsker({ requestReview: () => Promise.reject(new Error("no store")) });
  assert.equal(await bad.request(), false);
});

test("the game asks from the Game over card, the plugin is in both apps, the service worker carries the file", () => {
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /maybeAskRate\(out \? 'playout'/);
  assert.match(game, /plugin\('InAppReview'\)/);
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/askrate\.js'/);
  assert.match(readFileSync(new URL("../android/capacitor.settings.gradle", import.meta.url), "utf8"), /in-app-review/);
  assert.match(readFileSync(new URL("../ios/App/CapApp-SPM/Package.swift", import.meta.url), "utf8"), /CapacitorCommunityInAppReview/);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.ok(pkg.devDependencies["@capacitor-community/in-app-review"]);
});
