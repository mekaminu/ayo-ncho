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
