// The privacy policy, terms and support pages, served by the game's server at /privacy, /terms and /support (the addresses the
// App Store and Google Play ask for, and the ones Settings links to, in the browser and in the apps alike).
// They say exactly what the game does today: everything is kept on the player's own phone; the only things that ever reach the
// server are the name typed for a game with a friend and that game's moves and shouts, held in the server's memory and swept away.
// No accounts, no ads, no analytics, no cookies. When something changes that (purchases in the apps, analytics), these pages change
// first, with a new date.
// The seller's name and the support email are not kept in the repo: the server reads them from SELLER_NAME and SUPPORT_EMAIL
// (set in Render → Environment), and says plainly that they are coming until they are set.

export const UPDATED = "4 November 2026";
export const PAGES = ["privacy", "terms", "support"];
const GAME = "Ayo &amp; Nchò";

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

// Who runs the game and how to reach them, from the environment; plain placeholders until Meka gives them.
export function contact(env = process.env) {
  const seller = String(env.SELLER_NAME || "").trim().slice(0, 120);
  const email = String(env.SUPPORT_EMAIL || "").trim().slice(0, 200);
  const ok = EMAIL_RE.test(email);
  return {
    seller: seller ? esc(seller) : `the maker of ${GAME}`,
    sellerSet: !!seller,
    email: ok ? esc(email) : "",
    mail: ok ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : `<span class="soon">the support email address (coming soon)</span>`,
  };
}

const CSS = `:root{--bg:#0d0906;--fg:#f1e6d2;--muted:#b9a58d;--brass:#e6b76f;--card:#1a110b;--line:rgba(243,233,215,.14);color-scheme:dark}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg) radial-gradient(120% 60% at 50% 0%,#2a180d 0%,var(--bg) 70%) no-repeat;color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:680px;margin:0 auto;padding:calc(env(safe-area-inset-top,0px) + 28px) max(18px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 48px) max(18px,env(safe-area-inset-left,0px))}
nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}
nav a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;border:1px solid var(--line);border-radius:999px;padding:6px 14px}
nav a[aria-current="page"]{color:#1a0f07;background:var(--brass);border-color:var(--brass)}
nav a.game{color:var(--brass);border-color:rgba(230,183,111,.45)}
h1{font-family:Fraunces,Georgia,"Times New Roman",serif;font-size:32px;line-height:1.15;margin:0 0 4px;font-weight:700}
h2{font-family:Fraunces,Georgia,"Times New Roman",serif;font-size:21px;line-height:1.25;margin:30px 0 6px;font-weight:700;color:var(--brass)}
.date{color:var(--muted);font-size:14px;margin:0 0 18px}
.lead{font-size:18px}
p,li{color:var(--fg)}
ul{padding-left:22px}li{margin:4px 0}
a{color:var(--brass);text-underline-offset:3px}
.box{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:6px 18px;margin:16px 0}
.soon{color:var(--muted);font-style:italic}
footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}`;

function shell(name, title, body, c) {
  const link = (p, label) => `<a href="/${p}"${p === name ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0d0906">
<title>${title} · ${GAME}</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>${CSS}</style>
</head>
<body>
<main>
<nav aria-label="${GAME} pages"><a class="game" href="/">← Play</a>${link("privacy", "Privacy")}${link("terms", "Terms")}${link("support", "Support")}</nav>
${body}
<footer>${GAME}: Nigerian Mancala · run by ${c.seller} · ${c.mail}</footer>
</main>
</body>
</html>
`;
}

function privacy(c) {
  return `<h1>Privacy</h1>
<p class="date">Last updated ${UPDATED}</p>
<p class="lead">${GAME} keeps your game on your own phone or computer. There are no accounts, no ads, no analytics and no cookies. The only things that ever reach our server are the name you type for a game with a friend, and that game's moves and shouts.</p>
<p>This page is for the game on the web (ayo-ncho.onrender.com) and the ${GAME} apps for Android, iPhone and iPad. It is run by ${c.seller}, who is responsible for your information under UK and EU data protection law. You can reach us at ${c.mail}.</p>

<h2>What stays on your phone</h2>
<p>To remember where you were, the game keeps these on your device only, in the browser's or the app's own storage:</p>
<ul>
<li>your settings (rules, wood, seeds, sound, speed and so on) and the game in progress;</li>
<li>your record against each computer opponent, your daily puzzle results and the days you have played;</li>
<li>the name you typed for games with friends, and, while you are in one, that game's seat and moves so you can rejoin it.</li>
</ul>
<p>None of this is sent to us, apart from your name and moves while you play a friend online (below). Clearing the site's data in your browser, or deleting the app, removes it all.</p>

<h2>Playing with a friend online</h2>
<p>When you open a room or knock on a friend's, our server receives the name you typed, your moves, any of the fixed shouts you send ("Oya, your move!" and the like) and a random code for your seat. Your friend sees your name. This is needed to run the game between you, and it is all it is used for.</p>
<ul>
<li>It is held only in the server's working memory, never written to a database or to disk.</li>
<li>A room nobody joins is removed after 10 minutes; a game nobody has played for 6 hours is removed. A restart of the server also clears it (your phone keeps a sealed copy of your own game so you can carry on).</li>
<li>Use a nickname if you like: the name does not have to be real.</li>
</ul>
<p>Playing the computer, the daily puzzle or two of you on one phone sends nothing to us at all.</p>

<h2>What our host and others see</h2>
<ul>
<li>The server runs on Render (render.com). Like any web host, Render handles your device's internet address and the time of each request to deliver the page and keep the service secure. We do not use these to identify or follow you.</li>
<li>On the web, the game loads its 3D library (three.js) from cdnjs, run by Cloudflare, and its lettering from Google Fonts, so those services see your internet address when the page loads. The apps carry both inside them and do not.</li>
<li>When you share a result or an invite, your phone's own share sheet or WhatsApp sends it; we do not see what you share or to whom.</li>
</ul>

<h2>What we do not do</h2>
<ul>
<li>No accounts and no sign-in.</li>
<li>No advertising, and no tracking for advertising.</li>
<li>No analytics or crash reports today. If we add them, this page will say so first, they will never include your name, and Settings will have a switch to turn them off.</li>
<li>We do not sell or rent anyone's information.</li>
</ul>

<h2>Purchases</h2>
<p>The game is free. If the apps later offer optional upgrades or new boards, they will be bought through Apple's App Store or Google Play only, under their terms. They handle the payment; we would learn only which item was bought, never your card or bank details.</p>

<h2>Children</h2>
<p>${GAME} is for everyone aged 13 and over, and families play it together. We do not knowingly collect personal information from children. The only thing a player can send us is a name for a game with a friend; we suggest children use a first name or a nickname, and the shouts are a fixed list so nothing can be typed to them.</p>

<h2>Your rights</h2>
<p>Under UK and EU data protection law you can ask what we hold about you, and ask us to correct or delete it. Because the game keeps your information on your own device, you can delete it yourself at any time (see above). Anything about an online game is gone from our server within hours; if you want it removed sooner, write to ${c.mail} with the room's four-letter code. We rely on our legitimate interest in running the game you asked to play. You can also complain to the Information Commissioner's Office (ico.org.uk) or your local data protection authority.</p>

<h2>Changes</h2>
<p>When the game starts doing anything new with information, this page changes first and the date at the top moves.</p>`;
}

function terms(c) {
  return `<h1>Terms of use</h1>
<p class="date">Last updated ${UPDATED}</p>
<p class="lead">${GAME} is a free game. By playing it you agree to these terms. They are short because the game is simple.</p>

<h2>Who we are</h2>
<p>The game is made and run by ${c.seller} ("we"). Contact: ${c.mail}.</p>

<h2>Playing</h2>
<ul>
<li>You may play the game, on the web or in the apps, for your own enjoyment and with your family and friends.</li>
<li>Please do not copy, resell or take apart the game's code or artwork, or try to disrupt the server or other players' games.</li>
<li>The games themselves, Ayo and Nchò, belong to everyone. Our 3D board, characters, sounds and code are ours.</li>
</ul>

<h2>Playing with friends</h2>
<ul>
<li>Choose a name for online games that you would be happy for a child to read. We may close a room, or stop a name being used, if it is abusive.</li>
<li>You let people into your room yourself. Only share your invite link with people you know.</li>
</ul>

<h2>Purchases</h2>
<p>Everything you need to play is free, and nothing we sell will ever win a game for you. If the apps offer optional upgrades or looks, they are bought through the App Store or Google Play, and those stores' terms, including refunds, apply. If you use the iPhone or iPad app, Apple's standard licence agreement (the Licensed Application End User License Agreement) also applies, and Apple is not responsible for the game or its support.</p>

<h2>The game as it is</h2>
<p>We work hard to keep the game working and fair, but it is provided as it is, without promises that it will always be available or free of mistakes. The free online server can take up to a minute to wake up, and online games may occasionally be lost. Nothing in these terms limits any rights you have by law as a consumer, and we are not responsible for any loss beyond what the law says we must be.</p>

<h2>Changes</h2>
<p>We may update these terms as the game grows. The date at the top will change, and if the change matters, the game will say so.</p>

<h2>The law</h2>
<p>These terms are governed by the law of England and Wales. If you live elsewhere in the UK or in the EU, you also keep the protection of your own country's consumer law and can bring a claim in your own courts.</p>`;
}

function support(c) {
  return `<h1>Support</h1>
<p class="date">Last updated ${UPDATED}</p>
<p class="lead">Something not right, or a question about the game? Write to ${c.mail}. Tell us your phone or computer, the browser or app, and what happened; a screenshot helps. We read everything, and reply as soon as we can.</p>

<h2>How do I play?</h2>
<p>In the game, open Settings → Rules → Learn to play for a one-minute lesson on the board, or tap the rules button for the rules in words. In short, for Nchò: pick up all the seeds in one of your pits and sow them one per pit anticlockwise. If your last seed lands on seeds, pick those up and keep going. A pit that reaches 4 goes to the owner of that side, except that if your last seed makes a pit on their side 4, it is yours. With 8 seeds left, the next capture takes them all. Most seeds wins.</p>

<h2>A game with a friend will not start</h2>
<ul>
<li>The online server sleeps when nobody has played for a while. The first visit can take up to a minute while it wakes; after that it is quick.</li>
<li>A room code works for 10 minutes until your friend joins, so open a new room if it has been longer.</li>
<li>Your friend knocks with their name and you tap Let in: keep the game open on your screen until they knock.</li>
<li>If your connection drops, the game reconnects by itself and puts you back in your seat.</li>
</ul>

<h2>Can I play with no signal?</h2>
<p>Yes. The apps play the computer, the daily puzzle and two of you on one phone with no signal at all. On the web, open the game once with signal and it will then open offline too. Playing a friend online needs a connection.</p>

<h2>The board is slow or my phone gets warm</h2>
<p>Open Settings → Feel → Lighter board and choose On, and set Seed physics to Off. The game looks the same in every way that matters and runs much lighter.</p>

<h2>How do I start again or delete my data?</h2>
<p>Everything is kept on your own device. In a browser, clear this site's data in your browser settings; in the apps, delete the app. That removes your record, settings and any game in progress. See the <a href="/privacy">privacy page</a> for what an online game sends.</p>

<h2>Purchases</h2>
<p>The game is free, and nothing is sold today. When the apps offer optional upgrades, a Restore purchases button will bring them back on a new phone, and refunds go through Apple or Google.</p>

<h2>Thanks</h2>
<p>The 3D board uses three.js (MIT licence). The lettering is Fraunces and Inter (SIL Open Font Licence). The apps are built with Capacitor (MIT licence). Every sound and every seed is made by the game itself.</p>`;
}

const BUILD = { privacy: ["Privacy", privacy], terms: ["Terms of use", terms], support: ["Support", support] };

// The whole page for one of PAGES, as HTML.
export function legalPage(name, env = process.env) {
  const b = BUILD[name]; if (!b) throw new Error("no such page: " + name);
  const c = contact(env);
  return shell(name, b[0], b[1](c), c);
}

// Mount /privacy, /terms and /support (and the same with .html) on an Express app.
export function mountLegal(app, env = process.env) {
  for (const name of PAGES) {
    app.get([`/${name}`, `/${name}.html`], (_req, res) => {
      res.set("Cache-Control", "public, max-age=600");
      res.type("html").send(legalPage(name, env));
    });
  }
}
