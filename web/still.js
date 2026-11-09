// Still, if you ask (idea 9 Nov, night): a phone's "Remove animations" (Android, the Fold's Accessibility → Visibility
// enhancements), "Reduce motion" (iPhone, iPad, the Mac) or Windows' "Animation effects" off all reach the page as
// prefers-reduced-motion, and the game kept it in a constant read once as the page opened — so a player who turned it on
// because the flying seeds and the slowly turning board made them queasy got nothing until they closed the game and opened it
// again. Now the page follows the setting while it is open: the next seed flies straight to its pit, the board stops turning
// behind Home, the faces stop blinking, the pulses hold still — and back again when it is turned off. tools/still.py opens every
// screen and plays real moves with the setting on, and fails on anything that still moves for longer than a glance.

export const STILL_QUERY = '(prefers-reduced-motion: reduce)';

// Follow the setting. `mm` is window.matchMedia (absent or throwing: never still, never throws). onChange(reduce) is called
// once for each real change, never for a repeat of the same value; what changed is kept in a short log for the checks.
export function motionWatch(mm, onChange) {
  const s = { reduce: false, changes: 0, log: [] };
  let mq = null;
  try { mq = typeof mm === 'function' ? mm(STILL_QUERY) : null; } catch { mq = null; }
  s.reduce = !!(mq && mq.matches);
  const hear = (e) => {
    const r = !!(e && typeof e.matches === 'boolean' ? e.matches : mq && mq.matches);
    if (r === s.reduce) return;
    s.reduce = r; s.changes++; s.log.push(r); if (s.log.length > 20) s.log.shift();
    try { if (onChange) onChange(r); } catch {}
  };
  try {
    if (mq && mq.addEventListener) mq.addEventListener('change', hear);
    else if (mq && mq.addListener) mq.addListener(hear); // Safari before 14 (an iPad left on iOS 13 opening the link)
  } catch {}
  s.hear = hear; // the checks stand in a change
  return s;
}

// Settings → Feel → Seed physics, its line: with the phone asking for less motion the seeds fly straight whatever is chosen.
export function physicsNote(phys, reduce) {
  if (reduce) return 'now off (your phone asks for less motion)';
  return `now ${phys && phys.physics ? 'on' : 'off'} (${(phys && phys.reason) || 'auto'})`;
}

// What still moves on a page asked to keep still: from plain descriptions of the page's running animations
// ({ who, kind: 'animation'|'transition', name, duration, iterations, delay, playState }), the ones that run longer than a glance
// or for ever. A fade of a quarter second is a glance (the page's own reduced-motion rules keep those); a pulse is not.
export const GLANCE_MS = 300;
export function restless(anims, { glance = GLANCE_MS } = {}) {
  const out = [];
  for (const a of anims || []) {
    if (!a || a.playState === 'finished' || a.playState === 'idle') continue;
    const d = Number(a.duration) || 0, it = a.iterations === Infinity || a.iterations === 'Infinity' ? Infinity : Number(a.iterations ?? 1);
    const ms = it === Infinity ? Infinity : d * (Number.isFinite(it) ? it : 1);
    if (d > 0 && ms > glance) out.push({ who: a.who || '?', kind: a.kind || 'animation', name: a.name || '', ms });
  }
  return out;
}
