// Video and voice at the board (Launch L16b): the call messages the server passes on (only between the two seats, only in a
// room, checked and rate-limited), the consent flow (nothing opens until both said yes), the WebRTC side against stand-ins,
// and the whole handshake over the real server.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { callMessage, passGate, pickMode, CallFlow, callWords, CALL_KINDS, MAX_SDP, ASK_GAP_MS, BURST, REFILL_MS, ICE_SERVERS } from "../web/call.js";
import { Talk, CONSTRAINTS } from "../web/talk.js";
import { Rooms, RoomError } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online } from "../web/online.js";
import { awayWords } from "../web/away.js";
import WebSocket from "ws";

test("only call messages of the right shape pass, and nothing else rides along", () => {
  assert.deepEqual(callMessage("ask", { mode: "video", extra: "x" }), { mode: "video" });
  assert.deepEqual(callMessage("yes", { mode: "voice" }), { mode: "voice" });
  assert.equal(callMessage("ask", { mode: "screen" }), null);
  assert.equal(callMessage("ask", null), null);
  assert.deepEqual(callMessage("no", { anything: 1 }), {});
  assert.deepEqual(callMessage("end"), {});
  assert.deepEqual(callMessage("offer", { sdp: "v=0" }), { sdp: "v=0" });
  assert.equal(callMessage("offer", { sdp: "" }), null);
  assert.equal(callMessage("answer", { sdp: "x".repeat(MAX_SDP + 1) }), null, "too big for a handshake");
  assert.equal(callMessage("answer", { sdp: 42 }), null);
  assert.deepEqual(callMessage("ice", { c: { candidate: "candidate:1 1 udp 1 1.2.3.4 5 typ host", sdpMid: "0", sdpMLineIndex: 0, usernameFragment: "u" } }), { c: { candidate: "candidate:1 1 udp 1 1.2.3.4 5 typ host", sdpMid: "0", sdpMLineIndex: 0 } });
  assert.deepEqual(callMessage("ice", { c: { candidate: "" } }), { c: { candidate: "" } }, "the end-of-candidates marker");
  assert.equal(callMessage("ice", { c: { candidate: "x".repeat(700) } }), null);
  assert.equal(callMessage("ice", {}), null);
  assert.deepEqual(callMessage("state", { mic: 0, cam: "yes" }), { mic: false, cam: true });
  assert.equal(callMessage("chat", { text: "hello" }), null, "no free text travels this way");
  assert.deepEqual(CALL_KINDS.filter((k) => callMessage(k, { mode: "video", sdp: "v", c: { candidate: "" } }) === null), []);
  assert.ok(ICE_SERVERS.every((s) => s.urls.every((u) => u.startsWith("stun:"))), "public STUN only: no relay that costs money");
});

test("the gate: a burst for a handshake, then a steady trickle; asks at least 5 s apart", () => {
  const g = {}; let t = 0; let n = 0;
  while (passGate(g, "ice", t)) n++;
  assert.equal(n, BURST);
  assert.equal(passGate(g, "ice", t + REFILL_MS - 1), false);
  assert.equal(passGate(g, "ice", t + REFILL_MS), true, "one more a quarter second later");
  t = 100_000; const h = {};
  assert.equal(passGate(h, "ask", t), true);
  assert.equal(passGate(h, "ask", t + ASK_GAP_MS - 1), false, "no ringing in a loop");
  assert.equal(passGate(h, "end", t + 10), true, "hanging up is never held back by the ask gap");
  assert.equal(passGate(h, "ask", t + ASK_GAP_MS), true);
});

test("voice only on the lighter board, or with no camera", () => {
  assert.equal(pickMode("video"), "video");
  assert.equal(pickMode("video", { lighter: true }), "voice");
  assert.equal(pickMode("video", { camera: false }), "voice");
  assert.equal(pickMode("voice"), "voice");
});

const kinds = (eff) => eff.map((e) => Object.keys(e)[0] + (e.send ? ":" + e.send : e.say ? ":" + e.say : ""));

test("the consent flow: nothing opens until both have said yes; the asker makes the offer", () => {
  const meka = new CallFlow(0), tete = new CallFlow(1);
  let e = meka.ask("video");
  assert.deepEqual(kinds(e), ["send:ask", "say:asking"]); assert.ok(!e.some((x) => x.media), "asking opens nothing");
  e = tete.receive("ask", { mode: "video" });
  assert.deepEqual(kinds(e), ["say:asked"]); assert.equal(tete.phase, "asked"); assert.ok(!tete.on);
  e = tete.answer("voice");
  assert.deepEqual(kinds(e), ["media", "send:yes", "say:starting"]); assert.equal(e[0].media, "voice");
  assert.deepEqual(tete.mediaReady(), [], "the answerer waits for the offer");
  e = meka.receive("yes", { mode: "voice" });
  assert.deepEqual(kinds(e), ["media", "say:starting"]); assert.equal(e[0].media, "video"); assert.equal(meka.theirs, "voice");
  assert.deepEqual(meka.mediaReady(), [{ offer: true }]);
  assert.deepEqual(tete.receive("offer", { sdp: "v" }), [{ connect: true }]);
  assert.deepEqual(meka.receive("answer", { sdp: "v" }), [{ connect: true }]);
  assert.deepEqual(kinds(meka.connected()), ["say:live"]); assert.equal(meka.phase, "live"); assert.deepEqual(meka.connected(), []);
  // mic and camera: told to the friend; the camera only with video; hiding their picture is this phone's own business
  assert.deepEqual(meka.toggleMic(), [{ send: "state", data: { mic: false, cam: true } }]);
  assert.deepEqual(meka.toggleCam(), [{ send: "state", data: { mic: false, cam: false } }]);
  assert.deepEqual(tete.toggleCam(), [], "voice only has no camera to switch");
  tete.receive("state", { mic: false, cam: false }); assert.deepEqual(tete.their, { mic: false, cam: false });
  assert.deepEqual(tete.toggleTheirs(), []); assert.equal(tete.hideTheirs, true);
  e = meka.hangUp(); assert.deepEqual(kinds(e), ["send:end", "close", "say:ended"]); assert.equal(meka.phase, "idle");
  e = tete.receive("end"); assert.deepEqual(kinds(e), ["close", "say:theyended"]); assert.equal(tete.hideTheirs, false, "a new call starts clean");
});

test("not now, stopping, crossing asks, a friend who leaves, and handshake messages out of turn", () => {
  const a = new CallFlow(0), b = new CallFlow(1);
  a.ask("video"); b.receive("ask", { mode: "video" });
  assert.deepEqual(kinds(b.cancel()), ["send:no", "say:declined"]);
  assert.deepEqual(kinds(a.receive("no")), ["say:theysaidno"]); assert.equal(a.phase, "idle");
  a.ask("voice"); b.receive("ask", { mode: "voice" });
  assert.deepEqual(kinds(a.cancel()), ["send:no", "say:stopped"]);
  assert.deepEqual(kinds(b.receive("no")), ["say:theystopped"]); assert.equal(b.phase, "idle");
  // both tap at once: the asks cross; that is both yes, both open, seat 0 offers
  a.ask("video"); b.ask("voice");
  const ea = a.receive("ask", { mode: "voice" }), eb = b.receive("ask", { mode: "video" });
  assert.equal(ea[0].media, "video"); assert.equal(eb[0].media, "voice");
  assert.deepEqual(a.mediaReady(), [{ offer: true }]); assert.deepEqual(b.mediaReady(), [], "only one side offers");
  assert.deepEqual(kinds(b.gone()), ["close", "say:theyleft"]);
  // tapping Video while their ask is up is a yes
  const c = new CallFlow(1); c.receive("ask", { mode: "video" });
  assert.deepEqual(kinds(c.ask("video")), ["media", "send:yes", "say:starting"]);
  // nothing of the handshake is acted on while idle or only asking (a stale message after a hang-up)
  const d = new CallFlow(0);
  for (const k of ["offer", "answer", "ice", "yes", "no", "end"]) assert.deepEqual(d.receive(k, {}), [], k);
  d.ask("video"); assert.deepEqual(d.receive("offer", { sdp: "v" }), []); assert.deepEqual(d.receive("ice", { c: {} }), []);
  assert.deepEqual(d.toggleMic(), []);
  // a refused camera/microphone or a line that never connects ends it for both
  d.receive("yes", { mode: "video" }); assert.deepEqual(kinds(d.noMedia()), ["send:end", "close", "say:nomedia"]);
  const f = new CallFlow(0); f.ask("voice"); f.receive("yes", { mode: "voice" }); assert.deepEqual(kinds(f.failed()), ["send:end", "close", "say:failed"]);
  assert.deepEqual(f.failed(), []); assert.deepEqual(f.hangUp(), []);
});

test("the words name the friend and say plainly what happens", () => {
  assert.equal(callWords("chip", "Tete"), "Video or voice with Tete");
  assert.equal(callWords("asked", "Tete", "video"), "Tete would like video at the board");
  assert.equal(callWords("asked", "Tete", "voice"), "Tete would like to talk at the board");
  assert.match(callWords("askedSub"), /Nothing is on until you say yes.*never recorded/);
  assert.equal(callWords("asking", "Tete"), "Asked Tete to talk — waiting for their yes");
  assert.equal(callWords("theyended", "Tete"), "Tete hung up");
  assert.match(callWords("failed", "Tete"), /Wi-Fi/);
  for (const k of ["chip", "asking", "asked", "declined", "theysaidno", "theystopped", "starting", "live", "ended", "theyended", "theyleft", "failed", "nomedia", "hangUp"]) {
    const w = callWords(k, "Tete", "video"); assert.ok(w && w.length <= 110 && !/undefined/.test(w), k + ": " + w);
  }
  assert.equal(awayWords("call", { name: "Tete", mode: "video" }), "Tete would like video at the board");
  assert.equal(awayWords("call", { name: "Tete", mode: "voice" }), "Tete would like to talk");
});

test("a room passes a call message to the other seat only, and refuses an empty board, junk, an absent friend and a flood", () => {
  let t = 1_000_000; const rooms = new Rooms({ now: () => t });
  const host = rooms.create({ name: "Meka" });
  assert.throws(() => rooms.call(host.code, host.token, "ask", { mode: "video" }), (e) => e instanceof RoomError && e.code === "waiting");
  const k = rooms.knock(host.code, { name: "Tete" }); const friend = rooms.admit(host.code, host.token, k.id);
  assert.deepEqual(rooms.call(host.code, host.token, "ask", { mode: "video" }), { seat: 0, to: 1, kind: "ask", data: { mode: "video" } });
  assert.deepEqual(rooms.call(host.code, friend.token, "yes", { mode: "voice" }), { seat: 1, to: 0, kind: "yes", data: { mode: "voice" } });
  assert.throws(() => rooms.call(host.code, host.token, "chat", { text: "hi" }), (e) => e.code === "bad");
  assert.throws(() => rooms.call(host.code, host.token, "offer", { sdp: "x".repeat(MAX_SDP + 1) }), (e) => e.code === "bad");
  assert.throws(() => rooms.call(host.code, "not-a-token", "end", {}), (e) => e.code === "token");
  assert.throws(() => rooms.call(host.code, host.token, "ask", { mode: "video" }), (e) => e.code === "slow", "asks 5 s apart");
  let n = 0; try { for (;;) { rooms.call(host.code, host.token, "ice", { c: { candidate: "" } }); n++; } } catch (e) { assert.equal(e.code, "slow"); }
  assert.ok(n >= BURST - 3 && n <= BURST, n);
  t += 10 * REFILL_MS; assert.doesNotThrow(() => rooms.call(host.code, host.token, "ice", { c: { candidate: "" } }), "the bucket refills");
  rooms.setOnline(host.code, friend.token, false); t += ASK_GAP_MS;
  assert.throws(() => rooms.call(host.code, host.token, "ask", { mode: "video" }), (e) => e.code === "away", "nobody at the other phone to ring");
  assert.ok(!JSON.stringify(rooms.snapshot(host.code)).includes("sdp"), "the room keeps nothing of a call");
});

// ---------- stand-ins for the browser's WebRTC ----------
function fakeTrack(kind) { return { kind, enabled: true, stopped: false, stop() { this.stopped = true; } }; }
function fakeStream(tracks) { return { tracks, getTracks: () => tracks.slice(), getAudioTracks: () => tracks.filter((t) => t.kind === "audio"), getVideoTracks: () => tracks.filter((t) => t.kind === "video") }; }
function fakeMedia({ camera = true, refuse = false } = {}) {
  const asked = [];
  const gum = async (c) => { asked.push(c.video ? "video" : "voice"); if (refuse) throw new Error("NotAllowedError"); if (c.video && !camera) throw new Error("NotFoundError"); return fakeStream([fakeTrack("audio"), ...(c.video ? [fakeTrack("video")] : [])]); };
  gum.asked = asked; return gum;
}
const peers = new Map(); let nextId = 1;
class FakePC {
  constructor(cfg) { this.cfg = cfg; this.id = nextId++; this.tracks = []; this.streams = new Set(); this.localDescription = null; this.remoteDescription = null; this.ice = []; this.connectionState = "new"; this.iceConnectionState = "new"; this.closed = false; this.params = { encodings: [] }; }
  addTrack(t, s) { this.tracks.push(t); this.streams.add(s); }
  getSenders() { return this.tracks.map((track) => ({ track, getParameters: () => this.params, setParameters: async (p) => { this.params = p; } })); }
  async createOffer() { return { type: "offer", sdp: `offer ${this.id} ${this.tracks.map((t) => t.kind).join(",")}` }; }
  async createAnswer() { if (!this.remoteDescription) throw new Error("no offer"); return { type: "answer", sdp: `answer ${this.id} ${this.tracks.map((t) => t.kind).join(",")}` }; }
  async setLocalDescription(d) { this.localDescription = d; peers.set(d.sdp, this); setTimeout(() => { for (const c of ["candidate:a", "candidate:b"]) this.onicecandidate && this.onicecandidate({ candidate: { candidate: `${c} ${this.id}`, sdpMid: "0", sdpMLineIndex: 0 } }); this.onicecandidate && this.onicecandidate({ candidate: null }); }, 1); }
  async setRemoteDescription(d) { this.remoteDescription = d; if (d.type === "answer") { const other = peers.get(d.sdp); this.peer = other; other.peer = this; setTimeout(() => { this.link(); other.link(); }, 5); } }
  async addIceCandidate(c) { if (!this.remoteDescription) throw new Error("InvalidStateError: no remote description"); this.ice.push(c.candidate); }
  link() { if (this.closed) return; this.connectionState = "connected"; this.iceConnectionState = "connected"; for (const s of this.peer.streams) this.ontrack && this.ontrack({ track: s.getTracks()[0], streams: [s] }); this.onconnectionstatechange && this.onconnectionstatechange(); this.oniceconnectionstatechange && this.oniceconnectionstatechange(); }
  close() { this.closed = true; }
}

test("the WebRTC side: media opens, the offer and answer carry both phones' tracks, early candidates wait, close stops everything", async () => {
  const wire = []; let a, b; const got = { a: null, b: null }; const states = { a: [], b: [] };
  const deliver = (to) => (kind, data) => { wire.push(kind); setTimeout(() => to().receive(kind, JSON.parse(JSON.stringify(data))), 0); };
  a = new Talk({ send: deliver(() => b), PC: FakePC, getUserMedia: fakeMedia(), onRemote: (s) => { got.a = s; }, onState: (s) => states.a.push(s) });
  b = new Talk({ send: deliver(() => a), PC: FakePC, getUserMedia: fakeMedia({ camera: false }), onRemote: (s) => { got.b = s; }, onState: (s) => states.b.push(s) });
  assert.equal(a.pc, null, "nothing exists before open");
  await b.open("video"); assert.equal(b.mode, "voice", "no camera on that phone: it falls back to voice only");
  await a.open("video"); assert.equal(a.mode, "video");
  await a.offer();
  for (let k = 0; k < 200 && !(states.a.length && states.b.length && got.a && got.b); k++) await new Promise((r) => setTimeout(r, 10)); // a busy CI runner can take longer than 60 ms over the timer chain
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(states.a, ["connected"]); assert.deepEqual(states.b, ["connected"]);
  assert.deepEqual(got.b.getTracks().map((t) => t.kind), ["audio", "video"], "the far phone gets the camera and the voice");
  assert.deepEqual(got.a.getTracks().map((t) => t.kind), ["audio"]);
  assert.ok(a.pc.remoteDescription.sdp.startsWith("answer") && b.pc.remoteDescription.sdp.startsWith("offer"));
  assert.ok(b.pc.ice.length >= 2 && a.pc.ice.length >= 2, "candidates landed both ways (those that came before the offer were held)");
  assert.deepEqual(wire.filter((k) => k !== "ice"), ["offer", "answer"], "only the handshake travels");
  assert.equal(a.pc.cfg.iceServers, ICE_SERVERS);
  assert.equal(b.pc.params.encodings.length, 0, "no video sender on a voice-only phone"); assert.equal(a.pc.params.encodings[0].maxBitrate, 300_000, "the picture is kept small on the wire");
  a.setMic(false); assert.equal(a.local.getAudioTracks()[0].enabled, false); a.setCam(false); assert.equal(a.local.getVideoTracks()[0].enabled, false);
  const tracks = a.local.getTracks(); a.close(); assert.ok(tracks.every((t) => t.stopped), "hanging up turns the camera and microphone off"); assert.ok(a.pc.closed);
  await a.receive("offer", { sdp: "late" }); // after close, a late message does nothing
  b.close();
});

test("a refused camera and microphone throws (the board says so and ends it); a phone closed while asking stops its media", async () => {
  const t = new Talk({ send: () => {}, PC: FakePC, getUserMedia: fakeMedia({ refuse: true }) });
  await assert.rejects(t.open("video"));
  const gum = fakeMedia(); const u = new Talk({ send: () => {}, PC: FakePC, getUserMedia: gum });
  const p = u.open("voice"); u.close(); await assert.rejects(p); assert.deepEqual(gum.asked, ["voice"]);
  assert.equal(CONSTRAINTS.voice.video, false); assert.ok(CONSTRAINTS.video.audio.echoCancellation);
});

// ---------- over the real server ----------
const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); const off = net.on(type, (d) => { clearTimeout(t); res(d); }); });

test("over the real server: the ask reaches only the friend, both say yes, the handshake crosses and the call connects", async () => {
  const host = new Online(url), friend = new Online(url);
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code } = await hj;
  // someone at the door hears nothing of a call
  const door = new WebSocket(url); const doorGot = []; door.on("message", (m) => doorGot.push(JSON.parse(String(m)).t)); await new Promise((r) => door.on("open", r));
  const knocked = once(host, "knock"); friend.join(code, "Tete"); const k = await knocked;
  const fj = once(friend, "joined"); host.let(k.id, true); await fj;
  door.send(JSON.stringify({ t: "join", code, name: "Stranger" })); await new Promise((r) => setTimeout(r, 100));
  const err = new Promise((r) => { door.on("message", (m) => { const x = JSON.parse(String(m)); if (x.t === "error") r(x); }); });
  door.send(JSON.stringify({ t: "call", kind: "ask", data: { mode: "video" } })); assert.equal((await err).code, "unseated", "only a seated player can call");

  const flows = { host: new CallFlow(0), friend: new CallFlow(1) }; const talks = {}; const said = { host: [], friend: [] }; const heard = { host: [], friend: [] };
  const live = { host: null, friend: null }; const livePromise = Object.fromEntries(["host", "friend"].map((w) => [w, new Promise((r) => { live[w] = r; })]));
  const net = { host, friend };
  const run = (who, eff) => {
    for (const e of eff) {
      if (e.send) net[who].call(e.send, e.data);
      if (e.say) { said[who].push(e.say); if (e.say === "live") live[who](); }
      if (e.close && talks[who]) { talks[who].close(); talks[who] = null; }
      if (e.media) {
        const t = talks[who] = new Talk({ send: (kd, d) => net[who].call(kd, d), PC: FakePC, getUserMedia: fakeMedia(), onState: (s) => { if (s === "connected") run(who, flows[who].connected()); } });
        t.open(e.media).then(() => run(who, flows[who].mediaReady()));
      }
      if (e.offer) talks[who].offer();
    }
  };
  for (const who of ["host", "friend"]) net[who].on("call", ({ seat, kind, data }) => { heard[who].push(kind); assert.equal(seat, who === "host" ? 1 : 0, "a message comes from the other seat"); const eff = flows[who].receive(kind, data); if (eff.some((e) => e.connect)) talks[who].receive(kind, data); run(who, eff.filter((e) => !e.connect)); });
  const asked = once(friend, "call"); run("host", flows.host.ask("video"));
  assert.equal((await asked).kind, "ask"); assert.equal(flows.friend.phase, "asked");
  assert.equal(talks.host, undefined, "the asker's camera stays closed until the friend says yes");
  run("friend", flows.friend.answer("video"));
  await Promise.all([livePromise.host, livePromise.friend]);
  assert.equal(flows.host.phase, "live"); assert.equal(flows.friend.phase, "live");
  assert.ok(!heard.host.includes("ask") && !heard.friend.includes("yes"), "no seat hears its own messages");
  assert.ok(heard.friend.includes("offer") && heard.host.includes("answer") && heard.host.includes("ice") && heard.friend.includes("ice"));
  assert.ok(!doorGot.includes("call"), "the door hears nothing of the call");
  // mute and hang up
  const st = once(friend, "call"); run("host", flows.host.toggleMic()); const s = await st; assert.equal(s.kind, "state"); assert.deepEqual(flows.friend.their, { mic: false, cam: true });
  const end = once(friend, "call"); run("host", flows.host.hangUp()); assert.equal((await end).kind, "end");
  assert.equal(flows.friend.phase, "idle"); assert.equal(talks.friend, null); assert.ok(said.friend.includes("theyended"));
  // the friend away: an ask is refused and says so
  friend.leave(); await new Promise((r) => setTimeout(r, 150));
  const away = once(host, "error"); host.call("ask", { mode: "voice" });
  const ae = await away; assert.equal(ae.code, "away"); assert.equal(ae.re, "call");
  host.leave(); door.close();
});
