// Nothing cut off (idea 8 Nov): what tools/fit.py found and fixed, held here so a change to index.html cannot quietly undo it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const rules = (sel) => [...html.matchAll(new RegExp('(?:^|[}\\s>])' + sel.replace(/[.#]/g, '\\$&') + '\\{([^}]*)\\}', 'g'))].map((m) => m[1]);
const first = (sel) => rules(sel)[0] || '';
const px = (decl, prop) => { const m = decl.match(new RegExp('(?:^|;)' + prop + ':([0-9.]+)px')); return m ? +m[1] : 0; };

test('the hint line under the board can use the whole width, not half of it', () => {
  // left:50% with no width wraps a fixed box at half the screen: in French with Larger words it ran to seven lines over your pits
  const h = first('#hint'); assert.match(h, /left:50%/); assert.match(h, /width:max-content/); assert.match(h, /max-width:min\(92vw/);
});

test('the words under the board let a tap through to the pits; the chips you tap still take it', () => {
  assert.ok(rules('#words').some((r) => /^pointer-events:none$/.test(r.trim())), '#words passes taps through');
  assert.match(html, /#words>button,#words>\[role=group\],#words #review\{pointer-events:auto\}/);
  assert.match(html.match(/#last8,#circling\{[^}]*\}/)[0], /pointer-events:none/);
  assert.match(html.match(/#watchers\{[^}]*\}/)[0], /pointer-events:none/);
});

test('the small word buttons are at least 24 px to tap without moving anything', () => {
  for (const sel of ['.status', '.linkish']) {
    const d = first(sel); const pad = px(d, 'padding'); const m = d.match(/margin:-([0-9.]+)px/);
    assert.ok(pad >= 5, sel + ' padding'); assert.ok(m && +m[1] === pad, sel + ' takes back its padding so the line keeps its height');
  }
  // the smallest of them (12 px words, line ~15 px) + 2 × padding reaches 24
  assert.ok(15 + 2 * px(first('.status'), 'padding') >= 24);
});

test('the fit check is there and looks at every size the game is played at', () => {
  const tool = new URL('../tools/fit.py', import.meta.url); assert.ok(existsSync(tool));
  const src = readFileSync(tool, 'utf8');
  for (const s of ['390, 844', '820, 1000', '844, 390', '1024, 700', '1440, 900']) assert.ok(src.includes(s), s);
  for (const k of ['off the edge', 'cut off', 'covered', 'too small', 'pit under words']) assert.ok(src.includes(k), k);
});
