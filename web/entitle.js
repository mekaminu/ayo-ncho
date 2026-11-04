// Gold and the looks: what this phone owns, behind one module (L9 grows it, L12 fills it from Apple's and Google's own
// purchase receipts). Nothing is sold yet, so nothing is owned yet; the web link never sells anything and says "in the app".
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
const PREVIEWS = ['master', 'review', 'gold'];
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

// What a tap on a locked Gold opponent (or feature: "Mama Ngozi's review") says: on the web link "in the app"; in the apps, until the store is built, "soon".
export function lockedWords(name, inApp) {
  return inApp ? `${name} plays in Gold — the upgrade comes to the app soon` : `${name} plays in Gold, in the app — the web link sells nothing`;
}
export function featureLockedWords(what, inApp) {
  return inApp ? `${what} is part of Gold — the upgrade comes to the app soon` : `${what} is part of Gold, in the app — the web link sells nothing`;
}
