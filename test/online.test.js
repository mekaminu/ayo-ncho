// The board's online client (web/online.js) against the real server: seats, moves both ways, refusals in plain words, a dropped connection that comes back.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server/index.js";
import { Online, stateFrom, inviteLink, cleanCode, inviteText, whatsappLink, ERROR_TEXT } from "../web/online.js";
import { legalMoves, replay, applyMove } from "../engine/ayo.js";

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());

const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { clearTimeout(t); res(d); }); });

test("the invite link and the engine-shaped state", () => {
  assert.equal(inviteLink("abcd", "https://ayo.example/"), "https://ayo.example/?room=ABCD");
  const s = stateFrom({ variant: "ncho", rules: { capture: 4, relay: true, last8: true }, pits: Array(12).fill(4), stores: [0, 0], turn: 1, moves: [], over: false, winner: null });
  assert.equal(s.turn, 1); assert.deepEqual(legalMoves(s), [6, 7, 8, 9, 10, 11]);
  assert.ok(ERROR_TEXT.taken.includes("two players"));
});

test("the Rooms screen: a typed code is tidied, the WhatsApp invite carries the code and the link", () => {
  assert.equal(cleanCode(" ab-c1d e"), "ABCD"); assert.equal(cleanCode("zz9z"), "ZZZ"); assert.equal(cleanCode(""), ""); assert.equal(cleanCode(null), "");
  assert.equal(cleanCode("okwe"), "OKWE"); assert.equal(cleanCode("ABCDEFG"), "ABCD");
  const text = inviteText("edne"); assert.ok(text.includes("Room EDNE") && text.includes("knock"));
  const wa = whatsappLink("edne", "https://ayo.example/?room=EDNE");
  assert.ok(wa.startsWith("https://wa.me/?text=")); const msg = decodeURIComponent(wa.slice("https://wa.me/?text=".length));
  assert.ok(msg.includes("Ayo & Nchò") && msg.includes("Room EDNE") && msg.endsWith("https://ayo.example/?room=EDNE"));
  assert.ok(!wa.includes("&", "https://wa.me/?text=".length), "the ampersand in the name is encoded, so WhatsApp gets the whole message");
});

test("host creates, friend joins by code, moves reach both boards, a wrong-turn tap is refused, a drop reconnects", async () => {
  const host = new Online(url), friend = new Online(url);
  const statuses = []; host.on("status", (s) => statuses.push(s));
  const hostJoined = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" });
  const ja = await hostJoined;
  assert.equal(ja.seat, 0); assert.match(ja.code, /^[A-HJ-NP-Z]{4}$/); assert.equal(host.room.players[1], null);
  assert.deepEqual(statuses, ["connecting", "open"]);

  // the friend opens the link: they knock with their name, the host hears it and sees them at the door, then lets them in
  const knocked = once(friend, "knocked"), heard = once(host, "knock"), door = once(host, "room");
  friend.join(ja.code.toLowerCase(), "Tete");
  const k = await knocked; assert.equal(k.host, "Meka"); assert.equal(k.hostOnline, true); assert.equal(k.code, ja.code); assert.equal(friend.knock.id, k.id); assert.equal(friend.seat, null);
  assert.deepEqual(await heard, { id: k.id, name: "Tete" }); assert.deepEqual((await door).room.knocks, [{ id: k.id, name: "Tete" }]);
  assert.equal(host.room.players[1], null, "knocking is not joining");
  const friendJoined = once(friend, "joined"), hostSees = once(host, "room");
  assert.equal(host.let(k.id, true), true);
  const jb = await friendJoined; const presence = await hostSees;
  assert.equal(jb.seat, 1); assert.equal(friend.knock, null); assert.equal(presence.room.players[1].name, "Tete"); assert.equal(presence.room.players[0].name, "Meka"); assert.deepEqual(presence.room.knocks, []);

  // the friend taps first: refused in plain words, nothing moves
  const refused = once(friend, "error"); friend.move(6);
  const err = await refused; assert.equal(err.code, "turn"); assert.equal(err.msg, ERROR_TEXT.turn); assert.equal(err.re, "move");

  // the host's move arrives at both boards; the client rebuilds the engine's events and the position from the small message, and they match the engine
  const [ma, mb] = await Promise.all([once(host, "move"), once(friend, "move"), host.move(2)]);
  assert.equal(ma.pit, 2); assert.equal(ma.seat, 0); assert.deepEqual(ma.state, mb.state); assert.equal(ma.events[0].type, "pickup");
  const g = replay([2], "ncho"); assert.deepEqual(stateFrom(ma.state).pits, g.pits); assert.equal(stateFrom(ma.state).turn, 1);
  assert.deepEqual(ma.events, applyMove(replay([], "ncho"), 2).events); assert.deepEqual(host.room.state.moves, [2]);
  const m2 = legalMoves(g)[0];
  const [ra] = await Promise.all([once(host, "move"), once(friend, "move"), friend.move(m2)]);
  assert.deepEqual(ra.state.moves, [2, m2]);

  // a shout reaches both boards, the sender's included; a second one straight after is refused in plain words
  const [sa, sb] = await Promise.all([once(host, "shout"), once(friend, "shout"), host.shout("oya")]);
  assert.deepEqual(sa, { seat: 0, id: "oya" }); assert.deepEqual(sb, { seat: 0, id: "oya" });
  const hushed = once(host, "error"); host.shout("chai");
  const h = await hushed; assert.equal(h.code, "hush"); assert.equal(h.msg, ERROR_TEXT.hush); assert.equal(h.re, "shout");
  const [fa] = await Promise.all([once(host, "shout"), friend.shout("well")]); assert.deepEqual(fa, { seat: 1, id: "well" });

  // the host's phone loses signal: the socket dies under it; the client comes back with its token and the whole game
  const offline = once(friend, "room");
  const back = once(host, "joined", 8000);
  host.ws.close();
  assert.equal((await offline).room.players[0].online, false);
  const again = await back;
  assert.equal(again.seat, 0); assert.deepEqual(again.room.state.moves, [2, m2]); assert.equal(host.status, "open");
  assert.ok(statuses.includes("reconnecting"));

  // leaving on purpose does not come back
  const closed = once(host, "status"); host.leave(); assert.equal(await closed, "closed"); assert.equal(host.ws, null);
  await new Promise((r) => setTimeout(r, 50)); assert.equal(host.status, "closed");
  friend.leave();
});

test("the door: not let in is said plainly; a knocker who leaves vanishes from the door; the knock is sent again after a dropped line", async () => {
  const host = new Online(url); const hj = once(host, "joined"); host.create({ name: "Meka" }); const { code } = await hj;
  // Ada knocks and is turned away
  const ada = new Online(url); const ak = once(ada, "knocked"), seen = once(host, "room"); ada.join(code, "Ada"); const k = await ak; await seen;
  const away = once(ada, "error"), cleared = once(host, "room"); host.let(k.id, false);
  const e = await away; assert.equal(e.code, "notlet"); assert.equal(e.msg, ERROR_TEXT.notlet); assert.equal(e.re, "join"); assert.equal(ada.knock, null); assert.equal(ada.intent, null);
  await cleared; assert.deepEqual(host.room.knocks, []);
  // Bola knocks, then closes the page: the host's door list empties; answering that knock is refused in plain words
  const bola = new Online(url); const bk = once(bola, "knocked"), seen2 = once(host, "room"); bola.join(code, "Bola"); const kb = await bk; await seen2;
  assert.equal(host.room.knocks[0].name, "Bola");
  const gone = once(host, "room"); bola.leave(); await gone; assert.deepEqual(host.room.knocks, []);
  const stale = once(host, "error"); host.let(kb.id, true); assert.equal((await stale).code, "noknock");
  // Chidi knocks; the line drops under them; the client knocks again by itself and the host sees one knock, not two
  const chidi = new Online(url); const ck = once(chidi, "knocked"), seen3 = once(host, "room"); chidi.join(code, "Chidi"); const k1 = await ck; await seen3;
  const emptied = once(host, "room"), reknock = once(chidi, "knocked", 8000); chidi.ws.close(); await emptied;
  const k2 = await reknock; assert.notEqual(k2.id, k1.id); assert.equal(chidi.status, "open");
  await new Promise((r) => setTimeout(r, 30)); assert.deepEqual(host.room.knocks.map((x) => x.name), ["Chidi"]);
  const seatedC = once(chidi, "joined"); host.let(k2.id, true); assert.equal((await seatedC).seat, 1);
  // the room is full now: the next knock is refused as taken, before the host is bothered
  const late = new Online(url); const le = once(late, "error"); late.join(code, "Dayo"); assert.equal((await le).code, "taken");
  for (const n of [host, ada, bola, chidi, late]) n.leave();
});

test("a code nobody opened is refused and the client does not keep trying", async () => {
  const net = new Online(url);
  const err = once(net, "error"); net.join("ZZZZ", "Ada");
  const e = await err; assert.equal(e.code, "notfound"); assert.equal(e.msg, ERROR_TEXT.notfound);
  net.leave();
});
