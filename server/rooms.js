// Online rooms: two friends at one board, every move checked by the same rules engine the board animates.
// Pure logic, no network: server/index.js wires it to WebSockets, test/rooms.test.js drives it directly.
//
// A room has a four-letter code (no letters that read like each other), two seats (0 = the host, south;
// 1 = the friend, north) and one game. Each seat holds a secret token: a phone that loses signal sends the
// token back and gets its seat and the whole game again. Rooms nobody has touched for a while are swept.
//
// The door: whoever opens the invite link does not take the seat straight away. They KNOCK with their name
// (knock), the host sees who is asking and lets them in (admit) or not (refuse). A member who already holds a
// token never knocks again: rejoin() is theirs. Knocks that are not answered are held until the knocker goes
// away (withdraw) or the room is swept.
import { randomUUID } from "node:crypto";
import { newGame, applyMove, legalMoves, replay, RULES } from "../engine/ayo.js";
import { isShout, mayShout } from "../web/shouts.js";

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O: they read like 1 and 0 when a code is shouted across a room
export const CODE_LENGTH = 4;
export const SEAT_HOLD_MS = 10 * 60 * 1000;      // an empty room waits ten minutes for the friend before it is swept
export const IDLE_MS = 6 * 60 * 60 * 1000;      // a game nobody has touched for six hours is swept

export function makeCode(random = Math.random, length = CODE_LENGTH) {
  let s = "";
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return s;
}
export function normaliseCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, CODE_LENGTH);
}
const cleanName = (name, fallback) => { const s = String(name || "").replace(/\s+/g, " ").trim().slice(0, 24); return s || fallback; };

export class RoomError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const fail = (code, message) => { throw new RoomError(code, message); };

export class Rooms {
  constructor({ now = Date.now, random = Math.random, maxRooms = 2000 } = {}) {
    this.now = now; this.random = random; this.maxRooms = maxRooms;
    this.rooms = new Map();
  }

  get size() { return this.rooms.size; }

  // The host opens a room and takes seat 0. The friend's seat stays empty until join().
  create({ variant = "ncho", rules = {}, name } = {}) {
    if (this.rooms.size >= this.maxRooms) fail("full", "too many rooms open right now, try again in a minute");
    if (!RULES[variant]) fail("variant", "unknown game");
    let code; let tries = 0;
    do { code = makeCode(this.random); if (++tries > 500) fail("full", "no room codes left"); } while (this.rooms.has(code));
    const t = this.now();
    const room = {
      code, variant, rules: { ...RULES[variant], ...rules },
      seats: [{ token: randomUUID(), name: cleanName(name, "Host"), online: true, wantsRematch: false }, null],
      knocks: [], // people at the door, oldest first: {id, name, at}
      game: newGame(variant, rules), games: 0,
      createdAt: t, touchedAt: t,
    };
    this.rooms.set(code, room);
    return { code, token: room.seats[0].token, seat: 0, room: this.snapshot(code) };
  }

  // The friend joins by code and takes seat 1. A full room, or a code nobody opened, is refused.
  // (admit() is how the host's yes gets here; tests and trusted callers may seat a friend directly.)
  join(code, { name } = {}) {
    const room = this.get(code);
    if (room.seats[1]) fail("taken", "that room already has two players");
    room.seats[1] = { token: randomUUID(), name: cleanName(name, "Friend"), online: true, wantsRematch: false };
    room.touchedAt = this.now();
    return { code: room.code, token: room.seats[1].token, seat: 1, room: this.snapshot(code) };
  }

  // Someone opened the invite link: they knock with their name and wait for the host's yes. Returns what the
  // knocker may know: their knock id, the host's name and whether the host is at the board right now.
  knock(code, { name } = {}) {
    const room = this.get(code);
    if (room.seats[1]) fail("taken", "that room already has two players");
    if (room.knocks.length >= 20) fail("busy", "too many people at the door");
    const k = { id: randomUUID(), name: cleanName(name, "Friend"), at: this.now() };
    room.knocks.push(k); room.touchedAt = k.at;
    return { code: room.code, id: k.id, name: k.name, host: room.seats[0].name, hostOnline: room.seats[0].online };
  }
  // The knocker went away before being answered.
  withdraw(code, id) {
    const room = this.rooms.get(normaliseCode(code)); if (!room) return false;
    const i = room.knocks.findIndex((k) => k.id === id); if (i < 0) return false;
    room.knocks.splice(i, 1); return true;
  }
  // The host lets a knocker in: they take seat 1 and everyone else at the door is turned away (the room is full).
  admit(code, token, id) {
    const room = this.get(code);
    if (this.seatOf(room, token) !== 0) fail("host", "only the host decides who comes in");
    const i = room.knocks.findIndex((k) => k.id === id); if (i < 0) fail("noknock", "nobody is knocking with that name");
    const [k] = room.knocks.splice(i, 1);
    const seated = this.join(code, { name: k.name });
    const turnedAway = room.knocks.splice(0); // the seat is gone: the others at the door are told so
    return { ...seated, knock: { id: k.id, name: k.name }, turnedAway: turnedAway.map((x) => ({ id: x.id, name: x.name })) };
  }
  // The host says not now: the knock is dropped and the knocker is told.
  refuse(code, token, id) {
    const room = this.get(code);
    if (this.seatOf(room, token) !== 0) fail("host", "only the host decides who comes in");
    const i = room.knocks.findIndex((k) => k.id === id); if (i < 0) fail("noknock", "nobody is knocking with that name");
    const [k] = room.knocks.splice(i, 1); room.touchedAt = this.now();
    return { id: k.id, name: k.name };
  }

  // A phone that lost signal comes back with its token and gets its seat and the whole game.
  rejoin(code, token) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    room.seats[seat].online = true; room.touchedAt = this.now();
    return { code: room.code, token, seat, room: this.snapshot(code) };
  }

  // Presence: the server marks a seat offline when its socket closes; the other player sees it in the snapshot.
  setOnline(code, token, online) {
    const room = this.rooms.get(normaliseCode(code)); if (!room) return null;
    const seat = room.seats.findIndex((s) => s && s.token === token); if (seat < 0) return null;
    room.seats[seat].online = !!online; room.touchedAt = this.now();
    return seat;
  }

  // One move, checked by the engine: your seat must be the player to move and the pit must be legal.
  move(code, token, pit) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    if (!room.seats[1]) fail("waiting", "your friend has not joined yet");
    const g = room.game;
    if (g.over) fail("over", "the game is over");
    if (g.turn !== seat) fail("turn", "not your move");
    pit = Number(pit);
    if (!Number.isInteger(pit) || !legalMoves(g).includes(pit)) {
      const own = Number.isInteger(pit) && pit >= seat * 6 && pit < seat * 6 + 6 && g.pits[pit] > 0;
      fail("illegal", own ? "you must give the other side seeds" : "that pit cannot be played");
    }
    const { state, events } = applyMove(g, pit);
    room.game = state; room.touchedAt = this.now();
    return { seat, pit, events, state: publicState(state) };
  }

  // A shout across the board: one of the fixed phrases (web/shouts.js), by id only, one at a time per seat.
  shout(code, token, id) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    if (!room.seats[1]) fail("waiting", "your friend has not joined yet");
    if (!isShout(id)) fail("bad", "not a shout");
    const t = this.now();
    if (!mayShout(room.seats[seat].shoutAt, t)) fail("hush", "one shout at a time");
    room.seats[seat].shoutAt = t; room.touchedAt = t;
    return { seat, id };
  }

  // Play again at the same board: when both seats have asked, a fresh game starts (the loser of the last game moves first).
  rematch(code, token) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    room.seats[seat].wantsRematch = true; room.touchedAt = this.now();
    const both = room.seats[0] && room.seats[1] && room.seats[0].wantsRematch && room.seats[1].wantsRematch;
    if (!both) return { started: false, room: this.snapshot(code) };
    const g = newGame(room.variant, room.rules);
    g.turn = room.game.winner === 0 ? 1 : room.game.winner === 1 ? 0 : (room.games % 2); // the loser starts; after a draw, alternate
    room.game = g; room.games += 1;
    for (const s of room.seats) if (s) s.wantsRematch = false;
    return { started: true, room: this.snapshot(code) };
  }

  // What both players (and the invite page) may see: never the tokens.
  snapshot(code) {
    const room = this.get(code);
    return {
      code: room.code, variant: room.variant, rules: { ...room.rules }, games: room.games,
      players: room.seats.map((s, i) => s ? { seat: i, name: s.name, online: s.online, wantsRematch: s.wantsRematch } : null),
      knocks: room.knocks.map((k) => ({ id: k.id, name: k.name })), // who is at the door (the host's board shows them; never shown to the knockers)
      state: publicState(room.game),
    };
  }

  // Rooms are swept when the friend never came, or when nobody has moved for hours.
  sweep(now = this.now()) {
    const gone = [];
    for (const [code, room] of this.rooms) {
      const idle = now - room.touchedAt;
      if ((!room.seats[1] && idle > SEAT_HOLD_MS) || idle > IDLE_MS || (room.game.over && idle > SEAT_HOLD_MS && !room.seats.some((s) => s && s.online))) { this.rooms.delete(code); gone.push(code); }
    }
    return gone;
  }

  has(code) { return this.rooms.has(normaliseCode(code)); }
  get(code) { const room = this.rooms.get(normaliseCode(code)); if (!room) fail("notfound", "no room with that code"); return room; }
  seatOf(room, token) { const seat = room.seats.findIndex((s) => s && s.token === token); if (seat < 0) fail("token", "that seat is not yours"); return seat; }
}

// The game as the clients see it. moves lets a client rebuild the position with the shared engine (replay) and check it matches;
// quiet (moves since the last capture) is sent too, so a board that applies the next move itself ends a stalemate on the same move the server does.
export function publicState(g) {
  return { pits: g.pits.slice(), stores: g.stores.slice(), turn: g.turn, moves: g.moves.slice(), quiet: g.quiet || 0, over: g.over, winner: g.winner, variant: g.variant, rules: { ...g.rules } };
}

// What travels for a move: the seat, the pit, how many moves have been played and both scores — a few dozen bytes.
// Each board has the same engine and rebuilds the events and the position itself; the scores and the count let it
// check it agrees, and ask for the whole room ({t:"sync"}) if it does not. A relay turn's events alone can run to kilobytes.
export function moveMessage({ seat, pit, state }) {
  return { t: "move", seat, pit, n: state.moves.length, stores: state.stores.slice() };
}
export { replay };
