# Render the game with headless Chromium (software WebGL) and optionally play a move.
# Usage: python3 tools/render.py out.png            -> still frame (mid-game position, pit 4 lit)
#        python3 tools/render.py out.png --smoke    -> start a real game, tap a pit twice, wait for the opponent, check the board changed
#        add --clip (with --smoke) to also record the best-turn clip in the browser and check a video came out
#        add --wide for the Fold-open / Mac layout (1180x820); --home screenshots the Home screen (whole page); --lite / --full force the lighter or the full board (auto otherwise)
#        add --page (with --smoke) to screenshot the whole page after the move, the opponent's face reacting (mood given as --page=sulk; default happy)
#        --online: start the real server (node server/index.js), open a room from one phone (?room=new), join it from a second (?room=CODE),
#                  play a move from each end and check both boards followed, then shout both ways; the picture is the friend's view (the far seat,
#                  pits nearest them) with the host's shout up by the host's face
import sys, base64, http.server, threading, functools, os, json, time, subprocess, urllib.request
from playwright.sync_api import sync_playwright
out = sys.argv[1]; smoke = "--smoke" in sys.argv; wide = "--wide" in sys.argv; home = "--home" in sys.argv; lite = "--lite" in sys.argv; full = "--full" in sys.argv; clip = "--clip" in sys.argv; online = "--online" in sys.argv
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
        host = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1).new_page(); watch(host, errors, "host: ")
        host.goto("http://127.0.0.1:8767/?room=new&capture=1", wait_until="load"); host.wait_for_function("window.__done===true", timeout=180000)
        host.wait_for_function("window.__ayo.room && window.__ayo.room.code", timeout=20000)
        code = host.evaluate("window.__ayo.room.code"); print("room:", code, "host seat", host.evaluate("window.__ayo.room.seat"))
        assert host.evaluate("location.search") == "?room=" + code, "the address did not become the invite link"
        friend = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1).new_page(); watch(friend, errors, "friend: ")
        friend.goto("http://127.0.0.1:8767/?room=%s&capture=1" % code.lower(), wait_until="load"); friend.wait_for_function("window.__done===true", timeout=180000)
        for pg in (host, friend): pg.wait_for_function("window.__ayo.room && window.__ayo.room.friend && window.__ayo.room.friend.name", timeout=20000)
        assert friend.evaluate("window.__ayo.room.seat") == 1
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
        friend.evaluate("window.__freeze=true"); friend.wait_for_timeout(200); friend.screenshot(path=out, timeout=120000, animations="disabled")
        b.close(); node.terminate()
        if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
    srv.shutdown(); print("wrote", out); sys.exit(0)
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, device_scale_factor=2 if not (wide or home) else 1)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three):
        pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.goto("http://127.0.0.1:8766/web/index.html" + ("?capture=1" if smoke else "?capture=1&stay=home" if home else "?still=1") + ("&lite=1" if lite else "&lite=0" if full else ""), wait_until="load")
    pg.wait_for_function("window.__done===true", timeout=180000)
    print("quality:", pg.evaluate("JSON.stringify(window.__ayo.quality)"))
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
    else:
        data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
        open(out, "wb").write(base64.b64decode(data.split(",")[1]))
    b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
srv.shutdown(); print("wrote", out)
