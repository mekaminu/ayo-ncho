# Privacy, terms and support pages (L5)

The game's server serves three pages, in the game's dark-wood look, readable on a phone:

- https://ayo-ncho.onrender.com/privacy — the privacy policy (the URL both stores ask for)
- https://ayo-ncho.onrender.com/terms — terms of use
- https://ayo-ncho.onrender.com/support — support: how to reach us and the common questions (Apple's "Support URL")

They are linked from Settings (Privacy · Terms · Support, at the bottom), in the browser and in the apps; they open beside the game, so the game stays where it was. The words are in `server/legal.js`; each page says "Last updated" with the date in `UPDATED`.

## Your name and support email

They are not kept in the repo. Until they are set, the pages say "the maker of Ayo & Nchò" and "the support email address (coming soon)". To set them (free, no plan change):

1. Render → the ayo-ncho service → Environment → Add Environment Variable.
2. `SELLER_NAME` = the name the stores show as the seller (your own name, or your company's).
3. `SUPPORT_EMAIL` = the address players write to.
4. Save; Render restarts the server and the pages show them.

Or give them to a build run and it will set the words for you.

## Keep them true

The pages describe exactly what the game does today: everything kept on the device; only a name, moves and shouts sent for a game with a friend, held in the server's memory (10 minutes for an unjoined room, 6 hours idle); no accounts, ads, analytics or cookies. `test/legal.test.js` checks those claims against the code (no disk writes or outside calls in the server, no cookies, the sweep times). Before analytics (L13), purchases (L12) or notifications (L14) ship, the run that adds them updates the privacy page and its date first.

The terms name the law of England and Wales; say if the seller should be elsewhere.
