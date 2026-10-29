// The board's end of an online room: one WebSocket to the server (protocol in server/index.js), reconnecting by itself.
// No DOM and no Three.js here, so test/online.test.js drives it in Node against the real server.
//
//   const net = new Online(wsUrl);
//   net.on('joined', ({ seat, room }) => …)   // seated (also after a reconnect: the room carries the whole game)
//   net.on('move',   ({ seat, pit, events, state }) => …)
//   net.on('room',   ({ room, started }) => …) // presence, a rematch asked for, a new game started
//   net.on('error',  ({ code, msg, re }) => …) // a refused move, a full room, a code nobody opened …
//   net.on('status', (s) => …)                 // 'connecting' | 'open' | 'reconnecting' | 'closed'
//   net.create({ variant, rules, name }) / net.join(code, name) / net.rejoin(code, token) / net.move(pit) / net.rematch() / net.leave()

export const BACKOFF_MS = [800, 1600, 3200, 6400, 10000]; // between reconnect attempts, then every 10 s

// The game as the server shows it, made into an engine-shaped state the board can read (legalMoves, replay for undo-less play).
export function stateFrom(pub) {
  return { variant: pub.variant, rules: { ...pub.rules }, pits: pub.pits.slice(), stores: pub.stores.slice(), turn: pub.turn, moves: pub.moves.slice(), quiet: 0, over: !!pub.over, winner: pub.over ? pub.winner : null };
}

// The invite link for a room: the app's own address with ?room=CODE.
export function inviteLink(code, base = typeof location !== 'undefined' ? location.origin + location.pathname : '/') {
  return `${base}?room=${encodeURIComponent(String(code || '').toUpperCase())}`;
}

// What the player sees for a refusal, in plain words.
export const ERROR_TEXT = {
  notfound: 'No room with that code — check the link', taken: 'That room already has two players', waiting: 'Your friend has not joined yet',
  turn: 'Not your move', illegal: 'That pit cannot be played', over: 'The game is over', token: 'That seat is not yours', swept: 'The room has closed',
  full: 'Too many rooms open right now — try again in a minute', seated: 'Already at a board', unseated: 'Join a room first', variant: 'Unknown game',
};

export class Online {
  constructor(url, { WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : null, setTimeoutFn = (fn, ms) => setTimeout(fn, ms), clearTimeoutFn = (t) => clearTimeout(t) } = {}) {
    this.url = url; this.WS = WebSocketImpl; this.setTimeout = setTimeoutFn; this.clearTimeout = clearTimeoutFn;
    this.ws = null; this.status = 'closed'; this.seat = null; this.code = null; this.token = null; this.room = null;
    this.intent = null; // what to send once the socket opens: {t:'create'…} | {t:'join'…} | {t:'rejoin'…}
    this.attempts = 0; this.timer = null; this.left = false;
    this.handlers = {};
  }
  on(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); return this; }
  emit(type, data) { for (const fn of this.handlers[type] || []) { try { fn(data); } catch (e) { if (typeof console !== 'undefined') console.error(e); } } }
  setStatus(s) { if (this.status !== s) { this.status = s; this.emit('status', s); } }

  // --- seats ---
  create({ variant = 'ncho', rules = {}, name } = {}) { this.ask({ t: 'create', variant, rules, name }); }
  join(code, name) { this.ask({ t: 'join', code: String(code || '').toUpperCase(), name }); }
  rejoin(code, token) { this.ask({ t: 'rejoin', code: String(code || '').toUpperCase(), token }); }
  ask(intent) { this.intent = intent; if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(intent)); else this.connect(); }
  move(pit) { return this.send({ t: 'move', pit }); }
  rematch() { return this.send({ t: 'rematch' }); }
  leave() { this.left = true; this.clearTimeout(this.timer); this.timer = null; this.intent = null; if (this.ws) { try { this.ws.close(); } catch {} } this.ws = null; this.setStatus('closed'); }

  send(msg) {
    if (!this.ws || this.ws.readyState !== 1) { this.emit('error', { code: 'offline', msg: 'No connection right now — reconnecting', re: msg.t }); return false; }
    this.ws.send(JSON.stringify(msg)); return true;
  }

  // --- the socket ---
  connect() {
    if (!this.WS) { this.emit('error', { code: 'nows', msg: 'This browser cannot open a live connection' }); return; }
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this.left = false; this.clearTimeout(this.timer); this.timer = null;
    this.setStatus(this.attempts ? 'reconnecting' : 'connecting');
    let ws; try { ws = new this.WS(this.url); } catch (e) { return this.scheduleReconnect(); }
    this.ws = ws;
    ws.onopen = () => { this.attempts = 0; this.setStatus('open'); if (this.intent) ws.send(JSON.stringify(this.intent)); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)); } catch { return; } this.handle(m); };
    ws.onerror = () => {}; // the close that follows does the work
    ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; if (this.left) return this.setStatus('closed'); this.scheduleReconnect(); };
  }
  scheduleReconnect() {
    if (this.left) return;
    // only a seat we already hold is worth coming back for; a create/join that never got through is reported once
    if (!this.token) { this.setStatus('closed'); this.emit('error', { code: 'offline', msg: 'Could not reach the server — check your signal and try again', re: this.intent && this.intent.t }); return; }
    this.intent = { t: 'rejoin', code: this.code, token: this.token };
    const delay = BACKOFF_MS[Math.min(this.attempts, BACKOFF_MS.length - 1)]; this.attempts += 1;
    this.setStatus('reconnecting');
    this.timer = this.setTimeout(() => { this.timer = null; this.connect(); }, delay);
  }
  // the page came back to the front (or the phone found signal): try now rather than waiting out the backoff
  wake() { if (this.status === 'reconnecting' && this.token) { this.clearTimeout(this.timer); this.timer = null; this.connect(); } }

  handle(m) {
    switch (m.t) {
      case 'joined':
        this.seat = m.seat; this.code = m.code; this.token = m.token; this.room = m.room; this.intent = { t: 'rejoin', code: m.code, token: m.token };
        return this.emit('joined', { seat: m.seat, code: m.code, token: m.token, room: m.room });
      case 'room': this.room = m.room; return this.emit('room', { room: m.room, started: !!m.started });
      case 'move': if (this.room) this.room.state = m.state; return this.emit('move', { seat: m.seat, pit: m.pit, events: m.events, state: m.state });
      case 'error':
        if (m.code === 'swept' || (m.code === 'notfound' && m.re === 'rejoin') || m.code === 'token') { this.token = null; this.intent = null; } // nothing left to come back to
        return this.emit('error', { code: m.code, msg: ERROR_TEXT[m.code] || m.msg || 'Something went wrong', re: m.re });
      case 'pong': return;
      default: return;
    }
  }
}
