// A QR code for the room's invite link (idea 7 Nov, "Scan to join"): a friend beside you points their phone's camera at the
// Rooms card and lands at your door. Our own small encoder, so nothing is fetched and it works in the store apps with no
// signal: byte mode, error correction M (15% of the code can be smudged or covered), versions 1–10 (up to 213 bytes —
// an invite link is about 40). Written from the QR standard (ISO/IEC 18004); test/qr.test.js reads every code it makes
// back with jsQR, and tools/render.py --qr reads the one on the screen with OpenCV's own reader.
// No DOM: qrMatrix(text) → { size, version, mask, modules: rows of booleans (true = dark) }; qrPath(m) → an SVG path.

// error correction M, versions 1..10: [total codewords, EC codewords per block, blocks]
const TABLE = [null, [26, 10, 1], [44, 16, 1], [70, 26, 1], [100, 18, 2], [134, 24, 2], [172, 16, 4], [196, 18, 4], [242, 22, 4], [292, 22, 5], [346, 26, 5]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
export const MAX_VERSION = 10;

function gfMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; }
function rsDivisor(degree) {
  const r = Array(degree).fill(0); r[degree - 1] = 1; let root = 1;
  for (let i = 0; i < degree; i++) { for (let j = 0; j < degree; j++) { r[j] = gfMul(r[j], root); if (j + 1 < degree) r[j] ^= r[j + 1]; } root = gfMul(root, 2); }
  return r;
}
export function rsRemainder(data, degree) {
  const div = rsDivisor(degree), r = Array(degree).fill(0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < degree; i++) r[i] ^= gfMul(div[i], f); }
  return r;
}
const dataCap = (v) => { const [total, ec, blocks] = TABLE[v]; return total - ec * blocks; }; // data codewords
const countBits = (v) => (v < 10 ? 8 : 16);

export function utf8(text) { return typeof TextEncoder !== 'undefined' ? [...new TextEncoder().encode(text)] : [...Buffer.from(text, 'utf8')]; }
// the smallest version that holds the text (null when even version 10 cannot)
export function versionFor(bytes) {
  for (let v = 1; v <= MAX_VERSION; v++) if (4 + countBits(v) + 8 * bytes.length <= dataCap(v) * 8) return v;
  return null;
}

// the data codewords: mode 0100 (bytes), the count, the bytes, a terminator, then the pad bytes 0xEC 0x11 …
export function dataCodewords(bytes, v) {
  const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, countBits(v)); for (const b of bytes) put(b, 8);
  const cap = dataCap(v) * 8; put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  const out = []; for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; out.length < dataCap(v); pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}
// split into blocks, add each block's error correction, interleave
export function allCodewords(data, v) {
  const [total, ec, nb] = TABLE[v]; const shortLen = Math.floor(total / nb) - ec, nShort = nb - (total % nb);
  const blocks = []; let k = 0;
  for (let i = 0; i < nb; i++) { const len = shortLen + (i < nShort ? 0 : 1); const d = data.slice(k, k + len); k += len; blocks.push({ d, e: rsRemainder(d, ec) }); }
  const out = [];
  for (let i = 0; i <= shortLen; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < ec; i++) for (const b of blocks) out.push(b.e[i]);
  return out;
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function build(codewords, v, mask) {
  const size = 17 + 4 * v; const m = Array.from({ length: size }, () => Array(size).fill(false)); const fn = Array.from({ length: size }, () => Array(size).fill(false));
  const set = (x, y, dark) => { m[y][x] = !!dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); } // timing
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) // finders and their light borders
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= size || y >= size) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); }
  const al = ALIGN[v], n = al.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // format (error correction M = 00, the mask) with its BCH bits, both copies, and the one always-dark module
  const fdata = (0 << 3) | mask; let rem = fdata; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const fb = ((fdata << 10) | rem) ^ 0x5412; const bit = (x, i) => ((x >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(8, i, bit(fb, i));
  set(8, 7, bit(fb, 6)); set(8, 8, bit(fb, 7)); set(7, 8, bit(fb, 8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(fb, i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(fb, i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(fb, i));
  set(8, size - 8, true);
  if (v >= 7) { // the version, twice, near the two far finders
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const vb = (v << 12) | r; for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, bit(vb, i)); set(b, a, bit(vb, i)); }
  }
  // the data, two columns at a time in a zigzag from the bottom right, then the mask over it
  let k = 0; const nbits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (fn[y][x]) continue;
      const d = k < nbits ? bit(codewords[k >>> 3], 7 - (k & 7)) : false; k++;
      m[y][x] = d !== MASKS[mask](x, y);
    }
  }
  return m;
}

// the standard's penalty: runs of five or more, 2×2 blocks, finder-like stretches, and dark/light balance
export function penalty(m) {
  const size = m.length; let p = 0;
  const line = (get) => {
    for (let i = 0; i < size; i++) {
      let run = 1;
      for (let j = 1; j <= size; j++) { if (j < size && get(i, j) === get(i, j - 1)) run++; else { if (run >= 5) p += 3 + run - 5; run = 1; } }
      const s = Array.from({ length: size }, (_, j) => (get(i, j) ? '1' : '0')).join('');
      for (const pat of ['10111010000', '00001011101']) { let at = s.indexOf(pat); while (at >= 0) { p += 40; at = s.indexOf(pat, at + 1); } }
    }
  };
  line((i, j) => m[i][j]); line((i, j) => m[j][i]);
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
  let dark = 0; for (const r of m) for (const c of r) dark += c; const total = size * size;
  p += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return p;
}

// the code for a text: the smallest version, the mask with the least penalty (or the one asked for)
export function qrMatrix(text, { mask } = {}) {
  const bytes = utf8(String(text)); const v = versionFor(bytes); if (!v) throw new Error('too long for a QR code here');
  const cw = allCodewords(dataCodewords(bytes, v), v);
  let best = null;
  for (let k = 0; k < 8; k++) {
    if (mask != null && k !== mask) continue;
    const mm = build(cw, v, k), pen = penalty(mm);
    if (!best || pen < best.pen) best = { modules: mm, mask: k, pen };
  }
  return { size: 17 + 4 * v, version: v, mask: best.mask, modules: best.modules };
}

// one SVG path of unit squares for the dark modules, offset by the quiet zone (4 modules, as the standard asks)
export const QUIET = 4;
export function qrPath(q, quiet = QUIET) {
  let d = '';
  q.modules.forEach((row, y) => { let x = 0; while (x < q.size) { if (!row[x]) { x++; continue; } let w = 1; while (x + w < q.size && row[x + w]) w++; d += `M${x + quiet} ${y + quiet}h${w}v1h-${w}z`; x += w; } });
  return d;
}
// the same squares in `n` rings from the middle out, one path each, so the code can be drawn in ring by ring
export function qrBands(q, n = 6, quiet = QUIET) {
  const out = Array(n).fill('');
  q.modules.forEach((row, y) => row.forEach((dark, x) => { if (dark) out[Math.min(n - 1, Math.floor(rippleOf(q, x, y) * n))] += `M${x + quiet} ${y + quiet}h1v1h-1z`; }));
  return out;
}
// how far each module lies from the middle, 0..1 (the code is drawn in from the middle outwards, like ripples)
export function rippleOf(q, x, y) { const c = (q.size - 1) / 2; return Math.min(1, Math.hypot(x - c, y - c) / (c * Math.SQRT2)); }

// the words beside the code
export function scanWords(code, wide = false) {
  const c = String(code || '').toUpperCase();
  return wide ? `Scan with a phone's camera to join room ${c}` : `Point their phone's camera here to join room ${c}`;
}
