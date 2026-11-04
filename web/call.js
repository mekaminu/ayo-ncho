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
//   state {mic, cam}      my microphone / camera switched on or off (so their bubble can say "muted")
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
    case 'state': return { mic: !!d.mic, cam: !!d.cam };
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
  reset() { this.phase = 'idle'; this.mine = null; this.theirs = null; this.asker = null; this.mic = true; this.cam = true; this.their = { mic: true, cam: true }; this.hideTheirs = false; }
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
  toggleCam() { if (!this.on || this.mine !== 'video') return []; this.cam = !this.cam; return [{ send: 'state', data: { mic: this.mic, cam: this.cam } }]; }
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
      case 'state':
        if (this.on) this.their = { mic: !!data.mic, cam: !!data.cam };
        return [];
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
    default: return '';
  }
}
