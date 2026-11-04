// Video and voice at the board, slice 3 (Launch L16b): on a weak line the call goes voice only by itself. The line is read
// from the connection's own numbers (getStats), LineWatch decides, the consent flow carries it to both phones, and the
// WebRTC side stops sending the picture (and sends it again on Video again).
import { test } from "node:test";
import assert from "node:assert/strict";
import { callMessage, CallFlow, callWords, LINE, LineWatch, readLine, badLine } from "../web/call.js";
import { Talk } from "../web/talk.js";

const kinds = (e) => e.map((x) => x.send ? "send:" + x.send : x.say ? "say:" + x.say : x.video !== undefined ? "video:" + x.video : Object.keys(x)[0]);

// a getStats reading as Chrome gives it: a transport naming the pair in use, the pairs, the incoming streams
function stats({ rtt = 0.04, kbps = 2000, lost = 0, got = 1000, other = true } = {}) {
  const r = [
    { type: "transport", id: "T1", selectedCandidatePairId: "CP1" },
    { type: "candidate-pair", id: "CP1", state: "succeeded", nominated: true, currentRoundTripTime: rtt, availableOutgoingBitrate: kbps * 1000 },
    { type: "inbound-rtp", id: "IA", kind: "audio", packetsLost: Math.round(lost / 2), packetsReceived: Math.round(got / 2) },
    { type: "inbound-rtp", id: "IV", kind: "video", packetsLost: lost - Math.round(lost / 2), packetsReceived: got - Math.round(got / 2) },
  ];
  if (other) r.push({ type: "candidate-pair", id: "CP2", state: "failed", currentRoundTripTime: 9, availableOutgoingBitrate: 1 }); // a pair not in use is never read
  return r;
}

test("one reading: the pair in use, the bitrate it can send, the share of packets lost since the last reading", () => {
  let r = readLine(stats({ rtt: 0.12, kbps: 900, lost: 10, got: 990 }));
  assert.deepEqual(r.sample, { rtt: 120, kbps: 900, loss: 0.01, pairs: 1 });
  r = readLine(stats({ rtt: 0.12, kbps: 900, lost: 110, got: 1890 }), r.prev);
  assert.equal(r.sample.loss, 0.1, "100 lost of the 1000 since the last reading");
  // no transport report (Safari, Firefox): the nominated, succeeded pair
  const s = stats({ rtt: 0.3 }).filter((x) => x.type !== "transport");
  assert.equal(readLine(s).sample.rtt, 300);
  // nothing connected yet / no numbers
  assert.deepEqual(readLine([]).sample, { rtt: null, kbps: null, loss: 0, pairs: 0 });
  assert.deepEqual(readLine(null).sample.pairs, 0);
  // counters that went back (a new stream): no made-up loss
  assert.equal(readLine(stats({ lost: 0, got: 10 }), { lost: 50, got: 5000 }).sample.loss, 0);
});

test("what counts as a weak line", () => {
  assert.equal(badLine({ rtt: 80, kbps: 1500, loss: 0, pairs: 1 }), false);
  assert.equal(badLine({ rtt: LINE.rttMs + 1, kbps: 1500, loss: 0 }), true, "a slow round trip");
  assert.equal(badLine({ rtt: 80, kbps: LINE.kbps - 1, loss: 0 }), true, "too little to send a face");
  assert.equal(badLine({ rtt: 80, kbps: 1500, loss: LINE.loss + 0.01 }), true, "packets lost");
  assert.equal(badLine({ rtt: null, kbps: null, loss: 0 }), false, "no numbers is not a weak line");
});

test("the watch: weak after 3 bad of the last 4 readings, better after 10 good in a row, one bad reading changes nothing", () => {
  const w = new LineWatch(); const good = { rtt: 50, kbps: 1500, loss: 0, pairs: 1 }, bad = { rtt: 1200, kbps: 80, loss: 0.2, pairs: 1 };
  assert.equal(w.push({ ...bad, pairs: 0 }), null, "not on a pair yet: not judged");
  const seq = [good, bad, good, bad, good, good, bad, good].map((s) => w.push(s));
  assert.ok(seq.every((x) => x === null), "a line that hiccups now and then stays a video line");
  w.push(good); w.push(good); // four good in the window
  assert.equal(w.push(bad), null); assert.equal(w.push(bad), null); assert.equal(w.push(bad), "weak");
  assert.equal(w.push(bad), null, "said once");
  for (let i = 0; i < LINE.goodFor - 1; i++) assert.equal(w.push(good), null);
  w.push(bad); // a bad one starts the count again
  for (let i = 0; i < LINE.goodFor - 1; i++) assert.equal(w.push(good), null);
  assert.equal(w.push(good), "better");
  assert.equal(w.weak, false);
  // read() keeps its own packet counts between readings
  const v = new LineWatch(); let lost = 0, got = 0, out = [];
  for (let i = 0; i < 4; i++) { lost += 30; got += 100; out.push(v.read(stats({ lost, got }))); }
  assert.deepEqual(out, [null, null, "weak", null], "23% lost, reading after reading");
  // the friend's line went weak: this phone waits for its own line to hold good before offering video again
  const m = new LineWatch(); m.markWeak(); for (let i = 0; i < LINE.goodFor - 1; i++) m.push(good); assert.equal(m.push(good), "better");
  assert.ok(LINE.everyMs * LINE.weakOf <= 8000 && LINE.everyMs * LINE.goodFor >= 15000, "weak within ~6 s, better only after ~20 s");
});

function liveCall(mekaMode = "video", teteMode = "video") {
  const meka = new CallFlow(0), tete = new CallFlow(1);
  meka.ask(mekaMode); tete.receive("ask", { mode: mekaMode }); tete.answer(teteMode); meka.receive("yes", { mode: teteMode });
  meka.connected(); tete.connected();
  return { meka, tete };
}

test("a weak line: this phone stops its picture and tells the friend, whose phone does the same; voice carries on", () => {
  const { meka, tete } = liveCall();
  let e = meka.lineWeak();
  assert.deepEqual(kinds(e), ["video:false", "send:state", "say:weak"]);
  assert.deepEqual(e[1].data, { mic: true, cam: false, weak: true });
  assert.ok(meka.weak && !meka.cam && !meka.their.cam && meka.on, "still talking");
  assert.deepEqual(meka.lineWeak(), [], "said once");
  assert.deepEqual(meka.toggleCam(), [], "no camera switch while the line is weak");
  e = tete.receive("state", e[1].data);
  assert.deepEqual(kinds(e), ["video:false", "send:state", "say:theirweak"]);
  assert.deepEqual(e[1].data, { mic: true, cam: false }, "the answer carries no weak flag (no echo back and forth)");
  assert.ok(tete.weak && !tete.cam); assert.deepEqual(tete.their, { mic: true, cam: false });
  assert.deepEqual(meka.receive("state", e[1].data), [], "their camera off: nothing more to do");
  assert.deepEqual(meka.their, { mic: true, cam: false });
  // both weak at once: no ping-pong
  assert.deepEqual(tete.receive("state", { mic: true, cam: false, weak: true }), []);
  // mute still works
  assert.deepEqual(meka.toggleMic(), [{ send: "state", data: { mic: false, cam: false } }]);
});

test("better, then Video again on either phone brings both pictures back (each camera as it was)", () => {
  const c = liveCall(); c.tete.toggleCam(); // Tete had their camera off before the line went weak
  const w2 = c.meka.lineWeak(); c.tete.receive("state", w2[1].data);
  assert.deepEqual(kinds(c.tete.lineBetter()), ["say:better"]); assert.ok(c.tete.better);
  assert.deepEqual(c.tete.lineBetter(), [], "said once");
  assert.deepEqual(c.tete.lineWeak(), [], "weak again before the tap: still weak…"); assert.equal(c.tete.better, false, "…and Video again is no longer offered");
  c.tete.lineBetter();
  let e = c.tete.videoAgain();
  assert.deepEqual(kinds(e), ["video:true", "send:state", "say:videoagain"]);
  assert.deepEqual(e[1].data, { mic: true, cam: false, weak: false }, "Tete's camera stays off as Tete left it");
  assert.ok(!c.tete.weak && !c.tete.cam);
  e = c.meka.receive("state", e[1].data);
  assert.deepEqual(kinds(e), ["video:true", "send:state", "say:theirvideoagain"]);
  assert.deepEqual(e[1].data, { mic: true, cam: true }, "Meka's camera back on");
  assert.deepEqual(c.meka.their, { mic: true, cam: false });
  c.tete.receive("state", e[1].data); assert.deepEqual(c.tete.their, { mic: true, cam: true });
  assert.deepEqual(c.meka.videoAgain(), [], "nothing to bring back");
  // the camera switch works again
  assert.deepEqual(c.meka.toggleCam(), [{ send: "state", data: { mic: true, cam: false } }]);
});

test("voice-only calls and calls not yet live are never touched; a hang-up starts the next call clean", () => {
  const { meka } = liveCall("voice", "voice");
  assert.equal(meka.video, false); assert.deepEqual(meka.lineWeak(), [], "no picture to drop");
  const half = liveCall("voice", "video"); assert.ok(half.meka.video, "Tete sends a picture: it can go");
  assert.deepEqual(kinds(half.meka.lineWeak()), ["video:false", "send:state", "say:weak"]);
  assert.equal(half.meka.mine, "voice"); assert.equal(half.meka.cam, false, "Meka's voice-only phone had no camera on");
  half.meka.hangUp(); assert.equal(half.meka.weak, false); assert.equal(half.meka.better, false);
  const a = new CallFlow(0); a.ask("video"); assert.deepEqual(a.lineWeak(), []);
  assert.deepEqual(a.receive("state", { mic: true, cam: true, weak: true }), [], "not live: nothing");
});

test("the server passes the weak flag only as a true/false, never anything else", () => {
  assert.deepEqual(callMessage("state", { mic: true, cam: false, weak: true }), { mic: true, cam: false, weak: true });
  assert.deepEqual(callMessage("state", { mic: true, cam: true, weak: false }), { mic: true, cam: true, weak: false });
  assert.deepEqual(callMessage("state", { mic: true, cam: true, weak: "very" }), { mic: true, cam: true });
  assert.deepEqual(callMessage("state", { mic: 1, cam: 0 }), { mic: true, cam: false });
});

test("the words", () => {
  assert.equal(callWords("weak", "Tete"), "The line is weak — voice only for now, so you can keep talking");
  assert.equal(callWords("theirweak", "Tete"), "Tete's line is weak — voice only for now");
  assert.match(callWords("better", "Tete"), /Video again/);
  assert.equal(callWords("videoAgain", "Tete"), "Video again");
  assert.equal(callWords("theirvideoagain", "Tete"), "Tete turned video back on");
  assert.match(callWords("weakNote", "Tete"), /voice carried on/);
});

// ---------- the WebRTC side ----------
class Track { constructor(kind) { this.kind = kind; this.enabled = true; } stop() { this.stopped = true; } }
class Stream { constructor(t) { this.t = t; } getTracks() { return this.t; } getVideoTracks() { return this.t.filter((x) => x.kind === "video"); } getAudioTracks() { return this.t.filter((x) => x.kind === "audio"); } }
class PC {
  constructor() { this.senders = []; this.reports = stats(); }
  addTrack(track) { const s = { track, params: { encodings: [] }, replaced: [], getParameters() { return this.params; }, async setParameters(p) { this.params = p; }, async replaceTrack(t) { this.replaced.push(t && t.kind); this.track = t; } }; this.senders.push(s); }
  getSenders() { return this.senders; }
  async getStats() { return new Map(this.reports.map((r) => [r.id, r])); }
  close() {}
}

test("Talk: the readings come from getStats; sendVideo takes the picture off the wire and puts it back, the camera left open", async () => {
  const t = new Talk({ send: () => {}, PC, getUserMedia: async (c) => new Stream(c.video ? [new Track("audio"), new Track("video")] : [new Track("audio")]) });
  assert.equal(await t.stats(), null, "nothing before the connection");
  await t.open("video");
  const st = await t.stats(); assert.ok(Array.isArray(st) && st.some((r) => r.type === "candidate-pair"));
  assert.equal(new LineWatch().read(st), null);
  assert.equal(t.sendingVideo, true);
  const vs = t.pc.senders.find((s) => s.track.kind === "video"), cam = vs.track;
  await t.sendVideo(false);
  assert.equal(vs.track, null); assert.equal(t.sendingVideo, false); assert.equal(cam.stopped, undefined, "the camera stays open, so it comes straight back");
  await t.sendVideo(false); assert.deepEqual(vs.replaced, [null, null]);
  await t.sendVideo(true);
  assert.equal(vs.track, cam); assert.equal(t.sendingVideo, true); assert.equal(vs.params.encodings[0].maxBitrate, 300_000, "kept small again");
  // a voice-only phone has nothing to send or stop
  const v = new Talk({ send: () => {}, PC, getUserMedia: async () => new Stream([new Track("audio")]) });
  await v.open("voice"); await v.sendVideo(false); await v.sendVideo(true); assert.equal(v.sendingVideo, false);
  t.close(); assert.equal(await t.stats(), null, "nothing after hanging up");
});
