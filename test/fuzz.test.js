// Only real games over the line (idea 9 Nov): odd and hostile messages never reach an unexpected error, never leave a room
// holding a game that does not exist, and never stop a real game being played. tools/fuzz-protocol.js does the throwing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Rooms, lineText, normaliseCode } from "../server/rooms.js";
import { cleanRules, isVariant, RULES, RULE_VALUES, newGame, VARIANTS } from "../engine/ayo.js";
import { fuzz, oddMessage, rng } from "../tools/fuzz-protocol.js";

test("only the two games are games: names on Object's prototype are not", () => {
  for (const v of VARIANTS) assert.equal(isVariant(v), true);
  for (const v of ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf", "NCHO", "ncho ", "", null, 4, {}, ["ncho"]]) assert.equal(isVariant(v), false, String(v));
  const r = new Rooms({ secret: "t" });
  for (const v of ["constructor", "toString", "__proto__", "hasOwnProperty"]) assert.throws(() => r.create({ variant: v, name: "x" }), { code: "variant" });
  assert.equal(r.rooms.size, 0);
});

test("rule switches: the real ones kept, nonsense given the game's own rule, nothing extra carried", () => {
  assert.deepEqual(cleanRules("ncho", {}), RULES.ncho);
  assert.deepEqual(cleanRules("ayo"), RULES.ayo);
  assert.deepEqual(cleanRules("ncho", { capture: 23, relay: false, last8: false }), { capture: 23, relay: false, last8: false }); // a custom game from Settings
  assert.deepEqual(cleanRules("ayo", { relay: true }), { ...RULES.ayo, relay: true });
  assert.deepEqual(cleanRules("ncho", { capture: "4", relay: "yes", last8: 1, toString: "x", seeds: 99 }), RULES.ncho);
  assert.deepEqual(cleanRules("ncho", JSON.parse('{"__proto__":{"capture":23},"capture":7}')), RULES.ncho);
  assert.deepEqual(cleanRules("ncho", [1, 2]), RULES.ncho);
  assert.deepEqual(Object.keys(cleanRules("ayo", { x: 1 })), Object.keys(RULE_VALUES));
  const r = new Rooms({ secret: "t" });
  const made = r.create({ variant: "ncho", rules: { capture: 23, relay: "hasOwnProperty", toString: "\ud800", x: { a: 1 } }, name: "Meka" });
  const room = r.rooms.get(made.code);
  assert.deepEqual(room.rules, { capture: 23, relay: true, last8: true });
  assert.deepEqual(room.game.rules, room.rules);
  assert.deepEqual(made.room.rules ?? room.rules, room.rules);
  // a room made with real switches seals exactly as it did before (tickets kept on phones still check)
  const plain = r.create({ variant: "ayo", rules: { relay: true }, name: "A" });
  assert.deepEqual(r.rooms.get(plain.code).rules, { ...RULES.ayo, relay: true });
  assert.deepEqual(newGame("ayo", { relay: true }).rules, r.rooms.get(plain.code).rules);
});

test("text from the line: objects with their own toString are nothing, not a crash", () => {
  assert.equal(lineText("Tete"), "Tete"); assert.equal(lineText(12), "12"); assert.equal(lineText(NaN), ""); assert.equal(lineText(null), "");
  assert.equal(lineText({ toString: 1 }), ""); assert.equal(lineText(["ABCD"]), "");
  assert.equal(normaliseCode({ toString: 1 }), ""); assert.equal(normaliseCode("ab-cd"), "ABCD");
  const r = new Rooms({ secret: "t" });
  const h = r.create({ variant: "ncho", name: { toString: 1 } });
  assert.equal(r.rooms.get(h.code).seats[0].name, "Host");
  const k = r.knock(h.code, { name: ["x"] }); assert.equal(k.name, "Friend");
  const j = r.admit(h.code, h.token, k.id);
  assert.throws(() => r.move(h.code, h.token, { valueOf: () => 2 }), { code: "illegal" });
  assert.throws(() => r.move(h.code, h.token, { toString: 1 }), { code: "illegal" });
  assert.equal(r.move(h.code, h.token, "2").pit, 2); // a pit sent as figures still plays, as before
  assert.ok(j);
});

test("the odd messages are odd, and the same seed makes the same ones", () => {
  const a = rng(5), b = rng(5); const ma = [], mb = [];
  for (let i = 0; i < 200; i++) { ma.push(oddMessage(a, { code: "ABCD" })); mb.push(oddMessage(b, { code: "ABCD" })); }
  assert.deepEqual(ma, mb);
  assert.ok(ma.some((m) => m.includes('"__proto__"')) && ma.some((m) => { try { JSON.parse(m); return false; } catch { return true; } }));
});

test("thousands of odd messages at every stage of a room: no unexpected error, every room a real game, a real game after", async () => {
  const res = await fuzz({ rounds: 12, seed: 3, perBurst: 40 });
  assert.ok(res.sent > 30000, `sent ${res.sent}`);
  assert.deepEqual(res.unexpected, []);
  assert.deepEqual(res.problems, []);
  assert.ok(res.played > 10);
  assert.equal({}.polluted, undefined);
});
