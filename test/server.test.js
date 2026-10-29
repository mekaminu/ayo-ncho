// The server end to end: two WebSocket clients open a room by code, play through the engine, drop and come back.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import { createServer } from "../server/index.js";
import { replay, legalMoves } from "../engine/ayo.js";

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const port = srv.server.address().port;
const base = `http://127.0.0.1:${port}`;
after(() => srv.close());

// a tiny client: send JSON, await the next message of a given type
function client() {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const queue = []; const waiters = [];
  ws.on("message", (raw) => { const m = JSON.parse(String(raw)); const w = waiters.findIndex((x) => x.t === m.t || x.t === "*"); if (w >= 0) waiters.splice(w, 1)[0].res(m); else queue.push(m); });
  const next = (t = "*", ms = 4000) => new Promise((res, rej) => {
    const i = queue.findIndex((m) => t === "*" || m.t === t); if (i >= 0) return res(queue.splice(i, 1)[0]);
    const w = { t, res }; waiters.push(w); setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); rej(new Error(`no "${t}" message within ${ms} ms`)); } }, ms);
  });
  const send = (m) => ws.send(JSON.stringify(m));
  const open = new Promise((r) => ws.on("open", r));
  return { ws, send, next, open, close: () => new Promise((r) => { ws.on("close", r); ws.close(); }) };
}

test("health and the invite link's room lookup", async () => {
  const h = await (await fetch(`${base}/healthz`)).json();
  assert.equal(h.ok, true);
  const miss = await fetch(`${base}/api/rooms/ZZZZ`);
  assert.equal(miss.status, 404);
});

test("host creates, friend joins by code, moves go to both, an out-of-turn move is refused", async () => {
  const a = client(), b = client(); await a.open; await b.open;
  a.send({ t: "create", variant: "ncho", name: "Meka" });
  const ja = await a.next("joined");
  assert.equal(ja.seat, 0); assert.match(ja.code, /^[A-HJ-NP-Z]{4}$/); assert.ok(ja.token);
  const look = await (await fetch(`${base}/api/rooms/${ja.code.toLowerCase()}`)).json();
  assert.equal(look.ok, true); assert.equal(look.seatFree, true); assert.equal(look.players[0].name, "Meka");
  assert.equal(JSON.stringify(look).includes(ja.token), false);

  // the friend knocks (join does not seat anyone): the host hears it, sees the door list, and lets them in
  b.send({ t: "join", code: ja.code, name: "Tete" });
  const kb = await b.next("knocked");
  assert.equal(kb.code, ja.code); assert.equal(kb.host, "Meka"); assert.equal(kb.hostOnline, true); assert.ok(kb.id);
  assert.deepEqual(await a.next("knock"), { t: "knock", id: kb.id, name: "Tete" });
  const atDoor = await a.next("room"); assert.deepEqual(atDoor.room.knocks, [{ id: kb.id, name: "Tete" }]); assert.equal(atDoor.room.players[1], null);
  b.send({ t: "move", pit: 6 }); assert.equal((await b.next("error")).code, "unseated"); // knocking is not playing
  b.send({ t: "let", id: kb.id, in: true }); assert.equal((await b.next("error")).code, "unseated"); // and a knocker cannot let themselves in
  a.send({ t: "let", id: kb.id, in: true });
  const jb = await b.next("joined");
  assert.equal(jb.seat, 1); assert.ok(jb.token); assert.deepEqual(jb.room.knocks, []);
  const presence = await a.next("room");
  assert.equal(presence.room.players[1].name, "Tete");
  b.send({ t: "let", id: "x", in: false }); assert.equal((await b.next("error")).code, "host"); // only the host answers the door

  b.send({ t: "move", pit: 6 });
  const err = await b.next("error");
  assert.equal(err.code, "turn"); assert.equal(err.re, "move");

  // a move travels small: seat, pit, how many moves have been played and both scores — no events, no history; the boards rebuild the rest
  a.send({ t: "move", pit: 2 });
  const ma = await a.next("move"), mb = await b.next("move");
  assert.deepEqual(ma, mb); assert.deepEqual(ma, { t: "move", seat: 0, pit: 2, n: 1, stores: [0, 0] });
  assert.ok(JSON.stringify(ma).length < 60);
  const g = replay([2], "ncho");
  assert.deepEqual(ma.stores, g.stores);

  // the friend plays a legal reply; both boards agree with the engine
  const m2 = legalMoves(g)[0];
  b.send({ t: "move", pit: m2 });
  const ra = await a.next("move"); await b.next("move");
  assert.equal(ra.n, 2); assert.deepEqual(ra.stores, replay([2, m2], "ncho").stores);

  // a board that has fallen behind asks for the whole room and gets it, marked as a resync
  a.send({ t: "sync" });
  const synced = await a.next("room");
  assert.equal(synced.resync, true); assert.deepEqual(synced.room.state.moves, [2, m2]); assert.equal(synced.room.state.quiet, replay([2, m2], "ncho").quiet);

  // a third phone cannot take a seat, and nonsense is answered, never crashed on
  const c = client(); await c.open;
  c.send({ t: "join", code: ja.code, name: "Ada" });
  assert.equal((await c.next("error")).code, "taken");
  c.ws.send("not json"); assert.equal((await c.next("error")).code, "bad");
  c.send({ t: "move", pit: 0 }); assert.equal((await c.next("error")).code, "unseated");
  c.send({ t: "ping" }); assert.equal((await c.next("pong")).t, "pong");
  await c.close();

  // the friend's phone drops: the host sees them offline; they come back with the token and get the whole game
  await b.close();
  const off = await a.next("room");
  assert.equal(off.room.players[1].online, false);
  const b2 = client(); await b2.open;
  b2.send({ t: "rejoin", code: ja.code, token: jb.token });
  const back = await b2.next("joined");
  assert.equal(back.seat, 1); assert.deepEqual(back.room.state.moves, [2, m2]);
  const on = await a.next("room");
  assert.equal(on.room.players[1].online, true);
  const bad = client(); await bad.open;
  bad.send({ t: "rejoin", code: ja.code, token: "stolen" });
  assert.equal((await bad.next("error")).code, "token");
  await bad.close();

  // play the game out from both ends, then a rematch both agree to
  let state = back.room.state; const moves = state.moves.slice();
  const sockets = [a, b2]; let n = 0;
  while (!state.over && n++ < 400) {
    const cur = replay(moves, state.variant, state.rules);
    const pit = legalMoves(cur)[0]; sockets[cur.turn].send({ t: "move", pit });
    const [x, y] = await Promise.all([a.next("move"), b2.next("move")]);
    assert.deepEqual(x, y); assert.equal(x.pit, pit); moves.push(pit);
    state = replay(moves, state.variant, state.rules); assert.equal(x.n, moves.length); assert.deepEqual(x.stores, state.stores); // the small message agrees with the engine every move
  }
  assert.ok(state.over);
  a.send({ t: "rematch" });
  const half = await a.next("room"); await b2.next("room");
  assert.equal(half.started, false);
  b2.send({ t: "rematch" });
  const fresh = await a.next("room"); await b2.next("room");
  assert.equal(fresh.started, true); assert.deepEqual(fresh.room.state.moves, []); assert.equal(fresh.room.games, 1);

  await a.close(); await b2.close();
});
