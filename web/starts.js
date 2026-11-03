// Who starts: at a real board the loser of the last game moves first (after a draw, the other side does).
// Pure functions (no DOM), tested in node (test/starts.test.js). Seats are engine seats: against the computer you are 0;
// two of us, Player 1 is 0. A room's server already starts the loser (server/rooms.js rematch).

export const STARTS = ['loser', 'you', 'them']; // Settings → Rules → Who starts; "loser" is the default, as at a real board

// The last finished game against this opponent (or between the two of us), kept on the phone: { first, winner }.
export function parseStarts(raw) {
  try { const d = typeof raw === 'string' ? JSON.parse(raw) : raw; if (d && typeof d === 'object' && !Array.isArray(d)) return d; } catch {}
  return {};
}
export function recordStart(data, key, first, winner) {
  if (first !== 0 && first !== 1) return data;
  if (winner !== 0 && winner !== 1 && winner !== 'draw') return data;
  return { ...data, [key]: { first, winner } };
}

// Who moves first in the next game, and why: { first: 0|1, why: 'first' | 'lost' | 'draw' | 'set' }.
export function nextStart(pref, last) {
  if (pref === 'you') return { first: 0, why: 'set' };
  if (pref === 'them') return { first: 1, why: 'set' };
  if (!last || (last.first !== 0 && last.first !== 1)) return { first: 0, why: 'first' };
  if (last.winner === 0) return { first: 1, why: 'lost' };
  if (last.winner === 1) return { first: 0, why: 'lost' };
  if (last.winner === 'draw') return { first: 1 - last.first, why: 'draw' };
  return { first: 0, why: 'first' };
}

// What the toast says as the game starts. names: [seat 0's name, seat 1's name]; you: true against the computer
// (seat 0 reads "You"), false for two of us.
export function startWords(start, names, vsComputer = true) {
  const who = start.first === 0 && vsComputer ? 'You' : names[start.first];
  const verb = who === 'You' ? 'start' : 'starts';
  const why = start.why === 'lost' ? ' — the loser goes first' : start.why === 'draw' ? ' — after a draw, the other side goes first' : '';
  return `${who} ${verb}${why}`;
}
