// The opponent thinks here, off the main thread, so the board never stutters. Each request carries an id so a hint, the opponent's
// move and Mama Ngozi's take (`rate`: every move rated, best first) can be asked for in turn
// (`play`: the opponent's own move in a game, where Mama Ngozi may pick any of her near-equal best; a hint asks for her one best;
// `lean`: who is ahead by her count, for the bead on the board's centre line) and each answer finds its own promise.
import { chooseMove, rateMoves, playMove, leanOf } from '/engine/ai.js';
// A search that throws answers with its error (8 Nov, never stuck on "thinking…"): the page then answers the question itself (web/asker.js).
self.onmessage = (e) => { const { id, state, level, rate, play, lean } = e.data;
  let result; try { result = lean ? leanOf(state) : rate ? rateMoves(state, level) : play ? playMove(state, level) : chooseMove(state, level); }
  catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); return; }
  self.postMessage({ id, result }); };
