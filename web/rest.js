// Rest the board when nothing moves (idea 4 Nov, from L16). Pure logic, no DOM and no three.js import, so node can test it.
//
// The render loop used to hand the whole scene to WebGL every frame while the game was on screen, even when nothing on it
// moved (a board waiting for your move): the GPU drew the same picture 60 times a second, which is most of a phone's battery
// and heat in this game. Now each frame first reads a short list of numbers that say what the picture would be — every
// object's place, turn, size and whether it shows; every material's colour, glow, see-through and version (a texture swapped
// or redrawn bumps it); each geometry and its buffers' versions; the lights; the camera's place and lens; the canvas size —
// and the scene is drawn only when one of them changed since the last drawing. Nothing in the game has to remember to say
// "draw me": a seed landing, a mark fading in, a glow breathing, the camera turned by a finger, Home's slow turn, a new wood
// all change a number, so they are drawn exactly as before. A settled board costs one walk over a few hundred objects (well
// under a millisecond) and no GPU work at all; the browser keeps showing the last picture.
//
// A heartbeat draws once a second anyway (HEARTBEAT_MS), so anything this list could ever miss is never more than a moment late.

export const HEARTBEAT_MS = 1000;

function pushColor(out, c) { if (c) out.push(c.r, c.g, c.b); else out.push(-1, -1, -1); }
function pushTex(out, t) { if (t) { out.push(t.id, t.version || 0); out.push(t.offset ? t.offset.x : 0, t.offset ? t.offset.y : 0, t.rotation || 0); } else out.push(-1, 0, 0, 0, 0); }

function pushMaterial(out, m) {
  if (!m) { out.push(-1); return; }
  out.push(m.id, m.version || 0, m.visible === false ? 0 : 1, m.opacity == null ? 1 : m.opacity, m.transparent ? 1 : 0);
  pushColor(out, m.color); pushColor(out, m.emissive);
  out.push(m.emissiveIntensity == null ? 1 : m.emissiveIntensity, m.roughness == null ? -1 : m.roughness, m.metalness == null ? -1 : m.metalness);
  pushTex(out, m.map); pushTex(out, m.emissiveMap);
}

function pushGeometry(out, g) {
  if (!g) { out.push(-1); return; }
  out.push(g.id);
  const a = g.attributes || {};
  for (const k in a) out.push(a[k].version || 0);
  out.push(g.drawRange ? g.drawRange.count : -1);
}

// sceneKey(scene, camera, size, out): the numbers that decide the picture, written into `out` (an array, reused) and returned
export function sceneKey(scene, camera, size, out = []) {
  out.length = 0;
  out.push(size ? size.w : 0, size ? size.h : 0, size ? size.r || 1 : 1);
  if (camera) {
    const p = camera.position, q = camera.quaternion; out.push(p.x, p.y, p.z, q.x, q.y, q.z, q.w);
    const e = camera.projectionMatrix && camera.projectionMatrix.elements; if (e) for (let i = 0; i < 16; i++) out.push(e[i]);
  }
  if (scene.background && scene.background.r != null) pushColor(out, scene.background);
  const walk = (o) => {
    out.push(o.id, o.visible === false ? 0 : 1);
    if (o.visible === false) { out.push(0); return; } // a hidden object draws nothing, whatever is under it
    const p = o.position, q = o.quaternion, s = o.scale;
    out.push(p.x, p.y, p.z, q.x, q.y, q.z, q.w, s.x, s.y, s.z);
    if (o.intensity != null) { out.push(o.intensity); pushColor(out, o.color); } // lights
    if (o.count != null) out.push(o.count); // instanced meshes
    if (o.instanceMatrix) out.push(o.instanceMatrix.version || 0);
    if (o.material) { if (Array.isArray(o.material)) for (const m of o.material) pushMaterial(out, m); else pushMaterial(out, o.material); }
    if (o.geometry) pushGeometry(out, o.geometry);
    const ch = o.children || []; out.push(ch.length);
    for (const c of ch) walk(c);
  };
  walk(scene);
  return out;
}

const same = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && !(a[i] !== a[i] && b[i] !== b[i])) return false; return true; };

// makeRest(): the loop asks `rest.draw(scene, camera, size, now, force)` each frame; true means draw this frame, and then `rest.seen(...)`
export function makeRest({ heartbeat = HEARTBEAT_MS, on = true } = {}) {
  let prev = [], next = [], lastDraw = -Infinity;
  const r = {
    on, drawn: 0, rested: 0, restingSince: null,
    draw(scene, camera, size, now, force = false) {
      if (force || !r.on) { prev.length = 0; lastDraw = now; r.drawn++; r.restingSince = null; return true; } // seeds in the air: drawn, and nothing read (the next still frame is read afresh)
      sceneKey(scene, camera, size, next);
      const changed = !same(prev, next);
      const t = prev; prev = next; next = t; // keep what was just read as the one to compare against
      if (changed || now - lastDraw >= heartbeat) { lastDraw = now; r.drawn++; if (changed) r.restingSince = null; return true; }
      r.rested++; if (r.restingSince == null) r.restingSince = now; return false;
    },
    // after drawing: read again, since three.js itself bumps a two-sided see-through material's version as it draws it (it draws the
    // back faces, then the front), and that is not a change in the picture
    seen(scene, camera, size) { if (prev.length) sceneKey(scene, camera, size, prev); },
    reset() { prev = []; lastDraw = -Infinity; r.restingSince = null; },
    get resting() { return r.restingSince != null; },
  };
  return r;
}
