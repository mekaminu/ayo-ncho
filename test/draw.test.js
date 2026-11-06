// Offering a draw in a game with a friend: the engine's agreeDraw, the room's referee (offer, answer, a move as a no, once a
// move), the seal that survives a restart, the board's client over the real server, and the words (web/draw.js, away, story).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, agreeDraw, totalSeeds } from "../engine/ayo.js";
import { Rooms, publicState, drawMessage, sealText } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online, stateFrom, publicFrom, rebuildDraw, ticketOf } from "../web/online.js";
import { mayOfferDraw, drawButton, drawWords } from "../web/draw.js";
import { awayWords } from "../web/away.js";
import { gameStory, storyWords } from "../web/story.js";
import { endedCircling } from "../web/circling.js";
import { winWave } from "../web/winwave.js";

const seeded = (seed = 11) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const play = (s, n, rnd) => { for (let i = 0; i < n && !s.over; i++) { const L = legalMoves(s); s = applyMove(s, L[Math.floor(rnd() * L.length)]).state; } return s; };

test("the engine: an agreed draw ends the game level whatever the score, and touches no seed", () => {
  const rnd = seeded(5);
  for (let g = 0; g < 80; g++) {
    const s = play(newGame(g % 2 ? "ayo" : "ncho"), Math.floor(rnd() * 50), rnd); if (s.over) continue;
    const { state, events } = agreeDraw(s);
    assert.equal(state.over, true); assert.equal(state.winner, "draw"); assert.equal(state.agreed, true); assert.equal(state.resigned ?? null, null);
    assert.deepEqual(state.pits, s.pits); assert.deepEqual(state.stores, s.stores); assert.deepEqual(state.moves, s.moves);
    assert.equal(totalSeeds(state), 48); assert.deepEqual(events, [{ type: "end", winner: "draw", agreed: true }]);
    assert.deepEqual(legalMoves(state), []); assert.throws(() => applyMove(state, 0), /game over/);
    assert.equal(s.over, false); assert.equal(s.agreed, undefined, "the position agreed is left as it was");
    assert.equal(endedCircling(state), false, "never read as the 60-move call");
  }
  assert.throws(() => agreeDraw(agreeDraw(newGame()).state), /game over/);
});

test("the room: an offer, a no, a move as a no, once a move, a yes; the offer stands through the offerer's own move", () => {
  const rooms = new Rooms({ random: seeded(4) });
  const host = rooms.create({ name: "Meka" });
  assert.throws(() => rooms.offerDraw(host.code, host.token), (e) => e.code === "waiting");
  const friend = rooms.join(host.code, { name: "Tete" });
  rooms.move(host.code, host.token, 2);
  assert.throws(() => rooms.offerDraw(host.code, "nope"), (e) => e.code === "token");
  assert.throws(() => rooms.answerDraw(host.code, friend.token, true), (e) => e.code === "nodraw");
  const o = rooms.offerDraw(host.code, host.token); // the host offers on the friend's move
  assert.deepEqual(o, { seat: 0, n: 1 }); assert.deepEqual(drawMessage(o), { t: "drawoffer", seat: 0, n: 1 });
  assert.deepEqual(rooms.snapshot(host.code).drawAsk, { seat: 0, n: 1 }, "a rejoin sees the offer");
  assert.throws(() => rooms.offerDraw(host.code, host.token), (e) => e.code === "offered");
  assert.throws(() => rooms.offerDraw(host.code, friend.token), (e) => e.code === "theyoffered");
  assert.throws(() => rooms.answerDraw(host.code, host.token, true), (e) => e.code === "owndraw");
  const no = rooms.answerDraw(host.code, friend.token, false);
  assert.deepEqual(drawMessage(no), { t: "drawno", seat: 0, n: 1 }); assert.equal(rooms.snapshot(host.code).drawAsk, null);
  assert.throws(() => rooms.offerDraw(host.code, host.token), (e) => e.code === "offeredonce", "once a move");
  // the friend offers, then the host plays on: that is a no
  rooms.offerDraw(host.code, friend.token);
  const L = legalMoves(rooms.get(host.code).game); rooms.move(host.code, friend.token, L[0]);
  // the friend's offer stood through the friend's own move; the host moving now is the no
  assert.deepEqual(rooms.snapshot(host.code).drawAsk, { seat: 1, n: 2 }, "the offerer's own move keeps it, at the new count");
  rooms.move(host.code, host.token, legalMoves(rooms.get(host.code).game)[0]);
  assert.equal(rooms.snapshot(host.code).drawAsk, null, "the friend playing on is a no");
  assert.throws(() => rooms.answerDraw(host.code, host.token, true), (e) => e.code === "nodraw");
  // a new move: the host may offer again, and a yes ends it level
  rooms.offerDraw(host.code, host.token);
  const before = rooms.get(host.code).game;
  const yes = rooms.answerDraw(host.code, friend.token, true);
  assert.equal(yes.state.over, true); assert.equal(yes.state.winner, "draw"); assert.equal(yes.state.agreed, true); assert.deepEqual(yes.state.pits, before.pits);
  assert.deepEqual(drawMessage(yes), { t: "draw", seat: 0, n: 3, sig: yes.sig }); assert.equal(yes.sig.length, 12);
  assert.equal(rooms.snapshot(host.code).state.agreed, true, "a reload sees it was agreed");
  assert.throws(() => rooms.move(host.code, friend.token, 6), (e) => e.code === "over");
  assert.throws(() => rooms.offerDraw(host.code, host.token), (e) => e.code === "over");
  assert.throws(() => rooms.resign(host.code, host.token), (e) => e.code === "over");
  // the rematch: a fresh game with no offer and no "once a move" left over
  rooms.rematch(host.code, host.token); const again = rooms.rematch(host.code, friend.token);
  assert.equal(again.started, true); assert.equal(again.room.state.agreed, undefined); assert.equal(again.room.drawAsk, null);
  assert.deepEqual(rooms.offerDraw(host.code, host.token), { seat: 0, n: 0 });
  // giving up and a take-back both drop an offer
  rooms.resign(host.code, friend.token); assert.equal(rooms.snapshot(host.code).drawAsk, null);
});

test("a take-back said yes drops a draw offered", () => {
  const rooms = new Rooms({ random: seeded(8) });
  const host = rooms.create({ name: "Meka" }); const friend = rooms.join(host.code, { name: "Tete" });
  rooms.move(host.code, host.token, 2); rooms.askBack(host.code, host.token); rooms.offerDraw(host.code, host.token);
  rooms.answerBack(host.code, friend.token, true); assert.equal(rooms.snapshot(host.code).drawAsk, null);
});

test("the seal: an agreed draw survives a restart, and every room without one seals exactly as before", () => {
  const secret = "s3cret-for-tests";
  const fields = { code: "EDNE", rid: "abcdefgh12", variant: "ncho", rules: {}, games: 0, names: ["Meka", "Tete"], first: 0, moves: [2], resigned: null };
  assert.equal(sealText(fields), JSON.stringify([1, "EDNE", "abcdefgh12", "ncho", {}, 0, ["Meka", "Tete"], 0, [2], null]), "old tickets still check");
  assert.equal(sealText({ ...fields, drawn: false }), sealText(fields));
  assert.notEqual(sealText({ ...fields, drawn: true }), sealText(fields));
  const rooms = new Rooms({ random: seeded(2), secret });
  const host = rooms.create({ name: "Meka" }); const friend = rooms.join(host.code, { name: "Tete" });
  rooms.move(host.code, host.token, 3); rooms.offerDraw(host.code, friend.token);
  const yes = rooms.answerDraw(host.code, host.token, true);
  const room = rooms.get(host.code);
  const ticket = ticketOf({ rid: room.rid, variant: room.variant, rules: room.rules, games: room.games, players: [{ name: "Meka" }, { name: "Tete" }], state: yes.state, sig: yes.sig });
  assert.equal(ticket.drawn, true);
  const later = new Rooms({ random: seeded(3), secret }); // the server restarted
  const back = later.rejoin(host.code, host.token, ticket);
  assert.equal(back.restored, true); assert.equal(back.room.state.over, true); assert.equal(back.room.state.agreed, true); assert.equal(back.room.state.winner, "draw");
  // a ticket that claims a draw nobody agreed is a room that is gone
  const fresh = new Rooms({ random: seeded(3), secret });
  const rooms2 = new Rooms({ random: seeded(2), secret });
  const h2 = rooms2.create({ name: "Meka" }); rooms2.join(h2.code, { name: "Tete" }); const m2 = rooms2.move(h2.code, h2.token, 3);
  const r2 = rooms2.get(h2.code);
  const honest = ticketOf({ rid: r2.rid, variant: r2.variant, rules: r2.rules, games: r2.games, players: [{ name: "Meka" }, { name: "Tete" }], state: m2.state, sig: m2.sig });
  assert.equal(honest.drawn, undefined);
  assert.throws(() => fresh.rejoin(h2.code, h2.token, { ...honest, drawn: true }), (e) => e.code === "notfound");
  assert.throws(() => fresh.rejoin(h2.code, h2.token, { ...honest, drawn: "yes" }), (e) => e.code === "notfound");
});

test("the board's client rebuilds an agreed draw from the small message, and asks for the room when it disagrees", () => {
  const s = play(newGame(), 4, seeded(2)); const pub = publicFrom(s);
  const r = rebuildDraw(pub, { seat: 1, n: 4 });
  assert.equal(r.state.over, true); assert.equal(r.state.winner, "draw"); assert.equal(r.state.agreed, true); assert.deepEqual(r.state.pits, s.pits);
  assert.equal(stateFrom(r.state).agreed, true);
  assert.equal(rebuildDraw(pub, { seat: 1, n: 3 }), null, "a board a move behind does not guess");
  assert.equal(rebuildDraw(r.state, { seat: 0, n: 4 }), null, "a game already over cannot be drawn again");
  assert.equal(stateFrom(publicFrom(newGame())).agreed, undefined);
  assert.deepEqual(publicFrom(agreeDraw(s).state), publicState(agreeDraw(s).state), "the board and the server show it the same way");
  assert.equal(winWave(agreeDraw(s).state, 0), null, "no win wave: the draw has its own handshake");
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); const h = (d) => { clearTimeout(t); res(d); }; net.on(type, h); });

test("over the real server: an offer, a no, an offer again after a move, a yes; both boards agree, a rejoin sees it", async () => {
  const host = new Online(url), friend = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const knocked = once(host, "knock"); friend.join(code, "Tete"); const k = await knocked;
  const fj = once(friend, "joined"); host.let(k.id, true); await fj;
  await Promise.all([once(host, "move"), once(friend, "move"), host.move(2)]);
  const [o1, o2] = await Promise.all([once(host, "drawoffer"), once(friend, "drawoffer"), host.offerDraw()]);
  assert.deepEqual(o1, { seat: 0, n: 1 }); assert.deepEqual(o2, o1); assert.deepEqual(friend.room.drawAsk, { seat: 0, n: 1 });
  await Promise.all([once(host, "drawno"), once(friend, "drawno"), friend.answerDraw(false)]);
  assert.equal(host.room.drawAsk, null);
  const err = once(host, "error"); host.offerDraw(); assert.equal((await err).code, "offeredonce");
  // the friend offers and moves: the offer stands on both boards at the new count
  await Promise.all([once(host, "drawoffer"), friend.offerDraw()]);
  const fp = legalMoves(stateFrom(friend.room.state))[0];
  await Promise.all([once(host, "move"), once(friend, "move"), friend.move(fp)]);
  assert.deepEqual(host.room.drawAsk, { seat: 1, n: 2 }); assert.deepEqual(friend.room.drawAsk, { seat: 1, n: 2 });
  const [a, b] = await Promise.all([once(host, "draw"), once(friend, "draw"), host.answerDraw(true)]);
  assert.equal(a.seat, 1); assert.deepEqual(a.state, b.state); assert.equal(a.state.winner, "draw"); assert.equal(a.state.agreed, true);
  assert.deepEqual(a.events, [{ type: "end", winner: "draw", agreed: true }]); assert.equal(host.room.state.over, true); assert.equal(host.room.drawAsk, null);
  assert.equal(host.ticket().drawn, true, "the board's ticket carries it");
  const again = new Online(url); const back = once(again, "joined"); again.rejoin(code, host.token);
  const j = await back; assert.equal(j.room.state.agreed, true); assert.equal(stateFrom(j.room.state).winner, "draw");
  for (const n of [host, friend, again]) n.leave();
});

test("the words: the button, the card, the toasts, the tab's title, the line on the card", () => {
  const base = { online: true, friend: { name: "T" }, seated: true, over: false, pending: false, theirs: false, offeredN: -1, moves: 4 };
  assert.equal(mayOfferDraw(base), true); assert.equal(drawButton(base), "Offer a draw");
  for (const off of [{ online: false }, { friend: null }, { seated: false }, { over: true }, { pending: true }, { theirs: true }, { offeredN: 4 }]) assert.equal(mayOfferDraw({ ...base, ...off }), false, JSON.stringify(off));
  assert.equal(drawButton({ ...base, pending: true }), "Draw offered — waiting");
  assert.equal(drawButton({ ...base, theirs: true }), "They offered a draw");
  assert.equal(drawButton({ ...base, offeredN: 4 }), "Draw offered at this move");
  assert.equal(drawButton({ ...base, offeredN: 3 }), "Offer a draw", "a new move: it may offer again");
  const w = drawWords("Tete");
  assert.equal(w.title, "Tete offers a draw"); assert.equal(w.offered, "Offered Tete a draw — waiting"); assert.equal(w.yes, "Agree a draw"); assert.equal(w.no, "Play on");
  assert.equal(w.goneMine, "Tete played on — no draw"); assert.equal(w.noMine, "Tete says play on");
  assert.equal(awayWords("drawoffer", { name: "Tete" }), "Tete offers a draw");
  assert.equal(awayWords("over", { name: "Tete", result: "draw", agreed: true, score: [20, 14] }), "Tete agreed a draw");
  const st = gameStory(play(newGame(), 5, seeded(6)).moves, "ncho", {}, 0);
  assert.ok(storyWords(st, { me: "You", them: "Tete", gaveUp: w.story }).endsWith("agreed a draw after move 5"));
});
