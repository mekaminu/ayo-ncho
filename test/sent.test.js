// The puzzle you were sent (idea 9 Nov): the daily puzzle's share link carries its game and its day.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { puzzleQuery, readSent, realDay, sentLine } from '../web/sent.js';
import { dailyPuzzle } from '../engine/puzzle.js';
import { dayLabel } from '../web/daily.js';
import { translate } from '../web/i18n.js';

test('the link names the game and the day of the puzzle shared', () => {
  const p = dailyPuzzle('2026-11-09', 'ayo');
  assert.equal(puzzleQuery(p), '?puzzle=ayo&d=2026-11-09');
  const q = new URLSearchParams(puzzleQuery(dailyPuzzle('2026-11-09', 'ncho')));
  assert.equal(q.get('puzzle'), 'ncho'); assert.equal(q.get('d'), '2026-11-09');
});

test('the link opens the puzzle that was shared: the same game gives the same position and target', () => {
  for (const v of ['ncho', 'ayo']) {
    const sent = dailyPuzzle('2026-11-09', v); const q = new URLSearchParams(puzzleQuery(sent));
    const r = readSent(q.get('puzzle'), q.get('d'), '2026-11-09'); assert.equal(r.variant, v); assert.equal(r.otherDay, null);
    const opened = dailyPuzzle('2026-11-09', r.variant);
    assert.deepEqual(opened.state.pits, sent.state.pits); assert.equal(opened.target, sent.target);
  }
  const a = dailyPuzzle('2026-11-09', 'ayo'), n = dailyPuzzle('2026-11-09', 'ncho');
  assert.ok(a.target !== n.target || a.state.pits.join() !== n.state.pits.join(), 'the two games really are different puzzles');
});

test('old and odd links open the phone’s own game, today', () => {
  assert.deepEqual(readSent('1', null, '2026-11-09'), { variant: null, otherDay: null }, 'the old ?puzzle=1');
  for (const bad of ['constructor', '__proto__', 'toString', 'AYO', '', null, undefined]) assert.equal(readSent(bad, null, '2026-11-09').variant, null);
  for (const bad of ['2026-02-30', '2026-13-01', '26-11-09', '2026-11-9', 'yesterday', '', null, '2026-11-09x']) {
    assert.equal(realDay(bad), null, String(bad)); assert.equal(readSent('ayo', bad, '2026-11-09').otherDay, null);
  }
  assert.equal(realDay('2028-02-29'), '2028-02-29', 'a leap day is a real day');
});

test('another day is said, never played: today’s puzzle opens with one line', () => {
  const lagos = readSent('ncho', '2026-11-10', '2026-11-09'); // sent after midnight in Lagos, opened before it in London
  assert.equal(lagos.otherDay, '2026-11-10');
  assert.equal(sentLine(lagos.otherDay, dayLabel), "Sent on Tue 10 Nov · this is today's puzzle");
  const late = readSent('ayo', '2026-11-08', '2026-11-09'); assert.equal(sentLine(late.otherDay, dayLabel), "Sent on Sun 8 Nov · this is today's puzzle");
  assert.equal(sentLine(null, dayLabel), null);
});

test('in French', () => {
  assert.equal(translate("Sent on Sun 8 Nov · this is today's puzzle", 'fr'), 'Envoyée le dim. 8 nov. · voici l’énigme du jour');
  assert.equal(translate("Sent on Sun 1 Nov · this is today's puzzle", 'fr'), 'Envoyée le dim. 1er nov. · voici l’énigme du jour');
});

test('the page is wired: the share sends the game and day, the link opens that game for the visit only', () => {
  const g = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
  assert.match(g, /publicBase\(\)\}\$\{puzzleQuery\(p\)\}/, 'the share link');
  assert.doesNotMatch(g, /\?puzzle=1`/, 'no plain ?puzzle=1 left in the share');
  assert.match(g, /readSent\(params\.get\('puzzle'\), params\.get\('d'\), todayKey\(\)\)/);
  assert.match(g, /const v = \(puzzle\.on && puzzle\.visit\) \|\| settings\.game/, 'the visit only while the puzzle is open');
  assert.match(g, /puzzle\.on = false; puzzle\.visit = null;/, 'Back to home forgets it');
  assert.match(g, /openPuzzle\(puzzle\.visit\)/, 'tomorrow’s puzzle at midnight keeps the sent game');
  assert.match(readFileSync(new URL('../web/sw.js', import.meta.url), 'utf8'), /'\.\/sent\.js'/, 'offline');
});
