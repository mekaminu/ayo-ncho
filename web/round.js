// Round and round (idea 10 Nov): in Nchò's relay sowing the hand can come back to the very same seeds in the very same
// pits, and from there it would go round for ever — so the family's rule stops the turn the third time a position comes
// round in one turn. Late in a game, with a dozen seeds spread thin, that turn ran 300 seeds and more: about a minute and a
// half of the hand going round the same loop twice at the sowing pace, and then the turn stopped on seeds, which the rules
// card says never happens. Now the engine marks it (a relay pickup of a position already seen this turn carries round: 2;
// the last drop of a turn stopped the third time carries round: 3) and this file only reads and words it: the moment the
// hand comes round again the board says so and plays the rest of the turn hurried (every seed still flies), and when it
// stops it says why. Nothing about the rule lives here. Pure, no DOM (test/round.test.js).
import { owner } from '../engine/ayo.js';

// The round in a move's events, if there is one: { again (index of the event where the hand first comes round again),
// stop (the pit the turn stopped in, or null when it did not stop for it), by (who sowed), drops, after (drops still to come
// once it comes round again) }.
export function roundOf(events) {
  const ev = events || []; const again = ev.findIndex((e) => e.type === 'pickup' && e.round === 2);
  const last = ev.filter((e) => e.type === 'drop').pop();
  const stop = last && last.round === 3 ? last.pit : null;
  if (again < 0 && stop === null) return null;
  const first = ev.find((e) => e.type === 'pickup');
  const drops = ev.filter((e) => e.type === 'drop').length;
  const after = again < 0 ? 0 : ev.slice(again).filter((e) => e.type === 'drop').length;
  return { again, stop, by: first ? owner(first.pit) : null, drops, after };
}

// The words. One phrase each, no " · " or " — " inside, so the page's French takes them whole.
export const ROUND_PATH = 'goes round and round, so it stops the third time';   // the hint line on the first tap
export const ROUND_PLAYED = 'went round and round, so it stopped the third time'; // their move, explained
export const ROUND_AGAIN = 'Round and round: the same seeds have come round again, so it stops the next time they do'; // as it comes round
export const ROUND_STOP = 'Round and round: the same seeds came round a third time, so the turn stops here';            // as it stops
export function roundWords(round, { played = false } = {}) { return round && round.stop !== null ? (played ? ROUND_PLAYED : ROUND_PATH) : ''; }

// Should the board hurry the rest of the turn by itself? Once it has come round again, the rest is the same loop over,
// so yes — unless a clip is being recorded (it keeps its own timing) or the turn is already hurried.
export function autoHurry(round, { clipping = false, already = false } = {}) { return !!round && round.again >= 0 && !clipping && !already; }
