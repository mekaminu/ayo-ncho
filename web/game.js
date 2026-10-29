// The game: engine state → 3D seeds, animated move by move. Every move the picture shows comes from engine events.
import * as THREE from 'three';
import { newGame, applyMove, legalMoves, replay, RULES } from '/engine/ayo.js';
import { SeedSim } from './physics.js';
import { CHARACTERS, line, faceFor, MOOD_FOR } from './characters.js';
import { decideQuality, browserEnv, tier } from './quality.js';
import { parse as parseStreak, recordDay, unlocked, homeLine, MILESTONES } from './streak.js';
import { bestTurn, clipPace, clipCaption } from './clip.js';
import { buildBoard, buildTable, buildLights, seedMaterialFor, seedGeometryFor, SEED_SETS, pitCenters, storeCenters, surfaceY, bowl, PIT_R, PIT_D, STORE_RX, STORE_RZ, STORE_D, BT } from './board.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const prefs = { get: (k, d) => { try { return localStorage.getItem('ayo.' + k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('ayo.' + k, v); } catch {} } };

// ---------- renderer / scene ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!(params.get('still') || params.get('capture')) });
const phone = Math.min(innerWidth, innerHeight) < 500;
// picture quality: the full board, or a lighter one on slow phones and slow connections (Settings → Feel → Lighter board)
const quality = decideQuality(browserEnv(prefs.get('quality', 'auto'), params.get('lite')));
const Q = tier(quality.lite);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.lite ? Q.maxPixelRatio : phone ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d0906);
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 20);
const finish = params.get('finish') || prefs.get('finish', 'mahogany');
const board = buildBoard(scene, finish, Q); buildTable(scene, Q); buildLights(scene, Q.lite ? Q.shadow : phone || (window.devicePixelRatio || 1) > 2 ? 1024 : 2048);
const seedGeometry = seedGeometryFor(Q);
// seed set: Job's tears, or river stones once the calm streak has unlocked them
let streak = parseStreak(prefs.get('streak', null));
const seedSetId = () => { const v = prefs.get('seeds', 'jobs'); return v === 'stones' && unlocked(streak, 'stones') ? 'stones' : 'jobs'; };
let SET = SEED_SETS[seedSetId()]; let seedMat = seedMaterialFor(seedSetId(), Q); const seedMats = { [seedSetId()]: seedMat };
function applySeedSet() { // swap every seed's look and shape in place (no new game needed)
  const id = seedSetId(); SET = SEED_SETS[id]; seedMat = seedMats[id] = seedMats[id] || seedMaterialFor(id, Q);
  for (const m of seeds) { m.material = seedMat; const j = m.userData.jit; m.scale.set(SET.r[0] * j[0], SET.r[1] * j[1], SET.r[2] * j[2]); }
  for (const k in homes) homes[k].forEach((m, i) => { if (!sim.live.some((e) => e.mesh === m)) m.position.copy(slotPos(k === 'S0' || k === 'S1' ? k : +k, i)); });
}
const sim = new SeedSim();

// camera: the board upright in your hands, you at the near end
let theta = 0, phi = 0.72, dist = 1.55; const target = new THREE.Vector3(0, 0.02, 0.02);
function placeCam() { camera.position.set(target.x + dist * Math.sin(phi) * Math.sin(theta), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.cos(theta)); camera.lookAt(target); }
let wide = false;
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const nowWide = w > h * 1.1; if (nowWide !== wide) { wide = nowWide; dist = wide ? 1.8 : 1.55; phi = wide ? 0.5 : 0.72; theta = 0; }
  document.documentElement.classList.toggle('wide', wide);
}
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
  const y = BT - bowl(x - cx, z - cz, isStore ? STORE_RX : PIT_R, isStore ? STORE_RZ : PIT_R, depth) + SET.r[1] * 0.92 + layer * 0.022;
  return new THREE.Vector3(x, y, z);
}
function makeSeed() {
  const m = new THREE.Mesh(seedGeometry, seedMat);
  m.userData.jit = [0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2]; // each seed its own size, kept across seed sets
  m.scale.set(SET.r[0] * m.userData.jit[0], SET.r[1] * m.userData.jit[1], SET.r[2] * m.userData.jit[2]);
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

// drop a seed into a bowl with real-ish physics: it falls, bounces, rolls and is nudged by the seeds already there
function drop(m, home, flight = 0.22) {
  homes[home].push(m); m.userData.home = home; const target = slotPos(home, homes[home].length - 1);
  const others = homes[home].filter((o) => o !== m);
  const p = sim.toss(m, target, others, m.scale.y * 0.95, reduceMotion ? 0.05 : flight);
  const entry = sim.live[sim.live.length - 1]; if (entry) entry.onBounce = (k) => { if (k > 0.25) tick(0.9 + k * 0.4, 0.05 * k); };
  return p;
}

// ---------- sound (synthesised on the device; no audio files) ----------
let actx = null; const soundOn = () => prefs.get('sound', '1') === '1';
let noiseBuf = null;
function ctx() { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.1, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return actx; }
// a seed landing on wood: a short knock (tone) plus a tiny burst of noise
function click(pitch = 1, gain = 0.12) {
  if (!soundOn()) return; try {
    const a = ctx(); const t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1500 * pitch, t); o.frequency.exponentialRampToValueAtTime(420 * pitch, t + 0.045);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.08);
    const n = a.createBufferSource(); n.buffer = noiseBuf; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600 * pitch; f.Q.value = 1.2;
    const ng = a.createGain(); ng.gain.setValueAtTime(gain * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03); n.connect(f).connect(ng).connect(a.destination); n.start(t); n.stop(t + 0.04);
  } catch {}
}
const tick = (pitch, gain) => click(pitch, gain);
// a handful of seeds picked up: a quick rattle
function rattle(n) { for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => click(0.7 + Math.random() * 0.5, 0.04), i * 28 + Math.random() * 20); }
// captured seeds scooped away: a short descending sweep
function scoop() {
  if (!soundOn()) return; try {
    const a = ctx(); const t = a.currentTime; const n = a.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.28);
    const g = a.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); n.connect(f).connect(g).connect(a.destination); n.start(t); n.stop(t + 0.32);
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
// Settings live in prefs; a game carries the rules it started with so changing settings never corrupts a game in progress.
const settings = {
  get game() { return prefs.get('game.variant', 'ncho'); },
  rules() { // explicit switches override the game's bundle
    const base = RULES[this.game] || RULES.ncho;
    const cap = prefs.get('rules.capture', ''); const relay = prefs.get('rules.relay', ''); const last8 = prefs.get('rules.last8', '');
    return { capture: cap ? +cap : base.capture, relay: relay ? relay === '1' : base.relay, last8: last8 ? last8 === '1' : base.last8 };
  },
  get level() { return prefs.get('level', 'medium'); },
  get speed() { return prefs.get('speed', 'normal'); },
};
const PACES = { slow: 230, normal: 150, fast: 90 };
let PACE = PACES[settings.speed] || 150;
const you = 0, ai = 1;
const names = { easy: 'Adaeze', medium: 'Nnamdi', hard: 'Mama Ngozi' };
const levelLabel = (l) => `${names[l]} · ${l[0].toUpperCase() + l.slice(1)}`;
let state = newGame(settings.game, settings.rules()); let busy = false; let selected = null; let level = settings.level;
let stats = { biggest: 0, captures: 0, started: Date.now() };

const worker = new Worker('./ai-worker.js', { type: 'module' });
function aiMove(s, lvl = level) { return new Promise((res) => { worker.onmessage = (e) => res(e.data); worker.postMessage({ state: s, level: lvl }); }); }
let hintedAt = -1;
async function hint() {
  if (busy || state.over || state.turn !== you || hintedAt === state.moves.length) return;
  hintedAt = state.moves.length; $('#hintBtn').disabled = true;
  const m = await aiMove(state, 'hard'); if (m === null || state.turn !== you) return;
  const [x, z] = pitCenters[m]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true; board.glow.position.set(x, BT + 0.08, z); board.glow.visible = true; click(1.6, 0.05);
  $('#hint').textContent = `${CHARACTERS.hard.name} would play that one`;
  await wait(1500); if (selected === null) { board.ring.visible = false; board.glow.visible = false; } showTurn();
}

function paintFaces() {
  $('#oppFace').innerHTML = faceFor(level, mood);
  document.querySelectorAll('.pill[data-level]').forEach((b) => { b.querySelector('.face').innerHTML = CHARACTERS[b.dataset.level].face; });
  document.querySelectorAll('[data-face]').forEach((f) => { f.innerHTML = CHARACTERS[f.dataset.face].face; });
}
function refreshStatic() {
  paintFaces();
  state.pits.forEach((n, i) => setBadge(i, n));
  $('#myScore').textContent = state.stores[0]; $('#oppScore').textContent = state.stores[1];
  $('#oppName').textContent = levelLabel(level);
  showTurn();
}
function showTurn() {
  const mine = state.turn === you && !state.over;
  $('#turn').textContent = state.over ? 'game over' : mine ? 'your move' : '…';
  $('#oppSub').textContent = state.over ? '' : mine ? 'waiting' : 'thinking…';
  $('#hint').textContent = state.over ? '' : mine ? (selected === null ? 'tap a pit on your side to sow' : 'tap again to sow, or pick another') : '';
  $('#undo').disabled = busy || state.moves.length < 2;
  $('#hintBtn').disabled = !mine || busy || hintedAt === state.moves.length;
}
function select(i) {
  selected = i; const [x, z] = pitCenters[i]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true;
  board.glow.position.set(x, BT + 0.08, z); board.glow.visible = true; click(1.4, 0.05); showTurn();
}
function deselect() { selected = null; board.ring.visible = false; board.glow.visible = false; showTurn(); }

// Play a move's events on the board, one seed at a time.
async function animate(events, prevStores, pace = PACE) {
  const shown = prevStores.slice(); const pending = [];
  for (const e of events) {
    if (e.type === 'pickup') {
      await Promise.all(pending); pending.length = 0;
      if (e.relay) await wait(pace);
      const picked = homes[e.pit].splice(0); const [cx, cz] = pitCenters[e.pit];
      await Promise.all(picked.map((m, k) => tween(240, (t) => { m.position.y = surfaceY(m.position.x, m.position.z) + 0.02 + t * 0.14; m.position.x = THREE.MathUtils.lerp(m.position.x, cx + (k % 3 - 1) * 0.018, t * 0.8); m.position.z = THREE.MathUtils.lerp(m.position.z, cz + (Math.floor(k / 3) - 1) * 0.016, t * 0.8); }, easeOut)));
      rattle(picked.length); setBadge(e.pit, 0); animate.cluster = picked;
    } else if (e.type === 'drop') {
      const m = animate.cluster.shift(); const count = homes[e.pit].length + 1;
      const [cx, cz] = pitCenters[e.pit];
      animate.cluster.forEach((s, k) => tween(140, (t) => { s.position.x = THREE.MathUtils.lerp(s.position.x, cx + (k % 3 - 1) * 0.018, t); s.position.z = THREE.MathUtils.lerp(s.position.z, cz + (Math.floor(k / 3) - 1) * 0.016 - 0.03, t); }));
      // a hand sows at a steady pace: the next seed leaves while the last one is still settling
      pending.push(drop(m, e.pit).then(() => { click(1 + Math.min(count, 8) * 0.04); buzz(8); setBadge(e.pit, count); }));
      await wait(pace);
    } else if (e.type === 'capture') {
      await Promise.all(pending); pending.length = 0;
      await wait(120); scoop();
      const store = e.by === you ? 'S0' : 'S1'; const scoreEl = e.by === you ? $('#myScore') : $('#oppScore');
      for (const pit of e.pits) {
        const taken = homes[pit].splice(0); setBadge(pit, 0);
        for (const m of taken) { drop(m, store, 0.3).then(() => { shown[e.by]++; tickScore(scoreEl, shown[e.by]); click(0.6, 0.1); buzz(12); }); await wait(70); }
        await wait(120);
      }
      await wait(e.pits.length > 1 ? 300 : 160);
    }
  }
  await Promise.all(pending);
}

async function play(pit) {
  const { state: next, events } = applyMove(state, pit);
  const prevStores = state.stores; const mover = state.turn; state = next; busy = true; deselect(); $('#undo').disabled = true;
  if (mover === you) {
    const got = state.stores[0] - prevStores[0]; stats.biggest = Math.max(stats.biggest, got); stats.captures += events.filter((e) => e.type === 'capture' && e.by === you).length;
    const r = recordDay(streak); streak = r.data; if (r.newDay) prefs.set('streak', JSON.stringify(streak));
    if (r.unlocked) setTimeout(() => { toast(`${r.unlocked.name} unlocked — pick them in Settings`); buzz([20, 40, 20]); click(1.8, 0.1); setTimeout(() => click(2.4, 0.1), 140); }, 1200);
  }
  tipFor(events);
  const aiGot = state.stores[1] - prevStores[1], meGot = state.stores[0] - prevStores[0];
  if (mover === ai && aiGot > 0) setTimeout(() => say('capture'), 400); else if (mover === you && meGot >= 4) setTimeout(() => say('lost'), 400);
  await animate(events, prevStores);
  busy = false; refreshStatic(); save();
  if (state.over) return gameOver();
  if (state.turn === ai) {
    showTurn(); await wait(350); if (mood === 'calm') react('think');
    const m = await aiMove(state);
    if (m === null || state.turn !== ai) return;
    if (mood === 'think') react('calm'); select(m); await wait(550); // show which pit the opponent chose
    await play(m);
  }
}

// ---------- screens ----------
const body = document.body;
function showScreen(which) { // 'home' | 'settings' | 'play'
  $('#home').hidden = which !== 'home'; $('#settings').hidden = which !== 'settings';
  body.classList.toggle('screen', which !== 'play'); body.classList.toggle('playing', which === 'play');
  if (which === 'home') { paintHome(); idle = true; } else idle = false;
  if (which === 'play') blinkLoop(); else { clearTimeout(blinkTimer); if (mood !== 'calm' && mood !== 'think') react('calm'); }
}
let idle = true; // the home screen slowly turns the board
function paintHome() {
  const g = settings.game;
  document.querySelectorAll('[data-game]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.game === g));
  document.querySelectorAll('.pill[data-level]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.level === level));
  $('#playSub').textContent = 'vs ' + levelLabel(level); $('#streakLine').textContent = homeLine(streak);
  const saved = savedGame();
  $('#continueBtn').disabled = !saved; $('#continueSub').textContent = saved ? `${saved.stores[0] > saved.stores[1] ? 'you lead' : saved.stores[0] < saved.stores[1] ? 'you trail' : 'level'} ${saved.stores[0]} – ${saved.stores[1]} · ${saved.moves.length} moves in` : 'no game in progress';
}
function paintSettings() {
  const r = settings.rules();
  const set = (name, v) => document.querySelectorAll(`[data-set="${name}"] .segbtn, [data-set="${name}"] .swatch`).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === String(v)));
  set('game', settings.game); set('capture', r.capture); set('relay', r.relay ? 1 : 0); set('finish', prefs.get('finish', 'mahogany')); set('seeds', seedSetId()); set('speed', settings.speed);
  const stones = unlocked(streak, 'stones'); $('[data-set="seeds"] [data-v="stones"]').disabled = !stones;
  $('#seedsSub').textContent = stones ? "Job's tears · river stones (yours: 7 days played)" : `Job's tears · river stones unlock at ${MILESTONES[0].days} days played (${streak.days.length} so far)`;
  const sw = (name, on) => $(`[data-set="${name}"].sw`).setAttribute('aria-checked', String(on));
  sw('last8', r.last8); sw('badges', prefs.get('badges', '1') === '1'); sw('sound', soundOn()); sw('haptics', prefs.get('haptics', '1') === '1');
  set('quality', prefs.get('quality', 'auto')); $('#qualityNow').textContent = `now ${Q.lite ? 'lighter' : 'full'} (${quality.reason})`;
  document.querySelectorAll('.choose[data-level]').forEach((b) => { const on = b.dataset.level === level; b.setAttribute('aria-pressed', on); b.textContent = on ? 'Chosen' : 'Choose'; });
}
// ---------- the opponent's face reacts: a mood for a moment, then back to calm; blinks now and then while waiting ----------
let mood = 'calm', moodTimer = null, blinkTimer = null;
function react(next, ms = 2600) {
  if (params.get('still')) return; clearTimeout(moodTimer); mood = next; const f = $('#oppFace'); f.innerHTML = faceFor(level, mood);
  if (next !== 'calm' && next !== 'blink' && next !== 'think') { f.classList.remove('react'); void f.offsetWidth; f.classList.add('react'); }
  if (next !== 'calm' && next !== 'think') moodTimer = setTimeout(() => react('calm'), ms);
}
function blinkLoop() { // a blink every few seconds, only on a calm face, never under reduced motion
  clearTimeout(blinkTimer); if (reduceMotion || params.get('still')) return;
  blinkTimer = setTimeout(() => { if (mood === 'calm' && body.classList.contains('playing')) { $('#oppFace').innerHTML = faceFor(level, 'blink'); setTimeout(() => { if (mood === 'calm') $('#oppFace').innerHTML = faceFor(level, 'calm'); }, 130); } blinkLoop(); }, 2800 + Math.random() * 4200);
}
let bubbleTimer = null;
function say(moment) {
  react(MOOD_FOR[moment] || 'calm');
  const text = line(level, moment); if (!text || params.get('still')) return;
  const b = $('#bubble'); b.textContent = text; b.hidden = false; clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { b.hidden = true; }, 2600);
}
function toast(text) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; body.appendChild(t); setTimeout(() => t.remove(), 1800); }

// settings wiring: rules changes start a new game; everything else applies at once
document.querySelectorAll('#settings [data-set]').forEach((el) => {
  const name = el.dataset.set;
  if (el.classList.contains('sw')) {
    el.addEventListener('click', () => {
      const on = el.getAttribute('aria-checked') !== 'true'; el.setAttribute('aria-checked', String(on));
      if (name === 'last8') { prefs.set('rules.last8', on ? '1' : '0'); rulesChanged(); }
      else prefs.set(name, on ? '1' : '0');
      if (name === 'sound') { paintSound(); click(1, 0.08); }
    });
  } else {
    el.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.v;
      if (name === 'game') { prefs.set('game.variant', v); prefs.set('rules.capture', ''); prefs.set('rules.relay', ''); prefs.set('rules.last8', ''); rulesChanged(); }
      else if (name === 'capture') { prefs.set('rules.capture', v); rulesChanged(); }
      else if (name === 'relay') { prefs.set('rules.relay', v); rulesChanged(); }
      else if (name === 'finish') { prefs.set('finish', v); toast('New wood on the next game'); }
      else if (name === 'seeds') { if (v === 'stones' && !unlocked(streak, 'stones')) return; prefs.set('seeds', v); applySeedSet(); }
      else if (name === 'speed') { prefs.set('speed', v); PACE = PACES[v]; }
      else if (name === 'quality') { if (v !== prefs.get('quality', 'auto')) { prefs.set('quality', v); save(); toast('Redrawing the board…'); setTimeout(() => location.reload(), 500); } }
      paintSettings(); click(1.2, 0.05);
    }));
  }
});
document.querySelectorAll('.choose[data-level]').forEach((b) => b.addEventListener('click', () => { level = b.dataset.level; prefs.set('level', level); mood = 'calm'; paintSettings(); refreshStatic(); click(1.2, 0.05); }));
document.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', () => { prefs.set('game.variant', b.dataset.game); prefs.set('rules.capture', ''); prefs.set('rules.relay', ''); prefs.set('rules.last8', ''); paintHome(); click(1.2, 0.05); }));
document.querySelectorAll('.pill[data-level]').forEach((b) => b.addEventListener('click', () => { level = b.dataset.level; prefs.set('level', level); paintHome(); click(1.2, 0.05); }));
function rulesChanged() { prefs.set('game', 'null'); if (!$('#settings').hidden) toast('Rules changed: next game uses them'); }
$('#playBtn').addEventListener('click', () => { newRound(); showScreen('play'); click(1.3, 0.08); });
$('#continueBtn').addEventListener('click', () => { if (resume()) { layoutFromState(state); refreshStatic(); showScreen('play'); kickAi(); } });
$('#homeBtn').addEventListener('click', () => { if (!busy) { save(); showScreen('home'); } });
$('#goHome').addEventListener('click', () => { $('#gameover').hidden = true; showScreen('home'); });
$('#homeSettings').addEventListener('click', () => { paintSettings(); showScreen('settings'); });
$('#settingsBtn').addEventListener('click', () => { if (!busy) { paintSettings(); showScreen('settings'); } });
$('#settingsBack').addEventListener('click', () => { const r = settings.rules(); const same = state.variant === settings.game && JSON.stringify(state.rules) === JSON.stringify(r) && state.moves.length; showScreen(same ? 'play' : 'home'); });
$('#settingsRules').addEventListener('click', () => { $('#rules').hidden = false; });

// game over card, as approved
function gameOver() {
  const [a, b] = state.stores; const win = state.winner === you; const draw = state.winner === 'draw';
  $('#goEyebrow').textContent = `${state.variant === 'ncho' ? 'Nchò' : 'Ayo'} · ${state.moves.length} moves`;
  $('#goTitle').textContent = draw ? 'A draw' : win ? 'You win' : `${names[level]} wins`;
  $('#goMyScore').textContent = a; $('#goOppScore').textContent = b; $('#goOppName').textContent = levelLabel(level);
  $('#goMe').classList.toggle('win', a >= b); $('#goOpp').classList.toggle('win', b > a);
  $('#goBig').textContent = `${stats.biggest} seeds`; $('#goCaps').textContent = stats.captures;
  const secs = Math.round((Date.now() - stats.started) / 1000); $('#goTime').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  $('#gameover').hidden = false; prefs.set('game', 'null'); say(win ? 'lose' : 'win');
  if (win) { click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); }
}
$('#replayBtn').addEventListener('click', async () => {
  if (busy) return; const moves = state.moves.slice(); const variant = state.variant, rules = state.rules;
  $('#gameover').hidden = true; busy = true;
  let s = newGame(variant, rules); layoutFromState(s); refreshStaticFrom(s);
  for (const m of moves) { const r = applyMove(s, m); if (r.state.turn === ai) { select(m); await wait(250); } deselect(); await animate(r.events, s.stores, 70); s = r.state; refreshStaticFrom(s); }
  busy = false; $('#gameover').hidden = false;
});
function refreshStaticFrom(s) { s.pits.forEach((n, i) => setBadge(i, n)); $('#myScore').textContent = s.stores[0]; $('#oppScore').textContent = s.stores[1]; }
$('#shareBtn').addEventListener('click', async () => {
  const [a, b] = state.stores; const text = `Ayo & Nchò — ${state.winner === you ? 'I beat' : 'I lost to'} ${names[level]} ${a}–${b} in ${state.moves.length} moves.`;
  try {
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png')); const file = blob && new File([blob], 'ayo-ncho.png', { type: 'image/png' });
    if (navigator.share && file && navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ text, files: [file] });
    if (navigator.share) return await navigator.share({ text });
    await navigator.clipboard.writeText(text); toast('Result copied');
  } catch {}
});

// ---------- the replay clip: your best turn of the game, recorded from the board as a ~10-second video to share ----------
let clipping = false, cinematic = false;
const CLIP_TYPES = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
async function recordClip(deliver = true) {
  if (busy || clipping || !state.moves.length) return null;
  const turn = bestTurn(state.moves, state.variant, state.rules, you); if (!turn) return null;
  clipping = true; busy = true; const wasOver = !$('#gameover').hidden; $('#gameover').hidden = true; deselect();
  // record the board itself (not the overlay) wherever the browser can; elsewhere the turn still plays and the words are shared
  const type = window.MediaRecorder && canvas.captureStream ? CLIP_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) : null;
  let rec = null; const chunks = [];
  if (type) { try { rec = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 2500000 }); rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); }; } catch { rec = null; } }
  $('#rec').hidden = !rec; const t0 = performance.now();
  // the board as it stood before the turn, the chosen pit lit, then the turn at a pace that fits the clip
  layoutFromState(turn.before); refreshStaticFrom(turn.before); cinematic = true;
  if (rec) rec.start(250);
  await wait(300); select(turn.pit); await wait(600); board.ring.visible = false; board.glow.visible = false;
  await animate(turn.events, turn.before.stores, clipPace(turn, PACE));
  await wait(900); cinematic = false;
  const blob = rec ? await new Promise((res) => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || type })); rec.stop(); }) : null;
  const ms = Math.round(performance.now() - t0); $('#rec').hidden = true;
  layoutFromState(state); refreshStatic(); busy = false; clipping = false; selected = null; if (wasOver) $('#gameover').hidden = false;
  const caption = clipCaption(turn, names[level], state.variant);
  if (deliver) await deliverClip(blob, caption);
  return { size: blob ? blob.size : 0, type: blob ? blob.type : null, ms, turn: { index: turn.index, seeds: turn.seeds, relays: turn.relays, drops: turn.drops } };
}
async function deliverClip(blob, caption) {
  try {
    if (blob && blob.size) {
      const file = new File([blob], `ayo-ncho-best-turn.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`, { type: blob.type });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ text: caption, files: [file] });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = file.name; body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      return toast('Clip saved to your downloads');
    }
    if (navigator.share) return await navigator.share({ text: caption });
    await navigator.clipboard.writeText(caption); toast('This browser cannot record video — the words are copied');
  } catch {}
}
$('#clipBtn').addEventListener('click', () => { recordClip(); click(1.3, 0.08); });

function save() { prefs.set('game', JSON.stringify({ moves: state.moves, variant: state.variant, rules: state.rules, level, stats })); }
function savedGame() { try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.moves && g.moves.length) { const s = replay(g.moves, g.variant, g.rules); return s.over ? null : s; } } catch {} return null; }
function resume() {
  try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.moves && g.moves.length && !params.get('still')) { state = replay(g.moves, g.variant, g.rules); level = g.level || level; stats = g.stats || stats; return !state.over; } } catch {}
  return false;
}
function newRound() { state = newGame(settings.game, settings.rules()); stats = { biggest: 0, captures: 0, started: Date.now() }; layoutFromState(state); refreshStatic(); $('#gameover').hidden = true; deselect(); save(); paintRules(); setTimeout(() => say('start'), 600); }
function kickAi() { if (state.turn === ai && !state.over) (async () => { busy = true; await wait(400); busy = false; react('think'); const m = await aiMove(state); if (mood === 'think') react('calm'); if (m !== null) { select(m); await wait(500); await play(m); } })(); }
function undo() {
  if (busy || state.moves.length < 2) return;
  const moves = state.moves.slice(0, state.turn === you ? -2 : -1);
  state = replay(moves, state.variant, state.rules); layoutFromState(state); refreshStatic(); deselect(); save(); click(0.7, 0.06); say('undo');
}
function paintRules() { $('#rulesNcho').hidden = state.variant !== 'ncho'; $('#rulesAyo').hidden = state.variant !== 'ayo'; $('#gameName').textContent = state.variant === 'ncho' ? 'Nchò' : 'Ayo'; }

// ---------- first-game tutorial: three tips, then never again ----------
const TIPS = [
  'Your six pits are the column nearest you, on the right. Tap one with seeds, then tap again to sow.',
  'The seeds go one per pit anticlockwise: up your side, then down theirs. The count beside each pit keeps score for you.',
  null, // filled in per rules below
];
let tipStep = +prefs.get('tutorial', '0');
function showTip(text) {
  if (!text || params.get('still') || params.get('capture')) return;
  let t = $('#tip'); if (!t) { t = document.createElement('div'); t.id = 'tip'; t.innerHTML = '<p></p><button class="btn ghost" style="padding:8px 12px;font-size:13px">Got it</button>'; body.appendChild(t); t.querySelector('button').addEventListener('click', () => { t.remove(); }); }
  t.querySelector('p').textContent = text;
}
function tipFor(events) {
  if (tipStep >= 3) return;
  if (tipStep === 0) { showTip(TIPS[1]); tipStep = 1; }
  else if (tipStep === 1 && events.some((e) => e.type === 'capture' || e.relay)) {
    const r = state.rules; showTip(r.capture === 4 ? 'A pit that reaches 4 is captured by whoever owns that side — and your last seed landing in a pit with seeds picks it up and keeps going.' : 'Your last seed made a pit 2 or 3 on their side, so you captured it, plus any 2s and 3s right behind it.'); tipStep = 2;
  }
  else if (tipStep === 2) { tipStep = 3; const t = $('#tip'); if (t) t.remove(); }
  prefs.set('tutorial', String(tipStep));
}

// ---------- input ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null, dragged = false;
const fingers = new Map(); let pinch = null; // two-finger zoom on the phone
const clampDist = () => { dist = Math.min(2.4, Math.max(0.8, dist)); };
canvas.addEventListener('pointerdown', (e) => {
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId);
  if (fingers.size === 2) { const [a, b] = [...fingers.values()]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), dist0: dist }; down = null; dragged = true; return; }
  down = { x: e.clientX, y: e.clientY, t: theta, p: phi }; dragged = false;
});
canvas.addEventListener('pointermove', (e) => {
  if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && fingers.size === 2) { const [a, b] = [...fingers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); dist = pinch.dist0 * (pinch.d0 / Math.max(d, 1)); clampDist(); return; }
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 8) dragged = true;
  if (dragged) { theta = down.t - dx * 0.006; phi = Math.min(1.3, Math.max(0.35, down.p - dy * 0.006)); }
});
const lift = (e) => { fingers.delete(e.pointerId); if (fingers.size < 2) pinch = null; };
canvas.addEventListener('pointercancel', (e) => { lift(e); down = null; });
canvas.addEventListener('pointerup', (e) => {
  const wasPinch = !!pinch || fingers.size > 1; lift(e);
  const wasDrag = dragged; down = null; if (wasPinch || wasDrag || busy || state.over || state.turn !== you || body.classList.contains('screen')) return;
  ptr.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(board.targets)[0]; if (!hit) return deselect();
  const pit = hit.object.userData.pit; const legal = legalMoves(state);
  if (!legal.includes(pit)) { if (pit < 6 && state.pits[pit] > 0) $('#hint').textContent = 'you must give the other side seeds'; else shake(pit); return; }
  if (selected === pit) play(pit); else select(pit);
});
canvas.addEventListener('wheel', (e) => { dist += e.deltaY * 0.001; clampDist(); }, { passive: true });
function shake(pit) { const [x, z] = pitCenters[pit]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true; tween(260, (t) => { board.ring.position.x = x + Math.sin(t * Math.PI * 4) * 0.006 * (1 - t); }).then(() => { if (selected === null) board.ring.visible = false; else { board.ring.position.x = pitCenters[selected][0]; board.ring.position.z = pitCenters[selected][1]; } }); click(0.5, 0.05); }

$('#undo').addEventListener('click', undo);
$('#hintBtn').addEventListener('click', hint);
$('#rematch').addEventListener('click', () => { newRound(); showScreen('play'); });
$('#rulesBtn').addEventListener('click', () => { $('#rules').hidden = !$('#rules').hidden; });
$('#rulesClose').addEventListener('click', () => { $('#rules').hidden = true; });
const soundBtn = $('#soundBtn'); const paintSound = () => soundBtn.setAttribute('aria-pressed', soundOn());
soundBtn.addEventListener('click', () => { prefs.set('sound', soundOn() ? '0' : '1'); paintSound(); click(1, 0.08); }); paintSound();

// ---------- start ----------
paintRules(); layoutFromState(state); refreshStatic();
if (params.get('still')) { // a render for Meka: a mid-game position with pit 4 selected
  state.pits = [4, 3, 2, 6, 1, 5, 4, 2, 7, 0, 3, 0]; state.stores = [8, 5]; layoutFromState(state); refreshStatic(); select(3); showScreen('play');
} else if (params.get('capture') && !params.get('stay')) { // the smoke test starts straight into a game
  newRound(); showScreen('play'); if (tipStep === 0) { showTip(TIPS[0]); }
} else {
  showScreen('home'); if (tipStep === 0) $('#playBtn').addEventListener('click', () => showTip(TIPS[0]), { once: true });
}

window.__ayo = { react, get mood() { return mood; }, quality: { ...quality, tier: Q }, get streak() { return streak; }, get seedSet() { return seedSetId(); }, get state() { return state; }, get selected() { return selected; }, clip: () => recordClip(false), hitTest: (x, y) => { ptr.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera); return ray.intersectObjects(board.targets).map((h) => h.object.userData.pit); } };

// the render loop stops while the tab is hidden and restarts when it comes back; only ever one loop at a time
let frames = 0, last = performance.now(), running = false;
function loop(now) {
  runTweens(now); sim.step((now - last) / 1000, now); if (idle && !reduceMotion) theta += (now - last) * 0.00004; else if (cinematic && !reduceMotion) theta += (now - last) * 0.000025; /* the clip drifts slowly round the board */ last = now; placeCam(); placeBadges(); renderer.render(scene, camera); frames++;
  if (frames === 3) { window.__done = true; if (params.get('still')) { running = false; return; } }
  if (window.__freeze || document.hidden) { running = false; return; }
  requestAnimationFrame(loop);
}
function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
document.addEventListener('visibilitychange', () => { if (!document.hidden && !window.__freeze && !params.get('still')) start(); });
start();
