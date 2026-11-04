// Buying inside the apps (L12): the checks on the store's answers, what the phone keeps, restore, and the wiring.
// The real stores are tried once Meka's developer accounts exist; here the test store stands in for the plugin.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS, validPurchase, ownedFrom, merge, pricesFrom, failWords, restoredWords, makeShop, makeTestStore, serialize } from "../web/purchase.js";
import { LOOKS, BUNDLE, parseOwned, lookOpen, levelOpen, featureOpen } from "../web/entitle.js";

const box = (start = "[]") => { let v = start; return { load: () => v, save: (j) => { v = j; }, get: () => JSON.parse(v) }; };

test("the products are exactly the ones the game unlocks, and the ones docs/launch/products.md lists", () => {
  assert.deepEqual(PRODUCTS.slice().sort(), ["gold", BUNDLE, ...Object.values(LOOKS).map((l) => l.product)].sort());
  const doc = readFileSync(new URL("../docs/launch/products.md", import.meta.url), "utf8");
  for (const p of PRODUCTS) assert.ok(doc.includes("`" + p + "`"), p + " in products.md");
  assert.ok(!/[£$€]\s?\d/.test(readFileSync(new URL("../web/purchase.js", import.meta.url), "utf8")), "no price written in the code");
});

test("a store answer counts only when it is ours, purchased and not revoked", () => {
  assert.ok(validPurchase({ productIdentifier: "gold", purchaseState: "1" }, "android"));
  assert.ok(!validPurchase({ productIdentifier: "gold", purchaseState: "2" }, "android"), "pending is not paid");
  assert.ok(!validPurchase({ productIdentifier: "gold", purchaseState: "0" }, "android"));
  assert.ok(validPurchase({ productIdentifier: "gold", isActive: true }, "ios"));
  assert.ok(!validPurchase({ productIdentifier: "gold", revocationDate: "2026-11-04" }, "ios"), "a refund is not owned");
  assert.ok(!validPurchase({ productIdentifier: "gold", isActive: false }, "ios"));
  assert.ok(!validPurchase({ productIdentifier: "coins_1000", isActive: true }, "ios"), "anything not ours is ignored");
  assert.ok(!validPurchase(null, "ios"));
  assert.deepEqual([...ownedFrom([{ productIdentifier: "gold", purchaseState: "1" }, { productIdentifier: "seeds_cowries", purchaseState: "2" }], "android")], ["gold"]);
});

test("what the phone keeps: a quiet check only adds; Restore takes the store's word", () => {
  assert.deepEqual([...merge(new Set(["gold"]), new Set())], ["gold"], "no signal never loses Gold");
  assert.deepEqual([...merge(new Set(["gold"]), new Set(), true)], [], "a restore after a refund drops it");
  assert.deepEqual([...merge(new Set(["junk"]), new Set(["bundle_all"]))], ["bundle_all"]);
  assert.equal(serialize(new Set(["seeds_cowries", "gold"])), '["gold","seeds_cowries"]');
});

test("prices come from the store's own words", () => {
  assert.deepEqual(pricesFrom([{ identifier: "gold", priceString: "£3.99" }, { identifier: "x", priceString: "£1" }, { identifier: "bundle_all", priceString: " " }]), { gold: "£3.99" });
});

test("buying, end to end against the test store, on both platforms", async () => {
  for (const platform of ["ios", "android"]) {
    const T = makeTestStore({ platform }), b = box(); const shop = makeShop(T, { platform, ...b });
    assert.equal(Object.keys(await shop.prices()).length, PRODUCTS.length);
    const r = await shop.buy("board_benin_bronze");
    assert.ok(r.ok, platform); assert.match(r.words, /Benin bronze is yours/);
    assert.deepEqual(b.get(), ["board_benin_bronze"]);
    assert.ok(lookOpen("benin", parseOwned(b.load())), "the board opens");
    assert.ok(!lookOpen("grandpa", parseOwned(b.load())));
    assert.ok(T.calls.includes(platform === "android" ? "ack" : "finish"), "the purchase is acknowledged / finished");
    await shop.buy("gold");
    assert.ok(levelOpen("master", parseOwned(b.load())) && featureOpen("review", parseOwned(b.load())), "Gold opens Papa Ike and the review");
    await shop.buy("bundle_all");
    for (const id of Object.keys(LOOKS)) assert.ok(lookOpen(id, parseOwned(b.load())), id);
  }
});

test("a cancelled, pending or failed purchase owns nothing and says so plainly", async () => {
  const T = makeTestStore(), b = box(); const shop = makeShop(T, { platform: "ios", ...b });
  T.fail = "User cancelled"; let r = await shop.buy("gold"); assert.ok(!r.ok && r.cancelled); assert.match(r.words, /Not bought/);
  T.fail = "Network error"; r = await shop.buy("gold"); assert.match(r.words, /Couldn't reach the store/);
  assert.deepEqual(b.get(), []);
  const A = makeTestStore({ platform: "android" }), c = box(); const sa = makeShop(A, { platform: "android", ...c });
  A.pending = true; r = await sa.buy("seeds_cowries"); assert.ok(!r.ok && r.pending); assert.match(r.words, /waiting on the store's approval/); assert.deepEqual(c.get(), []);
  await assert.rejects(() => shop.buy("coins"), /unknown product/);
  assert.equal(failWords({ code: "ITEM_ALREADY_OWNED" }, "Gold").owned, true);
});

test("restore on a new phone brings back what the account bought, and drops a refund", async () => {
  const T = makeTestStore({ owned: ["gold", "seeds_palm_kernels"] }), b = box(); const shop = makeShop(T, { platform: "ios", ...b });
  let r = await shop.restore(); assert.ok(r.ok); assert.equal(r.words, "Restored: Gold, Palm kernels");
  assert.deepEqual(b.get(), ["gold", "seeds_palm_kernels"]);
  r = await shop.restore(); assert.match(r.words, /^All restored/);
  T.refund("gold"); r = await shop.restore(); assert.equal(r.words, "No longer bought: Gold"); assert.deepEqual(b.get(), ["seeds_palm_kernels"]);
  const empty = makeShop(makeTestStore(), { platform: "ios", ...box() }); assert.equal((await empty.restore()).words, "Nothing to restore on this store account");
  assert.equal(restoredWords(new Set(), new Set(["gold"])), "Restored: Gold");
});

test("the quiet check at start adds a purchase made elsewhere and keeps what it can't see", async () => {
  const T = makeTestStore({ owned: ["board_grandpa"] }), b = box('["gold"]'); const shop = makeShop(T, { platform: "ios", ...b });
  assert.deepEqual([...await shop.sync()].sort(), ["board_grandpa", "gold"]);
  const broken = { getPurchases: async () => { throw new Error("offline"); } }; const b2 = box('["gold"]');
  assert.deepEqual([...await makeShop(broken, { platform: "ios", ...b2 }).sync()], ["gold"]);
});

test("a purchase that lands later (Ask to Buy, a pending payment) is kept when the store tells us", async () => {
  let fire; const P = { ...makeTestStore(), addListener: (ev, fn) => { if (ev === "transactionUpdated") fire = fn; } };
  const b = box(); const shop = makeShop(P, { platform: "ios", ...b }); let told = null; shop.listen((p) => { told = p; });
  await fire({ productIdentifier: "seeds_cowries", isActive: true, transactionId: "t1" });
  assert.equal(told, "seeds_cowries"); assert.deepEqual(b.get(), ["seeds_cowries"]);
  await fire({ productIdentifier: "gold", revocationDate: "x" }); assert.deepEqual(b.get(), ["seeds_cowries"]);
});

test("the plugin is in both apps, and the web link never sells", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.ok((pkg.devDependencies || {})["@capgo/native-purchases"], "the plugin is a dependency");
  assert.match(readFileSync(new URL("../android/capacitor.settings.gradle", import.meta.url), "utf8"), /capgo-native-purchases/);
  assert.match(readFileSync(new URL("../ios/App/CapApp-SPM/Package.swift", import.meta.url), "utf8"), /CapgoNativePurchases/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /plugin\('NativePurchases'\)/);
  assert.match(game, /params\.get\('store'\) === 'test' && !inApp\(\)/, "the test store only stands in off the apps");
  assert.match(game, /save: \(j\) => \{ visitOwned = j; \}/, "and what it sells is kept for the visit only");
});
