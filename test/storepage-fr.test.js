// The store pages in French (Launch L18): line for line the English listing, every field within its store's limit, the stores'
// rules kept, every name and number checked against the game (and against the English), the game's own French words for its
// settings and looks, no English left, French spacing, and listing-fr.md what tools/store-text.js writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIMITS, chars, descriptionText, LISTING, LISTING_FR, OUT_FR, renderFr, frListing, frPlain } from '../tools/store-text.js';
import { CHARACTERS } from '../web/characters.js';
import { SHOUTS } from '../web/shouts.js';
import { MILESTONES } from '../web/streak.js';
import { CODE_LENGTH } from '../server/rooms.js';
import { PAGES } from '../server/legal.js';
import { translate } from '../web/i18n.js';

const EN = JSON.parse(readFileSync(LISTING, 'utf8'));
const RAW = JSON.parse(readFileSync(LISTING_FR, 'utf8'));
const F = frListing(RAW);
const D = descriptionText(F);
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NUM = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
const ALL = () => [F.name, F.apple.subtitle, F.apple.promotionalText, F.apple.keywords, F.apple.whatsNew, F.google.shortDescription,
  F.google.whatsNew, D, ...F.screenshots.map((s) => s.caption), ...F.preview.captions].join('\n');

test('every field fits its store', () => {
  assert.ok(chars(F.name) <= LIMITS.name && F.name === F.google.title, 'name');
  assert.ok(chars(F.apple.subtitle) <= LIMITS.subtitle, 'subtitle');
  assert.ok(chars(F.apple.promotionalText) <= LIMITS.promotionalText, 'promotional text');
  assert.ok(Buffer.byteLength(F.apple.keywords) <= LIMITS.keywords, `keywords: ${Buffer.byteLength(F.apple.keywords)} bytes`);
  assert.ok(chars(D) <= LIMITS.description, 'description');
  assert.ok(chars(F.google.shortDescription) <= LIMITS.shortDescription, 'short description');
  assert.ok(chars(F.google.whatsNew) <= LIMITS.releaseNotes);
  for (const s of [...F.screenshots.map((x) => x.caption), ...F.preview.captions]) assert.ok(chars(s) <= LIMITS.caption, s);
});

test('line for line the English: the same paragraphs, headings and bullets, the same screenshots and captions in order', () => {
  assert.equal(F.description.length, EN.description.length);
  EN.description.forEach((en, i) => {
    const fr = F.description[i];
    assert.equal(fr === '', en === '', `line ${i + 1}: a gap in one and not the other`);
    assert.equal(fr.startsWith('• '), en.startsWith('• '), `line ${i + 1}: a bullet in one and not the other`);
    const heading = (l, at) => l && !l.startsWith('•') && (at === 0 || l.length < 60) && !/[.:]$/.test(l);
    if (i > 0) assert.equal(heading(fr, i), heading(en, i), `line ${i + 1}: a heading in one only (${fr})`);
  });
  assert.equal(F.screenshots.length, EN.screenshots.length);
  assert.equal(F.preview.captions.length, EN.preview.captions.length);
  assert.equal(F.preview.captions.at(-1), frPlain(translate('Ayo & Nchò', 'fr')) + ' · ' + translate('Nigerian Mancala', 'fr'));
});

test('the stores\' rules: no prices, no rankings, no other platforms, no emoji, no shouting; keywords as Apple wants them', () => {
  const all = ALL();
  assert.doesNotMatch(all, /[£$€₦]\s?\d|\d\s?[£$€₦]/, 'a price');
  assert.doesNotMatch(all, /\b(meilleur jeu|le meilleur|n° ?1|numéro un|gratuit)\b/i, 'a ranking or "free" claim');
  assert.doesNotMatch(all, /\b(android|iphone|ipad|ios|google play|app store|play store)\b/i, 'a platform name');
  assert.doesNotMatch(all, /\p{Extended_Pictographic}/u, 'an emoji');
  for (const w of all.split(/[^\p{L}]+/u)) assert.ok(w.length < 4 || w !== w.toUpperCase(), `${w} in capitals`);
  const kw = F.apple.keywords.split(',');
  for (const k of kw) assert.equal(k, k.trim());
  assert.equal(new Set(kw.map(fold)).size, kw.length, 'a keyword twice');
  const taken = new Set(fold(`${F.name} ${F.apple.subtitle}`).split(/[^a-z0-9]+/).filter(Boolean));
  for (const k of kw) for (const w of fold(k).split(' ')) assert.ok(!taken.has(w), `"${w}" is already in the name or subtitle`);
  // the search words that carry over (game names, places, peoples) are the English ones kept
  for (const k of ['okwe', 'ayoayo', 'bao', 'kalah', 'igbo', 'yoruba']) assert.ok(kw.includes(k) && EN.apple.keywords.split(',').includes(k));
});

test('the names and numbers are the game\'s and the English listing\'s', () => {
  for (const c of Object.values(CHARACTERS)) assert.ok(D.includes(c.name), `${c.name} is not on the French page`);
  for (const t of [F.apple.whatsNew, F.google.whatsNew]) {
    const m = t.match(/\b(deux|trois|quatre|cinq|six|sept|huit|neuf|dix) adversaires\b/);
    assert.ok(m && NUM[m[1]] === Object.keys(CHARACTERS).length, `"${m && m[0]}"`);
  }
  const shouts = D.match(/\b(\p{L}+) cris rapides\b/u); assert.ok(shouts && NUM[fold(shouts[1])] === SHOUTS.length);
  const code = D.match(/\bcode de (\p{L}+) lettres\b/u); assert.ok(code && NUM[code[1]] === CODE_LENGTH);
  const days = D.match(/\b(\p{L}+) jours de jeu débloquent les galets\b/u);
  assert.ok(days && NUM[fold(days[1])] === MILESTONES.find((m) => m.id === 'stones').days);
  // the bios said as the game says them in French
  assert.ok(translate(CHARACTERS.easy.bio, 'fr').toLowerCase().includes('déjà sûre de gagner') && D.includes('neuf ans et déjà sûre de gagner'));
  assert.ok(translate(CHARACTERS.hard.bio, 'fr').startsWith('Trente ans au marché') && D.includes('trente ans au marché'));
  assert.ok(translate(CHARACTERS.steady.bio, 'fr').includes('compte chaque trou deux fois') && D.includes('compte chaque trou deux fois'));
  // a friend is never given a gender beyond « un ami », and the door is opened, not « him » let in
  assert.doesNotMatch(D, /faites-le entrer|quand il frappe|votre amie?\b.*\bil\b/);
  const digits = (t) => (t.match(/\d+/g) || []).join(' ');
  // the same figures in the same order (the opening's "take the fours" is "prenez les 4" in French)
  const body = (l) => descriptionText({ description: l.description.slice(1) });
  assert.equal(digits(body(F)), digits(body(EN)), 'the same figures, in the same order');
  assert.match(F.description[0], /prenez les 4\.$/); assert.match(EN.description[0], /take the fours\.$/);
});

test('the game\'s own French words: settings, woods, looks, Gold, the review, the lighter board', () => {
  const said = (en) => { const fr = translate(en, 'fr'); assert.notEqual(fr, en, `${en} has no French in the game`); return fr; };
  assert.ok(D.includes(said('Settings')));
  for (const w of ['Mahogany', 'Ebony']) assert.ok(D.toLowerCase().includes(said(w).toLowerCase()), w);
  assert.equal(translate('Iroko', 'fr'), 'Iroko'); assert.ok(D.includes('iroko'));
  for (const [en, fr] of [['Benin bronze', 'bronze du Bénin'], ["Grandpa's board", 'plateau de grand-père'], ['Cowries', 'cauris'], ['Palm kernels', 'noix de palme']]) {
    assert.ok(fold(said(en)).includes(fold(fr)), `${en} in the game`); assert.ok(D.includes(fr), `${fr} on the page`);
  }
  assert.ok(fold(said('River stones')) === 'galets' && D.includes('les galets'));
  assert.ok(D.includes(said('Lighter board').toLowerCase()));
  assert.ok(D.includes(said("Mama Ngozi's review").replace(/^La/, 'la')));
  assert.ok(D.includes(said('Master')) && said('Master') === 'Maître');
  assert.ok(D.includes(said('Looks only · never wins').split(' · ')[0]), 'Que l’apparence, as the store screen says it');
  assert.equal(translate('Gold', 'fr'), 'Gold'); assert.ok(D.includes('Gold, acheté une fois')); // Gold keeps its name
  assert.match(D, /Rien de ce que vous achetez ne gagne une partie/);
  assert.match(D, /Pas de pub\. Pas de pièces\. Pas de compte\./);
  const looks = F.description[F.description.indexOf('Des looks pour le plateau') + 1];
  assert.match(looks, /ne changent jamais .* qui gagne/);
  const gold = F.description[F.description.indexOf('Gold, acheté une fois') + 1];
  assert.match(gold, /Papa Ike/); assert.match(gold, /revue/); assert.doesNotMatch(gold, /énigme|historique|statistiques/i);
});

test('no English left, French spacing, typographic apostrophes', () => {
  const all = ALL();
  const t = ` ${all.replace(/[\n,]/g, ' ')} `;
  for (const en of [' the ', ' and ', ' your ', ' you ', ' with ', ' of ', ' to ', ' seeds ', ' board ', ' friend ', ' puzzle ', ' tap ', ' no ads ']) {
    assert.ok(!t.toLowerCase().includes(en), `"${en.trim()}" in the French`);
  }
  assert.doesNotMatch(all, / [:;?!»]/, 'a plain space before : ; ? ! or »');
  assert.doesNotMatch(all, /« /, 'a plain space after «');
  assert.doesNotMatch(all, /'/, "a straight apostrophe: French text uses ’");
  // the spacing is put in by the tool, never typed into the source, and never changes a length
  assert.doesNotMatch(JSON.stringify(RAW), / /);
  assert.equal(frPlain('Pas de réseau ? « Oya »'), 'Pas de réseau ? « Oya »');
  assert.equal(chars(frPlain('a : b')), chars('a : b'));
});

test('the links are the French pages the server serves', () => {
  for (const p of ['privacy', 'terms', 'support']) {
    assert.ok(PAGES.includes(p)); assert.equal(F.links[p], `${EN.links[p]}?lang=fr`);
  }
  assert.equal(F.links.marketing, `${EN.links.marketing}/?lang=fr`);
});

test('listing-fr.md is what tools/store-text.js writes', () => {
  assert.equal(readFileSync(OUT_FR, 'utf8'), renderFr(RAW, EN), 'run: node tools/store-text.js');
});
