// Found by search (idea 9 Nov): until the store apps are out, a cousin who hears of the game and types "Ayo Nigerian mancala"
// into Google should find the game's link and read in the result what it is. And the links the family send each other — an
// invite (?room=, with the host's typed name in its card), a watch link (?watch=, the players' names), a best turn to beat
// (?beat=…&n=, the sender's name), today's puzzle — must never become search results of their own, with a name in the title.
//
// So the page the server writes (server/preview.js, at the same mark as the link's card) also carries:
//   - <link rel="canonical"> to the game's bare address, whatever the address asked (?lang=fr, ?utm_…, a hand-typed query),
//     so a search engine counts every way into the game as the one page;
//   - <meta name="robots" content="noindex"> on every private or day-only link (room, watch, beat, a friend's name, the
//     puzzle), and the same as an X-Robots-Tag header, which crawlers read before the page;
//   - on the game's own page only, a JSON-LD block (schema.org VideoGame): the name, the other names it goes by, what it is,
//     free (no price), the languages, the board picture. A data block, never run: the page's policy (server/headers.js) is
//     not asked to let anything in, and every "<" in it is written \u003c so no typed text can close the tag (nothing typed
//     is in it anyway).
// /robots.txt lets crawlers read the game and the store pages and keeps them off /api/, /version, /healthz and the socket;
// /sitemap.xml lists the game and the privacy, terms and support pages. Both are written from the address asked, like the card.
// Nothing here is kept or logged.
import { esc } from "./legal.js";
import { IMAGE } from "./preview.js";

// the addresses a person sends to a person: never a search result
export const PRIVATE = ["room", "watch", "beat", "n", "a", "b", "puzzle"];
export const PAGES = ["/", "/privacy", "/terms", "/support"];
export const HIDDEN = ["/api/", "/ws", "/version", "/healthz"];

export function indexable(query = {}) {
  return !PRIVATE.some((k) => Object.prototype.hasOwnProperty.call(query, k));
}

const ABOUT = {
  en: "The Nigerian seed game on a carved wooden board, in real 3D: Nchò (the Igbo game, relay sowing and a capture of 4) and Ayo (the Yoruba game). Play the computer at five strengths, a friend online or on one phone, and a new puzzle every day. Free, no ads.",
  fr: "Le jeu de graines nigérian sur un plateau en bois sculpté, en vraie 3D : le Nchò (le jeu igbo, semis en relais et prise de 4) et l'Ayo (le jeu yoruba). Contre l'ordinateur à cinq niveaux, un ami en ligne ou sur un seul téléphone, et un nouveau défi chaque jour. Gratuit, sans pub.",
};

// schema.org VideoGame for the game's own page
export function gameData({ origin = "", lang = "en" } = {}) {
  const L = ABOUT[lang] ? lang : "en";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Ayo & Nchò: Nigerian Mancala",
    alternateName: ["Ayo & Nchò", "Ayo", "Nchò", "Okwe", "Nigerian mancala"],
    description: ABOUT[L],
    url: `${origin}/`,
    image: `${origin}/${IMAGE[L] || IMAGE.en}`,
    genre: ["Board game", "Mancala", "Strategy"],
    gamePlatform: "Web browser",
    applicationCategory: "GameApplication",
    operatingSystem: "Any (web browser)",
    playMode: ["SinglePlayer", "MultiPlayer"],
    inLanguage: ["en", "fr"],
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
  };
}

// JSON safe inside a <script> data block: no "<" (so no "</script>"), no line or paragraph separators
export function inlineJson(v) {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

// the tags for this address, written beside the card's
export function searchTags({ query = {}, origin = "", lang = "en" } = {}) {
  const out = [`<link rel="canonical" href="${esc(origin + "/")}">`];
  if (!indexable(query)) out.push('<meta name="robots" content="noindex">');
  else out.push(`<script type="application/ld+json">${inlineJson(gameData({ origin, lang }))}</script>`);
  return out.join("\n");
}

export function robotsTxt(origin) {
  return ["User-agent: *", "Allow: /", ...HIDDEN.map((p) => `Disallow: ${p}`), "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n");
}

export function sitemapXml(origin) {
  const urls = PAGES.map((p) => `  <url><loc>${esc(origin + p)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// the routes, and the header on the page for a private link (call before the page's own route)
export function mountSearch(app, originOf) {
  app.get("/robots.txt", (req, res) => { res.set("Cache-Control", "public, max-age=3600"); res.type("text/plain").send(robotsTxt(originOf(req))); });
  app.get("/sitemap.xml", (req, res) => { res.set("Cache-Control", "public, max-age=3600"); res.type("application/xml").send(sitemapXml(originOf(req))); });
  app.use((req, res, next) => {
    const p = req.path;
    if (((p === "/" || p === "/index.html") && !indexable(req.query || {})) || HIDDEN.some((h) => p === h.replace(/\/$/, "") || p.startsWith(h))) res.set("X-Robots-Tag", "noindex");
    next();
  });
}
