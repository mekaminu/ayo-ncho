// Block and report (Launch L16b, slice 2): what the stores ask of any game where people can see and hear each other.
// Pure logic, no DOM: the board (web/game.js) calls it, the server only carries the tag, test/block.test.js checks it in node.
//
// The phone's tag: a random string made on this phone the first time it opens or knocks on a room, sent with the room's
// create / join / rejoin and shown to the other seat only. It is not linked to anything (no account, no name, no device ID),
// and nothing keeps it but the room in the server's memory and the list of a phone that blocked it.
// Blocking someone (from the camera button's menu, two taps): the call ends, this phone leaves the room, and from then on
// on THIS phone their knocks at your rooms are turned away quietly (they see the usual "not let in this time"), and their
// invite links say you blocked them rather than knocking. Settings → Privacy lists everyone blocked, each with Unblock.
// Report a problem opens the support page's "Report a player" part, which says what to send and where.

export const TAG_RE = /^[A-Za-z0-9_-]{16,32}$/;
export const TAG_LENGTH = 22;     // characters of base64url: 132 bits, so two phones never share one
export const MAX_BLOCKED = 200;   // the list keeps the latest 200
export const ARM_MS = 3000;       // Block asks for a second tap within three seconds, like Give up
export const REPORT_PAGE = 'support';
export const REPORT_HASH = '#report';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function cleanTag(t) { return typeof t === 'string' && TAG_RE.test(t) ? t : null; }

// A fresh tag. bytes(n) gives n random bytes (crypto.getRandomValues in a browser or node).
export function makeTag(bytes = defaultBytes) {
  const b = bytes(TAG_LENGTH); let s = '';
  for (let i = 0; i < TAG_LENGTH; i++) s += B64[b[i] & 63];
  return s;
}
function defaultBytes(n) {
  const a = new Uint8Array(n);
  const c = globalThis.crypto;
  if (c && c.getRandomValues) c.getRandomValues(a); else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
  return a;
}

// This phone's tag, made once and kept. store: {get(k, d), set(k, v)} (the board's prefs).
export function phoneTag(store, bytes) {
  const had = cleanTag(store.get('tag', null));
  if (had) return had;
  const t = makeTag(bytes); store.set('tag', t); return t;
}

const cleanName = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Someone';

// The blocked list, kept on this phone. Each entry {tag, name, at}; the name is what they called themselves when blocked.
export function readBlocked(raw) {
  let a; try { a = JSON.parse(raw || '[]'); } catch { return []; }
  if (!Array.isArray(a)) return [];
  const seen = new Set(); const out = [];
  for (const e of a) {
    const tag = e && cleanTag(e.tag); if (!tag || seen.has(tag)) continue;
    seen.add(tag); out.push({ tag, name: cleanName(e.name), at: Number.isFinite(e.at) ? e.at : 0 });
  }
  return out.slice(-MAX_BLOCKED);
}

export class Blocked {
  constructor(store, key = 'blocked') { this.store = store; this.key = key; this.list = readBlocked(store.get(key, '[]')); }
  save() { this.store.set(this.key, JSON.stringify(this.list)); }
  has(tag) { const t = cleanTag(tag); return !!t && this.list.some((e) => e.tag === t); }
  add(tag, name, at = Date.now()) {
    const t = cleanTag(tag); if (!t) return false;
    this.list = this.list.filter((e) => e.tag !== t); this.list.push({ tag: t, name: cleanName(name), at });
    if (this.list.length > MAX_BLOCKED) this.list = this.list.slice(-MAX_BLOCKED);
    this.save(); return true;
  }
  remove(tag) { const n = this.list.length; this.list = this.list.filter((e) => e.tag !== tag); if (this.list.length !== n) { this.save(); return true; } return false; }
  get size() { return this.list.length; }
}

// Whether Block is offered: in a room with a friend seated whose phone sent a tag (an older version sends none).
export function mayBlock({ online, friend }) { return !!(online && friend && cleanTag(friend.tag)); }

// The knocks the host's board turns away by itself, and the ones it shows.
export function sortKnocks(knocks, blocked) {
  const shown = [], refused = [];
  for (const k of knocks || []) (blocked.has(k.tag) ? refused : shown).push(k);
  return { shown, refused };
}

// The words. name: the friend's name.
export function blockWords(key, name = 'them') {
  const N = name;
  switch (key) {
    case 'block': return `Block ${N}`;
    case 'armed': return `Tap again to block ${N}`;
    case 'armedKeys': return `Click again to block ${N}`;
    case 'blockLabel': return `Block ${N} on this phone — they can no longer knock at your rooms or call you; press twice`;
    case 'done': return `${N} is blocked on this phone — you have left the room`;
    case 'atDoor': return `You blocked ${N} on this phone — unblock them in Settings → Privacy to play`;
    case 'seated': return `${N} is blocked on this phone — you have left the room`;
    case 'report': return 'Report a problem';
    case 'reportLabel': return `Report a problem with ${N} — opens the support page`;
    case 'none': return 'nobody';
    case 'unblock': return 'Unblock';
    case 'unblocked': return `${N} is unblocked`;
    case 'note': return 'a blocked friend’s knocks at your rooms are turned away and they cannot call you; only on this phone';
    default: return '';
  }
}
