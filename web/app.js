// The store apps (Capacitor): the same web files inside the Android and the iPhone / iPad app, opened from the phone itself with
// no signal. Everything here is a no-op on the web link, so the browser game is unchanged. Inside the app:
//   - online rooms talk to the live server (the app's own address is https://localhost, which has no rooms), and invite
//     links point at the web link so a friend without the app can still open them;
//   - the phone's own haptics, share sheet and keep-awake stand in for navigator.vibrate / navigator.share / the screen wake
//     lock, which Android's WebView and iOS's WKWebView lack or do poorly (iOS has no navigator.vibrate at all, and its
//     wake lock did nothing inside apps before iOS 18.4); the rest of the game calls the web APIs as before;
//   - the page is marked html.app plus html.ios / html.android, for the few things that differ;
//   - the Android back button steps back the way the screens' own Back buttons do, and on Home puts the app away.
// The native plugins are reached through window.Capacitor.Plugins (registered by the app itself), so no bundler is needed.

export const SERVER = 'https://ayo-ncho.onrender.com';

export function inApp(w = globalThis) {
  const C = w && w.Capacitor;
  return !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
}
// 'ios' | 'android' inside the app, 'web' on the web link.
export function platform(w = globalThis) {
  if (!inApp(w)) return 'web';
  const p = typeof w.Capacitor.getPlatform === 'function' ? w.Capacitor.getPlatform() : '';
  return p === 'ios' || p === 'android' ? p : 'android';
}
export function plugin(name, w = globalThis) { return (inApp(w) && w.Capacitor.Plugins && w.Capacitor.Plugins[name]) || null; }

// Where rooms live: the page's own server on the web, the live server in the app.
export function wsUrl(w = globalThis) {
  if (inApp(w)) return SERVER.replace(/^http/, 'ws') + '/ws';
  const L = w.location; return (L.protocol === 'https:' ? 'wss://' : 'ws://') + L.host + '/ws';
}
// The address a shared link starts from (invites, the puzzle): the page's own on the web, the web link in the app.
export function publicBase(w = globalThis) {
  if (inApp(w)) return SERVER + '/';
  const L = w.location; return L.origin + L.pathname;
}
// The privacy, terms and support pages live on the server (the stores link to them there), so the apps open the web link's.
export const LEGAL = ['privacy', 'terms', 'support'];
// lang ('en' | 'fr', the page's own language) asks the server for that language, so a French game opens the French pages (server/legal-fr.js).
export function legalLink(page, w = globalThis, lang) { return publicBase(w) + page + (lang === 'fr' || lang === 'en' ? `?lang=${lang}` : ''); }
// Can a shared link be opened by someone else? (A page on a laptop at http://localhost cannot.)
export function linkable(w = globalThis) { return inApp(w) || (w.location && w.location.protocol === 'https:'); }

// A vibration (ms, or the Vibration API's on/off pattern) as pulses for the phone's haptics: [[delay, ms], …].
export function hapticPlan(ms) {
  const p = Array.isArray(ms) ? ms : [ms]; const out = []; let t = 0;
  for (let i = 0; i < p.length; i++) { const d = Math.max(0, Math.round(+p[i] || 0)); if (i % 2 === 0 && d > 0) out.push([t, Math.min(d, 400)]); t += d; }
  return out;
}
// Short taps feel best as the phone's own "impact"; longer ones as a vibration of that length.
export function hapticCall(d) { return d <= 20 ? ['impact', { style: d <= 10 ? 'LIGHT' : 'MEDIUM' }] : ['vibrate', { duration: d }]; }
export function haptic(ms, w = globalThis) {
  const H = plugin('Haptics', w); if (!H) return false;
  for (const [at, d] of hapticPlan(ms)) { const [fn, arg] = hapticCall(d); const go = () => { try { const r = H[fn](arg); if (r && r.catch) r.catch(() => {}); } catch {} }; at ? setTimeout(go, at) : go(); }
  return true;
}

// The share sheet: navigator.share is missing in Android's WebView, so the app's own sheet takes the text and the link.
// Files (the board picture, the clip) cannot go through it from the page, so canShare says no for files and the game falls
// back to sharing the words, as it already does on browsers without file sharing.
export function installShare(nav, S) {
  if (!nav || !S) return false;
  const words = (d) => ({ title: d.title, text: d.text, url: d.url, dialogTitle: 'Share' });
  try {
    Object.defineProperty(nav, 'share', { configurable: true, value: async (d = {}) => { await S.share(words(d)); } });
    Object.defineProperty(nav, 'canShare', { configurable: true, value: (d = {}) => !(d.files && d.files.length) });
  } catch { return false; }
  return true;
}

// Keep the screen on: the app's keep-awake plugin wearing the screen wake lock's shape, so web/wake.js works unchanged.
export function installWake(nav, K) {
  if (!nav || !K) return false;
  const lock = {
    async request(type) {
      if (type !== 'screen') throw new Error('only the screen');
      await K.keepAwake();
      const listeners = new Set(); let released = false;
      const s = {
        type: 'screen', get released() { return released; }, onrelease: null,
        async release() { if (released) return; released = true; await K.allowSleep(); const e = { type: 'release' }; if (s.onrelease) s.onrelease(e); for (const f of listeners) f(e); },
        addEventListener(t, f) { if (t === 'release') listeners.add(f); }, removeEventListener(t, f) { if (t === 'release') listeners.delete(f); },
      };
      return s;
    },
  };
  try { Object.defineProperty(nav, 'wakeLock', { configurable: true, value: lock }); } catch { return false; }
  return true;
}

// The Android back button, given what is on screen: which Back the player would have tapped, or put the app away.
//   ui = { rules, shouts, door, name, gameover, screen: 'home'|'settings'|'rooms'|'puzzle'|'play', online, busy }
export function backStep(ui) {
  if (ui.rules) return 'rulesClose';
  if (ui.shouts) return 'shouts';
  if (ui.door || ui.name) return 'stay';            // a question someone is waiting on: answer it on screen
  if (ui.screen === 'settings') return 'settingsBack';
  if (ui.screen === 'store') return 'storeBack';
  if (ui.screen === 'rooms') return 'roomsBack';
  if (ui.screen === 'puzzle') return ui.busy ? 'stay' : 'pzHome';
  if (ui.screen === 'home') return 'minimize';
  if (ui.online) return 'minimize';                  // a game with a friend: back never walks out of the room
  if (ui.gameover) return 'goHome';
  return ui.busy ? 'stay' : 'homeBtn';
}

// Wire it all up once, at start. `onBack` gets the step to take.
export function startApp(onBack, w = globalThis) {
  if (!inApp(w)) return false;
  w.document && w.document.documentElement.classList.add('app', platform(w));
  installShare(w.navigator, plugin('Share', w));
  // The app's keep-awake whenever it is there: a WebView's own wake lock may exist yet do nothing (iOS before 18.4).
  installWake(w.navigator, plugin('KeepAwake', w));
  const A = plugin('App', w);   // the back button is Android's; iPhones have none, so nothing listens there
  if (A && A.addListener && platform(w) === 'android') A.addListener('backButton', () => { const step = onBack(); if (step === 'minimize' && A.minimizeApp) A.minimizeApp(); });
  const S = plugin('SplashScreen', w); if (S && S.hide) setTimeout(() => S.hide({ fadeOutDuration: 250 }), 0);
  return true;
}
