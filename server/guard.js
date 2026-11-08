// One bad visitor can't spoil the evening (idea 8 Nov, night): the game's server is public, on the free plan, and every family's
// games with friends share it. Before the stores, it holds against a script (or a stuck phone) that floods it:
//  - each connection has a pace (a token bucket): a burst of 60 messages, then 20 a second. A phone playing, peeking, shouting and
//    setting up a call never comes near it (the call's ICE candidates are the biggest burst, a dozen or two). Past it, a message is
//    dropped with {t:"error", code:"slow"} (at most one a second); a connection that keeps on long after (200 dropped) is closed.
//  - each address may have 40 connections open at once (a family round one board behind one home router is ten: two players and
//    eight watchers), may open 20 rooms in ten minutes, and may stand at 6 doors at once. Past those it gets {t:"error", code:"full"}
//    (and a connection over the cap is closed), so one address cannot fill the server's 2000 rooms or a host's door list.
// The address is the first entry of X-Forwarded-For (Render's proxy puts the client there and adds its own after it), else the socket's.
// A client can write its own X-Forwarded-For, so a determined script can still dodge the per-address caps; the per-connection pace and
// the server's room cap (rooms.js maxRooms) hold whatever it says. The caps are generous on purpose: many phones in Nigeria share one
// address behind the mobile network, and a cap that turned away a real family would be worse than the flood.
// Nothing is kept but counts, and every count goes when its connection closes or its window passes (sweep), so nothing grows.

export const GUARD = Object.freeze({
  burst: 60, perSecond: 20, closeAfter: 200, // a connection's pace
  perAddress: 40,                              // connections open at once from one address
  roomsPerAddress: 20, roomsWindowMs: 10 * 60 * 1000, // rooms opened from one address in ten minutes
  knocksPerAddress: 6,                         // doors one address may be knocking at, at once
  maxAddresses: 20000,                         // addresses tracked at once (a flood of made-up addresses cannot grow the table)
});

// The client's address as the server sees it behind Render's proxy.
export function addressOf(req) {
  const xff = req && req.headers && req.headers["x-forwarded-for"];
  const first = String(Array.isArray(xff) ? xff[0] : xff || "").split(",")[0].trim();
  const raw = first || (req && req.socket && req.socket.remoteAddress) || "unknown";
  return String(raw).replace(/^::ffff:/, "").slice(0, 64);
}

// A connection's pace: take() says "ok" (handle it), "drop" (refuse it) or "close" (enough: close the connection).
// say() is true when a refusal should be told (once a second), so a flood does not get a flood of errors back.
export class Pace {
  constructor({ now = Date.now, burst = GUARD.burst, perSecond = GUARD.perSecond, closeAfter = GUARD.closeAfter } = {}) {
    this.now = now; this.burst = burst; this.perSecond = perSecond; this.closeAfter = closeAfter;
    this.tokens = burst; this.at = now(); this.dropped = 0; this.toldAt = -Infinity;
  }
  take() {
    const t = this.now();
    this.tokens = Math.min(this.burst, this.tokens + ((t - this.at) / 1000) * this.perSecond); this.at = t;
    if (this.tokens >= 1) { this.tokens -= 1; if (this.tokens >= this.burst / 2) this.dropped = 0; return "ok"; } // back at an easy pace: forgiven
    this.dropped += 1;
    return this.dropped >= this.closeAfter ? "close" : "drop";
  }
  say() { const t = this.now(); if (t - this.toldAt < 1000) return false; this.toldAt = t; return true; }
}

// Counts per address: connections open (and which), rooms opened lately.
export class Doorman {
  constructor({ now = Date.now, ...opts } = {}) {
    this.now = now; this.o = { ...GUARD, ...opts };
    this.by = new Map(); // address → {open, rooms: [times], knocks}
  }
  get size() { return this.by.size; }
  entry(addr, make = true) {
    let e = this.by.get(addr);
    if (!e && make) { e = { open: 0, rooms: [], sockets: new Set() }; this.by.set(addr, e); }
    return e;
  }
  // a new connection: false when this address already has its fill (or the table is full of addresses)
  open(addr, socket = {}) {
    if (!this.by.has(addr) && this.by.size >= this.o.maxAddresses) return false;
    const e = this.entry(addr); if (e.open >= this.o.perAddress) { this.tidy(addr); return false; }
    e.open += 1; e.sockets.add(socket); return true;
  }
  close(addr, socket = {}) { const e = this.entry(addr, false); if (!e || !e.sockets.delete(socket)) return; e.open = Math.max(0, e.open - 1); this.tidy(addr); }
  knocking(addr) { let n = 0; for (const s of this.sockets(addr)) if (s.knock) n += 1; return n; }
  // a room about to be opened: false when this address has opened its fill lately; true counts it
  mayCreate(addr) {
    const e = this.entry(addr), t = this.now();
    e.rooms = e.rooms.filter((x) => t - x < this.o.roomsWindowMs);
    if (e.rooms.length >= this.o.roomsPerAddress) return false;
    e.rooms.push(t); return true;
  }
  // a room that was not opened after all (the server refused it): it does not count
  unCreate(addr) { const e = this.entry(addr, false); if (e && e.rooms.length) e.rooms.pop(); }
  // the sockets open from this address (index.js counts the doors they stand at from these, so a knock that ends any way stops counting)
  sockets(addr) { const e = this.entry(addr, false); return e ? e.sockets : []; }
  tidy(addr) {
    const e = this.by.get(addr); if (!e) return;
    const t = this.now(); e.rooms = e.rooms.filter((x) => t - x < this.o.roomsWindowMs);
    if (!e.open && !e.rooms.length) this.by.delete(addr);
  }
  sweep() { for (const a of [...this.by.keys()]) this.tidy(a); }
}
