// Our names (two of us on one phone): the names two players type in Settings → Opponent → Our names, and every line that
// carries them — the Game over title, the share words, Continue on Home, the table start, the faces — in English and French.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NAMES, DEFAULT_NAMES, NAME_MAX, cleanName, namesFrom, setNames, keepNames, readNames, named, faceMark, pillLine, tableStart, overTitle, shareText, continueLine, tableCards } from "../web/local.js";
import { startWords } from "../web/starts.js";
import { translate, keepTyped } from "../web/i18n.js";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";

test("a typed name is cleaned: spaces closed up, no markup or control characters, at most 16 letters as the eye counts them", () => {
  assert.equal(cleanName("  Meka  "), "Meka");
  assert.equal(cleanName("Mama   Chi"), "Mama Chi");
  assert.equal(cleanName("<b>Tete</b>"), "bTete/b");
  assert.equal(cleanName("Ada\u0007\n"), "Ada");
  assert.equal(cleanName(null), ""); assert.equal(cleanName(undefined), "");
  assert.equal(cleanName("Chukwuemekaaaaaaaaaaaaa").length, NAME_MAX);
  assert.equal([...cleanName("😀".repeat(30))].length, NAME_MAX, "an emoji counts as one letter, never cut in half");
  assert.equal(cleanName("Chiamaka Nwosu-Okafor"), "Chiamaka Nwosu-O");
  assert.equal(cleanName("abcdefghijklmno pq"), "abcdefghijklmno", "no space left dangling at the cut");
});

test("empty names are Player 1 and Player 2; two the same leave the second its default so the turn is never ambiguous", () => {
  assert.deepEqual(namesFrom("", ""), DEFAULT_NAMES);
  assert.deepEqual(namesFrom("Meka", ""), ["Meka", "Player 2"]);
  assert.deepEqual(namesFrom("", "Tete"), ["Player 1", "Tete"]);
  assert.deepEqual(namesFrom("Tete", "tete"), ["Tete", "Player 2"]);
  assert.deepEqual(namesFrom("Player 2", ""), ["Player 2", "Player 1"], "never two Player 2s");
  assert.deepEqual(namesFrom("", "player 1"), ["Player 1", "Player 2"]);
});

test("kept on the phone as typed; anything unreadable reads as no names", () => {
  assert.deepEqual(readNames(keepNames(" Meka ", "")), ["Meka", ""]);
  assert.deepEqual(readNames(""), ["", ""]); assert.deepEqual(readNames(null), ["", ""]);
  assert.deepEqual(readNames("{oops"), ["", ""]); assert.deepEqual(readNames('{"a":1}'), ["", ""]);
  assert.deepEqual(readNames('["<x>", 5]'), ["x", "5"]);
});

test("the names in use change in place, so every line that reads them follows at once", () => {
  setNames("", "");
  assert.equal(pillLine(), "on this phone"); assert.equal(faceMark(1), "2"); assert.equal(faceMark(0), "1"); assert.ok(!named(0) && !named(1));
  assert.equal(tableStart(), "Player 1 this end · Player 2 across the table");
  const arr = NAMES; setNames("Meka", "Tete"); assert.equal(arr, NAMES); assert.deepEqual(NAMES, ["Meka", "Tete"]);
  assert.equal(pillLine(), "Meka & Tete"); assert.equal(faceMark(1), "Tete"); assert.ok(named(0) && named(1));
  assert.equal(tableStart(), "Meka this end · Tete across the table");
  setNames("Meka", ""); assert.equal(pillLine(), "Meka & Player 2"); assert.equal(faceMark(1), "2");
  setNames("", "");
});

test("over whole games the cards, the title, Continue and the share words carry the typed names", () => {
  setNames("Meka", "Tete");
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let g = 0; g < 40; g++) {
    let s = newGame(g % 2 ? "ayo" : "ncho");
    while (!s.over) {
      const near = g % 2; const tc = tableCards(s, near);
      assert.equal(tc.near.name, NAMES[near]); assert.equal(tc.far.name, NAMES[1 - near]);
      const legal = legalMoves(s); s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
    }
    const t = overTitle(s);
    if (s.winner === "draw") assert.equal(t, "A draw"); else assert.equal(t, `${NAMES[s.winner]} wins`);
    const sh = shareText(s); assert.ok(sh.includes("Meka") && sh.includes("Tete") && !sh.includes("Player"), sh);
    const c = continueLine(s); assert.ok(/^Two of us · (Meka leads|Tete leads|level) \d+ – \d+ · \d+ moves in$/.test(c), c);
  }
  assert.ok(startWords({ first: 1 }, NAMES, false).includes("Tete"));
  setNames("", "");
});

test("in French a typed name stays as typed, and every line around it is French", () => {
  setNames("Mum", "Uncle Obi"); keepTyped(NAMES);
  const s0 = newGame("ncho");
  const lines = [
    tableStart(), `${NAMES[0]} wins`, `${NAMES[1]} starts · on this phone`, continueLine(s0).replace("level", "Mum leads"),
    shareText({ ...s0, winner: 0, stores: [27, 21], moves: new Array(40).fill(0) }), shareText({ ...s0, winner: "draw", stores: [24, 24], moves: [1, 2] }),
    `${NAMES[1]} · picked up again ×4`,
  ];
  for (const l of lines) {
    const f = translate(l, "fr");
    assert.notEqual(f, l, `«${l}» stayed English`);
    assert.ok(f.includes("Mum") || f.includes("Uncle Obi"), `the name is kept in «${f}»`);
    assert.ok(!/\b(wins|starts|leads|this end|across the table|picked up|beat|drew|moves)\b/.test(f), `English left in «${f}»`);
  }
  assert.equal(translate("Player 1 this end · Player 2 across the table", "fr"), "Joueur 1 de ce côté · Joueur 2 en face", "the defaults still turn French");
  keepTyped([]); setNames("", "");
  assert.equal(translate("Mum · picked up again ×4", "fr"), "Mum · picked up again ×4", "a name nobody typed is not taken for one");
});
