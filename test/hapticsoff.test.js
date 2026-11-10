// Haptics off means off (idea 10 Nov, morning): every buzz the board makes goes through game.js `buzz`, which reads
// Settings → Feel → Haptics and hands the store apps their own haptics. Setting the board straight (a double tap,
// or the key) once called navigator.vibrate directly, so it buzzed with Haptics off and gave the iPhone app nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../web/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'es-module-shims.js');

test('only buzz calls navigator.vibrate, and buzz reads the Haptics setting first', () => {
  const calls = [];
  for (const f of files) {
    readFileSync(new URL(f, dir), 'utf8').split('\n').forEach((line, i) => {
      if (/navigator\.vibrate\s*(\(|&&)/.test(line.replace(/\/\/.*$/, ''))) calls.push(`${f}:${i + 1}`);
    });
  }
  assert.equal(calls.length, 1, `navigator.vibrate outside buzz: ${calls.join(', ')}`);
  const src = readFileSync(new URL('game.js', dir), 'utf8');
  const line = src.split('\n')[Number(calls[0].split(':')[1]) - 1];
  assert.match(calls[0], /^game\.js:/);
  assert.match(line, /^const buzz = \(ms\) => \{ if \(prefs\.get\('haptics', '1'\) !== '1'\) return;/);
  assert.match(line, /haptic\(ms\)/, 'the apps get their own haptics first');
});

test('setting the board straight buzzes through buzz', () => {
  const src = readFileSync(new URL('game.js', dir), 'utf8');
  const body = src.slice(src.indexOf('function straighten()'), src.indexOf('function straighten()') + 900);
  assert.match(body, /buzz\(8\)/);
  assert.doesNotMatch(body, /navigator\.vibrate/);
});

test('the Haptics switch is in Settings and on by default', () => {
  const html = readFileSync(new URL('index.html', dir), 'utf8');
  assert.match(html, /data-set="haptics" aria-checked="true"/);
});
