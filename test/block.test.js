// Block and report (Launch L16b, slice 2): the phone's random tag, the blocked list on the phone, the knocks turned away, the
// tag carried by the rooms (and back after a restart), over the real server; and the permissions and pages the stores read.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanTag, makeTag, phoneTag, readBlocked, Blocked, mayBlock, sortKnocks, blockWords, TAG_LENGTH, MAX_BLOCKED, ARM_MS, REPORT_PAGE, REPORT_HASH } from "../web/block.js";
import { Rooms } from "../server/rooms.js";
import { createServer } from "../server/index.js";
import { Online, ticketOf } from "../web/online.js";
import { legalPage } from "../server/legal.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(path.join(ROOT, f), "utf8");
const mem = () => { const m = new Map(); return { m, get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v) }; };
const T1 = "aaaaaaaaaaaaaaaaaaaaaa", T2 = "bbbbbbbbbbbbbbbbbbbbbb", T3 = "cccccccccccccccccccccc";

test("a phone's tag: random, the right shape, made once and kept", () => {
  const a = makeTag(), b = makeTag();
  assert.equal(a.length, TAG_LENGTH); assert.ok(cleanTag(a) === a && cleanTag(b) === b); assert.notEqual(a, b);
  const seen = new Set(); for (let i = 0; i < 500; i++) seen.add(makeTag()); assert.equal(seen.size, 500);
  assert.equal(makeTag((n) => new Uint8Array(n)), "A".repeat(TAG_LENGTH)); // made from the bytes it is given
  const s = mem(); const t = phoneTag(s); assert.equal(phoneTag(s), t, "the same tag every time on one phone"); assert.equal(s.get("tag"), t);
  s.set("tag", "short"); const t2 = phoneTag(s); assert.notEqual(t2, "short"); assert.equal(cleanTag(t2), t2, "a damaged tag is made again");
  for (const bad of [null, undefined, 42, "", "x".repeat(15), "x".repeat(33), "aaaaaaaaaaaaaaaaaa<b>", "aaaa aaaa aaaa aaaa aa", { t: 1 }]) assert.equal(cleanTag(bad), null, String(bad));
});

test("the blocked list: added once, kept on the phone, removed, never longer than its limit", () => {
  const s = mem(); const b = new Blocked(s);
  assert.equal(b.size, 0); assert.ok(!b.has(T1)); assert.ok(!b.has(null));
  assert.ok(b.add(T1, "  Tete  ", 5)); assert.ok(b.has(T1)); assert.deepEqual(b.list, [{ tag: T1, name: "Tete", at: 5 }]);
  assert.ok(!b.add("bad", "X"), "no tag, nothing to block");
  b.add(T2, "", 6); assert.equal(b.list[1].name, "Someone");
  b.add(T1, "Tete again", 7); assert.equal(b.size, 2, "blocking twice keeps one entry"); assert.equal(b.list[1].name, "Tete again");
  const again = new Blocked(s); assert.ok(again.has(T1) && again.has(T2), "kept across a reload");
  assert.ok(again.remove(T1)); assert.ok(!again.remove(T1)); assert.ok(!new Blocked(s).has(T1) && new Blocked(s).has(T2));
  for (let i = 0; i < MAX_BLOCKED + 20; i++) again.add(("t" + i).padEnd(20, "x"), "P" + i, i);
  assert.equal(again.size, MAX_BLOCKED); assert.ok(again.has(("t" + (MAX_BLOCKED + 19)).padEnd(20, "x")) && !again.has(T2), "the oldest go first");
  assert.deepEqual(readBlocked("not json"), []); assert.deepEqual(readBlocked('{"a":1}'), []);
  assert.deepEqual(readBlocked(JSON.stringify([{ tag: T1, name: "<b>A</b>".repeat(9) }, { tag: "x" }, null, { tag: T1, name: "dup" }])), [{ tag: T1, name: "<b>A</b>".repeat(9).slice(0, 24), at: 0 }]);
});

test("whether Block shows, which knocks are turned away, and the words", () => {
  assert.ok(mayBlock({ online: true, friend: { name: "Tete", tag: T1 } }));
  assert.ok(!mayBlock({ online: true, friend: { name: "Tete", tag: null } }), "an older phone sends no tag: nothing to block by");
  assert.ok(!mayBlock({ online: true, friend: null })); assert.ok(!mayBlock({ online: false, friend: { tag: T1 } }));
  const s = mem(); const b = new Blocked(s); b.add(T2, "Ike");
  const { shown, refused } = sortKnocks([{ id: "1", name: "Tete", tag: T1 }, { id: "2", name: "Ike", tag: T2 }, { id: "3", name: "Old", tag: null }], b);
  assert.deepEqual(shown.map((k) => k.id), ["1", "3"]); assert.deepEqual(refused.map((k) => k.id), ["2"]);
  assert.deepEqual(sortKnocks(undefined, b), { shown: [], refused: [] });
  assert.equal(blockWords("block", "Tete"), "Block Tete"); assert.equal(blockWords("armed", "Tete"), "Tap again to block Tete"); assert.equal(blockWords("armedKeys", "Tete"), "Click again to block Tete");
  assert.match(blockWords("done", "Tete"), /^Tete is blocked on this phone/); assert.match(blockWords("atDoor", "Meka"), /Settings → Privacy/);
  assert.equal(blockWords("report"), "Report a problem"); assert.equal(blockWords("nope"), "");
  assert.equal(ARM_MS, 3000); assert.equal(REPORT_PAGE + REPORT_HASH, "support#report");
});

test("the rooms carry each phone's tag to the other seat, and only a clean one", () => {
  const rooms = new Rooms({ secret: "s" });
  const { code, token } = rooms.create({ name: "Meka", tag: T1 });
  const k = rooms.knock(code, { name: "Tete", tag: T2 });
  assert.equal(k.hostTag, T1, "the knocker learns the host's tag (so a phone that blocked the host can say so)"); assert.equal(k.tag, T2);
  assert.deepEqual(rooms.snapshot(code).knocks, [{ id: k.id, name: "Tete", tag: T2 }], "the host sees the knocker's tag");
  const bad = rooms.knock(code, { name: "Odd", tag: "<script>" }); assert.ok(!("tag" in bad), "a bad tag is dropped");
  const r = rooms.admit(code, token, k.id);
  assert.deepEqual(r.room.players.map((p) => p.tag), [T1, T2]);
  // a restart: the room is rebuilt from a ticket, which carries no tags; each phone gives its own back as it rejoins
  const ticket = ticketOf(rooms.snapshot(code));
  const fresh = new Rooms({ secret: "s" });
  const back = fresh.rejoin(code, token, ticket, T1); assert.ok(back.restored);
  assert.deepEqual(back.room.players.map((p) => p.tag), [T1, undefined]);
  const ft = fresh.tokenFor(code, back.room.rid, 1); const fb = fresh.rejoin(code, ft, null, T2);
  assert.deepEqual(fb.room.players.map((p) => p.tag), [T1, T2]);
  fresh.rejoin(code, ft, null, "nope"); assert.equal(fresh.snapshot(code).players[1].tag, T2, "a bad tag never replaces a good one");
  assert.ok(!("tag" in new Rooms().create({ name: "Old" }).room.players[0]), "an older phone sends none, and nothing is added for it");
});

const srv = createServer({ sweepEvery: 60_000 });
await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
const url = `ws://127.0.0.1:${srv.server.address().port}/ws`;
after(() => srv.close());
const once = (net, type, ms = 5000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no "${type}" within ${ms} ms`)), ms); net.on(type, (d) => { clearTimeout(t); res(d); }); });

test("over the real server: the tags reach the other phone, and a knock the host turns away says only 'not let in'", async () => {
  const host = new Online(url, { tag: T1 }), friend = new Online(url, { tag: T2 });
  const hj = once(host, "joined"); host.create({ variant: "ncho", name: "Meka" }); const { code, room } = await hj;
  assert.equal(room.players[0].tag, T1);
  const kn = once(host, "knock"); const kd = once(friend, "knocked"); friend.join(code, "Tete");
  const [k, d] = await Promise.all([kn, kd]);
  assert.equal(k.tag, T2, "the host's board hears the knocker's tag"); assert.equal(d.hostTag, T1, "the knocker's board hears the host's");
  const no = once(friend, "error"); host.let(k.id, false); const e = await no;
  assert.equal(e.code, "notlet", "a blocked knock looks like any Not now");
  // a friend let in: both snapshots carry both tags; a rejoin carries the tag again
  const third = new Online(url, { tag: T3 });
  const kn2 = once(host, "knock"); third.join(code, "Ada"); const k2 = await kn2; assert.equal(k2.tag, T3);
  const tj = once(third, "joined"); host.let(k2.id, true); const j = await tj;
  assert.deepEqual(j.room.players.map((p) => p.tag), [T1, T3]);
  host.leave(); friend.leave(); third.leave();
});

test("the apps ask for the camera and microphone with plain reasons, and never require them", () => {
  const man = read("android/app/src/main/AndroidManifest.xml");
  for (const p of ["CAMERA", "RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS"]) assert.ok(man.includes(`<uses-permission android:name="android.permission.${p}" />`), p);
  for (const f of ["camera", "camera.front", "microphone"]) assert.ok(man.includes(`<uses-feature android:name="android.hardware.${f}" android:required="false" />`), f + " is not required");
  const plist = read("ios/App/App/Info.plist");
  for (const k of ["NSCameraUsageDescription", "NSMicrophoneUsageDescription"]) {
    const m = plist.match(new RegExp(`<key>${k}</key>\\s*<string>([^<]+)</string>`)); assert.ok(m, k);
    assert.match(m[1], /friend/); assert.match(m[1], /both say yes/); assert.match(m[1], /never recorded/);
  }
  // Capacitor's own WebView code passes the page's ask on to the phone (so nothing of ours is needed there)
  assert.match(read("node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java"), /RECORD_AUDIO/);
  assert.match(read("node_modules/@capacitor/ios/Capacitor/Capacitor/WebViewDelegationHandler.swift"), /requestMediaCapturePermissionFor/);
});

test("the pages and the forms say what video, voice, block and report do", () => {
  const txt = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const p = txt(legalPage("privacy", {}));
  for (const must of ["Video and voice with a friend", "Nothing is switched on until you have both said yes", "never pass through our server", "nothing is recorded", "STUN", "your phone's tag", "Blocking and reporting", "Settings → Privacy"]) assert.ok(p.includes(must), "privacy: " + must);
  const sp = legalPage("support", {}); assert.ok(sp.includes('<h2 id="report">Report a player</h2>'));
  for (const must of ["tap Block twice", "four-letter code", "never recorded", "Video or voice will not connect"]) assert.ok(txt(sp).includes(must), "support: " + must);
  assert.ok(txt(legalPage("terms", {})).includes("do not record them without their permission"));
  const a = read("docs/launch/store/answers.md");
  assert.match(a, /\| Messaging and Chat \| Yes \|/); assert.match(a, /\| User-Generated Content \| Yes \|/);
  assert.match(a, /CAMERA/); assert.match(a, /NSMicrophoneUsageDescription/); assert.match(a, /end to end/);
  // the board offers both from the camera button's menu, and Settings → Privacy lists who is blocked
  const g = read("web/game.js"), h = read("web/index.html");
  assert.ok(g.includes("blockPills(n)") && g.includes("legalLink(REPORT_PAGE) + REPORT_HASH"));
  assert.ok(h.includes('id="blockedList"') && h.includes('id="blockedNow"'));
});
