// Older iPhones (iOS before 16.4) cannot read the import map, so the board never loaded and the page stayed black.
// es-module-shims (vendored in web/) fills that in, and a start-up watch says so plainly if the board still does not draw.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");

test("the import-map shim loads before the import map and the game", () => {
  const shim = html.indexOf('<script async src="./es-module-shims.js"></script>');
  assert.ok(shim > 0);
  assert.ok(shim < html.indexOf('<script type="importmap">'));
  assert.ok(html.indexOf('<script type="importmap">') < html.indexOf('<script type="module" src="./game.js">'));
  assert.match(readFileSync(new URL("../web/es-module-shims.js", import.meta.url), "utf8").slice(0, 400), /ES Module Shims @version 2\./);
});

test("the shim is kept for offline play", () => {
  assert.match(sw, /'\.\/es-module-shims\.js'/);
});

test("the start-up watch stands down once the board draws, and speaks plainly otherwise", () => {
  assert.match(game, /window\.__ayoUp = true/);
  assert.match(html, /if\(t>=1500\)waiting\(\);if\(\(t>=12000&&hard/); // the board on its way after 1.5 s; the plain screen 12 s after an error, or after a minute
  assert.match(html, /The board couldn\\u2019t start/);
  assert.match(html, /Software Update/);
  assert.match(html, /For Meka: /); // what went wrong, on screen, so a screenshot says it
  assert.match(html, /Le plateau n\\u2019a pas pu d\\u00e9marrer/);
});
