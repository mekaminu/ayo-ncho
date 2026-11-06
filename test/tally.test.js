// The score at the table (web/tally.js): each room's results by seat, counted once per game, read from either seat, and in French.
import test from "node:test";
import assert from "node:assert/strict";
import { parse, record, roomKey, entryOf, cardLine, startLine, standingParts, wentUp, played, MAX_ROOMS } from "../web/tally.js";
import { translate } from "../web/i18n.js";
import { Rooms } from "../server/rooms.js";
import { legalMoves } from "../engine/ayo.js";

test("counts each game of a room once, by seat", () => {
  let d = parse(null); const k = roomKey("EDNE", "r1");
  let r = record(d, k, 0, 0); d = r.data; assert.equal(r.counted, true); assert.deepEqual(r.before, { w: [0, 0], d: 0 });
  r = record(d, k, 0, 0); d = r.data; assert.equal(r.counted, false, "the same game again (a reload, a rejoin) is not counted again");
  r = record(d, k, 1, 1); d = r.data; r = record(d, k, 2, "draw"); d = r.data; r = record(d, k, 3, 0); d = r.data;
  assert.deepEqual(entryOf(d, k).w, [2, 1]); assert.equal(entryOf(d, k).d, 1); assert.equal(played(entryOf(d, k)), 4);
  assert.deepEqual(parse(JSON.stringify(d)), d, "survives storage");
  assert.equal(record(d, k, 4, undefined).counted, false); assert.equal(record(d, null, 4, 0).counted, false);
});

test("the words from either seat", () => {
  const e = { w: [2, 1], d: 1, seen: [], at: 0 };
  assert.equal(cardLine(e, 0, "Tete"), "you lead 2–1 · 1 drawn · 4 games at this board");
  assert.equal(cardLine(e, 1, "Meka"), "Meka leads 2–1 · 1 drawn · 4 games at this board");
  assert.equal(startLine(e, 0, "Tete"), "game 5 · you lead 2–1 · 1 drawn");
  assert.equal(cardLine({ w: [0, 1], d: 0, seen: [], at: 0 }, 1, "Tete"), "you lead 1–0 · 1 game at this board");
  assert.equal(cardLine({ w: [1, 1], d: 2, seen: [], at: 0 }, 0, "Tete"), "level 1–1 · 2 drawn · 4 games at this board");
  assert.equal(cardLine({ w: [0, 0], d: 0, seen: [], at: 0 }, 0, "Tete"), ""); assert.equal(startLine({ w: [0, 0], d: 0, seen: [], at: 0 }, 0, "Tete"), "");
  assert.deepEqual(standingParts({ w: [3, 0], d: 0 }, 1, "Ada"), ["Ada leads 3–0"]);
});

test("which number went up", () => {
  const b = { w: [1, 1], d: 0 };
  assert.equal(wentUp(b, { w: [2, 1], d: 0 }, 0), "mine"); assert.equal(wentUp(b, { w: [2, 1], d: 0 }, 1), "theirs");
  assert.equal(wentUp(b, { w: [1, 1], d: 1 }, 0), "draw"); assert.equal(wentUp(null, { w: [2, 1], d: 0 }, 0), null);
});

test("keeps only the last few rooms", () => {
  let d = parse(null);
  for (let i = 0; i < MAX_ROOMS + 3; i++) d = record(d, roomKey("ROOM", "r" + i), 0, 0, 1000 + i).data;
  assert.equal(Object.keys(d.rooms).length, MAX_ROOMS); assert.ok(d.rooms["ROOM:r" + (MAX_ROOMS + 2)]); assert.ok(!d.rooms["ROOM:r0"]);
  assert.deepEqual(parse("not json"), { rooms: {} }); assert.deepEqual(parse('{"rooms":{"a":{"w":[-1,"x"],"d":2.5}}}').rooms.a.w, [0, 0]);
});

test("in French", () => {
  assert.equal(translate("you lead 2–1 · 1 drawn · 4 games at this board", "fr"), "vous menez 2–1 · 1 nulle · 4 parties à ce plateau");
  assert.equal(translate("Tete leads 2–1 · 3 drawn · 1 game at this board", "fr"), "Tete mène 2–1 · 3 nulles · 1 partie à ce plateau");
  assert.equal(translate("level 1–1", "fr"), "égalité 1–1");
  assert.equal(translate("Game 3 · you lead 2–0 — your move", "fr"), "Partie 3 · vous menez 2–0 — à vous");
  assert.equal(translate("Game 2 · Tete leads 1–0 — Tete starts", "fr"), "Partie 2 · Tete mène 1–0 — Tete commence");
});

// Both boards count the room's games from what the server says, so they always agree: play several games in a real room
// (random moves, rematches) and count each finished game from both seats.
test("both seats agree over a room's games", () => {
  const rooms = new Rooms({ secret: "t" }); const { code, token: t0 } = rooms.create({ name: "Meka", variant: "ncho" });
  const k = rooms.knock(code, { name: "Tete" }); const { token: t1 } = rooms.admit(code, t0, k.id);
  const tok = [t0, t1]; let boards = [parse(null), parse(null)]; let rnd = 7; const next = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
  const truth = { w: [0, 0], d: 0 };
  for (let g = 0; g < 5; g++) {
    let snap = rooms.snapshot(code);
    while (!snap.state.over) { const s = snap.state; const legal = legalMoves(s); rooms.move(code, tok[s.turn], legal[Math.floor(next() * legal.length)]); snap = rooms.snapshot(code); }
    const w = snap.state.winner; if (w === "draw") truth.d++; else truth.w[w]++;
    boards = boards.map((b) => { let r = record(b, roomKey(snap.code, snap.rid), snap.games, w); r = record(r.data, roomKey(snap.code, snap.rid), snap.games, w); return r.data; });
    rooms.rematch(code, t0); rooms.rematch(code, t1);
  }
  const key = roomKey(code, rooms.snapshot(code).rid);
  for (const b of boards) { assert.deepEqual(entryOf(b, key).w, truth.w); assert.equal(entryOf(b, key).d, truth.d); }
  const [a, b] = [cardLine(entryOf(boards[0], key), 0, "Tete"), cardLine(entryOf(boards[1], key), 1, "Meka")];
  assert.match(a, /5 games at this board$/); assert.match(b, /5 games at this board$/);
});
