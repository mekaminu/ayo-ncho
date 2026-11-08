// Never stuck on "thinking…" (8 Nov): one step that throws must not freeze the move or the frame loop (web/keepgoing.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runTweens, frameLoop } from '../web/keepgoing.js';

const tw = (step, ms = 100, t0 = 0) => { let done = false; const t = { t0, ms, step, ease: (x) => x, res: () => { done = true; } }; return { t, done: () => done }; };

test('tweens run to their end and resolve', () => {
  const seen = []; const a = tw((x) => seen.push(x)); const list = [a.t];
  runTweens(list, 50); assert.equal(list.length, 1); assert.equal(a.done(), false);
  runTweens(list, 150); assert.equal(list.length, 0); assert.equal(a.done(), true); assert.deepEqual(seen, [0.5, 1]);
});

test('a tween whose step throws is finished on the spot, and the others go on', () => {
  const errs = []; const bad = tw(() => { throw new Error('boom'); }); const good = tw(() => {}); const list = [good.t, bad.t];
  runTweens(list, 10, (e) => errs.push(e.message));
  assert.equal(bad.done(), true, 'the move waiting on it goes on'); assert.equal(good.done(), false); assert.deepEqual(list, [good.t]);
  assert.deepEqual(errs, ['boom']);
  runTweens(list, 200, (e) => errs.push(e.message)); assert.equal(good.done(), true); assert.equal(errs.length, 1);
});

test('a tween of no length (0/0) ends instead of lingering', () => {
  const a = tw(() => {}, 0, 5); const list = [a.t]; runTweens(list, 5); assert.equal(a.done(), true); assert.equal(list.length, 0);
});

test('a tween that starts another mid-step keeps both', () => {
  const list = []; const b = tw(() => {}); const a = tw((x) => { if (x >= 1) list.push(b.t); }); list.push(a.t);
  runTweens(list, 100); assert.equal(a.done(), true); assert.deepEqual(list, [b.t]);
});

test('the frame loop asks for the next frame even when a frame throws, and stops only when told', () => {
  const asked = []; let n = 0; const errs = [];
  const loop = frameLoop((now) => { n++; if (now === 2) throw new Error('frame'); if (now === 4) return false; }, (f) => asked.push(f), (e) => errs.push(e.message));
  loop(1); loop(2); loop(3); loop(4);
  assert.equal(n, 4); assert.equal(asked.length, 3, 'frames 1, 2 (which threw) and 3 ask again; 4 stops'); assert.deepEqual(errs, ['frame']);
});

test('the game runs its tweens, its physics and its frames through the guard', () => {
  const g = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
  assert.match(g, /stepTweens\(tweens, now\)/);
  assert.match(g, /const loop = frameLoop\(loopBody,/);
  assert.match(g, /try \{ sim\.step\([^}]*\} catch \(e\) \{ sim\.finish\(\); rethrow\(e\); \}/);
  const body = g.slice(g.indexOf('function loopBody('), g.indexOf('function start()'));
  assert.doesNotMatch(body, /requestAnimationFrame\(loop\)/, 'the loop asks for its frame in one place only');
  assert.doesNotMatch(body, /return;/, 'a stop returns false, so the guard knows not to ask again');
});

test('tools/nostuck.py breaks a game the three ways and wants it to go on', () => {
  const t = readFileSync(new URL('../tools/nostuck.py', import.meta.url), 'utf8');
  for (const m of ['"then"', '"frame"', '"hang"']) assert.ok(t.includes(m + ':'), m);
});
