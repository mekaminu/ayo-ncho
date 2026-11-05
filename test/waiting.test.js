// Waiting on you (idea 5 Nov): after a long think on your move against the computer the opponent says a line of their own
// and drums on the wood. When it speaks, how often, which pit shivers, the drum's shape, and every line in both languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { waitingDue, makeWaiting, drumPit, shiverAt, FIRST_MS, PER_GAME, DRUM_MS, DRUMS, DRUM_GAP_MS, SHIVER, WAIT_MOOD } from "../web/waiting.js";
import { CHARACTERS, MOODS } from "../web/characters.js";
import { translate } from "../web/i18n.js";
import { newGame, applyMove, legalMoves, owner } from "../engine/ayo.js";

const ok = { computer: true, yourMove: true, blocked: false, idleMs: FIRST_MS, saidThisMove: false, saidThisGame: 0 };

test("it speaks only on your move against the computer, after a long think, with nothing in the way", () => {
  assert.equal(waitingDue(ok), true);
  assert.equal(waitingDue({ ...ok, idleMs: FIRST_MS - 1 }), false, "not before 25 s");
  assert.equal(waitingDue({ ...ok, computer: false }), false, "never two of us, a room, the puzzle or the lesson");
  assert.equal(waitingDue({ ...ok, yourMove: false }), false, "never while a turn plays or on their move");
  assert.equal(waitingDue({ ...ok, blocked: true }), false, "never under a card, a screen or in another tab");
  assert.equal(waitingDue({ ...ok, saidThisMove: true }), false, "once a move");
  assert.equal(waitingDue({ ...ok, saidThisGame: PER_GAME }), false, "three times a game at most");
  assert.equal(waitingDue({ ...ok, saidThisGame: PER_GAME - 1 }), true);
  assert.equal(waitingDue(null), false);
});

test("the clock: any touch starts it again, a new move resets once-a-move, a new game resets the count", () => {
  let t = 0; const w = makeWaiting(() => t); const o = { computer: true, yourMove: true, blocked: false };
  w.sync(0, "g1"); t = FIRST_MS - 10; assert.equal(w.due(o), false);
  w.stir(); t += FIRST_MS - 10; assert.equal(w.due(o), false, "a touch put the clock back");
  t += 10; assert.equal(w.due(o), true); w.spoke();
  t += FIRST_MS * 4; w.sync(0, "g1"); assert.equal(w.due(o), false, "said once this move");
  for (let m = 1; m <= 2; m++) { w.sync(m * 2, "g1"); t += FIRST_MS; assert.equal(w.due(o), true, `move ${m * 2}`); w.spoke(); }
  w.sync(6, "g1"); t += FIRST_MS; assert.equal(w.due(o), false, "three in a game is enough");
  w.sync(0, "g2"); t += FIRST_MS; assert.equal(w.due(o), true, "a new game may speak again");
  assert.equal(w.said, 3);
});

test("the shivering pit is always theirs, their fullest, over random games of both kinds", () => {
  let n = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 60; g++) {
    let s = newGame(variant); let k = 0;
    while (!s.over && k++ < 200) {
      for (const them of [0, 1]) {
        const p = drumPit(s.pits, them); const mine = s.pits.map((v, i) => [v, i]).filter(([v, i]) => owner(i) === them && v > 0);
        if (!mine.length) { assert.equal(p, -1); continue; }
        assert.equal(owner(p), them); assert.ok(s.pits[p] > 0); assert.equal(s.pits[p], Math.max(...mine.map(([v]) => v))); n++;
      }
      const ms = legalMoves(s); s = applyMove(s, ms[Math.floor(Math.random() * ms.length)]).state;
    }
  }
  assert.ok(n > 1000);
});

test("the drum: three lifts, back on the wood between and after, never higher than a shiver", () => {
  assert.equal(DRUM_MS, DRUMS * DRUM_GAP_MS);
  let peaks = 0, prev = 0, up = false;
  for (let t = -10; t <= DRUM_MS + 50; t++) {
    const h = shiverAt(t); assert.ok(h >= 0 && h <= SHIVER + 1e-12);
    if (h > prev) up = true; else if (h < prev && up) { peaks++; up = false; } prev = h;
  }
  assert.equal(peaks, DRUMS); assert.equal(shiverAt(DRUM_MS), 0); assert.equal(shiverAt(-1), 0);
  for (let k = 0; k < DRUMS; k++) assert.equal(shiverAt(k * DRUM_GAP_MS), 0, "each knock starts on the wood");
});

test("every opponent has their own waiting lines, each in French, with a face they can make", () => {
  const all = new Set();
  for (const [lv, c] of Object.entries(CHARACTERS)) {
    const ls = c.lines.waiting; assert.ok(Array.isArray(ls) && ls.length >= 2, `${c.name} has waiting lines`);
    assert.ok(MOODS.includes(WAIT_MOOD[lv]), `${c.name}'s face`);
    for (const l of ls) {
      assert.ok(!all.has(l), "no two say the same"); all.add(l); assert.ok(l.length <= 60, `short enough for the bubble: ${l}`);
      for (const other of Object.values(c.lines).filter((a) => a !== ls)) assert.ok(!other.includes(l), "not one of their other lines");
      const f = translate(l, "fr"); assert.notEqual(f, l, `French for ${l}`);
    }
  }
  // the child and the cousin say tu, the elders vous (as their other lines do)
  for (const l of CHARACTERS.easy.lines.waiting.concat(CHARACTERS.medium.lines.waiting)) assert.ok(!/\bvous\b/.test(translate(l, "fr")), l);
  for (const lv of ["steady", "hard", "master"]) for (const l of CHARACTERS[lv].lines.waiting) assert.ok(!/\b(tu|te|toi)\b/.test(translate(l, "fr")), l);
});

test("the page wires it: the clock, the conditions, the drum, and the service worker carries the file", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /'\.\/waiting\.js'/);
  assert.match(g, /from '\.\/waiting\.js'/);
  const body = g.slice(g.indexOf("function waitCheck()"), g.indexOf("const waitDrum"));
  for (const need of ["!online", "!local", "!puzzle.on", "!lesson.on", "canPress()", "!replaying", "!clipping", "document.hidden", "waitCard()", "line(level, 'waiting')", "drumPit(state.pits, them)", "reduceMotion"]) assert.ok(body.includes(need), need);
  assert.ok(!/^\s*\/\/.*waitCheck/m.test(g.split("\n").filter((l) => l.includes("setInterval(waitCheck")).join("\n")), "the check runs");
});
