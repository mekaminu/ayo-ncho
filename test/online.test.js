// The board's online client (web/online.js) against the real server: seats, moves both ways, refusals in plain words, a dropped connection that comes back.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server/index.js";
import { Online, stateFrom, inviteLink, ERROR_TEXT } from "../web/online.js";
import { legalMoves, replay } from "../engine/ayo.js";

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

test("host creates, friend joins by code, moves reach both boards, a wrong-turn tap is refused, a drop reconnects", async () => {
  const host = new Online(url), friend = new Online(url);
  const statuses = []; host.on("status", (s) => statuses.push(s));
  const hostJoined = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" });
  const ja = await hostJoined;
  assert.equal(ja.seat, 0); assert.match(ja.code, /^[A-HJ-NP-Z]{4}$/); assert.equal(host.room.players[1], null);
  assert.deepEqual(statuses, ["connecting", "open"]);

  const friendJoined = once(friend, "joined"), hostSees = once(host, "room");
  friend.join(ja.code.toLowerCase(), "Tete");
  const jb = await friendJoined; const presence = await hostSees;
  assert.equal(jb.seat, 1); assert.equal(presence.room.players[1].name, "Tete"); assert.equal(presence.room.players[0].name, "Meka");

  // the friend taps first: refused in plain words, nothing moves
  const refused = once(friend, "error"); friend.move(6);
  const err = await refused; assert.equal(err.code, "turn"); assert.equal(err.msg, ERROR_TEXT.turn); assert.equal(err.re, "move");

  // the host's move arrives at both boards with the engine's events; the local state matches the engine
  const [ma, mb] = await Promise.all([once(host, "move"), once(friend, "move"), host.move(2)]);
  assert.equal(ma.pit, 2); assert.equal(ma.seat, 0); assert.deepEqual(ma.state, mb.state); assert.equal(ma.events[0].type, "pickup");
  const g = replay([2], "ncho"); assert.deepEqual(stateFrom(ma.state).pits, g.pits); assert.equal(stateFrom(ma.state).turn, 1);
  const m2 = legalMoves(g)[0];
  const [ra] = await Promise.all([once(host, "move"), once(friend, "move"), friend.move(m2)]);
  assert.deepEqual(ra.state.moves, [2, m2]);

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

test("a code nobody opened is refused and the client does not keep trying", async () => {
  const net = new Online(url);
  const err = once(net, "error"); net.join("ZZZZ", "Ada");
  const e = await err; assert.equal(e.code, "notfound"); assert.equal(e.msg, ERROR_TEXT.notfound);
  net.leave();
});
