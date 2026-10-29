// Picture quality: the full board, or a lighter one for slow phones and slow connections.
// Pure decision logic (no DOM, no three.js) so it can be unit-tested in node.
//
// "lite" keeps the same carved board, real seeds and lamp light, but: half-size wood grain, a smaller shadow map,
// fewer polygons in the carved top and the seeds, pixel ratio 1, and no anisotropic filtering. It costs a fraction
// of the memory and start-up time; the moves and physics are unchanged.

export const SLOW_NETWORKS = ['slow-2g', '2g', '3g'];

// env: { saveData, effectiveType, deviceMemory, cores, pref, param }
//   pref:  'auto' | 'lite' | 'full'  (Settings → Feel → Lighter board)
//   param: the ?lite= URL value, if any (for renders and tests)
// Returns { lite: boolean, reason: string }.
export function decideQuality(env = {}) {
  if (env.param === '1' || env.param === 'true') return { lite: true, reason: 'asked for in the address' };
  if (env.param === '0' || env.param === 'false') return { lite: false, reason: 'asked for in the address' };
  if (env.pref === 'lite') return { lite: true, reason: 'chosen in Settings' };
  if (env.pref === 'full') return { lite: false, reason: 'chosen in Settings' };
  if (env.saveData) return { lite: true, reason: 'data saver is on' };
  if (env.effectiveType && SLOW_NETWORKS.includes(String(env.effectiveType).toLowerCase())) return { lite: true, reason: 'slow connection' };
  if (typeof env.deviceMemory === 'number' && env.deviceMemory <= 2) return { lite: true, reason: 'small phone memory' };
  if (typeof env.cores === 'number' && env.cores <= 2) return { lite: true, reason: 'slow phone' };
  return { lite: false, reason: 'auto' };
}

// Read the browser's signals (safe where any of them is missing).
export function browserEnv(pref, param) {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const c = nav.connection || nav.mozConnection || nav.webkitConnection || {};
  return { saveData: !!c.saveData, effectiveType: c.effectiveType, deviceMemory: nav.deviceMemory, cores: nav.hardwareConcurrency, pref, param };
}

// Seed physics: the falling, bouncing, rolling seeds — or, on the weakest phones, a plain flight from hand to pit
// (every seed still moves one per pit; it just lands without the bounce-and-roll). Settings → Feel → Seed physics.
//   pref:  'auto' | 'on' | 'off'
//   lite:  the picture-quality decision above (auto follows it: the lighter board also drops the physics)
//   param: the ?physics= URL value, if any (for renders and tests)
// Returns { physics: boolean, reason: string }.
export function decidePhysics({ pref = 'auto', lite = false, param } = {}) {
  if (param === '0' || param === 'false') return { physics: false, reason: 'asked for in the address' };
  if (param === '1' || param === 'true') return { physics: true, reason: 'asked for in the address' };
  if (pref === 'off') return { physics: false, reason: 'chosen in Settings' };
  if (pref === 'on') return { physics: true, reason: 'chosen in Settings' };
  if (lite) return { physics: false, reason: 'the lighter board is on' };
  return { physics: true, reason: 'auto' };
}

// What each tier means for the scene.
export function tier(lite) {
  return lite
    ? { lite: true, woodW: 512, woodH: 1024, clothS: 256, seedS: 128, anisotropy: 1, topSegs: [110, 330], seedSegs: [16, 12], shadow: 512, maxPixelRatio: 1 }
    : { lite: false, woodW: 1024, woodH: 2048, clothS: 512, seedS: 256, anisotropy: 8, topSegs: [210, 620], seedSegs: [28, 20], shadow: 2048, maxPixelRatio: 2 };
}
