// How to play says the rules you play (idea 10 Nov, small hours). The How to play card used to show one of two fixed
// lists, the usual Nchò or the usual Ayo, chosen by the game's name alone — but Settings → Rules mixes the switches
// (capture on 4 or on 2 & 3, relay or one lap, the last 8 or not), and a room plays the rules its host chose, so a family
// game of Nchò with one lap, or Ayo with captures on 4, read rules it was not being played by. Now the card's lines are
// built from the rules the game on the board is played with (state.rules, the same object engine/ayo.js applies), one
// line per switch, and a game whose rules are not its name's usual ones says so at the top of the list.
// Pure functions (no DOM), so test/rulesays.test.js checks every mix of the switches against the engine itself.
// The English here is the source; web/i18n.js has each line's French.
import { RULES, cleanRules, isVariant } from '../engine/ayo.js';

export const LINES = {
  pits: 'Your six pits are the column on the right. Tap one with seeds to pick them all up.',
  sow: 'They are sown one per pit anticlockwise: up your side, then down the other side.',
  lap: 'With 12 or more in your hand, the pit you picked up from is skipped as they go round.',
  relay4: 'If your last seed lands in a pit that has seeds, you pick that pit up and keep going. Your turn ends when the last seed lands in an empty pit.',
  relay23: 'If your last seed takes nothing and lands in a pit that has seeds, you pick that pit up and keep going. Your turn ends with a capture or in an empty pit.',
  round: 'If the hand comes back to the same seeds in the same pits a third time in one turn, the turn stops there.',
  oneLap: 'Your turn ends where your last seed lands.',
  four: 'Any pit that reaches 4 seeds is taken by the owner of that side — whoever sowed it.',
  fourLast: 'Except: if your last seed makes a pit on their side 4, you take it.',
  twoThree: "If your last seed makes an opponent's pit 2 or 3, you capture it, and every pit behind it that is also 2 or 3.",
  slam: 'But a move that would take every seed they have takes nothing.',
  feed: 'If the other side is empty, you must give them seeds when you can.',
  feedLap: 'It is the seeds you lift that must reach them: a pit that gets there only by the relay does not count.',
  last8: 'With 8 seeds left, whoever makes the next capture takes them all. Most seeds wins.',
  win: 'First to 25 seeds wins.',
};
export const NOT_USUAL = {
  ncho: 'Not the usual Nchò — these are the rules this game is played with.',
  ayo: 'Not the usual Ayo — these are the rules this game is played with.',
};

// The lines for a game's rules, in the order a player meets them: where your pits are, how seeds go round, when the
// turn ends, what is captured, feeding, how it ends.
export function ruleKeys(rules) {
  const r = cleanRules('ncho', rules || {});
  const k = ['pits', 'sow', 'lap'];
  if (r.relay) k.push(r.capture === 4 ? 'relay4' : 'relay23', 'round'); else k.push('oneLap');
  if (r.capture === 4) k.push('four', 'fourLast'); else k.push('twoThree', 'slam');
  k.push('feed'); if (r.relay) k.push('feedLap'); // relay sowing: the feed counts the seeds you lift (engine legalMoves)
  k.push(r.last8 ? 'last8' : 'win');
  return k;
}
export function ruleLines(rules) { return ruleKeys(rules).map((k) => LINES[k]); }

// Is this game played by its name's usual rules? (Settings → Rules, or the room's host, may have changed a switch.)
export function usual(variant, rules) {
  const v = isVariant(variant) ? variant : 'ncho'; const r = cleanRules(v, rules || {}); const base = RULES[v];
  return Object.keys(base).every((k) => r[k] === base[k]);
}
// What the card shows: its lines, and the line that says the rules are not the usual ones (or null).
export function rulesCard(variant, rules) {
  const v = isVariant(variant) ? variant : 'ncho';
  return { lines: ruleLines(cleanRules(v, rules || {})), note: usual(v, rules) ? null : NOT_USUAL[v] };
}
