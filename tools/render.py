# Render the game with headless Chromium (software WebGL) and optionally play a move.
# Usage: python3 tools/render.py out.png            -> still frame (mid-game position, pit 4 lit)
#        add --sideways to check a phone held on its side (844x390, touch): the board lies across the screen, your row nearest you,
#                  each pit where a tap lands on it, bigger than the upright board on the same screen (?sideways=0); a real move and the
#                  reply played sideways (<out>); turned upright (390x844) and onto the Mac (1180x820) it stands up as before, and back
#        python3 tools/render.py out.png --smoke    -> start a real game, tap a pit twice, wait for the opponent, check the board changed
#        add --clip (with --smoke) to also record the best-turn clip in the browser and check a video came out
#        add --wide for the Fold-open / Mac layout (1180x820); --home screenshots the Home screen (whole page); --lite / --full force the lighter or the full board (auto otherwise)
#        add --nophysics to play with the seed physics off (seeds fly straight to their pit, as on the weakest phones) and check the setting took
#        add --keys (with --smoke) to play from the keyboard too: a digit picks a pit (screenshot of the whole page with the hint line), Esc puts it
#                  back, digit + Enter sows, U undoes, H hints; and to check the pits' screen-reader labels carry the seed counts
#        add --path (with --smoke) to check "where the seeds will go": one tap on the pit with the longest path lands a mark on every pit the hand
#                  would reach, rings the captures and lights the end pit, and the hint line says where it ends; screenshot of the whole page (<out>);
#                  Esc clears every mark; with the setting off (Settings → Feel) a tap shows no marks and the old words
#        add --answer (with --smoke) to check "what it leaves open": every legal pit is tapped and the ember rings must land on exactly the
#                  pits the engine's richest reply would take, with "then they can take N" in the hint line; the pit that leaves the most open is
#                  screenshot (<out>); with the setting off (Settings → Feel → Warn what it leaves open) the path shows but no rings and no warning
#        add --explain (with --smoke) to check "their move, explained": after the opponent's reply its path stays faint on the board with the
#                  words under it ("Nnamdi · picked up again twice · took 4"; screenshot <out>), the marks fade by themselves, a tap on the words
#                  replays that turn slowly (<out>-again.png mid-replay) and leaves the game as it was; with the setting off nothing is explained
#        add --take (with --smoke) to check "Mama Ngozi's take": the weakest opening move is played against her; after her reply a line with
#                  her face lands under the board naming the better pit ("your pit 1 was the move · 7 seeds better"; screenshot <out>,
#                  with her dry word in the bubble), a tap on it plays that move through slowly (<out>-show.png mid-way) and leaves the game as
#                  it was, Undo takes it away, and with the setting off (Settings → Feel) a weak move earns no word
#        add --hurry (with --smoke) to check "tap to hurry": the pit with the longest turn is sown; while it plays the hint line says
#                  "tap the board to hurry" (screenshot <out>), a real tap on the board hurries the rest of the turn ("hurrying…"), the turn
#                  still ends with every pit's count as the engine says, and the opponent's reply starts again at the normal speed, where
#                  Space hurries it too
#        add --hint (with --smoke) to check "a hint that teaches": the Hint button picks Mama Ngozi's pit for you — the path marks land on it
#                  and the hint line starts "Mama Ngozi would play this one · …" (screenshot <out>); one more tap on that pit sows it
#        add --straight (with --smoke) to check setting the board straight: the mouse drags the wood (the board turns and tilts) and the
#                  first time a toast says "Double-click the wood, or press 0, …"; <out>-off.png is the board left askew; a double-click on the
#                  wood glides it back to rest (<out>), picking no pit and playing nothing; dragged again, the 0 key does the same
#        add --hover (with --smoke, best with --wide) to check the mouse on the Mac: over a pit you can play the cursor is a hand, a faint
#                  brass ring lands on its rim and the hint line says "pit 3 · 5 seeds — click to see where they go" (screenshot <out>);
#                  over their pit it says "their pit 2 · …" with no ring; over the wood a grab hand; off the board everything goes back
#        add --undo (with --smoke) to check Undo against the computer: the seeds of your move and the reply fly back (<out> is mid-flight),
#                  the hint line says "Taking back your move and Mama Ngozi's reply", and the board ends exactly at the engine's position before
#        add --count (with --smoke) to check counting a pit by touch: a real finger (touch events) rests on their richest pit, the number
#                  over it counts up seed by seed to the engine's count and the hint line says "their pit 2 · 6 seeds" (screenshot <out>);
#                  lifting the finger plays nothing; a hold on your own pit counts it and does not pick it; a finger that drags turns the
#                  board and counts nothing; a quick tap still picks the pit
#        --starts: who starts — a phone that beat Mama Ngozi last time: Home says "vs Mama Ngozi · Hard · Mama Ngozi starts", Settings →
#                  Rules → Who starts is checked both ways, Play opens with her move ("Mama Ngozi starts — the loser goes first"), you answer,
#                  Undo takes your move back and leaves hers; then two of us after Player 1 won: Player 2 starts and the board faces them.
#                  Picture: <out> (her opening move explained, your move to make); --wide for the Mac
#        add --page (with --smoke) to screenshot the whole page after the move, the opponent's face reacting (mood given as --page=sulk; default happy)
#        --frrooms (French, L18 slice 5: two French phones meet in a room — the Rooms screen, the name card, the door, a shout, the take-back card and the call card all French, the WhatsApp invite French; pictures <out>, <out>-door.png, <out>-back.png, <out>-call.png)
#        --online (also video and voice at the board, with Chromium's test cameras: the lighter board offers voice only, the host asks, Tete's card says so and nothing opens before the yes, both live with each other's picture, a weak line going voice only on both phones and Video again bringing the pictures back (picture <out>-weak.png), mute, a hidden picture and hang up — pictures <out>-video-ask.png and <out>-video.png; also restarts the server mid-game and checks both boards come back to the same position and play on; also their hand over the board: the host's first tap lights that pit faintly on Tete's board with "weighing their pit 5", follows a second pick, and goes on Esc (picture <out>-online-peek.png); also checks take it back: the host plays, asks with the Undo chip, Tete's card says so and Let them puts both boards back; the away title: the host's tab goes out of sight, the friend moves, the title says it; offering a draw: Tete's offer played on, the host's agreed, both cards say A draw (pictures <out>-draw-ask.png and <out>-draw.png), then Play again on both; giving up: the host gives up from the shout row, both Game over cards say so; the score at the table: both cards count the agreed draw and Tete's win, the standing turns over with a tick and both boards say the same (picture <out>-tally.png); and block and report: the camera menu ends with Report a problem (opens /support#report) and Block Tete, two taps leave the room, Tete's knock at the next room is turned away with no card, Settings → Privacy lists and unblocks — picture <out>-block.png): start the real server (node server/index.js); one phone goes Home → With friends (name card, then the Rooms screen opens a room
#                  and shows its code), a second does the same, is refused a wrong code under the field, then joins by the real code and knocks;
#                  the host's door card shows over the Rooms screen, the friend is let in, both go to the board, play a move each (both boards
#                  must follow) and shout both ways. Pictures: <out> the Rooms screen with its code, <out>-door.png the door card over it,
#                  <out>-friend.png the friend's view (the far seat, pits nearest them) with the host's shout by his face. --wide for the host on a Mac
#        --cdn: the board on a slow or patchy line (the real server): on a slow line (throttled) "The board is on its way" shows over the empty
#                  board after 1.5 s (picture <out>) and goes once the board draws; with cdnjs unreachable the page starts again once with
#                  three.js from the game's own server (/vendor/three.module.min.js), the board draws, the phone remembers it for 3 days and the
#                  next visit goes straight there; with both unreachable the plain screen says so after 12 s (picture <out>-fail.png)
#        --telemetry: game numbers and crash reports (L13) — with no sink nothing is recorded; with ?telemetry=test (a sink kept in memory)
#        a move sends game_start once, the store sends store_open, the Settings → Privacy switch off sends nothing, on again sends;
#        the words carry nothing typed (the name, the room code); a picture of the Privacy row (out-settings.png)
#        --remind: the daily-puzzle reminder (L14) — on the web link the switch says "in the apps" and nothing is offered; with
#        ?remind=test (a stand-in for the apps' notifications plugin) the switch asks once and plans a week at 19:00, the time
#        moves them, the puzzle card offers it to a phone that has it off, a tap on a reminder opens the puzzle, and a phone that
#        says no keeps it off (pictures: <out> the puzzle card's offer, <out>-settings.png the Feel rows)
#        --legal: Settings → the Privacy · Terms · Support links point at the server's pages and open beside the game (Settings stays);
#                  each page is screenshot (<out> privacy, <out>-terms.png, <out>-support.png, <out>-settings.png) and must not scroll sideways
#        --master: Home shows Papa Ike (Master) locked with the Gold mark (<out>-home.png); a tap says where he plays and does not choose him;
#                  then ?try=master opens him for the visit: chosen, Play, your move, his reply from the worker within the budget (<out>)
#        --puzzle: open today's daily puzzle (?puzzle=1), play the answer, check the result card says Solved, screenshot it; then Back to home
#                  and check the Home card says solved (<out>-home.png); --wide for the Mac layout
#        --last8: the last 8 (Nchò) — a saved game one move from the board's last 8 seeds (tools/last8pos.js finds it): Continue, the move is
#                  played, the seeds left hop, the "Last 8" line comes up under the board with the count, the count badges of the pits still
#                  holding seeds glow, the opponent says their word (picture <out>); the line stays through their reply while it holds, and a
#                  first tap shows whether a move sweeps the last seeds. --wide for the Mac
#        --feed: feed them — a saved game where their side is empty (tools/feedpos.js finds it): Continue, brass rings must land on exactly
#                  the pits the engine allows, the barred pits' badges dim and the hint line says "They have no seeds — you must feed them: …"
#                  (picture <out>); a tap on a barred pit plays nothing; then a saved game with one move only: it is picked for you, its path
#                  shows, the line starts with it (<out>-only.png), Esc puts it back and it stays back, one tap picks and sows it. --wide for the Mac
#        --circling: the game is circling — a saved game against Nnamdi one move from 48 moves with no capture (tools/circlepos.js finds
#                  it): Continue, the move is played, a ripple goes round the pits, the "Circling" line comes up with 12 and who keeps what
#                  (picture <out>), it ticks down through his reply; then a saved game one move from the call: the first tap says the game
#                  ends here, the move is played and the Game over card says "no capture in 60 moves" (<out>-called.png). --wide for the Mac
#        --slam: every seed they have — a saved Ayo game where one of your pits would make a grand slam (tools/slampos.js): the struck
#                ash rings, the words, the note once, then the sowing's moment and its toast; nothing taken (docs/render-*-slam.png, -slam-sow.png)
#        --gives: whose 4 is it — a saved game where one of your pits fills a pit on their side to 4 before its last seed (tools/givespos.js
#                  finds it): Continue, tap that pit: copper rings land on exactly the pits you would take and pale beaded rings on the pits
#                  that go to them, and the one-time note says what the pale ring means (picture <out>); Esc clears them; a second tap shows
#                  no note again; sowing it, the hand that carries their 4 wears a pale number (<out>-haul.png). --wide for the Mac
#        --looks: the seed sets sold in the store (L10; each lands with its own sound, and a handful is heard when one is chosen) — a close look at cowries and palm kernels on the board (?still=close&try=looks;
#                  <out> cowries, <out>-kernels.png, <out>-jobs.png for comparison, <out>-board.png the whole board in cowries); then Settings
#                  without the preview: cowries and palm kernels are locked with the lock, a tap says where they come from and the seeds stay
#                  Job's tears; with ?try=looks a tap on palm kernels swaps every seed on the board in place (<out>-settings.png)
#                  add --boards for the two boards (L10, slice 2): <out> the whole board in Benin bronze, <out>-grandpa.png Grandpa's board,
#                  -benin-close / -grandpa-close the close look; the Settings checks then also cover the boards (locked, the tap's words,
#                  a wood swapping in place with no new game, Grandpa's board swapping in place with ?try=looks)
#        --store: the store screen (L11) — Home → the store chip: Gold at the top (what it opens, "Get the app" on the web link), the board
#                  now, the boards and seed sets with what each button says; a tap on Benin bronze puts it on the live board above for a look
#                  (<out>), a tap on cowries pours them in (<out>-seeds.png), a store button says it is bought in the app and the look stays
#                  only a look; Use on iroko keeps it; Back puts the tried seeds back and keeps iroko; Settings → Board → Store opens it and
#                  Back goes back to Settings; ?try=looks shows the looks as open for the visit. --wide for the Mac (<out> only)
import sys, re, math, base64, http.server, threading, functools, os, json, time, subprocess, urllib.request
from playwright.sync_api import sync_playwright
if os.environ.get("RENDER_SCALE"):  # the store pictures (tools/store-shots.py): every page at this pixel density, the layout unchanged
    from playwright.sync_api import Browser as _B
    def _scaled(f):
        def g(self, *a, **k):
            k["device_scale_factor"] = float(os.environ["RENDER_SCALE"])
            if (k.get("viewport") or {}).get("width", 0) < 600: k["has_touch"] = True  # a phone's words ("tap"), not a mouse's
            return f(self, *a, **k)
        return g
    _B.new_context = _scaled(_B.new_context); _B.new_page = _scaled(_B.new_page)
    from playwright.sync_api import Page as _P, Locator as _Lc
    def _calm(f):  # a toast is a passing word (often about the web link), not the screen: the store pictures leave it out
        def g(self, *a, **k):
            k["style"] = (k.get("style") or "") + ".toast{display:none!important}"; return f(self, *a, **k)
        return g
    _P.screenshot = _calm(_P.screenshot); _Lc.screenshot = _calm(_Lc.screenshot)
if os.environ.get("RENDER_LANG") == "fr":  # the French store pictures (tools/store-shots.py --lang=fr): each check plays as written, in
    # English, so its own words still prove the feature; for the picture alone the game is put into French the way a player does it
    # (Settings → Language → Français, which turns the page in place, at once, nothing replayed) and back to Auto straight after
    from playwright.sync_api import Page as _P, Locator as _Lc
    # (the stored choice and the legal links' addresses are put back as they were, so the rest of the check sees no difference)
    _TO_FR = """() => { const b = document.querySelector('[data-set=lang] [data-v=fr]'); if (!b || document.documentElement.lang === 'fr') return false;
      window.__wasLang = { pref: localStorage.getItem('ayo.lang'), hrefs: [...document.querySelectorAll('.legal a')].map((a) => a.getAttribute('href')) };
      b.click(); return document.documentElement.lang === 'fr' || 'no'; }"""
    _BACK = """() => { const w = window.__wasLang; document.querySelector('[data-set=lang] [data-v=auto]').click();
      if (w.pref === null) localStorage.removeItem('ayo.lang'); else localStorage.setItem('ayo.lang', w.pref);
      document.querySelectorAll('.legal a').forEach((a, i) => { if (w.hrefs[i] === null) a.removeAttribute('href'); else a.setAttribute('href', w.hrefs[i]); }); }"""
    def _french(f, page_of):
        def g(self, *a, **k):
            pg = page_of(self); r = pg.evaluate(_TO_FR)
            assert r != "no", "Settings → Language → Français did not turn the page French"
            try: return f(self, *a, **k)
            finally:
                if r is True: pg.evaluate(_BACK)
        return g
    _P.screenshot = _french(_P.screenshot, lambda s: s); _Lc.screenshot = _french(_Lc.screenshot, lambda s: s.page)
#        add --music (with --smoke) to check the music (L17): off on a new phone, Settings → Feel → Music on starts it (bars on the
#                  clock, the audio running), the speaker on the board silences it and says so under the switch, it keeps playing on
#                  Home, and off takes every note off the clock
#        add --rest (with --smoke) to check the board rests when nothing moves (web/rest.js): waiting for your move it draws only the
#                  once-a-second heartbeat; a first tap on a pit (the path marks land, the end glow breathes) draws every frame, Esc rests
#                  again; Home's slow turn draws every frame; ?rest=0 draws every frame as before
#        --fresh: a newer game, without asking — the real server writes its build into the page; a newer build is said on Home (picture), updates quietly after a minute away, never off Home or on the board, never twice for one build, and a tap on the line updates
#        add --wake (with --smoke) to check keeping the screen on: a stand-in for the browser's wake lock records each request; during the
#                  game the screen is held, 3 minutes with nobody touching it lets it go, a key takes it back, Home lets it go, Play takes it
#                  again, and Settings → Feel → Keep the screen on off lets it go
#        --local: two of us on one phone — Home → the "Two of us" pill → Play: Player 1 plays, the board swings half a turn round to face
#                  Player 2 (the HUD names them, the move just played is explained for them; picture <out>), Player 2 plays and it swings on,
#                  Undo takes one move back and turns back to whoever played it; Home says "Two of us · …" under Continue; with Settings →
#                  Feel → Pass the phone off the seat still passes but the board stays. --wide for the Fold open / the Mac
#        --review: as --record with ?try=review, then Mama Ngozi's review: the moves she would change must match web/review.js
#                  run in node with the engine's search over the same moves (<out>-card.png); tap the card, step 1 plays her move,
#                  the board ends at the engine's position (<out>), Next plays step 2, Done brings the card and the end of the game back
#        --story: as --record, then "how the game went" on the Game over card: the line and its words must be there and match
#                  web/story.js run in node over the same moves; a tap on it plays the biggest turn on the board and the card comes
#                  back with the board as the game ended (<out> is the card with the line drawn in). --wide for the Mac
#        --hand (with --smoke): the hand counts — sows the biggest opening pit, stops the hand with two seeds sown and checks the brass
#                  number over it says what is left in it (<out>), stops the first capture's hand for the copper "+N" (<out>-haul.png), and
#                  checks the turn's numbers start at the seeds picked up, every capture showed one, and both go when the turn ends
#        --lesson: the first game's lesson (web/lesson.js) on a new phone: Home says Adaeze · Easy; Play opens the lesson; each step's pit is
#                  picked for you with its path marks, a tap on another pit plays nothing, one tap sows; the card says what happened, Next plays
#                  Adaeze's move; every position is checked against node (stateAt); the end keeps it done and Play Adaeze starts the game; then
#                  Settings → Learn to play opens it again and Skip goes home. Pictures: <out> (step 2 asking, the capture ring), <out>-after.png
#                  (the 4 in your trough and the card), <out>-done.png. --wide for the Mac
#        --deal: setting up the board — as --win, then Play again on the Game over card: the seeds in both troughs are dealt back
#                  four to each pit (<out> mid-deal), the counts tick, Mama Ngozi's opening waits for the board to be set, and
#                  every seed ends where the new game says. Then Home → Play on a set board deals nothing
#        add --ponder (with --smoke) for weighing it up (web/ponder.js): plays a move, catches the faint light over one of their pits while the
#                  computer thinks (<out>), and checks it went over their own pits as planned, then onto the pit they played, and went away
#        add --lastmark (with --smoke) for which pit they played (web/lastmark.js): after their reply, once its ghost marks have faded, the
#                  faint light still sits on the pit they played (<out>), the pit's label says "played last", it stays while you pick a pit
#                  of yours, steps aside while their move is watched again, goes with your move and comes back on their next one
#        --watch: watch the whole game (web/watch.js) — a game Meka won, sent as a link, plays back on the board (picture <out>, the end <out>-end.png), every turn hurried, the board and scores at the end checked against the engine, then Home with this phone's game untouched; in French; Home stops it; a broken link is refused
#        --greet: good morning at the right time (web/greet.js) — Mama Ngozi greets a phone back after 5 days away (?away=5&hour=8),
#          then the next game the usual line, an afternoon game her afternoon word, a night game in French her night word
#        --glloss: the board comes back (web/glloss.js) — WEBGL_lose_context takes the board away: nothing said for a blink, the canvas
#                  steps aside (the dark wood shows), a key picks nothing, then "The board is coming back…" (<out>); given back, it is drawn
#                  at once with "The board is back" (<out>-back.png) and a move plays; taken away for good, "Bring the board back" (<out>-stuck.png)
#                  reloads straight into the same game
#        --win: the win, on the board — a saved game one move from beating Mama Ngozi (tools/endgame.js finds it): Continue, the winning
#                  move; before the Game over card rises the winning trough's seeds jump in a wave (<out> mid-wave), the lamp warms and the
#                  score glints; then the card rises with the lamp back as it was. --wide for the Mac
#        --record: your record against each opponent — a phone with games already played against all three and a saved game one move from a
#                  win over Mama Ngozi (tools/endgame.js finds it): Home shows the record under each opponent's name (<out>-home.png), Continue
#                  brings the game back, the winning move is played, and the Game over card shows "you lead 3–1 · new best win 28–20" and her
#                  word for three in a row (<out>); the record is checked in storage. --wide for the Mac
out = sys.argv[1]; dealc = "--deal" in sys.argv; winc = "--win" in sys.argv or dealc; sidec = "--sideways" in sys.argv; musicc = "--music" in sys.argv; legal = "--legal" in sys.argv; storec = "--store" in sys.argv; smoke = "--smoke" in sys.argv; wide = "--wide" in sys.argv; home = "--home" in sys.argv; lite = "--lite" in sys.argv; full = "--full" in sys.argv; clip = "--clip" in sys.argv; online = "--online" in sys.argv; nophysics = "--nophysics" in sys.argv; puzzle = "--puzzle" in sys.argv; keys = "--keys" in sys.argv; record = "--record" in sys.argv; path = "--path" in sys.argv; explain = "--explain" in sys.argv; local = "--local" in sys.argv; take = "--take" in sys.argv; hurry = "--hurry" in sys.argv; last8 = "--last8" in sys.argv; answer = "--answer" in sys.argv; story = "--story" in sys.argv; handc = "--hand" in sys.argv; hintc = "--hint" in sys.argv; startsc = "--starts" in sys.argv; hoverc = "--hover" in sys.argv; countc = "--count" in sys.argv; feedc = "--feed" in sys.argv; undoc = "--undo" in sys.argv; circ = "--circling" in sys.argv; givesc = "--gives" in sys.argv; slamc = "--slam" in sys.argv; wakec = "--wake" in sys.argv; restc = "--rest" in sys.argv; lessonc = "--lesson" in sys.argv; masterc = "--master" in sys.argv; reviewc = "--review" in sys.argv; looksc = "--looks" in sys.argv; boardsc = "--boards" in sys.argv; telec = "--telemetry" in sys.argv; remindc = "--remind" in sys.argv; langc = "--lang" in sys.argv; frrooms = "--frrooms" in sys.argv; frlegal = "--frlegal" in sys.argv; freshc = "--fresh" in sys.argv; playoutc = "--playout" in sys.argv; retryc = "--retry" in sys.argv; waitc = "--waiting" in sys.argv; ponderc = "--ponder" in sys.argv; lastc = "--lastmark" in sys.argv; nextc = "--nextday" in sys.argv; cdnc = "--cdn" in sys.argv; racec = "--race" in sys.argv; tsc = "--textsize" in sys.argv; straightc = "--straight" in sys.argv; battc = "--battery" in sys.argv; glc = "--glloss" in sys.argv; greetc = "--greet" in sys.argv; watchc = "--watch" in sys.argv; legal = legal or frlegal; online = online or frrooms; story = story or reviewc; record = record or story
page = next((a.split("=", 1)[1] if "=" in a else "happy" for a in sys.argv if a.startswith("--page")), None)
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
node = None
if online or legal or freshc or cdnc:  # the real server on its own port, so two pages can meet at one board
    def start_node():  # with a fixed ROOM_SECRET, so a restart mid-game can be checked (the rooms come back from the boards' tickets)
        n = subprocess.Popen(["node", os.path.join(root, "server", "index.js")], env={**os.environ, "PORT": "8767", "ROOM_SECRET": "render-check-secret"}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            try: urllib.request.urlopen("http://127.0.0.1:8767/healthz", timeout=1); return n
            except Exception: time.sleep(0.1)
        print("server did not start:", n.stderr.read().decode()); sys.exit(1)
    node = start_node()
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
if online: ARGS = ARGS + ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]  # video and voice at the board: a test camera (a moving pattern) and a tone stand in for each phone's
def watch(pg, errors, tag=""):
    pg.on("pageerror", lambda e: errors.append(tag + str(e)))
    pg.on("console", lambda m: errors.append(tag + m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three):
        pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
def tap(pg, pit):  # tap a pit twice (select, then sow) where the board draws it on this page
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    pg.mouse.click(x, y); pg.wait_for_timeout(300); pg.mouse.click(x, y)
if glc:  # the board comes back (idea 6 Nov): WEBGL_lose_context takes the board away as a phone does, then gives it back; then never
    from PIL import Image; import io
    def lit(pg):  # how much of the middle of the screen is board rather than the page's dark wood colour
        im = Image.open(io.BytesIO(pg.screenshot(timeout=120000))).convert("RGB"); w, h = im.size; n = 0; k = 0
        for y in range(int(h * .3), int(h * .7), 12):
            for x in range(int(w * .2), int(w * .8), 12): r, g, bb = im.getpixel((x, y)); k += 1; n += (r + g + bb) > 90
        return n / k
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page(); watch(pg, errors, "glloss: ")
        pg.add_init_script("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done');")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=120000); pg.wait_for_timeout(500)
        before = lit(pg); assert before > 0.5, before
        pg.evaluate("window.__lc = document.querySelector('#c').getContext('webgl2').getExtension('WEBGL_lose_context'); window.__lc.loseContext()")
        pg.wait_for_function("window.__ayo.gl.phase === 'lost'", timeout=5000); pg.wait_for_timeout(250)
        G = pg.evaluate("window.__ayo.gl"); assert G["lostClass"] and not G["canvasShown"] and G["line"] is None, G  # a blink says nothing
        pg.keyboard.press("1"); pg.wait_for_timeout(100); assert pg.evaluate("window.__ayo.selected") is None, "no pit picked blind"
        pg.wait_for_function("window.__ayo.gl.line === 'back'", timeout=5000); pg.wait_for_timeout(450)
        G = pg.evaluate("window.__ayo.gl"); assert G["title"] == "The board is coming back…" and G["button"] is None, G
        assert lit(pg) < 0.05, "the page's dark wood shows, never a white canvas"
        pg.screenshot(path=out, timeout=120000); print("glloss: away —", G["title"])
        pg.evaluate("window.__lc.restoreContext()"); pg.wait_for_function("window.__ayo.gl.phase === 'ok'", timeout=5000); pg.wait_for_timeout(300)
        G = pg.evaluate("window.__ayo.gl"); assert G["line"] is None and not G["lostClass"] and G["canvasShown"] and G["restores"] == 1, G
        toasts = pg.evaluate("[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' | ')"); assert "The board is back" in toasts, toasts
        after = lit(pg); assert after > 0.5, after; print("glloss: back at once, %.0f%% of the middle is board (was %.0f%%)" % (after * 100, before * 100))
        pg.screenshot(path=out.replace(".png", "-back.png"), timeout=120000)
        m = max(pg.evaluate("window.__ayo.legal"), key=lambda i: pg.evaluate("window.__ayo.state.pits[%d]" % i)); tap(pg, m)
        pg.wait_for_function("window.__ayo.tweens > 0", timeout=10000); pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length >= 2 && window.__ayo.state.turn === 0", timeout=240000); pg.wait_for_timeout(600)
        moves = pg.evaluate("window.__ayo.state.moves"); assert moves[0] == m, moves; print("glloss: a move played after it came back, and the reply", moves)
        pg.evaluate("window.__lc = document.querySelector('#c').getContext('webgl2').getExtension('WEBGL_lose_context'); window.__lc.loseContext()")
        pg.wait_for_function("window.__ayo.gl.line === 'stuck'", timeout=40000); pg.wait_for_timeout(300)
        G = pg.evaluate("window.__ayo.gl"); assert G["button"] == "Bring the board back" and G["losses"] == 2, G
        pg.screenshot(path=out.replace(".png", "-stuck.png"), timeout=120000); print("glloss: not back by itself —", G["title"])
        with pg.expect_navigation(timeout=60000): pg.click("#glLost button")
        pg.wait_for_function("window.__done===true", timeout=120000); pg.wait_for_timeout(500)
        assert pg.evaluate("window.__ayo.state.moves") == moves, "the game came back where it was"
        assert pg.evaluate("window.__ayo.gl.phase") == "ok" and lit(pg) > 0.5
        print("glloss: Bring the board back reloaded the game at move", len(moves))
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
if watchc:  # watch the whole game (idea 6 Nov): a game sent as a link plays back move by move on the board, then Home
    js = """import('./web/watch.js').then(async (W) => { const E = await import('./engine/ayo.js');
      let seed = 5; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      let best = null;
      for (let g = 0; g < 400; g++) { let s = E.newGame('ncho'); const moves = [];
        while (!s.over) { const ms = E.legalMoves(s); const m = ms[Math.floor(rnd() * ms.length)]; moves.push(m); s = E.applyMove(s, m).state; }
        if (s.winner === 0 && moves.length >= 24 && (!best || moves.length < best.moves.length)) best = { moves, end: s }; }
      console.log(JSON.stringify({ q: W.watchQuery({ variant: 'ncho', rules: E.RULES.ncho, first: 0, moves: best.moves }, ['Meka', 'Tete']), pits: best.end.pits, stores: best.end.stores, n: best.moves.length,
        end: W.endWords(W.decodeGame(W.encodeGame({ variant: 'ncho', rules: E.RULES.ncho, first: 0, moves: best.moves }), 'Meka', 'Tete')) })); });"""
    G = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], cwd=root).decode())
    print("watch: a %d-move game Meka won, link %s… (%d characters)" % (G["n"], G["q"][:40], len(G["q"])))
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page(); watch(pg, errors, "watch: ")
        pg.add_init_script("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.speed', 'fast');")
        pg.goto("http://127.0.0.1:8766/web/index.html" + G["q"] + "&capture=1&lite=1", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=120000)
        try: pg.wait_for_function("window.__watch.on && window.__watch.i >= 4", timeout=180000)
        except Exception: print("watch: stuck at", pg.evaluate("JSON.stringify(window.__watch)"), errors); raise
        pg.wait_for_function("window.__ayo.tweens > 0", timeout=20000); pg.wait_for_timeout(250)
        W = pg.evaluate("({ hint: document.querySelector('#hint').textContent, me: document.querySelector('#meName').textContent, opp: document.querySelector('#oppName').textContent, turn: document.querySelector('#turn').textContent, undo: document.querySelector('#undo').disabled, hidden: document.querySelector('#home').hidden })")
        assert W["me"] == "Meka" and W["opp"] == "Tete" and W["turn"] == "watching" and W["undo"] and W["hidden"], W
        assert W["hint"].startswith("Move ") and ("Meka plays" in W["hint"] or "Tete plays" in W["hint"]), W
        pg.screenshot(path=out, timeout=120000); print("watch: mid-game —", W["hint"])
        box = pg.evaluate("(() => { const r = document.querySelector('#c').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
        while True:  # hurry every turn, as a watcher in a hurry would
            if pg.evaluate("window.__watch.done || !window.__watch.on"): break
            if pg.evaluate("window.__ayo.tweens > 0"): pg.mouse.click(box[0], box[1] * 0.9)
            pg.wait_for_timeout(200)
        pg.wait_for_function("window.__watch.done", timeout=20000)
        end = pg.evaluate("({ hint: document.querySelector('#hint').textContent, badges: [...document.querySelectorAll('#badges .badge')].map(e => +e.textContent), my: +document.querySelector('#myScore').textContent, opp: +document.querySelector('#oppScore').textContent, i: window.__watch.i })")
        assert end["hint"] == G["end"] and end["i"] == G["n"], (end, G["end"])
        assert end["badges"] == G["pits"] and [end["my"], end["opp"]] == G["stores"], (end, G)
        pg.screenshot(path=out.replace(".png", "-end.png"), timeout=120000); print("watch: the end —", end["hint"], "· the board and scores match the engine")
        pg.wait_for_function("!window.__watch.on && !document.querySelector('#home').hidden", timeout=20000)
        assert pg.evaluate("window.__ayo.state.moves.length") == 0, "this phone's own game untouched"
        assert pg.evaluate("document.querySelector('#meName').textContent") != "Tete"
        print("watch: then Home, this phone's own game untouched")
        pg.goto("http://127.0.0.1:8766/web/index.html" + G["q"] + "&capture=1&lite=1&lang=fr", wait_until="load"); pg.wait_for_function("window.__watch.on && window.__watch.i >= 1", timeout=120000); pg.wait_for_timeout(200)
        fr = pg.evaluate("document.querySelector('#hint').textContent"); assert fr.startswith("Coup ") and "joue" in fr, fr; print("watch: in French —", fr)
        pg.click("#homeBtn"); pg.wait_for_function("!window.__watch.on && !document.querySelector('#home').hidden", timeout=30000); print("watch: Home stops it")
        pg.goto("http://127.0.0.1:8766/web/index.html?watch=n4110.99999&capture=1&lite=1", wait_until="load")
        pg.wait_for_function("[...document.querySelectorAll('.toast')].some(x => x.textContent.includes('That game link could not be read'))", timeout=120000)
        t = pg.evaluate("[...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | ')"); assert not pg.evaluate("document.querySelector('#home').hidden") and "That game link could not be read" in t and not pg.evaluate("window.__watch.on"), t
        print("watch: a broken link is refused —", t)
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
if greetc:  # good morning, at the right time (idea 6 Nov): the first word of a game knows the hour and the days away
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page(); watch(pg, errors, "greet: ")
        pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.level', 'hard'); }")
        def play(q, lang="en"):
            pg.evaluate("localStorage.setItem('ayo.lang', '%s'); localStorage.removeItem('ayo.game')" % lang)
            pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home&" + q, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000); pg.wait_for_timeout(500)
            n = len(pg.evaluate("window.__ayo.greet.log"))
            pg.click("#playBtn"); pg.wait_for_function("window.__ayo.greet.log.length > %d && window.__ayo.greet.bubble" % n, timeout=30000); pg.wait_for_timeout(400)
            return pg.evaluate("window.__ayo.greet")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        L = pg.evaluate("import('./characters.js').then(m => m.CHARACTERS.hard.lines)")
        g = play("away=5&hour=8"); last = g["log"][-1]; print("greet: 5 days away at 8:00 —", last["moment"], "·", g["bubble"])
        assert last["moment"] == "back" and g["bubble"] in L["back"] and g["mood"] == "happy", g
        pg.screenshot(path=out, timeout=120000)
        g = play("hour=9"); assert g["log"][-1]["moment"] == "start" and g["bubble"] in L["start"], g; print("greet: the next morning game —", g["bubble"])
        g = play("hour=14"); assert g["log"][-1]["moment"] == "afternoon" and g["bubble"] in L["afternoon"], g; print("greet: 14:00 —", g["bubble"])
        g = play("hour=23", "fr"); fr = pg.evaluate("import('./i18n.js').then(m => m.translate(%s, 'fr'))" % json.dumps(L["night"][0]))
        assert g["log"][-1]["moment"] == "night" and g["bubble"] == fr and g["mood"] == "surprised", (g, fr); print("greet: 23:00 in French —", g["bubble"])
        pg.screenshot(path=out.replace(".png", "-night-fr.png"), timeout=120000)
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
if battc:  # go easy on a low battery (idea 6 Nov): a fake battery at 15% unplugged, a move sown, then the charger
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3); pg = ctx.new_page(); watch(pg, errors, "battery: ")
        pg.add_init_script("""localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done');
          (() => { const ls = {}; const bat = { level: 0.15, charging: false, addEventListener(k, f) { (ls[k] = ls[k] || []).push(f); } };
            window.__battery = { getBattery: () => Promise.resolve(bat) };
            window.__setBattery = (level, charging) => { bat.level = level; bat.charging = charging; for (const k of ['levelchange', 'chargingchange']) for (const f of ls[k] || []) f(); }; })();""")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&lite=0", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=120000)  # the full board, so there is something to go easy on
        pg.wait_for_function("window.__ayo.battery.on", timeout=5000)
        B = pg.evaluate("window.__ayo.battery"); print("battery: at 15%", B["reason"], "· drawn at", B["drawn"], "· physics", B["physics"])
        assert B["reason"] == "battery at 15%" and B["drawn"] <= 1 and B["physics"] is False and B["plan"]["minGap"] == 30, B
        assert B["log"] == [{"on": True, "reason": "battery at 15%"}], B["log"]  # switched once as the battery was read (its toast has passed by now)
        m = max(pg.evaluate("window.__ayo.legal"), key=lambda i: pg.evaluate("window.__ayo.state.pits[%d]" % i)); tap(pg, m)
        pg.wait_for_function("window.__ayo.tweens > 0", timeout=10000); pg.wait_for_timeout(1500)
        sk = pg.evaluate("window.__ayo.battery.skipped"); mg = pg.evaluate("window.__ayo.battery.minGap")
        assert sk > 0 or mg >= 26, (sk, mg)  # never two pictures closer than ~30 ms (a slow headless frame may already be that far apart)
        pg.wait_for_function("!window.__ayo.busy", timeout=240000); pg.wait_for_timeout(600)
        st = pg.evaluate("window.__ayo.state"); assert st["moves"] and st["moves"][0] == m, st
        seeds = pg.evaluate("window.__ayo.seeds"); assert all(s[3] == 0 for s in seeds), "no seed left in the physics"
        print("battery: the move played through, %d frames left undrawn, pictures at least %.0f ms apart" % (sk, mg))
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(200); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.evaluate("window.__setBattery(0.25, false)"); pg.wait_for_timeout(200)
        assert pg.evaluate("window.__ayo.battery.on"), "25% unplugged stays easy (no flicker)"
        pg.evaluate("window.__setBattery(0.25, true)"); pg.wait_for_timeout(200)
        B = pg.evaluate("window.__ayo.battery"); assert not B["on"] and B["reason"] == "charging" and B["drawn"] > 1 and B["physics"], B
        toasts = pg.evaluate("[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' | ')"); assert "Charging" in toasts, toasts
        print("battery: on the charger", B["note"] or "", "· drawn at", B["drawn"])
        pg.evaluate("window.__setBattery(0.1, false)"); pg.wait_for_timeout(200); assert pg.evaluate("window.__ayo.battery.on")
        pg.evaluate("localStorage.setItem('ayo.battery', 'off')"); pg.reload(wait_until="load"); pg.wait_for_function("window.__done===true", timeout=120000); pg.wait_for_timeout(400)
        B = pg.evaluate("window.__ayo.battery"); assert not B["on"] and B["reason"] == "chosen in Settings", B
        print("battery: Settings → Off keeps it full at 10%")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
if cdnc:  # the board on a slow or patchy line: the line while it loads, three.js from the game's own server when cdnjs can't be reached
    BASE = "http://127.0.0.1:8767/"
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        seed = "localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done');"
        # 1. a slow line: the CDN answers (from the local copy), everything from the server crawls in
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page(); watch(pg, errors, "cdn slow: ")
        pg.add_init_script(seed)
        cdp = ctx.new_cdp_session(pg); cdp.send("Network.enable"); cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 300, "downloadThroughput": 60 * 1024, "uploadThroughput": 20 * 1024})
        pg.goto(BASE, wait_until="commit"); pg.wait_for_selector("#bootWait.on", timeout=15000)
        words = pg.evaluate("document.querySelector('#bootWait').textContent"); assert "The board is on its way" in words, words
        assert pg.evaluate("document.querySelector('#bootWait').getAttribute('role')") == "status"
        assert not pg.evaluate("window.__ayoUp"), "the line shows while the board is still on its way"
        pg.wait_for_timeout(700); pg.screenshot(path=out, timeout=120000)
        print("cdn: on a slow line after %.1f s: %s" % (pg.evaluate("performance.now()/1000"), words))
        pg.wait_for_function("window.__done===true", timeout=120000); pg.wait_for_function("!document.querySelector('#bootWait')", timeout=5000)
        assert not pg.query_selector("#bootFail"), "no failure on a slow line"
        print("cdn: the board drew after %.1f s and the line went" % pg.evaluate("performance.now()/1000"))
        ctx.close()
        # 2. cdnjs unreachable: the page starts again with three.js from the server
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page(); loads = []; local = []
        pg.on("pageerror", lambda e: errors.append("cdn local: " + str(e)) if len(loads) > 1 else None)
        pg.on("load", lambda: loads.append(1)); pg.on("request", lambda r: local.append(r.url) if r.url.endswith("/vendor/three.module.min.js") else None)
        pg.route("https://fonts.googleapis.com/**", lambda r: r.abort()); pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.abort())
        pg.add_init_script(seed)
        pg.goto(BASE, wait_until="commit"); pg.wait_for_function("window.__done===true", timeout=120000)
        assert len(loads) >= 2 and local, ("it started again with the local copy", loads, local)
        until = pg.evaluate("+localStorage.getItem('ayo.3dlocal')"); now = pg.evaluate("Date.now()")
        assert 2.9 * 864e5 < until - now <= 3 * 864e5, ("remembered for 3 days", until - now)
        assert pg.evaluate("window.__ayo3d") == "./vendor/three.module.min.js" and not pg.query_selector("#bootFail")
        pg.wait_for_function("!document.querySelector('#bootWait')", timeout=5000)
        print("cdn: cdnjs unreachable → started again with three.js from the server (%d loads), remembered for 3 days" % len(loads))
        n = len(loads); pg.goto(BASE, wait_until="commit"); pg.wait_for_function("window.__done===true", timeout=120000)
        assert len(loads) == n + 1, "the next visit goes straight to the server's copy"
        print("cdn: the next visit loaded straight from the server")
        ctx.close()
        # 3. neither: the plain screen, saying which
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page()
        pg.route("https://fonts.googleapis.com/**", lambda r: r.abort()); pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.abort()); pg.route("**/vendor/three.module.min.js", lambda r: r.abort())
        pg.add_init_script(seed)
        pg.goto(BASE, wait_until="commit"); pg.wait_for_selector("#bootFail", timeout=30000)
        small = pg.evaluate("document.querySelector('#bootFail small').textContent")
        assert "The board couldn" in pg.evaluate("document.querySelector('#bootFail').textContent") and "3D: own server" in small and "could not load game.js" in small, small
        pg.screenshot(path=out[:-4] + "-fail.png", timeout=120000)
        print("cdn: neither reachable → the plain screen:", small[:90])
        ctx.close(); b.close()
    if node: node.terminate()
    if errors: print("page errors:", errors); sys.exit(1)
    print("cdn ok"); sys.exit(0)
if tsc:  # bigger words (idea 6 Nov): Settings → Language → Word size; at Larger nothing on Home, the board's lines or Settings runs off the screen
    OVER = """() => { const W = innerWidth; const bad = [];
      for (const el of document.querySelectorAll('body *')) { if (el.closest('[hidden]') || el.closest('canvas') || el.closest('.toast')) continue; const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || !el.childElementCount && !el.textContent.trim()) continue;
        if (el.closest('.swatches, .seg, .row, .box, .setBody, .rail')) continue; // Settings scrolls; its rows wrap
        const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(r.left) + '–' + Math.round(r.right)); }
      return { doc: document.documentElement.scrollWidth, W, bad: bad.slice(0, 8) }; }"""
    fs = lambda sel: pg.evaluate("parseFloat(getComputedStyle(document.querySelector('%s')).fontSize)" % sel)
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        for w, h, tag in ((390, 844, ""), (800, 900, "-fold"), (1180, 820, "-wide")):
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2); pg = ctx.new_page(); watch(pg, errors, "textsize %d: " % w)
            pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.speed', 'fast'); localStorage.setItem('ayo.textsize', 'larger'); }")
            pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000); pg.wait_for_timeout(800)
            assert pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ts').trim()") == "1.3", "the saved size is on the page"
            o = pg.evaluate(OVER); assert o["doc"] <= o["W"] and not o["bad"], ("Home at Larger", o)
            if not tag: pg.screenshot(path=out.replace(".png", "-home.png"))
            pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=30000); pg.wait_for_timeout(900)
            x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pg.evaluate("window.__ayo.state.pits.slice(0,6).indexOf(Math.max(...window.__ayo.state.pits.slice(0,6)))"))
            pg.mouse.click(x, y); pg.wait_for_timeout(1400)
            hint = pg.evaluate("document.querySelector('#hint').textContent"); assert hint, "the first tap's words"
            big = fs('#hint')
            o = pg.evaluate(OVER); assert o["doc"] <= o["W"] and not o["bad"], ("the board at Larger", o)
            hb = pg.evaluate("document.querySelector('#hint').getBoundingClientRect().toJSON()"); assert hb["bottom"] <= h and hb["top"] >= 0, ("the hint line on screen", hb)
            pg.screenshot(path=out.replace(".png", tag + ".png") if tag else out)
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            pg.click("#settingsBtn"); pg.wait_for_selector("#settings:not([hidden])", timeout=5000)
            assert pg.evaluate("document.querySelector('[data-set=textsize] [data-v=larger]').getAttribute('aria-pressed')") == "true"
            assert "bigger still" in pg.evaluate("document.querySelector('#sizeNow').textContent")
            pg.evaluate("document.querySelector('[data-set=textsize]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
            if not tag: pg.screenshot(path=out.replace(".png", "-settings.png"))
            pg.click("[data-set=textsize] [data-v=normal]"); pg.wait_for_timeout(300)
            assert pg.evaluate("localStorage.getItem('ayo.textsize')") == "normal" and pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ts').trim()") == "1"
            pg.click("#settingsBack"); pg.wait_for_timeout(600)
            if not pg.evaluate("document.querySelector('#hint').hidden"):
                pg.mouse.click(x, y); pg.wait_for_timeout(900)
                if pg.evaluate("document.querySelector('#hint').textContent"): r = big / fs('#hint'); assert 1.25 < r < 1.35, ("the hint line is 1.3× at Larger", big, fs('#hint'))
            print("textsize %d: ok · hint %.1fpx at Larger · %s" % (w, big, hint[:70]))
            ctx.close()
        b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    print("textsize ok"); sys.exit(0)
if nextc:  # the next puzzle (idea 5 Nov): the result card counts down to midnight, turns at midnight, and Home's card turns with the day
    import datetime, zoneinfo
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2, timezone_id="Europe/London"); pg = ctx.new_page(); watch(pg, errors, "nextday: ")
        pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.speed', 'fast'); }")
        pg.clock.install(time=datetime.datetime(2026, 11, 5, 23, 40, 0, tzinfo=zoneinfo.ZoneInfo("Europe/London")))
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&puzzle=1", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pz = pg.evaluate("window.__ayo.puzzle"); assert pz["key"] == "2026-11-05", pz["key"]
        tap(pg, pz["answer"]); pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000); pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
        nx = lambda: pg.evaluate("document.querySelector('#pzNext').textContent")
        pg.wait_for_function("!document.querySelector('#pzNext').hidden", timeout=5000)
        assert re.match(r"^Next puzzle in (\d+ min|under a minute)$", nx()), nx()
        box = pg.evaluate("document.querySelector('#pzCard').getBoundingClientRect().toJSON()"); assert box["top"] > 0 and box["bottom"] <= pg.viewport_size["height"], ("the card still fits the screen", box)
        first = nx(); pg.clock.fast_forward(61000); pg.wait_for_timeout(300); assert nx() != first, ("it ticks on the minute", first, nx())
        print("nextday: solved before midnight · %s → %s" % (first, nx()))
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.clock.fast_forward("25:00"); pg.wait_for_function("document.querySelector('#pzNext').classList.contains('ready')", timeout=10000)
        assert nx() == "Tomorrow's puzzle is here · tap to play it", nx()
        assert pg.evaluate("document.querySelector('#pzNext').classList.contains('glint') && document.querySelector('#pzNext').getAttribute('role') === 'button'")
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out[:-4] + "-ready.png", timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        print("nextday: at midnight the line turned:", nx())
        pg.click("#pzNext"); pg.wait_for_function("document.querySelector('#pzCard').hidden", timeout=5000)
        pz2 = pg.evaluate("window.__ayo.puzzle"); assert pz2["key"] == "2026-11-06" and not pz2["played"], pz2["key"]
        assert pg.evaluate("document.querySelector('#pzDay').textContent") == "Daily puzzle · Fri 6 Nov", pg.evaluate("document.querySelector('#pzDay').textContent")
        print("nextday: a tap set up the new day's position (%s, capture %d)" % (pz2["key"], pz2["target"]))
        tap(pg, pz2["answer"]); pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000); pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
        assert re.match(r"^Next puzzle in 23 h \d+ min$", nx()), nx()
        pg.click("#pzHome"); pg.wait_for_selector("#home:not([hidden])", timeout=10000)
        day = lambda: pg.evaluate("document.querySelector('#puzzleDay').textContent")
        assert day() == "Daily puzzle · Fri 6 Nov" and pg.evaluate("document.querySelector('#puzzleState').textContent") == "solved ✓", day()
        pg.clock.fast_forward("24:00:00"); pg.wait_for_function("document.querySelector('#puzzleDay').textContent === 'Daily puzzle · Sat 7 Nov'", timeout=10000)
        assert pg.evaluate("document.querySelector('#puzzleState').textContent") == "not yet played" and pg.evaluate("document.querySelector('#puzzleCard').classList.contains('turned')")
        print("nextday: Home's card turned with the day:", day())
        pg.evaluate("localStorage.setItem('ayo.lang', 'fr')"); pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&puzzle=1&lang=fr", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pz3 = pg.evaluate("window.__ayo.puzzle"); tap(pg, pz3["answer"]); pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000); pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000); pg.wait_for_timeout(400)
        assert re.match(r"^Prochaine énigme dans (\d+ h( \d+ min)?|\d+ min|moins d’une minute)$", nx()), nx()
        print("nextday: in French:", nx())
        ctx.close(); b.close()
    if errors: print("page errors:", errors); sys.exit(1)
    print("nextday ok"); sys.exit(0)
if playoutc:  # play it out (idea 5 Nov): after your move in the daily puzzle, the game carries on from there against the opponent chosen on Home
    SAVED = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", "import { newGame, applyMove, legalMoves } from './engine/ayo.js'; let s = newGame('ncho'); for (let k = 0; k < 6; k++) s = applyMove(s, legalMoves(s)[0]).state; console.log(JSON.stringify({ moves: s.moves, variant: 'ncho', rules: s.rules, level: 'medium', stats: { biggest: 0, captures: 0, started: 1 }, local: false }))"], cwd=root).decode())
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page(); watch(pg, errors, "playout: ")
        pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.level', 'medium'); localStorage.setItem('ayo.speed', 'fast'); localStorage.setItem('ayo.game', %s); }" % json.dumps(json.dumps(SAVED)))
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&puzzle=1", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        saved = lambda: pg.evaluate("localStorage.getItem('ayo.game')")
        rec0 = pg.evaluate("JSON.stringify(window.__ayo.record)"); rat0 = pg.evaluate("localStorage.getItem('ayo.rating')")
        before = saved(); assert json.loads(before)["moves"] == SAVED["moves"], "your own game is saved before the puzzle"
        pz = pg.evaluate("window.__ayo.puzzle"); from_ = len(pg.evaluate("window.__ayo.state.moves")); prefix = pg.evaluate("window.__ayo.state.moves")
        assert not pg.evaluate("window.__ayo.playout.offered"), "nothing offered before a move"
        tap(pg, pz["answer"]); pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000); pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
        po = pg.evaluate("window.__ayo.playout"); assert po["offered"] and po["words"] == "Play it out vs Nnamdi", po
        box = pg.evaluate("document.querySelector('#pzCard').getBoundingClientRect().toJSON()"); assert box["top"] > 0 and box["bottom"] <= pg.viewport_size["height"], ("the card fits the screen", box)
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out[:-4] + "-card.png", timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        print("playout: solved the puzzle, the card offers:", po["words"])
        pg.click("#pzOut")
        pg.wait_for_function("[...document.querySelectorAll('.toast')].some(x => x.textContent.includes(\"Playing it out from today's puzzle — Nnamdi's move\"))", timeout=5000)
        pg.wait_for_function("document.body.classList.contains('playing') && !document.body.classList.contains('puzzle') && window.__ayo.state.moves.length >= %d && window.__ayo.state.turn === 0 && !window.__ayo.busy" % (from_ + 2), timeout=240000); pg.wait_for_timeout(500)
        st = pg.evaluate("window.__ayo.state"); po = pg.evaluate("window.__ayo.playout")
        assert st["moves"][:from_] == prefix and st["moves"][from_] == pz["answer"], "the game carries on from the puzzle's position"
        assert po["on"] and po["from"] == from_ and po["played"] == 2, po
        assert not pg.evaluate("window.__ayo.puzzle.on") and pg.evaluate("getComputedStyle(document.querySelector('.hud.top')).opacity") != "0", "the HUD comes back"
        assert pg.evaluate("document.querySelector('#oppName').textContent").startswith("Nnamdi")
        assert saved() == before, "a play-out never touches your saved game"
        assert not pg.evaluate("document.querySelector('#undo').disabled"), "your move and their reply can be taken back"
        pg.click("#undo"); pg.wait_for_function("window.__ayo.busy", timeout=5000); pg.wait_for_function("!window.__ayo.busy", timeout=60000); pg.wait_for_timeout(300)
        assert pg.evaluate("window.__ayo.state.moves") == prefix, "Undo goes back to the puzzle's position"
        assert pg.evaluate("window.__ayo.state.pits") == pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>+b.textContent)") if pg.evaluate("document.querySelectorAll('.badge').length") == 12 else True
        assert pg.evaluate("document.querySelector('#undo').disabled"), "and no further back"
        print("playout: Nnamdi replied; Undo went back to the puzzle and stopped there")
        n = 0
        while not pg.evaluate("window.__ayo.state.over") and n < 150:  # play it to the end: the first legal pit each time (fast pace, Space hurries)
            pg.wait_for_function("window.__ayo.state.over || (window.__ayo.state.turn === 0 && !window.__ayo.busy)", timeout=240000)
            if pg.evaluate("window.__ayo.state.over"): break
            legal = pg.evaluate("window.__ayo.legal")
            if not legal: pg.wait_for_timeout(200); continue
            tap(pg, legal[0]); n += 1; pg.wait_for_timeout(150); pg.keyboard.press("Space")
            if n == 3: pg.wait_for_function("window.__ayo.state.turn === 0 && !window.__ayo.busy || window.__ayo.state.over", timeout=240000); pg.wait_for_timeout(900); pg.mouse.move(5, 5); pg.screenshot(path=out, timeout=120000)
            assert saved() == before, "still never saved"
        pg.wait_for_selector("#gameover:not([hidden])", timeout=60000); pg.wait_for_timeout(600)
        eb = pg.evaluate("document.querySelector('#goEyebrow').textContent"); played = len(pg.evaluate("window.__ayo.state.moves")) - from_
        assert eb.startswith("Nchò · from today's puzzle · %d moves" % played), eb
        for sel in ("#replayBtn", "#clipBtn", "#goRecord", "#goRating", "#goStory", "#goReview"):
            assert pg.evaluate("!!document.querySelector('%s') && document.querySelector('%s').hidden" % (sel, sel)), sel + " should step aside for a play-out"
        assert saved() == before, "its game over leaves your saved game alone"
        assert pg.evaluate("JSON.stringify(window.__ayo.record)") == rec0 and pg.evaluate("localStorage.getItem('ayo.rating')") == rat0, "no record or rating kept"
        print("playout: played to the end in %d of your moves · %s · %s" % (n + 1, eb, pg.evaluate("document.querySelector('#goTitle').textContent")))
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out[:-4] + "-over.png", timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.evaluate("document.querySelector('#gameover').hidden = true"); pg.click("#homeBtn", force=True); pg.wait_for_selector("#home:not([hidden])", timeout=10000)
        assert not pg.evaluate("window.__ayo.playout.on"), "Home ends the play-out"
        assert pg.evaluate("window.__ayo.state.moves") == SAVED["moves"], "and your own game is back on the board"
        sub = pg.evaluate("document.querySelector('#continueSub').textContent"); assert sub.endswith("6 moves in"), sub
        pg.click("#continueBtn"); pg.wait_for_function("document.body.classList.contains('playing') && !window.__ayo.busy", timeout=60000)
        assert pg.evaluate("window.__ayo.state.moves") == SAVED["moves"] and not pg.evaluate("window.__ayo.playout.on")
        print("playout: Home brought your own game back (" + sub + "), Continue plays it")
        # the puzzle again (already solved): nothing offered before a move
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&puzzle=1", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        assert not pg.evaluate("window.__ayo.playout.offered")
        ctx.close(); b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("wrote", out); sys.exit(0)
if retryc:  # try again from where it turned (idea 6 Nov): a game lost to Nnamdi, then the card's offer to go back to the move that let it go
    R = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "retrypos.js"), "7", "ncho"]).decode())
    SAVED = {"moves": R["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "medium", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 6 * 60 * 1000}, "local": False}
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page(); watch(pg, errors, "retry: ")
        pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.level', 'medium'); localStorage.setItem('ayo.speed', 'fast'); localStorage.setItem('ayo.game', %s); }" % json.dumps(json.dumps(SAVED)))
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=30000)
        tap(pg, R["pit"]); pg.wait_for_selector("#gameover:not([hidden])", timeout=240000); pg.wait_for_timeout(700)
        assert pg.evaluate("window.__ayo.state.stores") == R["scores"] and pg.evaluate("window.__ayo.state.winner") == 1, "lost, as the engine says"
        rec0 = pg.evaluate("JSON.stringify(window.__ayo.record)"); rat0 = pg.evaluate("localStorage.getItem('ayo.rating')")
        rt = pg.evaluate("window.__ayo.retry"); n = R["at"] + 1
        assert rt["offered"] == "Try again from move %d · where it turned" % n and rt["at"] == R["at"], rt
        box = pg.evaluate("document.querySelector('#goRetry').getBoundingClientRect().toJSON()"); assert box["bottom"] <= pg.viewport_size["height"] + 400, box
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out[:-4] + "-card.png", timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        print("retry: lost %d–%d, the card offers: %s" % (R["scores"][0], R["scores"][1], rt["offered"]))
        pg.click("#goRetry"); pg.wait_for_function("window.__ayo.busy", timeout=5000)
        pg.wait_for_timeout(500); pg.screenshot(path=out[:-4] + "-flying.png", timeout=120000)
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.retry.on", timeout=60000)
        pg.wait_for_function("[...document.querySelectorAll('.toast')].some(x => x.textContent.includes('Back to move %d, where it turned'))" % n, timeout=5000)
        st = pg.evaluate("window.__ayo.state"); rt = pg.evaluate("window.__ayo.retry")
        assert st["moves"] == R["moves"][:R["at"]] and st["turn"] == 0 and not st["over"], "back to just before your move"
        assert rt["from"] == R["at"] and rt["last"] == R["scores"], rt
        if pg.evaluate("document.querySelectorAll('.badge').length") == 12: assert pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>+b.textContent)") == st["pits"], "the counts read the position"
        assert pg.evaluate("+document.querySelector('#myScore').textContent") == st["stores"][0] and pg.evaluate("+document.querySelector('#oppScore').textContent") == st["stores"][1], "the scores went back"
        assert pg.evaluate("document.querySelector('#gameover').hidden")
        pg.wait_for_timeout(600); pg.mouse.move(5, 5); pg.screenshot(path=out, timeout=120000)
        print("retry: the seeds flew back to move %d (%d–%d then), your move" % (n, st["stores"][0], st["stores"][1]))
        k = 0
        while not pg.evaluate("window.__ayo.state.over") and k < 150:  # play it to the end: the first legal pit each time (fast pace, Space hurries)
            pg.wait_for_function("window.__ayo.state.over || (window.__ayo.state.turn === 0 && !window.__ayo.busy)", timeout=240000)
            if pg.evaluate("window.__ayo.state.over"): break
            legal = pg.evaluate("window.__ayo.legal")
            if not legal: pg.wait_for_timeout(200); continue
            tap(pg, legal[0]); k += 1; pg.wait_for_timeout(150); pg.keyboard.press("Space")
            if k == 1:
                pg.wait_for_function("window.__ayo.state.turn === 0 && !window.__ayo.busy || window.__ayo.state.over", timeout=240000)
                if not pg.evaluate("window.__ayo.state.over"):
                    assert not pg.evaluate("document.querySelector('#undo').disabled"); pg.click("#undo"); pg.wait_for_function("window.__ayo.busy", timeout=5000); pg.wait_for_function("!window.__ayo.busy", timeout=60000)
                    assert pg.evaluate("window.__ayo.state.moves") == R["moves"][:R["at"]] and pg.evaluate("document.querySelector('#undo').disabled"), "Undo goes back to where it turned and no further"
            assert pg.evaluate("localStorage.getItem('ayo.game')") == "null", "a retry is never saved"
        pg.wait_for_selector("#gameover:not([hidden])", timeout=60000); pg.wait_for_timeout(600)
        eb = pg.evaluate("document.querySelector('#goEyebrow').textContent"); played = len(pg.evaluate("window.__ayo.state.moves")) - R["at"]
        assert eb.startswith("Nchò · from move %d of your last game · %d move" % (n, played)), eb
        fin = pg.evaluate("window.__ayo.state.stores"); rt = pg.evaluate("window.__ayo.retry")
        assert rt["line"] == "last time %d–%d · this time %d–%d" % (R["scores"][0], R["scores"][1], fin[0], fin[1]), rt
        assert rt["offered"] == "Try again from move %d · where it turned" % n, "the same move offered again"
        for sel in ("#replayBtn", "#clipBtn", "#goRating", "#goStory", "#goReview", "#goNext"):
            assert pg.evaluate("document.querySelector('%s').hidden" % sel), sel + " should step aside for a retry"
        assert pg.evaluate("JSON.stringify(window.__ayo.record)") == rec0 and pg.evaluate("localStorage.getItem('ayo.rating')") == rat0, "no record or rating kept"
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out[:-4] + "-over.png", timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        print("retry: played on, %s · %s · %s" % (eb, pg.evaluate("document.querySelector('#goTitle').textContent"), rt["line"]))
        pg.click("#goRetry"); pg.wait_for_function("!window.__ayo.busy && window.__ayo.retry.on && window.__ayo.state.moves.length === %d" % R["at"], timeout=60000)
        print("retry: and again from move %d" % n)
        pg.evaluate("document.querySelector('#gameover').hidden = true"); pg.click("#homeBtn", force=True); pg.wait_for_selector("#home:not([hidden])", timeout=10000)
        assert not pg.evaluate("window.__ayo.retry.on"), "Home ends the retry"
        ctx.close(); b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("wrote", out); sys.exit(0)
if sidec:  # a phone held sideways (idea 5 Nov): the board lies across a short, wide screen
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        def opened(q=""):
            ctx = b.new_context(viewport={"width": 844, "height": 390}, device_scale_factor=2, has_touch=True); pg = ctx.new_page(); watch(pg, errors, "sideways%s: " % q)
            pg.add_init_script("localStorage.setItem('ayo.tutorial', '3')")
            pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home" + q, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
            pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=30000); pg.wait_for_timeout(900)
            return ctx, pg
        pits = lambda pg: [pg.evaluate("window.__ayo.pitAt(%d)" % i) for i in range(12)]
        span = lambda P: ((P[5][0] - P[0][0]) ** 2 + (P[5][1] - P[0][1]) ** 2) ** 0.5
        c0, up = opened("&sideways=0"); assert up.evaluate("window.__ayo.side") == 0; upright = span(pits(up)); c0.close()
        ctx, pg = opened()
        assert abs(pg.evaluate("window.__ayo.side") - math.pi / 2) < 1e-9, "a phone on its side should see the board from its long side"
        assert pg.evaluate("document.documentElement.classList.contains('sideways')")
        P = pits(pg); lying = span(P)
        mine, theirs = P[:6], P[6:]
        assert all(abs(y - mine[0][1]) < 8 for x, y in mine) and all(abs(y - theirs[0][1]) < 8 for x, y in theirs), ("each row should lie level across the screen", P)
        assert mine[0][1] > theirs[0][1] + 30, ("your row should be the nearer (lower) one", P)
        assert lying >= upright * 1.3, ("the board should come out bigger lying across the screen", lying, upright)
        bar = pg.evaluate("document.querySelector('.bar').getBoundingClientRect().toJSON()"); hud = pg.evaluate("document.querySelector('.hud.bottom').getBoundingClientRect().toJSON()")
        for i, (x, y) in enumerate(P):
            assert 0 < x < bar["left"] and 0 < y < 390 and x > hud["right"], ("pit %d is off the board's room" % i, x, y, bar, hud)
            assert pg.evaluate("window.__ayo.hitTest(%f, %f)" % (x, y))[:1] == [i], ("a tap on pit %d should land on it" % i)
        print("sideways: rows level, yours nearest, pits %.0f px end to end lying vs %.0f upright (x%.2f), every tap lands" % (lying, upright, lying / upright))
        legal = pg.evaluate("window.__ayo.legal"); pit = legal[len(legal) // 2]; x, y = P[pit]
        pg.touchscreen.tap(x, y); pg.wait_for_timeout(300); assert pg.evaluate("window.__ayo.selected") == pit, "the first tap should pick the pit"
        pg.touchscreen.tap(x, y)
        pg.wait_for_function("window.__ayo.state.moves.length >= 2 && !window.__ayo.busy", timeout=240000); pg.wait_for_timeout(900)
        pg.screenshot(path=out, timeout=120000); print("sideways: played pit %d and Nnamdi replied" % pit)
        pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(600)
        assert pg.evaluate("window.__ayo.side") == 0 and not pg.evaluate("document.documentElement.classList.contains('sideways')"), "upright again, the board should stand up"
        Q = pits(pg); assert abs(Q[0][0] - Q[5][0]) < 30 and Q[0][1] > Q[5][1] + 100, ("upright, your row runs up the screen", Q)
        pg.set_viewport_size({"width": 1180, "height": 820}); pg.wait_for_timeout(600); assert pg.evaluate("window.__ayo.side") == 0, "the Mac keeps the upright board"
        pg.set_viewport_size({"width": 844, "height": 390}); pg.wait_for_timeout(600); assert pg.evaluate("window.__ayo.side") > 1, "on its side again"
        print("sideways: upright and on the Mac it stands up as before, and lies down again")
        ctx.close(); b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("wrote", out); sys.exit(0)
if looksc:  # the store's seed sets (L10): close renders of each, then the lock in Settings and the swap in place
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        def shot(seeds, name, still="close", finish="mahogany"):
            ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2)
            pg = ctx.new_page(); watch(pg, errors, seeds + "/" + finish + ": ")
            pg.add_init_script("localStorage.setItem('ayo.seeds', %s); localStorage.setItem('ayo.finish', %s)" % (json.dumps(seeds), json.dumps(finish)))
            pg.goto("http://127.0.0.1:8766/web/index.html?still=%s&try=looks" % still, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
            got = pg.evaluate("window.__ayo.seedSet"); assert got == seeds, ("the seed set drawn", got, seeds)
            got = pg.evaluate("window.__ayo.finish"); assert got == finish, ("the board drawn", got, finish)
            pg.screenshot(path=name, timeout=120000); print("looks:", seeds, finish, "→", name); ctx.close()
        if boardsc:  # the two boards (L10, slice 2): the whole board in each, and a close look
            shot("jobs", out, "1", "benin"); shot("jobs", out[:-4] + "-grandpa.png", "1", "grandpa")
            shot("jobs", out[:-4] + "-benin-close.png", "close", "benin"); shot("jobs", out[:-4] + "-grandpa-close.png", "close", "grandpa")
        else: shot("cowries", out); shot("kernels", out[:-4] + "-kernels.png"); shot("jobs", out[:-4] + "-jobs.png"); shot("cowries", out[:-4] + "-board.png", "1")
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2); pg = ctx.new_page(); watch(pg, errors, "settings: ")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])", timeout=10000)
        locked = pg.evaluate("[...document.querySelectorAll('[data-set=seeds] .swatch')].map(b=>[b.dataset.v, b.classList.contains('locked')])")
        assert locked == [["jobs", False], ["stones", True], ["cowries", True], ["kernels", True]], locked
        sub = pg.evaluate("document.querySelector('#seedsSub').textContent"); assert "cowries and palm kernels in the store" in sub, sub
        pg.click("[data-set=seeds] [data-v=cowries]"); pg.wait_for_timeout(300)
        t = pg.evaluate("[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' | ')"); assert "Cowries are a look from the store" in t, t
        assert pg.evaluate("window.__ayo.seedSet") == "jobs", "a locked look is not drawn"
        print("looks: locked ·", t)
        # the boards: the two from the store locked the same way, a wood swaps in place (no new game, no reload)
        locked = pg.evaluate("[...document.querySelectorAll('[data-set=finish] .swatch')].map(b=>[b.dataset.v, b.classList.contains('locked')])")
        assert locked == [["mahogany", False], ["iroko", False], ["ebony", False], ["benin", True], ["grandpa", True]], locked
        sub = pg.evaluate("document.querySelector('#boardSub').textContent"); assert "Benin bronze and Grandpa's board in the store" in sub, sub
        pg.click("[data-set=finish] [data-v=benin]"); pg.wait_for_timeout(300)
        t = pg.evaluate("[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' | ')"); assert "Benin bronze is a look from the store" in t, t
        assert pg.evaluate("window.__ayo.finish") == "mahogany", "a locked board is not drawn"
        moves = pg.evaluate("window.__ayo.state.moves.length") if pg.evaluate("!!(window.__ayo.state)") else None
        pg.click("[data-set=finish] [data-v=iroko]"); pg.wait_for_timeout(300)
        assert pg.evaluate("window.__ayo.finish") == "iroko", "a wood swaps in place"
        assert pg.evaluate("localStorage.getItem('ayo.finish')") == "iroko"
        if moves is not None: assert pg.evaluate("window.__ayo.state.moves.length") == moves, "no new game"
        print("looks: boards locked ·", t, "· iroko in place")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home&try=looks", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])", timeout=10000)
        assert not pg.evaluate("document.querySelector('[data-set=seeds] [data-v=kernels]').classList.contains('locked')"), "?try=looks opens them"
        pg.click("[data-set=seeds] [data-v=kernels]"); pg.wait_for_timeout(300)
        assert pg.evaluate("window.__ayo.seedSet") == "kernels"
        v = pg.evaluate("window.__ayo.voice"); assert v["tasted"][-1:] == ["kernels"] and v["id"] in ("kernels", None), ("a handful of palm kernels is heard, in their own voice", v)
        print("looks: voice ·", v)
        assert pg.evaluate("document.querySelector('[data-set=seeds] [data-v=kernels]').getAttribute('aria-pressed')") == "true"
        assert not pg.evaluate("document.querySelector('[data-set=finish] [data-v=grandpa]').classList.contains('locked')"), "?try=looks opens the boards"
        pg.click("[data-set=finish] [data-v=grandpa]"); pg.wait_for_timeout(600)
        assert pg.evaluate("window.__ayo.finish") == "grandpa", "Grandpa's board swaps in place"
        assert pg.evaluate("document.querySelector('[data-set=finish] [data-v=grandpa]').getAttribute('aria-pressed')") == "true"
        assert pg.evaluate("window.__ayo.seedSet") == "kernels", "the seeds stay as chosen"
        W = pg.evaluate("document.documentElement.scrollWidth"); assert W <= 390, ("Settings scrolls sideways", W)
        pg.evaluate("document.querySelector('[data-set=seeds]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        pg.screenshot(path=out[:-4] + "-settings.png", timeout=120000, animations="disabled")
        b.close()
    assert not errors, errors
    print("looks: ok"); sys.exit(0)
if storec:  # the store screen (L11): Gold at the top, every look tried on the live board, the buttons' words, Back puts yours back
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []; W0 = 1180 if wide else 390
        ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2)
        pg = ctx.new_page(); watch(pg, errors)
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        def toasts(): return pg.evaluate("[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' | ')")
        def states(sel): return pg.evaluate("[...document.querySelectorAll('%s .item')].map(i=>[i.dataset.id, i.querySelector('.sbtn').dataset.state, i.querySelector('.sbtn').textContent])" % sel)
        def shot(path): pg.wait_for_timeout(1200); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(200); pg.screenshot(path=path, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])", timeout=10000)
        assert pg.evaluate("document.querySelector('#home').hidden"), "Home steps aside"
        assert pg.evaluate("document.querySelector('#goldBtn').textContent") == "Get the app"
        gold = pg.evaluate("[...document.querySelectorAll('#goldList li')].map(l=>l.textContent)"); assert len(gold) == 4 and "Papa Ike" in gold[0] and "coming" in gold[3], gold
        assert states("#shopBoards") == [["mahogany", "on", "On the board"], ["iroko", "use", "Use"], ["ebony", "use", "Use"], ["benin", "buy", "Get the app"], ["grandpa", "buy", "Get the app"]], states("#shopBoards")
        sd = states("#shopSeeds"); assert [x[:2] for x in sd] == [["jobs", "on"], ["stones", "earn"], ["cowries", "buy"], ["kernels", "buy"]], sd
        assert pg.evaluate("document.querySelector('#nowTitle').textContent") == "Mahogany · Job's tears"
        pg.click("#shopBoards .item[data-id=benin] .who"); pg.wait_for_timeout(400)
        assert pg.evaluate("window.__ayo.finish") == "benin", "Benin bronze on the board for a look"
        assert pg.evaluate("document.querySelector('#nowTag').textContent") == "Trying on the board"
        assert pg.evaluate("localStorage.getItem('ayo.finish')") in (None, "mahogany"), "a look tried is never kept"
        W = pg.evaluate("document.documentElement.scrollWidth"); assert W <= W0, ("the store scrolls sideways", W)
        shot(out); print("store: benin on the board →", out)
        if not wide:
            pg.evaluate("document.querySelector('#shopSeeds').scrollIntoView({block:'center'})")
            pg.click("#shopSeeds .item[data-id=cowries] .who"); pg.wait_for_timeout(400)
            assert pg.evaluate("window.__ayo.seedSet") == "cowries", "cowries poured in for a look"
            assert pg.evaluate("document.querySelector('#nowTitle').textContent") == "Benin bronze · Cowries"
            shot(out[:-4] + "-seeds.png"); print("store: cowries →", out[:-4] + "-seeds.png")
        pg.click("#shopSeeds .item[data-id=cowries] .sbtn"); pg.wait_for_timeout(300)
        t = toasts(); assert "Cowries are bought in the app — the web link sells nothing" in t, t
        assert pg.evaluate("window.__ayo.seedSet") == "cowries"
        pg.click("#goldBtn"); pg.wait_for_timeout(300); assert "Gold is bought in the app" in toasts(), toasts()
        pg.click("#restoreBtn"); pg.wait_for_timeout(300); assert "nothing to restore" in toasts(), toasts()
        pg.click("#shopBoards .item[data-id=iroko] .sbtn"); pg.wait_for_timeout(400)
        assert pg.evaluate("window.__ayo.finish") == "iroko" and pg.evaluate("localStorage.getItem('ayo.finish')") == "iroko", "Use keeps it"
        assert states("#shopBoards")[1][1] == "on"
        pg.click("#storeBack"); pg.wait_for_selector("#home:not([hidden])", timeout=10000)
        assert pg.evaluate("window.__ayo.seedSet") == "jobs", "Back puts your own seeds back"
        assert pg.evaluate("window.__ayo.finish") == "iroko"
        pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])", timeout=10000)
        pg.click("#settingsStore"); pg.wait_for_selector("#store:not([hidden])", timeout=10000)
        pg.click("#shopBoards .item[data-id=grandpa] .who"); pg.wait_for_timeout(300); assert pg.evaluate("window.__ayo.finish") == "grandpa"
        pg.click("#storeBack"); pg.wait_for_selector("#settings:not([hidden])", timeout=10000)
        assert pg.evaluate("window.__ayo.finish") == "iroko", "back in Settings with your own board"
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home&try=looks", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])", timeout=10000)
        sub = pg.evaluate("document.querySelector('#shopSeeds .item[data-id=kernels] .lb span').textContent"); assert "open for this visit" in sub, sub
        pg.click("#shopSeeds .item[data-id=kernels] .sbtn"); pg.wait_for_timeout(300)
        assert pg.evaluate("window.__ayo.seedSet") == "kernels" and pg.evaluate("localStorage.getItem('ayo.seeds')") == "kernels"
        # buying (L12) against the test store (?store=test, kept for the visit only): prices from the store, a buy, Gold, restore
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home&store=test", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.evaluate("localStorage.setItem('ayo.finish','mahogany')")
        pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])", timeout=10000); pg.wait_for_timeout(300)
        assert pg.evaluate("document.querySelector('#goldBtn').textContent") == "£T.GO", "Gold's price is the store's"
        assert states("#shopBoards")[3] == ["benin", "buy", "£T.BB"], states("#shopBoards")
        pg.click("#shopBoards .item[data-id=benin] .who"); pg.wait_for_timeout(300)
        pg.click("#shopBoards .item[data-id=benin] .sbtn"); pg.wait_for_timeout(700)
        assert "Benin bronze is yours" in toasts(), toasts()
        assert states("#shopBoards")[3][1] == "on", ("bought while trying: now yours on the board", states("#shopBoards"))
        assert pg.evaluate("window.__ayo.finish") == "benin" and pg.evaluate("localStorage.getItem('ayo.finish')") == "benin"
        pg.click("#goldBtn"); pg.wait_for_timeout(700); assert "Gold is yours" in toasts(), toasts()
        assert pg.evaluate("document.querySelector('#goldBtn').textContent") == "Yours"
        pg.click("#restoreBtn"); pg.wait_for_timeout(700); assert "All restored" in toasts(), toasts()
        pg.click("#storeBack"); pg.wait_for_selector("#home:not([hidden])", timeout=10000)
        assert not pg.evaluate("document.querySelector('.pill[data-level=master]').classList.contains('locked')"), "Gold opens Papa Ike"
        assert pg.evaluate("localStorage.getItem('ayo.owned')") in (None, "[]"), "the test store's purchases are never kept"
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        assert pg.evaluate("window.__ayo.finish") == "mahogany", "without the test store the board is not owned"
        assert pg.evaluate("document.querySelector('.pill[data-level=master]').classList.contains('locked')")
        b.close()
    assert not errors, errors
    print("store: ok"); sys.exit(0)
if telec:  # game numbers and crash reports (L13): nothing without a sink; with the test sink, only the fixed words, and the switch stops it
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2)
        pg = ctx.new_page(); watch(pg, errors)
        pg.add_init_script("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.name', 'Meka Secret')")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        t = pg.evaluate("window.__ayo.telemetry"); assert t["on"] and not t["recording"] and t["sent"] is None, ("no sink: nothing is recorded", t)
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&telemetry=test", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        assert pg.evaluate("window.__ayo.telemetry")["recording"]
        pit = pg.evaluate("window.__ayo.legal")[0]; tap(pg, pit)
        pg.wait_for_function("window.__ayo.state.moves.length >= 1", timeout=60000); pg.wait_for_function("!window.__ayo.busy && document.querySelector('#turn').textContent==='your move'", timeout=240000)
        sent = pg.evaluate("window.__ayo.telemetry.sent"); starts = [e for e in sent if e["name"] == "game_start"]
        assert len(starts) == 1 and starts[0]["params"]["first"] is True and starts[0]["params"]["game"] == "ncho" and starts[0]["params"]["platform"] == "web", sent
        pg.click("#homeBtn"); pg.wait_for_selector("#home:not([hidden])"); pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])"); pg.wait_for_timeout(200)
        sent = pg.evaluate("window.__ayo.telemetry.sent"); assert sent[-1] == {"name": "store_open", "params": {"from": "home", "platform": "web"}}, sent
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home&telemetry=test", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
        sw = "[data-set=tele]"; assert pg.evaluate("document.querySelector('%s').getAttribute('aria-checked')" % sw) == "true"
        assert pg.evaluate("document.querySelector('#teleNow').textContent") == " · on"
        pg.click(sw); assert pg.evaluate("localStorage.getItem('ayo.tele')") == "0" and pg.evaluate("document.querySelector('#teleNow').textContent") == " · off"
        pg.click("#settingsStore"); pg.wait_for_selector("#store:not([hidden])"); pg.wait_for_timeout(200)
        assert pg.evaluate("window.__ayo.telemetry.sent") == [], "the switch off sends nothing"
        pg.click("#storeBack"); pg.wait_for_selector("#settings:not([hidden])"); pg.click(sw); pg.click("#settingsStore"); pg.wait_for_selector("#store:not([hidden])"); pg.wait_for_timeout(200)
        sent = pg.evaluate("window.__ayo.telemetry.sent"); assert [e["name"] for e in sent] == ["store_open"] and sent[0]["params"]["from"] == "settings", sent
        pg.click("#storeBack"); pg.wait_for_selector("#settings:not([hidden])")
        pg.locator("[data-set=tele]").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
        W = pg.evaluate("document.documentElement.scrollWidth"); assert W <= pg.evaluate("innerWidth"), ("Settings scrolls sideways", W)
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(200); pg.screenshot(path=out, animations="disabled")
        allsent = json.dumps(pg.evaluate("window.__ayo.telemetry.sent")); assert "Meka" not in allsent and "Secret" not in allsent
        b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("telemetry: ok · wrote", out); sys.exit(0)
if langc:  # French (L18, slices 1–3): a phone in French opens in French; Settings → Language switches in place and back; a move plays
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        def phone(w, h, loc):
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, locale=loc); pg = ctx.new_page(); watch(pg, errors, loc + ": ")
            pg.add_init_script("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done')")
            return ctx, pg
        ctx, pg = phone(390, 844, "fr-FR")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        assert pg.evaluate("document.documentElement.lang") == "fr"
        got = pg.evaluate("[document.querySelector('#playBtn b').textContent, document.querySelector('#playSub').textContent, document.querySelector('#homeSettings').getAttribute('aria-label')]")
        assert got[0] == "Jouer" and got[1].startswith("contre ") and got[2] == "Réglages", got
        pg.wait_for_timeout(300); pg.screenshot(path=out, animations="disabled")  # no freeze: the board keeps running for the move below
        pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
        assert pg.evaluate("document.querySelector('#settings h2').textContent") == "Réglages"
        assert "téléphone" in pg.evaluate("document.querySelector('#langNow').textContent")
        W = pg.evaluate("document.documentElement.scrollWidth"); assert W <= pg.evaluate("innerWidth"), ("Settings scrolls sideways in French", W)
        pg.wait_for_timeout(300); pg.screenshot(path=out[:-4] + "-settings.png", animations="disabled")
        pg.click("[data-set=lang] [data-v=en]"); pg.wait_for_timeout(200)
        assert pg.evaluate("document.querySelector('#settings h2').textContent") == "Settings" and pg.evaluate("document.documentElement.lang") == "en"
        assert pg.evaluate("localStorage.getItem('ayo.lang')") == "en"
        pg.click("[data-set=lang] [data-v=fr]"); pg.wait_for_timeout(200)
        assert pg.evaluate("document.querySelector('#settings h2').textContent") == "Réglages"
        pg.click("#settingsBack"); pg.wait_for_selector("#home:not([hidden])"); pg.click("#playBtn"); pg.wait_for_timeout(1500); pg.wait_for_function("!window.__ayo.busy", timeout=60000)
        assert pg.evaluate("document.querySelector('#turn').textContent") == "à vous", pg.evaluate("document.querySelector('#turn').textContent")
        pit = pg.evaluate("window.__ayo.legal")[0]; tap(pg, pit)
        pg.wait_for_function("window.__ayo.state.moves.length >= 1", timeout=60000); pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length >= 2", timeout=240000)
        assert pg.evaluate("document.querySelector('#turn').textContent") == "à vous"
        # slice 2: the board's words as it plays — their move explained, then the first tap's path words, all in French
        pg.mouse.move(2, 2); pg.wait_for_timeout(400)  # the mouse off the board: the hint line says the move, not the pit under it
        lw = pg.evaluate("document.querySelector('#lastMove').hidden ? '' : document.querySelector('#lastWords').textContent")
        assert not re.search(r"\b(picked|took|gave|ended|their|your|pit)\b", lw), ("their move, explained, in English", lw)
        h = pg.evaluate("document.querySelector('#hint').textContent"); assert "touchez" in h or "cliquez" in h, ("the hint line", h)
        pits = pg.evaluate("window.__ayo.legal"); best = max(pits, key=lambda q: pg.evaluate(f"window.__ayo.state.pits[{q}]"))
        x, y = pg.evaluate("window.__ayo.pitAt(%d)" % best); pg.mouse.click(x, y); pg.mouse.move(2, 2); pg.wait_for_timeout(1400)  # one tap: the path, not the move
        h = pg.evaluate("document.querySelector('#hint').textContent")
        assert "pour semer" in h and not re.search(r"\b(ends|takes|gives|picks|their|your|pit|tap)\b", h), ("the path words in French", h)
        assert pg.evaluate("window.__i18n.src(document.querySelector('#hint'))").endswith(" to sow")
        print("  fr hint:", h, "| their move:", lw)
        pg.screenshot(path=out[:-4] + "-board.png", animations="disabled")
        pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.state.moves.length >= 3", timeout=60000); pg.wait_for_function("!window.__ayo.busy", timeout=240000)
        ctx.close()
        # slice 3: the cards — a French phone one move from beating Mama Ngozi a third time running: Home's record and rating
        # lines, then the Game over card (top line, title, how it went, the record, the rating) and the share words, all French
        end = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "endgame.js"), "7", "ncho"]).decode())
        saved = {"moves": end["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "hard", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 7 * 60 * 1000}}
        rec = {"easy": {"w": 4, "l": 2, "d": 1, "best": [31, 17], "run": 1}, "hard": {"w": 2, "l": 1, "d": 0, "best": [26, 22], "run": 2}, "last": 1}
        ctx, pg = phone(390, 844, "fr-FR")
        pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.record', %s); localStorage.setItem('ayo.rating', %s); localStorage.setItem('ayo.level', 'hard'); }" % (json.dumps(json.dumps(saved)), json.dumps(json.dumps(rec)), json.dumps(json.dumps({"r": 1180, "n": 14, "last": 0, "change": 12}))))
        pg.add_init_script("window.__shared = []; navigator.share = async (d) => { window.__shared.push(d.text); }; navigator.canShare = () => false;")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        ENG = r"(?<![^\W\d_])(you|your|lead|trail|best|win|wins|draws?|moves?|game|rating|for|beating|led|from|biggest|swing|seeds?|way|level|last|of|the|and|she|would|played|differently|in)(?![^\W\d_])"
        rl = pg.evaluate("document.querySelector('#ratingText').textContent"); assert rl == "Votre classement 1180 · +12 à la dernière partie", rl
        pills = pg.evaluate("[...document.querySelectorAll('.pill[data-level] small.rec')].map(e=>e.textContent).filter(Boolean)"); assert pills == ["vous menez 4–2", "vous menez 2–1"], pills
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        tap(pg, end["pit"]); pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.over", timeout=240000); pg.wait_for_selector("#gameover:not([hidden])", timeout=10000); pg.wait_for_timeout(2500)
        card = pg.evaluate("[...['#goEyebrow','#goTitle','#goBig','#goStoryWords','#goRecLine','#goRatingWhy','#goRevWords']].map(q => { const e = document.querySelector(q); return e && !e.closest('[hidden]') ? e.textContent : ''; })")
        print("  fr card:", " | ".join(card))
        for line in card: assert not re.search(ENG, line.replace("Mama Ngozi", "").replace("Nchò", "").replace("Gold", "")), ("English on the French card", line, card)
        assert card[1] == "Vous gagnez" and card[0].startswith("Nchò · ") and " coups" in card[0] and "vous menez" in card[4], card
        # slice 4: the third win running is worth Mama Ngozi's word — on the card in « » and in her bubble, in French
        said = pg.evaluate("[document.querySelector('#goRecSay').textContent, document.querySelector('#bubble').textContent, window.__i18n.src(document.querySelector('#bubble'))]")
        print("  fr her word:", said[0], "| bubble:", said[1])
        assert said[0] == "« Trois d’affilée ? Mama Ngozi vous a à l’œil. »" and said[1] == said[0][2:-2], said
        assert said[2] == "Three in a row? Mama Ngozi is watching.", said
        pg.click("#shareBtn"); pg.wait_for_function("window.__shared.length >= 1", timeout=10000)
        sh = pg.evaluate("window.__shared[0]"); assert sh.startswith("Ayo & Nchò — J’ai battu Mama Ngozi "), sh
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out[:-4] + "-cards.png", animations="disabled")
        ctx.close()
        # the puzzle's result card in French
        ctx, pg = phone(390, 844, "fr-FR")
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&puzzle=1", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.wait_for_function("window.__ayo.puzzle && window.__ayo.puzzle.on && !window.__ayo.busy", timeout=30000)
        pz = pg.evaluate("window.__ayo.puzzle"); legal = pg.evaluate("window.__ayo.legal"); worst = min(legal, key=lambda q: pg.evaluate("window.__ayo.tryPit(%d)" % q))
        tap(pg, worst)
        pg.wait_for_selector("#pzCard:not([hidden])", timeout=120000); pg.wait_for_timeout(600)
        pc = pg.evaluate("['#pzEyebrow','#pzBadge','#pzBest','#pzRun','#pzAgain'].map(q => document.querySelector(q).textContent)")
        print("  fr puzzle:", " | ".join(pc))
        assert pc[0] == "Vous avez pris" and " sur " in pc[2] and pc[4] in ("Réessayer", "Le rejouer"), pc
        for line in pc: assert not re.search(r"(?<![^\W\d_])(short|Nothing|captured|of|in a row|day|none|yet|Try|again|Solved)(?![^\W\d_])", line), ("English on the puzzle card", pc)
        pg.click("#pzShare"); pg.wait_for_timeout(400)
        ctx.close()
        ctx, pg = phone(390, 844, "en-GB")  # an English phone stays English
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        assert pg.evaluate("document.querySelector('#playBtn b').textContent") == "Play" and pg.evaluate("document.documentElement.lang") == "en"
        ctx.close()
        ctx, pg = phone(1180, 820, "fr-FR")  # the Mac
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out[:-4] + "-wide.png", animations="disabled")
        b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("lang: ok · wrote", out); sys.exit(0)
if remindc:  # the daily-puzzle reminder (L14): only in the apps; asks once; a week planned; the card's offer; a tap opens the puzzle
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        base = "http://127.0.0.1:8766/web/index.html?capture=1"
        def fresh(q, extra=""):
            ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2)
            pg = ctx.new_page(); watch(pg, errors)
            pg.add_init_script("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done');" + extra)
            pg.goto(base + q, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000); return pg
        rem = lambda pg: pg.evaluate("window.__ayo.remind")
        # the web link: nothing to switch on, nothing offered
        pg = fresh("&stay=home"); pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
        r = rem(pg); assert not r["supported"] and not r["on"] and "in the apps" in r["note"], r
        assert pg.evaluate("document.querySelector('[data-set=remind]').disabled") and pg.evaluate("document.querySelector('#remindTimeRow').hidden")
        pg.context.close()
        # the app (stand-in plugin): the switch asks once and plans the week
        pg = fresh("&stay=home&remind=test"); pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
        r = rem(pg); assert r["supported"] and not r["on"] and r["asked"] == [] and r["pending"] == [], ("nothing until switched on", r)
        pg.locator("[data-set=remind]").scroll_into_view_if_needed(); pg.click("[data-set=remind]")
        pg.wait_for_function("window.__ayo.remind.pending.length >= 6", timeout=10000); r = rem(pg)
        assert r["on"] and r["asked"] == ["granted"] and r["permission"] == "granted", r
        assert len(r["pending"]) <= 7 and all(n["at"][11:16] == "19:00" for n in r["pending"]), r["pending"]
        assert len({n["at"][:10] for n in r["pending"]}) == len(r["pending"]), "one a day"
        for n in r["pending"]:
            assert n["body"].startswith("Capture ") and "Nchò rules" in n["body"] and n["title"].startswith("Daily puzzle · "), n
        pg.click("[data-set=remindAt] [data-v='9']"); pg.wait_for_timeout(300); r = rem(pg)
        assert r["hour"] == 9 and all(n["at"][11:16] == "09:00" for n in r["pending"]) and r["asked"] == ["granted"], r
        assert pg.evaluate("localStorage.getItem('ayo.remindAt')") == "9"
        W = pg.evaluate("document.documentElement.scrollWidth"); assert W <= pg.evaluate("innerWidth"), ("Settings scrolls sideways", W)
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(200); pg.screenshot(path=out.replace(".png", "-settings.png"), animations="disabled")
        pg.evaluate("window.__freeze=false"); pg.click("[data-set=remind]"); pg.wait_for_timeout(300); r = rem(pg)
        assert not r["on"] and r["pending"] == [], ("off cancels every one", r)
        pg.context.close()
        # the puzzle card offers it; a tap turns it on, and today's reminder goes once the puzzle is played
        pg = fresh("&puzzle=1&remind=test"); pz = pg.evaluate("window.__ayo.puzzle")
        tap(pg, pz["answer"]); pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000); pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
        r = rem(pg); assert r["offer"] == "Remind me each day at 19:00", r
        pg.wait_for_timeout(900); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(200); pg.screenshot(path=out, animations="disabled"); pg.evaluate("window.__freeze=false; requestAnimationFrame(() => 0)")
        pg.click("#pzRemind"); pg.wait_for_function("window.__ayo.remind.pending && window.__ayo.remind.pending.length >= 6", timeout=10000); r = rem(pg)
        assert r["on"] and pz["key"] not in [n["extra"]["puzzle"] for n in r["pending"]], ("none today: it is played", r)
        assert "Reminder on" in pg.evaluate("document.querySelector('#pzRemindWords').textContent")
        # a tap on tomorrow's reminder from Home opens the puzzle
        pg.click("#pzHome"); pg.wait_for_selector("#home:not([hidden])", timeout=10000)
        pg.evaluate("window.__ayo.remindTap(%d)" % r["pending"][0]["id"]); pg.wait_for_selector("#puzzle:not([hidden])", timeout=10000)
        assert pg.evaluate("window.__ayo.puzzle.on")
        pg.context.close()
        # a phone that says no: the switch stays off, the note says where to turn them on, never asked again
        pg = fresh("&stay=home&remind=test&remindAnswer=denied"); pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
        pg.locator("[data-set=remind]").scroll_into_view_if_needed(); pg.click("[data-set=remind]"); pg.wait_for_timeout(500); r = rem(pg)
        assert not r["on"] and r["pending"] == [] and r["asked"] == ["denied"] and "phone's settings" in r["note"], r
        assert pg.evaluate("document.querySelector('[data-set=remind]').getAttribute('aria-checked')") == "false"
        pg.click("[data-set=remind]"); pg.wait_for_timeout(500); assert rem(pg)["asked"] == ["denied"], "not asked again"
        pg.context.close(); b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("remind: ok · wrote", out); sys.exit(0)
if freshc:  # a newer game, without asking (idea 5 Nov): the real server writes its build into the page; a newer one out there is said on Home, updates quietly on coming back after a minute away, never off Home, never twice for one build
    import atexit; atexit.register(lambda: node.terminate())
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2)
        pg = ctx.new_page(); watch(pg, errors)
        BASE = "http://127.0.0.1:8767/?capture=1&stay=home"
        pg.goto(BASE, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        v = json.loads(urllib.request.urlopen("http://127.0.0.1:8767/version").read())["v"]
        f = pg.evaluate("window.__ayo.fresh"); assert f["on"] and f["mine"] == v, (f, v)
        pg.evaluate("window.__ayo.freshCheck()"); pg.wait_for_timeout(200)
        f = pg.evaluate("window.__ayo.fresh"); assert not f["ready"] and f["line"] is None, f
        served = {"v": "ffffffffffff"}
        pg.route("**/version", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(served)))
        pg.evaluate("window.__ayo.freshCheck()"); pg.wait_for_function("window.__ayo.fresh.line !== null", timeout=5000)
        f = pg.evaluate("window.__ayo.fresh"); assert f["line"] == "A newer version is ready · tap to update", f
        pg.wait_for_timeout(500); pg.screenshot(path=out); print("fresh: the line on Home ·", f["line"])
        pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])", timeout=10000)
        assert pg.evaluate("document.querySelector('#freshLine').hidden"), "said on Home only"
        pg.evaluate("window.__ayo.freshBack(120000)"); pg.wait_for_timeout(400)
        assert pg.evaluate("window.__ayo.fresh.reloads") == 0, "never off Home"
        pg.click("#settingsBack"); pg.wait_for_selector("#home:not([hidden])", timeout=10000)
        assert pg.evaluate("window.__ayo.fresh.line") is not None, "back on Home, said again"
        pg.evaluate("window.__ayo.freshBack(20000)"); pg.wait_for_timeout(400)
        assert pg.evaluate("window.__ayo.fresh.reloads") == 0, "away only 20 s: no reload without a word"
        with pg.expect_navigation(timeout=120000, wait_until="commit"): pg.evaluate("window.__ayo.freshBack(120000)")
        pg.wait_for_function("window.__done===true", timeout=180000)
        f = pg.evaluate("window.__ayo.fresh"); assert f["mine"] == v and f["tried"] == "ffffffffffff", f
        pg.evaluate("window.__ayo.freshCheck()"); pg.wait_for_timeout(300)
        f = pg.evaluate("window.__ayo.fresh"); assert f["line"] is None and not f["ready"], ("a build already reloaded for is not offered again", f)
        print("fresh: quiet reload after 2 min away · not offered again for the same build")
        served["v"] = "eeeeeeeeeeee"; pg.evaluate("window.__ayo.freshCheck()"); pg.wait_for_function("window.__ayo.fresh.line !== null", timeout=5000)
        with pg.expect_navigation(timeout=120000, wait_until="commit"): pg.click("#freshLine")
        pg.wait_for_function("window.__done===true", timeout=180000)
        assert pg.evaluate("window.__ayo.fresh.tried") == "eeeeeeeeeeee"
        print("fresh: a tap on the line updates")
        # the board: a game in play is never reloaded, however long away
        pg.goto("http://127.0.0.1:8767/?capture=1", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        served["v"] = "dddddddddddd"; pg.evaluate("window.__ayo.freshCheck()"); pg.wait_for_timeout(300)
        assert pg.evaluate("window.__ayo.fresh.ready") and pg.evaluate("window.__ayo.fresh.line") is None
        pg.evaluate("window.__ayo.freshBack(600000)"); pg.wait_for_timeout(400)
        assert pg.evaluate("window.__ayo.fresh.reloads") == 0, "never on the board"
        print("fresh: never on the board")
        b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("wrote", out); sys.exit(0)
if legal:  # privacy, terms and support: Settings links to the server's pages, which open beside the game and read well on a phone
    import atexit; atexit.register(lambda: node.terminate())
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        # --frlegal: a French phone (L18): the links carry ?lang=fr, the pages come up in French with no English in their words, and English is one tap away
        lg = "fr" if frlegal else "en"
        LABELS = {"en": ["Privacy", "Terms", "Support"], "fr": ["Confidentialité", "Conditions", "Assistance"]}[lg]
        ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2, locale="fr-FR" if frlegal else "en-GB")
        pg = ctx.new_page(); watch(pg, errors)
        pg.goto("http://127.0.0.1:8767/?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])", timeout=10000)
        links = pg.evaluate("[...document.querySelectorAll('.legal a')].map(a=>[a.textContent,a.href,a.target,a.dataset.page])")
        assert [l[0] for l in links] == LABELS, links
        for (name, href, target, page) in links:
            assert href == "http://127.0.0.1:8767/" + page + "?lang=" + lg and target == "_blank", (name, href, target)
        pg.locator(".legal").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
        pg.evaluate("window.__freeze=true"); pg.screenshot(path=out.replace(".png", "-settings.png"), animations="disabled")
        with ctx.expect_page() as info: pg.click("#lnkPrivacy")
        doc = info.value; doc.wait_for_load_state("load")
        assert doc.url.endswith("/privacy?lang=" + lg) and doc.title().startswith(LABELS[0]), doc.url
        assert doc.evaluate("document.documentElement.lang") == lg
        assert pg.evaluate("!document.querySelector('#settings').hidden"), "the game left Settings when the page opened"
        assert doc.evaluate("document.documentElement.scrollWidth <= innerWidth"), "the privacy page scrolls sideways"
        ENGW = re.compile(r"(?<![^\W\d_])(the|and|your|you|with|is|Last updated|Play)(?![^\W\d_])")
        def no_english(d, name):
            if not frlegal: return
            t = d.evaluate("[...document.querySelectorAll('main > :not(nav)')].map(e=>e.innerText).join(' ')")
            t = re.sub(r"(Privacy|Terms|Support), in English|Google Play|Licensed Application End User License Agreement|Information Commissioner’s Office|SIL Open Font Licence", "", t)
            bad = ENGW.search(t); assert not bad, (name, bad.group(0), t[max(0, bad.start() - 60):bad.end() + 60])
        no_english(doc, "privacy")
        doc.screenshot(path=out)
        q = "?lang=fr" if frlegal else ""
        for i, name in enumerate(("terms", "support")):
            doc.click("nav a[href='/%s%s']" % (name, q)); doc.wait_for_load_state("load")
            assert doc.url.endswith("/" + name + q) and doc.evaluate("document.querySelector('nav a[aria-current=page]').textContent") == LABELS[i + 1]
            assert doc.evaluate("document.documentElement.scrollWidth <= innerWidth"), name + " scrolls sideways"
            no_english(doc, name)
            doc.screenshot(path=out.replace(".png", "-" + name + ".png"))
        # the other language is one tap away, and back
        doc.click("nav a.lang"); doc.wait_for_load_state("load")
        other = "en" if frlegal else "fr"
        assert doc.evaluate("document.documentElement.lang") == other and doc.url.endswith("/support?lang=" + other), doc.url
        doc.click("nav a.lang"); doc.wait_for_load_state("load"); assert doc.evaluate("document.documentElement.lang") == lg
        if frlegal:  # Settings → Language → English turns the links English at once
            pg.evaluate("window.__freeze=false"); pg.evaluate("document.querySelector('[data-set=lang] [data-v=en]').click()")
            pg.wait_for_function("document.documentElement.lang === 'en'", timeout=5000)
            hrefs = pg.evaluate("[...document.querySelectorAll('.legal a')].map(a=>a.href)")
            assert all(h.endswith("?lang=en") for h in hrefs), hrefs
        print("legal pages:", lg, "links", [l[1] for l in links])
        b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("wrote", out); sys.exit(0)
if frrooms:  # French (L18, slice 5): two French phones meet in a room — the Rooms screen, the name card, the door, joining, a shout across the board, the take-back ask and the call's card, all in French; the invite on WhatsApp in French (« tu »)
    import atexit; atexit.register(lambda: node.terminate())
    ENG = re.compile(r"(?<![^\W\d_])(room|door|friend|waiting|knock|knocked|wants|play|move|your|they|them|the|and|tap|let|again|asks?|video|voice|seat|link|share|send)(?![^\W\d_])", re.I)
    def no_english(pg, sel, what):
        t = pg.evaluate(f"[...document.querySelectorAll({sel!r})].filter(e=>!e.closest('[hidden]')).map(e=>e.innerText).join(' | ')")
        bad = ENG.search(re.sub(r"Meka|Tete|Ayo|Nchò|WhatsApp|Oya", "", t, flags=re.I)); assert not bad, (what, bad.group(0), t); return t.replace("\xa0", " ").lower()
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        def phone(name):
            ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="fr-FR", permissions=["camera", "microphone"]); pg = ctx.new_page(); watch(pg, errors, name + ": ")
            pg.add_init_script("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done')")
            pg.goto("http://127.0.0.1:8767/?capture=1&stay=home", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
            assert pg.evaluate("document.documentElement.lang") == "fr"; return pg
        host = phone("host")
        host.click("#friendsBtn"); host.wait_for_selector("#nameCard:not([hidden])", timeout=10000)
        no_english(host, "#nameCard", "the name card"); host.fill("#nameField", "Meka"); host.click("#nameGo")
        host.wait_for_function("document.querySelector('#roomStatus').dataset.state==='open'", timeout=20000); code = host.evaluate("window.__ayo.room.code")
        rooms = no_english(host, "#rooms", "the Rooms screen"); print("rooms:", rooms.replace("\n", " ")[:300])
        assert "votre salle" in rooms and "on attend un ami" in rooms and "votre nom : meka" in rooms, rooms
        wa = host.evaluate("decodeURIComponent(document.querySelector('#waBtn').href)"); assert "Viens jouer à Ayo & Nchò avec moi" in wa and ("Salle " + code) in wa, wa
        host.evaluate("window.__freeze=true"); host.wait_for_timeout(300); host.screenshot(path=out, animations="disabled"); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        friend = phone("friend")
        friend.click("#friendsBtn"); friend.wait_for_selector("#nameCard:not([hidden])", timeout=10000); friend.fill("#nameField", "Tete"); friend.click("#nameGo")
        friend.wait_for_function("document.querySelector('#roomStatus').dataset.state==='open'", timeout=20000)
        friend.fill("#codeField", "zzzz"); friend.click("#joinBtn"); friend.wait_for_function("document.querySelector('#joinNote').classList.contains('bad')", timeout=10000)
        note = friend.evaluate("document.querySelector('#joinNote').textContent"); assert note.startswith("Aucune salle avec ce code"), note
        friend.fill("#codeField", code.lower()); friend.click("#joinBtn")
        friend.wait_for_function("window.__ayo.room && window.__ayo.room.knock && window.__ayo.room.knock.id", timeout=20000)
        friend.wait_for_function("document.querySelector('#hint').textContent.startsWith('Vous avez frappé')", timeout=10000)
        assert friend.evaluate("document.querySelector('#turn').textContent") == "à la porte"
        host.wait_for_selector("#knockCard:not([hidden])", timeout=20000)
        door = no_english(host, "#knockCard", "the door"); assert "tete veut jouer" in door, door
        host.evaluate("window.__freeze=true"); host.wait_for_timeout(200); host.screenshot(path=out[:-4] + "-door.png", animations="disabled"); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        host.click("#knockYes")
        for pg in (host, friend): pg.wait_for_function("window.__ayo.room && window.__ayo.room.friend && window.__ayo.room.friend.name", timeout=20000)
        host.wait_for_function("document.querySelector('#turn').textContent==='à vous'", timeout=20000)
        # a shout: shown in French on the other phone, the row itself in French
        host.click("#shoutBtn"); host.wait_for_selector("#shoutMenu:not([hidden])", timeout=5000)
        row = no_english(host, "#shoutMenu", "the shout row"); assert "oya, à toi" in row and "abandonner cette partie" in row, row
        host.click("#shoutMenu .pill[data-id=well]")
        friend.wait_for_function("document.body.innerText.includes('Bien joué')", timeout=10000)
        # take it back: the host plays, asks, the friend's card is French
        tap(host, 2); host.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length===1", timeout=240000)
        host.wait_for_function("!document.querySelector('#undo').disabled", timeout=20000)
        assert host.evaluate("document.querySelector('#undo').getAttribute('aria-label')") == "Demander à reprendre votre coup"
        host.click("#undo"); host.wait_for_function("document.querySelector('#hint').textContent.startsWith('Vous avez demandé à Tete')", timeout=10000)
        friend.wait_for_selector("#backCard:not([hidden])", timeout=20000)
        back = no_english(friend, "#backCard", "the take-back card"); assert "meka demande à reprendre son coup" in back, back
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=out[:-4] + "-back.png", animations="disabled"); friend.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        friend.click("#backNo"); host.wait_for_function("document.body.innerText.includes('Tete dit qu’on continue')", timeout=20000)
        # the call: the camera menu and the card on the friend's phone
        host.click("#callBtn"); host.wait_for_selector("#callMenu:not([hidden])", timeout=5000)
        menu = no_english(host, "#callMenu", "the call menu"); assert ("vidéo avec tete" in menu or "voix avec tete" in menu) and "bloquer tete" in menu, menu
        vid = "vidéo avec tete" in menu; host.click("#callMenu .pill[data-id=%s]" % ("video" if vid else "voice"))  # the lighter board (headless) offers voice only
        friend.wait_for_selector("#callCard:not([hidden])", timeout=20000)
        card = no_english(friend, "#callCard", "the call card"); assert ("meka aimerait la vidéo au plateau" if vid else "meka aimerait parler au plateau") in card, card
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=out[:-4] + "-call.png", animations="disabled")
        b.close()
    node.terminate()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("frrooms: ok · wrote", out); sys.exit(0)
if online:
    import atexit; atexit.register(lambda: node.terminate())  # the server never outlives a failed check (whichever one is running)
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        # two phones = two browser contexts, so neither sees the other's saved seat
        host = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=1, permissions=["camera", "microphone"]).new_page(); watch(host, errors, "host: ")
        host.goto("http://127.0.0.1:8767/?capture=1&stay=home", wait_until="load"); host.wait_for_function("window.__done===true", timeout=180000)
        # Home → With friends: the Rooms screen; the name is asked once ("That's me"), then a room opens and its code lands on the tiles
        host.click("#friendsBtn"); host.wait_for_selector("#rooms:not([hidden])", timeout=10000)
        host.wait_for_selector("#nameCard:not([hidden])", timeout=10000); assert host.evaluate("document.querySelector('#nameGo').textContent") == "That's me"
        host.fill("#nameField", "Meka"); host.click("#nameGo")
        host.wait_for_function("window.__ayo.room && window.__ayo.room.code && window.__ayo.room.seat===0", timeout=20000)
        code = host.evaluate("window.__ayo.room.code"); print("room:", code, "host seat", host.evaluate("window.__ayo.room.seat"))
        host.wait_for_function("document.querySelector('#roomStatus').dataset.state==='open'", timeout=10000)
        assert host.evaluate("[...document.querySelectorAll('#roomCode span')].map(s=>s.textContent).join('')") == code, "the code tiles do not show the room code"
        assert host.evaluate("location.search") == "?room=" + code, "the address did not become the invite link"
        assert host.evaluate("document.querySelector('#waBtn').href").startswith("https://wa.me/?text=") and code in host.evaluate("decodeURIComponent(document.querySelector('#waBtn').href)"), "the WhatsApp invite does not carry the code"
        assert not host.evaluate("document.querySelector('#copyBtn').disabled") and host.evaluate("document.querySelector('#roomsName').textContent") == "playing as Meka"
        assert host.evaluate("document.querySelector('#meName').textContent") == "Meka"
        assert not host.evaluate("document.querySelector('#rooms').hidden"), "the Rooms screen stays up while the room waits"
        # the picture for Meka: the Rooms screen with its code (the board behind it frozen)
        host.evaluate("window.__freeze=true"); host.wait_for_timeout(300); host.screenshot(path=out, timeout=120000, animations="disabled"); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        # the friend goes the same way: Home → With friends (their own room opens), a wrong code is refused under the field, then the real code knocks
        friend = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, permissions=["camera", "microphone"]).new_page(); watch(friend, errors, "friend: ")
        friend.goto("http://127.0.0.1:8767/?capture=1&stay=home", wait_until="load"); friend.wait_for_function("window.__done===true", timeout=180000)
        friend.click("#friendsBtn"); friend.wait_for_selector("#nameCard:not([hidden])", timeout=10000); friend.fill("#nameField", "Tete"); friend.click("#nameGo")
        friend.wait_for_function("document.querySelector('#roomStatus').dataset.state==='open'", timeout=20000)
        assert friend.evaluate("window.__ayo.room.code") != code
        friend.fill("#codeField", "zz9z"); assert friend.evaluate("document.querySelector('#codeField').value") == "ZZZ", "the code field keeps letters only, in capitals"
        assert friend.evaluate("document.querySelector('#joinBtn').disabled"), "Join waits for four letters"
        friend.fill("#codeField", "zzzz"); friend.click("#joinBtn")
        friend.wait_for_function("document.querySelector('#joinNote').classList.contains('bad')", timeout=10000)
        print("join: a wrong code says:", friend.evaluate("document.querySelector('#joinNote').textContent"))
        assert friend.evaluate("window.__ayo.room") is None and not friend.evaluate("document.querySelector('#rooms').hidden"), "a refused code leaves the friend on the Rooms screen"
        friend.fill("#codeField", code.lower()); friend.click("#joinBtn")
        friend.wait_for_function("window.__ayo.room && window.__ayo.room.knock && window.__ayo.room.knock.id", timeout=20000)
        assert friend.evaluate("document.querySelector('#rooms').hidden"), "knocking takes the friend to the board"
        assert friend.evaluate("window.__ayo.room.seat") is None, "a knock must not seat the friend"
        assert friend.evaluate("document.querySelector('#oppName').textContent") == "Meka" and friend.evaluate("document.querySelector('#turn').textContent") == "at the door"
        host.wait_for_selector("#knockCard:not([hidden])", timeout=20000)
        assert host.evaluate("document.querySelector('#knockTitle').textContent") == "Tete wants to play", host.evaluate("document.querySelector('#knockTitle').textContent")
        assert host.evaluate("window.__ayo.room.friend") is None and host.evaluate("window.__ayo.room.knocks.length") == 1
        assert not host.evaluate("document.querySelector('#rooms').hidden") and host.evaluate("document.querySelector('#roomStatus').dataset.state") == "door", "the door card shows over the Rooms screen"
        out3 = out[:-4] + "-door.png" if out.endswith(".png") else out + "-door.png"
        host.evaluate("window.__freeze=true"); host.wait_for_timeout(200); host.screenshot(path=out3, timeout=120000, animations="disabled"); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        print("door: host sees", host.evaluate("document.querySelector('#knockTitle').textContent"), "/ friend sees", friend.evaluate("document.querySelector('#hint').textContent"))
        host.click("#knockYes")  # let them in: the friend takes the far seat
        for pg in (host, friend): pg.wait_for_function("window.__ayo.room && window.__ayo.room.friend && window.__ayo.room.friend.name", timeout=20000)
        assert host.evaluate("document.querySelector('#knockCard').hidden"), "the door card should close once they are in"
        assert host.evaluate("document.querySelector('#rooms').hidden") and host.evaluate("document.body.classList.contains('playing')"), "the host goes to the board once the friend is in"
        assert friend.evaluate("window.__ayo.room.seat") == 1 and friend.evaluate("window.__ayo.room.knock") is None
        assert host.evaluate("document.querySelector('#oppName').textContent") == "Tete" and friend.evaluate("document.querySelector('#oppName').textContent") == "Meka"
        assert host.evaluate("document.querySelector('#turn').textContent") == "your move", "the host should move first"
        assert friend.evaluate("document.querySelector('#turn').textContent") != "your move", "the friend must wait"
        before = friend.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        # their hand over the board (web/peek.js): the host's first tap on a pit lights it faintly on Tete's board and the line under
        # Meka's name says so; another pit moves the light; Esc puts it back and the light goes; then the host sows
        def first(pg, pit): x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit); pg.mouse.click(x, y)
        first(host, 4)
        friend.wait_for_function("window.__ayo.peek.pit===4 && window.__ayo.peek.lit", timeout=20000)
        pk = friend.evaluate("window.__ayo.peek"); assert pk["words"] == "weighing their pit 5", pk
        assert not host.evaluate("window.__ayo.peek.lit"), "the host's own board shows no friend's light"
        host.wait_for_timeout(250); first(host, 1)
        friend.wait_for_function("window.__ayo.peek.pit===1 && window.__ayo.peek.lit", timeout=20000)
        friend.wait_for_timeout(500)
        outp = out[:-4] + "-online-peek.png" if out.endswith(".png") else out + "-online-peek.png"
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=outp, timeout=120000, animations="disabled"); friend.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        print("peek: Tete's board follows Meka's finger ·", friend.evaluate("window.__ayo.peek.words"), "·", [e["pit"] for e in friend.evaluate("window.__ayo.peek.log")])
        host.keyboard.press("Escape")
        friend.wait_for_function("window.__ayo.peek.pit===-1 && !window.__ayo.peek.lit && document.querySelector('#oppSub').textContent!=='weighing their pit 2'", timeout=20000)
        print("peek: put back, the light goes ·", friend.evaluate("document.querySelector('#oppSub').textContent"))
        host.wait_for_timeout(250)
        tap(host, 2)  # the host sows their third pit; the friend's board must follow
        friend.wait_for_function("document.querySelector('#turn').textContent==='your move'", timeout=240000)
        host.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length===1", timeout=240000)
        mid = friend.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        assert before != mid, "the friend's board did not follow the host's move"
        assert mid == host.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')"), "the two boards disagree"
        assert host.evaluate("window.__ayo.state.moves.length") == 1
        # your move, even in another tab: the host's page goes out of sight before the friend answers; the tab's title and icon say it
        host.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })")
        tap(friend, 6)  # the friend answers from the far seat (their pits are 6..11, drawn nearest them)
        host.wait_for_function("window.__ayo.away.count>0", timeout=60000)
        aw = host.evaluate("window.__ayo.away"); print("away: the host's tab says", repr(aw["title"]))
        assert aw["title"] == "Your move · Tete played — Ayo & Nchò" or aw["title"] == "Tete played — Ayo & Nchò", aw
        assert aw["icon"].startswith("data:image/svg+xml,"), "the tab's icon should carry its brass dot"
        assert friend.evaluate("window.__ayo.away.count") == 0, "the friend's own move says nothing on the friend's tab"
        host.evaluate("delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))")  # back: the board (paused while out of sight) plays Tete's move
        aw = host.evaluate("window.__ayo.away"); assert aw["count"] == 0 and aw["title"] == "Ayo & Nchò" and aw["icon"].endswith("icon.svg"), aw
        host.wait_for_function("document.querySelector('#turn').textContent==='your move'", timeout=240000)
        print("away: back at the board, the title and icon are plain again")
        friend.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length===2", timeout=240000)
        after = host.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        assert after != mid and after == friend.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')"), "the host's board did not follow the friend's move"
        assert host.evaluate("window.__ayo.state.moves.length") == 2 and friend.evaluate("window.__ayo.state.moves.length") == 2
        # a friend's move is explained too: the host's board says what Tete just did, the friend's own board says nothing (it was their move)
        ex = host.evaluate("window.__ayo.explain"); assert ex and ex["name"] == "Tete" and ex["pit"] == 6 and not host.evaluate("document.querySelector('#lastMove').hidden"), ex
        assert friend.evaluate("window.__ayo.explain") is None and friend.evaluate("document.querySelector('#lastMove').hidden")
        print("online: the host's board explains Tete's move ·", ex["words"])
        print("online: moves", host.evaluate("JSON.stringify(window.__ayo.state.moves)"), "scores", host.evaluate("[document.querySelector('#myScore').textContent, document.querySelector('#oppScore').textContent]"), "friend sees", friend.evaluate("document.querySelector('#oppName').textContent"), "/", friend.evaluate("document.querySelector('#oppSub').textContent"))
        # a shout: the host taps the shout chip and a phrase; it pops up by the host's face on the friend's phone (and by the host's own name)
        for pg in (host, friend):
            assert pg.evaluate("getComputedStyle(document.querySelector('#shoutBtn')).display") != "none", "the shout chip should show online"
            assert pg.evaluate("getComputedStyle(document.querySelector('#undo')).display") != "none", "the Undo chip asks to take a move back online"
        host.click("#shoutBtn"); host.wait_for_selector("#shoutMenu:not([hidden])", timeout=5000)
        host.click("#shoutMenu .pill[data-id=oya]")
        friend.wait_for_function("!document.querySelector('#bubble').hidden && document.querySelector('#bubble').textContent==='Oya, your move!'", timeout=10000)
        host.wait_for_function("!document.querySelector('#myBubble').hidden && document.querySelector('#myBubble').textContent==='Oya, your move!'", timeout=10000)
        assert host.evaluate("document.querySelector('#shoutMenu').hidden"), "the shout row closes once a phrase is sent"
        assert friend.evaluate("window.__ayo.shout('chai')") is True, "the friend can shout back"
        host.wait_for_function("document.querySelector('#bubble').textContent==='Chai!'", timeout=10000)
        print("online: shouts went both ways")
        # video and voice at the board: the host asks from the camera chip; nothing opens until Tete says yes; then the faces sit by the names
        call = "window.__ayo.call"
        for pg in (host, friend): assert pg.evaluate("getComputedStyle(document.querySelector('#callBtn')).display") != "none", "the camera chip shows online"
        assert host.evaluate(call)["chip"] == "Video or voice with Tete"
        if host.evaluate("window.__ayo.quality.tier.lite"):  # the lighter board offers voice only
            host.click("#callBtn"); host.wait_for_selector("#callMenu:not([hidden])", timeout=5000)
            assert host.evaluate(call)["menu"] == ["Voice with Tete", "Report a problem", "Block Tete"], host.evaluate(call)["menu"]; host.click("#callBtn")
            print("video: the lighter board offers voice only")
        for pg in (host, friend): pg.evaluate("window.__ayo.callLite = false")  # the check goes on as two phones on the full board
        host.click("#callBtn"); host.wait_for_selector("#callMenu:not([hidden])", timeout=5000)
        assert host.evaluate(call)["menu"] == ["Video with Tete", "Voice only", "Report a problem", "Block Tete"], host.evaluate(call)["menu"]
        host.click("#callMenu .pill[data-id=video]")
        friend.wait_for_selector("#callCard:not([hidden])", timeout=10000)
        hc = host.evaluate(call); fc = friend.evaluate(call)
        assert fc["card"] == "Meka would like video at the board" and fc["phase"] == "asked", fc
        assert hc["phase"] == "asking" and hc["local"] == [] and fc["local"] == [], "no camera or microphone opens before both say yes"
        assert host.evaluate("document.querySelector('#hint').textContent") == "Asked Tete to talk — waiting for their yes"
        outv1 = out[:-4] + "-video-ask.png" if out.endswith(".png") else out + "-video-ask.png"
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=outv1, timeout=120000, animations="disabled"); friend.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        friend.click("#callVideo")
        for pg in (host, friend): pg.wait_for_function("(c => c.phase==='live' && c.theirCam && c.myCam && c.playing)(window.__ayo.call)", timeout=60000)
        hc = host.evaluate(call); fc = friend.evaluate(call)
        assert hc["local"] == ["audio", "video"] and hc["remote"] == ["audio", "video"] and fc["remote"] == ["audio", "video"], (hc, fc)
        assert hc["asker"] == "me" and fc["asker"] == "them" and not hc["voiceRing"]
        assert host.evaluate("document.querySelector('#oppFace').hidden"), "their picture takes the face's place by their name"
        print("video: live both ways ·", hc["log"], "/", fc["log"])
        outv = out[:-4] + "-video.png" if out.endswith(".png") else out + "-video.png"
        host.wait_for_timeout(1500); host.evaluate("window.__freeze=true"); host.wait_for_timeout(300); host.screenshot(path=outv, timeout=120000); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        # a weak line (slice 3): the real readings of a good local line leave the pictures on; then the host's line goes bad
        # (window.__lineBad stands in its numbers, readings quickened): both go voice only, the voice stays; the line comes
        # back, Video again is offered, and a tap brings both pictures back
        for pg in (host, friend): pg.evaluate("window.__lineMs = 250")
        host.wait_for_timeout(2500)
        hc = host.evaluate(call); assert not hc["weak"] and hc["sending"] and "weak" not in hc["lineLog"], hc
        host.evaluate("window.__lineBad = true")
        host.wait_for_function("(c => c.weak && c.sending===false && !c.myCam && c.weakChip)(window.__ayo.call)", timeout=20000)
        friend.wait_for_function("(c => c.weak && c.sending===false && !c.theirCam && c.voiceRing && c.log.includes('theirweak'))(window.__ayo.call)", timeout=20000)
        for pg in (host, friend): assert pg.evaluate(call)["phase"] == "live", "the voice carries on"
        host.wait_for_function("(c => !c.theirCam && c.voiceRing)(window.__ayo.call)", timeout=20000)
        host.click("#callBtn"); host.wait_for_selector("#callMenu:not([hidden])", timeout=5000)
        assert host.evaluate(call)["menu"] == ["Mute", "Hang up", "Report a problem", "Block Tete"], host.evaluate(call)["menu"]
        assert "Video again comes here" in host.evaluate("document.querySelector('#callMenu .note').textContent")
        outw = out[:-4] + "-weak.png" if out.endswith(".png") else out + "-weak.png"
        host.evaluate("window.__freeze=true"); host.wait_for_timeout(300); host.screenshot(path=outw, timeout=120000); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        host.click("#callBtn")
        host.evaluate("window.__lineBad = false")
        host.wait_for_function("(c => c.better)(window.__ayo.call)", timeout=20000)
        host.click("#callBtn"); host.wait_for_selector("#callMenu:not([hidden])", timeout=5000)
        assert host.evaluate(call)["menu"] == ["Mute", "Video again", "Hang up", "Report a problem", "Block Tete"], host.evaluate(call)["menu"]
        host.click("#callMenu .pill[data-id=again]")
        for pg in (host, friend): pg.wait_for_function("(c => !c.weak && c.sending && c.theirCam && c.myCam && c.playing)(window.__ayo.call)", timeout=30000)
        assert "theirvideoagain" in friend.evaluate(call)["log"]
        for pg in (host, friend): pg.evaluate("window.__lineBad = null; window.__lineMs = 0")
        print("video: weak line → voice only on both phones, then Video again brought both pictures back")
        # the host mutes: Tete's board shows it on the host's bubble; Tete hides the host's picture on their own phone (the voice stays)
        host.click("#callBtn"); host.wait_for_selector("#callMenu:not([hidden])", timeout=5000)
        assert host.evaluate(call)["menu"] == ["Mute", "Camera off", "Hide Tete's picture", "Hang up", "Report a problem", "Block Tete"], host.evaluate(call)["menu"]
        host.click("#callMenu .pill[data-id=mic]")
        friend.wait_for_function("!document.querySelector('#theirMuted').hidden", timeout=10000)
        assert host.evaluate(call)["local"] == ["audio:off", "video"] and not host.evaluate("document.querySelector('#myMuted').hidden")
        host.click("#callBtn")  # closes the menu
        friend.click("#callBtn"); friend.wait_for_selector("#callMenu:not([hidden])", timeout=5000); friend.click("#callMenu .pill[data-id=theirs]")
        fc = friend.evaluate(call); assert fc["hideTheirs"] and not fc["theirCam"] and fc["voiceRing"], fc
        # Tete hangs up: both cameras and microphones close
        friend.click("#callMenu .pill[data-id=end]")
        for pg in (host, friend): pg.wait_for_function("(c => c.phase==='idle' && !c.theirCam && !c.myCam && c.local.length===0)(window.__ayo.call)", timeout=20000)
        assert "theyended" in host.evaluate(call)["log"] and not host.evaluate("document.querySelector('#oppFace').hidden")
        print("video: muted, picture hidden on one phone, hung up — both closed")
        out2 = out[:-4] + "-friend.png" if out.endswith(".png") else out + "-friend.png"
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=out2, timeout=120000, animations="disabled")
        friend.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        # take it back?: the host plays, then asks with the Undo chip; Tete's board shows the card; "Let them" flies the seeds back on both boards
        badges = "[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')"
        pre = host.evaluate(badges); assert host.evaluate("document.querySelector('#undo').disabled"), "nothing of the host's to take back on his own move"
        hp = host.evaluate("window.__ayo.legal")[-1]; tap(host, hp)
        for pg in (host, friend): pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length===3", timeout=240000)
        host.wait_for_function("!document.querySelector('#undo').disabled", timeout=10000)
        assert host.evaluate("document.querySelector('#undo').getAttribute('aria-label')") == "Ask to take back your move"
        host.click("#undo"); friend.wait_for_selector("#backCard:not([hidden])", timeout=10000)
        assert friend.evaluate("[document.querySelector('#backEyebrow').textContent, document.querySelector('#backTitle').textContent]") == ["Take it back?", "Meka asks to take back their move"]
        assert host.evaluate("document.querySelector('#undo').classList.contains('asking') && document.querySelector('#hint').textContent") == "Asked Tete to take back your move — waiting"
        out6 = out[:-4] + "-takeback.png" if out.endswith(".png") else out + "-takeback.png"
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=out6, timeout=120000, animations="disabled"); friend.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        friend.click("#backYes")
        for pg in (host, friend): pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length===2 && document.querySelector('#backCard').hidden", timeout=240000)
        assert host.evaluate(badges) == pre == friend.evaluate(badges), (pre, host.evaluate(badges), friend.evaluate(badges))
        assert host.evaluate("document.querySelector('#turn').textContent") == "your move" and host.evaluate("document.querySelector('#undo').disabled")
        print("take back: Tete said yes, both boards back to", pre)
        # the server restarts mid-game (a deploy, or the free plan waking up): both boards reconnect by themselves, the first one
        # back rebuilds the room from its ticket, and the game goes on from the same position
        node.terminate(); node.wait(10); node = start_node()
        for pg in (host, friend): pg.wait_for_function("window.__ayo.room && window.__ayo.room.status==='open' && window.__ayo.room.seat!==null && window.__ayo.state.moves.length===2", timeout=60000)
        assert host.evaluate(badges) == pre == friend.evaluate(badges), ("after the restart", pre, host.evaluate(badges), friend.evaluate(badges))
        assert json.loads(urllib.request.urlopen("http://127.0.0.1:8767/healthz", timeout=2).read())["rooms"] == 1, "the room was not rebuilt"
        host.wait_for_function("document.querySelector('#turn').textContent==='your move'", timeout=20000)
        rp = host.evaluate("window.__ayo.legal")[0]; tap(host, rp)
        for pg in (host, friend): pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length===3", timeout=240000)
        assert host.evaluate(badges) == friend.evaluate(badges), "the boards disagree after a move played across the restart"
        print("restart: the server restarted mid-game; both boards came back to the same position and played on")
        # offering a draw: Tete offers from the shout row and Meka plays on (a no); then Meka offers and Tete agrees — both boards end level
        friend.click("#shoutBtn"); friend.wait_for_selector("#shoutMenu:not([hidden])", timeout=5000)
        assert friend.evaluate("!document.querySelector('#drawBtn').hidden && !document.querySelector('#drawBtn').disabled && document.querySelector('#drawBtn').textContent") == "Offer a draw"
        friend.click("#drawBtn"); host.wait_for_selector("#backCard:not([hidden])", timeout=10000)
        assert host.evaluate("[document.querySelector('#backTitle').textContent, document.querySelector('#backYes').textContent, document.querySelector('#backNo').textContent]") == ["Tete offers a draw", "Agree a draw", "Play on"], host.evaluate("document.querySelector('#backTitle').textContent")
        host.click("#backNo")
        for pg in (host, friend): pg.wait_for_function("document.querySelector('#backCard').hidden && !window.__ayo.state.over", timeout=10000)
        friend.click("#shoutBtn"); friend.wait_for_selector("#shoutMenu:not([hidden])", timeout=5000)
        assert friend.evaluate("[document.querySelector('#drawBtn').textContent, document.querySelector('#drawBtn').disabled]") == ["Draw offered at this move", True]
        friend.click("#shoutBtn")
        host.click("#shoutBtn"); host.wait_for_selector("#shoutMenu:not([hidden])", timeout=5000); host.click("#drawBtn")
        friend.wait_for_selector("#backCard:not([hidden])", timeout=10000)
        assert friend.evaluate("[document.querySelector('#backEyebrow').textContent, document.querySelector('#backTitle').textContent]") == ["A draw?", "Meka offers a draw"]
        outd = out[:-4] + "-draw-ask.png" if out.endswith(".png") else out + "-draw-ask.png"
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=outd, timeout=120000, animations="disabled"); friend.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        dpre = host.evaluate(badges)
        friend.click("#backYes")
        for pg in (host, friend): pg.wait_for_function("!document.querySelector('#gameover').hidden && window.__ayo.state.agreed===true", timeout=60000)
        hd = host.evaluate("[document.querySelector('#goTitle').textContent, document.querySelector('#goEyebrow').textContent, document.querySelector('#goMe').classList.contains('win'), document.querySelector('#goOpp').classList.contains('win')]")
        fd = friend.evaluate("[document.querySelector('#goTitle').textContent, document.querySelector('#goEyebrow').textContent]")
        assert hd[0] == "A draw" and hd[1].endswith("Agreed a draw") and not hd[2] and not hd[3], hd
        assert fd[0] == "A draw" and fd[1].endswith("Agreed a draw"), fd
        assert host.evaluate(badges) == dpre == friend.evaluate(badges), "an agreed draw moves no seed"
        assert host.evaluate("window.__ayo.state.winner") == "draw" == friend.evaluate("window.__ayo.state.winner")
        outd2 = out[:-4] + "-draw.png" if out.endswith(".png") else out + "-draw.png"
        host.evaluate("window.__freeze=true"); host.wait_for_timeout(200); host.screenshot(path=outd2, timeout=120000, animations="disabled"); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        print("draw: Tete's offer played on; Meka's agreed — both cards", hd[:2])
        # the score at the table (web/tally.js): both cards count the agreed draw at this board
        for pg in (host, friend): pg.wait_for_function("!document.querySelector('#goRecord').hidden && / drawn · /.test(document.querySelector('#goRecLine').textContent)", timeout=10000)
        tdh, tdf = host.evaluate("document.querySelector('#goRecLine').textContent"), friend.evaluate("document.querySelector('#goRecLine').textContent")
        assert tdh.split(" · ")[-1] == tdf.split(" · ")[-1] and tdh.split(" · ")[-1].endswith("at this board"), (tdh, tdf)
        print("tally after the draw:", tdh, "|", tdf)
        host.click("#rematch"); friend.click("#rematch")
        for pg in (host, friend): pg.wait_for_function("!window.__ayo.busy && !window.__ayo.state.over && window.__ayo.state.moves.length===0 && document.querySelector('#gameover').hidden", timeout=60000)
        # giving up: the last button in the host's shout row asks once more, then the game ends on both boards for Tete
        host.click("#shoutBtn"); host.wait_for_selector("#shoutMenu:not([hidden])", timeout=5000)
        assert host.evaluate("!document.querySelector('#giveUpBtn').hidden && document.querySelector('#giveUpBtn').textContent") == "Give up this game"
        host.click("#giveUpBtn")
        gu = host.evaluate("[document.querySelector('#giveUpBtn').textContent, document.querySelector('#giveUpBtn').classList.contains('armed'), document.querySelector('#shoutMenu').hidden]")
        assert gu[0] in ("Tap again to give up", "Click again to give up") and gu[1] and not gu[2], gu
        out4 = out[:-4] + "-giveup-ask.png" if out.endswith(".png") else out + "-giveup-ask.png"
        host.evaluate("window.__freeze=true"); host.wait_for_timeout(150); host.screenshot(path=out4, timeout=120000, animations="disabled"); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        assert not host.evaluate("window.__ayo.state.over"), "one tap does not give up"
        if not host.evaluate("document.querySelector('#giveUpBtn').classList.contains('armed')"): host.click("#giveUpBtn")  # the picture took longer than the 3 s the button waits: ask again
        host.click("#giveUpBtn")
        for pg in (host, friend): pg.wait_for_function("!document.querySelector('#gameover').hidden && window.__ayo.state.resigned===0", timeout=60000)
        hc = host.evaluate("[document.querySelector('#goTitle').textContent, document.querySelector('#goEyebrow').textContent]")
        fc = friend.evaluate("[document.querySelector('#goTitle').textContent, document.querySelector('#goEyebrow').textContent, document.querySelector('#goMe').classList.contains('win')]")
        assert hc[0] == "Tete wins" and hc[1].endswith("You gave up"), hc
        assert fc[0] == "You win" and fc[1].endswith("Meka gave up") and fc[2], fc
        assert host.evaluate("window.__ayo.state.winner") == 1 and friend.evaluate("window.__ayo.state.winner") == 1
        print("give up: host's card", hc, "· Tete's card", fc[:2])
        # the score at the table: Tete's win is counted on both boards, the standing turns over with a tick, and both say the same
        for pg in (host, friend): pg.wait_for_function("(() => { const e = document.querySelector('#goRecLine em.tally'); return e && e.classList.contains('tick'); })()", timeout=10000)
        th, tf = host.evaluate("document.querySelector('#goRecLine').textContent"), friend.evaluate("document.querySelector('#goRecLine').textContent")
        nh = [int(x) for x in __import__("re").findall(r"(\d+)–(\d+)", th)[0]]; nf = [int(x) for x in __import__("re").findall(r"(\d+)–(\d+)", tf)[0]]
        assert th.split(" · ")[-1] == tf.split(" · ")[-1] and nh == nf, (th, tf)
        assert (th.startswith("Tete leads") and tf.startswith("you lead")) or (th.startswith("level") and tf.startswith("level")) or (th.startswith("you lead") and tf.startswith("Meka leads")), (th, tf)
        n_games = int(th.split(" · ")[-1].split(" ")[0]); assert n_games >= 2 and " drawn" in th, th
        print("tally after Meka gave up:", th, "|", tf)
        outt = out[:-4] + "-tally.png" if out.endswith(".png") else out + "-tally.png"  # docs/render-2026-11-06-tally.png
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=outt, timeout=120000, animations="disabled"); friend.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        out5 = out[:-4] + "-giveup.png" if out.endswith(".png") else out + "-giveup.png"
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=out5, timeout=120000, animations="disabled")
        friend.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        # block and report: the camera chip's menu ends with Report a problem and Block Tete (two taps); a block ends the room for this
        # phone, and Tete's knocks at Meka's next room are turned away by themselves (Tete sees the usual "not let in")
        assert host.evaluate("window.__ayo.tag") != friend.evaluate("window.__ayo.tag") and len(host.evaluate("window.__ayo.tag")) == 22
        host.evaluate("document.querySelector('#gameover').hidden = true")  # the board behind the card, as after Close
        host.click("#callBtn"); host.wait_for_selector("#callMenu:not([hidden])", timeout=5000)
        assert host.evaluate(call)["menu"][-2:] == ["Report a problem", "Block Tete"], host.evaluate(call)["menu"]
        rh = host.evaluate("(() => { const a = []; const o = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { a.push([this.href, this.target]); }; document.querySelector('#callMenu .pill[data-id=report]').click(); HTMLAnchorElement.prototype.click = o; return a; })()")
        assert len(rh) == 1 and rh[0][0].endswith("/support?lang=en#report") and rh[0][1] == "_blank", rh  # in the game's language (L18)
        host.click("#callBtn"); host.wait_for_selector("#callMenu:not([hidden])", timeout=5000)
        host.click("#callMenu .pill[data-id=block]")
        assert host.evaluate(call)["menu"][-1] in ("Tap again to block Tete", "Click again to block Tete") and host.evaluate("window.__ayo.room") is not None, host.evaluate(call)["menu"]
        outb = out[:-4] + "-block.png" if out.endswith(".png") else out + "-block.png"
        host.evaluate("window.__freeze=true"); host.wait_for_timeout(150); host.screenshot(path=outb, timeout=120000, animations="disabled"); host.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        if not host.evaluate("document.querySelector('#callMenu .pill[data-id=block]').classList.contains('armed')"): host.click("#callMenu .pill[data-id=block]")  # the picture took longer than the 3 s: ask again
        host.click("#callMenu .pill[data-id=block]")
        host.wait_for_function("window.__ayo.room === null && !document.querySelector('#home').hidden", timeout=10000)
        assert host.evaluate("window.__ayo.blocked") == ["Tete"], host.evaluate("window.__ayo.blocked")
        friend.wait_for_function("window.__ayo.room && window.__ayo.room.friend && !window.__ayo.room.friend.online", timeout=20000)
        print("block: Meka blocked Tete — left the room; Tete's board sees Meka gone")
        host.click("#friendsBtn"); host.wait_for_function("window.__ayo.room && window.__ayo.room.code && window.__ayo.room.seat===0 && window.__ayo.room.code!=='%s'" % code, timeout=20000)
        code2 = host.evaluate("window.__ayo.room.code")
        friend.goto("http://127.0.0.1:8767/?capture=1&room=" + code2, wait_until="load")
        friend.wait_for_function("['Meka did not let you in this time', 'Not let in this time'].includes(document.querySelector('#oppName').textContent)", timeout=30000)  # the same as any Not now
        assert host.evaluate("document.querySelector('#knockCard').hidden") and host.evaluate("window.__ayo.room.knocks.length") == 0 and host.evaluate("window.__ayo.room.friend") is None
        print("block: Tete knocked at Meka's next room", code2, "and was turned away without a card")
        host.click("#roomsBack"); host.wait_for_selector("#home:not([hidden])", timeout=5000)
        host.click("#homeSettings"); host.wait_for_selector("#settings:not([hidden])", timeout=5000)
        assert host.evaluate("[...document.querySelectorAll('#blockedList .row b')].map(b=>b.textContent)") == ["Tete"] and host.evaluate("document.querySelector('#blockedNow').textContent") == " · 1"
        host.click("#blockedList .choose"); assert host.evaluate("window.__ayo.blocked") == [] and host.evaluate("document.querySelector('#blockedNow').textContent") == " · nobody"
        print("block: Settings → Privacy listed Tete; Unblock emptied it")
        b.close(); node.terminate()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("wrote", out, out3, out2, outv1, outv, out4, out6, out5, "and", outb); sys.exit(0)
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2 if not (wide or home) else 1, has_touch=countc)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three):
        pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    if winc:  # a saved game one move from beating Mama Ngozi
        end = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "endgame.js"), "7", "ncho"]).decode())
        wsave = {"moves": end["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "hard", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 6 * 60 * 1000}}
        pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'hard'); localStorage.setItem('ayo.tutorial', '3'); }" % json.dumps(json.dumps(wsave)))
    if record:  # a phone that has played all three before, with a saved game one move from beating Mama Ngozi for the third time running
        end = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "endgame.js"), "7", "ncho"]).decode())
        saved = {"moves": end["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "hard", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 7 * 60 * 1000}}  # a game that began a few minutes ago
        before = {"easy": {"w": 4, "l": 2, "d": 0, "best": [31, 17], "run": 1}, "medium": {"w": 1, "l": 3, "d": 1, "best": [25, 23], "run": -2}, "hard": {"w": 2, "l": 1, "d": 0, "best": [26, 22], "run": 2}, "last": 1}
        rbefore = {"r": 1180, "n": 14, "last": 0, "change": 12}  # a settled rating, up 12 last game
        pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.record', %s); localStorage.setItem('ayo.rating', %s); localStorage.setItem('ayo.level', 'hard'); localStorage.setItem('ayo.tutorial', '3'); }" % (json.dumps(json.dumps(saved)), json.dumps(json.dumps(before)), json.dumps(json.dumps(rbefore))))
    if last8:  # a saved game against Nnamdi one move from the last 8
        pos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "last8pos.js"), "5"]).decode())
        saved = {"moves": pos["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "medium", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 5 * 60 * 1000}}
        pg.add_init_script("localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'medium'); localStorage.setItem('ayo.tutorial', '3');" % json.dumps(json.dumps(saved)))
    if racec:  # a saved game against Nnamdi near the finish: your move brings you within 3 of 25
        rpos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "racepos.js"), "3"]).decode())
        saved = {"moves": rpos["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "medium", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 6 * 60 * 1000}}
        pg.add_init_script("localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'medium'); localStorage.setItem('ayo.tutorial', '3');" % json.dumps(json.dumps(saved)))
    if circ:  # a saved game against Nnamdi one move from the circling line; then (sessionStorage says which) one move from the call
        cpos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "circlepos.js"), "5"]).decode())
        kpos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "circlepos.js"), "5", "call"]).decode())
        mk = lambda m: json.dumps(json.dumps({"moves": m, "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "medium", "stats": {"biggest": 8, "captures": 5, "started": int(time.time() * 1000) - 9 * 60 * 1000}}))
        pg.add_init_script("localStorage.setItem('ayo.game', sessionStorage.getItem('call') ? %s : %s); localStorage.setItem('ayo.level', 'medium'); localStorage.setItem('ayo.tutorial', '3');" % (mk(kpos["moves"]), mk(cpos["moves"])))
    if feedc:  # a saved game against Adaeze where their side is empty; then (sessionStorage says which) one with a single move
        fpos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "feedpos.js"), "feed"]).decode())
        opos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "feedpos.js"), "only"]).decode())
        mk = lambda m: json.dumps(json.dumps({"moves": m, "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "easy", "stats": {"biggest": 4, "captures": 2, "started": int(time.time() * 1000) - 3 * 60 * 1000}}))
        pg.add_init_script("localStorage.setItem('ayo.game', sessionStorage.getItem('only') ? %s : %s); localStorage.setItem('ayo.level', 'easy'); localStorage.setItem('ayo.tutorial', '3');" % (mk(opos["moves"]), mk(fpos["moves"])))
    if slamc:  # a saved Ayo game against Adaeze where one of your pits would take every seed on their side (a grand slam)
        spos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "slampos.js")]).decode())
        ssave = json.dumps(json.dumps({"moves": spos["moves"], "variant": "ayo", "rules": {"capture": 23, "relay": False, "last8": False}, "level": "easy", "stats": {"biggest": 3, "captures": 4, "started": int(time.time() * 1000) - 6 * 60 * 1000}}))
        pg.add_init_script("localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'easy'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.gives.told', '1');" % ssave)
    if givesc:  # a saved game against Adaeze where one of your pits hands a 4 to the other side
        gpos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "givespos.js")]).decode())
        gsave = json.dumps(json.dumps({"moves": gpos["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "easy", "stats": {"biggest": 4, "captures": 1, "started": int(time.time() * 1000) - 2 * 60 * 1000}}))
        pg.add_init_script("localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'easy'); localStorage.setItem('ayo.tutorial', '3');" % gsave)
    if startsc: pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.level', 'hard'); localStorage.setItem('ayo.starts', JSON.stringify({ hard: { first: 0, winner: 0 }, local: { first: 0, winner: 0 } })); }")  # you beat her last time; Player 1 won the last two-of-us game
    if wakec: pg.add_init_script("""(() => { const log = []; window.__wakeLog = log; Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request(kind) { const ls = []; const s = { released: false, type: kind, addEventListener: (e, f) => { if (e === 'release') ls.push(f); }, release() { if (!s.released) { s.released = true; log.push('release'); ls.forEach((f) => f()); } return Promise.resolve(); } }; log.push('request:' + kind); return Promise.resolve(s); } } }); })()""")
    if explain: pg.add_init_script("localStorage.setItem('ayo.tutorial', '3')")  # past the first-game tips, so the picture shows the words alone
    if take: pg.add_init_script("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.level', 'hard')")  # across the board from Mama Ngozi herself, so she says her word
    pg.goto("http://127.0.0.1:8766/web/index.html" + ("?capture=1&stay=home&lesson=1" if lessonc else "?capture=1&puzzle=1" if puzzle else "?capture=1" if smoke else "?capture=1&stay=home" if home or winc or record or local or masterc or last8 or racec or startsc or feedc or circ or givesc or slamc else "?still=1") + ("&lite=1" if lite else "&lite=0" if full else "") + ("&physics=0" if nophysics else "") + ("&try=review" if reviewc else ""), wait_until="load")
    pg.wait_for_function("window.__done===true", timeout=180000)
    q = pg.evaluate("window.__ayo.quality"); print("quality:", json.dumps(q))
    assert q["physics"] == (False if nophysics else not q["lite"]), "the seed-physics setting did not take (auto follows the lighter board)"
    if winc:
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        k0 = pg.evaluate("window.__ayo.win.lamp"); assert k0, "the lamp is there to warm"
        tap(pg, end["pit"])
        pg.wait_for_function("window.__ayo.win.hops >= 6", timeout=240000, polling=20)
        assert pg.evaluate("document.querySelector('#gameover').hidden"), "the card waits for the wave"
        assert pg.evaluate("window.__ayo.state.over && window.__ayo.state.winner === 0 && window.__ayo.win.last === 'win'"), pg.evaluate("window.__ayo.win")
        assert pg.evaluate("document.querySelector('#myScore').classList.contains('glint')"), "your score glints"
        pg.screenshot(path=out, timeout=120000)
        pg.wait_for_selector("#gameover:not([hidden])", timeout=15000)
        w = pg.evaluate("window.__ayo.win"); n = pg.evaluate("window.__ayo.state.stores[0]")
        assert w["waves"] == 1 and w["hops"] == n, ("every seed in your trough jumped once", w, n)
        assert (w["peak"] > 1.02 or w["samples"] < 3) and abs(w["lamp"] - k0) < 1e-6, ("the lamp warmed and came back", w, k0)
        assert pg.evaluate("window.__ayo.state.stores") == end["scores"], "the game ended as the engine said"
        print("win: %d seeds jumped, lamp up to x%.2f, then the card" % (w["hops"], w["peak"]))
        if dealc:
            d0 = pg.evaluate("window.__ayo.deal")
            pg.evaluate("window.__dealPace = 8"); pg.click("#rematch")  # slowed for the picture: a software-rendered page draws a frame or two a second
            pg.wait_for_function("window.__ayo.deal.live && window.__ayo.deal.flown >= 8", timeout=120000, polling=20)
            assert pg.evaluate("window.__ayo.state.moves.length") == 0 and pg.evaluate("window.__ayo.busy"), "her opening waits for the board to be set"
            assert pg.evaluate("document.querySelector('#gameover').hidden"), "the card goes as the deal starts"
            assert pg.evaluate("window.__ayo.deal.inAir") > 0, "seeds in the air"
            assert pg.evaluate("document.querySelector('#hint').textContent") in ("Setting up the board — four seeds to each pit", "click the board or press Space to hurry"), pg.evaluate("document.querySelector('#hint').textContent")
            assert pg.evaluate("document.querySelector('#oppSub').textContent") == "setting up…"
            mid = pg.evaluate("[+document.querySelector('#myScore').textContent, +document.querySelector('#oppScore').textContent]")
            assert sum(mid) < sum(end["scores"]), ("the troughs' numbers tick down as the seeds leave", mid)
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(200); pg.screenshot(path=out[:-4] + "-deal.png", timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.keyboard.press("Space")  # a key hurries the deal like a turn, and plays no pit
            pg.wait_for_function("!window.__ayo.deal.live", timeout=120000)
            d = pg.evaluate("window.__ayo.deal"); e = d["end"]  # the board as the deal left it (her opening may already be under way)
            assert d["deals"] == d0["deals"] + 1 and d["flown"] - d0["flown"] == 48, ("every seed dealt once", d0, d)
            assert e["pits"] == [4] * 12 and e["stores"] == [0, 0] and e["badges"] == [4] * 12 and e["scores"] == [0, 0] and e["moves"] == 0, e
            pg.wait_for_function("window.__ayo.state.moves.length >= 1", timeout=240000)  # the loser starts: Mama Ngozi opens once the board is set
            print("deal: 48 seeds dealt back four to a pit, then her opening")
    if record:
        pills = pg.evaluate("[...document.querySelectorAll('.pill[data-level]')].map(b=>[b.dataset.level, b.querySelector('small.rec').textContent])")
        assert pills == [["easy", "you lead 4–2"], ["steady", ""], ["medium", "you trail 1–3"], ["hard", "you lead 2–1"], ["master", ""]], pills
        rl = pg.evaluate("document.querySelector('#ratingLine').hidden ? null : document.querySelector('#ratingText').textContent"); assert rl == "Your rating 1180 · +12 last game", rl
        assert pg.evaluate("document.querySelector('.pill[data-level=steady] .face svg') !== null"), "Auntie Bisi's face on her pill"
        W = pg.evaluate("document.documentElement.scrollWidth"); assert W <= pg.evaluate("innerWidth"), ("Home scrolls sideways", W)
        assert not pg.evaluate("document.querySelector('#continueBtn').disabled") and "moves in" in pg.evaluate("document.querySelector('#continueSub').textContent"), "the saved game should be there to continue"
        print("record: Home pills", pills)
        out2 = out[:-4] + "-home.png" if out.endswith(".png") else out + "-home.png"
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out2, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        st = pg.evaluate("window.__ayo.state"); assert len(st["moves"]) == len(end["moves"]) and st["turn"] == 0 and not st["over"], "the saved game did not come back as it was"
        assert pg.evaluate("window.__ayo.level") == "hard" and pg.evaluate("document.querySelector('#oppName').textContent") == "Mama Ngozi · Hard"
        tap(pg, end["pit"])  # the winning move: the game ends and the card comes up with the record
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.over", timeout=240000)
        pg.wait_for_selector("#gameover:not([hidden])", timeout=10000)
        assert pg.evaluate("window.__ayo.state.stores") == end["scores"], "the game did not end as the engine said it would"
        line = pg.evaluate("document.querySelector('#goRecLine').textContent"); say = pg.evaluate("document.querySelector('#goRecSay').textContent")
        assert line == "you lead 3–1 · new best win %d–%d" % tuple(end["scores"]), line
        assert say == "“Three in a row? Mama Ngozi is watching.”" and not pg.evaluate("document.querySelector('#goRecSay').hidden"), say
        assert pg.evaluate("document.querySelector('#goRecord').classList.contains('word') && document.querySelector('#goRecFace svg') !== null")
        assert pg.evaluate("document.querySelector('#bubble').textContent") == "Three in a row? Mama Ngozi is watching." and pg.evaluate("window.__ayo.mood") == "sulk", "she should say it, and sulk"
        kept = json.loads(pg.evaluate("localStorage.getItem('ayo.record')"))
        assert kept["hard"] == {"w": 3, "l": 1, "d": 0, "best": end["scores"], "run": 3} and kept["easy"] == before["easy"] and kept["last"] == saved["stats"]["started"], kept
        print("record: card says", line, say)
        # your rating: 1180 against Mama Ngozi (1600), a win at K 24 — the number ticks up to it on the card and Home says it
        want = round(1180 + 24 * (1 - 1 / (1 + 10 ** ((1600 - 1180) / 400))))
        assert not pg.evaluate("document.querySelector('#goRating').hidden"), "the rating shows on the card"
        pg.wait_for_function("document.querySelector('#goRatingNum').textContent === '%d'" % want, timeout=8000)
        ch = pg.evaluate("document.querySelector('#goRatingChange').textContent"); why = pg.evaluate("document.querySelector('#goRatingWhy').textContent")
        assert ch == "+%d" % (want - 1180) and why == "+%d for beating Mama Ngozi (1600)" % (want - 1180), (ch, why)
        kr = json.loads(pg.evaluate("localStorage.getItem('ayo.rating')")); assert kr == {"r": want, "n": 15, "last": saved["stats"]["started"], "change": want - 1180}, kr
        print("rating: 1180 →", want, "·", why)
        if not story:  # without ?try=review the review is there but locked behind Gold
            pg.wait_for_function("window.__ayo.review.done", timeout=120000); rv = pg.evaluate("window.__ayo.review")
            assert rv["locked"] and rv["card"].endswith("· in Gold"), rv["card"]
            pg.click("#goReview"); pg.wait_for_timeout(200); assert not pg.evaluate("window.__ayo.review.on") and not pg.evaluate("document.querySelector('#gameover').hidden"), "a locked review does not open"
            print("review: locked —", rv["card"])
            pg.wait_for_timeout(900); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300)
            pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.reload(wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
            assert pg.evaluate("window.__ayo.rating")["r"] == want, "the rating is kept over a reload"
            rl = pg.evaluate("document.querySelector('#ratingText').textContent"); assert rl == "Your rating %d · +%d last game" % (want, want - 1180), rl
            pg.click(".pill[data-level=steady]"); assert pg.evaluate("window.__ayo.level") == "steady" and "Auntie Bisi · Steady" in pg.evaluate("document.querySelector('#playSub').textContent")
            pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=60000)
            assert pg.evaluate("document.querySelector('#oppName').textContent") == "Auntie Bisi · Steady", pg.evaluate("document.querySelector('#oppName').textContent")
            if pg.evaluate("window.__ayo.state.turn") == 0: tap(pg, pg.evaluate("window.__ayo.legal")[0])
            pg.wait_for_function("window.__ayo.state.moves.length >= 2 && !window.__ayo.busy", timeout=60000)
            print("steady: Auntie Bisi chosen on Home, played and answered", pg.evaluate("window.__ayo.state.moves"))
        if reviewc:  # Mama Ngozi's review (Gold), opened with ?try=review: the moves she would change match node, then step through them
            pg.wait_for_function("window.__ayo.review.done", timeout=180000); rv = pg.evaluate("window.__ayo.review")
            js = "Promise.all([import('%s'), import('%s')]).then(([r, ai]) => { const moves = %s; const plan = r.reviewPlan(moves, 'ncho', {}, 0, 0); const items = r.reviewOf(plan, plan.map((e) => ai.rateMoves(e.before, 'hard'))); console.log(JSON.stringify({ total: plan.length, items: items.map((i) => ({ index: i.index, pit: i.pit, played: i.played, gap: i.take.gap, kind: i.take.kind })), card: r.summaryWords(items), first: items.length ? r.stepWords(items[0], 0, items.length) : null })); })" % (os.path.join(root, "web", "review.js"), os.path.join(root, "engine", "ai.js"), json.dumps(end["moves"] + [end["pit"]]))
            want = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js]).decode())
            assert rv["total"] == want["total"] and rv["items"] == want["items"], (rv, want)
            assert not rv["locked"] and rv["card"] == want["card"], (rv["card"], want["card"])
            print("review:", rv["card"], "of", rv["total"], "moves looked at")
            assert want["items"], "the scripted game should give her something to say"
            outc = out[:-4] + "-card.png" if out.endswith(".png") else out + "-card.png"
            pg.wait_for_timeout(1200); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=outc, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            stores = pg.evaluate("window.__ayo.state.stores")
            pg.click("#goReview"); pg.wait_for_function("window.__ayo.review.on && window.__ayo.review.playing", timeout=5000)
            assert pg.evaluate("document.querySelector('#gameover').hidden"), "the card steps aside for the review"
            assert pg.evaluate("window.__ayo.review.bar") == want["first"], (pg.evaluate("window.__ayo.review.bar"), want["first"])
            pg.wait_for_function("window.__ayo.review.hint.startsWith('Mama Ngozi: ') && window.__ayo.marks.steps.length > 0", timeout=20000)
            print("review: step 1 —", pg.evaluate("window.__ayo.review.hint"))
            pg.wait_for_function("!window.__ayo.review.playing", timeout=120000)
            # the board ends at the engine's position after her move
            js2 = "import('%s').then((e) => { const moves = %s; const it = %s; const before = e.replay(moves.slice(0, it.index), 'ncho', {}, 0); console.log(JSON.stringify(e.applyMove(before, it.pit).state.pits)); })" % (os.path.join(root, "engine", "ayo.js"), json.dumps(end["moves"] + [end["pit"]]), json.dumps(want["items"][0]))
            pits = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js2]).decode())
            badges = pg.evaluate("[...document.querySelectorAll('#badges .badge')].slice(0, 12).map((b) => +b.textContent.replace(/[^0-9]/g, '') || 0)")
            if len(badges) == 12: assert badges == pits, ("the board after her move", badges, pits)
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            if len(want["items"]) > 1:
                pg.click("#revNext"); pg.wait_for_function("window.__ayo.review.k === 1", timeout=5000); pg.wait_for_function("!window.__ayo.review.playing", timeout=120000)
                assert pg.evaluate("window.__ayo.review.bar").startswith("2 of %d · move %d" % (len(want["items"]), want["items"][1]["index"] + 1))
                print("review: step 2 played")
            pg.click("#revDone"); pg.wait_for_function("!window.__ayo.review.on && !document.querySelector('#gameover').hidden", timeout=10000)
            assert pg.evaluate("window.__ayo.state.stores") == stores and pg.evaluate("document.querySelector('#myScore').textContent") == str(stores[0]), "the board did not come back to the end of the game"
            W = pg.evaluate("document.documentElement.scrollWidth"); assert W <= pg.evaluate("innerWidth"), ("scrolls sideways", W)
            print("review: Done brings the card back, the game as it ended")
            b.close()
            if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
            srv.shutdown(); print("wrote", out); sys.exit(0)
        if story:
            pg.wait_for_timeout(2200)  # the line draws in, the marks pop
            js = "import('%s').then(async (m) => { const s = m.gameStory(%s, 'ncho', {}, 0); console.log(JSON.stringify({ words: m.storyWords(s, { me: 'You', them: 'Mama Ngozi' }), biggest: s.biggest })); })" % (os.path.join(root, "web", "story.js"), json.dumps(end["moves"] + [end["pit"]]))
            want = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js]).decode())
            got = pg.evaluate("window.__ayo.story"); assert got and not got["hidden"], "the story line is missing from the card"
            assert got["words"] == want["words"], (got["words"], want["words"]); assert got["biggest"] == want["biggest"], (got, want)
            assert pg.evaluate("document.querySelectorAll('#goStorySvg path').length") == 3 and pg.evaluate("document.querySelector('#goStorySvg .good') !== null"), "the line, its two areas and the winning mark"
            print("story:", got["words"])
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(500); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            stores = pg.evaluate("window.__ayo.state.stores")
            pg.click("#goStory"); pg.wait_for_function("window.__ayo.busy && document.querySelector('#gameover').hidden", timeout=5000)
            pg.wait_for_function("!window.__ayo.busy && !document.querySelector('#gameover').hidden", timeout=120000)
            assert pg.evaluate("window.__ayo.state.stores") == stores and pg.evaluate("document.querySelector('#myScore').textContent") == str(stores[0]), "the board did not come back to the end of the game"
            print("story: the biggest turn played and the card came back")
            b.close()
            if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
            srv.shutdown(); print("wrote", out); sys.exit(0)
        out3 = out[:-4] + "-steady.png" if out.endswith(".png") else out + "-steady.png"
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(500); pg.screenshot(path=out3, timeout=120000, animations="disabled")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out, out2, "and", out3); sys.exit(0)
    if startsc:
        sub = pg.evaluate("document.querySelector('#playSub').textContent"); assert sub == "vs Mama Ngozi · Hard · Mama Ngozi starts", sub
        pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
        assert pg.evaluate("document.querySelector('[data-set=starts] [data-v=loser]').getAttribute('aria-pressed')") == "true", "Loser is the default"
        pg.click("[data-set=starts] [data-v=you]"); assert pg.evaluate("localStorage.getItem('ayo.starts.pref')") == "you"
        pg.click("#settingsBack"); pg.wait_for_selector("#home:not([hidden])")
        sub = pg.evaluate("document.querySelector('#playSub').textContent"); assert sub == "vs Mama Ngozi · Hard", sub
        pg.click("#homeSettings"); pg.click("[data-set=starts] [data-v=loser]"); pg.click("#settingsBack"); pg.wait_for_selector("#home:not([hidden])")
        print("starts: Home says", pg.evaluate("document.querySelector('#playSub').textContent"), "· the setting goes both ways")
        pg.click("#playBtn")
        pg.wait_for_function("[...document.querySelectorAll('.toast')].some(t => t.textContent === 'Mama Ngozi starts — the loser goes first')", timeout=5000)
        pg.wait_for_function("window.__ayo.state.moves.length === 1 && !window.__ayo.busy", timeout=240000)
        st = pg.evaluate("window.__ayo.state"); assert st["first"] == 1 and st["moves"][0] >= 6 and st["turn"] == 0, st
        pg.wait_for_function("window.__ayo.explain !== null", timeout=10000)
        print("starts: she opened with pit", st["moves"][0], "·", pg.evaluate("window.__ayo.explain.words"))
        pg.wait_for_timeout(600); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        assert pg.evaluate("document.querySelector('#undo').disabled") or pg.evaluate("window.__ayo.state.moves.length") < 2, "her opening alone cannot be undone"
        tap(pg, pg.evaluate("window.__ayo.legal")[0])
        pg.wait_for_function("window.__ayo.state.moves.length === 3 && !window.__ayo.busy || window.__ayo.state.over", timeout=240000)
        pg.click("#undo"); pg.wait_for_function("window.__ayo.state.moves.length === 1 && !window.__ayo.busy", timeout=20000)
        st2 = pg.evaluate("window.__ayo.state"); assert st2["moves"] == st["moves"] and st2["turn"] == 0 and st2["pits"] == st["pits"], st2
        print("starts: Undo takes your move and her reply back, her opening stays")
        pg.click("#homeBtn"); pg.wait_for_selector("#home:not([hidden])")
        pg.click(".pill[data-mode=local]")
        sub = pg.evaluate("document.querySelector('#playSub').textContent"); assert sub == "Player 2 starts · on this phone", sub
        pg.click("#playBtn"); pg.wait_for_timeout(1500); pg.wait_for_function("!window.__ayo.deal.live", timeout=60000)  # the game left on the board is dealt back first
        st = pg.evaluate("window.__ayo.state"); assert st["turn"] == 1 and st["first"] == 1 and pg.evaluate("window.__ayo.seat") == 1, st
        assert pg.evaluate("document.querySelector('#meName').textContent") == "Player 2", pg.evaluate("document.querySelector('#meName').textContent")
        th = pg.evaluate("window.__ayo.theta"); assert abs(abs(th) % (2 * 3.14159265) - 3.14159265) < 0.05, th
        tap(pg, pg.evaluate("window.__ayo.legal")[0]); pg.wait_for_function("window.__ayo.state.moves.length === 1 && !window.__ayo.busy", timeout=240000)
        pg.wait_for_function("window.__ayo.seat === 0 && !window.__ayo.busy", timeout=20000)
        pg.click("#undo"); pg.wait_for_function("window.__ayo.state.moves.length === 0 && !window.__ayo.busy && window.__ayo.seat === 1", timeout=20000)
        assert pg.evaluate("window.__ayo.state.turn") == 1, "undoing Player 2's opening gives Player 2 the move again"
        print("starts: two of us — Player 2 starts, the board faces them, Undo of the opening gives it back to them")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if slamc:
        def shot(path):
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=path, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        marks = lambda: pg.evaluate("window.__ayo.marks")
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        assert pg.evaluate("window.__ayo.state.moves") == spos["moves"] and pg.evaluate("window.__ayo.state.variant") == "ayo", "the saved Ayo game did not come back"
        x, y = pg.evaluate("window.__ayo.pitAt(%d)" % spos["pit"]); pg.mouse.click(x, y)
        pg.wait_for_function("window.__ayo.marks.slams.length===%d" % len(spos["pits"]), timeout=20000)
        mk = marks(); assert sorted(mk["slams"]) == sorted(spos["pits"]) and mk["caps"] == [] and mk["gifts"] == [], (mk, spos)
        h = pg.evaluate("document.querySelector('#hint').textContent"); assert ("would take all %d they have · a grand slam takes nothing" % spos["n"]) in h, h
        pg.wait_for_timeout(400)
        toast = pg.evaluate("[...document.querySelectorAll('.toast')].map(t=>t.textContent).join('|')"); assert "In Ayo a move that would take every seed" in toast, toast
        print("slam: pit", spos["pit"], "· struck rings on", mk["slams"], "·", h)
        pg.wait_for_timeout(500); shot(out)
        pg.keyboard.press("Escape"); assert marks()["slams"] == [], "Esc clears the struck rings"
        pg.wait_for_timeout(4500)
        pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.marks.slams.length===%d" % len(spos["pits"]), timeout=20000); pg.wait_for_timeout(700)
        assert pg.evaluate("document.querySelectorAll('.toast.long').length") == 0, "the note is said once"
        before = pg.evaluate("window.__ayo.state.stores.slice()")
        pg.mouse.click(x, y)  # sow it
        pg.wait_for_function("window.__ayo.slam.n===1", timeout=240000); pg.wait_for_timeout(200)
        w = pg.evaluate("window.__ayo.slam.words"); assert w == "Grand slam: that was every seed they have, so nothing is taken", w
        shot(out[:-4] + "-sow.png")
        pg.wait_for_function("!window.__ayo.busy && (window.__ayo.state.turn === 0 || window.__ayo.state.over)", timeout=240000)
        mv = pg.evaluate("window.__ayo.state.moves"); assert mv[len(spos["moves"])] == spos["pit"]
        # the sower took nothing on that move (the stores before the reply are the stores after it, for seat 0)
        st = subprocess.check_output(["node", "-e", "import('%s').then(m=>{const s=m.replay(%s,'ayo');console.log(JSON.stringify(s.stores))})" % (os.path.join(root, "engine", "ayo.js"), json.dumps(spos["moves"] + [spos["pit"]]))]).decode()
        assert json.loads(st)[0] == before[0], (st, before)
        print("slam: sowed, the toast said it, nothing taken:", w)
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if givesc:
        def shot(path):
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=path, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        marks = lambda: pg.evaluate("window.__ayo.marks")
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        assert pg.evaluate("window.__ayo.state.moves") == gpos["moves"], "the saved game did not come back"
        assert pg.evaluate("localStorage.getItem('ayo.gives.told')") is None
        x, y = pg.evaluate("window.__ayo.pitAt(%d)" % gpos["pit"]); pg.mouse.click(x, y)
        pg.wait_for_function("window.__ayo.marks.gifts.length===%d" % len(gpos["gives"]), timeout=20000)
        mk = marks(); assert sorted(mk["caps"]) == sorted(gpos["takes"]) and sorted(mk["gifts"]) == sorted(gpos["gives"]), (mk, gpos)
        toast = pg.evaluate("[...document.querySelectorAll('.toast')].map(t=>t.textContent).join('|')"); assert "A pale ring: those seeds go to their trough" in toast, toast
        h = pg.evaluate("document.querySelector('#hint').textContent"); assert "gives 4" in h and "takes" in h, h
        print("gives: pit", gpos["pit"], "· copper on", mk["caps"], "· pale on", mk["gifts"], "·", h)
        pg.wait_for_timeout(700); shot(out)
        pg.keyboard.press("Escape"); assert marks()["gifts"] == [] and marks()["caps"] == [], "Esc clears the rings"
        pg.wait_for_timeout(4500)  # the note goes
        pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.marks.gifts.length===%d" % len(gpos["gives"]), timeout=20000); pg.wait_for_timeout(300)
        assert pg.evaluate("document.querySelectorAll('.toast.long').length") == 0, "the note is said once"
        pg.evaluate("window.__haulPause = 1"); pg.mouse.click(x, y)  # sow it: the first capture is their 4
        pg.wait_for_function("!!window.__handGo", timeout=240000)
        hc = pg.evaluate("[document.querySelector('.handc.haul').className, document.querySelector('.handc.haul').textContent, document.querySelector('.handc.haul').hidden]")
        assert "gift" in hc[0] and hc[1] == "+4" and not hc[2], hc
        print("gives: the hand carrying their 4 is pale:", hc)
        shot(out[:-4] + "-haul.png"); pg.evaluate("window.__haulPause = 0; window.__handGo(); window.__handGo = null")
        pg.wait_for_function("!window.__ayo.busy && (window.__ayo.state.turn === 0 || window.__ayo.state.over)", timeout=240000)
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if feedc:
        def shot(path):
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=path, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        st = pg.evaluate("window.__ayo.state"); assert st["moves"] == fpos["moves"] and st["turn"] == 0, "the saved game did not come back"
        pg.wait_for_timeout(900); F = pg.evaluate("window.__ayo.feed"); print("feed:", json.dumps(F))
        assert sorted(F["rings"]) == sorted(fpos["legal"]), ("the rings must sit on the pits the engine allows", F, fpos)
        assert sorted(F["barred"]) == sorted(fpos["barred"]), F
        names = sorted(str(p + 1) for p in fpos["legal"])
        assert F["hint"] == "They have no seeds — you must feed them: pits %s or %s" % tuple(names) if len(names) == 2 else F["hint"].startswith("They have no seeds — you must feed them: pits"), F["hint"]
        assert F["selected"] is None, "with more than one move nothing is picked for you"
        shot(out)
        x, y = pg.evaluate("window.__ayo.pitAt(%d)" % fpos["barred"][0]); pg.mouse.click(x, y); pg.wait_for_timeout(400)
        F2 = pg.evaluate("window.__ayo.feed"); assert F2["selected"] is None and pg.evaluate("window.__ayo.state.moves.length") == len(fpos["moves"]), "a barred pit plays nothing"
        assert F2["hint"].startswith("They have no seeds") or F2["hint"].startswith("pit %d doesn't reach them — they have no seeds: play pits" % (fpos["barred"][0] + 1)), F2["hint"]
        tap(pg, fpos["legal"][0]); pg.wait_for_function("window.__ayo.state.moves.length > %d" % len(fpos["moves"]), timeout=20000)
        pg.wait_for_function("!window.__ayo.busy && (window.__ayo.state.turn === 0 || window.__ayo.state.over)", timeout=240000)
        print("feed: played pit", fpos["legal"][0] + 1, "and the rings went:", pg.evaluate("window.__ayo.feed.rings"))
        # one move only: picked for you, its path showing
        pg.evaluate("sessionStorage.setItem('only', '1')"); pg.reload(wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        pg.wait_for_function("window.__ayo.feed.selected === %d" % opos["only"], timeout=10000); pg.wait_for_timeout(900)
        F = pg.evaluate("window.__ayo.feed"); print("feed: only —", F["hint"])
        assert F["hint"].startswith("They have no seeds — only pit %d reaches them" % (opos["only"] + 1)) or F["hint"].startswith("only pit %d reaches them · " % (opos["only"] + 1)) or F["hint"].startswith("the only pit that leaves them seeds · "), F["hint"]
        assert F["hint"].endswith(" to sow") or F["hint"].endswith("Enter to sow"), F["hint"]
        assert pg.evaluate("window.__ayo.marks.steps.length") > 0, "its path should show"
        shot(out[:-4] + "-only.png")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
        assert pg.evaluate("window.__ayo.feed.selected") is None, "Esc puts it back and it stays back"
        tap(pg, opos["only"]); pg.wait_for_function("window.__ayo.state.moves.length > %d" % len(opos["moves"]), timeout=20000)
        print("feed: the only move played")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if circ:
        def shot(path):
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=path, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        st = pg.evaluate("window.__ayo.state"); assert len(st["moves"]) == len(cpos["moves"]) and st["turn"] == 0 and st["quiet"] == 47, "the saved game did not come back"
        assert not pg.evaluate("window.__ayo.circling.on"), "no Circling line before 48 moves with no capture"
        tap(pg, cpos["pit"])
        pg.wait_for_function("window.__ayo.circling.ripples > 0", timeout=240000)
        C = pg.evaluate("window.__ayo.circling"); print("circling:", json.dumps(C))
        assert C["on"] and C["isNew"] and C["first"]["left"] == "12" and not C["calling"], C  # (on a quick machine his reply may already have ticked it)
        ka, kb = cpos["keeps"]; want = "moves with no capture and it ends · each keeps their side: " + ("you'd win %d–%d" % (ka, kb) if ka > kb else "you'd lose %d–%d" % (ka, kb) if ka < kb else "level %d–%d" % (ka, kb))
        assert C["first"]["words"] == want, (C["first"], want)
        bub = pg.evaluate("document.querySelector('#bubble').textContent")
        assert bub in ("We are just going round, cousin. Somebody chop.", "This one is a merry-go-round."), bub
        pg.wait_for_timeout(1200); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length === %d" % (len(cpos["moves"]) + 2) + " || window.__ayo.state.over", timeout=240000)
        pg.wait_for_function("!window.__ayo.busy", timeout=240000)
        st = pg.evaluate("window.__ayo.state"); C = pg.evaluate("window.__ayo.circling")
        on = not st["over"] and 48 <= st["quiet"] < 60
        assert C["on"] == on and (not on or C["left"] == str(60 - st["quiet"])), (st["quiet"], C)
        print("circling: after his reply", "on · %s left" % C["left"] if on else "off (a capture)")
        pg.evaluate("sessionStorage.setItem('call', '1')"); pg.reload(wait_until="load")
        pg.wait_for_function("window.__ayo && document.querySelector('#continueBtn') && !document.querySelector('#continueBtn').hidden", timeout=60000)
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        C = pg.evaluate("window.__ayo.circling"); assert C["on"] and C["left"] == "1" and C["calling"], C
        x, y = pg.evaluate("window.__ayo.pitAt(%d)" % kpos["pit"]); pg.mouse.click(x, y); pg.wait_for_timeout(500)
        h = pg.evaluate("document.querySelector('#hint').textContent"); print("circling: the last tap says", h)
        assert "no capture in 60 moves — each keeps their side" in h and "takes" not in h, h
        pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.state.over && !document.querySelector('#gameover').hidden", timeout=240000)
        e = pg.evaluate("window.__ayo.circling.eyebrow"); print("circling: card says", e)
        assert e.endswith("· no capture in 60 moves"), e
        assert pg.evaluate("window.__ayo.state.stores") == kpos["final"]
        pg.wait_for_timeout(900); shot(out[:-4] + "-called.png")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if last8:
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
        st = pg.evaluate("window.__ayo.state"); assert len(st["moves"]) == len(pos["moves"]) and st["turn"] == 0, "the saved game did not come back"
        assert not pg.evaluate("window.__ayo.last8.on"), "no Last 8 line before the board is down to 8"
        tap(pg, pos["pit"])
        pg.wait_for_function("window.__ayo.last8.hops > 0", timeout=240000)
        L = pg.evaluate("window.__ayo.last8"); print("last8:", json.dumps(L))
        assert L["on"] and L["isNew"], "the Last 8 line should come up"
        assert L["words"] == "%d seeds left · the next capture takes them all" % pos["left"], L["words"]
        pits = pg.evaluate("window.__ayo.state.pits"); assert sum(pits) == pos["left"] and L["lit"] == len([n for n in pits if n]), (pits, L)
        bub = pg.evaluate("document.querySelector('#bubble').textContent")
        assert bub in ("Last eight, cousin. Next chop takes everything.", "Small seeds left. Big stakes."), bub
        pg.wait_for_timeout(900); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length === %d" % (len(pos["moves"]) + 2) + " || window.__ayo.state.over", timeout=240000)
        pg.wait_for_function("!window.__ayo.busy", timeout=240000)
        st = pg.evaluate("window.__ayo.state"); L = pg.evaluate("window.__ayo.last8")
        assert L["on"] == (not st["over"] and 0 < sum(st["pits"]) <= 8), (st, L)
        assert L["hops"] == pg.evaluate("window.__ayo.last8.hops"), "the moment is once a game"
        if L["on"] and st["turn"] == 0:  # a first tap names a sweep when the move makes one
            for m in pg.evaluate("window.__ayo.legal"):
                x, y = pg.evaluate("window.__ayo.pitAt(%d)" % m); pg.mouse.click(x, y); pg.wait_for_timeout(250)
                ps = pg.evaluate("window.__ayo.path"); h = pg.evaluate("document.querySelector('#hint').textContent")
                if ps and ps.get("sweep"): assert "the last %d go to" % ps["sweep"]["n"] in h, h; print("last8: tap says", h)
                pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
        print("last8: after their reply the line is", "on" if L["on"] else "off", "·", L["words"])
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if racec:  # the race to 25: "N to win" under each score once close, counting down with the score, brass from 3
        def rc(): return pg.evaluate("window.__ayo.race")
        def words(n): return "captured" if n is None else "%d to win" % n
        def need(a, b): n = 25 - a; return n if 1 <= n <= 10 and 48 - b >= 25 else None
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000); pg.wait_for_timeout(300)
        st = pg.evaluate("window.__ayo.state"); r = rc(); print("race: before", r["my"], "/", r["opp"], st["stores"])
        assert r["my"] == words(rpos["before"]) and r["opp"] == words(rpos["theirs"]), (r, rpos)
        assert not r["myClose"], r
        tap(pg, rpos["pit"])
        pg.wait_for_function("window.__ayo.race.myClose", timeout=240000)  # it turns brass as the score ticks into the last 3
        pg.wait_for_function("window.__ayo.race.my === %s" % json.dumps(words(rpos["after"])), timeout=240000)
        log = rc()["log"]; mine = [w for k, w in log if k == "mine"]
        seq = [words(n) for n in range(rpos["before"], rpos["after"] - 1, -1)]
        assert mine[-len(seq):] == seq, ("counted down seed by seed with the score", log, seq)
        pg.wait_for_timeout(900); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.wait_for_function("!window.__ayo.busy && (window.__ayo.state.turn === 0 || window.__ayo.state.over)", timeout=240000); pg.wait_for_timeout(500)
        st = pg.evaluate("window.__ayo.state"); r = rc(); sa, sb = st["stores"]
        if not st["over"]: assert r["my"] == words(need(sa, sb)) and r["opp"] == words(need(sb, sa)), ("after their reply it matches the scores", r, st["stores"])
        print("race: after their reply", r["my"], "/", r["opp"], st["stores"])
        pg.click("#settingsBtn"); pg.wait_for_selector("#settings:not([hidden])"); pg.click("[data-set=lang] [data-v=fr]"); pg.click("#settingsBack"); pg.wait_for_timeout(400)
        fr = pg.evaluate("document.querySelector('#myLab').textContent"); print("race: in French", fr)
        assert fr in ("pris", words(need(sa, sb)).replace(" to win", " pour gagner")), fr
        pg.click("#settingsBtn"); pg.click("[data-set=lang] [data-v=auto]"); pg.click("#settingsBack")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if puzzle:  # today's puzzle on the board: the ask at the top, one move, the result card
        pz = pg.evaluate("window.__ayo.puzzle"); print("puzzle:", json.dumps({k: pz[k] for k in ("key", "target", "answer")}))
        assert pz["on"] and not pz["played"], "the puzzle screen should be up and waiting"
        assert not pg.evaluate("document.querySelector('#puzzle').hidden") and pg.evaluate("document.body.classList.contains('puzzle')")
        assert pg.evaluate("document.querySelector('#pzAsk').textContent") == "Capture %d in one turn" % pz["target"]
        assert pg.evaluate("document.querySelector('#pzCard').hidden"), "no result card before a move"
        assert pg.evaluate("getComputedStyle(document.querySelector('.hud.top')).opacity") == "0", "the HUD steps aside for the puzzle"
        assert pg.evaluate("document.querySelector('#hint').textContent") in ("tap a pit on your side", "click a pit on your side, or press 1–6"), pg.evaluate("document.querySelector('#hint').textContent")  # the keys are offered where a mouse is
        wrong = min(pg.evaluate("window.__ayo.legal"), key=lambda p: pg.evaluate("window.__ayo.tryPit(%d)" % p))  # the weakest move
        tap(pg, wrong)  # a miss first: the card says how short, Try again puts the position back
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000)
        pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
        got = pg.evaluate("window.__ayo.puzzle.got"); badge = pg.evaluate("document.querySelector('#pzBadge').textContent"); print("puzzle: wrong pit", wrong, "captured", got, "->", badge)
        assert pg.evaluate("document.querySelector('#pzGot').textContent") == str(got)
        assert pg.evaluate("window.__ayo.puzzle.daily.days[window.__ayo.puzzle.key + ':ncho'].tries") == 1
        assert pg.evaluate("document.querySelector('#pzShow').hidden"), "Show me waits for a second miss"
        pg.click("#pzAgain"); pg.wait_for_function("!window.__ayo.puzzle.played", timeout=5000)
        assert pg.evaluate("document.querySelector('#pzCard').hidden"), "Try again should hide the card"
        assert pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>+b.textContent).reduce((a,b)=>a+b,0)") == 48 - sum(pg.evaluate("window.__ayo.state.stores")), "the position was not put back"
        if got < pz["target"]:  # a second miss: Mama Ngozi offers to show the move; it plays through, shown but not scored
            tap(pg, wrong); pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000); pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
            assert not pg.evaluate("document.querySelector('#pzShow').hidden"), "Show me should be offered after two misses"
            pg.click("#pzShow"); pg.wait_for_function("window.__ayo.busy", timeout=5000); pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000)
            pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
            assert pg.evaluate("document.querySelector('#pzBadge').textContent") == "Shown" and pg.evaluate("document.querySelector('#pzAgain').textContent") == "Now you"
            assert pg.evaluate("document.querySelector('#pzShow').hidden"), "shown once"; assert pg.evaluate("document.querySelector('#pzEyebrow').textContent") == "Mama Ngozi's move captures"
            assert pg.evaluate("document.querySelector('#pzGot').textContent") == str(pz["target"]) and pg.evaluate("document.querySelector('#pzBest').textContent") == "%d of %d" % (got, pz["target"]), "a shown move must not become your score"
            assert pg.evaluate("window.__ayo.puzzle.daily.days[window.__ayo.puzzle.key + ':ncho'].shown") is True
            print("puzzle: shown the move; best still", pg.evaluate("document.querySelector('#pzBest').textContent"))
            out3 = out[:-4] + "-shown.png" if out.endswith(".png") else out + "-shown.png"
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out3, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.click("#pzAgain"); pg.wait_for_function("!window.__ayo.puzzle.played", timeout=5000)
        tap(pg, pz["answer"])  # the answer: the target captured, the card says Solved
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000)
        pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
        assert pg.evaluate("window.__ayo.puzzle.got") >= pz["target"], "the answer should capture the target"
        assert pg.evaluate("document.querySelector('#pzBadge').textContent") == "Solved"
        assert pg.evaluate("document.querySelectorAll('#pzRow span').length") == min(max(pz["target"], pg.evaluate("window.__ayo.puzzle.got")), 16)
        assert pg.evaluate("document.querySelector('#pzRun').textContent") == "1 day", pg.evaluate("document.querySelector('#pzRun').textContent")
        print("puzzle: solved", pg.evaluate("document.querySelector('#pzGot').textContent"), "/", pz["target"], "best", pg.evaluate("document.querySelector('#pzBest').textContent"))
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        pg.click("#pzHome"); pg.wait_for_selector("#home:not([hidden])", timeout=5000)
        assert not pg.evaluate("window.__ayo.puzzle.on") and pg.evaluate("document.querySelector('#puzzleState').textContent") == "solved ✓", pg.evaluate("document.querySelector('#puzzleState').textContent")
        assert pg.evaluate("document.querySelector('#puzzleAsk').textContent") == "Capture %d in one turn" % pz["target"]
        out2 = out[:-4] + "-home.png" if out.endswith(".png") else out + "-home.png"
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out2, timeout=120000, animations="disabled")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out, "and", out2); sys.exit(0)
    if lessonc:  # the first game's lesson on a new phone
        LS = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", "import { STEPS, stateAt } from './web/lesson.js'; import { applyMove } from './engine/ayo.js'; console.log(JSON.stringify(STEPS.map((s, k) => ({ ...s, before: stateAt(k), end: applyMove(stateAt(k), s.pit).state }))))"]).decode())
        assert pg.evaluate("window.__ayo.level") == "easy" and "Adaeze" in pg.evaluate("document.querySelector('#playSub').textContent"), ("a new phone starts against Adaeze", pg.evaluate("document.querySelector('#playSub').textContent"))
        pg.click("#playBtn"); pg.wait_for_function("window.__ayo.lesson.on && window.__ayo.lesson.phase==='ask' && window.__ayo.selected===%d" % LS[0]["pit"], timeout=20000)
        def pt(i): return pg.evaluate("window.__ayo.pitAt(%d)" % i)
        def lshot(path): pg.wait_for_timeout(900); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=path, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        for k, st in enumerate(LS):
            pg.wait_for_function("window.__ayo.lesson.k===%d && window.__ayo.lesson.phase==='ask' && window.__ayo.selected===%d && !window.__ayo.busy" % (k, st["pit"]), timeout=60000)
            L = pg.evaluate("window.__ayo.lesson"); assert L["title"] == st["title"] and L["top"] == st["ask"] and L["skip"] == "Skip the lesson", L
            assert pg.evaluate("window.__ayo.state.pits") == st["before"]["pits"] and pg.evaluate("window.__ayo.state.stores") == st["before"]["stores"], ("step %d: the board is the lesson's position" % (k + 1))
            assert len(pg.evaluate("window.__ayo.marks.steps")) > 0, "the lit pit's path marks land"
            if st["kind"] == "capture": assert len(pg.evaluate("window.__ayo.marks.caps")) == 1, "the copper ring on their pit of 3"
            if k == 1: pg.mouse.move(5, 5); lshot(out)
            other = next(i for i in range(6) if i != st["pit"] and st["before"]["pits"][i] > 0)
            x, y = pt(other); pg.mouse.click(x, y); pg.wait_for_timeout(400)
            assert pg.evaluate("window.__ayo.lesson.phase") == "ask" and pg.evaluate("window.__ayo.state.pits") == st["before"]["pits"] and pg.evaluate("document.querySelector('#hint').textContent") == "In the lesson, play the lit pit", "another pit plays nothing"
            pg.wait_for_timeout(400)
            x, y = pt(st["pit"]); pg.mouse.click(x, y)
            if pg.evaluate("window.__ayo.selected") == st["pit"] and pg.evaluate("window.__ayo.lesson.phase") == "ask": pg.mouse.click(x, y)  # the shake took the pick away: pick, then sow
            pg.wait_for_function("window.__ayo.lesson.phase==='after' && !window.__ayo.busy", timeout=120000)
            L = pg.evaluate("window.__ayo.lesson"); assert L["card"] == st["after"], L
            assert pg.evaluate("window.__ayo.state.pits") == st["end"]["pits"] and pg.evaluate("window.__ayo.state.stores") == st["end"]["stores"], "the move ends as the engine says"
            assert pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>+b.textContent)") == st["end"]["pits"] if pg.evaluate("document.querySelectorAll('.badge').length") == 12 else True
            if k == 1: pg.mouse.move(5, 5); lshot(out[:-4] + "-after.png")
            print("lesson: step %d %s ok · %s" % (k + 1, st["kind"], L["next"]))
            pg.click("#lsNext")
        pg.wait_for_function("window.__ayo.lesson.phase==='done'", timeout=20000)
        L = pg.evaluate("window.__ayo.lesson"); assert L["next"] == "Play Adaeze" and L["kept"] == "done" and L["tutorial"] == "3" and L["skip"] == "Back to home", L
        lshot(out[:-4] + "-done.png")
        pg.click("#lsNext"); pg.wait_for_function("!window.__ayo.lesson.on && document.body.classList.contains('playing') && !document.body.classList.contains('puzzle')", timeout=20000)
        st = pg.evaluate("window.__ayo.state"); assert st["pits"] == [4] * 12 or len(st["moves"]) <= 1, st
        assert pg.evaluate("window.__ayo.level") == "easy" and pg.evaluate("localStorage.getItem('ayo.level')") == "easy" and "Adaeze" in pg.evaluate("document.querySelector('#oppName').textContent")
        pg.wait_for_function("!window.__ayo.busy", timeout=60000); pg.click("#settingsBtn"); pg.wait_for_selector("#settings:not([hidden])"); pg.click("#lessonBtn")
        pg.wait_for_function("window.__ayo.lesson.on && window.__ayo.lesson.phase==='ask'", timeout=20000); pg.click("#pzHome")
        pg.wait_for_selector("#home:not([hidden])", timeout=10000); assert not pg.evaluate("window.__ayo.lesson.on") and pg.evaluate("localStorage.getItem('ayo.lesson')") == "done"
        pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden", timeout=20000); assert not pg.evaluate("window.__ayo.lesson.on"), "once: Play is a game now"
        print("lesson: done, the game against Adaeze, Settings → Learn to play and Skip, Play once more is a game")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if local:  # two of us on one phone: no computer, the near seat passes after every move and the board turns to face it
        pg.click('.pill[data-mode="local"]'); pg.wait_for_function("document.querySelector('#playSub').textContent==='Two of us · pass the phone'", timeout=5000)
        assert pg.evaluate("document.querySelector('.pill[data-mode=\"local\"]').getAttribute('aria-pressed')") == "true" and pg.evaluate("[...document.querySelectorAll('.pill[data-level]')].every(b=>b.getAttribute('aria-pressed')==='false')"), "the pill should be the one chosen"
        pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy && window.__ayo.local && window.__ayo.seat===0", timeout=20000)
        def settled():  # the camera at rest: the swing from Home's slow turn (a tween) is over
            pg.wait_for_function("window.__ayo.tweens===0 && !window.__ayo.busy", timeout=20000); return pg.evaluate("window.__ayo.theta")
        th0 = settled(); assert abs(((th0 % (2 * 3.141592653589793)) + 2 * 3.141592653589793) % (2 * 3.141592653589793)) < 0.05, th0
        assert pg.evaluate("document.querySelector('#meName').textContent") == "Player 1" and pg.evaluate("document.querySelector('#oppName').textContent") == "Player 2", "the near card is Player 1, the far one Player 2"
        assert pg.evaluate("document.querySelector('#oppSub').textContent") == "waiting" and pg.evaluate("document.querySelector('#turn').textContent") == "your move"
        tap(pg, 2)  # Player 1 plays: the board turns half a turn to face Player 2
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.seat===1 && window.__ayo.state.moves.length===1 && document.querySelector('#turn').textContent==='your move'", timeout=240000)
        th1 = pg.evaluate("window.__ayo.theta"); assert abs(th1 - th0 - 3.141592653589793) < 0.05, (th0, th1)
        assert pg.evaluate("document.querySelector('#meName').textContent") == "Player 2" and pg.evaluate("document.querySelector('#oppName').textContent") == "Player 1"
        assert pg.evaluate("document.querySelector('#oppSub').textContent") == "waiting" and pg.evaluate("document.querySelector('#bubble').hidden"), "nobody speaks for a computer that is not playing"
        ex = pg.evaluate("window.__ayo.explain"); assert ex and ex["name"] == "Player 1" and ex["moves"] == 0, ex  # Player 1's move, explained for Player 2
        assert pg.evaluate("document.querySelector('#lastName').textContent") == "Player 1" and not pg.evaluate("document.querySelector('#lastMove').hidden")
        assert not pg.evaluate("document.querySelector('#undo').disabled"), "one move back is allowed"
        legal = pg.evaluate("window.__ayo.legal"); assert legal and all(6 <= p <= 11 for p in legal), legal  # Player 2's pits
        print("local: Player 1 played pit 2 · board turned", round(th0, 2), "→", round(th1, 2), "· explained:", pg.evaluate("document.querySelector('#lastWords').textContent"))
        pg.wait_for_timeout(600); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
        tap(pg, max(legal))  # Player 2 plays: on it turns, to Player 1
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.seat===0 && window.__ayo.state.moves.length===2 && document.querySelector('#turn').textContent==='your move'", timeout=240000)
        th2 = pg.evaluate("window.__ayo.theta"); assert abs(th2 - th1 - 3.141592653589793) < 0.05, (th1, th2)
        assert pg.evaluate("document.querySelector('#meName').textContent") == "Player 1" and pg.evaluate("window.__ayo.explain")["name"] == "Player 2"
        pg.click("#undo")  # one move back: Player 2 has it again and the board turns to them
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.seat===1 && window.__ayo.state.moves.length===1", timeout=20000)
        th3 = pg.evaluate("window.__ayo.theta"); assert abs(th3 - th2 - 3.141592653589793) < 0.05, (th2, th3)
        assert pg.evaluate("document.querySelector('#meName').textContent") == "Player 2" and pg.evaluate("window.__ayo.explain") is None
        print("local: Player 2 played, Undo gave it back; board at", round(th3, 2))
        pg.click("#homeBtn"); pg.wait_for_selector("#home:not([hidden])", timeout=5000)
        cont = pg.evaluate("document.querySelector('#continueSub').textContent"); assert cont.startswith("Two of us · ") and cont.endswith("· 1 moves in"), cont
        assert json.loads(pg.evaluate("localStorage.getItem('ayo.game')"))["local"] is True
        pg.evaluate("localStorage.setItem('ayo.swing','0')")  # the phone lies flat: the seat still passes, the board stays
        pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy && window.__ayo.seat===1", timeout=20000)
        th4 = settled(); tap(pg, max(pg.evaluate("window.__ayo.legal")))
        pg.wait_for_function("!window.__ayo.busy && window.__ayo.seat===0 && window.__ayo.state.moves.length===2", timeout=240000)
        th5 = pg.evaluate("window.__ayo.theta"); assert abs(th5 - th4) < 0.05, ("with Pass the phone off the board must not turn", th4, th5)
        assert pg.evaluate("document.querySelector('#meName').textContent") == "Player 1"
        pg.evaluate("localStorage.setItem('ayo.swing','1')")
        print("local: Pass the phone off → seat passed, board stayed ·", cont)
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out); sys.exit(0)
    if masterc:  # Papa Ike: locked behind Gold on Home, then opened for one visit with ?try=master and played
        pg.evaluate("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done')")
        lk = pg.evaluate("document.querySelector('.pill[data-level=master]').classList.contains('locked')"); assert lk, "Master should be locked without Gold"
        assert pg.evaluate("getComputedStyle(document.querySelector('.pill[data-level=master] .gold svg')).display") != "none", "the Gold lock shows"
        W = pg.evaluate("document.documentElement.scrollWidth"); assert W <= pg.evaluate("innerWidth"), ("Home scrolls sideways", W)
        pg.screenshot(path=out[:-4] + "-home.png", timeout=120000, animations="disabled")
        was = pg.evaluate("window.__ayo.level"); pg.click(".pill[data-level=master]"); pg.wait_for_timeout(300)
        t = pg.evaluate("[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' | ')"); assert "Gold" in t and "in the app" in t, t
        assert pg.evaluate("window.__ayo.level") == was, "a locked Master is not chosen"
        print("master: locked ·", t)
        pg.goto("http://127.0.0.1:8766/web/index.html?capture=1&stay=home&try=master", wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
        assert not pg.evaluate("document.querySelector('.pill[data-level=master]').classList.contains('locked')"), "?try=master opens him"
        pg.click(".pill[data-level=master]"); assert pg.evaluate("window.__ayo.level") == "master"
        assert "Papa Ike" in pg.evaluate("document.querySelector('#playSub').textContent")
        pg.click("#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy && window.__ayo.state.turn === 0", timeout=60000)
        assert pg.evaluate("document.querySelector('#oppName').textContent") == "Papa Ike · Master", pg.evaluate("document.querySelector('#oppName').textContent")
        t0 = time.time(); tap(pg, pg.evaluate("window.__ayo.legal")[0])
        pg.wait_for_function("window.__ayo.state.moves.length >= 2 && !window.__ayo.busy && window.__ayo.state.turn === 0 || window.__ayo.state.over", timeout=240000)
        print("master: move and reply in %.1f s" % (time.time() - t0), pg.evaluate("window.__ayo.state.moves"))
        pg.wait_for_timeout(600); pg.screenshot(path=out, timeout=120000, animations="disabled")
    if smoke:
        before = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        if take:  # the weakest opening move by the hard search's own rating, so her take is sure to come
            rated = pg.evaluate("window.__ayo.rate()"); worst = rated[-1]["pit"]; gap = rated[0]["value"] - rated[-1]["value"]
            assert len(rated) == 6 and gap >= 3, ("the opening should have a clearly weaker pit", rated)
            assert pg.evaluate("document.querySelector('#oppName').textContent") == "Mama Ngozi · Hard"
            print("take: opening rated", [(r["pit"], round(r["value"], 1)) for r in rated], "· playing the weakest, pit", worst)
            tap(pg, worst)
        elif handc:  # the hand counts: sow the biggest opening pit and read the number over the hand as the turn plays
            pg.evaluate("localStorage.setItem('ayo.tutorial', '3')")
            best = max(pg.evaluate("window.__ayo.legal"), key=lambda i: pg.evaluate("window.__ayo.state.pits[%d]" % i))
            first = pg.evaluate("window.__ayo.state.pits[%d]" % best)
            pg.evaluate("window.__handPause = %d" % (first - 2))  # stop the hand with two seeds sown, for the picture
            tap(pg, best)
            try: pg.wait_for_function("!!window.__handGo", timeout=60000)
            except Exception: print("hand: stuck", pg.evaluate("[window.__handPause, window.__ayo.handLog, window.__ayo.state.moves, window.__ayo.selected]")); raise
            pg.wait_for_timeout(500)
            h = pg.evaluate("window.__ayo.hand"); assert h["sow"] == str(first - 2), ("the number is the seeds still in the hand", h, first)
            a = h["at"]; W = pg.evaluate("innerWidth"); assert 0 < a["x"] < W, ("the number sits over the board", a)
            pg.screenshot(path=out, timeout=120000, animations="disabled")
            pg.evaluate("window.__haulPause = 1; window.__handGo(); window.__handGo = null")
            pg.wait_for_function("!!window.__handGo || (!window.__ayo.hurry.playing && window.__ayo.state.turn === 0)", timeout=240000)
            if pg.evaluate("!!window.__handGo"):  # a capture: the copper number over the hand that sweeps it up
                pg.wait_for_timeout(500); h = pg.evaluate("window.__ayo.hand"); assert h["haul"] and h["haul"].startswith("+"), h
                pg.screenshot(path=out.replace(".png", "-haul.png"), timeout=120000, animations="disabled"); pg.evaluate("window.__haulPause = 0; window.__handGo(); window.__handGo = null")
            pg.evaluate("window.__haulPause = 0")
            pg.wait_for_function("!window.__ayo.hurry.playing && window.__ayo.state.turn === 0 || window.__ayo.state.over", timeout=240000)
            log = pg.evaluate("window.__ayo.handLog"); print("hand: log", log[:70])
            sows = [x for x in log if x.startswith("sow:") and x != "sow:-"]
            assert sows[0] == "sow:%d" % first, ("the number starts at the seeds picked up", sows[0], first)
            hauls = [x for x in log if x.startswith("haul:+")]
            assert hauls or pg.evaluate("window.__ayo.state.stores[0]+window.__ayo.state.stores[1]") == 0, "a capture shows its copper number"
            h = pg.evaluate("window.__ayo.hand"); assert h["sow"] is None and h["haul"] is None, ("the numbers go when the turn ends", h)
        elif hurry:  # the opening with the most drops (a relay in Nchò), hurried by a tap partway through
            pg.evaluate("localStorage.setItem('ayo.tutorial', '3')")
            best = max(pg.evaluate("window.__ayo.legal"), key=lambda i: pg.evaluate("window.__ayo.state.pits[%d]" % i))
            tap(pg, best)
            pg.wait_for_function("window.__ayo.hurry.playing", timeout=20000)
            h = pg.evaluate("window.__ayo.hurry"); print("hurry: playing", json.dumps(h))
            assert h["words"] and h["hint"].endswith("to hurry") and not h["on"], h
            pg.wait_for_timeout(500)
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            t0 = time.time(); x, y = pg.evaluate("window.__ayo.pitAt(9)"); pg.mouse.click(x, y)  # a tap on the board (their side: no pit of yours is pressed)
            h = pg.evaluate("window.__ayo.hurry"); assert h["on"] and h["hint"].endswith("hurrying…"), h
            pg.wait_for_function("!window.__ayo.hurry.playing", timeout=60000); print("hurry: rest of the turn took %.1f s after the tap" % (time.time() - t0))
            st = pg.evaluate("window.__ayo.state"); counts = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>+b.textContent)")
            assert counts == st["pits"], ("the hurried turn must end as the engine says", counts, st["pits"])
            assert not pg.evaluate("window.__ayo.hurry.on"), "the hurry ends with the turn"
            if st["turn"] == 1 and not st["over"]:  # the reply comes at the normal speed; Space hurries it too
                pg.wait_for_function("window.__ayo.hurry.playing", timeout=120000)
                assert not pg.evaluate("window.__ayo.hurry.on"), "the next turn starts at the normal speed"
                pg.keyboard.press("Space"); assert pg.evaluate("window.__ayo.hurry.on"), "Space should hurry the reply"
                print("hurry: Space hurried the reply")
        else:
            # tap the player's pit 2 (third from the near end, right column): project its centre via the badge position
            box = pg.evaluate("(()=>{const b=document.querySelectorAll('.badge')[2].getBoundingClientRect();return [b.left-20,b.top-20]})()")
            pg.mouse.click(box[0], box[1]); pg.wait_for_timeout(300); pg.mouse.click(box[0], box[1])
        pg.wait_for_function("document.querySelector('#turn').textContent==='your move' && !document.querySelector('#undo').disabled", timeout=240000)
        after = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        assert before != after, "board did not change"
        print("smoke: before", before, "after", after, "scores", pg.evaluate("[document.querySelector('#myScore').textContent, document.querySelector('#oppScore').textContent]"))
        assert pg.evaluate("getComputedStyle(document.querySelector('#shoutBtn')).display") == "none", "shouts are for friends online, not the computer"
        if keys:  # the keyboard: a digit lights a pit, Esc puts it back, the digit then Enter sows; the pits carry screen-reader labels; U undoes, H hints
            sel = lambda: pg.evaluate("window.__ayo.selected"); hint = lambda: pg.evaluate("document.querySelector('#hint').textContent")
            legal = pg.evaluate("window.__ayo.legal"); pit = max(legal); key = str(pit + 1); n = pg.evaluate("window.__ayo.state.pits[%d]" % pit)
            pg.keyboard.press("Escape"); assert sel() is None
            pg.keyboard.press("7"); assert sel() is None, "7 is no pit"
            pg.keyboard.press(key); assert sel() == pit, "key %s should pick pit %d (got %s)" % (key, pit, sel())
            assert hint().startswith("pit %s · " % key) and hint().endswith("— Enter to sow"), hint()  # the path's words sit between (see --path)
            labels = pg.evaluate("[...document.querySelectorAll('#pits button')].map(b=>[b.getAttribute('aria-label'), b.disabled])")
            assert len(labels) == 12 and labels[0][0].startswith("Your pit 1 (key 1) · ") and labels[6][0].startswith("Their pit 1 · "), labels
            assert labels[pit][0].endswith("· picked — Enter to sow") and not labels[pit][1], labels[pit]
            assert all(d for _, d in labels[6:]), "the other side's pits are not buttons to press"
            counts = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>+b.textContent)")
            for i in range(12): assert ("· %d seeds" % counts[i] if counts[i] > 1 else "· 1 seed" if counts[i] == 1 else "· empty") in labels[i][0], (i, counts[i], labels[i])
            assert pg.evaluate("document.body.classList.contains('keys') && [...document.querySelectorAll('.badge')].slice(0,6).every((b,i)=>b.dataset.key===String(i+1)) && [...document.querySelectorAll('.badge')].slice(6).every(b=>!b.dataset.key)"), "once a key is pressed your pits' badges should show their keys"
            print("keys: pit", pit, "picked by key", key, "·", hint(), "· label:", labels[pit][0])
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.keyboard.press("Escape"); assert sel() is None, "Esc should put the pit back"
            assert hint() == "click a pit on your side, or press 1–6", hint()
            pg.keyboard.press(key); pg.keyboard.press("Enter")  # sow it: the move plays, the opponent answers
            pg.wait_for_function("document.querySelector('#turn').textContent==='your move' && !window.__ayo.busy && window.__ayo.state.moves.length===4", timeout=240000)
            assert pg.evaluate("window.__ayo.state.moves[2]") == pit, "Enter did not sow the picked pit"
            pg.keyboard.press("u"); pg.wait_for_function("window.__ayo.state.moves.length===2 && !window.__ayo.busy", timeout=20000)
            print("keys: Enter sowed pit", pit, "· U undid it (moves back to 2)")
            pg.keyboard.press("h"); pg.wait_for_function("document.querySelector('#hintBtn').disabled && document.querySelector('#hint').textContent.includes('would play')", timeout=60000)
            hp = sel(); assert hp is not None and hint().startswith("Mama Ngozi would play pit ") and hint().endswith("— Enter to sow"), hint()  # H picks her pit; Enter would sow it
            print("keys: H picked her pit", hp, "·", hint())
        if path:  # where the seeds will go: one tap, and the marks land in sowing order
            sel = lambda: pg.evaluate("window.__ayo.selected"); hint = lambda: pg.evaluate("document.querySelector('#hint').textContent"); marks = lambda: pg.evaluate("window.__ayo.marks")
            legal = pg.evaluate("window.__ayo.legal")
            # pick the pit whose path touches the most pits, so the picture shows a relay turn where there is one
            best, bestN = legal[0], -1
            for m in legal:
                x, y = pg.evaluate("window.__ayo.pitAt(%d)" % m); pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.selected===%d" % m, timeout=5000)
                pth = pg.evaluate("window.__ayo.path"); assert pth and pth["pit"] == m, "no path for a legal pit"
                score = len(pth["order"]) + 4 * len(pth["captures"])  # a relay turn with a capture makes the best picture
                if score > bestN: best, bestN = m, score
                pg.keyboard.press("Escape"); assert sel() is None and marks() == {"steps": [], "caps": [], "gifts": [], "risk": [], "end": False}, "Esc should clear every mark"
            if os.environ.get("PATH_BEFORE"): pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=os.environ["PATH_BEFORE"], timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            x, y = pg.evaluate("window.__ayo.pitAt(%d)" % best); pg.mouse.click(x, y)
            pth = pg.evaluate("window.__ayo.path"); n = len(pth["order"])
            pg.wait_for_function("window.__ayo.marks.steps.length===%d && window.__ayo.marks.end===%s && (window.__ayo.marks.caps.length+window.__ayo.marks.gifts.length)===%d" % (n, "true" if pth["end"] is not None else "false", len(pth["captures"])), timeout=20000)
            mk = marks(); assert sorted(mk["steps"]) == sorted(pth["order"]) and sorted(mk["caps"] + mk["gifts"]) == sorted(pth["captures"]), (mk, pth)
            assert "ends in" in hint() and (hint().endswith("— Enter to sow") or hint().endswith("— tap again to sow")), hint()
            assert pg.evaluate("document.querySelector('.badge').textContent") != "", "badges still there"
            print("path: pit", best, "→", n, "pits, relays", len(pth["relays"]), "captures", pth["captures"], "ends", pth["end"], "·", hint())
            pg.wait_for_timeout(400); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.keyboard.press("Escape"); assert marks() == {"steps": [], "caps": [], "gifts": [], "risk": [], "end": False}
            # the setting off: a tap lights the pit as before, no marks, the old words
            pg.evaluate("localStorage.setItem('ayo.path','0')"); pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.selected===%d" % best, timeout=5000); pg.wait_for_timeout(600)
            assert marks() == {"steps": [], "caps": [], "gifts": [], "risk": [], "end": False} and pg.evaluate("window.__ayo.path") is None, "the setting off should show no marks"
            assert hint() in ("tap again to sow, or pick another",) or hint().endswith("— Enter to sow, or pick another"), hint()
            pg.evaluate("localStorage.setItem('ayo.path','1')"); pg.keyboard.press("Escape")
            print("path: setting off → no marks ·", hint())
        if hintc:  # a hint that teaches: Hint picks her pit, the marks land, the line says whose move it is; one more tap sows it
            hint = lambda: pg.evaluate("document.querySelector('#hint').textContent")
            at = pg.evaluate("window.__ayo.state.moves.length"); pg.click("#hintBtn")
            pg.wait_for_function("window.__ayo.selected!==null && document.querySelector('#hint').textContent.includes('would play')", timeout=60000)
            m = pg.evaluate("window.__ayo.selected"); pth = pg.evaluate("window.__ayo.path")
            assert m in pg.evaluate("window.__ayo.legal") and pth and pth["pit"] == m, (m, pth)
            pg.wait_for_function("window.__ayo.marks.steps.length===%d" % len(pth["order"]), timeout=20000)
            assert pg.evaluate("document.querySelector('#hintBtn').disabled"), "one hint a turn"
            h = hint(); assert h.startswith("Mama Ngozi would play") and (h.endswith("— tap again to sow") or h.endswith("— Enter to sow")), h
            print("hint: picked pit", m, "·", h)
            pg.wait_for_timeout(500); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            x, y = pg.evaluate("window.__ayo.pitAt(%d)" % m); pg.mouse.click(x, y)  # one more tap sows it
            pg.wait_for_function("window.__ayo.state.moves.length>%d" % at, timeout=20000)
            assert pg.evaluate("window.__ayo.state.moves[%d]" % at) == m, "the tap after a hint should sow the hinted pit"
            pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.turn===window.__ayo.seat", timeout=240000)
            assert not hint().startswith("Mama Ngozi would play"), hint()
            print("hint: one more tap sowed it; the next turn starts clean ·", hint())
        if answer:  # what it leaves open: after the path, ember rings on the pits their richest answer would take, and the words
            hint = lambda: pg.evaluate("document.querySelector('#hint').textContent")
            best, bestGot, seen = None, -1, 0
            for m in pg.evaluate("window.__ayo.legal"):
                x, y = pg.evaluate("window.__ayo.pitAt(%d)" % m); pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.selected===%d" % m, timeout=5000)
                a = pg.evaluate("window.__ayo.answer")
                if a and a["captures"]:
                    pg.wait_for_function("window.__ayo.marks.risk.length===%d" % len(a["captures"]), timeout=20000)
                    assert sorted(pg.evaluate("window.__ayo.marks.risk")) == sorted(a["captures"]), (pg.evaluate("window.__ayo.marks"), a)
                    assert ("then they can win" if a["wins"] else "then they can take %d" % a["got"]) in hint(), hint(); seen += 1
                    if a["got"] > bestGot: best, bestGot = m, a["got"]
                else:
                    pg.wait_for_timeout(900); assert pg.evaluate("window.__ayo.marks.risk") == [] and "then they can" not in hint(), hint()
                pg.keyboard.press("Escape"); assert pg.evaluate("window.__ayo.marks.risk") == []
            print("answer:", seen, "pits leave something open; the most is pit", best, "→", bestGot)
            if best is not None:
                x, y = pg.evaluate("window.__ayo.pitAt(%d)" % best); pg.mouse.click(x, y)
                pg.wait_for_function("window.__ayo.marks.risk.length>0", timeout=20000); print("answer:", hint())
                pg.wait_for_timeout(1500); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
                pg.keyboard.press("Escape")
                pg.evaluate("localStorage.setItem('ayo.answer','0')"); pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.selected===%d && window.__ayo.marks.steps.length>0" % best, timeout=20000); pg.wait_for_timeout(1200)
                assert pg.evaluate("window.__ayo.marks.risk") == [] and "then they can" not in hint(), hint()
                pg.evaluate("localStorage.setItem('ayo.answer','1')"); pg.keyboard.press("Escape"); print("answer: setting off → the path, no warning ·", hint())
        if explain:  # their move, explained: after the opponent's turn its marks stay faint with the words; tap the words and the turn replays slowly
            ex = pg.evaluate("window.__ayo.explain"); assert ex and ex["moves"] == 1 and ex["name"] == "Nnamdi", ex  # the opponent's reply to your first move
            assert not pg.evaluate("document.querySelector('#lastMove').hidden") and pg.evaluate("document.querySelector('#lastName').textContent") == "Nnamdi"
            words = pg.evaluate("document.querySelector('#lastWords').textContent"); assert words == ex["words"] and ("picked up again" in words or "took" in words or "gave" in words or words.startswith("ended in")), words
            landed = "window.__ayo.marks.steps.length===%d && (window.__ayo.marks.caps.length+window.__ayo.marks.gifts.length)===%d && window.__ayo.marks.end===%s" % (len(ex["order"]), len(ex["captures"]), "true" if ex["end"] is not None else "false")
            pg.wait_for_function(landed, timeout=20000)  # the ghost of their path: every pit their hand reached, the captures ringed, the light where it ended
            mk = pg.evaluate("window.__ayo.marks"); assert sorted(mk["steps"]) == sorted(ex["order"]) and sorted(mk["caps"] + mk["gifts"]) == sorted(ex["captures"]) and mk["end"] == (ex["end"] is not None), (mk, ex)
            print("explain:", ex["name"], "·", words, "· ghost marks on", len(mk["steps"]), "pits, captures", ex["captures"])
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.wait_for_function("window.__ayo.marks.steps.length===0", timeout=30000)  # they fade by themselves
            assert not pg.evaluate("document.querySelector('#lastMove').hidden"), "the words stay until your move"
            moves = pg.evaluate("window.__ayo.state.moves.length"); badges = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
            pg.click("#lastMove"); pg.wait_for_function("window.__ayo.replaying && window.__ayo.busy", timeout=5000)  # the position before their move comes back, the marks land, the seeds follow slowly
            assert pg.evaluate("document.querySelector('#turn').textContent") == "watching" and pg.evaluate("document.querySelector('#hint').textContent") == "Nnamdi's move again, slowly", pg.evaluate("document.querySelector('#hint').textContent")
            pg.wait_for_function(landed, timeout=20000)
            out2 = out[:-4] + "-again.png" if out.endswith(".png") else out + "-again.png"
            pg.wait_for_timeout(900); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out2, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.wait_for_function("!window.__ayo.replaying && !window.__ayo.busy", timeout=240000)
            assert pg.evaluate("window.__ayo.state.moves.length") == moves and pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')") == badges, "the replay must leave the game as it was"
            assert pg.evaluate("document.querySelector('#turn').textContent") == "your move" and not pg.evaluate("document.querySelector('#undo').disabled")
            print("explain: watched it again; the board is as it was")
            pg.evaluate("localStorage.setItem('ayo.path','0')"); tap(pg, max(pg.evaluate("window.__ayo.legal")))  # the setting off: their next move explains nothing
            pg.wait_for_function("document.querySelector('#turn').textContent==='your move' && !window.__ayo.busy && window.__ayo.state.moves.length===%d" % (moves + 2), timeout=240000)
            assert pg.evaluate("document.querySelector('#lastMove').hidden") and pg.evaluate("window.__ayo.explain") is None and pg.evaluate("window.__ayo.marks.steps.length") == 0, "with the setting off nothing should be explained"
            pg.evaluate("localStorage.setItem('ayo.path','1')")
            print("explain: setting off → no words, no marks")
        if take:  # Mama Ngozi's take on the weak move: the line under the board, a tap plays the better move through, Undo takes it away, the setting off silences her
            pg.wait_for_function("window.__ayo.take !== null", timeout=20000)
            tk = pg.evaluate("window.__ayo.take"); assert tk["played"] == worst and tk["pit"] == rated[0]["pit"] and tk["moves"] == 0 and tk["kind"] == "better", tk
            assert not pg.evaluate("document.querySelector('#take').hidden") and pg.evaluate("document.querySelector('#takeWords').textContent") == tk["words"]
            assert tk["words"].startswith("your pit %d was the move · " % (rated[0]["pit"] + 1)) and tk["words"].endswith("seeds better"), tk["words"]
            assert pg.evaluate("document.querySelector('#takeFace svg') !== null"), "her face should be on the line"
            assert pg.evaluate("document.querySelector('#takeName').textContent") == "Her take", "across the board from her the chip says Her take"
            assert not pg.evaluate("document.querySelector('#lastMove').hidden"), "her reply is explained under it as usual"
            r1 = pg.evaluate("document.querySelector('#take').getBoundingClientRect().toJSON()"); r2 = pg.evaluate("document.querySelector('#lastMove').getBoundingClientRect().toJSON()")
            assert (r1["top"] > r2["bottom"] - 1) if wide else (r1["bottom"] < r2["top"] + 1), ("her take sits above their move's words on the phone, below them on the Mac", r1, r2)
            pg.wait_for_function("!document.querySelector('#bubble').hidden", timeout=5000); said = pg.evaluate("document.querySelector('#bubble').textContent")
            print("take:", tk["words"], "· she says:", said)
            pg.wait_for_timeout(500); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            moves = pg.evaluate("window.__ayo.state.moves.length"); badges = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
            pg.click("#take"); pg.wait_for_function("window.__ayo.replaying && window.__ayo.busy", timeout=5000)
            assert pg.evaluate("document.querySelector('#turn').textContent") == "watching" and pg.evaluate("document.querySelector('#hint').textContent") == "Mama Ngozi's move, slowly", pg.evaluate("document.querySelector('#hint').textContent")
            pg.wait_for_function("window.__ayo.marks.steps.length===%d && (window.__ayo.marks.caps.length+window.__ayo.marks.gifts.length)===%d" % (len(tk["order"]), len(tk["captures"])), timeout=20000)
            out2 = out[:-4] + "-show.png" if out.endswith(".png") else out + "-show.png"
            pg.wait_for_timeout(900); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out2, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.wait_for_function("!window.__ayo.replaying && !window.__ayo.busy", timeout=240000)
            assert pg.evaluate("window.__ayo.state.moves.length") == moves and pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')") == badges, "showing her move must leave the game as it was"
            assert pg.evaluate("window.__ayo.take") is not None and not pg.evaluate("document.querySelector('#take').hidden"), "her take stays until your move"
            assert pg.evaluate("document.querySelector('#turn').textContent") == "your move" and not pg.evaluate("document.querySelector('#undo').disabled")
            print("take: her move shown; the board is as it was")
            pg.click("#undo"); pg.wait_for_function("window.__ayo.state.moves.length===0 && !window.__ayo.busy", timeout=20000)
            assert pg.evaluate("window.__ayo.take") is None and pg.evaluate("document.querySelector('#take').hidden"), "Undo takes her take away"
            pg.evaluate("localStorage.setItem('ayo.take','0')"); tap(pg, worst)  # the setting off: the same weak move, no word
            pg.wait_for_function("document.querySelector('#turn').textContent==='your move' && !window.__ayo.busy && window.__ayo.state.moves.length===2", timeout=240000)
            pg.wait_for_timeout(600); assert pg.evaluate("window.__ayo.take") is None and pg.evaluate("document.querySelector('#take').hidden"), "with the setting off she says nothing"
            pg.evaluate("localStorage.setItem('ayo.take','1')")
            print("take: Undo cleared it · setting off → no word")
        if straightc:  # set the board straight: drag it askew, double-click the wood, then the 0 key
            V = lambda: pg.evaluate("window.__ayo.view")
            pg.wait_for_function("document.querySelector('#turn').textContent==='your move' && !window.__ayo.busy && !window.__ayo.hurry.playing", timeout=240000)
            def wood():  # between the two rows, across from pit 2: carved wood, no pit
                a = pg.evaluate("window.__ayo.pitAt(2)"); b = pg.evaluate("window.__ayo.pitAt(9)"); return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            moves = len(pg.evaluate("window.__ayo.state")["moves"]); assert not V()["off"], V()
            pg.evaluate("localStorage.removeItem('ayo.straightTip')")
            wx, wy = wood(); pg.mouse.move(wx, wy); pg.mouse.down(); pg.mouse.move(wx + 170, wy + 70, steps=8); pg.mouse.up()
            v = V(); assert v["off"], ("a drag leaves it askew", v)
            pg.wait_for_function("[...document.querySelectorAll('.toast')].some(t=>/Double-click the wood, or press 0/.test(t.textContent))", timeout=4000)
            assert pg.evaluate("localStorage.getItem('ayo.straightTip')") == "1", "the tip is said once on a phone"
            pg.wait_for_timeout(300); pg.screenshot(path=out.replace(".png", "-off.png"), timeout=120000, animations="disabled")
            wx, wy = wood(); pg.mouse.move(wx, wy, steps=3); pg.wait_for_function("window.__ayo.hover.pit===null", timeout=5000)
            pg.mouse.dblclick(wx, wy); pg.wait_for_timeout(1300)
            v = V(); assert not v["off"], ("the double-click set it straight", v)
            assert abs(v["phi"] - v["fit"]["phi"]) < 1e-6 and abs(v["dist"] - v["fit"]["dist"]) < 1e-6, v
            assert pg.evaluate("window.__ayo.selected") is None and len(pg.evaluate("window.__ayo.state")["moves"]) == moves, "a double-click on the wood plays nothing"
            print("straight: dragged to theta %.2f, double-click → %.2f (rest %.2f), phi %.2f" % (v["theta"], v["theta"], v["fit"]["base"], v["phi"]))
            pg.mouse.move(2, 2, steps=2); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled")
            wx, wy = wood(); pg.mouse.move(wx, wy); pg.mouse.down(); pg.mouse.move(wx - 150, wy - 50, steps=8); pg.mouse.up()
            assert V()["off"]; assert not pg.evaluate("[...document.querySelectorAll('.toast')].filter(t=>/Double-click the wood/.test(t.textContent)).length>1")
            pg.keyboard.press("0"); pg.wait_for_timeout(1300); assert not V()["off"], ("the 0 key set it straight", V())
            print("straight: the 0 key too · tip said once")
        if hoverc:  # the mouse on the Mac: the pit under the pointer says what a click will do
            hv = lambda: pg.evaluate("window.__ayo.hover"); hint = lambda: pg.evaluate("document.querySelector('#hint').textContent")
            base = hint(); legal = pg.evaluate("window.__ayo.legal"); st = pg.evaluate("window.__ayo.state"); you = pg.evaluate("window.__ayo.seat")
            m = max(legal, key=lambda i: st["pits"][i]); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % m)
            pg.mouse.move(x - 30, y - 30); pg.mouse.move(x, y, steps=4)
            pg.wait_for_function("window.__ayo.hover.ring && window.__ayo.hover.pit===%d" % m, timeout=5000)
            h = hv(); assert h["cursor"] == "pointer", h; k = (m - 6 * you) + 1
            assert hint() == "pit %d · %d seeds — click to see where they go" % (k, st["pits"][m]), hint()
            print("hover: pit", m, "·", h["cursor"], "·", hint())
            try: pg.wait_for_function("(m=>!m.steps.length&&!m.caps.length&&!m.end)(window.__ayo.marks)", timeout=20000)  # their move's faint marks fade first, so the picture shows the hover ring alone
            except Exception: pass
            pg.wait_for_timeout(400); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            t = 6 * (1 - you) + 1; tx, ty = pg.evaluate("window.__ayo.pitAt(%d)" % t); pg.mouse.move(tx, ty, steps=3)
            pg.wait_for_function("window.__ayo.hover.pit===%d && !window.__ayo.hover.ring" % t, timeout=5000)
            assert hv()["cursor"] == "default" and hint().startswith("their pit 2 · "), (hv(), hint())
            empty = [i for i in range(6 * you, 6 * you + 6) if st["pits"][i] == 0]
            if empty:
                ex, ey = pg.evaluate("window.__ayo.pitAt(%d)" % empty[0]); pg.mouse.move(ex, ey, steps=3)
                pg.wait_for_function("window.__ayo.hover.pit===%d" % empty[0], timeout=5000)
                assert hv()["cursor"] == "not-allowed" and hint().endswith("is empty"), (hv(), hint())
            pg.mouse.move(x, y, steps=3); pg.wait_for_function("window.__ayo.hover.ring", timeout=5000)
            pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.selected===%d" % m, timeout=5000)  # a click picks it: the path words take the line
            assert "where they go" not in hint() and hv()["cursor"] == "pointer", hint()
            pg.keyboard.press("Escape"); pg.mouse.move(2, 2, steps=2)  # off the board (onto the page's edge, still the canvas): no pit
            pg.wait_for_function("window.__ayo.hover.pit===null", timeout=5000); pg.wait_for_timeout(300)
            assert hv()["cursor"] == "grab" and not hv()["ring"] and hint() == base, (hv(), hint(), base)
            print("hover: their pit, empty pit, click and the wood all checked · back to", repr(base))
        if countc:  # count a pit by touch: press and hold, the seeds are counted one by one
            cdp = pg.context.new_cdp_session(pg); A = lambda: pg.evaluate("window.__ayo.count"); hint = lambda: pg.evaluate("document.querySelector('#hint').textContent")
            def touch(kind, x=0, y=0): cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [] if kind == "touchEnd" else [{"x": x, "y": y}]})
            pg.wait_for_function("document.querySelector('#turn').textContent==='your move' && !window.__ayo.busy && !window.__ayo.hurry.playing", timeout=240000)
            try: pg.wait_for_function("(m=>!m.steps.length&&!m.caps.length&&!m.end)(window.__ayo.marks)", timeout=20000)
            except Exception: pass
            pg.mouse.move(2, 2); pg.wait_for_timeout(400)  # the smoke's mouse off the pits: a finger has no hover words
            base = hint(); st = pg.evaluate("window.__ayo.state"); you = pg.evaluate("window.__ayo.seat"); moves = len(st["moves"])
            t = max(range(6 * (1 - you), 6 * (1 - you) + 6), key=lambda i: st["pits"][i]); n = st["pits"][t]; x, y = pg.evaluate("window.__ayo.pitAt(%d)" % t)
            touch("touchStart", x, y); pg.wait_for_timeout(200); assert not A()["shown"], "a tap's length is not a count"
            pg.wait_for_function("window.__ayo.count.shown && window.__ayo.count.pit===%d" % t, timeout=5000)
            k = (t - 6 * (1 - you)) + 1; want = "their pit %d · %d seed%s" % (k, n, "" if n == 1 else "s")
            assert hint().startswith(want), (hint(), want)
            pg.wait_for_function("window.__ayo.count.done", timeout=8000); c = A(); assert c["text"] == str(n), c
            print("count:", c["words"], "· counted to", c["text"])
            pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            touch("touchEnd"); pg.wait_for_timeout(300)
            assert pg.evaluate("window.__ayo.selected") is None and len(pg.evaluate("window.__ayo.state")["moves"]) == moves, "lifting the finger played nothing"
            pg.wait_for_function("!window.__ayo.count.shown", timeout=6000); assert hint() == base, (hint(), base)
            legal = pg.evaluate("window.__ayo.legal"); m = max(legal, key=lambda i: st["pits"][i]); mx, my = pg.evaluate("window.__ayo.pitAt(%d)" % m)
            touch("touchStart", mx, my); pg.wait_for_function("window.__ayo.count.pit===%d" % m, timeout=5000); touch("touchEnd"); pg.wait_for_timeout(250)
            assert pg.evaluate("window.__ayo.selected") is None, "a hold on your own pit counts it, never picks it"
            pg.wait_for_function("!window.__ayo.count.shown", timeout=8000)
            th = pg.evaluate("window.__ayo.theta"); pg.evaluate("window.__holdMs=4000")  # the software renderer hands the moves over late: give the press longer
            touch("touchStart", x, y)
            for j in range(1, 8): touch("touchMove", x + j * 12, y); pg.wait_for_timeout(40)
            pg.wait_for_timeout(4500); pg.evaluate("window.__holdMs=0"); assert not A()["shown"] and pg.evaluate("window.__ayo.theta") != th, ("a drag turns the board and counts nothing", A(), th, pg.evaluate("window.__ayo.theta"))
            touch("touchEnd"); pg.wait_for_timeout(200)
            pg.evaluate("window.__holdMs=4000"); mx, my = pg.evaluate("window.__ayo.pitAt(%d)" % m); touch("touchStart", mx, my); pg.wait_for_timeout(60); touch("touchEnd")
            pg.wait_for_function("window.__ayo.selected===%d" % m, timeout=5000); assert not A()["shown"]; pg.evaluate("window.__holdMs=0")
            print("count: lifting plays nothing · own pit counted not picked · a drag turns the board · a quick tap still picks; log", A()["log"])
        if undoc:  # Undo against the computer: the seeds of your move and the reply fly back to where they lay, the hint line says so
            st = pg.evaluate("window.__ayo.state"); n = len(st["moves"]); assert n >= 2, st["moves"]
            want = pg.evaluate("(()=>{const s=window.__ayo.state;return s.moves.slice(0, s.turn===window.__ayo.seat ? -2 : -1)})()")
            pg.click("#undo")
            pg.wait_for_function("window.__ayo.busy && document.querySelector('#hint').textContent.startsWith('Taking back')", timeout=5000)
            words = pg.evaluate("document.querySelector('#hint').textContent"); assert words == "Taking back your move and %s's reply" % pg.evaluate("({easy:'Adaeze',medium:'Nnamdi',hard:'Mama Ngozi'})[window.__ayo.level]"), words
            pg.wait_for_function("window.__ayo.tweens > 4", timeout=5000); pg.evaluate("window.__freeze=true")
            assert pg.evaluate("window.__ayo.busy && window.__ayo.tweens > 0"), "the seeds should still be in the air"
            air = pg.evaluate("window.__ayo.seeds.filter(s => s[1] > 0.06).length"); print("undo: seeds in the air at the picture:", air)
            pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.wait_for_function("!window.__ayo.busy && document.querySelector('#turn').textContent==='your move'", timeout=30000)
            st2 = pg.evaluate("window.__ayo.state"); assert st2["moves"] == want, (st2["moves"], want)
            counts = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>+b.textContent)"); assert counts == st2["pits"], (counts, st2["pits"])
            sc = pg.evaluate("[+document.querySelector('#myScore').textContent, +document.querySelector('#oppScore').textContent]"); assert sc == [st2["stores"][0], st2["stores"][1]], sc
            homes = pg.evaluate("(()=>{const s=window.__ayo.seeds;return s.length})()"); assert homes == 48, homes
            assert pg.evaluate("document.querySelector('#hint').textContent") != words, "the hint line goes back to your move"
            print("undo:", words, "· the seeds flew back; moves", n, "→", len(st2["moves"]), "· badges", counts)
        if musicc:  # music: off by default, on from Settings, silenced by the speaker, off with nothing left on the clock
            pg.wait_for_function("!window.__ayo.busy", timeout=240000)
            m = pg.evaluate("window.__ayo.music"); assert not m["on"] and not m["playing"], ("music is off on a new phone", m)
            pg.click("#settingsBtn"); pg.wait_for_selector("#settings:not([hidden])")
            assert pg.evaluate("document.querySelector('[data-set=music]').getAttribute('aria-checked')") == "false"
            pg.click("[data-set=music]"); assert pg.evaluate("localStorage.getItem('ayo.music')") == "1"
            pg.wait_for_timeout(600); m = pg.evaluate("window.__ayo.music")
            assert m["playing"] and m["bars"] >= 1 and m["scheduled"] > 10 and m["state"] == "running", ("on: the tune plays", m)
            assert m["note"] == "", m
            pg.click("#settingsBack"); pg.wait_for_timeout(300)
            pg.click("#soundBtn"); pg.wait_for_timeout(400); m = pg.evaluate("window.__ayo.music"); assert not m["playing"] and m["pending"] == 0, ("the speaker silences it", m)
            pg.click("#settingsBtn"); assert "sound is off" in pg.evaluate("document.querySelector('#musicNow').textContent"); pg.click("#settingsBack")
            pg.click("#soundBtn"); pg.wait_for_timeout(400); assert pg.evaluate("window.__ayo.music")["playing"], "the speaker on again: it plays again"
            pg.click("#homeBtn"); pg.wait_for_selector("#home:not([hidden])"); pg.wait_for_timeout(4000)
            m = pg.evaluate("window.__ayo.music"); assert m["playing"] and m["bars"] >= 2, ("it carries on at Home", m)
            pg.click("#homeSettings")
            pg.wait_for_selector("#settings:not([hidden])"); pg.click("[data-set=music]"); pg.wait_for_timeout(300)
            m = pg.evaluate("window.__ayo.music"); assert not m["playing"] and m["pending"] == 0 and pg.evaluate("localStorage.getItem('ayo.music')") == "0", ("off: nothing left", m)
            pg.click("#settingsBack"); pg.wait_for_timeout(200)
            print("music:", m)
        if restc:  # rest the board when nothing moves: count the frames drawn while waiting, with a pit picked, and on Home
            pg.wait_for_function("!window.__ayo.busy", timeout=240000); pg.wait_for_function("window.__ayo.tweens === 0 && !window.__ayo.marks.steps.length", timeout=60000); pg.wait_for_timeout(800)  # their move's faint marks fade by themselves first
            def drawn_over(ms):
                a = pg.evaluate("window.__ayo.rest"); pg.wait_for_timeout(ms); b = pg.evaluate("window.__ayo.rest")
                return b["drawn"] - a["drawn"], b["rested"] - a["rested"], b
            d, r, st = drawn_over(3000)
            assert st["on"] and st["resting"] and d <= 5 and r >= 10, ("waiting for your move: only the heartbeat should draw", d, r, st)
            print("rest: waiting 3 s — drawn", d, "rested", r)
            pit = pg.evaluate("window.__ayo.legal[0]"); xy = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
            pg.mouse.click(xy[0], xy[1]); pg.wait_for_timeout(800)
            assert pg.evaluate("window.__ayo.selected") == pit, "the first tap picks the pit"
            d2, r2, st = drawn_over(3000)
            assert d2 >= 3 and r2 == 0 and not st["resting"], ("a picked pit's glow breathes: drawn every frame", d2, r2, st)
            print("rest: a pit picked 3 s — drawn", d2, "rested", r2)
            pg.screenshot(path=out.replace(".png", "-rest-picked.png"), timeout=120000)
            pg.keyboard.press("Escape"); pg.wait_for_timeout(1200)
            d3, r3, st = drawn_over(2000)
            assert st["resting"] and d3 <= 4, ("put back: rests again", d3, r3, st)
            pg.screenshot(path=out.replace(".png", "-rest.png"), timeout=120000)
            print("rest: put back 2 s — drawn", d3, "rested", r3)
            pg.click("#homeBtn"); pg.wait_for_selector("#home:not([hidden])"); pg.wait_for_timeout(500)
            d4, r4, st = drawn_over(3000)
            assert d4 >= 3 and r4 == 0 and not st["resting"], ("Home turns the board slowly: drawn every frame", d4, r4, st)
            print("rest: Home 3 s — drawn", d4, "rested", r4)
            pg.click("#continueBtn" if not pg.evaluate("document.querySelector('#continueBtn').disabled") else "#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden", timeout=20000)
            pg.wait_for_function("window.__ayo.rest.resting", timeout=20000)  # back at the board: once the camera has come round, it rests
        if waitc:  # waiting on you: after a long think the opponent says a line of their own and drums on the wood
            pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.turn === 0 && !window.__ayo.state.over", timeout=240000); pg.wait_for_timeout(300)
            assert not pg.evaluate("window.__ayo.waitSkip(5000)"), "not after only a few seconds"
            lv = pg.evaluate("window.__ayo.level"); lines = json.loads(subprocess.check_output(["node", "-e", "import('./web/characters.js').then(m=>console.log(JSON.stringify(m.CHARACTERS[%s].lines.waiting)))" % json.dumps(lv)], cwd=root).decode())
            assert pg.evaluate("window.__ayo.waitSkip(21000)"), "25 s with nobody touching it: they speak"
            w = pg.evaluate("window.__ayo.waiting"); said = pg.evaluate("document.querySelector('#bubble').textContent")
            assert not pg.evaluate("document.querySelector('#bubble').hidden") and said in lines and w["last"]["text"] == said, (said, lines, w)
            assert pg.evaluate("document.querySelector('#oppFace').classList.contains('react')"), "their face pops"
            pg.wait_for_timeout(150); pg.screenshot(path=out, timeout=120000)
            assert w["shivers"] == 1 and w["last"]["pit"] >= 6, ("their fullest pit shivers", w)
            assert not pg.evaluate("window.__ayo.waitSkip(60000)"), "once a move"
            pg.wait_for_timeout(500); assert pg.evaluate("window.__ayo.state.turn") == 0 and not pg.evaluate("window.__ayo.busy"), "nothing played"
            print("waiting:", lv, "says", json.dumps(said), "· pit", w["last"]["pit"], "shivered")
        if ponderc:  # weighing it up: while the computer thinks, a faint light drifts over a pit or two of its own, then onto the pit it plays
            pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.turn === 0 && !window.__ayo.state.over", timeout=240000); pg.wait_for_timeout(300)
            lv = pg.evaluate("window.__ayo.level"); want = json.loads(subprocess.check_output(["node", "-e", "import('./web/ponder.js').then(m=>console.log(JSON.stringify(m.GLANCES)))"], cwd=root).decode())
            n0 = len(pg.evaluate("window.__ayo.ponder")["log"])
            mine = pg.evaluate("window.__ayo.legal"); tap(pg, mine[0])
            pg.wait_for_function("window.__ayo.ponder.lit", timeout=240000, polling=20)
            pg.screenshot(path=out, timeout=120000)
            pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.turn === 0 || window.__ayo.state.over", timeout=240000); pg.wait_for_timeout(600)
            pd = pg.evaluate("window.__ayo.ponder"); e = pd["log"][-1]; moves = pg.evaluate("window.__ayo.state.moves")
            assert len(pd["log"]) == n0 + 1 and not pd["on"] and not pd["lit"], ("one hover for their reply, gone after", pd)
            assert 1 <= len(e["plan"]) <= want.get(lv, 2), ("as many pits as they weigh", lv, e)
            assert all(p >= 6 for p in e["plan"]) and len(set(e["plan"])) == len(e["plan"]), ("their own pits, each once", e)
            assert e["pick"] == moves[e["moves"]], ("it settles on the pit it played", e, moves)
            route = e["plan"] + [e["pick"]]; k = 0  # the frames drawn here are slow, so a pit may be passed between two of them: the light's pits come in the plan's order
            for s_ in e["seen"]:
                while k < len(route) and route[k] != s_: k += 1
                assert k < len(route), ("the light went where the plan says, then to the pick", e)
            assert e["seen"] and e["seen"][0] == e["plan"][0], ("it starts on the first pit weighed", e)
            print("ponder:", lv, "weighed", e["plan"], "· played", e["pick"], "· light went", e["seen"])
        if lastc:  # which pit they played: the faint light stays on it until your move
            def lm(): return pg.evaluate("window.__ayo.lastMark")
            def reply():
                pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.turn === 0 && !window.__ayo.state.over && window.__ayo.explain", timeout=240000)
                pg.wait_for_function("window.__ayo.marks.steps.length === 0", timeout=60000); pg.wait_for_timeout(300)  # the ghost of their path has faded
            for rnd in range(2):
                pg.wait_for_function("!window.__ayo.busy && window.__ayo.state.turn === 0", timeout=240000); pg.wait_for_timeout(300)
                mine = pg.evaluate("window.__ayo.legal"); tap(pg, mine[-1])
                pg.wait_for_function("window.__ayo.lastMark.pit === -1", timeout=20000)  # your move takes it away
                reply(); moves = pg.evaluate("window.__ayo.state.moves"); m = lm()
                assert m["pit"] == moves[-1] and m["pit"] >= 6 and m["shown"], ("on the pit they played", m, moves[-1])
                assert m["label"].endswith("played last"), m
                if rnd == 0: pg.mouse.move(2, 2); pg.wait_for_timeout(400); pg.screenshot(path=out, timeout=120000)  # the mouse off the board, so its own ring is not in the picture
            mine = pg.evaluate("window.__ayo.legal"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % mine[0]); pg.mouse.click(x, y); pg.wait_for_timeout(300)  # one tap: picked, not sown
            assert pg.evaluate("window.__ayo.selected") == mine[0]
            m = lm(); assert m["shown"], ("picking a pit of yours keeps it", m, pg.evaluate("[window.__ayo.selected, window.__ayo.busy, !!window.__ayo.explain, window.__ayo.state.turn, window.__ayo.state.over]"))
            pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
            pg.wait_for_function("!window.__ayo.busy", timeout=60000); pre = pg.evaluate("[window.__ayo.busy, window.__ayo.replaying, !!window.__ayo.explain, document.body.className, window.__ayo.selected]")
            pg.evaluate("() => { window.__ayo.replayLast(); }"); pg.wait_for_timeout(150); assert pg.evaluate("window.__ayo.replaying"), ("their move watched again", pre)
            pg.wait_for_function("window.__ayo.lastMark.pit === -1 || !window.__ayo.replaying", timeout=20000); assert pg.evaluate("window.__ayo.replaying") and lm()["pit"] == -1, "watching their move again: the pit lights by itself"
            pg.wait_for_function("!window.__ayo.replaying", timeout=120000); pg.wait_for_timeout(300)
            pg.wait_for_function("window.__ayo.lastMark.shown", timeout=20000)  # back after the replay
            print("lastmark:", lm())
        if wakec:  # keep the screen on: held during the game, let go when it is not wanted
            pg.wait_for_function("!window.__ayo.busy", timeout=240000); pg.wait_for_timeout(200)
            w = pg.evaluate("window.__ayo.wake"); assert w["supported"] and w["wanted"] and w["held"], ("the screen should be held while the game is in play", w)
            pg.evaluate("window.__ayo.wakeIdle(181000)"); pg.wait_for_timeout(100)
            w = pg.evaluate("window.__ayo.wake"); assert not w["wanted"] and not w["held"], ("3 minutes with nobody touching it: let go", w)
            pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
            w = pg.evaluate("window.__ayo.wake"); assert w["held"], ("a key takes it back", w)
            pg.click("#homeBtn"); pg.wait_for_selector("#home:not([hidden])"); pg.wait_for_timeout(100)
            w = pg.evaluate("window.__ayo.wake"); assert not w["held"], ("Home lets it go", w)
            pg.click("#continueBtn" if not pg.evaluate("document.querySelector('#continueBtn').disabled") else "#playBtn"); pg.wait_for_function("document.querySelector('#home').hidden", timeout=20000); pg.wait_for_timeout(100)
            assert pg.evaluate("window.__ayo.wake")["held"], "back at the board: held again"
            pg.click("#settingsBtn"); pg.wait_for_selector("#settings:not([hidden])")
            assert pg.evaluate("document.querySelector('[data-set=wake]').getAttribute('aria-checked')") == "true" and pg.evaluate("document.querySelector('#wakeNow').textContent") == ""
            pg.click("[data-set=wake]"); assert pg.evaluate("localStorage.getItem('ayo.wake')") == "0"
            pg.click("#settingsBack"); pg.wait_for_timeout(300)
            w = pg.evaluate("window.__ayo.wake"); assert not w["held"] and not w["wanted"], ("the setting off lets it go", w)
            pg.click("#settingsBtn"); pg.click("[data-set=wake]"); pg.click("#settingsBack"); pg.wait_for_timeout(300)
            print("wake: log", w["log"], "· browser", pg.evaluate("window.__wakeLog"))
        if clip:  # record the best turn so far as a short video, the way the Game over card's Clip button does
            pg.set_default_timeout(300000)
            r = pg.evaluate("window.__ayo.clip()")
            print("clip:", json.dumps(r))
            assert r and r["size"] > 0 and r["type"], "no video came out of the clip"
            assert r["ms"] <= 60000, "clip never finished in reasonable time: %s ms" % r["ms"]  # software rendering is slow; a real phone plays it in ~10 s (clipLength)
            assert pg.evaluate("document.querySelector('#rec').hidden && document.querySelector('#turn').textContent==='your move'"), "board not restored after the clip"
    pg.wait_for_timeout(300)
    if page:  # the whole page with the HUD: the opponent's face in a mood (the bubble is not forced, it is a chance line)
        assert pg.evaluate("window.__ayo.mood") in ("calm", "think", "happy", "sulk", "surprised"), "no mood"
        pg.evaluate("window.__ayo.react(%s)" % json.dumps(page)); pg.wait_for_timeout(700)
        assert pg.evaluate("window.__ayo.mood") == page, "face did not take the mood"
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled")
    elif home: pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled")
    elif keys or path or answer or explain or take or hurry or handc or hintc or hoverc or countc or undoc or waitc or ponderc or lastc or straightc: pass  # the picture was taken with the pit picked (by its key, or with the path shown, or their move explained)
    else:
        data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
        open(out, "wb").write(base64.b64decode(data.split(",")[1]))
    b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
srv.shutdown(); print("wrote", out)
