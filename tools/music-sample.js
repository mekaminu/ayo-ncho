// Music (L17): a ~30 s listen of the tune without a browser — the same bars and sounds as web/music.js, mixed in node
// (no room reverb, which only the browser adds) into a 16-bit WAV: node tools/music-sample.js out.wav [seed] [bars]
import { writeFileSync } from 'node:fs';
import { tine, udu, shake, barEvents, hz, PULSE, BAR } from '../web/music.js';
const [out = 'music.wav', seed = '1', bars = '8'] = process.argv.slice(2);
const RATE = 44100, n = +bars, len = Math.ceil((n * BAR * PULSE + 3) * RATE), L = new Float32Array(len), R = new Float32Array(len);
const cache = new Map(); const get = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
let take = 0;
for (let b = 0; b < n; b++) for (const e of barEvents(b, +seed)) {
  const t = (b * BAR + e.at) * PULSE, at = Math.round(t * RATE); take++;
  let x, rate = 1;
  if (e.kind === 'tine') x = get('t' + e.note + (take % 2), () => tine(RATE, hz(e.note), take % 2));
  else if (e.kind === 'udu') { x = get('u' + (take % 3), () => udu(RATE, take % 3)); rate = e.low ? 1 : 1.5; }
  else x = get('s' + (take % 4), () => shake(RATE, take % 4));
  const gl = e.gain * Math.min(1, 1 - e.pan) * 0.7, gr = e.gain * Math.min(1, 1 + e.pan) * 0.7;
  for (let i = 0; i * rate < x.length - 1 && at + i < len; i++) { const v = x[Math.floor(i * rate)]; L[at + i] += v * gl; R[at + i] += v * gr; }
}
let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const k = 0.8 / peak, buf = Buffer.alloc(44 + len * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 4, 40);
for (let i = 0; i < len; i++) { buf.writeInt16LE(Math.round(L[i] * k * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * k * 32767), 46 + i * 4); }
writeFileSync(out, buf); console.log('wrote', out, (len / RATE).toFixed(1) + ' s', 'peak before levelling', peak.toFixed(2));
