// Look from above (idea 7 Nov): Settings → Board → Look, at the table (as before) or from above.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VIEWS, ABOVE_PHI, lookPref, lookNow, restPhi, phiFloor, lookNote, lookToast } from "../web/look.js";
import { nudgeView, LIMITS } from "../web/view.js";
import { TABLE_PHI } from "../web/tabletop.js";
import { FR } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("the choice: at the table unless from above is chosen; ?look= wins for a visit", () => {
  assert.deepEqual(VIEWS, ["table", "above"]);
  assert.equal(lookPref("above"), "above");
  for (const v of ["table", "", null, undefined, "ABOVE", "top"]) assert.equal(lookPref(v), "table");
  assert.equal(lookNow("above", null), "above");
  assert.equal(lookNow("table", "above"), "above");
  assert.equal(lookNow("above", "table"), "table");
  assert.equal(lookNow("above", "nonsense"), "above", "a stray parameter keeps the saved choice");
});

test("from above stands nearly straight over the board, still a bowl; at the table nothing changes", () => {
  assert.ok(ABOVE_PHI > 0.05 && ABOVE_PHI < 0.25, "a touch of tilt, never flat straight down");
  for (const chosen of [0.5, 0.72, 0.86]) { assert.equal(restPhi("table", chosen), chosen); assert.equal(restPhi("above", chosen), ABOVE_PHI); }
  assert.equal(restPhi("above", 0.1), 0.1, "never more tilted than the framing chose");
  assert.ok(ABOVE_PHI < TABLE_PHI, "flatter than the Fold half folded");
});

test("a drag and the keys may tilt it as far up as it rests, and no further", () => {
  assert.equal(phiFloor(0.72), 0.35, "at the table: the limit as before");
  assert.equal(phiFloor(ABOVE_PHI), ABOVE_PHI);
  assert.equal(phiFloor(TABLE_PHI), TABLE_PHI, "the Fold half folded no longer jumps up to 0.35 on the first drag");
  const fit = { phi: ABOVE_PHI, dist: 1.4 };
  const up = nudgeView({ theta: 0, phi: ABOVE_PHI, dist: 1.4 }, fit, "tilt", 1);
  assert.equal(up.phi, ABOVE_PHI, "↑ at the rest stays there (a soft click)");
  const down = nudgeView({ theta: 0, phi: ABOVE_PHI, dist: 1.4 }, fit, "tilt", -1);
  assert.ok(Math.abs(down.phi - (ABOVE_PHI + 0.08)) < 1e-9, "↓ tilts it towards you");
  const old = nudgeView({ theta: 0, phi: 0.36, dist: 1.4 }, { phi: 0.72, dist: 1.4 }, "tilt", 1);
  assert.equal(old.phi, LIMITS.phiMin, "at the table the old limit holds");
  assert.equal(nudgeView({ theta: 0, phi: 0.36, dist: 1 }, { dist: 1 }, "tilt", 1).phi, LIMITS.phiMin, "a fit without a tilt keeps the old limit");
});

test("the words, in English and French", () => {
  assert.notEqual(lookNote("above"), lookNote("table"));
  assert.notEqual(lookToast("above"), lookToast("table"));
  for (const s of [lookNote("above"), lookNote("table"), lookToast("above"), lookToast("table"), "Look", "At the table", "From above", "how you see the board ·"]) assert.ok(FR[s], `French for "${s}"`);
});

test("wired: Settings → Board has the choice, the framing and the drag follow it, the shell caches look.js", () => {
  const html = read("web/index.html"), game = read("web/game.js"), sw = read("web/sw.js");
  assert.match(html, /data-set="look"><button class="segbtn" data-v="table">At the table<\/button><button class="segbtn" data-v="above">From above<\/button>/);
  assert.match(html, /id="lookNow"/);
  assert.match(game, /phi = restPhi\(LOOK, /);
  assert.match(game, /Math\.max\(phiFloor\(fitPhi\)/);
  assert.match(game, /name === 'look'/);
  assert.match(game, /function relook\(\)/);
  assert.ok(sw.includes("'./look.js'"));
});
