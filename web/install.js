// On your home screen (idea 9 Nov): until the store apps are out, the family plays from the link sent on WhatsApp, and the
// link is lost under the chat's next hundred messages — but the game already installs as an app from the browser (the
// manifest, the icons, the service worker that lets it play with no signal), and nothing said so. Now, once you have come back
// to it on a second day, a brass line on Home offers it: "Keep it on your home screen · plays offline". Where the
// browser can install it itself (Chrome and Samsung Internet on Android, Chrome and Edge on the Mac) a tap asks the
// browser's own install question; on an iPhone or iPad, where only the Share menu can, a tap says the two steps.
// "Not now" puts it away for two weeks; it is offered twice at most, never again once installed, never in the store apps or
// the installed app itself, never on the board or another screen, and never beside the newer-version or back-to-your-game
// lines (one brass line at a time). Pure functions, tested in node (test/install.test.js).

export const KEY = 'install';                     // ayo.install: { offers, last, done }
export const DAYS = 2;                            // a second day played: they came back, so it is worth keeping
export const GAP_MS = 14 * 24 * 3600 * 1000;      // "Not now" puts it away this long
export const OFFERS = 2;                          // a nudge, never a nag
export const WORDS = 'Keep it on your home screen · plays offline';
export const NOT_NOW = 'Not now';
export const IOS_STEPS = 'Tap Share, then Add to Home Screen';
export const ADDED = 'On your home screen — open it from there';

// What kind of offer this browser can take: 'prompt' (it gave us its install question), 'ios' (an iPhone or iPad browser,
// where Share → Add to Home Screen is the only way), or null (already an app, or a browser that cannot install it).
export function installKind({ inApp = false, standalone = false, prompt = false, ua = '', touch = 0 } = {}) {
  if (inApp || standalone) return null;
  if (prompt) return 'prompt';
  const s = String(ua || '');
  const ios = /iPhone|iPad|iPod/.test(s) || (/Macintosh/.test(s) && touch > 1); // an iPad asks for the Mac's page
  return ios ? 'ios' : null;
}

// What is kept, read with care (a spoiled value is no offer made yet).
export function readInstall(raw) {
  let v = null; try { v = JSON.parse(raw || 'null'); } catch { v = null; }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { offers: 0, last: 0, done: false };
  const n = (x) => (Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
  return { offers: Math.min(n(v.offers), OFFERS), last: n(v.last), done: v.done === true };
}

// Whether the line shows now. `o`: kind (installKind), days (days played), home (Home in front, no card, no room),
// other (another brass line is up), now (ms), and the kept { offers, last, done }; `shown` — already offered this visit.
export function installDue(o, kept, shown = false) {
  if (!o || !o.kind || !o.home || o.other) return false;
  if (!kept || kept.done) return false;
  if ((o.days || 0) < DAYS) return false;
  if (shown) return true; // the offer of this visit stays until it is answered or Home is left
  if (kept.offers >= OFFERS) return false;
  return !kept.last || (o.now || 0) - kept.last >= GAP_MS;
}

// The bookkeeping, kept apart from the page. `now()` the clock; `kept` what was read.
export function makeInstall(kept, now = () => Date.now()) {
  const st = { kept: { ...kept }, shown: false, log: [] };
  st.due = (o) => installDue({ ...o, now: now() }, st.kept, st.shown);
  // the line has just come up: one offer counted, once a visit
  st.offered = () => { if (st.shown) return false; st.shown = true; st.kept.offers = Math.min(st.kept.offers + 1, OFFERS); st.kept.last = now(); st.log.push('offered'); return true; };
  st.notNow = () => { st.shown = false; st.kept.last = now(); st.log.push('not now'); };
  st.added = () => { st.shown = false; st.kept.done = true; st.log.push('added'); };
  st.save = () => JSON.stringify(st.kept);
  return st;
}
