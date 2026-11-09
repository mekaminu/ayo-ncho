// Back to your game (idea 8 Nov): a game with a friend lives on the server and this phone keeps its seat (the room's code, the
// seat's token and the ticket that can rebuild the room, prefs 'room'), but the way back to it was the room's address — a
// reload of the page came back to the board, while opening the game again did not. The store apps always open at the start
// (and Android closes an app it needs the memory of, often while you are in WhatsApp sending the invite), and the game
// installed from the web link opens at its start too: Home came up as if there were no game, and the friend sat waiting.
// Now, while this phone holds a seat in a game still in play, Home carries one brass line — "Back to your game with Tete ·
// your move" — and a tap takes you straight back to that seat (the same rejoin a reload makes). Leaving the room on purpose
// (Home on the board) still forgets the seat, as before, so the line is only there for a game left by accident.
// Pure functions, no DOM: game.js keeps the seat and asks what Home should say. Whether the game is still on is read from the
// ticket's own moves, replayed through the engine (never worked out here).
import { newGame, applyMove, resign, agreeDraw, RULES } from '../engine/ayo.js';

export const OFFER_MS = 2 * 24 * 60 * 60 * 1000; // a seat kept longer than two days is not offered (the friend has gone)
const CODE = /^[A-Z]{4}$/;

// what to keep for a seat: the code, the token, the seat (so whose move it is can be said), when, and the ticket if there is one
export function keepSeat({ code, token, seat, ticket = null, at = Date.now() }) {
  const k = { code, token, at }; if (seat === 0 || seat === 1) k.seat = seat; if (ticket) k.ticket = ticket; return k;
}

// the game a ticket holds, through the engine; null for anything that does not replay
export function ticketGame(ticket) {
  const t = ticket;
  if (!t || typeof t !== 'object' || !RULES[t.variant] || !Array.isArray(t.moves) || ![0, 1].includes(t.first ?? 0)) return null;
  try {
    let g = newGame(t.variant, t.rules || {}, t.first ?? 0);
    for (const m of t.moves) { if (g.over) return null; g = applyMove(g, m).state; }
    if ((t.resigned ?? null) !== null && !g.over) g = resign(g, t.resigned).state;
    if (t.drawn && !g.over) g = agreeDraw(g).state;
    return g;
  } catch { return null; }
}

// what Home offers, from the kept seat: null (nothing to go back to) or {code, name, mine, moves}
//   name: the friend's name from the ticket (null without one); mine: true / false whose move it is (null when not known)
export function roomOffer(saved, { now = Date.now(), online = false } = {}) {
  if (online || !saved || typeof saved !== 'object') return null;
  const { code, token, at, seat, ticket } = saved;
  if (typeof code !== 'string' || !CODE.test(code) || typeof token !== 'string' || !token) return null;
  if (!Number.isFinite(at) || at > now + 60_000 || now - at > OFFER_MS) return null; // a seat kept before this line existed, or long ago
  if (!ticket) return { code, name: null, mine: null, moves: null };
  const g = ticketGame(ticket); if (!g || g.over) return null; // the game ended (or the ticket is not one): nothing waits
  const names = Array.isArray(ticket.names) ? ticket.names : [];
  const known = seat === 0 || seat === 1;
  const name = known ? names[1 - seat] : null;
  if (known && (typeof name !== 'string' || !name)) return null; // nobody ever sat down opposite: an empty room, not a game
  return { code, name: known ? name : null, mine: known ? g.turn === seat : null, moves: g.moves.length };
}

// the line on Home
export function offerWords(o) {
  if (!o) return '';
  const who = o.name ? `Back to your game with ${o.name}` : `Back to your game in room ${o.code}`;
  return o.mine === true ? `${who} · your move` : o.mine === false ? `${who} · their move` : who;
}

// Every game with a friend kept (idea 9 Nov): the phone kept one seat (prefs 'room'), so opening a cousin's invite while a game
// with your sister was still on wrote over her seat — Home could only ever offer the newest game, and the sister waited at a
// board nobody would come back to. Now every seat lives in a short list (prefs 'seats', newest first, SEATS_MAX at most), the
// one at the board is still prefs 'room' (a reload's rejoin reads it as before), and Home offers up to SHOWN games still in
// play — yours to move first, then the newest. Leaving a room on purpose forgets only that room's seat.
export const SEATS_MAX = 4;
export const SHOWN = 2;
const seatShaped = (s) => !!s && typeof s === 'object' && typeof s.code === 'string' && CODE.test(s.code) && typeof s.token === 'string' && !!s.token;

// the list, from what storage holds: anything that is not a seat is dropped, one seat a room (the newest), newest first; a seat
// kept by a build before the list (prefs 'room' only) joins it
export function readSeats(list, current = null) {
  const all = (Array.isArray(list) ? list : []).concat(current ? [current] : []).filter(seatShaped);
  const by = new Map();
  for (const s of all) { const had = by.get(s.code); if (!had || (Number(s.at) || 0) > (Number(had.at) || 0)) by.set(s.code, s); }
  return [...by.values()].sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0)).slice(0, SEATS_MAX);
}

// a seat kept (joined, or a new ticket): it replaces that room's seat and goes to the front; the same seat without a ticket
// keeps the ticket it had, so Home can still say whose move it is before the next ticket comes
export function keepIn(list, seat) {
  if (!seatShaped(seat)) return readSeats(list);
  const had = readSeats(list).find((s) => s.code === seat.code);
  const s = !seat.ticket && had && had.token === seat.token && had.ticket ? { ...seat, ticket: had.ticket } : seat;
  return [s].concat(readSeats(list).filter((x) => x.code !== seat.code)).slice(0, SEATS_MAX);
}

// a room left on purpose (or whose seat the server no longer knows): only that seat goes
export function dropFrom(list, code) { return readSeats(list).filter((s) => s.code !== code); }

// what Home offers: every kept seat in a game still in play, yours to move first, then the newest; SHOWN at most
export function roomOffers(list, { now = Date.now(), online = false, max = SHOWN } = {}) {
  if (online) return [];
  const out = [];
  for (const s of readSeats(list)) { const o = roomOffer(s, { now }); if (o) out.push({ ...o, at: s.at }); }
  const rank = (o) => (o.mine === true ? 0 : o.mine === null ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || b.at - a.at).slice(0, max);
}
