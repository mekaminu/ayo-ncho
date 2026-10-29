// Shouts: the quick things you say across the board while playing a friend online.
// Shared by the board (web/game.js) and the server (server/rooms.js): only an id travels, never free text,
// so nothing rude or long can be typed at a child. Each shout has a little knock pattern the receiving phone plays.
export const SHOUTS = [
  { id: 'oya',  text: 'Oya, your move!', knocks: [1.2, 1.7] },
  { id: 'chai', text: 'Chai!',           knocks: [0.7] },
  { id: 'haha', text: 'Ha ha!',          knocks: [1.4, 1.4, 1.4] },
  { id: 'well', text: 'Well played',     knocks: [1.0, 1.3, 1.6] },
  { id: 'wait', text: 'Not so fast',     knocks: [0.9, 0.6] },
  { id: 'ewo',  text: 'Ewo!',            knocks: [1.8, 0.9] },
  { id: 'gg',   text: 'Good game',       knocks: [1.2, 1.5, 1.9] },
  { id: 'brb',  text: 'One minute…',     knocks: [0.8] },
];
export const SHOUT_GAP_MS = 1500; // one shout at a time per seat: no flooding the other phone
export const SHOUT_SHOW_MS = 2600; // how long a shout stays on the screen

const byId = new Map(SHOUTS.map((s) => [s.id, s]));
export function isShout(id) { return byId.has(id); }
export function shoutText(id) { const s = byId.get(id); return s ? s.text : ''; }
export function shoutKnocks(id) { const s = byId.get(id); return s ? s.knocks.slice() : []; }
// May this seat shout now? lastAt is when it last shouted (0 or undefined for never).
export function mayShout(lastAt, now, gap = SHOUT_GAP_MS) { return !lastAt || now - lastAt >= gap; }
