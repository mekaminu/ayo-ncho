// Seed physics: one seed carried over its pit and let go just above its spot (slots.js says where that is), falling,
// bouncing off the wood (off the bowl's slope, so back towards the middle) or off the seeds below it, rolling a little
// and nestling into place. What it lands on is the bowl as the seeds already there leave it (their spots), so it never
// sinks into another seed, and the bowl's wall turns it back before it can leave: nothing ends up on a rim, half in the
// wood or in the air (30 Oct: Meka saw seeds fly out of the pits and off the board). Seeds it lands on rock a little.
// No three.js in here (positions and rotations are plain x, y, z), so it is tested in node.
import { restOnSeed } from './slots.js';

const G = 3.2;           // gravity (a touch floaty, as the game has always had it)
const REST = 0.24;       // how much of a landing comes back as a bounce
const FRICTION = 9;      // rolling friction on wood, per second
const PULL = 70;         // a rolling seed is drawn to its spot (it rolls the last few millimetres into place)
const LAND = -0.85;      // fastest a seed comes down onto the wood (m/s): a drop, not a throw
const FALL = 0.42;       // most time (s) a seed spends bouncing before it settles regardless
const NESTLE = 0.09;     // the last settle into its spot (s)
const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

export class SeedSim {
  // `surface(x, z)` is the height of the carved wood (board.js surfaceY)
  constructor(surface) { this.surface = surface; this.live = []; this.t = 0; }
  has(mesh) { return this.live.some((s) => s.mesh === mesh); }
  // Carry `mesh` from where it is to its spot `to` ({ x, y, z, rx, ry, rz }) and let it fall in.
  // opts: flight (s), arc (m, how high the path bows), bowl { cx, cz, ix, iz } (the ellipse its middle must stay inside),
  // under ([x, y, z] spots of the seeds already in the bowl), seed { a, b }, onBounce(k 0..1, onSeed), onNudge(index in under, k).
  toss(mesh, to, opts) {
    const p = mesh.position, r = mesh.rotation; const flight = Math.max(0.05, opts.flight || 0.24);
    const spin = () => (Math.random() - 0.5) * 5;
    return new Promise((resolve) => this.live.push({
      mesh, to, ...opts, flight, arc: opts.arc ?? 0.02, phase: 'fly', t0: this.t, from: { x: p.x, y: p.y, z: p.z },
      rot0: { x: r.x, y: r.y, z: r.z }, spin: { x: spin(), y: spin(), z: spin() }, v: { x: 0, y: 0, z: 0 }, ground: 0, resolve,
    }));
  }
  // where the seed's middle rests at (x, z): on the wood or on the seeds below; `j` is which seed it is resting on (-1: wood)
  floor(s, x, z) {
    const { a, b } = s.seed, f = this.surface; const k = 0.7 * a, kb = b * 0.714;
    let y = Math.max(f(x, z) + b, f(x + k, z) + kb, f(x - k, z) + kb, f(x, z + k) + kb, f(x, z - k) + kb), j = -1;
    const under = s.under || [];
    for (let i = 0; i < under.length; i++) { const h = restOnSeed(x, z, under[i], s.seed); if (h > y) { y = h; j = i; } }
    return { y, j };
  }
  step(dt) {
    dt = Math.min(dt, 1 / 30); this.t += dt;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const s = this.live[i], p = s.mesh.position, r = s.mesh.rotation, to = s.to;
      if (s.phase === 'fly') { // carried: smooth across, bowing up and over, coming down onto its spot
        const u = Math.min(1, (this.t - s.t0) / s.flight), e = u * u * (3 - 2 * u), y1 = to.y + 0.012;
        p.x = s.from.x + (to.x - s.from.x) * e; p.z = s.from.z + (to.z - s.from.z) * e;
        p.y = s.from.y + (y1 - s.from.y) * u * u + s.arc * Math.sin(Math.PI * u);
        r.x += s.spin.x * dt; r.y += s.spin.y * dt; r.z += s.spin.z * dt;
        if (u >= 1) { s.phase = 'fall'; s.tf = this.t; s.v.y = Math.max(LAND, Math.min(-0.25, (2 * (y1 - s.from.y) - Math.PI * s.arc) / s.flight)); s.v.x = (Math.random() - 0.5) * 0.04; s.v.z = (Math.random() - 0.5) * 0.04; }
        continue;
      }
      if (s.phase === 'fall') {
        const v = s.v; v.y -= G * dt; p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
        r.x += s.spin.x * dt; r.y += s.spin.y * dt; r.z += s.spin.z * dt;
        // the bowl's wall: the seed's middle stays inside its ellipse, and anything heading out is turned back
        const B = s.bowl; if (B) { const dx = p.x - B.cx, dz = p.z - B.cz, q = (dx / B.ix) ** 2 + (dz / B.iz) ** 2;
          if (q > 1) { const k = 1 / Math.sqrt(q); p.x = B.cx + dx * k; p.z = B.cz + dz * k; let nx = dx / (B.ix * B.ix), nz = dz / (B.iz * B.iz); const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl; const out = v.x * nx + v.z * nz; if (out > 0) { v.x -= 1.4 * out * nx; v.z -= 1.4 * out * nz; } } }
        const f = this.floor(s, p.x, p.z);
        if (p.y <= f.y) {
          p.y = f.y; s.ground += dt;
          const e = 0.002, gx = (this.floor(s, p.x + e, p.z).y - this.floor(s, p.x - e, p.z).y) / (2 * e), gz = (this.floor(s, p.x, p.z + e).y - this.floor(s, p.x, p.z - e).y) / (2 * e);
          const nl = Math.hypot(gx, 1, gz), nx = -gx / nl, ny = 1 / nl, nz = -gz / nl; const vn = v.x * nx + v.y * ny + v.z * nz;
          if (vn < -0.12) { // a bounce, off the slope it hit
            v.x -= (1 + REST) * vn * nx; v.y -= (1 + REST) * vn * ny; v.z -= (1 + REST) * vn * nz;
            s.spin.x *= 0.5; s.spin.y *= 0.5; s.spin.z *= 0.5; const k = Math.min(1, -vn / 0.8);
            if (s.onBounce) s.onBounce(k, f.j >= 0); if (f.j >= 0 && s.onNudge) s.onNudge(f.j, k); // how hard, and whether on a seed (a clack) or the wood (a tok)
          } else if (vn < 0) { v.x -= vn * nx; v.y -= vn * ny; v.z -= vn * nz; }
          const keep = Math.exp(-FRICTION * dt); v.x *= keep; v.z *= keep; s.spin.x *= keep; s.spin.y *= keep; s.spin.z *= keep;
          v.x += (to.x - p.x) * PULL * dt; v.z += (to.z - p.z) * PULL * dt;
        }
        if ((s.ground > 0.05 && Math.hypot(v.x, v.y, v.z) < 0.06) || this.t - s.tf > FALL) {
          s.phase = 'nestle'; s.tn = this.t; s.at = { x: p.x, y: p.y, z: p.z };
          s.r0 = { x: to.rx + wrap(r.x - to.rx), y: to.ry + wrap(r.y - to.ry), z: to.rz + wrap(r.z - to.rz) };
        }
        continue;
      }
      // nestle: the last few millimetres into its spot, turning to lie as it should
      const u = Math.min(1, (this.t - s.tn) / NESTLE), e = 1 - (1 - u) ** 3;
      p.x = s.at.x + (to.x - s.at.x) * e; p.y = s.at.y + (to.y - s.at.y) * e; p.z = s.at.z + (to.z - s.at.z) * e;
      r.x = s.r0.x + (to.rx - s.r0.x) * e; r.y = s.r0.y + (to.ry - s.r0.y) * e; r.z = s.r0.z + (to.rz - s.r0.z) * e;
      if (u >= 1) { this.live.splice(i, 1); s.resolve(); }
    }
  }
  // put every seed in flight straight into its spot (a new game, an undo)
  finish() { for (const s of this.live.splice(0)) { const p = s.mesh.position, r = s.mesh.rotation; p.x = s.to.x; p.y = s.to.y; p.z = s.to.z; r.x = s.to.rx; r.y = s.to.ry; r.z = s.to.rz; s.resolve(); } }
}
