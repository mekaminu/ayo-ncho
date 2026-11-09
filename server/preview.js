// What a shared link shows before anyone opens it: WhatsApp, iMessage, Telegram and Facebook read the page's Open Graph tags
// and draw a card from them (a picture, a title, a line under it). The page is the same index.html for every address, so the
// server writes those tags per request, from what the address is:
//   ?room=CODE  — an invite: "Meka asks you to a game of Ayo & Nchò" with the room's code, the rules and how the door works,
//                 the host's name read from the room (a room that has closed, or a code nobody opened, gets a plain invite)
//   ?puzzle=1   — the daily puzzle: today's ask ("Capture 8 in one turn"), from engine/puzzle.js, the same for everyone
//   anything else — the game itself
// The picture is the real board (web/share-board.jpg, -fr.jpg, made by tools/link-preview.py), always by its full address,
// as the crawlers need. French when ?lang=fr or the asking browser's first language is French (server/legal.js pageLang).
// Nothing here is kept or logged; the host's name is only what the friend would see at the door anyway.
import { dailyPuzzle, todayKey } from "../engine/puzzle.js";
import { normaliseCode } from "./rooms.js";
import { esc, pageLang } from "./legal.js";
import { searchTags } from "./search.js";

export const MARK = "<!-- ayo-preview -->"; // where index.html takes the tags
export const IMAGE = { en: "share-board.jpg", fr: "share-board-fr.jpg" };
export const IMAGE_W = 1200, IMAGE_H = 630;

const RULES = { en: { ncho: "Nchò rules", ayo: "Ayo rules" }, fr: { ncho: "règles du Nchò", ayo: "règles de l'Ayo" } };
const W = {
  en: {
    site: "Ayo & Nchò",
    gameTitle: "Ayo & Nchò · Nigerian mancala in 3D",
    gameDesc: "The Nigerian seed game on a carved wooden board: real seeds, relay sowing, a capture of 4. Play the computer, a friend, or today's puzzle. Free, no ads.",
    invite: (n) => `${n} asks you to a game of Ayo & Nchò`,
    inviteAny: "Come and play Ayo & Nchò",
    inviteDesc: (code, rules) => `Room ${code} · ${rules} · open the link, say your name and knock, and you'll be let in.`,
    inviteGone: (code) => `Room ${code} · open the link to play: if the room has closed, ask for a new one.`,
    puzzle: (t) => `Today's Ayo & Nchò puzzle: capture ${t} in one turn`,
    puzzleDesc: (rules) => `${rules[0].toUpperCase() + rules.slice(1)} · one move · a new position every day, the same for everyone. Can you find it?`,
    alt: "The carved wooden Ayo board with seeds in its pits, under a warm lamp",
    locale: "en_GB",
  },
  fr: {
    site: "Ayo & Nchò",
    gameTitle: "Ayo & Nchò · Mancala nigérian en 3D",
    gameDesc: "Le jeu de graines nigérian sur un plateau en bois sculpté : de vraies graines, le semis en relais, la prise de 4. Contre l'ordinateur, un ami ou le défi du jour. Gratuit, sans pub.",
    invite: (n) => `${n} vous invite à une partie d'Ayo & Nchò`,
    inviteAny: "Venez jouer à Ayo & Nchò",
    inviteDesc: (code, rules) => `Salle ${code} · ${rules} · ouvrez le lien, dites votre nom et frappez : on vous fera entrer.`,
    inviteGone: (code) => `Salle ${code} · ouvrez le lien pour jouer : si la salle est fermée, demandez-en une nouvelle.`,
    puzzle: (t) => `Le défi Ayo & Nchò du jour : prenez ${t} en un coup`,
    puzzleDesc: (rules) => `${rules[0].toUpperCase() + rules.slice(1)} · un seul coup · une nouvelle position chaque jour, la même pour tous. Saurez-vous la trouver ?`,
    alt: "Le plateau d'Ayo en bois sculpté, des graines dans ses trous, sous une lampe chaude",
    locale: "fr_FR",
  },
};

// The page's own address as the crawler asked for it (Render sits behind a proxy that says https in x-forwarded-proto).
export function originOf(req) {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim();
  return `${proto === "https" ? "https" : "http"}://${host.replace(/[^A-Za-z0-9.:\-\[\]]/g, "")}`;
}

const PUZZLE_CACHE = new Map(); // day:variant → target (the search runs once a day, not once a crawl)
function puzzleTarget(key, variant) {
  const k = key + ":" + variant;
  if (!PUZZLE_CACHE.has(k)) { if (PUZZLE_CACHE.size > 8) PUZZLE_CACHE.clear(); PUZZLE_CACHE.set(k, dailyPuzzle(key, variant).target); }
  return PUZZLE_CACHE.get(k);
}

// What the card says for this address. room: (code) → { host, variant } or null (the room's public face, from Rooms).
export function previewOf({ query = {}, lang = "en", origin = "", room = () => null, now = new Date() } = {}) {
  const w = W[lang] || W.en, L = W[lang] ? lang : "en";
  const out = { lang: L, site: w.site, locale: w.locale, image: `${origin}/${IMAGE[L]}`, imageAlt: w.alt, title: w.gameTitle, description: w.gameDesc, url: `${origin}/` };
  const rawCode = typeof query.room === "string" ? query.room : "";
  if (rawCode) {
    const code = normaliseCode(rawCode);
    if (/^[A-Z]{4}$/.test(code)) {
      const r = room(code);
      out.url = `${origin}/?room=${code}`;
      if (r) { out.title = r.host ? w.invite(r.host) : w.inviteAny; out.description = w.inviteDesc(code, RULES[L][r.variant] || RULES[L].ncho); }
      else { out.title = w.inviteAny; out.description = w.inviteGone(code); }
      return out;
    }
  }
  if (query.puzzle !== undefined) {
    const variant = query.variant === "ayo" ? "ayo" : "ncho";
    out.title = w.puzzle(puzzleTarget(todayKey(now), variant)); out.description = w.puzzleDesc(RULES[L][variant]);
    out.url = `${origin}/?puzzle=1`;
  }
  return out;
}

// The tags themselves, every value escaped (a host's name is typed by a person).
export function previewTags(p) {
  const m = (k, v) => `<meta property="${k}" content="${esc(v)}">`, n = (k, v) => `<meta name="${k}" content="${esc(v)}">`;
  return [
    m("og:type", "website"), m("og:site_name", p.site), m("og:title", p.title), m("og:description", p.description), m("og:url", p.url),
    m("og:locale", p.locale), m("og:image", p.image), m("og:image:type", "image/jpeg"), m("og:image:width", String(IMAGE_W)), m("og:image:height", String(IMAGE_H)), m("og:image:alt", p.imageAlt),
    n("twitter:card", "summary_large_image"), n("twitter:title", p.title), n("twitter:description", p.description), n("twitter:image", p.image),
    n("description", p.description),
  ].join("\n");
}

// index.html for this request: the tags written in at the mark.
export function pageWithPreview(page, req, rooms) {
  if (!page.includes(MARK)) return page;
  const lang = pageLang(req.query || {}, req.headers["accept-language"]);
  const room = (code) => {
    if (!rooms || !rooms.has(code)) return null;
    try { const s = rooms.snapshot(code); const host = s.players[0] && s.players[0].name; return { host: host && host !== "Host" ? host : null, variant: s.variant }; } catch { return null; } // "Host": nobody typed a name
  };
  const query = req.query || {}, origin = originOf(req);
  return page.replace(MARK, () => previewTags(previewOf({ query, lang, origin, room })) + "\n" + searchTags({ query, lang, origin })); // + found by search (server/search.js)
}
