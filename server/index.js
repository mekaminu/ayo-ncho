// Ayo & Nchò server: serves the web app and runs the online rooms (WebSockets at /ws, the same rules engine as the board).
// Protocol (JSON, one object per message):
//   client → {t:"watch", code, key, name} (family round the board: follow the game, no seat) | {t:"create", variant, rules, name} | {t:"join", code, name} | {t:"rejoin", code, token, ticket?} | {t:"let", id, in} | {t:"move", pit} | {t:"sync"} | {t:"rematch", game?} | {t:"resign"} | {t:"askback"} | {t:"backanswer", yes} | {t:"offerdraw"} | {t:"drawanswer", yes} | {t:"shout", id} | {t:"peek", pit} | {t:"call", kind, data} | {t:"ping"}
//   server → {t:"joined", code, token, seat, room} | {t:"knocked", code, id, host, hostOnline} | {t:"knock", id, name} | {t:"room", room} (presence, a knock, rematch, new game; resync:true when asked for)
//            | {t:"move", seat, pit, n, stores} | {t:"resign", seat, n} (that seat gave up) | {t:"askback", seat, n} (that seat asks to take its move back) | {t:"takeback", seat, n} (yes: that move is gone, n moves remain) | {t:"backno", seat, n} | {t:"drawoffer", seat, n} (that seat offers a draw) | {t:"draw", seat, n} (yes: the game ended level) | {t:"drawno", seat, n} | {t:"shout", seat, id} | {t:"peek", seat, pit, n} (to the other seat only: the pit the seat to move has picked, -1 put back) | {t:"error", code, msg} | {t:"pong"}
// The door: {t:"join"} does not seat anyone. It KNOCKS: the knocker gets {t:"knocked"} and waits; the host's board gets {t:"knock"} (and a
// {t:"room"} whose room.knocks lists everyone at the door, so a host who reconnects still sees them). The host answers {t:"let", id, in:true}
// and the knocker is seated ({t:"joined"}), or in:false and the knocker gets {t:"error", code:"notlet"}. A member who holds a token rejoins
// without knocking. A move travels small (see moveMessage in rooms.js): both boards run the same engine and rebuild the seeds' path themselves;
// n (moves played) and stores let a board check it agrees, and {t:"sync"} fetches the whole room when it does not.
// A call message (video and voice at the board, web/call.js) goes to the OTHER seat only, as {t:"call", seat, kind, data}: the consent
// (ask / yes / no), the WebRTC handshake (offer / answer / ice), mic and camera state, end. The picture and sound go phone to phone.
// A shout is one of the fixed phrases in web/shouts.js, sent by id to both boards (the sender's too, so it sees it went).
// Restarts: every room snapshot carries rid and sig, and move / resign / takeback carry the new sig; a board keeps them with the
// moves as its ticket (ticketOf in rooms.js) and sends it with a rejoin. A room the server has forgotten is rebuilt from it
// (see rooms.js); the secret is ROOM_SECRET.
// Family round the board: a seated player's snapshot carries `watch`, the key for a watch link (web/online.js watchLink). Whoever opens
// that link sends {t:"watch", code, key, name} and gets {t:"watching", code, id, room} — room is rooms.watchView: the game and the names,
// never a token, a seal, a tag or the door. From then on they hear every move, give-up, take-back, draw and shout the players do, and a
// {t:"room"} (a watch view) whenever who is at the board or watching changes; nothing they send can touch the game. Both boards' rooms
// list the watchers by name. Eight at most per game ({t:"error", code:"crowd"}); a wrong key is "notfound", like a room that is gone.
// /privacy, /terms and /support are the pages the stores ask for (server/legal.js).
// GET /version says which build of the game this server carries (a hash of web/ and engine/), and the page is served with the
// same hash in its <meta name="ayo-build">, so a page left open can tell a newer game is out (web/fresh.js).
// GET /vendor/three.module.min.js is the 3D library (three 0.170.0 from node_modules, the same file cdnjs serves): the page loads it
// from cdnjs, and from here on a phone that could not reach cdnjs (the start-up watch in web/index.html decides, on the phone).
// The page carries Open Graph tags written per address (server/preview.js), so a shared invite or puzzle link shows the board,
// who is asking and today's ask in WhatsApp's card.
// GET /api/rooms/:code answers the invite link: does the room exist, who is there, is a seat free.
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { Rooms, RoomError, normaliseCode, moveMessage, resignMessage, backMessage, drawMessage } from "./rooms.js";
import { mountLegal } from "./legal.js";
import { pageWithPreview } from "./preview.js";
import { compressedStatic, sendText } from "./compress.js";
import { createHash } from "node:crypto";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(__dirname, "..", "web"), ENGINE = path.join(__dirname, "..", "engine");

// The build: the first 12 hex characters of a SHA-256 over every file in web/ and engine/ (names and contents, in order),
// so it changes exactly when what a phone would load changes.
export function buildId(dirs = [WEB, ENGINE]) {
  const h = createHash("sha256");
  for (const d of dirs) for (const f of fs.readdirSync(d).sort()) {
    const p = path.join(d, f); if (!fs.statSync(p).isFile()) continue;
    h.update(path.basename(d) + "/" + f + "\0"); h.update(fs.readFileSync(p)); h.update("\0");
  }
  return h.digest("hex").slice(0, 12);
}
// index.html with the build written in (read once: the files never change under a running server)
export function pageWithBuild(html, build) { return html.replace('<meta name="ayo-build" content="dev">', `<meta name="ayo-build" content="${build}">`); }

export const THREE_FILE = path.join(__dirname, "..", "node_modules", "three", "build", "three.module.min.js");

export function createServer({ rooms = new Rooms({ secret: process.env.ROOM_SECRET }), sweepEvery = 60 * 1000, env = process.env } = {}) {
  const app = express();
  mountLegal(app, env);
  const build = buildId(), page = pageWithBuild(fs.readFileSync(path.join(WEB, "index.html"), "utf8"), build);
  app.get("/version", (_req, res) => { res.set("Cache-Control", "no-store"); res.json({ v: build }); });
  const haveLocal = fs.existsSync(THREE_FILE);
  app.get(["/", "/index.html"], (req, res) => { res.set("Cache-Control", "no-cache"); sendText(req, res, pageWithPreview(page, req, rooms)); });
  // the game's files go out squeezed (server/compress.js); images and anything not text fall through to express.static
  const three = compressedStatic(path.dirname(THREE_FILE), { file: THREE_FILE, maxAge: 7 * 24 * 3600, headers: { "Access-Control-Allow-Origin": "*" } });
  app.get("/vendor/three.module.min.js", (req, res, next) => { if (!haveLocal) return res.status(404).end(); three(req, res, next); });
  app.use("/engine", compressedStatic(ENGINE), express.static(ENGINE));
  app.use(compressedStatic(WEB), express.static(WEB));
  app.get("/healthz", (_req, res) => res.json({ ok: true, rooms: rooms.size }));
  app.get("/api/rooms/:code", (req, res) => {
    const code = normaliseCode(req.params.code);
    if (!rooms.has(code)) return res.status(404).json({ ok: false, code: "notfound", msg: "no room with that code" });
    const room = rooms.snapshot(code);
    res.json({ ok: true, code: room.code, variant: room.variant, players: room.players.map((p) => p && { seat: p.seat, name: p.name, online: p.online }), seatFree: !room.players[1], over: room.state.over });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 16 * 1024 });
  const sockets = new Map(); // room code → Set of sockets at that board
  const knockers = new Map(); // knock id → the socket waiting at the door
  const watchers = new Map(); // room code → Set of sockets following that game without a seat (family round the board)

  // what the watchers hear: the game as it is played (never the door, a peek or a call); a room message becomes their own view of it
  const WATCHED = new Set(["move", "resign", "askback", "backno", "takeback", "drawoffer", "drawno", "draw", "shout"]);
  const toWatchers = (code, msg) => {
    const set = watchers.get(code); if (!set || !set.size) return;
    let out = msg;
    if (msg.t === "room") { try { out = { t: "room", room: rooms.watchView(code), ...(msg.started ? { started: true } : {}) }; } catch { return; } }
    else if (!WATCHED.has(msg.t)) return;
    for (const s of set) send(s, out);
  };

  const send = (ws, msg) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)); };
  const broadcast = (code, msg) => { for (const s of sockets.get(code) || []) send(s, msg); toWatchers(code, msg); };
  const watchSocket = (ws, w) => {
    ws.watch = { code: w.code, id: w.id };
    if (!watchers.has(w.code)) watchers.set(w.code, new Set());
    watchers.get(w.code).add(ws);
    send(ws, { t: "watching", code: w.code, id: w.id, room: w.room });
    broadcast(w.code, { t: "room", room: rooms.snapshot(w.code) }); // both boards (and the other watchers) see who has come to watch
  };
  const leaveWatch = (ws) => {
    const { code, id } = ws.watch; ws.watch = null;
    const set = watchers.get(code); if (set) { set.delete(ws); if (!set.size) watchers.delete(code); }
    if (rooms.unwatch(code, id)) { try { broadcast(code, { t: "room", room: rooms.snapshot(code) }); } catch {} }
  };
  const seatSocket = (ws, { code, token, seat, room, upgraded }) => {
    ws.room = code; ws.token = token; ws.seat = seat; ws.knock = null;
    if (!sockets.has(code)) sockets.set(code, new Set());
    sockets.get(code).add(ws);
    send(ws, { t: "joined", code, token, seat, room });
    for (const s of sockets.get(code)) if (s !== ws) send(s, upgraded ? { t: "room", room, resync: true } : { t: "room", room }); // a newer ticket moved the game on: the other board catches up
    toWatchers(code, { t: "room" }); // the watchers see a player arrive (or come back)
  };
  // someone at the door: they wait on their own socket; the host's board hears the knock and sees the door list
  const knockSocket = (ws, k) => {
    ws.knock = { code: k.code, id: k.id }; knockers.set(k.id, ws);
    send(ws, { t: "knocked", code: k.code, id: k.id, host: k.host, ...(k.hostTag ? { hostTag: k.hostTag } : {}), hostOnline: k.hostOnline });
    broadcast(k.code, { t: "knock", id: k.id, name: k.name, ...(k.tag ? { tag: k.tag } : {}) }); // tag: the knocker's phone tag, for block (web/block.js)
    broadcast(k.code, { t: "room", room: rooms.snapshot(k.code) });
  };
  const answerDoor = (ws, m) => {
    if (!ws.room) throw new RoomError("unseated", "join a room first");
    if (m.in) {
      const id = String(m.id || ""); const guest = knockers.get(id);
      if (!guest || guest.readyState !== guest.OPEN) { rooms.withdraw(ws.room, id); knockers.delete(id); broadcast(ws.room, { t: "room", room: rooms.snapshot(ws.room) }); throw new RoomError("noknock", "they have gone from the door"); }
      const r = rooms.admit(ws.room, ws.token, id); knockers.delete(id);
      for (const x of r.turnedAway) { const s = knockers.get(x.id); knockers.delete(x.id); if (s) { s.knock = null; send(s, { t: "error", code: "taken", msg: "that room already has two players", re: "join" }); } }
      seatSocket(guest, r); // the guest is seated; the host's board gets the room with the new player
    } else {
      const r = rooms.refuse(ws.room, ws.token, String(m.id || ""));
      const guest = knockers.get(r.id); knockers.delete(r.id);
      if (guest) { guest.knock = null; send(guest, { t: "error", code: "notlet", msg: "not let in this time", re: "join" }); }
      broadcast(ws.room, { t: "room", room: rooms.snapshot(ws.room) });
    }
  };

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("message", (raw) => {
      let m; try { m = JSON.parse(String(raw)); } catch { return send(ws, { t: "error", code: "bad", msg: "not JSON" }); }
      if (!m || typeof m !== "object") return send(ws, { t: "error", code: "bad", msg: "not a message" });
      try {
        switch (m.t) {
          case "ping": return send(ws, { t: "pong" });
          case "watch": if (ws.room || ws.knock || ws.watch) throw new RoomError("seated", "already at a board"); return watchSocket(ws, rooms.watch(m.code, m.key, { name: m.name }));
          case "create": if (ws.room || ws.watch) throw new RoomError("seated", "already at a board"); return seatSocket(ws, rooms.create({ variant: m.variant, rules: m.rules && typeof m.rules === "object" ? m.rules : {}, name: m.name, tag: m.tag }));
          case "join": if (ws.room || ws.watch) throw new RoomError("seated", "already at a board"); if (ws.knock) throw new RoomError("knocking", "already at the door"); return knockSocket(ws, rooms.knock(m.code, { name: m.name, tag: m.tag }));
          case "rejoin": if (ws.room || ws.watch) throw new RoomError("seated", "already at a board"); if (ws.knock) throw new RoomError("knocking", "already at the door"); return seatSocket(ws, rooms.rejoin(m.code, m.token, m.ticket && typeof m.ticket === "object" ? m.ticket : null, m.tag));
          case "let": return answerDoor(ws, m);
          case "move": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.move(ws.room, ws.token, m.pit); return broadcast(ws.room, moveMessage(r)); }
          case "resign": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.resign(ws.room, ws.token); return broadcast(ws.room, resignMessage(r)); }
          case "askback": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.askBack(ws.room, ws.token); return broadcast(ws.room, backMessage(r)); }
          case "offerdraw": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.offerDraw(ws.room, ws.token); return broadcast(ws.room, drawMessage(r)); }
          case "drawanswer": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.answerDraw(ws.room, ws.token, !!m.yes); return broadcast(ws.room, drawMessage(r)); }
          case "backanswer": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.answerBack(ws.room, ws.token, !!m.yes); return broadcast(ws.room, backMessage(r)); }
          case "sync": { if (ws.watch && !ws.room) return send(ws, { t: "room", room: rooms.watchView(ws.watch.code), resync: true }); if (!ws.room) throw new RoomError("unseated", "join a room first"); return send(ws, { t: "room", room: rooms.snapshot(ws.room), resync: true }); }
          case "call": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.call(ws.room, ws.token, String(m.kind || ""), m.data); for (const s of sockets.get(ws.room) || []) if (s.seat === r.to) send(s, { t: "call", seat: r.seat, kind: r.kind, data: r.data }); return; }
          case "peek": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.peek(ws.room, ws.token, m.pit); for (const s of sockets.get(ws.room) || []) if (s.seat === r.to) send(s, { t: "peek", seat: r.seat, pit: r.pit, n: r.n }); return; }
          case "shout": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.shout(ws.room, ws.token, m.id); return broadcast(ws.room, { t: "shout", ...r }); }
          case "rematch": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.rematch(ws.room, ws.token, typeof m.game === "string" ? m.game : undefined); return broadcast(ws.room, { t: "room", room: r.room, started: r.started }); }
          default: return send(ws, { t: "error", code: "bad", msg: "unknown message" });
        }
      } catch (e) {
        if (e instanceof RoomError) return send(ws, { t: "error", code: e.code, msg: e.message, re: m.t });
        send(ws, { t: "error", code: "server", msg: "something went wrong", re: m.t });
      }
    });
    ws.on("close", () => {
      if (ws.knock) { // gone from the door: the host's list shrinks
        const { code, id } = ws.knock; ws.knock = null; knockers.delete(id);
        if (rooms.withdraw(code, id)) { try { broadcast(code, { t: "room", room: rooms.snapshot(code) }); } catch {} }
      }
      if (ws.watch) leaveWatch(ws);
      if (!ws.room) return;
      const set = sockets.get(ws.room); if (set) { set.delete(ws); if (!set.size) sockets.delete(ws.room); }
      if (rooms.has(ws.room) && rooms.setOnline(ws.room, ws.token, false) !== null) {
        try { broadcast(ws.room, { t: "room", room: rooms.snapshot(ws.room) }); } catch {}
      }
    });
  });

  // keepalive: a phone that vanished without closing is dropped after two missed pings; stale rooms are swept
  const timer = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch {} }
    for (const code of rooms.sweep()) {
      for (const s of sockets.get(code) || []) send(s, { t: "error", code: "swept", msg: "the room has closed" }); sockets.delete(code);
      for (const s of watchers.get(code) || []) { s.watch = null; send(s, { t: "error", code: "swept", msg: "the room has closed", re: "watch" }); } watchers.delete(code);
      for (const [id, s] of knockers) if (s.knock && s.knock.code === code) { s.knock = null; knockers.delete(id); send(s, { t: "error", code: "swept", msg: "the room has closed", re: "join" }); }
    }
  }, sweepEvery);
  timer.unref();

  const close = () => new Promise((res) => { clearInterval(timer); for (const ws of wss.clients) ws.terminate(); wss.close(() => server.close(() => res())); });
  return { app, server, wss, rooms, close, build };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  if (!process.env.ROOM_SECRET) console.warn("ROOM_SECRET is not set: online games will not survive a restart of this server");
  createServer().server.listen(port, () => console.log(`ayo-ncho listening on ${port}`));
}
