// Game numbers and crash reports (L13): what may be sent is fixed, nothing personal can get through, the switch stops it,
// and with no sink (today: no Firebase project yet) nothing is recorded at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeTelemetry, memorySink, clean, crashOf, resultOf, teleNote, EVENTS } from "../web/telemetry.js";

const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
const src = readFileSync(new URL("../web/telemetry.js", import.meta.url), "utf8");

test("with no sink nothing is recorded, switch on or off", () => {
  const t = makeTelemetry({ on: () => true });
  assert.equal(t.recording, false);
  assert.equal(t.track("game_start", { game: "ncho", vs: "hard", first: true }), null);
  assert.equal(t.crash("error", new TypeError("x")), null);
  assert.equal(teleNote(t, true), "nothing is recorded yet");
  assert.equal(teleNote(t, false), "nothing is recorded on the web link");
});

test("the switch off passes nothing on", () => {
  let on = false; const sink = memorySink(); const t = makeTelemetry({ on: () => on, sink });
  t.track("store_open", { from: "home" }); assert.equal(sink.log.length, 0); assert.equal(teleNote(t, true), "off");
  on = true; t.track("store_open", { from: "home" }); assert.equal(sink.log.length, 1); assert.equal(teleNote(t, true), "on");
  assert.deepEqual(sink.log[0], { name: "store_open", params: { from: "home", platform: "web" } });
});

test("only the fixed moments go, each with only its own words", () => {
  assert.deepEqual(Object.keys(EVENTS).sort(), ["crash", "game_end", "game_start", "invite_joined", "invite_sent", "lesson_end", "purchase", "puzzle_play", "store_open"]);
  assert.equal(clean("anything_else", { a: 1 }), null);
  assert.deepEqual(clean("game_end", { game: "ncho", vs: "master", result: "win", ended: "gave_up", moves: 37, first: 1, name: "Meka", code: "EDNE" }),
    { game: "ncho", vs: "master", result: "win", ended: "gave_up", moves: "≤40", first: true });
  assert.deepEqual(clean("game_start", { game: "okwe", vs: "Tete", first: false }), { first: false }); // words off the lists are dropped
  assert.deepEqual(clean("purchase", { product: "gold", price: "£3.99" }), { product: "gold" });
  assert.deepEqual(clean("purchase", { product: "coins_1000" }), {});
  assert.deepEqual(clean("lesson_end", { how: "skipped", step: 2 }), { how: "skipped", step: "≤2" });
  assert.deepEqual(clean("game_end", { moves: 140 }), { moves: ">100" });
});

test("nothing typed can ever be sent: every value is from a list, a flag, a band or our own file name", () => {
  const nasty = { game: "Meka's game", vs: "<script>", result: "win; drop", how: "whatsapp https://x", from: "home?name=Meka", product: "gold ", as: "host\n", file: "../../etc/passwd", line: "12abc", type: "Meka", kind: "error", moves: "Meka", step: {} };
  for (const name of Object.keys(EVENTS)) {
    const p = clean(name, nasty);
    for (const [k, v] of Object.entries(p)) {
      assert.ok(typeof v === "boolean" || /^(≤|>)\d+$/.test(v) || ["other", "error"].includes(v), `${name}.${k} = ${v}`);
    }
  }
});

test("a crash says its kind, class and where in our code — never the message", () => {
  const sink = memorySink(); const t = makeTelemetry({ sink, platform: "android" });
  const e = new TypeError("Cannot read properties of Meka's room EDNE");
  e.stack = "TypeError: Cannot read…\n    at play (https://localhost/game.js:1063:12)\n    at x (https://localhost/board.js:4:1)";
  const p = t.crash("error", e);
  assert.deepEqual(p, { kind: "error", type: "TypeError", file: "game.js", line: 1070, platform: "android" });
  assert.ok(!JSON.stringify(sink.log).includes("Meka") && !JSON.stringify(sink.log).includes("EDNE"));
  assert.deepEqual(crashOf("error", null, "https://ayo-ncho.onrender.com/online.js", 88), { kind: "error", type: "other", file: "online.js", line: 88 });
  const odd = crashOf("rejection", { name: "MekaError" }); assert.equal(clean("crash", odd).type, "other");
  assert.equal(makeTelemetry({ sink, platform: "windows" }).track("store_open", { from: "home" }).platform, "web");
});

test("a game shown twice counts once; a broken sink never troubles the game", () => {
  const sink = memorySink(); const t = makeTelemetry({ sink });
  t.track("game_end", { result: "win" }, "e:1"); t.track("game_end", { result: "win" }, "e:1"); t.track("game_end", { result: "loss" }, "e:2");
  assert.equal(sink.log.length, 2);
  const bad = makeTelemetry({ sink: () => { throw new Error("offline"); } });
  assert.doesNotThrow(() => bad.track("store_open", { from: "settings" }));
});

test("the result from the near seat", () => {
  assert.equal(resultOf({ winner: 0 }, 0), "win"); assert.equal(resultOf({ winner: 1 }, 0), "loss");
  assert.equal(resultOf({ winner: 1 }, 1), "win"); assert.equal(resultOf({ winner: "draw" }, 1), "draw");
});

test("the module keeps nothing and calls nothing outside", () => {
  assert.ok(!/localStorage|fetch\(|XMLHttpRequest|sendBeacon|WebSocket|document\./.test(src.replace(/\/\/.*$/gm, "")));
});

test("the game wires every moment, the switch in Settings → Privacy, and the offline cache", () => {
  for (const m of ["game_start", "game_end", "lesson_end", "puzzle_play", "invite_sent", "invite_joined", "store_open", "purchase"]) assert.ok(game.includes(`'${m}'`), m);
  for (const how of ["whatsapp", "copy", "share"]) assert.ok(game.includes(`how: '${how}'`), how);
  assert.ok(/addEventListener\('error'/.test(game) && /addEventListener\('unhandledrejection'/.test(game));
  assert.ok(/<span class="eyebrow">Privacy<\/span>[\s\S]*data-set="tele"/.test(html));
  assert.ok(html.includes('id="teleNow"'));
  assert.ok(sw.includes("'./telemetry.js'"));
});
