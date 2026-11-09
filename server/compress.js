// Quick on a slow line (idea 8 Nov): the game's own files go out compressed. Express sends files as they are, so a first open of the
// game link downloaded about 1.1 MB of script and page from this server (and the 3D library 0.7 MB more when it came from here) —
// on a 3G line in Nigeria that is most of the wait before the board. Text files are squeezed with Brotli (every phone's browser
// reads it; gzip for the few that do not) once, the first time each is asked for, and kept in memory with their ETag, so the
// free plan's small processor does the work once per file per deploy, not once per phone. A changed file on disk (a local run)
// is squeezed again. The page itself (index.html, written per address for its link preview) is squeezed as it is sent, quickly.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";

const TYPES = {
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
};
export const MIN_BYTES = 1024; // below this the squeeze saves less than the headers cost

// which encoding a phone accepts: br first, then gzip; null for none (a q=0 says no)
export function pickEncoding(header = "") {
  const ok = {};
  for (const part of String(header).toLowerCase().split(",")) {
    const [name, ...params] = part.trim().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    ok[name.trim()] = q ? parseFloat(q.slice(2)) > 0 : true;
  }
  if (ok.br) return "br";
  if (ok.gzip) return "gzip";
  if (ok["*"] && ok.br !== false) return "br";
  return null;
}

export function squeeze(buf, enc, quick = false) {
  if (enc === "br") return zlib.brotliCompressSync(buf, { params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: quick ? 5 : 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT } });
  return zlib.gzipSync(buf, { level: quick ? 6 : 9 });
}

const etagOf = (buf) => '"' + createHash("sha1").update(buf).digest("base64url").slice(0, 22) + '"';
const fresh = (req, etag) => String(req.headers["if-none-match"] || "").split(",").some((t) => t.trim().replace(/^W\//, "") === etag);

// a text body sent squeezed when the phone takes it (the page, written per request). finish(body) → { body, headers }, if given,
// writes the body as it is sent once it is known the phone needs it (the page's nonce and its policy, server/headers.js): the
// ETag is the body's before finish, so a page the phone already has is still a 304, and the 304 carries none of finish's headers
export function sendText(req, res, body, type = "text/html; charset=utf-8", finish = null) {
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.set("Content-Type", type); res.vary("Accept-Encoding");
  const etag = etagOf(buf); res.set("ETag", etag);
  if (fresh(req, etag)) return res.status(304).end();
  if (finish) {
    const f = finish(buf.toString("utf8"));
    for (const [k, v] of Object.entries(f.headers || {})) res.set(k, v);
    buf = Buffer.from(String(f.body));
  }
  const enc = buf.length >= MIN_BYTES ? pickEncoding(req.headers["accept-encoding"]) : null;
  if (!enc) return res.send(buf);
  res.set("Content-Encoding", enc);
  return res.send(squeeze(buf, enc, true));
}

// middleware: GET/HEAD of a text file under dir is answered from the squeezed copy; anything else goes on to express.static
export function compressedStatic(dir, { maxAge = 0, headers = {}, file = null } = {}) {
  const cache = new Map(); // abs path → { mtime, size, etag, raw, br?, gzip? }
  const root = path.resolve(dir);
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    let abs;
    if (file) abs = file;
    else {
      let rel; try { rel = decodeURIComponent(req.path); } catch { return next(); }
      if (rel.endsWith("/")) rel += "index.html";
      abs = path.resolve(root, "." + rel);
      if (abs !== root && !abs.startsWith(root + path.sep)) return next();
    }
    const type = TYPES[path.extname(abs).toLowerCase()];
    if (!type) return next();
    let st; try { st = fs.statSync(abs); } catch { return next(); }
    if (!st.isFile()) return next();
    let e = cache.get(abs);
    if (!e || e.mtime !== st.mtimeMs || e.size !== st.size) {
      const raw = fs.readFileSync(abs);
      e = { mtime: st.mtimeMs, size: st.size, raw, etag: etagOf(raw) };
      cache.set(abs, e);
    }
    res.set("Content-Type", type); res.vary("Accept-Encoding");
    res.set("Cache-Control", "public, max-age=" + Math.floor(maxAge));
    for (const [k, v] of Object.entries(headers)) res.set(k, v);
    res.set("ETag", e.etag);
    if (fresh(req, e.etag)) return res.status(304).end();
    const enc = e.raw.length >= MIN_BYTES ? pickEncoding(req.headers["accept-encoding"]) : null;
    let body = e.raw;
    if (enc) { if (!e[enc]) e[enc] = squeeze(e.raw, enc); body = e[enc]; res.set("Content-Encoding", enc); }
    res.set("Content-Length", String(body.length));
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).end(body);
  };
}
