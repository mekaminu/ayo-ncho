// Dark mode leaves the board alone (idea 9 Nov, night): a browser set to darken websites (Samsung Internet's Dark mode,
// Chrome's "Darken websites") repaints a page's colours unless the page says it is dark already. Every page the game serves
// says so twice: <meta name="color-scheme" content="dark"> in its head, read before anything is drawn, and color-scheme: dark
// on :root. tools/darkmode.py checks the pictures in a darkening Chromium; this keeps the words from being lost.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { legalPage, PAGES, LANGS } from "../server/legal.js";
import { appHtml } from "../tools/build-app.js";

const index = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const META = '<meta name="color-scheme" content="dark">';

function saysDark(html, what) {
  const head = html.slice(0, html.indexOf("</head>"));
  assert.ok(head.length > 0, `${what}: has a head`);
  const at = head.indexOf(META);
  assert.ok(at > 0, `${what}: the color-scheme meta is in the head`);
  const style = head.indexOf("<style");
  assert.ok(style < 0 || at < style, `${what}: …before the first stylesheet, so it is read before anything is drawn`);
  assert.equal(head.split('name="color-scheme"').length, 2, `${what}: said once`);
  assert.match(html, /:root\{[^}]*color-scheme:dark[;}]/, `${what}: :root says color-scheme: dark too`);
  assert.doesNotMatch(html, /color-scheme:\s*(light|normal|only light)/, `${what}: nothing says light`);
}

test("the game's page says it is dark before anything is drawn", () => saysDark(index, "index.html"));

test("the privacy, terms and support pages say so too, in both languages", () => {
  for (const name of PAGES) for (const lang of LANGS) saysDark(legalPage(name, {}, lang), `${name} (${lang})`);
});

test("the store apps' page keeps it (the app's index.html is the web one with outside addresses swapped)", () => {
  saysDark(appHtml(index), "the apps' index.html");
});

test("the darkening check is the real one: Chromium's own switch, with the mouse said again", () => {
  const py = readFileSync(new URL("../tools/darkmode.py", import.meta.url), "utf8");
  assert.match(py, /forceDarkModeEnabled=true,primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4/);
  assert.match(py, /color_scheme=scheme/);
});
