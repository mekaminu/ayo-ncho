// Builds the web files the store apps carry (app/www), from web/ and engine/ as they are:
//   - three.js from node_modules (pinned 0.170.0) instead of cdnjs, and the two fonts (Fraunces, Inter; Open Font Licence)
//     from @fontsource instead of Google Fonts, so the app opens and looks right with no signal;
//   - no service worker (the app already has every file);
//   - nothing else changes: web/app.js notices it is inside the app and points rooms at the live server.
// Run: node tools/build-app.js   (then npx cap sync android). test/app.test.js builds it into a temp folder and checks it.
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js';
export const FONTS = [
  ['Fraunces', 600, 'fraunces', 'fraunces-latin-600-normal.woff2'], ['Fraunces', 700, 'fraunces', 'fraunces-latin-700-normal.woff2'],
  ['Inter', 400, 'inter', 'inter-latin-400-normal.woff2'], ['Inter', 500, 'inter', 'inter-latin-500-normal.woff2'], ['Inter', 600, 'inter', 'inter-latin-600-normal.woff2'],
];

// index.html for the app, from the web one: every outside address swapped for a file inside the app.
export function appHtml(html) {
  let out = html;
  const swap = (from, to, what) => { if (!out.includes(from)) throw new Error(`index.html: ${what} not found`); out = out.split(from).join(to); };
  swap(THREE_CDN, './vendor/three.module.min.js', 'three.js from cdnjs');
  out = out.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n?/, '');
  const fonts = out.match(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">/);
  if (!fonts) throw new Error('index.html: Google Fonts link not found');
  out = out.replace(fonts[0], '<link href="./fonts/fonts.css" rel="stylesheet">');
  const sw = out.match(/<script>if \('serviceWorker' in navigator[^<]*<\/script>\n?/);
  if (!sw) throw new Error('index.html: service worker registration not found');
  out = out.replace(sw[0], '');
  return out;
}

export function fontsCss() {
  return FONTS.map(([family, weight, , file]) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(./${file}) format('woff2')}`).join('\n') + '\n';
}

export function build(out = path.join(ROOT, 'app', 'www')) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(path.join(ROOT, 'web'))) if (f !== 'sw.js' && f !== 'index.html') cpSync(path.join(ROOT, 'web', f), path.join(out, f), { recursive: true });
  cpSync(path.join(ROOT, 'engine'), path.join(out, 'engine'), { recursive: true });
  mkdirSync(path.join(out, 'vendor'));
  cpSync(path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.min.js'), path.join(out, 'vendor', 'three.module.min.js'));
  cpSync(path.join(ROOT, 'node_modules', 'three', 'LICENSE'), path.join(out, 'vendor', 'three-LICENSE.txt'));
  mkdirSync(path.join(out, 'fonts'));
  for (const [, , pkg, file] of FONTS) cpSync(path.join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file), path.join(out, 'fonts', file));
  writeFileSync(path.join(out, 'fonts', 'fonts.css'), fontsCss());
  writeFileSync(path.join(out, 'index.html'), appHtml(readFileSync(path.join(ROOT, 'web', 'index.html'), 'utf8')));
  let commit = 'dev'; try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
  const version = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  writeFileSync(path.join(out, 'build.json'), JSON.stringify({ version, commit, built: new Date().toISOString() }) + '\n');
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = build(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  console.log('app web files in', path.relative(process.cwd(), out) || '.', existsSync(path.join(out, 'vendor', 'three.module.min.js')) ? '(three.js inside)' : '');
}
