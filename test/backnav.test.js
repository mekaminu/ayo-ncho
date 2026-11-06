// Back goes back (web/backnav.js): one history entry of the page's own while anything but Home is up, a back gesture
// takes the Back button's step, and Home's back leaves at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBackNav, webStep, wantsGuard, BACK_MARK, IGNORE_MS, ROOM_WORDS } from '../web/backnav.js';
import { backStep } from '../web/app.js';
import { FR } from '../web/i18n.js';

// A browser history in miniature: entries, an index, popstate sent to `onpop` (asynchronously in a browser; here at once).
function fakeHistory(start = null) {
  const h = { entries: [{ state: null, page: 'before' }, { state: start, page: 'game' }], i: 1, onpop: null, left: false,
    get state() { return h.entries[h.i].state; }, get length() { return h.entries.length; },
    pushState(state) { h.entries.splice(h.i + 1); h.entries.push({ state, page: 'game' }); h.i++; },
    back() { if (h.i === 0) return; h.i--; if (h.entries[h.i].page !== 'game') { h.left = true; return; } if (h.onpop) h.onpop(h.state); },
    forward() { if (h.i >= h.entries.length - 1) return; h.i++; if (h.onpop) h.onpop(h.state); },
  };
  return h;
}

test('the web step: minimize is leaving on Home and staying in a room', () => {
  assert.equal(webStep('minimize', { screen: 'home' }), 'leave');
  assert.equal(webStep('minimize', { screen: 'play', online: true }), 'room');
  for (const s of ['settingsBack', 'storeBack', 'roomsBack', 'pzHome', 'homeBtn', 'goHome', 'rulesClose', 'shouts', 'stay']) assert.equal(webStep(s, {}), s);
  assert.equal(wantsGuard('leave'), false); assert.equal(wantsGuard('settingsBack'), true); assert.equal(wantsGuard('room'), true);
  // every screen through the app's own backStep
  const ui = (o) => ({ rules: false, shouts: false, door: false, name: false, gameover: false, screen: 'play', online: false, busy: false, ...o });
  const at = (o) => { const u = ui(o); return webStep(backStep(u), u); };
  assert.equal(at({ screen: 'home' }), 'leave');
  assert.equal(at({ screen: 'settings' }), 'settingsBack');
  assert.equal(at({ screen: 'store' }), 'storeBack');
  assert.equal(at({ screen: 'rooms' }), 'roomsBack');
  assert.equal(at({ screen: 'puzzle' }), 'pzHome');
  assert.equal(at({}), 'homeBtn');
  assert.equal(at({ busy: true }), 'stay');
  assert.equal(at({ gameover: true }), 'goHome');
  assert.equal(at({ rules: true, screen: 'home' }), 'rulesClose');
  assert.equal(at({ online: true }), 'room');
  assert.equal(at({ online: true, door: true }), 'stay');
});

test('one entry while away from Home, given back on the way home, never two', () => {
  const h = fakeHistory(); const nav = makeBackNav(h);
  assert.equal(nav.sync('leave'), null); assert.equal(h.length, 2);
  assert.equal(nav.sync('settingsBack'), 'pushed'); assert.equal(h.length, 3); assert.ok(h.state[BACK_MARK]);
  for (const s of ['settingsBack', 'homeBtn', 'rulesClose', 'stay', 'room']) assert.equal(nav.sync(s), null);
  assert.equal(h.length, 3, 'never a second entry');
  // Home by its own button: the entry is given back, and that pop is not taken for a back gesture
  let got = null; h.onpop = (st) => { got = nav.pop(st); };
  assert.equal(nav.sync('leave'), 'gave'); assert.equal(got, 'ignored'); assert.equal(h.i, 1); assert.equal(h.left, false);
  // so Home's own back leaves straight away
  h.back(); assert.equal(h.left, true);
});

test('a back gesture is the Back button, then the entry comes again if still away from Home', () => {
  const h = fakeHistory(); const nav = makeBackNav(h); const said = [];
  let screen = 'settings-from-game';
  const stepOf = () => ({ 'settings-from-game': 'settingsBack', game: 'homeBtn', home: 'leave' })[screen];
  h.onpop = (st) => { const r = nav.pop(st); said.push(r); if (r !== 'back') return; const s = stepOf(); if (s === 'settingsBack') screen = 'game'; else if (s === 'homeBtn') screen = 'home'; nav.sync(stepOf()); };
  nav.sync(stepOf());
  h.back(); assert.equal(screen, 'game'); assert.ok(nav.guarded, 'still away from Home: the entry is back'); assert.equal(h.length - 1 - h.i, 0);
  h.back(); assert.equal(screen, 'home'); assert.equal(nav.guarded, false); assert.equal(h.left, false);
  h.back(); assert.equal(h.left, true, 'Home: the next back leaves');
  assert.deepEqual(said, ['back', 'back']);
});

test('a late pop after the ignore window counts as a back; a forward swipe onto the entry keeps it', () => {
  let t = 0; const h = fakeHistory(); const nav = makeBackNav(h, { now: () => t });
  nav.sync('homeBtn'); h.onpop = null; nav.sync('leave'); // the pop has not come yet
  t += IGNORE_MS + 1; assert.equal(nav.pop(null), 'back');
  const h2 = fakeHistory(); const n2 = makeBackNav(h2); n2.sync('homeBtn'); h2.onpop = (st) => n2.pop(st);
  n2.sync('leave'); assert.equal(n2.guarded, false);
  h2.forward(); assert.equal(n2.guarded, true, 'forward onto our entry'); assert.equal(n2.sync('leave'), 'gave');
});

test('a reload on our entry gives it back once Home is up', () => {
  const h = fakeHistory(); h.entries.push({ state: { [BACK_MARK]: 1 }, page: 'game' }); h.i = 2; // reloaded while on the entry
  const nav = makeBackNav(h); let got = null; h.onpop = (st) => { got = nav.pop(st); };
  assert.equal(nav.guarded, true); assert.equal(nav.sync('leave'), 'gave'); assert.equal(got, 'ignored'); assert.equal(h.i, 1); assert.equal(h.left, false);
});

test('a history that refuses does no harm', () => {
  const nav = makeBackNav({ state: null, pushState() { throw new Error('no'); }, back() { throw new Error('no'); } });
  assert.equal(nav.sync('homeBtn'), null); assert.equal(nav.guarded, false);
  const nav2 = makeBackNav(null); assert.equal(nav2.sync('homeBtn'), null);
});

test('the room words are in French', () => { assert.ok(FR[ROOM_WORDS]); });
