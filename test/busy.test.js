// A busy Sunday night (tools/busy-night.js): many families' games with friends on the server at once, each played whole and checked.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { busyNight, capacity, percentile, addressFor, report, FREE_PLAN, BRISK_MS } from "../tools/busy-night.js";
import { GUARD } from "../server/guard.js";

test("the free plan's sums: CPU and memory each give a number of games, the smaller wins", () => {
  // 0.4 ms a move, a move every 4 s: a game costs 0.1 ms of CPU a second; half of a tenth of a CPU is 50 ms a second → 500 games
  const c = capacity({ cpuPerMoveMs: 0.4, bytesPerRoom: 100 * 1024, baseMb: 70 });
  assert.equal(c.byCpu, 500);
  assert.equal(c.byMemory, Math.floor(((FREE_PLAN.memoryMb / 2 - 70) * 1024 * 1024) / (100 * 1024)));
  assert.equal(c.games, Math.min(c.byCpu, c.byMemory));
  assert.equal(capacity({ cpuPerMoveMs: 0.4, bytesPerRoom: 1e9, baseMb: 300 }).byMemory, 0); // never below nothing
});

test("percentiles, and two houses for every family", () => {
  assert.equal(percentile([5, 1, 4, 2, 3], 50), 3);
  assert.equal(percentile([5, 1, 4, 2, 3], 95), 5);
  assert.ok(Number.isNaN(percentile([], 50)));
  assert.notEqual(addressFor(7, 0), addressFor(7, 1));
  assert.notEqual(addressFor(1, 0), addressFor(257, 0));
});

test("brisk stays inside a connection's pace: a peek and a move a turn, each side every other turn", () => {
  const perSecond = (2 * 1000) / (2 * BRISK_MS); // one side sends two messages every second turn
  assert.ok(perSecond < GUARD.perSecond, `${perSecond.toFixed(1)} a second under the guard's ${GUARD.perSecond}`);
});

test("a small busy night: a dozen families at once, two whole games each, every move agreed, nothing refused, quick to hear", { skip: !fs.existsSync("/proc/self/stat") && "needs /proc", timeout: 120000 }, async () => {
  const n = await busyNight({ rooms: 12, paceMs: 120 });
  assert.equal(n.errors, 0, JSON.stringify(n.errorSample));
  assert.equal(n.games, 12); assert.equal(n.serverRooms, 12);
  assert.ok(n.moves > 12 * 10 && n.pace.moves > 12 * 10, "whole games, twice over");
  assert.ok(n.brisk.p95 < 250 && n.pace.p95 < 250, `the other board hears a move quickly (p95 ${n.brisk.p95.toFixed(1)} / ${n.pace.p95.toFixed(1)} ms)`);
  assert.ok(n.cpuPerMoveMs > 0 && n.cpuPerMoveMs < 5, `a move costs the server little (${n.cpuPerMoveMs.toFixed(3)} ms)`);
  assert.ok(n.freePlan.games >= 100, `the free plan holds a hundred families at least (${n.freePlan.games})`);
  assert.match(report(n), /A busy night: 12 games with friends at once/);
});
