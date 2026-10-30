import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Offline play needs every file the game loads in the service worker's shell: a module left out works online and
// breaks the game with no signal (30 Oct: the seed layout moved into its own file, slots.js).
test("every module the game loads is cached for offline play", () => {
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  const shell = JSON.parse(sw.match(/const SHELL = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  const seen = new Set(), todo = ["game.js"];
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
    const src = readFileSync(new URL("../web/" + f, import.meta.url), "utf8");
    for (const [, path] of src.matchAll(/^\s*import[^'"]*['"](\.\/[\w-]+\.js)['"]/gm)) todo.push(path.slice(2));
    for (const [, path] of src.matchAll(/new Worker\(['"](\.\/[\w-]+\.js)['"]/g)) todo.push(path.slice(2));
  }
  for (const f of seen) assert.ok(shell.includes("./" + f), `${f} is in the offline shell`);
  assert.ok(seen.has("slots.js") && seen.has("physics.js"));
});
