// Bigger words (idea 6 Nov): Settings → Language → Word size, Normal / Large / Larger.
// Every small word on the page (the hint line, the chips under the board, the cards, Settings, Home) is drawn at
// calc(<its size> * var(--ts)); this module says what --ts is for each choice and words the row. Big words (20px and
// up: the title, the scores, headings) are already large and stay as drawn, so nothing outgrows its place.
// The page sets --ts itself before it paints (a few lines in index.html read the same saved choice), so a reload never
// flashes small words first; SCALE here and there must agree (test/textsize.test.js checks).

export const SIZES = ['normal', 'large', 'larger'];
export const SCALE = { normal: 1, large: 1.15, larger: 1.3 };
export const BIG = 20; // px: sizes at or above this are left as drawn

export function textScale(pref) { return SCALE[pref] || 1; }
export function sizePref(v) { return SIZES.includes(v) ? v : 'normal'; }

// the row's small print under "Word size"
export function sizeNote(pref) {
  const p = sizePref(pref);
  return p === 'normal' ? 'the hints, the lines under the board, the cards and Settings · as drawn'
    : p === 'large' ? 'the hints, the lines under the board, the cards and Settings · a little bigger'
    : 'the hints, the lines under the board, the cards and Settings · bigger still';
}
export function sizeToast(pref) {
  const p = sizePref(pref);
  return p === 'normal' ? 'Words as drawn' : p === 'large' ? 'Bigger words' : 'Bigger words still';
}

// Put the scale on the page: --ts on the root element (and a class for the few rules that make room for it).
export function applyScale(doc, pref) {
  const el = doc.documentElement; const s = textScale(pref);
  el.style.setProperty('--ts', String(s));
  for (const p of SIZES) el.classList.toggle('ts-' + p, p === sizePref(pref));
  return s;
}

// The CSS rewrite that made index.html scale (kept for the check and for any new rule): a font size under BIG px
// becomes calc(Npx*var(--ts)), in font-size and in the font shorthand alike; sizes already scaled are left alone.
export function scaleCss(css) {
  const one = (n) => (Number(n) < BIG ? `calc(${n}px*var(--ts))` : `${n}px`);
  return css
    .replace(/font-size:\s*([0-9.]+)px/g, (m, n) => (Number(n) < BIG ? `font-size:${one(n)}` : m))
    .replace(/(font:\s*(?:[0-9]{3}\s+)?)([0-9.]+)px/g, (m, pre, n) => (Number(n) < BIG ? `${pre}${one(n)}` : m));
}

// every small font size in a piece of CSS or markup that does NOT scale (for the check)
export function unscaled(text) {
  const out = [];
  const re = /font(?:-size)?:\s*(?:[0-9]{3}\s+)?([0-9.]+)px/g; let m;
  while ((m = re.exec(text))) if (Number(m[1]) < BIG) out.push(text.slice(Math.max(0, m.index - 60), m.index + m[0].length));
  return out;
}
