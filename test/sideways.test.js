// A phone held sideways (idea 5 Nov): a short, wide screen sees the board from its long side, your row nearest you.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sidewaysAngle, isSideways, SIDE_MAX_H, SIDE_MIN_RATIO } from "../web/sideways.js";
import { swingTheta, badgeFlip } from "../web/local.js";

const Q = Math.PI / 2;

test("a phone on its side lies the board down; upright, the Fold open and the Mac keep it standing", () => {
  for (const [w, h] of [[844, 390], [740, 360], [915, 412], [1280, 500], [667, 375]]) assert.equal(sidewaysAngle(w, h), Q, `${w}x${h}`);
  for (const [w, h] of [[390, 844], [1180, 820], [800, 720], [717, 904], [1440, 900], [600, 500], [0, 0]]) assert.equal(sidewaysAngle(w, h), 0, `${w}x${h}`);
  assert.equal(isSideways(SIDE_MAX_H * SIDE_MIN_RATIO, SIDE_MAX_H), true);
  assert.equal(isSideways(SIDE_MAX_H * SIDE_MIN_RATIO, SIDE_MAX_H + 1), false);
});

test("?sideways=1 and =0 force it either way", () => {
  assert.equal(sidewaysAngle(390, 844, "1"), Q);
  assert.equal(sidewaysAngle(844, 390, "0"), 0);
  assert.equal(sidewaysAngle(844, 390, "x"), Q);
});

test("the camera stands on your pits' side, and the far seat's half turn still faces the other row", () => {
  // placeCam puts the camera at (sin a, cos a) round the board with a = theta + side; seat 0's pits lie at +x (board.js)
  const at = (theta) => [Math.sin(theta + Q), Math.cos(theta + Q)];
  const [x0] = at(0); assert.ok(x0 > 0.99, "seat 0: the camera at +x, by your row");
  const [x1] = at(swingTheta(0, 1)); assert.ok(x1 < -0.99, "seat 1 (two of us passing the phone, the far seat of a room): at -x, by theirs");
  assert.equal(at(swingTheta(Math.PI, 0))[0] > 0.99, true, "and round again");
  for (const t of [0, Math.PI, 2 * Math.PI]) assert.ok([1, -1].includes(badgeFlip(t + Q)));
});

test("the page adds the quarter turn to the camera only, and carries sideways.js offline", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(g, /const a = theta \+ side; camera\.position\.set\(target\.x \+ dist \* Math\.sin\(phi\) \* Math\.sin\(a\)/);
  assert.match(g, /side = (table \? Math\.PI \/ 2 : )?sidewaysAngle\(w, h, params\.get\('sideways'\)\)/); // (the Fold half folded lies it across too, web/tabletop.js)
  assert.match(g, /badgeFlip\(theta \+ side\)/);
  assert.equal((g.match(/theta = side|side = theta/g) || []).length, 0, "the seat's angle never takes the quarter turn");
  assert.ok(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8").includes("'./sideways.js'"));
  assert.ok(readFileSync(new URL("../web/index.html", import.meta.url), "utf8").includes(".sideways .hud{"));
});
