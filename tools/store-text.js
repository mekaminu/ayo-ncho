// Writes docs/launch/store/listing.md from listing.json: the store pages' words laid out field by field,
// each with its length against the store's limit, ready to paste into App Store Connect and Play Console.
// node tools/store-text.js          → rewrites the file (and listing-fr.md from listing-fr.json, the French)
// (test/storepage.test.js checks the file is what this writes)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LISTING = join(ROOT, 'docs/launch/store/listing.json');
export const OUT = join(ROOT, 'docs/launch/store/listing.md');
export const LISTING_FR = join(ROOT, 'docs/launch/store/listing-fr.json');
export const OUT_FR = join(ROOT, 'docs/launch/store/listing-fr.md');

// the stores' limits (characters; Apple's keywords field is also capped at 100 bytes in practice)
export const LIMITS = {
  name: 30, subtitle: 30, promotionalText: 170, keywords: 100, description: 4000, whatsNew: 4000,
  title: 30, shortDescription: 80, releaseNotes: 500, reviewNotes: 4000, caption: 32,
};

export const chars = (s) => [...String(s)].length;
export const descriptionText = (l) => l.description.join('\n');

const field = (label, text, limit) => `**${label}** (${chars(text)} of ${limit})\n\n\`\`\`text\n${text}\n\`\`\`\n`;

export function render(l) {
  const d = descriptionText(l);
  const out = [];
  out.push('# The store pages — words to paste (Launch L15)', '');
  out.push('Written from `listing.json` by `node tools/store-text.js`; edit that file, not this one. Every limit and every claim is checked against the game by `test/storepage.test.js`. The answers to the stores\' forms (age rating, privacy labels, Data safety, encryption) are in [answers.md](answers.md).', '');
  out.push('## Both stores', '');
  out.push(field('Name (App Store) / Title (Google Play)', l.name, LIMITS.name));
  out.push(field('Description (the same text on both stores)', d, LIMITS.description));
  out.push('Links: privacy policy ' + l.links.privacy + ' · support ' + l.links.support + ' · terms ' + l.links.terms + ' · website ' + l.links.marketing, '');
  out.push('## App Store Connect only', '');
  out.push(field('Subtitle', l.apple.subtitle, LIMITS.subtitle));
  out.push(field('Promotional text (can be changed any time without a new build)', l.apple.promotionalText, LIMITS.promotionalText));
  out.push(field('Keywords (comma-separated, no spaces; words already in the name and subtitle are left out — Apple searches those anyway)', l.apple.keywords, LIMITS.keywords));
  out.push(`**Category:** ${l.apple.primaryCategory}; secondary ${l.apple.secondaryCategory}`, '');
  out.push(field("What's new in this version", l.apple.whatsNew, LIMITS.whatsNew));
  out.push(field('App Review Information → Notes', l.reviewNotes.join('\n\n'), LIMITS.reviewNotes));
  out.push('## Google Play Console only', '');
  out.push(field('Short description', l.google.shortDescription, LIMITS.shortDescription));
  out.push(`**Category:** ${l.google.category} · **Tags:** ${l.google.tags.join(', ')}`, '');
  out.push(field('Release notes', l.google.whatsNew, LIMITS.releaseNotes));
  out.push('## Screenshot captions (in this order)', '');
  out.push('| # | Caption | What it shows | From |', '|---|---|---|---|');
  l.screenshots.forEach((s, i) => out.push(`| ${i + 1} | ${s.caption} | ${s.shows} | ${s.from} |`));
  out.push('', 'The captioned pictures in each store\'s sizes, Google\'s feature graphic and the preview video are the next slice of L15.', '');
  return out.join('\n');
}

// French spacing in plain text: a non-breaking space before : ; ? ! and inside « » (the same length, so every count holds).
export const frPlain = (t) => String(t).replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
// The French listing with its spacing put in, every text field (what the md shows and the test checks).
export function frListing(f) {
  const s = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? frPlain(v) : v]));
  return { ...f, name: frPlain(f.name), apple: s(f.apple), google: s(f.google), description: f.description.map(frPlain),
    screenshots: f.screenshots.map((x) => ({ caption: frPlain(x.caption) })), preview: { captions: f.preview.captions.map(frPlain) } };
}

export function renderFr(f0, en) {
  const f = frListing(f0); const d = descriptionText(f);
  const out = [];
  out.push('# The store pages in French — words to paste (Launch L18)', '');
  out.push('Written from `listing-fr.json` by `node tools/store-text.js`; edit that file, not this one. Line for line the English in [listing.md](listing.md), checked by `test/storepage-fr.test.js` (every limit, the stores\' rules, every name and number against the game, no English left). The spaces before : ; ? ! are non-breaking, as French wants: paste the text as it is.', '');
  out.push(`Where it goes: App Store Connect → the app → the language menu at the top right → add **${f.locale.apple}**, and paste each field; Play Console → Grow → Store presence → Main store listing → Manage translations → add **${f.locale.google}**. The same words can serve French (Canada) if it is added too. The screenshots stay the English ones until the French set is made; the age rating, privacy labels and Data safety answers are given once for every language (answers.md).`, '');
  out.push('## Both stores', '');
  out.push(field('Name (App Store) / Title (Google Play)', f.name, LIMITS.name));
  out.push(field('Description (the same text on both stores)', d, LIMITS.description));
  out.push('Links (the French pages): privacy policy ' + f.links.privacy + ' · support ' + f.links.support + ' · terms ' + f.links.terms + ' · website ' + f.links.marketing + '. App Store Connect takes the privacy and support links per language; Google Play has one privacy link for the app, the English one (each page links to the other language).', '');
  out.push('## App Store Connect only', '');
  out.push(field('Subtitle', f.apple.subtitle, LIMITS.subtitle));
  out.push(field('Promotional text', f.apple.promotionalText, LIMITS.promotionalText));
  out.push(field('Keywords (comma-separated; words in the French name and subtitle are left out)', f.apple.keywords, LIMITS.keywords));
  out.push(field("What's new in this version", f.apple.whatsNew, LIMITS.whatsNew));
  out.push('App Review notes are given once, in English (listing.md).', '');
  out.push('## Google Play Console only', '');
  out.push(field('Short description', f.google.shortDescription, LIMITS.shortDescription));
  out.push(field('Release notes (<fr-FR> in the release)', f.google.whatsNew, LIMITS.releaseNotes));
  out.push('## Screenshot captions (in the same order as the English)', '');
  out.push('| # | French | English |', '|---|---|---|');
  f.screenshots.forEach((s, i) => out.push(`| ${i + 1} | ${s.caption} | ${en.screenshots[i].caption} |`));
  out.push('', '## Preview video captions (in order)', '');
  out.push('| # | French | English |', '|---|---|---|');
  f.preview.captions.forEach((c, i) => out.push(`| ${i + 1} | ${c} | ${en.preview.captions[i]} |`));
  out.push('');
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const l = JSON.parse(readFileSync(LISTING, 'utf8'));
  writeFileSync(OUT, render(l));
  writeFileSync(OUT_FR, renderFr(JSON.parse(readFileSync(LISTING_FR, 'utf8')), l));
  console.log('wrote', OUT, OUT_FR);
}
