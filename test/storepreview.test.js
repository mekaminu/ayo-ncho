// The store's preview video (Launch L15, slice 3): the three videos made by tools/store-preview.py are there and are what
// App Store Connect takes for an app preview — 15 to 30 seconds, at most 30 fps, H.264 High at level 4.0 or lower, stereo AAC
// at 44.1 or 48 kHz with every track enabled, at the exact accepted size — read from the MP4's own boxes (no ffprobe needed);
// the move the video plays is one that shows the game off, and the captions are short, the listing's, and claim nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { newGame, applyMove, replay } from '../engine/ayo.js';
import { showsOff } from '../tools/previewpos.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs/launch/store/preview');
const L = JSON.parse(readFileSync(join(ROOT, 'docs/launch/store/listing.json'), 'utf8'));
const VIDEOS = { 'ios-6.9-preview.mp4': [886, 1920], 'ios-13-preview.mp4': [1600, 1200], 'play-youtube.mp4': [1920, 1080] };

export { mp4Info } from '../tools/mp4info.js';
import { mp4Info } from '../tools/mp4info.js';

test('the move the video plays shows the game off: relays, captures for you, nothing handed over', () => {
  const pos = JSON.parse(execFileSync('node', [join(ROOT, 'tools/previewpos.js'), '7']).toString());
  const s = replay(pos.moves, 'ncho');
  assert.equal(s.turn, 0, 'your move');
  const r = showsOff(s, pos.pit);
  assert.ok(r && r.relays >= 2 && r.takes >= 8, JSON.stringify(r));
  const { state } = applyMove(s, pos.pit); assert.equal(state.over, false);
  assert.equal(showsOff(newGame('ncho'), 0), null, 'an opening move is not that move');
});

test('the captions: five, short, from the listing, no prices or claims the stores refuse', () => {
  const caps = L.preview.captions;
  assert.equal(caps.length, 5);
  for (const c of caps) {
    assert.ok(c.length <= 30, c);
    assert.doesNotMatch(c, /£|\$|€|free|best|#1|number one|top|Android|iPhone|iOS|Google|Apple/i, c);
  }
  assert.equal(caps[4], 'Ayo & Nchò · Nigerian Mancala', 'it ends on the name');
  const tool = readFileSync(join(ROOT, 'tools/store-preview.py'), 'utf8');
  for (const k of [0, 1, 2, 3, 4]) assert.ok(tool.includes(`CAPS[${k}]`), `the tool shows caption ${k + 1}`);
});

test('every video is there and is what App Store Connect takes for an app preview', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.mp4')).sort();
  assert.deepEqual(files, Object.keys(VIDEOS).sort());
  for (const [f, [w, h]] of Object.entries(VIDEOS)) {
    const buf = readFileSync(join(DIR, f)); const m = mp4Info(buf);
    assert.ok(statSync(join(DIR, f)).size < 60 * 1024 * 1024, `${f}: kept small for the repo (Apple's limit is 500 MB)`);
    assert.ok(m.faststart, `${f}: the index first, so it streams`);
    assert.ok(m.seconds >= 15 && m.seconds <= 30, `${f}: ${m.seconds} s`);
    const v = m.tracks.find((t) => t.kind === 'vide'), a = m.tracks.find((t) => t.kind === 'soun');
    assert.ok(v && a, `${f}: a picture and a sound track`); assert.equal(m.tracks.length, 2);
    for (const t of m.tracks) assert.ok(t.enabled, `${f}: every track enabled`);
    assert.equal(v.codec, 'avc1'); assert.equal(v.profile, 100, `${f}: H.264 High`); assert.ok(v.level <= 40, `${f}: level ${v.level}`);
    assert.deepEqual([v.width, v.height, v.codedW, v.codedH], [w, h, w, h], `${f}: exactly ${w} × ${h}`);
    const fps = v.samples / (v.duration / v.scale); assert.ok(fps > 29.9 && fps <= 30.01, `${f}: ${fps} fps`);
    assert.equal(a.codec, 'mp4a'); assert.equal(a.channels, 2, `${f}: stereo`); assert.ok([44100, 48000].includes(a.rate), `${f}: ${a.rate} Hz`);
    assert.ok(Math.abs(a.duration / a.scale - v.duration / v.scale) < 0.25, `${f}: the sound runs the length of the picture`);
  }
});

test('a poster for each video and the README says where each goes', () => {
  const files = readdirSync(DIR);
  for (const f of Object.keys(VIDEOS)) assert.ok(files.includes(f.replace('.mp4', '-poster.jpg')), f);
  const md = readFileSync(join(DIR, 'README.md'), 'utf8');
  for (const f of Object.keys(VIDEOS)) assert.ok(md.includes(f), f);
  assert.match(md, /iPhone 6\.9/); assert.match(md, /iPad 13/); assert.match(md, /YouTube/);
  for (const c of L.preview.captions) assert.ok(md.includes(c), c);
});
