// Gold and the looks: what this phone owns, behind one module (L9 grows it, L12 fills it from Apple's and Google's own
// purchase receipts). Nothing is sold yet, so nothing is owned yet; the web link never sells anything and says "in the app".
// Pure functions, no DOM, so they are tested in node.
//
// Gold opens Master (Papa Ike, L7); later Mama Ngozi's review of a whole game, the puzzle archive and your history (L9).

export const GOLD_LEVELS = ['master'];

// What this phone owns, from what the game kept ('["gold"]'); anything unreadable owns nothing.
export function parseOwned(raw) {
  try { const a = JSON.parse(raw || '[]'); return new Set(Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []); } catch { return new Set(); }
}
export const owns = (owned, item) => !!owned && owned.has(item);

// A look at Master before Gold can be bought: `?try=master` on the link opens Papa Ike for that visit only (never kept),
// so Meka and the testers can play him now. Gone once purchases exist (L12).
export function previewOf(search) {
  try { return new URLSearchParams(search || '').get('try') === 'master' ? 'master' : null; } catch { return null; }
}

// Whether an opponent can be played on this phone.
export function levelOpen(level, owned, preview = null) {
  return !GOLD_LEVELS.includes(level) || owns(owned, 'gold') || preview === level;
}
// The opponent to play: a Gold one this phone cannot open falls back to Mama Ngozi (Hard).
export function playable(level, owned, preview = null) { return levelOpen(level, owned, preview) ? level : 'hard'; }

// What a tap on a locked Gold opponent says: on the web link "in the app"; in the apps, until the store is built, "soon".
export function lockedWords(name, inApp) {
  return inApp ? `${name} plays in Gold — the upgrade comes to the app soon` : `${name} plays in Gold, in the app — the web link sells nothing`;
}
