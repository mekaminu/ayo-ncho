# Found by search (idea 9 Nov)

Until the store apps are out, the game is found by its link. This is what a search engine sees (server/search.js):

- **The game's page** (`/`, whatever else the address carries: `?lang=fr`, `?utm_…`) names one canonical address, the bare `/`,
  and carries a schema.org `VideoGame` block: "Ayo & Nchò: Nigerian Mancala", also known as Ayo, Nchò, Okwe, Nigerian mancala;
  what it is, free, English and French, the board picture. Its title and description are the link card's (server/preview.js).
- **Private and day-only links** — an invite (`?room=`), a watch link (`?watch=`, with `a`/`b` names), a turn to beat
  (`?beat=…&n=`), today's puzzle (`?puzzle=`) — say `noindex` in a meta tag and an `X-Robots-Tag` header, carry no data block,
  and name the bare game as their canonical address, so no search result ever shows a family member's typed name.
- **/robots.txt** lets everything be read except `/api/`, `/ws`, `/version`, `/healthz` (which also say `X-Robots-Tag: noindex`),
  and points to **/sitemap.xml**: the game, /privacy, /terms, /support.
- The JSON block is a data block, never run; every `<`, `>` and `&` in it is escaped, and it gets the page's nonce like every script.

Checked by test/search.test.js (the tags, the block, robots and the sitemap, and the real server's headers).

Optional for Meka (free): Google Search Console (search.google.com/search-console) → add the game's address → verify by
"HTML tag"; send the tag's content and a run adds it. Then the sitemap can be submitted there and searches that found the game seen.
