// Mama Ngozi's review of a whole game (Gold, L9): every move of yours she would have played differently, from the engine's own
// search on the position you moved from, with the path and events the board plays — and behind the one Gold module.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, replay, firstMover } from "../engine/ayo.js";
import { rateMoves, chooseMove } from "../engine/ai.js";
import { reviewPlan, reviewItem, reviewOf, summaryWords, stepWords, OPEN_LINES, CLEAN_LINE, END_LINE, NAME } from "../web/review.js";
import { takeOn, TAKE_GAP } from "../web/coach.js";
import { sowPath } from "../web/path.js";
import { parseOwned, previewOf, featureOpen, featureLockedWords, levelOpen, GOLD_FEATURES } from "../web/entitle.js";
import { readFileSync } from "node:fs";

let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
function randomGame(variant, first = 0, opp = "medium") { // you play randomly (plenty to review), the computer at a level
  let s = newGame(variant, {}, first);
  while (!s.over && s.moves.length < 160) { const l = legalMoves(s); const m = s.turn === 0 ? l[Math.floor(rnd() * l.length)] : chooseMove(s, opp); s = applyMove(s, m).state; }
  return s;
}

test("the plan is every position you moved from with a real choice, rebuilt exactly by the engine", () => {
  for (const variant of ["ncho", "ayo"]) for (const first of [0, 1]) for (const seat of [0, 1]) {
    const g = randomGame(variant, first); const plan = reviewPlan(g.moves, variant, g.rules, firstMover(g.moves, first), seat);
    let expect = 0, s = newGame(variant, g.rules, first);
    for (let i = 0; i < g.moves.length; i++) { if (s.turn === seat && legalMoves(s).length > 1) expect++; s = applyMove(s, g.moves[i]).state; }
    assert.equal(plan.length, expect);
    for (const e of plan) {
      assert.deepEqual(e.before, replay(g.moves.slice(0, e.index), variant, g.rules, firstMover(g.moves, first)), "the position you moved from");
      assert.equal(e.before.turn, seat); assert.equal(e.played, g.moves[e.index]); assert.ok(legalMoves(e.before).length > 1, "a forced move is never reviewed");
    }
  }
});

test("over random games each item names a legal pit clearly better by her search, with the engine's own path and events", () => {
  let items = 0, games = 0;
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 4; g++) {
    const game = randomGame(variant, g % 2); games++;
    const plan = reviewPlan(game.moves, variant, game.rules, firstMover(game.moves), 0);
    const rateds = plan.map((e) => rateMoves(e.before, "hard"));
    const review = reviewOf(plan, rateds, { you: 0 });
    // exactly the moves her take under the board would have spoken about
    assert.equal(review.length, plan.filter((e, k) => takeOn(rateds[k], e.played)).length);
    let last = -1;
    for (const it of review) {
      assert.ok(it.index > last, "in the order played"); last = it.index; assert.equal(it.move, it.index + 1);
      assert.ok(legalMoves(it.before).includes(it.pit), "her pit is legal there"); assert.notEqual(it.pit, it.played);
      const r = rateMoves(it.before, "hard"); const best = r.find((x) => x.pit === it.pit), mine = r.find((x) => x.pit === it.played);
      assert.equal(r[0].pit, it.pit, "the top of her search"); assert.ok(best.value > mine.value);
      assert.ok(it.take.kind !== "better" || best.value - mine.value >= TAKE_GAP, "only clearly better moves");
      assert.deepEqual(it.events, applyMove(it.before, it.pit).events, "the board plays the engine's events");
      assert.deepEqual(it.path, sowPath(it.before, it.pit));
      assert.match(stepWords(it, 0, review.length), new RegExp(`^1 of ${review.length} · move ${it.move} · you played your pit \\d`));
      assert.match(it.words, /was the move/);
      items++;
    }
  }
  assert.ok(items >= 8, `random play gives her plenty to say (${items} over ${games} games)`);
});

test("a game played as she would have played it has nothing in the review", () => {
  let s = newGame("ncho"); while (!s.over && s.moves.length < 40) s = applyMove(s, chooseMove(s, "hard")).state;
  const plan = reviewPlan(s.moves, "ncho", s.rules, 0, 0); assert.ok(plan.length > 5);
  assert.deepEqual(reviewOf(plan, plan.map((e) => rateMoves(e.before, "hard"))), []);
  assert.equal(reviewItem(plan[0], null), null);
});

test("from the far seat (a room) the words are from that seat", () => {
  let rev = []; // seat 1 is the computer at easy: noisy enough to be reviewed — almost always; a random game now and then is clean, so try a few
  for (let k = 0; k < 6 && !rev.length; k++) { const g = randomGame("ncho", 0, "easy"); const plan = reviewPlan(g.moves, "ncho", g.rules, 0, 1); rev = reviewOf(plan, plan.map((e) => rateMoves(e.before, "hard")), { you: 1 }); }
  assert.ok(rev.length > 0);
  for (const it of rev) { assert.ok(it.pit >= 6, "her pit is on the far seat's side"); assert.match(it.words, /^your pit [1-6]/); assert.match(it.playedWords, /^you played your pit [1-6]/); }
});

test("the card's words: while she goes over it, how many she would change, and the Gold note", () => {
  assert.equal(summaryWords([], { done: false, seen: 3, total: 20 }), "going over the game… 3 of 20");
  assert.equal(summaryWords([], { done: false }), "going over the game…");
  assert.equal(summaryWords([]), "every move as she would have played it");
  assert.equal(summaryWords([{}]), "one move she would have played differently");
  assert.equal(summaryWords([{}, {}, {}]), "3 moves she would have played differently");
  assert.equal(summaryWords([{}, {}], { locked: true }), "2 moves she would have played differently · in Gold");
  assert.equal(NAME, "Mama Ngozi"); assert.ok(OPEN_LINES.length >= 2 && CLEAN_LINE && END_LINE);
});

test("Gold: the review is locked until bought; ?try=review or ?try=gold opens it for a visit", () => {
  const none = parseOwned("[]"), gold = parseOwned('["gold"]');
  assert.deepEqual(GOLD_FEATURES, ["review"]);
  assert.equal(featureOpen("review", none), false); assert.equal(featureOpen("review", gold), true);
  assert.equal(featureOpen("review", none, previewOf("?try=review")), true);
  assert.equal(featureOpen("review", none, previewOf("?try=gold")), true);
  assert.equal(featureOpen("review", none, previewOf("?try=master")), false, "a look at Papa Ike is not a look at the review");
  assert.equal(levelOpen("master", none, previewOf("?try=review")), false);
  assert.equal(levelOpen("master", none, previewOf("?try=gold")), true);
  assert.equal(featureOpen("anything-else", none), true);
  assert.match(featureLockedWords("Mama Ngozi's review", false), /in the app — the web link sells nothing/);
  assert.match(featureLockedWords("Mama Ngozi's review", true), /it's in the store/);
});

test("the page carries the card line and the panel, and the offline cache has the module", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  for (const id of ["goReview", "goRevWords", "review", "revWords", "revPrev", "revNext", "revAgain", "revDone"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/review\.js'/);
});
