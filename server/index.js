// Ayo & Nchò server: serves the web app and runs the online rooms (WebSockets at /ws, the same rules engine as the board).
// Protocol (JSON, one object per message):
//   client → {t:"create", variant, rules, name} | {t:"join", code, name} | {t:"rejoin", code, token} | {t:"move", pit} | {t:"rematch"} | {t:"shout", id} | {t:"ping"}
//   server → {t:"joined", code, token, seat, room} | {t:"room", room} (presence, rematch, new game) | {t:"move", seat, pit, events, state} | {t:"shout", seat, id} | {t:"error", code, msg} | {t:"pong"}
// A shout is one of the fixed phrases in web/shouts.js, sent by id to both boards (the sender's too, so it sees it went).
// GET /api/rooms/:code answers the invite link: does the room exist, who is there, is a seat free.
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { Rooms, RoomError, normaliseCode } from "./rooms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createServer({ rooms = new Rooms(), sweepEvery = 60 * 1000 } = {}) {
  const app = express();
  app.use("/engine", express.static(path.join(__dirname, "..", "engine")));
  app.use(express.static(path.join(__dirname, "..", "web")));
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

  const send = (ws, msg) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)); };
  const broadcast = (code, msg) => { for (const s of sockets.get(code) || []) send(s, msg); };
  const seatSocket = (ws, { code, token, seat, room }) => {
    ws.room = code; ws.token = token; ws.seat = seat;
    if (!sockets.has(code)) sockets.set(code, new Set());
    sockets.get(code).add(ws);
    send(ws, { t: "joined", code, token, seat, room });
    for (const s of sockets.get(code)) if (s !== ws) send(s, { t: "room", room });
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
          case "create": if (ws.room) throw new RoomError("seated", "already at a board"); return seatSocket(ws, rooms.create({ variant: m.variant, rules: m.rules && typeof m.rules === "object" ? m.rules : {}, name: m.name }));
          case "join": if (ws.room) throw new RoomError("seated", "already at a board"); return seatSocket(ws, rooms.join(m.code, { name: m.name }));
          case "rejoin": if (ws.room) throw new RoomError("seated", "already at a board"); return seatSocket(ws, rooms.rejoin(m.code, m.token));
          case "move": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.move(ws.room, ws.token, m.pit); return broadcast(ws.room, { t: "move", ...r }); }
          case "shout": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.shout(ws.room, ws.token, m.id); return broadcast(ws.room, { t: "shout", ...r }); }
          case "rematch": { if (!ws.room) throw new RoomError("unseated", "join a room first"); const r = rooms.rematch(ws.room, ws.token); return broadcast(ws.room, { t: "room", room: r.room, started: r.started }); }
          default: return send(ws, { t: "error", code: "bad", msg: "unknown message" });
        }
      } catch (e) {
        if (e instanceof RoomError) return send(ws, { t: "error", code: e.code, msg: e.message, re: m.t });
        send(ws, { t: "error", code: "server", msg: "something went wrong", re: m.t });
      }
    });
    ws.on("close", () => {
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
    for (const code of rooms.sweep()) { for (const s of sockets.get(code) || []) send(s, { t: "error", code: "swept", msg: "the room has closed" }); sockets.delete(code); }
  }, sweepEvery);
  timer.unref();

  const close = () => new Promise((res) => { clearInterval(timer); for (const ws of wss.clients) ws.terminate(); wss.close(() => server.close(() => res())); });
  return { app, server, wss, rooms, close };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  createServer().server.listen(port, () => console.log(`ayo-ncho listening on ${port}`));
}
