// The opponent thinks here, off the main thread, so the board never stutters.
import { chooseMove } from '/engine/ai.js';
self.onmessage = (e) => { const { state, level } = e.data; self.postMessage(chooseMove(state, level)); };
