# Render the game with headless Chromium (software WebGL) and optionally play a move.
# Usage: python3 tools/render.py out.png            -> still frame (mid-game position, pit 4 lit)
#        python3 tools/render.py out.png --smoke    -> start a real game, tap a pit twice, wait for the opponent, check the board changed
#        add --clip (with --smoke) to also record the best-turn clip in the browser and check a video came out
#        add --wide for the Fold-open / Mac layout (1180x820); --home screenshots the Home screen (whole page); --lite / --full force the lighter or the full board (auto otherwise)
#        add --nophysics to play with the seed physics off (seeds fly straight to their pit, as on the weakest phones) and check the setting took
#        add --keys (with --smoke) to play from the keyboard too: a digit picks a pit (screenshot of the whole page with the hint line), Esc puts it
#                  back, digit + Enter sows, U undoes, H hints; and to check the pits' screen-reader labels carry the seed counts
#        add --page (with --smoke) to screenshot the whole page after the move, the opponent's face reacting (mood given as --page=sulk; default happy)
#        --online: start the real server (node server/index.js); one phone goes Home → With friends (name card, then the Rooms screen opens a room
#                  and shows its code), a second does the same, is refused a wrong code under the field, then joins by the real code and knocks;
#                  the host's door card shows over the Rooms screen, the friend is let in, both go to the board, play a move each (both boards
#                  must follow) and shout both ways. Pictures: <out> the Rooms screen with its code, <out>-door.png the door card over it,
#                  <out>-friend.png the friend's view (the far seat, pits nearest them) with the host's shout by his face. --wide for the host on a Mac
#        --puzzle: open today's daily puzzle (?puzzle=1), play the answer, check the result card says Solved, screenshot it; then Back to home
#                  and check the Home card says solved (<out>-home.png); --wide for the Mac layout
import sys, base64, http.server, threading, functools, os, json, time, subprocess, urllib.request
from playwright.sync_api import sync_playwright
#        --record: your record against each opponent — a phone with games already played against all three and a saved game one move from a
#                  win over Mama Ngozi (tools/endgame.js finds it): Home shows the record under each opponent's name (<out>-home.png), Continue
#                  brings the game back, the winning move is played, and the Game over card shows "you lead 3–1 · new best win 28–20" and her
#                  word for three in a row (<out>); the record is checked in storage. --wide for the Mac
out = sys.argv[1]; smoke = "--smoke" in sys.argv; wide = "--wide" in sys.argv; home = "--home" in sys.argv; lite = "--lite" in sys.argv; full = "--full" in sys.argv; clip = "--clip" in sys.argv; online = "--online" in sys.argv; nophysics = "--nophysics" in sys.argv; puzzle = "--puzzle" in sys.argv; keys = "--keys" in sys.argv; record = "--record" in sys.argv
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
    pg.goto("http://127.0.0.1:8766/web/index.html" + ("?capture=1&puzzle=1" if puzzle else "?capture=1" if smoke else "?capture=1&stay=home" if home or record else "?still=1") + ("&lite=1" if lite else "&lite=0" if full else "") + ("&physics=0" if nophysics else ""), wait_until="load")
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
    if smoke:
        before = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
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
            assert hint() == "pit %s · %d seeds — Enter to sow, or pick another" % (key, n), hint()
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
    elif keys: pass  # the picture was taken with the pit picked by its key
    else:
        data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
        open(out, "wb").write(base64.b64decode(data.split(",")[1]))
    b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
srv.shutdown(); print("wrote", out)
