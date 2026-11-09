// Older phones (idea 9 Nov): the iPhone app opens from iOS 15.0 and the web link reaches Chrome, Samsung Internet and
// Safari as the family's phones have them, but CSS :has() only came with Safari 15.4, Chrome 105 and Samsung Internet 20 —
// and a browser that does not know it drops the whole rule. So every :has rule in index.html is written a second time on a
// class, and on a phone without :has this module keeps those classes true to the page (a MutationObserver, nothing on a
// phone that has :has). test/oldphones.test.js checks that every :has rule has its twin, and every mark here its rule.

// Each mark: elements matching `sel` get class `cls` while `test` holds — the same condition as the :has in index.html.
export const MARKS = [
  // .row:has(> .seg) — a Settings row with buttons wraps them under its words on a narrow phone
  { sel: '.row', cls: 'hasSeg', has: '.row:has(> .seg)', test: (el) => Array.prototype.some.call(el.children, (c) => c.classList.contains('seg')) },
  // .pzRow:has(span:nth-child(11)) — a big puzzle target (11 to 16 seeds) keeps to one row on the Fold folded
  { sel: '.pzRow', cls: 'pzLong', has: '.pzRow:has(span:nth-child(11))', test: (el) => el.children.length >= 11 && el.children[10].tagName === 'SPAN' },
  // #words:has(> :not([hidden])) ~ #tip — the first-game tip stands above the words under the board
  { sel: '#words', cls: 'wordsUp', has: '#words:has(> :not([hidden]))', test: (el) => Array.prototype.some.call(el.children, (c) => !c.hidden) },
  // #words:has(#lastMove:not([hidden])):has(#take:not([hidden])) ~ #tip — and higher still when two lines are up
  { sel: '#words', cls: 'wordsUp2', has: '#words:has(#lastMove:not([hidden])):has(#take:not([hidden]))', test: (el) => !!el.querySelector('#lastMove:not([hidden])') && !!el.querySelector('#take:not([hidden])') },
  // .lesson:has(#puzzle.open) #hint — the lesson's hint line steps aside while its card is open
  { sel: '.lesson', cls: 'pzOpen', has: '.lesson:has(#puzzle.open)', test: (el) => !!el.querySelector('#puzzle.open') },
];

// Does this browser know :has? (CSS.supports('selector(…)') itself is Safari 14.1 / Chrome 83; anything older says no.)
export function hasHas(CSSo = globalThis.CSS) {
  try { return !!(CSSo && CSSo.supports && CSSo.supports('selector(:has(a))')); } catch { return false; }
}

// Set every mark once. Only real changes touch the page, so the observer below never wakes itself.
export function markAll(root, marks = MARKS) {
  let changed = 0;
  for (const m of marks) for (const el of root.querySelectorAll(m.sel)) {
    const want = !!m.test(el);
    if (el.classList.contains(m.cls) !== want) { el.classList.toggle(m.cls, want); changed++; }
  }
  return changed;
}

// On a phone without :has: mark now, then again (once per frame at most) whenever an element comes or goes or a hidden
// or class changes. Returns a stop function, or null when the browser knows :has and nothing is needed.
export function startOldCss({ doc = globalThis.document, CSSo = globalThis.CSS, MO = globalThis.MutationObserver, frame = (f) => (globalThis.requestAnimationFrame || setTimeout)(f) } = {}) {
  if (!doc || hasHas(CSSo)) return null;
  doc.documentElement.classList.add('noHas');
  markAll(doc);
  if (!MO) return () => {};
  let due = false;
  const ob = new MO(() => { if (due) return; due = true; frame(() => { due = false; markAll(doc); }); });
  ob.observe(doc.body || doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  return () => ob.disconnect();
}
