// Family round the board, slice 2 (web/spectate.js): the board for whoever opens a watch link — both names on the cards,
// whose move it is, the Game over title — and the players' side: when the link may be sent, who came to watch; French too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spectateCards, spectateWords, spectateTitle, mayShareWatch, watchText, newWatchers, cameWords } from "../web/spectate.js";
import { newGame, applyMove, legalMoves, resign, agreeDraw } from "../engine/ayo.js";
import { translate } from "../web/i18n.js";
import { watchersLine } from "../web/online.js";
import { readFileSync } from "node:fs";

const room = (over = {}) => ({ players: [{ seat: 0, name: "Meka", online: true }, { seat: 1, name: "Tete", online: true }], watchers: [], ...over });
const fr = (s) => translate(s, "fr");

test("the cards: who opened the room sits near, the friend far; an empty seat waits for its player", () => {
  assert.deepEqual(spectateCards(room()).map((c) => c.name), ["Meka", "Tete"]);
  assert.deepEqual(spectateCards(room({ players: [{ seat: 0, name: "Meka", online: true }, null] })).map((c) => c.name), ["Meka", "Waiting for a player"]);
  assert.deepEqual(spectateCards(null).map((c) => c.name), ["Someone", "Waiting for a player"]);
});

test("whose move it is, from the engine's own state; away, not here yet, the line down", () => {
  let s = newGame("ncho");
  const w0 = spectateWords(s, room());
  assert.equal(w0.hint, `Watching · ${s.turn === 0 ? "Meka" : "Tete"}'s move`);
  assert.equal(s.turn === 0 ? w0.near : w0.far, "to move"); assert.equal(s.turn === 0 ? w0.far : w0.near, "");
  s = applyMove(s, legalMoves(s)[0]).state;
  const w1 = spectateWords(s, room());
  assert.equal(w1.hint, `Watching · ${s.turn === 0 ? "Meka" : "Tete"}'s move`);
  assert.equal(spectateWords(s, room({ players: [{ seat: 0, name: "Meka", online: true }, { seat: 1, name: "Tete", online: false }] })).far, "away — their seat is held");
  const alone = spectateWords(newGame("ncho"), room({ players: [{ seat: 0, name: "Meka", online: true }, null] }));
  assert.equal(alone.far, "not here yet"); assert.equal(alone.hint, "Watching · waiting for Meka's friend");
  assert.equal(spectateWords(s, room(), "reconnecting").hint, "Watching · reconnecting…");
  assert.equal(spectateWords(s, room(), "closed").hint, "Watching · no connection");
  const done = resign(s, 1).state;
  const wd = spectateWords(done, room()); assert.equal(wd.hint, "Watching · the game is over"); assert.equal(wd.near, ""); assert.equal(wd.far, "");
});

test("the Game over title is whose game it was, never You win", () => {
  const s = applyMove(newGame("ncho"), legalMoves(newGame("ncho"))[0]).state;
  assert.equal(spectateTitle(s, room()), "", "not over yet");
  const gave = resign(s, 1).state; assert.equal(spectateTitle(gave, room()), "Tete gave up · Meka wins");
  assert.equal(spectateTitle(agreeDraw(s).state, room()), "A draw");
  assert.equal(spectateTitle({ over: true, winner: 1, resigned: null }, room()), "Tete wins");
  assert.equal(spectateTitle({ over: true, winner: "draw", resigned: null }, room()), "A draw");
  assert.equal(spectateTitle({ over: true, winner: 0, resigned: null }, null), "Player 1 wins");
});

test("the players' side: the link only once seated with a key; who came to watch, oldest first", () => {
  assert.equal(mayShareWatch({ online: true, seated: true, key: "AbCdEfGh_jKlMn-p" }), true);
  for (const bad of [{ online: false, seated: true, key: "AbCdEfGh_jKlMn-p" }, { online: true, seated: false, key: "AbCdEfGh_jKlMn-p" }, { online: true, seated: true, key: null }, { online: true, seated: true, key: "short" }, {}, undefined])
    assert.equal(mayShareWatch(bad), false, JSON.stringify(bad));
  const a = [{ id: "1", name: "Mum" }], b = [{ id: "1", name: "Mum" }, { id: "2", name: "Uche" }, { id: "3", name: "Bola" }];
  assert.deepEqual(newWatchers(a, b), ["Uche", "Bola"]); assert.deepEqual(newWatchers(b, a), []); assert.deepEqual(newWatchers(null, a), ["Mum"]);
  assert.equal(cameWords("Mum"), "Mum came to watch");
  assert.match(watchText(), /watch/); assert.ok(!/https?:/.test(watchText()), "the link travels as the url, not in the words");
});

test("every word of it is French on a French phone, whatever the names", () => {
  const ENGLISH = /(?<!\p{L})(the|and|you|your|is|are|watch|watching|move|game|link|friend|player|waiting|seat|someone|draw|wins|gave)(?!\p{L})/iu;
  const lines = [];
  for (const n of ["Tete", "Ada Obi", "Kémi"]) {
    const r = room({ players: [{ seat: 0, name: n, online: true }, { seat: 1, name: "Bola", online: false }] });
    const s = newGame("ncho"); const w = spectateWords(s, r);
    lines.push(w.hint, w.far, spectateWords(s, room({ players: [{ seat: 0, name: n, online: true }, null] })).hint, cameWords(n), `Watching ${n} and Bola`, `Watching ${n}'s room`,
      ...spectateTitle(resign(applyMove(s, legalMoves(s)[0]).state, 1).state, r).split(" · "), watchersLine({ watchers: [{ name: n }, { name: "Uche" }] }));
  }
  lines.push("to move", "not here yet", "Waiting for a player", "Watching · reconnecting…", "Watching · no connection", "Watching · the game is over", watchText(), "Send a watch link",
    "Family watching? Send them a watch link", "The watch link comes once the room is open", "Watch link copied — whoever opens it follows the game", "That watch link has closed — the game is over or the link is old",
    "The players see this name while you watch. Asked once, kept on this phone.", "Watch", "Finding the game…", "They agreed a draw", "A move was taken back", "A new game", "A draw");
  for (const line of lines) {
    const f = line.split(" · ").map(fr).join(" · ");
    assert.notEqual(f, line, `no French for «${line}»`);
    assert.ok(!ENGLISH.test(f.replace(/Tete|Ada Obi|Kémi|Bola|Uche|Ayo|Nchò/g, "")), `English left in «${f}» (from «${line}»)`);
    assert.ok(!/ [:;?!]/.test(f), `a plain space before : ; ? ! in «${f}»`);
  }
});

test("the page carries the watch link button, the watchers chip, and the shell caches spectate.js", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /id="watchLinkBtn"/); assert.match(html, /id="watchers" hidden/); assert.match(html, /id="watchersWords"/);
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/spectate\.js'/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /function canPress\(\) \{ return !\(spect\.on \|\|/, "nothing on a watcher's board can be pressed");
});
