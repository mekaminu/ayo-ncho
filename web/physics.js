// Seed physics: a small, purpose-built simulation for seeds dropping into carved bowls.
// A seed is tossed, falls under gravity, bounces off the carved surface, rolls down the bowl's slope,
// is pushed aside by seeds already resting there, and settles. Everything stays inside the wood.
import * as THREE from 'three';
import { surfaceY } from './board.js';

const G = 3.2;            // gravity (board units are metres but the game feels better a touch floaty)
const REST = 0.32;        // bounciness
const ROLL = 0.86;        // per-second velocity kept while rolling (friction)
const PUSH = 0.045;       // how hard seeds shove each other apart
const SETTLE_SPEED = 0.02;
const MAX_MS = 700;      // after this the seed snaps to its slot whatever happened

function slope(x, z) { // surface gradient, for rolling
  const e = 0.004;
  return [(surfaceY(x + e, z) - surfaceY(x - e, z)) / (2 * e), (surfaceY(x, z + e) - surfaceY(x, z - e)) / (2 * e)];
}

export class SeedSim {
  constructor() { this.live = []; }
  // Launch `mesh` from its current position so it lands near `target` (a THREE.Vector3 resting slot).
  // `others` are resting seeds in the same bowl (meshes) to collide with. Returns a promise that resolves when settled.
  toss(mesh, target, others, radius, flight = 0.26, lift = 0.05) {
    const p = mesh.position; const dx = target.x - p.x, dz = target.z - p.z;
    const vy = (target.y + lift - p.y + 0.5 * G * flight * flight) / flight;
    return new Promise((resolve) => {
      this.live.push({ mesh, target, others, r: radius, v: new THREE.Vector3(dx / flight, vy, dz / flight), t0: performance.now(), onGround: 0, spin: new THREE.Vector3((Math.random() - .5) * 8, (Math.random() - .5) * 8, (Math.random() - .5) * 8), resolve });
    });
  }
  step(dt, now) {
    dt = Math.min(dt, 0.033);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const s = this.live[i]; const p = s.mesh.position; const v = s.v;
      v.y -= G * dt;
      p.addScaledVector(v, dt);
      s.mesh.rotation.x += s.spin.x * dt; s.mesh.rotation.y += s.spin.y * dt; s.mesh.rotation.z += s.spin.z * dt;
      // contact with the carved surface
      const floor = surfaceY(p.x, p.z) + s.r;
      if (p.y < floor) {
        p.y = floor;
        if (v.y < -0.05) { v.y = -v.y * REST; s.spin.multiplyScalar(0.6); if (s.onBounce) s.onBounce(Math.min(1, -v.y / 0.4)); }
        else { v.y = 0; s.onGround += dt; }
        // roll downhill, with friction
        const [gx, gz] = slope(p.x, p.z);
        v.x -= gx * G * 0.5 * dt; v.z -= gz * G * 0.5 * dt;
        const keep = Math.pow(ROLL, dt * 60 / 60); v.x *= keep; v.z *= keep;
        s.spin.multiplyScalar(keep);
      }
      // shoved apart by resting seeds
      for (const o of s.others) {
        if (o === s.mesh) continue; const q = o.position; const ddx = p.x - q.x, ddz = p.z - q.z; const d = Math.hypot(ddx, ddz); const min = s.r * 2.05;
        if (d < min && d > 1e-4) { const push = (min - d) / min; p.x += ddx / d * push * PUSH; p.z += ddz / d * push * PUSH; v.x += ddx / d * push * 0.3; v.z += ddz / d * push * 0.3; if (p.y < floor + 0.004) p.y = Math.max(p.y, q.y + s.r * 0.35 * push); }
      }
      // drift gently toward the chosen slot so seeds end up spread, not piled on one spot
      p.x += (s.target.x - p.x) * 0.5 * dt; p.z += (s.target.z - p.z) * 0.5 * dt;
      const speed = Math.hypot(v.x, v.y, v.z); const age = now - s.t0;
      if ((s.onGround > 0.08 && speed < SETTLE_SPEED) || age > MAX_MS) {
        if (age > MAX_MS) { p.copy(s.target); } else { p.y = surfaceY(p.x, p.z) + s.r; }
        this.live.splice(i, 1); s.resolve();
      }
    }
  }
}
