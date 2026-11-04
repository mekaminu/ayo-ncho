// The looks sold in the store (L10, slice 1): cowries and palm kernels as seed sets — their shapes, where they lie, and who
// may draw them (web/entitle.js). Looks only: nothing here touches the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_SETS, seedGeometryFor, shapeVertex } from "../web/board.js";
import { pour, reach, restOnWood } from "../web/slots.js";
import { LOOKS, BUNDLE, lookOpen, seedSetFor, lookLockedWords, seedsLine, previewOf, featureOpen, levelOpen, parseOwned } from "../web/entitle.js";
import { readFileSync } from "node:fs";

const PIT = { rx: 0.082, rz: 0.082, depth: 0.054 }, STORE = { rx: 0.154, rz: 0.086, depth: 0.058, flat: 1.8 };
const dims = (r) => ({ a: (r[0] + r[2]) / 2 * 0.98, b: r[1] });

test("four seed sets, each a seed-sized shape; the new ones are their own shapes", () => {
  assert.deepEqual(Object.keys(SEED_SETS), ["jobs", "stones", "cowries", "kernels"]);
  for (const [id, s] of Object.entries(SEED_SETS)) {
    assert.ok(s.name && s.r.length === 3, id);
    s.r.forEach((v) => assert.ok(v > 0.009 && v < 0.022, `${id} is seed-sized`));
  }
  assert.ok(SEED_SETS.cowries.r[0] > SEED_SETS.jobs.r[0], "a cowrie is longer than a Job's tear");
  assert.ok(SEED_SETS.cowries.r[1] < SEED_SETS.cowries.r[2], "a cowrie is lower than it is wide (a domed back on a flat base)");
});

test("each shape stays within -1..1 and rests on its base: a cowrie's base is flat, a kernel is lumpy", () => {
  for (const set of ["cowries", "kernels"]) {
    const g = seedGeometryFor({}, set); g.computeBoundingBox(); const { min, max } = g.boundingBox;
    for (const v of [min.x, min.y, min.z]) assert.ok(v >= -1 - 1e-6, `${set} min ${v}`);
    for (const v of [max.x, max.y, max.z]) assert.ok(v <= 1 + 1e-6, `${set} max ${v}`);
    assert.ok(min.y < -0.97, `${set} sits on the wood, not above it (${min.y})`);
    assert.ok(seedGeometryFor({}, set) === g, "built once");
  }
  // a cowrie's underside is nearly flat: across most of the base the height is within a few % of the bottom
  const base = []; for (let a = 0; a < 6.28; a += 0.3) { const [x, y] = shapeVertex("cowries", Math.cos(a) * 0.8, -0.6, Math.sin(a) * 0.8 * 0.5); base.push(y); }
  assert.ok(Math.max(...base) - Math.min(...base) < 0.1, "flat base");
  const [, top] = shapeVertex("cowries", 0, 1, 0); assert.ok(Math.abs(top - 1) < 1e-9);
  // a kernel differs from a sphere, but by little
  let most = 0; for (let i = 0; i < 200; i++) { const t = i * 0.7, p = i * 0.31; const x = Math.sin(t) * Math.cos(p), y = Math.cos(t), z = Math.sin(t) * Math.sin(p); const [a, b, c] = shapeVertex("kernels", x, y, z); most = Math.max(most, Math.abs(Math.hypot(a, b, c) - 1)); }
  assert.ok(most > 0.05 && most < 0.2, most);
  assert.deepEqual(shapeVertex("jobs", 0.3, 0.4, 0.5), [0.3, 0.4, 0.5]);
});

for (const id of ["cowries", "kernels"]) for (const [where, shape] of [["pit", PIT], ["trough", STORE]]) {
  test(`${id} lie in a ${where} like any seed: 48 spots, none in another or in the wood`, () => {
    const seed = dims(SEED_SETS[id].r), spots = pour(shape, seed, 48), { ix, iz } = reach(shape, seed);
    assert.equal(spots.length, 48);
    spots.forEach((s, k) => {
      assert.ok((s.x / ix) ** 2 + (s.z / iz) ** 2 <= 1 + 1e-9, `seed ${k} inside the bowl`);
      assert.ok(s.y >= restOnWood(s.x, s.z, shape, seed) - 0.0005, `seed ${k} not in the wood`);
      for (let j = 0; j < k; j++) { const o = spots[j]; assert.ok(Math.hypot(s.x - o.x, s.z - o.z, (s.y - o.y) * seed.a / seed.b) >= 2 * seed.a - 1e-4, `${j}/${k}`); }
    });
  });
}

test("a look is drawn only when it is bought (or the bundle), or for a visit with ?try=looks", () => {
  const none = parseOwned("[]");
  for (const id of Object.keys(LOOKS)) {
    assert.equal(lookOpen(id, none), false);
    assert.equal(lookOpen(id, parseOwned(JSON.stringify([LOOKS[id].product]))), true);
    assert.equal(lookOpen(id, parseOwned(JSON.stringify([BUNDLE]))), true);
    assert.equal(lookOpen(id, parseOwned('["gold"]')), false, "Gold is depth and teaching, not looks");
    assert.equal(lookOpen(id, none, previewOf("?try=looks")), true);
    assert.equal(lookOpen(id, none, previewOf("?try=gold")), false);
  }
  assert.deepEqual(Object.values(LOOKS).map((l) => l.product), ["seeds_cowries", "seeds_palm_kernels", "board_benin_bronze", "board_grandpa"], "the product ids L12 creates");
  assert.equal(lookOpen("cowries", parseOwned('["seeds_palm_kernels"]')), false, "one look does not open another");
  // ?try=looks opens no Gold
  assert.equal(levelOpen("master", none, previewOf("?try=looks")), false);
  assert.equal(featureOpen("review", none, previewOf("?try=looks")), false);
});

test("the seed set drawn: the phone's choice if it may have it, else Job's tears", () => {
  const none = parseOwned("[]"), cow = parseOwned('["seeds_cowries"]');
  assert.equal(seedSetFor("jobs"), "jobs");
  assert.equal(seedSetFor(null), "jobs");
  assert.equal(seedSetFor("rubies", { owned: cow }), "jobs");
  assert.equal(seedSetFor("stones", { stones: false }), "jobs");
  assert.equal(seedSetFor("stones", { stones: true }), "stones");
  assert.equal(seedSetFor("cowries", { owned: none }), "jobs");
  assert.equal(seedSetFor("cowries", { owned: cow }), "cowries");
  assert.equal(seedSetFor("kernels", { owned: cow }), "jobs");
  assert.equal(seedSetFor("kernels", { owned: none, preview: "looks" }), "kernels");
});

test("the words: a locked look says where it comes from; the Settings line names what is still in the store", () => {
  assert.equal(lookLockedWords("Cowries", false), "Cowries are a look from the store, in the app — the web link sells nothing");
  assert.match(lookLockedWords("Palm kernels", true), /a look from the store — the bag on Home/);
  assert.equal(seedsLine({ stones: false, days: 3, need: 7 }), "Job's tears · river stones at 7 days played (3 so far) · cowries and palm kernels in the store");
  assert.equal(seedsLine({ stones: true, days: 9, need: 7, owned: parseOwned('["seeds_cowries"]') }), "Job's tears · river stones (yours: 7 days played) · palm kernels in the store");
  assert.equal(seedsLine({ stones: true, days: 9, need: 7, owned: parseOwned('["bundle_all"]') }), "Job's tears · river stones (yours: 7 days played)");
});

test("Settings offers every seed set as a little seed, the locked ones with the lock", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const row = html.slice(html.indexOf('data-set="seeds"'), html.indexOf("</div>", html.indexOf('data-set="seeds"')));
  for (const id of Object.keys(SEED_SETS)) assert.ok(row.includes(`data-v="${id}"`), id);
  assert.ok(!/disabled/.test(row), "a locked set is still tappable, so it can say where it comes from");
  assert.equal((row.match(/<svg/g) || []).length, 3, "a lock on stones, cowries and palm kernels (shown only while locked)");
});

// ---------- slice 2: the two boards (Benin bronze, Grandpa's board) ----------
import { FINISHES, topTone, pitCenters, PIT_R, PIT_D } from "../web/board.js";
import { braidAt, BRAID } from "../web/textures.js";
import { finishFor, boardsLine, WOODS } from "../web/entitle.js";

test("five boards: three woods free, two sold as looks with their own product ids", () => {
  assert.deepEqual(Object.keys(FINISHES), ["mahogany", "iroko", "ebony", "benin", "grandpa"]);
  assert.deepEqual(WOODS, ["mahogany", "iroko", "ebony"]);
  assert.equal(LOOKS.benin.product, "board_benin_bronze"); assert.equal(LOOKS.grandpa.product, "board_grandpa");
  assert.equal(LOOKS.benin.kind, "board"); assert.equal(LOOKS.grandpa.kind, "board");
  for (const id of ["benin", "grandpa"]) assert.equal(FINISHES[id].name, LOOKS[id].name);
});

test("the board drawn: a wood always; a store board once bought, with the bundle or ?try=looks; else mahogany", () => {
  const none = parseOwned("[]");
  for (const w of WOODS) assert.equal(finishFor(w, { owned: none }), w);
  assert.equal(finishFor(null), "mahogany"); assert.equal(finishFor("teak"), "mahogany");
  assert.equal(finishFor("benin", { owned: none }), "mahogany");
  assert.equal(finishFor("benin", { owned: parseOwned('["board_benin_bronze"]') }), "benin");
  assert.equal(finishFor("grandpa", { owned: parseOwned('["board_benin_bronze"]') }), "mahogany", "one board does not open the other");
  assert.equal(finishFor("grandpa", { owned: parseOwned('["bundle_all"]') }), "grandpa");
  assert.equal(finishFor("grandpa", { owned: none, preview: previewOf("?try=looks") }), "grandpa");
  assert.equal(finishFor("grandpa", { owned: parseOwned('["gold"]'), preview: previewOf("?try=gold") }), "mahogany", "Gold is not looks");
  // a board is never a seed set, nor a seed set a board
  assert.equal(seedSetFor("benin", { owned: parseOwned('["bundle_all"]') }), "jobs");
  assert.equal(finishFor("cowries", { owned: parseOwned('["bundle_all"]') }), "mahogany");
});

test("the words for the boards: a locked board 'is' a look; the Settings line names what is still in the store", () => {
  assert.equal(lookLockedWords("Benin bronze", false, "board"), "Benin bronze is a look from the store, in the app — the web link sells nothing");
  assert.equal(lookLockedWords("Grandpa's board", true, "board"), "Grandpa's board is a look from the store — the bag on Home");
  assert.equal(boardsLine(), "mahogany · iroko · ebony · Benin bronze and Grandpa's board in the store");
  assert.equal(boardsLine({ owned: parseOwned('["board_grandpa"]') }), "mahogany · iroko · ebony · Grandpa's board · Benin bronze in the store");
  assert.equal(boardsLine({ preview: "looks" }), "mahogany · iroko · ebony · Benin bronze · Grandpa's board");
  // the seeds' line still names only seeds
  assert.equal(seedsLine({ stones: true, days: 9, need: 7, owned: parseOwned('["board_grandpa","board_benin_bronze"]') }), "Job's tears · river stones (yours: 7 days played) · cowries and palm kernels in the store");
});

test("the Benin braid: two strands that cross, over and under in turn, kept to the strip between the rows of pits", () => {
  const colX = pitCenters[0][0];
  // nothing of it reaches a pit: every mark lies inside the strip between the two columns
  for (let z = -0.5; z <= 0.5; z += 0.0007) for (let x = -0.03; x <= 0.03; x += 0.0004) {
    const b = braidAt(x, z); if (b.kind !== "ground") assert.ok(Math.abs(x) < colX - PIT_R, `${x},${z} ${b.kind}`);
  }
  // past the ends there is nothing; turned end for end it is the same braid (the board is drawn the same from either seat)
  assert.equal(braidAt(0, BRAID.ends + 0.01).kind, "ground");
  for (let k = 0; k < 400; k++) { const x = ((k * 37) % 100 - 50) / 2500, z = ((k * 61) % 800 - 400) / 1000; assert.equal(braidAt(x, z).kind, braidAt(-x, -z).kind, `${x},${z}`); }
  // at each crossing one strand is on top, and the next crossing the other: follow strand 1 through the crossings
  const P = Math.PI / BRAID.k, overs = [];
  const unbroken = (sign, n) => { for (let j = -20; j <= 20; j++) { const z = n * P + j * P / 60; if (braidAt(sign * BRAID.A * Math.sin(BRAID.k * z), z).kind !== "strand") return false; } return true; };
  for (let n = -6; n <= 6; n++) { // along each strand's middle through the crossing: the top one runs unbroken, the other dives (a gap each side)
    const one = unbroken(1, n), two = unbroken(-1, n);
    assert.ok(one !== two, `crossing ${n}: exactly one strand runs over (${one}, ${two})`);
    overs.push(one ? 1 : 2);
  }
  overs.forEach((o, i) => i && assert.notEqual(o, overs[i - 1], "over and under in turn"));
  // the strands stand up, the eyes hold a punched dot, the ground is flat
  assert.ok(braidAt(BRAID.A, Math.PI / 2 / BRAID.k).h > 0.9);
  assert.ok(braidAt(0, 1.5 * P).h < 0, "the dot in an eye is punched in");
  assert.equal(braidAt(0.02, 0.2).h, 0);
});

test("the carved top's shading: Grandpa's rims worn pale and pits darker, the bronze greener deep in a bowl", () => {
  const [px, pz] = pitCenters[2];
  const flat = topTone("grandpa", 0.0, 0.0, 0, 0.1), rim = topTone("grandpa", px + PIT_R, pz, 0.001, 0.05), floor = topTone("grandpa", px, pz, PIT_D, 0.1);
  assert.ok(rim[0] > flat[0] * 1.2, "the rim is worn paler than the flat wood");
  assert.ok(floor[0] < flat[0] * 0.5, "the pit floor is darker");
  assert.ok(topTone("grandpa", 0, 0.62, 0, 0.002)[0] > flat[0] * 1.2, "the board's edge is worn too");
  const b = topTone("benin", px, pz, PIT_D, 0.1); assert.ok(b[1] > b[0], "patina green in the bowl");
  const m = topTone("mahogany", px, pz, PIT_D * 0.5, 0.1); assert.ok(Math.abs(m[1] / m[0] - 0.96) < 1e-9, "the woods keep their shading");
  for (const f of Object.keys(FINISHES)) for (let k = 0; k < 200; k++) { const x = (k % 20 - 10) / 50, z = (Math.floor(k / 20) - 5) / 8; for (const v of topTone(f, x, z, 0.01, (k % 7) / 100 - 0.01)) assert.ok(v > 0 && v < 2, `${f} ${v}`); }
});

test("Settings offers the five boards, the two from the store with the lock (still tappable)", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const row = html.slice(html.indexOf('data-set="finish"'), html.indexOf("</div>", html.indexOf('data-set="finish"')));
  for (const id of Object.keys(FINISHES)) assert.ok(row.includes(`data-v="${id}"`), id);
  assert.ok(!/disabled/.test(row));
  assert.equal((row.match(/<svg/g) || []).length, 2, "a lock on Benin bronze and Grandpa's board (shown only while locked)");
  assert.ok(html.includes('id="boardSub"'));
});
