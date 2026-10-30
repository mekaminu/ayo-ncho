import { test } from "node:test";
import assert from "node:assert/strict";
import { SeedSim } from "../web/physics.js";
import { bowl, pour, place, reach } from "../web/slots.js";

// one pit and one trough carved into a flat board top, as board.js carves them
const BT = 0.085, PIT = { rx: 0.082, rz: 0.082, depth: 0.054 }, STORE = { rx: 0.154, rz: 0.086, depth: 0.058, flat: 1.8 };
const PITC = [0.105, 0.37], STOREC = [0, 0.528];
const surface = (x, z) => BT - Math.max(bowl(x - PITC[0], z - PITC[1], PIT.rx, PIT.rz, PIT.depth), bowl(x - STOREC[0], z - STOREC[1], STORE.rx, STORE.rz, STORE.depth, STORE.flat));
const seed = { a: (0.0180 + 0.0138) / 2 * 0.98, b: 0.0152 };
const mesh = (x, y, z) => ({ position: { x, y, z }, rotation: { x: 0.2, y: 1, z: -0.1 } });

// drop n seeds one after another into a bowl from `from(k)`, watching every step; returns what was seen
function sow(shape, c, n, from, opts = {}) {
  const turn = opts.turn ?? 0; // a pit's spots are turned any way (no two pits alike); a trough is only ever turned end for end
  const sim = new SeedSim(surface), spots = pour(shape, seed, n), { ix, iz } = reach(shape, seed);
  const seen = { out: 0, inWood: 0, nudges: [], bounces: 0, steps: 0 }; const meshes = [];
  for (let k = 0; k < n; k++) {
    const to = place(spots[k], c[0], c[1], BT, turn), m = mesh(...from(k)); meshes.push(m);
    const under = spots.slice(0, k).map((s) => { const q = place(s, c[0], c[1], BT, turn); return [q.x, q.y, q.z]; });
    let done = false;
    sim.toss(m, to, { flight: opts.flight || 0.24, arc: opts.arc ?? 0.03, bowl: { cx: c[0], cz: c[1], ix, iz }, under, seed, onBounce: () => seen.bounces++, onNudge: (j) => seen.nudges.push([k, j]) }).then(() => { done = true; });
    for (let i = 0; i < 400 && sim.live.length; i++) {
      sim.step(1 / 60); seen.steps++;
      const s = sim.live[0]; if (!s || s.phase === 'fly') continue;
      const p = m.position;
      if (((p.x - c[0]) / ix) ** 2 + ((p.z - c[1]) / iz) ** 2 > 1 + 1e-9) seen.out++;
      if (p.y < surface(p.x, p.z) + seed.b - 1e-9) seen.inWood++;
    }
    assert.equal(sim.live.length, 0, `seed ${k} settled`);
    seen.done = done;
    for (const key of ['x', 'y', 'z']) assert.ok(Math.abs(m.position[key] - to[key]) < 1e-12, `seed ${k} lies exactly in its spot (${key})`);
    assert.ok(Math.abs(m.rotation.x - to.rx) < 1e-12 && Math.abs(m.rotation.y - to.ry) < 1e-12 && Math.abs(m.rotation.z - to.rz) < 1e-12, `seed ${k} lies as its spot says`);
  }
  return seen;
}

test("sown seeds land in their pit, never leave it or sink into the wood, and end exactly in their spots", async () => {
  const seen = sow(PIT, PITC, 14, (k) => [PITC[0] + (k % 2 ? 0.02 : -0.03), BT + 0.07 + 0.01 * (k % 3), PITC[1] - 0.148], { turn: 0.7 });
  await Promise.resolve();
  assert.equal(seen.out, 0); assert.equal(seen.inWood, 0); assert.ok(seen.bounces > 0, 'they bounce');
  assert.ok(seen.nudges.length > 0, 'a seed landing on seeds rocks them'); for (const [k, j] of seen.nudges) assert.ok(j >= 0 && j < k);
});

test("captured seeds flown across the board land in the trough and lie in it", async () => {
  const seen = sow(STORE, STOREC, 30, (k) => [-0.105 + 0.01 * (k % 3), BT - 0.04, -0.37 + 0.02 * (k % 4)], { flight: 0.47, arc: 0.12, turn: Math.PI });
  await Promise.resolve();
  assert.equal(seen.out, 0); assert.equal(seen.inWood, 0);
});

test("a seed knocked hard towards the rim is turned back by the bowl's wall", () => {
  const sim = new SeedSim(surface), spots = pour(PIT, seed, 1), { ix, iz } = reach(PIT, seed), to = place(spots[0], PITC[0], PITC[1], BT, 0);
  const m = mesh(PITC[0], BT + 0.07, PITC[1] - 0.15);
  sim.toss(m, to, { flight: 0.2, arc: 0.02, bowl: { cx: PITC[0], cz: PITC[1], ix, iz }, under: [], seed });
  for (let i = 0; i < 13; i++) sim.step(1 / 60); // carried over, now falling
  sim.live[0].v.x = 3; sim.live[0].v.z = -2; // a hard knock
  let worst = 0;
  while (sim.live.length) { sim.step(1 / 60); const p = m.position; worst = Math.max(worst, ((p.x - PITC[0]) / ix) ** 2 + ((p.z - PITC[1]) / iz) ** 2); }
  assert.ok(worst <= 1 + 1e-9, `it stayed in the pit (${worst})`);
  assert.ok(Math.abs(m.position.x - to.x) < 1e-12 && Math.abs(m.position.z - to.z) < 1e-12);
});

test("finishing puts every seed in flight straight into its spot", async () => {
  const sim = new SeedSim(surface), spots = pour(PIT, seed, 2), { ix, iz } = reach(PIT, seed); let resolved = 0;
  const meshes = spots.map((s, k) => { const m = mesh(0, 0.3, 0); sim.toss(m, place(s, PITC[0], PITC[1], BT, 0), { bowl: { cx: PITC[0], cz: PITC[1], ix, iz }, under: [], seed }).then(() => resolved++); return m; });
  sim.step(1 / 60); sim.finish(); await Promise.resolve(); await Promise.resolve();
  assert.equal(sim.live.length, 0); assert.equal(resolved, 2);
  meshes.forEach((m, k) => { const to = place(spots[k], PITC[0], PITC[1], BT, 0); assert.equal(m.position.x, to.x); assert.equal(m.position.y, to.y); });
});
