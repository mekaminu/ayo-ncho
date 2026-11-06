// Sow on the first tap: what a press on a pit does with the switch on and off, and the Mac's hover words with it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { oneTapOn, pressAction } from "../web/onetap.js";
import { hoverAt } from "../web/hover.js";
import { newGame, legalMoves, applyMove } from "../engine/ayo.js";

const prefsOf = (v) => ({ get: (k, d) => (k === "onetap" && v !== undefined ? v : d) });

test("off unless the player turns it on", () => {
  assert.equal(oneTapOn(prefsOf(undefined)), false);
  assert.equal(oneTapOn(prefsOf("0")), false);
  assert.equal(oneTapOn(prefsOf("1")), true);
  assert.equal(oneTapOn(null), false);
});

test("switch off: the first press picks, the second sows, whatever pressed it", () => {
  for (const via of ["tap", "key", "button"]) {
    assert.equal(pressAction({ pit: 3, selected: null, via }), "pick");
    assert.equal(pressAction({ pit: 3, selected: 4, via }), "pick", "another pit is picked instead");
    assert.equal(pressAction({ pit: 3, selected: 3, via }), "sow");
  }
});

test("switch on: a tap or click on the board sows at once", () => {
  assert.equal(pressAction({ pit: 2, selected: null, via: "tap", oneTap: true }), "sow");
  assert.equal(pressAction({ pit: 2, selected: 5, via: "tap", oneTap: true }), "sow", "a pit Hint picked does not hold back another tapped pit");
  assert.equal(pressAction({ pit: 5, selected: 5, via: "tap", oneTap: true }), "sow", "the hinted pit sows on one tap too");
});

test("switch on: the keys, the screen reader's buttons and the lesson keep the two steps", () => {
  assert.equal(pressAction({ pit: 2, via: "key", oneTap: true }), "pick", "1–6 pick, Enter sows");
  assert.equal(pressAction({ pit: 2, via: "key", selected: 2, oneTap: true }), "sow");
  assert.equal(pressAction({ pit: 2, via: "button", oneTap: true }), "pick", "their labels say Enter to sow");
  assert.equal(pressAction({ pit: 2, via: "tap", oneTap: true, lesson: true }), "pick", "the lesson picks its own pit for you");
  assert.equal(pressAction({ pit: 2, via: "tap", oneTap: true, lesson: true, selected: 2 }), "sow");
});

test("the mouse on the Mac says a click sows with the switch on, from either seat, over random games", () => {
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const v of ["ncho", "ayo"]) for (let g = 0; g < 20; g++) {
    let s = newGame(v);
    while (!s.over) {
      const legal = legalMoves(s);
      for (const pit of legal) {
        const on = hoverAt({ state: s, pit, you: s.turn, press: true, oneTap: true });
        const off = hoverAt({ state: s, pit, you: s.turn, press: true });
        assert.match(on.words, / — click to sow it$/); assert.match(off.words, / — click to see where they go$/);
        assert.equal(on.ring, true); assert.equal(on.cursor, "pointer");
        assert.equal(on.words.replace(/ — .*$/, ""), off.words.replace(/ — .*$/, ""), "the pit and its seeds are said the same way");
      }
      s = applyMove(s, legal[Math.floor(rnd() * legal.length)]).state;
    }
  }
});

test("the setting is in Settings → Feel, off, in French too, and cached for no signal", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /data-set="onetap" aria-checked="false" aria-label="Sow on the first tap"/);
  const i18n = readFileSync(new URL("../web/i18n.js", import.meta.url), "utf8");
  assert.match(i18n, /'Sow on the first tap': 'Semer au premier toucher'/);
  assert.match(i18n, /'click to sow it':/);
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/onetap\.js'/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /pressPit\(hit\.object\.userData\.pit, 'tap'\)/, "the board's tap says it is a tap");
  assert.match(game, /pressPit\(a\.pit, 'key'\)/, "the digits say they are keys");
});
