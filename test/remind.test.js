// The daily-puzzle reminder (Launch L14, web/remind.js): the plan, the words, the plugin calls, the app wiring.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dailyPuzzle, todayKey } from "../engine/puzzle.js";
import { planReminders, reminderWords, toNotification, makeReminders, testNotifications, idOf, isOurs, hourOf, hourLabel, remindNote, offerShown, offerWords, HOURS, DEFAULT_HOUR, DAYS_AHEAD, OFFERS, ANDROID_ICON } from "../web/remind.js";

const at = (y, m, d, h = 10, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("the plan: one a day at the chosen hour, a week ahead, never in the past", () => {
  const plan = planReminders({ now: at(2026, 11, 4, 10), hour: 19 });
  assert.equal(plan.length, DAYS_AHEAD);
  assert.deepEqual(plan.map((r) => r.key), ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"]);
  for (const r of plan) { assert.equal(r.at.getHours(), 19); assert.equal(r.at.getMinutes(), 0); assert.equal(r.id, idOf(r.key)); assert.equal(todayKey(r.at), r.key); }
  assert.equal(new Set(plan.map((r) => r.id)).size, plan.length, "never two on one day");
  // past today's time: today is skipped, the week still full
  const late = planReminders({ now: at(2026, 11, 4, 19, 30), hour: 19 });
  assert.equal(late[0].key, "2026-11-05"); assert.equal(late.length, DAYS_AHEAD);
  // within the minute: skipped too
  assert.equal(planReminders({ now: new Date(2026, 10, 4, 18, 59, 30), hour: 19 })[0].key, "2026-11-05");
});

test("the plan: none today once today's puzzle is played; months and years roll over", () => {
  const plan = planReminders({ now: at(2026, 11, 4, 8), hour: 9, playedToday: true });
  assert.equal(plan[0].key, "2026-11-05"); assert.equal(plan.length, DAYS_AHEAD);
  const ny = planReminders({ now: at(2026, 12, 29, 20), hour: 13 });
  assert.deepEqual(ny.map((r) => r.key).slice(0, 4), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  assert.equal(ny[2].id, 20270101);
});

test("hours: only the three offered, anything else is the evening", () => {
  assert.deepEqual(HOURS, [9, 13, 19]); assert.equal(DEFAULT_HOUR, 19);
  assert.equal(hourOf("9"), 9); assert.equal(hourOf(13), 13); assert.equal(hourOf("3"), 19); assert.equal(hourOf(""), 19); assert.equal(hourOf(undefined), 19);
  assert.equal(hourLabel(9), "09:00"); assert.equal(hourLabel(19), "19:00");
  assert.equal(planReminders({ now: at(2026, 11, 4, 1), hour: "nonsense" })[0].at.getHours(), 19);
});

test("the words name that day's real puzzle, for the game the player plays", () => {
  for (const variant of ["ncho", "ayo"]) {
    for (const r of planReminders({ now: at(2026, 11, 4, 6), hour: 9, variant })) {
      const p = dailyPuzzle(r.key, variant);
      assert.match(r.body, new RegExp(`^Capture ${p.target} in one turn · ${variant === "ayo" ? "Ayo" : "Nchò"} rules\\.`));
      assert.match(r.title, /^Daily puzzle · \w{3} \d{1,2} \w{3}$/);
    }
  }
  assert.equal(reminderWords("2026-11-05").title, "Daily puzzle · Thu 5 Nov");
});

test("what the plugin is handed: inexact, the seed icon, the day to open", () => {
  const [r] = planReminders({ now: at(2026, 11, 4, 6), hour: 9 });
  const n = toNotification(r);
  assert.equal(n.id, 20261104); assert.equal(n.isExactNotification, false); assert.equal(n.smallIcon, ANDROID_ICON);
  assert.deepEqual(n.extra, { puzzle: "2026-11-04" }); assert.equal(n.schedule.at, r.at); assert.equal(n.schedule.allowWhileIdle, true);
  assert.ok(isOurs(n.id)); assert.ok(!isOurs(7)); assert.ok(!isOurs("20261104"));
  // nothing in it but the day, the ask and the rules
  assert.deepEqual(Object.keys(n).sort(), ["autoCancel", "body", "extra", "iconColor", "id", "isExactNotification", "schedule", "smallIcon", "title"]);
});

test("sync: on asks once, schedules a week; a change replaces it; off cancels every one of ours and nothing else", async () => {
  const L = testNotifications(); let now = at(2026, 11, 4, 10); const R = makeReminders(L, { now: () => now });
  L.pending.set(5, { id: 5, title: "someone else's" }); // not ours: left alone
  assert.deepEqual(await R.sync({ on: false }), { off: true, cancelled: 0 });
  assert.equal(L.asked.length, 0, "never asked while off");
  const r = await R.sync({ on: true, hour: 19, variant: "ncho", ask: true });
  assert.equal(r.scheduled, DAYS_AHEAD); assert.deepEqual(L.asked, ["granted"]); assert.equal(R.permission, "granted");
  assert.equal(L.pending.size, DAYS_AHEAD + 1);
  // the player plays today's puzzle: today's goes
  await R.sync({ on: true, hour: 19, variant: "ncho", playedToday: true });
  assert.ok(!L.pending.has(20261104)); assert.ok(L.pending.has(20261105)); assert.equal(L.asked.length, 1, "asked once only");
  // the next day the app opens: the week moves on
  now = at(2026, 11, 5, 8); await R.sync({ on: true, hour: 9, variant: "ayo" });
  const ours = [...L.pending.keys()].filter(isOurs).sort();
  assert.equal(ours[0], 20261105); assert.equal(ours.length, DAYS_AHEAD); assert.match(L.pending.get(20261105).body, /Ayo rules/);
  assert.equal(L.pending.get(20261105).schedule.at.getHours(), 9);
  await R.sync({ on: false });
  assert.deepEqual([...L.pending.keys()], [5]);
});

test("sync: a refusal schedules nothing and is never asked again without the player", async () => {
  const L = testNotifications({ answer: "denied" }); const R = makeReminders(L, { now: () => at(2026, 11, 4, 10) });
  assert.deepEqual(await R.sync({ on: true, ask: true }), { denied: true });
  assert.equal(L.pending.size, 0); assert.equal(R.permission, "denied");
  await R.sync({ on: true, ask: true }); assert.equal(L.asked.length, 1, "the phone said no: not asked again");
  // the start-up sync never asks
  const L2 = testNotifications(); const R2 = makeReminders(L2, { now: () => at(2026, 11, 4, 10) });
  assert.deepEqual(await R2.sync({ on: true }), { denied: true }); assert.equal(L2.asked.length, 0);
});

test("sync: no plugin (the web link), or a plugin that throws, fails soft", async () => {
  const R = makeReminders(null); assert.equal(R.supported, false);
  assert.deepEqual(await R.sync({ on: true, ask: true }), { off: true });
  assert.equal(await R.perm(true), "denied"); assert.equal(R.onTap(() => {}), false);
  const L = testNotifications(); L.schedule = async () => { throw new Error("boom"); };
  const R2 = makeReminders(L, { now: () => at(2026, 11, 4, 10) });
  assert.deepEqual(await R2.sync({ on: true, ask: true }), { error: true });
});

test("sync: quick changes run one after another, so the last one wins", async () => {
  const L = testNotifications(); const R = makeReminders(L, { now: () => at(2026, 11, 4, 6) });
  await Promise.all([R.sync({ on: true, hour: 9, ask: true }), R.sync({ on: true, hour: 13 }), R.sync({ on: true, hour: 19 })]);
  assert.equal(L.pending.size, DAYS_AHEAD);
  for (const n of L.pending.values()) assert.equal(n.schedule.at.getHours(), 19);
});

test("a tap opens the puzzle; someone else's notification does nothing", async () => {
  const L = testNotifications(); const R = makeReminders(L, { now: () => at(2026, 11, 4, 6) }); const opened = [];
  assert.equal(R.onTap((k) => opened.push(k)), true);
  await R.sync({ on: true, ask: true }); L.tap(20261105); L.tap(42);
  assert.deepEqual(opened, ["2026-11-05"]);
});

test("the words beside the switch and the offer on the puzzle card", () => {
  assert.match(remindNote(false, false), /in the apps/);
  assert.equal(remindNote(true, true, "granted"), "on");
  assert.match(remindNote(true, false, "prompt"), /off/);
  assert.match(remindNote(true, false, "denied"), /phone's settings/);
  assert.equal(offerShown({ app: false, on: false, offered: 0 }), false, "never on the web link");
  assert.equal(offerShown({ app: true, on: true, offered: 0 }), false, "not once it is on");
  assert.equal(offerShown({ app: true, on: false, perm: "denied", offered: 0 }), false, "not when the phone said no");
  assert.equal(offerShown({ app: true, on: false, offered: OFFERS - 1 }), true);
  assert.equal(offerShown({ app: true, on: false, offered: OFFERS }), false, "a few days, then never again");
  assert.equal(offerWords(9), "Remind me each day at 09:00"); assert.equal(offerWords("x"), "Remind me each day at 19:00");
});

test("the apps carry the plugin; Android never asks for exact alarms; the seed icon exists; the game is wired", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.devDependencies["@capacitor/local-notifications"], "Capacitor's own plugin");
  assert.match(read("android/capacitor.settings.gradle"), /capacitor-local-notifications/);
  assert.match(read("ios/App/CapApp-SPM/Package.swift"), /CapacitorLocalNotifications/);
  const man = read("android/app/src/main/AndroidManifest.xml");
  assert.match(man, /SCHEDULE_EXACT_ALARM" tools:node="remove"/); assert.match(man, /xmlns:tools=/);
  assert.ok(existsSync(new URL("../android/app/src/main/res/drawable/ic_stat_ayo.xml", import.meta.url)));
  const cfg = JSON.parse(read("capacitor.config.json"));
  assert.equal(cfg.plugins.LocalNotifications.smallIcon, ANDROID_ICON);
  const game = read("web/game.js");
  assert.match(game, /plugin\('LocalNotifications'\)/);
  assert.match(game, /reminders\.onTap\(/);
  assert.match(read("web/sw.js"), /'\.\/remind\.js'/);
  const html = read("web/index.html");
  assert.match(html, /data-set="remind" aria-checked="false"/, "off until the player turns it on");
  assert.match(html, /data-set="remindAt"/); assert.match(html, /id="pzRemind"/);
});
