// Lighter online traffic: a move travels as a few dozen bytes and the board rebuilds the rest with the engine it shares with the server.
// Measured here over whole games, and the fall-behind case: a board whose game is stale asks for the whole room instead of guessing.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Rooms, moveMessage, publicState } from "../server/rooms.js";
import { rebuildMove, stateFrom, publicFrom, Online } from "../web/online.js";
import { legalMoves, newGame, applyMove, replay } from "../engine/ayo.js";
import { createServer } from "../server/index.js";

const bytes = (o) => Buffer.byteLength(JSON.stringify(o));
const pick = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

test("the move message is tiny and every board rebuilds exactly what the server has, over many random games", () => {
  let small = 0, full = 0, moves = 0, longestFull = 0, worstSmall = 0;
  for (let g = 0; g < 40; g++) {
    const rnd = pick(g * 7919 + 1);
    const rooms = new Rooms({ random: rnd });
    const { code } = rooms.create({ variant: g % 3 === 2 ? "ayo" : "ncho", name: "Meka" });
    rooms.join(code, { name: "Tete" });
    const tokens = rooms.get(code).seats.map((s) => s.token);
    let mine = publicState(newGame(g % 3 === 2 ? "ayo" : "ncho")); // what a board holds
    let n = 0;
    while (!rooms.get(code).game.over && n++ < 500) {
      const game = rooms.get(code).game; const legal = legalMoves(game);
      const pit = legal[Math.floor(rnd() * legal.length)];
      const r = rooms.move(code, tokens[game.turn], pit);
      const m = moveMessage(r); const old = { t: "move", ...r };
      small += bytes(m); full += bytes(old); moves++; longestFull = Math.max(longestFull, bytes(old)); worstSmall = Math.max(worstSmall, bytes(m));
      const re = rebuildMove(mine, m);
      assert.ok(re, `move ${n} of game ${g} could not be rebuilt`);
      assert.deepEqual(re.events, r.events);           // the same seeds' path the server computed
      assert.deepEqual(re.state, r.state);             // the same position, scores, quiet count and end
      mine = re.state;
    }
    assert.ok(rooms.get(code).game.over, "game should end");
  }
  assert.ok(moves > 1000);
  assert.ok(worstSmall < 70, `a move message should stay under 70 bytes, worst was ${worstSmall}`);
  console.log(`traffic: ${moves} moves over 40 games — small ${(small / moves).toFixed(0)} B a move (worst ${worstSmall}), before ${(full / moves).toFixed(0)} B a move (worst ${longestFull}), ${(full / small).toFixed(1)}× lighter`);
  assert.ok(full / small > 8, `the old message was ${(full / small).toFixed(1)}× the size; expected 8× or more`);
  assert.ok(longestFull > 1000, `a relay turn's events alone should run past a kilobyte (longest was ${longestFull})`);
});

test("a board that has fallen behind, or holds the wrong game, refuses to guess", () => {
  const s0 = publicFrom(newGame("ncho"));
  const r1 = applyMove(stateFrom(s0), 2); const m1 = moveMessage({ seat: 0, pit: 2, state: r1.state });
  assert.ok(rebuildMove(s0, m1));
  const r2 = applyMove(r1.state, legalMoves(r1.state)[0]); const m2 = moveMessage({ seat: 1, pit: r2.state.moves[1], state: r2.state });
  assert.equal(rebuildMove(s0, m2), null);                        // missed a move: the count does not match
  assert.equal(rebuildMove(publicFrom(r1.state), { ...m2, stores: [4, 0] }), null); // scores disagree
  assert.equal(rebuildMove(publicFrom(r1.state), { ...m2, pit: 0 }), null);          // not even a legal pit from here
  assert.equal(rebuildMove(null, m1), null);                                         // no game at all yet
  assert.ok(rebuildMove(publicFrom(r1.state), m2));
});

test("quiet travels with the position, so a stalemate ends on the same move on both boards", () => {
  const g = replay([2], "ncho"); g.quiet = 59;
  const pub = publicState(g); assert.equal(pub.quiet, 59); assert.equal(stateFrom(pub).quiet, 59);
  const r = applyMove(stateFrom(pub), legalMoves(stateFrom(pub))[0]);
  assert.equal(r.state.quiet >= 60 || r.state.quiet === 0, true);
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { clearTimeout(t); res(d); }); });

test("over the wire: a client whose game went stale asks for the room and is caught up, and keeps rebuilding after", async () => {
  const host = new Online(url), friend = new Online(url);
  const hostJoined = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const ja = await hostJoined;
  const knocked = once(friend, "knocked"), atDoor = once(host, "room"); friend.join(ja.code, "Tete"); const k = await knocked; await atDoor;
  const friendJoined = once(friend, "joined"), seen = once(host, "room"); host.let(k.id, true); await friendJoined; await seen;

  // the friend's phone somehow holds a different game (say an old tab): the next move cannot be rebuilt, so it asks for the room instead
  friend.room.state = publicFrom(replay([0], "ncho"));
  const [hm, fr, fsync] = await Promise.all([once(host, "move"), once(friend, "resync"), once(friend, "room"), host.move(2)]);
  assert.equal(hm.pit, 2); assert.equal(fr.why, "move"); assert.equal(fsync.resync, true);
  assert.deepEqual(fsync.room.state.moves, [2]); assert.deepEqual(friend.room.state.moves, [2]);

  // from here on the small messages rebuild cleanly again on both boards
  const g = replay([2], "ncho"); const m2 = legalMoves(g)[0];
  const [a, b] = await Promise.all([once(host, "move"), once(friend, "move"), friend.move(m2)]);
  assert.deepEqual(a.state, b.state); assert.deepEqual(a.state.moves, [2, m2]); assert.equal(a.events[0].type, "pickup");
  assert.deepEqual(stateFrom(a.state).pits, replay([2, m2], "ncho").pits);
  host.leave(); friend.leave();
});
