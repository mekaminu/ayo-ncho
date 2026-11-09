// A friend gone from the board (idea 9 Nov): the room's referee (Rooms.claim), the real server (presence across two tabs,
// the claim over the line, the rebuilt room after a restart), and the words both boards say (web/claim.js), in French too.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Rooms, publicState, resignMessage, CLAIM_MS as SERVER_CLAIM_MS } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online, stateFrom, publicFrom, rebuildResign, ERROR_TEXT } from "../web/online.js";
import { CLAIM_MS, awayFor, awayTime, awayLine, mayClaim, claimButton, claimReady, claimWords } from "../web/claim.js";
import { gameStory, storyWords } from "../web/story.js";
import { translate } from "../web/i18n.js";

const seeded = (seed = 11) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const fr = (s) => translate(s, "fr");

test("the room: the game can be taken only from a seat gone CLAIM_MS, never while they are at the board", () => {
  assert.equal(SERVER_CLAIM_MS, CLAIM_MS); assert.equal(CLAIM_MS, 5 * 60 * 1000);
  let t = 1_000_000; const rooms = new Rooms({ random: seeded(4), now: () => t, secret: "s" });
  const host = rooms.create({ name: "Meka" });
  assert.throws(() => rooms.claim(host.code, host.token), (e) => e.code === "waiting");
  const k = rooms.knock(host.code, { name: "Tete" }); const friend = rooms.admit(host.code, host.token, k.id);
  rooms.move(host.code, host.token, 2);
  assert.throws(() => rooms.claim(host.code, host.token), (e) => e.code === "here", "the friend is at the board");
  assert.equal(rooms.snapshot(host.code).players[1].awayMs, undefined, "no away time while at the board");
  rooms.setOnline(host.code, friend.token, false);
  t += 60_000; assert.equal(rooms.snapshot(host.code).players[1].awayMs, 60_000);
  assert.throws(() => rooms.claim(host.code, host.token), (e) => e.code === "notyet");
  // back for a moment, then gone again: the clock starts over
  rooms.setOnline(host.code, friend.token, true); rooms.setOnline(host.code, friend.token, false);
  t += CLAIM_MS - 1; assert.throws(() => rooms.claim(host.code, host.token), (e) => e.code === "notyet");
  rooms.setOnline(host.code, friend.token, false); // closing a second socket while away does not restart the clock
  t += 1; const r = rooms.claim(host.code, host.token);
  assert.equal(r.seat, 1); assert.equal(r.by, 0); assert.equal(r.away, true);
  assert.equal(r.state.over, true); assert.equal(r.state.winner, 0); assert.equal(r.state.resigned, 1); assert.equal(r.state.away, true);
  assert.deepEqual(resignMessage(r), { t: "resign", seat: 1, n: 1, away: true, sig: r.sig });
  assert.throws(() => rooms.claim(host.code, host.token), (e) => e.code === "over");
  // the far seat can take it the other way round too, and a rematch clears it
  rooms.setOnline(host.code, friend.token, true); rooms.rematch(host.code, host.token); const re = rooms.rematch(host.code, friend.token);
  assert.equal(re.started, true); assert.equal(re.room.state.away, undefined); assert.equal(re.room.state.resigned, null);
  rooms.setOnline(host.code, host.token, false); t += CLAIM_MS;
  const back = rooms.claim(host.code, friend.token); assert.equal(back.seat, 0); assert.equal(back.state.winner, 1);
  // the seal is the same as a game given up, so a room rebuilt from the ticket agrees on the result
  const other = new Rooms({ random: seeded(5), now: () => t, secret: "s" });
  const snap = rooms.snapshot(host.code);
  const ticket = { rid: snap.rid, variant: snap.variant, rules: snap.rules, games: snap.games, names: ["Meka", "Tete"], first: snap.state.first, moves: snap.state.moves, resigned: snap.state.resigned, sig: snap.sig };
  const j = other.rejoin(host.code, host.token, ticket); assert.equal(j.restored, true); assert.equal(j.room.state.winner, 1);
  assert.ok(j.room.players[1].awayMs >= 0, "a rebuilt room counts the friend away from the rebuild");
  assert.throws(() => rooms.claim(host.code, "nope"), (e) => e.code === "token");
});

test("the board's copy: the claim arrives as a resign marked away, rebuilt by the same engine", () => {
  let t = 0; const rooms = new Rooms({ random: seeded(7), now: () => t });
  const host = rooms.create({ name: "Meka" }); const k = rooms.knock(host.code, { name: "Tete" }); const friend = rooms.admit(host.code, host.token, k.id);
  rooms.move(host.code, host.token, 1); const pub = rooms.snapshot(host.code).state;
  rooms.setOnline(host.code, friend.token, false); t += CLAIM_MS;
  const r = rooms.claim(host.code, host.token); const m = resignMessage(r);
  const b = rebuildResign(pub, m); assert.deepEqual(b.state, r.state, "the board and the server end the game the same way");
  assert.equal(stateFrom(b.state).away, true); assert.equal(publicFrom(stateFrom(b.state)).away, true);
  assert.equal(rebuildResign(pub, { seat: 1, n: 1 }).state.away, undefined, "a game given up is not marked away");
  assert.deepEqual(publicState(rooms.get(host.code).game), r.state);
});

let clock = 5_000_000;
const srv = createServer({ sweepEvery: 60_000, rooms: new Rooms({ now: () => clock, secret: "t" }) });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000, ok = () => true) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { if (!ok(d)) return; clearTimeout(t); res(d); }); });

test("over the real server: a second tab keeps the seat at the board; once gone five minutes the game is taken; the friend comes back to it", async () => {
  const host = new Online(url), friend = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const knocked = once(host, "knock"); friend.join(code, "Tete"); const k = await knocked;
  const fj = once(friend, "joined"); host.let(k.id, true); await fj;
  await Promise.all([once(host, "move"), once(friend, "move"), host.move(2)]);
  // the friend's seat open in a second tab: closing one tab leaves them at the board
  const tab = new Online(url); const tj = once(tab, "joined"); tab.rejoin(code, friend.token); await tj;
  tab.leave(); await new Promise((r) => setTimeout(r, 150));
  clock += CLAIM_MS;
  let err = once(host, "error"); host.claim(); assert.equal((await err).code, "here");
  // the friend's phone goes: the host's board hears they are away
  const gone = once(host, "room", 5000, (d) => d.room.players[1] && !d.room.players[1].online); friend.leave();
  const g = await gone; assert.equal(g.room.players[1].awayMs, 0);
  clock += 60_000; err = once(host, "error"); host.claim(); const e = await err; assert.equal(e.code, "notyet"); assert.equal(ERROR_TEXT.notyet, "Give your friend a few minutes to come back");
  clock += CLAIM_MS;
  const r = await Promise.all([once(host, "resign"), host.claim()]).then((x) => x[0]);
  assert.equal(r.seat, 1); assert.equal(r.away, true); assert.equal(r.state.winner, 0); assert.equal(r.state.away, true);
  // the friend comes back to a finished game, marked as taken while away
  const again = new Online(url); const back = once(again, "joined"); again.rejoin(code, friend.token);
  const j = await back; assert.equal(j.room.state.resigned, 1); assert.equal(j.room.state.away, true); assert.equal(stateFrom(j.room.state).winner, 0);
  for (const n of [host, again]) n.leave();
});

test("the words: how long away, when the button shows, the card, the toast, the line on the card, in French", () => {
  assert.equal(awayFor(null, 0, 10), null); assert.equal(awayFor({ online: true }, 0, 10), null);
  assert.equal(awayFor({ online: false, awayMs: 1000 }, 500, 2500), 3000);
  assert.equal(awayFor({ online: false }, 500, 400), 0, "no away time from the server and a clock that went back: zero, not less");
  assert.equal(awayTime(59_999), ""); assert.equal(awayTime(60_000), "1 min"); assert.equal(awayTime(59 * 60_000 + 59_000), "59 min");
  assert.equal(awayTime(60 * 60_000), "1 hour"); assert.equal(awayTime(3 * 60 * 60_000 + 5), "3 hours");
  assert.equal(awayLine(10_000), "away — their seat is held"); assert.equal(awayLine(4 * 60_000), "away 4 min — their seat is held");
  const ok = { online: true, friend: { name: "Tete", online: false }, seated: true, over: false, awayMs: CLAIM_MS };
  assert.equal(mayClaim(ok), true);
  for (const off of [{ online: false }, { friend: null }, { friend: { name: "Tete", online: true } }, { seated: false }, { over: true }, { awayMs: CLAIM_MS - 1 }, { awayMs: null }]) assert.equal(mayClaim({ ...ok, ...off }), false, JSON.stringify(off));
  assert.equal(claimButton("Tete", 5 * 60_000), "Take the game · Tete away 5 min");
  assert.equal(claimButton("Tete", CLAIM_MS, true), "Tap again to take the game"); assert.equal(claimButton("Tete", CLAIM_MS, true, true), "Click again to take the game");
  assert.deepEqual(claimWords(1, 0, "Tete"), { who: "Tete was away", title: "You win", toast: "Tete was away — the game is yours", story: "Tete was away" });
  assert.deepEqual(claimWords(0, 0, "Meka"), { who: "You were away", title: "Meka wins", toast: "Meka took the game while you were away", story: "you were away" });
  const st = gameStory([2, 8, 3], "ncho", {}, 0);
  assert.ok(storyWords(st, { me: "You", them: "Tete", gaveUp: "Tete was away" }).endsWith("Tete was away after move 3"));
  // French
  assert.equal(fr("away 4 min — their seat is held"), "pas là depuis 4 min — sa place est gardée");
  assert.equal(fr("away 2 hours — their seat is held"), "pas là depuis 2 heures — sa place est gardée");
  assert.equal(fr("Take the game · Tete away 5 min"), "Prendre la partie · Tete absent depuis 5 min");
  assert.equal(fr("Tap again to take the game"), "Touchez encore pour prendre la partie");
  assert.equal(fr(claimReady("Tete")), "Tete n’est plus là depuis un moment — vous pouvez prendre la partie (la bulle)");
  assert.equal(fr("Tete was away — the game is yours"), "Tete n’était plus là — la partie est à vous");
  assert.equal(fr("Meka took the game while you were away"), "Meka a pris la partie pendant votre absence");
  assert.equal(fr("You were away"), "Vous n’étiez plus là"); assert.equal(fr("Tete was away"), "Tete n’était plus là");
  assert.equal(fr("Tete was away after move 3"), "Tete n’était plus là après le coup 3");
  assert.equal(fr("you were away after move 12"), "vous n’étiez plus là après le coup 12");
  assert.equal(fr("Your friend is back at the board"), "Votre ami est de retour au plateau");
});
