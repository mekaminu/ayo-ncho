// Your best ever (idea 7 Nov): the Game over card said the biggest turn of this game, never whether it was the biggest you
// have ever had. Now the phone keeps your bests for each game (Nchò and Ayo apart) — the most seeds won in one turn, the most
// pick-ups in one turn (Nchò's relays), the widest win and the quickest win — and the card says when a game beats one.
// Pure functions (no DOM), tested in node (test/bests.test.js). Every number comes from replaying the moves through
// engine/ayo.js, so a best is only ever what the engine says happened.
// Counted: games against the computer and with a friend in a room (your own turns, from your seat). Not counted: two of us
// (the phone cannot tell who sat where), the puzzle and play-outs (the moves before were nobody's). A game given up or agreed
// drawn still counts its turns, but never as a widest or quickest win (a friend giving up on move 6 is no record of yours).
// Storage shape: { ncho: {games, turn, relay, margin: [you, them] | null, quick}, ayo: {…}, last: <game id> }
import { newGame, applyMove, firstMover } from '../engine/ayo.js';

export const VARIANTS = ['ncho', 'ayo'];
// Nothing is called a best until this many games are behind it: in your first games every number is a best, and saying so
// each time would make the words mean nothing.
export const QUIET_GAMES = 3;

const fresh = () => ({ games: 0, turn: 0, relay: 0, margin: null, quick: 0 });
const nat = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);

export function parse(raw) {
  const out = { last: null }; for (const v of VARIANTS) out[v] = fresh();
  try {
    const s = JSON.parse(raw || 'null'); if (!s || typeof s !== 'object') return out;
    for (const v of VARIANTS) {
      const e = s[v]; if (!e || typeof e !== 'object') continue;
      out[v] = { games: nat(e.games), turn: nat(e.turn), relay: nat(e.relay), quick: nat(e.quick),
        margin: Array.isArray(e.margin) && e.margin.length === 2 && e.margin.every((n) => Number.isInteger(n) && n >= 0) && e.margin[0] > e.margin[1] ? [e.margin[0], e.margin[1]] : null };
    }
    if (s.last !== undefined && s.last !== null) out.last = s.last;
  } catch {}
  return out;
}

// One finished game, replayed from `player`'s seat: { turn, turnAt, relay, relayAt, won, score: [you, them], moves }.
//   turn   — the most seeds that came into your trough during one of your own turns (turnAt: its move index, from 0)
//   relay  — the most pick-ups after the first in one of your turns (relayAt: its move index); 0 in Ayo
//   won    — you won it by play (a game given up or agreed is never `won` here; pass `ended: 'played'` for a played game)
export function gameBests(moves, variant = 'ncho', rules = {}, player = 0, first, ended = 'played') {
  let s = newGame(variant, rules, firstMover(moves, first || 0));
  let turn = 0, turnAt = -1, relay = 0, relayAt = -1;
  moves.forEach((pit, i) => {
    const mover = s.turn; const before = s.stores[player]; const r = applyMove(s, pit); s = r.state;
    if (mover !== player) return;
    const got = s.stores[player] - before; if (got > turn) { turn = got; turnAt = i; }
    const relays = r.events.filter((e) => e.type === 'pickup' && e.relay).length; if (relays > relay) { relay = relays; relayAt = i; }
  });
  const score = [s.stores[player], s.stores[1 - player]];
  return { turn, turnAt, relay, relayAt, won: ended === 'played' && s.over && s.winner === player, score, moves: moves.length };
}

// Count a finished game once per game id. Returns { data, entry, news, counted }:
//   news — what this game beat, in the card's order: 'turn', 'relay', 'margin', 'quick' (empty within the first QUIET_GAMES
//          games, when every number is a best; the bests are still kept)
export function record(data, variant, g, gameId = null) {
  const d = { last: data.last }; for (const v of VARIANTS) d[v] = { ...data[v], margin: data[v].margin ? data[v].margin.slice() : null };
  if (!VARIANTS.includes(variant)) variant = 'ncho';
  const e = d[variant];
  if (gameId !== null && d.last === gameId) return { data: d, entry: e, news: [], counted: false };
  d.last = gameId;
  const loud = e.games >= QUIET_GAMES; const news = [];
  if (g.turn > e.turn) { e.turn = g.turn; news.push('turn'); }
  if (g.relay > e.relay) { e.relay = g.relay; news.push('relay'); }
  if (g.won) {
    const m = g.score[0] - g.score[1], old = e.margin ? e.margin[0] - e.margin[1] : 0;
    if (m > old || (e.margin && m === old && g.score[0] > e.margin[0])) { e.margin = g.score.slice(); news.push('margin'); }
    if (!e.quick || g.moves < e.quick) { e.quick = g.moves; news.push('quick'); }
  }
  e.games += 1;
  return { data: d, entry: e, news: loud ? news : [], counted: true };
}

// The card's line: "Your best ever · biggest turn, 18 seeds · 6 pick-ups in one turn · widest win, 30–18 · quickest win, 34 moves".
// Nothing when nothing was beaten. Each part is its own phrase, so the French follows part by part.
export function bestsWords(news, entry) {
  if (!news || !news.length) return '';
  const parts = ['Your best ever'];
  for (const k of news) {
    if (k === 'turn') parts.push(`biggest turn, ${entry.turn} ${entry.turn === 1 ? 'seed' : 'seeds'}`);
    else if (k === 'relay') parts.push(`${entry.relay} ${entry.relay === 1 ? 'pick-up' : 'pick-ups'} in one turn`);
    else if (k === 'margin' && entry.margin) parts.push(`widest win, ${entry.margin[0]}–${entry.margin[1]}`);
    else if (k === 'quick') parts.push(`quickest win, ${entry.quick} moves`);
  }
  return parts.join(' · ');
}

// The move to light on the card for the best that leads the line (the turn, else the relay), or -1 for a whole-game best.
export function bestMove(news, g) {
  if (news.includes('turn')) return g.turnAt;
  if (news.includes('relay')) return g.relayAt;
  return -1;
}
