// The Fold as a little table (idea 7 Nov): half folded on its side, the board lies on the flat half, the cards stand up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tableFold, tableRoom, tableVars, TABLE_MIN, TABLE_GAP, TABLE_PHI } from "../web/tabletop.js";

const seg = (x, y, width, height) => ({ x, y, width, height });

test("two halves one above the other, the whole width: the crease is between them", () => {
  // the Fold open on its side and half folded (Flex mode): ~832 x 690, a 10 px crease
  assert.deepEqual(tableFold([seg(0, 0, 832, 340), seg(0, 350, 832, 340)], 832, 690), { top: 340, bottom: 350 });
  // given bottom first, still the same crease
  assert.deepEqual(tableFold([seg(0, 350, 832, 340), seg(0, 0, 832, 340)], 832, 690), { top: 340, bottom: 350 });
  // a crease with no width
  assert.deepEqual(tableFold([seg(0, 0, 900, 400), seg(0, 400, 900, 380)], 900, 780), { top: 400, bottom: 400 });
});

test("one flat screen, a book (halves side by side), or halves too small: no table", () => {
  assert.equal(tableFold(null, 832, 690), null);
  assert.equal(tableFold(undefined, 832, 690), null);
  assert.equal(tableFold([seg(0, 0, 832, 690)], 832, 690), null, "opened flat");
  assert.equal(tableFold([seg(0, 0, 410, 832), seg(422, 0, 410, 832)], 832, 832), null, "a book: the board stays whole across it");
  assert.equal(tableFold([seg(0, 0, 832, 100), seg(0, 110, 832, 580)], 832, 690), null, "the upper half too short for the cards");
  assert.equal(tableFold([seg(0, 0, 832, 580), seg(0, 590, 832, TABLE_MIN - 1)], 832, 590 + TABLE_MIN - 1), null, "the lower half too short for the board");
  assert.equal(tableFold([seg(0, 0, 832, 340), seg(0, 350, 832, 340), seg(0, 700, 832, 300)], 832, 1000), null, "three screens");
  assert.equal(tableFold([seg(0, 0, 832, 340), seg(0, 350, 832, 340)], 0, 0), null);
});

test("?table=1 makes a crease across the middle, ?table=0 never", () => {
  assert.deepEqual(tableFold(null, 832, 690, "1"), { top: 345, bottom: 345 });
  assert.deepEqual(tableFold([seg(0, 0, 832, 340), seg(0, 350, 832, 340)], 832, 690, "1"), { top: 340, bottom: 350 }, "a real crease wins");
  assert.equal(tableFold([seg(0, 0, 832, 340), seg(0, 350, 832, 340)], 832, 690, "0"), null);
  assert.equal(tableFold(null, 390, 2 * TABLE_MIN - 1, "1"), null, "too short to split");
});

test("the board's room is the lower half, clear of the crease; the page learns where the crease is", () => {
  const f = { top: 340, bottom: 350 }, r = tableRoom(f, 832, 690);
  assert.equal(r.t, 350 + TABLE_GAP); assert.ok(r.b <= 690 && r.b > r.t + 100); assert.ok(r.l > 0 && r.r < 832 && r.r - r.l > 700);
  assert.deepEqual(tableVars(f, 690), { "--fold-top": "340px", "--fold-up": "350px" });
  assert.ok(TABLE_PHI < 0.5, "looked at from higher than the Mac's view: the board lies on the table");
});

test("the game follows the crease: framed in the lower half, the cards stand up in the upper, and the shell caches it", () => {
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /from '\.\/tabletop\.js'/);
  assert.match(game, /foldRoom\(table, w, h\)/, "room() frames the board in the lower half");
  assert.match(game, /vertical-viewport-segments/, "a fold or unfold without a resize still re-frames");
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /html\.tabletop \.hud\.bottom\{/, "your card stands up in the upper half");
  assert.match(html, /html\.tabletop \.bar\{/, "the buttons too");
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /'\.\/tabletop\.js'/);
});
