// Their talk (idea 7 Nov): Settings → Opponent → Their talk keeps the computer's bubble to every line, hello and goodbye, or none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TALKS, talkPref, talkNow, speaks, OPENING, CLOSING, talkNote, talkToast } from "../web/chatter.js";
import { MOOD_FOR } from "../web/characters.js";
import { FR } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("the choice: all unless few or off is chosen; ?talk= wins for a visit", () => {
  assert.deepEqual(TALKS, ["all", "few", "off"]);
  for (const v of ["all", "few", "off"]) assert.equal(talkPref(v), v);
  for (const v of ["", null, undefined, "OFF", "quiet"]) assert.equal(talkPref(v), "all");
  assert.equal(talkNow("off", null), "off");
  assert.equal(talkNow("all", "few"), "few");
  assert.equal(talkNow("few", "nonsense"), "few", "a stray parameter keeps the saved choice");
});

test("all says everything; off says nothing", () => {
  for (const m of [...Object.keys(MOOD_FOR), "take", "end", "chat"]) {
    assert.equal(speaks("all", m), true, m);
    assert.equal(speaks("off", m), false, m);
  }
});

test("few: the greeting that opens a game and the word at the end, nothing between", () => {
  for (const m of OPENING) assert.equal(speaks("few", m), true, m);
  for (const m of CLOSING) assert.equal(speaks("few", m), true, m);
  for (const m of ["capture", "lost", "undo", "last8", "circling", "waiting", "take", "chat"]) assert.equal(speaks("few", m), false, m);
});

test("every moment an opponent has a face for is either opening, closing or mid-game", () => {
  const mid = ["capture", "lost", "undo", "last8", "circling", "waiting"];
  for (const m of Object.keys(MOOD_FOR)) assert.ok(OPENING.includes(m) || CLOSING.includes(m) || mid.includes(m), `unsorted moment ${m}`);
});

test("words, English and French", () => {
  for (const t of TALKS) {
    assert.ok(talkNote(t) && FR[talkNote(t)], `note ${t}`);
    assert.ok(talkToast(t) && FR[talkToast(t)], `toast ${t}`);
  }
  for (const w of ["Their talk", "All", "Few", "what the computer says in the bubble over the board ·"]) assert.ok(FR[w], w);
});

test("wired: the Settings row, the bubble asks before it shows, the shell keeps the file", () => {
  const html = read("web/index.html");
  assert.match(html, /data-set="talk"[^]*data-v="all"[^]*data-v="few"[^]*data-v="off"/);
  assert.match(html, /id="talkNow"/);
  const g = read("web/game.js");
  assert.match(g, /from '\.\/chatter\.js'/);
  assert.match(g, /speaks\(TALK, moment\)/);
  assert.match(g, /react\(mood\);[^]*speaks\(TALK/, "the face reacts before the words are weighed");
  assert.match(g, /name === 'talk'/);
  assert.match(read("web/sw.js"), /'\.\/chatter\.js'/);
});
