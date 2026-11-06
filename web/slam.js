// Every seed they have: in Ayo (and Oware, Awalé) a move whose last seed would capture every seed on the other side
// captures nothing — the grand slam rule. The path marks drew no capture rings for it and the turn just ended, so a learner
// saw a capture vanish with no reason given. Now the engine marks it (the last drop carries `slam: { pits, n }`: what it
// would have taken) and this file only reads and words it; nothing about the rule lives here. Pure, no DOM.
import { owner } from '../engine/ayo.js';

// The grand slam in a move's events, if there is one: { pit (where the last seed landed), pits, n, by (who sowed) }.
export function slamOf(events) {
  const e = (events || []).find((x) => x.type === 'drop' && x.slam);
  if (!e) return null;
  const first = events.find((x) => x.type === 'pickup');
  return { pit: e.pit, pits: e.slam.pits.slice(), n: e.slam.n, by: first ? owner(first.pit) : null };
}

// The words for the hint line (first tap) and their move's chip (played), from your seat. Two parts, joined by " · "
// with the rest of the line: "would take all 7 they have · a grand slam takes nothing".
export const SLAM_RULE = 'a grand slam takes nothing';
export function slamWords(slam, { you = 0, played = false } = {}) {
  if (!slam) return '';
  const whose = slam.by === you ? (played ? 'they had' : 'they have') : (played ? 'you had' : 'you have');
  return `${played ? 'would have taken' : 'would take'} all ${slam.n} ${whose} · ${SLAM_RULE}`;
}

// What the board says as the turn's last seed lands (a toast): who sowed decides the words.
export function slamMoment(slam, { you = 0 } = {}) {
  if (!slam) return '';
  return slam.by === you ? 'Grand slam: that was every seed they have, so nothing is taken' : 'Grand slam: that was every seed you have, so nothing is taken';
}

// Told once on a phone, the first time a picked move would make one (the note under the toast):
export const SLAM_NOTE = 'In Ayo a move that would take every seed on the other side takes nothing. Leave them a seed, or take less.';
