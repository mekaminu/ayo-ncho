// Video and voice at the board, the WebRTC side (Launch L16b): one peer connection between the two seated players.
// The picture and sound go phone to phone; only the offer, the answer and the network candidates travel over the room's
// socket (send). web/call.js decides WHEN (both said yes); this only opens the media and connects.
//
// Everything the browser provides is passed in (RTCPeerConnection, getUserMedia), so test/call.test.js drives two of these
// against each other with stand-ins, in node.
import { ICE_SERVERS } from './call.js';

export const CONSTRAINTS = {
  video: { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 320 }, frameRate: { ideal: 20, max: 24 } } },
  voice: { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false },
};
export const VIDEO_KBPS = 300; // a face in a 64 px bubble needs little; it leaves the line for the moves and the voice

export class Talk {
  constructor({ send, onRemote = () => {}, onState = () => {}, PC = globalThis.RTCPeerConnection, getUserMedia = (c) => navigator.mediaDevices.getUserMedia(c), iceServers = ICE_SERVERS }) {
    this.send = send; this.onRemote = onRemote; this.onState = onState; this.PC = PC; this.gum = getUserMedia; this.iceServers = iceServers;
    this.pc = null; this.local = null; this.remote = null; this.pending = []; this.ready = null; this.closed = false; this.state = 'new';
  }
  static available(g = globalThis) { return !!(g.RTCPeerConnection && g.navigator && g.navigator.mediaDevices && g.navigator.mediaDevices.getUserMedia); }

  // open this phone's camera and/or microphone (only once both have said yes). Resolves to the stream; a refusal throws.
  open(mode) {
    if (!this.ready) this.ready = (async () => {
      let stream;
      try { stream = await this.gum(CONSTRAINTS[mode] || CONSTRAINTS.voice); }
      catch (e) { if (mode === 'video') stream = await this.gum(CONSTRAINTS.voice); else throw e; } // no camera (or refused): voice only
      if (this.closed) { stopStream(stream); throw new Error('closed'); }
      this.local = stream; this.mode = stream.getVideoTracks().length ? 'video' : 'voice';
      this.makePC(); for (const t of stream.getTracks()) this.pc.addTrack(t, stream);
      return stream;
    })();
    return this.ready;
  }
  makePC() {
    if (this.pc) return;
    const pc = this.pc = new this.PC({ iceServers: this.iceServers });
    pc.onicecandidate = (e) => { if (e.candidate && !this.closed) this.send('ice', { c: { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex } }); };
    pc.ontrack = (e) => { const s = (e.streams && e.streams[0]) || null; if (s && s !== this.remote) { this.remote = s; this.onRemote(s); } else if (!s) { if (!this.remote) this.remote = new globalThis.MediaStream(); this.remote.addTrack(e.track); this.onRemote(this.remote); } };
    pc.onconnectionstatechange = () => this.setState(pc.connectionState);
    pc.oniceconnectionstatechange = () => { const s = pc.iceConnectionState; if (s === 'failed') this.setState('failed'); else if (s === 'connected' || s === 'completed') this.setState('connected'); else if (s === 'disconnected') this.setState('disconnected'); };
  }
  setState(s) { if (this.closed || s === this.state) return; if (s === 'connected' && this.state === 'connected') return; this.state = s; this.onState(s); }

  async offer() { // the asker: once both said yes and its media is open
    await this.ready; if (this.closed) return;
    const o = await this.pc.createOffer(); await this.pc.setLocalDescription(o);
    this.send('offer', { sdp: this.pc.localDescription.sdp });
  }
  // a handshake message from the friend: offer / answer / ice
  async receive(kind, data) {
    if (this.closed) return;
    if (kind === 'ice') {
      if (!this.pc || !this.pc.remoteDescription) { this.pending.push(data.c); return; } // before the offer/answer: held until it lands
      try { await this.pc.addIceCandidate(data.c); } catch {}
      return;
    }
    await this.ready; if (this.closed) return; // our media opens first (the answer must carry our tracks)
    if (kind === 'offer') {
      await this.pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
      await this.flush();
      const a = await this.pc.createAnswer(); await this.pc.setLocalDescription(a);
      this.send('answer', { sdp: this.pc.localDescription.sdp });
      this.capVideo();
    } else if (kind === 'answer') {
      await this.pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
      await this.flush(); this.capVideo();
    }
  }
  async flush() { const p = this.pending; this.pending = []; for (const c of p) { try { await this.pc.addIceCandidate(c); } catch {} } }
  capVideo() { // keep the picture small on the wire
    try { for (const s of this.pc.getSenders()) if (s.track && s.track.kind === 'video' && s.getParameters) { const p = s.getParameters(); if (!p.encodings || !p.encodings.length) p.encodings = [{}]; p.encodings[0].maxBitrate = VIDEO_KBPS * 1000; s.setParameters(p).catch(() => {}); } } catch {}
  }
  setMic(on) { if (this.local) for (const t of this.local.getAudioTracks()) t.enabled = !!on; }
  setCam(on) { if (this.local) for (const t of this.local.getVideoTracks()) t.enabled = !!on; }
  close() {
    if (this.closed) return; this.closed = true;
    if (this.local) stopStream(this.local);
    if (this.pc) { try { this.pc.close(); } catch {} this.pc.onicecandidate = this.pc.ontrack = this.pc.onconnectionstatechange = this.pc.oniceconnectionstatechange = null; }
    this.local = null; this.remote = null; this.pending = [];
  }
}
export function stopStream(s) { try { for (const t of s.getTracks()) t.stop(); } catch {} }
