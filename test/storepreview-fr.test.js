// The store's preview video in French (idea 5 Nov, from L18): tools/store-preview.py --lang=fr records the same game and the
// same moves as the English with the game in French (?lang=fr), under listing-fr.json's five captions, into
// docs/launch/store/preview-fr/ — each video what App Store Connect takes for an app preview, as the English, with a poster
// and a README saying where each goes in the French localisation and translation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mp4Info } from '../tools/mp4info.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs/launch/store/preview-fr'), EN = join(ROOT, 'docs/launch/store/preview');
const F = JSON.parse(readFileSync(join(ROOT, 'docs/launch/store/listing-fr.json'), 'utf8'));
const E = JSON.parse(readFileSync(join(ROOT, 'docs/launch/store/listing.json'), 'utf8'));
const VIDEOS = { 'ios-6.9-preview.mp4': [886, 1920], 'ios-13-preview.mp4': [1600, 1200], 'play-youtube.mp4': [1920, 1080] };

test('the tool takes a language: the game in French, the French captions, its own folders', () => {
  const src = readFileSync(join(ROOT, 'tools/store-preview.py'), 'utf8');
  assert.match(src, /--lang=/);
  assert.match(src, /listing-fr\.json/);
  assert.match(src, /lang=\{LANG\}/, 'the page opens in the language');
  assert.match(src, /documentElement\.lang"\) == LANG/, 'and checks it is in it');
  assert.match(src, /"preview" \+ sfx/); assert.match(src, /"src" \+ sfx/);
  const ignore = readFileSync(join(ROOT, '.gitignore'), 'utf8');
  assert.match(ignore, /docs\/launch\/store\/src-fr\//, 'the frames stay out of git');
});

test('the French captions: five, line for line the English, short, no claims, ending on the name', () => {
  const caps = F.preview.captions;
  assert.equal(caps.length, E.preview.captions.length);
  for (const c of caps) {
    assert.ok(c.length <= 30, c);
    assert.doesNotMatch(c, /£|\$|€|gratuit|meilleur|n°\s?1|numéro un|Android|iPhone|iOS|Google|Apple/i, c);
    assert.doesNotMatch(c, /\b(the|every|seed|your|hints?|who)\b/i, `no English left: ${c}`);
  }
  assert.equal(caps[4], 'Ayo & Nchò · Mancala nigérian', 'it ends on the French name');
});

test('every French video is there and is what App Store Connect takes for an app preview, as long as the English', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.mp4')).sort();
  assert.deepEqual(files, Object.keys(VIDEOS).sort());
  for (const [f, [w, h]] of Object.entries(VIDEOS)) {
    const buf = readFileSync(join(DIR, f)); const m = mp4Info(buf);
    assert.ok(statSync(join(DIR, f)).size < 60 * 1024 * 1024, `${f}: kept small for the repo`);
    assert.ok(m.faststart, `${f}: the index first, so it streams`);
    assert.ok(m.seconds >= 15 && m.seconds <= 30, `${f}: ${m.seconds} s`);
    const en = mp4Info(readFileSync(join(EN, f)));
    assert.ok(Math.abs(m.seconds - en.seconds) < 3, `${f}: the same game as the English (${m.seconds} s against ${en.seconds} s)`);
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

test('a poster for each, and the README says where each goes in French with the French captions', () => {
  const files = readdirSync(DIR);
  for (const f of Object.keys(VIDEOS)) assert.ok(files.includes(f.replace('.mp4', '-poster.jpg')), f);
  const md = readFileSync(join(DIR, 'README.md'), 'utf8');
  for (const f of Object.keys(VIDEOS)) assert.ok(md.includes(f), f);
  assert.match(md, /French localisation/); assert.match(md, /Manage translations → French/); assert.match(md, /YouTube/);
  for (const c of F.preview.captions) assert.ok(md.includes(c), c);
});
