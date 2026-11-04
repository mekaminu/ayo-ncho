// The first game's lesson: each step really does what its words say, played through the engine itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STEPS, START, startState, stateAt, shape, isNewPhone, lessonDue, firstLevel, nextUp, eyebrow, DONE } from "../web/lesson.js";
import { applyMove, legalMoves, owner } from "../engine/ayo.js";
import { sowPath, pathWords } from "../web/path.js";

test("the start: a small calm board, your move, nothing at 4, Nchò rules", () => {
  const s = startState();
  assert.equal(s.turn, 0); assert.equal(s.variant, "ncho"); assert.deepEqual(s.rules, { capture: 4, relay: true, last8: true });
  assert.ok(s.pits.every((n) => n < 4), "a pit already at 4 would have been taken");
  assert.equal(s.pits.reduce((a, b) => a + b, 0), 16); assert.deepEqual(s.stores, [0, 0]);
  assert.notEqual(startState().pits, START.pits, "a fresh copy each time");
});

test("every step's pit is yours and legal, and Adaeze's replies are hers and legal", () => {
  for (let k = 0; k < STEPS.length; k++) {
    const s = stateAt(k); assert.equal(s.turn, 0, `step ${k + 1}: your move`); assert.ok(!s.over);
    assert.ok(legalMoves(s).includes(STEPS[k].pit), `step ${k + 1}: the lit pit is legal`);
    const after = applyMove(s, STEPS[k].pit).state; assert.ok(!after.over, "the lesson never ends the game");
    if (STEPS[k].reply !== null) { assert.equal(owner(STEPS[k].reply), 1); assert.ok(legalMoves(after).includes(STEPS[k].reply)); assert.ok(!applyMove(after, STEPS[k].reply).state.over); }
  }
});

test("step 1 sows: three or more seeds, no capture, no relay, the turn ends in an empty pit", () => {
  const s = stateAt(0); const { events } = applyMove(s, STEPS[0].pit); const sh = shape(events);
  assert.equal(STEPS[0].kind, "sow"); assert.ok(sh.drops >= 3); assert.equal(sh.relays, 0); assert.equal(sh.caps.length, 0);
  const last = events.filter((e) => e.type === "drop").pop().pit; assert.equal(s.pits[last], 0, "the last seed lands in an empty pit");
  const order = events.filter((e) => e.type === "drop").map((e) => e.pit); order.forEach((p, i) => assert.equal(p, (STEPS[0].pit + 1 + i) % 12), "anticlockwise, one per pit");
});

test("step 2 captures 4: the last seed makes their pit of 3 a 4 and it goes to you", () => {
  const s = stateAt(1); const { state, events } = applyMove(s, STEPS[1].pit); const sh = shape(events);
  assert.equal(sh.relays, 0); assert.equal(sh.caps.length, 1); const c = sh.caps[0];
  assert.equal(c.by, 0); assert.equal(c.n, 4); assert.equal(owner(c.pits[0]), 1, "on their side");
  assert.equal(s.pits[c.pits[0]], 3, "it was a pit of 3"); assert.equal(events.filter((e) => e.type === "drop").pop().pit, c.pits[0], "made by the last seed");
  assert.equal(state.stores[0], 4); assert.ok(!c.last8);
});

test("step 3 relays: the hand picks up again, no capture, and sows on into their side", () => {
  const s = stateAt(2); const { events } = applyMove(s, STEPS[2].pit); const sh = shape(events);
  assert.ok(sh.relays >= 1); assert.equal(sh.caps.length, 0);
  const drops = events.filter((e) => e.type === "drop").map((e) => e.pit); assert.ok(drops.some((p) => owner(p) === 1), "on into their side");
  const end = drops[drops.length - 1]; const before = applyMove(s, STEPS[2].pit).state; assert.equal(before.pits[end], 1, "ends in a pit that was empty");
});

test("the path marks the board shows agree with each step, and their words name what it teaches", () => {
  for (let k = 0; k < STEPS.length; k++) {
    const p = sowPath(stateAt(k), STEPS[k].pit); assert.ok(p);
    const w = pathWords(p, { you: 0 });
    if (STEPS[k].kind === "capture") assert.match(w, /takes 4/);
    if (STEPS[k].kind === "relay") assert.match(w, /picks up again/);
    if (STEPS[k].kind === "sow") assert.doesNotMatch(w, /takes|picks up/);
  }
});

test("the words: one of three, the steps' titles, the end line names the opponent", () => {
  assert.equal(eyebrow(0), "Learn Nchò · 1 of 3"); assert.equal(eyebrow(2), "Learn Nchò · 3 of 3");
  assert.deepEqual(STEPS.map((s) => s.kind), ["sow", "capture", "relay"]);
  for (const s of STEPS) { assert.ok(s.ask.length > 20 && s.after.length > 20); assert.ok(s.ask.length < 160, "fits the Fold folded"); }
  assert.match(DONE.words("Adaeze"), /^Adaeze plays you/);
});

test("a new phone: nothing kept; anything kept (a game, a record, the tips seen, the lesson) is not new", () => {
  const phone = (o) => (k) => (k in o ? o[k] : null);
  assert.equal(isNewPhone(phone({})), true);
  assert.equal(isNewPhone(phone({ tutorial: "0", level: "hard", mode: "ai" })), true, "a pill picked before the first game is still a new phone");
  for (const k of ["game", "record", "daily", "streak", "lesson", "starts", "name"]) assert.equal(isNewPhone(phone({ [k]: "x" })), false, k);
  assert.equal(isNewPhone(phone({ game: "null" })), true, "a finished game leaves 'null'… on a phone that kept nothing else");
  assert.equal(isNewPhone(phone({ tutorial: "1" })), false); assert.equal(isNewPhone(phone({ tutorial: "3" })), false);
});

test("the lesson is due once, for the computer, never for two of us; new phones start Easy", () => {
  assert.equal(lessonDue({ newPhone: true, mode: "ai", lesson: null }), true);
  assert.equal(lessonDue({ newPhone: true, mode: "local", lesson: null }), false);
  assert.equal(lessonDue({ newPhone: true, mode: "ai", lesson: "done" }), false);
  assert.equal(lessonDue({ newPhone: true, mode: "ai", lesson: "skipped" }), false);
  assert.equal(lessonDue({ newPhone: false, mode: "ai", lesson: null }), false);
  assert.equal(firstLevel(true), "easy"); assert.equal(firstLevel(false), "medium");
});

test("after a first win the next opponent up is offered, never past Mama Ngozi", () => {
  const names = { easy: "Adaeze", steady: "Auntie Bisi", medium: "Nnamdi", hard: "Mama Ngozi" };
  assert.deepEqual(nextUp("easy", "firstWin", names), { level: "steady", text: "Ready for Auntie Bisi? Play her next · Steady" });
  assert.deepEqual(nextUp("steady", "firstWin", names), { level: "medium", text: "Ready for Nnamdi? Play him next · Medium" });
  assert.deepEqual(nextUp("medium", "firstWin", names), { level: "hard", text: "Ready for Mama Ngozi? Play her next · Hard" });
  assert.equal(nextUp("hard", "firstWin", names), null);
  assert.equal(nextUp("easy", "run", names), null); assert.equal(nextUp("easy", null, names), null);
});
