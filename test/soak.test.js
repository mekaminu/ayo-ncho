// A long evening (idea 8 Nov): the judge tools/soak.py hands its rounds to, and what the check covers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { judge, LIMITS, WARM } from '../tools/soak-judge.js';

const row = (round, o = {}) => ({ round, heapMB: 8, nodes: 2600, listeners: 280, geometries: 21, textures: 6, seeds: 48, tweens: 0, timers: 5, ...o });
const flat = (n, f = () => ({})) => Array.from({ length: n }, (_, i) => row(i, f(i)));

test('a page that gives back what each round took passes', () => {
  const v = judge(flat(10)); assert.equal(v.ok, true, v.grows.join('; '));
});

test('the first rounds may load things once: the warm-up is not a leak', () => {
  const v = judge(flat(10, (i) => i < WARM ? { geometries: 16, heapMB: 6, nodes: 2400, listeners: 260 } : {}));
  assert.equal(v.ok, true, v.grows.join('; '));
});

test('one geometry kept on the graphics card each round is a leak', () => {
  const v = judge(flat(10, (i) => ({ geometries: 21 + i })));
  assert.equal(v.ok, false); assert.match(v.grows.join(), /geometries/);
});

test('listeners piling up round after round are a leak; a wobble is not', () => {
  assert.equal(judge(flat(10, (i) => ({ listeners: 280 + 12 * i }))).ok, false);
  assert.equal(judge(flat(10, (i) => ({ listeners: 280 + (i % 2 ? 8 : 0) }))).ok, true);
});

test('the heap may wander by a megabyte or two, but not climb', () => {
  assert.equal(judge(flat(10, (i) => ({ heapMB: 8 + (i % 3) * 0.7 }))).ok, true);
  assert.equal(judge(flat(10, (i) => ({ heapMB: 8 + i * 0.9 }))).ok, false);
});

test('a jump that comes back down (the Game over card, then Home) is not a leak', () => {
  assert.equal(judge(flat(10, (i) => i === 5 ? { nodes: 3200, heapMB: 11 } : {})).ok, true);
});

test('too few rounds cannot pass', () => {
  assert.equal(judge(flat(4)).ok, false);
});

test('what the game makes on the graphics card must come back exactly', () => {
  for (const k of ['geometries', 'textures', 'seeds', 'tweens']) assert.equal(LIMITS[k], 0, k);
});

test('the soak check plays new games, a whole game to its end, and the screens around them', () => {
  const src = readFileSync(new URL('../tools/soak.py', import.meta.url), 'utf8');
  for (const k of ['#playBtn', '#undo', '#redoBtn', '#rulesBtn', '#homeSettings', '#homeStore', '#gameover', 'collectGarbage', 'getDOMCounters', 'soak-judge.js']) assert.ok(src.includes(k), k);
  assert.ok(existsSync(new URL('../docs/launch/soak.md', import.meta.url)), 'the report is kept');
});

test('the page keeps only the last few entries of its own records', async () => {
  const { keep, KEEP } = await import('../web/bounded.js');
  const a = []; for (let i = 0; i < 1000; i++) keep(a, i);
  assert.equal(a.length, KEEP); assert.equal(a[0], 1000 - KEEP); assert.equal(a.at(-1), 999);
  const b = []; for (let i = 0; i < 10; i++) keep(b, i, 3); assert.deepEqual(b, [7, 8, 9]);
});

test('no record of the page grows without end: every push into a log is kept short', () => {
  for (const f of ['game', 'wake', 'fresh', 'remind', 'glloss']) {
    const src = readFileSync(new URL(`../web/${f}.js`, import.meta.url), 'utf8');
    for (const line of src.split('\n')) {
      const m = line.match(/\b([A-Za-z_]*[lL]og)\.push\(/g); if (!m) continue;
      // a push with its own cap on the same line (hands, counting, the peek, the race, the said line, the ponder, the lean, their talk) is fine
      assert.ok(/\.length\s*[<>]/.test(line) || /__soundLog/.test(line), `${f}.js: an unbounded ${m[0]}… in: ${line.trim().slice(0, 120)}`);
    }
  }
});
