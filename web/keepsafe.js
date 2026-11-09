// Kept safe (idea 9 Nov): everything the game keeps — the days played and the river stones they unlock, the record against
// each opponent, the rating, the bests, the puzzle days, the game under way — lives in the browser's storage on the phone,
// and a browser does not promise to keep it. Chrome and Samsung Internet may clear a site's storage when the phone runs
// short of space, and Safari on an iPhone clears what a site wrote once it has gone unopened for seven days of use (an
// aunt who plays at Christmas and Easter would lose her streak in between). Browsers keep a site's storage for good when
// asked (navigator.storage.persist): Chrome and Samsung Internet say yes by themselves for a game played often or kept on
// the home screen, Safari for one on the home screen, Firefox asks the player. So once there is something worth keeping
// (a game finished, or a second day played) the game asks — once, and again a month later if the browser said no.
// And a write the phone refuses (its storage full, or turned off) used to be swallowed without a word, so the game played
// on and was gone on the next visit: now the first refused save of a visit says so, and Settings → New phone says where
// the game stands. Never in the store apps (their storage is the app's own). Pure functions, tested in node
// (test/keepsafe.test.js).

export const KEY = 'keepsafe';                    // ayo.keepsafe: { asked, granted }
export const GAP_MS = 30 * 24 * 3600 * 1000;       // a browser that said no is asked again a month later
export const DAYS = 2;                             // a second day played is worth keeping

export const FULL = 'This phone is full — your game is not being kept. Free some space to keep it';
export const BLOCKED = 'This browser is not keeping the game — its storage is turned off';

// Settings → New phone, the line under "Kept on this phone"
export const W_APP = 'inside the app, kept with it';
export const W_SAFE = 'the browser has promised not to clear it';
export const W_HOME = 'in the game on your home screen';
export const W_MAY = 'a browser may clear it when the phone is short of space or the game goes unopened for weeks — keep it on your home screen, or Send it to yourself';
export const W_FULL = 'not being kept · this phone is full — free some space and it is kept again';
export const W_OFF = 'not being kept · this browser has its storage turned off';

// What is kept, read with care (a spoiled value is nothing asked yet).
export function readKeep(raw) {
  let v = null; try { v = JSON.parse(raw || 'null'); } catch { v = null; }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { asked: 0, granted: false };
  return { asked: Number.isFinite(v.asked) && v.asked > 0 ? Math.floor(v.asked) : 0, granted: v.granted === true };
}

// Whether there is something worth keeping: a game finished (this visit), or a second day played.
export const worthKeeping = ({ days = 0, finished = false } = {}) => !!finished || days >= DAYS;

// Whether to ask the browser now. `o`: inApp, supported (navigator.storage.persist exists), persisted (already kept for
// good), worth (worthKeeping), now (ms); `kept` what was read; `asking` — a question already out this visit.
export function askDue(o, kept, asking = false) {
  if (!o || o.inApp || !o.supported || o.persisted || !o.worth || asking) return false;
  if (!kept) return true;
  return !kept.asked || (o.now || 0) - kept.asked >= GAP_MS;
}

// A refused write: 'full' (the phone or the site's share of it is full), else 'off' (storage blocked or broken).
export function failKind(e) {
  if (!e) return 'off';
  const name = String(e.name || ''), code = e.code;
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014) return 'full';
  return 'off';
}

// The line in Settings, from where the game stands.
export function keepWords({ inApp = false, persisted = false, standalone = false, failing = null } = {}) {
  if (failing === 'full') return W_FULL;
  if (failing === 'off') return W_OFF;
  if (inApp) return W_APP;
  if (persisted) return W_SAFE;
  if (standalone) return W_HOME;
  return W_MAY;
}

// The bookkeeping, kept apart from the page. `now()` the clock; `kept` what was read.
export function makeKeep(kept, now = () => Date.now()) {
  const st = { kept: { ...kept }, asking: false, persisted: !!(kept && kept.granted), failing: null, failKey: null, fails: 0, said: [], log: [] };
  st.due = (o) => askDue({ ...o, persisted: o.persisted || st.persisted, now: now() }, st.kept, st.asking);
  st.asked = () => { st.asking = true; st.kept.asked = now(); st.log.push('asked'); };
  st.answer = (yes) => { st.asking = false; st.persisted = !!yes; st.kept.granted = !!yes; st.log.push(yes ? 'kept' : 'not yet'); };
  // what the browser says at start (navigator.storage.persisted): a yes given earlier, or taken back since
  st.known = (yes) => { st.persisted = !!yes; st.kept.granted = !!yes; };
  // a write refused: returns the words to say, once a visit for each reason (a full phone may refuse the game and take a
  // small setting, so the line in Settings comes and goes but the toast is never said twice)
  st.failed = (e, key = null) => {
    const k = failKind(e); st.fails++; st.failing = k; st.failKey = key; st.log.push('refused ' + k);
    if (st.said.includes(k)) return null;
    st.said.push(k); return k === 'full' ? FULL : BLOCKED;
  };
  // a write that went through: once the very thing that was refused is kept, the phone has room again
  st.ok = (key = null) => { if (st.failing && key === st.failKey) { st.failing = null; st.failKey = null; st.log.push('kept again'); } };
  st.save = () => JSON.stringify(st.kept);
  return st;
}
