// The opponent thinks here, off the main thread, so the board never stutters. Each request carries an id so a hint, the opponent's
// move and Mama Ngozi's take (`rate`: every move rated, best first) can be asked for in turn
// (`play`: the opponent's own move in a game, where Mama Ngozi may pick any of her near-equal best; a hint asks for her one best) and each answer finds its own promise.
import { chooseMove, rateMoves, playMove } from '/engine/ai.js';
self.onmessage = (e) => { const { id, state, level, rate, play } = e.data; self.postMessage({ id, result: rate ? rateMoves(state, level) : play ? playMove(state, level) : chooseMove(state, level) }); };
