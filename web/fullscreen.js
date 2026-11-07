// Full screen (idea 7 Nov): on the game link in a phone's browser (the Fold's Chrome or Samsung Internet) the address bar and
// the browser's own buttons take a band off the top and bottom of every screen, and on the Mac the tabs and the toolbar take
// more — a 3D board that wants every pixel sat in a window. The store apps and the game installed from the link already fill
// the screen. Now Settings → Feel → Full screen (and F on the Mac's keys) asks the browser for the whole screen, and the
// choice is kept: after a reload or an update the first tap anywhere goes back to full screen (a browser only allows it from
// a tap or a key). Leaving it the browser's own way — Esc, the phone's back, a swipe — turns it off, as the player chose.
// Pure functions (no DOM of its own: the document and the element are handed in), tested in test/fullscreen.test.js.

export const KEYS = ['f', 'F'];

// What this page can do: 'app' (inside the store apps: already the whole screen), 'installed' (the game installed from the link,
// opened from its icon: no browser bar to hide), 'none' (the browser cannot: an iPhone's Safari, an old browser, a page in a
// frame that does not allow it) or 'ok'.
export function fullSupport(doc, { inApp = false, standalone = false } = {}) {
  if (inApp) return 'app';
  if (standalone) return 'installed';
  if (!doc) return 'none';
  const el = doc.documentElement;
  const can = (doc.fullscreenEnabled === true && el && typeof el.requestFullscreen === 'function')
    || (doc.webkitFullscreenEnabled === true && el && typeof el.webkitRequestFullscreen === 'function');
  return can ? 'ok' : 'none';
}

// whether the page is in full screen right now
export function isFull(doc) { return !!(doc && (doc.fullscreenElement || doc.webkitFullscreenElement)); }

// ask for the whole screen; resolves true when the browser said yes. The phone's own bar is hidden too where it can be.
export async function enterFull(el) {
  if (!el) return false;
  try {
    if (typeof el.requestFullscreen === 'function') { await el.requestFullscreen({ navigationUI: 'hide' }); return true; }
    if (typeof el.webkitRequestFullscreen === 'function') { el.webkitRequestFullscreen(); return true; }
  } catch { return false; }
  return false;
}
export async function exitFull(doc) {
  if (!isFull(doc)) return true;
  try {
    if (typeof doc.exitFullscreen === 'function') { await doc.exitFullscreen(); return true; }
    if (typeof doc.webkitExitFullscreen === 'function') { doc.webkitExitFullscreen(); return true; }
  } catch { return false; }
  return false;
}

// the player's kept choice ('1' on, anything else off)
export const fullPref = (v) => v === '1';

// whether a tap (or key) should take the page back to full screen: the player chose it, the browser can, and it is not already
export function shouldRestore({ pref, support, full }) { return fullPref(pref) && support === 'ok' && !full; }

// what the browser leaving full screen by itself means for the kept choice: left the browser's way (Esc, back, a swipe) while
// we did not ask → the player chose off; left because we asked (the switch, F) → already off
export function afterChange({ full, asked }) { return full ? null : asked ? null : '0'; }

// the row's small print under "Full screen"
export function fullNote(support, on) {
  if (support === 'app' || support === 'installed') return 'the game already fills the screen';
  if (support === 'none') return 'this browser cannot hide its own bars';
  return on ? 'the whole screen, no address bar · Esc or the phone’s back to leave' : 'hides the browser’s address bar and buttons, for the most board';
}
export function fullToast(on, { keys = false } = {}) {
  if (!on) return 'Full screen off';
  return keys ? 'Full screen · Esc or F to leave' : 'Full screen · the phone’s back to leave';
}
export const FULL_REFUSED = 'This browser would not go full screen';
