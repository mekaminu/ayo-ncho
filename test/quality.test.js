import { test } from "node:test";
import assert from "node:assert/strict";
import { decideQuality, tier } from "../web/quality.js";

test("a good phone on a good connection gets the full board", () => {
  const q = decideQuality({ saveData: false, effectiveType: "4g", deviceMemory: 8, cores: 8, pref: "auto" });
  assert.equal(q.lite, false);
});

test("slow connections, data saver and small phones get the lighter board automatically", () => {
  assert.equal(decideQuality({ effectiveType: "3g", deviceMemory: 8, cores: 8, pref: "auto" }).lite, true);
  assert.equal(decideQuality({ effectiveType: "2g", pref: "auto" }).lite, true);
  assert.equal(decideQuality({ effectiveType: "slow-2g", pref: "auto" }).lite, true);
  assert.equal(decideQuality({ saveData: true, effectiveType: "4g", pref: "auto" }).lite, true);
  assert.equal(decideQuality({ effectiveType: "4g", deviceMemory: 2, pref: "auto" }).lite, true);
  assert.equal(decideQuality({ effectiveType: "4g", deviceMemory: 4, cores: 2, pref: "auto" }).lite, true);
  assert.equal(decideQuality({ effectiveType: "4g", deviceMemory: 4, cores: 4, pref: "auto" }).lite, false);
});

test("a missing signal never forces the lighter board", () => {
  assert.equal(decideQuality({}).lite, false);
  assert.equal(decideQuality({ pref: "auto" }).lite, false);
});

test("the Settings choice beats the automatic pick, and the address beats both", () => {
  assert.equal(decideQuality({ effectiveType: "2g", pref: "full" }).lite, false);
  assert.equal(decideQuality({ effectiveType: "4g", deviceMemory: 8, cores: 8, pref: "lite" }).lite, true);
  assert.equal(decideQuality({ pref: "lite", param: "0" }).lite, false);
  assert.equal(decideQuality({ pref: "full", param: "1" }).lite, true);
  assert.match(decideQuality({ effectiveType: "3g", pref: "auto" }).reason, /slow connection/);
});

test("the lighter tier is lighter in every dimension", () => {
  const a = tier(false), b = tier(true);
  assert.ok(b.woodW < a.woodW && b.woodH < a.woodH && b.clothS < a.clothS && b.seedS < a.seedS);
  assert.ok(b.topSegs[0] < a.topSegs[0] && b.topSegs[1] < a.topSegs[1]);
  assert.ok(b.seedSegs[0] < a.seedSegs[0] && b.shadow < a.shadow && b.maxPixelRatio < a.maxPixelRatio && b.anisotropy < a.anisotropy);
});
