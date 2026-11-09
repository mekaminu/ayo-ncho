// Firefox's own engine (idea 9 Nov): the Firefox check runs in GitHub Actions (Firefox cannot be downloaded into the build
// container), so these keep it wired: the workflow dresses both phones, reports without holding up main, and the check knows
// both dresses and drops the phone mode Playwright's Firefox does not have.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(new URL("../.github/workflows/firefox.yml", import.meta.url), "utf8");
const tool = readFileSync(new URL("../tools/webkit-check.py", import.meta.url), "utf8");

test("the Firefox workflow checks Android and the Mac in Firefox, and never blocks main", () => {
  assert.match(wf, /playwright install --with-deps firefox/);
  assert.match(wf, /--browser firefox/);
  assert.match(wf, /"Firefox on Android"/);
  assert.match(wf, /"Firefox on a Mac"/);
  assert.match(wf, /continue-on-error: true/);
  assert.match(wf, /fail-fast: false/);
  for (const p of ["web/**", "engine/**", "server/**"]) assert.ok(wf.includes(`"${p}"`), p);
});

test("the check knows both Firefox dresses and leaves out the phone mode Firefox lacks", () => {
  assert.match(tool, /"Firefox on Android": \{[^}]*"width": 390/);
  assert.match(tool, /"Firefox on Android":[\s\S]*?"has_touch": True/);
  assert.match(tool, /"Firefox on a Mac":[\s\S]*?"has_touch": False/);
  assert.match(tool, /if browser == "firefox": dev\.pop\("is_mobile", None\)/);
  assert.match(tool, /how = "a finger" if dev\.get\("has_touch"\) else "the mouse"/);
});
