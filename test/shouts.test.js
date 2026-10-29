// Shouts: the fixed phrases a friend hears across the board, by id only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOUTS, SHOUT_GAP_MS, isShout, shoutText, shoutKnocks, mayShout } from "../web/shouts.js";
import { Rooms, RoomError } from "../server/rooms.js";

test("every shout has a unique short id, a short phrase and a knock pattern", () => {
  const ids = new Set(SHOUTS.map((s) => s.id));
  assert.equal(ids.size, SHOUTS.length);
  for (const s of SHOUTS) {
    assert.match(s.id, /^[a-z]{2,6}$/, s.id);
    assert.ok(s.text.length >= 3 && s.text.length <= 20, s.text); // fits a pill on a folded Fold
    assert.ok(s.knocks.length >= 1 && s.knocks.length <= 4 && s.knocks.every((p) => p > 0.3 && p < 2.5), s.id);
  }
  assert.ok(SHOUTS.length >= 6 && SHOUTS.length <= 10, "enough to banter, few enough to fit on one screen");
  assert.ok(isShout("oya") && !isShout("rude") && !isShout("") && !isShout(undefined));
  assert.equal(shoutText("oya"), "Oya, your move!"); assert.equal(shoutText("nope"), "");
  assert.deepEqual(shoutKnocks("chai"), [0.7]); assert.deepEqual(shoutKnocks("nope"), []);
});

test("one shout at a time per seat", () => {
  assert.equal(mayShout(undefined, 1000), true);
  assert.equal(mayShout(0, 1000), true);
  assert.equal(mayShout(1000, 1000 + SHOUT_GAP_MS - 1), false);
  assert.equal(mayShout(1000, 1000 + SHOUT_GAP_MS), true);
});

test("a room relays a shout by seat, refuses free text, flooding and an empty board", () => {
  let t = 1_000_000; const rooms = new Rooms({ now: () => t });
  const host = rooms.create({ name: "Meka" });
  assert.throws(() => rooms.shout(host.code, host.token, "oya"), (e) => e instanceof RoomError && e.code === "waiting", "nobody to hear it yet");
  const friend = rooms.join(host.code, { name: "Tete" });
  assert.deepEqual(rooms.shout(host.code, host.token, "oya"), { seat: 0, id: "oya" });
  assert.throws(() => rooms.shout(host.code, host.token, "chai"), (e) => e.code === "hush", "the host must wait a moment");
  assert.deepEqual(rooms.shout(host.code, friend.token, "chai"), { seat: 1, id: "chai" }, "the friend's seat has its own timer");
  t += SHOUT_GAP_MS;
  assert.deepEqual(rooms.shout(host.code, host.token, "well"), { seat: 0, id: "well" });
  t += SHOUT_GAP_MS;
  assert.throws(() => rooms.shout(host.code, host.token, "<script>"), (e) => e.code === "bad", "only the fixed phrases travel");
  assert.throws(() => rooms.shout(host.code, "not-a-token", "oya"), (e) => e.code === "token");
  assert.throws(() => rooms.shout("ZZZZ", host.token, "oya"), (e) => e.code === "notfound");
  assert.ok(!("shoutAt" in rooms.snapshot(host.code).players[0]), "timers never leave in a snapshot");
});
