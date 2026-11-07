// Back from Settings goes back where you were (fix 7 Nov): web/settingsback.js decides, web/game.js only follows it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { settingsBackTo, SETTINGS_FROM, rulesWords, RULES_NEXT, RULES_FRESH } from "../web/settingsback.js";
import { FR } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("opened from the board of a game not yet begun, nothing changed: back to the board, not Home", () => {
  assert.equal(settingsBackTo({ from: "play", moves: 0 }), "play");
});

test("opened from the board of a game under way, nothing changed: back to the board", () => {
  assert.equal(settingsBackTo({ from: "play", moves: 7 }), "play");
});

test("opened from Home: back to Home, whatever game is kept", () => {
  for (const moves of [0, 9]) for (const sameRules of [true, false]) assert.equal(settingsBackTo({ from: "home", moves, sameRules }), "home");
  assert.equal(settingsBackTo({}), "home", "the default (Settings opened by a link, at the start) is Home");
  assert.equal(settingsBackTo({ from: "rooms" }), "home", "an unknown screen counts as Home");
  assert.deepEqual(SETTINGS_FROM, ["home", "play"]);
});

test("rules or players changed on a game not yet begun: a fresh game dealt on the board", () => {
  assert.equal(settingsBackTo({ from: "play", sameRules: false, moves: 0 }), "new");
  assert.equal(settingsBackTo({ from: "play", sameMode: false, moves: 0 }), "new");
});

test("rules changed on a game under way: Home, as before (Play there starts it with the new rules)", () => {
  assert.equal(settingsBackTo({ from: "play", sameRules: false, moves: 1 }), "home");
  assert.equal(settingsBackTo({ from: "play", sameMode: false, moves: 4 }), "home");
});

test("never dealt over something that is not a plain game (watching, a puzzle played out, a review)", () => {
  assert.equal(settingsBackTo({ from: "play", sameRules: false, moves: 0, special: true }), "home");
  assert.equal(settingsBackTo({ from: "play", moves: 0, special: true }), "play", "nothing changed: still the board");
});

test("in a room with a friend: always the board", () => {
  for (const from of ["home", "play"]) assert.equal(settingsBackTo({ online: true, from, sameRules: false, moves: 0 }), "play");
});

test("the game follows it: both doors say where they are, Back asks settingsBackTo, the service worker keeps it", () => {
  const g = read("web/game.js");
  assert.match(g, /import \{ settingsBackTo, rulesWords \} from '\.\/settingsback\.js'/);
  assert.match(g, /#homeSettings'\)\.addEventListener\('click', \(\) => \{ settingsFrom = 'home'/);
  assert.match(g, /#settingsBtn'\)\.addEventListener\('click', \(\) => \{ if \(!busy\) \{ settingsFrom = 'play'/);
  assert.match(g, /const to = settingsBackTo\(/);
  assert.match(read("web/sw.js"), /'\.\/settingsback\.js'/);
});

test("the rule-change word says what Back will do, in English and French", () => {
  assert.equal(rulesWords({ from: "play", moves: 0 }), RULES_FRESH);
  assert.equal(rulesWords({ from: "play", moves: 3 }), RULES_NEXT);
  assert.equal(rulesWords({ from: "home", moves: 0 }), RULES_NEXT);
  assert.equal(rulesWords({ from: "play", moves: 0, online: true }), RULES_NEXT);
  assert.equal(rulesWords({ from: "play", moves: 0, special: true }), RULES_NEXT);
  for (const w of [RULES_NEXT, RULES_FRESH]) assert.ok(FR[w], "French for " + w);
});
