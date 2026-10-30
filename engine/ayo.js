// Ayo & Nchò rules engine — shared by server and browser. Pure functions, no DOM.
//
// Board layout (indices):
//   Player 0 ("south") owns pits 0..5, sowing runs 0 → 5 then into player 1's 6 → 11, then back to 0.
//   Player 1 ("north") owns pits 6..11.
//   stores[p] holds captured seeds for player p.
//
// Variants:
//   "ayo"  — Yoruba Ayo / Oware rules: capture when the LAST seed lands in an opponent pit making 2 or 3,
//            sweeping backwards through consecutive opponent pits that are also 2 or 3. Lap skips the origin pit.
//            Feed rule; a move that would capture ALL the opponent's seeds captures nothing (grand slam).
//   "ncho" — Nchò, the way Meka's family plays (confirmed 29 Oct 2026). RELAY sowing: when the last seed in hand
//            lands in an occupied pit, that pit is picked up and sowing continues; the turn ends when the last seed
//            lands in an empty pit or is captured. Any pit that reaches 4 goes to the OWNER of that side, whoever
//            sowed; except that if the last seed in hand makes a pit on the opponent's side 4, the SOWER takes it.
//            Several pits can be captured in one turn. With 8 seeds left, whoever captures next takes all 8;
//            fewer than 4 left (total bankruptcy) ends the game the same way. A position repeating 3 times in one
//            turn ends the turn. Feed rule applies.

export const PITS = 12;
export const PER_SIDE = 6;
export const TOTAL_SEEDS = 48;
export const WIN_SEEDS = 25;
export const QUIET_LIMIT = 60; // moves without a capture before the game is called

export const VARIANTS = ["ncho", "ayo"];
// Each game is a bundle of rule switches; a custom game can mix them (Settings → Rules).
export const RULES = {
  ncho: { capture: 4, relay: true, last8: true },   // capture on 4 (to the side's owner; last seed on their side to the sower), relay sowing, last 8 to the next capturer
  ayo:  { capture: 23, relay: false, last8: false }, // capture on 2 or 3 by the last seed, sweeping back; grand slam; single lap
};
export function newGame(variant = "ncho", overrides = {}) {
  return {
    variant,
    rules: { ...(RULES[variant] || RULES.ncho), ...overrides },
    pits: Array(PITS).fill(4),
    stores: [0, 0],
    turn: 0,            // player to move
    moves: [],          // history of pit indices
    quiet: 0,           // moves since the last capture (stalemate rule)
    over: false,
    winner: null,       // 0, 1, or "draw"
  };
}

export function owner(pit) { return pit < PER_SIDE ? 0 : 1; }
export function sideOf(player) {
  const s = player * PER_SIDE;
  return [s, s + 1, s + 2, s + 3, s + 4, s + 5];
}
export function opponent(player) { return 1 - player; }

export function seedsOnSide(state, player) {
  return sideOf(player).reduce((n, i) => n + state.pits[i], 0);
}

// Simulate a sow without applying captures; returns {pits, last} after sowing.
function sow(pits, from) {
  const p = pits.slice();
  let n = p[from];
  p[from] = 0;
  let i = from;
  while (n > 0) {
    i = (i + 1) % PITS;
    if (i === from) continue; // lap: skip the origin pit
    p[i] += 1;
    n -= 1;
  }
  return { pits: p, last: i };
}

// Ayo captures: sweep backwards from `last` while it is an opponent pit with 2 or 3 seeds.
function ayoCaptures(pits, last, player) {
  const taken = [];
  let i = last;
  while (owner(i) === opponent(player) && (pits[i] === 2 || pits[i] === 3)) {
    taken.push(i);
    i = (i - 1 + PITS) % PITS;
  }
  return taken; // pit indices, nearest-last first
}

// Returns the legal moves for the player to move, honouring the feed rule.
export function legalMoves(state) {
  if (state.over) return [];
  const me = state.turn;
  const mine = sideOf(me).filter((i) => state.pits[i] > 0);
  if (mine.length === 0) return [];
  const oppEmpty = seedsOnSide(state, opponent(me)) === 0;
  if (!oppEmpty) return mine;
  // Feed rule: if the opponent has nothing, you must play a move that gives them seeds, if one exists.
  const feeding = mine.filter((i) => sow(state.pits, i).pits.slice(opponent(me) * PER_SIDE, opponent(me) * PER_SIDE + PER_SIDE).some((n) => n > 0));
  return feeding.length ? feeding : mine;
}

// Apply a move. Returns a NEW state plus an `events` list the UI animates:
//   {type:"pickup", pit, n} {type:"drop", pit} … {type:"capture", pits:[...], by, n} {type:"end", winner}
//   (the Nchò last-8 / bankruptcy sweep is a capture with last8: true)
export function applyMove(state, pit) {
  if (state.over) throw new Error("game over");
  if (owner(pit) !== state.turn) throw new Error("not your pit");
  if (state.pits[pit] === 0) throw new Error("empty pit");
  if (!legalMoves(state).includes(pit)) throw new Error("must feed the opponent");

  const me = state.turn;
  const rules = state.rules || RULES[state.variant] || RULES.ncho;
  const events = [{ type: "pickup", pit, n: state.pits[pit] }];
  const stores = state.stores.slice();
  const pits = state.pits.slice();
  let captured = [];
  const boardBefore = pits.reduce((a, b) => a + b, 0);
  let n = pits[pit]; pits[pit] = 0; let i = pit; let origin = pit;
  const seen = new Map(); let drops = 0;
  while (n > 0) {
    i = (i + 1) % PITS;
    if (i === origin) continue; // a lap skips the pit the hand was lifted from
    pits[i] += 1; n -= 1; drops += 1;
    events.push({ type: "drop", pit: i });
    if (rules.capture === 4 && pits[i] === 4) {
      const by = (n === 0 && owner(i) !== me) ? me : owner(i);
      stores[by] += 4; pits[i] = 0; captured.push(i);
      events.push({ type: "capture", pits: [i], by, n: 4 });
      continue;
    }
    if (n === 0) {
      if (rules.capture === 23) {
        // Ayo: the last seed making an opponent pit 2 or 3 captures it and every pit behind it that is also 2 or 3.
        let taken = ayoCaptures(pits, i, me);
        const oppTotal = sideOf(opponent(me)).reduce((a, k) => a + pits[k], 0);
        const takeTotal = taken.reduce((a, k) => a + pits[k], 0);
        if (taken.length && takeTotal === oppTotal) taken = []; // grand slam captures nothing
        if (taken.length) {
          let got = 0; for (const k of taken) { got += pits[k]; pits[k] = 0; }
          stores[me] += got; captured = captured.concat(taken);
          events.push({ type: "capture", pits: taken.slice(), by: me, n: got });
          break;
        }
      }
      // Relay sowing: the last seed landing in an occupied pit picks that pit up and carries on.
      if (rules.relay && pits[i] > 1) {
        const key = pits.join(",") + "|" + i; const times = (seen.get(key) || 0) + 1; seen.set(key, times);
        if (times >= 3 || drops > 400) break; // the same position three times in one turn: the turn ends here
        n = pits[i]; pits[i] = 0; origin = i;
        events.push({ type: "pickup", pit: i, n, relay: true });
      }
    }
  }
  // Last 8 / total bankruptcy (Nchò): whoever captured last takes what is left when 8 or fewer were on the board,
  // or when fewer than 4 remain and no pit can ever fill again.
  if (rules.last8) {
    const left = pits.reduce((a, b) => a + b, 0);
    if (left > 0 && ((captured.length && boardBefore <= 8) || left < 4)) {
      const lastCap = events.filter((e) => e.type === "capture").pop();
      const by = lastCap ? lastCap.by : (stores[0] >= stores[1] ? 0 : 1); const taken = [];
      for (let k = 0; k < PITS; k++) if (pits[k]) { taken.push(k); }
      stores[by] += left; for (const k of taken) pits[k] = 0;
      events.push({ type: "capture", pits: taken, by, n: left, last8: true }); // the sweep: the UI can say "the last 6 go to …"
    }
  }

  const next = {
    ...state,
    pits,
    stores,
    turn: opponent(me),
    moves: state.moves.concat(pit),
    quiet: captured.length ? 0 : (state.quiet || 0) + 1,
  };
  finish(next, events);
  return { state: next, events };
}

// Decide whether the game has ended and settle leftover seeds.
function finish(state, events) {
  const a = state.stores[0], b = state.stores[1];
  if (a >= WIN_SEEDS || b >= WIN_SEEDS) {
    state.over = true; state.winner = a > b ? 0 : 1;
  } else if (legalMoves(state).length === 0) {
    // player to move has nothing (and could not be fed): the other side keeps its remaining seeds
    const other = opponent(state.turn);
    state.stores[other] += seedsOnSide(state, other);
    for (const i of sideOf(other)) state.pits[i] = 0;
    state.over = true;
    const [x, y] = state.stores;
    state.winner = x === y ? "draw" : (x > y ? 0 : 1);
  } else if (a === 24 && b === 24) {
    state.over = true; state.winner = "draw";
  } else if (state.quiet >= QUIET_LIMIT) {
    // Stalemate: the last seeds just circle. Each player keeps the seeds on their own side.
    for (const p of [0, 1]) { state.stores[p] += seedsOnSide(state, p); for (const i of sideOf(p)) state.pits[i] = 0; }
    state.over = true;
    const [x, y] = state.stores;
    state.winner = x === y ? "draw" : (x > y ? 0 : 1);
  }
  if (state.over) events.push({ type: "end", winner: state.winner });
}

// Replay a move list from the start (used for undo, replay and server verification).
export function replay(moves, variant = "ncho", overrides = {}) {
  let s = newGame(variant, overrides);
  for (const m of moves) s = applyMove(s, m).state;
  return s;
}

export function totalSeeds(state) {
  return state.pits.reduce((a, b) => a + b, 0) + state.stores[0] + state.stores[1];
}
