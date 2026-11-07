// Scan to join (idea 7 Nov): every QR code web/qr.js makes is read back by an independent reader (jsQR), at every
// version it can make, with every mask, and the room card carries the button and the panel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import jsQR from "jsqr";
import { qrMatrix, qrPath, qrBands, versionFor, utf8, rsRemainder, penalty, scanWords, rippleOf, QUIET, MAX_VERSION } from "../web/qr.js";
import { inviteLink } from "../web/online.js";
import { translate } from "../web/i18n.js";

// draw the code as a picture (black on white, the quiet zone round it) and read it back
function read(q, scale = 3, quiet = QUIET) {
  const n = (q.size + 2 * quiet) * scale; const px = new Uint8ClampedArray(n * n * 4).fill(255);
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.modules[y][x])
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) { const i = (((y + quiet) * scale + dy) * n + (x + quiet) * scale + dx) * 4; px[i] = px[i + 1] = px[i + 2] = 0; }
  const r = jsQR(px, n, n, { inversionAttempts: "dontInvert" }); return r ? r.data : null;
}

test("Reed–Solomon: the standard’s worked example (01234567, version 1-M)", () => {
  // ISO/IEC 18004 Annex I: data codewords of "01234567" in version 1-M and their 10 error-correction codewords
  const data = [0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11];
  assert.deepEqual(rsRemainder(data, 10), [0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55]);
});

test("an invite link reads back exactly, and is small (version 3 or 4)", () => {
  for (const base of ["https://ayo-ncho.onrender.com/", "http://127.0.0.1:8767/", "https://ayo-ncho.onrender.com/index.html"]) {
    for (const code of ["ABCD", "ZXQW", "EDNE"]) {
      const link = inviteLink(code, base); const q = qrMatrix(link);
      assert.equal(read(q), link, link);
      assert.ok(q.version <= 4, `${link} → version ${q.version}`);
      assert.equal(q.size, 17 + 4 * q.version);
    }
  }
});

test("every version 1–10 and every mask reads back", () => {
  const lens = [1, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
  const seen = new Set();
  for (const len of lens) {
    const text = Array.from({ length: len }, (_, i) => "abcdefghijklmnopqrstuvwxyz0123456789/?=:."[(i * 7 + len) % 41]).join("");
    for (let mask = 0; mask < 8; mask++) {
      const q = qrMatrix(text, { mask }); seen.add(q.version);
      assert.equal(q.mask, mask);
      assert.equal(read(q), text, `length ${len}, version ${q.version}, mask ${mask}`);
    }
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("letters beyond English (UTF-8) read back too", () => {
  for (const t of ["Nchò", "Ayo & Nchò · réserve", "Ẹ káàárọ̀ ✓"]) assert.equal(read(qrMatrix(t)), t);
});

test("the smallest version that holds it; too long says so", () => {
  assert.equal(versionFor(utf8("x".repeat(14))), 1);
  assert.equal(versionFor(utf8("x".repeat(15))), 2);
  assert.equal(versionFor(utf8("x".repeat(213))), MAX_VERSION);
  assert.equal(versionFor(utf8("x".repeat(214))), null);
  assert.throws(() => qrMatrix("x".repeat(300)));
});

test("the mask chosen is the one with the least penalty", () => {
  const link = inviteLink("ABCD", "https://ayo-ncho.onrender.com/"); const q = qrMatrix(link);
  for (let m = 0; m < 8; m++) assert.ok(penalty(q.modules) <= penalty(qrMatrix(link, { mask: m }).modules), `mask ${m}`);
});

test("drawing: the rings hold exactly the dark squares, from the middle out", () => {
  const q = qrMatrix(inviteLink("ABCD", "https://ayo-ncho.onrender.com/"));
  const count = (d) => (d.match(/M/g) || []).length;
  const dark = q.modules.flat().filter(Boolean).length;
  const bands = qrBands(q, 6); assert.equal(bands.length, 6);
  assert.equal(bands.reduce((n, d) => n + count(d), 0), dark, "every dark square in one ring");
  assert.ok(bands.every((d) => d.length > 0), "no ring empty");
  assert.ok(count(qrPath(q)) <= dark, "rows of squares are joined");
  const c = Math.floor(q.size / 2); assert.ok(rippleOf(q, c, c) < 0.05 && rippleOf(q, 0, 0) === 1);
  assert.match(bands[0], new RegExp(`^M${QUIET}|M\\d`));
});

test("the words beside it, and in French", () => {
  assert.equal(scanWords("abcd"), "Point their phone's camera here to join room ABCD");
  assert.equal(scanWords("ABCD", true), "Scan with a phone's camera to join room ABCD");
  assert.equal(translate(scanWords("ABCD"), "fr"), "Avec l’appareil photo d’un téléphone, ce code ouvre la salle ABCD");
  assert.equal(translate(scanWords("ABCD", true), "fr"), "Scannez avec l’appareil photo d’un téléphone pour rejoindre la salle ABCD");
  assert.equal(translate("QR code of the invite link to room ABCD", "fr"), "Code QR du lien d’invitation de la salle ABCD");
  assert.equal(translate("Scan", "fr"), "Scanner"); assert.equal(translate("Hide", "fr"), "Masquer");
});

test("the room card has the Scan button (off until the room is open) and the panel; the app caches qr.js", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  assert.match(html, /<button class="btn ghost plain qrBtn" id="qrBtn" type="button" disabled aria-expanded="false" aria-controls="qrPanel">/);
  assert.match(html, /<div class="qrPanel" id="qrPanel" hidden>/);
  assert.match(html, /prefers-reduced-motion:reduce\)\{\.qrTile,\.qrTile path\{animation:none;opacity:1\}/);
  assert.match(readFileSync(new URL("../web/sw.js", import.meta.url), "utf8"), /'\.\/qr\.js'/);
  const game = readFileSync(new URL("../web/game.js", import.meta.url), "utf8");
  assert.match(game, /from '\.\/qr\.js'/);
  assert.match(game, /tele\.track\('invite_sent', \{ how: 'qr' \}\)/);
});
