// Move to a new phone (idea 7 Nov): the game has no accounts of its own (rule 8; cloud save through Game Center / Play Games
// waits on the developer accounts, L20), so everything a player has built up — the days played and the river stones they
// unlock, the record against each opponent, the rating, the bests, the puzzle days, the lesson done, the names and the
// settings — lived in one phone's storage and was lost with the phone. Now Settings → New phone → Send puts all of it in one
// link (the share sheet or the clipboard), and the link opened on the new phone (or pasted under Bring, inside the apps) shows
// what it carries and asks once before bringing it in. The progress travels after the # of the link, which a browser never
// sends to a server: nothing about it reaches ours. Purchases are never carried (a link could be made up to claim them):
// Restore purchases brings those back from the store. Nor are this phone's own measures (how fast it draws, full screen) or a
// room's seat. Days played and puzzle days are put together with the new phone's own; everything else is the old phone's.

export const KEY = 'carry';
export const PREFIX = 'ayo.';
// never carried: what was bought (only the store can say), a room's seat, and what this phone measured of itself
export const KEEP_OUT = new Set(['owned', 'room', 'fresh.tried', 'quality', 'quality.measured', 'frames.last', 'full', 'tele.first', 'glback']);
const NAME = /^[a-zA-Z0-9._-]{1,40}$/;
export const MAX_VALUE = 20000; // one entry (the saved game is the largest, a few kB)
export const MAX_CODE = 60000; // a link WhatsApp and the share sheets still carry whole

// What goes: every 'ayo.' entry of the storage but the ones kept out, as { name: value }.
export function gather(entries) {
  const out = {};
  for (const [k, v] of entries) {
    if (typeof k !== 'string' || !k.startsWith(PREFIX) || typeof v !== 'string') continue;
    const n = k.slice(PREFIX.length);
    if (!NAME.test(n) || KEEP_OUT.has(n) || v.length > MAX_VALUE) continue;
    if (n === 'game' && v === 'null') continue;
    out[n] = v;
  }
  return out;
}
export function storageEntries(ls) {
  const out = []; try { for (let i = 0; i < ls.length; i++) { const k = ls.key(i); out.push([k, ls.getItem(k)]); } } catch {}
  return out;
}

const b64u = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };
async function through(bytes, Stream) { const s = new Blob([bytes]).stream().pipeThrough(Stream); return new Uint8Array(await new Response(s).arrayBuffer()); }

// The code: 'z' + the JSON squeezed (deflate) where the browser can, else 'j' + the JSON; both base64url, safe after a #.
export async function pack(data, { at = Date.now(), CS = globalThis.CompressionStream } = {}) {
  const d = { ...data };
  const make = async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, at, d }));
    if (CS) { try { return 'z' + b64u(await through(bytes, new CS('deflate-raw'))); } catch {} }
    return 'j' + b64u(bytes);
  };
  let code = await make();
  if (code.length > MAX_CODE && d.game) { delete d.game; code = await make(); } // the game under way is the one thing left behind
  return code;
}
// Back from a code: { ok: true, data, at } or { ok: false, why: 'broken' | 'newer' | 'empty' }. Every entry is checked again.
export async function unpack(code, { DS = globalThis.DecompressionStream } = {}) {
  if (typeof code !== 'string' || code.length < 4 || code.length > MAX_CODE * 2 || !/^[zj][A-Za-z0-9_-]+$/.test(code)) return { ok: false, why: 'broken' };
  let s;
  try {
    let bytes = unb64u(code.slice(1));
    if (code[0] === 'z') { if (!DS) return { ok: false, why: 'broken' }; bytes = await through(bytes, new DS('deflate-raw')); }
    s = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return { ok: false, why: 'broken' }; }
  if (!s || typeof s !== 'object' || typeof s.d !== 'object' || !s.d) return { ok: false, why: 'broken' };
  if (s.v !== 1) return { ok: false, why: s.v > 1 ? 'newer' : 'broken' };
  const data = gather(Object.entries(s.d).map(([k, v]) => [PREFIX + k, v]));
  if (!Object.keys(data).length) return { ok: false, why: 'empty' };
  return { ok: true, data, at: Number.isFinite(s.at) ? s.at : null };
}

// The link: the game's own address with the code after the #. A pasted link or a bare code both come back as the code.
export function carryLink(base, code) { return String(base).split('#')[0] + '#' + KEY + '=' + code; }
export function codeFrom(text) {
  if (typeof text !== 'string') return null;
  const m = /(?:^|[#&?])carry=([zj][A-Za-z0-9_-]+)/.exec(text.trim()); if (m) return m[1];
  const t = text.trim(); return /^[zj][A-Za-z0-9_-]{3,}$/.test(t) ? t : null;
}
export function fromHash(hash) { const m = /^#?(?:.*&)?carry=([zj][A-Za-z0-9_-]+)/.exec(hash || ''); return m ? m[1] : null; }

const json = (v) => { try { return JSON.parse(v); } catch { return null; } };
// What a set of progress holds, in counts: days played, games against the computer, the rating (null before a rated game),
// puzzles solved, whether a game is under way.
export function summary(data) {
  const st = json(data.streak); const days = st && Array.isArray(st.days) ? st.days.length : 0;
  const rec = json(data.record); let games = 0;
  if (rec && typeof rec === 'object') for (const k of Object.keys(rec)) { const e = rec[k]; if (e && typeof e === 'object') for (const f of ['w', 'l', 'd']) if (Number.isInteger(e[f]) && e[f] > 0) games += e[f]; }
  const ra = json(data.rating); const rating = ra && Number.isInteger(ra.r) && Number.isInteger(ra.n) && ra.n > 0 ? ra.r : null;
  const dl = json(data.daily); const puzzles = dl && Array.isArray(dl.solved) ? dl.solved.length : 0;
  const g = json(data.game); const game = !!(g && Array.isArray(g.moves) && g.moves.length);
  return { days, games, rating, puzzles, game };
}
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
export function summaryWords(s) {
  const out = [n(s.days, 'day played', 'days played'), n(s.games, 'game', 'games')];
  if (s.rating !== null) out.push(`rating ${s.rating}`);
  if (s.puzzles) out.push(n(s.puzzles, 'puzzle solved', 'puzzles solved'));
  if (s.game) out.push('a game under way');
  return out.join(' · ');
}
export function whyWords(why) {
  return why === 'newer' ? 'That link comes from a newer version of the game — update this one first'
    : why === 'empty' ? 'That link carries no progress'
    : 'That is not a whole link — copy it again from the old phone';
}

// Bringing it in: the old phone's entries replace this phone's, but the days played and the puzzle days are put together
// (a day played on either phone counts), so a few days on the new phone are never lost. Returns { name: value } to write.
export function merge(here, there) {
  const out = { ...there };
  const a = json(here.streak), b = json(there.streak);
  if (a && b && Array.isArray(a.days) && Array.isArray(b.days)) {
    const u = (x, y) => [...new Set([...(x || []), ...(y || [])])].filter((d) => typeof d === 'string').sort();
    out.streak = JSON.stringify({ ...b, days: u(a.days, b.days), seen: u(a.seen, b.seen) });
  } else if (a && !b) out.streak = here.streak;
  const c = json(here.daily), d = json(there.daily);
  if (c && d && c.days && d.days && typeof c.days === 'object' && typeof d.days === 'object') {
    const days = { ...c.days };
    const score = (e) => (e && typeof e === 'object' ? (e.solved ? 1000 : 0) + (Number(e.got) || 0) : -1); // solved first, then the best capture
    for (const [k, v] of Object.entries(d.days)) { const h = days[k]; days[k] = score(h) > score(v) ? h : v; }
    out.daily = JSON.stringify({ ...d, days, solved: [...new Set([...(c.solved || []), ...(d.solved || [])])].sort() });
  } else if (c && !d) out.daily = here.daily;
  return out;
}
// Write into the storage. Entries this phone has that the old one did not (bar what is never carried) are left as they are.
export function apply(ls, writes) { let k = 0; for (const [name, v] of Object.entries(writes)) { try { ls.setItem(PREFIX + name, v); k++; } catch {} } return k; }

export function sentToast(how) { return how === 'copied' ? 'Link copied · open it on the new phone' : 'Open the link on the new phone'; }
export function broughtToast(s) { return `Brought across · ${summaryWords(s)}`; }
export const SEND_TEXT = 'My Ayo & Nchò progress · open this on the new phone to bring it across';
