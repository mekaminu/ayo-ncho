// The store pages kit (Launch L15): every field within its store's limit, and every claim the words make
// checked against the game's own code, so the store page can never promise something the game does not do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LIMITS, chars, descriptionText, render, LISTING, OUT } from '../tools/store-text.js';
import { CHARACTERS } from '../web/characters.js';
import { SHOUTS } from '../web/shouts.js';
import { MILESTONES } from '../web/streak.js';
import { GOLD_LEVELS, GOLD_FEATURES, LOOKS, WOODS } from '../web/entitle.js';
import { PRODUCTS, NAMES } from '../web/purchase.js';
import { EVENTS } from '../web/telemetry.js';
import { CODE_LENGTH, SEAT_HOLD_MS, IDLE_MS } from '../server/rooms.js';
import { PAGES } from '../server/legal.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const L = JSON.parse(readFileSync(LISTING, 'utf8'));
const D = descriptionText(L);
const ANSWERS = read('docs/launch/store/answers.md');
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NUM = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

test('every field fits its store', () => {
  assert.ok(chars(L.name) <= LIMITS.name && L.name === L.google.title);
  assert.ok(chars(L.apple.subtitle) <= LIMITS.subtitle, 'subtitle');
  assert.ok(chars(L.apple.promotionalText) <= LIMITS.promotionalText, 'promotional text');
  assert.ok(Buffer.byteLength(L.apple.keywords) <= LIMITS.keywords, 'keywords (bytes)');
  assert.ok(chars(D) <= LIMITS.description, 'description');
  assert.ok(chars(L.google.shortDescription) <= LIMITS.shortDescription, 'short description');
  assert.ok(chars(L.google.whatsNew) <= LIMITS.releaseNotes, 'Play release notes');
  assert.ok(chars(L.apple.whatsNew) <= LIMITS.whatsNew);
  assert.ok(chars(L.reviewNotes.join('\n\n')) <= LIMITS.reviewNotes);
  for (const s of L.screenshots) assert.ok(chars(s.caption) <= LIMITS.caption, s.caption);
  assert.ok(L.screenshots.length >= 5 && L.screenshots.length <= 8, 'Play takes 2–8 phone screenshots, Apple up to 10');
});

test('keywords: no spaces round the commas, no repeats, nothing already in the name or subtitle', () => {
  const kw = L.apple.keywords.split(',');
  for (const k of kw) assert.equal(k, k.trim(), `"${k}" has a space at an edge`);
  assert.equal(new Set(kw.map(fold)).size, kw.length, 'a keyword twice');
  const taken = new Set(fold(`${L.name} ${L.apple.subtitle}`).split(/[^a-z0-9]+/).filter(Boolean));
  for (const k of kw) for (const w of fold(k).split(' ')) assert.ok(!taken.has(w), `"${w}" is already in the name or subtitle`);
});

test('the words keep the stores\' rules: no prices, no rankings, no other platforms, no emoji, no shouting', () => {
  const all = [L.apple.subtitle, L.apple.promotionalText, L.google.shortDescription, D, L.apple.whatsNew, ...L.screenshots.map((s) => s.caption)].join('\n');
  assert.doesNotMatch(all, /[£$€₦]\s?\d/, 'a price (prices are set in the consoles and change)');
  assert.doesNotMatch(all, /\b(best|#1|number one|top rated|free download)\b/i, 'a ranking claim');
  assert.doesNotMatch(all, /\b(android|iphone|ipad|ios|google play|app store|play store)\b/i, 'a platform name in a shared text');
  assert.doesNotMatch(all, /\p{Extended_Pictographic}/u, 'an emoji');
  for (const w of all.split(/[^A-Za-z]+/)) assert.ok(w.length < 4 || w !== w.toUpperCase(), `${w} in capitals`);
  for (const line of L.description) if (line.startsWith('•')) assert.match(line, /^• \S/);
});

test('the opponents named are the game\'s own, and the counts are true', () => {
  const people = Object.values(CHARACTERS);
  for (const c of people) assert.ok(D.includes(c.name), `${c.name} is not on the store page`);
  const n = people.length;
  for (const t of [L.apple.whatsNew, L.google.whatsNew]) {
    const m = t.match(/\b(two|three|four|five|six|seven|eight|nine|ten) opponents\b/);
    assert.ok(m && NUM[m[1]] === n, `"${m && m[0]}" but the game has ${n}`);
  }
  // the bios quoted come from the characters themselves
  assert.ok(D.includes('already sure she is winning') && CHARACTERS.easy.bio.includes('already sure she is winning'));
  assert.ok(CHARACTERS.hard.bio.startsWith('Thirty years at the market') && D.includes('thirty years at the market'));
});

test('shouts, the room code, the river stones and the woods are as the game has them', () => {
  const shouts = D.match(/\b(\w+) quick shouts\b/); assert.ok(shouts && NUM[shouts[1].toLowerCase()] === SHOUTS.length);
  const code = D.match(/\b(\w+)-letter code\b/); assert.ok(code && NUM[code[1]] === CODE_LENGTH);
  const stones = D.match(/\b(\w+) days played earns the river stones\b/i);
  assert.ok(stones && NUM[stones[1].toLowerCase()] === MILESTONES.find((m) => m.id === 'stones').days);
  for (const w of WOODS) assert.match(D, new RegExp(`\\b${w}\\b`, 'i'));
});

test('Gold and the looks are described as they are sold, and nothing sold is said to win', () => {
  assert.deepEqual(GOLD_LEVELS, ['master']); assert.deepEqual(GOLD_FEATURES, ['review']); // the paragraph names exactly these
  const gold = L.description[L.description.indexOf('Gold, bought once') + 1];
  assert.match(gold, /Papa Ike/); assert.match(gold, /review/);
  assert.equal(CHARACTERS.master.name, 'Papa Ike');
  assert.doesNotMatch(gold, /puzzle|history|stats/i, 'Gold may name only what it opens today');
  const looks = L.description[L.description.indexOf('Looks for the board') + 1];
  for (const { product: id } of Object.values(LOOKS)) {
    const word = fold(NAMES[id]).replace(/s$/, '').split(' ')[0];
    assert.ok(fold(looks).includes(word), `${NAMES[id]} missing from the looks`);
  }
  assert.match(looks, /never change .* who wins/);
  assert.deepEqual(PRODUCTS.filter((p) => !read('docs/launch/products.md').includes('`' + p + '`')), []);
  assert.match(D, /Nothing you can buy wins a game/);
});

test('no ads and no accounts, as the page says', () => {
  const pkg = JSON.parse(read('package.json'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ');
  assert.doesNotMatch(deps, /admob|adsense|applovin|unity-?ads|ironsource|facebook|appsflyer|adjust/i);
  assert.match(D, /No ads\. No coins\. No accounts\./);
});

test('the links are pages the server serves, and the screenshots exist', () => {
  for (const p of ['privacy', 'terms', 'support']) {
    assert.ok(PAGES.includes(p)); assert.equal(L.links[p], `https://ayo-ncho.onrender.com/${p}`);
  }
  for (const s of L.screenshots) assert.ok(existsSync(join(ROOT, s.from)), s.from);
});

test('the forms\' answers match the code', () => {
  assert.match(read('ios/App/App/Info.plist'), /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
  assert.match(ANSWERS, /ITSAppUsesNonExemptEncryption` = NO/);
  const moments = ANSWERS.match(/the (\w+) fixed moments/); assert.ok(moments && NUM[moments[1]] === Object.keys(EVENTS).length);
  assert.ok(ANSWERS.includes(`${SEAT_HOLD_MS / 60000} minutes`) && ANSWERS.includes(`${IDLE_MS / 3600000} hours`), 'the sweep times');
  const eight = ANSWERS.match(/one of (\w+) fixed phrases/); assert.ok(eight && NUM[eight[1]] === SHOUTS.length);
  assert.match(ANSWERS, /\*\*13 and over\*\*/);
  // the privacy page says the same about a friend's game
  const privacy = read('server/legal.js');
  assert.match(privacy, /10 minutes/); assert.match(privacy, /6 hours/);
});

test('listing.md is what tools/store-text.js writes', () => {
  assert.equal(readFileSync(OUT, 'utf8'), render(L), 'run: node tools/store-text.js');
});
