import { test } from "node:test";
import assert from "node:assert/strict";
import { bowl, pour, place, reach, restOnWood, restOnSeed, GATHER } from "../web/slots.js";

// the board's bowls and seeds, as board.js has them (kept here as plain numbers so the test needs no three.js)
const PIT = { rx: 0.082, rz: 0.082, depth: 0.054 };
const STORE = { rx: 0.154, rz: 0.086, depth: 0.058, flat: 1.8 };
const SEEDS = { jobs: [0.0180, 0.0152, 0.0138], stones: [0.0196, 0.0112, 0.0160] };
const dims = (r) => ({ a: (r[0] + r[2]) / 2 * 0.98, b: r[1] });

test("a bowl is its full depth in the middle, nothing outside, and a trough's floor is flat", () => {
  assert.equal(bowl(0, 0, 0.08, 0.08, 0.05), 0.05);
  assert.equal(bowl(0.09, 0, 0.08, 0.08, 0.05), 0);
  assert.ok(bowl(0.06, 0, 0.08, 0.08, 0.05) < 0.05);
  assert.equal(bowl(0.08, 0.03, 0.154, 0.086, 0.058, 1.8), 0.058); // well out from the middle, still the floor
});

for (const [set, r] of Object.entries(SEEDS)) for (const [where, shape] of [["pit", PIT], ["trough", STORE]]) {
  const seed = dims(r), spots = pour(shape, seed, 48), { ix, iz } = reach(shape, seed);

  test(`${set} in a ${where}: no seed is inside another, in the wood, or in the air`, () => {
    assert.equal(spots.length, 48);
    spots.forEach((s, k) => {
      assert.ok((s.x / ix) ** 2 + (s.z / iz) ** 2 <= 1 + 1e-9, `seed ${k} is inside the bowl`);
      const wood = restOnWood(s.x, s.z, shape, seed);
      assert.ok(s.y >= wood - 0.0005, `seed ${k} is not in the wood`);
      let held = s.y - wood < 0.0012; // on the wood…
      for (let j = 0; j < k; j++) {
        const o = spots[j], gap = Math.hypot(s.x - o.x, s.z - o.z, (s.y - o.y) * seed.a / seed.b);
        assert.ok(gap >= 2 * seed.a - 1e-4, `seeds ${j} and ${k} do not overlap`);
        if (Math.abs(restOnSeed(s.x, s.z, [o.x, o.y, o.z], seed) - s.y) < 0.0012) held = true; // …or on a seed
      }
      assert.ok(held, `seed ${k} rests on something`);
    });
  });

  test(`${set} in a ${where}: seeds fill from the bottom up and gather to the middle, the same way every time`, () => {
    for (let k = 1; k < spots.length; k++) assert.ok(spots[k].y >= spots[k - 1].y - GATHER - 0.0008, `seed ${k} lies no lower than the one before, give or take the gathering`);
    const out = (k) => Math.hypot(spots[k].x / shape.rx, spots[k].z / shape.rz);
    assert.ok(out(0) < 0.25, "the first seed lies near the middle");
    assert.ok([1, 2, 3].every((k) => out(k) < 0.6), "the next ones lie close by");
    assert.deepEqual(pour(shape, seed, 48), spots);
  });
}

test("a winner's seeds lie in the trough, below the rim: a bed, not a heap", () => {
  for (const r of Object.values(SEEDS)) {
    const seed = dims(r), spots = pour(STORE, seed, 48);
    const top = (k) => spots[k].y + seed.b; // the top of the k-th seed against the board top
    for (let k = 0; k < 22; k++) assert.ok(top(k) < -0.005, `the first 22 are well below the rim (seed ${k}: ${top(k)})`);
    for (let k = 0; k < 36; k++) assert.ok(top(k) < 0, `36 still lie below the rim (seed ${k})`);
  }
});

test("a pit of four is four seeds at the bottom; a pit holds about ten before they heap over its rim", () => {
  for (const r of Object.values(SEEDS)) {
    const seed = dims(r), spots = pour(PIT, seed, 48), top = (k) => spots[k].y + seed.b;
    for (let k = 0; k < 4; k++) assert.ok(top(k) < -0.015, `seed ${k} lies at the bottom`);
    for (let k = 0; k < 10; k++) assert.ok(top(k) < 0, `seed ${k} lies below the rim`);
  }
});

test("a spot turned about its bowl stays the same distance out and the same height, and lies as it should", () => {
  const s = { x: 0.03, y: -0.03, z: 0.01, yaw: 0.4, nx: 0, nz: 0 };
  for (const turn of [0, 1, 2.4, Math.PI]) {
    const p = place(s, 0.1, -0.2, 0.085, turn);
    assert.ok(Math.abs(Math.hypot(p.x - 0.1, p.z + 0.2) - Math.hypot(0.03, 0.01)) < 1e-12);
    assert.ok(Math.abs(p.y - 0.055) < 1e-12);
    assert.ok(Math.abs(p.ry - (0.4 + turn)) < 1e-12);
    assert.ok(Math.abs(p.rx) < 1e-12 && Math.abs(p.rz) < 1e-12); // flat ground: no lean
  }
  // on a slope the seed leans with it: the lean turns with the spot
  const leaning = { ...s, nx: -0.2, nz: 0 }, a = place(leaning, 0, 0, 0, 0), b = place(leaning, 0, 0, 0, Math.PI / 2);
  assert.ok(a.rz > 0.15 && Math.abs(a.rx) < 1e-9);
  assert.ok(Math.abs(b.rz) < 1e-9 && Math.abs(Math.abs(b.rx) - a.rz) < 1e-9);
});
