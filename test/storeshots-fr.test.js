// The French store pictures (idea 5 Nov, from L18): tools/store-shots.py --lang=fr makes the same eight screenshots and the
// feature graphic as the English, from the game turned French in place, framed under listing-fr.json's captions, into
// docs/launch/store/shots-fr/ at each store's exact size, RGB, under the limits, with a README saying where each goes in French.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs/launch/store/shots-fr'), EN = join(ROOT, 'docs/launch/store/shots');
const F = JSON.parse(readFileSync(join(ROOT, 'docs/launch/store/listing-fr.json'), 'utf8'));
const NAMES = ['sow', 'path', 'lesson', 'friend', 'puzzle', 'rating', 'twoofus', 'store'];
function jpegInfo(buf) { // as in storeshots.test.js: the first frame header's size and colour components
  assert.ok(buf[0] === 0xff && buf[1] === 0xd8, 'not a JPEG');
  for (let i = 2; i < buf.length;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), components: buf[i + 9] };
    i += 2 + len;
  }
  throw new Error('no frame header');
}
const FORMATS = { 'ios-6.9': [1320, 2868], 'ios-13': [2752, 2064], 'play-phone': [1080, 1920], 'play-tablet': [2560, 1600] };

test('the tool takes a language: French captions, French renders, its own folders', () => {
  const src = readFileSync(join(ROOT, 'tools/store-shots.py'), 'utf8');
  assert.match(src, /--lang=/);
  assert.match(src, /listing-fr\.json/);
  assert.match(src, /"RENDER_LANG": "fr"/);
  assert.match(src, /"shots" \+ sfx/);
  const r = readFileSync(join(ROOT, 'tools/render.py'), 'utf8');
  assert.match(r, /RENDER_LANG/);
  assert.match(r, /\[data-set=lang\] \[data-v=fr\]/, 'French the way a player does it: Settings → Language → Français');
  assert.match(r, /\[data-set=lang\] \[data-v=auto\]/, 'and back to Auto after the picture');
  assert.match(readFileSync(join(ROOT, '.gitignore'), 'utf8'), /^docs\/launch\/store\/src-fr\/$/m);
});

test('every French screenshot is there at its store\'s exact size, RGB, under the limit, and not the English picture', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.jpg') && f !== 'sheet.jpg');
  assert.equal(files.length, NAMES.length * Object.keys(FORMATS).length + 1, 'eight a format, and the feature graphic');
  for (const [fmt, [w, h]] of Object.entries(FORMATS)) NAMES.forEach((n, i) => {
    const f = `${fmt}-${String(i + 1).padStart(2, '0')}-${n}.jpg`, buf = readFileSync(join(DIR, f)), info = jpegInfo(buf);
    assert.deepEqual([info.width, info.height, info.components], [w, h, 3], f);
    assert.ok(buf.length < 8 * 1024 * 1024 && buf.length > 60 * 1024, f);
    assert.ok(!buf.equals(readFileSync(join(EN, f))), `${f} is the English picture`);
  });
  const feat = readFileSync(join(DIR, 'play-feature-1024x500.jpg'));
  assert.deepEqual(Object.values(jpegInfo(feat)).slice(0, 3), [500, 1024, 3]);
  assert.ok(!feat.equals(readFileSync(join(EN, 'play-feature-1024x500.jpg'))), 'the banner says its line in French');
  assert.match(readFileSync(join(ROOT, 'tools/feature-scene.html'), 'utf8'), /Mancala nigérian en 3D/);
});

test('the README says where each goes in the French listings, the French captions in order', () => {
  const md = readFileSync(join(DIR, 'README.md'), 'utf8');
  for (const w of ['French localisation', 'Manage translations', 'iPhone 6.9', 'iPad 13', 'Feature graphic']) assert.ok(md.includes(w), w);
  let at = 0;
  for (const s of F.screenshots) { const k = md.indexOf(s.caption, at); assert.ok(k > at, s.caption); at = k; }
  assert.ok(statSync(join(DIR, 'sheet.jpg')).size > 0, 'the contact sheet');
});
