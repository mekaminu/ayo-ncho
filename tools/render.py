# Render the game with headless Chromium (software WebGL) and optionally play a move.
# Usage: python3 tools/render.py out.png            -> still frame (mid-game position, pit 4 lit)
#        python3 tools/render.py out.png --smoke    -> start a real game, tap a pit twice, wait for the opponent, check the board changed
#        add --clip (with --smoke) to also record the best-turn clip in the browser and check a video came out
#        add --wide for the Fold-open / Mac layout (1180x820); --home screenshots the Home screen (whole page); --lite / --full force the lighter or the full board (auto otherwise)
#        add --nophysics to play with the seed physics off (seeds fly straight to their pit, as on the weakest phones) and check the setting took
#        add --keys (with --smoke) to play from the keyboard too: a digit picks a pit (screenshot of the whole page with the hint line), Esc puts it
#                  back, digit + Enter sows, U undoes, H hints; and to check the pits' screen-reader labels carry the seed counts
#        add --path (with --smoke) to check "where the seeds will go": one tap on the pit with the longest path lands a mark on every pit the hand
#                  would reach, rings the captures and lights the end pit, and the hint line says where it ends; screenshot of the whole page (<out>);
#                  Esc clears every mark; with the setting off (Settings → Feel) a tap shows no marks and the old words
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
#        add --page (with --smoke) to screenshot the whole page after the move, the opponent's face reacting (mood given as --page=sulk; default happy)
#        --online: start the real server (node server/index.js); one phone goes Home → With friends (name card, then the Rooms screen opens a room
#                  and shows its code), a second does the same, is refused a wrong code under the field, then joins by the real code and knocks;
#                  the host's door card shows over the Rooms screen, the friend is let in, both go to the board, play a move each (both boards
#                  must follow) and shout both ways. Pictures: <out> the Rooms screen with its code, <out>-door.png the door card over it,
#                  <out>-friend.png the friend's view (the far seat, pits nearest them) with the host's shout by his face. --wide for the host on a Mac
#        --puzzle: open today's daily puzzle (?puzzle=1), play the answer, check the result card says Solved, screenshot it; then Back to home
#                  and check the Home card says solved (<out>-home.png); --wide for the Mac layout
#        --last8: the last 8 (Nchò) — a saved game one move from the board's last 8 seeds (tools/last8pos.js finds it): Continue, the move is
#                  played, the seeds left hop, the "Last 8" line comes up under the board with the count, the count badges of the pits still
#                  holding seeds glow, the opponent says their word (picture <out>); the line stays through their reply while it holds, and a
#                  first tap shows whether a move sweeps the last seeds. --wide for the Mac
import sys, base64, http.server, threading, functools, os, json, time, subprocess, urllib.request
from playwright.sync_api import sync_playwright
#        --local: two of us on one phone — Home → the "Two of us" pill → Play: Player 1 plays, the board swings half a turn round to face
#                  Player 2 (the HUD names them, the move just played is explained for them; picture <out>), Player 2 plays and it swings on,
#                  Undo takes one move back and turns back to whoever played it; Home says "Two of us · …" under Continue; with Settings →
#                  Feel → Pass the phone off the seat still passes but the board stays. --wide for the Fold open / the Mac
#        --record: your record against each opponent — a phone with games already played against all three and a saved game one move from a
#                  win over Mama Ngozi (tools/endgame.js finds it): Home shows the record under each opponent's name (<out>-home.png), Continue
#                  brings the game back, the winning move is played, and the Game over card shows "you lead 3–1 · new best win 28–20" and her
#                  word for three in a row (<out>); the record is checked in storage. --wide for the Mac
out = sys.argv[1]; smoke = "--smoke" in sys.argv; wide = "--wide" in sys.argv; home = "--home" in sys.argv; lite = "--lite" in sys.argv; full = "--full" in sys.argv; clip = "--clip" in sys.argv; online = "--online" in sys.argv; nophysics = "--nophysics" in sys.argv; puzzle = "--puzzle" in sys.argv; keys = "--keys" in sys.argv; record = "--record" in sys.argv; path = "--path" in sys.argv; explain = "--explain" in sys.argv; local = "--local" in sys.argv; take = "--take" in sys.argv; hurry = "--hurry" in sys.argv; last8 = "--last8" in sys.argv
page = next((a.split("=", 1)[1] if "=" in a else "happy" for a in sys.argv if a.startswith("--page")), None)
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
node = None
if online:  # the real server on its own port, so two pages can meet at one board
    node = subprocess.Popen(["node", os.path.join(root, "server", "index.js")], env={**os.environ, "PORT": "8767"}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    for _ in range(100):
        try: urllib.request.urlopen("http://127.0.0.1:8767/healthz", timeout=1); break
        except Exception: time.sleep(0.1)
    else: print("server did not start:", node.stderr.read().decode()); sys.exit(1)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
def watch(pg, errors, tag=""):
    pg.on("pageerror", lambda e: errors.append(tag + str(e)))
    pg.on("console", lambda m: errors.append(tag + m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three):
        pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
def tap(pg, pit):  # tap a pit twice (select, then sow) where the board draws it on this page
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    pg.mouse.click(x, y); pg.wait_for_timeout(300); pg.mouse.click(x, y)
if online:
    import atexit; atexit.register(node.terminate)  # the server never outlives a failed check
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); errors = []
        # two phones = two browser contexts, so neither sees the other's saved seat
        host = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=1).new_page(); watch(host, errors, "host: ")
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
        friend = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1).new_page(); watch(friend, errors, "friend: ")
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
        tap(host, 2)  # the host sows their third pit; the friend's board must follow
        friend.wait_for_function("document.querySelector('#turn').textContent==='your move'", timeout=240000)
        host.wait_for_function("!window.__ayo.busy && window.__ayo.state.moves.length===1", timeout=240000)
        mid = friend.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        assert before != mid, "the friend's board did not follow the host's move"
        assert mid == host.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')"), "the two boards disagree"
        assert host.evaluate("window.__ayo.state.moves.length") == 1
        tap(friend, 6)  # the friend answers from the far seat (their pits are 6..11, drawn nearest them)
        host.wait_for_function("document.querySelector('#turn').textContent==='your move'", timeout=240000)
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
            assert pg.evaluate("getComputedStyle(document.querySelector('#undo')).display") == "none", "undo has no place online"
        host.click("#shoutBtn"); host.wait_for_selector("#shoutMenu:not([hidden])", timeout=5000)
        host.click("#shoutMenu .pill[data-id=oya]")
        friend.wait_for_function("!document.querySelector('#bubble').hidden && document.querySelector('#bubble').textContent==='Oya, your move!'", timeout=10000)
        host.wait_for_function("!document.querySelector('#myBubble').hidden && document.querySelector('#myBubble').textContent==='Oya, your move!'", timeout=10000)
        assert host.evaluate("document.querySelector('#shoutMenu').hidden"), "the shout row closes once a phrase is sent"
        assert friend.evaluate("window.__ayo.shout('chai')") is True, "the friend can shout back"
        host.wait_for_function("document.querySelector('#bubble').textContent==='Chai!'", timeout=10000)
        print("online: shouts went both ways")
        out2 = out[:-4] + "-friend.png" if out.endswith(".png") else out + "-friend.png"
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=out2, timeout=120000, animations="disabled")
        b.close(); node.terminate()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("wrote", out, out3, "and", out2); sys.exit(0)
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2 if not (wide or home) else 1)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three):
        pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    if record:  # a phone that has played all three before, with a saved game one move from beating Mama Ngozi for the third time running
        end = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "endgame.js"), "7", "ncho"]).decode())
        saved = {"moves": end["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "hard", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 7 * 60 * 1000}}  # a game that began a few minutes ago
        before = {"easy": {"w": 4, "l": 2, "d": 0, "best": [31, 17], "run": 1}, "medium": {"w": 1, "l": 3, "d": 1, "best": [25, 23], "run": -2}, "hard": {"w": 2, "l": 1, "d": 0, "best": [26, 22], "run": 2}, "last": 1}
        pg.add_init_script("localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.record', %s); localStorage.setItem('ayo.level', 'hard'); localStorage.setItem('ayo.tutorial', '3');" % (json.dumps(json.dumps(saved)), json.dumps(json.dumps(before))))
    if last8:  # a saved game against Nnamdi one move from the last 8
        pos = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "last8pos.js"), "5"]).decode())
        saved = {"moves": pos["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "medium", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 5 * 60 * 1000}}
        pg.add_init_script("localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'medium'); localStorage.setItem('ayo.tutorial', '3');" % json.dumps(json.dumps(saved)))
    if explain: pg.add_init_script("localStorage.setItem('ayo.tutorial', '3')")  # past the first-game tips, so the picture shows the words alone
    if take: pg.add_init_script("localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.level', 'hard')")  # across the board from Mama Ngozi herself, so she says her word
    pg.goto("http://127.0.0.1:8766/web/index.html" + ("?capture=1&puzzle=1" if puzzle else "?capture=1" if smoke else "?capture=1&stay=home" if home or record or local or last8 else "?still=1") + ("&lite=1" if lite else "&lite=0" if full else "") + ("&physics=0" if nophysics else ""), wait_until="load")
    pg.wait_for_function("window.__done===true", timeout=180000)
    q = pg.evaluate("window.__ayo.quality"); print("quality:", json.dumps(q))
    assert q["physics"] == (False if nophysics else not q["lite"]), "the seed-physics setting did not take (auto follows the lighter board)"
    if record:
        pills = pg.evaluate("[...document.querySelectorAll('.pill[data-level]')].map(b=>[b.dataset.level, b.querySelector('small.rec').textContent])")
        assert pills == [["easy", "you lead 4–2"], ["medium", "you trail 1–3"], ["hard", "you lead 2–1"]], pills
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
        pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(500); pg.screenshot(path=out, timeout=120000, animations="disabled")
        b.close()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
        srv.shutdown(); print("wrote", out, "and", out2); sys.exit(0)
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
    if smoke:
        before = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        if take:  # the weakest opening move by the hard search's own rating, so her take is sure to come
            rated = pg.evaluate("window.__ayo.rate()"); worst = rated[-1]["pit"]; gap = rated[0]["value"] - rated[-1]["value"]
            assert len(rated) == 6 and gap >= 3, ("the opening should have a clearly weaker pit", rated)
            assert pg.evaluate("document.querySelector('#oppName').textContent") == "Mama Ngozi · Hard"
            print("take: opening rated", [(r["pit"], round(r["value"], 1)) for r in rated], "· playing the weakest, pit", worst)
            tap(pg, worst)
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
            print("keys: H lit a hint ·", hint())
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
                pg.keyboard.press("Escape"); assert sel() is None and marks() == {"steps": [], "caps": [], "end": False}, "Esc should clear every mark"
            if os.environ.get("PATH_BEFORE"): pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=os.environ["PATH_BEFORE"], timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            x, y = pg.evaluate("window.__ayo.pitAt(%d)" % best); pg.mouse.click(x, y)
            pth = pg.evaluate("window.__ayo.path"); n = len(pth["order"])
            pg.wait_for_function("window.__ayo.marks.steps.length===%d && window.__ayo.marks.end===%s && window.__ayo.marks.caps.length===%d" % (n, "true" if pth["end"] is not None else "false", len(pth["captures"])), timeout=20000)
            mk = marks(); assert sorted(mk["steps"]) == sorted(pth["order"]) and sorted(mk["caps"]) == sorted(pth["captures"]), (mk, pth)
            assert "ends in" in hint() and (hint().endswith("— Enter to sow") or hint().endswith("— tap again to sow")), hint()
            assert pg.evaluate("document.querySelector('.badge').textContent") != "", "badges still there"
            print("path: pit", best, "→", n, "pits, relays", len(pth["relays"]), "captures", pth["captures"], "ends", pth["end"], "·", hint())
            pg.wait_for_timeout(400); pg.evaluate("window.__freeze=true"); pg.wait_for_timeout(300); pg.screenshot(path=out, timeout=120000, animations="disabled"); pg.evaluate("window.__freeze=false; document.dispatchEvent(new Event('visibilitychange'))")
            pg.keyboard.press("Escape"); assert marks() == {"steps": [], "caps": [], "end": False}
            # the setting off: a tap lights the pit as before, no marks, the old words
            pg.evaluate("localStorage.setItem('ayo.path','0')"); pg.mouse.click(x, y); pg.wait_for_function("window.__ayo.selected===%d" % best, timeout=5000); pg.wait_for_timeout(600)
            assert marks() == {"steps": [], "caps": [], "end": False} and pg.evaluate("window.__ayo.path") is None, "the setting off should show no marks"
            assert hint() in ("tap again to sow, or pick another",) or hint().endswith("— Enter to sow, or pick another"), hint()
            pg.evaluate("localStorage.setItem('ayo.path','1')"); pg.keyboard.press("Escape")
            print("path: setting off → no marks ·", hint())
        if explain:  # their move, explained: after the opponent's turn its marks stay faint with the words; tap the words and the turn replays slowly
            ex = pg.evaluate("window.__ayo.explain"); assert ex and ex["moves"] == 1 and ex["name"] == "Nnamdi", ex  # the opponent's reply to your first move
            assert not pg.evaluate("document.querySelector('#lastMove').hidden") and pg.evaluate("document.querySelector('#lastName').textContent") == "Nnamdi"
            words = pg.evaluate("document.querySelector('#lastWords').textContent"); assert words == ex["words"] and ("picked up again" in words or "took" in words or "gave" in words or words.startswith("ended in")), words
            landed = "window.__ayo.marks.steps.length===%d && window.__ayo.marks.caps.length===%d && window.__ayo.marks.end===%s" % (len(ex["order"]), len(ex["captures"]), "true" if ex["end"] is not None else "false")
            pg.wait_for_function(landed, timeout=20000)  # the ghost of their path: every pit their hand reached, the captures ringed, the light where it ended
            mk = pg.evaluate("window.__ayo.marks"); assert sorted(mk["steps"]) == sorted(ex["order"]) and sorted(mk["caps"]) == sorted(ex["captures"]) and mk["end"] == (ex["end"] is not None), (mk, ex)
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
            pg.wait_for_function("window.__ayo.marks.steps.length===%d && window.__ayo.marks.caps.length===%d" % (len(tk["order"]), len(tk["captures"])), timeout=20000)
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
    elif keys or path or explain or take or hurry: pass  # the picture was taken with the pit picked (by its key, or with the path shown, or their move explained)
    else:
        data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
        open(out, "wb").write(base64.b64decode(data.split(",")[1]))
    b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
srv.shutdown(); print("wrote", out)
