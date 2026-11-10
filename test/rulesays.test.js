// How to play says the rules you play (idea 10 Nov): the card's lines come from the game's own rule switches, and every
// line it can show is checked against what engine/ayo.js does with those switches, for all eight mixes of them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, applyMove, legalMoves, RULES, RULE_VALUES, VARIANTS, QUIET_LIMIT, WIN_SEEDS, TOTAL_SEEDS } from "../engine/ayo.js";
import { ruleKeys, ruleLines, rulesCard, usual, LINES, NOT_USUAL } from "../web/rulesays.js";
import { translate } from "../web/i18n.js";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const MIXES = [];
for (const capture of RULE_VALUES.capture) for (const relay of RULE_VALUES.relay) for (const last8 of RULE_VALUES.last8) MIXES.push({ capture, relay, last8 });

// a small seeded random, so the games are the same on every run
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function play(rules, seed, games = 40) {
  const r = rng(seed); const seen = { relay: 0, four: 0, fourBySower: 0, twoThree: 0, last8: 0, slam: 0, otherCapture: 0, endedOnEmpty: 0, endedElsewhere: 0 };
  for (let g = 0; g < games; g++) {
    let s = newGame("ncho", rules, g % 2);
    while (!s.over) {
      const ms = legalMoves(s); const m = ms[Math.floor(r() * ms.length)]; const me = s.turn; const before = s.pits.slice();
      const { state, events } = applyMove(s, m);
      for (const e of events) {
        if (e.type === "pickup" && e.relay) seen.relay++;
        if (e.type === "drop" && e.slam) seen.slam++;
        if (e.type === "capture" && e.last8) seen.last8++;
        else if (e.type === "capture" && e.n === 4 && e.pits.length === 1) { seen.four++; if (e.by === me && e.pits[0] >= (1 - me) * 6 && e.pits[0] < (2 - me) * 6) seen.fourBySower++; }
        else if (e.type === "capture" && e.by === me && e.pits.every((k) => k >= (1 - me) * 6 && k < (2 - me) * 6)) seen.twoThree++;
        else if (e.type === "capture") seen.otherCapture++;
      }
      // one lap: the turn ends where the last seed fell (no pick-up after the first)
      if (!rules.relay) { const drops = events.filter((e) => e.type === "drop"); const last = drops[drops.length - 1]; if (last && before[last.pit] === 0) seen.endedOnEmpty++; else seen.endedElsewhere++; }
      s = state;
    }
  }
  return seen;
}

test("one line per switch, in the order a player meets them", () => {
  assert.deepEqual(ruleKeys(RULES.ncho), ["pits", "sow", "lap", "relay4", "round", "four", "fourLast", "feed", "feedLap", "dry", "call", "last8", "win", "level"]);
  assert.deepEqual(ruleKeys(RULES.ayo), ["pits", "sow", "lap", "oneLap", "twoThree", "slam", "feed", "dry", "call", "win", "level"]);
  for (const r of MIXES) {
    const k = ruleKeys(r);
    assert.equal(k.includes("relay4") || k.includes("relay23"), r.relay, JSON.stringify(r));
    assert.equal(k.includes("oneLap"), !r.relay);
    assert.equal(k.includes("four") && k.includes("fourLast"), r.capture === 4);
    assert.equal(k.includes("twoThree") && k.includes("slam"), r.capture === 23);
    assert.equal(k.includes("last8"), r.last8);
    assert.deepEqual(k.slice(-3), r.last8 ? ["last8", "win", "level"] : ["call", "win", "level"], "every game ends with how it ends");
    assert.ok(k.includes("call") && k.includes("win") && k.includes("level"));
    assert.ok(k.includes("feed") && k.includes("lap"));
    assert.equal(new Set(k).size, k.length);
  }
  assert.deepEqual(ruleLines({}), ruleLines(RULES.ncho), "no rules said: the usual Nchò");
  assert.deepEqual(ruleLines({ capture: "constructor", relay: "x" }), ruleLines(RULES.ncho), "a switch that does not exist is the game's own");
});

test("every mix of the switches: each line the card shows is what the engine does", () => {
  MIXES.forEach((r, n) => {
    const seen = play(r, 1000 + n); const k = ruleKeys(r); const name = JSON.stringify(r);
    assert.equal(seen.relay > 0, k.includes("relay4") || k.includes("relay23"), name + " relay " + seen.relay);
    if (r.capture === 4) { assert.ok(seen.four > 0 && seen.fourBySower > 0, name); assert.equal(seen.twoThree + seen.otherCapture, 0, name); }
    else { assert.ok(seen.twoThree > 0, name); assert.equal(seen.otherCapture, 0, name); }
    assert.equal(seen.last8 > 0, r.last8, name + " last 8 " + seen.last8);
    if (!r.relay) assert.ok(seen.endedOnEmpty + seen.endedElsewhere > 0, name);
  });
});

test("the lap, the slam and the feed, set up on the board", () => {
  for (const r of MIXES) {
    // 12 in your hand: the pit they came from is skipped as they go round
    let s = newGame("ncho", r); s.pits = [12, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]; s.stores = [11, 12];
    const ev = applyMove(s, 0).events; const firstLap = ev.filter((e) => e.type === "drop").slice(0, 12).map((e) => e.pit);
    assert.ok(!firstLap.includes(0), "the lap skips its own pit: " + JSON.stringify(r)); assert.equal(firstLap[11], 1);
    // their side empty: you must give them seeds when you can
    s = newGame("ncho", r); s.pits = [0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0]; s.stores = [22, 22];
    assert.deepEqual(legalMoves(s), [5], "feed: " + JSON.stringify(r));
  }
  // capture on 2 & 3: a move that would take every seed they have takes nothing
  for (const r of MIXES.filter((m) => m.capture === 23)) {
    const s = newGame("ncho", r); s.pits = [0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0]; s.stores = [20, 23];
    const { state, events } = applyMove(s, 5);
    assert.ok(events.some((e) => e.slam), JSON.stringify(r)); assert.equal(state.stores[0], 20);
  }
  // capture on 2 & 3 with relay: a capture ends the turn; taking nothing in a full pit carries on
  const rr = { capture: 23, relay: true, last8: false };
  let s = newGame("ncho", rr); s.pits = [0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0]; s.stores = [20, 22];
  let ev = applyMove(s, 5).events; assert.ok(ev.some((e) => e.type === "capture") && !ev.some((e) => e.relay));
  s = newGame("ncho", rr); s.pits = [0, 0, 0, 0, 1, 1, 0, 4, 0, 0, 0, 0]; s.stores = [20, 22];
  ev = applyMove(s, 4).events; assert.ok(ev.some((e) => e.relay), "lands in a pit with seeds, takes nothing: picks it up");
});

test("a game not played by its usual rules says so; the usual ones say nothing", () => {
  for (const v of VARIANTS) {
    assert.ok(usual(v, RULES[v])); assert.equal(rulesCard(v, RULES[v]).note, null);
    for (const r of MIXES) {
      const same = Object.keys(RULES[v]).every((k) => RULES[v][k] === r[k]);
      assert.equal(usual(v, r), same); assert.equal(rulesCard(v, r).note, same ? null : NOT_USUAL[v]);
    }
  }
  assert.equal(rulesCard("ayo", { capture: 4 }).note, NOT_USUAL.ayo);
  assert.deepEqual(rulesCard("ayo", { capture: 4 }).lines, ruleLines({ capture: 4, relay: false, last8: false }), "a changed switch keeps the game's own others");
});

test("the card in index.html starts as the usual Nchò, and game.js builds it from the game on the board", () => {
  const html = read("web/index.html"); const ul = html.slice(html.indexOf('<ul id="rulesList">'), html.indexOf("</ul>", html.indexOf('<ul id="rulesList">')));
  const items = [...ul.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim());
  assert.deepEqual(items, ruleLines(RULES.ncho));
  assert.ok(html.includes('<p id="rulesNote" class="rulesNote" hidden></p>'));
  assert.ok(!/rulesNcho|rulesAyo/.test(html));
  const game = read("web/game.js");
  assert.match(game, /rulesCard\(state\.variant, state\.rules\)/, "the rules of the game on the board (Settings → Rules, or the room's own)");
  assert.match(game, /function openRules\(atKeys = false\) \{\n  paintRules\(\);/, "painted again each time it opens");
  assert.ok(read("web/sw.js").includes("'./rulesays.js'"), "kept for offline play");
});

test("every line, in French", () => {
  for (const l of [...Object.values(LINES), ...Object.values(NOT_USUAL)]) {
    const f = translate(l, "fr"); assert.notEqual(f, l, "French for: " + l); assert.ok(!/\b(the|your|seeds?|pit)\b/.test(f), f);
  }
});

// Every way a game ends (idea 10 Nov, evening): the call, the 25 and the draw, for every mix, as the engine plays them.
test("every mix: 60 moves with no capture calls the game, each side keeping its own; 25 wins; 24 each is a draw", () => {
  MIXES.forEach((r, n) => {
    const name = JSON.stringify(r); const rand = rng(7000 + n); let called = 0, at25 = 0, level = 0;
    for (let g = 0; g < 60; g++) {
      let s = newGame("ncho", r, g % 2);
      while (!s.over) {
        const ms = legalMoves(s); const before = s; const { state, events } = applyMove(s, ms[Math.floor(rand() * ms.length)]);
        if (state.over && (state.quiet || 0) >= QUIET_LIMIT) {
          called++;
          assert.ok(!events.some((e) => e.type === "capture"), name + ": the calling move captured nothing");
          assert.deepEqual(state.pits, Array(12).fill(0), name + ": every seed left went to a side");
          for (const p of [0, 1]) assert.ok(state.stores[p] >= before.stores[p], name);
          assert.equal(state.stores[0] + state.stores[1], 48, name);
        }
        s = state;
      }
      if (Math.max(...s.stores) >= 25 && (s.quiet || 0) < QUIET_LIMIT) { at25++; assert.equal(s.winner, s.stores[0] > s.stores[1] ? 0 : 1, name); }
      if (s.stores[0] === 24 && s.stores[1] === 24) { level++; assert.equal(s.winner, "draw", name); }
    }
    assert.ok(at25 > 0, name + " 25 wins"); assert.ok(called + level > 0, name + " called " + called + " level " + level);
  });
  // set up on the board: the 60th quiet move calls it and each keeps the seeds on its own side
  for (const r of MIXES) {
    const s = newGame("ncho", r); s.pits = [1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0]; s.stores = [22, 22]; s.quiet = QUIET_LIMIT - 1;
    const { state } = applyMove(s, 0); const name = JSON.stringify(r);
    assert.ok(state.over, name); assert.deepEqual(state.stores, [23, 25], name); assert.equal(state.winner, 1, name);
    const t = newGame("ncho", r); t.pits = [1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0]; t.stores = [22, 22]; t.quiet = QUIET_LIMIT - 1;
    const u = applyMove(t, 0).state; assert.ok(u.over, name); assert.deepEqual(u.stores, [24, 24], name); assert.equal(u.winner, "draw", name);
  }
  assert.equal(QUIET_LIMIT, 60, "the line says 60"); assert.equal(WIN_SEEDS, 25, "the line says 25");
  assert.ok(LINES.call.includes(String(QUIET_LIMIT)) && LINES.win.includes(String(WIN_SEEDS)) && LINES.level.startsWith(String(TOTAL_SEEDS / 2)));
});
