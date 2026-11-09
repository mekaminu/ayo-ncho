// Two tabs, one game (idea 9 Nov): the tab you come back to picks up the newest game; a tab out of sight never writes over it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tabWatch, mayWrite, followNow, followWords, GAME_KEY } from '../web/twotabs.js';

test('the watch knows when another tab has written the save since this one last looked', () => {
  const store = { v: '{"moves":[3]}' };
  const w = tabWatch(() => store.v);
  assert.equal(w.stale(), false);
  store.v = '{"moves":[3,8]}'; // the other tab played on
  assert.equal(w.stale(), true);
  w.mark(); assert.equal(w.stale(), false); assert.equal(w.mine, '{"moves":[3,8]}');
  w.mark('mine'); assert.equal(w.stale(), true); // what this tab wrote, if the write did not land
  store.v = null; w.mark(); assert.equal(w.stale(), false);
  const broken = tabWatch(() => { throw new Error('storage off'); }); // a phone with storage blocked: never stale, never throws
  assert.equal(broken.stale(), false);
  const undef = tabWatch(() => undefined); assert.equal(undef.mine, null); assert.equal(undef.stale(), false);
});

test('a tab out of sight never writes over a newer game; the tab in front, or a tab with nothing newer, writes', () => {
  assert.equal(mayWrite({ stale: true, hidden: true }), false);
  assert.equal(mayWrite({ stale: true, hidden: false }), true); // the move just played in front of you is the newest thing
  assert.equal(mayWrite({ stale: false, hidden: true }), true); // the computer's reply in a tab with no rival
  assert.equal(mayWrite({ stale: false, hidden: false }), true);
});

test('when to follow the other tab: now on Home or the board, later when something is under way, never in a friend\'s game', () => {
  const base = { stale: true, online: false, busy: false, deal: false, playout: false, review: false, lesson: false, puzzle: false, over: false, screen: 'play' };
  assert.equal(followNow(base), 'follow');
  assert.equal(followNow({ ...base, screen: 'home' }), 'follow');
  assert.equal(followNow({ ...base, stale: false }), 'none');
  assert.equal(followNow({ ...base, online: true }), 'none');
  for (const k of ['busy', 'deal', 'playout', 'review', 'lesson', 'puzzle', 'over']) assert.equal(followNow({ ...base, [k]: true }), 'wait', k);
  for (const screen of ['settings', 'store', 'rooms', 'other']) assert.equal(followNow({ ...base, screen }), 'wait', screen);
});

test('the word on the board, and none on Home', () => {
  assert.equal(followWords(true, 'play'), 'Picked up from your other tab');
  assert.equal(followWords(false, 'play'), 'That game ended in your other tab');
  assert.equal(followWords(true, 'home'), null);
  assert.equal(GAME_KEY, 'ayo.game');
});

test('the page: every write of the game checks the watch, and the tab follows on storage, view and focus', () => {
  const js = readFileSync(new URL('../web/game.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../web/sw.js', import.meta.url), 'utf8');
  const fr = readFileSync(new URL('../web/i18n.js', import.meta.url), 'utf8');
  assert.match(js, /from '\.\/twotabs\.js'/);
  const writes = js.match(/prefs\.set\('game',[^\n]*/g);
  assert.ok(writes.length >= 3);
  for (const w of writes) assert.match(w, /tabs\.mark\(/, 'every write of the game marks what this tab now holds: ' + w.slice(0, 80));
  assert.match(js, /function save\(\) \{[^\n]*tabMayWrite\(\{ stale: tabs\.stale\(\), hidden: document\.hidden \}\)/);
  assert.match(js, /function resume\(\) \{\n  tabs\.mark\(\);/);
  assert.match(js, /addEventListener\('storage', \(e\) => \{ if \(e\.key === TAB_GAME_KEY \|\| e\.key === null\) tabFollow\('storage'\)/);
  assert.match(js, /addEventListener\('visibilitychange', \(\) => \{ if \(document\.hidden\) return; tabFollow\('back'\); if \(tabs\.word\)/, 'a word held while out of sight is said when it is looked at');
  assert.match(js, /addEventListener\('focus', \(\) => tabFollow\('focus'\)\)/);
  assert.match(js, /keep\(tabs\.log,/, 'its log is bounded');
  assert.match(sw, /'\.\/twotabs\.js'/, 'carried offline');
  assert.match(fr, /'Picked up from your other tab':/); assert.match(fr, /'That game ended in your other tab':/);
});
