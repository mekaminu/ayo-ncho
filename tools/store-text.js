// Writes docs/launch/store/listing.md from listing.json: the store pages' words laid out field by field,
// each with its length against the store's limit, ready to paste into App Store Connect and Play Console.
// node tools/store-text.js          → rewrites the file
// (test/storepage.test.js checks the file is what this writes)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LISTING = join(ROOT, 'docs/launch/store/listing.json');
export const OUT = join(ROOT, 'docs/launch/store/listing.md');

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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const l = JSON.parse(readFileSync(LISTING, 'utf8'));
  writeFileSync(OUT, render(l));
  console.log('wrote', OUT);
}
