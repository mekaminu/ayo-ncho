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
//
// Surviving a restart (a deploy, or the free server going to sleep): rooms live in memory, so a restart forgets them. Every
// room therefore carries a random id (rid), each seat's token is made from the server secret, the code, the rid and the seat
// (so the server can make both again from those alone), and every change to the game is sealed: a short signature (sig) of
// the room's code, rid, game, rules, names, games played, who opened, the moves and who gave up, made with the secret. Each
// board keeps the latest sig with the moves it already holds (its "ticket"). A phone that comes back to a room the server no
// longer has sends its token and ticket with the rejoin; if the seal and the token check out, the room is rebuilt by replaying
// the moves through the engine, and the friend's token works again as before. The secret is ROOM_SECRET (Render makes it once,
// from render.yaml); without one a random secret is made at start, which only lasts as long as the process.
import { randomUUID, randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { newGame, applyMove, legalMoves, replay, resign, takeBack, mayTakeBack, agreeDraw, RULES } from "../engine/ayo.js";
import { isShout, mayShout } from "../web/shouts.js";
import { callMessage, passGate } from "../web/call.js";
import { cleanTag } from "../web/block.js";
import { isPeek, mayPeek, passPeek } from "../web/peek.js";

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

export const SIG_LENGTH = 12;    // base64url characters of the seal: 72 bits, checked only by the server, one guess per message
export const MAX_TICKET_MOVES = 2000;

// The signed form of a room: the same fields, in the same order, whether read from the server's room or from a board's ticket.
// An agreed draw adds one last field (1); every other room seals exactly as before, so tickets kept before draws existed still check.
export function sealText({ code, rid, variant, rules, games, names, first, moves, resigned, drawn }) {
  const r = {}; for (const k of Object.keys(rules || {}).sort()) r[k] = rules[k];
  const fields = [1, code, rid, variant, r, games, names, first, moves, resigned ?? null]; if (drawn) fields.push(1);
  return JSON.stringify(fields);
}
export class RoomError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const fail = (code, message) => { throw new RoomError(code, message); };

export class Rooms {
  constructor({ now = Date.now, random = Math.random, maxRooms = 2000, secret } = {}) {
    this.now = now; this.random = random; this.maxRooms = maxRooms;
    this.secret = secret ? String(secret) : randomBytes(32).toString("hex"); this.lasting = !!secret;
    this.rooms = new Map();
  }

  get size() { return this.rooms.size; }

  mac(text) { return createHmac("sha256", this.secret).update(text).digest("base64url"); }
  tokenFor(code, rid, seat) { return this.mac(`seat|${code}|${rid}|${seat}`).slice(0, 32); }
  seal(room) { return this.mac(sealText(this.sealFields(room))).slice(0, SIG_LENGTH); }
  sealFields(room) {
    const g = room.game;
    return { code: room.code, rid: room.rid, variant: room.variant, rules: room.rules, games: room.games, names: room.seats.map((s) => (s ? s.name : null)), first: g.first ?? 0, moves: g.moves, resigned: g.resigned ?? null, drawn: !!g.agreed };
  }

  // The host opens a room and takes seat 0. The friend's seat stays empty until join().
  create({ variant = "ncho", rules = {}, name, tag } = {}) {
    if (this.rooms.size >= this.maxRooms) fail("full", "too many rooms open right now, try again in a minute");
    if (!RULES[variant]) fail("variant", "unknown game");
    let code; let tries = 0;
    do { code = makeCode(this.random); if (++tries > 500) fail("full", "no room codes left"); } while (this.rooms.has(code));
    const t = this.now(); const rid = randomBytes(9).toString("base64url");
    const room = {
      code, rid, variant, rules: { ...RULES[variant], ...rules },
      seats: [{ token: this.tokenFor(code, rid, 0), name: cleanName(name, "Host"), tag: cleanTag(tag), online: true, wantsRematch: false }, null],
      knocks: [], // people at the door, oldest first: {id, name, tag, at}
      game: newGame(variant, rules), games: 0,
      createdAt: t, touchedAt: t,
    };
    this.rooms.set(code, room);
    return { code, token: room.seats[0].token, seat: 0, room: this.snapshot(code) };
  }

  // The friend joins by code and takes seat 1. A full room, or a code nobody opened, is refused.
  // (admit() is how the host's yes gets here; tests and trusted callers may seat a friend directly.)
  join(code, { name, tag } = {}) {
    const room = this.get(code);
    if (room.seats[1]) fail("taken", "that room already has two players");
    room.seats[1] = { token: this.tokenFor(room.code, room.rid, 1), name: cleanName(name, "Friend"), tag: cleanTag(tag), online: true, wantsRematch: false };
    room.touchedAt = this.now();
    return { code: room.code, token: room.seats[1].token, seat: 1, room: this.snapshot(code) };
  }

  // Someone opened the invite link: they knock with their name and wait for the host's yes. Returns what the
  // knocker may know: their knock id, the host's name and whether the host is at the board right now.
  // tag: the knocker's phone tag (web/block.js), shown to the host so a phone that blocked it turns the knock away by itself;
  // hostTag goes back to the knocker, so a phone that blocked the host says so instead of knocking.
  knock(code, { name, tag } = {}) {
    const room = this.get(code);
    if (room.seats[1]) fail("taken", "that room already has two players");
    if (room.knocks.length >= 20) fail("busy", "too many people at the door");
    const k = { id: randomUUID(), name: cleanName(name, "Friend"), tag: cleanTag(tag), at: this.now() };
    room.knocks.push(k); room.touchedAt = k.at;
    return { code: room.code, id: k.id, name: k.name, ...(k.tag ? { tag: k.tag } : {}), host: room.seats[0].name, ...(room.seats[0].tag ? { hostTag: room.seats[0].tag } : {}), hostOnline: room.seats[0].online };
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
    const seated = this.join(code, { name: k.name, tag: k.tag });
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
  // With a ticket (what the board holds of the room, sealed by this server), a room the server has forgotten — a restart, a
  // deploy — is rebuilt first (restored: true). A room rebuilt from an older ticket, before anyone has played in it, takes a
  // newer one from the other phone (upgraded: true, and the other board is sent the room).
  // tag: the phone's tag again (a room rebuilt after a restart has lost it; an older phone sends none).
  rejoin(code, token, ticket, tag) {
    code = normaliseCode(code);
    let restored = false, upgraded = false;
    if (!this.rooms.has(code) && ticket) { this.restore(code, token, ticket); restored = true; }
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    if (!restored && ticket && room.restored) upgraded = this.upgrade(room, ticket);
    room.seats[seat].online = true; room.touchedAt = this.now();
    const t = cleanTag(tag); if (t) room.seats[seat].tag = t;
    return { code: room.code, token, seat, room: this.snapshot(code), restored, upgraded };
  }

  // Checks a ticket against its seal and rebuilds the game from it with the engine. Throws "notfound" for anything that does not
  // check out, so a forged, damaged or foreign ticket looks exactly like a room that is gone.
  checkTicket(code, ticket) {
    const gone = () => fail("notfound", "no room with that code");
    const t = ticket;
    if (!t || typeof t !== "object" || typeof t.sig !== "string" || t.sig.length !== SIG_LENGTH || typeof t.rid !== "string" || !/^[A-Za-z0-9_-]{8,40}$/.test(t.rid)) gone();
    if (!RULES[t.variant] || !t.rules || typeof t.rules !== "object" || Array.isArray(t.rules)) gone();
    if (!Number.isInteger(t.games) || t.games < 0 || ![0, 1].includes(t.first) || ![null, 0, 1].includes(t.resigned ?? null) || ![undefined, false, true].includes(t.drawn)) gone();
    if (!Array.isArray(t.names) || t.names.length !== 2 || typeof t.names[0] !== "string" || !(t.names[1] === null || typeof t.names[1] === "string")) gone();
    if (!Array.isArray(t.moves) || t.moves.length > MAX_TICKET_MOVES || !t.moves.every((m) => Number.isInteger(m) && m >= 0 && m < 12)) gone();
    const fields = { code, rid: t.rid, variant: t.variant, rules: t.rules, games: t.games, names: t.names, first: t.first, moves: t.moves, resigned: t.resigned ?? null, drawn: !!t.drawn };
    if (fields.drawn && fields.resigned !== null) gone();
    const want = Buffer.from(this.mac(sealText(fields)).slice(0, SIG_LENGTH)), got = Buffer.from(t.sig);
    if (want.length !== got.length || !timingSafeEqual(want, got)) gone();
    let game;
    try {
      game = newGame(t.variant, t.rules, t.first);
      for (const m of t.moves) { if (game.over || !legalMoves(game).includes(m)) gone(); game = applyMove(game, m).state; }
      if (fields.resigned !== null) { if (game.over) gone(); game = resign(game, fields.resigned).state; }
      if (fields.drawn) { if (game.over) gone(); game = agreeDraw(game).state; }
    } catch (e) { if (e instanceof RoomError) throw e; gone(); }
    return { fields, game };
  }
  restore(code, token, ticket) {
    if (this.rooms.size >= this.maxRooms) fail("full", "too many rooms open right now, try again in a minute");
    const { fields: f, game } = this.checkTicket(code, ticket);
    const seat = [0, 1].find((i) => (i === 0 || f.names[1] !== null) && this.tokenFor(code, f.rid, i) === token);
    if (seat === undefined) fail("notfound", "no room with that code");
    const t = this.now();
    const room = {
      code, rid: f.rid, variant: f.variant, rules: { ...f.rules },
      seats: f.names.map((name, i) => (name === null ? null : { token: this.tokenFor(code, f.rid, i), name, online: false, wantsRematch: false })),
      knocks: [], game, games: f.games, ask: null, drawAsk: null,
      createdAt: t, touchedAt: t, restored: true,
    };
    this.rooms.set(code, room);
    return room;
  }
  // A newer ticket for a room rebuilt from an older one, while nothing has been played in it since: the later game wins.
  upgrade(room, ticket) {
    let checked; try { checked = this.checkTicket(room.code, ticket); } catch { return false; }
    const { fields: f, game } = checked; const cur = room.game;
    if (f.rid !== room.rid) return false;
    const extends_ = f.moves.length >= cur.moves.length && cur.moves.every((m, i) => f.moves[i] === m);
    const newer = f.games > room.games || (f.games === room.games && extends_ && (f.moves.length > cur.moves.length || (f.resigned !== null && (cur.resigned ?? null) === null) || (f.drawn && !cur.agreed)));
    if (!newer) return false;
    room.game = game; room.games = f.games; room.ask = null; room.drawAsk = null;
    if (!room.seats[1] && f.names[1] !== null) room.seats[1] = { token: this.tokenFor(room.code, room.rid, 1), name: f.names[1], online: false, wantsRematch: false };
    return true;
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
    room.game = state; room.touchedAt = this.now(); room.ask = null; room.restored = false; // playing on is a no to any "take it back?" still asked
    if (room.drawAsk) { if (room.drawAsk.seat === seat) room.drawAsk.n = state.moves.length; else room.drawAsk = null; } // a draw offered stands through the offerer's own move; the friend playing on is a no

    return { seat, pit, events, state: publicState(state), sig: this.seal(room) };
  }

  // Giving up: either seat may end the game it is in, on either player's move; the other seat wins whatever the score.
  // The rematch that follows is opened by whoever gave up (the loser starts).
  resign(code, token) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    if (!room.seats[1]) fail("waiting", "your friend has not joined yet");
    if (room.game.over) fail("over", "the game is over");
    const { state } = resign(room.game, seat);
    room.game = state; room.touchedAt = this.now(); room.ask = null; room.drawAsk = null; room.restored = false;
    return { seat, state: publicState(state), sig: this.seal(room) };
  }

  // "Offer a draw": either seat may offer, on either player's move, once per move played; the friend agrees (the game ends level
  // with the engine, whatever the score) or plays on. The offer stands through the offerer's own move; the friend moving is a no.
  offerDraw(code, token) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    if (!room.seats[1]) fail("waiting", "your friend has not joined yet");
    const g = room.game;
    if (g.over) fail("over", "the game is over");
    if (room.drawAsk) fail(room.drawAsk.seat === seat ? "offered" : "theyoffered", room.drawAsk.seat === seat ? "already offered — waiting for an answer" : "your friend has offered a draw — answer it");
    const n = g.moves.length;
    if (room.seats[seat].drawN === n) fail("offeredonce", "you have offered once at this move");
    room.drawAsk = { seat, n }; room.seats[seat].drawN = n; room.touchedAt = this.now();
    return { seat, n };
  }
  answerDraw(code, token, yes) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    const ask = room.drawAsk;
    if (!ask || ask.n !== room.game.moves.length || room.game.over) { room.drawAsk = null; fail("nodraw", "no draw to answer"); }
    if (ask.seat === seat) fail("owndraw", "your friend answers this one");
    room.drawAsk = null; room.touchedAt = this.now();
    if (!yes) return { seat: ask.seat, yes: false, n: ask.n };
    room.game = agreeDraw(room.game).state; room.ask = null; room.restored = false;
    return { seat: ask.seat, yes: true, n: room.game.moves.length, state: publicState(room.game), sig: this.seal(room) };
  }

  // "Take it back?": the seat that has just moved asks to take that move back; the friend says yes (the move is undone
  // with the engine, and it is the asker's move again) or no. Once per move: a no, or the friend playing on, ends it.
  askBack(code, token) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    if (!room.seats[1]) fail("waiting", "your friend has not joined yet");
    const g = room.game;
    if (g.over) fail("over", "the game is over");
    if (!mayTakeBack(g, seat)) fail("noback", "only the move you just played can be taken back");
    if (room.ask) fail("asked", "already asked — waiting for an answer");
    const n = g.moves.length;
    if (room.seats[seat].backN === n) fail("askedonce", "you have asked once for this move");
    room.ask = { seat, n }; room.seats[seat].backN = n; room.touchedAt = this.now();
    return { seat, n };
  }
  answerBack(code, token, yes) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    const ask = room.ask;
    if (!ask || ask.n !== room.game.moves.length || room.game.over) { room.ask = null; fail("noask", "nothing to answer — they played on"); }
    if (ask.seat === seat) fail("ownask", "your friend answers this one");
    room.ask = null; room.touchedAt = this.now();
    if (!yes) return { seat: ask.seat, yes: false, n: ask.n };
    room.game = takeBack(room.game, ask.seat); room.restored = false; room.drawAsk = null;
    return { seat: ask.seat, yes: true, n: room.game.moves.length, state: publicState(room.game), sig: this.seal(room) };
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

  // Their hand over the board (web/peek.js): the pit the seat to move has picked (its first tap), or -1 when it is put back,
  // passed to the OTHER seat only. Only on its own move, only a pit the engine lets it play; nothing is kept but the gate.
  // Returns {seat, to, pit, n}; index.js sends it to the sockets of seat `to`.
  peek(code, token, pit) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    if (!room.seats[1]) fail("waiting", "your friend has not joined yet");
    if (!isPeek(pit)) fail("bad", "not a pit");
    if (!mayPeek(room.game, seat, pit)) fail("notnow", "not your move");
    const me = room.seats[seat]; if (!me.peekGate) me.peekGate = {};
    if (!passPeek(me.peekGate, pit, this.now())) fail("slow", "slow down a moment");
    return { seat, to: 1 - seat, pit, n: room.game.moves.length };
  }

  // Video and voice at the board (web/call.js): a call message from one seated player, passed to the OTHER seat only.
  // The server checks its shape and size and rate-limits each seat; it keeps none of it (no picture or sound ever comes
  // here — that goes phone to phone). Returns {seat, to, kind, data}; index.js sends it to the sockets of seat `to`.
  call(code, token, kind, data) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    if (!room.seats[1]) fail("waiting", "your friend has not joined yet");
    const clean = callMessage(kind, data);
    if (!clean) fail("bad", "not a call message");
    const to = 1 - seat;
    if (kind === "ask" && !room.seats[to].online) fail("away", "your friend is not at the board right now");
    const me = room.seats[seat]; if (!me.callGate) me.callGate = {};
    if (!passGate(me.callGate, kind, this.now())) fail("slow", "slow down a moment");
    if (kind === "ask") room.touchedAt = this.now();
    return { seat, to, kind, data: clean };
  }

  // Play again at the same board: when both seats have asked, a fresh game starts (the loser of the last game moves first).
  rematch(code, token) {
    const room = this.get(code);
    const seat = this.seatOf(room, token);
    room.seats[seat].wantsRematch = true; room.touchedAt = this.now();
    const both = room.seats[0] && room.seats[1] && room.seats[0].wantsRematch && room.seats[1].wantsRematch;
    if (!both) return { started: false, room: this.snapshot(code) };
    const g = newGame(room.variant, room.rules);
    g.turn = g.first = room.game.winner === 0 ? 1 : room.game.winner === 1 ? 0 : (room.games % 2); // the loser starts; after a draw, alternate
    room.game = g; room.games += 1; room.ask = null; room.drawAsk = null; room.restored = false;
    for (const s of room.seats) if (s) { s.wantsRematch = false; s.backN = null; s.drawN = null; }
    return { started: true, room: this.snapshot(code) };
  }

  // What both players (and the invite page) may see: never the tokens.
  snapshot(code) {
    const room = this.get(code);
    return {
      code: room.code, variant: room.variant, rules: { ...room.rules }, games: room.games,
      players: room.seats.map((s, i) => s ? { seat: i, name: s.name, ...(s.tag ? { tag: s.tag } : {}), online: s.online, wantsRematch: s.wantsRematch } : null), // tag: each phone's random tag, for block (web/block.js)
      knocks: room.knocks.map((k) => ({ id: k.id, name: k.name, ...(k.tag ? { tag: k.tag } : {}) })), // who is at the door (the host's board shows them; never shown to the knockers)
      ask: room.ask ? { seat: room.ask.seat, n: room.ask.n } : null, // a "take it back?" waiting for its answer (a rejoin sees it)
      drawAsk: room.drawAsk ? { seat: room.drawAsk.seat, n: room.drawAsk.n } : null, // a draw offered and not yet answered
      state: publicState(room.game),
      rid: room.rid, sig: this.seal(room), // the board keeps these with the moves, so the room can be rebuilt after a restart (ticketOf in web/online.js)
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
  return { pits: g.pits.slice(), stores: g.stores.slice(), turn: g.turn, moves: g.moves.slice(), quiet: g.quiet || 0, over: g.over, winner: g.winner, resigned: g.resigned ?? null, ...(g.agreed ? { agreed: true } : {}), first: g.first ?? 0, variant: g.variant, rules: { ...g.rules } };
}

// What travels for a move: the seat, the pit, how many moves have been played and both scores — a few dozen bytes.
// Each board has the same engine and rebuilds the events and the position itself; the scores and the count let it
// check it agrees, and ask for the whole room ({t:"sync"}) if it does not. A relay turn's events alone can run to kilobytes.
// sig is the room's new seal (a dozen characters), so each board can keep a ticket that rebuilds the room after a restart.
export function moveMessage({ seat, pit, state, sig }) {
  const m = { t: "move", seat, pit, n: state.moves.length, stores: state.stores.slice() }; if (sig) m.sig = sig; return m;
}
// Giving up travels as small as a move: the seat and how many moves had been played (a board that disagrees asks for the room).
export function resignMessage({ seat, state, sig }) {
  const m = { t: "resign", seat, n: state.moves.length }; if (sig) m.sig = sig; return m;
}
// "Take it back?" travels as small: who asked (or whose move went back) and the move count.
export function backMessage({ seat, yes, n, sig }) { return yes === undefined ? { t: "askback", seat, n } : yes ? { t: "takeback", seat, n, ...(sig ? { sig } : {}) } : { t: "backno", seat, n }; }
// "Offer a draw" travels as small: who offered and the move count; a yes says the game ended level, a no that it plays on.
export function drawMessage({ seat, yes, n, sig }) { return yes === undefined ? { t: "drawoffer", seat, n } : yes ? { t: "draw", seat, n, ...(sig ? { sig } : {}) } : { t: "drawno", seat, n }; }
export { replay };
