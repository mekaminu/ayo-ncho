import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { sceneKey, makeRest, HEARTBEAT_MS } from "../web/rest.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

function world() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d0906);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 20); camera.position.set(0, 1, 1); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  const board = new THREE.Group(); scene.add(board);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b3a1f });
  board.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.3), wood));
  const seedMat = new THREE.MeshStandardMaterial({ color: 0x9a9b86 }); const geo = new THREE.SphereGeometry(0.01);
  const seeds = []; for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(geo, seedMat); m.position.set(i * 0.01, 0.05, 0); scene.add(m); seeds.push(m); }
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xc8a050, transparent: true, opacity: 0 }); const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.03), ringMat); ring.visible = false; scene.add(ring);
  const lamp = new THREE.PointLight(0xffd8a0, 2); scene.add(lamp);
  return { scene, camera, board, wood, seeds, ring, ringMat, lamp, seedMat, size: { w: 390, h: 800 } };
}

test("the same picture reads the same numbers, and a still board rests", () => {
  const W = world(); const rest = makeRest();
  assert.deepEqual(sceneKey(W.scene, W.camera, W.size), sceneKey(W.scene, W.camera, W.size));
  assert.equal(rest.draw(W.scene, W.camera, W.size, 0), true, "the first frame is drawn");
  let drawn = 0; for (let t = 16; t < HEARTBEAT_MS - 16; t += 16) drawn += rest.draw(W.scene, W.camera, W.size, t) ? 1 : 0;
  assert.equal(drawn, 0, "nothing moved: no frame drawn"); assert.equal(rest.resting, true);
  assert.equal(rest.draw(W.scene, W.camera, W.size, HEARTBEAT_MS + 1), true, "the heartbeat draws once a second");
  assert.equal(rest.resting, true, "a heartbeat is still resting");
});

test("every kind of change in the picture wakes it", () => {
  const changes = {
    "a seed moves": (W) => { W.seeds[7].position.y += 1e-4; },
    "a seed turns": (W) => { W.seeds[3].rotation.z += 0.01; W.seeds[3].updateMatrix(); },
    "a seed changes size (a new seed set)": (W) => { W.seeds[0].scale.x = 1.1; },
    "a mark shows": (W) => { W.ring.visible = true; },
    "a seed hides": (W) => { W.seeds[5].visible = false; },
    "a mark fades in": (W) => { W.ringMat.opacity = 0.3; },
    "a glow breathes": (W) => { W.wood.emissiveIntensity = 0.7; },
    "a colour changes": (W) => { W.wood.color.setHex(0x4a2a14); },
    "a material is swapped (a new seed set)": (W) => { W.seeds[1].material = new THREE.MeshStandardMaterial(); },
    "a texture is redrawn": (W) => { const t = new THREE.Texture(); W.wood.map = t; W.wood.needsUpdate = true; },
    "a geometry is swapped": (W) => { W.seeds[2].geometry = new THREE.SphereGeometry(0.012); },
    "a buffer is rewritten": (W) => { W.seeds[2].geometry.attributes.position.needsUpdate = true; },
    "the lamp dims": (W) => { W.lamp.intensity = 1.5; },
    "the camera is turned by a finger": (W) => { W.camera.position.x += 0.001; },
    "the camera zooms (the lens)": (W) => { W.camera.fov = 40; W.camera.updateProjectionMatrix(); },
    "the picture is moved (view offset)": (W) => { W.camera.setViewOffset(390, 800, 10, 0, 390, 800); },
    "the screen is resized (the Fold opened)": (W) => { W.size.w = 800; },
    "something is added": (W) => { W.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), W.wood)); },
    "something is removed": (W) => { W.scene.remove(W.seeds[47]); },
    "a parent moves (the board turns)": (W) => { W.board.rotation.y = 0.1; },
  };
  for (const [what, change] of Object.entries(changes)) {
    const W = world(); if (what === "a mark fades in") W.ring.visible = true;
    const rest = makeRest(); rest.draw(W.scene, W.camera, W.size, 0); rest.draw(W.scene, W.camera, W.size, 16);
    assert.equal(rest.draw(W.scene, W.camera, W.size, 32), false, what + ": rests before");
    change(W);
    assert.equal(rest.draw(W.scene, W.camera, W.size, 48), true, what + ": drawn");
    assert.equal(rest.resting, false, what);
    assert.equal(rest.draw(W.scene, W.camera, W.size, 64), false, what + ": rests again once it stops");
  }
});

test("a hidden mark changing behind the scenes draws nothing", () => {
  const W = world(); const rest = makeRest(); rest.draw(W.scene, W.camera, W.size, 0);
  W.ringMat.opacity = 0.5; W.ring.position.x = 0.2; // the ring is hidden: the picture is the same
  assert.equal(rest.draw(W.scene, W.camera, W.size, 16), false);
});

test("seeds in the air are always drawn, and the first still frame after is read afresh", () => {
  const W = world(); const rest = makeRest(); rest.draw(W.scene, W.camera, W.size, 0);
  for (let t = 16; t < 500; t += 16) { W.seeds[0].position.y = t / 1e4; assert.equal(rest.draw(W.scene, W.camera, W.size, t, true), true); }
  assert.equal(rest.draw(W.scene, W.camera, W.size, 512), true, "the landing frame is drawn");
  assert.equal(rest.draw(W.scene, W.camera, W.size, 528), false, "then it rests");
});

test("three.js drawing a two-sided see-through mark (it bumps the material's version) is not a change", () => {
  const W = world(); W.ring.visible = true; W.ringMat.side = THREE.DoubleSide; W.ringMat.opacity = 0.5;
  const rest = makeRest(); const render = () => { W.ringMat.side = THREE.BackSide; W.ringMat.needsUpdate = true; W.ringMat.side = THREE.DoubleSide; W.ringMat.needsUpdate = true; };
  assert.equal(rest.draw(W.scene, W.camera, W.size, 0), true); render(); rest.seen(W.scene, W.camera, W.size);
  for (let t = 16; t < 600; t += 16) assert.equal(rest.draw(W.scene, W.camera, W.size, t), false, "rests at " + t);
  W.wood.needsUpdate = true; assert.equal(rest.draw(W.scene, W.camera, W.size, 640), true, "a material really changed (a new wood) is drawn");
});

test("?rest=0 draws every frame, as before", () => {
  const W = world(); const rest = makeRest({ on: false });
  for (let t = 0; t < 200; t += 16) assert.equal(rest.draw(W.scene, W.camera, W.size, t), true);
  assert.equal(rest.resting, false);
});

test("a hundred still frames of a real-sized scene cost little", () => {
  const W = world(); for (let i = 0; i < 300; i++) W.scene.add(new THREE.Mesh(new THREE.BoxGeometry(), W.wood));
  const rest = makeRest(); const out = []; const t0 = performance.now();
  for (let i = 0; i < 100; i++) rest.draw(W.scene, W.camera, W.size, i * 16);
  sceneKey(W.scene, W.camera, W.size, out);
  const per = (performance.now() - t0) / 100;
  assert.ok(per < 2, `about ${per.toFixed(3)} ms a frame`);
});

test("the game draws through it, the share picture draws first, and it is cached offline", () => {
  const g = read("web/game.js");
  assert.match(g, /from '\.\/rest\.js'/);
  assert.match(g, /if \(rest\.draw\(scene, camera, view, now, [^)]*moving\)\) \{ renderer\.render\(scene, camera\); rest\.seen\(scene, camera, view\); \}/, "the loop asks before drawing, and reads again after; moving frames are always drawn");
  assert.equal((g.match(/renderer\.render\(scene, camera\)/g) || []).length, 2, "the loop and the share picture only");
  assert.match(g, /renderer\.render\(scene, camera\); const blob = await new Promise\(\(r\) => canvas\.toBlob/, "the share picture is drawn right before it is read");
  assert.match(g, /rest\.reset\(\)/, "back from a hidden tab: drawn afresh");
  assert.match(read("web/sw.js"), /'\.\/rest\.js'/, "cached for offline play");
});
