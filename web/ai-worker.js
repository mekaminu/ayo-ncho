// The opponent thinks here, off the main thread, so the board never stutters. Each request carries an id so a hint, the opponent's
// move and Mama Ngozi's take (`rate`: every move rated, best first) can be asked for in turn and each answer finds its own promise.
import { chooseMove, rateMoves } from '/engine/ai.js';
self.onmessage = (e) => { const { id, state, level, rate } = e.data; self.postMessage({ id, result: rate ? rateMoves(state, level) : chooseMove(state, level) }); };
