// Go easy on a low battery (idea 6 Nov): web/battery.js decides, the loop draws at most ~30 times a second, physics on Auto stops.
import test from "node:test";
import assert from "node:assert/strict";
import { decideSaver, saverPlan, drawDue, toastFor, noteFor, watchBattery, WORDS, LOW, BACK } from "../web/battery.js";
import { decidePhysics } from "../web/quality.js";

test("low and unplugged goes easy; plugged in or above the line stays full", () => {
  assert.deepEqual(decideSaver({ level: 0.15, charging: false }), { on: true, reason: "battery at 15%" });
  assert.equal(decideSaver({ level: LOW, charging: false }).on, true);
  assert.equal(decideSaver({ level: 0.21, charging: false }).on, false);
  assert.deepEqual(decideSaver({ level: 0.05, charging: true }), { on: false, reason: "charging" });
  assert.deepEqual(decideSaver({ level: null }), { on: false, reason: "this browser cannot tell" });
  assert.deepEqual(decideSaver({}), { on: false, reason: "this browser cannot tell" });
});

test("no flicker: once easy, it stays easy until over 30% or plugged in", () => {
  let s = { on: false };
  const walk = [0.22, 0.2, 0.21, 0.25, 0.3, 0.31, 0.25, 0.2];
  const seen = walk.map((level) => (s = decideSaver({ level, charging: false, was: s.on })).on);
  assert.deepEqual(seen, [false, true, true, true, true, false, false, true]);
  assert.equal(decideSaver({ level: BACK, was: true }).on, true);
  assert.equal(decideSaver({ level: 0.25, charging: true, was: true }).on, false);
});

test("Settings Off and the address win over the battery", () => {
  assert.deepEqual(decideSaver({ level: 0.05, pref: "off" }), { on: false, reason: "chosen in Settings" });
  assert.equal(decideSaver({ level: 0.9, param: "low" }).on, true);
  assert.equal(decideSaver({ level: 0.05, param: "full" }).on, false);
});

test("the plan: one pixel per screen pixel at most, straight flights, ~30 pictures a second", () => {
  assert.deepEqual(saverPlan(true, 3), { on: true, minGap: 30, pixelRatio: 1, physics: false });
  assert.equal(saverPlan(true, 0.75).pixelRatio, 0.75);
  assert.equal(saverPlan(false, 3).on, false);
  // a 60 Hz screen: every other frame drawn, never every third
  const plan = saverPlan(true);
  let last = -Infinity, drawn = 0;
  for (let i = 0; i < 120; i++) { const now = i * (1000 / 60); if (drawDue(now, last, plan)) { drawn++; last = now; } }
  assert.equal(drawn, 60);
  // a 120 Hz screen: every fourth frame
  last = -Infinity; drawn = 0;
  for (let i = 0; i < 240; i++) { const now = i * (1000 / 120); if (drawDue(now, last, plan)) { drawn++; last = now; } }
  assert.ok(drawn >= 58 && drawn <= 82, drawn);
  // not saving: every frame
  assert.equal(drawDue(1, 0, saverPlan(false)), true);
  assert.equal(drawDue(1, 0, null), true);
});

test("seed physics on Auto stops on a low battery; a choice in Settings keeps it", () => {
  assert.deepEqual(decidePhysics({ pref: "auto", saver: true }), { physics: false, reason: "the battery is low" });
  assert.equal(decidePhysics({ pref: "on", saver: true }).physics, true);
  assert.equal(decidePhysics({ pref: "auto", saver: false }).physics, true);
});

test("the words: said once as it switches, the line in Settings", () => {
  assert.equal(toastFor({ on: false }, { on: true }, false), WORDS.on);
  assert.equal(toastFor({ on: true }, { on: false }, true), WORDS.off);
  assert.equal(toastFor({ on: true }, { on: false }, false), WORDS.back);
  assert.equal(toastFor({ on: true }, { on: true }, false), null);
  assert.equal(noteFor({ on: true, reason: "battery at 12%" }), "now saving (battery at 12%)");
  assert.equal(noteFor({ on: false, reason: "charging" }), "now full (charging)");
});

test("watchBattery follows the phone's battery and is quiet where the browser cannot tell", async () => {
  const ls = {}; const bat = { level: 0.5, charging: true, addEventListener(k, f) { (ls[k] = ls[k] || []).push(f); } };
  const seen = [];
  await watchBattery({ getBattery: () => Promise.resolve(bat) }, (b) => seen.push(b));
  bat.level = 0.1; bat.charging = false; ls.chargingchange.forEach((f) => f());
  assert.deepEqual(seen, [{ level: 0.5, charging: true }, { level: 0.1, charging: false }]);
  assert.equal(await watchBattery({}, () => assert.fail()), null);
  assert.equal(await watchBattery({ getBattery: () => Promise.reject(new Error("no")) }, () => assert.fail()), null);
  assert.equal(await watchBattery(null, () => assert.fail()), null);
});
