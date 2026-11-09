// Nothing odd over the line breaks a game: throws thousands of malformed and hostile messages at a real server, at every
// stage of a room (no room yet, at the door, seated before the friend comes, mid-game, after the game, watching), and checks
// after every burst that the server still answers, that no message reached an unexpected error ("something went wrong"),
// and that every room still holds a real game: 48 seeds, a known game, known rule switches, names that are short text.
// Then a real game is played to the end in the same room. Used by test/fuzz.test.js (a short run) and by hand:
//   node tools/fuzz-protocol.js [rounds=40] [seed=1]
import WebSocket from "ws";
import { createServer } from "../server/index.js";
import { legalMoves, VARIANTS, RULES, totalSeeds, TOTAL_SEEDS } from "../engine/ayo.js";

// a small seeded random, so a failure can be run again exactly
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const ODD = [
  null, undefined, true, false, 0, -1, 1, 5, 6, 11, 12, 13, 1.5, -0, 1e308, -1e308, 2 ** 53, NaN, "", " ", "0", "6", "x", "ABCD",
  "abcd", "ZZZZ", "constructor", "__proto__", "toString", "hasOwnProperty", "prototype", "valueOf", "ncho", "ayo", "ncho ",
  "NCHO", "x".repeat(3000), "\u0000", "\ud800", "<script>alert(1)</script>", "‮evil", "😀".repeat(40), [], [1, 2], [6], {}, { a: 1 },
  { __proto__: { polluted: 1 } }, { toString: 1 }, { capture: 4 }, { length: 99 },
];
const TYPES = ["ping", "watch", "create", "join", "rejoin", "let", "move", "resign", "askback", "offerdraw", "drawanswer", "backanswer", "sync", "call", "peek", "shout", "rematch", "nope", "", "__proto__", "constructor", "toString"];
const FIELDS = ["t", "code", "key", "name", "tag", "variant", "rules", "token", "ticket", "id", "in", "pit", "yes", "kind", "data", "game"];
const RULE_KEYS = ["capture", "relay", "last8", "__proto__", "constructor", "toString", "seeds", "pits", "x"];

export function oddMessage(r, known = {}) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const m = {};
  m.t = r() < 0.9 ? pick(TYPES) : pick(ODD);
  for (const f of FIELDS.slice(1)) if (r() < 0.35) m[f] = r() < 0.4 && known[f] !== undefined ? known[f] : pick(ODD);
  if (r() < 0.3) { const rules = {}; for (let i = 0; i < 1 + r() * 4; i++) rules[pick(RULE_KEYS)] = pick(ODD); m.rules = rules; }
  if (r() < 0.15) m.ticket = { sig: "x".repeat(12), rid: "abcdefghij", variant: pick(["ncho", "ayo", "constructor", "__proto__"]), rules: {}, games: 0, first: 0, names: ["a", null], moves: [0, 6] };
  let text = JSON.stringify(m);
  if (r() < 0.1) text = text.replace(/^\{/, '{"__proto__":{"polluted":1},'); // a raw __proto__ key, as a script could write it
  if (r() < 0.05) text = pick(["null", "1", "\"x\"", "[]", "[{}]", "{", "{\"t\":", "true", "".padEnd(200, "{")]);
  return text;
}

// a tiny client: send raw text or JSON, keep every message, await one of a type
export function client(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const all = []; const queue = []; const waiters = [];
  ws.on("message", (raw) => { const m = JSON.parse(String(raw)); all.push(m); const w = waiters.findIndex((x) => x.t === m.t); if (w >= 0) waiters.splice(w, 1)[0].res(m); else queue.push(m); });
  const next = (t, ms = 4000) => new Promise((res, rej) => {
    const i = queue.findIndex((m) => m.t === t); if (i >= 0) return res(queue.splice(i, 1)[0]);
    const w = { t, res }; waiters.push(w); setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); rej(new Error(`no "${t}" within ${ms} ms`)); } }, ms);
  });
  const open = new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  const closed = new Promise((res) => ws.on("close", (code) => res(code)));
  return { ws, all, next, open, closed, send: (m) => ws.send(typeof m === "string" ? m : JSON.stringify(m)), drain() { queue.length = 0; },
    close() { ws.close(); return closed; } };
}

// a room still holds a real game?
export function roomProblems(room) {
  const out = [];
  if (!VARIANTS.includes(room.variant)) out.push(`variant ${JSON.stringify(room.variant)}`);
  const keys = Object.keys(room.rules || {});
  if (keys.some((k) => !["capture", "relay", "last8"].includes(k))) out.push(`rule switches ${JSON.stringify(keys)}`);
  if (![4, 23].includes(room.rules.capture) || typeof room.rules.relay !== "boolean" || typeof room.rules.last8 !== "boolean") out.push(`rules ${JSON.stringify(room.rules)}`);
  if (Object.getPrototypeOf(room.rules) !== Object.prototype) out.push("rules prototype");
  const g = room.game;
  if (!VARIANTS.includes(g.variant) || totalSeeds(g) !== TOTAL_SEEDS) out.push(`game ${g.variant} with ${totalSeeds(g)} seeds`);
  if (JSON.stringify(g.rules) !== JSON.stringify(room.rules)) out.push("game rules differ from the room's");
  for (const s of room.seats) if (s && (typeof s.name !== "string" || !s.name || s.name.length > 24)) out.push(`seat name ${JSON.stringify(s.name)}`);
  for (const k of room.knocks) if (typeof k.name !== "string" || k.name.length > 24) out.push(`knock name ${JSON.stringify(k.name)}`);
  for (const w of room.watchers) if (typeof w.name !== "string" || w.name.length > 24) out.push(`watcher name ${JSON.stringify(w.name)}`);
  if (!Number.isInteger(room.games) || room.games < 0) out.push(`games ${room.games}`);
  return out;
}

const STAGES = ["stranger", "door", "alone", "midgame", "over", "watching"];

export async function fuzz({ rounds = 40, seed = 1, perBurst = 60, sweep = true, log = () => {} } = {}) {
  const r = rng(seed);
  const srv = createServer({ sweepEvery: 60_000, guard: { burst: 1e6, perSecond: 1e6, closeAfter: 1e9, perAddress: 1e6, roomsPerAddress: 1e6, knocksPerAddress: 1e6 } });
  await new Promise((res) => srv.server.listen(0, "127.0.0.1", res));
  const port = srv.server.address().port;
  const problems = []; const unexpected = []; let sent = 0;
  const watchProto = () => ({}.polluted !== undefined || Object.prototype.polluted !== undefined);
  try {
    for (let round = 0; round < rounds; round++) {
      const stage = STAGES[round % STAGES.length];
      // set up a real room at this stage
      const host = client(port), friend = client(port), odd = client(port); await host.open; await friend.open; await odd.open;
      const variant = r() < 0.5 ? "ncho" : "ayo";
      host.send({ t: "create", variant, name: "Meka" }); const joined = await host.next("joined");
      const known = { code: joined.code, token: joined.token, variant, name: "Tete", pit: 0 };
      let fToken = null;
      if (stage !== "stranger" && stage !== "alone") {
        friend.send({ t: "join", code: joined.code, name: "Tete" }); const k = await friend.next("knocked"); known.id = k.id;
        if (stage !== "door") { host.send({ t: "let", id: k.id, in: true }); fToken = (await friend.next("joined")).token; }
      }
      if (stage === "midgame" || stage === "over") {
        const seats = [host, friend]; const live = () => srv.rooms.rooms.get(joined.code).game;
        for (let i = 0; i < (stage === "over" ? 400 : 6) && !live().over; i++) {
          const g = live(); const pit = legalMoves(g)[Math.floor(r() * legalMoves(g).length)];
          seats[g.turn].send({ t: "move", pit }); await seats[g.turn].next("move"); await seats[1 - g.turn].next("move");
        }
      }
      if (stage === "watching") {
        const snap = srv.rooms.rooms.get(joined.code); known.key = srv.rooms.watchKey ? srv.rooms.watchKey(snap.code, snap.rid) : undefined;
      }
      // the odd one: a stranger, or the friend's own seat (a modified page), or the host's
      const actors = stage === "stranger" ? [odd] : [odd, friend, host];
      for (const a of actors) {
        for (let i = 0; i < perBurst; i++) { a.send(oddMessage(r, { ...known, token: a === friend ? fToken : known.token })); sent++; }
      }
      // still answering?
      for (const a of actors) { if (a.ws.readyState !== WebSocket.OPEN) continue; a.send({ t: "ping" }); await a.next("pong").catch((e) => problems.push(`round ${round} (${stage}): ${e.message}`)); }
      for (const a of [host, friend, odd]) for (const m of a.all) if (m.t === "error" && m.code === "server") unexpected.push(`${stage}: ${m.re}`);
      for (const [code, room] of srv.rooms.rooms) for (const p of roomProblems(room)) problems.push(`round ${round} (${stage}) room ${code}: ${p}`);
      if (watchProto()) problems.push(`round ${round} (${stage}): Object.prototype was polluted`);
      await Promise.all([host.close(), friend.close(), odd.close()]);
      log(`round ${round} ${stage}: ${sent} sent, ${problems.length} problems, ${unexpected.length} unexpected errors`);
    }
    // every message type with every field set to every odd value, one at a time, from a seated friend mid-game and from a stranger
    if (sweep) {
      const host = client(port), friend = client(port), odd = client(port); await host.open; await friend.open; await odd.open;
      host.send({ t: "create", variant: "ncho", name: "Meka" }); const joined = await host.next("joined");
      friend.send({ t: "join", code: joined.code, name: "Tete" }); const k = await friend.next("knocked");
      host.send({ t: "let", id: k.id, in: true }); await friend.next("joined");
      host.send({ t: "move", pit: 2 }); await host.next("move");
      for (const t of TYPES) {
        if (t === "resign" || t === "rematch") continue; // these end the game on purpose; the random rounds cover them
        for (const f of FIELDS.slice(1)) for (const v of ODD) {
          const text = JSON.stringify({ t, code: joined.code, [f]: v }); friend.send(text); odd.send(text); sent += 2;
        }
        for (const a of [friend, odd]) { a.send({ t: "ping" }); await a.next("pong").catch((e) => problems.push(`sweep ${t}: ${e.message}`)); a.drain(); }
      }
      for (const a of [host, friend, odd]) for (const m of a.all) if (m.t === "error" && m.code === "server") unexpected.push(`sweep: ${m.re}`);
      for (const [code, room] of srv.rooms.rooms) for (const p of roomProblems(room)) problems.push(`sweep room ${code}: ${p}`);
      await Promise.all([host.close(), friend.close(), odd.close()]);
      log(`sweep: ${sent} sent, ${problems.length} problems, ${unexpected.length} unexpected errors`);
    }
    // afterwards a real game still plays to the end
    const a = client(port), b = client(port); await a.open; await b.open;
    a.send({ t: "create", variant: "ncho", name: "Meka" }); const ja = await a.next("joined");
    b.send({ t: "join", code: ja.code, name: "Tete" }); const kb = await b.next("knocked"); a.send({ t: "let", id: kb.id, in: true }); await b.next("joined");
    const seats = [a, b]; let moves = 0; const live = () => srv.rooms.rooms.get(ja.code).game;
    while (!live().over && moves < 400) { const g = live(); seats[g.turn].send({ t: "move", pit: legalMoves(g)[0] }); await seats[g.turn].next("move"); await seats[1 - g.turn].next("move"); moves++; }
    if (!live().over) problems.push("the real game afterwards did not finish");
    await Promise.all([a.close(), b.close()]);
    return { sent, problems, unexpected: [...new Set(unexpected)], played: moves };
  } finally { srv.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [rounds = 40, seed = 1] = process.argv.slice(2).map(Number);
  const res = await fuzz({ rounds, seed, log: (l) => console.log(l) });
  console.log(JSON.stringify({ sent: res.sent, played: res.played, problems: res.problems.slice(0, 40), unexpected: res.unexpected }, null, 1));
  process.exit(res.problems.length || res.unexpected.length ? 1 : 0);
}
