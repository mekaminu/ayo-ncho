import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tick, pause, resume, fresh, timeWords, GAP } from '../web/playtime.js';

const MIN = 60 * 1000;

test('the gaps between moves add up', () => {
  let s = fresh(0);
  s = tick(s, 20_000); s = tick(s, 45_000); s = tick(s, 90_000);
  assert.deepEqual(s, { played: 90_000, at: 90_000 });
});

test('a phone put down mid-game counts three minutes, not the call', () => {
  let s = fresh(0); s = tick(s, MIN); s = tick(s, MIN + 40 * MIN);
  assert.equal(s.played, MIN + GAP); assert.equal(GAP, 3 * MIN);
});

test('nothing counts while the page is hidden, and a game kept overnight says the time it was played', () => {
  let s = fresh(0); s = tick(s, 2 * MIN); s = tick(s, 4 * MIN); s = tick(s, 5 * MIN);
  s = pause(s, 5 * MIN + 30_000); assert.deepEqual(s, { played: 5 * MIN + 30_000, at: null });
  s = tick(s, 12 * 60 * MIN); assert.equal(s.played, 5 * MIN + 30_000, 'a stopped clock does not run');
  s = resume(s, 12 * 60 * MIN); s = tick(s, 12 * 60 * MIN + MIN);
  assert.equal(s.played, 6 * MIN + 30_000);
  assert.equal(timeWords(s.played), '6:30');
});

test('the end stops it for good: the card says the same however often it is opened', () => {
  let s = fresh(0); s = tick(s, 70_000); s = pause(s, 75_000);
  assert.equal(pause(s, 99 * MIN).played, 75_000);
  assert.deepEqual(resume(s, 99 * MIN, true), { played: 75_000, at: null }, 'shown again after the end: still stopped');
});

test('an old save (no clock) and odd numbers start from nothing', () => {
  assert.deepEqual(resume({ biggest: 3, started: 1 }, 500), { played: 0, at: 500 });
  assert.deepEqual(tick({ played: NaN, at: 'x' }, 9), { played: 0, at: null });
  assert.deepEqual(tick({ played: 10, at: 100 }, 50), { played: 10, at: 50 }, 'a clock set back adds nothing');
});

test('the words', () => {
  assert.equal(timeWords(0), '0:00'); assert.equal(timeWords(42_400), '0:42');
  assert.equal(timeWords(14 * MIN + 5000), '14:05'); assert.equal(timeWords(62 * MIN + 9000), '1:02:09');
  assert.equal(timeWords(undefined), '0:00');
});

test('the card reads this clock, never the wall since the start', () => {
  const g = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
  assert.ok(!/Date\.now\(\) - stats\.started/.test(g));
  assert.match(g, /timeWords\(stats\.played\)/);
  assert.equal((g.match(/teleStart\(state\); playTick\(\);/g) || []).length, 2, 'both ways a move reaches the board read the clock');
  assert.equal((g.match(/started: Date\.now\(\) \}/g) || []).length, 0, 'every new game starts its clock');
});
