// The board's sounds, made on the device (no audio files): what a seed and the wood actually do.
// A hard seed striking carved hardwood sets the wood ringing in a handful of its own inharmonic tones that die away
// within a few hundredths of a second, the high ones first, on top of the seed's own sharp little click; a seed
// striking another seed gives a brighter, shorter clack with only a whisper of the wood under them. Each sound here is
// built that way (modal synthesis: decaying resonances plus a short contact burst) and rendered once into samples.
// boardAudio() plays them: a landing sounds the moment the seed touches down, louder and brighter the harder it lands,
// from the side of the board it lands on; every pit has its own note (hand-carved, no two alike) and the troughs a
// deeper one; a small warm room around it all. (30 Oct: until now the knock was a falling synth tone played once the
// seed had already settled. Meka: "it should sound like a seed actually dropped in a wooden pit".)
// The samples are pure numbers (tested in node); boardAudio needs a Web Audio context.

function rng(n) { let s = (n >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Add a decaying resonance to `out`: amplitude a, frequency f (Hz), dying to 1/e in tau seconds (a two-pole ringing
// filter struck once: y[n] = 2r·cos(w)·y[n-1] − r²·y[n-2], which is a·rⁿ·sin(wn)).
function ring(out, rate, f, a, tau) {
  if (!(f > 0) || f >= rate * 0.45) return;
  const w = 2 * Math.PI * f / rate, r = Math.exp(-1 / (tau * rate)), c = 2 * r * Math.cos(w), r2 = r * r;
  const n = Math.min(out.length, Math.ceil(tau * rate * 9)); // until it is ~80 dB down
  let y2 = 0, y1 = a * r * Math.sin(w); if (n > 1) out[1] += y1;
  for (let i = 2; i < n; i++) { const y = c * y1 - r2 * y2; out[i] += y; y2 = y1; y1 = y; }
}
// The contact itself: a burst of noise a few tenths of a millisecond long, with its low end taken out.
function burst(out, rate, a, tau, hp, rand) {
  const n = Math.min(out.length, Math.ceil(tau * rate * 8)), k = Math.exp(-1 / (tau * rate)), al = 1 / (1 + 2 * Math.PI * hp / rate);
  let e = a, x1 = 0, y1 = 0;
  for (let i = 0; i < n; i++) { const x = (rand() * 2 - 1) * e, y = al * (y1 + x - x1); out[i] += y; x1 = x; y1 = y; e *= k; }
}
// A strike takes a moment (no hard edge at the very start), the tail fades to nothing, and the peak sits at 0.9
// (the player sets the loudness).
function finish(out, rate) {
  const on = Math.max(1, Math.round(rate * 0.00025)); for (let i = 0; i < on && i < out.length; i++) out[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / on);
  const off = Math.min(out.length, Math.round(rate * 0.006)); for (let i = 0; i < off; i++) out[out.length - 1 - i] *= i / off;
  let p = 0; for (const v of out) p = Math.max(p, Math.abs(v)); if (p > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.9 / p;
  return out;
}

export const TOK = 820; // the main note of a pit's "tok" (Hz); each pit and trough is tuned from it when played
const WOOD = 0.025; // how quickly carved hardwood stops ringing (its loss factor): each of its tones dies within ~13 cycles
const woodTau = (f) => 1 / (Math.PI * f * WOOD);
// A seed landing on the wood of a pit: the pit's tok (a cluster of the wood's own tones, the main one split in two as
// in real carved wood, the higher ones dying quicker; a low thud from the body of the board) and the seed's own click.
// `take` picks one of several (no two landings alike).
export function knock(rate, take = 0, f = TOK) {
  const r = rng(1009 + take * 7919), j = (x, s) => x * (1 + (r() * 2 - 1) * s), out = new Float32Array(Math.ceil(rate * 0.14));
  for (const [ratio, a] of [[0.27, 0.22], [1, 0.8], [1.035, 0.5], [1.52, 0.62], [2.17, 0.5], [2.83, 0.4], [3.71, 0.3], [4.66, 0.22]]) {
    const fm = j(f * ratio, ratio === 1 ? 0.02 : 0.05); ring(out, rate, fm, j(a, 0.2), j(ratio < 0.5 ? 0.018 : woodTau(fm), 0.15)); // the thud is damped by the table under the board
  }
  ring(out, rate, j(3900, 0.08), 0.35, j(0.004, 0.2)); // the seed itself, hard and a little hollow: a tiny bright ring
  ring(out, rate, j(5900, 0.08), 0.25, j(0.0028, 0.2));
  burst(out, rate, 1.3, j(0.00045, 0.2), 1500, r); // the moment of contact
  return finish(out, rate);
}
// A seed landing on another seed: the two seeds' own high, quick rings, the click of contact, the wood under them faintly.
export function clack(rate, take = 0) {
  const r = rng(2003 + take * 6151), j = (x, s) => x * (1 + (r() * 2 - 1) * s), out = new Float32Array(Math.ceil(rate * 0.07));
  ring(out, rate, j(2600, 0.08), 0.7, j(0.006, 0.2));
  ring(out, rate, j(3800, 0.08), 0.55, j(0.0045, 0.2));
  ring(out, rate, j(5300, 0.08), 0.38, j(0.0032, 0.2));
  ring(out, rate, j(7400, 0.08), 0.22, j(0.0022, 0.2));
  ring(out, rate, j(TOK, 0.05), 0.12, j(0.016, 0.2)); // the wood under them
  ring(out, rate, j(TOK * 1.62, 0.05), 0.07, j(0.011, 0.2));
  burst(out, rate, 1, j(0.0003, 0.2), 2400, r);
  return finish(out, rate);
}
// A small, warm room for the board: a few early reflections off the table and walls, then a soft tail that darkens
// as it dies (two ears, each a little different). Used quietly, so the knocks sound like they are somewhere.
export function room(rate, seed = 7) {
  const r = rng(seed), n = Math.ceil(rate * 0.4), ears = [new Float32Array(n), new Float32Array(n)];
  for (const ch of ears) {
    for (let k = 0; k < 5; k++) ch[Math.floor(rate * (0.004 + r() * 0.016))] += (r() < 0.5 ? -1 : 1) * (0.5 - k * 0.07);
    let lp = 0;
    for (let i = Math.floor(rate * 0.006); i < n; i++) { const t = i / rate, x = (r() * 2 - 1) * Math.exp(-t / 0.065), c = Math.min(0.92, 0.25 + t * 4); lp = lp * c + x * (1 - c); ch[i] += lp * 1.6; }
  }
  return ears;
}

// The board's sound, wired to a Web Audio context `a` (live, or offline for a recording).
export function boardAudio(a) {
  const rate = a.sampleRate, mono = (d) => { const b = a.createBuffer(1, d.length, rate); b.getChannelData(0).set(d); return b; };
  const bank = { knock: [0, 1, 2, 3, 4, 5].map((t) => mono(knock(rate, t))), clack: [0, 1, 2, 3].map((t) => mono(clack(rate, t))) };
  // everything goes through a gentle limiter (a capture drops a dozen seeds at once), with a little of the room
  const limit = a.createDynamicsCompressor(); limit.threshold.value = -8; limit.knee.value = 6; limit.ratio.value = 6; limit.attack.value = 0.001; limit.release.value = 0.12; limit.connect(a.destination);
  const bus = a.createGain(); bus.gain.value = 0.75; bus.connect(limit);
  const verb = a.createConvolver(), [L, R] = room(rate), ir = a.createBuffer(2, L.length, rate); ir.getChannelData(0).set(L); ir.getChannelData(1).set(R); verb.buffer = ir;
  const wet = a.createGain(); wet.gain.value = 0.16; bus.connect(verb); verb.connect(wet); wet.connect(limit);
  const last = {}; // never the same take twice running
  const pick = (kind) => { const list = bank[kind]; let i = Math.floor(Math.random() * list.length); if (i === last[kind]) i = (i + 1) % list.length; last[kind] = i; return list[i]; };
  function play(kind, gain, bright, speed = 1, pan = 0, when = 0) {
    const s = a.createBufferSource(); s.buffer = pick(kind); s.playbackRate.value = speed;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(rate * 0.45, bright); f.Q.value = 0.5; // a softer landing is a duller one
    const g = a.createGain(); g.gain.value = gain; s.connect(f); f.connect(g);
    if (pan && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(bus); } else g.connect(bus);
    s.start(a.currentTime + Math.max(0, when));
  }
  return {
    ctx: a,
    // a seed touching down: k how hard (0..1), on another seed or on the wood, pan −1 (left) … 1 (right),
    // tune the bowl's note (1 = TOK), when (s from now)
    land(k, onSeed, pan = 0, tune = 1, when = 0) {
      k = Math.max(0, Math.min(1, k)); const vary = 0.96 + Math.random() * 0.08;
      if (onSeed) { play('clack', 0.06 + 0.36 * k, 2600 + 9000 * k, vary, pan, when); play('knock', 0.03 + 0.1 * k, 1100 + 2400 * k, tune * vary, pan, when); }
      else play('knock', 0.05 + 0.5 * k, 1500 + 10000 * k * k, tune * vary, pan, when);
    },
    // a handful of seeds scooped up: quick small clacks as they jostle in the hand
    rattle(n, pan = 0, when = 0) { const m = Math.min(3 + n, 10); for (let i = 0; i < m; i++) play('clack', 0.02 + Math.random() * 0.06, 2500 + Math.random() * 6000, 0.9 + Math.random() * 0.25, pan, when + i * 0.014 + Math.random() * 0.02); },
    // a tap on the wood (the buttons, a knock at the door, the chimes): a knock at a pitch
    tap(pitch = 1, gain = 0.12, when = 0) { play('knock', gain * 1.4, 9000, pitch * (0.98 + Math.random() * 0.04), 0, when); },
  };
}
