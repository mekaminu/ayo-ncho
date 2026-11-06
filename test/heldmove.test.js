// A move kept for the line (web/heldmove.js): played with a friend while the room reconnects, sent by itself once the
// seat is back — only if the game is exactly where it was — and over the real server: the line drops, the move is kept,
// the client rejoins, the move goes and both boards agree.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, sideOf, takeBack, mayTakeBack } from "../engine/ayo.js";
import { createServer } from "../server/index.js";
import { Online, stateFrom } from "../web/online.js";
import { mayHold, holdMove, releaseOf, heldWords } from "../web/heldmove.js";
import { translate } from "../web/i18n.js";

const seeded = (seed = 11) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

test("only seated in a room, a friend across, the line down and your move", () => {
  const base = { online: true, seated: true, status: "reconnecting", friend: true, over: false, turn: 0, you: 0 };
  assert.equal(mayHold(base), true);
  assert.equal(mayHold({ ...base, status: "connecting" }), true);
  assert.equal(mayHold({ ...base, status: "open" }), false, "a live line sends");
  assert.equal(mayHold({ ...base, online: false }), false, "offline games never hold");
  assert.equal(mayHold({ ...base, seated: false }), false, "at the door");
  assert.equal(mayHold({ ...base, friend: false }), false, "no one across");
  assert.equal(mayHold({ ...base, over: true }), false);
  assert.equal(mayHold({ ...base, turn: 1 }), false, "not your move");
  assert.equal(mayHold({ ...base, turn: 1, you: 1 }), true, "the far seat too");
  assert.equal(mayHold(), false);
});

test("over random games from either seat: sent only when nothing changed; dropped when the game moved, ended or barred it", () => {
  const rnd = seeded(7); let sends = 0, drops = 0, takebacks = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 60; g++) {
    let s = newGame(variant, {}, g % 2);
    while (!s.over) {
      const you = s.turn; const L = legalMoves(s); const pit = L[Math.floor(rnd() * L.length)];
      const held = holdMove(s, pit, you);
      // nothing changed: it goes, and it is a move the engine plays
      const r = releaseOf(held, s, you, L); assert.deepEqual(r, { act: "send", pit }); applyMove(s, pit); sends++;
      // the board moved on (their move landed, or the game went further): never sent
      const next = applyMove(s, pit).state;
      const r2 = releaseOf(held, next, you, legalMoves(next));
      assert.equal(r2.act, "drop"); assert.equal(r2.why, next.over ? "over" : "moved"); drops++;
      // a take-back puts the count back but the position is the same: still fine to send (it is the same position)
      if (!next.over && mayTakeBack(next, you)) { const back = takeBack(next, you); const bs = back.state || back; assert.equal(releaseOf(held, bs, you, legalMoves(bs)).act, "send"); takebacks++; }
      // a pit the engine now bars is never sent
      const barred = sideOf(you).find((p) => !L.includes(p));
      if (barred !== undefined) { const r3 = releaseOf(holdMove(s, barred, you), s, you, L); assert.deepEqual(r3, { act: "drop", pit: barred, why: "barred" }); }
      // the other seat's kept move on this position is never sent
      assert.equal(releaseOf({ ...held, seat: 1 - you }, s, you, L).why, "moved");
      s = next;
    }
  }
  assert.equal(releaseOf(null, newGame("ncho"), 0, []), null);
  assert.ok(sends > 2000 && drops > 2000 && takebacks > 1000, `${sends} / ${drops} / ${takebacks}`);
});

test("the words, from either seat, the keys and a finger; French for every one", () => {
  for (const you of [0, 1]) sideOf(you).forEach((pit, i) => {
    const k = i + 1;
    assert.equal(heldWords("hint", pit, you), `No signal · pit ${k} goes as soon as the line is back — tap pit ${k} again to keep it back`);
    assert.equal(heldWords("hint", pit, you, { keys: true }), `No signal · pit ${k} goes as soon as the line is back — Esc to keep it back`);
    assert.equal(heldWords("sent", pit, you), `Back online — your pit ${k} went`);
    for (const kind of ["hint", "kept", "sent", "over", "moved", "barred", "cancel"]) for (const keys of [false, true]) {
      const e = heldWords(kind, pit, you, { keys }); assert.ok(e, kind);
      const f = translate(e, "fr"); assert.notEqual(f, e, `no French for «${e}»`);
      assert.ok(!/\b(pit|line|back|move|played|board|signal|tap|your|went)\b/i.test(f), `English left in «${f}»`);
    }
  });
  assert.equal(heldWords("nope", 0, 0), "");
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); const off = net.on(type, (d) => { clearTimeout(t); res(d); }); });

test("over the real server: the line drops on the host's move, the move is kept, the seat comes back, it goes, both boards agree", async () => {
  const host = new Online(url), friend = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  const knocked = once(host, "knock"); friend.join(code, "Tete"); const k = await knocked;
  const fj = once(friend, "joined"); host.let(k.id, true); await fj;
  // the line goes: the socket closes under the host, who starts reconnecting
  const down = new Promise((res) => { const h = () => { if (host.status === "reconnecting") res(); }; host.on("status", h); });
  host.ws.close(); await down;
  let s = stateFrom(host.room.state); const pit = legalMoves(s)[2];
  assert.equal(mayHold({ online: true, seated: host.seat !== null, status: host.status, friend: true, over: s.over, turn: s.turn, you: host.seat }), true);
  const held = holdMove(s, pit, host.seat);
  // the seat comes back (the client rejoins by itself); the board is as the server has it
  const back = once(host, "joined"); host.wake(); const { room } = await back;
  s = stateFrom(room.state); const r = releaseOf(held, s, host.seat, legalMoves(s));
  assert.deepEqual(r, { act: "send", pit });
  const [a, b] = await Promise.all([once(host, "move"), once(friend, "move"), host.move(r.pit)]);
  assert.equal(a.pit, pit); assert.deepEqual(a.state, b.state); assert.equal(stateFrom(a.state).moves.length, 1);
  // the friend plays; the host's line drops on the host's move and a move is kept; meanwhile the friend gives up:
  // back online, the kept move is dropped (the game ended), never sent
  const fs = stateFrom(friend.room.state); await Promise.all([once(host, "move"), once(friend, "move"), friend.move(legalMoves(fs)[0])]);
  const down2 = new Promise((res) => { const h = () => { if (host.status === "reconnecting") res(); }; host.on("status", h); });
  host.ws.close(); await down2;
  const s2 = stateFrom(host.room.state); assert.equal(s2.turn, host.seat);
  const held2 = holdMove(s2, legalMoves(s2)[0], host.seat);
  await Promise.all([once(friend, "resign"), friend.resign()]);
  const back2 = once(host, "joined"); host.wake(); const { room: room2 } = await back2;
  const now = stateFrom(room2.state); assert.ok(now.over, "the room says the game is over");
  assert.deepEqual(releaseOf(held2, now, host.seat, legalMoves(now)), { act: "drop", pit: held2.pit, why: "over" });
  for (const n of [host, friend]) n.leave();
});
