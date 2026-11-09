// Stronger words when asked (idea 9 Nov, late night): the arithmetic tools/contrast.py uses to judge every word on a screen
// against the real pixels behind it (the carved wood, the 3D board, a card), as WCAG 2.2 measures contrast.
// Loaded into the page by the check and imported by test/contrast.test.js, so the sums the check trusts are tested.

// the relative luminance of an sRGB colour (0–255 each), WCAG 2.2
export function luminance(r, g, b) {
  const c = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

// the contrast ratio of two colours, 1 to 21
export function ratio(a, b) {
  const x = luminance(a[0], a[1], a[2]), y = luminance(b[0], b[1], b[2]);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// a word's colour as it reaches the eye over one background pixel: its own alpha and every faded parent's opacity laid over it
export function over(fg, alpha, bg) {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha));
}

// large text (24 px, or 18.66 px bold) needs 3:1, the rest 4.5:1 (WCAG AA, 1.4.3); asked for more, 4.5 and 7 (AAA, 1.4.6)
export function large(px, weight) { return px >= 24 || (px >= 18.66 && weight >= 700); }
export function needs(px, weight, more) { return large(px, weight) ? (more ? 4.5 : 3) : (more ? 7 : 4.5); }

// how a word reads over the pixels behind it: the ratio a reader meets on the worst tenth of them (one stray bright grain
// of the wood under a letter does not fail a word, a band of them does). pixels is a flat RGBA array.
export function judge(fg, alpha, pixels, share = 0.1) {
  const rs = [];
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const bg = [pixels[i], pixels[i + 1], pixels[i + 2]];
    rs.push(ratio(over(fg, alpha, bg), bg));
  }
  if (!rs.length) return 21;
  rs.sort((a, b) => a - b);
  return rs[Math.min(rs.length - 1, Math.floor(rs.length * share))];
}
