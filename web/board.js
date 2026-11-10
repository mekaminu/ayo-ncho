// The 3D board: geometry, materials, lights, camera. Pure scene-building; no game logic here.
import * as THREE from 'three';
import { woodTextures, bronzeTextures, grandpaTextures, roomTexture, seedTexture, stoneTexture, cowrieTexture, kernelTexture, clothTexture } from './textures.js';
import { bowl } from './slots.js'; // the bowl's curve lives with the seeds that lie in it
import { WARM } from './clearmarks.js';
export { bowl };

// Board sizes (metres). Length runs along Z towards the player, width along X.
export const BW = 0.42, BL = 1.28, BT = 0.085, R = 0.19;
// The end troughs are round-ish cups that fill the board's rounded ends, deeper than the pits are and flatter-bottomed
// (30 Oct, after Meka saw 22 seeds heaped over the old shallow trough): a winner's seeds lie in them, below the rim.
// The board grew 4 cm to make room; the walls to the nearest pits and to the rim stay 6 mm and 8 mm.
export const PIT_R = 0.082, PIT_D = 0.054, STORE_RX = 0.154, STORE_RZ = 0.086, STORE_D = 0.058, STORE_FLAT = 1.8;

// Pit centres by engine index: 0..5 the player's (right column, near → far), 6..11 the opponent's (left column, far → near).
export const pitCenters = [];
const colX = 0.105, rowZ0 = 0.37, rowStep = 0.148;
for (let r = 0; r < 6; r++) pitCenters.push([colX, rowZ0 - r * rowStep]);
for (let r = 0; r < 6; r++) pitCenters.push([-colX, (rowZ0 - 5 * rowStep) + r * rowStep]);
export const storeCenters = [[0, 0.528], [0, -0.528]]; // player's (near), opponent's (far)

export function carve(x, z) {
  let d = 0;
  for (const [px, pz] of pitCenters) d = Math.max(d, bowl(x - px, z - pz, PIT_R, PIT_R, PIT_D));
  for (const [sx, sz] of storeCenters) d = Math.max(d, bowl(x - sx, z - sz, STORE_RX, STORE_RZ, STORE_D, STORE_FLAT));
  return d;
}
// Height of the carved surface at board-local x,z.
export function surfaceY(x, z) { return BT - carve(x, z); }
function edgeDist(x, z) {
  const hx = BW / 2, hz = BL / 2; const cx = Math.max(0, Math.abs(x) - (hx - R)), cz = Math.max(0, Math.abs(z) - (hz - R));
  return R - Math.sqrt(cx * cx + cz * cz);
}

// The boards: three woods free, and two sold as looks in the store (L10, slice 2) — Benin bronze (cast metal: it needs a room to
// reflect) and Grandpa's board (old, worn wood). `FINISHES` lists them all; what may be drawn is web/entitle.js's call.
export const FINISHES = {
  mahogany: { name: 'Mahogany' }, iroko: { name: 'Iroko' }, ebony: { name: 'Ebony' },
  benin: { name: 'Benin bronze', metal: true }, grandpa: { name: "Grandpa's board" },
};
const GEO = () => ({ BW, BL, R, pits: pitCenters, PIT_R, stores: storeCenters, SRX: STORE_RX, SRZ: STORE_RZ });
let room = null; // the bronze's reflected room, made once
// The material settings and textures for a finish (an unknown one is mahogany).
export function boardLook(finish, q = {}) {
  const f = FINISHES[finish] ? finish : 'mahogany';
  if (f === 'benin') return { tex: bronzeTextures(q, GEO()), roughness: 0.42, metalness: 0.72, bumpScale: 0.0042, env: room || (room = roomTexture()), envMapIntensity: 0.85 };
  if (f === 'grandpa') return { tex: grandpaTextures(q, GEO()), roughness: 0.44, metalness: 0, bumpScale: 0.0036 };
  return { tex: woodTextures(f, q), roughness: 0.5, metalness: 0, bumpScale: 0.003 };
}
// How the carved top is shaded at a point, on top of the texture (the vertex colours, which may go above 1 to brighten):
// every finish darkens with depth into a bowl (the lamp reaches less of it); Grandpa's board is worn pale round every rim and the
// board's edge, where fifty years of hands went, and darker in the pit floors; the bronze is rubbed bright on the rims and
// greener (the patina settles) down in the bowls. `c` is the depth carved here, `e` the distance in from the board's edge.
export function topTone(finish, x, z, c, e) {
  const ao = 1 - 0.62 * Math.pow(Math.min(1, c / PIT_D), 0.7);
  let rim = 0; for (const [px, pz] of pitCenters) rim = Math.max(rim, Math.exp(-(((Math.hypot(x - px, z - pz) - PIT_R) / 0.008) ** 2)));
  for (const [sx, sz] of storeCenters) rim = Math.max(rim, Math.exp(-(((Math.hypot((x - sx) / STORE_RX, (z - sz) / STORE_RZ) - 1) * STORE_RZ / 0.006) ** 2)));
  if (finish === 'grandpa') {
    const edge = e < 0.02 ? Math.min(1, 1 - e / 0.02) : 0, w = Math.max(rim, edge * 0.8), deep = Math.min(1, c / PIT_D);
    const k = ao * (1 + 0.6 * w) * (1 - 0.22 * deep * deep); return [k * (1 + 0.06 * w), k * (1 + 0.02 * w), k * (0.94 - 0.04 * w)];
  }
  if (finish === 'benin') { const deep = Math.min(1, c / PIT_D), k = ao * (1 + 0.35 * rim); return [k * (1 - 0.22 * deep), k * (1 + 0.04 * deep), k * (1 + 0.02 * deep)]; }
  return [ao, ao * 0.96, ao * 0.92];
}

export function buildBoard(scene, finish = 'mahogany', q = {}) {
  const woodMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 });
  const group = new THREE.Group(); let topMat, topMesh;

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
    const [sx, sz] = q.topSegs || [210, 620]; // the lighter tier carves the top with fewer polygons
    const g = new THREE.PlaneGeometry(BW + 0.01, BL + 0.01, sx, sz); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position; const top = BT + 0.0006; const ER = 0.016;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); let y = top - carve(x, z); const e = edgeDist(x, z);
      if (e < 0) y = -0.02; else if (e < ER) { const u = ER - e; y = top - ER + Math.sqrt(Math.max(0, ER * ER - u * u)); }
      pos.setY(i, y);
    }
    g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / BW + 0.5, pos.getZ(i) / BL + 0.5);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    topMat = new THREE.MeshStandardMaterial({ vertexColors: true });
    topMesh = new THREE.Mesh(g, topMat); topMesh.receiveShadow = true; group.add(topMesh);
  }
  // dress the board in a finish: textures, the material's feel and the top's shading; again in place when Settings changes it
  let worn = null;
  function setFinish(f) {
    const L = boardLook(f, q), id = FINISHES[f] ? f : 'mahogany';
    if (worn) { worn.map.dispose(); worn.bump.dispose(); }
    for (const m of [woodMat, topMat]) {
      Object.assign(m, { map: L.tex.map, bumpMap: L.tex.bump, bumpScale: L.bumpScale, roughness: L.roughness, metalness: L.metalness, envMap: L.env || null, envMapIntensity: L.envMapIntensity || 1 });
      m.needsUpdate = true;
    }
    worn = L.tex;
    const pos = topMesh.geometry.attributes.position, col = topMesh.geometry.attributes.color;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const [r, g, b] = topTone(id, x, z, carve(x, z), edgeDist(x, z)); col.setXYZ(i, r, g, b); }
    col.needsUpdate = true; look.finish = id;
  }
  const look = { finish: null };
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
  // the mouse on the Mac: a fainter brass ring on the rim of the playable pit under the pointer (web/hover.js says when)
  const hover = new THREE.Mesh(ring.geometry, new THREE.MeshBasicMaterial({ color: 0xe6b76f, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  hover.rotation.x = -Math.PI / 2; hover.position.y = BT + 0.0018; hover.visible = false; group.add(hover);
  const marks = buildPathMarks(group);
  // feed them: when the rules narrow your move, a brass ring on the rim of each pit you may play (web/feed.js says when)
  const mayG = new THREE.RingGeometry(PIT_R * 0.84, PIT_R * 0.9, 96);
  const may = pitCenters.map(([x, z]) => { const m = new THREE.Mesh(mayG, new THREE.MeshBasicMaterial({ color: 0xf0c27a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, BT + 0.0022, z); m.visible = false; m.renderOrder = 2; group.add(m); return m; });
  // whose move (web/turncue.js, 10 Nov): on your move a soft warm light round the rim of every pit you may play, fading off the
  // wood on both sides of the rim, softer than a picked pit's ring
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,214,150,0)'); r.addColorStop(0.66, 'rgba(255,214,150,0)'); r.addColorStop(0.79, 'rgba(255,218,158,1)');
    r.addColorStop(0.87, 'rgba(255,200,128,0.42)'); r.addColorStop(1, 'rgba(255,190,118,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const turnG = new THREE.PlaneGeometry(PIT_R * 2.6, PIT_R * 2.6); // the light's peak (0.79 of its radius) sits on the rim
  const turn = pitCenters.map(([x, z]) => { const m = new THREE.Mesh(turnG, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, BT + 0.0016, z); m.visible = false; m.renderOrder = 1; group.add(m); return m; });

  // clear marks (web/clearmarks.js): the marks' colours in place, and the capture ring's second ring inside it on or off
  const tint = { pal: WARM, double: false };
  function setMarks(pal = WARM, double = false) {
    const paint = (list, hex) => list.forEach((m) => m.material.color.setHex(hex));
    paint(marks.steps, pal.steps); paint(marks.dots, pal.dots); paint(marks.caps, pal.caps); paint(marks.gifts, pal.gifts);
    paint(marks.slams, pal.slams); paint(marks.risk, pal.risk); paint(may, pal.may);
    hover.material.color.setHex(pal.hover); ring.material.color.setHex(pal.ring);
    marks.caps.forEach((m) => { m.userData.inner.visible = !!double; });
    tint.pal = pal; tint.double = !!double;
  }
  setFinish(finish);
  scene.add(group);
  return { group, targets, ring, glow, hover, woodMat, marks, may, turn, setFinish, setMarks, get tint() { return { ...tint }; }, get finish() { return look.finish; } };
}

// Where the seeds will go (shown on the first tap, from the engine's own events): a faint brass ring just inside the rim of
// every pit the hand would sow into, a pool of lamp light on the pit where the turn ends, and a copper ring round the rim of
// a pit the move captures. Built once and hidden; game.js lands them in sowing order and clears them on the second tap.
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,214,150,1)'); r.addColorStop(0.55, 'rgba(255,196,120,0.55)'); r.addColorStop(1, 'rgba(255,180,100,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildPathMarks(group) {
  const ringG = new THREE.RingGeometry(PIT_R * 0.86, PIT_R * 0.91, 72), dotG = new THREE.CircleGeometry(PIT_R * 0.14, 24);
  const capG = new THREE.RingGeometry(PIT_R * 0.98, PIT_R * 1.05, 72), endG = new THREE.CircleGeometry(PIT_R * 1.15, 48);
  const mk = (geom, mat, x = 0, y = BT + 0.0025, z = 0) => { const m = new THREE.Mesh(geom, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.visible = false; m.renderOrder = 2; group.add(m); return m; };
  // a broken ring (16 dashes) so it never reads as one of the copper capture rings: a warning, drawn as one
  const riskG = new THREE.RingGeometry(PIT_R * 1.07, PIT_R * 1.15, 64, 1); { const idx = riskG.index.array, keep = [];
    for (let k = 0; k < 64; k++) if (k % 4 < 2) for (let j = 0; j < 6; j++) keep.push(idx[k * 6 + j]); riskG.setIndex(keep); }
  // whose 4 is it: a pit the move fills to 4 that goes to the OTHER side's trough gets a pale, beaded ring at the capture
  // ring's place (24 short beads, bone-coloured) — the seeds leave the pit, but they are not yours
  const giftG = new THREE.RingGeometry(PIT_R * 0.98, PIT_R * 1.05, 72, 1); { const idx = giftG.index.array, keep = [];
    for (let k = 0; k < 72; k++) if (k % 3 < 2) for (let j = 0; j < 6; j++) keep.push(idx[k * 6 + j]); giftG.setIndex(keep); }
  // every seed they have (an Ayo grand slam): the capture that is not — an ash-grey ring at the capture ring's place with one
  // stroke across the pit, the way a sum is struck out; the bar is the ring's child, so it fades and scales with it
  const slamG = new THREE.RingGeometry(PIT_R * 0.98, PIT_R * 1.04, 72), barG = new THREE.PlaneGeometry(PIT_R * 2.0, PIT_R * 0.055);
  // clear marks: a second, thinner ring inside the capture ring (the ring's child, so it lands, fades and scales with it), so a pit
  // you take differs from the brass path ring by its shape as well as its colour; hidden unless Settings → Board → Clear marks
  const innerG = new THREE.RingGeometry(PIT_R * 0.925, PIT_R * 0.955, 72);
  const steps = [], dots = [], caps = [], risk = [], gifts = [], slams = [];
  for (const [x, z] of pitCenters) {
    steps.push(mk(ringG, new THREE.MeshBasicMaterial({ color: 0xe6b76f, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), x, BT + 0.0025, z));
    // the mark itself: a brass dot on the bowl's inner slope, at the edge nearest the board's centre line, where seeds seldom sit
    const dx = x - Math.sign(x) * PIT_R * 0.74, dz = z + PIT_R * 0.42;
    dots.push(mk(dotG, new THREE.MeshBasicMaterial({ color: 0xf2c57c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), dx, surfaceY(dx, dz) + 0.0015, dz));
    const cp = mk(capG, new THREE.MeshBasicMaterial({ color: 0xff6e3a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), x, BT + 0.003, z);
    const inner = new THREE.Mesh(innerG, cp.material); inner.renderOrder = 2; inner.visible = false; cp.add(inner); cp.userData.inner = inner; caps.push(cp);
    gifts.push(mk(giftG, new THREE.MeshBasicMaterial({ color: 0xf3e6c8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), x, BT + 0.003, z));
    const sm = mk(slamG, new THREE.MeshBasicMaterial({ color: 0xc9bfae, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), x, BT + 0.0032, z);
    const bar = new THREE.Mesh(barG, sm.material); bar.rotation.z = Math.PI / 4; bar.renderOrder = 2; sm.add(bar); sm.userData.bar = bar; slams.push(sm);
    // what the move leaves open: a deep ember ring just outside the rim of a pit their best answer would take
    risk.push(mk(riskG, new THREE.MeshBasicMaterial({ color: 0xff3b2b, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), x, BT + 0.0035, z));
  }
  const end = mk(endG, new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffc877, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), 0, BT + 0.002, 0);
  return { steps, dots, caps, risk, gifts, slams, end };
}

export function buildTable(scene, q = {}) {
  const t = clothTexture(q); const g = new THREE.PlaneGeometry(6, 6); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); m.receiveShadow = true; m.position.y = -0.0005; scene.add(m);
}

export function buildLights(scene, shadowSize = 2048) {
  scene.add(new THREE.HemisphereLight(0xffe2c0, 0x1a0e07, 0.55));
  const key = new THREE.DirectionalLight(0xffd4a4, 2.6); key.position.set(-0.9, 1.6, 0.6); key.castShadow = true; key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.camera.left = -0.8; key.shadow.camera.right = 0.8; key.shadow.camera.top = 0.9; key.shadow.camera.bottom = -0.9; key.shadow.camera.near = 0.2; key.shadow.camera.far = 5; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.004; scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb070, 0.7); rim.position.set(0.8, 0.9, -1.2); scene.add(rim);
  const fill = new THREE.PointLight(0xffe8d0, 0.25, 4); fill.position.set(0.9, 1.4, 1.3); scene.add(fill);
  return { key, rim, fill }; // the lamp, so the win can warm it a moment
}

export function seedMaterial(q = {}) {
  const tex = seedTexture(q);
  return new THREE.MeshStandardMaterial({ map: tex, color: 0xd9d3bf, roughness: 0.36, metalness: 0, bumpMap: tex, bumpScale: 0.0015 });
}
// Seed sets: Job's tears (the default), river stones (unlocked by the calm streak), and the two sold as looks in the store (L10):
// cowries and palm kernels. Looks only; the rules never change. `r` is each seed's half-size (long, high, across).
export const SEED_SETS = {
  jobs:    { name: "Job's tears", r: [0.0180, 0.0152, 0.0138] },
  stones:  { name: 'River stones', r: [0.0196, 0.0112, 0.0160] }, // flatter, a touch wider: a smooth pebble
  cowries: { name: 'Cowries', r: [0.0205, 0.0125, 0.0150] },     // longer, a domed back on a flat base
  kernels: { name: 'Palm kernels', r: [0.0170, 0.0150, 0.0160] }, // rounder, knobbly
};
export function seedMaterialFor(set = 'jobs', q = {}) {
  if (set === 'stones') { const tex = stoneTexture(q); return new THREE.MeshStandardMaterial({ map: tex, color: 0x8e969c, roughness: 0.42, metalness: 0, bumpMap: tex, bumpScale: 0.0012 }); }
  if (set === 'cowries') { const tex = cowrieTexture(q); return new THREE.MeshStandardMaterial({ map: tex, color: 0xf4ecdc, roughness: 0.2, metalness: 0, bumpMap: tex, bumpScale: 0.0018 }); } // glossy shell
  if (set === 'kernels') { const tex = kernelTexture(q); return new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.46, metalness: 0, bumpMap: tex, bumpScale: 0.0012 }); }
  return seedMaterial(q);
}
export const SEED_R = SEED_SETS.jobs.r;
export const seedGeometry = new THREE.SphereGeometry(1, 28, 20);
// The unit shape of each set, scaled by its `r` (and each seed's own jitter) in game.js. It always spans -1..1 on every axis,
// so the seed lies in its slot (slots.js treats it as the ellipsoid of half-sizes r) exactly as a round seed would.
//   cowrie: the lower half pushed out to a flat base with rounded sides (|y|^0.3), the dome kept; then the whole squeezed so
//           the base is at -1, the crown at +1 and the widest part low down (at -0.3), as a cowrie sits; the ends drawn in and
//           a shallow groove pressed into the base along the slit
//   kernel: the sphere pushed in and out a little by a smooth lumpy field, the same for every kernel (the jitter varies them)
export function shapeVertex(set, x, y, z) {
  if (set === 'cowries') {
    let yy = y < 0 ? -Math.pow(-y, 0.3) : y;
    yy = yy > 0 ? yy * 1.3 - 0.3 : yy * 0.7 - 0.3;
    if (y < -0.2 && Math.abs(z) < 0.16) yy += 0.07 * (1 - Math.abs(z) / 0.16);
    const zz = z * (1 - 0.16 * x * x);
    return [x, Math.max(-1, Math.min(1, yy)), zz];
  }
  if (set === 'kernels') {
    const k = 1 + 0.055 * Math.sin(3.1 * x + 1.2) * Math.cos(2.3 * z + 0.4) + 0.035 * Math.sin(4.7 * y + 2.1 * x);
    const m = 1.09; // so the bumps never reach past -1..1
    return [x * k / m, y * k / m, z * k / m];
  }
  return [x, y, z];
}
const shaped = {};
// `over`: the shell lying on its back (a cowrie turned over shows the toothed slit, as about half of them do on a real board).
export function seedGeometryFor(q = {}, set = 'jobs', over = false) {
  const [a, b] = q.seedSegs || [28, 20]; over = over && set === 'cowries'; const key = `${set}:${a}:${b}:${over ? 1 : 0}`;
  if (shaped[key]) return shaped[key];
  const g = a === 28 && b === 20 && (set === 'jobs' || set === 'stones') ? seedGeometry : new THREE.SphereGeometry(1, a, b);
  if (set === 'cowries' || set === 'kernels') {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const [x, y, z] = shapeVertex(set, p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, over ? -y : y, over ? -z : z); }
    g.computeVertexNormals(); smoothSeam(g); g.computeBoundingSphere();
  }
  return (shaped[key] = g);
}
// A sphere's seam and poles are vertices made twice; once the shape is bent their normals differ and a hard line shows. Give
// every copy of a point the same (summed) normal.
function smoothSeam(g) {
  const p = g.attributes.position, n = g.attributes.normal, at = new Map();
  const r = (v) => Math.round(v * 1e5), key = (i) => `${r(p.getX(i))},${r(p.getY(i))},${r(p.getZ(i))}`; // -0 and 0 are one key
  for (let i = 0; i < p.count; i++) { const k = key(i); const s = at.get(k) || [0, 0, 0]; s[0] += n.getX(i); s[1] += n.getY(i); s[2] += n.getZ(i); at.set(k, s); }
  for (let i = 0; i < p.count; i++) { const [x, y, z] = at.get(key(i)); const l = Math.hypot(x, y, z) || 1; n.setXYZ(i, x / l, y / l, z / l); }
  n.needsUpdate = true;
}
