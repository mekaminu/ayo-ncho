// The game: engine state → 3D seeds, animated move by move. Every move the picture shows comes from engine events.
import * as THREE from 'three';
import { newGame, applyMove, legalMoves, replay, owner, firstMover, RULES } from '/engine/ayo.js';
import { SeedSim } from './physics.js';
import { CHARACTERS, line, faceFor, MOOD_FOR, runLine as runWord, RUN_MOOD } from './characters.js';
import { parse as parseRecord, record as recordGame, standing, cardLine as recordLine } from './record.js';
import { decideQuality, decidePhysics, browserEnv, tier } from './quality.js';
import { parse as parseStreak, recordDay, unlocked, homeLine, MILESTONES } from './streak.js';
import { bestTurn, clipPace, clipCaption } from './clip.js';
import { dailyPuzzle, attempt, shareText, todayKey } from '../engine/puzzle.js';
import { parse as parseDaily, record as recordDaily, entry as dailyEntry, solvedRun, cardLine, resultLabel, runLine, dayLabel, canShow, markShown } from './daily.js';
import { Online, stateFrom, inviteLink, cleanCode, inviteText, whatsappLink } from './online.js';
import { startApp, backStep, haptic, wsUrl, publicBase, linkable, legalLink, inApp } from './app.js';
import { parseOwned, previewOf, levelOpen, playable, lockedWords, GOLD_LEVELS } from './entitle.js';
import { SHOUTS, shoutText, shoutKnocks, SHOUT_GAP_MS, SHOUT_SHOW_MS } from './shouts.js';
import { keyAction, pitKey, pitLabel, pitEnabled, hintText } from './keys.js';
import { hurried, squeeze, longTurn, canHurry, hurryWords, HURRY_FLY_MS } from './hurry.js';
import { sowPath, pickedHint, hintedHint, playedWords, answerOf, giftNoteWords } from './path.js';
import { takeOn as judgeMove, takeWords, takeLine, NAME as COACH } from './coach.js';
import { NAMES as LNAMES, PLAY_SUB as LOCAL_SUB, seatOf, swingTheta, badgeFlip, turnWords as localTurn, overTitle as localTitle, continueLine as localContinue, undoTo as localUndo, shareText as localShare } from './local.js';
import { buildBoard, buildTable, buildLights, seedMaterialFor, seedGeometryFor, SEED_SETS, pitCenters, storeCenters, surfaceY, PIT_R, PIT_D, STORE_RX, STORE_RZ, STORE_D, STORE_FLAT, BT, BW, BL, R as CORNER } from './board.js';
import { pour, place, reach } from './slots.js';
import { boardAudio } from './sound.js';
import { inLast8, crossed as crossedLast8, last8Words, crossedWords } from './last8.js';
import { gameStory, storyWords, storyPath } from './story.js';
import { handSteps, handText, handShown, haulKind } from './handcount.js';
import { parseStarts, recordStart, nextStart, startWords } from './starts.js';
import { makeAway } from './away.js';
import { hoverAt } from './hover.js';
import { HOLD_MS, COUNT_STAY_MS, countPlan, canCount, stillHolding, countWords } from './count.js';
import { mayAsk as mayAskBack, backWords, planReturn, undoPlan, undoWords } from './takeback.js';
import { narrowOf, feedWords, onlyLead } from './feed.js';
import { circling as circlingOf, began as beganCircling, circlingRest, circlingWords, beganWords as circlingBegan, endedCircling, endedWords as circlingEnded, CALLING } from './circling.js';
import { makeWake, wakeNote } from './wake.js';
import { STEPS as LESSON, DONE as LESSON_DONE, startState as lessonStart, eyebrow as lessonEyebrow, SKIP as LESSON_SKIP, replyWords as lessonReply, wrongPit as LESSON_WRONG, isNewPhone, lessonDue, firstLevel, nextUp } from './lesson.js';
import { makeGuard, BUTTON as GIVEUP, BUTTON_KEYS as GIVEUP_KEYS, gaveUpWords, mayGiveUp, ARM_MS as GIVEUP_MS } from './giveup.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const GOLD_PREVIEW = previewOf(location.search); // ?try=master: Papa Ike open for this visit (until Gold can be bought)
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const prefs = { get: (k, d) => { try { return localStorage.getItem('ayo.' + k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('ayo.' + k, v); } catch {} } };
// a new phone (nothing of the game kept on it): its first Play opens the lesson and it starts against Adaeze (web/lesson.js);
// the scripted renders (?capture) are never one unless they ask with ?lesson=1
const newPhone = params.get('lesson') === '1' || (!params.get('capture') && isNewPhone((k) => prefs.get(k, null)));

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
  for (const k in homes) homes[k].forEach((m, i) => { if (!sim.has(m)) put(m, slotPose(k === 'S0' || k === 'S1' ? k : +k, i, m)); });
}
const sim = new SeedSim(surfaceY);

// camera: the board upright in your hands, you at the near end
let baseTheta = 0; /* π when you hold the far seat of an online room: your pits still nearest you */ let theta = 0, phi = 0.72, dist = 1.55; const target = new THREE.Vector3(0, 0.02, 0.02);
function placeCam() { camera.position.set(target.x + dist * Math.sin(phi) * Math.sin(theta), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.cos(theta)); camera.lookAt(target); }
let wide = null, fitDist = 1.55;
// The board's edge, along its top and its foot: all of it has to be on screen.
const EDGE = []; const vp = new THREE.Vector3();
for (const [sx, sz, a0] of [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI], [1, -1, Math.PI * 1.5]]) for (let i = 0; i <= 6; i++) {
  const a = a0 + i / 6 * Math.PI / 2, x = sx * (BW / 2 - CORNER) + CORNER * Math.cos(a), z = sz * (BL / 2 - CORNER) + CORNER * Math.sin(a); EDGE.push([x, BT, z], [x, 0, z]);
}
function onScreen(w, h) { // the board's box on screen, in px
  camera.updateMatrixWorld(); let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
  for (const [x, y, z] of EDGE) { vp.set(x, y, z).project(camera); const px = (vp.x + 1) / 2 * w, py = (1 - vp.y) / 2 * h; l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py); }
  return { l, r, t, b };
}
// the room the bars leave for the board, measured from the page (so it follows the notch, the home bar and the fonts)
function room(w, h) {
  const top = $('.hud.top').getBoundingClientRect(), bot = $('.hud.bottom').getBoundingClientRect(), bar = $('.bar').getBoundingClientRect();
  if (wide) return { l: Math.max(top.right, bot.right) + 16, r: Math.min(w, bar.left) - 16, t: top.top + 40, b: h - 18 }; // the scores down the left, the buttons down the right, the hint line across the top
  return { l: 14, r: w - 14, t: top.bottom + 10, b: bot.top - 48 }; // between the opponent's row and the hint line over your row (room for two lines of it)
}
// Frame the board: all of it, both troughs and every pit, in the room the bars leave, whatever the screen's shape (a tall
// phone, a Fold opened out, a laptop): the camera stands back just as far as it must and the picture is moved to sit in
// the middle of that room. A squarer screen looks a little more along the board, so the board can be bigger on it.
// (30 Oct: on Meka's Fold the near trough sat under the buttons.) Pinch and the wheel zoom from here.
function frame() {
  const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
  const R = room(w, h), fw = Math.max(80, R.r - R.l), fh = Math.max(80, R.b - R.t);
  phi = wide ? 0.5 : 0.72 + 0.14 * Math.min(1, Math.max(0, (1.5 - fh / fw) / 0.6));
  const th = theta; theta = 0; camera.clearViewOffset();
  let lo = 0.5, hi = 8;
  for (let i = 0; i < 22; i++) { dist = (lo + hi) / 2; placeCam(); const b = onScreen(w, h); if (b.r - b.l <= fw && b.b - b.t <= fh) hi = dist; else lo = dist; }
  dist = fitDist = hi; placeCam(); const b = onScreen(w, h);
  camera.setViewOffset(w, h, ((b.l + b.r) - (R.l + R.r)) / 2, ((b.t + b.b) - (R.t + R.b)) / 2, w, h);
  theta = th; placeCam();
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const nowWide = w > h * 1.1; if (nowWide !== wide) { wide = nowWide; theta = baseTheta; }
  document.documentElement.classList.toggle('wide', wide);
  frame();
}
addEventListener('resize', resize); resize();
if (document.fonts) document.fonts.ready.then(frame); // the bars settle their height once the fonts are in

// ---------- seeds ----------
// Each seed is a mesh with a home (pit index 0..11, or 'S0'/'S1' for the stores) and a slot number in that home.
const seeds = []; // all 48 meshes
const homes = { S0: [], S1: [] }; for (let i = 0; i < 12; i++) homes[i] = [];
let rs = 11; const rnd = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };

// Where seeds lie (slots.js pours them in): the k-th seed of a pit or trough always has the k-th spot, so a pit of four
// is four seeds at the bottom and a winner's seeds lie as a bed in the trough, below the rim, not heaped over it.
const SHAPES = { pit: { rx: PIT_R, rz: PIT_R, depth: PIT_D }, store: { rx: STORE_RX, rz: STORE_RZ, depth: STORE_D, flat: STORE_FLAT }, hand: { rx: 0.062, rz: 0.062, depth: 0.016 } };
const HAND_Y = 0.07; // the hand holds the seeds this far over the board
const seedDims = () => { const [a, b, c] = SET.r; return { a: (a + c) / 2 * 0.98, b }; };
const poured = {};
function spots(kind) { const key = seedSetId() + ':' + kind; return poured[key] || (poured[key] = pour(SHAPES[kind], seedDims(), 48, kind.length)); }
function bowlOf(home) { const store = typeof home === 'string'; return { store, c: store ? storeCenters[+home[1]] : pitCenters[home], turn: store ? (home === 'S1' ? Math.PI : 0) : home * 2.39996 }; }
function slotPose(home, k, m) { // where the k-th seed of a home lies, and how it lies there
  const { store, c, turn } = bowlOf(home); const list = spots(store ? 'store' : 'pit');
  const p = place(list[Math.min(k, list.length - 1)], c[0], c[1], BT, turn);
  if (m) p.y += SET.r[1] * (m.userData.jit[1] - 1); // a bigger seed sits a touch higher
  return p;
}
const handPose = (pit, k) => place(spots('hand')[Math.min(k, 47)], pitCenters[pit][0], pitCenters[pit][1], BT + HAND_Y, pit * 1.3);
function put(m, p) { m.position.set(p.x, p.y, p.z); m.rotation.set(p.rx, p.ry, p.rz); }
function makeSeed() {
  const m = new THREE.Mesh(seedGeometry, seedMat); m.rotation.order = 'XZY'; // turned to its yaw, then leant with what it rests on (slots.js)
  m.userData.jit = [0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2]; // each seed its own size, kept across seed sets
  m.scale.set(SET.r[0] * m.userData.jit[0], SET.r[1] * m.userData.jit[1], SET.r[2] * m.userData.jit[2]);
  m.rotation.set(rnd() * 0.6 - 0.3, rnd() * Math.PI * 2, rnd() * 0.6 - 0.3);
  m.castShadow = true; m.receiveShadow = true; scene.add(m); seeds.push(m); return m;
}
function settle(m, home) { // put a seed at rest in a home (no animation)
  homes[home].push(m); m.userData.home = home; moved(m); put(m, slotPose(home, homes[home].length - 1, m));
}
const moved = (m) => { m.userData.v = (m.userData.v || 0) + 1; }; // a seed on the move: anything rocking it lets go
function layoutFromState(s) { // rebuild every seed's home from an engine state (used for new game, undo, resume)
  sim.finish(); for (const k in homes) homes[k].length = 0;
  let n = 0;
  const take = () => seeds[n++] || makeSeed();
  s.pits.forEach((c, i) => { for (let j = 0; j < c; j++) settle(take(), i); });
  for (let j = 0; j < s.stores[0]; j++) settle(take(), 'S0');
  for (let j = 0; j < s.stores[1]; j++) settle(take(), 'S1');
  seeds.forEach((m, k) => { m.visible = k < n; }); // a board with fewer than 48 seeds (the lesson's) puts the rest away
}

// ---------- tweens ----------
const tweens = [];
function tween(ms, step, ease = (t) => t) {
  return new Promise((res) => { if (reduceMotion) ms = Math.min(ms, 40); ms = hurried(ms, hurry.on); tweens.push({ t0: performance.now(), ms, step, ease, res }); });
}
function runTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; const t = Math.min(1, (now - tw.t0) / tw.ms); tw.step(tw.ease(t));
    if (t >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}
const easeOut = (t) => 1 - (1 - t) ** 3, easeIn = (t) => t * t, easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : hurried(ms, hurry.on)));
// tap to hurry (web/hurry.js): while a turn plays, a tap on the board or Space plays the rest of it faster; the next turn is back at your speed
const hurry = { on: false, depth: 0, words: false, base: '' };
function hurryNow() {
  if (!canHurry({ animating: hurry.depth > 0, clipping, screen: body.classList.contains('screen'), already: hurry.on })) return false;
  hurry.on = true; const now = performance.now(); for (const tw of tweens) tw.ms = squeeze(tw, now); // what is already moving speeds up too
  if (hurry.words) $('#hint').textContent = hurryWords(hurry.base, { on: true });
  click(1.6, 0.04); buzz(6); return true;
}

// move one seed along an arc from where it is to its spot (no physics: the weakest phones, reduced motion, a hurried
// turn); `hit(k, onSeed)` sounds it landing, and again, softly, on its little hop
function fly(m, home, ms = 170, lift = 0.06, hit = null) {
  const from = m.position.clone(), r0 = m.rotation.clone(); homes[home].push(m); m.userData.home = home; moved(m); const to = slotPose(home, homes[home].length - 1, m);
  const turn = (a, b) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)); const rx = turn(r0.x, to.rx), ry = turn(r0.y, to.ry), rz = turn(r0.z, to.rz);
  return tween(ms, (t) => {
    m.position.lerpVectors(from, to, t); m.position.y += Math.sin(t * Math.PI) * lift;
    m.rotation.set(r0.x + (rx - r0.x) * t, r0.y + (ry - r0.y) * t, r0.z + (rz - r0.z) * t);
  }, easeInOut).then(() => { put(m, to); if (hit) hit(0.7, !to.wood); return reduceMotion ? null : tween(90, (t) => { m.position.y = to.y + Math.sin(t * Math.PI) * 0.005; }).then(() => { if (hit) hit(0.12, !to.wood); }); });
}

// drop a seed into a bowl: carried over and let go just above its spot, it falls, bounces off the wood or the seeds
// below, rolls into place and nestles; the bowl's wall keeps it in (physics.js). Seeds it lands on rock a little.
// (With physics off the seed still flies pit to pit in a small arc and lands in its spot: every move is shown.)
// `landed()` runs the moment it first touches down (the pit's count, the score), with its sound and a tap on the phone.
function drop(m, home, landed = null) {
  const d = Math.hypot(m.position.x - bowlOf(home).c[0], m.position.z - bowlOf(home).c[1]); // sowing next door ~0.15 m, a capture across the board up to ~0.9 m
  let first = true; const store = typeof home === 'string';
  const hit = (k, onSeed) => { land(k, onSeed, m.position, home); if (first) { first = false; buzz(store ? 12 : 8); if (landed) landed(); } };
  if (hurry.on) return fly(m, home, HURRY_FLY_MS, 0.04, hit); // hurried: a quick arc straight to its spot
  if (!PHYS.physics || reduceMotion) return fly(m, home, reduceMotion ? 40 : Math.round(180 + 260 * d), 0.03 + 0.1 * d, hit);
  const k = homes[home].length, under = homes[home].slice(); homes[home].push(m); m.userData.home = home; moved(m);
  const { c } = bowlOf(home), seed = seedDims(), { ix, iz } = reach(SHAPES[store ? 'store' : 'pit'], seed);
  const below = under.map((o, j) => { const q = slotPose(home, j, o); return [q.x, q.y, q.z]; });
  const to = slotPose(home, k, m);
  return sim.toss(m, to, {
    flight: 0.2 + 0.3 * d, arc: 0.012 + 0.12 * d, bowl: { cx: c[0], cz: c[1], ix, iz }, under: below, seed,
    onBounce: hit, onNudge: (j, s) => rock(under[j], s), // every bounce sounds, the first loudest: on the wood a tok, on a seed a clack
  }).then(() => { if (first) hit(0.25, !to.wood); }); // a seed that slid in without a bounce still lands
}
// a seed another lands on rocks a little where it lies, then is still again
function rock(m, s) {
  if (!m || s < 0.2 || m.userData.rocking) return; m.userData.rocking = true;
  const v = m.userData.v, x0 = m.rotation.x, z0 = m.rotation.z, a = 0.05 + 0.12 * s, sx = rnd() < 0.5 ? -1 : 1, sz = rnd() - 0.5;
  tween(280, (t) => { if (m.userData.v !== v) return; const w = Math.sin(t * Math.PI * 2.5) * (1 - t) * a; m.rotation.x = x0 + w * sx; m.rotation.z = z0 + w * sz; })
    .then(() => { if (m.userData.v === v) { m.rotation.x = x0; m.rotation.z = z0; } m.userData.rocking = false; });
}

// carry a seed to a pose (a place in the hand), bowing up `lift` on the way
function hold(m, to, ms, lift) {
  const from = m.position.clone(), r0 = m.rotation.clone(), v = m.userData.v, h = m.userData.h = (m.userData.h || 0) + 1; // a newer hold, or a drop, takes over
  return tween(ms, (t) => { if (m.userData.v !== v || m.userData.h !== h) return; m.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * lift, from.z + (to.z - from.z) * t); m.rotation.set(r0.x + (to.rx - r0.x) * t * 0.5, r0.y, r0.z + (to.rz - r0.z) * t * 0.5); }, easeOut);
}

// ---------- sound (made on the device, no audio files: web/sound.js) ----------
let audio = null; const soundOn = () => prefs.get('sound', '1') === '1';
function sound() { // the board's audio, made on first use (a tap always comes first, so the phone lets it play)
  if (!audio) audio = boardAudio(new (window.AudioContext || window.webkitAudioContext)());
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio;
}
const TUNE = [1, 0.95, 1.05, 0.98, 1.07, 0.93, 1.02, 0.96, 1.06, 0.99, 0.94, 1.04]; // each pit carved by hand, each its own note
const tuneOf = (home) => typeof home === 'string' ? 0.78 : TUNE[home] || 1; // the troughs, bigger and deeper, sound lower
const at = (pit) => ({ x: pitCenters[pit][0], y: BT, z: pitCenters[pit][1] });
function panOf(p) { if (!p) return 0; vp.set(p.x, p.y, p.z).project(camera); return Math.max(-0.6, Math.min(0.6, vp.x * 0.55)); } // left of the screen, more in the left ear
// a seed touching down: the physics says when, how hard (0..1) and whether on the wood or on another seed
function land(k, onSeed, p, home) { if (!soundOn()) return; try { sound().land(k, onSeed, panOf(p), tuneOf(home)); } catch {} }
// a tap on the wood: the buttons, a knock at the door, the chimes
function click(pitch = 1, gain = 0.12) { if (!soundOn()) return; try { sound().tap(pitch, gain); } catch {} }
// a handful of seeds scooped up: quick small clacks as they jostle in the hand
function rattle(n, p) { if (!soundOn()) return; try { sound().rattle(n, panOf(p)); } catch {} }
const buzz = (ms) => { if (prefs.get('haptics', '1') !== '1') return; if (!haptic(ms) && navigator.vibrate) navigator.vibrate(ms); }; // the app's own haptics, else the browser's

// ---------- HUD ----------
const badges = []; const badgeLayer = $('#badges');
for (let i = 0; i < 12; i++) { const b = document.createElement('span'); b.className = 'badge'; badgeLayer.appendChild(b); badges.push(b); }
const v3 = new THREE.Vector3();
function placeBadges() {
  const w = canvas.clientWidth, h = canvas.clientHeight; const show = prefs.get('badges', '1') === '1';
  pitCenters.forEach(([x, z], i) => {
    const flip = badgeFlip(theta); // seen from the far end (the far seat of a room, or two of us passing the phone) the board is the other way round: badges stay at the outer, nearer corner of each pit
    v3.set(x + (i < 6 ? PIT_R * 0.7 : -PIT_R * 0.7), BT + 0.01, z + PIT_R * 0.75 * flip).project(camera);
    const b = badges[i]; b.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px)`; b.hidden = !show;
  });
}
// the hand counts (web/handcount.js): a brass number over the sowing hand, ticking down as each seed leaves, and a copper
// "+8" over the hand that sweeps up a capture; both ride the seeds they count, so they follow the hand wherever it goes
const hands = { sow: { el: null, seeds: null }, haul: { el: null, seeds: null }, log: [] }; // the log is what the render check reads
for (const k of ['sow', 'haul']) { const el = document.createElement('span'); el.className = 'handc ' + k; el.hidden = true; badgeLayer.appendChild(el); hands[k].el = el; }
const hv = new THREE.Vector3();
// count a pit by touch (below, by the input): its number rides over the pit, placed with the hands each frame
const holding = { timer: null, x: 0, y: 0, done: false };
const counting = { el: null, pit: null, run: 0, words: null, base: null, log: [] };
{ const el = document.createElement('span'); el.className = 'handc count'; el.hidden = true; badgeLayer.appendChild(el); counting.el = el; }
function setHand(k, seedsHeld, n, glint = false) {
  const H = hands[k]; const on = handShown(prefs.get('badges', '1') === '1', clipping) && n > 0 && seedsHeld && seedsHeld.length;
  H.seeds = on ? seedsHeld : null; H.el.hidden = !on; if (hands.log.length < 400) hands.log.push(k + ':' + (on ? handText(n, k) : '-')); if (!on) return;
  const t = handText(n, k); if (H.el.textContent !== t) { H.el.textContent = t; if (!reduceMotion) { H.el.classList.remove('tick'); void H.el.offsetWidth; H.el.classList.add('tick'); } }
  if (glint && !reduceMotion) { H.el.classList.remove('again'); void H.el.offsetWidth; H.el.classList.add('again'); }
  placeHands();
}
function hideHands() { setHand('sow', null, 0); setHand('haul', null, 0); }
function placeHands() {
  const w = canvas.clientWidth, h = canvas.clientHeight; if (counting.pit !== null) { if (body.classList.contains('screen')) endCount(); else placeCount(); }
  for (const k of ['sow', 'haul']) {
    const H = hands[k]; if (!H.seeds) continue;
    let x = 0, y = -1, z = 0; for (const m of H.seeds) { x += m.position.x; z += m.position.z; y = Math.max(y, m.position.y); }
    hv.set(x / H.seeds.length, y + 0.045, z / H.seeds.length).project(camera);
    H.el.style.transform = `translate(${(hv.x * 0.5 + 0.5) * w}px, ${(-hv.y * 0.5 + 0.5) * h}px)`;
  }
}
function setBadge(i, n) { badges[i].textContent = n; badges[i].classList.toggle('zero', n === 0); if (n === 0) badges[i].classList.remove('last'); } // an emptied pit drops out of the last 8's glow at once
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
  paintLast8(); paintCircling(); paintFeed();
}
// ---------- the last 8 (Nchò): once 8 seeds or fewer are left on the board, whoever captures next takes them all ----------
// web/last8.js counts and words it; the engine does the sweep. While it holds, a brass line sits under the board and the count badges of the
// pits still holding seeds glow brass; the move that brings the board down to 8 makes the seeds left hop and glint, with a chime and a word
// from the opponent. Not in the puzzle (it has its own ask) or while a turn is being watched again.
const last8El = $('#last8'); const last8 = { hops: 0 };
function paintLast8() {
  const on = inLast8(state) && !puzzle.on && !replaying;
  last8El.hidden = !on; if (on) $('#last8Words').textContent = last8Words(state);
  badges.forEach((b, i) => b.classList.toggle('last', on && state.pits[i] > 0));
}
function last8Moment() {
  if (puzzle.on) return; paintLast8(); last8El.classList.remove('new'); void last8El.offsetWidth; last8El.classList.add('new');
  last8El.setAttribute('aria-label', crossedWords(state)); buzz([20, 50, 20, 50, 40]); say('last8');
  [1.5, 2.0].forEach((p, k) => setTimeout(() => click(p, 0.08), 120 + k * 150)); // a two-note chime on the wood
  if (reduceMotion) return;
  const lit = [...Array(12).keys()].filter((i) => homes[i].length); // every seed left on the board hops and comes down in its own place, pit by pit
  lit.forEach((i, k) => setTimeout(() => {
    const ms = homes[i].map((m) => [m, m.position.y]); last8.hops++;
    rattle(Math.min(ms.length, 4), at(i));
    tween(320, (t) => { const h = Math.sin(t * Math.PI) * 0.022; ms.forEach(([m, y0], j) => { m.position.y = y0 + h * (1 - j * 0.08); }); }).then(() => ms.forEach(([m, y0]) => { m.position.y = y0; }));
  }, 260 + k * 70));
}
// ---------- the game is circling (web/circling.js): 60 moves with no capture and the engine calls the game, each side keeping its own seeds ----------
// From 12 moves before the call a brass line sits under the board, its number ticking down each move ("12 moves with no capture and it ends ·
// each keeps their side: you'd win 26–22"), the edge turning ember for the last 3; a capture takes it away. The move it starts on sends a slow
// ripple round the board, pit after pit in sowing order, through every pit still holding seeds, with a low knock and the opponent's word.
const circEl = $('#circling'); const circ = { left: null, ripples: 0 };
const circOpts = () => (local ? { you, me: LNAMES[you] } : { you });
function paintCircling() {
  const c = !puzzle.on && !replaying ? circlingOf(state) : null;
  circEl.hidden = !c; if (!c) { circ.left = null; return; }
  const n = $('#circlingLeft'); if (circ.left !== c.left) { n.textContent = c.left; if (circ.left !== null) { n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); } circ.left = c.left; }
  $('#circlingWords').textContent = circlingRest(c, circOpts()); circEl.classList.toggle('calling', c.left <= CALLING);
  circEl.setAttribute('aria-label', circlingWords(c, circOpts()));
}
function circlingMoment() {
  if (puzzle.on) return; paintCircling(); const c = circlingOf(state); if (!c) return;
  circEl.classList.remove('new'); void circEl.offsetWidth; circEl.classList.add('new');
  circEl.setAttribute('aria-label', circlingBegan(c)); buzz([15, 60, 15]); say('circling'); circ.first = { left: String(c.left), words: $('#circlingWords').textContent };
  [0.9, 0.75].forEach((p, k) => setTimeout(() => click(p, 0.07), 100 + k * 180)); // two low knocks: a warning, not a chime
  if (reduceMotion) return;
  const lit = [...Array(12).keys()].filter((i) => homes[i].length); // the ripple goes round the board the way the seeds have been going
  lit.forEach((i, k) => setTimeout(() => {
    const ms = homes[i].map((m) => [m, m.position.y]); circ.ripples++; click(1.7, 0.012);
    tween(380, (t) => { const h = Math.sin(t * Math.PI) * 0.014; ms.forEach(([m, y0]) => { m.position.y = y0 + h; }); }).then(() => ms.forEach(([m, y0]) => { m.position.y = y0; }));
  }, 300 + k * 110));
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
  get level() { return playable(prefs.get('level', firstLevel(newPhone)), owned(), GOLD_PREVIEW); }, // a Gold opponent this phone cannot open falls back to Mama Ngozi
  get speed() { return prefs.get('speed', 'normal'); },
  get mode() { return prefs.get('mode', 'ai'); }, // 'ai': the chosen opponent · 'local': two of us on this phone
};
const PACES = { slow: 230, normal: 150, fast: 90 };
let PACE = PACES[settings.speed] || 150;
let you = 0, them = 1; // engine seats: against the computer you are always 0; in a room you take the seat the server gives you; two of us: the player to move
// two of us on one phone (web/local.js): no computer plays; after each move the near seat passes to the other player and the board swings
// round to face them (Settings → Feel → Pass the phone — off when the Fold lies flat between you and each side already has its pits nearest it)
let local = false; const swingOn = () => prefs.get('swing', '1') === '1';
function seat(s) { you = s; them = 1 - s; baseTheta = s === 1 ? Math.PI : 0; } // the near seat (the camera gets there by the screen's swing, or passTurn's)
async function passTurn() { // two of us: the player to move takes the near seat; the board turns on round to face them, never back the way it came
  const s = seatOf(state); if (s === you) return;
  busy = true; deselect(); seat(s);
  if (swingOn()) { const from = theta, to = swingTheta(theta, s); click(1.1, 0.04); await tween(700, (t) => { theta = from + (to - from) * t; }, easeInOut); }
  busy = false; refreshStatic();
}
const names = { easy: 'Adaeze', medium: 'Nnamdi', hard: 'Mama Ngozi', master: 'Papa Ike' };
const levelLabel = (l) => `${names[l]} · ${l[0].toUpperCase() + l.slice(1)}`;
let state = newGame(settings.game, settings.rules()); let busy = false; let selected = null; let level = settings.level;
let stats = { biggest: 0, captures: 0, started: Date.now() };
// your record against each opponent, kept on this phone (web/record.js): wins–losses and your best win, on their Home pill and the Game over card
let records = parseRecord(prefs.get('record', null));
// who starts (web/starts.js): as at a real board the loser of the last game against this opponent (or between the two of you) moves first;
// Settings → Rules → Who starts can make it always you or always them. A room's server already starts the loser.
let starts = parseStarts(prefs.get('starts', null));
const startsPref = () => prefs.get('starts.pref', 'loser');
const startKey = (two) => two ? 'local' : level;
const comingStart = (two = settings.mode === 'local') => nextStart(startsPref(), starts[startKey(two)]);
function paintRecordPills() { document.querySelectorAll('.pill[data-level] small.rec').forEach((s) => { s.textContent = standing(records[s.closest('.pill').dataset.level]); }); }

// ---------- a friend online: the board joins a room (?room=CODE from the invite link) and animates the moves the server sends ----------
// The server runs the same engine and is the referee; this board only asks for a move and shows what comes back. A move
// travels as a few dozen bytes (seat, pit, move count, scores): online.js rebuilds the seeds' path with the same engine, so a
// weak signal carries a whole game in less data than one photo; if a board ever disagrees it fetches the whole room.
const roomParam = params.get('still') ? null : params.get('room');
let online = false, roomWanted = null; // online while a room is open, knocked on or joined (from the Rooms screen, or ?room=CODE from an invite link); roomWanted: 'NEW' or the code asked for
let net = null, friend = null; // friend: the other seat as the server shows it {name, online, wantsRematch}, or null while the room waits
// your move, even in another tab: what the friend does while this page is out of sight is said on the tab's title, icon and the app's badge
let awayIcon = null; const awayIconLoad = () => { if (awayIcon === null) { awayIcon = ''; fetch('./icon.svg').then((r) => r.text()).then((t) => { awayIcon = t; }).catch(() => {}); } };
const away = makeAway({ doc: document, nav: navigator, icon: () => awayIcon, chime: () => { click(1.6, 0.07); setTimeout(() => click(2.1, 0.07), 150); } });
const awayNote = (kind, d = {}) => { if (online) away.note(kind, { name: friend ? friend.name : undefined, ...d }); };
const awayBack = () => { if (!isAwayNow()) away.back(); };
const isAwayNow = () => document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus());
for (const ev of ['focus', 'pointerdown', 'keydown']) addEventListener(ev, awayBack, true);
document.addEventListener('visibilitychange', awayBack);
// keep the screen on while a game is in play on the board (Settings → Feel → Keep the screen on); a phone put down still sleeps
const wakeOn = () => prefs.get('wake', '1') === '1';
let wakeSkew = 0; const wake = makeWake({ nav: navigator, now: () => Date.now() + wakeSkew }); // wakeSkew: render.py jumps the clock to check a phone put down
const wakeCheck = () => wake.check({ on: wakeOn(), board: body.classList.contains('playing'), over: !!state.over, hidden: document.hidden, online });
const wakePoke = () => { wake.poke(); wakeCheck(); };
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, wakePoke, true);
document.addEventListener('visibilitychange', wakeCheck); setInterval(wakeCheck, 15000);
const oppLabel = () => online ? (friend ? friend.name : 'Waiting for a friend') : local ? LNAMES[them] : levelLabel(level);
const defaultMe = $('#meName').textContent;
const myName = () => prefs.get('name', '') || defaultMe || 'Player';
function paintMyName() { const n = local ? LNAMES[you] : prefs.get('name', '') || defaultMe; $('#meName').textContent = n; $('#goMe span').textContent = n; } // two of us: the near card is whoever is to move
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
  if (ready) $('#waBtn').href = whatsappLink(net.code, inviteLink(net.code, publicBase())); else $('#waBtn').removeAttribute('href');
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
  away.back(); if (net) { net.leave(); net = null; } friend = null; online = false; roomWanted = null; you = 0; them = 1; baseTheta = 0; theta = 0; busy = false; prefs.set('room', 'null');
  $('#knockCard').hidden = true; hideBackCard(); backAsk.pending = false; backAsk.askedN = -1; body.classList.remove('online'); if (location.search) history.replaceState(null, '', location.pathname);
  hideExplain(); if (!resume()) state = newGame(settings.game, settings.rules()); layoutFromState(state); refreshStatic(); paintRules();
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
$('#copyBtn').addEventListener('click', async () => { if (!net || !net.code) return; const link = inviteLink(net.code, publicBase()); try { await navigator.clipboard.writeText(link); toast('Link copied'); click(1.3, 0.06); } catch { toast(link); } });
$('#shareLinkBtn').addEventListener('click', async () => {
  if (!net || !net.code) return; const link = inviteLink(net.code, publicBase());
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
function undoLabel(room) { const u = $('#undo'); const l = room ? backWords().chip : 'Undo'; if (u.getAttribute('aria-label') !== l) { u.setAttribute('aria-label', l); u.title = room ? l + ' · U' : 'Undo · U'; } if (!room) u.classList.remove('asking'); }
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
  $('#hint').textContent = state.over ? '' : waiting ? (net.code ? `Room ${net.code} · send your friend this page's link` : '') : mine ? pickHint('pick') : backAsk.pending && backAsk.n === state.moves.length ? backWords(friend.name).asked : '';
  $('#undo').disabled = link || !mayAskBack({ online, friend, seated: true, over: state.over, busy, moves: state.moves, turn: state.turn, you, pending: !!backAsk.pending, askedN: backAsk.askedN });
  $('#undo').classList.toggle('asking', !!backAsk.pending); undoLabel(true); $('#hintBtn').disabled = true; $('#shoutBtn').disabled = waiting || link;
}
// the line under the board on your move: for a finger, or for the keys once a mouse or a key press says there is a keyboard
// the chips under the board sit just above the hint line (on the Mac just below it), however many lines the hint wraps to
try { const h = $('#hint'); new ResizeObserver(() => document.body.style.setProperty('--hint-h', h.offsetHeight + 'px')).observe(h); } catch {}
function pickHint(phase) {
  const n = phase === 'pick' ? narrowNow() : null;
  if (selected === null) return feedWords(n, { you }) || hintText(phase, { keys: keysLikely() });
  const line = pickedHint(path, { you, keys: keysLikely(), key: pitKey(selected, you), seeds: state.pits[selected], answer });
  if (hinted && hinted.pit === selected && hinted.at === state.moves.length) return hintedHint(line, CHARACTERS.hard.name, { keys: keysLikely(), key: pitKey(selected, you) });
  if (!n || n.only !== selected) return line;
  const lead = onlyLead(n, { you }), dup = `pit ${pitKey(selected, you)} · `; // on the keys the line starts with the pit: say it once
  return `${lead} · ${lead.includes(dup.slice(0, -3)) && line.startsWith(dup) ? line.slice(dup.length) : line}`;
}
// ---------- feed them: when the rules narrow your move (web/feed.js), the board says so before you tap ----------
// their side empty, or a pit that would leave them nothing: a brass ring lands on each pit you may play, the barred pits' badges go dim and
// the hint line says why ("They have no seeds — you must feed them: pits 2 or 5"); with only one move it is picked for you (its path shows)
// and one more tap sows it. Offline, two of us and rooms; not in the puzzle, a replay, or on Home.
const feed = { key: null, auto: null, on: false, rings: [] };
function narrowNow() { return canPress() && !puzzle.on && !replaying ? narrowOf(state, you) : null; }
function paintFeed() {
  const n = narrowNow(), key = n ? `${state.moves.length}:${you}:${state.pits.join(',')}` : null;
  badges.forEach((b, i) => b.classList.toggle('barred', !!n && n.barred.includes(i)));
  const want = n && n.kind === 'feed' && n.legal.length > 1 && selected === null ? n.legal : [];
  feed.on = want.length > 0; feed.rings = want;
  board.may.forEach((m, i) => { if (!want.includes(i)) { m.visible = false; m.material.opacity = 0; } });
  if (want.length && key !== feed.key) { // a new position: the rings land one after another, near to far, with two soft knocks
    feed.key = key; const token = key; want.slice().sort((a, b) => (a - you * 6) - (b - you * 6)).forEach((pit, k) => {
      const m = board.may[pit]; m.visible = true; m.material.opacity = 0;
      setTimeout(() => { if (feed.key !== token || !feed.rings.includes(pit)) return; tween(320, (t) => { if (feed.key !== token || !feed.rings.includes(pit)) return; m.material.opacity = 0.75 * t; const sc = 1.25 - 0.25 * t; m.scale.set(sc, sc, 1); }, easeOut); }, reduceMotion ? 0 : 90 * k);
    });
    click(1.05, 0.04); setTimeout(() => click(1.25, 0.03), 140); buzz(12);
  } else for (const pit of want) { const m = board.may[pit]; if (!m.visible) { m.visible = true; m.material.opacity = 0.75; m.scale.set(1, 1, 1); } }
  if (!n) feed.key = null;
  // only one move: picked for you once per position (Esc puts it back and it stays back)
  if (n && n.only !== null && selected === null && feed.auto !== key) { feed.auto = key; select(n.only); }
}
// ---------- shouts: a fixed phrase sent by id to both boards; theirs pops by their face with a knock, yours sits by your name ----------
const shoutMenu = $('#shoutMenu'); let shoutAt = -1e9, myBubbleTimer = null;
for (const s of SHOUTS) { const b = document.createElement('button'); b.className = 'pill'; b.type = 'button'; b.textContent = s.text; b.dataset.id = s.id; b.addEventListener('click', () => sendShout(s.id)); shoutMenu.appendChild(b); }
// giving up: the last button in the row, apart from the phrases; it asks once more ("Tap again to give up") before it goes
const giveUp = document.createElement('button'); giveUp.className = 'pill giveup'; giveUp.type = 'button'; giveUp.id = 'giveUpBtn'; shoutMenu.appendChild(giveUp);
const giveGuard = makeGuard(); let giveTimer = null;
function paintGiveUp() { const armed = giveGuard.armed; giveUp.textContent = armed ? (keysLikely() ? GIVEUP_KEYS.armed : GIVEUP.armed) : GIVEUP.idle; giveUp.classList.toggle('armed', armed); giveUp.setAttribute('aria-label', armed ? 'Give up this game — press again to confirm' : 'Give up this game'); }
giveUp.addEventListener('click', () => {
  if (!mayGiveUp({ online, friend, over: state.over, seated: net && net.seat !== null })) return toggleShoutMenu(false);
  const r = giveGuard.tap(performance.now()); clearTimeout(giveTimer);
  if (r === 'armed') { paintGiveUp(); click(0.7, 0.08); buzz(15); giveTimer = setTimeout(() => { giveGuard.reset(); paintGiveUp(); }, GIVEUP_MS); return; }
  toggleShoutMenu(false); if (net.resign()) { click(0.55, 0.1); buzz([30, 40, 30]); }
});
function toggleShoutMenu(open = shoutMenu.hidden) {
  shoutMenu.hidden = !open; $('#shoutBtn').setAttribute('aria-expanded', String(open));
  clearTimeout(giveTimer); giveGuard.reset(); paintGiveUp();
  giveUp.hidden = !mayGiveUp({ online, friend, over: state.over, seated: net && net.seat !== null }); // only while a game with a friend is in play
}
function sendShout(id) {
  toggleShoutMenu(false); if (!net || !friend) return false;
  const t = performance.now(); if (t - shoutAt < SHOUT_GAP_MS) return false; // one at a time, like the server says
  if (!net.shout(id)) return false; shoutAt = t; click(1.3, 0.05); return true;
}
function showShout(seat, id) {
  const text = shoutText(id); if (!text) return;
  if (seat === them) {
    awayNote('shout', { text });
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
  const ask = room.ask || null; backAsk.pending = !!(ask && ask.seat === you); if (ask && ask.seat === you) backAsk.n = backAsk.askedN = ask.n; // a rejoin sees a "take it back?" still out
  if (ask && ask.seat === them && !state.over) showBackCard(); else hideBackCard();
  refreshStatic(); paintRules(); paintDoor(); paintRoomStatus();
}
let moveQueue = Promise.resolve();
function sendMove(pit) { if (busy || !net || !net.move(pit)) return; busy = true; deselect(); }
async function showMove({ seat, pit, events, state: pub }) {
  if (backAsk.pending && seat === them) { backAsk.pending = false; toast(backWords(friend ? friend.name : undefined).gone); } // playing on is a no
  hideBackCard();
  const prev = state.stores.slice(); const before = state; state = stateFrom(pub); busy = true; deselect(); $('#undo').disabled = true;
  if (seat === them) { select(pit); await wait(550); deselect(); }
  else { hideExplain(); const got = state.stores[you] - prev[you]; stats.biggest = Math.max(stats.biggest, got); stats.captures += events.filter((e) => e.type === 'capture' && e.by === you).length; const r = recordDay(streak); streak = r.data; if (r.newDay) prefs.set('streak', JSON.stringify(streak)); }
  tipFor(events);
  await animate(events, prev);
  busy = false; refreshStatic();
  if (!state.over && crossedLast8(before, state)) last8Moment();
  if (!state.over && beganCircling(before, state)) circlingMoment();
  if (state.over) gameOver(); else { if (before.over) $('#gameover').hidden = true; if (seat === them) explain(before, pit, events); } // a friend's move, explained too
}
// someone gave up: the giver's row of seeds is pushed a little toward the winner, as when a board is pushed across, then the card
async function showResign({ seat, state: pub }) {
  state = stateFrom(pub); busy = true; deselect(); hideExplain(); $('#undo').disabled = true; selected = null;
  const w = gaveUpWords(seat, you, friend ? friend.name : undefined); toast(w.toast);
  if (seat === them) { const f = $('#oppFace'); if (!reduceMotion) { f.classList.remove('react'); void f.offsetWidth; f.classList.add('react'); } buzz([20, 40, 20]); }
  [0.9, 0.7].forEach((p, k) => setTimeout(() => click(p, 0.09), k * 160)); // two low knocks on the wood
  if (!reduceMotion) {
    const row = [...Array(6).keys()].map((k) => seat * 6 + k); const dir = Math.sign(pitCenters[(1 - seat) * 6][1] - pitCenters[seat * 6][1]) || 1;
    const ms = row.flatMap((i) => homes[i]).map((m) => [m, m.position.z, m.position.y]); if (ms.length) rattle(Math.min(ms.length, 5), at(row[2]));
    await tween(520, (t) => { const k = Math.sin(t * Math.PI); ms.forEach(([m, z0, y0]) => { m.position.z = z0 + dir * k * 0.014; m.position.y = y0 + k * 0.006; }); })
      .then(() => ms.forEach(([m, z0, y0]) => { m.position.z = z0; m.position.y = y0; }));
  }
  await wait(380); busy = false; refreshStatic(); gameOver();
}
// ---------- "take it back?": the Undo chip in a room asks the friend; a yes flies the seeds back (web/takeback.js) ----------
const backAsk = { pending: false, n: -1, askedN: -1 }; // this board's ask; askedN: the move count it last asked about (once a move)
function askBack() {
  if (!net || !friend || net.seat === null) return;
  if (!mayAskBack({ online, friend, seated: true, over: state.over, busy, moves: state.moves, turn: state.turn, you, pending: backAsk.pending, askedN: backAsk.askedN })) { shake(state.moves[state.moves.length - 1] ?? you * 6); return; }
  if (net.askBack()) { backAsk.pending = true; backAsk.n = backAsk.askedN = state.moves.length; click(1.1, 0.07); setTimeout(() => click(1.4, 0.07), 120); buzz(12); showTurn(); }
}
function showBackCard() {
  const w = backWords(friend ? friend.name : undefined); $('#backTitle').textContent = w.title; $('#backSub').textContent = w.sub;
  $('#backFace').innerHTML = initialFace(friend ? friend.name : '?'); $('#backYes').textContent = w.yes; $('#backNo').textContent = w.no;
  $('#backYes').disabled = false; $('#backNo').disabled = false; $('#backCard').hidden = false;
}
function hideBackCard() { $('#backCard').hidden = true; }
function answerBack(yes) { if (!net) return; if (net.answerBack(yes)) { $('#backYes').disabled = true; $('#backNo').disabled = true; click(yes ? 1.5 : 0.7, 0.08); } }
$('#backYes').addEventListener('click', () => answerBack(true));
$('#backNo').addEventListener('click', () => answerBack(false));
// a yes: every seed the move moved flies back to where it lay — out of the troughs first, then back round the board into the pit played
async function showTakeBack({ seat, state: pub, undone, before }) {
  const b = stateFrom(before), a = stateFrom(pub); hideBackCard(); hideExplain(); deselect(); busy = true; $('#undo').disabled = true;
  if (seat === you) backAsk.pending = false;
  const w = backWords(friend ? friend.name : undefined); toast(seat === you ? w.yesMine : w.yesTheirs);
  sim.finish(); layoutFromState(b); // from the position the boards agree on
  await flyBack(b, a, undone);
  state = a; layoutFromState(state); busy = false; deselect(); refreshStatic(); buzz([15, 30, 15]);
}
// every seed that has to move flies from where it lies (b) back to where it lay (a): out of the troughs first, the scores
// ticking down, then back round the board into the pit `played`, each landing with its knock and the counts ticking.
// Used by a friend's yes and by Undo (web/takeback.js planReturn says which seed goes where).
async function flyBack(b, a, played, words = null) {
  const plan = planReturn(b, a, played); const meshes = plan.map((p) => homes[p.from][p.fromSlot]);
  const c = {}; for (const h in homes) c[h] = homes[h].length;
  for (const h in homes) { const keep = h[0] === 'S' ? a.stores[+h[1]] : a.pits[+h]; if (homes[h].length > keep) homes[h].length = keep; }
  const paint = (h) => { if (typeof h === 'number') setBadge(h, c[h]); else { const p = +h[1]; $(p === you ? '#myScore' : '#oppScore').textContent = c[h]; } };
  if (played !== undefined) { select(played, false); click(0.9, 0.07); }
  if (words) $('#hint').textContent = words; // (after the pit lights: lighting it says the turn's words)
  rattle(Math.min(plan.length, 6), at(played ?? 0));
  const gap = plan.length && !reduceMotion ? Math.min(55, 1100 / plan.length) : 0;
  await Promise.all(plan.map((p, i) => wait(i * gap).then(() => {
    c[p.from] -= 1; paint(p.from);
    return fly(meshes[i], p.to, reduceMotion ? 60 : 340, 0.08, (k, onSeed) => { if (k > 0.5) { c[p.to] += 1; paint(p.to); } land(k, onSeed, meshes[i].position, p.to); });
  })));
  await wait(reduceMotion ? 0 : 200);
}
function leaveRoom() { if (net) net.leave(); prefs.set('room', 'null'); location.href = location.pathname; }
function startOnline(code, { stay = false } = {}) {
  // code: 'new' opens a room, a four-letter code knocks on one. stay: asked from the Rooms screen, which stays up (the door card over it)
  // until a friend is in; otherwise (an invite link) the board shows at once with "Joining the room…"
  roomWanted = String(code).toUpperCase(); online = true; local = false;
  net = new Online(wsUrl());
  const self = net; const on = (t, fn) => self.on(t, (d) => { if (net === self) fn(d); }); // a room left behind (Back, a new name) says nothing more
  let held = null; try { held = JSON.parse(prefs.get('room', 'null')); } catch {}
  let triedJoin = false, seated = false, knocking = false;
  on('joined', ({ seat, code, token, room }) => {
    const back = seated; seated = true; you = seat; them = 1 - seat; baseTheta = seat === 1 ? Math.PI : 0; if (!back) theta = baseTheta;
    prefs.set('room', JSON.stringify({ code, token }));
    if (location.search !== '?room=' + code) history.replaceState(null, '', inviteLink(code, location.pathname)); // the address becomes the invite link (a reload comes back to this seat)
    syncRoom(room); $('#gameover').hidden = !state.over; if (state.over) gameOver();
    if (roomsShowing()) { if (friend) showScreen('play'); else { paintCode(code); paintRoomStatus(); if (!back) { click(1.4, 0.08); setTimeout(() => click(1.8, 0.08), 120); } } } // the tiles fill in on the Rooms screen
    if (knocking) { knocking = false; toast(`${friend ? friend.name : 'Your friend'} let you in — ${state.turn === you ? 'your move' : 'they start'}`); click(1.5, 0.1); setTimeout(() => click(2, 0.1), 120); buzz(20); }
    else if (back) toast('Back at the board'); else if (!friend && !roomsShowing()) toast(`Room ${code} — share this page's link`);
  });
  on('room', ({ room, started, resync }) => {
    const had = friend, wanted = friend && friend.wantsRematch; syncRoom(room);
    if (resync) { busy = false; deselect(); toast('Caught up with the board'); if (state.over) gameOver(); else $('#gameover').hidden = true; } // this board fell behind a move and asked for the whole room
    if (!had && friend) { if (roomsShowing()) showScreen('play'); toast(`${friend.name} joined`); click(1.5, 0.1); buzz(20); awayNote('joined', { mine: state.turn === you && !state.over }); }
    if (started) { backAsk.pending = false; backAsk.askedN = -1; hideBackCard(); hideExplain(); stats = { biggest: 0, captures: 0, started: Date.now() }; $('#gameover').hidden = true; $('#rematch').disabled = false; $('#rematch').textContent = 'Play again'; deselect(); toast('New game — ' + (state.turn === you ? 'your move' : `${oppLabel()} starts`)); }
    else if (friend && friend.wantsRematch && !wanted) { toast(`${friend.name} wants to play again`); awayNote('rematch'); if (!$('#gameover').hidden) $('#rematch').textContent = `Play again — ${friend.name} is ready`; }
  });
  on('move', (m) => { if (m.seat === them) { const s = stateFrom(m.state); awayNote(s.over ? 'over' : 'move', s.over ? { result: s.winner === you ? 'won' : s.winner === them ? 'lost' : 'draw', score: [s.stores[you], s.stores[them]] } : { mine: s.turn === you }); } moveQueue = moveQueue.then(() => showMove(m)).catch((e) => console.error(e)); }); // small message, events rebuilt by online.js with the engine
  on('resign', (m) => { if (m.seat === them) { const s = stateFrom(m.state); awayNote('over', { result: s.winner === you ? 'won' : 'lost', gaveUp: true }); } moveQueue = moveQueue.then(() => showResign(m)).catch((e) => console.error(e)); });
  on('askback', ({ seat }) => { if (seat === them) { showBackCard(); knockSound(); awayNote('askback'); } else showTurn(); });
  on('backno', ({ seat }) => { hideBackCard(); if (seat === you) { backAsk.pending = false; toast(backWords(friend ? friend.name : undefined).noMine); click(0.7, 0.08); } else toast(backWords().noTheirs); showTurn(); });
  on('takeback', (m) => { moveQueue = moveQueue.then(() => showTakeBack(m)).catch((e) => console.error(e)); });
  on('resync', () => { $('#oppSub').textContent = 'catching up…'; });
  on('ticket', ({ code, token, ticket }) => { if (code && token) prefs.set('room', JSON.stringify({ code, token, ticket })); }); // kept with the seat, so even after a reload the room can be rebuilt if the server restarted
  on('shout', ({ seat, id }) => showShout(seat, id));
  // the door: this phone knocked and waits for the host; or (as host) someone is knocking on ours
  on('knocked', ({ host }) => { const again = knocking; knocking = true; if (roomsShowing()) { showScreen('play'); $('#oppFace').innerHTML = initialFace(host); } showTurn(); if (!again) { toast(`Knocked — ${host} decides`); click(1.1, 0.08); } });
  on('knock', ({ name }) => { knockSound(); awayNote('knock', { name }); });
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
  body.classList.add('online'); awayIconLoad(); if (!stay) showScreen('play');
  $('#oppName').textContent = 'Joining the room…'; $('#oppSub').textContent = ''; $('#turn').textContent = ''; $('#hint').textContent = ''; $('#shoutBtn').disabled = true;
  $('#oppFace').innerHTML = initialFace('?');
  const rejoining = held && roomWanted !== 'NEW' && held.code === roomWanted;
  const go = () => {
    if (roomWanted === 'NEW') net.create({ variant: settings.game, rules: settings.rules(), name: myName() });
    else if (rejoining) net.rejoin(held.code, held.token, held.ticket || null);
    else { net.join(roomWanted, myName()); $('#oppName').textContent = 'Knocking…'; }
  };
  if (!rejoining && !prefs.get('name', '')) askName(roomWanted === 'NEW' ? 'Open the room' : 'Knock').then(go); // an invite link opened before a name was ever given: asked here, once
  else go();
}

const worker = new Worker('./ai-worker.js', { type: 'module' });
const asks = new Map(); let askId = 0; // every question to the worker carries an id, so a hint, the opponent's move and Mama Ngozi's take never take each other's answer
worker.onmessage = (e) => { const r = asks.get(e.data.id); if (r) { asks.delete(e.data.id); r(e.data.result); } };
function ask(msg) { return new Promise((res) => { const id = ++askId; asks.set(id, res); worker.postMessage({ id, ...msg }); }); }
function aiMove(s, lvl = level) { return ask({ state: s, level: lvl }); }
function aiRate(s, lvl = 'hard') { return ask({ state: s, level: lvl, rate: true }); }
let hintedAt = -1, hinted = null; // hinted: the pit Hint picked for you, and on which move
async function hint() {
  if (busy || online || state.over || state.turn !== you || hintedAt === state.moves.length) return;
  hintedAt = state.moves.length; $('#hintBtn').disabled = true;
  const at = state.moves.length, m = await aiMove(state, 'hard');
  if (m === null || busy || state.over || state.turn !== you || state.moves.length !== at) return;
  // a hint that teaches: her pit is picked for you, as if you had tapped it once — the path marks land and the line says why;
  // one more tap (or Enter) sows it, any other pit picks that one instead
  hinted = { pit: m, at }; select(m); click(1.6, 0.05);
}

function paintFaces() {
  $('#oppFace').innerHTML = online ? initialFace(friend ? friend.name : '?') : local ? initialFace(String(them + 1)) : faceFor(level, mood); // two of us: the far player's number on a brass ring
  document.querySelectorAll('.pill[data-level]').forEach((b) => { b.querySelector('.face').innerHTML = CHARACTERS[b.dataset.level].face; });
  document.querySelectorAll('[data-face]').forEach((f) => { f.innerHTML = CHARACTERS[f.dataset.face].face; });
}
function refreshStatic() {
  paintFaces(); paintMyName();
  state.pits.forEach((n, i) => setBadge(i, n));
  $('#myScore').textContent = state.stores[you]; $('#oppScore').textContent = state.stores[them];
  $('#oppName').textContent = oppLabel();
  showTurn();
}
function showTurn() {
  if (online) { showTurnOnline(); paintPits(); return; }
  if (puzzle.on) { $('#hint').textContent = puzzle.played ? '' : pickHint('puzzle'); $('#undo').disabled = true; $('#hintBtn').disabled = true; paintPits(); return; }
  const mine = state.turn === you && !state.over;
  if (local) { const w = localTurn(state); $('#turn').textContent = mine || state.over ? w.turn : '…'; $('#oppSub').textContent = mine ? w.sub : state.over ? '' : 'passing the phone…'; }
  else { $('#turn').textContent = state.over ? 'game over' : mine ? 'your move' : '…'; $('#oppSub').textContent = state.over ? '' : mine ? 'waiting' : 'thinking…'; }
  $('#hint').textContent = state.over ? '' : mine ? pickHint('pick') : '';
  $('#undo').disabled = busy || state.moves.length < (local ? 1 : 2); undoLabel(false);
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
// What it leaves open (Settings → Feel, with the path): their richest answer to the picked move, one move ahead (web/path.js answerOf):
// the hint line ends "then they can take 8" and a deep ember ring lands just outside each pit that answer would take, after the path.
const answerOn = () => prefs.get('answer', '1') === '1';
let path = null, answer = null, pathToken = 0, pathGlow = false, riskGlow = false;
function showPath(i) {
  clearPath(); if (!pathOn() || state.turn !== you || owner(i) !== you) return;
  path = sowPath(state, i); if (!path) return;
  answer = answerOn() && !puzzle.on ? answerOf(state, i) : null;
  const token = ++pathToken; landMarks(path, token).then(() => landRisk(answer, token));
}
async function landRisk(a, token) {
  if (!a || !a.captures.length || token !== pathToken) return; const M = board.marks;
  await wait(120); if (token !== pathToken) return;
  for (const pit of a.captures) { const r = M.risk[pit]; r.visible = true; tween(360, (t) => { if (token !== pathToken) return; r.material.opacity = 0.7 * t; const sc = 1.18 - 0.18 * t; r.scale.set(sc, sc, 1); }, easeOut); }
  click(0.8, 0.03); // a low knock: a warning, not a cheer
  await wait(380); if (token === pathToken) riskGlow = true;
}
// land a path's marks on the board, in sowing order: a brass dot and ring on each pit reached, copper rings on the captures, the light where
// the turn ends. `faint` (their move, explained) lands them quietly at half strength, without the counting ticks; `gap` is the beat between pits.
async function landMarks(p, token, { faint = false, gap = 55 } = {}) {
  const M = board.marks, k0 = faint ? 0.5 : 1;
  for (let k = 0; k < p.order.length; k++) {
    if (token !== pathToken) return;
    const pit = p.order[k], m = M.steps[pit], d = M.dots[pit], strong = p.visits[pit] > 1, y0 = d.position.y;
    m.visible = true; d.visible = true; // the dot drops onto the pit's edge; the faint ring fades in with it (both stronger where a relay passes twice)
    tween(220, (t) => { if (token !== pathToken) return; m.material.opacity = k0 * (strong ? 0.6 : 0.3) * t; d.material.opacity = k0 * 0.95 * Math.min(1, t * 1.6); d.position.y = y0 + (1 - t) * 0.03; const sc = (strong ? 1.35 : 1) * (1.5 - 0.5 * t); d.scale.set(sc, sc, 1); }, easeOut);
    if (k < 12 && !faint) click(1.9, 0.012); // the hand counting the pits, quietly
    await wait(k < 12 ? gap : Math.min(gap, 25));
  }
  if (token !== pathToken) return;
  for (const pit of (p.takes || p.captures)) { const c = M.caps[pit]; c.visible = true; tween(260, (t) => { if (token !== pathToken) return; c.material.opacity = k0 * 0.85 * t; const sc = 1.12 - 0.12 * t; c.scale.set(sc, sc, 1); }, easeOut); }
  // whose 4 is it: a pit that goes to the other side's trough gets the pale beaded ring a beat later, turning a little as it lands
  if (p.gives && p.gives.length) { await wait(140); if (token !== pathToken) return;
    for (const pit of p.gives) { const g = M.gifts[pit]; g.visible = true; tween(420, (t) => { if (token !== pathToken) return; g.material.opacity = k0 * 0.8 * t; const sc = 1.16 - 0.16 * t; g.scale.set(sc, sc, 1); g.rotation.z = (1 - t) * 0.6; }, easeOut); }
    if (!faint) { click(0.95, 0.025); giftNote(); } }
  if (p.end !== null) { const e = M.end, [x, z] = pitCenters[p.end]; e.position.x = x; e.position.z = z; e.visible = true; tween(320, (t) => { if (token !== pathToken) return; e.material.opacity = k0 * 0.4 * t; }).then(() => { if (token === pathToken && !faint) pathGlow = true; }); }
  if ((p.takes || p.captures).length && !faint) click(1.25, 0.035);
}
// the first time a picked move would hand seeds to the other side, say once (on this phone) what the pale ring means
function giftNote() {
  if (prefs.get('gives.told', '') === '1' || puzzle.on) return; prefs.set('gives.told', '1');
  toast(giftNoteWords(state.rules), 4200);
}
function clearPath() {
  pathToken++; path = null; answer = null; pathGlow = false; riskGlow = false; const M = board.marks;
  for (const m of [...M.steps, ...M.dots, ...M.caps, ...M.gifts, ...M.risk, M.end]) { m.visible = false; m.material.opacity = 0; m.scale.set(1, 1, 1); m.rotation.z = 0; }
}
// fade every mark that is showing, over `ms`, unless something lands new ones first
function fadeMarks(token, ms = 700) {
  pathGlow = false; riskGlow = false; const M = board.marks, all = [...M.steps, ...M.dots, ...M.caps, ...M.gifts, ...M.risk, M.end].filter((m) => m.visible).map((m) => [m, m.material.opacity]);
  return tween(ms, (t) => { if (token !== pathToken) return; for (const [m, o] of all) m.material.opacity = o * (1 - t); }).then(() => { if (token === pathToken) clearPath(); });
}

// ---------- their move, explained: after the opponent's turn, the marks of the move they just played stay faint for a moment with the words
// under the board ("Nnamdi · picked up again twice · took 4"); tap the words and just that turn replays slowly — the marks first, then the
// seeds at the slow pace — so a fast relay turn can be read after the fact. Off with the same switch as the path (Settings → Feel).
let theirs = null, replaying = false, theirsFade = null; const lastBtn = $('#lastMove');
function explain(before, pit, events) {
  hideExplain(); if (!pathOn() || state.over || !body.classList.contains('playing')) return;
  const p = sowPath(before, pit); if (!p) return;
  theirs = { before, pit, events, path: p, name: online ? (friend ? friend.name : 'They') : local ? LNAMES[before.turn] : names[level] };
  $('#lastName').textContent = theirs.name; $('#lastWords').textContent = playedWords(p, { you });
  lastBtn.setAttribute('aria-label', `${theirs.name}'s move: ${playedWords(p, { you })}. Watch it again, slowly`); lastBtn.hidden = false;
  if (selected !== null) return; // a pit already picked: its own path is showing
  const token = ++pathToken; // the ghost of their path: faint, quick, then it fades on its own; the words stay until your move
  landMarks(p, token, { faint: true, gap: 30 }).then(() => { if (token !== pathToken) return; theirsFade = setTimeout(() => { if (token === pathToken) fadeMarks(token, 900); }, reduceMotion ? 1200 : 3200); });
}
function hideExplain() { theirs = null; lastBtn.hidden = true; clearTimeout(theirsFade); hideTake(); } // their move and her take go together: both are about the turn just gone
function replayLast() { // tap the words: the position before their move comes back, their pit lights, the marks land, the seeds follow slowly
  if (!theirs) return; const L = theirs;
  return watchTurn(L, lastBtn, { title: 'watching', words: `${L.name}'s move again, slowly` });
}
// a turn played through from the position before it: the pit lights, the marks of its path land, then the seeds follow at the slow pace
// (whatever the sowing speed is set to), and the game is put back exactly as it was
async function watchTurn(L, btn, { title, words }) {
  if (busy || replaying || body.classList.contains('screen')) return;
  replaying = true; busy = true; deselect(); $('#undo').disabled = true; $('#hintBtn').disabled = true; btn.classList.add('live');
  $('#hint').textContent = words; $('#turn').textContent = title;
  layoutFromState(L.before); refreshStaticFrom(L.before);
  await wait(350); const [x, z] = pitCenters[L.pit]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true; board.glow.position.set(x, BT + 0.08, z); board.glow.visible = true; click(1.4, 0.05);
  const token = ++pathToken; await landMarks(L.path, token, { gap: 90 }); await wait(reduceMotion ? 100 : 700);
  board.ring.visible = false; board.glow.visible = false;
  await animate(L.events, L.before.stores, Math.max(PACES.slow, PACE * 1.6));
  await wait(300); fadeMarks(token, 600);
  layoutFromState(state); busy = false; replaying = false; btn.classList.remove('live'); refreshStatic(); click(1.2, 0.04);
}
lastBtn.addEventListener('click', replayLast);

// ---------- Mama Ngozi's take: after your move against the computer, the hard search rates every move you had on the position you moved
// from (in the worker, while the opponent's reply plays); if a clearly better pit was there, a line with her face lands under the board
// ("your pit 3 was the move · takes 8 · 6 seeds better"); tap it and that move plays through slowly, then the game is as it was.
// It goes with your next move, Undo, a new game or Home. Never for two of us, a room or the puzzle. Settings → Feel → Mama Ngozi's take.
const takeOn = () => prefs.get('take', '1') === '1';
let take = null, takeSaid = false; const takeBtn = $('#take'); $('#takeFace').innerHTML = faceFor('hard', 'calm');
async function judge(before, pit) { // her view of the move you just played, or null when it was the move (or near enough)
  if (!takeOn() || local || online || puzzle.on || before.over) return null;
  const rated = await aiRate(before, 'hard'); const t = judgeMove(rated, pit); if (!t) return null;
  const p = sowPath(before, t.pit); if (!p) return null;
  return { before, pit: t.pit, played: pit, take: t, path: p, events: applyMove(before, t.pit).events, words: takeWords(t, p, { you }) };
}
function showTake(T) {
  hideTake(); if (!T || state.over || !body.classList.contains('playing') || state.turn !== you || local || online || puzzle.on) return;
  take = T; $('#takeWords').textContent = T.words; $('#takeName').textContent = level === 'hard' ? 'Her take' : COACH; takeBtn.setAttribute('aria-label', `${COACH}'s take: ${T.words}. Play it through, slowly`); takeBtn.hidden = false; // across the board from her, the chip says "Her take" so it reads apart from her own move's words
  click(1.7, 0.03);
  if (level === 'hard' && !takeSaid) { takeSaid = true; setTimeout(() => { if (take === T) sayText(takeLine(T.take), 'calm', 3200); }, 500); } // across the board from her, she says it once a game
}
function hideTake() { take = null; takeBtn.hidden = true; }
function playTake() { if (!take) return; const T = take; return watchTurn(T, takeBtn, { title: 'watching', words: `${COACH}'s move, slowly` }); }
takeBtn.addEventListener('click', playTake);

// Play a move's events on the board, one seed at a time.
async function animate(events, prevStores, pace = PACE) {
  wakePoke(); // a turn on the board is something happening: a friend's move keeps the screen on as a tap does
  if (counting.pit !== null) endCount(); // a turn starting takes the count away: those seeds may be about to move
  if (hurry.depth++ === 0) { hurry.on = false; hurry.words = longTurn(events) && !clipping && !reduceMotion; hurry.base = $('#hint').textContent; if (hurry.words) $('#hint').textContent = hurryWords(hurry.base, { keys: keysLikely() }); }
  try { await sowEvents(events, prevStores, pace); } finally { if (hurry.depth === 1) hideHands(); if (--hurry.depth === 0) { if (hurry.words) $('#hint').textContent = hurry.base; hurry.on = false; hurry.words = false; } }
}
async function sowEvents(events, prevStores, pace) {
  const shown = prevStores.slice(); const pending = []; const steps = handSteps(events); let ix = -1;
  for (const e of events) {
    const st = steps[++ix];
    if (e.type === 'pickup') {
      await Promise.all(pending); pending.length = 0;
      if (e.relay) await wait(pace);
      // the hand scoops the pit: its seeds rise into a small heap held over the pit (the hand), all of them, however many
      const picked = homes[e.pit].splice(0); picked.forEach(moved); rattle(picked.length, at(e.pit)); // the seeds click together as the hand closes on them
      setHand('sow', picked, st.sow, st.again); // the number over the hand: the seeds in it, from the moment it closes on them
      await Promise.all(picked.map((m, k) => hold(m, handPose(e.pit, k), 240, 0.03)));
      setBadge(e.pit, 0); animate.cluster = picked; animate.over = e.pit;
    } else if (e.type === 'drop') {
      // the top seed leaves the hand for this pit while the hand moves on over it; the rest of the heap stays as it is
      const m = animate.cluster.pop(); const count = homes[e.pit].length + 1; animate.over = e.pit;
      animate.cluster.forEach((s, k) => hold(s, handPose(e.pit, k), 140, 0));
      // a hand sows at a steady pace: the next seed leaves while the last one is still settling
      pending.push(drop(m, e.pit, () => setBadge(e.pit, count))); // the count goes up as the seed touches down
      setHand('sow', animate.cluster, st.sow); // …and the hand's number goes down as it leaves
      if (window.__handPause && st.sow === window.__handPause) { window.__handPause = 0; await new Promise((r) => { window.__handGo = r; }); } // the render check stops the hand here for its picture
      await wait(pace);
    } else if (e.type === 'capture') {
      // a hand sweeps up the captured pits into one heap, carries it over the trough and lets the seeds go into it, the
      // top ones first: they drop, bounce and lie down in their places (no seeds streaming loose across the board)
      await Promise.all(pending); pending.length = 0;
      const k = pace / PACES.normal; // the sowing speed sets this hand's speed too
      if (animate.cluster && animate.cluster.length) animate.cluster.forEach((s, j) => { const p = handPose(animate.over, j); p.y += 0.08; hold(s, p, 150 * k, 0); }); // a sowing hand still full rises out of the way (Nchò takes a 4 mid-sowing)
      await wait(120 * k);
      const store = 'S' + e.by, scoreEl = e.by === you ? $('#myScore') : $('#oppScore'), hand = [];
      hands.haul.el.classList.toggle('gift', haulKind(events, e) === 'gift'); // whose 4 is it: seeds going to the other side's trough ride a pale number
      for (const pit of e.pits) {
        const taken = homes[pit].splice(0); setBadge(pit, 0); taken.forEach(moved); rattle(taken.length, at(pit));
        hand.forEach((s, j) => hold(s, handPose(pit, j), 150 * k, 0));
        await Promise.all(taken.map((m, j) => hold(m, handPose(pit, hand.length + j), 200 * k, 0.025)));
        hand.push(...taken); setHand('haul', hand, hand.length); // the copper number climbs as each pit is swept up
        if (window.__haulPause) { window.__haulPause = 0; await wait(400); await new Promise((r) => { window.__handGo = r; }); }
      }
      const [sx, sz] = storeCenters[e.by], [fx, fz] = pitCenters[e.pits[e.pits.length - 1]], d = Math.hypot(sx - fx, sz - fz);
      await Promise.all(hand.map((m, j) => hold(m, place(spots('hand')[Math.min(j, 47)], sx, sz, BT + HAND_Y, 0), (260 + 220 * d) * k, 0.06)));
      for (let j = hand.length - 1; j >= 0; j--) {
        pending.push(drop(hand[j], store, () => { shown[e.by]++; tickScore(scoreEl, shown[e.by]); })); // the score ticks as each seed lands
        setHand('haul', hand.slice(0, j), j); // and the hand's number counts them out into the trough
        await wait(45 * k);
      }
      await wait(120 * k);
    }
  }
  await Promise.all(pending);
}

async function play(pit) {
  const { state: next, events } = applyMove(state, pit);
  const prevStores = state.stores; const mover = state.turn; const before = state; state = next; busy = true; deselect(); $('#undo').disabled = true;
  if (mover === you) {
    hideExplain(); // their last move is old news once you have played
    const got = state.stores[mover] - prevStores[mover]; stats.biggest = Math.max(stats.biggest, got); stats.captures += events.filter((e) => e.type === 'capture' && e.by === mover).length; // two of us: the biggest turn by either
    const r = recordDay(streak); streak = r.data; if (r.newDay) prefs.set('streak', JSON.stringify(streak));
    if (r.unlocked) setTimeout(() => { toast(`${r.unlocked.name} unlocked — pick them in Settings`); buzz([20, 40, 20]); click(1.8, 0.1); setTimeout(() => click(2.4, 0.1), 140); }, 1200);
  }
  tipFor(events);
  const aiGot = state.stores[1] - prevStores[1], meGot = state.stores[0] - prevStores[0];
  if (!local) { if (mover === them && aiGot > 0) setTimeout(() => say('capture'), 400); else if (mover === you && meGot >= 4) setTimeout(() => say('lost'), 400); }
  await animate(events, prevStores);
  busy = false; refreshStatic(); save();
  if (state.over) return gameOver();
  if (crossedLast8(before, state)) last8Moment(); // the board is down to its last 8: whoever captures next takes them all
  if (beganCircling(before, state)) circlingMoment(); // 12 moves with no capture before the game is called: say so, and who keeps what
  if (local) { await passTurn(); explain(before, pit, events); return; } // two of us: the board turns to the next player, with the move just played explained for them
  if (mover === them) explain(before, pit, events); // their move, explained: the ghost of its path and the words, tap to watch it again
  if (state.turn === them) {
    showTurn(); await wait(350); if (mood === 'calm') react('think');
    const m = await aiMove(state);
    if (m === null || state.turn !== them) return;
    const judging = mover === you ? judge(before, pit) : null; // Mama Ngozi rates the move you just played while the reply is shown
    if (mood === 'think') react('calm'); select(m); await wait(550); // show which pit the opponent chose
    await play(m);
    if (judging) showTake(await judging); // …and if a clearly better pit was there, her take lands under the board for your next move
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
  const p = todaysPuzzle(); puzzle.on = true; puzzle.played = false; puzzle.got = 0; seat(0);
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
  const p = puzzle.p; const text = shareText(p, puzzle.got) + (linkable() ? `\n${publicBase()}?puzzle=1` : '');
  try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Result copied'); } } catch {}
}
$('#puzzleCard').addEventListener('click', () => { openPuzzle(); click(1.3, 0.08); });
$('#pzAgain').addEventListener('click', puzzleAgain);
$('#pzShow').addEventListener('click', () => { puzzleShow(); click(1.3, 0.06); });
$('#pzHome').addEventListener('click', () => { if (lesson.on) endLesson(false); else closePuzzle(); click(1, 0.05); });
$('#pzShare').addEventListener('click', () => { sharePuzzle(); click(1.3, 0.06); });

// ---------- the first game's lesson (Launch L2, web/lesson.js): a new phone's first Play, or Settings → Rules → Learn to play ----------
// three of your moves from a set position on the live board — sowing, a capture of 4, a relay — with Adaeze's own move between them;
// each step's pit is lit and picked for you (its path marks land), one tap sows it, the words say what just happened, Next goes on;
// Skip at any time. Played in the puzzle's frame (the ask at the top, the HUD stepped aside), so no record, take or warning joins in.
const lesson = { on: false, k: 0, phase: 'idle', then: 'play' };
const lessonDueNow = () => lessonDue({ newPhone, mode: settings.mode, lesson: prefs.get('lesson', null) });
function lessonTop(title, words) { $('#pzDay').textContent = lesson.phase === 'done' ? 'Learn Nchò · done' : lessonEyebrow(lesson.k); $('#pzRules').textContent = lesson.phase === 'done' ? '' : 'about a minute'; $('#pzAsk').textContent = title; $('#pzHow').textContent = words; }
function openLesson(then = 'play') {
  if (online || busy) return;
  lesson.on = true; lesson.k = 0; lesson.then = then; lesson.phase = 'ask'; puzzle.on = true; puzzle.played = true; seat(0); hideExplain(); hideTake();
  state = lessonStart(); layoutFromState(state); refreshStatic(); deselect(); hintedAt = -1; body.classList.add('lesson');
  $('#pzCard').hidden = true; $('#lsCard').hidden = true; $('#pzHome').textContent = LESSON_SKIP; $('#puzzle').classList.remove('open'); $('#puzzle').setAttribute('aria-label', 'Learn to play');
  showScreen('puzzle'); lessonStep();
}
async function lessonStep() { // the ask, then the lit pit is picked for you: its marks land, one tap sows
  const st = LESSON[lesson.k]; lesson.phase = 'ask'; lessonTop(st.title, st.ask);
  await wait(reduceMotion ? 50 : 650); if (!lesson.on || lesson.phase !== 'ask') return;
  puzzle.played = false; select(st.pit);
}
async function lessonPlay(pit) {
  const st = LESSON[lesson.k]; if (!lesson.on || pit !== st.pit || lesson.phase !== 'ask') return;
  const { state: next, events } = applyMove(state, pit); const prev = state.stores; state = next; busy = true; puzzle.played = true; lesson.phase = 'move'; deselect();
  await animate(events, prev, Math.max(PACE, 190)); // a touch slower than a game, so it can be followed
  busy = false; if (!lesson.on) return; refreshStatic();
  lesson.phase = 'after'; $('#lsWords').textContent = st.after; $('#lsNext').textContent = lesson.k === LESSON.length - 1 ? 'Finish' : 'Next';
  $('#lsCard').hidden = false; $('#puzzle').classList.add('open'); showTurn();
  if (st.kind === 'capture') { click(1.5, 0.12); setTimeout(() => click(2, 0.12), 120); buzz([15, 30, 15]); } else click(1.2, 0.06);
}
async function lessonNext() {
  if (busy || !lesson.on) return;
  if (lesson.phase === 'done') return endLesson(true);
  if (lesson.phase !== 'after') return;
  $('#lsCard').hidden = true; $('#puzzle').classList.remove('open'); const st = LESSON[lesson.k];
  if (lesson.k === LESSON.length - 1) return lessonDone();
  lesson.phase = 'reply'; busy = true; lessonTop(`${names.easy}'s move`, lessonReply(names.easy));
  await wait(reduceMotion ? 50 : 500); if (!lesson.on) { busy = false; return; }
  select(st.reply, false); await wait(reduceMotion ? 100 : 600);
  const { state: next, events } = applyMove(state, st.reply); const prev = state.stores; state = next; board.ring.visible = false; board.glow.visible = false; selected = null;
  await animate(events, prev, Math.max(PACE, 190));
  busy = false; if (!lesson.on) return; refreshStatic(); lesson.k += 1; lessonStep();
}
function lessonDone() { // the end: kept as done (the first-game tips are then not needed), and the game against the chosen opponent offered
  lesson.phase = 'done'; prefs.set('lesson', 'done'); tipStep = 3; prefs.set('tutorial', '3');
  const name = names[level]; lessonTop(LESSON_DONE.title, LESSON_DONE.words(name));
  $('#lsWords').textContent = 'Sowing, a capture of 4 and a relay: that is most of the game.'; $('#lsNext').textContent = `Play ${name}`; $('#pzHome').textContent = 'Back to home';
  $('#lsCard').hidden = false; $('#puzzle').classList.add('open'); showTurn();
  click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); buzz([20, 40, 20]);
}
function endLesson(playNow) { // Skip, Back to home, or Play: the board goes to the game (from Home's Play) or back home (from Settings)
  if (busy || !lesson.on) return; const was = lesson.phase;
  lesson.on = false; lesson.phase = 'idle'; puzzle.on = false; puzzle.played = false; body.classList.remove('lesson');
  if (!prefs.get('lesson', null)) prefs.set('lesson', 'skipped');
  if (prefs.get('level', null) === null) prefs.set('level', level); // a new phone keeps Easy from now on (it is no longer new)
  $('#lsCard').hidden = true; $('#pzHome').textContent = 'Back to home'; $('#puzzle').setAttribute('aria-label', 'Daily puzzle'); deselect();
  if (playNow || (lesson.then === 'play' && was !== 'done')) { newRound(); showScreen('play'); if (tipStep === 0) showTip(TIPS[0]); return; }
  if (!resume()) state = newGame(settings.game, settings.rules()); layoutFromState(state); refreshStatic(); deselect(); paintRules(); showScreen('home');
}
$('#lsNext').addEventListener('click', () => { lessonNext(); click(1.2, 0.05); });
$('#lessonBtn').addEventListener('click', () => { if (!online) { openLesson('home'); click(1.3, 0.08); } });
$('#goNext').addEventListener('click', () => { const lv = $('#goNext').dataset.level; if (!lv || online) return; level = lv; prefs.set('level', lv); prefs.set('mode', 'ai'); mood = 'calm'; newRound(); showScreen('play'); click(1.3, 0.08); });

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
  if (which !== 'play') { hideExplain(); if (selected === null) clearPath(); } // their last move stays on the board only while you are at it
  if (which === 'play') blinkLoop(); else { clearTimeout(blinkTimer); if (mood !== 'calm' && mood !== 'think') react('calm'); }
  if (which === 'play' && !busy && !state.over && state.turn === you && selected === null) showTurn(); else if (!board3d) paintFeed();
  wakeCheck(); // feed them: said once the board is in front of you, gone behind a screen
}
let idle = true; // the home screen slowly turns the board
function paintHome() {
  paintGold();
  const g = settings.game;
  document.querySelectorAll('[data-game]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.game === g));
  document.querySelectorAll('.pill[data-level]').forEach((b) => b.setAttribute('aria-pressed', settings.mode !== 'local' && b.dataset.level === level));
  const two = settings.mode === 'local'; $('.pill[data-mode="local"]').setAttribute('aria-pressed', two);
  const st = comingStart(two); $('#playSub').textContent = two ? (st.first === 1 ? `${LNAMES[1]} starts · on this phone` : LOCAL_SUB) : 'vs ' + levelLabel(level) + (st.first === 1 ? ` · ${names[level]} starts` : ''); $('#streakLine').textContent = homeLine(streak); paintPuzzleCard(); paintRecordPills();
  const saved = savedGame();
  $('#continueBtn').disabled = !saved; $('#continueSub').textContent = saved ? saved.local ? localContinue(saved) : `${saved.stores[0] > saved.stores[1] ? 'you lead' : saved.stores[0] < saved.stores[1] ? 'you trail' : 'level'} ${saved.stores[0]} – ${saved.stores[1]} · ${saved.moves.length} moves in` : 'no game in progress';
}
function paintSettings() {
  paintGold();
  const r = settings.rules();
  const set = (name, v) => document.querySelectorAll(`[data-set="${name}"] .segbtn, [data-set="${name}"] .swatch`).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === String(v)));
  set('game', settings.game); set('capture', r.capture); set('relay', r.relay ? 1 : 0); set('finish', prefs.get('finish', 'mahogany')); set('seeds', seedSetId()); set('speed', settings.speed); set('starts', startsPref());
  const stones = unlocked(streak, 'stones'); $('[data-set="seeds"] [data-v="stones"]').disabled = !stones;
  $('#seedsSub').textContent = stones ? "Job's tears · river stones (yours: 7 days played)" : `Job's tears · river stones unlock at ${MILESTONES[0].days} days played (${streak.days.length} so far)`;
  const sw = (name, on) => $(`[data-set="${name}"].sw`).setAttribute('aria-checked', String(on));
  sw('last8', r.last8); sw('badges', prefs.get('badges', '1') === '1'); sw('sound', soundOn()); sw('haptics', prefs.get('haptics', '1') === '1'); sw('path', pathOn()); sw('answer', answerOn()); sw('swing', swingOn()); sw('take', takeOn()); sw('wake', wakeOn()); $('#wakeNow').textContent = wakeNote(navigator) ? ` · ${wakeNote(navigator)}` : '';
  set('quality', prefs.get('quality', 'auto')); $('#qualityNow').textContent = `now ${Q.lite ? 'lighter' : 'full'} (${quality.reason})`;
  set('physics', prefs.get('physics', 'auto')); $('#physicsNow').textContent = `now ${PHYS.physics ? 'on' : 'off'} (${PHYS.reason})`;
  document.querySelectorAll('.choose[data-level]').forEach((b) => { const on = settings.mode !== 'local' && b.dataset.level === level; b.setAttribute('aria-pressed', on); b.textContent = on ? 'Chosen' : 'Choose'; });
  const two = $('.choose[data-mode="local"]'); two.setAttribute('aria-pressed', settings.mode === 'local'); two.textContent = settings.mode === 'local' ? 'Chosen' : 'Choose';
}
// ---------- the opponent's face reacts: a mood for a moment, then back to calm; blinks now and then while waiting ----------
let mood = 'calm', moodTimer = null, blinkTimer = null;
function react(next, ms = 2600) {
  if (params.get('still') || online || local) return; clearTimeout(moodTimer); mood = next; const f = $('#oppFace'); f.innerHTML = faceFor(level, mood);
  if (next !== 'calm' && next !== 'blink' && next !== 'think') { f.classList.remove('react'); void f.offsetWidth; f.classList.add('react'); }
  if (next !== 'calm' && next !== 'think') moodTimer = setTimeout(() => react('calm'), ms);
}
function blinkLoop() { // a blink every few seconds, only on a calm face, never under reduced motion
  clearTimeout(blinkTimer); if (reduceMotion || params.get('still') || online || local) return;
  blinkTimer = setTimeout(() => { if (mood === 'calm' && body.classList.contains('playing')) { $('#oppFace').innerHTML = faceFor(level, 'blink'); setTimeout(() => { if (mood === 'calm') $('#oppFace').innerHTML = faceFor(level, 'calm'); }, 130); } blinkLoop(); }, 2800 + Math.random() * 4200);
}
let bubbleTimer = null;
function say(moment) {
  if (online || local) return; // a friend speaks for themselves, and two of us need no third voice
  sayText(line(level, moment), MOOD_FOR[moment] || 'calm');
}
function sayText(text, mood = 'calm', ms = 2600) { // the opponent says these words, with the face to match
  if (online || local) return; react(mood);
  if (!text || params.get('still')) return;
  const b = $('#bubble'); b.textContent = text; b.hidden = false; clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => { b.hidden = true; }, ms);
}
// Gold (L7/L9): Master is locked with a small Gold mark until bought; ?try=master opens him for one visit (web/entitle.js).
function owned() { return parseOwned(prefs.get('owned', '[]')); }
function goldLocked(lv) { if (levelOpen(lv, owned(), GOLD_PREVIEW)) return false; toast(lockedWords(names[lv], inApp()), 3200); click(0.7, 0.05); return true; }
function paintGold() { document.querySelectorAll('[data-level]').forEach((b) => { if (!GOLD_LEVELS.includes(b.dataset.level)) return; const shut = !levelOpen(b.dataset.level, owned(), GOLD_PREVIEW); b.classList.toggle('locked', shut); const row = b.closest('.row'); if (row) row.classList.toggle('locked', shut); }); }
function toast(text, ms = 1800) { const t = document.createElement('div'); t.className = ms > 1800 ? 'toast long' : 'toast'; t.textContent = text; body.appendChild(t); setTimeout(() => t.remove(), ms); }

// settings wiring: rules changes start a new game; everything else applies at once
document.querySelectorAll('#settings [data-set]').forEach((el) => {
  const name = el.dataset.set;
  if (el.classList.contains('sw')) {
    el.addEventListener('click', () => {
      const on = el.getAttribute('aria-checked') !== 'true'; el.setAttribute('aria-checked', String(on));
      if (name === 'last8') { prefs.set('rules.last8', on ? '1' : '0'); rulesChanged(); }
      else prefs.set(name, on ? '1' : '0');
      if (name === 'sound') { paintSound(); click(1, 0.08); }
      if (name === 'wake') wakeCheck();
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
      else if (name === 'starts') { prefs.set('starts.pref', v); toast(v === 'loser' ? 'From the next game: the loser goes first' : v === 'you' ? 'From the next game: you always start' : 'From the next game: they always start'); }
      else if (name === 'quality') { if (v !== prefs.get('quality', 'auto')) { prefs.set('quality', v); save(); toast('Redrawing the board…'); setTimeout(() => location.reload(), 500); } }
      else if (name === 'physics') { prefs.set('physics', v); PHYS = decidePhysics({ pref: v, lite: quality.lite, param: params.get('physics') }); toast(PHYS.physics ? 'Seeds bounce and roll again' : 'Seeds fly straight to their pit'); } // applies to the next seed, no new game
      paintSettings(); click(1.2, 0.05);
    }));
  }
});
document.querySelectorAll('.choose[data-level]').forEach((b) => b.addEventListener('click', () => { if (goldLocked(b.dataset.level)) return; level = b.dataset.level; prefs.set('level', level); prefs.set('mode', 'ai'); mood = 'calm'; paintSettings(); refreshStatic(); click(1.2, 0.05); }));
$('.choose[data-mode="local"]').addEventListener('click', () => { prefs.set('mode', 'local'); paintSettings(); click(1.2, 0.05); toast('Two of us on the next game'); });
document.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', () => { prefs.set('game.variant', b.dataset.game); prefs.set('rules.capture', ''); prefs.set('rules.relay', ''); prefs.set('rules.last8', ''); paintHome(); click(1.2, 0.05); }));
document.querySelectorAll('.pill[data-level]').forEach((b) => b.addEventListener('click', () => { if (goldLocked(b.dataset.level)) return; level = b.dataset.level; prefs.set('level', level); prefs.set('mode', 'ai'); paintHome(); click(1.2, 0.05); }));
$('.pill[data-mode="local"]').addEventListener('click', () => { prefs.set('mode', 'local'); paintHome(); click(1.2, 0.05); }); // two of us on this phone: no computer plays
function rulesChanged() { prefs.set('game', 'null'); if (!$('#settings').hidden) toast('Rules changed: next game uses them'); }
$('#playBtn').addEventListener('click', () => { if (lessonDueNow()) { openLesson('play'); click(1.3, 0.08); return; } newRound(); showScreen('play'); click(1.3, 0.08); }); // a new phone's first Play: the lesson first
$('#continueBtn').addEventListener('click', () => { if (resume()) { hideExplain(); layoutFromState(state); refreshStatic(); showScreen('play'); kickAi(); } });
$('#homeBtn').addEventListener('click', () => { if (online) return leaveRoom(); if (!busy) { save(); showScreen('home'); } });
$('#goHome').addEventListener('click', () => { if (online) return leaveRoom(); $('#gameover').hidden = true; showScreen('home'); });
$('#homeSettings').addEventListener('click', () => { paintSettings(); showScreen('settings'); });
$('#settingsBtn').addEventListener('click', () => { if (!busy) { paintSettings(); showScreen('settings'); } });
$('#settingsBack').addEventListener('click', () => { if (online) return showScreen('play'); const r = settings.rules(); const same = state.variant === settings.game && JSON.stringify(state.rules) === JSON.stringify(r) && state.moves.length; showScreen(same ? 'play' : 'home'); });
$('#settingsRules').addEventListener('click', () => { $('#rules').hidden = false; });
// Privacy, terms and support: the server's pages, opened beside the game (a new tab, or the phone's browser from the apps) so the game stays where it was.
for (const a of document.querySelectorAll('.legal a')) a.href = legalLink(a.dataset.page);

// game over card, as approved
function gameOver() {
  const a = state.stores[you], b = state.stores[them]; const win = state.winner === you; const draw = state.winner === 'draw';
  const gave = online && state.resigned != null ? gaveUpWords(state.resigned, you, oppLabel()) : null; // a game someone gave up: the result is theirs to give, whatever the seeds say
  $('#goEyebrow').textContent = `${state.variant === 'ncho' ? 'Nchò' : 'Ayo'} · ${state.moves.length} moves${gave ? ' · ' + gave.who : endedCircling(state) ? ' · ' + circlingEnded() : ''}`; // a called game says why it ended
  $('#goTitle').textContent = gave ? gave.title : local ? localTitle(state) : draw ? 'A draw' : win ? 'You win' : `${online ? oppLabel() : names[level]} wins`;
  $('#goMyScore').textContent = a; $('#goOppScore').textContent = b; $('#goOppName').textContent = oppLabel();
  $('#rematch').textContent = online ? (friend && friend.wantsRematch ? `Play again — ${friend.name} is ready` : 'Play again') : 'Play again'; $('#rematch').disabled = false;
  $('#goMe').classList.toggle('win', gave ? win : a >= b); $('#goOpp').classList.toggle('win', gave ? state.winner === them : b > a);
  $('#goBig').textContent = `${stats.biggest} seeds`; $('#goCaps').textContent = stats.captures;
  const secs = Math.round((Date.now() - stats.started) / 1000); $('#goTime').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const word = paintRecord(a, b); paintStory();
  if (!online && !puzzle.on) { starts = recordStart(starts, startKey(local), firstMover(state.moves, state.first || 0), state.winner); prefs.set('starts', JSON.stringify(starts)); }
  $('#gameover').hidden = false; if (!online) prefs.set('game', 'null');
  if (word) sayText(word.text, word.mood); else say(win ? 'lose' : 'win'); // a run or a first win is worth their word more than the usual line
  if (win || (local && !draw)) { click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); }
}
// your record against this opponent, counted once per game (the game's start time is its id) and shown on the card with their face;
// when the result is worth a word (your first win against them, a run of 3, 5, 10…) they say it, on the card and in the bubble
function paintRecord(a, b) {
  const box = $('#goRecord'); $('#goNext').hidden = true; if (online || puzzle.on || local) { box.hidden = true; return null; } // two of us keeps no record: the phone cannot tell who sat where
  const r = recordGame(records, level, a, b, stats.started); records = r.data; if (r.counted) prefs.set('record', JSON.stringify(records));
  const nx = r.counted ? nextUp(level, r.moment, names) : null; // your first win over them: the next one up is offered
  if (nx) { $('#goNext').textContent = nx.text; $('#goNext').dataset.level = nx.level; $('#goNext').hidden = false; }
  const text = recordLine(r.entry, r.counted && r.newBest); if (!text) { box.hidden = true; return null; }
  $('#goRecLine').innerHTML = text.split(' · ').map((p) => p.startsWith('new best') ? `<em>${p}</em>` : p).join(' · '); // our own numbers and words, nothing typed
  const word = r.counted ? (r.moment === 'firstWin' ? line(level, 'firstWin') : r.moment === 'run' ? runWord(level, r.entry.run) : '') : '';
  const mood = !word ? 'calm' : r.moment === 'firstWin' ? MOOD_FOR.firstWin : r.entry.run > 0 ? RUN_MOOD.yours : RUN_MOOD.theirs;
  $('#goRecSay').textContent = word ? `“${word}”` : ''; $('#goRecSay').hidden = !word; box.classList.toggle('word', !!word);
  $('#goRecFace').innerHTML = faceFor(level, mood); box.hidden = false;
  if (word) setTimeout(() => { click(1.6, 0.06); buzz(10); }, 450); // the line lands a beat after the card
  return word ? { text: word, mood } : null;
}
// how the game went (web/story.js): the lead move by move as a line drawn in on the card — brass above the middle while
// the near player leads, ember below while the other side does — a brass dot on the move that won it, an ember ring on
// the biggest turn; tap it and that turn plays again on the board, a touch slower, then the card comes back
let story = null;
function paintStory() {
  const box = $('#goStory'); story = null;
  if (puzzle.on || state.moves.length < 4) { box.hidden = true; return; }
  const reader = you; // from the near seat's side, as the scores on the card read (two of us: whoever holds the near card)
  const st = gameStory(state.moves, state.variant, state.rules, reader); const p = storyPath(st, 300, 64, 4);
  const me = local ? LNAMES[you] : 'You', other = local ? LNAMES[them] : (online ? oppLabel() : names[level]);
  $('#goStorySvg').innerHTML = `<defs><clipPath id="stUp"><rect x="0" y="-8" width="300" height="${p.zero + 8}"/></clipPath><clipPath id="stDn"><rect x="0" y="${p.zero}" width="300" height="${p.h - p.zero + 8}"/></clipPath></defs>`
    + `<line class="zero" x1="4" x2="296" y1="${p.zero}" y2="${p.zero}"/>`
    + `<path class="up" clip-path="url(#stUp)" d="${p.area}"/><path class="dn" clip-path="url(#stDn)" d="${p.area}"/>`
    + `<path class="ln" pathLength="1" d="${p.line}"/>`
    + (p.big ? `<circle class="big pop" style="animation-delay:1.35s" cx="${p.big.x}" cy="${p.big.y}" r="5"/>` : '')
    + (p.mark ? `<circle class="good pop" style="animation-delay:1.55s" cx="${p.mark.x}" cy="${p.mark.y}" r="3.4"/>` : '');
  const words = storyWords(st, { me, them: other, gaveUp: online && state.resigned != null ? gaveUpWords(state.resigned, you, other).story : undefined }); $('#goStoryWords').textContent = words; $('#goStoryMe').textContent = me === 'You' ? 'you' : me; $('#goStoryThem').textContent = other;
  box.querySelector('.words svg').style.display = st.biggest ? '' : 'none'; box.disabled = !st.biggest;
  box.setAttribute('aria-label', `How the game went: ${words}${st.biggest ? '. Tap to watch that move again' : ''}`);
  box.hidden = false; story = st;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { if (p.big) setTimeout(() => click(1.2, 0.05), 1350); if (p.mark) setTimeout(() => click(1.8, 0.05), 1550); }
}
async function watchBigTurn(index) {
  if (busy || clipping || index == null || index >= state.moves.length) return;
  const moves = state.moves.slice(); const before = replay(moves.slice(0, index), state.variant, state.rules, firstMover(moves)); const pit = moves[index];
  const { events } = applyMove(before, pit);
  $('#gameover').hidden = true; busy = true; hideExplain(); deselect();
  layoutFromState(before); refreshStaticFrom(before);
  await wait(350); select(pit, false); await wait(650); board.ring.visible = false; board.glow.visible = false;
  await animate(events, before.stores, Math.round(PACE * 1.25));
  await wait(900);
  if (state.moves.length !== moves.length) { busy = false; return; } // a rematch started while it played: leave the new board be
  layoutFromState(state); refreshStatic(); deselect(); busy = false; $('#gameover').hidden = false;
}
$('#goStory').addEventListener('click', () => { if (story && story.biggest) { click(1.3, 0.08); watchBigTurn(story.biggest.index); } });
$('#replayBtn').addEventListener('click', async () => {
  if (busy) return; const moves = state.moves.slice(); const variant = state.variant, rules = state.rules;
  $('#gameover').hidden = true; busy = true; hideExplain();
  let s = newGame(variant, rules, firstMover(moves)); layoutFromState(s); refreshStaticFrom(s);
  for (const m of moves) { const r = applyMove(s, m); if (r.state.turn === them) { select(m); await wait(250); } deselect(); await animate(r.events, s.stores, 70); s = r.state; refreshStaticFrom(s); }
  busy = false; $('#gameover').hidden = false;
});
function refreshStaticFrom(s) { s.pits.forEach((n, i) => setBadge(i, n)); $('#myScore').textContent = s.stores[you]; $('#oppScore').textContent = s.stores[them]; }
$('#shareBtn').addEventListener('click', async () => {
  const a = state.stores[you], b = state.stores[them]; const text = local ? localShare(state) : `Ayo & Nchò — ${state.winner === 'draw' ? 'I drew with' : state.winner === you ? 'I beat' : 'I lost to'} ${online ? oppLabel() : names[level]} ${a}–${b} in ${state.moves.length} moves.`;
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
  const caption = clipCaption(turn, online || local ? oppLabel() : names[level], state.variant);
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

function save() { if (online) return; prefs.set('game', JSON.stringify({ moves: state.moves, variant: state.variant, rules: state.rules, level, stats, local })); }
function savedGame() { try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.moves && g.moves.length) { const s = replay(g.moves, g.variant, g.rules); return s.over ? null : { ...s, local: !!g.local }; } } catch {} return null; }
function resume() {
  try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.moves && g.moves.length && !params.get('still')) { state = replay(g.moves, g.variant, g.rules); level = playable(g.level || level, owned(), GOLD_PREVIEW); stats = g.stats || stats; local = !!g.local; seat(local ? seatOf(state) : 0); return !state.over; } } catch {}
  local = false; seat(0); return false;
}
function newRound() {
  hideExplain(); takeSaid = false; local = settings.mode === 'local'; const st = comingStart(local);
  seat(local ? st.first : 0); state = newGame(settings.game, settings.rules(), st.first); stats = { biggest: 0, captures: 0, started: Date.now() };
  layoutFromState(state); refreshStatic(); $('#gameover').hidden = true; deselect(); save(); paintRules(); faceSeat();
  if (local) setTimeout(() => toast(`${startWords(st, LNAMES, false)} · pass the phone after each move`), 600);
  else { setTimeout(() => say('start'), 600); if (st.first === them || st.why !== 'first') setTimeout(() => toast(startWords(st, ['You', names[level]])), 600); kickAi(); } // the computer opens when it is their start
}
function faceSeat() { // a new game from the Game over card: the board turns round to face whoever now holds the near seat (Home's swing does this itself)
  if (idle) return; const from = theta, to = baseTheta + Math.round((theta - baseTheta) / (2 * Math.PI)) * 2 * Math.PI;
  if (Math.abs(to - from) > 0.01) tween(650, (t) => { theta = from + (to - from) * t; }, easeInOut);
}
function kickAi() { if (!local && state.turn === them && !state.over) (async () => { busy = true; await wait(400); busy = false; react('think'); const m = await aiMove(state); if (mood === 'think') react('calm'); if (m !== null) { select(m); await wait(500); await play(m); } })(); }
async function undo() {
  if (online) return askBack();
  if (busy) return;
  const u = undoPlan({ moves: state.moves, turn: state.turn, you, local }); if (!u) return; // two of us: one move back, and the board turns back to whoever played it
  const before = state, after = replay(u.keep, state.variant, state.rules, state.first);
  hideExplain(); deselect(); busy = true; $('#undo').disabled = true; $('#hintBtn').disabled = true; if (!local) say('undo');
  const words = undoWords({ local, gone: u.gone, name: names[level], mover: LNAMES[seatOf(after)] }); // (after.turn: whoever played the move that goes)
  sim.finish(); layoutFromState(before); // the seeds go back from where they lie, not in a jump (web/takeback.js)
  await flyBack(before, after, u.played, words);
  state = after; layoutFromState(state); busy = false; refreshStatic(); deselect(); save(); click(0.7, 0.06);
  if (local) await passTurn();
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
  if (!text || params.get('still') || params.get('capture') || puzzle.on) return;
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
const clampDist = () => { dist = Math.min(fitDist * 1.6, Math.max(fitDist * 0.5, dist)); };
canvas.addEventListener('pointerdown', (e) => {
  if (!shoutMenu.hidden) toggleShoutMenu(false); // a tap on the board closes the shout row
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId);
  if (fingers.size === 2) { const [a, b] = [...fingers.values()]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), dist0: dist }; down = null; dragged = true; return; }
  down = { x: e.clientX, y: e.clientY, t: theta, p: phi }; dragged = false;
  holdStart(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (holding.timer && (fingers.size > 1 || !stillHolding(e.clientX - holding.x, e.clientY - holding.y))) holdStop(); // a pinch or a drag: not a count
  if (holding.done && down) return; // a finger that has counted rests where it is: the board does not turn under it
  if (pinch && fingers.size === 2) { const [a, b] = [...fingers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); dist = pinch.dist0 * (pinch.d0 / Math.max(d, 1)); clampDist(); return; }
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 8) dragged = true;
  if (dragged) { theta = down.t - dx * 0.006; phi = Math.min(1.3, Math.max(0.35, down.p - dy * 0.006)); }
});
const lift = (e) => { fingers.delete(e.pointerId); if (fingers.size < 2) pinch = null; };
canvas.addEventListener('pointercancel', (e) => { lift(e); down = null; holdStop(); holding.done = false; });
canvas.addEventListener('pointerup', (e) => {
  const wasPinch = !!pinch || fingers.size > 1; lift(e); holdStop();
  if (holding.done) { holding.done = false; down = null; return; } // the press counted a pit: it was never a tap
  const wasDrag = dragged; down = null; if (wasPinch || wasDrag) return;
  if (hurry.depth > 0) { hurryNow(); return; } // a tap while a turn plays hurries it
  if (!canPress()) return;
  ptr.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(board.targets)[0]; if (!hit) return deselect();
  pressPit(hit.object.userData.pit);
});
// the mouse on the Mac (or a Fold with a trackpad): the pit under the pointer says what a click will do before you click —
// a hand and a faint brass ring on a pit you can play, a not-allowed sign (and why) on one the feed rule bars, a grab hand on the
// wood (drag to turn the board). web/hover.js decides; a finger never hovers. Looked at again a few times a second, so it follows
// the game (the reply lands, your move comes back) without the mouse moving.
const mouse = { x: 0, y: 0, in: false, pit: null, words: null, base: null, at: 0, ring: 0 };
function pitUnder(x, y) { ptr.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera); const h = ray.intersectObjects(board.targets)[0]; return h ? h.object.userData.pit : null; }
function hoverWords(w) {
  const el = $('#hint');
  if (mouse.words && el.textContent === mouse.words) el.textContent = mouse.base; // put back what the line said before
  mouse.words = null; if (!w) return;
  mouse.base = el.textContent; mouse.words = w; el.textContent = w;
}
function paintHover() {
  if (!mouse.in || body.classList.contains('screen') || clipping) { if (mouse.pit !== null || mouse.words) { mouse.pit = null; hoverWords(null); } canvas.style.cursor = ''; mouse.ring = 0; return; }
  const pit = dragged && down ? null : pitUnder(mouse.x, mouse.y);
  const h = hoverAt({ state, pit, you, press: canPress(), hurry: hurry.depth > 0, busy, selected, dragging: !!(down && dragged) });
  canvas.style.cursor = h.cursor; mouse.ring = h.ring ? 1 : 0;
  if (h.ring) { const [x, z] = pitCenters[pit]; board.hover.position.x = x; board.hover.position.z = z; }
  if (pit !== mouse.pit || h.words !== mouse.words) { mouse.pit = pit; if (h.words !== mouse.words) hoverWords(h.words); }
}
function hoverStep(now, dt) { // called by the render loop: look again every ~120 ms, and fade the ring in and out
  if (mouse.in && now - mouse.at > 120) { mouse.at = now; paintHover(); }
  const m = board.hover.material, want = mouse.ring * 0.45;
  m.opacity = reduceMotion ? want : m.opacity + (want - m.opacity) * Math.min(1, dt * 14);
  board.hover.visible = m.opacity > 0.01;
}
canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; mouse.at = 0; });
canvas.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; mouse.in = false; paintHover(); });
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { mouse.in = false; paintHover(); } }); // a finger or a pen: no hover
canvas.addEventListener('wheel', (e) => { dist += e.deltaY * 0.001; clampDist(); }, { passive: true });
canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // a long press counts a pit; it never opens the phone's menu
// count a pit by touch (web/count.js): press and hold any pit and its seeds are counted one by one, as a finger does at a real
// board — each seed hops a little with a tick and a tap, a brass number over the pit counts up with them, the hint line says it
function holdStart(e) {
  holdStop(); holding.done = false;
  if (!canCount({ screen: body.classList.contains('screen'), clipping, playing: hurry.depth > 0, replaying, fingers: fingers.size })) return;
  const pit = pitUnder(e.clientX, e.clientY); if (pit === null) return;
  holding.x = e.clientX; holding.y = e.clientY;
  holding.timer = setTimeout(() => { holding.timer = null; if (hurry.depth > 0 || replaying || clipping) return; holding.done = true; countPit(pit); }, window.__holdMs || HOLD_MS); // (the render check stretches it: a software-rendered page hands a finger's moves over late)
}
function holdStop() { if (holding.timer) { clearTimeout(holding.timer); holding.timer = null; } }
function countSay(w) { // the hint line says the count, and goes back to what it said once the number has gone (unless the game moved it on)
  const el = $('#hint');
  if (counting.words && el.textContent === counting.words) el.textContent = counting.base;
  counting.words = null; if (!w) return;
  counting.base = el.textContent; counting.words = w; el.textContent = w;
}
async function countPit(pit) {
  const run = ++counting.run; if (mouse.words) hoverWords(null);
  const lying = homes[pit].slice(), n = state.pits[pit], plan = countPlan(n, { reduce: reduceMotion });
  const words = countWords({ state, pit, you }); countSay(words);
  const el = counting.el; counting.pit = pit; el.hidden = false; el.classList.remove('done', 'fade'); el.textContent = n === 0 ? '0' : '·';
  if (counting.log.length < 200) counting.log.push(`${pit}:${n}`);
  placeCount(); buzz(n === 0 ? 14 : 6);
  if (n === 0) click(0.8, 0.05);
  for (let k = 0; k < n; k++) {
    if (run !== counting.run) return;
    await wait(k === 0 ? 0 : plan[k] - plan[k - 1]); if (run !== counting.run) return;
    const m = lying[k];
    if (m && m.userData.home === pit && !sim.has(m) && !reduceMotion) { // the seed hops where it lies, as a finger touches it
      const v = m.userData.v, y0 = m.position.y;
      tween(170, (t) => { if (m.userData.v === v) m.position.y = y0 + Math.sin(t * Math.PI) * 0.009; }).then(() => { if (m.userData.v === v) m.position.y = y0; });
    }
    el.textContent = String(k + 1); if (!reduceMotion) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
    click(1.25 + Math.min(k, 24) * 0.025, 0.035); buzz(4);
  }
  if (run !== counting.run) return;
  el.classList.add('done'); if (n > 0) click(1.9, 0.05); // the last seed counted: a brighter tick, and the number glints
  await wait(COUNT_STAY_MS); if (run !== counting.run) return;
  el.classList.add('fade'); await wait(260); if (run !== counting.run) return;
  endCount();
}
function endCount() { counting.run++; counting.pit = null; counting.el.hidden = true; counting.el.classList.remove('done', 'fade'); countSay(null); }
const cv = new THREE.Vector3();
function placeCount() {
  if (counting.pit === null) return; const [x, z] = pitCenters[counting.pit];
  cv.set(x, BT + 0.02, z).project(camera); counting.el.style.transform = `translate(${(cv.x * 0.5 + 0.5) * canvas.clientWidth}px, ${(-cv.y * 0.5 + 0.5) * canvas.clientHeight}px)`;
}
// may a pit be pressed right now? (your move, the board showing, nothing in flight, a friend across the board if online)
function canPress() { return !(busy || state.over || state.turn !== you || body.classList.contains('screen') || (puzzle.on && puzzle.played) || (online && !friend)); }
// a press on a pit — a tap, a click, a digit, or Enter on its hidden button: first press picks it, the second sows it
function pressPit(pit) {
  if (!canPress()) return false;
  if (lesson.on && pit !== LESSON[lesson.k].pit) { shake(pit); $('#hint').textContent = LESSON_WRONG; return false; } // the lesson plays its own pit
  const legal = legalMoves(state);
  if (!legal.includes(pit)) { if (owner(pit) === you && state.pits[pit] > 0) { $('#hint').textContent = feedWords(narrowOf(state, you), { you }) || 'you must give the other side seeds'; shake(pit); } else shake(pit); return false; }
  if (selected === pit) sow(pit); else select(pit);
  return true;
}
function sow(pit) { if (lesson.on) lessonPlay(pit); else if (puzzle.on) puzzlePlay(pit); else if (online) sendMove(pit); else play(pit); }
// the keyboard (the Mac, or a Fold with one): 1–6 pick your pits near to far, Enter sows, U undoes, H hints, Esc puts the pit back or closes a card
addEventListener('keydown', (e) => {
  if (e.defaultPrevented) return;
  const t = e.target; const a = keyAction(e, { tag: t && t.tagName, editable: !!(t && t.isContentEditable), you });
  if (!a) return;
  if (a.type === 'deselect') { // Esc closes what is open, nearest first
    if (!shoutMenu.hidden) toggleShoutMenu(false); else if (!$('#rules').hidden) $('#rules').hidden = true; else if (selected !== null && !busy) deselect(); else return;
    return e.preventDefault();
  }
  if (a.type === 'sow' && hurry.depth > 0 && hurryNow()) return e.preventDefault(); // Space / Enter while a turn plays hurries it
  if (body.classList.contains('screen') || !$('#gameover').hidden || !$('#nameCard').hidden || !$('#knockCard').hidden || !$('#backCard').hidden) return; // keys play the board, not the screens or a card
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
else if (params.get('still')) { // a render for Meka: a mid-game position with pit 4 selected (?still=late: near the end, both troughs full)
  if (params.get('still') === 'late') { state.pits = [0, 1, 0, 2, 1, 0, 0, 1, 1, 0, 1, 1]; state.stores = [18, 22]; }
  else { state.pits = [4, 3, 2, 6, 1, 5, 4, 2, 7, 0, 3, 0]; state.stores = [8, 5]; }
  layoutFromState(state); refreshStatic(); select(3); showScreen('play');
} else if (params.get('lesson') && !params.get('stay')) { // ?lesson=1: the lesson straight away, as a new phone (with ?stay=home: Home, as a new phone, so Play opens it)
  openLesson('play');
} else if (params.get('puzzle')) { // the shared link, and the render: straight to today's puzzle
  openPuzzle(); if (location.search && !params.get('capture')) history.replaceState(null, '', location.pathname);
} else if (params.get('capture') && !params.get('stay')) { // the smoke test starts straight into a game
  newRound(); showScreen('play'); if (tipStep === 0) { showTip(TIPS[0]); }
} else {
  showScreen('home'); if (tipStep === 0) $('#playBtn').addEventListener('click', () => showTip(TIPS[0]), { once: true });
}

window.__ayo = { get lesson() { return { on: lesson.on, k: lesson.k, phase: lesson.phase, pit: lesson.on && lesson.k < LESSON.length ? LESSON[lesson.k].pit : null, title: $('#pzAsk').textContent, top: $('#pzHow').textContent, card: $('#lsCard').hidden ? null : $('#lsWords').textContent, next: $('#lsNext').textContent, skip: $('#pzHome').textContent, kept: prefs.get('lesson', null), tutorial: prefs.get('tutorial', null) }; }, get nextUp() { return $('#goNext').hidden ? null : { text: $('#goNext').textContent, level: $('#goNext').dataset.level }; }, get wake() { wakeCheck(); return { held: wake.held, wanted: wake.wanted, supported: wake.supported, log: wake.log.slice() }; }, wakeIdle: (ms) => { wakeSkew += ms; }, get feed() { const n = narrowOf(state, you); return { narrow: n, rings: board.may.map((m, i) => m.visible && m.material.opacity > 0.2 ? i : -1).filter((i) => i >= 0), barred: badges.map((b, i) => b.classList.contains('barred') ? i : -1).filter((i) => i >= 0), hint: $('#hint').textContent, selected }; }, get count() { return { pit: counting.pit, shown: !counting.el.hidden, text: counting.el.textContent, words: counting.words, hint: $('#hint').textContent, log: counting.log.slice(), done: counting.el.classList.contains('done') }; }, get hover() { return { cursor: canvas.style.cursor, ring: board.hover.visible && board.hover.material.opacity > 0.2, pit: mouse.pit, at: board.hover.visible ? [board.hover.position.x, board.hover.position.z] : null, sel: board.ring.visible ? [board.ring.position.x, board.ring.position.z] : null, op: board.hover.material.opacity }; }, get away() { return { count: away.count, words: away.words, title: document.title, icon: (document.querySelector('link[rel="icon"]') || {}).href || '' }; }, get handLog() { return hands.log.slice(); }, get hand() { return { sow: hands.sow.el.hidden ? null : hands.sow.el.textContent, haul: hands.haul.el.hidden ? null : hands.haul.el.textContent, at: hands.sow.el.hidden ? null : hands.sow.el.getBoundingClientRect().toJSON() }; }, get story() { return story ? { words: $('#goStoryWords').textContent, hidden: $('#goStory').hidden, biggest: story.biggest, forGood: story.forGood, final: story.final } : null; }, watchBigTurn, react, get busy() { return busy; }, get seeds() { return seeds.map((m) => [m.position.x, m.position.y, m.position.z, sim.has(m) ? 1 : 0]); }, get room() { return net ? { code: net.code, seat: net.seat, status: net.status, friend, knock: net.knock, knocks: (net.room && net.room.knocks) || [] } : null; }, pitAt: (i) => { v3.set(pitCenters[i][0], BT, pitCenters[i][1]).project(camera); return [(v3.x * 0.5 + 0.5) * canvas.clientWidth, (-v3.y * 0.5 + 0.5) * canvas.clientHeight]; }, get mood() { return mood; }, get quality() { return { ...quality, tier: Q, physics: PHYS.physics, physicsReason: PHYS.reason }; }, get streak() { return streak; }, get record() { return records; }, get level() { return level; }, get seat() { return you; }, get local() { return local; }, get theta() { return theta; }, get tweens() { return tweens.length; }, get seedSet() { return seedSetId(); }, get state() { return state; }, get legal() { return legalMoves(state); }, tryPit: (i) => puzzle.p ? attempt(puzzle.p, i).got : null, get puzzle() { return puzzle.p ? { on: puzzle.on, played: puzzle.played, got: puzzle.got, key: puzzle.p.key, target: puzzle.p.target, answer: puzzle.p.answer, daily } : null; }, get selected() { return selected; }, get path() { return path; }, get explain() { return theirs ? { pit: theirs.pit, name: theirs.name, words: $('#lastWords').textContent, order: theirs.path.order, captures: theirs.path.captures, end: theirs.path.end, moves: theirs.before.moves.length } : null; }, get replaying() { return replaying; }, get circling() { return { on: !circEl.hidden, left: $('#circlingLeft').textContent, words: $('#circlingWords').textContent, ripples: circ.ripples, first: circ.first || null, isNew: circEl.classList.contains('new'), calling: circEl.classList.contains('calling'), eyebrow: $('#goEyebrow').textContent }; }, get last8() { return { on: !last8El.hidden, words: $('#last8Words').textContent, hops: last8.hops, lit: badges.filter((b) => b.classList.contains('last')).length, isNew: last8El.classList.contains('new') }; }, get hurry() { return { on: hurry.on, playing: hurry.depth > 0, words: hurry.words, hint: $('#hint').textContent }; }, hurryNow, replayLast, get take() { return take ? { pit: take.pit, played: take.played, kind: take.take.kind, gap: take.take.gap, words: $('#takeWords').textContent, order: take.path.order, captures: take.path.captures, end: take.path.end, moves: take.before.moves.length } : null; }, playTake, rate: (s) => aiRate(s || state, 'hard'), get marks() { const M = board.marks; return { steps: M.steps.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), caps: M.caps.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), gifts: M.gifts.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), risk: M.risk.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), end: M.end.visible }; }, get answer() { return answer; }, clip: () => recordClip(false), shout: (id) => sendShout(id), hitTest: (x, y) => { ptr.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera); return ray.intersectObjects(board.targets).map((h) => h.object.userData.pit); } };

// the render loop stops while the tab is hidden and restarts when it comes back; only ever one loop at a time
let frames = 0, last = performance.now(), running = false;
function loop(now) {
  runTweens(now); hoverStep(now, (now - last) / 1000); sim.step((now - last) / 1000, now); if (pathGlow && !reduceMotion) board.marks.end.material.opacity = 0.34 + 0.1 * Math.sin(now / 240); if (feed.on && !reduceMotion) for (const pit of feed.rings) { const m = board.may[pit]; if (m.visible && m.scale.x <= 1.001) m.material.opacity = 0.6 + 0.15 * Math.sin(now / 320); } if (riskGlow && !reduceMotion) for (const r of board.marks.risk) if (r.visible) r.material.opacity = 0.56 + 0.14 * Math.sin(now / 320); if (idle && !reduceMotion) theta += (now - last) * 0.00004; else if (cinematic && !reduceMotion) theta += (now - last) * 0.000025; /* the clip drifts slowly round the board */ last = now; placeCam(); placeBadges(); placeHands(); renderer.render(scene, camera); frames++;
  if (frames === 3) { window.__done = true; if (params.get('still')) { running = false; return; } }
  if (window.__freeze || document.hidden) { running = false; return; }
  requestAnimationFrame(loop);
}
function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
document.addEventListener('visibilitychange', () => { if (!document.hidden && !window.__freeze && !params.get('still')) start(); });
start();
// ---------- inside the store apps: the phone's back button, share sheet, haptics and keep-awake (web/app.js; nothing on the web link) ----------
startApp(() => {
  const screen = !$('#settings').hidden ? 'settings' : !$('#rooms').hidden ? 'rooms' : !$('#puzzle').hidden ? 'puzzle' : !$('#home').hidden ? 'home' : 'play';
  const step = backStep({ rules: !$('#rules').hidden, shouts: !shoutMenu.hidden, door: !$('#knockCard').hidden || !$('#backCard').hidden, name: !$('#nameCard').hidden, gameover: !$('#gameover').hidden, screen, online, busy });
  if (step === 'shouts') toggleShoutMenu(false); else if (step !== 'stay' && step !== 'minimize') $('#' + step).click();
  return step;
});
