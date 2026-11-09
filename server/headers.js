// Locked doors (idea 9 Nov): what the server tells every browser about the game's link, before the stores send strangers to it.
// The page shows words other people typed — a friend's name at the door, a watcher's name, a name in a shared link — and the
// game writes them as text, but one slip anywhere (a name put in as markup) would let a stranger's "name" run a script on the
// family's board. So the page now comes with a Content-Security-Policy that says exactly what it may run and load:
//   - scripts only from the game's own server, three.js's CDN, and the page's own inline scripts, each carrying this response's
//     nonce (a fresh random key every time the page is sent); the import map, which the page writes with document.write, is let
//     in by its hash (one for the CDN's three.js, one for the server's own copy) — nothing typed into the page can run, an
//     onerror="…" in a name included;
//   - blob: scripts, which es-module-shims makes on older iPhones (iOS before 16.4) to read the import map; it reads the nonce
//     from the page and carries it into its feature-test frame, so that keeps working too;
//   - the fonts from Google Fonts, pictures from the server and the board's own canvases (data:, blob:), the clip's video (blob:),
//     the AI's worker, connections only back to this server (its WebSocket too), three.js's CDN and the page's own blob: and data: (es-module-shims
//     reads its test modules back that way, a CSS one among them: style-src takes blob: too);
//   - no plugins (object-src 'none'), no <base> (base-uri 'none'), forms only to the server.
// Styles stay open to inline style (the game sets element styles everywhere; a style cannot run anything).
// Every response also says nosniff (a file is only ever what its type says), a same-origin referrer (an invite link's room code
// never travels to the CDN or the font server), a Permissions-Policy that keeps the camera and microphone to this page (video at
// the board) and turns off what the game never uses, and, over HTTPS, Strict-Transport-Security. Framing stays allowed: the web
// link sells nothing and holds no account, so there is nothing to trick a tap out of, and the game can still be shown in a frame.
// A 304 keeps the page the browser already has, and that page's nonce: the policy is sent only with a page's body, never with a
// 304, so the stored policy and the stored page always match (a cache updates its headers from a 304).
// The privacy, terms and support pages run no script at all and get a policy that says so.
import { randomBytes, createHash } from "node:crypto";

export const CDN = "https://cdnjs.cloudflare.com";
export const FONT_CSS = "https://fonts.googleapis.com";
export const FONT_FILES = "https://fonts.gstatic.com";
export const PERMISSIONS = "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), serial=(), midi=()";
export const HSTS = "max-age=63072000";

export function makeNonce() { return randomBytes(18).toString("base64"); }

const sha256 = (s) => "'sha256-" + createHash("sha256").update(s, "utf8").digest("base64") + "'";

// every <script> opening tag of the page gets the nonce (inline and src alike: es-module-shims finds the nonce on any of them);
// a script's body is never touched (the import map written by document.write sits inside one, as a string)
export function addNonce(html, nonce) {
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (all, attrs, body) =>
    /\bnonce=/.test(attrs) ? all : `<script nonce="${nonce}"${attrs}>${body}</script>`);
}

// the two import maps the page can write (window.__ayo3d: the CDN's three.js, or the server's own copy) and their hashes
export function importMaps(html) {
  const m = html.match(/window\.__ayo3d=window\.__ayo3dLocal\?'([^']+)':'([^']+)'/);
  if (!m) return [];
  return [m[2], m[1]].map((url) => `{"imports":{"three":"${url}"}}`);
}
export function importMapHashes(html) { return importMaps(html).map(sha256); }

// the server's own address for the WebSocket line, from the Host header (only a plain host[:port] is trusted into the policy)
export function socketSources(host, secure) {
  const h = String(host || "").toLowerCase();
  if (!/^[a-z0-9.-]{1,253}(:\d{1,5})?$/.test(h)) return [];
  return secure ? ["wss://" + h] : ["ws://" + h, "wss://" + h];
}

export function pagePolicy({ nonce, hashes = [], host = "", secure = false } = {}) {
  return [
    "default-src 'self'",
    ["script-src 'self'", `'nonce-${nonce}'`, ...hashes, CDN, "blob:"].join(" "),
    `style-src 'self' 'unsafe-inline' ${FONT_CSS} blob:`,
    `font-src 'self' ${FONT_FILES} data:`,
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    ["connect-src 'self'", ...socketSources(host, secure), CDN, "blob:", "data:"].join(" "),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");
}

// the privacy, terms and support pages: their own inline style and the icon, nothing else
export const LEGAL_POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'";

export const isSecure = (req) => req.secure || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";

// middleware for every response
export function baseHeaders(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "same-origin");
  res.set("Permissions-Policy", PERMISSIONS);
  if (isSecure(req)) res.set("Strict-Transport-Security", HSTS);
  next();
}

// the page as it goes out: a new nonce on its scripts and the policy that names it
export function lockPage(html, req) {
  const nonce = makeNonce();
  return { html: addNonce(html, nonce), policy: pagePolicy({ nonce, hashes: importMapHashes(html), host: req.headers.host, secure: isSecure(req) }) };
}
