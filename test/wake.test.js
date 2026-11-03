import { test } from "node:test";
import assert from "node:assert/strict";
import { wantAwake, makeWake, supported, wakeNote, IDLE_MS } from "../web/wake.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

function fakeNav({ refuse = false } = {}) {
  const asked = []; const live = [];
  const nav = { wakeLock: { request(kind) {
    asked.push(kind);
    if (refuse) return Promise.reject(new Error("NotAllowedError"));
    const ls = []; const s = { released: false, addEventListener: (ev, f) => { if (ev === "release") ls.push(f); }, release() { if (!s.released) { s.released = true; ls.forEach((f) => f()); } return Promise.resolve(); } };
    live.push(s); return Promise.resolve(s);
  } } };
  return { nav, asked, live, held: () => live.filter((s) => !s.released).length };
}

test("held only while a game is in play on the board, with the setting on", () => {
  const play = { on: true, board: true, over: false, hidden: false, online: false, idle: 0 };
  assert.equal(wantAwake(play), true);
  assert.equal(wantAwake({ ...play, on: false }), false, "Settings → Feel → Keep the screen on off");
  assert.equal(wantAwake({ ...play, board: false }), false, "Home, Settings, the Rooms screen");
  assert.equal(wantAwake({ ...play, over: true }), false, "the game is over");
  assert.equal(wantAwake({ ...play, hidden: true }), false, "another tab or app");
  assert.equal(wantAwake({ on: true, board: true }), true, "the setting defaults to on");
});

test("a phone put down still sleeps: 3 minutes against the computer, 10 in a room", () => {
  const play = { on: true, board: true, over: false, hidden: false, online: false };
  assert.equal(wantAwake({ ...play, idle: IDLE_MS.solo - 1 }), true);
  assert.equal(wantAwake({ ...play, idle: IDLE_MS.solo }), false);
  assert.equal(wantAwake({ ...play, online: true, idle: IDLE_MS.solo + 1 }), true, "a friend may think for longer");
  assert.equal(wantAwake({ ...play, online: true, idle: IDLE_MS.room }), false);
  assert.equal(IDLE_MS.solo, 180000); assert.equal(IDLE_MS.room, 600000);
});

test("the controller asks once, holds, lets go, and asks again after the browser drops it", async () => {
  let t = 0; const f = fakeNav(); const w = makeWake({ nav: f.nav, now: () => t });
  const play = { on: true, board: true, over: false, hidden: false, online: false };
  assert.equal(w.supported, true);
  w.check(play); w.check(play); await tick();
  assert.deepEqual(f.asked, ["screen"], "one request at a time");
  assert.equal(w.held, true); assert.equal(f.held(), 1);
  w.check(play); await tick(); assert.equal(f.asked.length, 1, "already held: nothing asked");
  w.check({ ...play, board: false }); await tick();
  assert.equal(w.held, false); assert.equal(f.held(), 0, "Home lets it go");
  w.check(play); await tick(); assert.equal(w.held, true); assert.equal(f.asked.length, 2);
  f.live[1].release(); // the page was hidden: the browser takes it away
  assert.equal(w.held, false);
  w.check(play); await tick(); assert.equal(w.held, true, "back on sight: asked again"); assert.equal(f.asked.length, 3);
  assert.deepEqual(w.log, ["hold", "let go", "hold", "lost", "hold"]);
});

test("idle time lets it go; a tap or a move takes it back", async () => {
  let t = 0; const f = fakeNav(); const w = makeWake({ nav: f.nav, now: () => t });
  const play = { on: true, board: true, over: false, hidden: false, online: false };
  w.check(play); await tick(); assert.equal(w.held, true);
  t = IDLE_MS.solo + 5; w.check(play); await tick(); assert.equal(w.held, false, "nobody touched it for 3 minutes");
  assert.equal(w.check({ ...play, online: true }), true, "the same wait in a room is still awake"); await tick(); assert.equal(w.held, true);
  w.check(play); await tick(); assert.equal(w.held, false);
  w.poke(); assert.equal(w.idle(), 0); w.check(play); await tick(); assert.equal(w.held, true, "a tap wakes it");
});

test("a lock given after it stopped being wanted is let go at once", async () => {
  let t = 0; const f = fakeNav(); const w = makeWake({ nav: f.nav, now: () => t });
  const play = { on: true, board: true, over: false, hidden: false };
  w.check(play); w.check({ ...play, over: true }); await tick();
  assert.equal(w.held, false); assert.equal(f.held(), 0); assert.deepEqual(w.log, ["drop"]);
});

test("a refusal is not asked again until something happens; no API at all is harmless", async () => {
  let t = 0; const f = fakeNav({ refuse: true }); const w = makeWake({ nav: f.nav, now: () => t });
  const play = { on: true, board: true, over: false, hidden: false };
  w.check(play); await tick(); await tick(); assert.deepEqual(w.log, ["refused"]);
  w.check(play); w.check(play); await tick(); assert.equal(f.asked.length, 1, "not asked again on its own");
  t = 5; w.poke(); w.check(play); await tick(); await tick(); assert.equal(f.asked.length, 2, "asked again after a tap");
  const none = makeWake({ nav: {}, now: () => 0 });
  assert.equal(none.supported, false); assert.equal(none.check(play), true, "it would want it"); assert.equal(none.held, false);
  assert.equal(supported(undefined), false); assert.equal(wakeNote({}), "not on this browser"); assert.equal(wakeNote(f.nav), "");
});
