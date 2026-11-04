// The store pictures (Launch L15, slice 2): every screenshot and the feature graphic made by tools/store-shots.py is there, at
// exactly the size its store asks for, a baseline-or-progressive JPEG in RGB (no alpha, which both stores refuse), under each
// store's file-size limit, in the listing's order, with the README saying where each goes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs/launch/store/shots');
const L = JSON.parse(readFileSync(join(ROOT, 'docs/launch/store/listing.json'), 'utf8'));
const NAMES = ['sow', 'path', 'lesson', 'friend', 'puzzle', 'rating', 'twoofus', 'store']; // tools/store-shots.py FLOWS
const FORMATS = { 'ios-6.9': [1320, 2868], 'ios-13': [2752, 2064], 'play-phone': [1080, 1920], 'play-tablet': [2560, 1600] };

// A JPEG's size and colour components, from its first frame header (SOF0–SOF15, not DHT/JPG/DAC).
export function jpegInfo(buf) {
  assert.ok(buf[0] === 0xff && buf[1] === 0xd8, 'not a JPEG');
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), components: buf[i + 9] };
    i += 2 + len;
  }
  throw new Error('no frame header');
}

test('the tool knows the same eight screenshots as the listing, in its order', () => {
  const src = readFileSync(join(ROOT, 'tools/store-shots.py'), 'utf8');
  const flows = [...src.matchAll(/\("(\w+)", \["--/g)].map((m) => m[1]);
  assert.deepEqual(flows, NAMES);
  assert.equal(L.screenshots.length, NAMES.length);
  for (const [fmt, [w, h]] of Object.entries(FORMATS)) assert.match(src, new RegExp(`"${fmt.replace('.', '\\.')}": \\(${w}, ${h},`));
});

test('every screenshot is there at its store\'s exact size, RGB, under the size limit', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.jpg') && f !== 'sheet.jpg');
  assert.equal(files.length, NAMES.length * Object.keys(FORMATS).length + 1, 'eight a format, and the feature graphic');
  for (const [fmt, [w, h]] of Object.entries(FORMATS)) NAMES.forEach((n, i) => {
    const f = `${fmt}-${String(i + 1).padStart(2, '0')}-${n}.jpg`, p = join(DIR, f);
    const info = jpegInfo(readFileSync(p));
    assert.deepEqual([info.width, info.height], [w, h], f);
    assert.equal(info.components, 3, `${f}: RGB, no alpha`);
    assert.ok(statSync(p).size < 8 * 1024 * 1024, `${f}: Play takes at most 8 MB a screenshot`);
    assert.ok(statSync(p).size > 60 * 1024, `${f}: too small to be a real render`);
    if (fmt.startsWith('play')) assert.ok(Math.max(w, h) <= 2 * Math.min(w, h) && Math.min(w, h) >= 1080 && Math.max(w, h) <= 3840, `${f}: Play's sides`);
  });
});

test('Google\'s feature graphic is 1024 × 500, RGB, under 15 MB', () => {
  const p = join(DIR, 'play-feature-1024x500.jpg'), info = jpegInfo(readFileSync(p));
  assert.deepEqual([info.width, info.height, info.components], [1024, 500, 3]);
  assert.ok(statSync(p).size < 15 * 1024 * 1024 && statSync(p).size > 30 * 1024);
  const scene = readFileSync(join(ROOT, 'tools/feature-scene.html'), 'utf8');
  assert.match(scene, /import\('\/web\/board\.js'\)/, 'the board is the game\'s own');
  assert.match(scene, /Ayo &amp; Nchò/);
});

test('the README says where each goes and lists the captions in order', () => {
  const md = readFileSync(join(DIR, 'README.md'), 'utf8');
  for (const w of ['iPhone 6.9', 'iPad 13', 'Phone screenshots', 'tablet screenshots', 'Feature graphic']) assert.ok(md.includes(w), w);
  let at = 0;
  for (const s of L.screenshots) { const k = md.indexOf(s.caption, at); assert.ok(k > at, s.caption); at = k; }
  assert.ok(statSync(join(DIR, 'sheet.jpg')).size > 0, 'the contact sheet');
});

test('render.py takes the store pictures\' pixel density without changing the layout', () => {
  const src = readFileSync(join(ROOT, 'tools/render.py'), 'utf8');
  assert.match(src, /RENDER_SCALE/);
  assert.match(src, /has_touch/);
});
