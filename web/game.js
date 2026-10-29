// The game: engine state → 3D seeds, animated move by move. Every move the picture shows comes from engine events.
import * as THREE from 'three';
import { newGame, applyMove, legalMoves, replay, owner, RULES } from '/engine/ayo.js';
import { SeedSim } from './physics.js';
import { CHARACTERS, line, faceFor, MOOD_FOR, runLine as runWord, RUN_MOOD } from './characters.js';
import { parse as parseRecord, record as recordGame, standing, cardLine as recordLine } from './record.js';
import { decideQuality, decidePhysics, browserEnv, tier } from './quality.js';
import { parse as parseStreak, recordDay, unlocked, homeLine, MILESTONES } from './streak.js';
import { bestTurn, clipPace, clipCaption } from './clip.js';
import { dailyPuzzle, attempt, shareText, todayKey } from '../engine/puzzle.js';
import { parse as parseDaily, record as recordDaily, entry as dailyEntry, solvedRun, cardLine, resultLabel, runLine, dayLabel, canShow, markShown } from './daily.js';
import { Online, stateFrom, inviteLink, cleanCode, inviteText, whatsappLink } from './online.js';
import { SHOUTS, shoutText, shoutKnocks, SHOUT_GAP_MS, SHOUT_SHOW_MS } from './shouts.js';
import { keyAction, pitKey, pitLabel, pitEnabled, hintText } from './keys.js';
import { sowPath, pickedHint } from './path.js';
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
// seed physics: the bounce-and-roll, or a plain flight from hand to pit on the weakest phones (Settings → Feel → Seed physics; Auto follows the lighter board)
let PHYS = decidePhysics({ pref: prefs.get('physics', 'auto'), lite: quality.lite, param: params.get('physics') });
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
let baseTheta = 0; /* π when you hold the far seat of an online room: your pits still nearest you */ let theta = 0, phi = 0.72, dist = 1.55; const target = new THREE.Vector3(0, 0.02, 0.02);
function placeCam() { camera.position.set(target.x + dist * Math.sin(phi) * Math.sin(theta), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.cos(theta)); camera.lookAt(target); }
let wide = false;
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const nowWide = w > h * 1.1; if (nowWide !== wide) { wide = nowWide; dist = wide ? 1.8 : 1.55; phi = wide ? 0.5 : 0.72; theta = baseTheta; }
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
// (with physics off, the seed still flies pit to pit in a small arc and lands in its slot: every move is shown, nothing rolls)
function drop(m, home, flight = 0.22) {
  if (!PHYS.physics) return fly(m, home, Math.round(flight * 1000), 0.06);
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
    const flip = you === 1 ? -1 : 1; // from the far seat the board is seen the other way round: badges stay at the outer, nearer corner of each pit
    v3.set(x + (i < 6 ? PIT_R * 0.7 : -PIT_R * 0.7), BT + 0.01, z + PIT_R * 0.75 * flip).project(camera);
    const b = badges[i]; b.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px)`; b.hidden = !show;
  });
}
function setBadge(i, n) { badges[i].textContent = n; badges[i].classList.toggle('zero', n === 0); }
// the pits for a screen reader and the Tab key: one hidden button per pit, your six first, each saying its count; Tab lights a pit, Enter sows it
const pitBtns = []; const pitLayer = $('#pits');
for (let i = 0; i < 12; i++) {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.pit = i; pitLayer.appendChild(b); pitBtns.push(b);
  b.addEventListener('focus', () => { if (canPress() && legalMoves(state).includes(i) && selected !== i) select(i); });
  b.addEventListener('click', () => pressPit(i));
}
let keysUsed = false; const mouseLikely = matchMedia('(hover: hover) and (pointer: fine)').matches; // a Mac, or a Fold with a mouse: the hint line talks keys
const keysLikely = () => keysUsed || mouseLikely;
function paintPits() { // labels and reach from the position: only your own pits with seeds are buttons you can land on, and only on your move
  const mine = state.turn === you && !state.over && !busy && !(online && !friend) && !(puzzle.on && puzzle.played); const legal = mine ? legalMoves(state) : [];
  const order = [...Array(6).keys()].map((k) => you * 6 + k).concat([...Array(6).keys()].map((k) => them * 6 + k)); // yours first, near to far
  if (pitLayer.firstChild !== pitBtns[order[0]]) order.forEach((i) => pitLayer.appendChild(pitBtns[i])); // a screen reader reads them in this order
  badges.forEach((b, i) => { const k = pitKey(i, you); if (k) b.dataset.key = k; else delete b.dataset.key; }); // once a key is pressed, the count badge on your pits shows its key too
  order.forEach((i) => { const b = pitBtns[i]; b.setAttribute('aria-label', pitLabel(i, state.pits[i], { you, selected, legal: mine ? legal : null })); b.disabled = !pitEnabled(i, state.pits[i], { you, mine }); b.setAttribute('aria-pressed', String(selected === i)); });
}
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
let you = 0, them = 1; // engine seats: offline you are always 0; in a room you take the seat the server gives you
const names = { easy: 'Adaeze', medium: 'Nnamdi', hard: 'Mama Ngozi' };
const levelLabel = (l) => `${names[l]} · ${l[0].toUpperCase() + l.slice(1)}`;
let state = newGame(settings.game, settings.rules()); let busy = false; let selected = null; let level = settings.level;
let stats = { biggest: 0, captures: 0, started: Date.now() };
// your record against each opponent, kept on this phone (web/record.js): wins–losses and your best win, on their Home pill and the Game over card
let records = parseRecord(prefs.get('record', null));
function paintRecordPills() { document.querySelectorAll('.pill[data-level] small.rec').forEach((s) => { s.textContent = standing(records[s.closest('.pill').dataset.level]); }); }

// ---------- a friend online: the board joins a room (?room=CODE from the invite link) and animates the moves the server sends ----------
// The server runs the same engine and is the referee; this board only asks for a move and shows what comes back. A move
// travels as a few dozen bytes (seat, pit, move count, scores): online.js rebuilds the seeds' path with the same engine, so a
// weak signal carries a whole game in less data than one photo; if a board ever disagrees it fetches the whole room.
const roomParam = params.get('still') ? null : params.get('room');
let online = false, roomWanted = null; // online while a room is open, knocked on or joined (from the Rooms screen, or ?room=CODE from an invite link); roomWanted: 'NEW' or the code asked for
let net = null, friend = null; // friend: the other seat as the server shows it {name, online, wantsRematch}, or null while the room waits
const oppLabel = () => online ? (friend ? friend.name : 'Waiting for a friend') : levelLabel(level);
const myName = () => prefs.get('name', '') || $('#meName').textContent || 'Player';
function paintMyName() { const n = prefs.get('name', ''); if (n) { $('#meName').textContent = n; $('#goMe span').textContent = n; } }
// the name card: asked once (before a room is opened or knocked on), then remembered on this phone
function askName(verb) {
  return new Promise((res) => {
    const card = $('#nameCard'), field = $('#nameField'); field.value = prefs.get('name', ''); $('#nameGo').textContent = verb;
    card.hidden = false; setTimeout(() => field.focus(), 50);
    $('#nameSub').textContent = verb === 'Knock' ? 'Your friend sees this name when you knock on their board.' : verb === "That's me" ? 'Your friends see this name at the board. Asked once, kept on this phone.' : 'Your friend sees this name when they knock on your board.';
    card.onsubmit = (e) => { e.preventDefault(); const n = field.value.replace(/\s+/g, ' ').trim().slice(0, 24); if (!n) return field.focus(); prefs.set('name', n); paintMyName(); paintRoomsName(); card.hidden = true; click(1.3, 0.08); res(n); };
    $('#nameHome').onclick = () => { card.hidden = true; if (net) leaveRoom(); else showScreen('home'); };
  });
}
// ---------- the Rooms screen, as approved: your room and its big code, Invite on WhatsApp, copy the link, join a friend's room by code ----------
const rooms = { state: 'idle' }; // 'idle' | 'opening' | 'open' | 'door' | 'error'
const roomsShowing = () => !$('#rooms').hidden;
function paintRoomsName() { $('#roomsName').textContent = `playing as ${prefs.get('name', '') || '…'}`; }
function openRooms() { // Home → With friends: the screen comes up and a room is opened straight away (your name is asked first, once)
  $('#roomsGame').textContent = `${settings.game === 'ncho' ? 'Nchò' : 'Ayo'} · same rules as the board`; paintRoomsName();
  $('#joinNote').textContent = 'Lose signal mid-game and the room keeps your seat: come back and carry on.'; $('#joinNote').className = 'note'; $('#codeField').value = ''; $('#joinBtn').disabled = true;
  if (!net) { paintCode(null); setRoomStatus('opening'); }
  showScreen('rooms');
  if (!prefs.get('name', '')) askName("That's me").then(openRoom); else openRoom();
}
function openRoom() { if (net || !roomsShowing()) return; paintCode(null); setRoomStatus('opening'); startOnline('new', { stay: true }); }
function paintCode(code) { // the four tiles: dots while the room opens, then the letters land one after another
  const tiles = $('#roomCode'); tiles.classList.toggle('empty', !code); tiles.classList.remove('fresh');
  [...tiles.children].forEach((t, i) => { t.textContent = code ? code[i] : '·'; });
  tiles.setAttribute('aria-label', code ? 'Room code ' + code.split('').join(' ') : 'Room code');
  if (code) { void tiles.offsetWidth; tiles.classList.add('fresh'); }
}
const STATUS_TEXT = { idle: 'tap to open a room', opening: 'opening a room…', open: 'waiting for a friend', door: 'someone is at the door', error: 'no connection · tap to try again' };
function setRoomStatus(s, text) {
  rooms.state = s; const el = $('#roomStatus'); el.dataset.state = s; el.querySelector('span').textContent = text || STATUS_TEXT[s];
  const ready = (s === 'open' || s === 'door') && net && net.code;
  $('#waBtn').classList.toggle('off', !ready); $('#copyBtn').disabled = !ready; $('#shareLinkBtn').disabled = !ready;
  if (ready) $('#waBtn').href = whatsappLink(net.code, inviteLink(net.code)); else $('#waBtn').removeAttribute('href');
}
function paintRoomStatus() { // what the room card says, from the connection and the door
  if (!roomsShowing()) return;
  if (!net) return setRoomStatus(rooms.state === 'error' ? 'error' : 'idle');
  if (net.seat === null) return setRoomStatus('opening');
  if (net.status !== 'open') return setRoomStatus('opening', net.status === 'reconnecting' ? 'reconnecting…' : 'connecting…');
  const knocks = (net.room && net.room.knocks) || [];
  setRoomStatus(knocks.length ? 'door' : 'open', knocks.length ? `${knocks[0].name} is at the door` : undefined);
}
function stopOnline() { // leave before anyone joined (Back on the Rooms screen, or a knock the host refused): the board is yours again, no reload
  if (net) { net.leave(); net = null; } friend = null; online = false; roomWanted = null; you = 0; them = 1; baseTheta = 0; theta = 0; busy = false; prefs.set('room', 'null');
  $('#knockCard').hidden = true; body.classList.remove('online'); if (location.search) history.replaceState(null, '', location.pathname);
  if (!resume()) state = newGame(settings.game, settings.rules()); layoutFromState(state); refreshStatic(); paintRules();
}
function joinByCode(code) { // Got a code? Join their room: your own room closes and you knock on theirs
  if (net) { net.leave(); net = null; prefs.set('room', 'null'); }
  $('#joinNote').textContent = `Knocking on room ${code}…`; $('#joinNote').className = 'note busy'; $('#joinBtn').disabled = true; paintCode(null);
  startOnline(code, { stay: true }); paintRoomStatus(); click(1.2, 0.06);
}
$('#friendsBtn').addEventListener('click', () => { openRooms(); click(1.3, 0.08); });
$('#roomsBack').addEventListener('click', () => { if (friend) return leaveRoom(); stopOnline(); showScreen('home'); click(1, 0.05); });
$('#roomStatus').addEventListener('click', () => { if (rooms.state === 'error' || rooms.state === 'idle') { if (net) { net.leave(); net = null; } openRoom(); } });
$('#codeField').addEventListener('input', (e) => { const c = cleanCode(e.target.value); if (e.target.value !== c) e.target.value = c; $('#joinBtn').disabled = c.length !== 4; if ($('#joinNote').classList.contains('bad')) { $('#joinNote').textContent = ''; $('#joinNote').className = 'note'; } });
$('#joinCard').addEventListener('submit', (e) => { e.preventDefault(); const code = cleanCode($('#codeField').value); if (code.length === 4 && !(net && net.seat === null && roomWanted === code)) joinByCode(code); });
$('#copyBtn').addEventListener('click', async () => { if (!net || !net.code) return; const link = inviteLink(net.code); try { await navigator.clipboard.writeText(link); toast('Link copied'); click(1.3, 0.06); } catch { toast(link); } });
$('#shareLinkBtn').addEventListener('click', async () => {
  if (!net || !net.code) return; const link = inviteLink(net.code);
  try { if (navigator.share) await navigator.share({ title: 'Ayo & Nchò', text: inviteText(net.code), url: link }); else { await navigator.clipboard.writeText(link); toast('Link copied'); } } catch {}
});
$('#waBtn').addEventListener('click', () => click(1.3, 0.06));
$('#roomsName').addEventListener('click', () => askName("That's me").then(() => { if (net && !friend && net.seat !== null) { net.leave(); net = null; prefs.set('room', 'null'); openRoom(); toast('A new room, with your new name'); } }));
// the door (host's side): the first person knocking is shown; Let in seats them, Not now sends them away; the next knock follows
let doorId = null;
function paintDoor() {
  const knocks = (net && net.room && net.room.knocks) || []; const card = $('#knockCard');
  if (!knocks.length || friend) { doorId = null; card.hidden = true; return; }
  const k = knocks[0]; if (doorId === k.id && !card.hidden) return;
  doorId = k.id; $('#knockTitle').textContent = `${k.name} wants to play`; $('#knockFace').innerHTML = initialFace(k.name);
  $('#knockSub').textContent = knocks.length > 1 ? `Let them in and they take the far seat. ${knocks.length - 1} more ${knocks.length > 2 ? 'are' : 'is'} waiting behind them.` : 'Let them in and they take the far seat. Nobody else can join once they do.';
  $('#knockYes').disabled = false; $('#knockNo').disabled = false; card.hidden = false;
}
function answerDoor(yes) { if (!net || !doorId) return; if (net.let(doorId, yes)) { $('#knockYes').disabled = true; $('#knockNo').disabled = true; click(yes ? 1.5 : 0.7, 0.08); } }
$('#knockYes').addEventListener('click', () => answerDoor(true));
$('#knockNo').addEventListener('click', () => answerDoor(false));
function knockSound() { [1.1, 1.1, 1.4].forEach((p, i) => setTimeout(() => click(p, 0.12), i * 130)); buzz([30, 60, 30, 60, 60]); }
function initialFace(name) { // a friend has no drawn character yet: their initial on a brass ring
  const ch = (String(name || '?').trim()[0] || '?').toUpperCase();
  return `<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="22" fill="#3a2718"/><circle cx="22" cy="22" r="19" fill="none" stroke="#e6b76f" stroke-opacity=".55"/><text x="22" y="29" text-anchor="middle" font-size="20" font-weight="700" fill="#e6b76f" font-family="inherit">${ch}</text></svg>`;
}
function showTurnOnline() {
  $('#undo').disabled = true; $('#hintBtn').disabled = true;
  if (!net || net.seat === null) { // not seated yet: the joining message stays, or the door's
    if (net && net.knock) {
      const k = net.knock; const link = net.status !== 'open';
      $('#oppName').textContent = k.host; $('#oppFace').innerHTML = initialFace(k.host);
      $('#oppSub').textContent = link ? (net.status === 'reconnecting' ? 'reconnecting…' : 'no connection') : k.hostOnline ? 'deciding whether to let you in' : 'away — they will see you knocked when they are back';
      $('#turn').textContent = 'at the door'; $('#hint').textContent = `Knocked — waiting for ${k.host} to let you in`; $('#shoutBtn').disabled = true;
    }
    return;
  }
  const waiting = !friend; const mine = !waiting && state.turn === you && !state.over && !busy; const link = net.status !== 'open';
  $('#turn').textContent = state.over ? 'game over' : waiting ? 'waiting' : mine ? 'your move' : '…';
  $('#oppSub').textContent = link ? (net.status === 'reconnecting' ? 'reconnecting…' : net.status === 'connecting' ? 'connecting…' : 'no connection')
    : waiting ? `room ${net.code || ''}` : !friend.online ? 'away — their seat is held' : state.over ? '' : mine ? 'waiting' : 'their move';
  $('#hint').textContent = state.over ? '' : waiting ? (net.code ? `Room ${net.code} · send your friend this page's link` : '') : mine ? pickHint('pick') : '';
  $('#undo').disabled = true; $('#hintBtn').disabled = true; $('#shoutBtn').disabled = waiting || link;
}
// the line under the board on your move: for a finger, or for the keys once a mouse or a key press says there is a keyboard
function pickHint(phase) { return selected === null ? hintText(phase, { keys: keysLikely() }) : pickedHint(path, { you, keys: keysLikely(), key: pitKey(selected, you), seeds: state.pits[selected] }); }
// ---------- shouts: a fixed phrase sent by id to both boards; theirs pops by their face with a knock, yours sits by your name ----------
const shoutMenu = $('#shoutMenu'); let shoutAt = -1e9, myBubbleTimer = null;
for (const s of SHOUTS) { const b = document.createElement('button'); b.className = 'pill'; b.type = 'button'; b.textContent = s.text; b.dataset.id = s.id; b.addEventListener('click', () => sendShout(s.id)); shoutMenu.appendChild(b); }
function toggleShoutMenu(open = shoutMenu.hidden) { shoutMenu.hidden = !open; $('#shoutBtn').setAttribute('aria-expanded', String(open)); }
function sendShout(id) {
  toggleShoutMenu(false); if (!net || !friend) return false;
  const t = performance.now(); if (t - shoutAt < SHOUT_GAP_MS) return false; // one at a time, like the server says
  if (!net.shout(id)) return false; shoutAt = t; click(1.3, 0.05); return true;
}
function showShout(seat, id) {
  const text = shoutText(id); if (!text) return;
  if (seat === them) {
    const b = $('#bubble'); b.textContent = text; b.hidden = false; clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { b.hidden = true; }, SHOUT_SHOW_MS);
    const f = $('#oppFace'); if (!reduceMotion) { f.classList.remove('react'); void f.offsetWidth; f.classList.add('react'); }
    shoutKnocks(id).forEach((p, i) => setTimeout(() => click(p, 0.1), i * 110)); buzz([15, 30, 15]);
  } else {
    const b = $('#myBubble'); b.textContent = text; b.hidden = false; clearTimeout(myBubbleTimer); myBubbleTimer = setTimeout(() => { b.hidden = true; }, SHOUT_SHOW_MS);
  }
}
$('#shoutBtn').addEventListener('click', () => { if (!friend) return toast('Waiting for a friend'); toggleShoutMenu(); click(1.2, 0.05); });
function syncRoom(room) { // the room as the server shows it: the friend's seat and the whole game
  friend = room.players[them] || null;
  const s = stateFrom(room.state);
  const same = state && state.moves.length === s.moves.length && state.pits.join() === s.pits.join() && state.stores.join() === s.stores.join();
  state = s; if (!same) layoutFromState(state);
  refreshStatic(); paintRules(); paintDoor(); paintRoomStatus();
}
let moveQueue = Promise.resolve();
function sendMove(pit) { if (busy || !net || !net.move(pit)) return; busy = true; deselect(); }
async function showMove({ seat, pit, events, state: pub }) {
  const prev = state.stores.slice(); const before = state; state = stateFrom(pub); busy = true; deselect(); $('#undo').disabled = true;
  if (seat === them) { select(pit); await wait(550); deselect(); }
  else { const got = state.stores[you] - prev[you]; stats.biggest = Math.max(stats.biggest, got); stats.captures += events.filter((e) => e.type === 'capture' && e.by === you).length; const r = recordDay(streak); streak = r.data; if (r.newDay) prefs.set('streak', JSON.stringify(streak)); }
  tipFor(events);
  await animate(events, prev);
  busy = false; refreshStatic();
  if (state.over) gameOver(); else if (before.over) $('#gameover').hidden = true;
}
function leaveRoom() { if (net) net.leave(); prefs.set('room', 'null'); location.href = location.pathname; }
function startOnline(code, { stay = false } = {}) {
  // code: 'new' opens a room, a four-letter code knocks on one. stay: asked from the Rooms screen, which stays up (the door card over it)
  // until a friend is in; otherwise (an invite link) the board shows at once with "Joining the room…"
  roomWanted = String(code).toUpperCase(); online = true;
  net = new Online((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  const self = net; const on = (t, fn) => self.on(t, (d) => { if (net === self) fn(d); }); // a room left behind (Back, a new name) says nothing more
  let held = null; try { held = JSON.parse(prefs.get('room', 'null')); } catch {}
  let triedJoin = false, seated = false, knocking = false;
  on('joined', ({ seat, code, token, room }) => {
    const back = seated; seated = true; you = seat; them = 1 - seat; baseTheta = seat === 1 ? Math.PI : 0; if (!back) theta = baseTheta;
    prefs.set('room', JSON.stringify({ code, token }));
    if (location.search !== '?room=' + code) history.replaceState(null, '', inviteLink(code)); // the address becomes the invite link (a reload comes back to this seat)
    syncRoom(room); $('#gameover').hidden = !state.over; if (state.over) gameOver();
    if (roomsShowing()) { if (friend) showScreen('play'); else { paintCode(code); paintRoomStatus(); if (!back) { click(1.4, 0.08); setTimeout(() => click(1.8, 0.08), 120); } } } // the tiles fill in on the Rooms screen
    if (knocking) { knocking = false; toast(`${friend ? friend.name : 'Your friend'} let you in — ${state.turn === you ? 'your move' : 'they start'}`); click(1.5, 0.1); setTimeout(() => click(2, 0.1), 120); buzz(20); }
    else if (back) toast('Back at the board'); else if (!friend && !roomsShowing()) toast(`Room ${code} — share this page's link`);
  });
  on('room', ({ room, started, resync }) => {
    const had = friend, wanted = friend && friend.wantsRematch; syncRoom(room);
    if (resync) { busy = false; deselect(); toast('Caught up with the board'); if (state.over) gameOver(); else $('#gameover').hidden = true; } // this board fell behind a move and asked for the whole room
    if (!had && friend) { if (roomsShowing()) showScreen('play'); toast(`${friend.name} joined`); click(1.5, 0.1); buzz(20); }
    if (started) { stats = { biggest: 0, captures: 0, started: Date.now() }; $('#gameover').hidden = true; $('#rematch').disabled = false; $('#rematch').textContent = 'Play again'; deselect(); toast('New game — ' + (state.turn === you ? 'your move' : `${oppLabel()} starts`)); }
    else if (friend && friend.wantsRematch && !wanted) { toast(`${friend.name} wants to play again`); if (!$('#gameover').hidden) $('#rematch').textContent = `Play again — ${friend.name} is ready`; }
  });
  on('move', (m) => { moveQueue = moveQueue.then(() => showMove(m)).catch((e) => console.error(e)); }); // small message, events rebuilt by online.js with the engine
  on('resync', () => { $('#oppSub').textContent = 'catching up…'; });
  on('shout', ({ seat, id }) => showShout(seat, id));
  // the door: this phone knocked and waits for the host; or (as host) someone is knocking on ours
  on('knocked', ({ host }) => { const again = knocking; knocking = true; if (roomsShowing()) { showScreen('play'); $('#oppFace').innerHTML = initialFace(host); } showTurn(); if (!again) { toast(`Knocked — ${host} decides`); click(1.1, 0.08); } });
  on('knock', () => { knockSound(); });
  on('error', (e) => {
    busy = false;
    if (e.re === 'rejoin' && !triedJoin) { triedJoin = true; prefs.set('room', 'null'); return net.join(roomWanted, myName()); } // our old seat is gone: knock for the free one
    if (e.code === 'noknock' || e.code === 'host') { toast(e.msg); paintDoor(); return; } // the host answered a knock that was already gone
    if (roomsShowing() && net.seat === null && !net.knock) { // from the Rooms screen, before any seat: said on the screen, which stays up
      const opening = roomWanted === 'NEW'; stopOnline(); click(0.6, 0.06);
      if (opening) setRoomStatus('error', e.code === 'full' ? 'too many rooms open · tap to try again' : 'no connection · tap to try again');
      else { $('#joinNote').textContent = e.msg; $('#joinNote').className = 'note bad'; $('#joinBtn').disabled = cleanCode($('#codeField').value).length !== 4; setRoomStatus('idle'); }
      return;
    }
    if (['notfound', 'taken', 'swept', 'offline', 'nows', 'full', 'notlet', 'busy'].includes(e.code)) {
      const host = net.knock && net.knock.host; $('#knockCard').hidden = true;
      $('#oppName').textContent = e.code === 'notlet' && host ? `${host} did not let you in this time` : e.msg; $('#oppSub').textContent = 'tap Home to go back'; $('#turn').textContent = ''; $('#hint').textContent = ''; $('#shoutBtn').disabled = true;
      if (e.code === 'notlet') { click(0.6, 0.08); buzz(40); } return;
    }
    $('#hint').textContent = e.msg; showTurn(); click(0.5, 0.05);
  });
  on('status', () => { if (net !== self) return; if (seated || net.knock) showTurn(); paintRoomStatus(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && net === self) net.wake(); });
  addEventListener('online', () => { if (net === self) net.wake(); });
  body.classList.add('online'); if (!stay) showScreen('play');
  $('#oppName').textContent = 'Joining the room…'; $('#oppSub').textContent = ''; $('#turn').textContent = ''; $('#hint').textContent = ''; $('#shoutBtn').disabled = true;
  $('#oppFace').innerHTML = initialFace('?');
  const rejoining = held && roomWanted !== 'NEW' && held.code === roomWanted;
  const go = () => {
    if (roomWanted === 'NEW') net.create({ variant: settings.game, rules: settings.rules(), name: myName() });
    else if (rejoining) net.rejoin(held.code, held.token);
    else { net.join(roomWanted, myName()); $('#oppName').textContent = 'Knocking…'; }
  };
  if (!rejoining && !prefs.get('name', '')) askName(roomWanted === 'NEW' ? 'Open the room' : 'Knock').then(go); // an invite link opened before a name was ever given: asked here, once
  else go();
}

const worker = new Worker('./ai-worker.js', { type: 'module' });
function aiMove(s, lvl = level) { return new Promise((res) => { worker.onmessage = (e) => res(e.data); worker.postMessage({ state: s, level: lvl }); }); }
let hintedAt = -1;
async function hint() {
  if (busy || online || state.over || state.turn !== you || hintedAt === state.moves.length) return;
  hintedAt = state.moves.length; $('#hintBtn').disabled = true;
  const m = await aiMove(state, 'hard'); if (m === null || state.turn !== you) return;
  const [x, z] = pitCenters[m]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true; board.glow.position.set(x, BT + 0.08, z); board.glow.visible = true; click(1.6, 0.05);
  $('#hint').textContent = `${CHARACTERS.hard.name} would play that one`;
  await wait(1500); if (selected === null) { board.ring.visible = false; board.glow.visible = false; } showTurn();
}

function paintFaces() {
  $('#oppFace').innerHTML = online ? initialFace(friend ? friend.name : '?') : faceFor(level, mood);
  document.querySelectorAll('.pill[data-level]').forEach((b) => { b.querySelector('.face').innerHTML = CHARACTERS[b.dataset.level].face; });
  document.querySelectorAll('[data-face]').forEach((f) => { f.innerHTML = CHARACTERS[f.dataset.face].face; });
}
function refreshStatic() {
  paintFaces();
  state.pits.forEach((n, i) => setBadge(i, n));
  $('#myScore').textContent = state.stores[you]; $('#oppScore').textContent = state.stores[them];
  $('#oppName').textContent = oppLabel();
  showTurn();
}
function showTurn() {
  if (online) { showTurnOnline(); paintPits(); return; }
  if (puzzle.on) { $('#hint').textContent = puzzle.played ? '' : pickHint('puzzle'); $('#undo').disabled = true; $('#hintBtn').disabled = true; paintPits(); return; }
  const mine = state.turn === you && !state.over;
  $('#turn').textContent = state.over ? 'game over' : mine ? 'your move' : '…';
  $('#oppSub').textContent = state.over ? '' : mine ? 'waiting' : 'thinking…';
  $('#hint').textContent = state.over ? '' : mine ? pickHint('pick') : '';
  $('#undo').disabled = busy || state.moves.length < 2;
  $('#hintBtn').disabled = !mine || busy || hintedAt === state.moves.length;
  paintPits();
}
function select(i, preview = true) {
  selected = i; const [x, z] = pitCenters[i]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true;
  board.glow.position.set(x, BT + 0.08, z); board.glow.visible = true; click(1.4, 0.05); if (preview) showPath(i); else clearPath(); showTurn();
}
function deselect() { selected = null; board.ring.visible = false; board.glow.visible = false; clearPath(); showTurn(); }

// ---------- where the seeds will go: on the first tap, the hand's path before the second tap sows ----------
// web/path.js reads the engine's own events for the move on a copy of the position, so the marks can never disagree with the move:
// a faint brass ring lands on each pit the hand would sow into, in sowing order (stronger where a relay passes twice), then a copper
// ring round each pit the move captures and a pool of light on the pit where the turn ends. Settings → Feel → Show where seeds go.
const pathOn = () => prefs.get('path', '1') === '1';
let path = null, pathToken = 0, pathGlow = false;
function showPath(i) {
  clearPath(); if (!pathOn() || state.turn !== you || owner(i) !== you) return;
  path = sowPath(state, i); if (!path) return;
  const token = ++pathToken, M = board.marks, p = path;
  (async () => {
    for (let k = 0; k < p.order.length; k++) {
      if (token !== pathToken) return;
      const pit = p.order[k], m = M.steps[pit], d = M.dots[pit], strong = p.visits[pit] > 1, y0 = d.position.y;
      m.visible = true; d.visible = true; // the dot drops onto the pit's edge; the faint ring fades in with it (both stronger where a relay passes twice)
      tween(220, (t) => { if (token !== pathToken) return; m.material.opacity = (strong ? 0.6 : 0.3) * t; d.material.opacity = 0.95 * Math.min(1, t * 1.6); d.position.y = y0 + (1 - t) * 0.03; const sc = (strong ? 1.35 : 1) * (1.5 - 0.5 * t); d.scale.set(sc, sc, 1); }, easeOut);
      if (k < 12) click(1.9, 0.012); // the hand counting the pits, quietly
      await wait(k < 12 ? 55 : 25);
    }
    if (token !== pathToken) return;
    for (const pit of p.captures) { const c = M.caps[pit]; c.visible = true; tween(260, (t) => { if (token !== pathToken) return; c.material.opacity = 0.85 * t; const sc = 1.12 - 0.12 * t; c.scale.set(sc, sc, 1); }, easeOut); }
    if (p.end !== null) { const e = M.end, [x, z] = pitCenters[p.end]; e.position.x = x; e.position.z = z; e.visible = true; tween(320, (t) => { if (token !== pathToken) return; e.material.opacity = 0.4 * t; }).then(() => { if (token === pathToken) pathGlow = true; }); }
    if (p.captures.length) click(1.25, 0.035);
  })();
}
function clearPath() {
  pathToken++; path = null; pathGlow = false; const M = board.marks;
  for (const m of [...M.steps, ...M.dots, ...M.caps, M.end]) { m.visible = false; m.material.opacity = 0; m.scale.set(1, 1, 1); }
}

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
      const store = 'S' + e.by; const scoreEl = e.by === you ? $('#myScore') : $('#oppScore');
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
  if (mover === them && aiGot > 0) setTimeout(() => say('capture'), 400); else if (mover === you && meGot >= 4) setTimeout(() => say('lost'), 400);
  await animate(events, prevStores);
  busy = false; refreshStatic(); save();
  if (state.over) return gameOver();
  if (state.turn === them) {
    showTurn(); await wait(350); if (mood === 'calm') react('think');
    const m = await aiMove(state);
    if (m === null || state.turn !== them) return;
    if (mood === 'think') react('calm'); select(m); await wait(550); // show which pit the opponent chose
    await play(m);
  }
}

// ---------- the daily puzzle, as approved: today's position on the live board, one move to capture the target ----------
// engine/puzzle.js makes the same position for everyone from the date; the board shows it with the usual events and keeps your best on this phone
let daily = parseDaily(prefs.get('daily', null));
const puzzle = { on: false, p: null, played: false, got: 0 };
function todaysPuzzle() { const v = settings.game; if (!puzzle.p || puzzle.p.key !== todayKey() || puzzle.p.variant !== v) puzzle.p = dailyPuzzle(todayKey(), v); return puzzle.p; }
function paintPuzzleCard() { // the Home card: today's ask and where you stand
  const p = todaysPuzzle(); const e = dailyEntry(daily, p.key, p.variant);
  $('#puzzleDay').textContent = `Daily puzzle · ${dayLabel(p.key)}`; $('#puzzleAsk').textContent = `Capture ${p.target} in one turn`;
  $('#puzzleState').textContent = cardLine(e); $('#puzzleCard').classList.toggle('solved', !!(e && e.solved));
}
function openPuzzle() { // Home → the card: the board shows today's position, your pits nearest you, and waits for one move
  if (online) return; // your game is already saved move by move; Back to home brings it back
  const p = todaysPuzzle(); puzzle.on = true; puzzle.played = false; puzzle.got = 0; you = 0; them = 1;
  state = { ...p.state, pits: p.state.pits.slice(), stores: p.state.stores.slice() }; layoutFromState(state); refreshStatic(); deselect(); hintedAt = -1;
  $('#pzDay').textContent = `Daily puzzle · ${dayLabel(p.key)}`; $('#pzRules').textContent = `${p.variant === 'ncho' ? 'Nchò' : 'Ayo'} rules`; $('#pzAsk').textContent = `Capture ${p.target} in one turn`;
  $('#pzHow').textContent = p.variant === 'ncho' ? 'One move. Your pits are on the right. Relay sowing counts.' : 'One move. Your pits are on the right. 2s and 3s behind your last seed count too.';
  $('#pzCard').hidden = true; $('#puzzle').classList.remove('open'); showScreen('puzzle');
}
async function puzzlePlay(pit) { // one move: the engine's events on the board, then the result card
  const p = puzzle.p; const r = attempt(p, pit); const prevStores = state.stores; state = r.state; busy = true; puzzle.played = true; deselect();
  const s = recordDay(streak); streak = s.data; if (s.newDay) prefs.set('streak', JSON.stringify(streak)); // a puzzle move is a move: the calm streak counts the day
  await animate(r.events, prevStores);
  busy = false; puzzle.got = r.got; refreshStatic();
  const rec = recordDaily(daily, p.key, p.variant, r.got, p.target); daily = rec.data; prefs.set('daily', JSON.stringify(daily));
  paintPuzzleResult(r.got, rec.entry, rec.firstSolve);
}
function paintPuzzleResult(got, e, firstSolve) {
  const p = puzzle.p; const hit = got >= p.target;
  $('#pzEyebrow').textContent = 'You captured'; $('#pzGot').textContent = got; $('#pzTarget').textContent = p.target; $('#pzBadge').textContent = resultLabel(got, p.target); $('#pzBadge').className = hit ? 'pzBadge' : 'pzBadge miss';
  const n = Math.min(Math.max(p.target, got), 16); const row = $('#pzRow'); row.innerHTML = ''; row.setAttribute('aria-label', `${got} of ${p.target} seeds`);
  for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.textContent = i < got ? '●' : '○'; if (i >= got) s.className = 'o'; s.style.animationDelay = `${i * 45}ms`; row.appendChild(s); }
  $('#pzBest').textContent = `${e.got} of ${p.target}`; $('#pzRun').textContent = runLine(solvedRun(daily, p.key));
  $('#pzAgain').textContent = hit ? 'Play it again' : 'Try again';
  $('#pzShow').hidden = !canShow(e); // after two misses Mama Ngozi offers to show the move
  $('#pzCard').hidden = false; $('#puzzle').classList.add('open'); showTurn();
  if (hit) { click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); buzz([20, 40, 20]); if (firstSolve) { const run = solvedRun(daily, p.key); if (run > 1) setTimeout(() => toast(`${run} days in a row`), 900); } }
  else { click(0.7, 0.08); }
}
async function puzzleShow() { // Show me: the position comes back, the answer pit lights, and the move plays through — shown, not scored
  if (busy || !puzzle.on) return; const p = puzzle.p; const e = dailyEntry(daily, p.key, p.variant); if (!canShow(e)) return;
  busy = true; puzzle.played = true; $('#pzCard').hidden = true; $('#puzzle').classList.remove('open');
  state = { ...p.state, pits: p.state.pits.slice(), stores: p.state.stores.slice() }; layoutFromState(state); refreshStaticFrom(state);
  daily = markShown(daily, p.key, p.variant); prefs.set('daily', JSON.stringify(daily));
  await wait(350); select(p.answer); $('#hint').textContent = `${CHARACTERS.hard.name}: watch this one…`; await wait(reduceMotion ? 300 : 1100);
  const r = attempt(p, p.answer); const prevStores = state.stores; state = r.state; board.ring.visible = false; board.glow.visible = false; clearPath(); selected = null;
  await animate(r.events, prevStores, Math.max(PACE, 190)); // a touch slower than a game, so the relay can be followed
  busy = false; refreshStatic();
  const shown = dailyEntry(daily, p.key, p.variant);
  $('#pzEyebrow').textContent = `${CHARACTERS.hard.name}'s move captures`; $('#pzGot').textContent = r.got; $('#pzTarget').textContent = p.target; $('#pzBadge').textContent = 'Shown'; $('#pzBadge').className = 'pzBadge shown';
  const row = $('#pzRow'); row.innerHTML = ''; row.setAttribute('aria-label', `the move captures ${r.got}`);
  for (let i = 0; i < Math.min(r.got, 16); i++) { const s = document.createElement('span'); s.textContent = '●'; s.style.animationDelay = `${i * 45}ms`; row.appendChild(s); }
  $('#pzBest').textContent = `${shown.got} of ${p.target}`; $('#pzRun').textContent = runLine(solvedRun(daily, p.key));
  $('#pzAgain').textContent = 'Now you'; $('#pzShow').hidden = true; $('#pzCard').hidden = false; $('#puzzle').classList.add('open'); showTurn();
  toast(`${CHARACTERS.hard.name} showed you — now play it yourself`); click(1.2, 0.06);
}
function puzzleAgain() { if (busy) return; const p = puzzle.p; puzzle.played = false; puzzle.got = 0; state = { ...p.state, pits: p.state.pits.slice(), stores: p.state.stores.slice() }; layoutFromState(state); refreshStatic(); deselect(); $('#pzCard').hidden = true; $('#puzzle').classList.remove('open'); click(1.2, 0.05); }
function closePuzzle() { // Back to home: the board goes back to your game (or a fresh one)
  if (busy) return; puzzle.on = false; puzzle.played = false; $('#pzCard').hidden = true;
  if (!resume()) state = newGame(settings.game, settings.rules()); layoutFromState(state); refreshStatic(); deselect(); paintRules(); showScreen('home');
}
async function sharePuzzle() {
  const p = puzzle.p; const text = shareText(p, puzzle.got) + (location.protocol === 'https:' ? `\n${location.origin}${location.pathname}?puzzle=1` : '');
  try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Result copied'); } } catch {}
}
$('#puzzleCard').addEventListener('click', () => { openPuzzle(); click(1.3, 0.08); });
$('#pzAgain').addEventListener('click', puzzleAgain);
$('#pzShow').addEventListener('click', () => { puzzleShow(); click(1.3, 0.06); });
$('#pzHome').addEventListener('click', () => { closePuzzle(); click(1, 0.05); });
$('#pzShare').addEventListener('click', () => { sharePuzzle(); click(1.3, 0.06); });

// ---------- screens ----------
const body = document.body;
function showScreen(which) { // 'home' | 'settings' | 'play' | 'rooms' | 'puzzle'
  $('#home').hidden = which !== 'home'; $('#settings').hidden = which !== 'settings'; $('#rooms').hidden = which !== 'rooms'; $('#puzzle').hidden = which !== 'puzzle';
  const board3d = which === 'play' || which === 'puzzle'; // the puzzle is played on the board, like a game, with the HUD and toolbar stepped aside
  body.classList.toggle('screen', !board3d); body.classList.toggle('playing', board3d); body.classList.toggle('puzzle', which === 'puzzle'); pitLayer.hidden = !board3d;
  const wasIdle = idle; if (which === 'home') { paintHome(); idle = true; } else idle = which === 'rooms'; // the board turns slowly behind Home and the Rooms screen
  if (board3d && wasIdle) { // …and swings back round to face you as the game starts
    const from = theta, to = baseTheta + Math.round((theta - baseTheta) / (2 * Math.PI)) * 2 * Math.PI;
    if (Math.abs(to - from) > 0.01) tween(650, (t) => { theta = from + (to - from) * t; }, easeInOut);
  }
  if (which !== 'play' && !shoutMenu.hidden) toggleShoutMenu(false);
  if (which === 'play') blinkLoop(); else { clearTimeout(blinkTimer); if (mood !== 'calm' && mood !== 'think') react('calm'); }
}
let idle = true; // the home screen slowly turns the board
function paintHome() {
  const g = settings.game;
  document.querySelectorAll('[data-game]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.game === g));
  document.querySelectorAll('.pill[data-level]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.level === level));
  $('#playSub').textContent = 'vs ' + levelLabel(level); $('#streakLine').textContent = homeLine(streak); paintPuzzleCard(); paintRecordPills();
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
  sw('last8', r.last8); sw('badges', prefs.get('badges', '1') === '1'); sw('sound', soundOn()); sw('haptics', prefs.get('haptics', '1') === '1'); sw('path', pathOn());
  set('quality', prefs.get('quality', 'auto')); $('#qualityNow').textContent = `now ${Q.lite ? 'lighter' : 'full'} (${quality.reason})`;
  set('physics', prefs.get('physics', 'auto')); $('#physicsNow').textContent = `now ${PHYS.physics ? 'on' : 'off'} (${PHYS.reason})`;
  document.querySelectorAll('.choose[data-level]').forEach((b) => { const on = b.dataset.level === level; b.setAttribute('aria-pressed', on); b.textContent = on ? 'Chosen' : 'Choose'; });
}
// ---------- the opponent's face reacts: a mood for a moment, then back to calm; blinks now and then while waiting ----------
let mood = 'calm', moodTimer = null, blinkTimer = null;
function react(next, ms = 2600) {
  if (params.get('still') || online) return; clearTimeout(moodTimer); mood = next; const f = $('#oppFace'); f.innerHTML = faceFor(level, mood);
  if (next !== 'calm' && next !== 'blink' && next !== 'think') { f.classList.remove('react'); void f.offsetWidth; f.classList.add('react'); }
  if (next !== 'calm' && next !== 'think') moodTimer = setTimeout(() => react('calm'), ms);
}
function blinkLoop() { // a blink every few seconds, only on a calm face, never under reduced motion
  clearTimeout(blinkTimer); if (reduceMotion || params.get('still') || online) return;
  blinkTimer = setTimeout(() => { if (mood === 'calm' && body.classList.contains('playing')) { $('#oppFace').innerHTML = faceFor(level, 'blink'); setTimeout(() => { if (mood === 'calm') $('#oppFace').innerHTML = faceFor(level, 'calm'); }, 130); } blinkLoop(); }, 2800 + Math.random() * 4200);
}
let bubbleTimer = null;
function say(moment) {
  if (online) return; // a friend speaks for themselves
  sayText(line(level, moment), MOOD_FOR[moment] || 'calm');
}
function sayText(text, mood = 'calm', ms = 2600) { // the opponent says these words, with the face to match
  if (online) return; react(mood);
  if (!text || params.get('still')) return;
  const b = $('#bubble'); b.textContent = text; b.hidden = false; clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { b.hidden = true; }, ms);
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
      else if (name === 'physics') { prefs.set('physics', v); PHYS = decidePhysics({ pref: v, lite: quality.lite, param: params.get('physics') }); toast(PHYS.physics ? 'Seeds bounce and roll again' : 'Seeds fly straight to their pit'); } // applies to the next seed, no new game
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
$('#homeBtn').addEventListener('click', () => { if (online) return leaveRoom(); if (!busy) { save(); showScreen('home'); } });
$('#goHome').addEventListener('click', () => { if (online) return leaveRoom(); $('#gameover').hidden = true; showScreen('home'); });
$('#homeSettings').addEventListener('click', () => { paintSettings(); showScreen('settings'); });
$('#settingsBtn').addEventListener('click', () => { if (!busy) { paintSettings(); showScreen('settings'); } });
$('#settingsBack').addEventListener('click', () => { if (online) return showScreen('play'); const r = settings.rules(); const same = state.variant === settings.game && JSON.stringify(state.rules) === JSON.stringify(r) && state.moves.length; showScreen(same ? 'play' : 'home'); });
$('#settingsRules').addEventListener('click', () => { $('#rules').hidden = false; });

// game over card, as approved
function gameOver() {
  const a = state.stores[you], b = state.stores[them]; const win = state.winner === you; const draw = state.winner === 'draw';
  $('#goEyebrow').textContent = `${state.variant === 'ncho' ? 'Nchò' : 'Ayo'} · ${state.moves.length} moves`;
  $('#goTitle').textContent = draw ? 'A draw' : win ? 'You win' : `${online ? oppLabel() : names[level]} wins`;
  $('#goMyScore').textContent = a; $('#goOppScore').textContent = b; $('#goOppName').textContent = oppLabel();
  $('#rematch').textContent = online ? (friend && friend.wantsRematch ? `Play again — ${friend.name} is ready` : 'Play again') : 'Play again'; $('#rematch').disabled = false;
  $('#goMe').classList.toggle('win', a >= b); $('#goOpp').classList.toggle('win', b > a);
  $('#goBig').textContent = `${stats.biggest} seeds`; $('#goCaps').textContent = stats.captures;
  const secs = Math.round((Date.now() - stats.started) / 1000); $('#goTime').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const word = paintRecord(a, b);
  $('#gameover').hidden = false; if (!online) prefs.set('game', 'null');
  if (word) sayText(word.text, word.mood); else say(win ? 'lose' : 'win'); // a run or a first win is worth their word more than the usual line
  if (win) { click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); }
}
// your record against this opponent, counted once per game (the game's start time is its id) and shown on the card with their face;
// when the result is worth a word (your first win against them, a run of 3, 5, 10…) they say it, on the card and in the bubble
function paintRecord(a, b) {
  const box = $('#goRecord'); if (online || puzzle.on) { box.hidden = true; return null; }
  const r = recordGame(records, level, a, b, stats.started); records = r.data; if (r.counted) prefs.set('record', JSON.stringify(records));
  const text = recordLine(r.entry, r.counted && r.newBest); if (!text) { box.hidden = true; return null; }
  $('#goRecLine').innerHTML = text.split(' · ').map((p) => p.startsWith('new best') ? `<em>${p}</em>` : p).join(' · '); // our own numbers and words, nothing typed
  const word = r.counted ? (r.moment === 'firstWin' ? line(level, 'firstWin') : r.moment === 'run' ? runWord(level, r.entry.run) : '') : '';
  const mood = !word ? 'calm' : r.moment === 'firstWin' ? MOOD_FOR.firstWin : r.entry.run > 0 ? RUN_MOOD.yours : RUN_MOOD.theirs;
  $('#goRecSay').textContent = word ? `“${word}”` : ''; $('#goRecSay').hidden = !word; box.classList.toggle('word', !!word);
  $('#goRecFace').innerHTML = faceFor(level, mood); box.hidden = false;
  if (word) setTimeout(() => { click(1.6, 0.06); buzz(10); }, 450); // the line lands a beat after the card
  return word ? { text: word, mood } : null;
}
$('#replayBtn').addEventListener('click', async () => {
  if (busy) return; const moves = state.moves.slice(); const variant = state.variant, rules = state.rules;
  $('#gameover').hidden = true; busy = true;
  let s = newGame(variant, rules); layoutFromState(s); refreshStaticFrom(s);
  for (const m of moves) { const r = applyMove(s, m); if (r.state.turn === them) { select(m); await wait(250); } deselect(); await animate(r.events, s.stores, 70); s = r.state; refreshStaticFrom(s); }
  busy = false; $('#gameover').hidden = false;
});
function refreshStaticFrom(s) { s.pits.forEach((n, i) => setBadge(i, n)); $('#myScore').textContent = s.stores[you]; $('#oppScore').textContent = s.stores[them]; }
$('#shareBtn').addEventListener('click', async () => {
  const a = state.stores[you], b = state.stores[them]; const text = `Ayo & Nchò — ${state.winner === 'draw' ? 'I drew with' : state.winner === you ? 'I beat' : 'I lost to'} ${online ? oppLabel() : names[level]} ${a}–${b} in ${state.moves.length} moves.`;
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
  await wait(300); select(turn.pit, false); await wait(600); board.ring.visible = false; board.glow.visible = false;
  await animate(turn.events, turn.before.stores, clipPace(turn, PACE));
  await wait(900); cinematic = false;
  const blob = rec ? await new Promise((res) => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || type })); rec.stop(); }) : null;
  const ms = Math.round(performance.now() - t0); $('#rec').hidden = true;
  layoutFromState(state); refreshStatic(); busy = false; clipping = false; selected = null; if (wasOver) $('#gameover').hidden = false;
  const caption = clipCaption(turn, online ? oppLabel() : names[level], state.variant);
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

function save() { if (online) return; prefs.set('game', JSON.stringify({ moves: state.moves, variant: state.variant, rules: state.rules, level, stats })); }
function savedGame() { try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.moves && g.moves.length) { const s = replay(g.moves, g.variant, g.rules); return s.over ? null : s; } } catch {} return null; }
function resume() {
  try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.moves && g.moves.length && !params.get('still')) { state = replay(g.moves, g.variant, g.rules); level = g.level || level; stats = g.stats || stats; return !state.over; } } catch {}
  return false;
}
function newRound() { state = newGame(settings.game, settings.rules()); stats = { biggest: 0, captures: 0, started: Date.now() }; layoutFromState(state); refreshStatic(); $('#gameover').hidden = true; deselect(); save(); paintRules(); setTimeout(() => say('start'), 600); }
function kickAi() { if (state.turn === them && !state.over) (async () => { busy = true; await wait(400); busy = false; react('think'); const m = await aiMove(state); if (mood === 'think') react('calm'); if (m !== null) { select(m); await wait(500); await play(m); } })(); }
function undo() {
  if (busy || online || state.moves.length < 2) return;
  const moves = state.moves.slice(0, state.turn === you ? -2 : -1);
  state = replay(moves, state.variant, state.rules); layoutFromState(state); refreshStatic(); deselect(); save(); click(0.7, 0.06); say('undo');
}
function paintRules() { $('#rulesNcho').hidden = state.variant !== 'ncho'; $('#rulesAyo').hidden = state.variant !== 'ayo'; $('#gameName').textContent = state.variant === 'ncho' ? 'Nchò' : 'Ayo'; }

// ---------- first-game tutorial: three tips, then never again ----------
const TIPS = [
  'Your six pits are the column nearest you, on the right. Tap one with seeds: brass marks show where its seeds will go. Tap again to sow.',
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
  if (!shoutMenu.hidden) toggleShoutMenu(false); // a tap on the board closes the shout row
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
  const wasDrag = dragged; down = null; if (wasPinch || wasDrag || !canPress()) return;
  ptr.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(board.targets)[0]; if (!hit) return deselect();
  pressPit(hit.object.userData.pit);
});
canvas.addEventListener('wheel', (e) => { dist += e.deltaY * 0.001; clampDist(); }, { passive: true });
// may a pit be pressed right now? (your move, the board showing, nothing in flight, a friend across the board if online)
function canPress() { return !(busy || state.over || state.turn !== you || body.classList.contains('screen') || (puzzle.on && puzzle.played) || (online && !friend)); }
// a press on a pit — a tap, a click, a digit, or Enter on its hidden button: first press picks it, the second sows it
function pressPit(pit) {
  if (!canPress()) return false;
  const legal = legalMoves(state);
  if (!legal.includes(pit)) { if (owner(pit) === you && state.pits[pit] > 0) $('#hint').textContent = 'you must give the other side seeds'; else shake(pit); return false; }
  if (selected === pit) sow(pit); else select(pit);
  return true;
}
function sow(pit) { if (puzzle.on) puzzlePlay(pit); else if (online) sendMove(pit); else play(pit); }
// the keyboard (the Mac, or a Fold with one): 1–6 pick your pits near to far, Enter sows, U undoes, H hints, Esc puts the pit back or closes a card
addEventListener('keydown', (e) => {
  if (e.defaultPrevented) return;
  const t = e.target; const a = keyAction(e, { tag: t && t.tagName, editable: !!(t && t.isContentEditable), you });
  if (!a) return;
  if (a.type === 'deselect') { // Esc closes what is open, nearest first
    if (!shoutMenu.hidden) toggleShoutMenu(false); else if (!$('#rules').hidden) $('#rules').hidden = true; else if (selected !== null && !busy) deselect(); else return;
    return e.preventDefault();
  }
  if (body.classList.contains('screen') || !$('#gameover').hidden || !$('#nameCard').hidden || !$('#knockCard').hidden) return; // keys play the board, not the screens or a card
  if (!keysUsed) { keysUsed = true; body.classList.add('keys'); showTurn(); } // from now on the hint line talks keys and your pits' badges show their key
  e.preventDefault();
  if (a.type === 'pit') { if (canPress()) pressPit(a.pit); else click(0.5, 0.04); }
  else if (a.type === 'sow') { if (selected !== null) pressPit(selected); else if (canPress()) $('#hint').textContent = hintText('pick', { keys: true }); }
  else if (a.type === 'undo') undo();
  else if (a.type === 'hint') hint();
});
function shake(pit) { const [x, z] = pitCenters[pit]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true; tween(260, (t) => { board.ring.position.x = x + Math.sin(t * Math.PI * 4) * 0.006 * (1 - t); }).then(() => { if (selected === null) board.ring.visible = false; else { board.ring.position.x = pitCenters[selected][0]; board.ring.position.z = pitCenters[selected][1]; } }); click(0.5, 0.05); }

$('#undo').addEventListener('click', undo);
$('#hintBtn').addEventListener('click', hint);
$('#rematch').addEventListener('click', () => { if (online) { if (net.rematch()) { $('#rematch').textContent = `Waiting for ${oppLabel()}…`; $('#rematch').disabled = true; click(1.3, 0.08); } return; } newRound(); showScreen('play'); });
$('#rulesBtn').addEventListener('click', () => { $('#rules').hidden = !$('#rules').hidden; });
$('#rulesClose').addEventListener('click', () => { $('#rules').hidden = true; });
const soundBtn = $('#soundBtn'); const paintSound = () => soundBtn.setAttribute('aria-pressed', soundOn());
soundBtn.addEventListener('click', () => { prefs.set('sound', soundOn() ? '0' : '1'); paintSound(); click(1, 0.08); }); paintSound();

// ---------- start ----------
paintRules(); paintMyName(); layoutFromState(state); refreshStatic();
if (roomParam === 'new') openRooms(); // the old way in: the Rooms screen now
else if (roomParam) startOnline(roomParam); // an invite link: straight to the board, knocking
else if (params.get('still')) { // a render for Meka: a mid-game position with pit 4 selected
  state.pits = [4, 3, 2, 6, 1, 5, 4, 2, 7, 0, 3, 0]; state.stores = [8, 5]; layoutFromState(state); refreshStatic(); select(3); showScreen('play');
} else if (params.get('puzzle')) { // the shared link, and the render: straight to today's puzzle
  openPuzzle(); if (location.search && !params.get('capture')) history.replaceState(null, '', location.pathname);
} else if (params.get('capture') && !params.get('stay')) { // the smoke test starts straight into a game
  newRound(); showScreen('play'); if (tipStep === 0) { showTip(TIPS[0]); }
} else {
  showScreen('home'); if (tipStep === 0) $('#playBtn').addEventListener('click', () => showTip(TIPS[0]), { once: true });
}

window.__ayo = { react, get busy() { return busy; }, get room() { return net ? { code: net.code, seat: net.seat, status: net.status, friend, knock: net.knock, knocks: (net.room && net.room.knocks) || [] } : null; }, pitAt: (i) => { v3.set(pitCenters[i][0], BT, pitCenters[i][1]).project(camera); return [(v3.x * 0.5 + 0.5) * canvas.clientWidth, (-v3.y * 0.5 + 0.5) * canvas.clientHeight]; }, get mood() { return mood; }, get quality() { return { ...quality, tier: Q, physics: PHYS.physics, physicsReason: PHYS.reason }; }, get streak() { return streak; }, get record() { return records; }, get level() { return level; }, get seedSet() { return seedSetId(); }, get state() { return state; }, get legal() { return legalMoves(state); }, tryPit: (i) => puzzle.p ? attempt(puzzle.p, i).got : null, get puzzle() { return puzzle.p ? { on: puzzle.on, played: puzzle.played, got: puzzle.got, key: puzzle.p.key, target: puzzle.p.target, answer: puzzle.p.answer, daily } : null; }, get selected() { return selected; }, get path() { return path; }, get marks() { const M = board.marks; return { steps: M.steps.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), caps: M.caps.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), end: M.end.visible }; }, clip: () => recordClip(false), shout: (id) => sendShout(id), hitTest: (x, y) => { ptr.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera); return ray.intersectObjects(board.targets).map((h) => h.object.userData.pit); } };

// the render loop stops while the tab is hidden and restarts when it comes back; only ever one loop at a time
let frames = 0, last = performance.now(), running = false;
function loop(now) {
  runTweens(now); sim.step((now - last) / 1000, now); if (pathGlow && !reduceMotion) board.marks.end.material.opacity = 0.34 + 0.1 * Math.sin(now / 240); if (idle && !reduceMotion) theta += (now - last) * 0.00004; else if (cinematic && !reduceMotion) theta += (now - last) * 0.000025; /* the clip drifts slowly round the board */ last = now; placeCam(); placeBadges(); renderer.render(scene, camera); frames++;
  if (frames === 3) { window.__done = true; if (params.get('still')) { running = false; return; } }
  if (window.__freeze || document.hidden) { running = false; return; }
  requestAnimationFrame(loop);
}
function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
document.addEventListener('visibilitychange', () => { if (!document.hidden && !window.__freeze && !params.get('still')) start(); });
start();
