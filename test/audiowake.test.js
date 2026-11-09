// The sound comes back (idea 9 Nov): web/audiowake.js wakes the board's audio after a call, Siri or another app took it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { wakeStep, makeAudioWake, bindAudioWake, asleep, STUCK_MS, REBUILD_GAP_MS } from "../web/audiowake.js";

// a pretend AudioContext: resume() works unless `stubborn` (an iPhone still in a call, or one that will not come back)
function fakeCtx(state = "running", { stubborn = false } = {}) {
  const c = { state, resumes: 0, closed: 0,
    resume() { c.resumes++; if (!stubborn && c.state !== "closed") c.state = "running"; return Promise.resolve(); },
    close() { c.closed++; c.state = "closed"; return Promise.resolve(); } };
  return c;
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test("an iPhone's 'interrupted' counts as asleep, as does 'suspended'; running and closed do not", () => {
  assert.ok(asleep("interrupted")); assert.ok(asleep("suspended"));
  assert.ok(!asleep("running")); assert.ok(!asleep("closed")); assert.ok(!asleep(null));
});

test("wakeStep: resume when asleep and wanted; nothing when running, unwanted or not made yet", () => {
  const base = { gesture: true, wanted: true, tried: null, now: 10000 };
  assert.equal(wakeStep({ ...base, state: "interrupted" }), "resume");
  assert.equal(wakeStep({ ...base, state: "suspended", gesture: false }), "resume");
  assert.equal(wakeStep({ ...base, state: "running" }), null);
  assert.equal(wakeStep({ ...base, state: null }), null);
  assert.equal(wakeStep({ ...base, state: "interrupted", wanted: false }), null, "sound and music off: leave it asleep");
});

test("wakeStep: a tap's try that did not take is made again in a later tap, never outside one, and not too often", () => {
  const base = { state: "interrupted", wanted: true, tried: 1000 };
  assert.equal(wakeStep({ ...base, gesture: true, now: 1000 + STUCK_MS - 1 }), "resume", "too soon to call it stuck");
  assert.equal(wakeStep({ ...base, gesture: true, now: 1000 + STUCK_MS }), "rebuild");
  assert.equal(wakeStep({ ...base, gesture: false, now: 1000 + STUCK_MS * 5 }), "resume", "coming back to the page never makes it again");
  assert.equal(wakeStep({ ...base, gesture: true, now: 20000, rebuilt: 20000 - REBUILD_GAP_MS + 1 }), "resume", "made again a moment ago: try waking instead");
  assert.equal(wakeStep({ state: "closed", wanted: true, tried: null, gesture: true, now: 5 }), "rebuild", "a closed context is made again in a tap");
  assert.equal(wakeStep({ state: "closed", wanted: true, tried: null, gesture: false, now: 5 }), null);
});

test("after a call: the first tap wakes the sleeping context and the count clears", async () => {
  let t = 0; const ctx = fakeCtx("interrupted"); let rebuilt = 0;
  const w = makeAudioWake({ get: () => ctx, rebuild: () => rebuilt++, wanted: () => true, now: () => t });
  assert.equal(w.poke("tap", true), "resume"); await tick();
  assert.equal(ctx.state, "running"); assert.equal(w.s.woke, 1); assert.equal(w.s.tried, null); assert.equal(rebuilt, 0);
  assert.equal(w.poke("tap", true), null, "running: a tap does nothing more");
});

test("a context that will not wake is closed and made again in the next tap, at most once in a while", async () => {
  let t = 0; let ctx = fakeCtx("interrupted", { stubborn: true }); const made = [];
  const w = makeAudioWake({ get: () => ctx, rebuild: () => { ctx = fakeCtx("interrupted", { stubborn: true }); made.push(t); }, wanted: () => true, now: () => t });
  w.poke("back", false); await tick(); assert.equal(w.s.tried, null, "a try without a tap does not count");
  w.poke("tap", true); await tick(); assert.equal(w.s.tried, 0);
  t = 500; assert.equal(w.poke("tap", true), "resume");
  t = STUCK_MS; const old = ctx; assert.equal(w.poke("tap", true), "rebuild");
  assert.equal(old.closed, 1, "the old one is let go"); assert.deepEqual(made, [STUCK_MS]); assert.equal(w.s.rebuilds, 1);
  // still in the call: the new one is asleep too — taps wake-try it, but it is not made again for a while
  t += 100; w.poke("tap", true); t += STUCK_MS * 2; assert.equal(w.poke("tap", true), "resume");
  t = STUCK_MS + REBUILD_GAP_MS + 1; assert.equal(w.poke("tap", true), "rebuild"); assert.equal(w.s.rebuilds, 2);
});

test("a context that wakes by itself (Android after a call) clears the stuck count", async () => {
  let t = 0; const ctx = fakeCtx("suspended", { stubborn: true }); let rebuilt = 0;
  const w = makeAudioWake({ get: () => ctx, rebuild: () => rebuilt++, wanted: () => true, now: () => t });
  w.poke("tap", true); ctx.state = "running"; w.changed(); assert.equal(w.s.tried, null); assert.equal(w.s.woke, 1);
  ctx.state = "suspended"; t = 5000; assert.equal(w.poke("tap", true), "resume", "a fresh sleep starts a fresh count"); assert.equal(rebuilt, 0);
});

test("with sound and music both off nothing is woken or made", () => {
  const ctx = fakeCtx("interrupted"); let rebuilt = 0;
  const w = makeAudioWake({ get: () => ctx, rebuild: () => rebuilt++, wanted: () => false });
  assert.equal(w.poke("tap", true), null); assert.equal(ctx.resumes, 0); assert.equal(rebuilt, 0);
  const none = makeAudioWake({ get: () => null, rebuild: () => rebuilt++, wanted: () => true });
  assert.equal(none.poke("tap", true), null, "no audio made yet: the board's first sound makes it");
});

test("bindAudioWake: taps and keys are gestures, coming back to the page is not", () => {
  const on = {}; const add = (o) => (ev, f) => { (on[o + ev] = on[o + ev] || []).push(f); };
  const win = { addEventListener: add("w:") }, doc = { hidden: false, addEventListener: add("d:") };
  const calls = []; bindAudioWake({ poke: (why, g) => calls.push([why, g]) }, { win, doc });
  on["w:pointerdown"][0](); on["w:keydown"][0](); on["w:touchend"][0]();
  doc.hidden = true; on["d:visibilitychange"][0](); doc.hidden = false; on["d:visibilitychange"][0](); on["w:pageshow"][0]();
  assert.deepEqual(calls, [["tap", true], ["tap", true], ["tap", true], ["back", false], ["back", false]]);
});

test("the game wires it in, and the offline cache carries it", () => {
  const g = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(g, /from '\.\/audiowake\.js'/);
  assert.match(g, /bindAudioWake\(audioWake, \{ win: window, doc: document \}\)/);
  assert.match(g, /asleep\(audio\.ctx\.state\)/, "sound() wakes an interrupted context, not only a suspended one");
  assert.doesNotMatch(g, /audio\.ctx\.state === 'suspended'/);
  const sw = readFileSync(new URL("../web/sw.js", import.meta.url), "utf8");
  assert.match(sw, /'\.\/audiowake\.js'/);
});
