// Every seed they have (web/slam.js): the engine marks an Ayo grand slam on the last drop, and the board only reads and words it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, replay, totalSeeds, owner, sideOf } from "../engine/ayo.js";
import { slamOf, slamWords, slamMoment, SLAM_RULE, SLAM_NOTE } from "../web/slam.js";
import { sowPath, pathWords, playedWords } from "../web/path.js";
import { translate } from "../web/i18n.js";

let seed = 11;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
function games(variant, n, each) {
  for (let g = 0; g < n; g++) {
    let s = newGame(variant, {}, g % 2);
    while (!s.over && s.moves.length < 400) {
      const legal = legalMoves(s); const m = legal[Math.floor(rnd() * legal.length)];
      const r = applyMove(s, m); each(s, m, r); s = r.state;
    }
  }
}

test("the engine marks a grand slam exactly when the last seed would take every seed on their side, and takes nothing", () => {
  let slams = 0, plain = 0;
  games("ayo", 400, (s, m, { state: next, events }) => {
    const me = s.turn, them = 1 - me, marked = events.filter((e) => e.slam);
    assert.ok(marked.length <= 1, "at most one slam a move");
    const last = events.filter((e) => e.type === "drop").pop();
    if (marked.length) {
      slams++;
      const e = marked[0]; assert.equal(e, last, "the slam rides on the last drop");
      assert.ok(!events.some((x) => x.type === "capture"), "a grand slam captures nothing");
      assert.equal(next.stores[me], s.stores[me], "nothing goes to the sower's trough");
      assert.ok(e.slam.pits.includes(e.pit) && e.slam.pits.every((p) => owner(p) === them), "the pits are theirs, from where it landed");
      for (const p of e.slam.pits) assert.ok(next.pits[p] === 2 || next.pits[p] === 3, "each would have been a 2 or a 3");
      const theirSide = sideOf(them).reduce((a, p) => a + next.pits[p], 0);
      assert.equal(e.slam.n, theirSide, "it would have taken every seed on their side");
      assert.equal(e.slam.n, e.slam.pits.reduce((a, p) => a + next.pits[p], 0));
    } else if (last && owner(last.pit) === them && !events.some((x) => x.type === "capture") && (next.pits[last.pit] === 2 || next.pits[last.pit] === 3)) {
      plain++; assert.fail("a last seed making 2 or 3 over there with no capture must be a slam");
    }
    assert.equal(totalSeeds(next), 48);
  });
  assert.ok(slams >= 5, `random games make some grand slams (${slams})`);
  assert.equal(plain, 0);
});

test("Nchò never makes a grand slam; replays are unchanged by the mark", () => {
  games("ncho", 120, (s, m, { events }) => assert.ok(!events.some((e) => e.slam)));
  games("ayo", 60, (s, m, { state: next }) => { if (next.moves.length % 17 === 0) assert.deepEqual(replay(next.moves, "ayo", {}, next.first).pits, next.pits); });
});

test("slamOf reads the engine's mark; the path shows it and takes nothing", () => {
  let seen = 0;
  games("ayo", 300, (s, m, { events }) => {
    const sl = slamOf(events), p = sowPath(s, m);
    assert.deepEqual(p.slam, sl);
    if (!sl) return; seen++;
    assert.equal(sl.by, s.turn); assert.equal(p.got, 0); assert.deepEqual(p.takes, []);
    const w = pathWords(p, { you: s.turn }); assert.ok(w.includes(`would take all ${sl.n} they have · ${SLAM_RULE}`), w);
    const pw = playedWords(p, { you: 1 - s.turn }); assert.ok(pw.includes(`would have taken all ${sl.n} you had · ${SLAM_RULE}`), pw);
  });
  assert.ok(seen > 0);
  assert.equal(slamOf([{ type: "pickup", pit: 1, n: 3 }, { type: "drop", pit: 2 }]), null);
});

test("the words from either seat, and in French", () => {
  const sl = { pit: 7, pits: [7, 6], n: 5, by: 0 };
  assert.equal(slamWords(sl, { you: 0 }), "would take all 5 they have · a grand slam takes nothing");
  assert.equal(slamWords(sl, { you: 1, played: true }), "would have taken all 5 you had · a grand slam takes nothing");
  assert.equal(slamWords(sl, { you: 0, played: true }), "would have taken all 5 they had · a grand slam takes nothing");
  assert.equal(slamWords(null), "");
  assert.match(slamMoment(sl, { you: 0 }), /every seed they have/); assert.match(slamMoment(sl, { you: 1 }), /every seed you have/);
  for (const l of [slamWords(sl, { you: 0 }) + " — tap again to sow", "Nnamdi · " + slamWords(sl, { you: 1, played: true }), slamMoment(sl, { you: 0 }), slamMoment(sl, { you: 1 }), SLAM_NOTE, "ends in their pit 2 · " + slamWords(sl, { you: 0, played: true })]) {
    const f = translate(l, "fr"); assert.notEqual(f, l, "French for " + l); assert.ok(!/grand slam|seeds?\b/.test(f), f);
  }
});

test("the offline app carries slam.js", () => {
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/slam\.js'/);
});
