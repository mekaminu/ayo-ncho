// The keys, on How to play (web/keyhelp.js): the list of every key the board answers to, and ? to open it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { keyRows, showKeys, rowOf, HELP, KEYS_NOTE } from "../web/keyhelp.js";
import { keyAction, KEYS } from "../web/keys.js";
import { translate } from "../web/i18n.js";

const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const ids = (o) => keyRows(o).map((r) => r.id);

test("? asks for the list, from keyAction, and never with a modifier held or while typing", () => {
  assert.deepEqual(HELP, ["?"]);
  assert.deepEqual(KEYS.help, ["?"]);
  assert.deepEqual(keyAction({ key: "?", shiftKey: true }), { type: "help" }, "Shift + / on the Mac's keys");
  assert.equal(keyAction({ key: "?", metaKey: true }), null);
  assert.equal(keyAction({ key: "?" }, { tag: "INPUT" }), null);
  assert.equal(keyAction({ key: "/" }), null, "the slash itself is nothing");
});

test("the rows follow where you play: a hint and undo against the computer, take it back with a friend; F only where full screen works", () => {
  assert.deepEqual(ids(), ["pit", "sow", "deselect", "undo", "hint", "turn", "tilt", "zoom", "straight", "say", "help"]);
  assert.deepEqual(ids({ full: true }).slice(-2), ["full", "help"]);
  const on = keyRows({ online: true });
  assert.ok(!on.some((r) => r.id === "hint"), "no hint against a friend");
  assert.equal(on.find((r) => r.id === "undo").what, "ask to take your move back");
  assert.equal(keyRows().find((r) => r.id === "undo").what, "undo your move");
  assert.deepEqual(keyRows()[0].keys, ["1", "–", "6"]);
});

test("every key the list names does what it says in keyAction", () => {
  const press = { pit: "3", sow: "Enter", deselect: "Escape", undo: "u", hint: "h", turn: "ArrowLeft", tilt: "ArrowUp", zoom: "+", straight: "0", say: "s", full: "f", help: "?" };
  const rows = keyRows({ full: true });
  for (const r of rows) {
    const a = keyAction({ key: press[r.id] });
    assert.ok(a, r.id);
    assert.equal(rowOf(a, rows), r.id, `${press[r.id]} glints the ${r.id} line`);
  }
  assert.equal(keyAction({ key: " " }).type, "sow", "Space, as the sow line says");
  assert.equal(keyAction({ key: "6" }).pit, 5, "6 is your farthest pit");
});

test("a key with no line shown glints nothing", () => {
  const online = keyRows({ online: true });
  assert.equal(rowOf({ type: "hint" }, online), null);
  assert.equal(rowOf({ type: "full" }, keyRows()), null);
  assert.equal(rowOf(null, online), null);
  assert.equal(rowOf({ type: "view", kind: "zoom", dir: 1 }, online), "zoom");
});

test("shown where a keyboard is likely: a mouse or trackpad, or a key already pressed; never a phone in the hand", () => {
  assert.equal(showKeys({ mouse: true }), true);
  assert.equal(showKeys({ keysUsed: true }), true);
  assert.equal(showKeys({}), false);
  assert.equal(showKeys(), false);
});

test("French: every line, the heading and the note", () => {
  for (const r of keyRows({ full: true })) assert.notEqual(translate(r.what, "fr"), r.what, r.what);
  assert.equal(translate("Keys", "fr"), "Touches");
  assert.notEqual(translate(KEYS_NOTE, "fr"), KEYS_NOTE);
});

test("the page: the list's place on the How to play card, game.js draws it and ? opens it, cached for offline", () => {
  const html = read("../web/index.html"), game = read("../web/game.js"), sw = read("../web/sw.js");
  const rules = html.slice(html.indexOf('id="rules"'), html.indexOf('id="rulesClose"'));
  assert.match(rules, /id="rulesKeys" hidden/);
  assert.match(rules, /<dl id="keyRows">/);
  assert.ok(rules.includes(KEYS_NOTE), "the note in the page is the module's");
  assert.match(html, /prefers-reduced-motion:reduce\)\{#keyRows/);
  assert.match(game, /from '\.\/keyhelp\.js'/);
  assert.match(game, /a\.type === 'help'/);
  assert.match(game, /glintKey\(a\)/);
  assert.ok(sw.includes("'./keyhelp.js'"));
});
