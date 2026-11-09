#!/usr/bin/env node
// A busy Sunday night (idea 9 Nov, evening): how many families' games with friends the game's server holds at once.
//
// Every game with a friend is played on the one server (Render's free plan: a tenth of a CPU and 512 MB), and nothing so far had
// put more than a handful of games on it together. This starts the real server in its own process (node server/index.js, so its
// CPU and memory are its own and can be read from /proc) and opens many rooms at once, each a family of two from two addresses:
// the host opens a room, the friend knocks, is let in, and they play a whole game through, the first tap (a peek) and the second
// (the move) for every turn, each side keeping its own engine and checking every move the server sends against it.
//
//   1. Brisk: every room moves every 0.15 s, the quickest a board may (the pace in server/guard.js). What it costs the server per move (CPU time, the move and the
//      peek and both boards hearing it) is read from the server process's own clock.
//   2. At the table's pace: the same number of rooms, each moving every --pace ms (a person takes a few seconds), and the time from
//      a move sent to the other board hearing it is measured (p50 / p95 / worst).
//   3. Memory: the server's RSS before any room, with every room open, and after all the finished games are held (they are kept
//      until the sweep, 6 hours) — so the cost of one room is known.
// From these: how many games at once the free plan's tenth of a CPU holds at a person's pace with half of it to spare, and how many
// rooms its 512 MB holds. node tools/busy-night.js [--rooms 200] [--pace 1500] [--json]; test/busy.test.js runs a small night.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { newGame, applyMove, legalMoves } from "../engine/ayo.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FREE_PLAN = Object.freeze({ cpu: 0.1, memoryMb: 512 }); // Render's free web service
export const TABLE_PACE_S = 4; // a person at the board takes about four seconds a move (two of them: a move every 4 s in a room)

// The family's two addresses: different houses, so the per-address caps (server/guard.js) see what they would on a real night.
export const addressFor = (room, seat) => `10.${(room >> 8) & 255}.${room & 255}.${seat + 1}`;

// The free plan's sums. cpuPerMoveMs: server CPU time per move (with its peek and both boards told); bytesPerRoom: memory a room takes.
export function capacity({ cpuPerMoveMs, bytesPerRoom, baseMb, plan = FREE_PLAN, paceS = TABLE_PACE_S, headroom = 0.5 }) {
  const movesPerRoomPerS = 1 / paceS;
  const cpuShare = plan.cpu * headroom; // seconds of CPU per second we let the games use
  const byCpu = cpuPerMoveMs > 0 ? Math.floor(cpuShare / ((cpuPerMoveMs / 1000) * movesPerRoomPerS)) : Infinity;
  const freeBytes = (plan.memoryMb * headroom - baseMb) * 1024 * 1024;
  const byMemory = bytesPerRoom > 0 ? Math.max(0, Math.floor(freeBytes / bytesPerRoom)) : Infinity;
  return { byCpu, byMemory, games: Math.min(byCpu, byMemory) };
}

export function percentile(xs, p) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}

// The server process's own clock and memory, from /proc (Linux: the container and the CI runner).
const TICK = 100; // USER_HZ on Linux
export function procStats(pid) {
  const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
  const f = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
  const cpuMs = ((Number(f[11]) + Number(f[12])) * 1000) / TICK; // utime + stime
  const rss = /VmRSS:\s+(\d+) kB/.exec(fs.readFileSync(`/proc/${pid}/status`, "utf8"));
  return { cpuMs, rssBytes: rss ? Number(rss[1]) * 1024 : NaN };
}

const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); }); });

export async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ["--expose-gc", path.join(ROOT, "server", "index.js")], { env: { ...process.env, PORT: String(port), ROOM_SECRET: "busy-night-only" }, stdio: ["ignore", "pipe", "pipe"] });
  let err = ""; child.stderr.on("data", (d) => { err += d; });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("the server did not start: " + err)), 15000);
    child.stdout.on("data", (d) => { if (String(d).includes("listening")) { clearTimeout(t); res(); } });
    child.on("exit", (c) => { clearTimeout(t); rej(new Error(`the server stopped (${c}): ${err}`)); });
  });
  return { port, pid: child.pid, child, stop: () => new Promise((r) => { child.once("exit", r); child.kill("SIGKILL"); }) };
}

// A board on the line: messages queue until asked for.
function board(port, from) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers: { "x-forwarded-for": from } });
  const queue = [], waiters = [], errors = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(String(raw)); m.at = performance.now();
    if (m.t === "error") errors.push(m);
    const i = waiters.findIndex((w) => w.t === m.t); if (i >= 0) waiters.splice(i, 1)[0].res(m); else queue.push(m);
  });
  const next = (t, ms = 30000) => new Promise((res, rej) => {
    const i = queue.findIndex((m) => m.t === t); if (i >= 0) return res(queue.splice(i, 1)[0]);
    const w = { t, res }; waiters.push(w); const why = () => errors.length ? ` (the server said: ${errors.slice(-2).map((e) => e.code + " " + e.msg + " re " + e.re).join("; ")})` : "";
    setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); rej(new Error(`no "${t}" within ${ms} ms${why()}`)); } }, ms).unref();
  });
  const open = new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });
  const closed = new Promise((r) => ws.once("close", r));
  return { ws, next, open, errors, send: (m) => ws.send(JSON.stringify(m)), close: () => { ws.close(); return closed; } };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One family: open, knock, let in. Returns the two boards and the room code.
async function seatFamily(port, i, variant) {
  const a = board(port, addressFor(i, 0)), b = board(port, addressFor(i, 1));
  await Promise.all([a.open, b.open]);
  a.send({ t: "create", variant, name: `Host ${i}` }); const ja = await a.next("joined");
  b.send({ t: "join", code: ja.code, name: `Friend ${i}` }); const kb = await b.next("knocked");
  a.send({ t: "let", id: kb.id, in: true }); await b.next("joined");
  return { a, b, code: ja.code };
}

// Brisk: the quickest a board can go without tripping a connection's pace (server/guard.js: 20 messages a second; a turn is a peek
// and a move) — far quicker than any person, so the server's cost per move is measured with every room busy at once.
export const BRISK_MS = 150;

// Play one whole game in a seated room from its first position (a rematch: whoever starts), a move every paceMs (half to one and a
// half times it) or brisk. Every move the server sends both boards is checked against our own engine. Returns the moves played.
async function playGame(fam, { start, paceMs, seed, lat, limit = 400 }) {
  let state = newGame(start.variant, start.rules, start.turn), r = seed >>> 0, moves = 0;
  const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 2 ** 32; };
  while (!state.over && moves < limit) {
    await sleep(paceMs ? paceMs * (0.5 + rnd()) : BRISK_MS);
    const me = state.turn === 0 ? fam.a : fam.b, them = state.turn === 0 ? fam.b : fam.a;
    const legal = legalMoves(state), pit = legal[Math.floor(rnd() * legal.length)];
    const sent = performance.now();
    me.send({ t: "peek", pit }); me.send({ t: "move", pit });
    const [mine, theirs] = await Promise.all([me.next("move"), them.next("move")]);
    lat.push(theirs.at - sent);
    state = applyMove(state, pit).state; moves += 1;
    for (const m of [mine, theirs]) if (m.pit !== pit || m.n !== state.moves.length || m.stores.join() !== state.stores.join()) throw new Error(`room ${fam.code}: the server's move ${JSON.stringify(m)} does not match the board's`);
  }
  if (!state.over) throw new Error(`room ${fam.code}: the game did not end in ${limit} moves`);
  return moves;
}

async function getJSON(port, p) { const r = await fetch(`http://127.0.0.1:${port}${p}`); return r.json(); }

// A busy night. rooms: families at once; paceMs: the table's pace in phase 2 (0 skips it). Returns the measures.
export async function busyNight({ rooms = 200, paceMs = 1500, variant = "ncho", log = () => {} } = {}) {
  const srv = await startServer();
  try {
    await sleep(300);
    const base = procStats(srv.pid);
    // phase 1: brisk
    log(`seating ${rooms} families…`);
    let fams = [];
    for (let i = 0; i < rooms; i += 50) fams.push(...(await Promise.all(Array.from({ length: Math.min(50, rooms - i) }, (_, k) => seatFamily(srv.port, i + k, variant)))));
    const seated = procStats(srv.pid);
    log(`playing ${rooms} games, brisk…`);
    const fastLat = [], t0 = performance.now(), c0 = procStats(srv.pid).cpuMs;
    const fast = await Promise.all(fams.map((f, i) => playGame(f, { start: newGame(variant, {}, 0), seed: i + 1, lat: fastLat })));
    const fastS = (performance.now() - t0) / 1000, cpuFast = procStats(srv.pid).cpuMs - c0;
    const fastMoves = fast.reduce((s, g) => s + g, 0);
    // the server's own count of rooms, and one room's snapshot agreeing with the game played
    const health = await getJSON(srv.port, "/healthz");
    // phase 2: rematch everywhere and play at the table's pace
    let pace = null;
    if (paceMs > 0) {
      log(`rematch, then ${rooms} games at a move every ~${paceMs} ms…`);
      await Promise.all(fams.map(async (f) => { f.a.send({ t: "rematch" }); f.b.send({ t: "rematch" }); await f.a.next("room"); }));
      // the loser starts a rematch: wait until each room's new game has begun, then play it from its own first mover
      const lat = [], c1 = procStats(srv.pid).cpuMs, t1 = performance.now();
      const games = await Promise.all(fams.map(async (f, i) => {
        f.a.send({ t: "sync" }); let room; do { room = (await f.a.next("room")).room; } while (!room || room.games < 1 || room.state.moves.length !== 0 || room.state.over); // the room messages from the first game are still queued
        return playGame(f, { start: { variant: room.variant, rules: room.state.rules, turn: room.state.turn }, paceMs, seed: 1000 + i, lat });
      }));
      const s = (performance.now() - t1) / 1000, cpu = procStats(srv.pid).cpuMs - c1, moves = games.reduce((x, g) => x + g, 0);
      pace = { seconds: s, moves, cpuMs: cpu, cpuShare: cpu / 1000 / s, p50: percentile(lat, 50), p95: percentile(lat, 95), worst: Math.max(...lat) };
    }
    const full = procStats(srv.pid);
    const errors = fams.flatMap((f) => [...f.a.errors, ...f.b.errors]);
    await Promise.all(fams.flatMap((f) => [f.a.close(), f.b.close()]));
    await sleep(500);
    const held = procStats(srv.pid);
    const bytesPerRoom = Math.max(0, (held.rssBytes - base.rssBytes) / rooms);
    // the dearer of the two: brisk spreads the server's fixed costs (timers, pings) over many moves; the table's pace counts them
    const cpuPerMoveMs = Math.max(cpuFast / fastMoves, pace ? pace.cpuMs / pace.moves : 0);
    return {
      rooms, variant, games: fast.length, moves: fastMoves, errors: errors.length, errorSample: errors.slice(0, 3), serverRooms: health.rooms,
      brisk: { seconds: fastS, movesPerS: fastMoves / fastS, cpuMs: cpuFast, cpuPerMoveMs: cpuFast / fastMoves, p50: percentile(fastLat, 50), p95: percentile(fastLat, 95) },
      pace, cpuPerMoveMs,
      memory: { baseMb: base.rssBytes / 2 ** 20, seatedMb: seated.rssBytes / 2 ** 20, fullMb: full.rssBytes / 2 ** 20, heldMb: held.rssBytes / 2 ** 20, bytesPerRoom },
      freePlan: capacity({ cpuPerMoveMs, bytesPerRoom, baseMb: base.rssBytes / 2 ** 20 }),
    };
  } finally { await srv.stop(); }
}

export function report(n) {
  const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "—");
  const lines = [
    `A busy night: ${n.rooms} games with friends at once (${n.variant}), ${n.moves} moves brisk, ${n.errors} errors, the server counted ${n.serverRooms} rooms`,
    `  brisk (a move every ${BRISK_MS / 1000} s in every room): ${f(n.brisk.seconds)} s, ${f(n.brisk.movesPerS, 0)} moves a second, ${f(n.brisk.cpuPerMoveMs, 3)} ms of server CPU a move (with its peek, both boards told); heard in p50 ${f(n.brisk.p50)} ms, p95 ${f(n.brisk.p95)} ms`,
  ];
  if (n.pace) lines.push(`  at the table's pace: ${n.pace.moves} moves in ${f(n.pace.seconds)} s, the server busy ${f(n.pace.cpuShare * 100)}% of one CPU (${f(n.pace.cpuMs / n.pace.moves, 3)} ms a move); the other board heard each move in p50 ${f(n.pace.p50)} ms, p95 ${f(n.pace.p95)} ms, worst ${f(n.pace.worst)} ms`);
  lines.push(`  memory: ${f(n.memory.baseMb)} MB at start, ${f(n.memory.seatedMb)} MB seated, ${f(n.memory.fullMb)} MB with every game played, ${f(n.memory.heldMb)} MB held after the boards left — about ${f(n.memory.bytesPerRoom / 1024)} KB a room`);
  lines.push(`  the free plan (a tenth of a CPU, 512 MB, half kept spare, a move every ${TABLE_PACE_S} s, ${f(n.cpuPerMoveMs, 3)} ms a move): about ${n.freePlan.byCpu} games at once by CPU, ${n.freePlan.byMemory} rooms by memory — ${n.freePlan.games} families`);
  return lines.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const n = await busyNight({ rooms: Number(arg("--rooms", 200)), paceMs: Number(arg("--pace", 1500)), variant: arg("--variant", "ncho"), log: (s) => console.error(s) });
  console.log(process.argv.includes("--json") ? JSON.stringify(n, null, 2) : report(n));
  if (n.errors) process.exitCode = 1;
}
