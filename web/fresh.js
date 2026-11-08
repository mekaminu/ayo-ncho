// A newer game, without asking (idea 5 Nov): every push to main redeploys the web link, but a phone that keeps the game open
// (the installed web app, a tab left on the Fold) runs the build it opened with for days. Now the page knows its own build
// (the server writes it into index.html's <meta name="ayo-build">, a hash of web/ and engine/), asks GET /version now and then,
// and once a newer one is out it updates at a moment that loses nothing: coming back to the page after a minute or more away
// while Home is up (the game is saved after every move, so it comes back after the reload), quietly; or, while Home is in
// front of you, a brass line under the streak says so and a tap updates. Never on the board, in a room, on any other screen
// or in the store apps (they carry their own files, and the meta says "dev" there, as it does on a plain file server).
// A build the page has already reloaded for once is not offered again that visit (a stale cache can never make it loop).

import { keep } from './bounded.js';
export const FIRST_MS = 20 * 1000;          // the first look, a little after the page opens
export const EVERY_MS = 30 * 60 * 1000;     // then every half hour while the page is in view
export const GAP_MS = 5 * 60 * 1000;        // coming back looks again, but not more often than this
export const AWAY_MS = 60 * 1000;           // away at least this long, and the update may happen without a word
export const WORDS = 'A newer version is ready · tap to update';
export const TRIED_KEY = 'ayo.fresh.tried';

// The page's own build from <meta name="ayo-build">: null when there is none or it is "dev" (no server wrote it).
export function buildOf(doc) {
  const m = doc && doc.querySelector && doc.querySelector('meta[name="ayo-build"]');
  const v = m && String(m.getAttribute('content') || '').trim();
  return v && v !== 'dev' && /^[0-9a-f]{6,40}$/i.test(v) ? v : null;
}

// Whether the build out there is not the one running (only for builds that look like ours).
export function newer(mine, latest) { return !!(mine && latest && /^[0-9a-f]{6,40}$/i.test(latest) && latest !== mine); }

// A moment when a reload loses nothing: Home in front, no room open, no lesson, no card up.
export function safeNow({ screen, online, lesson, card }) { return screen === 'home' && !online && !lesson && !card; }

// fetchVersion: async () => string | null; store: {get(k), set(k, v)} (session storage); reload(); now()
export function makeFresh({ mine, fetchVersion, store, reload, now = () => Date.now() }) {
  const f = {
    mine, latest: null, lastCheck: -Infinity, checks: 0, reloads: 0, log: [],
    get on() { return !!mine; },
    get tried() { try { return store.get(TRIED_KEY); } catch { return null; } },
    get ready() { return newer(mine, f.latest) && f.latest !== f.tried; },
    async check(force = false) {
      if (!mine) return false;
      const t = now();
      if (!force && t - f.lastCheck < GAP_MS) return f.ready;
      f.lastCheck = t; f.checks++;
      try { const v = await fetchVersion(); if (v) f.latest = String(v); keep(f.log, 'check:' + (v || 'none')); } catch { keep(f.log, 'check:failed'); }
      return f.ready;
    },
    update() {
      if (!f.ready) return false;
      try { store.set(TRIED_KEY, f.latest); } catch { /* private window: the guard is only for this visit anyway */ }
      f.reloads++; keep(f.log, 'reload:' + f.latest); reload(); return true;
    },
    // Coming back to the page after awayMs: update without a word if it is safe and the page was away long enough.
    back(awayMs, safe) {
      if (f.ready && safe && awayMs >= AWAY_MS) return f.update();
      return false;
    },
    // What Home's line says, or null for no line.
    line(safe) { return f.ready && safe ? WORDS : null; },
  };
  return f;
}

// The server's answer to GET /version, read without any cache in the way.
export async function fetchBuild(fetchFn = fetch, base = '') {
  const r = await fetchFn(base + '/version', { cache: 'no-store' });
  if (!r.ok) return null;
  const j = await r.json();
  return j && typeof j.v === 'string' ? j.v : null;
}
