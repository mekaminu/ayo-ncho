import { test } from "node:test";
import assert from "node:assert/strict";
import { tine, udu, shake, barEvents, barsDue, makeMusic, musicWanted, musicNote, hz, SCALE, BASS, BELL, BAR, PULSE } from "../web/music.js";

const RATE = 48000;
function spectrum(x, ms, from, to, step) {
  const n = Math.min(x.length, Math.round(RATE * ms / 1000)), out = [];
  for (let f = from; f <= to; f += step) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { const v = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))), ph = 2 * Math.PI * f * i / RATE; re += v * Math.cos(ph); im -= v * Math.sin(ph); }
    out.push([f, Math.hypot(re, im)]);
  }
  return out;
}
const strongest = (sp) => sp.reduce((p, q) => (q[1] > p[1] ? q : p))[0];
const centroid = (sp) => { let a = 0, b = 0; for (const [f, m] of sp) { a += f * m * m; b += m * m; } return a / b; };
function dies(x) { const ms = RATE / 1000, env = []; for (let i = 0; i + ms <= x.length; i += ms) { let s = 0; for (let k = 0; k < ms; k++) s += x[i + k] ** 2; env.push(Math.sqrt(s / ms)); } const top = Math.max(...env), at = env.indexOf(top); const k = env.findIndex((e, i) => i > at && e < top / 100); return k < 0 ? env.length : k; }
const clean = (x) => { assert.ok(x.every(Number.isFinite)); assert.ok(Math.abs(x[0]) < 1e-9, "starts from silence"); assert.ok(Math.abs(x.reduce((p, v) => Math.max(p, Math.abs(v)), 0) - 0.9) < 1e-6, "peaks at 0.9"); assert.ok(Math.abs(x[x.length - 1]) < 1e-6, "ends in silence"); };

test("an ubo tine rings at its own note, long and clean, and the low ones ring longer", () => {
  for (const m of [SCALE[0], SCALE[3], SCALE[7], BASS[0]]) {
    const x = tine(RATE, hz(m)); clean(x);
    const f = strongest(spectrum(x, 200, hz(m) * 0.7, hz(m) * 1.4, 2)); assert.ok(Math.abs(f - hz(m)) / hz(m) < 0.02, `${m}: strongest ${f} vs ${hz(m)}`);
    const t = dies(x); assert.ok(t > 400 && t <= 3000, `${m}: rings ${t} ms`);
  }
  assert.ok(dies(tine(RATE, hz(BASS[0]))) > dies(tine(RATE, hz(SCALE[7]))), "a low tine rings longer than a high one");
  assert.notDeepEqual(tine(RATE, 440, 0).slice(0, 2000), tine(RATE, 440, 1).slice(0, 2000), "two takes differ");
});

test("the udu is a low bup that drops and dies within the beat; the shaker is a short high hiss", () => {
  for (let k = 0; k < 3; k++) {
    const x = udu(RATE, k); clean(x);
    const f = strongest(spectrum(x, 250, 50, 400, 2)); assert.ok(f >= 80 && f <= 170, `udu strongest ${f}`);
    assert.ok(dies(x) < 750, `udu dies in ${dies(x)} ms`);
  }
  for (let k = 0; k < 4; k++) {
    const x = shake(RATE, k); clean(x);
    assert.ok(centroid(spectrum(x, 100, 200, 16000, 100)) > 3500, "the shaker sits high");
    assert.ok(x.length / RATE <= 0.13);
  }
});

test("every bar keeps to the ubo's tines, the bell line and the beat, and is never busy", () => {
  for (const seed of [1, 7, 12345]) for (let n = 0; n < 200; n++) {
    const ev = barEvents(n, seed);
    assert.deepEqual(ev, barEvents(n, seed), "the same bar of the same tune is always the same");
    for (const e of ev) { assert.ok(e.at >= 0 && e.at < BAR && Number.isInteger(e.at), e); assert.ok(e.gain > 0 && e.gain <= 0.6, e); assert.ok(Math.abs(e.pan) <= 0.5); }
    const tines = ev.filter((e) => e.kind === "tine");
    for (const t of tines) assert.ok(SCALE.includes(t.note) || BASS.includes(t.note), `bar ${n}: ${t.note} is not a tine`);
    const melody = tines.filter((t) => SCALE.includes(t.note) && t.pan < 0);
    assert.ok(melody.length >= 1 && melody.length <= 5, `bar ${n}: ${melody.length} melody notes`);
    assert.equal(new Set(melody.map((m) => m.at)).size, melody.length, "one melody note at a time");
    for (let i = 1; i < melody.length; i++) assert.ok(Math.abs(SCALE.indexOf(melody[i].note) - SCALE.indexOf(melody[i - 1].note)) <= 2, "the melody walks, it never leaps");
    assert.deepEqual(ev.filter((e) => e.kind === "shake").map((e) => e.at), BELL, "the shaker plays the bell line");
    assert.ok(ev.some((e) => e.kind === "udu" && e.low && e.at === 0), "the deep udu on the beat");
    assert.ok(ev.some((e) => e.kind === "tine" && BASS.includes(e.note) && e.at === 0), "the bass on the beat");
    for (let i = 1; i < ev.length; i++) assert.ok(ev[i].at >= ev[i - 1].at, "in time order");
  }
});

test("the tune is a phrase played twice with its end changed, a breath every 16 bars, and a new phrase every 32", () => {
  const mel = (n, s = 3) => barEvents(n, s).filter((e) => e.kind === "tine" && e.pan < 0).map((e) => [e.at, e.note]);
  for (let b = 0; b < 3; b++) assert.deepEqual(mel(b), mel(b + 4), `bar ${b} comes back as bar ${b + 4}`);
  assert.notDeepEqual(mel(3), mel(7), "the second time round ends differently");
  assert.equal(mel(15).length, 1, "bar 16 breathes"); assert.equal(mel(31).length, 1);
  let differ = 0; for (let b = 0; b < 8; b++) if (JSON.stringify(mel(b)) !== JSON.stringify(mel(b + 32))) differ++;
  assert.ok(differ >= 4, "after 32 bars a new phrase");
  const homes = [3, 7].map((b) => mel(b)[0][1]); for (const h of homes) assert.ok([62, 66, 69, 74].includes(h), "the phrase comes home to its chord");
});

test("bars are put on the clock once each, in order, however the ticks fall", () => {
  let next = 0, now = 0; const got = [];
  const t0 = 0.15;
  for (let k = 0; k < 400; k++) { now += Math.random() * 0.6; const due = barsDue(t0, next, now + 1.2); got.push(...due); if (due.length) next = due[due.length - 1] + 1; }
  got.forEach((b, i) => assert.equal(b, i)); assert.ok(t0 + got.length * BAR * PULSE >= now + 1.2);
});

// A stand-in for Web Audio, enough for makeMusic: a clock moved by hand and nodes that remember what was asked of them.
function fakeCtx() {
  const param = (v) => ({ value: v, events: [], cancelScheduledValues() {}, setValueAtTime(x) { this.value = x; }, linearRampToValueAtTime(x, t) { this.events.push([x, t]); this.value = x; } });
  const node = (extra = {}) => ({ connect() {}, ...extra });
  const a = { sampleRate: 22050, currentTime: 0, destination: node(), started: [], stopped: [] };
  a.createBuffer = (ch, n, rate) => { const d = Array.from({ length: ch }, () => new Float32Array(n)); return { duration: n / rate, getChannelData: (i) => d[i] }; };
  a.createGain = () => node({ gain: param(1) });
  a.createStereoPanner = () => node({ pan: param(0) });
  a.createConvolver = () => node({ buffer: null });
  a.createBufferSource = () => { const s = node({ buffer: null, playbackRate: param(1), start(t) { s.t = t; a.started.push(s); }, stop(t) { s.stopAt = t; a.stopped.push(s); } }); return s; };
  return a;
}

test("makeMusic fades in, keeps bars ahead of the clock, ducks under the board, and stops with nothing left on the clock", () => {
  const a = fakeCtx(); let tick = null, cleared = 0; const timer = { set: (f) => { tick = f; return 1; }, clear: () => { cleared++; } };
  const m = makeMusic(a, { seed: 9, timer, level: 0.2 });
  assert.equal(m.playing, false); assert.equal(a.started.length, 0, "nothing until start");
  m.start(); assert.ok(m.playing && m.bars === 1, "the first bar is on the clock at once");
  const first = a.started.length; assert.equal(first, barEvents(0, 9).length);
  assert.ok(a.started.every((s) => s.t >= 0.15 - 0.01 && s.t < 0.15 + BAR * PULSE), "bar 0's notes in bar 0");
  m.start(); assert.equal(a.started.length, first, "starting twice changes nothing");
  for (let k = 0; k < 60; k++) { a.currentTime += 0.25; tick(); }
  assert.ok(m.bars >= Math.floor(15 / (BAR * PULSE)), "bars keep coming"); assert.ok(m.bars <= Math.ceil((15 + 1.2) / (BAR * PULSE)) + 1, "but never far ahead");
  assert.ok(a.started.every((s) => s.t >= 0), "never in the past");
  m.duck(0.5); assert.equal(m.ducked, 0.5); m.duck(2); assert.equal(m.ducked, 1);
  const before = a.started.length; m.stop(); assert.equal(m.playing, false); assert.equal(cleared, 1);
  assert.equal(m.pending, 0, "nothing left to come");
  assert.ok(a.stopped.length > 0 && a.stopped.every((s) => s.stopAt <= Math.max(s.t, a.currentTime + 1.05) + 1e-9), "future notes taken off the clock");
  tick(); assert.equal(a.started.length, before, "a late tick after stop plays nothing");
  m.start(); assert.ok(a.started.length > before, "and it can start again");
});

test("the tune plays only when it is wanted, and the line under the switch says why it is silent", () => {
  const base = { on: true, sound: true, hidden: false, clipping: false, call: false, unlocked: true };
  assert.equal(musicWanted(base), true);
  for (const k of ["on", "sound", "unlocked"]) assert.equal(musicWanted({ ...base, [k]: false }), false, k);
  for (const k of ["hidden", "clipping", "call"]) assert.equal(musicWanted({ ...base, [k]: true }), false, k);
  assert.equal(musicNote({ on: false, sound: false, call: false }), "");
  assert.match(musicNote({ on: true, sound: false, call: false }), /sound is off/);
  assert.match(musicNote({ on: true, sound: true, call: true }), /talk/);
  assert.equal(musicNote({ on: true, sound: true, call: false }), "");
});
