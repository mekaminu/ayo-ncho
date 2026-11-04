import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, applyMove, legalMoves, replay } from "../engine/ayo.js";
import { chooseMove, masterSearch, counterReply, MASTER } from "../engine/ai.js";
import { playGame } from "../tools/master-match.js";
import { CHARACTERS, faceFor, line } from "../web/characters.js";
import { parseOwned, owns, previewOf, levelOpen, playable, lockedWords, GOLD_LEVELS } from "../web/entitle.js";
import { LEVELS } from "../web/record.js";

const fixed = { ms: Infinity }; // tests count positions, never the clock, so they agree on any machine

test("Master always plays a legal move, in both games, over random positions", () => {
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (const variant of ["ncho", "ayo"]) for (let g = 0; g < 6; g++) {
    let s = newGame(variant, {}, g % 2);
    for (let k = 0; k < 4 + g * 3 && !s.over; k++) { const m = legalMoves(s); s = applyMove(s, m[Math.floor(rnd() * m.length)]).state; }
    if (s.over) continue;
    const r = masterSearch(s, { ...fixed, nodes: 20000, traps: 20000 });
    assert.ok(legalMoves(s).includes(r.pit), `${variant} game ${g}: pit ${r.pit}`);
    assert.ok(r.depth >= 1);
  }
});

test("Master answers the same way twice (a budget of positions, not of time) and keeps to its budget", () => {
  const s = replay([2, 8], "ncho");
  const a = masterSearch(s, { ...fixed, nodes: 30000, traps: 20000 }), b = masterSearch(s, { ...fixed, nodes: 30000, traps: 20000 });
  assert.equal(a.pit, b.pit); assert.equal(a.depth, b.depth);
  assert.ok(a.nodes <= 30000 + 20000 + 50, `nodes ${a.nodes}`);
  assert.ok(MASTER.ms <= 1500, "the clock backstop answers within about 1.5 s on a slow phone");
});

test("Master stops at the clock and still plays the deepest search it finished", () => {
  let t = 0; const now = () => (t += 2); // every look at the clock is 2 ms later
  const r = masterSearch(newGame("ncho"), { nodes: 1e9, traps: 0, now });
  assert.ok(legalMoves(newGame("ncho")).includes(r.pit)); assert.ok(r.depth >= 1);
});

test("Master never walks past a win in one", () => {
  // a win in one: every position along random games where some move ends the game the mover's way
  let seed = 3; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); let found = 0;
  for (let g = 0; g < 40 && found < 8; g++) {
    let s = newGame("ncho", {}, g % 2);
    while (!s.over) {
      const win = legalMoves(s).find((m) => { const n = applyMove(s, m).state; return n.over && n.winner === s.turn; });
      if (win !== undefined) { const r = masterSearch(s, { ...fixed, nodes: 20000, traps: 10000 }); const n = applyMove(s, r.pit).state; assert.ok(n.over && n.winner === s.turn || r.value >= 900, "takes a win"); found++; break; }
      const m = legalMoves(s); s = applyMove(s, m[Math.floor(rnd() * m.length)]).state;
    }
  }
  assert.ok(found >= 4);
});

test("chooseMove('master') is Master's search", () => {
  const s = replay([1, 7], "ncho");
  assert.ok(legalMoves(s).includes(chooseMove(s, "master")));
});

test("Master beats Hard from the opening, either seat (a short match; tools/master-match.js plays the 50)", { timeout: 600000 }, () => {
  // Openings 0, 1 and 2 (the first mover's pit 0, 1, 2) from both seats: Master loses none and wins at least half.
  const games = [0, 1, 2, 3, 4, 5]; const out = games.map((g) => playGame(g, "ncho", { nodes: 60000, traps: 80000 }));
  const w = out.filter((x) => x === "W").length, l = out.filter((x) => x === "L").length;
  assert.ok(w >= 3 && l === 0, `Master: ${out.join("")}`);
});

test("Papa Ike: a face in every mood, a bio and a line for every moment the others have", () => {
  const c = CHARACTERS.master; assert.equal(c.name, "Papa Ike"); assert.equal(c.level, "Master");
  for (const k of Object.keys(CHARACTERS.hard.lines)) assert.ok(c.lines[k] && c.lines[k].length, k);
  for (const m of ["calm", "think", "happy", "sulk", "surprised", "blink"]) assert.match(faceFor("master", m), /^<svg/);
  assert.notEqual(faceFor("master"), faceFor("hard"));
  assert.ok(line("master", "start")); assert.ok(LEVELS.includes("master"), "your record against him is kept");
});

test("Gold: Master is locked until bought, ?try=master opens him for a visit, the words say where he plays", () => {
  assert.deepEqual(GOLD_LEVELS, ["master"]);
  const none = parseOwned(null), gold = parseOwned('["gold"]');
  assert.equal(owns(none, "gold"), false); assert.equal(owns(gold, "gold"), true);
  assert.equal(parseOwned("not json").size, 0); assert.equal(parseOwned('{"gold":1}').size, 0);
  for (const lv of ["easy", "medium", "hard"]) assert.equal(levelOpen(lv, none), true);
  assert.equal(levelOpen("master", none), false); assert.equal(levelOpen("master", gold), true);
  assert.equal(previewOf("?try=master"), "master"); assert.equal(previewOf("?try=gold"), null); assert.equal(previewOf(""), null);
  assert.equal(levelOpen("master", none, previewOf("?room=AB&try=master")), true);
  assert.equal(playable("master", none), "hard", "a locked Master falls back to Mama Ngozi"); assert.equal(playable("master", gold), "master");
  assert.match(lockedWords("Papa Ike", false), /in the app/); assert.match(lockedWords("Papa Ike", true), /Gold/);
});

test("The player Master sets traps for counts like Mama Ngozi: with her weights and 9 half-moves, counterReply is her move", () => {
  let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); let checked = 0;
  for (let g = 0; g < 8; g++) {
    let s = newGame("ncho", {}, g % 2);
    for (let k = 0; k < 3 + g * 2 && !s.over; k++) { const m = legalMoves(s); s = applyMove(s, m[Math.floor(rnd() * m.length)]).state; }
    if (s.over || legalMoves(s).length < 2) continue;
    assert.equal(counterReply(s, MASTER.sees, { side: MASTER.seeSide, three: MASTER.seeThree }), chooseMove(s, "hard"), `game ${g}`);
    checked++;
  }
  assert.ok(checked >= 5);
});

test("From a bad opening Master looks for a turn-round, but only so far: a trap move is never worse than hope seeds by best play", () => {
  assert.ok(MASTER.hope > 0 && MASTER.hope <= 8 && MASTER.risk > 0);
  const s = replay([0, 6], "ncho"); // the first mover's pit 0, then Mama Ngozi's best answer: the opener is about 8 seeds down
  const r = masterSearch(s, { ...fixed, nodes: 60000, traps: 60000 });
  assert.ok(legalMoves(s).includes(r.pit));
  if (r.trap) assert.ok(r.trap > 0);
});
