// A spoiled save never stops the board (idea 9 Nov): whatever is in the phone's storage — a write cut off mid-save, a shape an
// older build wrote, names on every JavaScript object — the game reads it as "start fresh" for that one thing and opens.
// tools/spoiled.py checks the whole page in a browser (docs/launch/spoiled.md); this checks the readers in node on every push.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { playable, ALL_LEVELS } from "../web/entitle.js";
import { isVariant, cleanRules, RULES } from "../engine/ayo.js";

const BAD = ["", '{"moves":[3,8,', "null", "[]", "{}", "-1", "NaN", "1e999", "true", '"x"', "[object Object]", "__proto__", "constructor",
  '[1,"a",null,{},[],true]', '{"days":"x","seen":3,"at":"soon","id":{},"level":7,"n":-5,"wins":"many","fps":"x"}',
  '{"__proto__":{"x":1},"constructor":{"prototype":{}}}', "x".repeat(20000), "9999-99-99", null, undefined];

test("an opponent the save spoiled is Nnamdi (Medium); the real ones are kept, and Gold's falls back to Mama Ngozi", () => {
  for (const v of BAD) assert.equal(playable(v, new Set()), "medium", String(v).slice(0, 30));
  for (const v of ["toString", "hasOwnProperty", "Easy", " easy", 3, {}, []]) assert.equal(playable(v, new Set()), "medium");
  for (const l of ALL_LEVELS.filter((l) => l !== "master")) assert.equal(playable(l, new Set()), l);
  assert.equal(playable("master", new Set()), "hard");
  assert.equal(playable("master", new Set(["gold"])), "master");
  assert.equal(playable("master", new Set(), "master"), "master");
});

test("a spoiled game or rule switch plays the game's own rules", () => {
  for (const v of BAD) assert.equal(isVariant(v), false);
  for (const cap of [NaN, -1, Infinity, 0, 2, 3]) assert.deepEqual(cleanRules("ncho", { capture: cap }), RULES.ncho);
  assert.deepEqual(cleanRules("constructor", {}), RULES.ncho);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /get game\(\) \{ const v = prefs\.get\('game\.variant', 'ncho'\); return isVariant\(v\) \? v : 'ncho'; \}/);
  assert.match(game, /return cleanRules\(this\.game, o\);/);
});

// Every reader of a saved value (an exported parse… in web/) takes anything without throwing.
test("every saved-value reader in web/ takes a spoiled value without throwing", async () => {
  const dir = new URL("../web/", import.meta.url);
  let readers = 0;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "es-module-shims.js")) {
    const src = readFileSync(new URL(f, dir), "utf8");
    if (!/export (function|const) parse\w*/.test(src)) continue;
    let mod; try { mod = await import(new URL(f, dir)); } catch { continue; } // a module that needs the page (none of the readers do)
    for (const [name, fn] of Object.entries(mod)) {
      if (!/^parse/.test(name) || typeof fn !== "function") continue;
      readers++;
      for (const v of BAD) assert.doesNotThrow(() => fn(v), `${f} ${name}(${JSON.stringify(v)?.slice(0, 30)})`);
    }
  }
  assert.ok(readers >= 12, "readers found: " + readers);
});

test("every JSON.parse of a saved value in web/ is caught", () => {
  const dir = new URL("../web/", import.meta.url);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "es-module-shims.js")) {
    const lines = readFileSync(new URL(f, dir), "utf8").split("\n");
    lines.forEach((l, i) => {
      if (!l.includes("JSON.parse(")) return;
      const near = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
      const ok = /try\s*\{/.test(near) || /\/\/ checked:/.test(l);
      assert.ok(ok, `${f}:${i + 1} reads JSON without a try: ${l.trim().slice(0, 100)}`);
    });
  }
});

test("the browser check and its report are in the repo", () => {
  const tool = readFileSync(new URL("../tools/spoiled.py", import.meta.url), "utf8");
  for (const w of ["cut off", "__proto__", "a game that cannot be", "def culprit", "pg.reload()"]) assert.ok(tool.includes(w), w);
  const report = readFileSync(new URL("../docs/launch/spoiled.md", import.meta.url), "utf8");
  assert.match(report, /Every spoiled save opens and plays\./);
});
