// Ayo next (idea 8 Nov): after a game with a friend either side can ask for the other game next (Nchò ↔ Ayo);
// it starts only when both have asked for the same one. The pure rules (web/nextgame.js), the room on the server
// (server/rooms.js), the buttons and toasts on the Game over card, and every one of them in French.
import { test } from "node:test";
import assert from "node:assert/strict";
import { otherGame, askedGame, wishOf, afterAsk, rematchButtons, askWords, switchedWords } from "../web/nextgame.js";
import { Rooms } from "../server/rooms.js";
import { replay, legalMoves, RULES } from "../engine/ayo.js";
import { translate } from "../web/i18n.js";
import { readFileSync } from "node:fs";

const seeded = (seed = 7) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
function playOut(rooms, code, host, friend) {
  let snap = rooms.snapshot(code); let n = 0;
  while (!snap.state.over && n++ < 600) { const g = replay(snap.state.moves, snap.variant, snap.rules, snap.state.first); rooms.move(code, g.turn === 0 ? host.token : friend.token, legalMoves(g)[0]); snap = rooms.snapshot(code); }
  assert.ok(snap.state.over); return snap;
}
function room(variant = "ncho", rules = {}) {
  const rooms = new Rooms({ random: seeded(), secret: "s" });
  const host = rooms.create({ variant, rules, name: "Meka" }); const friend = rooms.join(host.code, { name: "Tete" });
  if (rooms.snapshot(host.code).knocks?.length) rooms.admit?.(host.code, host.token, rooms.snapshot(host.code).knocks[0].id);
  return { rooms, host, friend, code: host.code };
}

test("the pure rules: an ask names a game or means the same again; a different ask clears the other's; both the same starts it", () => {
  assert.equal(otherGame("ncho"), "ayo"); assert.equal(otherGame("ayo"), "ncho");
  assert.equal(askedGame(undefined, "ayo"), "ayo"); assert.equal(askedGame("bao", "ncho"), "ncho"); assert.equal(askedGame("ayo", "ncho"), "ayo");
  assert.equal(wishOf(null, "ncho"), false); assert.equal(wishOf({ wantsRematch: false, wantsGame: "ayo" }, "ncho"), false);
  assert.equal(wishOf({ wantsRematch: true }, "ncho"), "ncho"); assert.equal(wishOf({ wantsRematch: true, wantsGame: "ayo" }, "ncho"), "ayo");
  let r = afterAsk([false, false], 0, undefined, "ncho"); assert.deepEqual(r, { wishes: ["ncho", false], start: null });
  r = afterAsk(r.wishes, 1, "ayo", "ncho"); assert.deepEqual(r, { wishes: [false, "ayo"], start: null }, "asking for the other game clears the host's ask for the old one");
  r = afterAsk(r.wishes, 0, "ayo", "ncho"); assert.deepEqual(r, { wishes: ["ayo", "ayo"], start: "ayo" });
  assert.deepEqual(afterAsk(["ncho", false], 1, undefined, "ncho").start, "ncho", "an older board's plain ask still starts the same game");
  assert.deepEqual(afterAsk(["ayo", false], 0, "ncho", "ncho"), { wishes: ["ncho", false], start: null }, "changing your own mind");
});

test("the room: asking for Ayo after Nchò starts Ayo with its own rules once both ask; the same again keeps the room's own switches", () => {
  const { rooms, host, friend, code } = room("ncho", { last8: false });
  playOut(rooms, code, host, friend);
  let r = rooms.rematch(code, host.token, "ayo");
  assert.equal(r.started, false); assert.equal(r.room.players[0].wantsRematch, true); assert.equal(r.room.players[0].wantsGame, "ayo");
  assert.equal(r.room.variant, "ncho", "nothing changes until both have asked");
  r = rooms.rematch(code, friend.token); // the friend's plain Play again is for Nchò: it clears the host's Ayo
  assert.equal(r.started, false); assert.equal(r.room.players[0].wantsRematch, false); assert.equal(r.room.players[1].wantsGame, "ncho");
  r = rooms.rematch(code, host.token, "ncho");
  assert.equal(r.started, true); assert.equal(r.room.variant, "ncho"); assert.equal(r.room.rules.last8, false, "the same game keeps the room's switches");
  assert.equal(r.room.players[0].wantsGame, undefined); assert.equal(r.room.players[1].wantsRematch, false);
  playOut(rooms, code, host, friend);
  rooms.rematch(code, friend.token, "ayo"); r = rooms.rematch(code, host.token, "ayo");
  assert.equal(r.started, true); assert.equal(r.room.variant, "ayo"); assert.deepEqual(r.room.rules, { ...RULES.ayo }, "a switch starts the other game with its own rules");
  assert.equal(r.room.state.variant, "ayo"); assert.deepEqual(r.room.state.moves, []); assert.equal(r.room.games, 2);
  // a move in the new game is checked by Ayo's rules
  const g = replay([], "ayo", r.room.rules, r.room.state.first);
  rooms.move(code, g.turn === 0 ? host.token : friend.token, legalMoves(g)[0]);
  assert.equal(rooms.snapshot(code).state.moves.length, 1);
});

test("the room after a switch still comes back from a restart: the ticket carries the new game and its seal checks", () => {
  const { rooms, host, friend, code } = room("ncho");
  playOut(rooms, code, host, friend);
  rooms.rematch(code, host.token, "ayo"); rooms.rematch(code, friend.token, "ayo");
  const snap = rooms.snapshot(code);
  const g = replay([], snap.variant, snap.rules, snap.state.first); const m = rooms.move(code, g.turn === 0 ? host.token : friend.token, legalMoves(g)[0]);
  const after = rooms.snapshot(code);
  const ticket = { rid: after.rid, variant: after.variant, rules: after.rules, games: after.games, names: after.players.map((p) => p && p.name), first: after.state.first, moves: after.state.moves, resigned: null, sig: m.sig };
  const fresh = new Rooms({ random: seeded(3), secret: "s" });
  const back = fresh.rejoin(code, host.token, ticket);
  const rs = back.room || fresh.snapshot(code);
  assert.equal(rs.variant, "ayo"); assert.deepEqual(rs.state.moves, after.state.moves);
});

test("the buttons: Play again and Play Ayo next; the friend's ask comes first; your own ask waits and can be changed", () => {
  let b = rematchButtons({ current: "ncho", name: "Tete" });
  assert.deepEqual(b, { main: { game: "ncho", text: "Play again", disabled: false }, alt: { game: "ayo", text: "Play Ayo next" } });
  b = rematchButtons({ current: "ncho", theirs: "ayo", name: "Tete" });
  assert.equal(b.main.game, "ayo"); assert.equal(b.main.text, "Play Ayo next — Tete is ready"); assert.equal(b.alt.text, "Nchò again instead"); assert.equal(b.alt.game, "ncho");
  b = rematchButtons({ current: "ayo", theirs: "ayo", name: "Tete" });
  assert.equal(b.main.text, "Play again — Tete is ready"); assert.equal(b.alt.text, "Play Nchò next");
  b = rematchButtons({ current: "ncho", mine: "ncho", name: "Tete" });
  assert.equal(b.main.text, "Waiting for Tete…"); assert.equal(b.main.disabled, true); assert.equal(b.alt.text, "Ayo next instead");
  b = rematchButtons({ current: "ncho", mine: "ayo", name: "Tete" });
  assert.equal(b.main.text, "Waiting for Tete… · Ayo next"); assert.equal(b.alt.text, "Nchò again instead"); assert.equal(b.alt.game, "ncho");
  assert.equal(askWords("Tete", "ncho", "ncho"), "Tete wants to play again");
  assert.equal(askWords("Tete", "ayo", "ncho"), "Tete wants to play Ayo next");
  assert.equal(switchedWords("ayo"), "Now Ayo");
});

test("every one of them in French, whatever the friend is called", () => {
  const fr = (s) => translate(s, "fr");
  for (const name of ["Tete", "Ada Obi", "Kémi"]) {
    const lines = [];
    for (const current of ["ncho", "ayo"]) for (const mine of [false, "ncho", "ayo"]) for (const theirs of [false, "ncho", "ayo"]) {
      if (mine && theirs) continue; const b = rematchButtons({ current, mine, theirs, name }); lines.push(b.main.text, b.alt.text);
    }
    for (const g of ["ncho", "ayo"]) lines.push(askWords(name, g, "ncho"), askWords(name, g, "ayo"), switchedWords(g) + " — your move", switchedWords(g) + ` — ${name} starts`, switchedWords(g) + " — a new game", switchedWords(g) + ` · game 3 · ${name} leads 2–1 — your move`);
    for (const l of lines) { const f = fr(l); assert.notEqual(f, l, `no French for «${l}»`); assert.ok(!/\b(Play|again|next|instead|Waiting|wants|Now|your move|starts|ready)\b/.test(f), `English left in «${f}»`); }
  }
  assert.equal(fr("Play Ayo next"), "Jouer à l’Ayo ensuite");
  assert.equal(fr("Now Nchò — your move"), "Place au Nchò — à vous");
});

test("the page: the quiet second button sits under Play again, hidden outside a room, and the service worker keeps the module", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /id="rematch">Play again<\/button>\s*<!--[^>]*-->\s*<button class="btn ghost" id="rematchAlt" type="button" hidden>/);
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"); assert.match(sw, /'\.\/nextgame\.js'/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /function paintRematch\(\)/); assert.match(game, /net\.rematch\(game\)/);
});
