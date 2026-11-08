// Keep the screen on: a phone left to itself dims and locks after 30 s or so — mid-think over a relay turn, or while a
// friend in a room takes their time — and the game goes dark (a locked phone also drops the room's line). At a real board
// nobody's board switches off. So while a game is in play on the board, the page holds a screen wake lock (the Screen Wake
// Lock API, where the browser has it) and lets go the moment it is not wanted: on Home, Settings or the Rooms screen, once
// the game is over, with Settings → Feel → Keep the screen on off, or when nobody has touched the phone for a while (3
// minutes against the computer or two of us; 10 in a room, where the friend's move counts as something happening), so a
// phone put down with a game open still sleeps. The browser releases the lock by itself when the page is hidden; it is
// asked for again when the page comes back.
// The decision is a pure function and the controller takes the page's navigator and a clock, so both are tested in node
// (test/wake.test.js).

import { keep } from './bounded.js';
export const IDLE_MS = { solo: 3 * 60 * 1000, room: 10 * 60 * 1000 };

// Should the screen be held on now? c: { on (the setting), board (a game is on the board: play or the puzzle),
// over (the game has ended), hidden (the page is out of sight), online (a room), idle (ms since anything happened) }
export function wantAwake(c = {}) {
  if (c.on === false || !c.board || c.over || c.hidden) return false;
  const limit = c.online ? IDLE_MS.room : IDLE_MS.solo;
  return !(c.idle >= limit);
}

export function supported(nav) { return !!(nav && nav.wakeLock && typeof nav.wakeLock.request === 'function'); }

// The setting's small words in Settings → Feel: said only when it cannot work here.
export function wakeNote(nav) { return supported(nav) ? '' : 'not on this browser'; }

// The controller: poke() when something happens (a tap, a key, a move played on the board), check(ctx) a few times a
// minute and whenever the screen or game changes; it asks for the lock or lets it go to match wantAwake. One request at a
// time; a refused request (battery saver, no permission) is not asked again until something changes.
export function makeWake({ nav, now = () => Date.now() } = {}) {
  let sentinel = null, pending = false, lastPoke = now(), refusedAt = -1, wanted = false;
  const log = [];
  const w = {
    get held() { return !!sentinel; },
    get wanted() { return wanted; },
    get supported() { return supported(nav); },
    log,
    poke() { lastPoke = now(); refusedAt = -1; },
    idle() { return now() - lastPoke; },
    check(ctx = {}) {
      wanted = wantAwake({ ...ctx, idle: now() - lastPoke });
      if (!supported(nav)) return wanted;
      if (wanted && !sentinel && !pending && refusedAt !== lastPoke) {
        pending = true; const asked = lastPoke;
        Promise.resolve().then(() => nav.wakeLock.request('screen')).then((s) => {
          pending = false;
          if (!wanted) { try { s.release(); } catch {} keep(log, 'drop'); return; } // let go while it was being given
          sentinel = s; keep(log, 'hold');
          if (s && typeof s.addEventListener === 'function') s.addEventListener('release', () => { if (sentinel === s) { sentinel = null; keep(log, 'lost'); } });
        }).catch(() => { pending = false; refusedAt = asked; keep(log, 'refused'); });
      } else if (!wanted && sentinel) {
        const s = sentinel; sentinel = null; keep(log, 'let go');
        try { const r = s.release(); if (r && r.catch) r.catch(() => {}); } catch {}
      }
      return wanted;
    },
  };
  return w;
}
