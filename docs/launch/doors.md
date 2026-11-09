# Locked doors (idea 9 Nov)

The game's page shows words other people typed: a friend's name at the door, a watcher's name, a name carried in a shared
link. The game writes them as text (and a friend's initial is escaped), but one slip anywhere — a name put into the page as
markup — would let a stranger's "name" run a script on the family's board. Before the stores send strangers to the link, the
server now tells every browser exactly what the page may run and load (server/headers.js):

- **Content-Security-Policy on the page.** Scripts only from the game's own server, three.js's CDN and the page's own inline
  scripts, each carrying this response's nonce (a fresh random key every time the page is sent). The import map the page
  writes with `document.write` is let in by its hash (one for the CDN's three.js, one for the server's own copy). Nothing
  typed into the page can run — an `onerror="…"` in a name included. No `eval`, no plugins, no `<base>`.
  es-module-shims (for iPhones before iOS 16.4) reads the nonce from the page and carries it into its feature-test frame, and
  its test modules are `blob:` URLs, which the policy allows (scripts, styles and reads).
  Fonts from Google Fonts; pictures, the clip's video and the AI's worker from the server or the page itself; connections only
  back to the server (its WebSocket too) and three.js's CDN. Inline style stays open: a style cannot run anything.
- **A 304 keeps the page and its key together.** The page's ETag is taken before the nonce is written in, so a page the phone
  already has is still a 304 — and the 304 carries no policy, so the browser keeps the page and the policy it came with.
- **Every response:** `X-Content-Type-Options: nosniff` (a file is only ever what its type says); `Referrer-Policy: same-origin`
  (an invite link's room code never travels to the CDN or the font server); a `Permissions-Policy` that keeps the camera and
  microphone to the page (video at the board) and turns off geolocation, payment, USB, serial and MIDI; `Strict-Transport-Security`
  over HTTPS (on Render); no `X-Powered-By`.
- **Privacy, terms and support pages:** a policy of their own that allows no script at all.
- Framing is still allowed: the web link sells nothing and holds no account, so there is nothing to trick a tap out of.

The store apps carry their files inside them and are not served by this server, so none of this changes them.

Checks:
- `test/doors.test.js` on every push: every script tag of the page gets the key and no script's body changes; the two import
  maps the page can write (run in a sandbox) are exactly the ones hashed; the policy never allows inline script or eval; only a
  plain host goes into it; nothing in web/ uses an inline handler, a `javascript:` link or eval; the server sends a fresh key
  each time, a 304 with no policy, the headers on every response, HSTS only over HTTPS, no script on the legal pages.
- `python3 tools/render.py out.png --smoke` now serves the page as the real server does (the policy and its key) unless
  `--open` is given, so every check run before a push fails on any "Refused to …" the browser says.
  Run locked (and with the real server where the check uses it), these all passed on 9 Nov: the smoke with the clip, online with
  a friend (video and voice, a restart, take-backs, draws, block), the CDN-blocked start, the legal pages, the daily puzzle, the
  store, the looks, Papa Ike, Beat my turn, the Mac's keys on the wide screen, the telemetry and the reminder, the French rooms
  and the week. `--qr` and `--backroom` stop at the same step on main without this change too (a check of their own to mend,
  not the policy: no "Refused to …" in either).
- `python3 tools/doors.py`: the game plays on the real server with nothing refused; a name written into the page as markup
  (an `<img onerror>`, a `srcdoc` frame with a script, a script with a guessed key) cannot run; a fresh key on every load;
  the privacy page loads with no script.
- Safari's own engine: the `safari` workflow plays the game on the real server, so WebKit sees the policy on every push.
- Playwright's `wait_for_function` compiles its wait inside the page with eval, which the policy refuses (its first run here
  said "did not start" for that reason alone), so the checks that open a locked page poll with evaluate (tools/pollwait.py).
