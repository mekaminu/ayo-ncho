// Giving up a game with a friend: the engine's resign, the room's referee, the board's client over the real server,
// and the words both boards say (web/giveup.js, web/away.js, web/story.js).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, resign, replay, totalSeeds } from "../engine/ayo.js";
import { Rooms, publicState, resignMessage } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online, stateFrom, publicFrom, rebuildResign } from "../web/online.js";
import { makeGuard, ARM_MS, BUTTON, gaveUpWords, mayGiveUp } from "../web/giveup.js";
import { awayWords } from "../web/away.js";
import { gameStory, storyWords } from "../web/story.js";

const seeded = (seed = 11) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const play = (s, n, rnd) => { for (let i = 0; i < n && !s.over; i++) { const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state; } return s; };

test("the engine: giving up ends the game for the other side whatever the score, and touches no seed", () => {
  const rnd = seeded(3);
  for (let g = 0; g < 60; g++) {
    const s = play(newGame(g % 2 ? "ayo" : "ncho"), 2 + Math.floor(rnd() * 40), rnd); if (s.over) continue;
    for (const p of [0, 1]) {
      const { state, events } = resign(s, p);
      assert.equal(state.over, true); assert.equal(state.winner, 1 - p); assert.equal(state.resigned, p);
      assert.deepEqual(state.pits, s.pits); assert.deepEqual(state.stores, s.stores); assert.deepEqual(state.moves, s.moves);
      assert.equal(totalSeeds(state), 48); assert.deepEqual(events, [{ type: "end", winner: 1 - p, resigned: p }]);
      assert.deepEqual(legalMoves(state), []); assert.throws(() => applyMove(state, 0), /game over/);
      assert.equal(s.over, false, "the position given up is left as it was");
    }
  }
  const s = newGame(); assert.throws(() => resign(resign(s, 0).state, 1), /game over/); assert.throws(() => resign(s, 2));
  // the giver may be the one who leads: still the other side's game
  const rnd2 = seeded(9); let t = null;
  for (let k = 0; k < 500 && !t; k++) { let u = newGame(); while (!u.over && u.stores[0] < u.stores[1] + 4) u = play(u, 1, rnd2); if (!u.over) t = u; }
  assert.ok(t, "found a game the near seat leads"); assert.ok(t.stores[0] > t.stores[1]); assert.equal(resign(t, 0).state.winner, 1);
});

test("the room: either seat gives up on either move; the other wins; the one who gave up opens the rematch", () => {
  const rooms = new Rooms({ random: seeded(4) });
  const host = rooms.create({ name: "Meka" });
  assert.throws(() => rooms.resign(host.code, host.token), (e) => e.code === "waiting");
  const friend = rooms.join(host.code, { name: "Tete" });
  rooms.move(host.code, host.token, 2);
  assert.throws(() => rooms.resign(host.code, "nope"), (e) => e.code === "token");
  const r = rooms.resign(host.code, host.token); // the host gives up on the friend's move
  assert.equal(r.seat, 0); assert.equal(r.state.over, true); assert.equal(r.state.winner, 1); assert.equal(r.state.resigned, 0);
  assert.deepEqual(resignMessage(r), { t: "resign", seat: 0, n: 1 });
  assert.equal(rooms.snapshot(host.code).state.resigned, 0, "a reload sees who gave up");
  assert.throws(() => rooms.resign(host.code, friend.token), (e) => e.code === "over");
  assert.throws(() => rooms.move(host.code, friend.token, 6), (e) => e.code === "over");
  rooms.rematch(host.code, host.token); const again = rooms.rematch(host.code, friend.token);
  assert.equal(again.started, true); assert.equal(again.room.state.turn, 0, "the one who gave up starts"); assert.equal(again.room.state.resigned, null);
  // and the friend can give up on their own move too
  rooms.move(host.code, host.token, 3);
  const r2 = rooms.resign(host.code, friend.token); assert.equal(r2.state.winner, 0); assert.equal(r2.state.resigned, 1);
});

test("the board's client rebuilds a give-up from the small message, and asks for the room when it disagrees", () => {
  const s = play(newGame(), 3, seeded(2)); const pub = publicFrom(s); assert.equal(s.moves.length, 3);
  const r = rebuildResign(pub, { seat: 1, n: 3 });
  assert.equal(r.state.over, true); assert.equal(r.state.winner, 0); assert.equal(r.state.resigned, 1); assert.deepEqual(r.state.pits, s.pits);
  assert.equal(stateFrom(r.state).resigned, 1);
  assert.equal(rebuildResign(pub, { seat: 1, n: 2 }), null, "a board a move behind does not guess");
  assert.equal(rebuildResign(r.state, { seat: 0, n: 3 }), null, "a game already over cannot be given up again");
  assert.equal(stateFrom(publicFrom(newGame())).resigned, null);
  assert.deepEqual(publicFrom(s), publicState(s), "the board and the server show a game the same way");
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { clearTimeout(t); res(d); }); });

test("over the real server: the friend gives up, both boards end the game the same way, a reload sees it", async () => {
  const host = new Online(url), friend = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const knocked = once(host, "knock"); friend.join(code, "Tete"); const k = await knocked;
  const fj = once(friend, "joined"); host.let(k.id, true); await fj;
  await Promise.all([once(host, "move"), once(friend, "move"), host.move(2)]);
  const [a, b] = await Promise.all([once(host, "resign"), once(friend, "resign"), friend.resign()]);
  assert.equal(a.seat, 1); assert.deepEqual(a.state, b.state); assert.equal(a.state.winner, 0); assert.equal(a.state.resigned, 1);
  assert.deepEqual(a.events, [{ type: "end", winner: 0, resigned: 1 }]); assert.equal(host.room.state.over, true);
  const err = once(host, "error"); host.resign(); assert.equal((await err).code, "over");
  // a third board rejoining with the host's token gets the given-up game in the room
  const again = new Online(url); const back = once(again, "joined"); again.rejoin(code, host.token);
  const j = await back; assert.equal(j.room.state.resigned, 1); assert.equal(stateFrom(j.room.state).winner, 0);
  for (const n of [host, friend, again]) n.leave();
});

test("the words: the two-tap guard, the card, the toast, the tab's title, the line on the card", () => {
  const g = makeGuard();
  assert.equal(g.tap(0), "armed"); assert.equal(g.armed, true); assert.equal(g.tap(ARM_MS - 1), "go"); assert.equal(g.armed, false);
  assert.equal(g.tap(10_000), "armed"); assert.equal(g.expired(10_000 + ARM_MS + 1), true); assert.equal(g.tap(10_000 + ARM_MS + 1), "armed", "too slow: it asks again");
  g.reset(); assert.equal(g.armed, false);
  assert.equal(BUTTON.idle, "Give up this game"); assert.equal(BUTTON.armed, "Tap again to give up");
  assert.deepEqual(gaveUpWords(1, 0, "Tete"), { who: "Tete gave up", title: "You win", toast: "Tete gave up — you win", story: "Tete gave up" });
  assert.deepEqual(gaveUpWords(0, 0, "Tete"), { who: "You gave up", title: "Tete wins", toast: "You gave up — Tete wins", story: "you gave up" });
  assert.equal(gaveUpWords(1, 1, "Meka").title, "Tete wins".replace("Tete", "Meka"), "from the far seat too");
  assert.equal(mayGiveUp({ online: true, friend: { name: "T" }, seated: true, over: false }), true);
  for (const off of [{ online: false }, { friend: null }, { seated: false }, { over: true }]) assert.equal(mayGiveUp({ online: true, friend: { name: "T" }, seated: true, over: false, ...off }), false);
  assert.equal(awayWords("over", { name: "Tete", result: "won", gaveUp: true, score: [10, 20] }), "Tete gave up · you won");
  assert.equal(awayWords("over", { name: "Tete", result: "lost", gaveUp: true }), "You gave up · Tete won");
  const st = gameStory(play(newGame(), 5, seeded(6)).moves, "ncho", {}, 0);
  const w = storyWords(st, { me: "You", them: "Tete", gaveUp: "Tete gave up" }); assert.ok(w.endsWith("Tete gave up after move 5"), w);
  assert.ok(!storyWords(st, { me: "You", them: "Tete" }).includes("gave up"));
});
