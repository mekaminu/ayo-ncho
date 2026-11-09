// Older phones (idea 9 Nov): everything the game ships must start on the oldest phones it says it supports — the iPhone app
// from iOS 15.0 (ios/ IPHONEOS_DEPLOYMENT_TARGET), and on the web link Safari 15.0, Chrome 90 and Samsung Internet 15. A
// script that uses something newer throws, and on a module the whole board never starts; a CSS rule that does is dropped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { MARKS, hasHas, markAll, startOldCss } from '../web/oldcss.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const html = read('web/index.html');

// Every script the page runs: the game's modules, the engine, and the inline scripts in index.html.
const modules = [
  ...readdirSync(new URL('web/', root)).filter((f) => f.endsWith('.js') && f !== 'es-module-shims.js' && f !== 'sw.js').map((f) => 'web/' + f),
  ...readdirSync(new URL('engine/', root)).filter((f) => f.endsWith('.js')).map((f) => 'engine/' + f),
];
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => !/importmap/.test(m[1]) && m[2].trim()).map((m, i) => ({ name: 'index.html inline script ' + (i + 1), code: m[2], type: /module/.test(m[1]) ? 'module' : 'script' }));
const sources = [...modules.map((p) => ({ name: p, code: read(p), type: 'module' })), ...inline, { name: 'web/sw.js', code: read('web/sw.js'), type: 'script' }];

// Methods and globals newer than the floor, with the first versions that have them.
const NEW_METHODS = { hasOwn: 'Object.hasOwn: Safari 15.4, Chrome 93', at: '.at(): Safari 15.4, Chrome 92', findLast: 'Safari 15.4, Chrome 97', findLastIndex: 'Safari 15.4, Chrome 97', toSorted: 'Safari 16, Chrome 110', toReversed: 'Safari 16, Chrome 110', toSpliced: 'Safari 16, Chrome 110', groupBy: 'Safari 17.4, Chrome 117', withResolvers: 'Safari 17.4, Chrome 119', randomUUID: 'Safari 15.4, Chrome 92', fromAsync: 'Safari 16.4, Chrome 121', transferControlToOffscreen: 'Safari 16.4', union: 'Safari 17, Chrome 122', intersection: 'Safari 17, Chrome 122', hasBeenActive: 'navigator.userActivation: Safari 16.4' };
const NEW_GLOBALS = { structuredClone: 'Safari 15.4, Chrome 98', BroadcastChannel: 'Safari 15.4', OffscreenCanvas: 'Safari 16.4', CompressionStream: 'Safari 16.4', DecompressionStream: 'Safari 16.4', requestIdleCallback: 'not in Safari at all', AbortSignal_timeout: 'Safari 16', Iterator: 'Safari 18.4' };
// A newer thing is fine only where the code asks first: `typeof X`, `globalThis.X`/`window.X`/`self.X`, `'X' in …`,
// `X && X.y` or `a.b && a.b.hasBeenActive` — the line keeps working without it.
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const ASKED = /typeof\s|globalThis\.|window\.|self\.|\bin\s|&&|\?\./;

function problems({ name, code, type }) {
  const out = [];
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: type, locations: true, allowHashBang: false }); } catch (e) { return [`${name}: syntax newer than ES2022 (Safari 15.0 / Chrome 90 cannot read it): ${e.message}`]; }
  const lines = code.split('\n');
  const line = (n) => lines[n.loc.start.line - 1];
  walk.full(ast, (n) => {
    if (n.type === 'StaticBlock') out.push(`${name}:${n.loc.start.line}: a class static block (Safari 16.4)`);
    if (n.type === 'Literal' && n.regex) {
      if (/\(\?<[=!]/.test(n.regex.pattern)) out.push(`${name}:${n.loc.start.line}: a regex lookbehind (Safari 16.4) — the whole file fails to load`);
      if (/[vd]/.test(n.regex.flags) && n.regex.flags.includes('v')) out.push(`${name}:${n.loc.start.line}: the regex v flag (Safari 17)`);
    }
    if (n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier') {
      const p = n.property.name;
      if (p === 'hasOwn' && n.object.type === 'Identifier' && n.object.name === 'Object') out.push(`${name}:${n.loc.start.line}: ${NEW_METHODS.hasOwn}`);
      else if (p !== 'hasOwn' && own(NEW_METHODS, p) && !(p === 'hasBeenActive' && ASKED.test(line(n)))) {
        // .at( is also three.js's Ray.at and our own objects' — flag it only as a call on something array- or string-like
        if (p === 'at' && !/\]\s*\.at\(|['"`]\s*\.at\(|\.(?:slice|split|filter|map|children|keys|values)\([^)]*\)\.at\(/.test(line(n))) return;
        if (p === 'union' || p === 'intersection') return; // only flagged on Set by the line check below
        out.push(`${name}:${n.loc.start.line}: .${p} (${NEW_METHODS[p]})`);
      }
      if (p === 'timeout' && n.object.type === 'Identifier' && n.object.name === 'AbortSignal' && !ASKED.test(line(n))) out.push(`${name}:${n.loc.start.line}: AbortSignal.timeout (${NEW_GLOBALS.AbortSignal_timeout})`);
    }
    if (n.type === 'Identifier' && own(NEW_GLOBALS, n.name) && !ASKED.test(line(n))) out.push(`${name}:${n.loc.start.line}: ${n.name} unasked (${NEW_GLOBALS[n.name]})`);
  });
  return out;
}

test('every script the game runs reads and runs on Safari 15.0 and Chrome 90 (iOS 15 is the app\'s floor)', () => {
  assert.ok(sources.length > 100, 'all the scripts found: ' + sources.length);
  assert.match(read('ios/App/App.xcodeproj/project.pbxproj'), /IPHONEOS_DEPLOYMENT_TARGET = 15\.0;/, 'the floor this test holds to');
  const all = sources.flatMap(problems);
  assert.deepEqual(all, []);
});

test('the scanner itself catches what it is for', () => {
  const p = (code, type = 'module') => problems({ name: 'x', code, type });
  assert.equal(p('Object.hasOwn(a, "b")').length, 1);
  assert.equal(p('const x = [1,2].at(-1)').length, 1);
  assert.equal(p('const y = structuredClone(a)').length, 1);
  assert.equal(p('const y = typeof structuredClone === "function" ? structuredClone(a) : a').length, 0, 'asked first');
  assert.equal(p('const C = globalThis.CompressionStream').length, 0);
  assert.equal(p('class A { static { this.x = 1 } }').length, 1);
  assert.equal(p('const r = /(?<=a)b/').length, 1);
  assert.equal(p('a ||= 1; b ??= 2; class B { #p = 1; #m() {} }').length, 0, 'ES2021 and private members are in Safari 15');
  assert.equal(p('ray.at(t, v)').length, 0, "three's Ray.at is no array");
  assert.ok(p('const x = a ?.. b')[0].includes('syntax'));
  assert.equal(problems({ name: 'x', code: 'await 1', type: 'script' }).length, 1, 'a classic script cannot await');
});

// The CSS: rules (outside @keyframes) as [selector, body].
const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
function rules(text) {
  const out = []; let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i); if (open < 0) break;
    const sel = text.slice(i, open).trim();
    if (sel.startsWith('@')) {
      // @media / @supports hold rules; @keyframes / @font-face do not hold selectors
      let depth = 1, j = open + 1; while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      const inner = text.slice(open + 1, j - 1);
      if (/^@(media|supports)/.test(sel)) out.push(...rules(inner));
      i = j; continue;
    }
    const close = text.indexOf('}', open); out.push([sel, text.slice(open + 1, close)]); i = close + 1;
  }
  return out;
}
const parts = (sel) => { const o = []; let d = 0, s = ''; for (const c of sel) { if (c === '(') d++; if (c === ')') d--; if (c === ',' && !d) { o.push(s.trim()); s = ''; } else s += c; } o.push(s.trim()); return o; };
const NEW_SELECTORS = /:has\(|:focus-visible/;

test('no newer selector shares a rule with others (an older browser drops the whole rule)', () => {
  const all = rules(css); assert.ok(all.length > 300, 'the rules found: ' + all.length);
  const bad = all.filter(([s]) => parts(s).length > 1 && parts(s).some((x) => NEW_SELECTORS.test(x)) && !parts(s).every((x) => NEW_SELECTORS.test(x)));
  assert.deepEqual(bad.map(([s]) => s), []);
});

test('every :has rule has its twin on a class that web/oldcss.js keeps, and every mark is used', () => {
  const all = rules(css);
  const has = all.filter(([s]) => s.includes(':has('));
  assert.ok(has.length >= 6);
  for (const [s, body] of has) {
    const m = MARKS.find((k) => s.startsWith(k.has));
    assert.ok(m, 'a mark for ' + s);
    const twin = s.replace(m.has, m.has.split(':has(')[0] + '.' + m.cls);
    assert.ok(all.some(([t, b]) => t === twin && b.trim() === body.trim()), `the twin "${twin}" with the same declarations`);
  }
  for (const m of MARKS) assert.ok(has.some(([s]) => s.startsWith(m.has)), 'mark ' + m.cls + ' has its :has rule');
});

test('no individual translate / scale / rotate outside an animation (Chrome 104, Samsung Internet 20)', () => {
  const bad = rules(css).filter(([, b]) => /(^|;)\s*(translate|scale|rotate)\s*:/.test(b));
  assert.deepEqual(bad.map(([s]) => s), []);
});

// A small stand-in for the page, enough for the marks.
function el(tag, { cls = [], id = '', hidden = false } = {}, kids = []) {
  const e = { tagName: tag.toUpperCase(), id, hidden, children: kids, classes: new Set(cls), toggles: 0 };
  e.classList = { contains: (c) => e.classes.has(c), toggle: (c, on) => { e.toggles++; on ? e.classes.add(c) : e.classes.delete(c); }, add: (c) => e.classes.add(c) };
  const every = () => kids.flatMap((k) => [k, ...k.every()]);
  e.every = every;
  const matches = (x, sel) => {
    const m = sel.match(/^(\w+)?(?:#([\w-]+))?((?:\.[\w-]+)*)(:not\(\[hidden\]\))?$/);
    return (!m[1] || x.tagName === m[1].toUpperCase()) && (!m[2] || x.id === m[2]) && m[3].split('.').filter(Boolean).every((c) => x.classes.has(c)) && (!m[4] || !x.hidden);
  };
  e.querySelectorAll = (sel) => every().filter((x) => matches(x, sel)); // like the DOM: what is inside, never the element itself
  e.querySelector = (sel) => every().find((x) => matches(x, sel)) || null;
  return e;
}

test('the marks follow the page as :has would', () => {
  const seg = el('div', { cls: ['seg'] }); const plain = el('div', { cls: ['row'] }, [el('div', { cls: ['t'] })]);
  const row = el('div', { cls: ['row'] }, [el('div', { cls: ['t'] }), seg]);
  const spans = Array.from({ length: 11 }, () => el('span'));
  const pz = el('div', { cls: ['pzRow'] }, spans); const pzShort = el('div', { cls: ['pzRow'] }, spans.slice(0, 10));
  const last = el('div', { id: 'lastMove', hidden: true }); const take = el('div', { id: 'take', hidden: true });
  const words = el('div', { id: 'words' }, [last, take]);
  const puzzle = el('section', { id: 'puzzle' }); const lesson = el('body', { cls: ['lesson'] }, [puzzle]);
  const doc = el('root', {}, [row, plain, pz, pzShort, words, lesson]);
  markAll(doc);
  assert.ok(row.classes.has('hasSeg') && !plain.classes.has('hasSeg'));
  assert.ok(pz.classes.has('pzLong') && !pzShort.classes.has('pzLong'));
  assert.ok(!words.classes.has('wordsUp') && !words.classes.has('wordsUp2'));
  last.hidden = false; markAll(doc);
  assert.ok(words.classes.has('wordsUp') && !words.classes.has('wordsUp2'));
  take.hidden = false; markAll(doc);
  assert.ok(words.classes.has('wordsUp2'));
  last.hidden = true; take.hidden = true; markAll(doc);
  assert.ok(!words.classes.has('wordsUp') && !words.classes.has('wordsUp2'), 'and back');
  assert.ok(!lesson.classes.has('pzOpen')); puzzle.classes.add('open'); markAll(doc); assert.ok(lesson.classes.has('pzOpen'));
  const before = row.toggles; assert.equal(markAll(doc), 0, 'nothing changed, nothing touched'); assert.equal(row.toggles, before);
});

test('only a browser without :has gets the marks, and the observer wakes once a frame at most', () => {
  assert.equal(hasHas({ supports: (s) => s === 'selector(:has(a))' }), true);
  assert.equal(hasHas({ supports: () => false }), false);
  assert.equal(hasHas({ supports: () => { throw new Error('old'); } }), false);
  assert.equal(hasHas(undefined), false);
  const page = el('root', {}, [el('div', { cls: ['row'] }, [el('div', { cls: ['seg'] })])]);
  page.documentElement = el('html'); page.body = page;
  assert.equal(startOldCss({ doc: page, CSSo: { supports: () => true } }), null, 'nothing on a phone with :has');
  assert.ok(!page.documentElement.classes.has('noHas'));
  let cb = null, frames = 0, observed = null;
  class MO { constructor(f) { cb = f; } observe(t, o) { observed = o; } disconnect() { cb = null; } }
  const queued = [];
  const stop = startOldCss({ doc: page, CSSo: { supports: () => false }, MO, frame: (f) => { frames++; queued.push(f); } });
  assert.ok(page.documentElement.classes.has('noHas') && page.children[0].classes.has('hasSeg'), 'marked at once');
  assert.deepEqual(observed.attributeFilter, ['hidden', 'class']);
  cb([]); cb([]); cb([]); assert.equal(frames, 1, 'three changes, one frame');
  queued.shift()(); cb([]); assert.equal(frames, 2);
  stop(); assert.equal(cb, null);
});

test('the game starts the marks, and they are carried offline', () => {
  assert.match(read('web/game.js'), /import \{ startOldCss \} from '\.\/oldcss\.js'/);
  assert.match(read('web/game.js'), /try \{ startOldCss\(\); \} catch \{\}/);
  assert.match(read('web/sw.js'), /'\.\/oldcss\.js'/);
  assert.doesNotMatch(read('engine/ayo.js'), /Object\.hasOwn\(/, 'the engine, which the board needs to start');
});
