// Back to your game (idea 8 Nov): Home offers the way back to a seat this phone keeps in a game still in play (web/backroom.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { roomOffer, offerWords, keepSeat, ticketGame, OFFER_MS } from "../web/backroom.js";
import { Rooms } from "../server/rooms.js";
import { ticketOf } from "../web/online.js";
import { legalMoves, replay } from "../engine/ayo.js";
import { translate } from "../web/i18n.js";

const SECRET = "test-secret-not-for-production";
const NOW = Date.UTC(2026, 10, 8, 9, 30);
function game(moves = 3) {
  const rooms = new Rooms({ secret: SECRET });
  const host = rooms.create({ variant: "ncho", name: "Meka" }); const friend = rooms.join(host.code, { name: "Tete" });
  const tokens = [host.token, friend.token];
  for (let i = 0; i < moves; i++) { const s = rooms.get(host.code).game; rooms.move(host.code, tokens[s.turn], legalMoves(s)[0]); }
  return { rooms, code: host.code, tokens, ticket: () => ticketOf(rooms.snapshot(host.code)) };
}

test("a seat in a game still in play is offered, with the friend's name and whose move it is, from either seat", () => {
  const g = game(3); const t = g.ticket(); const s = replay(t.moves, t.variant, t.rules, t.first);
  for (const seat of [0, 1]) {
    const o = roomOffer(keepSeat({ code: g.code, token: g.tokens[seat], seat, ticket: t, at: NOW - 60_000 }), { now: NOW });
    assert.deepEqual(o, { code: g.code, name: seat === 0 ? "Tete" : "Meka", mine: s.turn === seat, moves: 3 });
    assert.equal(offerWords(o), `Back to your game with ${seat === 0 ? "Tete" : "Meka"} · ${s.turn === seat ? "your move" : "their move"}`);
  }
  assert.deepEqual(ticketGame(t).pits, s.pits, "the ticket's game is the engine's");
});

test("the kept seat goes back: a server that has forgotten the room rebuilds it from the ticket Home offered", () => {
  const g = game(4); const kept = JSON.parse(JSON.stringify(keepSeat({ code: g.code, token: g.tokens[1], seat: 1, ticket: g.ticket(), at: NOW })));
  const o = roomOffer(kept, { now: NOW + 3_600_000 }); assert.ok(o);
  const back = new Rooms({ secret: SECRET }).rejoin(o.code, kept.token, kept.ticket);
  assert.equal(back.seat, 1); assert.equal(back.restored, true); assert.equal(back.room.state.moves.length, 4);
});

test("nothing is offered for a game that ended, an empty room, a seat kept long ago or before the line existed, or while online", () => {
  const g = game(2); const t = g.ticket(); const seat = (x = {}) => ({ ...keepSeat({ code: g.code, token: g.tokens[0], seat: 0, ticket: t, at: NOW }), ...x });
  assert.ok(roomOffer(seat(), { now: NOW }));
  assert.equal(roomOffer(seat(), { now: NOW, online: true }), null, "already at the board");
  assert.equal(roomOffer(seat({ ticket: { ...t, resigned: 1 } }), { now: NOW }), null, "given up");
  assert.equal(roomOffer(seat({ ticket: { ...t, drawn: true } }), { now: NOW }), null, "a draw agreed");
  assert.equal(roomOffer(seat({ ticket: { ...t, names: ["Meka", null] } }), { now: NOW }), null, "nobody sat down");
  assert.equal(roomOffer(seat({ ticket: { ...t, moves: [99] } }), { now: NOW }), null, "not a game");
  assert.equal(roomOffer(seat({ ticket: { ...t, variant: "chess" } }), { now: NOW }), null);
  assert.equal(roomOffer(seat({ at: NOW - OFFER_MS - 1 }), { now: NOW }), null, "two days on");
  assert.ok(roomOffer(seat({ at: NOW - OFFER_MS + 1000 }), { now: NOW }));
  assert.equal(roomOffer({ code: g.code, token: g.tokens[0] }, { now: NOW }), null, "kept before this line: no time");
  assert.equal(roomOffer(seat({ code: "ab" }), { now: NOW }), null);
  assert.equal(roomOffer(seat({ token: "" }), { now: NOW }), null);
  for (const x of [null, undefined, "x", 3]) assert.equal(roomOffer(x, { now: NOW }), null);
  // a game played to its end
  let s = g.rooms.get(g.code).game; while (!s.over) { g.rooms.move(g.code, g.tokens[s.turn], legalMoves(s)[0]); s = g.rooms.get(g.code).game; }
  assert.equal(roomOffer(seat({ ticket: g.ticket() }), { now: NOW }), null, "played out");
});

test("without a ticket (an older server) or a seat, the line names the room and not the move", () => {
  const o = roomOffer({ code: "KMTP", token: "tok", at: NOW }, { now: NOW });
  assert.deepEqual(o, { code: "KMTP", name: null, mine: null, moves: null });
  assert.equal(offerWords(o), "Back to your game in room KMTP");
  const g = game(1); const n = roomOffer({ code: g.code, token: "t", at: NOW, ticket: g.ticket() }, { now: NOW });
  assert.equal(n.name, null); assert.equal(n.mine, null); assert.equal(offerWords(n), `Back to your game in room ${g.code}`);
  assert.equal(offerWords(null), "");
});

test("in French, the friend's name kept as typed", () => {
  const fr = (s) => translate(s, "fr");
  assert.equal(fr("Back to your game with Tete · your move"), "Retour à votre partie avec Tete · à vous");
  assert.equal(fr("Back to your game with Chidi Okafor · their move"), "Retour à votre partie avec Chidi Okafor · à l’autre de jouer");
  assert.equal(fr("Back to your game in room KMTP"), "Retour à votre partie dans la salle KMTP");
  assert.equal(fr("Back to your game in room KMTP · your move"), "Retour à votre partie dans la salle KMTP · à vous");
});

test("the board keeps the seat with when and which, and Home paints the line", () => {
  const src = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(src, /keepSeat\(\{ code, token, seat \}\)/); assert.match(src, /keepSeat\(\{ code, token, ticket, seat: self\.seat \}\)/);
  assert.match(src, /which === 'home'\) try \{ paintBackLine\(\)/);
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /id="backLine" type="button" hidden/);
  const k = keepSeat({ code: "KMTP", token: "t", seat: 2, at: 5 }); assert.deepEqual(k, { code: "KMTP", token: "t", at: 5 }, "a seat that is not one is left out");
});
