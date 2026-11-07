// Family round the board: a watch link lets someone a player sent it to follow a game with a friend live, with no seat and no say.
// server/rooms.js (watch, unwatch, watchView, the key), server/index.js (who hears what) and web/online.js (watch, watchLink, parseWatch, watchersLine).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Rooms, MAX_WATCHERS, WATCH_KEY_LENGTH } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online, stateFrom, watchLink, parseWatch, watchersLine, ERROR_TEXT } from "../web/online.js";
import { legalMoves } from "../engine/ayo.js";

const seated = (rooms) => {
  const a = rooms.create({ name: "Meka", tag: "aaaaaaaa" }); rooms.join(a.code, { name: "Tete", tag: "bbbbbbbb" });
  return { code: a.code, host: a.token, key: rooms.snapshot(a.code).watch };
};

test("the key: only in the players' snapshot, the room's own, and the same after a restart", () => {
  const rooms = new Rooms({ secret: "s3cret" });
  const { code, host, key } = seated(rooms);
  assert.equal(typeof key, "string"); assert.equal(key.length, WATCH_KEY_LENGTH); assert.match(key, /^[A-Za-z0-9_-]+$/);
  assert.throws(() => rooms.watch(code, "x".repeat(WATCH_KEY_LENGTH), { name: "Mum" }), { code: "notfound" }, "a wrong key looks like a room that is gone");
  assert.throws(() => rooms.watch(code, "", { name: "Mum" }), { code: "notfound" });
  assert.throws(() => rooms.watch("ZZZZ", key, { name: "Mum" }), { code: "notfound" });
  const w = rooms.watch(code.toLowerCase(), key, { name: "  Mum  " });
  assert.equal(w.name, "Mum"); assert.equal(w.room.watching, true);
  // the watcher's view: the game and the names, never a token, the seal, the key, the tags or the door
  const v = JSON.stringify(w.room);
  for (const secret of [host, key, rooms.snapshot(code).sig, "aaaaaaaa", "bbbbbbbb"]) assert.ok(!v.includes(secret), `the watch view leaks ${secret}`);
  assert.equal(w.room.knocks, undefined); assert.equal(w.room.rid, undefined); assert.equal(w.room.watch, undefined);
  assert.deepEqual(w.room.players.map((p) => p.name), ["Meka", "Tete"]); assert.deepEqual(w.room.watchers.map((x) => x.name), ["Mum"]);
  assert.deepEqual(rooms.snapshot(code).watchers, [{ id: w.id, name: "Mum" }], "the players' boards list who is watching");
  // a server that restarts (same secret) and rebuilds the room from a ticket gives the same key: an old watch link still works
  const ticket = { rid: rooms.snapshot(code).rid, variant: "ncho", rules: rooms.snapshot(code).rules, games: 0, names: ["Meka", "Tete"], first: 0, moves: [], resigned: null, sig: rooms.snapshot(code).sig };
  const after = new Rooms({ secret: "s3cret" }); after.rejoin(code, host, ticket);
  assert.equal(after.snapshot(code).watch, key); assert.deepEqual(after.snapshot(code).watchers, [], "nobody is watching a rebuilt room until they come back");
  assert.equal(after.watch(code, key, { name: "Mum" }).name, "Mum");
  // another server's key does not open this room
  const other = new Rooms({ secret: "other" }); const o = seated(other);
  assert.notEqual(o.key, key);
});

test("eight watchers at most; leaving makes room; a name is tidied", () => {
  const rooms = new Rooms(); const { code, key } = seated(rooms);
  const ids = [];
  for (let i = 0; i < MAX_WATCHERS; i++) ids.push(rooms.watch(code, key, { name: `Cousin ${i}` }).id);
  assert.throws(() => rooms.watch(code, key, { name: "One more" }), { code: "crowd" });
  assert.equal(rooms.unwatch(code, ids[3]), true); assert.equal(rooms.unwatch(code, ids[3]), false);
  const long = rooms.watch(code, key, { name: "x".repeat(60) }); assert.equal(long.name.length, 24); rooms.unwatch(code, long.id);
  assert.equal(rooms.watch(code, key, {}).name, "Someone");
  assert.equal(rooms.unwatch("ZZZZ", "nobody"), false);
});

test("watchLink, parseWatch and the line that says who is watching", () => {
  const link = watchLink("edne", "AbCdEfGh_jKlMn-p", "https://ayo.example/");
  assert.equal(link, "https://ayo.example/?watch=EDNE-AbCdEfGh_jKlMn-p");
  assert.deepEqual(parseWatch(new URL(link).searchParams.get("watch")), { code: "EDNE", key: "AbCdEfGh_jKlMn-p" });
  assert.deepEqual(parseWatch("edne-AbCdEfGh_jKlMn-p"), { code: "EDNE", key: "AbCdEfGh_jKlMn-p" });
  for (const bad of ["", null, "EDNE", "EDNE-short", "ED1E-AbCdEfGh_jKlMn-p", "EDNE-AbCdEfGh_jKlMn-p!", "EDNEE-AbCdEfGh_jKlMn-p"]) assert.equal(parseWatch(bad), null, String(bad));
  assert.equal(watchersLine(null), ""); assert.equal(watchersLine({ watchers: [] }), "");
  assert.equal(watchersLine({ watchers: [{ name: "Mum" }] }), "Mum is watching");
  assert.equal(watchersLine({ watchers: [{ name: "Mum" }, { name: "Uche" }] }), "Mum and Uche are watching");
  assert.equal(watchersLine({ watchers: [{ name: "Mum" }, { name: "Uche" }, { name: "A" }, { name: "B" }] }), "Mum, Uche and 2 more are watching");
  assert.ok(ERROR_TEXT.crowd.includes("watching"));
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000, pred = () => true) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { if (!pred(d)) return; clearTimeout(t); res(d); }); });
const quiet = (net, type, ms = 300) => new Promise((res, rej) => { const t = setTimeout(res, ms); net.on(type, (d) => { clearTimeout(t); rej(new Error(`unexpected "${type}": ${JSON.stringify(d)}`)); }); });

test("on the wire: Mum follows a game live — every move, a shout, the end — and can touch nothing", async () => {
  const host = new Online(url), friend = new Online(url), mum = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const k = once(host, "knock"); friend.join(code, "Tete"); const knock = await k;
  const fj = once(friend, "joined"); host.let(knock.id, true); await fj;
  await new Promise((r) => setTimeout(r, 50));
  const key = host.room.watch; assert.equal(typeof key, "string");
  assert.equal(friend.room.watch, key, "both players can send the watch link");

  // Mum opens the link: she gets the game as it stands, and both boards see her name
  const hostSees = once(host, "room", 5000, (d) => d.room.watchers && d.room.watchers.length === 1);
  const friendSees = once(friend, "room", 5000, (d) => d.room.watchers && d.room.watchers.length === 1);
  const w = once(mum, "watching"); const { code: c, key: kk } = parseWatch(watchLink(code, key, "/").split("?watch=")[1]); mum.watch(c, kk, "Mum");
  const seen = await w;
  assert.equal(seen.code, code); assert.equal(mum.seat, null); assert.equal(seen.room.watching, true); assert.equal(seen.room.watch, undefined); assert.equal(seen.room.knocks, undefined);
  assert.equal(watchersLine((await hostSees).room), "Mum is watching"); await friendSees;

  // a move by either player reaches her, rebuilt by the same engine as theirs
  const [mm, hm] = await Promise.all([once(mum, "move"), once(host, "move"), host.move(2)]);
  assert.deepEqual(mm.state, hm.state); assert.deepEqual(mm.events, hm.events); assert.deepEqual(mum.room.state.moves, [2]);
  const reply = legalMoves(stateFrom(friend.room.state))[0];
  const [mm2] = await Promise.all([once(mum, "move"), friend.move(reply)]);
  assert.equal(mm2.seat, 1); assert.deepEqual(mum.room.state.moves, [2, reply]);

  // a shout across the board reaches her too
  const [sh] = await Promise.all([once(mum, "shout"), friend.shout("oya")]);
  assert.deepEqual(sh, { seat: 1, id: "oya" });

  // nothing she sends touches the game: no move, no give-up, no rematch, no shout
  for (const t of ["move", "resign", "rematch", "shout"]) {
    const e = once(mum, "error", 5000, (d) => d.re === t); mum.send({ t, pit: 8, id: "oya" });
    assert.equal((await e).code, "unseated", t);
  }
  assert.deepEqual(host.room.state.moves, [2, reply]);
  // and she never hears the door, a peek or a call
  const noPeek = quiet(mum, "peek"), noKnock = quiet(mum, "knock"), noCall = quiet(mum, "call");
  const peekPit = legalMoves(stateFrom(host.room.state))[0]; host.peek(peekPit);
  const stranger = new Online(url); stranger.join(code, "Stranger");
  await Promise.all([noPeek, noKnock, noCall]); stranger.leave();

  // a sync gives her the whole game again
  const rs = once(mum, "room", 5000, (d) => d.resync); mum.send({ t: "sync" }); const r = await rs;
  assert.deepEqual(r.room.state.moves, [2, reply]); assert.equal(r.room.watch, undefined);

  // the game ends by giving up: she sees it end
  const [res] = await Promise.all([once(mum, "resign"), host.resign()]);
  assert.equal(res.seat, 0); assert.equal(res.state.over, true); assert.equal(res.state.winner, 1);

  // the rematch starts a new game, and her board hears it
  const started = once(mum, "room", 5000, (d) => d.started);
  host.rematch(); friend.rematch(); const st = await started;
  assert.deepEqual(st.room.state.moves, []); assert.equal(st.room.games, 1);

  // she closes the page: both boards stop listing her
  const gone = once(host, "room", 5000, (d) => Array.isArray(d.room.watchers) && d.room.watchers.length === 0);
  mum.leave(); await gone;
  host.leave(); friend.leave();
});

test("on the wire: a wrong key is a room that is gone, and a watcher may not also take a seat", async () => {
  const host = new Online(url), nosy = new Online(url), mum = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const e = once(nosy, "error"); nosy.watch(code, "A".repeat(16), "Nosy");
  const err = await e; assert.equal(err.code, "notfound"); assert.equal(err.re, "watch"); assert.equal(nosy.watching, null, "a link that never opened is not tried again");
  const w = once(mum, "watching"); mum.watch(code, host.room.watch, "Mum"); await w;
  const e2 = once(mum, "error", 5000, (d) => d.re === "join"); mum.send({ t: "join", code, name: "Mum" });
  assert.equal((await e2).code, "seated");
  host.leave(); nosy.leave(); mum.leave();
});

test("on the wire: a watcher whose line drops comes back to the same game by itself", async () => {
  const host = new Online(url), mum = new Online(url, { setTimeoutFn: (fn) => setTimeout(fn, 10) });
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const w = once(mum, "watching"); mum.watch(code, host.room.watch, "Mum"); await w;
  const back = once(mum, "watching"); mum.ws.close(); await back;
  assert.equal(mum.watching.code, code);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(host.room.watchers.length, 1, "the dropped line left the list and the watcher came back once");
  host.leave(); mum.leave();
});
