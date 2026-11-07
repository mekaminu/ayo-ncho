// Look from above (idea 7 Nov): the board is seen as from a chair at the table, tilted away from you, which is the
// approved look and the best one for the carved wood and the lamp. But counting is the game, and on the tilted board the
// far row's pits are smaller and their seeds hide behind each other; the mancala apps on the stores all offer a flat,
// top-down board for the players who count. Settings → Board → Look: At the table (as before) or From above, which
// stands the camera nearly straight over the board (still a touch of tilt, so the pits stay bowls and the seeds stay round),
// the board framed as large as the screen allows. The change glides; a drag, the keys and a double-tap all keep to it
// (a double-tap puts it back to from above, not to the table). The Fold half folded already looks nearly straight down.
// Pure helpers, no DOM, tested in node (test/look.test.js). The framing itself stays in web/game.js.

export const VIEWS = ['table', 'above'];
export const ABOVE_PHI = 0.16; // the tilt from straight down, in radians (the table's is 0.5–0.86, the Fold half folded 0.3)
export const GLIDE_MS = 620;

export const lookPref = (v) => (v === 'above' ? 'above' : 'table');
// what the page uses: ?look=above|table (for the renders) wins over the saved choice
export const lookNow = (saved, param) => lookPref(param === 'above' || param === 'table' ? param : saved);

// the tilt the board rests at: the one the framing chose for this screen, or from above (never more tilted than that)
export const restPhi = (look, chosen) => (look === 'above' ? Math.min(chosen, ABOVE_PHI) : chosen);

// how far up a drag or the ↓ key may tilt it: as before, or down to where the board rests if that is lower still
export const phiFloor = (fitPhi, min = 0.35) => Math.min(min, fitPhi);

export const lookNote = (look) => (look === 'above' ? 'from above, flat under you, for counting' : 'as at a table, tilted away from you');
export const lookToast = (look) => (look === 'above' ? 'The board from above' : 'The board as at the table');
