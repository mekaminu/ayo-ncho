// Online games survive a restart (a deploy, the free server waking from sleep): each board keeps a ticket — the moves it
// holds and the server's seal — and the first phone back rebuilds the room from it; the friend's token works again.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Rooms, moveMessage, resignMessage, backMessage, sealText, SIG_LENGTH } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online, ticketOf, rebuildMove, rebuildResign, rebuildTakeBack, stateFrom } from "../web/online.js";
import { legalMoves, replay } from "../engine/ayo.js";

const SECRET = "test-secret-not-for-production";
const pick = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const once = (net, type, ms = 8000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { clearTimeout(t); res(d); }); });

// A board's copy of the room, kept the way web/online.js keeps it: the snapshot, then each small message rebuilt and its seal kept.
function board(snapshot) {
  const room = structuredClone(snapshot);
  return {
    room,
    move(m) { const r = rebuildMove(room.state, m); assert.ok(r); room.state = r.state; room.sig = m.sig; },
    resign(m) { const r = rebuildResign(room.state, m); assert.ok(r); room.state = r.state; room.sig = m.sig; },
    takeback(m) { const r = rebuildTakeBack(room.state, m); assert.ok(r); room.state = r.state; room.sig = m.sig; },
    snapshot(s) { Object.assign(room, structuredClone(s)); },
    ticket() { return ticketOf(room); },
  };
}
function openRoom(rooms, variant = "ncho") {
  const host = rooms.create({ variant, name: "Meka" }); const friend = rooms.join(host.code, { name: "Tete" });
  return { code: host.code, tokens: [host.token, friend.token], b: board(rooms.snapshot(host.code)) };
}
const sameGame = (a, b) => { for (const k of ["pits", "stores", "turn", "moves", "quiet", "over", "winner", "first", "resigned"]) assert.deepEqual(a[k] ?? null, b[k] ?? null, k); };

test("the seal is short, the tokens come from the secret, and a snapshot carries what a board needs to keep", () => {
  const rooms = new Rooms({ secret: SECRET });
  const { code, tokens, b } = openRoom(rooms);
  const room = rooms.get(code);
  assert.equal(room.seats[0].token, rooms.tokenFor(code, room.rid, 0)); assert.equal(room.seats[1].token, rooms.tokenFor(code, room.rid, 1));
  assert.notEqual(tokens[0], tokens[1]);
  assert.equal(b.room.sig.length, SIG_LENGTH); assert.ok(b.room.rid);
  const t = b.ticket(); assert.deepEqual(t.names, ["Meka", "Tete"]); assert.deepEqual(t.moves, []); assert.equal(t.first, 0);
  // another server with another secret makes other tokens and another seal
  const other = new Rooms({ secret: "another" });
  assert.notEqual(other.tokenFor(code, room.rid, 0), tokens[0]);
  // the seal is the same whether read from the server's room or the board's ticket
  assert.equal(sealText({ code, ...t }), sealText(rooms.sealFields(room)));
});

test("over random games, a restart at any move is rebuilt from either board's ticket, exactly as the server had it", () => {
  let restores = 0;
  for (let g = 0; g < 40; g++) {
    const rnd = pick(g * 104729 + 7); const variant = g % 3 === 2 ? "ayo" : "ncho";
    let rooms = new Rooms({ secret: SECRET, random: rnd });
    const { code, tokens, b } = openRoom(rooms, variant);
    let n = 0;
    while (!rooms.get(code).game.over && n++ < 400) {
      const game = rooms.get(code).game; const legal = legalMoves(game);
      const r = rooms.move(code, tokens[game.turn], legal[Math.floor(rnd() * legal.length)]);
      b.move(moveMessage(r));
      if (rnd() < 0.06 && !rooms.get(code).game.over) { // a "take it back?" said yes now and then
        const seat = r.seat; try { rooms.askBack(code, tokens[seat]); } catch (e) { if (e.code !== "askedonce") throw e; continue; } const y = rooms.answerBack(code, tokens[1 - seat], true); b.takeback(backMessage(y));
      }
      if (rnd() < 0.08) { // the server restarts: everything in memory is gone
        const before = rooms.get(code).game;
        rooms = new Rooms({ secret: SECRET, random: rnd });
        const who = rnd() < 0.5 ? 0 : 1;
        const back = rooms.rejoin(code, tokens[who], b.ticket());
        assert.equal(back.restored, true); assert.equal(back.seat, who);
        sameGame(rooms.get(code).game, before);
        const other = rooms.rejoin(code, tokens[1 - who]); // the friend's token works again, with or without a ticket
        assert.equal(other.seat, 1 - who); assert.equal(other.restored, false);
        assert.deepEqual(other.room.players.map((p) => p.name), ["Meka", "Tete"]);
        b.snapshot(other.room); restores++;
      }
    }
    if (rnd() < 0.5 && !rooms.get(code).game.over) b.resign(resignMessage(rooms.resign(code, tokens[0])));
    const end = rooms.get(code).game;
    rooms = new Rooms({ secret: SECRET });
    rooms.rejoin(code, tokens[1], b.ticket());
    sameGame(rooms.get(code).game, end); restores++;
  }
  assert.ok(restores > 100, `expected many restores, got ${restores}`);
});

test("a forged, changed or foreign ticket is refused as a room that is gone", () => {
  const rooms = new Rooms({ secret: SECRET });
  const { code, tokens, b } = openRoom(rooms);
  for (const pit of [2, 7, 0]) { const g = rooms.get(code).game; b.move(moveMessage(rooms.move(code, tokens[g.turn], legalMoves(g).includes(pit) ? pit : legalMoves(g)[0]))); }
  const good = b.ticket();
  const tries = {
    "another move": { ...good, moves: [...good.moves.slice(0, -1), (good.moves.at(-1) + 1) % 12] },
    "a move fewer": { ...good, moves: good.moves.slice(0, -1) },
    "another name": { ...good, names: ["Meka", "Mallory"] },
    "other rules": { ...good, rules: { ...good.rules, capture: 23 } },
    "gave up": { ...good, resigned: 1 },
    "another seal": { ...good, sig: good.sig.slice(0, -1) + (good.sig.at(-1) === "A" ? "B" : "A") },
    "no seal": { ...good, sig: undefined },
    "not a ticket": "moves",
    "another room's id": { ...good, rid: "AAAAAAAAAAAA" },
    "far too long": { ...good, moves: Array(3000).fill(0) },
  };
  for (const [why, t] of Object.entries(tries)) {
    const fresh = new Rooms({ secret: SECRET });
    assert.throws(() => fresh.rejoin(code, tokens[0], t), (e) => e.code === "notfound", why);
    assert.equal(fresh.size, 0, why);
  }
  // the right ticket under another code, a stranger's token, or another server's secret
  assert.throws(() => new Rooms({ secret: SECRET }).rejoin(code === "ABCD" ? "ABCE" : "ABCD", tokens[0], good), (e) => e.code === "notfound");
  assert.throws(() => new Rooms({ secret: SECRET }).rejoin(code, "stolen", good), (e) => e.code === "notfound");
  assert.throws(() => new Rooms({ secret: "rotated" }).rejoin(code, tokens[0], good), (e) => e.code === "notfound");
  // no ticket at all: gone, as before
  assert.throws(() => new Rooms({ secret: SECRET }).rejoin(code, tokens[0]), (e) => e.code === "notfound");
  // the real one works
  const fresh = new Rooms({ secret: SECRET }); fresh.rejoin(code, tokens[0], good); assert.equal(fresh.get(code).game.moves.length, 3);
});

test("a room still waiting for the friend comes back waiting; a seat-1 token cannot claim it", () => {
  const rooms = new Rooms({ secret: SECRET });
  const host = rooms.create({ variant: "ayo", name: "Meka" });
  const t = ticketOf(rooms.snapshot(host.code)); assert.equal(t.names[1], null);
  const fresh = new Rooms({ secret: SECRET });
  assert.throws(() => fresh.rejoin(host.code, fresh.tokenFor(host.code, t.rid, 1), t), (e) => e.code === "notfound");
  const back = fresh.rejoin(host.code, host.token, t); assert.equal(back.room.players[1], null); assert.equal(back.room.variant, "ayo");
  const k = fresh.knock(host.code, { name: "Tete" }); const seated = fresh.admit(host.code, host.token, k.id); assert.equal(seated.seat, 1);
});

test("a room rebuilt from a board one move behind takes the friend's newer ticket, until someone plays in it", () => {
  const rooms = new Rooms({ secret: SECRET });
  const { code, tokens, b } = openRoom(rooms);
  b.move(moveMessage(rooms.move(code, tokens[0], 2)));
  const behind = b.ticket(); // the host's phone lost signal here
  const g = rooms.get(code).game; b.move(moveMessage(rooms.move(code, tokens[1], legalMoves(g)[0])));
  const ahead = b.ticket();
  const fresh = new Rooms({ secret: SECRET });
  fresh.rejoin(code, tokens[0], behind); assert.equal(fresh.get(code).game.moves.length, 1);
  const up = fresh.rejoin(code, tokens[1], ahead); assert.equal(up.upgraded, true); assert.equal(fresh.get(code).game.moves.length, 2);
  sameGame(fresh.get(code).game, rooms.get(code).game);
  // the older ticket never takes it back
  assert.equal(fresh.rejoin(code, tokens[0], behind).upgraded, false); assert.equal(fresh.get(code).game.moves.length, 2);
  // once a move is played in the rebuilt room, it is the room: tickets are only read for a room the server has forgotten
  const g2 = fresh.get(code).game; fresh.move(code, tokens[g2.turn], legalMoves(g2)[0]);
  b.move(moveMessage(rooms.move(code, tokens[g2.turn], legalMoves(g2)[0])));
  assert.equal(fresh.rejoin(code, tokens[1], b.ticket()).upgraded, false);
});

test("a rematch the friend opens, after a game given up, comes back with who opens and the games played", () => {
  const rooms = new Rooms({ secret: SECRET });
  const { code, tokens, b } = openRoom(rooms);
  b.move(moveMessage(rooms.move(code, tokens[0], 3)));
  b.resign(resignMessage(rooms.resign(code, tokens[1]))); // Tete gives up: Tete opens the next game
  rooms.rematch(code, tokens[0]); const r = rooms.rematch(code, tokens[1]); assert.equal(r.started, true); b.snapshot(r.room);
  const g = rooms.get(code).game; assert.equal(g.turn, 1);
  b.move(moveMessage(rooms.move(code, tokens[1], legalMoves(g)[0])));
  const fresh = new Rooms({ secret: SECRET }); fresh.rejoin(code, tokens[0], b.ticket());
  sameGame(fresh.get(code).game, rooms.get(code).game); assert.equal(fresh.get(code).games, 1); assert.equal(fresh.get(code).game.first, 1);
});

// The whole way: two boards over the real server; the server stops mid-game and starts again (same secret, same port);
// both boards reconnect by themselves, the first one back rebuilds the room, and the game carries on from the same position.
const servers = [];
after(() => Promise.all(servers.map((s) => s.close().catch(() => {}))));
async function start(port = 0) {
  const srv = createServer({ rooms: new Rooms({ secret: SECRET }), sweepEvery: 60_000 });
  await new Promise((r) => srv.server.listen(port, "127.0.0.1", r)); servers.push(srv); return srv;
}

test("stop the server mid-game, start it again: both boards carry on from the same position", async () => {
  let srv = await start(); const port = srv.server.address().port; const url = `ws://127.0.0.1:${port}/ws`;
  const host = new Online(url), friend = new Online(url);
  const kept = []; host.on("ticket", (t) => kept.push(t));
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const knocked = once(friend, "knocked"); friend.join(code, "Tete"); const k = await knocked;
  const fj = once(friend, "joined"); host.let(k.id, true); await fj;
  for (const who of [host, friend, host, friend]) {
    const s = stateFrom(host.room.state); const pit = legalMoves(s)[0];
    const both = Promise.all([once(host, "move"), once(friend, "move")]); who.move(pit); await both;
  }
  const before = structuredClone(host.room.state);
  assert.deepEqual(friend.room.state, before);
  assert.ok(kept.length >= 5 && kept.at(-1).ticket.moves.length === 4 && kept.at(-1).token === host.token, "the host's board keeps a ticket after every move");

  // the restart: every socket drops and the rooms in memory go with them
  await srv.close(); servers.splice(servers.indexOf(srv), 1);
  srv = await start(port);
  assert.equal(srv.rooms.size, 0);
  const [hb, fb] = await Promise.all([once(host, "joined", 15000), once(friend, "joined", 15000)]);
  assert.equal(hb.seat, 0); assert.equal(fb.seat, 1); assert.equal(srv.rooms.size, 1);
  sameGame(hb.room.state, before); sameGame(fb.room.state, before);
  assert.deepEqual(hb.room.players.map((p) => p.name), ["Meka", "Tete"]);

  // and the game goes on
  const s = stateFrom(host.room.state); const mover = s.turn === 0 ? host : friend; const pit = legalMoves(s)[0];
  const both = Promise.all([once(host, "move"), once(friend, "move")]); mover.move(pit); const [a, b] = await both;
  assert.deepEqual(a.state, b.state); assert.deepEqual(a.state.moves, [...before.moves, pit]);
  sameGame(stateFrom(a.state), replay([...before.moves, pit], "ncho"));

  // a reload after another restart: a fresh board with only what the phone kept (code, token, ticket) rebuilds the room too
  const last = kept.at(-1);
  host.leave(); friend.leave();
  await srv.close(); servers.splice(servers.indexOf(srv), 1);
  srv = await start(port);
  const reloaded = new Online(url); const rj = once(reloaded, "joined"); reloaded.rejoin(last.code, last.token, last.ticket);
  const r = await rj; assert.equal(r.seat, 0); sameGame(r.room.state, stateFrom(a.state));
  reloaded.leave();
});
