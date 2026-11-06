// Their hand over the board (idea 6 Nov): the friend's picked pit, shown faintly on the other board. web/peek.js (the rules
// for when a pick may travel and when it shows, the board's sender), the room as referee and the real server passing it on.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";
import { Rooms } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online, stateFrom } from "../web/online.js";
import { isPeek, mayPeek, passPeek, makeSender, peekShown, peekWords, SEND_GAP_MS, GATE_GAP_MS, STALE_MS } from "../web/peek.js";
import { translate } from "../web/i18n.js";

const seeded = (seed = 11) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const play = (s, n, rnd) => { for (let i = 0; i < n && !s.over; i++) { const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state; } return s; };

test("a pick may travel only on your own move, only a pit the engine lets you play, or -1 to put it back", () => {
  for (const p of [-1, 0, 5, 11]) assert.equal(isPeek(p), true);
  for (const p of [-2, 12, 1.5, "3", null, undefined, NaN]) assert.equal(isPeek(p), false);
  const rnd = seeded(5);
  for (let g = 0; g < 120; g++) {
    const s = play(newGame(g % 2 ? "ayo" : "ncho"), Math.floor(rnd() * 50), rnd);
    const L = legalMoves(s);
    for (const seat of [0, 1]) for (let pit = -1; pit < 12; pit++) {
      const ok = !s.over && s.turn === seat && (pit === -1 || L.includes(pit));
      assert.equal(mayPeek(s, seat, pit), ok, `game ${g} seat ${seat} pit ${pit}`);
    }
  }
  assert.equal(mayPeek(null, 0, 1), false);
});

test("the server's gate: one pick every 60 ms per seat, and putting it back always passes", () => {
  const g = {};
  assert.equal(passPeek(g, 3, 1000), true); assert.equal(passPeek(g, 4, 1000 + GATE_GAP_MS - 1), false);
  assert.equal(passPeek(g, -1, 1001), true, "put back at once"); assert.equal(passPeek(g, 4, 1001 + GATE_GAP_MS), true);
});

test("the board's sender: the first pick goes at once, fast taps send only the newest, the same pit is sent once", () => {
  let t = 0; const timers = []; const sent = [];
  const s = makeSender((p) => { sent.push(p); return true; }, { now: () => t, later: (fn, ms) => { timers.push({ fn, at: t + ms }); return timers.length; }, cancel: (h) => { timers[h - 1] = null; } });
  const run = () => { for (let i = 0; i < timers.length; i++) { const x = timers[i]; if (x && x.at <= t) { timers[i] = null; x.fn(); } } };
  s.pick(2); assert.deepEqual(sent, [2]); assert.equal(s.last, 2);
  s.pick(2); assert.deepEqual(sent, [2], "the same pit twice is one message");
  t = 20; s.pick(3); t = 40; s.pick(4); t = 60; s.pick(5); assert.deepEqual(sent, [2]); assert.equal(s.pending, true);
  t = SEND_GAP_MS; run(); assert.deepEqual(sent, [2, 5], "only the newest of the fast taps"); assert.equal(s.pending, false);
  t = SEND_GAP_MS + 10; s.pick(-1); run(); t += SEND_GAP_MS; run(); assert.deepEqual(sent, [2, 5, -1], "put back goes at once");
  s.reset(); assert.equal(s.last, -1); t += 1000; s.pick(1); assert.deepEqual(sent, [2, 5, -1, 1]);
  t += 10; s.pick(0); s.reset(); t += 1000; run(); assert.deepEqual(sent, [2, 5, -1, 1], "a move cancels a pick still waiting");
  // a pick that cannot go (no line) is tried again next time
  const off = []; let up = false; const s2 = makeSender((p) => { if (!up) return false; off.push(p); return true; }, { now: () => 0 });
  s2.pick(4); assert.equal(s2.last, -1); up = true; s2.pick(4); assert.deepEqual(off, [4]);
});

test("the light shows only the friend's pick, on their move, for the move it was picked on, with the board in view", () => {
  const rnd = seeded(8); let s = newGame(); while (s.turn !== 1) s = play(s, 1, rnd);
  const pit = legalMoves(s)[0]; const base = { online: true, seat: 1, you: 0, pit, n: s.moves.length, state: s, playing: true, replaying: false, clip: false, age: 100 };
  assert.equal(peekShown(base), true);
  for (const off of [{ online: false }, { seat: 0 }, { n: s.moves.length - 1 }, { playing: false }, { replaying: true }, { clip: true }, { pit: -1 }, { age: STALE_MS + 1 }, { pit: legalMoves(s).includes(0) ? 99 : 0 }])
    assert.equal(peekShown({ ...base, ...off }), false, JSON.stringify(off));
  const after = applyMove(s, pit).state; assert.equal(peekShown({ ...base, state: after }), false, "their move landed: the light goes");
  assert.equal(peekWords(7, 0), "weighing their pit 2"); assert.equal(peekWords(2, 1), "weighing their pit 3", "named from the far seat too");
  assert.equal(translate("weighing their pit 2", "fr"), "hésite sur le trou 2 d’en face");
});

test("the room: the referee passes a pick on to the other seat and refuses one out of turn, off the board or too fast", () => {
  let t = 1000; const rooms = new Rooms({ random: seeded(4), now: () => t });
  const host = rooms.create({ name: "Meka" });
  assert.throws(() => rooms.peek(host.code, host.token, 2), (e) => e.code === "waiting");
  const friend = rooms.join(host.code, { name: "Tete" });
  assert.deepEqual(rooms.peek(host.code, host.token, 2), { seat: 0, to: 1, pit: 2, n: 0 });
  assert.throws(() => rooms.peek(host.code, host.token, 3), (e) => e.code === "slow");
  assert.deepEqual(rooms.peek(host.code, host.token, -1), { seat: 0, to: 1, pit: -1, n: 0 });
  assert.throws(() => rooms.peek(host.code, friend.token, 8), (e) => e.code === "notnow", "not their move");
  t += 100; assert.throws(() => rooms.peek(host.code, host.token, 8), (e) => e.code === "notnow", "not one of its own pits");
  assert.throws(() => rooms.peek(host.code, host.token, "2"), (e) => e.code === "bad");
  rooms.move(host.code, host.token, 2); t += 100;
  assert.deepEqual(rooms.peek(host.code, friend.token, 7), { seat: 1, to: 0, pit: 7, n: 1 });
  const snap = JSON.stringify(rooms.snapshot(host.code)); assert.ok(!snap.includes("peek"), "nothing of it is kept in the room");
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { clearTimeout(t); res(d); }); });

test("over the real server: the friend's board sees the pick, the picker's own board is not sent it", async () => {
  const host = new Online(url), friend = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const knocked = once(host, "knock"); friend.join(code, "Tete"); const k = await knocked;
  const fj = once(friend, "joined"); host.let(k.id, true); await fj;
  const mine = []; host.on("peek", (d) => mine.push(d));
  const got = once(friend, "peek"); host.peek(3); assert.deepEqual(await got, { seat: 0, pit: 3, n: 0 });
  await new Promise((r) => setTimeout(r, 80));
  const back = once(friend, "peek"); host.peek(-1); assert.deepEqual(await back, { seat: 0, pit: -1, n: 0 });
  const err = once(friend, "error"); friend.peek(8); const e = await err; assert.equal(e.re, "peek"); assert.equal(e.code, "notnow");
  await Promise.all([once(host, "move"), once(friend, "move"), host.move(3)]);
  const theirs = once(host, "peek"); friend.peek(legalMoves(stateFrom(friend.room.state))[0]); const p = await theirs; assert.equal(p.seat, 1); assert.equal(p.n, 1);
  assert.deepEqual(mine.filter((d) => d.seat === 0), [], "the host never hears its own picks back");
  for (const n of [host, friend]) n.leave();
});
