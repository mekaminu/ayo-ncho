// The 3D board: geometry, materials, lights, camera. Pure scene-building; no game logic here.
import * as THREE from 'three';
import { woodTextures, seedTexture, clothTexture } from './textures.js';

// Board sizes (metres). Length runs along Z towards the player, width along X.
export const BW = 0.42, BL = 1.24, BT = 0.085, R = 0.19;
export const PIT_R = 0.082, PIT_D = 0.054, STORE_RX = 0.155, STORE_RZ = 0.052, STORE_D = 0.034;

// Pit centres by engine index: 0..5 the player's (right column, near → far), 6..11 the opponent's (left column, far → near).
export const pitCenters = [];
const colX = 0.105, rowZ0 = 0.37, rowStep = 0.148;
for (let r = 0; r < 6; r++) pitCenters.push([colX, rowZ0 - r * rowStep]);
for (let r = 0; r < 6; r++) pitCenters.push([-colX, (rowZ0 - 5 * rowStep) + r * rowStep]);
export const storeCenters = [[0, 0.545], [0, -0.545]]; // player's (near), opponent's (far)

export function bowl(dx, dz, rx, rz, depth) {
  const d = Math.sqrt((dx / rx) ** 2 + (dz / rz) ** 2); if (d >= 1) return 0; const t = 1 - d * d; return depth * (t * t * (3 - 2 * t));
}
export function carve(x, z) {
  let d = 0;
  for (const [px, pz] of pitCenters) d = Math.max(d, bowl(x - px, z - pz, PIT_R, PIT_R, PIT_D));
  for (const [sx, sz] of storeCenters) d = Math.max(d, bowl(x - sx, z - sz, STORE_RX, STORE_RZ, STORE_D));
  return d;
}
// Height of the carved surface at board-local x,z.
export function surfaceY(x, z) { return BT - carve(x, z); }
function edgeDist(x, z) {
  const hx = BW / 2, hz = BL / 2; const cx = Math.max(0, Math.abs(x) - (hx - R)), cz = Math.max(0, Math.abs(z) - (hz - R));
  return R - Math.sqrt(cx * cx + cz * cz);
}

export function buildBoard(scene, finish = 'mahogany') {
  const wood = woodTextures(finish);
  const woodMat = new THREE.MeshStandardMaterial({ map: wood.map, bumpMap: wood.bump, bumpScale: 0.003, roughness: 0.5, metalness: 0 });
  const group = new THREE.Group();

  // body: rounded rectangle, sits under the carved top
  {
    const s = new THREE.Shape(); const hx = BW / 2, hz = BL / 2;
    s.moveTo(-hx + R, -hz); s.lineTo(hx - R, -hz); s.absarc(hx - R, -hz + R, R, -Math.PI / 2, 0, false); s.lineTo(hx, hz - R); s.absarc(hx - R, hz - R, R, 0, Math.PI / 2, false);
    s.lineTo(-hx + R, hz); s.absarc(-hx + R, hz - R, R, Math.PI / 2, Math.PI, false); s.lineTo(-hx, -hz + R); s.absarc(-hx + R, -hz + R, R, Math.PI, Math.PI * 1.5, false);
    const g = new THREE.ExtrudeGeometry(s, { depth: BT - 0.06, bevelEnabled: false, curveSegments: 32 });
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / BW + 0.5; uv[i * 2 + 1] = pos.getZ(i) / BL + 0.5; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals();
    const body = new THREE.Mesh(g, woodMat); body.castShadow = true; body.receiveShadow = true; group.add(body);
  }
  // carved top with a rounded edge and a skirt that drops below the table outside the footprint
  {
    const g = new THREE.PlaneGeometry(BW + 0.01, BL + 0.01, 210, 620); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position; const top = BT + 0.0006; const ER = 0.016;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); let y = top - carve(x, z); const e = edgeDist(x, z);
      if (e < 0) y = -0.02; else if (e < ER) { const u = ER - e; y = top - ER + Math.sqrt(Math.max(0, ER * ER - u * u)); }
      pos.setY(i, y);
    }
    g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / BW + 0.5, pos.getZ(i) / BL + 0.5);
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const c = carve(pos.getX(i), pos.getZ(i)); const ao = 1 - 0.62 * Math.pow(Math.min(1, c / PIT_D), 0.7); col[i * 3] = ao; col[i * 3 + 1] = ao * 0.96; col[i * 3 + 2] = ao * 0.92; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const topMat = woodMat.clone(); topMat.vertexColors = true;
    const topMesh = new THREE.Mesh(g, topMat); topMesh.receiveShadow = true; group.add(topMesh);
  }
  // invisible tap targets, one per pit
  const targets = [];
  pitCenters.forEach(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(PIT_R * 1.05, 24), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })); // invisible but still raycastable
    m.rotation.x = -Math.PI / 2; m.position.set(x, BT + 0.001, z); m.userData.pit = i; group.add(m); targets.push(m);
  });
  // selection ring + soft glow
  const ring = new THREE.Mesh(new THREE.RingGeometry(PIT_R * 1.04, PIT_R * 1.09, 96), new THREE.MeshBasicMaterial({ color: 0xe6b76f, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = BT + 0.002; ring.visible = false; group.add(ring);
  const glow = new THREE.PointLight(0xffc877, 0.06, 0.25); glow.visible = false; group.add(glow);

  scene.add(group);
  return { group, targets, ring, glow, woodMat };
}

export function buildTable(scene) {
  const t = clothTexture(); const g = new THREE.PlaneGeometry(6, 6); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); m.receiveShadow = true; m.position.y = -0.0005; scene.add(m);
}

export function buildLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffe2c0, 0x1a0e07, 0.55));
  const key = new THREE.DirectionalLight(0xffd4a4, 2.6); key.position.set(-0.9, 1.6, 0.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -0.8; key.shadow.camera.right = 0.8; key.shadow.camera.top = 0.9; key.shadow.camera.bottom = -0.9; key.shadow.camera.near = 0.2; key.shadow.camera.far = 5; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.004; scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb070, 0.7); rim.position.set(0.8, 0.9, -1.2); scene.add(rim);
  const fill = new THREE.PointLight(0xffe8d0, 0.25, 4); fill.position.set(0.9, 1.4, 1.3); scene.add(fill);
}

export function seedMaterial() {
  const tex = seedTexture();
  return new THREE.MeshStandardMaterial({ map: tex, color: 0xd9d3bf, roughness: 0.36, metalness: 0, bumpMap: tex, bumpScale: 0.0015 });
}
export const SEED_R = [0.0180, 0.0152, 0.0138];
export const seedGeometry = new THREE.SphereGeometry(1, 28, 20);
