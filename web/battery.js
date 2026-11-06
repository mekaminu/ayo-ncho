// Go easy on a low battery (idea 6 Nov). Pure logic, no DOM and no three.js, so node can test it.
//
// The board already rests when nothing moves (web/rest.js), but a game still draws 60 pictures a second while seeds fly, Home
// turns the board slowly all the time it is open, and the seed physics runs for every seed. On a phone near the end of its
// battery (the Fold on the way home, family on a phone that charges once a day) that is the difference between finishing the
// game and not. Now, when the phone says its battery is at 20% or less and it is not charging, the board goes easy on it:
//   - it is drawn at most 30 times a second (every seed still moves to its own spot, every score still ticks; the picture is
//     just handed over half as often), Home's slow turn included;
//   - on a phone that draws at more than one pixel per screen pixel, at one (the same carved board, a touch softer);
//   - seeds fly straight to their pit (Seed physics on Auto), as on the lighter board.
// It says so once, in a toast, and goes back to full the moment the phone is plugged in (or climbs back over 30%, so a battery
// hovering at 20% never flickers between the two). Settings → Feel → Battery saver: Auto (the default) / Off.
// Browsers that cannot tell (Safari, Firefox) are never put on it. `?battery=low` / `?battery=full` stand in for the phone's
// battery (renders and tests).

export const LOW = 0.20;      // at or under this, not charging: go easy
export const BACK = 0.30;     // once easy, back to full only over this (or plugged in)
export const MIN_GAP_MS = 30; // at most ~30 pictures a second while saving (a 60 Hz screen draws every other frame)

// decideSaver({ level, charging, pref, param, was }) → { on, reason }
//   level: 0..1 or null (unknown); charging: boolean; pref: 'auto' | 'off'; param: the ?battery= value; was: on last time
export function decideSaver({ level = null, charging = false, pref = 'auto', param = null, was = false } = {}) {
  if (param === 'low') return { on: true, reason: 'asked for in the address' };
  if (param === 'full') return { on: false, reason: 'asked for in the address' };
  if (pref === 'off') return { on: false, reason: 'chosen in Settings' };
  if (typeof level !== 'number' || !(level >= 0)) return { on: false, reason: 'this browser cannot tell' };
  if (charging) return { on: false, reason: 'charging' };
  const pct = Math.round(level * 100);
  if (level <= LOW + 1e-9) return { on: true, reason: `battery at ${pct}%` };
  if (was && level <= BACK + 1e-9) return { on: true, reason: `battery at ${pct}%` };
  return { on: false, reason: `battery at ${pct}%` };
}

// what saving means for the board
export function saverPlan(on, dpr = 1) {
  return on ? { on: true, minGap: MIN_GAP_MS, pixelRatio: Math.min(1, dpr), physics: false } : { on: false, minGap: 0, pixelRatio: null, physics: true };
}

// drawDue(now, lastDrawn, plan): may this frame be handed to WebGL? Always yes when not saving.
// A little slack (4 ms) so a 60 Hz screen (16.7 ms frames) lands on every other frame rather than drifting to every third.
export function drawDue(now, lastDrawn, plan) {
  if (!plan || !plan.on) return true;
  return now - lastDrawn >= plan.minGap - 4;
}

// the words: the toast when it switches, and the line under the Settings row
export const WORDS = {
  on: 'Battery low — the board is going easy on it',
  off: 'Charging — the board is back to full',
  back: 'Battery back up — the board is back to full',
};
export function toastFor(prev, next, charging) {
  if (prev.on === next.on) return null;
  return next.on ? WORDS.on : charging ? WORDS.off : WORDS.back;
}
export function noteFor(s) { return `now ${s.on ? 'saving' : 'full'} (${s.reason})`; }

// watchBattery(nav, onChange): reads navigator.getBattery() where the browser has it and calls onChange({ level, charging })
// now and on every change. Returns a promise of the battery object (or null). Never throws.
export function watchBattery(nav, onChange) {
  try {
    if (!nav || typeof nav.getBattery !== 'function') return Promise.resolve(null);
    return nav.getBattery().then((b) => {
      const tell = () => onChange({ level: b.level, charging: !!b.charging });
      if (b.addEventListener) { b.addEventListener('levelchange', tell); b.addEventListener('chargingchange', tell); }
      tell(); return b;
    }, () => null);
  } catch { return Promise.resolve(null); }
}
