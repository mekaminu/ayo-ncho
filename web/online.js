// The board's end of an online room: one WebSocket to the server (protocol in server/index.js), reconnecting by itself.
// No DOM and no Three.js here, so test/online.test.js drives it in Node against the real server.
//
//   const net = new Online(wsUrl);
//   net.on('joined', ({ seat, room }) => …)   // seated (also after a reconnect: the room carries the whole game)
//   net.on('knocked', ({ host, hostOnline }) => …) // you are at the door: the host has been told your name and decides
//   net.on('knock',  ({ id, name }) => …)      // (host) someone is at the door; room.knocks in the next 'room' lists everyone waiting
//   net.on('move',   ({ seat, pit, events, state }) => …) // events and state rebuilt here with the engine from the small message the server sends
//   net.on('room',   ({ room, started, resync }) => …) // presence, a knock, a rematch asked for, a new game started; resync: the whole room after this board fell behind
//   net.on('resync', ({ why }) => …)           // this board could not rebuild a move and has asked for the room (a 'room' with resync follows)
//   net.on('resign', ({ seat, events, state }) => …) // that seat gave up the game: the other seat wins (events: one 'end')
//   net.on('askback', ({ seat, n }) => …)     // that seat asks to take back the move it just played (n: moves played); the other seat answers
//   net.on('takeback', ({ seat, state, undone, before }) => …) // yes: that seat's last move (pit `undone`) is gone, state is the position before it
//   net.on('backno', ({ seat }) => …)          // no: the move stands
//   net.on('shout',  ({ seat, id }) => …)      // a shout from either seat (web/shouts.js has the words)
//   net.on('call',   ({ seat, kind, data }) => …) // a call message from the friend (web/call.js): video and voice at the board
//   net.on('error',  ({ code, msg, re }) => …) // a refused move, a full room, a code nobody opened, not let in …
//   net.on('status', (s) => …)                 // 'connecting' | 'open' | 'reconnecting' | 'closed'
//   net.on('ticket', ({ code, token, ticket }) => …) // the room as this board holds it, sealed by the server: keep it (with the token) so a reload can rebuild the room after a restart
//   net.create({ variant, rules, name }) / net.join(code, name) (knocks) / net.rejoin(code, token, ticket?) / net.let(id, yes) / net.move(pit) / net.shout(id) / net.rematch() / net.resign() / net.askBack() / net.answerBack(yes) / net.leave()

import { applyMove, resign, takeBack, mayTakeBack, firstMover } from '../engine/ayo.js';

export const BACKOFF_MS = [800, 1600, 3200, 6400, 10000]; // between reconnect attempts, then every 10 s

// The game as the server shows it, made into an engine-shaped state the board can read (legalMoves, replay for undo-less play).
export function stateFrom(pub) {
  return { variant: pub.variant, rules: { ...pub.rules }, pits: pub.pits.slice(), stores: pub.stores.slice(), turn: pub.turn, moves: pub.moves.slice(), quiet: pub.quiet || 0, over: !!pub.over, winner: pub.over ? pub.winner : null, resigned: pub.resigned ?? null, first: pub.first ?? firstMover(pub.moves, pub.moves.length ? 0 : pub.turn) };
}
// The other way round: an engine state as the server would show it (what a 'move' carries once rebuilt).
export function publicFrom(s) {
  return { pits: s.pits.slice(), stores: s.stores.slice(), turn: s.turn, moves: s.moves.slice(), quiet: s.quiet || 0, over: !!s.over, winner: s.over ? s.winner : null, resigned: s.resigned ?? null, first: s.first ?? 0, variant: s.variant, rules: { ...s.rules } };
}

// A move arrives small — {seat, pit, n, stores} — because every board has the same engine as the server. Rebuild the
// events (the seeds' whole path) and the new position from the room's game; n (moves played) and the scores must agree,
// or this board has fallen behind and the whole room is fetched instead. Returns {events, state} or null.
export function rebuildMove(pub, m) {
  if (!pub || !Array.isArray(pub.pits)) return null;
  let r; try { r = applyMove(stateFrom(pub), m.pit); } catch { return null; }
  const s = r.state;
  if (s.moves.length !== m.n) return null;
  if (!Array.isArray(m.stores) || m.stores[0] !== s.stores[0] || m.stores[1] !== s.stores[1]) return null;
  return { events: r.events, state: publicFrom(s) };
}

// Giving up arrives as {seat, n}: the same engine ends the room's game on this board; n must match the moves played here.
export function rebuildResign(pub, m) {
  if (!pub || !Array.isArray(pub.moves) || pub.moves.length !== m.n || pub.over) return null;
  let r; try { r = resign(stateFrom(pub), m.seat); } catch { return null; }
  return { events: r.events, state: publicFrom(r.state) };
}

// "Take it back?" said yes arrives as {seat, n}: the same engine takes that seat's last move back on this board; n (the
// moves left once it is gone) must match, or the whole room is fetched instead.
export function rebuildTakeBack(pub, m) {
  if (!pub || !Array.isArray(pub.moves) || pub.moves.length !== m.n + 1) return null;
  const s = stateFrom(pub); if (!mayTakeBack(s, m.seat)) return null;
  let back; try { back = takeBack(s, m.seat); } catch { return null; }
  return { state: publicFrom(back), undone: pub.moves[pub.moves.length - 1] };
}

// What a board keeps of a room so the server can rebuild it after a restart (a deploy, the free server waking from sleep):
// the moves it already holds, the names, the rules, who opened, games played, who gave up, the room's id, and the server's
// seal over all of it (sig, sent with the room and with every move). Nothing here can be changed without the seal failing.
export function ticketOf(room) {
  if (!room || !room.rid || !room.sig || !room.state || !Array.isArray(room.players)) return null;
  return { rid: room.rid, variant: room.variant, rules: { ...room.rules }, games: room.games || 0, names: [0, 1].map((i) => (room.players[i] ? room.players[i].name : null)), first: room.state.first ?? 0, moves: room.state.moves.slice(), resigned: room.state.resigned ?? null, sig: room.sig };
}

// The invite link for a room: the app's own address with ?room=CODE.
export function inviteLink(code, base = typeof location !== 'undefined' ? location.origin + location.pathname : '/') {
  return `${base}?room=${encodeURIComponent(String(code || '').toUpperCase())}`;
}

// A code typed on the Rooms screen: letters only, upper case, four at most (the server says if nobody opened it).
export function cleanCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); }
// The invite, in the host's own voice, for WhatsApp and the share sheet.
export function inviteText(code) { return `Come and play Ayo & Nchò with me — open the link, say your name and knock, and I'll let you in. Room ${String(code || '').toUpperCase()}.`; }
export function whatsappLink(code, link) { return 'https://wa.me/?text=' + encodeURIComponent(inviteText(code) + '\n' + link); }

// What the player sees for a refusal, in plain words.
export const ERROR_TEXT = {
  notfound: 'No room with that code — check the link', taken: 'That room already has two players', waiting: 'Your friend has not joined yet',
  turn: 'Not your move', illegal: 'That pit cannot be played', over: 'The game is over', token: 'That seat is not yours', swept: 'The room has closed',
  full: 'Too many rooms open right now — try again in a minute', seated: 'Already at a board', unseated: 'Join a room first', variant: 'Unknown game',
  hush: 'Easy — one shout at a time', bad: 'Something went wrong', away: 'Your friend is not at the board right now', slow: 'Slow down a moment',
  notlet: 'Not let in this time', knocking: 'Already at the door', busy: 'Too many people at the door — try again in a minute',
  host: 'Only the host decides who comes in', noknock: 'They have gone from the door',
  noback: 'Only the move you just played can be taken back', asked: 'Already asked — waiting for an answer', askedonce: 'You have asked once for this move',
  noask: 'Too late — they played on', ownask: 'Your friend answers this one',
};

export class Online {
  constructor(url, { WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : null, setTimeoutFn = (fn, ms) => setTimeout(fn, ms), clearTimeoutFn = (t) => clearTimeout(t) } = {}) {
    this.url = url; this.WS = WebSocketImpl; this.setTimeout = setTimeoutFn; this.clearTimeout = clearTimeoutFn;
    this.ws = null; this.status = 'closed'; this.seat = null; this.code = null; this.token = null; this.room = null;
    this.knock = null; // {code, id, host, hostOnline} while this board waits at the door
    this.held = null; // a ticket brought back from a reload (rejoin), until the server sends the room
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
  rejoin(code, token, ticket = null) { this.held = ticket || null; this.ask({ t: 'rejoin', code: String(code || '').toUpperCase(), token }); }
  ask(intent) { this.intent = intent; if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(this.wire(intent))); else this.connect(); }
  // a rejoin carries the ticket, so a server that has restarted since can rebuild the room from it
  wire(intent) { if (intent.t !== 'rejoin') return intent; const ticket = this.ticket(); return ticket ? { ...intent, ticket } : intent; }
  ticket() { return (this.room && ticketOf(this.room)) || this.held; }
  sealed(sig) { if (!this.room) return; if (sig) this.room.sig = sig; else delete this.room.sig; this.kept(); } // an older server sends no seal: keep no ticket rather than a stale one
  kept() { const ticket = ticketOf(this.room); if (ticket) { this.held = null; this.emit('ticket', { code: this.code, token: this.token, ticket }); } }
  let(id, yes = true) { return this.send({ t: 'let', id, in: !!yes }); } // the host answers the door
  move(pit) { return this.send({ t: 'move', pit }); }
  rematch() { return this.send({ t: 'rematch' }); }
  resign() { return this.send({ t: 'resign' }); } // give up the game in play
  askBack() { return this.send({ t: 'askback' }); } // ask to take back the move just played
  answerBack(yes) { return this.send({ t: 'backanswer', yes: !!yes }); }
  shout(id) { return this.send({ t: 'shout', id }); }
  call(kind, data = {}) { return this.send({ t: 'call', kind, data }); } // video and voice at the board (web/call.js): to the friend's seat only
  leave() { this.left = true; this.clearTimeout(this.timer); this.timer = null; this.intent = null; this.knock = null; if (this.ws) { try { this.ws.close(); } catch {} } this.ws = null; this.setStatus('closed'); }

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
    ws.onopen = () => { this.attempts = 0; this.setStatus('open'); if (this.intent) ws.send(JSON.stringify(this.wire(this.intent))); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)); } catch { return; } this.handle(m); };
    ws.onerror = () => {}; // the close that follows does the work
    ws.onclose = () => { if (this.ws !== ws) return; this.ws = null; if (this.left) return this.setStatus('closed'); this.scheduleReconnect(); };
  }
  scheduleReconnect() {
    if (this.left) return;
    // only a seat we already hold, or a door we were already knocking at, is worth coming back for; a create/join that never got through is reported once
    if (!this.token && !this.knock) { this.setStatus('closed'); this.emit('error', { code: 'offline', msg: 'Could not reach the server — check your signal and try again', re: this.intent && this.intent.t }); return; }
    if (this.token) this.intent = { t: 'rejoin', code: this.code, token: this.token }; else this.knock = { ...this.knock, id: null }; // at the door: the same join knocks again when the line is back
    const delay = BACKOFF_MS[Math.min(this.attempts, BACKOFF_MS.length - 1)]; this.attempts += 1;
    this.setStatus('reconnecting');
    this.timer = this.setTimeout(() => { this.timer = null; this.connect(); }, delay);
  }
  // the page came back to the front (or the phone found signal): try now rather than waiting out the backoff
  wake() { if (this.status === 'reconnecting' && (this.token || this.knock)) { this.clearTimeout(this.timer); this.timer = null; this.connect(); } }

  handle(m) {
    switch (m.t) {
      case 'joined':
        this.seat = m.seat; this.code = m.code; this.token = m.token; this.room = m.room; this.knock = null; this.intent = { t: 'rejoin', code: m.code, token: m.token };
        this.emit('joined', { seat: m.seat, code: m.code, token: m.token, room: m.room }); return this.kept();
      case 'knocked':
        this.code = m.code; this.knock = { code: m.code, id: m.id, host: m.host, hostOnline: !!m.hostOnline };
        return this.emit('knocked', { code: m.code, id: m.id, host: m.host, hostOnline: !!m.hostOnline });
      case 'knock': return this.emit('knock', { id: m.id, name: m.name });
      case 'room': this.room = m.room; this.emit('room', { room: m.room, started: !!m.started, resync: !!m.resync }); return this.kept();
      case 'move': {
        let events = m.events, state = m.state; // an older server still sends the whole thing
        if (!events || !state) {
          const r = rebuildMove(this.room && this.room.state, m);
          if (!r) { this.send({ t: 'sync' }); return this.emit('resync', { why: 'move' }); } // behind, somehow: ask for the whole room rather than guess
          events = r.events; state = r.state;
        }
        if (this.room) { this.room.state = state; this.room.ask = null; this.sealed(m.sig); } // playing on ends any "take it back?"
        return this.emit('move', { seat: m.seat, pit: m.pit, events, state });
      }
      case 'resign': {
        const r = rebuildResign(this.room && this.room.state, m);
        if (!r) { this.send({ t: 'sync' }); return this.emit('resync', { why: 'resign' }); }
        if (this.room) { this.room.state = r.state; this.sealed(m.sig); }
        return this.emit('resign', { seat: m.seat, events: r.events, state: r.state });
      }
      case 'askback': if (this.room) this.room.ask = { seat: m.seat, n: m.n }; return this.emit('askback', { seat: m.seat, n: m.n });
      case 'backno': if (this.room) this.room.ask = null; return this.emit('backno', { seat: m.seat, n: m.n });
      case 'takeback': {
        const before = this.room && this.room.state; const r = rebuildTakeBack(before, m);
        if (!r) { this.send({ t: 'sync' }); return this.emit('resync', { why: 'takeback' }); }
        if (this.room) { this.room.state = r.state; this.room.ask = null; this.sealed(m.sig); }
        return this.emit('takeback', { seat: m.seat, state: r.state, undone: r.undone, before });
      }
      case 'shout': return this.emit('shout', { seat: m.seat, id: m.id });
      case 'call': return this.emit('call', { seat: m.seat, kind: m.kind, data: m.data || {} });
      case 'error':
        if (m.code === 'swept' || (m.code === 'notfound' && m.re === 'rejoin') || m.code === 'token') { this.token = null; this.intent = null; this.held = null; } // nothing left to come back to
        if (m.re === 'join' && m.code !== 'knocking') { this.knock = null; this.intent = null; } // turned away, or the door is gone: no knocking again by ourselves
        return this.emit('error', { code: m.code, msg: ERROR_TEXT[m.code] || m.msg || 'Something went wrong', re: m.re });
      case 'pong': return;
      default: return;
    }
  }
}
