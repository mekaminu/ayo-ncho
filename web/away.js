// Your move, even in another tab: while a room is open and this page is in the background (another tab, another app,
// the Mac's window behind something else), what the friend does is said where you can see it from outside the game —
// the tab's title ("(2) Your move · Tete played — Ayo & Nchò"), a brass dot on the tab's icon and, for the installed
// app, a number on its icon (the Badging API, where the browser has it). Coming back clears all three.
// The words are pure functions; the controller takes the page's document and navigator so it is tested in node
// (test/away.test.js).

export const BASE = 'Ayo & Nchò';

// What one thing that happened while you were away says. kind: 'move' | 'knock' | 'joined' | 'rematch' | 'over' | 'shout' | 'askback'
// d: { name, mine (true when it is now your move), text (a shout's words), result ('won' | 'lost' | 'draw'), score: [yours, theirs], gaveUp (someone gave the game up) }
export function awayWords(kind, d = {}) {
  const name = d.name || 'Your friend';
  switch (kind) {
    case 'move': return d.mine === false ? `${name} played` : `Your move · ${name} played`;
    case 'knock': return `${name} is at the door`;
    case 'joined': return d.mine ? `${name} joined · your move` : `${name} joined`;
    case 'rematch': return `${name} wants to play again`;
    case 'over': {
      const s = Array.isArray(d.score) ? ` ${d.score[0]}–${d.score[1]}` : '';
      if (d.gaveUp) return d.result === 'won' ? `${name} gave up · you won` : `You gave up · ${name} won`; // whatever the seeds said
      return d.result === 'won' ? `You won${s}` : d.result === 'lost' ? `${name} won${s ? ` ${d.score[1]}–${d.score[0]}` : ''}` : `A draw${s}`;
    }
    case 'shout': return `${name}: ${d.text || '…'}`;
    case 'askback': return `${name} asks to take back a move`;
    default: return '';
  }
}

// The whole title: the latest thing first, a count when more than one thing happened, the game's name last.
export function awayTitle(words, count = 1, base = BASE) {
  if (!words) return base;
  return `${count > 1 ? `(${count}) ` : ''}${words} — ${base}`;
}

// The tab's icon with a brass dot at its top right corner (the game's own icon underneath).
export function dotIcon(svg) {
  const dot = '<circle cx="420" cy="92" r="92" fill="#0d0906"/><circle cx="420" cy="92" r="70" fill="#e6b76f"/>';
  const i = String(svg).lastIndexOf('</svg>');
  return i < 0 ? svg : svg.slice(0, i) + dot + svg.slice(i);
}
export const svgUrl = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg);

// Is the page out of sight? Hidden (another tab, the phone's other app) or, on a computer, not the window in front.
export function isAway(doc) {
  if (!doc) return false;
  if (doc.hidden || doc.visibilityState === 'hidden') return true;
  try { return typeof doc.hasFocus === 'function' ? !doc.hasFocus() : false; } catch { return false; }
}

// The controller. env: { doc, nav, icon (the svg text of the tab's icon, or a function giving it), chime() }.
// note(kind, d) says it if the page is away (returns true when it did); back() clears it all.
export function makeAway({ doc, nav, icon, chime } = {}) {
  let count = 0, words = '', iconEl = null, plainHref = null;
  const st = { get count() { return count; }, get words() { return words; } };
  const iconLink = () => {
    if (iconEl || !doc || !doc.querySelector) return iconEl;
    iconEl = doc.querySelector('link[rel="icon"]'); if (iconEl) plainHref = iconEl.getAttribute('href'); return iconEl;
  };
  const badge = (n) => { try { if (!nav) return; if (n > 0 && nav.setAppBadge) nav.setAppBadge(n).catch?.(() => {}); else if (n === 0 && nav.clearAppBadge) nav.clearAppBadge().catch?.(() => {}); } catch {} };
  st.note = (kind, d = {}) => {
    if (!isAway(doc)) return false;
    const w = awayWords(kind, d); if (!w) return false;
    count += 1; words = w; doc.title = awayTitle(w, count);
    const el = iconLink(); const svg = typeof icon === 'function' ? icon() : icon;
    if (el && svg) el.setAttribute('href', svgUrl(dotIcon(svg)));
    badge(count);
    if (chime && (kind === 'move' || kind === 'joined' || kind === 'over')) { try { chime(kind); } catch {} } // the door and shouts already make their own sound
    return true;
  };
  st.back = () => {
    if (!count) return false;
    count = 0; words = ''; if (doc) doc.title = BASE;
    if (iconEl && plainHref != null) iconEl.setAttribute('href', plainHref);
    badge(0); return true;
  };
  return st;
}
