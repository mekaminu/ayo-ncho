// One bad visitor can't spoil the evening (server/guard.js): a pace per connection, caps per address, and a real game untouched.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import { createServer } from "../server/index.js";
import { Pace, Doorman, addressOf, GUARD } from "../server/guard.js";
import { legalMoves, replay } from "../engine/ayo.js";

test("the pace: a burst, then the steady rate; a flood is dropped, told once a second, then closed; an easy pace is forgiven", () => {
  let t = 0; const p = new Pace({ now: () => t, burst: 5, perSecond: 2, closeAfter: 4 });
  for (let i = 0; i < 5; i++) assert.equal(p.take(), "ok");
  assert.equal(p.take(), "drop"); assert.equal(p.say(), true); assert.equal(p.say(), false);
  t = 500; assert.equal(p.take(), "ok"); // half a second at 2 a second: one more
  assert.equal(p.take(), "drop"); assert.equal(p.take(), "drop");
  assert.equal(p.take(), "close"); // four dropped in all
  t = 1500; assert.equal(p.say(), true);
  const q = new Pace({ now: () => t, burst: 4, perSecond: 2, closeAfter: 3 });
  for (let i = 0; i < 4; i++) q.take(); q.take(); q.take(); // two dropped
  t += 5000; assert.equal(q.take(), "ok"); // rested: the bucket is full again and the drops are forgiven
  for (let i = 0; i < 3; i++) q.take(); assert.equal(q.take(), "drop"); assert.equal(q.take(), "drop"); assert.equal(q.take(), "close");
});

test("the defaults leave a phone's real bursts alone", () => {
  assert.ok(GUARD.burst >= 40 && GUARD.perSecond >= 10, "a call's ICE candidates and a quick game fit inside the pace");
  assert.ok(GUARD.perAddress >= 10, "two players and eight watchers behind one home router");
  let t = 0; const p = new Pace({ now: () => t });
  for (let i = 0; i < 30; i++) assert.equal(p.take(), "ok"); // a call set up in one go
  for (let i = 0; i < 600; i++) { t += 200; assert.equal(p.take(), "ok"); } // two minutes of five messages a second
});

test("the address: the first X-Forwarded-For entry, else the socket's, without the IPv4-in-IPv6 prefix", () => {
  assert.equal(addressOf({ headers: { "x-forwarded-for": "41.58.1.2, 10.0.0.1, 10.0.0.2" }, socket: { remoteAddress: "10.0.0.9" } }), "41.58.1.2");
  assert.equal(addressOf({ headers: {}, socket: { remoteAddress: "::ffff:127.0.0.1" } }), "127.0.0.1");
  assert.equal(addressOf({ headers: { "x-forwarded-for": "" }, socket: {} }), "unknown");
  assert.equal(addressOf({ headers: { "x-forwarded-for": "x".repeat(500) } }).length, 64);
});

test("the doorman: connections per address, rooms per address in a window, and nothing kept once it is all over", () => {
  let t = 0; const d = new Doorman({ now: () => t, perAddress: 2, roomsPerAddress: 2, roomsWindowMs: 1000, maxAddresses: 3 });
  const a = {}, b = {}, c = {};
  assert.equal(d.open("x", a), true); assert.equal(d.open("x", b), true); assert.equal(d.open("x", c), false);
  assert.equal(d.open("y", c), true); // another address has its own count
  d.close("x", a); assert.equal(d.open("x", c), true);
  d.close("x", a); d.close("x", a); // a socket closed twice counts once
  assert.equal(d.sockets("x").size, 2);
  assert.equal(d.mayCreate("x"), true); assert.equal(d.mayCreate("x"), true); assert.equal(d.mayCreate("x"), false);
  d.unCreate("x"); assert.equal(d.mayCreate("x"), true); // a room the server refused does not count
  t = 1500; assert.equal(d.mayCreate("x"), true); // the window passed
  b.knock = { code: "ABCD", id: "k" }; assert.equal(d.knocking("x"), 1); b.knock = null; assert.equal(d.knocking("x"), 0);
  assert.equal(d.open("z", {}), true); assert.equal(d.open("w", {}), false); // a table full of addresses takes no new one
  d.close("x", b); d.close("x", c); d.close("y", c); t = 5000; d.sweep();
  assert.equal(d.size, 1); // only z, still open
});

// end to end, with small caps so the flood is quick
const srv = createServer({ sweepEvery: 60_000, guard: { burst: 8, perSecond: 4, closeAfter: 30, perAddress: 4, roomsPerAddress: 3, knocksPerAddress: 2 } });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const port = srv.server.address().port;
const real = createServer({ sweepEvery: 60_000 }); // the defaults, for a whole real game
await new Promise((r) => real.server.listen(0, "127.0.0.1", r));
after(() => Promise.all([srv.close(), real.close()]));

function client(p = port, from) {
  const ws = new WebSocket(`ws://127.0.0.1:${p}/ws`, from ? { headers: { "x-forwarded-for": from } } : {});
  const queue = []; const waiters = [];
  ws.on("message", (raw) => { const m = JSON.parse(String(raw)); const w = waiters.findIndex((x) => x.t === m.t || x.t === "*"); if (w >= 0) waiters.splice(w, 1)[0].res(m); else queue.push(m); });
  const next = (t = "*", ms = 4000) => new Promise((res, rej) => {
    const i = queue.findIndex((m) => t === "*" || m.t === t); if (i >= 0) return res(queue.splice(i, 1)[0]);
    const w = { t, res }; waiters.push(w); setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); rej(new Error(`no "${t}" message within ${ms} ms`)); } }, ms);
  });
  const closed = new Promise((r) => ws.on("close", (code) => r(code)));
  const open = new Promise((r) => ws.on("open", r));
  return { ws, queue, next, closed, open, send: (m) => ws.send(JSON.stringify(m)), close: () => { ws.close(); return closed; } };
}

test("a flood of messages on one connection is dropped with one 'slow' a second, then the connection is closed", async () => {
  const c = client(port, "203.0.113.1"); await c.open;
  for (let i = 0; i < 60; i++) c.send({ t: "ping" });
  const code = await c.closed;
  assert.equal(code, 1008);
  const pongs = c.queue.filter((m) => m.t === "pong").length, slows = c.queue.filter((m) => m.code === "slow").length;
  assert.ok(pongs >= 8 && pongs < 20, `the burst was answered (${pongs})`);
  assert.ok(slows >= 1 && slows <= 2, `told, not flooded back (${slows})`);
});

test("one address may hold only so many connections; another address is not affected; a closed one frees its place", async () => {
  const from = "203.0.113.2";
  const cs = []; for (let i = 0; i < 4; i++) { const c = client(port, from); await c.open; cs.push(c); }
  const extra = client(port, from);
  assert.equal((await extra.next("error")).code, "full"); assert.equal(await extra.closed, 1013);
  const other = client(port, "198.51.100.7"); await other.open; other.send({ t: "ping" }); assert.equal((await other.next()).t, "pong");
  await cs[0].close(); await new Promise((r) => setTimeout(r, 50));
  const again = client(port, from); await again.open; again.send({ t: "ping" }); assert.equal((await again.next()).t, "pong");
  await Promise.all([...cs.slice(1), other, again].map((c) => c.close()));
});

test("one address may open only so many rooms lately, and stand at only so many doors at once", async () => {
  const from = "203.0.113.3";
  const codes = [];
  for (let i = 0; i < 3; i++) { const c = client(port, from); await c.open; c.send({ t: "create", variant: "ncho", name: "Host" + i }); codes.push((await c.next("joined")).code); await c.close(); }
  const c4 = client(port, from); await c4.open; c4.send({ t: "create", variant: "ncho", name: "Host4" });
  const e = await c4.next("error"); assert.equal(e.code, "full"); assert.equal(e.re, "create");
  await c4.close();
  // the rooms stay open (their hosts gone for now); someone else knocks at them
  const k = []; for (let i = 0; i < 2; i++) { const c = client(port, "203.0.113.4"); await c.open; c.send({ t: "join", code: codes[i], name: "K" + i }); assert.equal((await c.next("knocked")).code, codes[i]); k.push(c); }
  const k3 = client(port, "203.0.113.4"); await k3.open; k3.send({ t: "join", code: codes[2], name: "K3" });
  assert.equal((await k3.next("error")).code, "busy");
  await k[0].close(); await new Promise((r) => setTimeout(r, 50)); // gone from that door: a place is free again
  k3.send({ t: "join", code: codes[2], name: "K3" }); assert.equal((await k3.next("knocked")).code, codes[2]);
  await Promise.all([k[1], k3].map((c) => c.close()));
});

test("with the real caps, a whole game with a friend, played as fast as the server answers, is never slowed", async () => {
  const a = client(real.server.address().port), b = client(real.server.address().port); await a.open; await b.open;
  a.send({ t: "create", variant: "ncho", name: "Meka" }); const ja = await a.next("joined");
  b.send({ t: "join", code: ja.code, name: "Tete" }); const kb = await b.next("knocked");
  a.send({ t: "let", id: kb.id, in: true }); await b.next("joined");
  const moves = []; let state = replay([], "ncho", {}, 0);
  while (!state.over && moves.length < 400) {
    const who = state.turn === 0 ? a : b;
    const pit = legalMoves(state)[0];
    who.send({ t: "peek", pit }); who.send({ t: "move", pit }); // the first tap and the second, at once
    const m = await a.next("move"); await b.next("move");
    moves.push(m.pit); state = replay(moves, "ncho", {}, 0);
  }
  assert.ok(state.over && moves.length > 20, `a whole game (${moves.length} moves)`);
  for (const c of [a, b]) assert.equal(c.queue.some((m) => m.code === "slow" && !m.re), false); // the pace's own "slow" carries no re (a peek's own gate says re:"peek")
  await Promise.all([a.close(), b.close()]);
});
