import { test } from "node:test";
import assert from "node:assert/strict";
import { CHARACTERS, MOODS, MOOD_FOR, faceFor, line } from "../web/characters.js";

test("every opponent has a face for every mood, and the moods look different", () => {
  for (const level of Object.keys(CHARACTERS)) {
    const faces = MOODS.map((m) => faceFor(level, m));
    for (const f of faces) assert.match(f, /^<svg [^>]*viewBox="0 0 64 64"/);
    assert.equal(new Set(faces).size, MOODS.length, `${level}: two moods draw the same face`);
    assert.equal(faceFor(level, "calm"), CHARACTERS[level].face, `${level}: the resting face is the calm one`);
  }
});

test("a face keeps what makes it theirs through every mood", () => {
  for (const m of MOODS) {
    assert.ok(faceFor("hard", m).includes('cx="20" cy="33"'), "Mama Ngozi keeps her earrings when " + m);
    assert.ok(faceFor("easy", m).includes('cx="19" cy="24"'), "Adaeze keeps her hair beads when " + m);
  }
});

test("the smile is sized to the character: Adaeze grins wider than Mama Ngozi", () => {
  const width = (svg) => +svg.match(/<path d="M(\d+(?:\.\d+)?) 35q/)[1];
  assert.ok(width(faceFor("easy", "happy")) < width(faceFor("hard", "happy"))); // a lower left x is a wider grin
});

test("unknown moods and levels fall back to a calm, medium face rather than breaking", () => {
  assert.equal(faceFor("easy", "furious"), faceFor("easy", "calm"));
  assert.equal(faceFor("nobody", "happy"), faceFor("medium", "happy"));
});

test("every moment an opponent speaks at has a mood, and a line", () => {
  for (const level of Object.keys(CHARACTERS)) {
    for (const moment of Object.keys(CHARACTERS[level].lines)) {
      assert.ok(MOODS.includes(MOOD_FOR[moment]), `${moment} has no mood`);
      assert.ok(CHARACTERS[level].lines[moment].includes(line(level, moment)));
    }
  }
  assert.equal(line("medium", "nothing"), "");
});
