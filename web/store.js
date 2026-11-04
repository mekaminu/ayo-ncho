// The store screen (L11), as Meka approved it on 30 Oct with a Gold card at its top: what each row says and what its button
// does, from what this phone owns (web/entitle.js). Looks only, never a win. Pure functions, no DOM, so they are tested in node.
//
// Prices are never written here: inside the apps they come from Apple's and Google's own stores (L12 hands them in as
// `prices`, product id → the store's own price text); until then a row says "Soon". The web link sells nothing, so there every
// button that would buy says "Get the app".
//
// A tap on a board or a seed set (not its button) puts it on the live board behind the screen for a look, owned or not;
// leaving the store puts your own back. Nothing tried is ever kept.

import { LOOKS, WOODS, BUNDLE, GOLD_LEVELS, GOLD_FEATURES, owns, lookOpen, levelOpen, featureOpen } from './entitle.js';

export const GOLD = 'gold';

// What Gold opens, in the order the card lists it; `ready` says whether it is in the game yet (the puzzle archive and your
// games wait on Meka's yes to their mockups).
export const GOLD_OPENS = [
  { id: 'master', what: 'Papa Ike, the Master', ready: true },
  { id: 'review', what: "Mama Ngozi's review of every game", ready: true },
  { id: 'archive', what: 'every past daily puzzle', ready: false },
  { id: 'history', what: 'your games and your rating over time', ready: false },
];

// The rows, in the mockup's order and words.
export const BOARDS = [
  { id: 'mahogany', name: 'Mahogany', sub: 'the family board' },
  { id: 'iroko', name: 'Iroko', sub: 'pale and open-grained' },
  { id: 'ebony', name: 'Ebony', sub: 'near black, close-grained' },
  { id: 'benin', name: 'Benin bronze', sub: 'cast bronze, green in the bowls, the court braid down the middle' },
  { id: 'grandpa', name: "Grandpa's board", sub: 'fifty years of play worn into the pits' },
];
export const SEEDS = [
  { id: 'jobs', name: "Job's tears", sub: 'grey-green, the real thing' },
  { id: 'stones', name: 'River stones', sub: 'grey pebbles' },
  { id: 'cowries', name: 'Cowries', sub: "the market's own money, slit and all" },
  { id: 'kernels', name: 'Palm kernels', sub: 'dark shells netted with fibre' },
];
export const BUNDLE_ROW = { id: 'bundle', product: BUNDLE, name: 'The whole market', sub: 'every board and seed set, now and the ones to come' };

// The price text for a product: the store's own inside the apps, "Soon" until the store hands it over, "Get the app" on the web.
export function priceLabel(product, { inApp = false, prices = null } = {}) {
  if (!inApp) return 'Get the app';
  const p = prices && prices[product];
  return typeof p === 'string' && p.trim() ? p.trim() : 'Soon';
}

// One row of the screen: { id, name, sub, kind, product?, state, button, trying }.
//   state: 'on' (on the board now) · 'use' (yours, tap to use) · 'buy' (in the store) · 'earn' (river stones, by days played)
//   'yours' (Gold or the bundle, bought). `button` is the words on its button.
function lookRow(row, kind, ctx) {
  const { owned, preview, stones, days, need, current, trying } = ctx;
  const L = LOOKS[row.id];
  const mine = kind === 'board' ? (WOODS.includes(row.id) || lookOpen(row.id, owned, preview)) : row.id === 'jobs' || (row.id === 'stones' ? stones : lookOpen(row.id, owned, preview));
  const on = mine && current === row.id;
  let state, button, sub = row.sub;
  if (on) { state = 'on'; button = 'On the board'; }
  else if (mine) { state = 'use'; button = 'Use'; }
  else if (row.id === 'stones') { state = 'earn'; button = `${Math.min(days, need)} of ${need} days`; }
  else { state = 'buy'; button = priceLabel(L.product, ctx); }
  if (row.id === 'stones') sub += stones ? ` · yours: ${need} days played` : ` · earned: ${need} days played`;
  else if (!L) sub += ' · yours';
  else if (owns(owned, L.product) || owns(owned, BUNDLE)) sub += ' · yours';
  else if (mine) sub += ' · open for this visit';
  return { id: row.id, name: row.name, sub, kind, product: L ? L.product : null, state, button, trying: trying === row.id };
}

// The whole screen: Gold, the board now, the boards, the seed sets, the bundle.
//   ctx: { owned (a Set), preview (?try=…), stones (earned), days, need, finish (yours now), seeds (yours now),
//          tryFinish / trySeeds (what is on the board for a look), inApp, prices }
export function storeView(ctx) {
  const c = { owned: null, preview: null, stones: false, days: 0, need: 7, inApp: false, prices: null, ...ctx };
  const boards = BOARDS.map((r) => lookRow(r, 'board', { ...c, current: c.finish, trying: c.tryFinish }));
  const seeds = SEEDS.map((r) => lookRow(r, 'seeds', { ...c, current: c.seeds, trying: c.trySeeds }));
  const gold = owns(c.owned, GOLD);
  const goldOpenNow = !gold && GOLD_LEVELS.every((l) => levelOpen(l, c.owned, c.preview)) && GOLD_FEATURES.every((f) => featureOpen(f, c.owned, c.preview));
  const bundle = owns(c.owned, BUNDLE);
  const allLooks = Object.values(LOOKS).every((L) => owns(c.owned, L.product)) || bundle;
  return {
    gold: { product: GOLD, state: gold ? 'yours' : 'buy', button: gold ? 'Yours' : priceLabel(GOLD, c), opens: GOLD_OPENS.map((o) => ({ ...o })),
      sub: gold ? 'Yours — thank you' : goldOpenNow ? 'Open for this visit · one upgrade, once' : 'One upgrade, once · never a win bought' },
    now: nowLine(c),
    boards, seeds,
    bundle: { ...BUNDLE_ROW, state: allLooks ? 'yours' : 'buy', button: allLooks ? 'Yours' : priceLabel(BUNDLE, c) },
    note: c.inApp ? 'Prices come from the App Store or Google Play. Purchases are kept on the phone and restored from the store.' : 'The web link sells nothing: the boards, seed sets and Gold are bought in the app. Tap any look to see it on the board.',
  };
}

// The card at the top: what is on the board now, or what is being tried on it.
export function nowLine({ finish, seeds, tryFinish = null, trySeeds = null }) {
  const b = BOARDS.find((r) => r.id === (tryFinish || finish)) || BOARDS[0], s = SEEDS.find((r) => r.id === (trySeeds || seeds)) || SEEDS[0];
  const trying = !!(tryFinish && tryFinish !== finish) || !!(trySeeds && trySeeds !== seeds);
  return { tag: trying ? 'Trying on the board' : 'Your board now', title: `${b.name} · ${s.name}`, words: trying ? 'Only a look: Back puts your own board and seeds back.' : 'Everything here is a look: a board or a seed. Nothing changes how the seeds fall or who wins.', trying };
}

// What a tap on a button does: { act, id, words? }.
//   'use' — make it yours on the board (kept); 'try' — put it on the board for a look; 'buy' — ask the store (L12);
//   'say' — words only (the web link, the store not ready yet, river stones not earned yet, already yours).
export function tapAction(row, { inApp = false, prices = null, days = 0, need = 7 } = {}) {
  if (row.state === 'use') return { act: 'use', id: row.id };
  if (row.state === 'on' || row.state === 'yours') return { act: 'say', words: row.id === 'gold' || row.product === GOLD ? 'Gold is yours' : `${row.name} ${row.kind === 'seeds' ? 'are' : 'is'} yours` };
  if (row.state === 'earn') return { act: 'try', id: row.id, words: `River stones come with ${need} days played — ${days} so far. Here they are on the board for a look.` };
  const name = row.name || 'Gold';
  if (!inApp) return { act: row.kind ? 'try' : 'say', id: row.id, words: `${name} ${row.kind === 'seeds' ? 'are' : 'is'} bought in the app — the web link sells nothing. Ayo & Nchò comes to the App Store and Google Play soon.` };
  const price = prices && prices[row.product];
  if (!price) return { act: row.kind ? 'try' : 'say', id: row.id, words: `Buying ${name} comes to the app soon` };
  return { act: 'buy', id: row.id, product: row.product };
}

// What "Restore purchases" says before the store is wired (L12).
export function restoreWords(inApp) {
  return inApp ? 'Restoring comes with buying, in the app soon' : 'Purchases live in the app — the web link has nothing to restore';
}
