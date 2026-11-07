// Music (Launch L17), off by default: a quiet tune at the board, made on the device like the wood sounds (no files,
// nothing to license). An ubo — the Igbo thumb piano, metal tines over a gourd — plays a slow pentatonic melody over a
// two-note bass, in the 12/8 lilt of the music it comes from; an udu (the clay pot drum) gives a soft low "bup" on the
// beat and a lighter one across it; a shaker keeps the bell line under them, barely there. The tune never repeats the
// same way for long: a phrase of four bars is played, played again with its last bar changed, and every 32 bars
// (about two minutes) a new phrase grows from a new seed; every 16th bar breathes (the melody rests).
// The samples and the bars are pure numbers (tested in node); makeMusic needs a Web Audio context (the board's own).
import { rng, ring, burst, finish, room } from './sound.js';

export const PULSE = 0.3; // seconds per eighth note: a dotted-quarter beat at about 67 a minute, a bar of 12 pulses = 3.6 s
export const BAR = 12;
export const BELL = [0, 2, 4, 5, 7, 9, 11]; // the 12/8 bell line of West African music, played here by the shaker
export const SCALE = [62, 64, 66, 69, 71, 74, 76, 78]; // the ubo's melody tines: D E F♯ A B D E F♯ (a major pentatonic)
export const BASS = [45, 47, 50, 52, 54, 57]; // its long low tines: A B D E F♯ A
const CHORDS = [[50, 57], [50, 57], [47, 54], [45, 52]]; // in two-bar steps: four bars on D, two on B, two on A (root and fifth), every 8 bars
export const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// the rhythms a melody bar can take (pulses where a tine is plucked), sparse to busy
const RHYTHMS = [[0, 5, 8], [0, 3, 7, 10], [2, 5, 9], [0, 4, 7], [0, 3, 5, 8, 10], [1, 4, 7, 9], [0, 6, 9]];

// ---------- the sounds ----------
// An ubo tine plucked: its own tone, ringing long (lower tines longer), the cantilever's high inharmonic partials (6.27×
// and 17.5× the tone, as a clamped metal tongue has) dying quickly, the box's octave warmth, the gourd's low hollow
// and the thumb's soft click.
export function tine(rate, f, take = 0) {
  const r = rng(4049 + take * 3203 + Math.round(f)), j = (x, s) => x * (1 + (r() * 2 - 1) * s);
  const tau = Math.min(1.4, Math.max(0.45, 0.9 * Math.sqrt(440 / f))), out = new Float32Array(Math.ceil(rate * Math.min(3, tau * 6.5)));
  ring(out, rate, f, 1, tau);
  ring(out, rate, f * 1.003, 0.25, tau * 0.8); // the tine and its bridge, a hair apart: a slow shimmer
  ring(out, rate, j(f * 2.01, 0.01), 0.1, tau * 0.35); // the box
  ring(out, rate, j(f * 6.27, 0.02), 0.16, 0.07); // the tongue's own overtones
  ring(out, rate, j(f * 17.5, 0.02), 0.05, 0.018);
  ring(out, rate, j(190, 0.05), 0.12, 0.05); // the gourd
  burst(out, rate, 0.35, j(0.0007, 0.2), 700, r); // the thumb
  return finish(out, rate);
}
// The udu struck on its side hole: a low tone that drops as the air in the pot settles, the clay's thud and a fingertip.
export function udu(rate, take = 0) {
  const r = rng(6143 + take * 977), j = (x, s) => x * (1 + (r() * 2 - 1) * s), out = new Float32Array(Math.ceil(rate * 0.75));
  const f0 = j(150, 0.04), f1 = j(96, 0.03), tau = j(0.19, 0.1);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate, f = f1 + (f0 - f1) * Math.exp(-t / 0.035); ph += 2 * Math.PI * f / rate;
    out[i] = Math.exp(-t / tau) * (Math.sin(ph) + 0.12 * Math.sin(2 * ph));
  }
  ring(out, rate, j(310, 0.05), 0.25, 0.02); // the clay
  burst(out, rate, 0.18, 0.0012, 300, r); // the fingertip
  return finish(out, rate);
}
// A shaker (seeds in a small gourd): a short hiss, rising and falling, all high.
export function shake(rate, take = 0) {
  const r = rng(8191 + take * 431), out = new Float32Array(Math.ceil(rate * 0.12));
  const hp = 1 / (1 + 2 * Math.PI * 3000 / rate), lp = 1 - Math.exp(-2 * Math.PI * 9000 / rate);
  let x1 = 0, y1 = 0, z = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate, e = Math.min(1, t / 0.009) * Math.exp(-Math.max(0, t - 0.009) / 0.022);
    const x = (r() * 2 - 1) * e, y = hp * (y1 + x - x1); x1 = x; y1 = y; z += lp * (y - z); out[i] = z;
  }
  return finish(out, rate);
}

// ---------- the tune ----------
// The melody of a phrase (4 bars) from its seed: a gentle walk on the scale, mostly steps, the last bar coming home to
// a tone of its chord on the first pulse and resting. `alt` changes the last bar (the second time round).
function phrase(seed, alt) {
  const r = rng(seed * 2654435761), bars = [];
  let d = 2 + Math.floor(r() * 3); // where the walk starts on the scale (F♯ to B)
  for (let b = 0; b < 4; b++) {
    const notes = [], last = b === 3;
    let rhythm = RHYTHMS[Math.floor(r() * RHYTHMS.length)];
    if (last) rhythm = alt ? [0, 5, 9] : [0, 7];
    rhythm.forEach((at, i) => {
      const step = r(); d += step < 0.35 ? -1 : step < 0.7 ? 1 : step < 0.82 ? -2 : step < 0.94 ? 2 : 0;
      d = Math.max(0, Math.min(SCALE.length - 1, d));
      if (last && i === 0) { // home: the last bar opens on a tone of its chord (the D, F♯ or A; the second time round the A or the D above)
        const home = (alt ? [69, 74] : [62, 66, 69, 74]).map((m) => SCALE.indexOf(m));
        d = home.reduce((p, q) => Math.abs(q - d) < Math.abs(p - d) ? q : p);
      }
      notes.push({ at, note: SCALE[d] });
    });
    bars.push(notes);
  }
  return bars;
}
// Everything played in bar n (from 0) of the tune grown from `seed`: [{at (pulse 0..11), kind: 'tine'|'udu'|'shake',
// note? (midi, tines), gain, pan, low? (udu: the deep one)}], in time order.
export function barEvents(n, seed = 1) {
  const section = Math.floor(n / 32), inSection = n % 32, eight = inSection % 8, half = eight >= 4;
  const r = rng((seed + section * 7919) * 31 + inSection), out = [];
  const tune = phrase(seed + section * 104729, half)[eight % 4];
  const breath = inSection % 16 === 15;
  if (!breath) for (const { at, note } of tune) out.push({ at, kind: 'tine', note, gain: 0.42 + r() * 0.12 - (at % 3 ? 0.06 : 0), pan: -0.18 });
  else out.push({ at: 0, kind: 'tine', note: tune[0].note, gain: 0.34, pan: -0.18 });
  const [root, fifth] = CHORDS[Math.floor(inSection / 2) % 4];
  out.push({ at: 0, kind: 'tine', note: root, gain: 0.5, pan: 0.05 });
  out.push({ at: 6, kind: 'tine', note: fifth, gain: 0.32, pan: 0.05 });
  if (eight % 2 === 1 && r() < 0.6) out.push({ at: 9, kind: 'tine', note: root, gain: 0.26, pan: 0.05 });
  out.push({ at: 0, kind: 'udu', low: true, gain: 0.55, pan: 0 });
  out.push({ at: 6, kind: 'udu', low: false, gain: 0.3, pan: 0.1 });
  if (r() < 0.45) out.push({ at: r() < 0.5 ? 9 : 10, kind: 'udu', low: false, gain: 0.18, pan: 0.1 });
  for (const at of BELL) out.push({ at, kind: 'shake', gain: (at === 0 ? 0.22 : 0.13) + r() * 0.04, pan: 0.3 });
  return out.sort((a, b) => a.at - b.at || (a.kind < b.kind ? -1 : 1));
}
// Which bars to put on the clock now: bars from `next` whose start (t0 + bar × length) is before `horizon`.
export function barsDue(t0, next, horizon, pulse = PULSE) {
  const len = BAR * pulse, out = []; for (let b = next; t0 + b * len < horizon; b++) out.push(b); return out;
}

// ---------- playing it ----------
// makeMusic(a, { seed, timer }): the tune on Web Audio context `a`, through its own quiet gain and a little of the room
// (straight to the speakers, beside the board's sounds, never through their limiter). start() fades it in over 4 s,
// stop() out over a second (nothing left on the clock after), duck(k) sets how far under the board's sounds it sits
// (1 = its own level; the game takes it lower while a turn plays). `timer` (setInterval-like) is passed in for tests.
export function makeMusic(a, { seed = 1 + Math.floor(Math.random() * 1e6), timer = { set: (f, ms) => setInterval(f, ms), clear: (id) => clearInterval(id) }, level = 0.2 } = {}) {
  const rate = a.sampleRate, mono = (d) => { const b = a.createBuffer(1, d.length, rate); b.getChannelData(0).set(d); return b; };
  const tines = new Map(); const tineBuf = (m) => { if (!tines.has(m)) tines.set(m, [0, 1].map((t) => mono(tine(rate, hz(m), t)))); return tines.get(m); };
  const bank = { udu: [0, 1, 2].map((t) => mono(udu(rate, t))), shake: [0, 1, 2, 3].map((t) => mono(shake(rate, t))) };
  const master = a.createGain(); master.gain.value = 0; master.connect(a.destination);
  const duckG = a.createGain(); duckG.gain.value = 1; duckG.connect(master);
  const dry = a.createGain(); dry.gain.value = 1; dry.connect(duckG);
  if (a.createConvolver) { const verb = a.createConvolver(), [L, R] = room(rate, 11), ir = a.createBuffer(2, L.length, rate); ir.getChannelData(0).set(L); ir.getChannelData(1).set(R); verb.buffer = ir; const wet = a.createGain(); wet.gain.value = 0.3; dry.connect(verb); verb.connect(wet); wet.connect(duckG); }
  const live = []; // sources on the clock, so stop() can take them off it
  const me = { playing: false, bars: 0, seed, scheduled: 0, ducked: 1, log: [] };
  let t0 = 0, next = 0, id = null, jit = rng(seed * 13 + 5);
  function play(e, when) {
    const s = a.createBufferSource();
    if (e.kind === 'tine') { const list = tineBuf(e.note); s.buffer = list[Math.floor(jit() * list.length)]; }
    else if (e.kind === 'udu') { const list = bank.udu; s.buffer = list[Math.floor(jit() * list.length)]; s.playbackRate.value = e.low ? 1 : 1.5; }
    else { const list = bank.shake; s.buffer = list[Math.floor(jit() * list.length)]; s.playbackRate.value = 0.94 + jit() * 0.12; }
    const g = a.createGain(); g.gain.value = e.gain; s.connect(g);
    if (e.pan && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = e.pan; g.connect(p); p.connect(dry); } else g.connect(dry);
    s.start(when); live.push({ s, when, end: when + s.buffer.duration / (s.playbackRate.value || 1) }); me.scheduled++;
  }
  function tick() {
    if (!me.playing) return;
    const now = a.currentTime; for (let i = live.length - 1; i >= 0; i--) if (live[i].end < now) live.splice(i, 1);
    for (const b of barsDue(t0, next, now + 1.2)) {
      const start = t0 + b * BAR * PULSE;
      for (const e of barEvents(b, seed)) { const when = start + e.at * PULSE + (e.at ? (jit() - 0.5) * 0.016 : 0); if (when >= now) play(e, when); }
      next = b + 1; me.bars = next; if (me.log.length < 64) me.log.push(b);
    }
  }
  const ramp = (p, v, secs) => { const now = a.currentTime; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(v, now + secs); };
  me.start = () => {
    if (me.playing) return me; me.playing = true;
    t0 = a.currentTime + 0.15; next = 0; ramp(master.gain, level, 4); tick(); id = timer.set(tick, 250); return me;
  };
  me.stop = () => {
    if (!me.playing) return me; me.playing = false; timer.clear(id); id = null;
    const now = a.currentTime; ramp(master.gain, 0, 1);
    for (const l of live) { try { l.s.stop(Math.max(l.when, now + 1.05)); } catch {} } live.length = 0; return me;
  };
  // the sound level (web/volume.js): the tune's own level, eased; heard at once if it is playing
  me.level = () => level;
  me.setLevel = (v) => { level = Math.max(0, +v || 0); if (me.playing) ramp(master.gain, level, 0.3); return level; };
  me.duck = (k) => { k = Math.max(0, Math.min(1, k)); if (Math.abs(k - me.ducked) < 0.01) return me; me.ducked = k; ramp(duckG.gain, k, 0.6); return me; };
  Object.defineProperty(me, 'pending', { get: () => live.filter((l) => l.when >= a.currentTime).length });
  return me;
}

// The line under the switch in Settings: what it is, and why it is silent when it is.
export function musicNote({ on, sound, call }) {
  if (on && !sound) return 'the sound is off (the speaker on the board)';
  if (on && call) return 'quiet while you talk';
  return '';
}
// Whether the tune should be playing now.
export function musicWanted({ on, sound, hidden, clipping, call, unlocked }) {
  return !!(on && sound && !hidden && !clipping && !call && unlocked);
}
