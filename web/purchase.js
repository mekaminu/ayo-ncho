// Buying inside the apps (L12): Gold and the looks, through Apple's and Google's own purchase systems and nothing else.
//
// The plugin is @capgo/native-purchases (MPL-2.0, free, no account or service of its own): StoreKit 2 on iPhone and iPad,
// Google Play Billing 9 on Android, Capacitor 8, maintained (8.9 in Oct 2026). Chosen over RevenueCat (a paid-above-a-limit
// service holding the receipts on its servers, against "no extra paid service") and cordova-plugin-purchase (StoreKit 1
// receipts, and a Cordova bridge). It hands us transactions StoreKit 2 has already verified on the device (an unverified one
// arrives as `transactionVerificationFailed`, never as a purchase) and Google's purchases with their state; we check them
// here (the right product, purchased, not revoked) and keep what the phone owns in its own storage ('ayo.owned', the same
// list web/entitle.js reads). No server of ours sees a purchase.
//
// Everything is one-time (non-consumable): `gold`, the four looks and `bundle_all`. Restore asks the store again and takes
// its answer as the truth (a refund then drops out); the quiet check at start only ever adds, so a phone with no signal never
// loses what it owns.
//
// A test store (`makeTestStore`) stands in for the plugin in node and in the browser checks (?store=test); what it "sells" is
// kept for that visit only, so the web link still sells nothing.

export const PRODUCTS = ['gold', 'board_benin_bronze', 'board_grandpa', 'seeds_cowries', 'seeds_palm_kernels', 'bundle_all'];
export const NAMES = { gold: 'Gold', board_benin_bronze: 'Benin bronze', board_grandpa: "Grandpa's board", seeds_cowries: 'Cowries', seeds_palm_kernels: 'Palm kernels', bundle_all: 'The whole market' };

// Is this transaction a real, current purchase of one of our products?
//   Android: purchaseState "1" is PURCHASED ("2" is pending — not yet paid, so not owned).
//   iOS (StoreKit 2): verified by the plugin; a revoked one (refunded, or family sharing withdrawn) is not owned.
export function validPurchase(t, platform) {
  if (!t || typeof t !== 'object' || !PRODUCTS.includes(t.productIdentifier)) return false;
  if (platform === 'android') return String(t.purchaseState) === '1';
  if (t.revocationDate) return false;
  return t.isActive !== false;
}
export function pendingPurchase(t, platform) { return !!t && platform === 'android' && String(t.purchaseState) === '2' && PRODUCTS.includes(t.productIdentifier); }

// The products a list of transactions owns.
export function ownedFrom(transactions, platform) {
  const out = new Set(); for (const t of transactions || []) if (validPurchase(t, platform)) out.add(t.productIdentifier); return out;
}
// What the phone keeps: the saved list plus what the store says. `replace` (an explicit Restore) takes the store's answer as
// the whole truth; otherwise the store's answer only adds.
export function merge(saved, fromStore, replace = false) {
  const out = new Set(replace ? [] : [...(saved || [])].filter((p) => PRODUCTS.includes(p)));
  for (const p of fromStore || []) if (PRODUCTS.includes(p)) out.add(p);
  return out;
}
export const serialize = (set) => JSON.stringify([...set].sort());

// The store's prices: product id → the store's own price text (in the buyer's currency), never ours.
export function pricesFrom(products) {
  const out = {}; for (const p of products || []) if (p && PRODUCTS.includes(p.identifier) && typeof p.priceString === 'string' && p.priceString.trim()) out[p.identifier] = p.priceString.trim();
  return out;
}

// A refusal from the store, in plain words: the buyer closing the sheet is not an error.
export function failWords(err, name) {
  const m = String((err && (err.message || err.code)) || err || '');
  if (/cancel/i.test(m)) return { cancelled: true, words: `Not bought — ${name} stays in the store` };
  if (/pending|deferred/i.test(m)) return { pending: true, words: `${name} is waiting on the store's approval — it arrives once it is paid` };
  if (/network|offline|internet|connect/i.test(m)) return { words: `Couldn't reach the store — try again with signal` };
  if (/already|owned/i.test(m)) return { owned: true, words: `${name} is already yours — tap Restore purchases` };
  return { words: `The store said no: ${m.slice(0, 80) || 'try again'}` };
}
export function restoredWords(before, after) {
  const added = [...after].filter((p) => !before.has(p)).map((p) => NAMES[p]), gone = [...before].filter((p) => !after.has(p)).map((p) => NAMES[p]);
  if (!after.size) return 'Nothing to restore on this store account';
  if (!added.length && !gone.length) return `All restored — ${[...after].map((p) => NAMES[p]).join(', ')}`;
  return [added.length ? `Restored: ${added.join(', ')}` : '', gone.length ? `No longer bought: ${gone.join(', ')}` : ''].filter(Boolean).join(' · ');
}

// The shop: one object over the plugin. `load()` / `save(json)` keep the owned list on the phone.
export function makeShop(P, { platform = 'ios', load = () => '[]', save = () => {} } = {}) {
  const read = () => { try { const a = JSON.parse(load() || '[]'); return new Set(Array.isArray(a) ? a.filter((x) => PRODUCTS.includes(x)) : []); } catch { return new Set(); } };
  const keep = (set) => { save(serialize(set)); return set; };
  const ask = async () => { const r = await P.getPurchases({ productType: 'inapp' }); return ownedFrom(r && r.purchases, platform); };
  const finish = async (t) => { // Google takes the money back from a purchase never acknowledged; StoreKit wants it finished
    try {
      if (platform === 'android' && t.purchaseToken && t.isAcknowledged === false && P.acknowledgePurchase) await P.acknowledgePurchase({ purchaseToken: t.purchaseToken });
      else if (platform !== 'android' && t.needsFinish && P.finishTransaction) await P.finishTransaction({ transactionId: t.transactionId });
    } catch {}
  };
  const shop = {
    owned: read,
    async prices() { const r = await P.getProducts({ productIdentifiers: PRODUCTS, productType: 'inapp' }); return pricesFrom(r && r.products); },
    async buy(product) {
      if (!PRODUCTS.includes(product)) throw new Error('unknown product ' + product);
      let t;
      try { t = await P.purchaseProduct({ productIdentifier: product, productType: 'inapp', quantity: 1 }); }
      catch (e) { return { ok: false, ...failWords(e, NAMES[product]) }; }
      if (pendingPurchase(t, platform)) return { ok: false, pending: true, ...failWords('pending', NAMES[product]) };
      if (!validPurchase(t, platform) || t.productIdentifier !== product) return { ok: false, words: `The store's answer for ${NAMES[product]} didn't check out — nothing was taken as bought` };
      await finish(t);
      keep(merge(read(), [product])); return { ok: true, product, words: `${NAMES[product]} is yours — thank you` };
    },
    async restore() {
      const before = read();
      try { if (P.restorePurchases) await P.restorePurchases(); const got = await ask(); keep(merge(before, got, true)); return { ok: true, words: restoredWords(before, read()) }; }
      catch (e) { return { ok: false, ...failWords(e, 'Restore') }; }
    },
    async sync() { try { const got = await ask(); keep(merge(read(), got)); } catch {} return read(); },
    listen(onChange) { // a purchase that finishes later (Ask to Buy, a pending card payment, another device)
      if (!P.addListener) return;
      P.addListener('transactionUpdated', async (t) => { if (validPurchase(t, platform)) { await finish(t); keep(merge(read(), [t.productIdentifier])); onChange && onChange(t.productIdentifier); } });
    },
  };
  return shop;
}

// The test store: the plugin's shape over a little in-memory store. `prices` is what it "charges"; `fail` makes the next
// purchase fail with that message; `pending` makes it pending. Platform-shaped answers (Android's purchaseState).
export function makeTestStore({ platform = 'ios', prices = null, owned = [] } = {}) {
  const P = prices || Object.fromEntries(PRODUCTS.map((p) => [p, 'TEST']));
  const bought = new Set(owned); let n = 0;
  const tx = (p) => ({ transactionId: 'test-' + (++n), productIdentifier: p, purchaseDate: new Date(0).toISOString(), willCancel: null, ...(platform === 'android' ? { purchaseState: '1', purchaseToken: 'tok-' + n, isAcknowledged: false } : { isActive: true, needsFinish: true }) });
  const T = {
    fail: null, pending: false, calls: [],
    async getProducts({ productIdentifiers }) { T.calls.push('getProducts'); return { products: productIdentifiers.filter((id) => P[id]).map((id) => ({ identifier: id, priceString: P[id], title: NAMES[id], price: 0 })) }; },
    async purchaseProduct({ productIdentifier }) {
      T.calls.push('purchase:' + productIdentifier);
      if (T.fail) { const m = T.fail; T.fail = null; throw new Error(m); }
      if (T.pending) { T.pending = false; return { ...tx(productIdentifier), purchaseState: '2' }; }
      bought.add(productIdentifier); return tx(productIdentifier);
    },
    async restorePurchases() { T.calls.push('restore'); },
    async getPurchases() { T.calls.push('getPurchases'); return { purchases: [...bought].map(tx) }; },
    async acknowledgePurchase() { T.calls.push('ack'); }, async finishTransaction() { T.calls.push('finish'); },
    refund(p) { bought.delete(p); },
  };
  return T;
}
