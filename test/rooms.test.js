import { test } from "node:test";
import assert from "node:assert/strict";
import { Rooms, RoomError, makeCode, normaliseCode, CODE_ALPHABET, CODE_LENGTH, SEAT_HOLD_MS, IDLE_MS } from "../server/rooms.js";
import { replay, legalMoves, applyMove, totalSeeds } from "../engine/ayo.js";

const seeded = (seed = 7) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const clock = (t = 1_000_000) => ({ now: () => t, set: (v) => { t = v; }, tick: (ms) => { t += ms; } });

test("room codes are four shoutable letters: no I or O, uppercased and cleaned on the way in", () => {
  for (let i = 0; i < 200; i++) {
    const c = makeCode(Math.random);
    assert.equal(c.length, CODE_LENGTH);
    for (const ch of c) assert.ok(CODE_ALPHABET.includes(ch), ch);
    assert.ok(!/[IO]/.test(c));
  }
  assert.equal(normaliseCode(" ok-we "), "OKWE");
  assert.equal(normaliseCode("okwe1234"), "OKWE");
});

test("host opens a room, the friend joins by code, a third person is turned away", () => {
  const rooms = new Rooms({ random: seeded() });
  const host = rooms.create({ name: "Meka" });
  assert.equal(host.seat, 0);
  assert.equal(host.room.players[1], null);
  const friend = rooms.join(host.code.toLowerCase(), { name: "Tete" });
  assert.equal(friend.seat, 1);
  assert.notEqual(friend.token, host.token);
  assert.deepEqual(rooms.snapshot(host.code).players.map((p) => p.name), ["Meka", "Tete"]);
  assert.throws(() => rooms.join(host.code, { name: "Ada" }), (e) => e instanceof RoomError && e.code === "taken");
  assert.throws(() => rooms.join("ZZZZ"), (e) => e.code === "notfound");
  assert.ok(!JSON.stringify(rooms.snapshot(host.code)).includes(host.token), "tokens never leave in a snapshot");
});

test("the door: a knock is not a seat; only the host lets people in; the first let in takes the seat and the rest are turned away", () => {
  const c = clock(); const rooms = new Rooms({ random: seeded(5), now: c.now });
  const host = rooms.create({ name: "Meka" });
  const ada = rooms.knock(host.code.toLowerCase(), { name: "  Ada   Obi " });
  assert.equal(ada.name, "Ada Obi"); assert.equal(ada.host, "Meka"); assert.equal(ada.hostOnline, true); assert.ok(ada.id);
  assert.equal(rooms.snapshot(host.code).players[1], null, "knocking does not take the seat");
  assert.deepEqual(rooms.snapshot(host.code).knocks, [{ id: ada.id, name: "Ada Obi" }]);
  const bola = rooms.knock(host.code, { name: "Bola" });
  assert.equal(rooms.snapshot(host.code).knocks.length, 2);
  // a knocker cannot let anyone in, and nobody but the host can
  assert.throws(() => rooms.admit(host.code, "nope", ada.id), (e) => e.code === "token");
  // not now: Ada is dropped from the door and told so by the caller
  assert.deepEqual(rooms.refuse(host.code, host.token, ada.id), { id: ada.id, name: "Ada Obi" });
  assert.throws(() => rooms.refuse(host.code, host.token, ada.id), (e) => e.code === "noknock");
  // Chidi knocks too; the host lets Bola in: Bola takes seat 1 and Chidi is turned away with the full room
  const chidi = rooms.knock(host.code, { name: "Chidi" });
  const r = rooms.admit(host.code, host.token, bola.id);
  assert.equal(r.seat, 1); assert.ok(r.token); assert.deepEqual(r.knock, { id: bola.id, name: "Bola" }); assert.deepEqual(r.turnedAway, [{ id: chidi.id, name: "Chidi" }]);
  assert.deepEqual(rooms.snapshot(host.code).players.map((p) => p.name), ["Meka", "Bola"]); assert.deepEqual(rooms.snapshot(host.code).knocks, []);
  assert.throws(() => rooms.knock(host.code, { name: "Dayo" }), (e) => e.code === "taken");
  // the friend, once let in, never knocks again: the token rejoins; the host answering the door as the friend is refused
  assert.equal(rooms.rejoin(host.code, r.token).seat, 1);
  assert.throws(() => rooms.admit(host.code, r.token, "x"), (e) => e.code === "host");
  // a knock keeps the room alive: an unjoined room with someone at the door is not swept as abandoned
  const h2 = rooms.create({ name: "Ngozi" }); c.tick(SEAT_HOLD_MS - 1000); rooms.knock(h2.code, { name: "Emeka" }); c.tick(SEAT_HOLD_MS - 1000);
  assert.deepEqual(rooms.sweep(), []); c.tick(2000); assert.deepEqual(rooms.sweep(), [h2.code]);
  assert.equal(rooms.withdraw(h2.code, "gone"), false);
});

test("two rooms never share a code; names are trimmed and bounded", () => {
  const rooms = new Rooms({ random: seeded(3) });
  const codes = new Set();
  for (let i = 0; i < 300; i++) codes.add(rooms.create().code);
  assert.equal(codes.size, 300);
  const r = rooms.create({ name: "   a very long name that goes on and on and on   " });
  assert.equal(r.room.players[0].name, "a very long name that go");
  assert.equal(rooms.create({ name: "   " }).room.players[0].name, "Host");
});

test("moves go through the engine: only the player to move, only legal pits, and the state replays exactly", () => {
  const rooms = new Rooms({ random: seeded() });
  const host = rooms.create({ name: "Meka" });
  assert.throws(() => rooms.move(host.code, host.token, 0), (e) => e.code === "waiting");
  const friend = rooms.join(host.code, { name: "Tete" });
  assert.throws(() => rooms.move(host.code, friend.token, 6), (e) => e.code === "turn");
  assert.throws(() => rooms.move(host.code, host.token, 6), (e) => e.code === "illegal");
  assert.throws(() => rooms.move(host.code, host.token, "x"), (e) => e.code === "illegal");
  assert.throws(() => rooms.move(host.code, "not-a-token", 0), (e) => e.code === "token");
  const r = rooms.move(host.code, host.token, 2);
  assert.equal(r.seat, 0); assert.equal(r.pit, 2);
  assert.equal(r.events[0].type, "pickup");
  assert.equal(r.state.turn, 1);
  // play a whole game, each side picking its first legal pit, and check the room's state is what the engine says
  let snap = rooms.snapshot(host.code); let moves = snap.state.moves.slice(); let n = 0;
  while (!snap.state.over && n++ < 400) {
    const g = replay(moves, snap.variant, snap.rules);
    const m = legalMoves(g)[0];
    const tok = g.turn === 0 ? host.token : friend.token;
    const out = rooms.move(host.code, tok, m);
    moves.push(m); snap = rooms.snapshot(host.code);
    assert.deepEqual(out.state.pits, replay(moves, snap.variant, snap.rules).pits);
  }
  assert.ok(snap.state.over, "the game ended");
  assert.equal(totalSeeds(snap.state), 48);
  assert.throws(() => rooms.move(host.code, host.token, 0), (e) => e.code === "over");
});

test("a dropped phone comes back with its token and finds its seat and the game; a wrong token is refused", () => {
  const rooms = new Rooms({ random: seeded() });
  const host = rooms.create({ name: "Meka" }); const friend = rooms.join(host.code, { name: "Tete" });
  rooms.move(host.code, host.token, 0);
  assert.equal(rooms.setOnline(host.code, friend.token, false), 1);
  assert.equal(rooms.snapshot(host.code).players[1].online, false);
  const back = rooms.rejoin(host.code, friend.token);
  assert.equal(back.seat, 1);
  assert.equal(back.room.players[1].online, true);
  assert.deepEqual(back.room.state.moves, [0]);
  assert.equal(back.room.state.turn, 1);
  assert.throws(() => rooms.rejoin(host.code, "nope"), (e) => e.code === "token");
  assert.equal(rooms.setOnline(host.code, "nope", true), null);
  assert.equal(rooms.setOnline("QQQQ", host.token, true), null);
});

test("rematch starts a fresh game only when both have asked, and the loser moves first", () => {
  const rooms = new Rooms({ random: seeded() });
  const host = rooms.create({ name: "Meka" }); const friend = rooms.join(host.code, { name: "Tete" });
  // play to the end
  let snap = rooms.snapshot(host.code); let n = 0;
  while (!snap.state.over && n++ < 400) { const g = replay(snap.state.moves, snap.variant, snap.rules); rooms.move(host.code, g.turn === 0 ? host.token : friend.token, legalMoves(g)[0]); snap = rooms.snapshot(host.code); }
  const winner = snap.state.winner;
  let r = rooms.rematch(host.code, host.token);
  assert.equal(r.started, false); assert.equal(r.room.players[0].wantsRematch, true);
  assert.ok(rooms.snapshot(host.code).state.over, "still the finished game until both agree");
  r = rooms.rematch(host.code, friend.token);
  assert.equal(r.started, true);
  assert.equal(r.room.games, 1);
  assert.deepEqual(r.room.state.moves, []);
  assert.equal(r.room.state.over, false);
  if (winner === 0 || winner === 1) assert.equal(r.room.state.turn, 1 - winner);
  assert.equal(r.room.players[0].wantsRematch, false);
});

test("the room keeps the rules it was opened with: Ayo with a custom switch stays that way", () => {
  const rooms = new Rooms({ random: seeded() });
  const host = rooms.create({ variant: "ayo", rules: { last8: true }, name: "Meka" });
  const snap = rooms.snapshot(host.code);
  assert.equal(snap.variant, "ayo"); assert.equal(snap.rules.capture, 23); assert.equal(snap.rules.last8, true);
  assert.throws(() => rooms.create({ variant: "oware" }), (e) => e.code === "variant");
});

test("sweeping: an unjoined room goes after ten minutes, a quiet game after six hours, a live game stays", () => {
  const c = clock(); const rooms = new Rooms({ random: seeded(), now: c.now });
  const lonely = rooms.create({ name: "Meka" });
  const pair = rooms.create({ name: "A" }); rooms.join(pair.code, { name: "B" });
  c.tick(SEAT_HOLD_MS - 1); assert.deepEqual(rooms.sweep(), []);
  c.tick(2); assert.deepEqual(rooms.sweep(), [lonely.code]);
  assert.ok(rooms.has(pair.code));
  c.tick(IDLE_MS - SEAT_HOLD_MS - 1000); assert.deepEqual(rooms.sweep(), []);
  rooms.move(pair.code, pair.token, 0); // a move keeps it alive
  c.tick(IDLE_MS - 1000); assert.deepEqual(rooms.sweep(), []);
  c.tick(2000); assert.deepEqual(rooms.sweep(), [pair.code]);
  assert.equal(rooms.size, 0);
});

test("a finished game with nobody at the board is swept after the seat hold", () => {
  const c = clock(); const rooms = new Rooms({ random: seeded(), now: c.now });
  const host = rooms.create({ name: "A" }); const friend = rooms.join(host.code, { name: "B" });
  let snap = rooms.snapshot(host.code); let n = 0;
  while (!snap.state.over && n++ < 400) { const g = replay(snap.state.moves, snap.variant, snap.rules); rooms.move(host.code, g.turn === 0 ? host.token : friend.token, legalMoves(g)[0]); snap = rooms.snapshot(host.code); }
  rooms.setOnline(host.code, host.token, false); rooms.setOnline(host.code, friend.token, false);
  c.tick(SEAT_HOLD_MS + 1); assert.deepEqual(rooms.sweep(), [host.code]);
});

test("the room refuses to open more boards than it has space for", () => {
  const rooms = new Rooms({ random: seeded(), maxRooms: 2 });
  rooms.create(); rooms.create();
  assert.throws(() => rooms.create(), (e) => e.code === "full");
});

test("the public state carries everything a client needs to rebuild the board with the engine", () => {
  const rooms = new Rooms({ random: seeded() });
  const host = rooms.create({ name: "A" }); rooms.join(host.code, { name: "B" });
  rooms.move(host.code, host.token, 3);
  const s = rooms.snapshot(host.code).state;
  const g = replay(s.moves, s.variant, s.rules);
  assert.deepEqual(g.pits, s.pits); assert.deepEqual(g.stores, s.stores); assert.equal(g.turn, s.turn);
  assert.deepEqual(applyMove(g, legalMoves(g)[0]).state.moves.length, 2);
});
