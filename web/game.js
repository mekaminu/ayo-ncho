// The game: engine state → 3D seeds, animated move by move. Every move the picture shows comes from engine events.
import * as THREE from 'three';
import { newGame, applyMove, legalMoves, replay, WIN_SEEDS } from '/engine/ayo.js';
import { buildBoard, buildTable, buildLights, seedMaterial, seedGeometry, SEED_R, pitCenters, storeCenters, surfaceY, bowl, PIT_R, PIT_D, STORE_RX, STORE_RZ, STORE_D, BT } from './board.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const prefs = { get: (k, d) => { try { return localStorage.getItem('ayo.' + k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('ayo.' + k, v); } catch {} } };

// ---------- renderer / scene ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!(params.get('still') || params.get('capture')) });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d0906);
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 20);
const finish = params.get('finish') || prefs.get('finish', 'mahogany');
const board = buildBoard(scene, finish); buildTable(scene); buildLights(scene);
const seedMat = seedMaterial();

// camera: the board upright in your hands, you at the near end
let theta = 0, phi = 0.72, dist = 1.55; const target = new THREE.Vector3(0, 0.02, 0.02);
function placeCam() { camera.position.set(target.x + dist * Math.sin(phi) * Math.sin(theta), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.cos(theta)); camera.lookAt(target); }
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (w > h * 1.1) { dist = 1.25; phi = 0.62; } }
addEventListener('resize', resize); resize();

// ---------- seeds ----------
// Each seed is a mesh with a home (pit index 0..11, or 'S0'/'S1' for the stores) and a slot number in that home.
const seeds = []; // all 48 meshes
const homes = { S0: [], S1: [] }; for (let i = 0; i < 12; i++) homes[i] = [];
let rs = 11; const rnd = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };

function slotPos(home, k) { // resting position for the k-th seed in a home: a tight spiral, piling up when full
  const isStore = typeof home === 'string';
  const [cx, cz] = isStore ? storeCenters[+home[1]] : pitCenters[home];
  const rx = isStore ? STORE_RX - 0.03 : PIT_R - 0.03, rz = isStore ? STORE_RZ - 0.02 : PIT_R - 0.03, depth = isStore ? STORE_D : PIT_D;
  const per = isStore ? 14 : 8; const layer = Math.floor(k / per), j = k % per;
  const a = j * 2.39996 + (isStore ? +home[1] : home) * 0.7 + layer * 1.1;
  const rr = j === 0 ? 0 : Math.min(1, 0.36 * Math.sqrt(j));
  const x = cx + Math.cos(a) * rr * rx, z = cz + Math.sin(a) * rr * rz;
  const y = BT - bowl(x - cx, z - cz, isStore ? STORE_RX : PIT_R, isStore ? STORE_RZ : PIT_R, depth) + SEED_R[1] * 0.92 + layer * 0.022;
  return new THREE.Vector3(x, y, z);
}
function makeSeed() {
  const m = new THREE.Mesh(seedGeometry, seedMat);
  m.scale.set(SEED_R[0] * (0.9 + rnd() * 0.2), SEED_R[1] * (0.9 + rnd() * 0.2), SEED_R[2] * (0.9 + rnd() * 0.2));
  m.rotation.set(rnd() * 0.6 - 0.3, rnd() * Math.PI * 2, rnd() * 0.6 - 0.3);
  m.castShadow = true; m.receiveShadow = true; scene.add(m); seeds.push(m); return m;
}
function settle(m, home) { // put a seed at rest in a home (no animation)
  homes[home].push(m); m.userData.home = home; m.position.copy(slotPos(home, homes[home].length - 1));
}
function layoutFromState(s) { // rebuild every seed's home from an engine state (used for new game, undo, resume)
  for (const k in homes) homes[k].length = 0;
  let n = 0;
  const take = () => seeds[n++] || makeSeed();
  s.pits.forEach((c, i) => { for (let j = 0; j < c; j++) settle(take(), i); });
  for (let j = 0; j < s.stores[0]; j++) settle(take(), 'S0');
  for (let j = 0; j < s.stores[1]; j++) settle(take(), 'S1');
}

// ---------- tweens ----------
const tweens = [];
function tween(ms, step, ease = (t) => t) {
  return new Promise((res) => { if (reduceMotion) ms = Math.min(ms, 40); tweens.push({ t0: performance.now(), ms, step, ease, res }); });
}
function runTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; const t = Math.min(1, (now - tw.t0) / tw.ms); tw.step(tw.ease(t));
    if (t >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}
const easeOut = (t) => 1 - (1 - t) ** 3, easeIn = (t) => t * t, easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

// move one seed along an arc from where it is to a resting slot
function fly(m, home, ms = 170, lift = 0.09) {
  const from = m.position.clone(); homes[home].push(m); m.userData.home = home; const to = slotPos(home, homes[home].length - 1);
  const r0 = m.rotation.clone(); const spin = (rnd() - 0.5) * 1.5;
  return tween(ms, (t) => {
    m.position.lerpVectors(from, to, t); m.position.y += Math.sin(t * Math.PI) * lift;
    m.rotation.y = r0.y + spin * t;
  }, easeInOut).then(() => tween(90, (t) => { m.position.y = to.y + Math.sin(t * Math.PI) * 0.006; }));
}

// ---------- sound (tiny, synthesised; proper samples come later) ----------
let actx = null; const soundOn = () => prefs.get('sound', '1') === '1';
function click(pitch = 1, gain = 0.12) {
  if (!soundOn()) return; try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1400 * pitch, t); o.frequency.exponentialRampToValueAtTime(500 * pitch, t + 0.05);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.08);
  } catch {}
}
const buzz = (ms) => { if (prefs.get('haptics', '1') === '1' && navigator.vibrate) navigator.vibrate(ms); };

// ---------- HUD ----------
const badges = []; const badgeLayer = $('#badges');
for (let i = 0; i < 12; i++) { const b = document.createElement('span'); b.className = 'badge'; badgeLayer.appendChild(b); badges.push(b); }
const v3 = new THREE.Vector3();
function placeBadges() {
  const w = canvas.clientWidth, h = canvas.clientHeight; const show = prefs.get('badges', '1') === '1';
  pitCenters.forEach(([x, z], i) => {
    v3.set(x + (i < 6 ? PIT_R * 0.7 : -PIT_R * 0.7), BT + 0.01, z + PIT_R * 0.75).project(camera);
    const b = badges[i]; b.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px)`; b.hidden = !show;
  });
}
function setBadge(i, n) { badges[i].textContent = n; badges[i].classList.toggle('zero', n === 0); }
function tickScore(el, n) { el.textContent = n; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

// ---------- game state ----------
const variant = prefs.get('variant', 'ayo');
const level = prefs.get('level', 'medium');
let state = newGame(variant); let busy = false; let selected = null;
const you = 0, ai = 1;
const names = { easy: 'Adaeze · Easy', medium: 'Nnamdi · Medium', hard: 'Mama Ngozi · Hard' };
$('#oppName').textContent = names[level] || names.medium;

const worker = new Worker('./ai-worker.js', { type: 'module' });
function aiMove(s) { return new Promise((res) => { worker.onmessage = (e) => res(e.data); worker.postMessage({ state: s, level }); }); }

function refreshStatic() {
  state.pits.forEach((n, i) => setBadge(i, n));
  $('#myScore').textContent = state.stores[0]; $('#oppScore').textContent = state.stores[1];
  showTurn();
}
function showTurn() {
  const mine = state.turn === you && !state.over;
  $('#turn').textContent = state.over ? 'game over' : mine ? 'your move' : '…';
  $('#oppSub').textContent = state.over ? '' : mine ? 'waiting' : 'thinking…';
  $('#hint').textContent = state.over ? '' : mine ? (selected === null ? 'tap a pit on your side to sow' : 'tap again to sow, or pick another') : '';
  $('#undo').disabled = busy || state.moves.length < 2;
}
function select(i) {
  selected = i; const [x, z] = pitCenters[i]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true;
  board.glow.position.set(x, BT + 0.08, z); board.glow.visible = true; click(1.4, 0.05); showTurn();
}
function deselect() { selected = null; board.ring.visible = false; board.glow.visible = false; showTurn(); }

// Play a move's events on the board, one seed at a time.
async function animate(events, mover) {
  for (const e of events) {
    if (e.type === 'pickup') {
      const picked = homes[e.pit].splice(0); const [cx, cz] = pitCenters[e.pit];
      await Promise.all(picked.map((m, k) => tween(240, (t) => { m.position.y = surfaceY(m.position.x, m.position.z) + 0.02 + t * 0.14; m.position.x = THREE.MathUtils.lerp(m.position.x, cx + (k % 3 - 1) * 0.018, t * 0.8); m.position.z = THREE.MathUtils.lerp(m.position.z, cz + (Math.floor(k / 3) - 1) * 0.016, t * 0.8); }, easeOut)));
      click(0.8, 0.08); setBadge(e.pit, 0); animate.cluster = picked;
    } else if (e.type === 'drop') {
      const m = animate.cluster.shift(); const count = homes[e.pit].length + 1;
      // the cluster drifts along with the sowing hand
      const [cx, cz] = pitCenters[e.pit];
      animate.cluster.forEach((s, k) => tween(140, (t) => { s.position.x = THREE.MathUtils.lerp(s.position.x, cx + (k % 3 - 1) * 0.018, t); s.position.z = THREE.MathUtils.lerp(s.position.z, cz + (Math.floor(k / 3) - 1) * 0.016 - 0.03, t); }));
      await fly(m, e.pit, 150, 0.04); click(1 + Math.min(count, 8) * 0.04); buzz(8); setBadge(e.pit, count);
    } else if (e.type === 'capture') {
      await wait(160);
      const store = e.by === you ? 'S0' : 'S1'; const scoreEl = e.by === you ? $('#myScore') : $('#oppScore');
      let running = state.stores[e.by] - e.n; // the state we hold is already after the move; count up from before
      for (const pit of e.pits) {
        const taken = homes[pit].splice(0); setBadge(pit, 0);
        for (const m of taken) { fly(m, store, 260, 0.12).then(() => { running++; tickScore(scoreEl, running); click(0.6, 0.1); buzz(12); }); await wait(60); }
        await wait(120);
      }
      await wait(300);
    }
  }
}

async function play(pit) {
  const { state: next, events } = applyMove(state, pit);
  state = next; busy = true; deselect(); $('#undo').disabled = true;
  await animate(events, state.turn === you ? ai : you); // state.turn already flipped
  busy = false; refreshStatic(); save();
  if (state.over) return gameOver();
  if (state.turn === ai) {
    showTurn(); await wait(350);
    const m = await aiMove(state);
    if (m === null) return;
    select(m); await wait(550); // show which pit the opponent chose
    await play(m);
  }
}

function gameOver() {
  const [a, b] = state.stores; const win = state.winner === you; const draw = state.winner === 'draw';
  $('#goTitle').textContent = draw ? 'A draw' : win ? 'You win' : 'Nnamdi wins';
  $('#goSub').textContent = draw ? `${a} seeds each` : `${Math.max(a, b)} to ${Math.min(a, b)}`;
  $('#gameover').hidden = false; if (win) { click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); }
}

function save() { prefs.set('game', JSON.stringify({ moves: state.moves, variant })); }
function resume() {
  try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.variant === variant && g.moves.length && !params.get('still')) { state = replay(g.moves, variant); return state.over ? (state = newGame(variant), false) : true; } } catch {}
  return false;
}
function newRound() { state = newGame(variant); layoutFromState(state); refreshStatic(); $('#gameover').hidden = true; deselect(); save(); }
function undo() {
  if (busy || state.moves.length < 2) return;
  const moves = state.moves.slice(0, state.turn === you ? -2 : -1);
  state = replay(moves, variant); layoutFromState(state); refreshStatic(); deselect(); save(); click(0.7, 0.06);
}

// ---------- input ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null, dragged = false;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: theta, p: phi }; dragged = false; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 8) dragged = true;
  if (dragged) { theta = down.t - dx * 0.006; phi = Math.min(1.3, Math.max(0.35, down.p - dy * 0.006)); }
});
canvas.addEventListener('pointerup', (e) => {
  const wasDrag = dragged; down = null; if (wasDrag || busy || state.over || state.turn !== you) return;
  ptr.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(board.targets)[0]; if (!hit) return deselect();
  const pit = hit.object.userData.pit; const legal = legalMoves(state);
  if (!legal.includes(pit)) { if (pit < 6 && state.pits[pit] > 0) $('#hint').textContent = 'you must give the other side seeds'; else shake(pit); return; }
  if (selected === pit) play(pit); else select(pit);
});
canvas.addEventListener('wheel', (e) => { dist = Math.min(2.4, Math.max(0.8, dist + e.deltaY * 0.001)); }, { passive: true });
function shake(pit) { const [x, z] = pitCenters[pit]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true; tween(260, (t) => { board.ring.position.x = x + Math.sin(t * Math.PI * 4) * 0.006 * (1 - t); }).then(() => { if (selected === null) board.ring.visible = false; else { board.ring.position.x = pitCenters[selected][0]; board.ring.position.z = pitCenters[selected][1]; } }); click(0.5, 0.05); }

$('#undo').addEventListener('click', undo);
$('#newGame').addEventListener('click', newRound);
$('#rematch').addEventListener('click', newRound);
$('#rulesBtn').addEventListener('click', () => { $('#rules').hidden = !$('#rules').hidden; });
$('#rulesClose').addEventListener('click', () => { $('#rules').hidden = true; });
const soundBtn = $('#soundBtn'); const paintSound = () => soundBtn.setAttribute('aria-pressed', soundOn());
soundBtn.addEventListener('click', () => { prefs.set('sound', soundOn() ? '0' : '1'); paintSound(); click(1, 0.08); }); paintSound();

// ---------- start ----------
const resumed = resume(); layoutFromState(state); refreshStatic();
if (params.get('still')) { // a render for Meka: a mid-game position with pit 4 selected
  state.pits = [4, 3, 2, 6, 1, 5, 4, 2, 7, 0, 3, 0]; state.stores = [8, 5]; layoutFromState(state); refreshStatic(); select(3);
}
if (resumed && state.turn === ai) { (async () => { busy = true; await wait(400); busy = false; const m = await aiMove(state); if (m !== null) { select(m); await wait(500); await play(m); } })(); }

window.__ayo = { get state() { return state; }, get selected() { return selected; }, hitTest: (x, y) => { ptr.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera); return ray.intersectObjects(board.targets).map((h) => h.object.userData.pit); } };

let frames = 0;
function loop(now) {
  runTweens(now); placeCam(); placeBadges(); renderer.render(scene, camera); frames++;
  if (frames === 3) { window.__done = true; if (params.get('still')) return; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
