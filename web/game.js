// The game: engine state → 3D seeds, animated move by move. Every move the picture shows comes from engine events.
import * as THREE from 'three';
import { newGame, applyMove, legalMoves, replay, owner, firstMover, RULES, totalSeeds } from '/engine/ayo.js';
import { SeedSim } from './physics.js';
import { CHARACTERS, line, faceFor, MOOD_FOR, runLine as runWord, RUN_MOOD } from './characters.js';
import { parse as parseRecord, record as recordGame, standing, cardLine as recordLine } from './record.js';
import { parse as parseRating, rate as rateGame, homeLine as ratingHome, cardWords as ratingWords, tickAt, signed } from './rating.js';
import { decideQuality, decidePhysics, browserEnv, tier } from './quality.js';
import { decideSaver, saverPlan, drawDue, toastFor, noteFor, watchBattery } from './battery.js';
import { parse as parseStreak, recordDay, unlocked, homeLine, MILESTONES, dayKey } from './streak.js';
import { greetMoment } from './greet.js';
import { bestTurn, clipPace, clipCaption } from './clip.js';
import { dailyPuzzle, attempt, shareText, todayKey } from '../engine/puzzle.js';
import { parse as parseDaily, record as recordDaily, entry as dailyEntry, solvedRun, cardLine, resultLabel, runLine, dayLabel, canShow, markShown } from './daily.js';
import { Online, stateFrom, inviteLink, cleanCode, inviteText, whatsappLink } from './online.js';
import { startApp, backStep, haptic, wsUrl, publicBase, linkable, legalLink, inApp, plugin, platform } from './app.js';
import { makeShop, makeTestStore } from './purchase.js';
import { winWave, waveOrder, hopAt, waveLength, lampAt, HOP_MS, SETTLE_MS } from './winwave.js';
import { dealPlan, dealsIn, GAP_MS as DEAL_GAP_MS, PIT_GAP_MS as DEAL_PIT_GAP_MS, FLY_MS as DEAL_FLY_MS, LIFT as DEAL_LIFT } from './deal.js';
import { parseOwned, previewOf, levelOpen, playable, lockedWords, GOLD_LEVELS, featureOpen, featureLockedWords, LOOKS, lookOpen, seedSetFor, lookLockedWords, seedsLine, finishFor, boardsLine } from './entitle.js';
import { storeView, tapAction, restoreWords } from './store.js';
import { reviewPlan, reviewOf, summaryWords, stepWords, OPEN_LINES, CLEAN_LINE, END_LINE } from './review.js';
import { SHOUTS, shoutText, shoutKnocks, SHOUT_GAP_MS, SHOUT_SHOW_MS } from './shouts.js';
import { CallFlow, callWords, pickMode, LineWatch, LINE } from './call.js';
import { Talk } from './talk.js';
import { keyAction, pitKey, pitLabel, pitEnabled, hintText } from './keys.js';
import { restOf, isOff, glideMs, glideAt, isDoubleTap, mayStraighten, tipWords as straightTip } from './view.js';
import { hurried, squeeze, longTurn, canHurry, hurryWords, HURRY_FLY_MS } from './hurry.js';
import { slamOf, slamMoment, SLAM_NOTE } from './slam.js';
import { sowPath, pickedHint, hintedHint, playedWords, answerOf, giftNoteWords } from './path.js';
import { takeOn as judgeMove, takeWords, takeLine, NAME as COACH } from './coach.js';
import { sidewaysAngle, SIDE_PHI } from './sideways.js';
import { retryOf, isRetry, retryOffer, retryButton, retryToast, retryEyebrow, retryLine, retryShare } from './retry.js';
import { playoutOf, isPlayout, canPlayOut, playedOut, undoOk, undoReady, playoutButton, playoutToast, playoutEyebrow, playoutShare } from './playout.js';
import { NAMES as LNAMES, PLAY_SUB as LOCAL_SUB, seatOf, swingTheta, badgeFlip, turnWords as localTurn, overTitle as localTitle, continueLine as localContinue, undoTo as localUndo, shareText as localShare, nearSeatAt, tableCards, tableStart, setNames as setLocalNames, readNames, keepNames, faceMark, pillLine } from './local.js';
import { buildBoard, buildTable, buildLights, seedMaterialFor, seedGeometryFor, SEED_SETS, pitCenters, storeCenters, surfaceY, PIT_R, PIT_D, STORE_RX, STORE_RZ, STORE_D, STORE_FLAT, BT, BW, BL, R as CORNER } from './board.js';
import { pour, place, reach } from './slots.js';
import { boardAudio, handful } from './sound.js';
import { makeMusic, musicWanted, musicNote } from './music.js';
import { makeI18n, pickLang, langNote, keepTyped } from './i18n.js';
import { applyScale, sizePref, sizeNote, sizeToast } from './textsize.js';
import { inLast8, crossed as crossedLast8, last8Words, crossedWords } from './last8.js';
import { gameStory, storyWords, storyPath } from './story.js';
import { handSteps, handText, handShown, haulKind } from './handcount.js';
import { parseStarts, recordStart, nextStart, startWords } from './starts.js';
import { decodeGame, watchQuery, titleWords as watchTitle, moveWords as watchMove, endWords as watchEnd, linkWords as watchLink } from './watch.js';
import { parse as parseTally, record as recordTally, roomKey, entryOf as tallyOf, cardLine as tallyLine, startLine as tallyStart, standingParts, wentUp, played as tallyPlayed } from './tally.js';
import { makeAway } from './away.js';
import { hoverAt } from './hover.js';
import { HOLD_MS, COUNT_STAY_MS, countPlan, canCount, stillHolding, countWords } from './count.js';
import { mayAsk as mayAskBack, backWords, planReturn, undoPlan, undoWords } from './takeback.js';
import { narrowOf, feedWords, onlyLead } from './feed.js';
import { circling as circlingOf, began as beganCircling, circlingRest, circlingWords, beganWords as circlingBegan, endedCircling, endedWords as circlingEnded, CALLING } from './circling.js';
import { makeWake, wakeNote } from './wake.js';
import { makeRest } from './rest.js';
import { makeGlWatch, lineWords as glLineWords, WORDS as GL_WORDS } from './glloss.js';
import { makeFresh, buildOf, safeNow as freshSafe, fetchBuild, FIRST_MS as FRESH_FIRST, EVERY_MS as FRESH_EVERY } from './fresh.js';
import { makeFrameMeter, MIN_FRAMES, slowVerdict, mayJudge, lastGameWords, lastGameRecord, parseRecord as parseFrames, SLOW_TOAST } from './frametime.js';
import { makeTelemetry, memorySink, resultOf, teleNote } from './telemetry.js';
import { makeReminders, testNotifications, remindNote, hourOf, hourLabel, offerShown, offerWords } from './remind.js';
import { STEPS as LESSON, stepsOf as lessonSteps, lessonGame, doneEyebrow as lessonDoneEyebrow, DONE_LINE as LESSON_DONE_LINE, ROW_LINE as LESSON_ROW, DONE as LESSON_DONE, startState as lessonStart, eyebrow as lessonEyebrow, SKIP as LESSON_SKIP, replyWords as lessonReply, wrongPit as LESSON_WRONG, isNewPhone, lessonDue, firstLevel, nextUp } from './lesson.js';
import { phoneTag, Blocked, mayBlock, sortKnocks, blockWords, ARM_MS as BLOCK_MS, REPORT_PAGE, REPORT_HASH } from './block.js';
import { makeWaiting, WAIT_MOOD, drumPit, shiverAt, DRUM_MS, DRUM_GAP_MS, DRUMS } from './waiting.js';
import { lastMarkPit, lastMarkOp, withLast } from './lastmark.js';
import { nextLine, nextTick, dayTurned } from './nextday.js';
import { raceOf, raceWords, raceGlint } from './race.js';
import { makeSender as peekSender, peekShown, peekWords, OPACITY as PEEK_OP, GLIDE as PEEK_GLIDE } from './peek.js';
import { ponderOn, ponderPlan, ponderAt, GLANCE_MS, SETTLE_MS as PONDER_SETTLE_MS, GLIDE as PONDER_GLIDE } from './ponder.js';
import { mayOfferDraw, drawButton, drawWords } from './draw.js';
import { makeGuard, BUTTON as GIVEUP, BUTTON_KEYS as GIVEUP_KEYS, gaveUpWords, mayGiveUp, ARM_MS as GIVEUP_MS } from './giveup.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const GOLD_PREVIEW = previewOf(location.search); // ?try=master: Papa Ike open for this visit (until Gold can be bought)
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const prefs = { get: (k, d) => { try { return localStorage.getItem('ayo.' + k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('ayo.' + k, v); } catch {} } };
// bigger words (web/textsize.js): Settings → Language → Word size; ?textsize=large|larger for a visit (the checks)
const textSizeNow = () => sizePref(params0().get('textsize') || prefs.get('textsize', 'normal'));
function params0() { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(); } }
applyScale(document, textSizeNow());
// the page's language (web/i18n.js, Launch L18): Settings → Language, Auto follows the phone; ?lang=fr|en for a visit
const langPref = () => params.get('lang') || prefs.get('lang', 'auto');
const i18n = makeI18n({ doc: document, lang: pickLang(langPref(), navigator.languages || [navigator.language]) }).start();
window.__i18n = i18n;
const tLines = (s) => s.split('\n').map((l) => i18n.t(l)).join('\n'); // words that leave the page (share, clipboard) in its language, line by line
// block and report (web/block.js): this phone's random tag, sent with a room's create / join / rejoin, and who it has blocked
const myTag = phoneTag(prefs); const blocked = new Blocked(prefs);
// a new phone (nothing of the game kept on it): its first Play opens the lesson and it starts against Adaeze (web/lesson.js);
// the scripted renders (?capture) are never one unless they ask with ?lesson=1
const newPhone = params.get('lesson') === '1' || (!params.get('capture') && isNewPhone((k) => prefs.get(k, null)));

// ---------- renderer / scene ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!(params.get('still') || params.get('capture')) });
const phone = Math.min(innerWidth, innerHeight) < 500;
// picture quality: the full board, or a lighter one on slow phones and slow connections (Settings → Feel → Lighter board)
// (and Auto remembers a phone seen drawing the full board slowly: web/frametime.js; the lighter board from the next open)
const quality = decideQuality(browserEnv(prefs.get('quality', 'auto'), params.get('lite'), prefs.get('quality.measured', null)));
const Q = tier(quality.lite);
// seed physics: the bounce-and-roll, or a plain flight from hand to pit on the weakest phones (Settings → Feel → Seed physics; Auto follows the lighter board)
// go easy on a low battery (web/battery.js): at 20% or less and not charging, drawn at most 30 times a second, one pixel per screen
// pixel, and seeds fly straight on Auto; back to full on the charger. Settings → Feel → Battery saver
const batt = { level: null, charging: false, s: decideSaver({ pref: prefs.get('battery', 'auto'), param: params.get('battery') }), plan: null, lastDrawn: -Infinity, skipped: 0, minGap: Infinity, log: [] };
batt.plan = saverPlan(batt.s.on, window.devicePixelRatio || 1);
let PHYS = decidePhysics({ pref: prefs.get('physics', 'auto'), lite: quality.lite, param: params.get('physics'), saver: batt.s.on });
const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, Q.lite ? Q.maxPixelRatio : phone ? 1.5 : 2);
// ?drawscale (the scripted frame check only, tools/frame-check.py): fewer pixels for the container's software WebGL, so many frames of the
// page's own work can be measured; the scene, and everything the page does each frame, is unchanged
const drawRatio = () => (batt.plan.on ? Math.min(PIXEL_RATIO, batt.plan.pixelRatio) : PIXEL_RATIO) * (params.get('capture') && +params.get('drawscale') > 0 ? Math.min(1, +params.get('drawscale')) : 1);
renderer.setPixelRatio(drawRatio());
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d0906);
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 20);
let visitOwned = null; // the test store's purchases (?store=test): this visit only, never kept
const shop = { from: 'home', tryFinish: null, trySeeds: null }; // the store (L11): what is on the board for a look, never kept
const finishId = () => finishFor(params.get('finish') || prefs.get('finish', 'mahogany'), { owned: owned(), preview: GOLD_PREVIEW }); // a store board only once it is yours (or ?try=looks)
const finish = finishId();
const board = buildBoard(scene, finish, Q); buildTable(scene, Q); const lamp = buildLights(scene, Q.lite ? Q.shadow : phone || (window.devicePixelRatio || 1) > 2 ? 1024 : 2048);
// seed set: Job's tears; river stones once the calm streak has unlocked them; cowries and palm kernels once bought (or ?try=looks)
let streak = parseStreak(prefs.get('streak', null));
keepTyped(setLocalNames(...readNames(prefs.get('localNames', '')))); // two of us: the names typed in Settings → Opponent → Our names (web/local.js)
const seedSetId = () => shop.trySeeds || seedSetFor(prefs.get('seeds', 'jobs'), { stones: unlocked(streak, 'stones'), owned: owned(), preview: GOLD_PREVIEW });
let SET = SEED_SETS[seedSetId()]; let seedMat = seedMaterialFor(seedSetId(), Q); const seedMats = { [seedSetId()]: seedMat }; let seedGeometry = seedGeometryFor(Q, seedSetId()), seedGeometryOver = seedGeometryFor(Q, seedSetId(), true);
function applySeedSet() { // swap every seed's look and shape in place (no new game needed)
  const id = seedSetId(); SET = SEED_SETS[id]; seedMat = seedMats[id] = seedMats[id] || seedMaterialFor(id, Q); seedGeometry = seedGeometryFor(Q, id); seedGeometryOver = seedGeometryFor(Q, id, true);
  for (const m of seeds) { m.material = seedMat; m.geometry = m.userData.over ? seedGeometryOver : seedGeometry; const j = m.userData.jit; m.scale.set(SET.r[0] * j[0], SET.r[1] * j[1], SET.r[2] * j[2]); }
  for (const k in homes) homes[k].forEach((m, i) => { if (!sim.has(m)) put(m, slotPose(k === 'S0' || k === 'S1' ? k : +k, i, m)); });
  if (audio) audio.voice(id); // each seed set lands with its own sound (web/sound.js VOICES)
}
// a seed set just chosen (Settings, or tried in the store): a handful let fall, so you hear it as well as see it
const tasted = []; // the seed sets heard this visit (for tools/render.py --voice)
function taste() {
  buzz(8); if (!soundOn()) return; const id = seedSetId(); tasted.push(id);
  try { const a = sound(); a.voice(id); for (const h of handful()) { heard('land', h.k, h.onSeed, 0, TUNE[3]); a.land(h.k, h.onSeed, 0, TUNE[3], h.when); } } catch {}
}
const sim = new SeedSim(surfaceY);

// camera: the board upright in your hands, you at the near end
let baseTheta = 0; /* π when you hold the far seat of an online room: your pits still nearest you */ let theta = 0, phi = 0.72, dist = 1.55; const target = new THREE.Vector3(0, 0.02, 0.02);
// A phone held sideways (or any short, wide window): the board turns a quarter round and lies across the screen, your row of
// pits nearest you, as at a real board between two players — about twice the size, the pits far easier to tap. `side` is
// that quarter turn; theta stays the seat's angle (0 or π, the swings, a drag), so nothing else needs to know (web/sideways.js).
let side = 0;
function placeCam() { const a = theta + side; camera.position.set(target.x + dist * Math.sin(phi) * Math.sin(a), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.cos(a)); camera.lookAt(target); }
let wide = null, fitDist = 1.55, fitPhi = 0.72; // fitPhi: the tilt the framing chose (the board's rest, web/view.js)
const CLOSE = params.get('still') === 'close';
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
  phi = side ? SIDE_PHI : wide ? 0.5 : 0.72 + 0.14 * Math.min(1, Math.max(0, (1.5 - fh / fw) / 0.6));
  const th = theta; theta = 0; camera.clearViewOffset();
  let lo = 0.5, hi = 8;
  for (let i = 0; i < 22; i++) { dist = (lo + hi) / 2; placeCam(); const b = onScreen(w, h); if (b.r - b.l <= fw && b.b - b.t <= fh) hi = dist; else lo = dist; }
  dist = fitDist = hi; fitPhi = phi; placeCam(); const b = onScreen(w, h);
  camera.setViewOffset(w, h, ((b.l + b.r) - (R.l + R.r)) / 2, ((b.t + b.b) - (R.t + R.b)) / 2, w, h);
  theta = th; placeCam();
  if (CLOSE) { camera.clearViewOffset(); target.set(pitCenters[3][0] - 0.02, 0.06, pitCenters[3][1] + 0.03); phi = 0.78; dist = 0.36; placeCam(); } // ?still=close: a close look at the seeds (the seed-set renders)
}
// the canvas's size in CSS px, read once a resize (L16: the badges and the hand's numbers are placed every frame, and reading the
// canvas's size there made the browser lay the page out again whenever a count or the hint line had just changed)
const view = { w: 0, h: 0 };
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; view.w = w; view.h = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const nowWide = w > h * 1.1; if (nowWide !== wide) { wide = nowWide; theta = baseTheta; }
  side = sidewaysAngle(w, h, params.get('sideways'));
  document.documentElement.classList.toggle('wide', wide); document.documentElement.classList.toggle('sideways', !!side);
  frame();
}
addEventListener('resize', resize); resize();
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (canvas.clientWidth !== view.w || canvas.clientHeight !== view.h) resize(); }).observe(canvas);
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
  const over = rnd() < 0.45; const m = new THREE.Mesh(over ? seedGeometryOver : seedGeometry, seedMat); m.userData.over = over; m.rotation.order = 'XZY'; // turned to its yaw, then leant with what it rests on (slots.js)
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
const watch = { on: false, stop: false, text: '', done: false, i: 0, n: 0 }; window.__watch = watch; // watching a game sent as a link (web/watch.js)
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
  if (!audio) audio = boardAudio(new (window.AudioContext || window.webkitAudioContext)(), seedSetId());
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio;
}
// the store's preview video (tools/store-preview.py) keeps every sound with its moment, to play them again into the video's own sound track
const heard = (kind, ...args) => { if (window.__soundLog) window.__soundLog.push([performance.now(), kind, ...args]); };
const TUNE = [1, 0.95, 1.05, 0.98, 1.07, 0.93, 1.02, 0.96, 1.06, 0.99, 0.94, 1.04]; // each pit carved by hand, each its own note
const tuneOf = (home) => typeof home === 'string' ? 0.78 : TUNE[home] || 1; // the troughs, bigger and deeper, sound lower
const at = (pit) => ({ x: pitCenters[pit][0], y: BT, z: pitCenters[pit][1] });
function panOf(p) { if (!p) return 0; vp.set(p.x, p.y, p.z).project(camera); return Math.max(-0.6, Math.min(0.6, vp.x * 0.55)); } // left of the screen, more in the left ear
// a seed touching down: the physics says when, how hard (0..1) and whether on the wood or on another seed
function land(k, onSeed, p, home) { if (!soundOn()) return; heard('land', k, onSeed, panOf(p), tuneOf(home)); try { sound().land(k, onSeed, panOf(p), tuneOf(home)); } catch {} }
// a tap on the wood: the buttons, a knock at the door, the chimes
function click(pitch = 1, gain = 0.12) { if (!soundOn()) return; heard('tap', pitch, gain); try { sound().tap(pitch, gain); } catch {} }
// a handful of seeds scooped up: quick small clacks as they jostle in the hand
function rattle(n, p) { if (!soundOn()) return; heard('rattle', n, panOf(p)); try { sound().rattle(n, panOf(p)); } catch {} }
// music (L17, web/music.js), off by default: the ubo and the udu, quiet under the board's own sounds, on the board's own
// audio; it waits for the page's first tap (the phone allows no sound before one), sits lower while a turn plays, rests
// in another tab, during the clip and while you talk to a friend, and the speaker on the board silences it with the rest
let music = null, musicUnlocked = false; const musicOn = () => prefs.get('music', '0') === '1';
const callLive = () => ['starting', 'live'].includes(call.f.phase);
function musicCheck() {
  const want = musicWanted({ on: musicOn(), sound: soundOn(), hidden: document.hidden || !!window.__freeze, clipping, call: callLive(), unlocked: musicUnlocked });
  try {
    if (want && !(music && music.playing)) { if (!music) music = makeMusic(sound().ctx); else sound(); music.start(); }
    else if (!want && music && music.playing) music.stop();
    if (music && music.playing) music.duck(busy ? 0.55 : 1);
  } catch {}
}
const musicUnlock = () => { if (musicUnlocked) return; musicUnlocked = true; musicCheck(); };
const buzz = (ms) => { if (prefs.get('haptics', '1') !== '1') return; if (!haptic(ms) && navigator.vibrate && !(navigator.userActivation && !navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); }; // the app's own haptics, else the browser's (which refuses before the page's first tap)

// ---------- HUD ----------
const badges = []; const badgeLayer = $('#badges');
for (let i = 0; i < 12; i++) { const b = document.createElement('span'); b.className = 'badge'; badgeLayer.appendChild(b); badges.push(b); }
const v3 = new THREE.Vector3();
function placeBadges() {
  const w = view.w, h = view.h; const show = prefs.get('badges', '1') === '1';
  pitCenters.forEach(([x, z], i) => {
    const flip = badgeFlip(theta + side); // seen from the far end (the far seat of a room, or two of us passing the phone) the board is the other way round: badges stay at the outer, nearer corner of each pit
    v3.set(x + (i < 6 ? PIT_R * 0.7 : -PIT_R * 0.7), BT + 0.01, z + PIT_R * 0.75 * flip).project(camera);
    const b = badges[i]; const t = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px)`; // written only when it moves
    if (b._at !== t) { b.style.transform = t; b._at = t; } if (b.hidden !== !show) b.hidden = !show;
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
  const w = view.w, h = view.h; if (counting.pit !== null) { if (body.classList.contains('screen')) endCount(); else placeCount(); }
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
const lastM = { mesh: null, t0: 0, pit: -1 }; // which pit they played (web/lastmark.js; the mark itself is made further down)
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
  order.forEach((i) => { const b = pitBtns[i]; b.setAttribute('aria-label', withLast(pitLabel(i, state.pits[i], { you, selected, legal: mine ? legal : null }), i, lastM.pit)); b.disabled = !pitEnabled(i, state.pits[i], { you, mine }); b.setAttribute('aria-pressed', String(selected === i)); });
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
let playout = null; const playingOut = () => !online && !local && isPlayout(playout, state); // a game played on from the daily puzzle (web/playout.js): practice, never saved or counted
let local = false; const swingOn = () => prefs.get('swing', '1') === '1';
// across the table (web/local.js tableCards): two of us with Pass the phone off — the board never turns, so each name card stays
// with its player: the near card is the seat whose pits lie nearest the near edge as the camera sees it (a drag round changes it)
const tableOn = () => local && !swingOn();
const nearCard = () => tableOn() ? nearSeatAt(theta) : you;
let tableNear = null; // the near card's seat as last painted (a drag that brings the other end nearer repaints the cards)
const scoreOf = (seat) => (seat === nearCard() ? $('#myScore') : $('#oppScore'));
function seat(s) { you = s; them = 1 - s; baseTheta = s === 1 ? Math.PI : 0; } // the near seat (the camera gets there by the screen's swing, or passTurn's)
async function passTurn() { // two of us: the player to move takes the near seat; the board turns on round to face them, never back the way it came
  const s = seatOf(state); if (s === you) return;
  busy = true; deselect(); seat(s);
  if (swingOn()) { const from = theta, to = swingTheta(theta, s); click(1.1, 0.04); await tween(700, (t) => { theta = from + (to - from) * t; }, easeInOut); }
  busy = false; refreshStatic();
}
const names = { easy: 'Adaeze', steady: 'Auntie Bisi', medium: 'Nnamdi', hard: 'Mama Ngozi', master: 'Papa Ike' };
const levelLabel = (l) => `${names[l]} · ${l[0].toUpperCase() + l.slice(1)}`;
let state = newGame(settings.game, settings.rules()); let busy = false; let selected = null; let level = settings.level;
let stats = { biggest: 0, captures: 0, started: Date.now() };
// your record against each opponent, kept on this phone (web/record.js): wins–losses and your best win, on their Home pill and the Game over card
let records = parseRecord(prefs.get('record', null));
// the score at the table with a friend (web/tally.js): each room's wins by seat and draws, counted once per game of the room
let tally = parseTally(prefs.get('tally', null)); let tableRoom = null;
// who starts (web/starts.js): as at a real board the loser of the last game against this opponent (or between the two of you) moves first;
// Settings → Rules → Who starts can make it always you or always them. A room's server already starts the loser.
let starts = parseStarts(prefs.get('starts', null));
const startsPref = () => prefs.get('starts.pref', 'loser');
const startKey = (two) => two ? 'local' : level;
const comingStart = (two = settings.mode === 'local') => nextStart(startsPref(), starts[startKey(two)]);
// your rating against the computer (web/rating.js): moves after every finished game against a computer opponent, counted once
// per game like the record; a quiet line on Home, and on the Game over card the number ticks from before to after
let rating = parseRating(prefs.get('rating', null));
function paintRatingHome() { const t = ratingHome(rating); $('#ratingText').textContent = t; $('#ratingLine').hidden = !t; }
function paintRating(a, b) {
  const box = $('#goRating'); if (online || puzzle.on || local) { box.hidden = true; return; }
  const r = rateGame(rating, level, a, b, stats.started); rating = r.data; if (r.counted) prefs.set('rating', JSON.stringify(rating));
  const ch = $('#goRatingChange'), num = $('#goRatingNum');
  ch.textContent = signed(r.change); ch.classList.toggle('down', r.change < 0); ch.classList.remove('pop');
  $('#goRatingWhy').textContent = ratingWords(level, r.change, a > b ? 'win' : a < b ? 'loss' : 'draw', names[level]) + (rating.n < 10 ? ` · ${rating.n} of 10 games, it is still finding you` : '');
  box.hidden = false;
  if (!r.counted || reduceMotion || !r.change) { num.textContent = r.after; return; }
  num.textContent = r.before; const steps = Math.min(Math.abs(r.change), 24), t0 = 700, dt = 45; let last = r.before; // the number ticks, a soft tick on the wood each step
  for (let i = 1; i <= steps; i++) setTimeout(() => { const v = tickAt(r.before, r.after, i / steps); if (v !== last) { last = v; num.textContent = v; click(r.change > 0 ? 1.4 + i * 0.02 : 1.1 - i * 0.01, 0.025); } if (i === steps) { ch.classList.add('pop'); setTimeout(() => ch.classList.remove('pop'), 260); } }, t0 + i * dt);
}
function paintRecordPills() { document.querySelectorAll('.pill[data-level] small.rec').forEach((s) => { s.textContent = standing(records[s.closest('.pill').dataset.level]); }); const lp = $('.pill[data-mode="local"] small.rec'); if (lp) lp.textContent = pillLine(); } // two of us: the names once typed

// ---------- a friend online: the board joins a room (?room=CODE from the invite link) and animates the moves the server sends ----------
// The server runs the same engine and is the referee; this board only asks for a move and shows what comes back. A move
// travels as a few dozen bytes (seat, pit, move count, scores): online.js rebuilds the seeds' path with the same engine, so a
// weak signal carries a whole game in less data than one photo; if a board ever disagrees it fetches the whole room.
const roomParam = params.get('still') ? null : params.get('room');
let online = false, roomWanted = null; // online while a room is open, knocked on or joined (from the Rooms screen, or ?room=CODE from an invite link); roomWanted: 'NEW' or the code asked for
let net = null, friend = null; // friend: the other seat as the server shows it {name, online, wantsRematch}, or null while the room waits
// your move, even in another tab: what the friend does while this page is out of sight is said on the tab's title, icon and the app's badge
let awayIcon = null; const awayIconLoad = () => { if (awayIcon === null) { awayIcon = ''; fetch('./icon.svg').then((r) => r.text()).then((t) => { awayIcon = t; }).catch(() => {}); } };
const away = makeAway({ doc: document, nav: navigator, t: (w) => i18n.t(w), icon: () => awayIcon, chime: () => { click(1.6, 0.07); setTimeout(() => click(2.1, 0.07), 150); } });
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
// A newer game, without asking (web/fresh.js): the web link's page asks now and then which build is out, and updates on Home
// only — quietly when you come back to it after a minute away, or from the brass line under the streak. Never in the apps.
const fresh = makeFresh({ mine: inApp() ? null : buildOf(document), fetchVersion: () => fetchBuild(), reload: () => location.reload(),
  store: { get: (k) => sessionStorage.getItem(k), set: (k, v) => sessionStorage.setItem(k, v) } });
const freshCard = () => ['#gameover', '#nameCard', '#knockCard', '#backCard', '#callCard', '#rules'].some((id) => !$(id).hidden);
const freshScreen = () => !$('#home').hidden ? 'home' : 'other';
const freshOk = () => freshSafe({ screen: freshScreen(), online, lesson: lesson.on, card: freshCard() });
function paintFresh() { const w = fresh.line(freshOk()); const el = $('#freshLine'); el.hidden = !w; if (w) $('#freshWords').textContent = w; }
let freshHidden = document.hidden ? Date.now() : null;
async function freshBack(awayMs) { await fresh.check(); if (!fresh.back(awayMs, freshOk())) paintFresh(); }
if (fresh.on) {
  document.addEventListener('visibilitychange', () => { if (document.hidden) { freshHidden = Date.now(); return; } const away = freshHidden === null ? 0 : Date.now() - freshHidden; freshHidden = null; freshBack(away); });
  setTimeout(() => fresh.check(true).then(paintFresh), FRESH_FIRST);
  setInterval(() => { if (!document.hidden) fresh.check(true).then(paintFresh); }, FRESH_EVERY);
}
$('#freshLine').addEventListener('click', () => { if (freshOk()) fresh.update(); });
// game numbers and crash reports (L13, web/telemetry.js): one switch in Settings → Privacy; no sink until Firebase exists, so
// nothing is recorded today; ?telemetry=test keeps what would be sent in memory for the visit
const teleOn = () => prefs.get('tele', '1') === '1';
const teleSink = new URLSearchParams(location.search).get('telemetry') === 'test' ? memorySink() : null;
const tele = makeTelemetry({ on: teleOn, sink: teleSink, platform: inApp() ? platform() : 'web' });
addEventListener('error', (e) => tele.crash('error', e.error, e.filename, e.lineno));
addEventListener('unhandledrejection', (e) => tele.crash('rejection', e.reason));
// the daily-puzzle reminder (L14, web/remind.js): a local notification from the phone itself, at most once a day, only if switched
// on and only in the apps (?remind=test stands a fake plugin in for the visit); the permission is asked when it is first turned on
const remindFake = new URLSearchParams(location.search).get('remind') === 'test' ? testNotifications({ answer: new URLSearchParams(location.search).get('remindAnswer') || 'granted' }) : null;
const reminders = makeReminders(remindFake || plugin('LocalNotifications'), { t: (w) => i18n.t(w) });
const remindOn = () => prefs.get('remind', '0') === '1';
const remindHour = () => hourOf(prefs.get('remindAt', ''));
function remindSync(ask = false) {
  const p = reminders.sync({ on: remindOn(), hour: remindHour(), variant: settings.game, playedToday: !!dailyEntry(daily, todayKey(), settings.game), ask });
  return p.then((r) => { if (r.denied && remindOn()) prefs.set('remind', '0'); if (!$('#settings').hidden) paintRemind(); return r; });
}
function paintRemind() {
  const on = remindOn(); const sw = $('[data-set="remind"].sw'); sw.setAttribute('aria-checked', String(on)); sw.disabled = !reminders.supported;
  $('#remindNow').textContent = ` · ${remindNote(reminders.supported, on, reminders.permission)}`;
  $('#remindTimeRow').hidden = !reminders.supported; $('#remindTimeRow').classList.toggle('off', !on);
  document.querySelectorAll('[data-set="remindAt"] .segbtn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(remindHour()))));
}
async function remindTurnOn(from) { // the switch or the puzzle card's offer: ask once, keep it on only if the phone says yes
  prefs.set('remind', '1'); const r = await remindSync(true);
  if (r.denied) { toast('Notifications are off for the app — turn them on in the phone\'s settings, then here', 3200); click(0.7, 0.05); return false; }
  toast(`Reminder on · ${hourLabel(remindHour())} each day, only while the puzzle is unplayed`, 2600); click(1.5, 0.08); setTimeout(() => click(2, 0.08), 110); buzz(12);
  return true;
}
const teleVs = () => online ? 'friend' : local ? 'local' : level;
function teleStart(s) { // a game's first move, whoever made it (never the puzzle or the lesson)
  if (puzzle.on || s.moves.length !== 1) return; const first = prefs.get('tele.first', null) === null; if (first) prefs.set('tele.first', 'started');
  tele.track('game_start', { game: s.variant, vs: teleVs(), first }, online ? null : `s:${stats.started}`);
}
const oppLabel = () => online ? (friend ? friend.name : 'Waiting for a friend') : local ? LNAMES[1 - nearCard()] : levelLabel(level);
const defaultMe = $('#meName').textContent;
const myName = () => prefs.get('name', '') || defaultMe || 'Player';
function paintMyName() { const n = local ? LNAMES[nearCard()] : prefs.get('name', '') || defaultMe; $('#meName').textContent = n; $('#goMe span').textContent = n; } // two of us: the near card is whoever is to move
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
  if (ready) $('#waBtn').href = whatsappLink(net.code, inviteLink(net.code, publicBase()), i18n.t); else $('#waBtn').removeAttribute('href');
}
function paintRoomStatus() { // what the room card says, from the connection and the door
  if (!roomsShowing()) return;
  if (!net) return setRoomStatus(rooms.state === 'error' ? 'error' : 'idle');
  if (net.seat === null) return setRoomStatus('opening');
  if (net.status !== 'open') return setRoomStatus('opening', net.status === 'reconnecting' ? 'reconnecting…' : 'connecting…');
  const knocks = sortKnocks((net.room && net.room.knocks) || [], blocked).shown;
  setRoomStatus(knocks.length ? 'door' : 'open', knocks.length ? `${knocks[0].name} is at the door` : undefined);
}
function stopOnline() { // leave before anyone joined (Back on the Rooms screen, or a knock the host refused): the board is yours again, no reload
  callEnd(); away.back(); if (net) { net.leave(); net = null; } friend = null; online = false; roomWanted = null; you = 0; them = 1; baseTheta = 0; theta = 0; busy = false; prefs.set('room', 'null');
  $('#knockCard').hidden = true; hideBackCard(); backAsk.pending = false; backAsk.askedN = -1; drawAsk.pending = false; drawAsk.theirs = false; drawAsk.offeredN = -1; body.classList.remove('online'); if (location.search) history.replaceState(null, '', location.pathname);
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
$('#copyBtn').addEventListener('click', async () => { if (!net || !net.code) return; tele.track('invite_sent', { how: 'copy' }); const link = inviteLink(net.code, publicBase()); try { await navigator.clipboard.writeText(link); toast('Link copied'); click(1.3, 0.06); } catch { toast(link); } });
$('#shareLinkBtn').addEventListener('click', async () => {
  if (!net || !net.code) return; tele.track('invite_sent', { how: 'share' }); const link = inviteLink(net.code, publicBase());
  try { if (navigator.share) await navigator.share({ title: 'Ayo & Nchò', text: i18n.t(inviteText(net.code)), url: link }); else { await navigator.clipboard.writeText(link); toast('Link copied'); } } catch {}
});
$('#waBtn').addEventListener('click', () => { click(1.3, 0.06); if (net && net.code) tele.track('invite_sent', { how: 'whatsapp' }); });
$('#roomsName').addEventListener('click', () => askName("That's me").then(() => { if (net && !friend && net.seat !== null) { net.leave(); net = null; prefs.set('room', 'null'); openRoom(); toast('A new room, with your new name'); } }));
// the door (host's side): the first person knocking is shown; Let in seats them, Not now sends them away; the next knock follows
let doorId = null; const doorRefused = new Set();
function paintDoor() {
  const { shown: knocks, refused } = sortKnocks((net && net.room && net.room.knocks) || [], blocked); const card = $('#knockCard');
  for (const k of refused) if (!doorRefused.has(k.id) && net.let(k.id, false)) doorRefused.add(k.id); // blocked on this phone: turned away quietly, as a Not now
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
  const ch = ([...String(name || '?').trim()][0] || '?').toUpperCase().replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); // a typed name's first letter (an emoji is one), never markup
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
    : waiting ? `room ${net.code || ''}` : !friend.online ? 'away — their seat is held' : state.over ? '' : mine ? 'waiting' : peekNow() ? peekWords(peekIn.pit, you) : 'their move';
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
// offering a draw: just before it, one tap offers (the friend answers on a card; their move is a no) — web/draw.js
const drawBtn = document.createElement('button'); drawBtn.className = 'pill drawoffer'; drawBtn.type = 'button'; drawBtn.id = 'drawBtn'; shoutMenu.appendChild(drawBtn);
const giveUp = document.createElement('button'); giveUp.className = 'pill giveup'; giveUp.type = 'button'; giveUp.id = 'giveUpBtn'; shoutMenu.appendChild(giveUp);
let cardMode = 'back'; // the door-like card on this board answers a "take it back?" or a draw offered
const drawAsk = { pending: false, theirs: false, offeredN: -1 }; // this board's offer out, theirs waiting on this board, the move count last offered at
const drawState = () => ({ online, friend, seated: !!(net && net.seat !== null), over: state.over, pending: drawAsk.pending, theirs: drawAsk.theirs, offeredN: drawAsk.offeredN, moves: state.moves.length });
function paintDraw() {
  const d = drawState(); drawBtn.hidden = !(d.online && d.friend && d.seated && !d.over); drawBtn.textContent = drawButton(d);
  drawBtn.disabled = !mayOfferDraw(d); drawBtn.classList.toggle('waiting', drawAsk.pending);
}
function resetDraw() { drawAsk.pending = false; drawAsk.theirs = false; drawAsk.offeredN = -1; if (cardMode === 'draw') hideBackCard(); paintDraw(); }
drawBtn.addEventListener('click', () => {
  if (!mayOfferDraw(drawState())) return paintDraw();
  if (net.offerDraw()) { drawAsk.pending = true; drawAsk.offeredN = state.moves.length; toast(drawWords(friend ? friend.name : undefined).offered); click(1.2, 0.07); setTimeout(() => click(1.2, 0.07), 140); buzz(12); }
  toggleShoutMenu(false);
});
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
  paintDraw();
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
// ---------- video and voice at the board (web/call.js decides when, web/talk.js connects): nothing is on until both say yes ----------
// the picture and sound go phone to phone; the room's socket carries only the asks and the WebRTC handshake, to the friend's seat only
const call = { f: new CallFlow(0), talk: null, log: [], remote: null, level: null, raf: 0, line: null, lineTimer: 0, lineLog: [] };
const callMenu = $('#callMenu');
let callLiteSet = null; const callLite = () => (callLiteSet === null ? Q.lite : callLiteSet); // the lighter board sends voice only (a render can lift that to check video)
const callName = () => (friend ? friend.name : 'your friend');
const callAvailable = () => Talk.available();
function callDo(effects) {
  for (const e of effects) {
    if (e.send && net) net.call(e.send, e.data);
    if (e.close) callClose();
    if (e.media) callOpen(e.media);
    if (e.offer && call.talk) call.talk.offer().catch(() => callDo(call.f.failed()));
    if (e.video !== undefined && call.talk) call.talk.sendVideo(e.video).then(paintCall);
    if (e.say) callSay(e.say);
  }
  paintCall();
}
function callSay(key) {
  call.log.push(key);
  const w = callWords(key, callName(), call.f.theirs);
  if (key === 'asked') { showCallCard(); knockSound(); awayNote('call', { mode: call.f.theirs }); return; }
  $('#callCard').hidden = true;
  if (key === 'live') { click(1.6, 0.08); setTimeout(() => click(2.1, 0.08), 120); buzz(20); toast(w); showTurn(); lineStart(); return; }
  if (key === 'weak' || key === 'theirweak') { if (call.line) call.line.markWeak(); click(0.9, 0.06); setTimeout(() => click(0.7, 0.06), 140); buzz(15); toast(w, 3600); showTurn(); return; }
  if (key === 'videoagain' || key === 'theirvideoagain') { if (call.line) call.line = new LineWatch(); click(1.4, 0.06); setTimeout(() => click(1.9, 0.06), 120); toast(w); showTurn(); return; }
  if (key === 'better') { click(1.6, 0.05); toast(w, 3600); return; }
  if (key === 'asking') { $('#hint').textContent = w; click(1.2, 0.06); return; }
  if (key === 'starting') { $('#hint').textContent = w; return; }
  if (['ended', 'theyended', 'theyleft'].includes(key)) { click(0.8, 0.08); setTimeout(() => click(0.6, 0.08), 120); }
  if (key === 'theysaidno' || key === 'failed' || key === 'nomedia') { click(0.6, 0.08); buzz(30); }
  toast(w, key === 'failed' || key === 'nomedia' ? 4200 : 2200); showTurn();
}
function callOpen(mode) {
  if (!callAvailable()) return callDo(call.f.noMedia());
  if (!call.talk) call.talk = new Talk({
    send: (kind, data) => net && net.call(kind, data),
    onRemote: (stream) => { call.remote = stream; $('#theirVideo').srcObject = stream; const a = $('#theirVoice'); a.srcObject = stream; a.play().catch(() => {}); $('#theirVideo').play().catch(() => {}); callListen(stream); paintCall(); },
    onState: (st) => { if (st === 'connected') callDo(call.f.connected()); else if (st === 'failed') callDo(call.f.failed()); },
  });
  const talk = call.talk;
  talk.open(mode).then((stream) => {
    if (talk !== call.talk) return;
    if (talk.mode === 'voice' && call.f.mine === 'video') { call.f.mine = 'voice'; call.f.cam = false; toast('No camera here — voice only'); } // no camera, or it was refused: voice only
    $('#myVideo').srcObject = stream; $('#myVideo').play().catch(() => {});
    if (net) net.call('state', { mic: call.f.mic, cam: call.f.cam });
    callDo(call.f.mediaReady());
  }).catch(() => { if (talk === call.talk) callDo(call.f.noMedia()); });
}
// every LINE.everyMs while live: the connection's own numbers into web/call.js LineWatch, which says when the line is too weak
// for pictures (the call goes voice only) and when it has held good again (Video again is offered). Only while the call has
// a picture in it; a render check may stand in a bad line (window.__lineBad) and quicken the readings (window.__lineMs).
function lineStart() {
  clearTimeout(call.lineTimer); call.line = new LineWatch(); call.lineLog = [];
  const tick = async () => {
    const talk = call.talk; if (!talk || !call.f.on) return;
    let res = null;
    if (call.f.video || call.f.weak) {
      if (window.__lineBad !== undefined && window.__lineBad !== null) { res = call.line.push(window.__lineBad ? { rtt: 1500, kbps: 60, loss: 0.2, pairs: 1 } : { rtt: 40, kbps: 2000, loss: 0, pairs: 1 }); }
      else { const st = await talk.stats(); if (talk !== call.talk) return; if (st) res = call.line.read(st); }
    }
    if (res) { call.lineLog.push(res); callDo(res === 'weak' ? call.f.lineWeak() : call.f.lineBetter()); }
    call.lineTimer = setTimeout(tick, window.__lineMs || LINE.everyMs);
  };
  call.lineTimer = setTimeout(tick, window.__lineMs || LINE.everyMs);
}
function callClose() {
  clearTimeout(call.lineTimer); call.lineTimer = 0; call.line = null;
  if (call.talk) call.talk.close(); call.talk = null; call.remote = null; cancelAnimationFrame(call.raf); call.raf = 0;
  if (call.level) { try { call.level.ctx.close(); } catch {} call.level = null; }
  for (const id of ['#theirVideo', '#myVideo', '#theirVoice']) { try { $(id).srcObject = null; } catch {} }
}
// who is speaking: a soft brass ring on their bubble (or their face, voice only) while their sound is up
function callListen(stream) {
  if (call.level || !stream.getAudioTracks().length) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; const ctx = new AC(); const src = ctx.createMediaStreamSource(stream); const an = ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
    const buf = new Uint8Array(an.fftSize); call.level = { ctx, an, buf, on: false };
    const tick = () => {
      if (!call.level) return; an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128));
      const on = m > 10 && call.f.their.mic; if (on !== call.level.on) { call.level.on = on; $('#theirCam').classList.toggle('speaking', on); $('#oppFace').classList.toggle('speaking', on); }
      call.raf = requestAnimationFrame(tick);
    };
    tick();
  } catch {}
}
function showCallCard() {
  const lighter = callLite(); const n = callName();
  $('#callTitle').textContent = callWords('asked', n, call.f.theirs); $('#callSub').replaceChildren(callWords('askedSub', n), lighter ? ' The lighter board is on, so this phone sends voice only.' : ''); // two text nodes, so each is put into the page's language
  $('#callFace').innerHTML = initialFace(n); $('#callVideo').hidden = lighter; $('#callCard').hidden = false;
}
function paintCall() {
  const f = call.f; const n = callName(); const btn = $('#callBtn');
  btn.classList.toggle('asking', f.phase === 'asking'); btn.classList.toggle('live', f.on); btn.classList.toggle('weak', f.on && f.weak);
  btn.disabled = !friend; btn.setAttribute('aria-label', f.on && f.weak ? `Voice with ${n} — the line is weak${f.better ? ', now better: video again' : ''} — mute, hang up` : f.on ? `Video and voice with ${n} — mute, camera, hang up` : f.phase === 'asking' ? callWords('asking', n) : callWords('chip', n));
  if (f.phase !== 'asked') $('#callCard').hidden = true;
  const remoteVideo = !!(call.remote && call.remote.getVideoTracks().length);
  const theirs = f.on && remoteVideo && f.theirs === 'video' && f.their.cam && !f.hideTheirs;
  $('#theirCam').hidden = !theirs; $('#oppFace').hidden = theirs; $('#oppFace').classList.toggle('voice', f.on && !theirs);
  $('#theirMuted').hidden = !(f.on && !f.their.mic);
  const mine = f.on && call.talk && call.talk.mode === 'video' && f.cam;
  $('#myCam').hidden = !mine; $('#myMuted').hidden = !(f.on && !f.mic);
  if (!callMenu.hidden) fillCallMenu();
}
function callPill(text, fn, cls = '', label) { const b = document.createElement('button'); b.className = 'pill ' + cls; b.type = 'button'; b.textContent = text; if (label) b.setAttribute('aria-label', label); b.addEventListener('click', fn); callMenu.appendChild(b); return b; }
const blockGuard = makeGuard(BLOCK_MS); let blockTimer = null;
function blockFriend() {
  if (!mayBlock({ online, friend })) return;
  if (blockGuard.tap(Date.now()) === 'armed') { click(0.8, 0.06); buzz(15); clearTimeout(blockTimer); blockTimer = setTimeout(() => { blockGuard.reset(); if (!callMenu.hidden) fillCallMenu(); }, BLOCK_MS); fillCallMenu(); return; }
  clearTimeout(blockTimer); const n = friend.name; blocked.add(friend.tag, n); toggleCallMenu(false); buzz([30, 40, 30]);
  blockedOut(blockWords('done', n));
}
function reportProblem() { // the support page's "Report a player", beside the game (a new tab on the web, the phone's browser from the apps)
  const a = document.createElement('a'); a.href = legalLink(REPORT_PAGE, globalThis, i18n.lang) + REPORT_HASH; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); toggleCallMenu(false); click(1, 0.05);
}
function blockPills(n) {
  if (!mayBlock({ online, friend })) return;
  callPill(blockWords('report'), reportProblem, 'quiet', blockWords('reportLabel', n)).dataset.id = 'report';
  const armed = blockGuard.armed && !blockGuard.expired(Date.now());
  const b = callPill(armed ? blockWords(keysLikely() ? 'armedKeys' : 'armed', n) : blockWords('block', n), blockFriend, 'block' + (armed ? ' armed' : ''), blockWords('blockLabel', n)); b.dataset.id = 'block';
}
function fillCallMenu() {
  const f = call.f; const n = callName(); callMenu.textContent = '';
  try { fillCallPills(f, n); } finally { blockPills(n); }
}
function fillCallPills(f, n) {
  if (f.phase === 'idle') {
    if (!callAvailable()) { const p = document.createElement('span'); p.className = 'note'; p.textContent = 'This browser cannot do video or voice'; callMenu.appendChild(p); return; }
    if (!callLite()) callPill(callWords('askVideo', n), () => { toggleCallMenu(false); callDo(f.ask(pickMode('video', { lighter: callLite() }))); }).dataset.id = 'video';
    callPill(callLite() ? `Voice with ${n}` : callWords('askVoice', n), () => { toggleCallMenu(false); callDo(f.ask('voice')); }).dataset.id = 'voice';
    const p = document.createElement('span'); p.className = 'note'; p.textContent = callLite() ? 'The lighter board is on: voice only. Nothing starts until they say yes.' : 'Nothing starts until they say yes.'; callMenu.appendChild(p);
  } else if (f.phase === 'asking') {
    callPill(callWords('stopAsk'), () => { toggleCallMenu(false); callDo(f.cancel()); }).dataset.id = 'stop';
  } else if (f.phase === 'asked') {
    callPill(callWords('askVoice'), () => { toggleCallMenu(false); callDo(f.answer('voice')); });
  } else {
    callPill(f.mic ? 'Mute' : 'Unmute', () => { callDo(f.toggleMic()); if (call.talk) call.talk.setMic(f.mic); click(f.mic ? 1.3 : 0.8, 0.05); }, f.mic ? '' : 'off', f.mic ? 'Mute your microphone' : 'Turn your microphone back on').dataset.id = 'mic';
    if (f.weak) {
      if (f.better) callPill(callWords('videoAgain', n), () => { toggleCallMenu(false); callDo(f.videoAgain()); }, '', 'The line is better: turn the pictures back on').dataset.id = 'again';
      const p = document.createElement('span'); p.className = 'note'; p.replaceChildren(callWords('weakNote', n), f.better ? '' : ' Video again comes here once the line is better.'); callMenu.appendChild(p);
    } else if (f.mine === 'video') callPill(f.cam ? 'Camera off' : 'Camera on', () => { callDo(f.toggleCam()); if (call.talk) call.talk.setCam(f.cam); click(f.cam ? 1.3 : 0.8, 0.05); }, f.cam ? '' : 'off').dataset.id = 'cam';
    if (f.theirs === 'video' && !f.weak) callPill(f.hideTheirs ? `Show ${n}'s picture` : `Hide ${n}'s picture`, () => { f.toggleTheirs(); paintCall(); click(1, 0.05); }, f.hideTheirs ? 'off' : '').dataset.id = 'theirs';
    callPill(callWords('hangUp'), () => { toggleCallMenu(false); callDo(f.hangUp()); }, 'end').dataset.id = 'end';
  }
}
function toggleCallMenu(open = callMenu.hidden) {
  if (!open) { blockGuard.reset(); clearTimeout(blockTimer); }
  callMenu.hidden = !open; $('#callBtn').setAttribute('aria-expanded', String(open));
  if (open) { if (!shoutMenu.hidden) toggleShoutMenu(false); fillCallMenu(); }
}
$('#callBtn').addEventListener('click', () => { if (!friend) return toast('Waiting for a friend'); if (call.f.phase === 'asked') return showCallCard(); toggleCallMenu(); click(1.2, 0.05); });
$('#callNo').addEventListener('click', () => callDo(call.f.cancel()));
$('#callVoice').addEventListener('click', () => callDo(call.f.answer('voice')));
$('#callVideo').addEventListener('click', () => callDo(call.f.answer(pickMode('video', { lighter: callLite() }))));
function callMessage({ kind, data }) {
  const eff = call.f.receive(kind, data);
  if (eff.some((e) => e.connect) && call.talk) call.talk.receive(kind, data).catch(() => callDo(call.f.failed()));
  callDo(eff.filter((e) => !e.connect));
}
function callRoom() { if (call.f.phase !== 'idle' && (!friend || !friend.online)) callDo(call.f.gone()); else paintCall(); } // the friend left the board: a call cannot outlive it
function callEnd() { if (call.f.phase !== 'idle') { const e = call.f.hangUp(); callDo(e); } callMenu.hidden = true; $('#callCard').hidden = true; }

function syncRoom(room) { // the room as the server shows it: the friend's seat and the whole game
  friend = room.players[them] || null; tableRoom = room.rid ? { code: room.code, rid: room.rid, games: room.games || 0 } : null;
  const s = stateFrom(room.state);
  const same = state && state.moves.length === s.moves.length && state.pits.join() === s.pits.join() && state.stores.join() === s.stores.join();
  state = s; if (!same) { layoutFromState(state); peekIn.pit = -1; peekOut.reset(); }
  const ask = room.ask || null; backAsk.pending = !!(ask && ask.seat === you); if (ask && ask.seat === you) backAsk.n = backAsk.askedN = ask.n; // a rejoin sees a "take it back?" still out
  const dask = room.drawAsk || null; drawAsk.pending = !!(dask && dask.seat === you && !state.over); drawAsk.theirs = !!(dask && dask.seat === them && !state.over); if (drawAsk.pending) drawAsk.offeredN = dask.n; // a rejoin sees a draw still offered
  if (ask && ask.seat === them && !state.over) showBackCard(); else if (drawAsk.theirs) showDrawCard(); else hideBackCard();
  paintDraw();
  refreshStatic(); paintRules(); paintDoor(); paintRoomStatus(); callRoom();
  if (friend && blocked.has(friend.tag)) { const n = friend.name; setTimeout(() => blockedOut(blockWords('seated', n)), 0); } // a room still open with someone this phone has since blocked
}
// Leaving a room because of a block: the call ends, the room is left, the board is yours again on Home, and it says why
function blockedOut(words) {
  if (!online) return;
  stopReview(); $('#gameover').hidden = true; stopOnline(); showScreen('home'); toast(words, 4200); click(0.7, 0.08);
}
let moveQueue = Promise.resolve();
function sendMove(pit) { if (busy || !net || !net.move(pit)) return; peekOut.reset(); busy = true; deselect(); } // the move itself takes their light away
async function showMove({ seat, pit, events, state: pub }) {
  if (backAsk.pending && seat === them) { backAsk.pending = false; toast(backWords(friend ? friend.name : undefined).gone); } // playing on is a no
  hideBackCard(); if (drawAsk.theirs && !pub.over) showDrawCard(); // a draw they offered stands through their own move
  const prev = state.stores.slice(); const before = state; state = stateFrom(pub); busy = true; peekIn.pit = -1; deselect(); $('#undo').disabled = true; teleStart(state);
  if (seat === them) { select(pit); await wait(550); deselect(); }
  else { hideExplain(); const got = state.stores[you] - prev[you]; stats.biggest = Math.max(stats.biggest, got); stats.captures += events.filter((e) => e.type === 'capture' && e.by === you).length; const r = recordDay(streak); streak = r.data; if (r.newDay) prefs.set('streak', JSON.stringify(streak)); }
  tipFor(events);
  await animate(events, prev);
  busy = false; refreshStatic();
  if (!state.over && crossedLast8(before, state)) last8Moment();
  if (!state.over && beganCircling(before, state)) circlingMoment();
  if (state.over) { await winMoment(); gameOver(); } else { if (before.over) $('#gameover').hidden = true; if (seat === them) explain(before, pit, events); } // a friend's move, explained too
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
// a move played while a draw is offered: the offerer's own move keeps it standing; the other side moving is their no
function drawOnMove(seat) {
  if (drawAsk.pending && seat === them) { drawAsk.pending = false; toast(drawWords(friend ? friend.name : undefined).goneMine); }
  if (drawAsk.theirs && seat === you) { drawAsk.theirs = false; if (cardMode === 'draw') hideBackCard(); }
  paintDraw();
}
const backAsk = { pending: false, n: -1, askedN: -1 }; // this board's ask; askedN: the move count it last asked about (once a move)
function askBack() {
  if (!net || !friend || net.seat === null) return;
  if (!mayAskBack({ online, friend, seated: true, over: state.over, busy, moves: state.moves, turn: state.turn, you, pending: backAsk.pending, askedN: backAsk.askedN })) { shake(state.moves[state.moves.length - 1] ?? you * 6); return; }
  if (net.askBack()) { backAsk.pending = true; backAsk.n = backAsk.askedN = state.moves.length; click(1.1, 0.07); setTimeout(() => click(1.4, 0.07), 120); buzz(12); showTurn(); }
}
function showDrawCard() {
  const w = drawWords(friend ? friend.name : undefined); cardMode = 'draw'; $('#backEyebrow').textContent = 'A draw?'; $('#backTitle').textContent = w.title; $('#backSub').textContent = w.sub;
  $('#backFace').innerHTML = initialFace(friend ? friend.name : '?'); $('#backYes').textContent = w.yes; $('#backNo').textContent = w.no;
  $('#backYes').disabled = false; $('#backNo').disabled = false; $('#backCard').hidden = false; $('#backCard').dataset.mode = 'draw';
}
function answerDraw(yes) { if (!net) return; if (net.answerDraw(yes)) { $('#backYes').disabled = true; $('#backNo').disabled = true; click(yes ? 1.5 : 0.7, 0.08); } }
// an agreed draw: every seed on the board lifts together and settles, twice, as two hands shake over it; two soft knocks
async function showDraw({ state: pub }) {
  state = stateFrom(pub); busy = true; deselect(); hideExplain(); $('#undo').disabled = true; selected = null; backAsk.pending = false; resetDraw();
  toast(drawWords(friend ? friend.name : undefined).yesToast); buzz([15, 60, 15]);
  [1.15, 1.15].forEach((p, k) => setTimeout(() => click(p, 0.07), k * 260));
  if (!reduceMotion) {
    const ms = [...Array(12).keys()].flatMap((i) => homes[i]).map((m) => [m, m.position.y]);
    await tween(640, (t) => { const k = Math.abs(Math.sin(t * Math.PI * 2)) * (1 - 0.35 * t); ms.forEach(([m, y0]) => { m.position.y = y0 + k * 0.007; }); })
      .then(() => ms.forEach(([m, y0]) => { m.position.y = y0; }));
  }
  await wait(380); busy = false; refreshStatic(); gameOver();
}
function showBackCard() {
  const w = backWords(friend ? friend.name : undefined); cardMode = 'back'; $('#backCard').dataset.mode = 'back'; $('#backEyebrow').textContent = 'Take it back?'; $('#backTitle').textContent = w.title; $('#backSub').textContent = w.sub;
  $('#backFace').innerHTML = initialFace(friend ? friend.name : '?'); $('#backYes').textContent = w.yes; $('#backNo').textContent = w.no;
  $('#backYes').disabled = false; $('#backNo').disabled = false; $('#backCard').hidden = false;
}
function hideBackCard() { $('#backCard').hidden = true; }
function answerBack(yes) { if (!net) return; if (net.answerBack(yes)) { $('#backYes').disabled = true; $('#backNo').disabled = true; click(yes ? 1.5 : 0.7, 0.08); } }
$('#backYes').addEventListener('click', () => (cardMode === 'draw' ? answerDraw(true) : answerBack(true)));
$('#backNo').addEventListener('click', () => (cardMode === 'draw' ? answerDraw(false) : answerBack(false)));
// a yes: every seed the move moved flies back to where it lay — out of the troughs first, then back round the board into the pit played
async function showTakeBack({ seat, state: pub, undone, before }) {
  const b = stateFrom(before), a = stateFrom(pub); peekIn.pit = -1; hideBackCard(); hideExplain(); deselect(); busy = true; $('#undo').disabled = true;
  if (seat === you) backAsk.pending = false; drawAsk.pending = false; drawAsk.theirs = false; paintDraw(); // the server drops a draw offer with the move
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
  const paint = (h) => { if (typeof h === 'number') setBadge(h, c[h]); else { const p = +h[1]; scoreOf(p).textContent = c[h]; } };
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
function leaveRoom() { callEnd(); if (net) net.leave(); prefs.set('room', 'null'); location.href = location.pathname; }
function startOnline(code, { stay = false } = {}) {
  // code: 'new' opens a room, a four-letter code knocks on one. stay: asked from the Rooms screen, which stays up (the door card over it)
  // until a friend is in; otherwise (an invite link) the board shows at once with "Joining the room…"
  roomWanted = String(code).toUpperCase(); online = true; local = false;
  net = new Online(wsUrl(), { tag: myTag });
  const self = net; const on = (t, fn) => self.on(t, (d) => { if (net === self) fn(d); }); // a room left behind (Back, a new name) says nothing more
  let held = null; try { held = JSON.parse(prefs.get('room', 'null')); } catch {}
  let triedJoin = false, seated = false, knocking = false;
  on('joined', ({ seat, code, token, room }) => {
    const back = seated; seated = true; you = seat; them = 1 - seat; call.f.seat = seat; baseTheta = seat === 1 ? Math.PI : 0; if (!back) theta = baseTheta;
    prefs.set('room', JSON.stringify({ code, token }));
    if (location.search !== '?room=' + code) history.replaceState(null, '', inviteLink(code, location.pathname)); // the address becomes the invite link (a reload comes back to this seat)
    syncRoom(room); $('#gameover').hidden = !state.over; if (state.over) gameOver();
    if (roomsShowing()) { if (friend) showScreen('play'); else { paintCode(code); paintRoomStatus(); if (!back) { click(1.4, 0.08); setTimeout(() => click(1.8, 0.08), 120); } } } // the tiles fill in on the Rooms screen
    if (knocking) { knocking = false; tele.track('invite_joined', { as: 'friend' }, `j:${code}`); toast(`${friend ? friend.name : 'Your friend'} let you in — ${state.turn === you ? 'your move' : 'they start'}`); click(1.5, 0.1); setTimeout(() => click(2, 0.1), 120); buzz(20); }
    else if (back) toast('Back at the board'); else if (!friend && !roomsShowing()) toast(`Room ${code} — share this page's link`);
  });
  on('room', ({ room, started, resync }) => {
    const had = friend, wanted = friend && friend.wantsRematch; syncRoom(room);
    if (resync) { busy = false; deselect(); toast('Caught up with the board'); if (state.over) gameOver(); else $('#gameover').hidden = true; } // this board fell behind a move and asked for the whole room
    if (!had && friend) { tele.track('invite_joined', { as: 'host' }, `j:${net && net.code}`); if (roomsShowing()) showScreen('play'); toast(`${friend.name} joined`); click(1.5, 0.1); buzz(20); awayNote('joined', { mine: state.turn === you && !state.over }); }
    if (started) { stopReview(); backAsk.pending = false; backAsk.askedN = -1; hideBackCard(); resetDraw(); hideExplain(); stats = { biggest: 0, captures: 0, started: Date.now() }; $('#gameover').hidden = true; $('#rematch').disabled = false; $('#rematch').textContent = 'Play again'; deselect(); const tl = tableRoom ? tallyStart(tallyOf(tally, roomKey(tableRoom.code, tableRoom.rid)), you, friend ? friend.name : oppLabel()) : ''; toast((tl ? tl[0].toUpperCase() + tl.slice(1) : 'New game') + ' — ' + (state.turn === you ? 'your move' : `${oppLabel()} starts`), tl ? 2600 : 1800); }
    else if (friend && friend.wantsRematch && !wanted) { toast(`${friend.name} wants to play again`); awayNote('rematch'); if (!$('#gameover').hidden) $('#rematch').textContent = `Play again — ${friend.name} is ready`; }
  });
  on('move', (m) => { drawOnMove(m.seat); if (m.seat === them) { const s = stateFrom(m.state); awayNote(s.over ? 'over' : 'move', s.over ? { result: s.winner === you ? 'won' : s.winner === them ? 'lost' : 'draw', score: [s.stores[you], s.stores[them]] } : { mine: s.turn === you }); } moveQueue = moveQueue.then(() => showMove(m)).catch((e) => console.error(e)); }); // small message, events rebuilt by online.js with the engine
  on('resign', (m) => { resetDraw(); if (m.seat === them) { const s = stateFrom(m.state); awayNote('over', { result: s.winner === you ? 'won' : 'lost', gaveUp: true }); } moveQueue = moveQueue.then(() => showResign(m)).catch((e) => console.error(e)); });
  on('askback', ({ seat }) => { if (seat === them) { showBackCard(); knockSound(); awayNote('askback'); } else showTurn(); });
  on('backno', ({ seat }) => { hideBackCard(); if (drawAsk.theirs) showDrawCard(); if (seat === you) { backAsk.pending = false; toast(backWords(friend ? friend.name : undefined).noMine); click(0.7, 0.08); } else toast(backWords().noTheirs); showTurn(); });
  on('drawoffer', ({ seat }) => { if (seat === them) { drawAsk.theirs = true; if ($('#backCard').hidden) showDrawCard(); knockSound(); awayNote('drawoffer'); } else drawAsk.pending = true; paintDraw(); });
  on('drawno', ({ seat }) => { if (cardMode === 'draw') hideBackCard(); const w = drawWords(friend ? friend.name : undefined); if (seat === you) { drawAsk.pending = false; toast(w.noMine); click(0.7, 0.08); } else { drawAsk.theirs = false; toast(w.noTheirs); } paintDraw(); });
  on('draw', (m) => { if (m.seat === you) awayNote('over', { result: 'draw', agreed: true }); moveQueue = moveQueue.then(() => showDraw(m)).catch((e) => console.error(e)); });
  on('takeback', (m) => { moveQueue = moveQueue.then(() => showTakeBack(m)).catch((e) => console.error(e)); });
  on('resync', () => { $('#oppSub').textContent = 'catching up…'; });
  on('ticket', ({ code, token, ticket }) => { if (code && token) prefs.set('room', JSON.stringify({ code, token, ticket })); }); // kept with the seat, so even after a reload the room can be rebuilt if the server restarted
  on('shout', ({ seat, id }) => showShout(seat, id));
  on('peek', ({ seat, pit, n }) => { if (seat !== them) return; Object.assign(peekIn, { pit, n, seat, t: performance.now() }); peekIn.log.push({ pit, n }); if (peekIn.log.length > 40) peekIn.log.shift(); peekPaint(); });
  on('call', (m) => callMessage(m));
  // the door: this phone knocked and waits for the host; or (as host) someone is knocking on ours
  on('knocked', ({ host, hostTag }) => { if (blocked.has(hostTag)) return blockedOut(blockWords('atDoor', host)); const again = knocking; knocking = true; if (roomsShowing()) { showScreen('play'); $('#oppFace').innerHTML = initialFace(host); } showTurn(); if (!again) { toast(`Knocked — ${host} decides`); click(1.1, 0.08); } });
  on('knock', ({ name, tag }) => { if (blocked.has(tag)) return; knockSound(); awayNote('knock', { name }); }); // a blocked phone's knock is turned away by paintDoor, unheard
  on('error', (e) => {
    if (e.re === 'peek') return; // a pick the server would not pass on (too fast, the move already gone, no line): nothing to say
    if (e.re === 'call') { if (call.f.phase === 'asking') call.f.reset(); toast(e.msg); paintCall(); showTurn(); return; } // a call the server would not pass on (the friend away, too fast): the game is untouched
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
  $('#oppFace').innerHTML = online ? initialFace(friend ? friend.name : '?') : local ? initialFace(faceMark(1 - nearCard())) : faceFor(level, mood); // two of us: the far player's number on a brass ring
  document.querySelectorAll('.pill[data-level]').forEach((b) => { b.querySelector('.face').innerHTML = CHARACTERS[b.dataset.level].face; });
  document.querySelectorAll('[data-face]').forEach((f) => { f.innerHTML = CHARACTERS[f.dataset.face].face; });
}
// The race to 25 (web/race.js): the word under each score says "7 to win" once a side is within 10 of 25, following every tick
// of either score (whatever writes it: a capture, undo, a replay); never in the lesson or the one-move puzzle.
const race = { mine: null, theirs: null, log: [] };
function paintRace() {
  let off = true; try { off = lesson.on || (puzzle.on && !playingOut()); } catch { return; } const total = totalSeeds(state);
  const m = +$('#myScore').textContent, t = +$('#oppScore').textContent;
  for (const [key, el, a, b] of [['mine', $('#myLab'), m, t], ['theirs', $('#oppLab'), t, m]]) {
    const r = off ? null : raceOf(a, b, total), was = race[key]; race[key] = r;
    const words = raceWords(r); if (el.dataset.race !== words) { el.dataset.race = words; el.textContent = words; race.log.push([key, words]); if (race.log.length > 60) race.log.shift(); }
    el.classList.toggle('race', !!r); el.classList.toggle('close', !!(r && r.close));
    if (raceGlint(was, r) && !reduceMotion) { el.classList.remove('glint'); void el.offsetWidth; el.classList.add('glint'); }
  }
}
window.__race = race;
{ const ob = new MutationObserver(() => paintRace()); for (const id of ['#myScore', '#oppScore']) ob.observe($(id), { childList: true, characterData: true, subtree: true }); }
function refreshStatic() {
  paintFaces(); paintMyName();
  state.pits.forEach((n, i) => setBadge(i, n));
  $('#myScore').textContent = state.stores[nearCard()]; $('#oppScore').textContent = state.stores[1 - nearCard()];
  $('#oppName').textContent = oppLabel();
  showTurn();
}
function showTurn() {
  const tc = tableOn() && !watch.on && !puzzle.on ? tableCards(state, nearCard()) : null; document.body.classList.toggle('table', !!tc); document.body.classList.toggle('farturn', !!(tc && tc.farTurn)); tableNear = tc ? tc.near.seat : null;
  if (watch.on) { paintWatch(); return; } // watching a game sent as a link: its own words, nothing to press
  if (online) { showTurnOnline(); paintPits(); return; }
  if (puzzle.on) { $('#hint').textContent = puzzle.played ? '' : pickHint('puzzle'); $('#undo').disabled = true; $('#hintBtn').disabled = true; paintPits(); return; }
  const mine = state.turn === you && !state.over;
  if (tc) { $('#turn').textContent = tc.near.turn; $('#oppSub').textContent = tc.far.sub; } // across the table: each card stays with its player
  else if (local) { const w = localTurn(state); $('#turn').textContent = mine || state.over ? w.turn : '…'; $('#oppSub').textContent = mine ? w.sub : state.over ? '' : 'passing the phone…'; }
  else { $('#turn').textContent = state.over ? 'game over' : mine ? 'your move' : '…'; $('#oppSub').textContent = state.over ? '' : mine ? 'waiting' : 'thinking…'; }
  $('#hint').textContent = state.over ? '' : mine ? pickHint('pick') : '';
  $('#undo').disabled = busy || state.moves.length < (local ? 1 : 2) || !undoReady(playingOut() ? playout : null, state); undoLabel(false);
  $('#hintBtn').disabled = !mine || busy || hintedAt === state.moves.length;
  paintPits();
}
function select(i, preview = true) {
  selected = i; const [x, z] = pitCenters[i]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true;
  board.glow.position.set(x, BT + 0.08, z); board.glow.visible = true; click(1.4, 0.05); if (preview) showPath(i); else clearPath(); peekMine(i); showTurn();
}
function deselect() { selected = null; board.ring.visible = false; board.glow.visible = false; clearPath(); peekMine(-1); showTurn(); }
// their hand over the board (web/peek.js): in a room, the pit picked on our own move goes to the friend's board (-1 put back);
// only a pit the engine lets us play, never while a turn plays (busy), and only the newest pick when taps come fast
const peekOut = peekSender((p) => (net ? net.peek(p) : false));
function peekMine(i) {
  if (!online || !net || net.seat === null || !friend || busy || state.over || state.turn !== you) return;
  if (i >= 0 && !legalMoves(state).includes(i)) return;
  if (i < 0 && peekOut.last < 0 && !peekOut.pending) return; peekOut.pick(i);
}

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
  // every seed they have (an Ayo grand slam): an ash ring lands on each pit it would have taken, then one stroke is drawn across it
  if (p.slam) { await wait(140); if (token !== pathToken) return;
    for (const pit of p.slam.pits) { const g = M.slams[pit], bar = g.userData.bar; g.visible = true; bar.scale.set(0.001, 1, 1);
      tween(300, (t) => { if (token !== pathToken) return; g.material.opacity = k0 * 0.75 * t; const sc = 1.1 - 0.1 * t; g.scale.set(sc, sc, 1); }, easeOut)
        .then(() => tween(260, (t) => { if (token !== pathToken) return; bar.scale.set(Math.max(0.001, t), 1, 1); }, easeOut)); }
    if (!faint) { setTimeout(() => { if (token === pathToken) { click(0.7, 0.03); setTimeout(() => click(0.55, 0.025), 110); } }, 320); slamNote(); } } // two low knocks, falling: no
  if (p.end !== null) { const e = M.end, [x, z] = pitCenters[p.end]; e.position.x = x; e.position.z = z; e.visible = true; tween(320, (t) => { if (token !== pathToken) return; e.material.opacity = k0 * 0.4 * t; }).then(() => { if (token === pathToken && !faint) pathGlow = true; }); }
  if ((p.takes || p.captures).length && !faint) click(1.25, 0.035);
}
// the first time a picked move would hand seeds to the other side, say once (on this phone) what the pale ring means
function giftNote() {
  if (prefs.get('gives.told', '') === '1' || puzzle.on) return; prefs.set('gives.told', '1');
  toast(giftNoteWords(state.rules), 4200);
}
// the first time a picked move would make a grand slam, say once (on this phone) why the ash rings are struck out
function slamNote() {
  if (prefs.get('slam.told', '') === '1' || puzzle.on) return; prefs.set('slam.told', '1');
  toast(SLAM_NOTE, 4200);
}
function clearPath() {
  pathToken++; path = null; answer = null; pathGlow = false; riskGlow = false; const M = board.marks;
  for (const m of [...M.steps, ...M.dots, ...M.caps, ...M.gifts, ...M.slams, ...M.risk, M.end]) { m.visible = false; m.material.opacity = 0; m.scale.set(1, 1, 1); m.rotation.z = 0; if (m.userData.bar) m.userData.bar.scale.set(1, 1, 1); }
}
// fade every mark that is showing, over `ms`, unless something lands new ones first
function fadeMarks(token, ms = 700) {
  pathGlow = false; riskGlow = false; const M = board.marks, all = [...M.steps, ...M.dots, ...M.caps, ...M.gifts, ...M.slams, ...M.risk, M.end].filter((m) => m.visible).map((m) => [m, m.material.opacity]);
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
  lastM.t0 = performance.now(); // which pit they played: the faint light their hand settled on stays there until your move (web/lastmark.js)
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

// ---------- Mama Ngozi's review of a whole game (Gold, L9): as the Game over card rises she goes back over every move you played
// (the hard search on each position you moved from, asked of the worker one at a time so a new game's moves never wait long);
// the card then says how many she would have played differently. Tap it and the board steps through them: the position you
// moved from, the pit you played, then her pit lit, its path landing and her move played through slowly; Next / Back / Again /
// Done. Against the computer and in rooms (from your seat); never two of us, the puzzle or the lesson. web/review.js.
const REVIEW_PREVIEW = GOLD_PREVIEW; // ?try=review (or ?try=gold) opens it for one visit until Gold can be bought
const review = { token: 0, items: [], done: false, seen: 0, total: 0, on: false, k: 0, playing: false, closing: false, step: 0 };
const revBtn = $('#goReview'), revBar = $('#review'); $('#goRevFace').innerHTML = faceFor('hard', 'calm'); $('#revFace').innerHTML = faceFor('hard', 'happy');
const reviewOpen = () => featureOpen('review', owned(), REVIEW_PREVIEW);
function paintReviewCard() {
  const locked = !reviewOpen(); revBtn.classList.toggle('locked', locked);
  $('#goRevWords').textContent = summaryWords(review.items, { done: review.done, seen: review.seen, total: review.total, locked });
  revBtn.classList.toggle('clean', review.done && !review.items.length); revBtn.classList.toggle('ready', review.done && review.items.length > 0);
  revBtn.setAttribute('aria-label', `Mama Ngozi's review: ${$('#goRevWords').textContent}${review.done && review.items.length && !locked ? '. Step through them on the board' : ''}`);
}
async function startReview() {
  const token = ++review.token; review.items = []; review.done = false; review.seen = 0;
  if (local || puzzle.on || lesson.on || state.moves.length < 4) { review.total = 0; revBtn.hidden = true; return; }
  const plan = reviewPlan(state.moves, state.variant, state.rules, firstMover(state.moves, state.first || 0), you);
  review.total = plan.length; revBtn.hidden = false; paintReviewCard();
  const rateds = [];
  for (const e of plan) { const r = await aiRate(e.before, 'hard'); if (token !== review.token) return; rateds.push(r); review.seen++; if (review.seen % 3 === 0) paintReviewCard(); }
  review.items = reviewOf(plan, rateds, { you }); review.done = true; paintReviewCard();
  if (!$('#gameover').hidden) { click(review.items.length ? 1.5 : 1.9, 0.05); revBtn.classList.add('pop'); setTimeout(() => revBtn.classList.remove('pop'), 500); }
}
function stopReview() { review.token++; if (review.on) endReview(false); }
function openReview() {
  if (!reviewOpen()) { toast(featureLockedWords("Mama Ngozi's review", inApp()), 3200); click(0.7, 0.05); return; }
  if (!review.done) { toast('She is still going over it — a moment', 1800); return; }
  if (!review.items.length) { toast(`Mama Ngozi: “${CLEAN_LINE}”`, 2800); click(1.9, 0.06); return; }
  if (busy || clipping) return;
  review.on = true; review.closing = false; $('#gameover').hidden = true; hideExplain(); deselect(); body.classList.add('reviewing'); revBar.hidden = false;
  $('#revSay').textContent = `“${OPEN_LINES[Math.floor(Math.random() * OPEN_LINES.length)]}”`; $('#revSay').hidden = false;
  click(1.3, 0.08); reviewStep(0);
}
async function reviewStep(k) {
  if (!review.on) return; const n = review.items.length; k = Math.max(0, Math.min(n - 1, k)); const it = review.items[k];
  if (review.playing) return; review.k = k; review.playing = true; const step = ++review.step; paintReviewBar();
  busy = true; $('#undo').disabled = true; $('#hintBtn').disabled = true; $('#turn').textContent = 'review';
  layoutFromState(it.before); refreshStaticFrom(it.before);
  $('#hint').textContent = `Move ${it.move} · ${it.playedWords}`;
  await wait(reduceMotion ? 80 : 300);
  const [px, pz] = pitCenters[it.played]; board.ring.position.x = px; board.ring.position.z = pz; board.ring.visible = true; board.glow.visible = false; click(0.9, 0.05); // the pit you played, first
  await wait(reduceMotion ? 200 : 900);
  const [x, z] = pitCenters[it.pit]; board.ring.position.x = x; board.ring.position.z = z; board.glow.position.set(x, BT + 0.08, z); board.glow.visible = true; click(1.4, 0.05); // …then hers
  $('#hint').textContent = `${COACH}: ${it.words}`;
  const token = ++pathToken; await landMarks(it.path, token, { gap: 90 }); await wait(reduceMotion ? 100 : 700);
  board.ring.visible = false; board.glow.visible = false;
  if (review.on && step === review.step) await animate(it.events, it.before.stores, Math.max(PACES.slow, PACE * 1.6));
  await wait(300); fadeMarks(token, 600);
  review.playing = false; busy = false; if (!review.on) return;
  if (review.closing) return endReview(true);
  $('#hint').textContent = k === n - 1 ? `${COACH}: “${END_LINE}”` : `${COACH}'s move, played through`;
  paintReviewBar();
}
function paintReviewBar() {
  const n = review.items.length, k = review.k, it = review.items[k];
  $('#revWords').textContent = stepWords(it, k, n);
  $('#revPrev').disabled = review.playing || k === 0; $('#revNext').disabled = review.playing || k >= n - 1; $('#revAgain').disabled = review.playing;
  if (k > 0) $('#revSay').hidden = true;
}
function endReview(showCard = true) {
  if (review.playing) { review.closing = true; return; } // the turn on the board finishes first, then the card comes back
  review.on = false; review.closing = false; revBar.hidden = true; body.classList.remove('reviewing');
  layoutFromState(state); refreshStatic(); deselect(); if (showCard && state.over) { $('#gameover').hidden = false; click(1.2, 0.04); }
}
revBtn.addEventListener('click', openReview);
$('#revPrev').addEventListener('click', () => { click(1.1, 0.05); reviewStep(review.k - 1); });
$('#revNext').addEventListener('click', () => { click(1.3, 0.05); reviewStep(review.k + 1); });
$('#revAgain').addEventListener('click', () => { click(1.2, 0.05); reviewStep(review.k); });
$('#revDone').addEventListener('click', () => { click(1, 0.05); endReview(true); });

// ---------- every seed they have (web/slam.js): an Ayo move whose last seed would capture every seed on the other side captures nothing.
// As that seed lands the seeds it would have taken lift a little toward the hand, hang, and settle back where they lay (two low knocks
// falling, a short buzz), and a toast says why; nothing moves to a trough. The engine marks it on the last drop; this only shows it.
const slamSeen = { n: 0, words: '' };
async function slamReach(mark, events, pace) {
  const sl = slamOf(events); if (!sl) return; slamSeen.n++;
  if (!clipping && !replaying) { slamSeen.words = slamMoment(sl, { you }); toast(slamSeen.words, 3200); buzz([25, 60, 25]); }
  click(0.7, 0.05); setTimeout(() => click(0.55, 0.045), 120);
  const k = pace / PACES.normal;
  if (reduceMotion) { await wait(260 * k); return; }
  const lifted = mark.pits.flatMap((pit) => homes[pit].map((m) => [m, m.position.y]));
  await tween(300 * k, (t) => { const h = easeOut(t) * 0.03; lifted.forEach(([m, y0], j) => { m.position.y = y0 + h * (1 - (j % 4) * 0.12); }); });
  await wait(180 * k);
  await tween(260 * k, (t) => { const h = (1 - easeIn(t)) * 0.03; lifted.forEach(([m, y0], j) => { m.position.y = y0 + h * (1 - (j % 4) * 0.12); }); });
  lifted.forEach(([m, y0]) => { m.position.y = y0; }); rattle(Math.min(lifted.length, 5), at(mark.pits[0]));
  await wait(120 * k);
}

// Play a move's events on the board, one seed at a time.
async function animate(events, prevStores, pace = PACE) {
  wakePoke(); // a turn on the board is something happening: a friend's move keeps the screen on as a tap does
  if (counting.pit !== null) endCount(); // a turn starting takes the count away: those seeds may be about to move
  if (hurry.depth++ === 0) { hurry.on = false; hurry.words = longTurn(events) && !clipping && !reduceMotion; hurry.base = i18n.src($('#hint')); if (hurry.words) $('#hint').textContent = hurryWords(hurry.base, { keys: keysLikely() }); }
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
      if (e.slam) { await Promise.all(pending); pending.length = 0; await slamReach(e.slam, events, pace); } // every seed they have: the capture that is not
    } else if (e.type === 'capture') {
      // a hand sweeps up the captured pits into one heap, carries it over the trough and lets the seeds go into it, the
      // top ones first: they drop, bounce and lie down in their places (no seeds streaming loose across the board)
      await Promise.all(pending); pending.length = 0;
      const k = pace / PACES.normal; // the sowing speed sets this hand's speed too
      if (animate.cluster && animate.cluster.length) animate.cluster.forEach((s, j) => { const p = handPose(animate.over, j); p.y += 0.08; hold(s, p, 150 * k, 0); }); // a sowing hand still full rises out of the way (Nchò takes a 4 mid-sowing)
      await wait(120 * k);
      const store = 'S' + e.by, scoreEl = scoreOf(e.by), hand = [];
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
  const prevStores = state.stores; const mover = state.turn; const before = state; state = next; busy = true; deselect(); $('#undo').disabled = true; teleStart(state);
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
  if (state.over) { await winMoment(); return gameOver(); }
  if (crossedLast8(before, state)) last8Moment(); // the board is down to its last 8: whoever captures next takes them all
  if (beganCircling(before, state)) circlingMoment(); // 12 moves with no capture before the game is called: say so, and who keeps what
  if (local) { await passTurn(); explain(before, pit, events); return; } // two of us: the board turns to the next player, with the move just played explained for them
  if (mover === them) explain(before, pit, events); // their move, explained: the ghost of its path and the words, tap to watch it again
  if (state.turn === them) {
    showTurn(); await wait(350); if (mood === 'calm') react('think');
    const m = await theirPick(state); // their hand weighs a pit or two while the search runs (web/ponder.js)
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
const puzzle = { on: false, p: null, played: false, got: 0, mine: false };
function todaysPuzzle() { const v = settings.game; if (!puzzle.p || puzzle.p.key !== todayKey() || puzzle.p.variant !== v) puzzle.p = dailyPuzzle(todayKey(), v); return puzzle.p; }
let puzzleCardKey = null; // the day the Home card was painted for: at midnight it paints itself afresh (web/nextday.js)
function paintPuzzleCard() { // the Home card: today's ask and where you stand
  const p = todaysPuzzle(); const e = dailyEntry(daily, p.key, p.variant); puzzleCardKey = p.key;
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
  const p = puzzle.p; const r = attempt(p, pit); const prevStores = state.stores; state = r.state; busy = true; puzzle.played = true; puzzle.mine = true; deselect();
  const s = recordDay(streak); streak = s.data; if (s.newDay) prefs.set('streak', JSON.stringify(streak)); // a puzzle move is a move: the calm streak counts the day
  await animate(r.events, prevStores);
  busy = false; puzzle.got = r.got; refreshStatic();
  const rec = recordDaily(daily, p.key, p.variant, r.got, p.target); daily = rec.data; prefs.set('daily', JSON.stringify(daily));
  paintPuzzleResult(r.got, rec.entry, rec.firstSolve); if (!lesson.on) tele.track('puzzle_play', { game: p.variant, solved: r.got >= p.target, shown: false }); if (!lesson.on) remindSync();
}
function paintPuzzleResult(got, e, firstSolve) {
  const p = puzzle.p; const hit = got >= p.target;
  $('#pzEyebrow').textContent = 'You captured'; $('#pzGot').textContent = got; $('#pzTarget').textContent = p.target; $('#pzBadge').textContent = resultLabel(got, p.target); $('#pzBadge').className = hit ? 'pzBadge' : 'pzBadge miss';
  const n = Math.min(Math.max(p.target, got), 16); const row = $('#pzRow'); row.innerHTML = ''; row.setAttribute('aria-label', `${got} of ${p.target} seeds`);
  for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.textContent = i < got ? '●' : '○'; if (i >= got) s.className = 'o'; s.style.animationDelay = `${i * 45}ms`; row.appendChild(s); }
  $('#pzBest').textContent = `${e.got} of ${p.target}`; $('#pzRun').textContent = runLine(solvedRun(daily, p.key));
  $('#pzAgain').textContent = hit ? 'Play it again' : 'Try again';
  $('#pzShow').hidden = !canShow(e); // after two misses Mama Ngozi offers to show the move
  paintPlayOut();
  paintRemindOffer(); paintNext();
  $('#pzCard').hidden = false; $('#puzzle').classList.add('open'); showTurn();
  if (hit) { click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); buzz([20, 40, 20]); if (firstSolve) { const run = solvedRun(daily, p.key); if (run > 1) setTimeout(() => toast(`${run} days in a row`), 900); } }
  else { click(0.7, 0.08); }
}
function paintPlayOut() { // play it out (web/playout.js): after your own move, the game can carry on from here against the opponent chosen on Home
  const b = $('#pzOut'); const ok = canPlayOut({ played: puzzle.played, mine: puzzle.mine, lesson: lesson.on, online, state });
  b.hidden = !ok; if (ok) { $('#pzOutWords').textContent = playoutButton(names[level]); $('#pzOutFace').innerHTML = faceFor(level, 'calm'); }
}
function playOut() { // the card goes, the HUD comes back, and their reply is the first move of the game
  if (busy || !puzzle.on || !canPlayOut({ played: puzzle.played, mine: puzzle.mine, lesson: lesson.on, online, state })) return;
  playout = playoutOf(puzzle.p.state); puzzle.on = false; puzzle.played = false; puzzle.mine = false; $('#pzCard').hidden = true; $('#puzzle').classList.remove('open');
  stopReview(); hideExplain(); hideTake(); takeSaid = false; local = false; seat(0); hintedAt = -1; mood = 'calm';
  stats = { biggest: puzzle.got, captures: puzzle.got ? 1 : 0, started: Date.now() }; // your puzzle move is the play-out's first
  showScreen('play'); paintRules(); refreshStatic(); deselect();
  setTimeout(() => toast(playoutToast(names[level])), 300); kickAi();
}
function endPlayout() { // Home from a play-out: your own game comes back (it was never touched), or a fresh board
  if (!playingOut()) { playout = null; return false; }
  playout = null; hideExplain(); hideTake(); if (!resume()) state = newGame(settings.game, settings.rules()); layoutFromState(state); refreshStatic(); deselect(); paintRules(); return true;
}
function paintRemindOffer() { // in the apps, on the first few days the puzzle is played: one tap for the daily reminder
  const b = $('#pzRemind'); b.classList.remove('on'); if (lesson.on) { b.hidden = true; return; }
  let o; try { o = JSON.parse(prefs.get('remind.offered', '{}')) || {}; } catch { o = {}; }
  const today = todayKey(); const already = o.last === today; // a day it was offered counts once, however often the card rises
  const show = offerShown({ app: reminders.supported, on: remindOn(), perm: reminders.permission, offered: already ? (o.n || 1) - 1 : o.n || 0 });
  b.hidden = !show; if (!show) return;
  if (!already) prefs.set('remind.offered', JSON.stringify({ n: (o.n || 0) + 1, last: today }));
  $('#pzRemindWords').textContent = offerWords(remindHour());
}
$('#pzRemind').addEventListener('click', async () => {
  const b = $('#pzRemind'); if (b.classList.contains('on')) return;
  if (await remindTurnOn('puzzle')) { b.classList.add('on'); $('#pzRemindWords').textContent = `Reminder on · ${hourLabel(remindHour())} each day`; setTimeout(() => { b.hidden = true; }, 1800); }
  else b.hidden = true;
});
async function puzzleShow() { // Show me: the position comes back, the answer pit lights, and the move plays through — shown, not scored
  if (busy || !puzzle.on) return; const p = puzzle.p; const e = dailyEntry(daily, p.key, p.variant); if (!canShow(e)) return;
  busy = true; puzzle.played = true; puzzle.mine = false; $('#pzCard').hidden = true; $('#puzzle').classList.remove('open'); $('#pzOut').hidden = true;
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
  $('#pzAgain').textContent = 'Now you'; $('#pzShow').hidden = true; paintNext(); $('#pzCard').hidden = false; $('#puzzle').classList.add('open'); showTurn();
  toast(`${CHARACTERS.hard.name} showed you — now play it yourself`); click(1.2, 0.06);
}
// The next puzzle (web/nextday.js): a line on the result card saying how long until the new day's position, ticking on the
// minute; at midnight with the card up it turns brass, glints, and a tap sets up the new day. The Home card turns with the day.
function paintNext(turnNow = false) {
  const el = $('#pzNext'); const p = puzzle.p; if (!p || lesson.on) { el.hidden = true; return; }
  const n = nextLine(dailyEntry(daily, p.key, p.variant), p.key); const was = el.classList.contains('ready');
  el.hidden = false; el.textContent = n.text; el.classList.toggle('ready', n.ready);
  if (n.ready) { el.setAttribute('role', 'button'); el.tabIndex = 0; } else { el.removeAttribute('role'); el.removeAttribute('tabindex'); }
  if (n.ready && !was && turnNow) { el.classList.remove('glint'); void el.offsetWidth; el.classList.add('glint'); click(1.6, 0.08); setTimeout(() => click(2.1, 0.08), 140); buzz(15); }
}
function nextPuzzleNow() { // the tap on "Tomorrow's puzzle is here": today's position, a fresh go
  if (busy || !puzzle.on || !$('#pzNext').classList.contains('ready')) return; openPuzzle(); click(1.3, 0.08);
}
$('#pzNext').addEventListener('click', nextPuzzleNow);
$('#pzNext').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); nextPuzzleNow(); } });
let dayTimer = 0;
function dayTick() { // once a minute, and on coming back to the page: the card's line, and Home's card at midnight
  clearTimeout(dayTimer); dayTimer = setTimeout(dayTick, nextTick(Date.now()));
  if (document.hidden) return;
  if (puzzle.on && !$('#pzCard').hidden) paintNext(true);
  if (!$('#home').hidden && dayTurned(puzzleCardKey)) { paintPuzzleCard(); const c = $('#puzzleCard'); c.classList.remove('turned'); void c.offsetWidth; c.classList.add('turned'); }
}
setTimeout(dayTick, 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) dayTick(); });
function puzzleAgain() { if (busy) return; const p = puzzle.p; puzzle.played = false; puzzle.mine = false; puzzle.got = 0; state = { ...p.state, pits: p.state.pits.slice(), stores: p.state.stores.slice() }; layoutFromState(state); refreshStatic(); deselect(); $('#pzCard').hidden = true; $('#puzzle').classList.remove('open'); click(1.2, 0.05); }
function closePuzzle() { // Back to home: the board goes back to your game (or a fresh one)
  if (busy) return; puzzle.on = false; puzzle.played = false; $('#pzCard').hidden = true;
  if (!resume()) state = newGame(settings.game, settings.rules()); layoutFromState(state); refreshStatic(); deselect(); paintRules(); showScreen('home');
}
async function sharePuzzle() {
  const p = puzzle.p; const text = tLines(shareText(p, puzzle.got)) + (linkable() ? `\n${publicBase()}?puzzle=1` : '');
  try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Result copied'); } } catch {}
}
$('#puzzleCard').addEventListener('click', () => { openPuzzle(); click(1.3, 0.08); });
$('#pzAgain').addEventListener('click', puzzleAgain);
$('#pzShow').addEventListener('click', () => { puzzleShow(); click(1.3, 0.06); });
$('#pzHome').addEventListener('click', () => { if (lesson.on) endLesson(false); else closePuzzle(); click(1, 0.05); });
$('#pzShare').addEventListener('click', () => { sharePuzzle(); click(1.3, 0.06); });
$('#pzOut').addEventListener('click', () => { playOut(); click(1.3, 0.08); });

// ---------- the first game's lesson (Launch L2, web/lesson.js): a new phone's first Play, or Settings → Rules → Learn to play ----------
// three of your moves from a set position on the live board — sowing, a capture of 4, a relay — with Adaeze's own move between them;
// each step's pit is lit and picked for you (its path marks land), one tap sows it, the words say what just happened, Next goes on;
// Skip at any time. Played in the puzzle's frame (the ask at the top, the HUD stepped aside), so no record, take or warning joins in.
const lesson = { on: false, k: 0, phase: 'idle', then: 'play', variant: 'ncho', steps: LESSON }; // Ayo has its own lesson (web/lesson.js AYO_STEPS): the game chosen picks it
const lessonDueNow = () => lessonDue({ newPhone, mode: settings.mode, lesson: prefs.get('lesson', null) });
function lessonTop(title, words) { $('#pzDay').textContent = lesson.phase === 'done' ? lessonDoneEyebrow(lesson.variant) : lessonEyebrow(lesson.k, lesson.variant); $('#pzRules').textContent = lesson.phase === 'done' ? '' : 'about a minute'; $('#pzAsk').textContent = title; $('#pzHow').textContent = words; }
function openLesson(then = 'play') {
  if (online || busy) return;
  lesson.on = true; lesson.k = 0; lesson.then = then; lesson.phase = 'ask'; lesson.variant = lessonGame(settings.game); lesson.steps = lessonSteps(lesson.variant); puzzle.on = true; puzzle.played = true; seat(0); hideExplain(); hideTake();
  state = lessonStart(lesson.variant); layoutFromState(state); refreshStatic(); deselect(); hintedAt = -1; body.classList.add('lesson');
  $('#pzCard').hidden = true; $('#lsCard').hidden = true; $('#pzHome').textContent = LESSON_SKIP; $('#puzzle').classList.remove('open'); $('#puzzle').setAttribute('aria-label', 'Learn to play');
  showScreen('puzzle'); lessonStep();
}
async function lessonStep() { // the ask, then the lit pit is picked for you: its marks land, one tap sows
  const st = lesson.steps[lesson.k]; lesson.phase = 'ask'; lessonTop(st.title, st.ask);
  await wait(reduceMotion ? 50 : 650); if (!lesson.on || lesson.phase !== 'ask') return;
  puzzle.played = false; select(st.pit);
}
async function lessonPlay(pit) {
  const st = lesson.steps[lesson.k]; if (!lesson.on || pit !== st.pit || lesson.phase !== 'ask') return;
  const { state: next, events } = applyMove(state, pit); const prev = state.stores; state = next; busy = true; puzzle.played = true; lesson.phase = 'move'; deselect();
  await animate(events, prev, Math.max(PACE, 190)); // a touch slower than a game, so it can be followed
  busy = false; if (!lesson.on) return; refreshStatic();
  lesson.phase = 'after'; $('#lsWords').textContent = st.after; $('#lsNext').textContent = lesson.k === lesson.steps.length - 1 ? 'Finish' : 'Next';
  $('#lsCard').hidden = false; $('#puzzle').classList.add('open'); showTurn();
  if (st.kind === 'capture' || st.kind === 'sweep') { click(1.5, 0.12); setTimeout(() => click(2, 0.12), 120); buzz([15, 30, 15]); } else click(1.2, 0.06);
}
async function lessonNext() {
  if (busy || !lesson.on) return;
  if (lesson.phase === 'done') return endLesson(true);
  if (lesson.phase !== 'after') return;
  $('#lsCard').hidden = true; $('#puzzle').classList.remove('open'); const st = lesson.steps[lesson.k];
  if (lesson.k === lesson.steps.length - 1) return lessonDone();
  lesson.phase = 'reply'; busy = true; lessonTop(`${names.easy}'s move`, lessonReply(names.easy));
  await wait(reduceMotion ? 50 : 500); if (!lesson.on) { busy = false; return; }
  select(st.reply, false); await wait(reduceMotion ? 100 : 600);
  const { state: next, events } = applyMove(state, st.reply); const prev = state.stores; state = next; board.ring.visible = false; board.glow.visible = false; selected = null;
  await animate(events, prev, Math.max(PACE, 190));
  busy = false; if (!lesson.on) return; refreshStatic(); lesson.k += 1; lessonStep();
}
function lessonDone() { // the end: kept as done (the first-game tips are then not needed), and the game against the chosen opponent offered
  lesson.phase = 'done'; prefs.set('lesson', 'done'); tipStep = 3; prefs.set('tutorial', '3'); tele.track('lesson_end', { how: 'done', step: lesson.steps.length });
  const name = names[level]; lessonTop(LESSON_DONE.title, LESSON_DONE.words(name));
  $('#lsWords').textContent = LESSON_DONE_LINE[lesson.variant]; $('#lsNext').textContent = `Play ${name}`; $('#pzHome').textContent = 'Back to home';
  $('#lsCard').hidden = false; $('#puzzle').classList.add('open'); showTurn();
  click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); buzz([20, 40, 20]);
}
function endLesson(playNow) { // Skip, Back to home, or Play: the board goes to the game (from Home's Play) or back home (from Settings)
  if (busy || !lesson.on) return; const was = lesson.phase;
  lesson.on = false; lesson.phase = 'idle'; puzzle.on = false; puzzle.played = false; body.classList.remove('lesson');
  if (was !== 'done') tele.track('lesson_end', { how: 'skipped', step: lesson.k + 1 });
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
function showScreen(which) { // 'home' | 'settings' | 'play' | 'rooms' | 'puzzle' | 'store'
  if (which !== 'play' && review.on) endReview(false);
  if (which !== 'store' && (shop.tryFinish || shop.trySeeds)) { shop.tryFinish = shop.trySeeds = null; applyLooks(); } // leaving the store puts your own look back
  $('#store').hidden = which !== 'store'; $('#home').hidden = which !== 'home'; $('#settings').hidden = which !== 'settings'; $('#rooms').hidden = which !== 'rooms'; $('#puzzle').hidden = which !== 'puzzle';
  const board3d = which === 'play' || which === 'puzzle'; // the puzzle is played on the board, like a game, with the HUD and toolbar stepped aside
  body.classList.toggle('screen', !board3d); body.classList.toggle('playing', board3d); body.classList.toggle('puzzle', which === 'puzzle'); pitLayer.hidden = !board3d;
  const wasIdle = idle; if (which === 'home') { paintHome(); idle = true; } else idle = which === 'rooms' || which === 'store'; // the board turns slowly behind Home, the Rooms screen and the store
  if (board3d && wasIdle) { // …and swings back round to face you as the game starts
    const from = theta, to = baseTheta + Math.round((theta - baseTheta) / (2 * Math.PI)) * 2 * Math.PI;
    if (Math.abs(to - from) > 0.01) tween(650, (t) => { theta = from + (to - from) * t; }, easeInOut);
  }
  if (which !== 'play' && !shoutMenu.hidden) toggleShoutMenu(false);
  if (which !== 'play' && !callMenu.hidden) toggleCallMenu(false);
  if (which !== 'play') { hideExplain(); if (selected === null) clearPath(); } // their last move stays on the board only while you are at it
  if (which === 'play') blinkLoop(); else { clearTimeout(blinkTimer); if (mood !== 'calm' && mood !== 'think') react('calm'); }
  if (which === 'play' && !busy && !state.over && state.turn === you && selected === null) showTurn(); else if (!board3d) paintFeed();
  wakeCheck(); // feed them: said once the board is in front of you, gone behind a screen
  try { paintFresh(); } catch { /* the first screen comes up before the update check is set up */ } // a newer version: said on Home only
}
let idle = true; // the home screen slowly turns the board
function paintHome() {
  paintGold();
  const g = settings.game; $('#lessonRow').textContent = LESSON_ROW[lessonGame(g)]; // Learn to play teaches the game chosen
  document.querySelectorAll('[data-game]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.game === g));
  document.querySelectorAll('.pill[data-level]').forEach((b) => b.setAttribute('aria-pressed', settings.mode !== 'local' && b.dataset.level === level));
  const two = settings.mode === 'local'; $('.pill[data-mode="local"]').setAttribute('aria-pressed', two);
  const st = comingStart(two); $('#playSub').textContent = two ? (st.first === 1 ? `${LNAMES[1]} starts · on this phone` : LOCAL_SUB) : 'vs ' + levelLabel(level) + (st.first === 1 ? ` · ${names[level]} starts` : ''); $('#streakLine').textContent = homeLine(streak); paintPuzzleCard(); paintRecordPills(); paintRatingHome();
  const saved = savedGame();
  $('#continueBtn').disabled = !saved; $('#continueSub').textContent = saved ? saved.local ? localContinue(saved) : `${saved.stores[0] > saved.stores[1] ? 'you lead' : saved.stores[0] < saved.stores[1] ? 'you trail' : 'level'} ${saved.stores[0]} – ${saved.stores[1]} · ${saved.moves.length} moves in` : 'no game in progress';
}
function paintBlocked() { // Settings → Privacy → Blocked on this phone: each with Unblock
  const list = $('#blockedList'); list.textContent = ''; $('#blockedNow').textContent = ` · ${blocked.size || blockWords('none')}`;
  for (const e of blocked.list.slice().reverse()) {
    const row = document.createElement('div'); row.className = 'row'; const t = document.createElement('div'); t.className = 't'; const b = document.createElement('b'); b.textContent = e.name; t.appendChild(b);
    const u = document.createElement('button'); u.className = 'choose'; u.type = 'button'; u.textContent = blockWords('unblock'); u.setAttribute('aria-label', `${blockWords('unblock')} ${e.name}`);
    u.addEventListener('click', () => { blocked.remove(e.tag); toast(blockWords('unblocked', e.name)); click(1.2, 0.05); paintBlocked(); });
    row.append(t, u); list.appendChild(row);
  }
}
function paintSettings() {
  paintGold();
  const r = settings.rules();
  const set = (name, v) => document.querySelectorAll(`[data-set="${name}"] .segbtn, [data-set="${name}"] .swatch`).forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === String(v)));
  set('game', settings.game); set('capture', r.capture); set('relay', r.relay ? 1 : 0); set('finish', board.finish); set('seeds', seedSetId()); set('speed', settings.speed); set('starts', startsPref());
  const stones = unlocked(streak, 'stones'); const sb = $('[data-set="seeds"] [data-v="stones"]'); sb.classList.toggle('locked', !stones); sb.setAttribute('aria-label', stones ? 'River stones' : `River stones — at ${MILESTONES[0].days} days played`);
  for (const id in LOOKS) { const b = $(`[data-set="${LOOKS[id].kind === 'board' ? 'finish' : 'seeds'}"] [data-v="${id}"]`); const shut = !lookOpen(id, owned(), GOLD_PREVIEW); b.classList.toggle('locked', shut); b.setAttribute('aria-label', shut ? `${LOOKS[id].name} — in the store` : LOOKS[id].name); }
  $('#boardSub').textContent = boardsLine({ owned: owned(), preview: GOLD_PREVIEW });
  $('#seedsSub').textContent = seedsLine({ stones, days: streak.days.length, need: MILESTONES[0].days, owned: owned(), preview: GOLD_PREVIEW });
  const sw = (name, on) => $(`[data-set="${name}"].sw`).setAttribute('aria-checked', String(on));
  sw('last8', r.last8); sw('badges', prefs.get('badges', '1') === '1'); sw('sound', soundOn()); sw('music', musicOn()); $('#musicNow').textContent = musicNote({ on: musicOn(), sound: soundOn(), call: callLive() }) ? ` · ${musicNote({ on: musicOn(), sound: soundOn(), call: callLive() })}` : ''; sw('haptics', prefs.get('haptics', '1') === '1'); sw('path', pathOn()); sw('answer', answerOn()); sw('swing', swingOn()); sw('take', takeOn()); sw('wake', wakeOn()); sw('tele', teleOn()); $('#teleNow').textContent = ` · ${teleNote(tele, inApp())}`; $('#wakeNow').textContent = wakeNote(navigator) ? ` · ${wakeNote(navigator)}` : ''; paintRemind(); paintBlocked(); paintLocalNames();
  set('quality', prefs.get('quality', 'auto')); $('#qualityNow').textContent = `now ${Q.lite ? 'lighter' : 'full'} (${quality.reason})` + (lastGameWords(parseFrames(prefs.get('frames.last', ''))) ? ' · ' + lastGameWords(parseFrames(prefs.get('frames.last', ''))) : '');
  set('lang', prefs.get('lang', 'auto')); set('textsize', textSizeNow()); $('#sizeNow').textContent = sizeNote(textSizeNow()); paintLegal(); $('#langNow').textContent = langNote(prefs.get('lang', 'auto'), i18n.lang);
  set('battery', prefs.get('battery', 'auto')); $('#batteryNow').textContent = noteFor(batt.s);
  set('physics', prefs.get('physics', 'auto')); $('#physicsNow').textContent = `now ${PHYS.physics ? 'on' : 'off'} (${PHYS.reason})`;
  document.querySelectorAll('.choose[data-level]').forEach((b) => { const on = settings.mode !== 'local' && b.dataset.level === level; b.setAttribute('aria-pressed', on); b.textContent = on ? 'Chosen' : 'Choose'; });
  const two = $('.choose[data-mode="local"]'); two.setAttribute('aria-pressed', settings.mode === 'local'); two.textContent = settings.mode === 'local' ? 'Chosen' : 'Choose';
}
// ---------- the store (L11), as approved 30 Oct with Gold at the top (web/store.js): looks only, never wins ----------
// A tap on a board or a seed set puts it on the live board above for a look; Back puts your own back. The web link sells
// nothing ("Get the app"); inside the apps the prices and buying come from Apple's and Google's own stores (L12), "Soon" until then.
const LOCK_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" fill="none" stroke="#2a1a0c" stroke-width="1.3"/><rect x="2.5" y="5.2" width="7" height="5" rx="1.2" fill="#2a1a0c"/></svg>';
const WOOD_TONE = { mahogany: '#7a3b1c', iroko: '#a97a3d', ebony: '#2a221c' };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let storePrices = null; // the stores' own price text by product id (L12), asked for once the app starts
// Buying (L12, web/purchase.js): Apple's and Google's own purchase systems through the app's NativePurchases plugin; on the web
// link nothing is sold. ?store=test puts the test store in its place for the browser checks, kept for that visit only.
const testStore = params.get('store') === 'test' && !inApp() ? makeTestStore({ prices: { gold: '£T.GO', board_benin_bronze: '£T.BB', board_grandpa: '£T.GB', seeds_cowries: '£T.SC', seeds_palm_kernels: '£T.SP', bundle_all: '£T.AL' } }) : null;
const sales = plugin('NativePurchases') ? makeShop(plugin('NativePurchases'), { platform: platform(), load: () => prefs.get('owned', '[]'), save: (j) => prefs.set('owned', j) })
  : testStore ? makeShop(testStore, { platform: 'ios', load: () => visitOwned || '[]', save: (j) => { visitOwned = j; } }) : null;
function ownedChanged() { applyLooks(); paintGold(); if (!$('#store').hidden) paintStore(); if (!$('#settings').hidden) paintSettings(); if (!$('#home').hidden) paintHome(); }
if (sales) {
  sales.listen(() => { ownedChanged(); toast('A purchase came through — thank you', 2600); });
  sales.sync().then(ownedChanged).catch(() => {});
  sales.prices().then((p) => { storePrices = p; if (!$('#store').hidden) paintStore(); }).catch(() => {});
}
let buying = false;
async function buyIt(row) { // ask the store; the look you were trying becomes yours on the board
  if (buying) return; buying = true; const btn = document.querySelector(`#storeBody .item[data-id="${row.id}"] .sbtn`) || $('#goldBtn'); if (btn) { btn.textContent = '…'; btn.disabled = true; }
  try {
    const r = await sales.buy(row.product);
    if (r.ok) {
      tele.track('purchase', { product: row.product });
      if (row.kind === 'board' && shop.tryFinish === row.id) { prefs.set('finish', row.id); params.delete('finish'); shop.tryFinish = null; }
      if (row.kind === 'seeds' && shop.trySeeds === row.id) { prefs.set('seeds', row.id); shop.trySeeds = null; }
      [1.5, 2.0, 2.6].forEach((p, k) => setTimeout(() => click(p, 0.08), k * 140)); buzz([12, 60, 12]);
    } else click(0.7, 0.05);
    toast(r.words, 3200);
  } finally { buying = false; if (btn) btn.disabled = false; ownedChanged(); }
}
function storeCtx() {
  return { owned: owned(), preview: GOLD_PREVIEW, stones: unlocked(streak, 'stones'), days: streak.days.length, need: MILESTONES[0].days,
    finish: finishFor(prefs.get('finish', 'mahogany'), { owned: owned(), preview: GOLD_PREVIEW }), seeds: seedSetFor(prefs.get('seeds', 'jobs'), { stones: unlocked(streak, 'stones'), owned: owned(), preview: GOLD_PREVIEW }),
    tryFinish: shop.tryFinish, trySeeds: shop.trySeeds, inApp: inApp() || !!sales, prices: storePrices };
}
let storeNow = null;
function paintStore() {
  const v = storeNow = storeView(storeCtx());
  $('#goldSub').textContent = v.gold.sub; const gb = $('#goldBtn'); gb.textContent = v.gold.button; gb.dataset.state = v.gold.state;
  $('#goldList').innerHTML = v.gold.opens.map((o) => `<li class="${o.ready ? '' : 'soon'}">${esc(o.what)}${o.ready ? '' : ' <em>coming</em>'}</li>`).join('');
  const nc = $('#nowCard'); nc.classList.toggle('trying', v.now.trying); $('#nowTag').textContent = v.now.tag; $('#nowTitle').textContent = v.now.title; $('#nowWords').textContent = v.now.words;
  const item = (r) => {
    const sw = r.kind === 'board' ? `<span class="swatch board${r.state === 'buy' || r.state === 'earn' ? ' locked' : ''}" data-v="${r.id}"${WOOD_TONE[r.id] ? ` style="background:${WOOD_TONE[r.id]}"` : ''}>${LOCK_SVG}</span>` : `<span class="swatch seed${r.state === 'buy' || r.state === 'earn' ? ' locked' : ''}" data-v="${r.id}">${LOCK_SVG}</span>`;
    return `<div class="item${r.trying ? ' trying' : ''}" data-kind="${r.kind}" data-id="${r.id}"><button type="button" class="who" aria-label="See ${esc(r.name)} on the board">${sw}<span class="lb"><b>${esc(r.name)}</b><span>${esc(r.sub)}</span>${r.trying ? '<i>on the board for a look</i>' : ''}</span></button><button type="button" class="sbtn" data-state="${r.state}">${esc(r.button)}</button></div>`;
  };
  $('#shopBoards').innerHTML = v.boards.map(item).join(''); $('#shopSeeds').innerHTML = v.seeds.map(item).join('');
  $('#shopBundle').innerHTML = `<div class="item" data-id="bundle"><span class="who"><span class="lb"><b>${esc(v.bundle.name)}</b><span>${esc(v.bundle.sub)}</span></span></span><button type="button" class="sbtn" data-state="${v.bundle.state}">${esc(v.bundle.button)}</button></div>`;
  $('#storeNote').textContent = v.note;
}
function applyLooks() { // what the board shows: a look being tried, else your own
  const f = shop.tryFinish || finishId(); if (board.finish !== f) board.setFinish(f);
  if (SEED_SETS[seedSetId()] !== SET) applySeedSet();
}
function openStore(from = 'home') { tele.track('store_open', { from }); shop.from = from; shop.tryFinish = shop.trySeeds = null; applyLooks(); paintStore(); $('#storeBody').scrollTop = 0; showScreen('store'); click(1.2, 0.05); }
function tryLook(kind, id) { // a tap on a row: that look on the board above, or (on your own one) back to yours
  const v = storeCtx(); const mineNow = kind === 'board' ? v.finish : v.seeds;
  const key = kind === 'board' ? 'tryFinish' : 'trySeeds'; shop[key] = id === mineNow ? null : id;
  applyLooks(); paintStore(); const nc = $('#nowCard'); nc.classList.remove('pop'); void nc.offsetWidth; nc.classList.add('pop');
  if (kind === 'board') { click(0.8, 0.07); buzz(8); } else taste();
}
function storeTap(row) { // a tap on a row's button
  const a = tapAction(row, storeCtx());
  if (a.act === 'use') { // yours: kept on the board
    if (row.kind === 'board') { prefs.set('finish', row.id); params.delete('finish'); shop.tryFinish = null; } else { prefs.set('seeds', row.id); shop.trySeeds = null; }
    applyLooks(); paintStore(); click(1.2, 0.06); toast(`${row.name} on the board`); return;
  }
  if (a.act === 'try' && row.kind && !row.trying) tryLook(row.kind, row.id);
  else if (a.act === 'buy') return buyIt(row);
  if (a.words) toast(a.words, 3600); click(0.8, 0.05);
}
$('#storeBody').addEventListener('click', (e) => {
  const it = e.target.closest('.item'); if (!it || !storeNow) return;
  const kind = it.dataset.kind, id = it.dataset.id;
  const row = id === 'bundle' ? storeNow.bundle : (kind === 'board' ? storeNow.boards : storeNow.seeds).find((r) => r.id === id);
  if (!row) return;
  if (e.target.closest('.sbtn')) storeTap(row); else if (kind) tryLook(kind, id);
});
$('#goldBtn').addEventListener('click', () => { if (storeNow) storeTap({ ...storeNow.gold, id: 'gold', name: 'Gold' }); });
$('#restoreBtn').addEventListener('click', async () => { click(0.8, 0.05); if (!sales) return toast(restoreWords(false), 3000); const b = $('#restoreBtn'); b.disabled = true; b.textContent = 'Asking the store…'; try { const r = await sales.restore(); toast(r.words, 3600); } finally { b.disabled = false; b.textContent = 'Restore purchases'; ownedChanged(); } });
$('#storeBack').addEventListener('click', () => { const back = shop.from === 'settings' ? 'settings' : 'home'; if (back === 'settings') paintSettings(); showScreen(back); click(1, 0.05); });
$('#homeStore').addEventListener('click', () => openStore('home'));
$('#settingsStore').addEventListener('click', () => openStore('settings'));
// ---------- the opponent's face reacts: a mood for a moment, then back to calm; blinks now and then while waiting ----------
let mood = 'calm', moodTimer = null, blinkTimer = null;
function react(next, ms = 2600) {
  if (params.get('still') || online || local || watch.on) return; clearTimeout(moodTimer); mood = next; const f = $('#oppFace'); f.innerHTML = faceFor(level, mood);
  if (next !== 'calm' && next !== 'blink' && next !== 'think') { f.classList.remove('react'); void f.offsetWidth; f.classList.add('react'); }
  if (next !== 'calm' && next !== 'think') moodTimer = setTimeout(() => react('calm'), ms);
}
function blinkLoop() { // a blink every few seconds, only on a calm face, never under reduced motion
  clearTimeout(blinkTimer); if (reduceMotion || params.get('still') || online || local || watch.on) return;
  blinkTimer = setTimeout(() => { if (mood === 'calm' && body.classList.contains('playing')) { $('#oppFace').innerHTML = faceFor(level, 'blink'); setTimeout(() => { if (mood === 'calm') $('#oppFace').innerHTML = faceFor(level, 'calm'); }, 130); } blinkLoop(); }, 2800 + Math.random() * 4200);
}
let bubbleTimer = null;
// the first word of a game knows the hour and whether you have been away (web/greet.js); ?hour=7 / ?away=4 try it
const greeted = { log: [] };
function greet() {
  if (online || local) return;
  const now = new Date(); const hour = params.has('hour') ? +params.get('hour') : now.getHours(); const today = dayKey(now);
  let days = streak.days; const aw = +params.get('away'); if (aw > 0) { const d = new Date(now); d.setDate(d.getDate() - aw); days = [...days.filter((k) => k < dayKey(d)), dayKey(d)]; }
  const g = greetMoment({ days, today, hour, last: prefs.get('greet.last', '') });
  if (g.moment !== 'start') prefs.set('greet.last', g.key);
  greeted.log.push({ moment: g.moment, key: g.key }); say(g.moment);
}
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
function owned() { return parseOwned(visitOwned ?? prefs.get('owned', '[]')); } // what the phone bought (L12), or the test store's visit
function goldLocked(lv) { if (levelOpen(lv, owned(), GOLD_PREVIEW)) return false; toast(lockedWords(names[lv], inApp()), 3200); click(0.7, 0.05); return true; }
function paintGold() { document.querySelectorAll('[data-level]').forEach((b) => { if (!GOLD_LEVELS.includes(b.dataset.level)) return; const shut = !levelOpen(b.dataset.level, owned(), GOLD_PREVIEW); b.classList.toggle('locked', shut); const row = b.closest('.row'); if (row) row.classList.toggle('locked', shut); }); }
function toast(text, ms = 1800) { const t = document.createElement('div'); t.className = ms > 1800 ? 'toast long' : 'toast'; t.textContent = text; body.appendChild(t); setTimeout(() => t.remove(), ms); }

// Settings → Opponent → Our names (two of us): kept as typed, shown at once — the cards, the faces, the turn, Home's pill and
// Continue line — in a game under way too; an empty field is Player 1 / Player 2 again
function paintLocalNames() {
  const kept = readNames(prefs.get('localNames', ''));
  [0, 1].forEach((i) => { const f = $('#localName' + i); if (f && document.activeElement !== f) f.value = kept[i]; });
}
function localNamesTyped() {
  const a = $('#localName0').value, b = $('#localName1').value; prefs.set('localNames', keepNames(a, b)); keepTyped(setLocalNames(a, b));
  paintRecordPills(); if (!$('#home').hidden) paintHome(); if (local && !busy) refreshStatic(); else if (local) { paintMyName(); paintFaces(); $('#oppName').textContent = oppLabel(); }
}
['#localName0', '#localName1'].forEach((id) => {
  const f = $(id); if (!f) return;
  f.addEventListener('input', localNamesTyped);
  f.addEventListener('change', () => { localNamesTyped(); paintLocalNames(); click(1.1, 0.04); });
  f.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); f.blur(); } e.stopPropagation(); }); // the game's keys never take a letter typed here
});
// settings wiring: rules changes start a new game; everything else applies at once
document.querySelectorAll('#settings [data-set]').forEach((el) => {
  const name = el.dataset.set;
  if (el.classList.contains('sw')) {
    el.addEventListener('click', () => {
      const on = el.getAttribute('aria-checked') !== 'true'; el.setAttribute('aria-checked', String(on));
      if (name === 'last8') { prefs.set('rules.last8', on ? '1' : '0'); rulesChanged(); }
      else prefs.set(name, on ? '1' : '0');
      if (name === 'sound') { paintSound(); click(1, 0.08); }
      if (name === 'sound' || name === 'music') { musicUnlock(); musicCheck(); paintSettings(); }
      if (name === 'wake') wakeCheck();
      if (name === 'tele') $('#teleNow').textContent = ` · ${teleNote(tele, inApp())}`;
      if (name === 'remind') { if (!reminders.supported) { prefs.set('remind', '0'); paintRemind(); toast('The reminder comes with the app — a web page cannot remind you once it is closed', 3000); click(0.7, 0.05); } else if (on) remindTurnOn('settings').then(paintRemind); else { remindSync(); click(0.9, 0.05); } }
    });
  } else {
    el.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.v;
      if (name === 'game') { prefs.set('game.variant', v); prefs.set('rules.capture', ''); prefs.set('rules.relay', ''); prefs.set('rules.last8', ''); rulesChanged();  remindSync(); }
      else if (name === 'capture') { prefs.set('rules.capture', v); rulesChanged(); }
      else if (name === 'relay') { prefs.set('rules.relay', v); rulesChanged(); }
      else if (name === 'finish') { // the board changes under the seeds, in place; a store board this phone does not have says where it comes from
        if (LOOKS[v] && !lookOpen(v, owned(), GOLD_PREVIEW)) { toast(lookLockedWords(LOOKS[v].name, inApp(), 'board'), 3200); click(0.7, 0.05); return; }
        prefs.set('finish', v); params.delete('finish'); if (board.finish !== finishId()) board.setFinish(finishId()); }
      else if (name === 'seeds') { // a seed set this phone does not have yet says where it comes from, and stays as it was
        if (v === 'stones' && !unlocked(streak, 'stones')) { toast(`River stones come with ${MILESTONES[0].days} days played — ${streak.days.length} so far`, 2600); click(0.7, 0.05); return; }
        if (LOOKS[v] && !lookOpen(v, owned(), GOLD_PREVIEW)) { toast(lookLockedWords(LOOKS[v].name, inApp()), 3200); click(0.7, 0.05); return; }
        prefs.set('seeds', v); applySeedSet(); paintSettings(); taste(); }
      else if (name === 'speed') { prefs.set('speed', v); PACE = PACES[v]; }
      else if (name === 'lang') { prefs.set('lang', v); params.delete('lang'); i18n.set(pickLang(v, navigator.languages || [navigator.language])); paintLegal(); if (reminders.supported) remindSync(); } // the reminder's words follow the language
      else if (name === 'textsize') { prefs.set('textsize', sizePref(v)); applyScale(document, textSizeNow()); toast(sizeToast(v)); } // at once, no new game
      else if (name === 'remindAt') { prefs.set('remindAt', v); paintRemind(); remindSync(); }
      else if (name === 'starts') { prefs.set('starts.pref', v); toast(v === 'loser' ? 'From the next game: the loser goes first' : v === 'you' ? 'From the next game: you always start' : 'From the next game: they always start'); }
      else if (name === 'quality') { if (v !== prefs.get('quality', 'auto') || prefs.get('quality.measured', '') === 'slow') { prefs.set('quality', v); prefs.set('quality.measured', ''); /* a choice in Settings starts the speed judgement afresh */ save(); toast('Redrawing the board…'); setTimeout(() => location.reload(), 500); } }
      else if (name === 'battery') { prefs.set('battery', v); battSet(); }
      else if (name === 'physics') { prefs.set('physics', v); PHYS = decidePhysics({ pref: v, lite: quality.lite, param: params.get('physics'), saver: batt.s.on }); toast(PHYS.physics ? 'Seeds bounce and roll again' : 'Seeds fly straight to their pit'); } // applies to the next seed, no new game
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
$('#homeBtn').addEventListener('click', () => { if (watch.on) { watch.stop = true; hurryNow(); return; } if (online) return leaveRoom(); if (!busy) { if (!endPlayout()) save(); showScreen('home'); } });
$('#goHome').addEventListener('click', () => { if (online) return leaveRoom(); $('#gameover').hidden = true; showScreen('home'); });
$('#homeSettings').addEventListener('click', () => { paintSettings(); showScreen('settings'); });
$('#settingsBtn').addEventListener('click', () => { if (!busy) { paintSettings(); showScreen('settings'); } });
$('#settingsBack').addEventListener('click', () => { if (online) return showScreen('play'); const r = settings.rules(); const same = state.variant === settings.game && JSON.stringify(state.rules) === JSON.stringify(r) && state.moves.length; showScreen(same ? 'play' : 'home'); });
$('#settingsRules').addEventListener('click', () => { $('#rules').hidden = false; });
// Privacy, terms and support: the server's pages, opened beside the game (a new tab, or the phone's browser from the apps) so the game stays where it was.
// In the game's own language (?lang=fr for a French game), painted again when Settings opens or the language changes.
function paintLegal() { for (const a of document.querySelectorAll('.legal a')) a.href = legalLink(a.dataset.page, globalThis, i18n.lang); }
paintLegal();

// ---------- the win, on the board (web/winwave.js): before the Game over card rises the winner's trough answers ----------
// its seeds jump in a wave along the trough, the way the winner sows, with a rising run of notes on the wood (falling when
// you lost), the lamp warming a moment and the winner's score glinting; a draw, both troughs more gently. Hurried by a tap.
const win = { waves: 0, hops: 0, last: null, peak: 1, swept: 0, samples: 0 };
// a game that ends with seeds still on the board (their side could not be fed, or the 60-move call) gives each pit's seeds
// to whoever keeps them; the engine moves no seed for it, so the seeds left in the pits fly into that trough here, pit by pit
async function sweepLeft() {
  if (!state.over || state.resigned != null || state.agreed || clipping) return;
  const left = [...Array(12).keys()].filter((i) => homes[i].length > state.pits[i]); if (!left.length) return;
  for (let k = 0; k < 30 && sim.live.length; k++) await wait(40); sim.finish();
  const flights = [];
  left.forEach((i, k) => {
    const ms = homes[i].splice(state.pits[i]); const to = 'S' + owner(i);
    flights.push(wait(k * 90).then(() => { rattle(Math.min(ms.length, 4), at(i)); return Promise.all(ms.map((m, j) => wait(j * 30).then(() => fly(m, to, 260, 0.08, j === ms.length - 1 ? (g, onSeed) => land(g * 0.6, onSeed, at(i), to) : null)))); }));
    win.swept += ms.length;
  });
  await Promise.all(flights); state.pits.forEach((n, i) => setBadge(i, n));
}
async function winMoment() {
  busy = true; try { await sweepLeft(); } finally { busy = false; }
  const w = winWave(state, you, { puzzle: puzzle.on, replaying, local });
  win.last = w ? w.kind : null; if (!w || reduceMotion || clipping) return;
  busy = true; win.waves++; win.peak = 1;
  if (hurry.depth++ === 0) { hurry.on = false; hurry.words = false; }
  try {
    for (let k = 0; k < 30 && sim.live.length; k++) await wait(40); sim.finish(); // the last seeds down before they jump
    const key = lamp && lamp.key, k0 = key ? key.intensity : 0;
    const total = waveLength(w.troughs.map((s) => homes['S' + s].length));
    const glow = key ? tween(total, (t) => { const f = lampAt(t * total, total); key.intensity = k0 * f; win.peak = Math.max(win.peak, f); win.samples++; }) : null;
    for (const s of w.troughs) {
      const el = scoreOf(s); el.classList.remove('glint'); void el.offsetWidth; el.classList.add('glint');
      const ms = homes['S' + s].slice(); const fromLeft = pitCenters[s * 6][0] < pitCenters[s * 6 + 5][0];
      const order = waveOrder(ms.map((m) => m.position.x), fromLeft); const span = order.length ? order[order.length - 1].at : 0;
      w.notes.forEach((p, k) => setTimeout(() => click(p, w.kind === 'draw' ? 0.06 : 0.08), hurried(Math.round((k / Math.max(1, w.notes.length - 1)) * span), hurry.on)));
      buzz(w.kind === 'win' ? [12, 40, 12, 40, 24] : [12, 60, 12]);
      rattle(Math.min(ms.length, 5), { x: storeCenters[s][0], y: BT, z: storeCenters[s][1] });
      await Promise.all(order.map(({ i, at: t }) => wait(t).then(() => {
        const m = ms[i]; const y0 = m.position.y; win.hops++;
        return tween(HOP_MS, (u) => { m.position.y = y0 + hopAt(u * HOP_MS, w.hop) * (0.85 + 0.15 * Math.sin(i)); }).then(() => { m.position.y = y0; });
      })));
    }
    await wait(SETTLE_MS); if (glow) await glow; if (key) key.intensity = k0;
  } finally { if (--hurry.depth === 0) hurry.on = false; busy = false; }
}
// game over card, as approved
function gameOver() {
  const a = state.stores[you], b = state.stores[them]; const win = state.winner === you; const draw = state.winner === 'draw';
  const gave = online && state.resigned != null ? gaveUpWords(state.resigned, you, oppLabel()) : online && state.agreed ? { ...drawWords(oppLabel()), title: 'A draw' } : null; // a game someone gave up (or both agreed level): the result is theirs to give, whatever the seeds say
  const out = playingOut(); // a play-out: no record, rating, review, story, replay or clip (the moves before the puzzle were nobody's)
  $('#goEyebrow').textContent = out ? (isRetry(playout) ? retryEyebrow(state.variant, playout.n, playedOut(playout, state)) : playoutEyebrow(state.variant, playedOut(playout, state))) + (endedCircling(state) ? ' · ' + circlingEnded() : '') : `${state.variant === 'ncho' ? 'Nchò' : 'Ayo'} · ${state.moves.length} moves${gave ? ' · ' + gave.who : endedCircling(state) ? ' · ' + circlingEnded() : ''}`; // a called game says why it ended
  $('#goTitle').textContent = gave ? gave.title : local ? localTitle(state) : draw ? 'A draw' : win ? 'You win' : `${online ? oppLabel() : names[level]} wins`;
  $('#goMyScore').textContent = a; $('#goOppScore').textContent = b; $('#goOppName').textContent = oppLabel();
  $('#rematch').textContent = online ? (friend && friend.wantsRematch ? `Play again — ${friend.name} is ready` : 'Play again') : 'Play again'; $('#rematch').disabled = false;
  $('#goMe').classList.toggle('win', gave ? win : a >= b); $('#goOpp').classList.toggle('win', gave ? state.winner === them : b > a); // an agreed draw lights neither
  $('#goBig').textContent = `${stats.biggest} seeds`; $('#goCaps').textContent = stats.captures;
  const secs = Math.round((Date.now() - stats.started) / 1000); $('#goTime').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  $('#replayBtn').hidden = out; $('#clipBtn').hidden = out;
  let word = null;
  if (out) { $('#goRecord').hidden = true; $('#goNext').hidden = true; $('#goRating').hidden = true; $('#goStory').hidden = true; stopReview(); revBtn.hidden = true; story = null; }
  else { word = paintRecord(a, b); paintRating(a, b); paintStory(); startReview(); }
  paintRetry(a, b, out);
  if (!puzzle.on && !out) { const first = prefs.get('tele.first', null) === 'started'; if (first) prefs.set('tele.first', 'finished');
    tele.track('game_end', { game: state.variant, vs: teleVs(), result: resultOf(state, you), ended: state.resigned != null ? 'gave_up' : state.agreed ? 'draw_agreed' : endedCircling(state) ? 'circling' : 'played', moves: state.moves.length, first }, online ? `e:${net && net.code}:${state.moves.join('')}` : `e:${stats.started}`); }
  if (!online && !puzzle.on && !out) { starts = recordStart(starts, startKey(local), firstMover(state.moves, state.first || 0), state.winner); prefs.set('starts', JSON.stringify(starts)); }
  $('#gameover').hidden = false; if (!online && !out) prefs.set('game', 'null'); // a play-out leaves your saved game alone
  if (word) sayText(word.text, word.mood); else say(win ? 'lose' : 'win'); // a run or a first win is worth their word more than the usual line
  if (win || (local && !draw)) { click(1.5, 0.15); setTimeout(() => click(2, 0.15), 120); setTimeout(() => click(2.5, 0.15), 240); }
}
// your record against this opponent, counted once per game (the game's start time is its id) and shown on the card with their face;
// when the result is worth a word (your first win against them, a run of 3, 5, 10…) they say it, on the card and in the bubble
function paintRecord(a, b) {
  const box = $('#goRecord'); $('#goNext').hidden = true; if (online && !puzzle.on) { paintTally(box); return null; }
  if (online || puzzle.on || local) { box.hidden = true; return null; } // two of us keeps no record: the phone cannot tell who sat where
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
// the score at the table (web/tally.js): playing a friend game after game, the card says who leads at this board tonight; the
// standing that changed lands as it stood before ("level 0–0") and turns to the new one ("you lead 1–0") with a knock
let tallyTimer = 0;
function paintTally(box) {
  clearTimeout(tallyTimer);
  const key = tableRoom && roomKey(tableRoom.code, tableRoom.rid); if (!key) { box.hidden = true; return; }
  const r = recordTally(tally, key, tableRoom.games, state.winner); tally = r.data; if (r.counted) prefs.set('tally', JSON.stringify(tally));
  const name = friend ? friend.name : oppLabel(); const text = tallyLine(r.entry, you, name); if (!text) { box.hidden = true; return; }
  const up = wentUp(r.before, r.entry, you); const parts = text.split(' · '); const at = up === 'draw' ? 1 : up ? 0 : -1;
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const was = up && up !== 'draw' ? (tallyPlayed(r.before) ? standingParts(r.before, you, name)[0] : 'level 0–0') : null;
  $('#goRecLine').innerHTML = parts.map((p, i) => i === at ? `<em class="tally">${esc(i === 0 && was && !reduceMotion ? was : p)}</em>` : esc(p)).join(' · ');
  $('#goRecSay').hidden = true; box.classList.remove('word'); $('#goRecFace').innerHTML = initialFace(name).replace('width="44" height="44"', 'width="100%" height="100%"'); box.hidden = false;
  if (at < 0) return;
  tallyTimer = setTimeout(() => { const em = $('#goRecLine').querySelector('em.tally'); if (!em || $('#gameover').hidden) return; em.textContent = parts[at]; em.classList.remove('tick'); void em.offsetWidth; em.classList.add('tick'); click(up === 'mine' ? 1.7 : 1.1, 0.07); buzz(8); }, reduceMotion ? 0 : 700);
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
  const words = storyWords(st, { me, them: other, gaveUp: online && state.resigned != null ? gaveUpWords(state.resigned, you, other).story : online && state.agreed ? drawWords(other).story : undefined }); $('#goStoryWords').textContent = words; $('#goStoryMe').textContent = me === 'You' ? 'you' : me; $('#goStoryThem').textContent = other;
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
// try again from where it turned (web/retry.js): after a game lost to the computer, the card offers the move that let it
// go; the seeds fly back to where they lay before it and you play on from there against the same opponent — practice,
// like a play-out from the puzzle (never saved or counted). A retry's own card says how it went this time and offers it again.
function paintRetry(a, b, out) {
  const btn = $('#goRetry'); const o = out && !isRetry(playout) ? null : retryOffer({ online, local, puzzle: puzzle.on, lesson: lesson.on, state, you, retry: out ? playout : null });
  btn.hidden = !o; if (o) { btn.textContent = retryButton(o.n); btn.dataset.at = o.at; }
  if (out && isRetry(playout)) { // the card's record line: last time against this time, with their face
    const box = $('#goRecord'); $('#goRecLine').textContent = retryLine(playout.last, [a, b]); $('#goRecSay').hidden = true; box.classList.remove('word');
    $('#goRecFace').innerHTML = faceFor(level, state.winner === you ? 'sulk' : state.winner === them ? 'happy' : 'calm'); box.hidden = false;
  }
}
async function startRetry() {
  if (busy || clipping || replaying) return;
  const retry = playingOut() && isRetry(playout) ? playout : null;
  const o = retryOffer({ online, local, puzzle: puzzle.on, lesson: lesson.on, state, you, retry }); if (!o) return;
  const moves = state.moves.slice(); const keep = moves.slice(0, o.at);
  const po = retry || retryOf(moves, o, [state.stores[you], state.stores[them]]);
  const before = state, after = replay(keep, state.variant, state.rules, state.first);
  $('#gameover').hidden = true; stopReview(); hideExplain(); hideTake(); takeSaid = false; deselect(); busy = true; click(1.3, 0.08);
  sim.finish(); layoutFromState(before); // every seed goes back from where it lies to where it lay before your move (web/takeback.js)
  await flyBack(before, after, moves[o.at], retryToast(o.n).split(' — ')[0]);
  playout = po; state = after; layoutFromState(state); busy = false; hintedAt = -1; mood = 'calm';
  stats = { biggest: 0, captures: 0, started: Date.now() };
  refreshStatic(); deselect(); paintRules(); toast(retryToast(o.n)); buzz([15, 30, 15]);
}
$('#goRetry').addEventListener('click', () => startRetry());
$('#goStory').addEventListener('click', () => { if (story && story.biggest) { click(1.3, 0.08); watchBigTurn(story.biggest.index); } });
$('#replayBtn').addEventListener('click', async () => {
  if (busy) return; const moves = state.moves.slice(); const variant = state.variant, rules = state.rules;
  $('#gameover').hidden = true; busy = true; hideExplain();
  let s = newGame(variant, rules, firstMover(moves)); layoutFromState(s); refreshStaticFrom(s);
  for (const m of moves) { const r = applyMove(s, m); if (r.state.turn === them) { select(m); await wait(250); } deselect(); await animate(r.events, s.stores, 70); s = r.state; refreshStaticFrom(s); }
  busy = false; $('#gameover').hidden = false;
});
function refreshStaticFrom(s) { s.pits.forEach((n, i) => setBadge(i, n)); const n = local ? nearCard() : you; $('#myScore').textContent = s.stores[n]; $('#oppScore').textContent = s.stores[1 - n]; }
$('#shareBtn').addEventListener('click', async () => {
  const a = state.stores[you], b = state.stores[them]; let text = tLines(local ? localShare(state) : playingOut() ? (isRetry(playout) ? retryShare(state, you, names[level], playout) : playoutShare(state, you, names[level])) : `Ayo & Nchò — ${state.winner === 'draw' ? 'I drew with' : state.winner === you ? 'I beat' : 'I lost to'} ${online ? oppLabel() : names[level]} ${a}–${b} in ${state.moves.length} moves.`);
  const seats = []; if (local) { seats[0] = LNAMES[0]; seats[1] = LNAMES[1]; } else { seats[you] = myName(); seats[them] = online ? oppLabel() : names[level]; }
  const watchQ = !playingOut() && !puzzle.on && linkable() ? watchQuery({ variant: state.variant, rules: state.rules, first: firstMover(state.moves, state.first || 0), moves: state.moves }, seats) : null; // watch the whole game (web/watch.js): the moves ride in the link
  if (watchQ) text += '\n' + tLines(watchLink()) + ' ' + publicBase() + watchQ;
  try {
    renderer.render(scene, camera); const blob = await new Promise((r) => canvas.toBlob(r, 'image/png')); const file = blob && new File([blob], 'ayo-ncho.png', { type: 'image/png' }); // drawn now: a resting board may not have drawn this frame
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
  clipping = true; musicCheck(); busy = true; const wasOver = !$('#gameover').hidden; $('#gameover').hidden = true; deselect();
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
  layoutFromState(state); refreshStatic(); busy = false; clipping = false; musicCheck(); selected = null; if (wasOver) $('#gameover').hidden = false;
  const caption = tLines(clipCaption(turn, online || local ? oppLabel() : names[level], state.variant));
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

function save() { if (online || playingOut()) return; prefs.set('game', JSON.stringify({ moves: state.moves, variant: state.variant, rules: state.rules, level, stats, local })); } // a play-out is practice: your own game stays as it was saved
function savedGame() { try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.moves && g.moves.length) { const s = replay(g.moves, g.variant, g.rules); return s.over ? null : { ...s, local: !!g.local }; } } catch {} return null; }
function resume() {
  try { const g = JSON.parse(prefs.get('game', 'null')); if (g && g.moves && g.moves.length && !params.get('still')) { state = replay(g.moves, g.variant, g.rules); level = playable(g.level || level, owned(), GOLD_PREVIEW); stats = g.stats || stats; local = !!g.local; seat(local ? seatOf(state) : 0); return !state.over; } } catch {}
  local = false; seat(0); return false;
}
function newRound() {
  playout = null; if (deal.live) { deal.again = true; return; } // a new game is already being dealt: once its seeds are down, start the one asked for
  stopReview(); hideExplain(); takeSaid = false; local = settings.mode === 'local'; const st = comingStart(local);
  seat(local ? st.first : 0); state = newGame(settings.game, settings.rules(), st.first); stats = { biggest: 0, captures: 0, started: Date.now() };
  const dp = window.__dealPace || 1; // (the render check slows it down to take its picture on a software-rendered page)
  const plan = dealPlan(homeCounts(), state, { gap: DEAL_GAP_MS * dp, pitGap: DEAL_PIT_GAP_MS * dp, fly: DEAL_FLY_MS * dp }); // where the last game's seeds lie, and what the new one wants
  if (!dealsIn(plan, { reduceMotion, clipping })) layoutFromState(state);
  refreshStatic(); $('#gameover').hidden = true; deselect(); save(); paintRules(); faceSeat();
  const dealt = dealsIn(plan, { reduceMotion, clipping }) ? dealIn(plan, state) : Promise.resolve();
  if (local) setTimeout(() => toast(`${startWords(st, LNAMES, false)} · ${tableOn() ? tableStart() : 'pass the phone after each move'}`), 600);
  else { setTimeout(greet, 600); if (st.first === them || st.why !== 'first') setTimeout(() => toast(startWords(st, ['You', names[level]])), 600); dealt.then(() => { if (deal.again) return; kickAi(); }); } // the computer opens when it is their start, once the board is set
  dealt.then(() => { if (deal.again) { deal.again = false; newRound(); } });
}
// ---------- setting up the board (web/deal.js): a new game's seeds are dealt from the troughs, four counted into each pit ----------
// Each side's hand deals from its own trough into its own pits, near to far in sowing order, both at once, every seed
// with its knock and the counts ticking (the troughs' numbers ticking down); about a second and a half, hurried by a tap.
const deal = { deals: 0, flown: 0, live: false, again: false, inAir: 0 };
function homeCounts() { return { pits: [...Array(12).keys()].map((i) => homes[i].length), stores: [homes.S0.length, homes.S1.length] }; }
async function dealIn(plan, s) {
  deal.live = true; deal.deals++; busy = true;
  if (hurry.depth++ === 0) { hurry.on = false; hurry.words = false; }
  const scoreEl = scoreOf;
  const shown = homeCounts(); shown.pits.forEach((n, i) => setBadge(i, n)); for (const side of [0, 1]) scoreEl(side).textContent = shown.stores[side];
  const SETTING = 'Setting up the board — four seeds to each pit', was = i18n.src($('#hint')); $('#hint').textContent = SETTING; $('#oppSub').textContent = 'setting up…';
  try {
    for (let k = 0; k < 30 && sim.live.length; k++) await wait(40); sim.finish(); // the last seeds down before they are picked up
    for (const side of [0, 1]) if (shown.stores[side]) rattle(Math.min(shown.stores[side], 5), { x: storeCenters[side][0], y: BT, z: storeCenters[side][1] }); // both troughs scooped up
    const launch = (mv) => {
      const m = homes[mv.from].pop(); if (!m) return null;
      if (typeof mv.from === 'string') { shown.stores[+mv.from[1]]--; tickScore(scoreEl(+mv.from[1]), shown.stores[+mv.from[1]]); } else { shown.pits[mv.from]--; setBadge(mv.from, shown.pits[mv.from]); }
      deal.inAir++; const p = typeof mv.to === 'string' ? { x: storeCenters[+mv.to[1]][0], y: BT, z: storeCenters[+mv.to[1]][1] } : at(mv.to);
      return fly(m, mv.to, DEAL_FLY_MS * (window.__dealPace || 1), DEAL_LIFT, (g, onSeed) => { if (g > 0.5) { land(g * 0.55, onSeed, p, mv.to); buzz(4); if (typeof mv.to === 'number') { shown.pits[mv.to]++; setBadge(mv.to, shown.pits[mv.to]); } } }).then(() => { deal.inAir--; deal.flown++; });
    };
    const flights = []; let t = 0; // one seed after another, each wait taken as it comes so a tap hurries the rest of the deal too
    for (const mv of plan.moves) { if (mv.at > t) { await wait(mv.at - t); t = mv.at; } flights.push(launch(mv)); }
    await Promise.all(flights);
  } finally {
    if (--hurry.depth === 0) hurry.on = false;
    const now = homeCounts(); if (JSON.stringify(now) !== JSON.stringify({ pits: s.pits, stores: s.stores })) layoutFromState(s); // never left differing from the engine
    if (i18n.src($('#hint')) === SETTING) $('#hint').textContent = was; if (s === state) refreshStatic(); deal.end = { ...homeCounts(), badges: badges.map((b) => +b.textContent), scores: [+$('#myScore').textContent, +$('#oppScore').textContent], moves: state.moves.length }; deal.live = false; busy = false;
  }
}
function faceSeat() { // a new game from the Game over card: the board turns round to face whoever now holds the near seat (Home's swing does this itself)
  if (idle) return; const from = theta, to = baseTheta + Math.round((theta - baseTheta) / (2 * Math.PI)) * 2 * Math.PI;
  if (Math.abs(to - from) > 0.01) tween(650, (t) => { theta = from + (to - from) * t; }, easeInOut);
}
// weighing it up (web/ponder.js): while the computer thinks, a faint brass light drifts over a pit or two of its own, as a hand
// hovers at a real board, then glides onto the pit it plays a moment before the usual light picks it; the search runs alongside
const ponder = { mesh: null, plan: [], t0: 0, pick: -1, on: false, s: null, log: [] };
{ const m = new THREE.Mesh(board.hover.geometry, board.hover.material.clone()); m.rotation.x = -Math.PI / 2; m.position.y = board.hover.position.y + 0.0004; m.material.opacity = 0; m.visible = false; board.group.add(m); ponder.mesh = m; }
function ponderOff() { ponder.on = false; ponder.s = null; }
async function theirPick(s) {
  const think = aiMove(s);
  if (!ponderOn({ computer: !online && !local, puzzle: puzzle.on && !playingOut(), lesson: lesson.on, replay: replaying, clip: clipping, reduced: reduceMotion, state: s })) return think;
  const plan = ponderPlan(s, level); const entry = { moves: s.moves.length, level, plan: plan.slice(), pick: null, seen: [] };
  ponder.log.push(entry); if (ponder.log.length > 20) ponder.log.shift();
  Object.assign(ponder, { plan, t0: performance.now(), pick: -1, on: true, s, entry });
  const [m] = await Promise.all([think, wait(plan.length * GLANCE_MS)]);
  if (ponder.s !== s || state !== s) { if (ponder.s === s) ponderOff(); return m; } // undone, a new game or Home while it thought
  if (m !== null) { ponder.pick = m; entry.pick = m; await wait(PONDER_SETTLE_MS); }
  if (ponder.s === s) ponderOff(); return m;
}
function ponderStep(now, dt) { // called by the render loop: the light follows the hand from pit to pit and fades as it goes
  const m = ponder.mesh, still = ponder.on && ponder.s === state && !state.over && body.classList.contains('playing');
  const at = still ? ponderAt(ponder.plan, now - ponder.t0, ponder.pick) : { pit: -1, op: 0 };
  if (at.pit >= 0) { const [x, z] = pitCenters[at.pit]; const e = ponder.entry; if (e && e.seen[e.seen.length - 1] !== at.pit) e.seen.push(at.pit);
    if (!m.visible || m.material.opacity < 0.02) { m.position.x = x; m.position.z = z; } // it appears where the hand is, then glides
    else { const k = Math.min(1, dt * PONDER_GLIDE); m.position.x += (x - m.position.x) * k; m.position.z += (z - m.position.z) * k; } }
  m.material.opacity += (at.op - m.material.opacity) * Math.min(1, dt * 12); if (at.op === 0 && m.material.opacity < 0.01) m.material.opacity = 0;
  m.visible = m.material.opacity > 0.01;
}
// their hand over the board (web/peek.js): the friend's picked pit lit faintly on this board, following their finger
const peekIn = { mesh: null, pit: -1, n: -1, seat: -1, t: 0, shown: false, log: [] };
{ const m = new THREE.Mesh(board.hover.geometry, board.hover.material.clone()); m.rotation.x = -Math.PI / 2; m.position.y = board.hover.position.y + 0.0003; m.material.opacity = 0; m.visible = false; board.group.add(m); peekIn.mesh = m; }
function peekNow() {
  const playing = body.classList.contains('playing') && !body.classList.contains('screen') && $('#gameover').hidden;
  return peekShown({ online, seat: peekIn.seat, you, pit: peekIn.pit, n: peekIn.n, state, playing, replaying, clip: clipping, age: performance.now() - peekIn.t });
}
function peekPaint() { const on = peekNow(); if (on !== peekIn.shown) { peekIn.shown = on; if (online) showTurn(); } else if (on && online) showTurn(); }
function peekStep(now, dt) { // called by the render loop: the light glides to the pit their finger is on and fades when it lifts
  const m = peekIn.mesh, on = peekNow();
  if (on !== peekIn.shown) { peekIn.shown = on; if (online) showTurn(); }
  if (on) { const [x, z] = pitCenters[peekIn.pit];
    if (!m.visible || m.material.opacity < 0.02 || reduceMotion) { m.position.x = x; m.position.z = z; }
    else { const k = Math.min(1, dt * PEEK_GLIDE); m.position.x += (x - m.position.x) * k; m.position.z += (z - m.position.z) * k; } }
  const goal = on ? PEEK_OP : 0; m.material.opacity += (goal - m.material.opacity) * Math.min(1, reduceMotion ? 1 : dt * 10); if (!on && m.material.opacity < 0.01) m.material.opacity = 0;
  m.visible = m.material.opacity > 0.01;
}
// which pit they played (web/lastmark.js): the faint light their hand came down on stays, fainter, on the pit they played while their
// move is explained under the board (so until your move), stepping aside while a turn is watched again; still, so the board can rest
{ const m = new THREE.Mesh(board.hover.geometry, board.hover.material.clone()); m.rotation.x = -Math.PI / 2; m.position.y = board.hover.position.y + 0.0002; m.material.opacity = 0; m.visible = false; board.group.add(m); lastM.mesh = m; }
function lastLabel(i) { const b = pitBtns[i]; if (b) b.setAttribute('aria-label', withLast(pitLabel(i, state.pits[i], { you, selected, legal: state.turn === you && !state.over ? legalMoves(state) : null }), i, lastM.pit)); }
function lastStep(now) { // called by the render loop
  const playing = body.classList.contains('playing') && !body.classList.contains('screen') && $('#gameover').hidden;
  const pit = lastMarkPit({ theirs, state, you, playing, replaying, clip: clipping }), m = lastM.mesh;
  if (pit !== lastM.pit) { const was = lastM.pit; lastM.pit = pit; if (was >= 0) lastLabel(was); if (pit >= 0) { lastLabel(pit); const [x, z] = pitCenters[pit]; m.position.x = x; m.position.z = z; } }
  const op = pit >= 0 ? lastMarkOp(now - lastM.t0, { reduced: reduceMotion }) : 0;
  if (m.material.opacity !== op) m.material.opacity = op; m.visible = op > 0.005;
}
function kickAi() { if (!local && state.turn === them && !state.over) (async () => { busy = true; await wait(400); busy = false; react('think'); const s = state; const m = await theirPick(s); if (mood === 'think') react('calm'); if (m !== null && state === s) { select(m); await wait(500); await play(m); } })(); }
async function undo() {
  if (online) return askBack();
  if (busy) return;
  const u = undoPlan({ moves: state.moves, turn: state.turn, you, local }); if (!u || !undoOk(playingOut() ? playout : null, state, u)) return; // a play-out goes back as far as the puzzle // two of us: one move back, and the board turns back to whoever played it
  const before = state, after = replay(u.keep, state.variant, state.rules, state.first);
  hideExplain(); deselect(); busy = true; $('#undo').disabled = true; $('#hintBtn').disabled = true; if (!local) say('undo');
  const words = undoWords({ local, gone: u.gone, name: names[level], mover: LNAMES[seatOf(after)] }); // (after.turn: whoever played the move that goes)
  sim.finish(); layoutFromState(before); // the seeds go back from where they lie, not in a jump (web/takeback.js)
  await flyBack(before, after, u.played, words);
  state = after; layoutFromState(state); busy = false; refreshStatic(); deselect(); save(); click(0.7, 0.06);
  if (local) await passTurn();
}
function paintRules() { $('#lessonRow').textContent = LESSON_ROW[lessonGame(settings.game)]; $('#rulesNcho').hidden = state.variant !== 'ncho'; $('#rulesAyo').hidden = state.variant !== 'ayo'; $('#gameName').textContent = state.variant === 'ncho' ? 'Nchò' : 'Ayo'; }

// ---------- first-game tutorial: three tips, then never again ----------
const TIPS = [
  'Your six pits are the column nearest you, on the right. Tap one with seeds: brass marks show where its seeds will go. Tap again to sow.',
  'The seeds go one per pit anticlockwise: up your side, then down theirs. The count beside each pit keeps score for you.',
  null, // filled in per rules below
];
let tipStep = +prefs.get('tutorial', '0');
function showTip(text) {
  if (!text || params.get('still') || params.get('capture') || puzzle.on) return;
  let t = $('#tip'); if (!t) { t = document.createElement('div'); t.id = 'tip'; t.innerHTML = '<p></p><button class="btn ghost" style="padding:8px 12px;font-size:calc(13px*var(--ts))">Got it</button>'; body.appendChild(t); t.querySelector('button').addEventListener('click', () => { t.remove(); }); }
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

// set the board straight (web/view.js): a double-tap on the wood (a double-click, or 0 on the keys) glides the board back to
// where a game starts it — facing the near seat, at the tilt and distance the framing chose; a drag, a pinch or the wheel that
// leaves it well off says how, once on a phone. Two of us with Pass the phone off: the board stays the way it lies (0 or π).
let woodTap = null, viewGlide = 0, wheelTimer = 0;
const viewFit = () => ({ base: local && !swingOn() ? (Math.cos(theta) >= 0 ? 0 : Math.PI) : baseTheta, phi: fitPhi, dist: fitDist });
const viewMay = () => mayStraighten({ screen: body.classList.contains('screen'), clipping, hurrying: hurry.depth > 0, idle });
function straighten() {
  if (!viewMay()) return false;
  const fit = viewFit(), from = { theta, phi, dist }, to = restOf(from, fit);
  if (Math.abs(to.theta - from.theta) + Math.abs(to.phi - from.phi) + Math.abs(to.dist - from.dist) < 1e-3) return false; // already straight
  prefs.set('straightTip', '1'); click(0.85, 0.05); try { navigator.vibrate && navigator.vibrate(8); } catch {}
  const id = ++viewGlide;
  tween(glideMs(from, fit), (t) => { if (id !== viewGlide) return; const v = glideAt(from, to, t); theta = v.theta; phi = v.phi; dist = v.dist; }, easeInOut);
  return true;
}
function straightTipOnce(mouseLike) { // the first drag, pinch or wheel that leaves the board well off says how to put it back
  if (prefs.get('straightTip', '0') === '1' || !viewMay() || !isOff({ theta, phi, dist }, viewFit())) return;
  prefs.set('straightTip', '1'); toast(straightTip({ mouse: mouseLike }), 3400);
}
// ---------- input ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null, dragged = false;
const fingers = new Map(); let pinch = null; // two-finger zoom on the phone
const clampDist = () => { dist = Math.min(fitDist * 1.6, Math.max(fitDist * 0.5, dist)); };
canvas.addEventListener('pointerdown', (e) => {
  if (!shoutMenu.hidden) toggleShoutMenu(false); // a tap on the board closes the shout row
  if (!callMenu.hidden) toggleCallMenu(false);
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); viewGlide++; // a finger on the board stops a glide straight where it is
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
  const wasDrag = dragged; down = null; if (wasPinch || wasDrag) { woodTap = null; if (fingers.size === 0) straightTipOnce(e.pointerType === 'mouse'); return; }
  if (hurry.depth > 0) { hurryNow(); return; } // a tap while a turn plays hurries it
  const tapAt = { t: performance.now(), x: e.clientX, y: e.clientY }; // two taps on the wood, quick and close: set the board straight
  if (pitUnder(e.clientX, e.clientY) === null) { if (isDoubleTap(woodTap, tapAt) && viewMay()) { woodTap = null; straighten(); return; } woodTap = tapAt; } else woodTap = null;
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
  if (mouse.words && i18n.src(el) === mouse.words) el.textContent = mouse.base; // put back what the line said before
  mouse.words = null; if (!w) return;
  mouse.base = i18n.src(el); mouse.words = w; el.textContent = w;
}
function paintHover() {
  if (!mouse.in || body.classList.contains('screen') || clipping) { if (mouse.pit !== null || mouse.words) { mouse.pit = null; hoverWords(null); } canvas.style.cursor = ''; mouse.ring = 0; return; }
  const pit = dragged && down ? null : pitUnder(mouse.x, mouse.y);
  const h = hoverAt({ state, pit, you, press: canPress(), hurry: hurry.depth > 0, busy, selected, dragging: !!(down && dragged) });
  canvas.style.cursor = h.cursor; mouse.ring = h.ring ? 1 : 0;
  if (h.ring) { const [x, z] = pitCenters[pit]; board.hover.position.x = x; board.hover.position.z = z; }
  const w = withLast(h.words, pit, lastM.pit); // over the pit they played last, the words say so
  if (pit !== mouse.pit || w !== mouse.words) { mouse.pit = pit; if (w !== mouse.words) hoverWords(w); }
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
canvas.addEventListener('wheel', (e) => { viewGlide++; dist += e.deltaY * 0.001; clampDist(); clearTimeout(wheelTimer); wheelTimer = setTimeout(() => straightTipOnce(true), 700); }, { passive: true });
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
  if (counting.words && i18n.src(el) === counting.words) el.textContent = counting.base;
  counting.words = null; if (!w) return;
  counting.base = i18n.src(el); counting.words = w; el.textContent = w;
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
  cv.set(x, BT + 0.02, z).project(camera); counting.el.style.transform = `translate(${(cv.x * 0.5 + 0.5) * view.w}px, ${(-cv.y * 0.5 + 0.5) * view.h}px)`;
}
// may a pit be pressed right now? (your move, the board showing, nothing in flight, a friend across the board if online)
function canPress() { return !(busy || state.over || state.turn !== you || body.classList.contains('screen') || (puzzle.on && puzzle.played) || (online && !friend)); }
// a press on a pit — a tap, a click, a digit, or Enter on its hidden button: first press picks it, the second sows it
function pressPit(pit) {
  if (!canPress()) return false;
  if (lesson.on && pit !== lesson.steps[lesson.k].pit) { shake(pit); $('#hint').textContent = LESSON_WRONG; return false; } // the lesson plays its own pit
  const legal = legalMoves(state);
  if (!legal.includes(pit)) { if (owner(pit) === you && state.pits[pit] > 0) { $('#hint').textContent = feedWords(narrowOf(state, you), { you }) || 'you must give the other side seeds'; shake(pit); } else shake(pit); return false; }
  if (selected === pit) sow(pit); else select(pit);
  return true;
}
function sow(pit) { if (lesson.on) lessonPlay(pit); else if (puzzle.on) puzzlePlay(pit); else if (online) sendMove(pit); else play(pit); }
// the keyboard (the Mac, or a Fold with one): 1–6 pick your pits near to far, Enter sows, U undoes, H hints, Esc puts the pit back or closes a card
addEventListener('keydown', (e) => {
  if (e.defaultPrevented || glw.phase === 'lost') return; // no move played blind while the board is away
  const t = e.target; const a = keyAction(e, { tag: t && t.tagName, editable: !!(t && t.isContentEditable), you });
  if (!a) return;
  if (a.type === 'deselect') { // Esc closes what is open, nearest first
    if (!callMenu.hidden) toggleCallMenu(false); else if (!shoutMenu.hidden) toggleShoutMenu(false); else if (!$('#rules').hidden) $('#rules').hidden = true; else if (selected !== null && !busy) deselect(); else return;
    return e.preventDefault();
  }
  if (a.type === 'sow' && hurry.depth > 0 && hurryNow()) return e.preventDefault(); // Space / Enter while a turn plays hurries it
  if (body.classList.contains('screen') || !$('#gameover').hidden || !$('#nameCard').hidden || !$('#knockCard').hidden || !$('#backCard').hidden || !$('#callCard').hidden) return; // keys play the board, not the screens or a card
  if (!keysUsed) { keysUsed = true; body.classList.add('keys'); showTurn(); } // from now on the hint line talks keys and your pits' badges show their key
  e.preventDefault();
  if (a.type === 'pit') { if (canPress()) pressPit(a.pit); else click(0.5, 0.04); }
  else if (a.type === 'sow') { if (selected !== null) pressPit(selected); else if (canPress()) $('#hint').textContent = hintText('pick', { keys: true }); }
  else if (a.type === 'undo') undo();
  else if (a.type === 'hint') hint();
  else if (a.type === 'straight') straighten();
});
function shake(pit) { const [x, z] = pitCenters[pit]; board.ring.position.x = x; board.ring.position.z = z; board.ring.visible = true; tween(260, (t) => { board.ring.position.x = x + Math.sin(t * Math.PI * 4) * 0.006 * (1 - t); }).then(() => { if (selected === null) board.ring.visible = false; else { board.ring.position.x = pitCenters[selected][0]; board.ring.position.z = pitCenters[selected][1]; } }); click(0.5, 0.05); }

$('#undo').addEventListener('click', undo);
$('#hintBtn').addEventListener('click', hint);
$('#rematch').addEventListener('click', () => { if (online) { if (net.rematch()) { $('#rematch').textContent = `Waiting for ${oppLabel()}…`; $('#rematch').disabled = true; click(1.3, 0.08); } return; } newRound(); showScreen('play'); });
$('#rulesBtn').addEventListener('click', () => { $('#rules').hidden = !$('#rules').hidden; });
$('#rulesClose').addEventListener('click', () => { $('#rules').hidden = true; });
const soundBtn = $('#soundBtn'); const paintSound = () => soundBtn.setAttribute('aria-pressed', soundOn());
soundBtn.addEventListener('click', () => { prefs.set('sound', soundOn() ? '0' : '1'); paintSound(); click(1, 0.08); musicCheck(); }); paintSound();

// ---------- watch the whole game (idea 6 Nov, afternoon; web/watch.js): a shared game's link carries its moves, and opening it
// plays every move of it on this board — the pit lit, every seed flying, the scores ticking, a tap on the board hurrying a long
// turn — with both players' names on the cards and "Move 12 of 40 · Meka plays" under the board; then who won, and Home.
// Nothing of this phone's own game is touched: the watched game is its own positions, and the board goes back after.
function paintWatch() {
  $('#turn').textContent = watch.done ? 'game over' : 'watching'; $('#oppSub').textContent = '';
  $('#hint').textContent = watch.text; $('#undo').disabled = true; $('#hintBtn').disabled = true;
}
async function watchGame(w) {
  watch.on = true; watch.stop = false; watch.done = false; watch.text = watchTitle(w); watch.i = 0; watch.n = w.moves.length; busy = true;
  hideExplain(); $('#gameover').hidden = true; showScreen('play'); deselect();
  const paintNames = () => { $('#meName').textContent = w.names[0]; $('#goMe span').textContent = w.names[0]; $('#oppName').textContent = w.names[1]; $('#oppFace').innerHTML = initialFace(w.names[1]); };
  let s = w.states[0]; layoutFromState(s); refreshStaticFrom(s); paintNames(); paintWatch(); toast(watch.text, 2600); buzz(10);
  await wait(1400);
  for (let i = 0; i < w.moves.length && !watch.stop; i++) {
    const m = w.moves[i]; watch.i = i + 1; watch.text = watchMove(w, i);
    select(m, false); await wait(420); deselect();
    const r = applyMove(s, m); await animate(r.events, s.stores, Math.round(PACE * 0.85)); s = r.state; refreshStaticFrom(s); paintNames();
    await wait(260);
  }
  if (!watch.stop) {
    watch.done = true; watch.text = watchEnd(w); paintWatch(); toast(watch.text, 3200);
    click(1.5, 0.12); setTimeout(() => click(2, 0.12), 120); buzz([15, 40, 15]);
    for (let t = 0; t < 32 && !watch.stop; t++) await wait(100); // a moment on the last position, unless Home is tapped
  }
  watch.on = false; watch.done = false; busy = false; hurry.on = false;
  layoutFromState(state); refreshStatic(); deselect(); showScreen('home');
}

// ---------- start ----------
const glBack = (() => { try { const v = sessionStorage.getItem('ayo.glback'); sessionStorage.removeItem('ayo.glback'); return v === '1'; } catch { return false; } })();
paintRules(); paintMyName(); layoutFromState(state); refreshStatic();
if (roomParam === 'new') openRooms(); // the old way in: the Rooms screen now
else if (roomParam) startOnline(roomParam); // an invite link: straight to the board, knocking
else if (glBack && savedGame()) { // the board comes back (web/glloss.js): "Bring the board back" reloaded the page — straight back into the game it was in
  resume(); hideExplain(); layoutFromState(state); refreshStatic(); showScreen('play'); kickAi();
} else if (params.get('still')) { // a render for Meka: a mid-game position with pit 4 selected (?still=late: near the end, both troughs full)
  if (params.get('still') === 'late') { state.pits = [0, 1, 0, 2, 1, 0, 0, 1, 1, 0, 1, 1]; state.stores = [18, 22]; }
  else { state.pits = [4, 3, 2, 6, 1, 5, 4, 2, 7, 0, 3, 0]; state.stores = [8, 5]; }
  layoutFromState(state); refreshStatic(); if (!CLOSE) select(3); showScreen('play');
} else if (params.get('watch')) { // a game sent as a link (web/watch.js): played back on the board, then Home
  const w = decodeGame(params.get('watch'), params.get('a'), params.get('b'));
  if (!params.get('capture')) history.replaceState(null, '', location.pathname);
  if (w) watchGame(w); else { showScreen('home'); toast('That game link could not be read', 2600); }
} else if (params.get('lesson') && !params.get('stay')) { // ?lesson=1: the lesson straight away, as a new phone (with ?stay=home: Home, as a new phone, so Play opens it)
  openLesson('play');
} else if (params.get('puzzle')) { // the shared link, and the render: straight to today's puzzle
  openPuzzle(); if (location.search && !params.get('capture')) history.replaceState(null, '', location.pathname);
} else if (params.get('capture') && !params.get('stay')) { // the smoke test starts straight into a game
  newRound(); showScreen('play'); if (tipStep === 0) { showTip(TIPS[0]); }
} else {
  showScreen('home'); if (tipStep === 0) $('#playBtn').addEventListener('click', () => showTip(TIPS[0]), { once: true });
}

// ---------- waiting on you (web/waiting.js): after a long think on your move against the computer, the opponent says a line of
// their own and drums three times on the wood — three soft knocks, the seeds of their fullest pit shivering with each. Once a move,
// three times a game; never under a card or a screen, in another tab, while anything plays, or for two of us, a room, the puzzle or the lesson.
let waitSkew = 0, waitOpen = !params.get('capture'); const waiting = makeWaiting(() => Date.now() + waitSkew); // waitSkew: render.py jumps the clock instead of waiting 25 s
for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, () => waiting.stir(), true);
const waitCard = () => ['#gameover', '#nameCard', '#knockCard', '#backCard', '#callCard', '#rules'].some((id) => !$(id).hidden);
function waitCheck() {
  waiting.sync(state.moves.length, stats.started);
  const o = { computer: !online && !local && !puzzle.on && !lesson.on, yourMove: canPress() && !replaying && !clipping,
    blocked: waitCard() || document.hidden || !body.classList.contains('playing') || !!params.get('still') || !waitOpen }; // the render checks and store pictures keep quiet unless one asks
  if (!o.yourMove || o.blocked) { waiting.stir(); return false; } // the clock starts when your move is in front of you
  if (!waiting.due(o)) return false;
  waiting.spoke(); const text = line(level, 'waiting'); sayText(text, WAIT_MOOD[level] || 'calm', 3400);
  const f = $('#oppFace'); f.classList.remove('react'); void f.offsetWidth; f.classList.add('react'); // the face pops even when calm
  const pit = drumPit(state.pits, them);
  for (let k = 0; k < DRUMS; k++) setTimeout(() => click(0.72 + k * 0.03, 0.05), k * DRUM_GAP_MS); // fingers on the wood, beside the board
  buzz([8, 110, 8, 110, 8]);
  if (pit >= 0 && !reduceMotion) { const ms = homes[pit].filter((m) => !sim.has(m)).map((m) => [m, m.position.y]); waitDrum.shivers++;
    tween(DRUM_MS, (u) => { const h = shiverAt(u * DRUM_MS); ms.forEach(([m, y0], j) => { m.position.y = y0 + h * (1 - (j % 4) * 0.12); }); }).then(() => ms.forEach(([m, y0]) => { m.position.y = y0; })); }
  waitDrum.last = { text, pit, level }; return true;
}
const waitDrum = { shivers: 0, last: null };
setInterval(waitCheck, 1000);
window.__ayo = { get greet() { return { log: greeted.log.slice(), bubble: $('#bubble').hidden ? null : $('#bubble').textContent, mood }; }, get gl() { return { phase: glw.phase, losses: glw.losses, restores: glw.restores, line: glEl.hidden ? null : glEl.dataset.kind, title: glEl.hidden ? null : glEl.querySelector('b').textContent, button: glEl.hidden || glEl.querySelector('button').hidden ? null : glEl.querySelector('button').textContent, lostClass: document.documentElement.classList.contains('gllost'), canvasShown: getComputedStyle(canvas).visibility !== 'hidden', fresh: glFresh, log: glw.log.slice() }; }, get battery() { return { ...batt.s, level: batt.level, charging: batt.charging, plan: { ...batt.plan }, drawn: renderer.getPixelRatio(), skipped: batt.skipped, minGap: batt.minGap, log: batt.log.slice(), physics: PHYS.physics, note: $('#batteryNow').textContent }; }, get peek() { const m = peekIn.mesh; return { pit: peekIn.pit, n: peekIn.n, shown: peekIn.shown, lit: m.visible && m.material.opacity > 0.15, op: m.material.opacity, at: [m.position.x, m.position.z], words: $('#oppSub').textContent, sent: peekOut.last, log: peekIn.log.slice() }; }, get race() { return { mine: race.mine, theirs: race.theirs, my: $('#myLab').textContent, opp: $('#oppLab').textContent, myClose: $('#myLab').classList.contains('close'), oppClose: $('#oppLab').classList.contains('close'), log: race.log.slice() }; }, get lastMark() { const m = lastM.mesh; return { pit: lastM.pit, op: m.material.opacity, shown: m.visible && m.material.opacity > 0.1, at: m.visible ? [m.position.x, m.position.z] : null, label: lastM.pit >= 0 && pitBtns[lastM.pit] ? pitBtns[lastM.pit].getAttribute('aria-label') : null, hint: $('#hint').textContent }; }, get ponder() { const m = ponder.mesh; return { on: ponder.on, log: ponder.log.map((e) => ({ ...e, plan: e.plan.slice(), seen: e.seen.slice() })), lit: m.visible && m.material.opacity > 0.15, op: m.material.opacity, at: [m.position.x, m.position.z] }; }, get deal() { return { deals: deal.deals, flown: deal.flown, live: deal.live, inAir: deal.inAir, end: deal.end }; }, get waiting() { return { said: waiting.said, thisGame: waiting.thisGame, shivers: waitDrum.shivers, last: waitDrum.last }; }, waitSkip(ms) { waitOpen = true; waitSkew += ms; return waitCheck(); }, get win() { return { waves: win.waves, hops: win.hops, swept: win.swept, samples: win.samples, last: win.last, peak: win.peak, lamp: lamp && lamp.key ? lamp.key.intensity : null }; }, get fresh() { return { on: fresh.on, mine: fresh.mine, latest: fresh.latest, ready: fresh.ready, tried: fresh.tried, line: $('#freshLine').hidden ? null : $('#freshWords').textContent, checks: fresh.checks, reloads: fresh.reloads, log: fresh.log.slice() }; }, freshCheck: () => fresh.check(true).then(paintFresh), freshBack, get rest() { return { on: rest.on, drawn: rest.drawn, rested: rest.rested, resting: rest.resting }; }, get music() { musicCheck(); return { on: musicOn(), playing: !!(music && music.playing), bars: music ? music.bars : 0, scheduled: music ? music.scheduled : 0, pending: music ? music.pending : 0, ducked: music ? music.ducked : 1, unlocked: musicUnlocked, note: $('#musicNow').textContent, state: audio ? audio.ctx.state : null }; }, get frames() { const i = renderer.info; return { stats: fm.meter.stats(), verdict: fm.verdict, judged: fm.judged, said: fm.said || null, measured: prefs.get('quality.measured', null), last: parseFrames(prefs.get('frames.last', '')), note: $('#qualityNow').textContent, calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, texBytes: texBytes(), pixelRatio: PIXEL_RATIO, drawn: renderer.getPixelRatio(), lite: Q.lite }; }, framesReset: () => { fm.meter.reset(); fm.n = 0; }, get remind() { return { on: remindOn(), hour: remindHour(), supported: reminders.supported, permission: reminders.permission, log: reminders.log.slice(), pending: remindFake ? [...remindFake.pending.values()].map((n) => ({ id: n.id, title: n.title, body: n.body, at: n.schedule.at.toISOString(), extra: n.extra })) : null, asked: remindFake ? remindFake.asked.slice() : null, note: $('#remindNow').textContent, offer: $('#pzRemind').hidden ? null : $('#pzRemindWords').textContent }; }, remindTap: (id) => remindFake && remindFake.tap(id), remindSync: () => remindSync(), get telemetry() { return { on: teleOn(), recording: tele.recording, sent: teleSink ? teleSink.log.slice() : null, note: $('#teleNow').textContent }; }, get finish() { return board.finish; }, get store() { return { open: !$('#store').hidden, tryFinish: shop.tryFinish, trySeeds: shop.trySeeds, view: storeNow }; }, get review() { return { done: review.done, seen: review.seen, total: review.total, on: review.on, k: review.k, playing: review.playing, items: review.items.map((i) => ({ index: i.index, pit: i.pit, played: i.played, gap: i.take.gap, kind: i.take.kind })), card: revBtn.hidden ? null : $('#goRevWords').textContent, locked: revBtn.classList.contains('locked'), bar: revBar.hidden ? null : $('#revWords').textContent, hint: $('#hint').textContent }; }, openReview, reviewStep, endReview, get rating() { return { ...rating }; }, get lesson() { return { on: lesson.on, k: lesson.k, phase: lesson.phase, variant: lesson.variant, eyebrow: $('#pzDay').textContent, row: $('#lessonRow').textContent, pit: lesson.on && lesson.k < lesson.steps.length ? lesson.steps[lesson.k].pit : null, title: $('#pzAsk').textContent, top: $('#pzHow').textContent, card: $('#lsCard').hidden ? null : $('#lsWords').textContent, next: $('#lsNext').textContent, skip: $('#pzHome').textContent, kept: prefs.get('lesson', null), tutorial: prefs.get('tutorial', null) }; }, get retry() { return { offered: $('#goRetry').hidden ? null : $('#goRetry').textContent, at: $('#goRetry').hidden ? null : +$('#goRetry').dataset.at, on: playingOut() && isRetry(playout), n: isRetry(playout) ? playout.n : null, from: isRetry(playout) ? playout.from : null, last: isRetry(playout) ? playout.last : null, line: $('#goRecord').hidden ? null : $('#goRecLine').textContent }; }, startRetry, get nextUp() { return $('#goNext').hidden ? null : { text: $('#goNext').textContent, level: $('#goNext').dataset.level }; }, get wake() { wakeCheck(); return { held: wake.held, wanted: wake.wanted, supported: wake.supported, log: wake.log.slice() }; }, wakeIdle: (ms) => { wakeSkew += ms; }, get feed() { const n = narrowOf(state, you); return { narrow: n, rings: board.may.map((m, i) => m.visible && m.material.opacity > 0.2 ? i : -1).filter((i) => i >= 0), barred: badges.map((b, i) => b.classList.contains('barred') ? i : -1).filter((i) => i >= 0), hint: $('#hint').textContent, selected }; }, get count() { return { pit: counting.pit, shown: !counting.el.hidden, text: counting.el.textContent, words: counting.words, hint: $('#hint').textContent, log: counting.log.slice(), done: counting.el.classList.contains('done') }; }, get hover() { return { cursor: canvas.style.cursor, ring: board.hover.visible && board.hover.material.opacity > 0.2, pit: mouse.pit, at: board.hover.visible ? [board.hover.position.x, board.hover.position.z] : null, sel: board.ring.visible ? [board.ring.position.x, board.ring.position.z] : null, op: board.hover.material.opacity }; }, get away() { return { count: away.count, words: away.words, title: document.title, icon: (document.querySelector('link[rel="icon"]') || {}).href || '' }; }, get handLog() { return hands.log.slice(); }, get hand() { return { sow: hands.sow.el.hidden ? null : hands.sow.el.textContent, haul: hands.haul.el.hidden ? null : hands.haul.el.textContent, at: hands.sow.el.hidden ? null : hands.sow.el.getBoundingClientRect().toJSON() }; }, get story() { return story ? { words: $('#goStoryWords').textContent, hidden: $('#goStory').hidden, biggest: story.biggest, forGood: story.forGood, final: story.final } : null; }, watchBigTurn, react, get busy() { return busy; }, get seeds() { return seeds.map((m) => [m.position.x, m.position.y, m.position.z, sim.has(m) ? 1 : 0]); }, get room() { return net ? { code: net.code, seat: net.seat, status: net.status, friend, knock: net.knock, knocks: (net.room && net.room.knocks) || [] } : null; }, pitAt: (i) => { v3.set(pitCenters[i][0], BT, pitCenters[i][1]).project(camera); return [(v3.x * 0.5 + 0.5) * canvas.clientWidth, (-v3.y * 0.5 + 0.5) * canvas.clientHeight]; }, get mood() { return mood; }, get quality() { return { ...quality, tier: Q, physics: PHYS.physics, physicsReason: PHYS.reason }; }, get streak() { return streak; }, get record() { return records; }, get level() { return level; }, get seat() { return you; }, get local() { return local; }, get theta() { return theta; }, get view() { return { theta, phi, dist, fit: viewFit(), off: isOff({ theta, phi, dist }, viewFit()) }; }, get side() { return side; }, get tweens() { return tweens.length; }, get seedSet() { return seedSetId(); }, get voice() { return { id: audio ? audio.voiceId : null, tasted: tasted.slice() }; }, get state() { return state; }, get legal() { return legalMoves(state); }, tryPit: (i) => puzzle.p ? attempt(puzzle.p, i).got : null, get playout() { return { on: playingOut(), from: playout ? playout.from : null, played: playout ? playedOut(playout, state) : 0, offered: !$('#pzOut').hidden, words: $('#pzOutWords').textContent }; }, get puzzle() { return puzzle.p ? { on: puzzle.on, played: puzzle.played, got: puzzle.got, key: puzzle.p.key, target: puzzle.p.target, answer: puzzle.p.answer, daily } : null; }, get selected() { return selected; }, get path() { return path; }, get explain() { return theirs ? { pit: theirs.pit, name: theirs.name, words: $('#lastWords').textContent, order: theirs.path.order, captures: theirs.path.captures, end: theirs.path.end, moves: theirs.before.moves.length } : null; }, get replaying() { return replaying; }, get circling() { return { on: !circEl.hidden, left: $('#circlingLeft').textContent, words: $('#circlingWords').textContent, ripples: circ.ripples, first: circ.first || null, isNew: circEl.classList.contains('new'), calling: circEl.classList.contains('calling'), eyebrow: $('#goEyebrow').textContent }; }, get last8() { return { on: !last8El.hidden, words: $('#last8Words').textContent, hops: last8.hops, lit: badges.filter((b) => b.classList.contains('last')).length, isNew: last8El.classList.contains('new') }; }, get hurry() { return { on: hurry.on, playing: hurry.depth > 0, words: hurry.words, hint: $('#hint').textContent }; }, hurryNow, replayLast, get take() { return take ? { pit: take.pit, played: take.played, kind: take.take.kind, gap: take.take.gap, words: $('#takeWords').textContent, order: take.path.order, captures: take.path.captures, end: take.path.end, moves: take.before.moves.length } : null; }, playTake, rate: (s) => aiRate(s || state, 'hard'), get slam() { return { n: slamSeen.n, words: slamSeen.words }; }, get marks() { const M = board.marks; return { steps: M.steps.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), caps: M.caps.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), gifts: M.gifts.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), slams: M.slams.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), risk: M.risk.map((m, i) => m.visible ? i : -1).filter((i) => i >= 0), end: M.end.visible }; }, get answer() { return answer; }, clip: () => recordClip(false), shout: (id) => sendShout(id), set callLite(v) { callLiteSet = v; }, get blocked() { return blocked.list.map((e) => e.name); }, get tag() { return myTag; }, get call() { const f = call.f, t = call.talk; const tracks = (st) => st ? st.getTracks().map((k) => k.kind + (k.enabled ? '' : ':off')).sort() : []; return { phase: f.phase, mine: f.mine, theirs: f.theirs, asker: f.asker, mic: f.mic, cam: f.cam, their: { ...f.their }, hideTheirs: f.hideTheirs, weak: f.weak, better: f.better, sending: t ? t.sendingVideo : null, lineLog: call.lineLog.slice(), weakChip: $('#callBtn').classList.contains('weak'), state: t ? t.state : null, mode: t ? t.mode : null, local: tracks(t && t.local), remote: tracks(call.remote), theirCam: !$('#theirCam').hidden, myCam: !$('#myCam').hidden, voiceRing: $('#oppFace').classList.contains('voice'), card: $('#callCard').hidden ? null : $('#callTitle').textContent, menu: callMenu.hidden ? null : [...callMenu.querySelectorAll('.pill')].map((b) => b.textContent), chip: $('#callBtn').getAttribute('aria-label'), log: call.log.slice(), playing: (() => { const v = $('#theirVideo'); return !!(v.srcObject && v.videoWidth > 0); })() }; }, hitTest: (x, y) => { ptr.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ptr, camera); return ray.intersectObjects(board.targets).map((h) => h.object.userData.pit); } };

// the render loop stops while the tab is hidden and restarts when it comes back; only ever one loop at a time
let frames = 0, last = performance.now(), running = false;
// rest the board when nothing moves (web/rest.js): the scene is handed to WebGL only when something in the picture changed (or once a second);
// a board waiting for your move costs no GPU work. ?rest=0 draws every frame as before (for comparing)
const rest = makeRest({ on: params.get('rest') !== '0' });
// the board comes back (web/glloss.js): when the phone takes the GPU away the canvas steps aside, a quiet line says the board is
// coming back, and when it does it is drawn at once; if it never does, "Bring the board back" saves and reloads the game
const glw = makeGlWatch(); let glFresh = 0; const glEl = document.createElement('div');
glEl.id = 'glLost'; glEl.setAttribute('role', 'status'); glEl.setAttribute('aria-live', 'polite'); glEl.hidden = true;
glEl.innerHTML = '<div class="seeds"><i></i><i></i><i></i></div><b></b><small></small><button type="button" hidden></button>';
document.body.appendChild(glEl);
glEl.querySelector('button').addEventListener('click', () => { glw.log.push({ t: 'reload' }); try { save(); sessionStorage.setItem('ayo.glback', '1'); } catch {} if (window.__glReload) window.__glReload(); else location.reload(); });
function glPaint(kind) {
  if (glEl.dataset.kind === (kind || '')) return; glEl.dataset.kind = kind || '';
  const w = glLineWords(kind); glEl.hidden = !w; glEl.classList.toggle('on', !!w); glEl.classList.toggle('stuck', kind === 'stuck'); if (!w) return;
  glEl.querySelector('b').textContent = w.title; glEl.querySelector('small').textContent = w.small;
  const btn = glEl.querySelector('button'); btn.hidden = !w.button; if (w.button) btn.textContent = w.button;
}
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (glw.lost(performance.now())) { document.documentElement.classList.add('gllost'); deselect(); } }); // three.js asks for it back too
canvas.addEventListener('webglcontextrestored', () => {
  const r = glw.restored(performance.now()); document.documentElement.classList.remove('gllost'); glPaint(null);
  glFresh = 3; rest.reset(); resize(); // drawn at once, three frames, whatever the rest check says
  if (r.said) toast(GL_WORDS.again);
});
// how smoothly this phone draws the board while something moves (web/frametime.js, Launch L16): kept for Settings and the testers,
// and on Auto a full board drawn slowly here brings in the lighter one from the next open (said once)
const fm = { meter: makeFrameMeter(), n: 0, judged: false, verdict: null };
const JUDGE_MIN = params.get('capture') && +params.get('judge') > 1 ? +params.get('judge') : MIN_FRAMES; // ?judge=N: the frame check's shorter wait
function frameMeter(gap, work, moving) {
  if (!moving || clipping || document.hidden || batt.plan.on) return; // a saving board draws half as often on purpose: never judged slow for it
  fm.meter.add(gap, work); if (++fm.n % Math.min(120, JUDGE_MIN)) return;
  const st = fm.meter.stats(); const rec = lastGameRecord(st, Q.lite); if (rec) prefs.set('frames.last', JSON.stringify(rec));
  fm.verdict = slowVerdict(st, { min: JUDGE_MIN });
  if (!fm.judged && fm.verdict === 'slow' && mayJudge({ pref: prefs.get('quality', 'auto'), lite: Q.lite, param: params.get('lite'), scripted: !!(params.get('capture') || params.get('still')) && !params.get('judge'), measured: prefs.get('quality.measured', null) })) {
    fm.judged = true; prefs.set('quality.measured', 'slow'); fm.said = SLOW_TOAST; toast(SLOW_TOAST, 6000);
  }
}
function texBytes() { // the wood, cloth and seed pictures held for the GPU (with their mipmaps), for the frame check
  const seen = new Set(); let n = 0;
  scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'normalMap', 'roughnessMap', 'bumpMap', 'aoMap', 'metalnessMap', 'emissiveMap', 'alphaMap']) { const t = m[k]; if (t && !seen.has(t) && t.image) { seen.add(t); n += (t.image.width || 0) * (t.image.height || 0) * 4 * (t.generateMipmaps === false ? 1 : 4 / 3); } } });
  return Math.round(n);
}
function loop(now) {
  const t0 = performance.now(), gap = window.__frameGap || now - last, moving = tweens.length > 0 || sim.live.length > 0; // __frameGap: tools/frame-check.py --judge stands in a slow phone's frames
  const P = moving && window.__frameParts; let tp = performance.now(); const part = P ? (k) => { const t = performance.now(); P[k] = (P[k] || 0) + t - tp; P[k + '#max'] = Math.max(P[k + '#max'] || 0, t - tp); if (k !== 'render') P.cur = (P.cur || 0) + t - tp; tp = t; } : () => {}; // tools/frame-check.py: where a moving frame's work goes
  runTweens(now); part('tweens'); hoverStep(now, (now - last) / 1000); ponderStep(now, (now - last) / 1000); peekStep(now, (now - last) / 1000); lastStep(now); sim.step((now - last) / 1000, now); part('physics'); if (pathGlow && !reduceMotion) board.marks.end.material.opacity = 0.34 + 0.1 * Math.sin(now / 240); if (feed.on && !reduceMotion) for (const pit of feed.rings) { const m = board.may[pit]; if (m.visible && m.scale.x <= 1.001) m.material.opacity = 0.6 + 0.15 * Math.sin(now / 320); } if (riskGlow && !reduceMotion) for (const r of board.marks.risk) if (r.visible) r.material.opacity = 0.56 + 0.14 * Math.sin(now / 320); if (idle && !reduceMotion) theta += (now - last) * 0.00004; else if (cinematic && !reduceMotion) theta += (now - last) * 0.000025; /* the clip drifts slowly round the board */ last = now; placeCam(); placeBadges(); placeHands(); part('place'); if (glw.phase === 'lost') glPaint(glw.tick(now, document.hidden)); const fresh = glFresh > 0 && glw.phase === 'ok'; if (fresh) glFresh--; if ((clipping || frames < 3 || fresh || drawDue(now, batt.lastDrawn, batt.plan) || (batt.skipped++, false)) && rest.draw(scene, camera, view, now, frames < 3 || fresh || clipping || moving)) { renderer.render(scene, camera); rest.seen(scene, camera, view); if (batt.plan.on) batt.minGap = Math.min(batt.minGap, now - batt.lastDrawn); batt.lastDrawn = now; } part('render'); if (P) { P.frames = (P.frames || 0) + 1; (P.logic = P.logic || []).push(P.cur || 0); P.cur = 0; } frames++; frameMeter(gap, performance.now() - t0, moving);
  if (frames === 3) { window.__done = true; window.__ayoUp = true; if (params.get('still')) { running = false; return; } }
  if (window.__freeze || document.hidden) { running = false; return; }
  if (tableNear !== null && !busy && nearSeatAt(theta) !== tableNear && tableOn()) refreshStatic(); // across the table: the board dragged round, the cards follow their players
  requestAnimationFrame(loop);
}
function battSet() {
  const prev = batt.s, next = decideSaver({ level: batt.level, charging: batt.charging, pref: prefs.get('battery', 'auto'), param: params.get('battery'), was: prev.on });
  batt.s = next; const words = toastFor(prev, next, batt.charging);
  if (prev.on !== next.on) {
    batt.plan = saverPlan(next.on, window.devicePixelRatio || 1); batt.log.push({ on: next.on, reason: next.reason });
    renderer.setPixelRatio(drawRatio()); resize(); rest.reset();
    PHYS = decidePhysics({ pref: prefs.get('physics', 'auto'), lite: quality.lite, param: params.get('physics'), saver: next.on }); // the next seed
    if (words) toast(words);
  }
  const el = $('#batteryNow'); if (el) el.textContent = noteFor(next); const pe = $('#physicsNow'); if (pe) pe.textContent = `now ${PHYS.physics ? 'on' : 'off'} (${PHYS.reason})`;
}
watchBattery(window.__battery || navigator, (b) => { batt.level = b.level; batt.charging = b.charging; battSet(); });
function start() { if (running) return; running = true; last = performance.now(); rest.reset(); requestAnimationFrame(loop); } // back from a hidden tab: drawn afresh
document.addEventListener('visibilitychange', () => { if (!document.hidden && !window.__freeze && !params.get('still')) start(); });
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, musicUnlock, { capture: true, passive: true });
document.addEventListener('visibilitychange', musicCheck); setInterval(musicCheck, 300);
start();
// the reminder: planned afresh at start and whenever the app comes back (a new day), and a tap on it opens today's puzzle
reminders.onTap(() => { if (online || busy || lesson.on) return; $('#gameover').hidden = true; $('#rules').hidden = true; openPuzzle(); });
if (reminders.supported) { reminders.perm(false).then(() => remindSync()); document.addEventListener('visibilitychange', () => { if (!document.hidden) remindSync(); }); }
// ---------- inside the store apps: the phone's back button, share sheet, haptics and keep-awake (web/app.js; nothing on the web link) ----------
startApp(() => {
  const screen = !$('#store').hidden ? 'store' : !$('#settings').hidden ? 'settings' : !$('#rooms').hidden ? 'rooms' : !$('#puzzle').hidden ? 'puzzle' : !$('#home').hidden ? 'home' : 'play';
  const step = backStep({ rules: !$('#rules').hidden, shouts: !shoutMenu.hidden || !callMenu.hidden, door: !$('#knockCard').hidden || !$('#backCard').hidden, name: !$('#nameCard').hidden, gameover: !$('#gameover').hidden, screen, online, busy });
  if (step === 'shouts') { toggleShoutMenu(false); toggleCallMenu(false); } else if (step !== 'stay' && step !== 'minimize') $('#' + step).click();
  return step;
});
