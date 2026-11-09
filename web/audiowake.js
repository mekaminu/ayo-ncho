// The sound comes back (idea 9 Nov): the board's sounds and the music are made on the device in one Web Audio context
// (web/sound.js, web/music.js). A phone can take that context away at any time — a call coming in, Siri, a voice note in
// WhatsApp, another app's music, the phone locked — and on an iPhone it then sits "interrupted" (Safari's own state, not
// the "suspended" the game used to look for), so every seed landed in silence until the page was reloaded. Android's
// Chrome and the Fold's browser leave it "suspended" after some calls, and a context can be "closed" by the browser to
// save memory. Now:
//   - any tap, click or key (the moments a phone lets sound start) wakes a sleeping context: resume();
//   - coming back to the page tries the same (no tap needed where the browser allows it);
//   - a context that a tap has already tried to wake and that is still asleep a moment later, or one that is closed, is
//     made again inside the next tap (a new context made in a tap always plays) — the music carries on in the new one.
// Pure logic: makeAudioWake is given how to read the context and how to make it again, so it is tested in node with a
// pretend context (test/audiowake.test.js).

export const ASLEEP = ['suspended', 'interrupted'];
export const asleep = (state) => ASLEEP.includes(state);
export const STUCK_MS = 1200; // a tap's resume that has not taken by now is not going to
export const REBUILD_GAP_MS = 10000; // never make it again more often than this (during a call nothing will play, however often it is made)

// What to do now. `state`: the context's state (null when there is none yet); `gesture`: in a tap or key; `wanted`: the
// game means to make sound (sound on, or music on); `tried`: the time of the last tap that asked it to wake (or null),
// still asleep since; `rebuilt`: when it was last made again (or null); `now`: the clock.
export function wakeStep({ state, gesture, wanted, tried, now, rebuilt = null, stuckMs = STUCK_MS, gapMs = REBUILD_GAP_MS }) {
  if (!wanted || state === null || state === undefined || state === 'running') return null;
  const mayRebuild = gesture && (rebuilt === null || now - rebuilt >= gapMs);
  if (state === 'closed') return mayRebuild ? 'rebuild' : null; // a new one is made in a tap, so it can play
  if (!asleep(state)) return null;
  if (mayRebuild && tried !== null && tried !== undefined && now - tried >= stuckMs) return 'rebuild';
  return 'resume';
}

// get(): the context or null; rebuild(): drop it and make a new one (music included); wanted(): sound or music is on.
export function makeAudioWake({ get, rebuild, wanted, now = () => Date.now(), stuckMs = STUCK_MS, gapMs = REBUILD_GAP_MS }) {
  const s = { tried: null, rebuilt: null, resumes: 0, rebuilds: 0, woke: 0, log: [] };
  const note = (e) => { s.log.push(e); if (s.log.length > 20) s.log.shift(); };
  function poke(why, gesture) {
    const ctx = get(); const state = ctx ? ctx.state : null; const t = now();
    if (state === 'running') { s.tried = null; return null; }
    const step = wakeStep({ state, gesture, wanted: wanted(), tried: s.tried, rebuilt: s.rebuilt, now: t, stuckMs, gapMs });
    if (!step) return null;
    if (step === 'rebuild') {
      s.tried = null; s.rebuilt = t; s.rebuilds++; note(['rebuild', why, state]);
      try { if (ctx && ctx.state !== 'closed' && ctx.close) ctx.close().catch(() => {}); } catch {}
      try { rebuild(); } catch {}
      return step;
    }
    s.resumes++; note(['resume', why, state]);
    if (gesture && s.tried === null) s.tried = t; // only a tap's try counts towards "stuck": a resume without one may be refused
    try {
      const p = ctx.resume();
      if (p && p.then) p.then(() => { if (ctx.state === 'running') { s.tried = null; s.woke++; note(['woke', why]); } }, () => {});
    } catch {}
    return step;
  }
  // a context that wakes by itself (Android after a call) clears the count
  function changed() { const ctx = get(); if (ctx && ctx.state === 'running' && s.tried !== null) { s.tried = null; s.woke++; note(['woke', 'itself']); } }
  return { poke, changed, s };
}

// The page's side: taps, keys and coming back. `win`/`doc` are the window and document (pretend ones in the tests).
export function bindAudioWake(w, { win, doc }) {
  const tap = () => w.poke('tap', true);
  for (const ev of ['pointerdown', 'touchend', 'keydown']) win.addEventListener(ev, tap, { capture: true, passive: true });
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) w.poke('back', false); });
  win.addEventListener('pageshow', () => w.poke('back', false));
  win.addEventListener('focus', () => w.poke('back', false));
}
