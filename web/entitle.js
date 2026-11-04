// Gold and the looks: what this phone owns, behind one module (L9 grows it; web/purchase.js fills 'ayo.owned' from Apple's
// and Google's own purchases inside the apps). The web link never sells anything and says "in the app".
// Pure functions, no DOM, so they are tested in node.
//
// Gold opens Master (Papa Ike, L7) and Mama Ngozi's review of a whole game (L9); later the puzzle archive and your history (L9).

export const GOLD_LEVELS = ['master'];
export const GOLD_FEATURES = ['review']; // Mama Ngozi's review of a whole game, from the Game over card (web/review.js)

// What this phone owns, from what the game kept ('["gold"]'); anything unreadable owns nothing.
export function parseOwned(raw) {
  try { const a = JSON.parse(raw || '[]'); return new Set(Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []); } catch { return new Set(); }
}
export const owns = (owned, item) => !!owned && owned.has(item);

// A look at Gold before it can be bought, for that visit only (never kept), so Meka and the testers can try it now:
// `?try=master` opens Papa Ike, `?try=review` Mama Ngozi's review, `?try=gold` all of Gold. Gone once purchases exist (L12).
const PREVIEWS = ['master', 'review', 'gold', 'looks']; // ?try=looks: the store's looks (both boards, both seed sets) for the visit
export function previewOf(search) {
  try { const t = new URLSearchParams(search || '').get('try'); return PREVIEWS.includes(t) ? t : null; } catch { return null; }
}
const previewed = (what, preview) => !!preview && (preview === what || preview === 'gold');

// Whether an opponent can be played on this phone.
export function levelOpen(level, owned, preview = null) {
  return !GOLD_LEVELS.includes(level) || owns(owned, 'gold') || previewed(level, preview);
}
// The opponent to play: a Gold one this phone cannot open falls back to Mama Ngozi (Hard).
export function playable(level, owned, preview = null) { return levelOpen(level, owned, preview) ? level : 'hard'; }

// Whether a Gold feature (the review) can be used on this phone.
export function featureOpen(feature, owned, preview = null) {
  return !GOLD_FEATURES.includes(feature) || owns(owned, 'gold') || previewed(feature, preview);
}

// What a tap on a locked Gold opponent (or feature: "Mama Ngozi's review") says: on the web link "in the app"; in the apps, where it is in the store.
export function lockedWords(name, inApp) {
  return inApp ? `${name} plays in Gold — it's in the store (the bag on Home)` : `${name} plays in Gold, in the app — the web link sells nothing`;
}
export function featureLockedWords(what, inApp) {
  return inApp ? `${what} is part of Gold — it's in the store (the bag on Home)` : `${what} is part of Gold, in the app — the web link sells nothing`;
}

// The looks sold in the store (L10/L11): looks only, never a win. Each is its own product (the ids L12 creates in the stores),
// and the bundle owns every one. Gold is depth and teaching, so it does not open looks, nor ?try=gold; ?try=looks does.
export const LOOKS = {
  cowries: { product: 'seeds_cowries', kind: 'seeds', name: 'Cowries' },
  kernels: { product: 'seeds_palm_kernels', kind: 'seeds', name: 'Palm kernels' },
  benin: { product: 'board_benin_bronze', kind: 'board', name: 'Benin bronze' },
  grandpa: { product: 'board_grandpa', kind: 'board', name: "Grandpa's board" },
};
export const WOODS = ['mahogany', 'iroko', 'ebony']; // the free boards
export const BUNDLE = 'bundle_all';
export function lookOpen(id, owned, preview = null) {
  const L = LOOKS[id]; if (!L) return true;
  return owns(owned, L.product) || owns(owned, BUNDLE) || preview === 'looks';
}
// The seed set to draw: what the phone chose, if it may have it — river stones once the calm streak has earned them, a store
// look once bought (or previewed) — else Job's tears. Anything unknown is Job's tears.
export function seedSetFor(pref, { stones = false, owned = null, preview = null } = {}) {
  if (pref === 'stones') return stones ? 'stones' : 'jobs';
  if (LOOKS[pref] && LOOKS[pref].kind === 'seeds') return lookOpen(pref, owned, preview) ? pref : 'jobs';
  return 'jobs';
}
// The board to draw: a wood is always free; a board from the store once bought (or previewed); anything else is mahogany.
export function finishFor(pref, { owned = null, preview = null } = {}) {
  if (WOODS.includes(pref)) return pref;
  if (LOOKS[pref] && LOOKS[pref].kind === 'board') return lookOpen(pref, owned, preview) ? pref : 'mahogany';
  return 'mahogany';
}
// What a tap on a locked look says (a seed set is plural, a board is not).
export function lookLockedWords(name, inApp, kind = 'seeds') {
  const is = kind === 'board' ? 'is' : 'are';
  return inApp ? `${name} ${is} a look from the store — the bag on Home` : `${name} ${is} a look from the store, in the app — the web link sells nothing`;
}
// The Settings line under Board, in plain words.
export function boardsLine({ owned = null, preview = null } = {}) {
  const ids = Object.keys(LOOKS).filter((id) => LOOKS[id].kind === 'board');
  const mine = ids.filter((id) => lookOpen(id, owned, preview)).map((id) => LOOKS[id].name), shop = ids.filter((id) => !lookOpen(id, owned, preview)).map((id) => LOOKS[id].name);
  return ['mahogany · iroko · ebony', ...mine].join(' · ') + (shop.length ? ` · ${shop.join(' and ')} in the store` : '');
}
// The Settings line under Seeds, in plain words.
export function seedsLine({ stones, days, need, owned = null, preview = null }) {
  const st = stones ? 'river stones (yours: 7 days played)' : `river stones at ${need} days played (${days} so far)`;
  const shop = Object.keys(LOOKS).filter((id) => LOOKS[id].kind === 'seeds' && !lookOpen(id, owned, preview)).map((id) => LOOKS[id].name.toLowerCase());
  return `Job's tears · ${st}` + (shop.length ? ` · ${shop.join(' and ')} in the store` : '');
}
