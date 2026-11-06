import { test } from "node:test";
import assert from "node:assert/strict";
import { knock, clack, room, TOK, VOICES, voiceOf, boardAudio } from "../web/sound.js";

const RATE = 48000;
// how strong each frequency is in the first `ms` of a sound (a plain DFT on a Hann window; enough for a test)
function spectrum(x, ms = 40, from = 100, to = 12000, step = 20) {
  const n = Math.min(x.length, Math.round(RATE * ms / 1000)), out = [];
  for (let f = from; f <= to; f += step) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { const v = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))), ph = 2 * Math.PI * f * i / RATE; re += v * Math.cos(ph); im -= v * Math.sin(ph); }
    out.push([f, Math.hypot(re, im)]);
  }
  return out;
}
const centroid = (sp) => { let a = 0, b = 0; for (const [f, m] of sp) { a += f * m * m; b += m * m; } return a / b; };
const strongest = (sp) => sp.reduce((p, q) => (q[1] > p[1] ? q : p))[0];
function dies(x) { // ms until the sound is 40 dB under its loudest millisecond
  const ms = RATE / 1000, env = []; for (let i = 0; i + ms <= x.length; i += ms) { let s = 0; for (let k = 0; k < ms; k++) s += x[i + k] ** 2; env.push(Math.sqrt(s / ms)); }
  const top = Math.max(...env), at = env.indexOf(top); return env.findIndex((e, i) => i > at && e < top / 100);
}

test("a seed landing makes a clean sound: it starts from silence, peaks at 0.9 and dies away to nothing", () => {
  for (const x of [knock(RATE, 0), knock(RATE, 3), clack(RATE, 0), clack(RATE, 2)]) {
    assert.ok(x.every(Number.isFinite));
    assert.ok(Math.abs(x[0]) < 1e-9, "it starts from silence");
    assert.ok(Math.abs(Math.max(...x.map(Math.abs)) - 0.9) < 1e-6);
    const tail = x.subarray(x.length - RATE * 0.005); assert.ok(Math.sqrt(tail.reduce((s, v) => s + v * v, 0) / tail.length) < 0.002, "nothing left at the end");
  }
});

test("a seed on the wood is the pit's tok: its strongest tone is the pit's note, and it dies within a tenth of a second or so", () => {
  for (let take = 0; take < 6; take++) {
    const x = knock(RATE, take), f = strongest(spectrum(x));
    assert.ok(Math.abs(f - TOK) / TOK < 0.06, `take ${take}: strongest tone ${f} Hz`);
    const t = dies(x); assert.ok(t > 30 && t < 150, `take ${take}: dies in ${t} ms`);
  }
});

test("a seed on a seed is a clack: brighter and shorter than a seed on the wood", () => {
  for (let take = 0; take < 4; take++) {
    const c = clack(RATE, take), k = knock(RATE, take);
    assert.ok(centroid(spectrum(c)) > 1.8 * centroid(spectrum(k)), `take ${take}: a clack is brighter`);
    assert.ok(dies(c) < dies(k), `take ${take}: a clack is shorter`);
  }
});

test("no two landings sound the same, but each take is the same every time", () => {
  const a = knock(RATE, 0), b = knock(RATE, 1);
  assert.ok(a.some((v, i) => Math.abs(v - b[i]) > 1e-3));
  assert.deepEqual(knock(RATE, 2), knock(RATE, 2));
  assert.deepEqual(clack(RATE, 1), clack(RATE, 1));
});

test("the room is two ears' worth of a short, dying echo", () => {
  const ears = room(RATE); assert.equal(ears.length, 2);
  const head = (x) => x.subarray(0, RATE * 0.05).reduce((s, v) => s + v * v, 0), tail = (x) => x.subarray(x.length - RATE * 0.05).reduce((s, v) => s + v * v, 0);
  for (const x of ears) assert.ok(tail(x) < head(x) * 1e-4);
  assert.ok(ears[0].some((v, i) => v !== ears[1][i]), "each ear hears it a little differently");
});

// ---- each seed set sounds like itself (idea 6 Nov) ----
const SETS = ["jobs", "cowries", "stones", "kernels"];
const mean = (f, voice, kind) => { let s = 0; for (let t = 0; t < 4; t++) s += f(kind === "clack" ? clack(RATE, t, voice) : knock(RATE, t, TOK, voice)); return s / 4; };
const low = (x) => { const a = spectrum(x, 60, 100, 400, 10).reduce((s, [, m]) => s + m * m, 0), b = spectrum(x, 60, 100, 12000, 40).reduce((s, [, m]) => s + m * m, 0); return a / b; };

test("every seed set has a voice, and Job's tears is the sound the board always had", () => {
  for (const id of SETS) assert.ok(VOICES[id], id);
  assert.equal(voiceOf("nonsense"), VOICES.jobs);
  assert.deepEqual(knock(RATE, 3), knock(RATE, 3, TOK, "jobs"));
  assert.deepEqual(clack(RATE, 1), clack(RATE, 1, "jobs"));
});

test("each seed set's landing is still a clean sound, on the pit's own note", () => {
  for (const id of SETS) for (let take = 0; take < 4; take++) {
    for (const x of [knock(RATE, take, TOK, id), clack(RATE, take, id)]) {
      assert.ok(x.every(Number.isFinite)); assert.ok(Math.abs(x[0]) < 1e-9);
      assert.ok(Math.abs(Math.max(...x.map(Math.abs)) - 0.9) < 1e-6);
      const tail = x.subarray(x.length - RATE * 0.005); assert.ok(Math.sqrt(tail.reduce((s, v) => s + v * v, 0) / tail.length) < 0.002, `${id}: nothing left at the end`);
    }
    const f = strongest(spectrum(knock(RATE, take, TOK, id))); assert.ok(Math.abs(f - TOK) / TOK < 0.06, `${id} take ${take}: the wood's note (${f} Hz)`);
    const c = clack(RATE, take, id), k = knock(RATE, take, TOK, id);
    assert.ok(centroid(spectrum(c)) > centroid(spectrum(k)), `${id}: a clack is still brighter than the wood`);
    assert.ok(dies(c) < dies(k), `${id}: a clack is still shorter`);
  }
});

test("cowries clink high and ring longest, palm kernels are the dullest and die quickest, river stones clack low and thud heaviest", () => {
  const bright = Object.fromEntries(SETS.map((id) => [id, mean((x) => centroid(spectrum(x)), id, "clack")]));
  assert.ok(bright.cowries > bright.jobs * 1.3, "cowries are brighter than Job's tears");
  assert.ok(bright.jobs > bright.stones && bright.stones > bright.kernels, `brightness: ${JSON.stringify(bright)}`);
  const ring = Object.fromEntries(SETS.map((id) => [id, mean(dies, id, "clack")]));
  assert.ok(ring.cowries > ring.jobs && ring.cowries > ring.stones, "a cowrie rings on longest");
  assert.ok(ring.kernels < ring.jobs && ring.kernels < ring.stones, "a palm kernel stops at once");
  const thud = Object.fromEntries(SETS.map((id) => [id, mean(low, id, "knock")]));
  assert.ok(thud.stones > thud.jobs * 1.5 && thud.stones > thud.kernels && thud.stones > thud.cowries, `the board's thud: ${JSON.stringify(thud)}`);
  assert.ok(mean((x) => centroid(spectrum(x)), "cowries", "knock") > mean((x) => centroid(spectrum(x)), "jobs", "knock"), "a cowrie on the wood is brighter too");
});

test("the board's audio changes voice with the seed set, making each set's sounds once", () => {
  let made = 0;
  const ctx = { sampleRate: 8000, currentTime: 0, destination: {},
    createBuffer(ch, n) { made++; const d = Array.from({ length: ch }, () => new Float32Array(n)); return { length: n, getChannelData: (i) => d[i] }; },
    createDynamicsCompressor: () => ({ threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} }),
    createGain: () => ({ gain: {}, connect() {} }), createConvolver: () => ({ connect() {} }) };
  const a = boardAudio(ctx); assert.equal(a.voiceId, "jobs");
  const first = made; assert.equal(a.voice("cowries"), "cowries"); assert.equal(a.voiceId, "cowries");
  const second = made; assert.ok(second > first, "the cowries' sounds are made");
  a.voice("jobs"); a.voice("cowries"); assert.equal(made, second, "and never made again");
  assert.equal(a.voice("plastic"), "jobs", "an unknown set sounds like Job's tears");
  assert.equal(boardAudio(ctx, "stones").voiceId, "stones");
});
