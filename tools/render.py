# Render the game with headless Chromium (software WebGL) and optionally play a move.
# Usage: python3 tools/render.py out.png            -> still frame (mid-game position, pit 4 lit)
#        python3 tools/render.py out.png --smoke    -> start a real game, tap a pit twice, wait for the opponent, check the board changed
#        add --clip (with --smoke) to also record the best-turn clip in the browser and check a video came out
#        add --wide for the Fold-open / Mac layout (1180x820); --home screenshots the Home screen (whole page); --lite / --full force the lighter or the full board (auto otherwise)
#        add --page (with --smoke) to screenshot the whole page after the move, the opponent's face reacting (mood given as --page=sulk; default happy)
import sys, base64, http.server, threading, functools, os, json, time
from playwright.sync_api import sync_playwright
out = sys.argv[1]; smoke = "--smoke" in sys.argv; wide = "--wide" in sys.argv; home = "--home" in sys.argv; lite = "--lite" in sys.argv; full = "--full" in sys.argv; clip = "--clip" in sys.argv
page = next((a.split("=", 1)[1] if "=" in a else "happy" for a in sys.argv if a.startswith("--page")), None)
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
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
