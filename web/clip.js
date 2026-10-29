// The replay clip: find the best turn of a game and size it to a ~10-second recording.
// Pure functions (no DOM) so they can be unit-tested in node; game.js does the recording with MediaRecorder.
import { newGame, applyMove } from '../engine/ayo.js';

export const CLIP_MS = 10000;      // the whole clip, pit lit to last seed settled
const LEAD_MS = 900;               // the lit pit before the hand moves
const TAIL_MS = 900;               // the seeds settling at the end
const PICKUP_MS = 260;             // one pickup (first or relay) on the board
const SETTLE_MS = 650;             // the seeds in flight settling before a relay pickup
const CAPTURE_MS = 600;            // a scoop, roughly, plus the pause after it

// How good a turn was, for the player who played it: seeds it won, relays it chained, seeds it handed over.
export function scoreTurn(events, mover) {
  let seeds = 0, lost = 0, relays = 0, drops = 0;
  for (const e of events) {
    if (e.type === 'capture') { if (e.by === mover) seeds += e.n; else lost += e.n; }
    else if (e.type === 'pickup' && e.relay) relays += 1;
    else if (e.type === 'drop') drops += 1;
  }
  return { seeds, lost, relays, drops, score: seeds * 2 + relays * 3 - lost };
}

// Walk a finished (or unfinished) game and pick the player's best turn: { index, pit, before, events, ...score }.
// With no capture and no relay anywhere, the busiest turn (most seeds sown) is the clip. Null only for no moves at all.
export function bestTurn(moves, variant = 'ncho', rules = {}, player = 0) {
  let s = newGame(variant, rules); let best = null;
  moves.forEach((pit, index) => {
    const before = s; const { state, events } = applyMove(s, pit); s = state;
    if (before.turn !== player) return;
    const sc = scoreTurn(events, player);
    const rank = [sc.score, sc.drops];
    if (!best || rank[0] > best.score || (rank[0] === best.score && rank[1] > best.drops)) best = { index, pit, before, events, ...sc };
  });
  return best;
}

// Seed pace (ms per drop) so the turn fits the clip; never faster than `floor`, never slower than the hand's own pace.
function shape(turn) {
  const relays = turn.relays || 0, captures = turn.events.filter((e) => e.type === 'capture').length, drops = turn.drops || turn.events.filter((e) => e.type === 'drop').length;
  return { relays, captures, drops, fixed: (pace) => LEAD_MS + TAIL_MS + PICKUP_MS * (relays + 1) + SETTLE_MS * relays + CAPTURE_MS * captures + pace * relays };
}
export function clipPace(turn, pace = 150, floor = 45) {
  const { drops, fixed } = shape(turn);
  const room = CLIP_MS - fixed(pace);
  if (drops === 0 || room <= 0) return floor;
  return Math.max(floor, Math.min(pace, Math.floor(room / drops)));
}
// How long the clip should run at a given seed pace (a real browser at full frame rate).
export function clipLength(turn, pace = 150) {
  const { drops, fixed } = shape(turn);
  return fixed(pace) + clipPace(turn, pace) * drops;
}

// The words that travel with the clip.
export function clipCaption(turn, opponentName, game = 'ncho') {
  const name = game === 'ncho' ? 'Nchò' : 'Ayo';
  const bits = [];
  if (turn.relays) bits.push(`${turn.relays} relay${turn.relays === 1 ? '' : 's'}`);
  if (turn.seeds) bits.push(`${turn.seeds} seeds captured`);
  if (!bits.length) bits.push(`${turn.drops} seeds sown`);
  return `My best turn against ${opponentName} at ${name}: ${bits.join(', ')}. Ayo & Nchò — Nigerian Mancala in 3D.`;
}
