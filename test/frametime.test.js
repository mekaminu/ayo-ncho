import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { frameStats, makeFrameMeter, slowVerdict, mayJudge, smoothWords, lastGameWords, lastGameRecord, parseRecord, quantile, GAP_CAP, SLOW_GAP, MIN_FRAMES, SLOW_TOAST } from "../web/frametime.js";
import { decideQuality, tier } from "../web/quality.js";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const many = (n, x) => Array.from({ length: n }, (_, i) => (typeof x === "function" ? x(i) : x));

test("frame stats: 60 a second is 60, stalls are left out, the work is kept", () => {
  const s = frameStats(many(300, 16.7), many(300, 2));
  assert.equal(s.fps, 60); assert.equal(s.frames, 300); assert.equal(s.gap.p50, 16.7); assert.equal(s.late, 0); assert.equal(s.dropped, 0);
  assert.equal(s.work.p50, 2);
  const t = frameStats([...many(100, 16.7), 2000, 900, -1, 0], many(104, 1));
  assert.equal(t.frames, 100, "gaps past GAP_CAP, zero or negative are stalls"); assert.equal(t.worked, 104);
  const u = frameStats(many(100, (i) => (i % 2 ? 50 : 16.7)));
  assert.equal(u.late, 50); assert.equal(u.dropped, 100, "a 50 ms frame misses two 60 Hz frames");
  assert.equal(quantile([], 0.5), 0); assert.equal(quantile([1, 2, 3, 4], 0.5), 2); assert.equal(quantile([1, 2, 3, 4], 0.95), 4);
  assert.deepEqual(frameStats([]).gap, { p50: 0, p75: 0, p95: 0, max: 0 });
});

test("the meter keeps the last frames only and counts the work even of a stalled frame", () => {
  const m = makeFrameMeter({ keep: 50 });
  for (let i = 0; i < 100; i++) m.add(i < 40 ? 100 : 16.7, 3);
  const s = m.stats(); assert.equal(s.frames, 50); assert.equal(s.fps, 60, "only the last 50");
  m.add(GAP_CAP + 1, 7); assert.equal(m.stats().frames, 50); assert.equal(m.stats().work.max, 7);
  m.reset(); assert.equal(m.count, 0); assert.equal(m.stats().frames, 0);
});

test("a phone is called slow only when most frames are past 25 a second, after enough of them", () => {
  assert.equal(slowVerdict(frameStats(many(MIN_FRAMES - 1, 60))), null, "too few to tell");
  assert.equal(slowVerdict(frameStats(many(MIN_FRAMES, 60))), "slow");
  assert.equal(slowVerdict(frameStats(many(MIN_FRAMES, 16.7))), "ok");
  // a smooth phone with the odd hitch (a capture, a sound starting) is not slow
  assert.equal(slowVerdict(frameStats(many(MIN_FRAMES, (i) => (i % 5 ? 16.7 : 120)))), "ok");
  // a phone just under 25 a second most of the time is
  assert.equal(slowVerdict(frameStats(many(MIN_FRAMES, (i) => (i % 5 ? 45 : 16.7)))), "slow");
  assert.equal(slowVerdict(frameStats(many(MIN_FRAMES, SLOW_GAP))), "ok", "exactly 25 a second still keeps the full board");
  assert.equal(slowVerdict(frameStats(many(60, 60)), { min: 60 }), "slow", "the frame check's shorter wait");
  assert.equal(slowVerdict(null), null);
});

test("only the full board on Auto is ever judged", () => {
  assert.equal(mayJudge({ pref: "auto", lite: false }), true);
  assert.equal(mayJudge({ pref: "full", lite: false }), false, "a phone told to keep the full board keeps it");
  assert.equal(mayJudge({ pref: "lite", lite: true }), false);
  assert.equal(mayJudge({ pref: "auto", lite: true }), false, "already lighter");
  assert.equal(mayJudge({ pref: "auto", lite: false, param: "0" }), false, "forced in the address");
  assert.equal(mayJudge({ pref: "auto", lite: false, scripted: true }), false, "the scripted renders");
  assert.equal(mayJudge({ pref: "auto", lite: false, measured: "slow" }), false, "once");
  assert.equal(mayJudge({}), true);
});

test("a phone remembered as slow opens on the lighter board, until Settings says otherwise", () => {
  const good = { effectiveType: "4g", deviceMemory: 8, cores: 8 };
  assert.equal(decideQuality({ ...good, pref: "auto" }).lite, false);
  const q = decideQuality({ ...good, pref: "auto", measured: "slow" });
  assert.equal(q.lite, true); assert.equal(q.reason, "this phone drew the full board slowly");
  assert.equal(decideQuality({ ...good, pref: "full", measured: "slow" }).lite, false, "Off in Settings wins");
  assert.equal(decideQuality({ ...good, pref: "auto", measured: "slow", param: "0" }).lite, false, "the address wins");
  assert.equal(decideQuality({ ...good, pref: "auto", measured: "" }).lite, false, "cleared by a choice in Settings");
});

test("the words: Settings says how the seeds have been moving, in plain words", () => {
  assert.equal(smoothWords(60), "smooth"); assert.equal(smoothWords(50), "smooth"); assert.equal(smoothWords(40), "a little uneven");
  assert.equal(smoothWords(24), "slow"); assert.equal(smoothWords(12), "very slow"); assert.equal(smoothWords(0), "");
  assert.equal(lastGameWords({ fps: 58, lite: false }), "seeds lately 58 frames a second, smooth · full board");
  assert.equal(lastGameWords({ fps: 31, lite: true }), "seeds lately 31 frames a second, a little uneven · lighter board");
  assert.equal(lastGameWords(null), ""); assert.equal(lastGameWords({ fps: 0 }), "");
  const rec = lastGameRecord(frameStats(many(120, 20), many(120, 3)), true);
  assert.deepEqual(rec, { fps: 50, p95: 20, work: 3, lite: true });
  assert.equal(lastGameRecord(frameStats(many(59, 20)), false), null, "too little moved to say");
  assert.deepEqual(parseRecord(JSON.stringify(rec)), rec); assert.equal(parseRecord("nonsense"), null); assert.equal(parseRecord(""), null); assert.equal(parseRecord('{"x":1}'), null);
  assert.match(SLOW_TOAST, /from the next time you open the game/); assert.match(SLOW_TOAST, /Settings → Feel → Lighter board/);
});

test("the game wires the meter in: the loop feeds it, Settings shows it, a choice clears the judgement, the shell caches it", () => {
  const g = read("web/game.js");
  assert.match(g, /from '\.\/frametime\.js'/);
  assert.match(g, /frameMeter\(gap, performance\.now\(\) - t0, moving\)/, "every frame goes to the meter");
  assert.match(g, /prefs\.get\('quality\.measured', null\)\)\)/, "Auto reads what was measured");
  assert.match(g, /prefs\.set\('quality\.measured', ''\)/, "a choice in Settings starts afresh");
  assert.match(g, /lastGameWords\(parseFrames\(prefs\.get\('frames\.last', ''\)\)\)/, "Settings says it");
  assert.match(g, /if \(!moving \|\| clipping \|\| document\.hidden\) return;/, "only moving frames, never the clip or a hidden tab");
  assert.match(read("web/sw.js"), /'\.\/frametime\.js'/, "cached for offline play");
});

test("the frame check's results: the lighter board keeps within its budgets and is lighter than the full one", () => {
  const p = new URL("docs/launch/frames.json", root);
  assert.ok(existsSync(p), "run python3 tools/frame-check.py");
  const r = JSON.parse(readFileSync(p, "utf8"));
  assert.equal(r.pass, true, JSON.stringify(r.checks.filter((c) => !c.ok)));
  assert.ok(r.throttle >= 4, "measured with the CPU at least 4× slower");
  const L = r.lite, F = r.full, B = r.budget;
  assert.equal(L.lite, true); assert.equal(F.lite, false);
  assert.ok(L.logic_ms.p95 <= B.logic_p95_ms && L.logic_ms.p50 <= B.logic_p50_ms, JSON.stringify(L.logic_ms));
  assert.ok(L.calls <= B.calls && L.triangles <= B.triangles && L.tex_mb <= B.tex_mb, "the scene");
  assert.equal(L.pixel_ratio, tier(true).maxPixelRatio);
  assert.ok(L.triangles < F.triangles && L.tex_mb < F.tex_mb, "lighter than the full board");
  assert.ok(L.logic_ms.frames >= 150 && F.logic_ms.frames >= 20, "enough frames");
  // the checklist for the testers' phones points at what the game shows them
  const doc = read("docs/launch/slow-phones.md");
  for (const w of ["seeds lately", "Settings → Feel → Lighter board", "frames.json", "Papa Ike", "battery", "warm"]) assert.ok(doc.includes(w), w);
});
