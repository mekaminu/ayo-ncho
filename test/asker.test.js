// Never stuck on "thinking…" (8 Nov): every question to the opponent's worker gets an answer (web/asker.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeAsker } from '../web/asker.js';
import { newGame, legalMoves } from '../engine/ayo.js';
import { chooseMove } from '../engine/ai.js';

// a pretend clock and a pretend worker that answers as it is told
function clock() { let t = 0, n = 0; const q = new Map(); return { setTimeout: (f, ms) => { q.set(++n, { f, at: t + ms }); return n; }, clearTimeout: (k) => q.delete(k), tick(ms) { t += ms; for (const [k, e] of [...q]) if (e.at <= t) { q.delete(k); e.f(); } } }; }
function fakeWorker(how) { const w = { sent: [], terminated: false, postMessage(m) { w.sent.push(m); how(w, m); }, terminate() { w.terminated = true; } }; return w; }
const later = () => new Promise((r) => setImmediate(r));

test('answers go back to their own question, in any order', async () => {
  const made = []; const timers = clock();
  const a = makeAsker({ timers, local: () => 'here', make: () => { const w = fakeWorker(() => {}); made.push(w); return w; } });
  const p1 = a.ask({ q: 1 }), p2 = a.ask({ q: 2 }); const w = made[0];
  w.onmessage({ data: { id: w.sent[1].id, result: 'two' } }); w.onmessage({ data: { id: w.sent[0].id, result: 'one' } });
  assert.deepEqual(await Promise.all([p1, p2]), ['one', 'two']); assert.equal(made.length, 1); assert.equal(a.stats.local, 0); assert.equal(a.waiting, 0);
});

test('a search that throws in the worker is answered on the main thread', async () => {
  const timers = clock(); const a = makeAsker({ timers, local: (m) => 'local ' + m.q, make: () => fakeWorker((w, m) => queueMicrotask(() => w.onmessage({ data: { id: m.id, error: 'boom' } }))) });
  assert.equal(await a.ask({ q: 7 }), 'local 7'); assert.equal(a.stats.errors, 1); assert.equal(a.stats.restarts, 0);
});

test('a worker that never answers is replaced after its time and the question answered here, the next going to a fresh worker', async () => {
  const made = []; const timers = clock();
  const a = makeAsker({ timers, ms: 15000, local: () => 'here', make: () => { const w = fakeWorker(made.length ? (w, m) => queueMicrotask(() => w.onmessage({ data: { id: m.id, result: 'fresh' } })) : () => {}); made.push(w); return w; } });
  let got = null; a.ask({ q: 1 }).then((r) => { got = r; });
  timers.tick(14000); await later(); assert.equal(got, null, 'a slow search is still given its time');
  timers.tick(1000); await later(); assert.equal(got, 'here'); assert.equal(made[0].terminated, true); assert.equal(a.stats.last, 'too slow');
  assert.equal(await a.ask({ q: 2 }), 'fresh'); assert.equal(made.length, 2);
});

test('a worker that dies answers everything waiting at once', async () => {
  const made = []; const timers = clock(); const a = makeAsker({ timers, local: (m) => m.q, make: () => { const w = fakeWorker(() => {}); made.push(w); return w; } });
  const ps = [a.ask({ q: 1 }), a.ask({ q: 2 }), a.ask({ q: 3 })]; let prevented = false;
  made[0].onerror({ preventDefault: () => { prevented = true; } });
  assert.deepEqual(await Promise.all(ps), [1, 2, 3]); assert.equal(prevented, true); assert.equal(a.stats.restarts, 1); assert.equal(a.waiting, 0);
  made[0].onmessage({ data: { id: 1, result: 'late' } }); // a late answer from the old worker is ignored
  assert.equal(a.stats.answered, 3);
});

test('no worker at all (one that fails to start) still answers', async () => {
  const a = makeAsker({ timers: clock(), local: () => 'here', make: () => { throw new Error('no workers'); } });
  assert.equal(await a.ask({}), 'here'); assert.equal(a.stats.last, 'no worker');
});

test('if the main thread throws too, the fallback keeps the game going with a legal move', async () => {
  const s = newGame('ncho');
  const a = makeAsker({ timers: clock(), local: () => { throw new Error('bad'); }, fallback: (m) => legalMoves(m.state)[0] ?? null, make: () => fakeWorker((w, m) => queueMicrotask(() => w.onmessage({ data: { id: m.id, error: 'boom' } }))) });
  const m = await a.ask({ state: s }); assert.ok(legalMoves(s).includes(m));
});

test('the real engine answers here exactly as in the worker', async () => {
  const s = newGame('ncho'); const local = ({ state, level }) => chooseMove(state, level, () => 0.5);
  const a = makeAsker({ timers: clock(), local, make: () => fakeWorker((w, msg) => queueMicrotask(() => w.onmessage({ data: { id: msg.id, error: 'x' } }))) });
  assert.equal(await a.ask({ state: s, level: 'easy' }), chooseMove(s, 'easy', () => 0.5));
});

test('the page asks through it and the worker sends its errors back', () => {
  const g = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8'), w = readFileSync(new URL('../web/ai-worker.js', import.meta.url), 'utf8');
  assert.match(g, /const thinker = makeThinker\(\{ make: \(\) => new Worker\('\.\/ai-worker\.js'/);
  assert.doesNotMatch(g, /worker\.postMessage/, 'no question goes round it');
  assert.match(w, /catch \(err\) \{ self\.postMessage\(\{ id, error:/);
  assert.match(readFileSync(new URL('../web/sw.js', import.meta.url), 'utf8'), /'\.\/asker\.js'/);
});
