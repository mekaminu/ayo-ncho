// Where seeds lie. Seeds are poured into a bowl one at a time and each comes to rest in the lowest spot it can reach,
// on the wood or in the hollow between seeds already there: a pit of four is four seeds that rolled to the bottom, a
// trough of thirty is a bed of seeds filling it from the middle out and from the floor up, below the rim. The k-th seed
// of a bowl always has the k-th spot, so a seed dropped in lands where the next seed belongs and nothing is ever left
// where it would not stay: on a rim, half in a wall, inside another seed, in the air.
// Pure numbers (no three.js), so it is tested in node.

// A bowl's depth at (dx, dz) from its centre: an ellipse rx by rz, `depth` deep at the bottom.
// `flat` above 1 widens the floor: the trough reaches full depth sooner. board.js carves the wood with this same curve.
export function bowl(dx, dz, rx, rz, depth, flat = 1) {
  const d2 = (dx / rx) ** 2 + (dz / rz) ** 2; if (d2 >= 1) return 0; const t = Math.min(1, (1 - d2) * flat); return depth * (t * t * (3 - 2 * t));
}

// A seed is a squat ball: `a` across, `b` from its middle to its top (half its height).
// Its footprint, as points on the unit disc, for finding where it touches the wood.
const FOOT = [[0, 0]];
for (const f of [0.45, 0.75, 0.95]) for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4 + f; FOOT.push([f * Math.cos(t), f * Math.sin(t)]); }

// How high a seed's middle sits (from the board top; below it is negative) resting on the bare wood of a bowl at (x, z)
// from the bowl's centre: the lowest it can go before some part of it touches the wood.
export function restOnWood(x, z, shape, seed) {
  const { rx, rz, depth, flat = 1 } = shape, { a, b } = seed; let y = -Infinity;
  for (const [u, v] of FOOT) y = Math.max(y, -bowl(x + u * a, z + v * a, rx, rz, depth, flat) + b * Math.sqrt(Math.max(0, 1 - u * u - v * v)));
  return y;
}
// How high a seed's middle at (x, z) sits on another seed whose middle is at p = [x, y, z] (-Infinity when they do not touch).
export function restOnSeed(x, z, p, seed) {
  const { a, b } = seed; const m = 4 * a * a - (x - p[0]) ** 2 - (z - p[2]) ** 2; return m > 0 ? p[1] + (b / a) * Math.sqrt(m) : -Infinity;
}
// How far a seed's middle may go from the bowl's centre (the ellipse it stays inside), so all of it is in the bowl.
export const reach = (shape, seed) => ({ ix: shape.rx - seed.a * 0.92, iz: shape.rz - seed.a * 0.92 });

export const GATHER = 0.003; // how much nearer the middle a spot must be to win over one a hair lower (m, at the rim)
function rng(n) { let s = (n >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Pour n seeds into a bowl. Each spot is { x, y, z } from the bowl's centre at the board top, and how the seed lies there:
// (seeds gather towards the middle, as they do in a hand-carved bowl that is never quite flat: a trough's first seeds
// lie together in the middle of its floor rather than scattered over it)
// yaw (its long side across its nearest neighbour, as seeds settle) and nx, nz (the lean of what it rests on: the slope
// of the wood, eased; a seed on other seeds leans a little any way).
export function pour(shape, seed, n = 48, salt = 1) {
  const { a } = seed; const { ix, iz } = reach(shape, seed); const rand = rng(salt * 7919 + Math.round(shape.rx * 1e4) * 31 + Math.round(shape.rz * 1e4));
  const cx = [], cz = [], wood = [], rest = [], pull = []; const step = a / 4;
  for (let x = -ix; x <= ix + 1e-9; x += step) for (let z = -iz; z <= iz + 1e-9; z += step) {
    if ((x / ix) ** 2 + (z / iz) ** 2 > 1) continue;
    const w = restOnWood(x, z, shape, seed); cx.push(x); cz.push(z); wood.push(w); rest.push(w + rand() * 0.0008); // a hair of lift: no two bowls of seeds lie the same, and none sinks into the wood
    pull.push(GATHER * ((x / shape.rx) ** 2 + (z / shape.rz) ** 2));
  }
  const out = [];
  for (let k = 0; k < n && rest.length; k++) {
    let best = 0; for (let i = 1; i < rest.length; i++) if (rest[i] + pull[i] < rest[best] + pull[best]) best = i;
    const x = cx[best], z = cz[best], y = rest[best]; const onWood = y - wood[best] < 0.0012;
    let yaw = rand() * Math.PI, near = Infinity;
    for (const o of out) { const d = Math.hypot(o.x - x, o.z - z); if (d < near) { near = d; yaw = Math.atan2(o.x - x, o.z - z) + (rand() - 0.5) * 0.7; } }
    let nx, nz;
    if (onWood) { const e = 0.002, k2 = 0.6; const hx = -(bowl(x + e, z, shape.rx, shape.rz, shape.depth, shape.flat) - bowl(x - e, z, shape.rx, shape.rz, shape.depth, shape.flat)) / (2 * e), hz = -(bowl(x, z + e, shape.rx, shape.rz, shape.depth, shape.flat) - bowl(x, z - e, shape.rx, shape.rz, shape.depth, shape.flat)) / (2 * e); nx = -hx * k2; nz = -hz * k2; }
    else { nx = (rand() - 0.5) * 0.5; nz = (rand() - 0.5) * 0.5; }
    const nl = Math.hypot(nx, 1, nz);
    out.push({ x, y, z, yaw, nx: nx / nl, nz: nz / nl });
    for (let i = 0; i < rest.length; i++) { const r = restOnSeed(cx[i], cz[i], [x, y, z], seed); if (r > rest[i]) rest[i] = r; } // the seeds after it rest on it where they touch it
  }
  return out;
}

// Where a spot is on the board, and the seed's turn there: the spot turned by `turn` (radians about the vertical, so no
// two pits look alike) about the bowl's centre (cx, cz), at board-top height `top`. Rotations are for the order 'XZY':
// the seed is turned to its yaw first (ry), then leant with what it rests on (rx, rz).
export function place(s, cx, cz, top, turn = 0) {
  const c = Math.cos(turn), n = Math.sin(turn);
  const x = s.x * c + s.z * n, z = -s.x * n + s.z * c, nx = s.nx * c + s.nz * n, nz = -s.nx * n + s.nz * c;
  const rz = Math.asin(Math.max(-1, Math.min(1, -nx))), rx = Math.asin(Math.max(-1, Math.min(1, nz / Math.cos(rz))));
  return { x: cx + x, y: top + s.y, z: cz + z, rx, ry: s.yaw + turn, rz };
}
