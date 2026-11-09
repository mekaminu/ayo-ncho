// A new game, mid-game (idea 9 Nov): a deploy replaces the server while two friends are playing. The old server says
// {t:"restart"} and closes every socket with 1012; both boards come straight back to the new one (sharing the secret, as on
// Render), the room is rebuilt from their tickets, and the game goes on. The board says "updating the game…" meanwhile.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import WebSocket from "ws";
import { createServer } from "../server/index.js";
import { Rooms } from "../server/rooms.js";
import { RESTART_CODE, RESTART_MSG, onStopSignals, drainAll } from "../server/drain.js";
import { Online, linkWords, RESTART_DELAY_MS, RESTART_JITTER_MS, RESTART_TRIES, BACKOFF_MS } from "../web/online.js";
import { legalMoves } from "../engine/ayo.js";
import { stateFrom } from "../web/online.js";
import { spectateWords } from "../web/spectate.js";
import { translate } from "../web/i18n.js";
import { newGame } from "../engine/ayo.js";

const once = (net, type, ms = 6000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { clearTimeout(t); res(d); }); });
const listen = async (srv) => { await new Promise((r) => srv.server.listen(0, "127.0.0.1", r)); return srv.server.address().port; };
const servers = [];
after(async () => { for (const s of servers) { try { await s.close(); } catch {} } });

test("a deploy mid-game: both boards hear restart, come straight back to the new server and play on", async () => {
  const old = createServer({ rooms: new Rooms({ secret: "same-secret" }) }), next = createServer({ rooms: new Rooms({ secret: "same-secret" }) });
  servers.push(old, next);
  const oldPort = await listen(old), nextPort = await listen(next);
  let live = oldPort; // where the address leads: the old server, then (as Render switches over) the new one
  class Routed extends WebSocket { constructor() { super(`ws://127.0.0.1:${live}/ws`); } }
  const host = new Online("ws://game/ws", { WebSocketImpl: Routed }), friend = new Online("ws://game/ws", { WebSocketImpl: Routed });

  const ja = await (() => { const p = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); return p; })();
  const knocked = once(friend, "knocked"); friend.join(ja.code, "Tete"); const k = await knocked;
  const seated = once(friend, "joined"); host.let(k.id, true); await seated;
  await Promise.all([once(host, "move"), once(friend, "move"), host.move(2)]);
  assert.deepEqual(host.room.state.moves, [2]);

  const heard = [], words = [];
  host.on("restart", () => { heard.push("host"); words.push(linkWords(host.status, host.updating)); });
  friend.on("restart", () => heard.push("friend"));
  // the switch-over: new connections go to the new server, and the old one is told to stop
  live = nextPort;
  const t0 = Date.now();
  const backHost = once(host, "joined"), backFriend = once(friend, "joined");
  await old.drain();
  assert.equal(old.wss.clients.size, 0, "the old server lets every socket go before it ends");
  const [bh, bf] = await Promise.all([backHost, backFriend]);
  const took = Date.now() - t0;
  assert.deepEqual(heard.sort(), ["friend", "host"], "each board hears it once");
  assert.deepEqual(words, ["updating the game…"], "the line says the game is being updated, not that the signal went");
  assert.ok(took < RESTART_DELAY_MS + RESTART_JITTER_MS + 1500, `back in ${took} ms`);
  assert.equal(host.updating, false); assert.equal(friend.updating, false);
  assert.deepEqual(stateFrom(bh.room.state).moves, [2], "the room was rebuilt on the new server from the tickets");
  assert.equal(bh.seat, 0); assert.equal(bf.seat, 1);
  assert.equal(host.attempts, 0, "the ordinary backoff did not grow");

  // and the game goes on, on the new server
  const m = legalMoves(stateFrom(friend.room.state))[0];
  const [mv] = await Promise.all([once(host, "move"), once(friend, "move"), friend.move(m)]);
  assert.deepEqual(mv.state.moves, [2, m]);
  assert.equal(next.rooms.size, 1);
  host.leave(); friend.leave();
});

test("the old server: restart then 1012 to every socket, new connections sent off, health says draining", async () => {
  const srv = createServer(); servers.push(srv);
  const port = await listen(srv);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise((r) => ws.once("open", r));
  const got = []; ws.on("message", (d) => got.push(JSON.parse(String(d))));
  const closed = new Promise((r) => ws.once("close", (code) => r(code)));
  const healthy = await fetch(`http://127.0.0.1:${port}/healthz`).then((r) => r.status);
  assert.equal(healthy, 200);
  const draining = srv.drain({ graceMs: 1500 });
  assert.equal(await closed, RESTART_CODE);
  assert.deepEqual(got, [RESTART_MSG]);
  await draining;
});

test("a connection that arrives while the old server stops is told restart and closed", async () => {
  const srv = createServer(); servers.push(srv);
  const port = await listen(srv);
  await drainAll({ wss: { clients: new Set() }, server: { close() {} }, graceMs: 60_000 }); // nothing to drain: done at once, no waiting out the grace
  // drive the connection handler directly: draining set, a socket arrives
  const p = srv.drain({ graceMs: 300 });
  const sent = []; let closedWith = null;
  const sock = { readyState: 1, OPEN: 1, send: (s) => sent.push(JSON.parse(s)), close: (c) => { closedWith = c; }, on() {}, once() {} };
  srv.wss.emit("connection", sock, { headers: {}, socket: { remoteAddress: "127.0.0.1" } });
  assert.deepEqual(sent, [RESTART_MSG]); assert.equal(closedWith, RESTART_CODE);
  await p;
});

test("the board's side: restart message or 1012 brings it straight back; at most three in a row; nothing to come back for, no hurry", () => {
  const timers = [];
  class FakeWS { constructor() { this.readyState = 0; this.sent = []; FakeWS.last = this; } send(s) { this.sent.push(JSON.parse(s)); } close() {} }
  const net = new Online("ws://x/ws", { WebSocketImpl: FakeWS, setTimeoutFn: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeoutFn: () => {}, randomFn: () => 0.5 });
  const restarts = []; net.on("restart", () => restarts.push(1));
  net.rejoin("ABCD", "tok");
  const open = () => { const w = FakeWS.last; w.readyState = 1; w.onopen(); return w; };
  let w = open();
  w.onmessage({ data: JSON.stringify({ t: "joined", code: "ABCD", token: "tok", seat: 0, room: { code: "ABCD", state: { moves: [] }, players: [] } }) });
  // the restart message, then the close (code from the old server)
  w.onmessage({ data: JSON.stringify(RESTART_MSG) }); w.readyState = 3; w.onclose({ code: RESTART_CODE });
  assert.equal(net.status, "reconnecting"); assert.equal(net.updating, true); assert.equal(restarts.length, 1);
  assert.equal(timers.at(-1).ms, RESTART_DELAY_MS + Math.floor(0.5 * RESTART_JITTER_MS), "a short wait, spread out");
  assert.ok(timers.at(-1).ms < BACKOFF_MS[1]);
  assert.equal(linkWords(net.status, net.updating), "updating the game…");
  // the new server is not quite ready: it says restart again (1012 with no message) — still quick, still one 'restart' event
  timers.at(-1).fn(); w = FakeWS.last; w.readyState = 3; w.onclose({ code: RESTART_CODE });
  assert.equal(restarts.length, 1); assert.equal(net.updating, true);
  timers.at(-1).fn(); w = FakeWS.last; w.readyState = 3; w.onclose({ code: RESTART_CODE });
  assert.equal(net.restartTries, RESTART_TRIES);
  // a fourth in a row: the ordinary backoff takes over, and the line says reconnecting
  timers.at(-1).fn(); w = FakeWS.last; w.readyState = 3; w.onclose({ code: RESTART_CODE });
  assert.equal(net.updating, false); assert.equal(linkWords(net.status, net.updating), "reconnecting…");
  assert.ok(BACKOFF_MS.includes(timers.at(-1).ms));
  // back at the board: the count starts again
  timers.at(-1).fn(); w = open();
  w.onmessage({ data: JSON.stringify({ t: "joined", code: "ABCD", token: "tok", seat: 0, room: { code: "ABCD", state: { moves: [] }, players: [] } }) });
  assert.equal(net.restartTries, 0); assert.equal(net.updating, false);
  // an ordinary drop (1006) is not a restart
  w.readyState = 3; w.onclose({ code: 1006 });
  assert.equal(net.updating, false); assert.ok(BACKOFF_MS.includes(timers.at(-1).ms));

  // a board with nothing to come back for (a create that never got through) is not hurried back
  const lone = new Online("ws://x/ws", { WebSocketImpl: FakeWS, setTimeoutFn: (fn, ms) => { timers.push({ fn, ms }); return 0; }, clearTimeoutFn: () => {} });
  const errs = []; lone.on("error", (e) => errs.push(e.code));
  lone.create({ variant: "ncho", name: "Meka" }); const lw = FakeWS.last; lw.readyState = 3; lw.onclose({ code: RESTART_CODE });
  assert.equal(lone.updating, false); assert.deepEqual(errs, ["offline"]);
});

test("a watcher comes back to the same game after a restart, without using up its retries", () => {
  const timers = [];
  class FakeWS { constructor() { this.readyState = 0; this.sent = []; FakeWS.last = this; } send(s) { this.sent.push(JSON.parse(s)); } close() {} }
  const net = new Online("ws://x/ws", { WebSocketImpl: FakeWS, setTimeoutFn: (fn, ms) => { timers.push({ fn, ms }); return 0; }, clearTimeoutFn: () => {}, randomFn: () => 0 });
  net.watch("ABCD", "key", "Nne");
  let w = FakeWS.last; w.readyState = 1; w.onopen();
  w.onmessage({ data: JSON.stringify({ t: "watching", code: "ABCD", id: "w1", room: { code: "ABCD", state: { moves: [] }, players: [] } }) });
  w.readyState = 3; w.onclose({ code: RESTART_CODE });
  assert.equal(net.updating, true); assert.equal(timers.at(-1).ms, RESTART_DELAY_MS); assert.equal(net.attempts, 1);
  timers.at(-1).fn(); w = FakeWS.last; w.readyState = 1; w.onopen();
  assert.deepEqual(w.sent.at(-1), { t: "watch", code: "ABCD", key: "key", name: "Nne" });
  const s = newGame("ncho"); const room = { players: [{ seat: 0, name: "Meka", online: true }, { seat: 1, name: "Tete", online: true }] };
  assert.equal(spectateWords(s, room, "updating").hint, "Watching · updating the game…");
});

test("the words, in English and French", () => {
  assert.equal(linkWords("open"), ""); assert.equal(linkWords("connecting"), "connecting…"); assert.equal(linkWords("closed"), "no connection");
  assert.equal(linkWords("reconnecting"), "reconnecting…"); assert.equal(linkWords("reconnecting", true), "updating the game…");
  assert.equal(translate("updating the game…", "fr"), "mise à jour du jeu…");
  assert.equal(translate("Watching · updating the game…", "fr"), "Vous regardez · mise à jour du jeu…");
});

test("SIGTERM and SIGINT drain once, then the process ends", async () => {
  const proc = new EventEmitter(); const exits = []; let drains = 0;
  const done = new Promise((r) => onStopSignals(() => { drains += 1; return Promise.resolve(); }, { proc, exit: (c) => { exits.push(c); r(); } }));
  proc.emit("SIGTERM"); proc.emit("SIGINT");
  await done;
  assert.equal(drains, 1); assert.deepEqual(exits, [0]);
});
