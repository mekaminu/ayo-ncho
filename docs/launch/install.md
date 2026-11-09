# On your home screen (idea 9 Nov)

Until the store apps are out, the family plays from the link sent on WhatsApp, and the link sinks under the chat's next
hundred messages. The game already installs from the browser (manifest, icons, a service worker that plays with no signal),
but nothing said so.

- **When:** on Home, from the second day played (the calm streak's count), when no other brass line (a newer version, back to
  your game) is up. Never on the board, a card, another screen, in the installed web app, or in the store apps.
- **Android (Chrome, Samsung Internet) and Chrome/Edge on the Mac:** the browser hands over its install question
  (`beforeinstallprompt`, caught in index.html before the game loads); a tap on the line asks it. Yes → "On your home screen —
  open it from there" and the line never comes back; no → as Not now.
- **iPhone and iPad:** no browser there can be asked, so a tap says "Tap Share, then Add to Home Screen".
- **Not now:** away for two weeks; offered twice at most, ever. Kept in `ayo.install` ({ offers, last, done }), read with care.
- French words in web/i18n.js.

Checked by `python3 tools/install.py` (headless Chromium as a phone: first day none; second day the line, the browser's question
asked, yes remembered across a reload; Not now remembered; an iPhone's Share steps; the installed app never offers itself; no
page error) and `test/install.test.js`. Picture: docs/render-2026-11-09-install.png.
