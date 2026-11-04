// Video and voice at the board (Launch L16b): the rules of a call between the two seated players of a room.
// Pure logic, no DOM and no WebRTC: the server checks every call message with callMessage() and the gate; the board runs
// the consent flow (CallFlow) and web/talk.js does the WebRTC.
//
// Nothing is on until BOTH have said yes: one side asks (its ask is its yes, with the mode it chose), the other answers
// Video / Voice only / Not now. Only then does either phone open its camera or microphone. The picture and sound go
// phone to phone (WebRTC); the room's WebSocket carries only these small messages between the two seats, and the server
// keeps none of them.
//
// Wire (client → server): {t:"call", kind, data}; the server sends {t:"call", seat, kind, data} to the OTHER seat only.
//   ask   {mode}          I would like to talk (mode "video" | "voice"); my ask is my yes
//   yes   {mode}          they asked and I say yes (mode: what I will share)
//   no    {}              not now (or: I stop asking)
//   offer {sdp}  answer {sdp}  ice {c}   the WebRTC handshake (the asker makes the offer, once both said yes)
//   state {mic, cam, weak?} my microphone / camera switched on or off (so their bubble can say "muted"); weak: true when the
//                         line between the phones is too weak for pictures (both go voice only), false when video comes back
//   end   {}              hang up

export const CALL_KINDS = ['ask', 'yes', 'no', 'offer', 'answer', 'ice', 'state', 'end'];
export const MODES = ['video', 'voice'];
export const MAX_SDP = 12000;    // characters: an offer with audio and one video track is ~3–6 k; the socket takes 16 KB
export const MAX_ICE = 600;      // one candidate line
export const ASK_GAP_MS = 5000;  // one ask every 5 s per seat (a child tapping the camera button cannot ring the other phone in a loop)
export const BURST = 60;         // messages a seat may send in a burst (a handshake is ~10–30 with trickled candidates)
export const REFILL_MS = 250;    // then one more every quarter second
// Public STUN servers only (free; no relay). Where two phones cannot reach each other directly (some mobile networks) the
// call cannot connect without a TURN relay, which costs money: that waits on Meka's yes (docs/build-plan.md, Needs Meka).
export const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

const isStr = (s, max) => typeof s === 'string' && s.length > 0 && s.length <= max;

// The server's check: returns the cleaned data to pass on, or null when the message is not a call message it relays.
export function callMessage(kind, data) {
  const d = data && typeof data === 'object' ? data : {};
  switch (kind) {
    case 'ask': case 'yes': return MODES.includes(d.mode) ? { mode: d.mode } : null;
    case 'no': case 'end': return {};
    case 'offer': case 'answer': return isStr(d.sdp, MAX_SDP) ? { sdp: d.sdp } : null;
    case 'ice': {
      const c = d.c && typeof d.c === 'object' ? d.c : null;
      if (!c || typeof c.candidate !== 'string' || c.candidate.length > MAX_ICE) return null;
      const out = { candidate: c.candidate };
      if (typeof c.sdpMid === 'string' && c.sdpMid.length <= 32) out.sdpMid = c.sdpMid;
      if (Number.isInteger(c.sdpMLineIndex) && c.sdpMLineIndex >= 0 && c.sdpMLineIndex < 16) out.sdpMLineIndex = c.sdpMLineIndex;
      return { c: out };
    }
    case 'state': return typeof d.weak === 'boolean' ? { mic: !!d.mic, cam: !!d.cam, weak: d.weak } : { mic: !!d.mic, cam: !!d.cam };
    default: return null;
  }
}

// The rate gate a seat's call messages pass on the server: a bucket of BURST that refills one every REFILL_MS, and asks
// at least ASK_GAP_MS apart. gate is the seat's own little record ({tokens, at, askAt}); returns whether this one may go.
export function passGate(gate, kind, t) {
  if (gate.at === undefined) { gate.tokens = BURST; gate.at = t; gate.askAt = -Infinity; }
  const add = Math.floor((t - gate.at) / REFILL_MS);
  if (add > 0) { gate.tokens = Math.min(BURST, gate.tokens + add); gate.at += add * REFILL_MS; }
  if (kind === 'ask' && t - gate.askAt < ASK_GAP_MS) return false;
  if (gate.tokens <= 0) return false;
  gate.tokens -= 1; if (kind === 'ask') gate.askAt = t;
  return true;
}

// What this phone may share: voice only when the lighter board is on (a slow phone or a weak line), or when asked for.
export function pickMode(wanted, { lighter = false, camera = true } = {}) {
  if (!camera) return 'voice';
  return wanted === 'video' && !lighter ? 'video' : 'voice';
}

// The consent flow, from one phone's side. Each method returns a list of effects for the board to carry out:
//   {send: kind, data}   a call message to the friend
//   {media: mode}        open the camera and/or microphone now (only ever after both said yes)
//   {offer: true}        make the WebRTC offer (the asker does, once the friend's yes arrived and its media is open)
//   {connect: true}      the friend's offer/answer/candidate is for the WebRTC side (talk.js) — passed with the message
//   {close: true}        stop everything (media and connection)
//   {say: key}           words for the board (callWords)
// phase: idle → asking (I asked) → starting (they said yes; my media opens, then I offer) → live
//        idle → asked (they asked; the card is up) → starting (I said yes; media opens, then I wait for their offer) → live
export class CallFlow {
  constructor(seat = 0) { this.seat = seat; this.reset(); }
  reset() { this.phase = 'idle'; this.mine = null; this.theirs = null; this.asker = null; this.mic = true; this.cam = true; this.their = { mic: true, cam: true }; this.hideTheirs = false; this.weak = false; this.better = false; this.camBefore = true; }
  get video() { return this.mine === 'video' || this.theirs === 'video'; } // anything to drop when the line is weak
  get on() { return this.phase === 'starting' || this.phase === 'live'; }

  ask(mode) { // I tap Video or Voice only
    if (this.phase === 'asked') return this.answer(mode); // they asked first: my ask is a yes
    if (this.phase !== 'idle') return [];
    this.phase = 'asking'; this.mine = mode; this.asker = 'me';
    return [{ send: 'ask', data: { mode } }, { say: 'asking' }];
  }
  cancel() { // I stop asking, or say Not now to their ask
    if (this.phase === 'asking') { this.reset(); return [{ send: 'no', data: {} }, { say: 'stopped' }]; }
    if (this.phase === 'asked') { this.reset(); return [{ send: 'no', data: {} }, { say: 'declined' }]; }
    return [];
  }
  answer(mode) { // I say yes to their ask
    if (this.phase !== 'asked') return [];
    this.phase = 'starting'; this.mine = mode; this.cam = mode === 'video';
    return [{ media: mode }, { send: 'yes', data: { mode } }, { say: 'starting' }];
  }
  hangUp() {
    if (this.phase === 'idle') return [];
    const was = this.phase; this.reset();
    if (was === 'asking' || was === 'asked') return [{ send: 'no', data: {} }, { say: was === 'asking' ? 'stopped' : 'declined' }];
    return [{ send: 'end', data: {} }, { close: true }, { say: 'ended' }];
  }
  connected() { if (this.phase === 'starting') { this.phase = 'live'; return [{ say: 'live' }]; } return []; }
  failed() { if (!this.on) return []; this.reset(); return [{ send: 'end', data: {} }, { close: true }, { say: 'failed' }]; }
  noMedia() { // my camera/microphone could not open (refused, or none): we stop and say why
    if (!this.on) return []; this.reset(); return [{ send: 'end', data: {} }, { close: true }, { say: 'nomedia' }];
  }
  mediaReady() { // my media is open: the asker now makes the offer
    return this.phase === 'starting' && this.asker === 'me' ? [{ offer: true }] : [];
  }
  toggleMic() { if (!this.on) return []; this.mic = !this.mic; return [{ send: 'state', data: { mic: this.mic, cam: this.cam } }]; }
  toggleCam() { if (!this.on || this.mine !== 'video' || this.weak) return []; this.cam = !this.cam; return [{ send: 'state', data: { mic: this.mic, cam: this.cam } }]; }
  // The line between the phones (web/call.js LineWatch, from the connection's own numbers): too weak for pictures, so the
  // whole call goes voice only — this phone stops sending its picture and tells the friend, whose phone does the same (the
  // line is the same both ways). Voice carries on. Video comes back only when someone taps Video again once the line is
  // better (never by itself, so a line that comes and goes does not flick the pictures on and off).
  //   {video: false|true}   stop / start sending this phone's picture (web/talk.js sendVideo)
  lineWeak() {
    if (this.weak) { this.better = false; return []; } // weak again before Video again was tapped: the offer goes
    if (!this.on || !this.video) return [];
    this.goWeak();
    return [{ video: false }, { send: 'state', data: { mic: this.mic, cam: false, weak: true } }, { say: 'weak' }];
  }
  lineBetter() { if (!this.weak || this.better) return []; this.better = true; return [{ say: 'better' }]; }
  videoAgain() {
    if (!this.on || !this.weak) return [];
    this.goStrong();
    return [{ video: true }, { send: 'state', data: { mic: this.mic, cam: this.cam, weak: false } }, { say: 'videoagain' }];
  }
  goWeak() { this.weak = true; this.better = false; this.camBefore = this.cam; if (this.mine === 'video') this.cam = false; this.their = { ...this.their, cam: false }; }
  goStrong() { this.weak = false; this.better = false; if (this.mine === 'video') this.cam = this.camBefore; }
  toggleTheirs() { if (!this.on) return []; this.hideTheirs = !this.hideTheirs; return []; } // only on this phone: their picture is not shown

  // a message from the friend
  receive(kind, data = {}) {
    switch (kind) {
      case 'ask':
        if (this.phase === 'idle') { this.phase = 'asked'; this.theirs = data.mode; this.asker = 'them'; return [{ say: 'asked' }]; }
        if (this.phase === 'asking') { // both asked at once (the asks crossed on the wire): that is both yes, and seat 0 makes the offer
          this.theirs = data.mode; this.phase = 'starting'; this.cam = this.mine === 'video'; this.asker = this.seat === 0 ? 'me' : 'them';
          return [{ media: this.mine }, { say: 'starting' }];
        }
        return [];
      case 'yes':
        if (this.phase !== 'asking') return [];
        this.theirs = data.mode; this.phase = 'starting'; this.cam = this.mine === 'video';
        return [{ media: this.mine }, { say: 'starting' }];
      case 'no':
        if (this.phase === 'asking') { this.reset(); return [{ say: 'theysaidno' }]; }
        if (this.phase === 'asked') { this.reset(); return [{ say: 'theystopped' }]; }
        return [];
      case 'end':
        if (this.phase === 'idle') return [];
        { const was = this.phase; this.reset(); return was === 'asked' || was === 'asking' ? [{ say: 'theystopped' }] : [{ close: true }, { say: 'theyended' }]; }
      case 'offer': case 'answer': case 'ice':
        return this.on ? [{ connect: true }] : [];
      case 'state': {
        if (!this.on) return [];
        const eff = [];
        if (data.weak === true && !this.weak) { this.goWeak(); eff.push({ video: false }, { send: 'state', data: { mic: this.mic, cam: false } }, { say: 'theirweak' }); }
        else if (data.weak === false && this.weak) { this.goStrong(); eff.push({ video: true }, { send: 'state', data: { mic: this.mic, cam: this.cam } }, { say: 'theirvideoagain' }); }
        this.their = { mic: !!data.mic, cam: !!data.cam && !this.weak };
        return eff;
      }
      default: return [];
    }
  }
  // the friend left the board (their socket went) or the room ended: a call cannot outlive it
  gone() { if (this.phase === 'idle') return []; const was = this.phase; this.reset(); return was === 'asked' || was === 'asking' ? [{ say: 'theystopped' }] : [{ close: true }, { say: 'theyleft' }]; }
}

// The words, from this phone's side. name: the friend's name.
export function callWords(key, name = 'your friend', mode) {
  const N = name;
  switch (key) {
    case 'chip': return `Video or voice with ${N}`;
    case 'askVideo': return `Video with ${N}`;
    case 'askVoice': return 'Voice only';
    case 'asking': return `Asked ${N} to talk — waiting for their yes`;
    case 'stopAsk': return 'Stop asking';
    case 'stopped': return 'Stopped asking';
    case 'asked': return mode === 'video' ? `${N} would like video at the board` : `${N} would like to talk at the board`;
    case 'askedSub': return 'Nothing is on until you say yes. The picture and sound go straight between your two phones and are never recorded.';
    case 'declined': return `Not now — ${N} has been told`;
    case 'theysaidno': return `${N} said not now`;
    case 'theystopped': return `${N} stopped asking`;
    case 'starting': return `Connecting to ${N}…`;
    case 'live': return `Talking with ${N}`;
    case 'ended': return 'Call ended';
    case 'theyended': return `${N} hung up`;
    case 'theyleft': return `${N} left the board — call ended`;
    case 'failed': return `Could not reach ${N}'s phone — some mobile networks block a direct line; try on Wi-Fi`;
    case 'nomedia': return 'The camera and microphone did not open — allow them for this site (or the app) and try again';
    case 'away': return `${N} is not at the board right now`;
    case 'mic': return 'Microphone';
    case 'cam': return 'Camera';
    case 'theirCam': return `${N}'s picture`;
    case 'hangUp': return 'Hang up';
    case 'muted': return 'muted';
    case 'weak': return 'The line is weak — voice only for now, so you can keep talking';
    case 'theirweak': return `${N}'s line is weak — voice only for now`;
    case 'better': return 'The line is better — Video again is under the camera button';
    case 'videoAgain': return 'Video again';
    case 'videoagain': return 'Video again';
    case 'theirvideoagain': return `${N} turned video back on`;
    case 'weakNote': return 'The line was weak, so the pictures stopped and the voice carried on.';
    default: return '';
  }
}

// ---------- how good the line is (Launch L16b, slice 3) ----------
// Every LINE.everyMs the board reads the connection's own numbers (RTCPeerConnection.getStats: the round trip on the pair
// of addresses in use, the bitrate the browser thinks it can send, the packets lost coming in) and asks LineWatch whether
// the line still carries pictures. Weak: LINE.weakOf of the last LINE.window samples bad. Better: LINE.goodFor good in a row.
export const LINE = {
  everyMs: 2000, window: 4, weakOf: 3, goodFor: 10,
  rttMs: 700,      // a round trip slower than this: the faces lag the voice and the voice breaks up
  loss: 0.08,      // more than 8% of the packets coming in lost
  kbps: 150,       // the browser estimates it can send less than this: the voice (~40) and a small face (~150) no longer fit
};
// One reading from getStats' entries (an array of report objects); prev holds the incoming packet counts of the last reading.
export function readLine(entries, prev = {}) {
  let rtt = null, kbps = null, lost = 0, got = 0, pairs = 0;
  const all = Array.isArray(entries) ? entries : [];
  const transport = all.find((r) => r && r.type === 'transport' && r.selectedCandidatePairId);
  for (const r of all) {
    if (!r || typeof r !== 'object') continue;
    if (r.type === 'candidate-pair') {
      const inUse = transport ? r.id === transport.selectedCandidatePairId : (r.nominated && r.state === 'succeeded') || r.selected;
      if (!inUse) continue; pairs++;
      if (typeof r.currentRoundTripTime === 'number') rtt = Math.round(r.currentRoundTripTime * 1000);
      if (typeof r.availableOutgoingBitrate === 'number') kbps = Math.round(r.availableOutgoingBitrate / 1000);
    } else if (r.type === 'inbound-rtp') {
      lost += Math.max(0, r.packetsLost || 0); got += Math.max(0, r.packetsReceived || 0);
    }
  }
  const dl = lost - (prev.lost || 0), dg = got - (prev.got || 0);
  const loss = dl + dg > 0 && lost >= (prev.lost || 0) ? dl / (dl + dg) : 0;
  return { sample: { rtt, kbps, loss: Math.round(loss * 1000) / 1000, pairs }, prev: { lost, got } };
}
export function badLine(s) {
  if (!s) return false;
  return (s.rtt !== null && s.rtt > LINE.rttMs) || s.loss > LINE.loss || (s.kbps !== null && s.kbps < LINE.kbps);
}
export class LineWatch {
  constructor() { this.recent = []; this.good = 0; this.weak = false; this.prev = {}; }
  // feed one getStats reading (entries); returns 'weak' the moment the line turns weak, 'better' once it has held good, else null
  read(entries) { const r = readLine(entries, this.prev); this.prev = r.prev; return this.push(r.sample); }
  push(s) {
    if (!s || !s.pairs) return null; // not connected on a pair yet: nothing to judge
    const bad = badLine(s);
    this.recent.push(bad); if (this.recent.length > LINE.window) this.recent.shift();
    this.good = bad ? 0 : this.good + 1;
    if (!this.weak && this.recent.filter(Boolean).length >= LINE.weakOf) { this.weak = true; this.good = 0; return 'weak'; }
    if (this.weak && this.good >= LINE.goodFor) { this.weak = false; this.recent = []; return 'better'; }
    return null;
  }
  // the call went voice only because of the FRIEND's line: watch for it to hold good here too before offering video again
  markWeak() { this.weak = true; this.good = 0; }
}
