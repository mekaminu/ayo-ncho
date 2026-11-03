// "Take it back?" in a game with a friend: the engine's takeBack, the room's referee, the board's client over the real
// server, which seeds fly where, and the words (web/takeback.js, web/away.js).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, takeBack, mayTakeBack, totalSeeds } from "../engine/ayo.js";
import { Rooms, publicState, backMessage } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online, stateFrom, publicFrom, rebuildTakeBack } from "../web/online.js";
import { mayAsk, backWords, planReturn } from "../web/takeback.js";
import { awayWords } from "../web/away.js";

const seeded = (seed = 11) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const play = (s, n, rnd) => { for (let i = 0; i < n && !s.over; i++) { const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state; } return s; };
const strip = (s) => ({ pits: s.pits, stores: s.stores, turn: s.turn, moves: s.moves, quiet: s.quiet, over: s.over, first: s.first });

test("the engine: taking back the move just played gives back exactly the position before it", () => {
  const rnd = seeded(5);
  for (let g = 0; g < 80; g++) {
    const first = g % 3 === 0 ? 1 : 0;
    let s = play(newGame(g % 2 ? "ayo" : "ncho", {}, first), Math.floor(rnd() * 40), rnd); if (s.over) continue;
    const L = legalMoves(s); const mover = s.turn; const next = applyMove(s, L[Math.floor(rnd() * L.length)]).state;
    if (next.over) { assert.equal(mayTakeBack(next, mover), false); assert.throws(() => takeBack(next, mover), /game over/); continue; }
    assert.equal(mayTakeBack(next, mover), true); assert.equal(mayTakeBack(next, 1 - mover), false, "only whoever played it");
    const back = takeBack(next, mover);
    assert.deepEqual(strip(back), strip(s)); assert.equal(totalSeeds(back), 48);
    assert.throws(() => takeBack(next, 1 - mover));
  }
  assert.equal(mayTakeBack(newGame(), 0), false); assert.equal(mayTakeBack(newGame(), 1), false);
  // the far seat opened, and takes back its opening: still the far seat's move, from the start
  const opened = applyMove(newGame("ncho", {}, 1), 8).state; const b = takeBack(opened, 1);
  assert.equal(b.turn, 1); assert.equal(b.first, 1); assert.deepEqual(b.moves, []); assert.deepEqual(b.pits, Array(12).fill(4));
});

test("the room: ask once a move, the friend says yes or no, playing on says no, a rejoin sees the ask", () => {
  const rooms = new Rooms({ random: seeded(4) });
  const host = rooms.create({ name: "Meka" });
  assert.throws(() => rooms.askBack(host.code, host.token), (e) => e.code === "waiting");
  const friend = rooms.join(host.code, { name: "Tete" });
  assert.throws(() => rooms.askBack(host.code, host.token), (e) => e.code === "noback", "nothing played yet");
  rooms.move(host.code, host.token, 2);
  assert.throws(() => rooms.askBack(host.code, friend.token), (e) => e.code === "noback", "not their move to take back");
  assert.throws(() => rooms.answerBack(host.code, friend.token, true), (e) => e.code === "noask");
  const a = rooms.askBack(host.code, host.token); assert.deepEqual(backMessage(a), { t: "askback", seat: 0, n: 1 });
  assert.deepEqual(rooms.snapshot(host.code).ask, { seat: 0, n: 1 }, "a reload sees it");
  assert.throws(() => rooms.askBack(host.code, host.token), (e) => e.code === "asked");
  assert.throws(() => rooms.answerBack(host.code, host.token, true), (e) => e.code === "ownask");
  const no = rooms.answerBack(host.code, friend.token, false); assert.deepEqual(backMessage(no), { t: "backno", seat: 0, n: 1 });
  assert.equal(rooms.snapshot(host.code).ask, null); assert.equal(rooms.snapshot(host.code).state.moves.length, 1, "the move stands");
  assert.throws(() => rooms.askBack(host.code, host.token), (e) => e.code === "askedonce", "once a move");
  // the friend plays, the host plays, asks; the friend plays on instead of answering
  rooms.move(host.code, friend.token, legalMoves(rooms.get(host.code).game)[0]);
  rooms.move(host.code, host.token, legalMoves(rooms.get(host.code).game)[0]);
  rooms.askBack(host.code, host.token);
  rooms.move(host.code, friend.token, legalMoves(rooms.get(host.code).game)[0]);
  assert.equal(rooms.snapshot(host.code).ask, null, "playing on is a no");
  // now the friend asks and the host says yes
  const before = rooms.snapshot(host.code).state; rooms.move(host.code, host.token, legalMoves(rooms.get(host.code).game)[0]);
  const fpit = legalMoves(rooms.get(host.code).game)[0]; const mid = rooms.snapshot(host.code).state; rooms.move(host.code, friend.token, fpit);
  rooms.askBack(host.code, friend.token); const yes = rooms.answerBack(host.code, host.token, true);
  assert.deepEqual(backMessage(yes), { t: "takeback", seat: 1, n: mid.moves.length });
  assert.deepEqual(yes.state, mid, "exactly as it was before their move"); assert.equal(yes.state.turn, 1);
  assert.ok(before.moves.length < mid.moves.length);
  assert.throws(() => rooms.askBack(host.code, friend.token), (e) => e.code === "noback", "it is their move again: nothing of theirs to take back");
  // after a rematch the count starts again
  rooms.resign(host.code, host.token); rooms.rematch(host.code, host.token); rooms.rematch(host.code, friend.token);
  assert.equal(rooms.snapshot(host.code).ask, null);
  assert.equal(publicState(newGame("ncho", {}, 1)).first, 1, "the room says who opened");
});

test("the board's client rebuilds a yes from the small message, and asks for the room when it disagrees", () => {
  const s = play(newGame(), 4, seeded(2)); const next = applyMove(s, legalMoves(s)[0]).state;
  const r = rebuildTakeBack(publicFrom(next), { seat: next.moves.length % 2 === 1 ? 0 : 1, n: s.moves.length });
  assert.ok(r); assert.deepEqual(stateFrom(r.state).pits, s.pits); assert.equal(r.undone, next.moves[next.moves.length - 1]);
  assert.equal(rebuildTakeBack(publicFrom(next), { seat: 0, n: 2 }), null, "a board a move behind does not guess");
  assert.equal(rebuildTakeBack(publicFrom(next), { seat: next.turn, n: s.moves.length }), null, "not that seat's move");
  assert.equal(stateFrom({ ...publicFrom(newGame("ncho", {}, 1)), first: undefined }).first, 1, "an older server: who opens is read from the turn");
  assert.deepEqual(publicFrom(next), publicState(next), "the board and the server show a game the same way");
});

test("which seeds fly where: every seed lands once, the counts come out as the engine says, the kept ones stay put", () => {
  const rnd = seeded(8);
  for (let g = 0; g < 120; g++) {
    const s = play(newGame(g % 2 ? "ayo" : "ncho"), Math.floor(rnd() * 50), rnd); if (s.over) continue;
    const pit = legalMoves(s)[Math.floor(rnd() * legalMoves(s).length)]; const next = applyMove(s, pit).state;
    const plan = planReturn(next, s, pit);
    const c = {}; next.pits.forEach((n, i) => { c[i] = n; }); c.S0 = next.stores[0]; c.S1 = next.stores[1];
    const want = {}; s.pits.forEach((n, i) => { want[i] = n; }); want.S0 = s.stores[0]; want.S1 = s.stores[1];
    const seen = new Set();
    for (const p of plan) {
      assert.notEqual(p.from, p.to); assert.ok(p.fromSlot >= want[p.from], "only seeds above what the home keeps leave");
      assert.ok(p.toSlot >= c[p.to] && p.toSlot < want[p.to]); const key = p.from + ':' + p.fromSlot; assert.ok(!seen.has(key)); seen.add(key);
    }
    for (const p of plan) { c[p.from] -= 1; c[p.to] += 1; }
    assert.deepEqual(c, want);
    if (plan.length) assert.ok(plan.some((p) => p.to === pit), "seeds go back into the pit that was played");
  }
  assert.deepEqual(planReturn(newGame(), newGame()), []);
});

test("the words and when the chip may ask", () => {
  const base = { online: true, friend: { name: "Tete" }, seated: true, over: false, busy: false, moves: [2], turn: 1, you: 0, pending: false, askedN: -1 };
  assert.equal(mayAsk(base), true);
  for (const off of [{ online: false }, { friend: null }, { seated: false }, { over: true }, { busy: true }, { pending: true }, { askedN: 1 }, { moves: [] }, { turn: 0 }, { moves: [2, 8], turn: 0 }])
    assert.equal(mayAsk({ ...base, ...off }), false, JSON.stringify(off));
  assert.equal(mayAsk({ ...base, you: 1, moves: [2, 8], turn: 0 }), true, "from the far seat");
  const w = backWords("Tete");
  assert.equal(w.title, "Tete asks to take back their move"); assert.equal(w.asked, "Asked Tete to take back your move — waiting");
  assert.equal(w.yesMine, "Tete said yes — your move again"); assert.equal(w.yesTheirs, "Taken back — Tete's move again");
  assert.equal(w.yes, "Let them"); assert.equal(w.no, "Play on"); assert.equal(backWords().title, "Your friend asks to take back their move");
  assert.equal(awayWords("askback", { name: "Tete" }), "Tete asks to take back a move");
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { clearTimeout(t); res(d); }); });

test("over the real server: the host asks, the friend says no, then yes; both boards agree; a rejoin sees an ask", async () => {
  const host = new Online(url), friend = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const knocked = once(host, "knock"); friend.join(code, "Tete"); const k = await knocked;
  const fj = once(friend, "joined"); host.let(k.id, true); await fj;
  await Promise.all([once(host, "move"), once(friend, "move"), host.move(2)]);
  const [a1, b1] = await Promise.all([once(host, "askback"), once(friend, "askback"), host.askBack()]);
  assert.deepEqual(a1, { seat: 0, n: 1 }); assert.deepEqual(b1, a1);
  // a third board rejoining with the friend's token sees the ask
  const again = new Online(url); const back = once(again, "joined"); again.rejoin(code, friend.token);
  assert.deepEqual((await back).room.ask, { seat: 0, n: 1 }); again.leave();
  await Promise.all([once(host, "backno"), once(friend, "backno"), friend.answerBack(false)]);
  const err = once(host, "error"); host.askBack(); assert.equal((await err).code, "askedonce");
  // the friend plays, the host plays and asks again; this time yes
  const fpit = legalMoves(stateFrom(friend.room.state))[0];
  await Promise.all([once(host, "move"), once(friend, "move"), friend.move(fpit)]);
  const hpit = legalMoves(stateFrom(host.room.state))[0]; const mid = host.room.state;
  await Promise.all([once(host, "move"), once(friend, "move"), host.move(hpit)]);
  await Promise.all([once(host, "askback"), once(friend, "askback"), host.askBack()]);
  const [a, b] = await Promise.all([once(host, "takeback"), once(friend, "takeback"), friend.answerBack(true)]);
  assert.equal(a.seat, 0); assert.equal(a.undone, hpit); assert.deepEqual(a.state, b.state); assert.deepEqual(a.state, mid);
  assert.deepEqual(host.room.state, friend.room.state); assert.equal(stateFrom(host.room.state).turn, 0, "the host's move again");
  await Promise.all([once(host, "move"), once(friend, "move"), host.move(legalMoves(stateFrom(host.room.state)).slice(-1)[0])]);
  for (const n of [host, friend]) n.leave();
});
