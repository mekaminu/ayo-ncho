# Render the game with headless Chromium (software WebGL) and optionally play a move.
# Usage: python3 tools/render.py out.png            -> still frame (mid-game position, pit 4 lit)
#        python3 tools/render.py out.png --smoke    -> start a real game, tap a pit twice, wait for the opponent, check the board changed
import sys, base64, http.server, threading, functools, os, json, time
from playwright.sync_api import sync_playwright
out = sys.argv[1]; smoke = "--smoke" in sys.argv
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three):
        pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.goto("http://127.0.0.1:8766/web/index.html" + ("?capture=1" if smoke else "?still=1"), wait_until="load")
    pg.wait_for_function("window.__done===true", timeout=180000)
    if smoke:
        before = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        # tap the player's pit 2 (third from the near end, right column): project its centre via the badge position
        box = pg.evaluate("(()=>{const b=document.querySelectorAll('.badge')[2].getBoundingClientRect();return [b.left-20,b.top-20]})()")
        pg.mouse.click(box[0], box[1]); pg.wait_for_timeout(300); pg.mouse.click(box[0], box[1])
        pg.wait_for_function("document.querySelector('#turn').textContent==='your move' && !document.querySelector('#undo').disabled", timeout=60000)
        after = pg.evaluate("[...document.querySelectorAll('.badge')].map(b=>b.textContent).join(',')")
        assert before != after, "board did not change"
        print("smoke: before", before, "after", after, "scores", pg.evaluate("[document.querySelector('#myScore').textContent, document.querySelector('#oppScore').textContent]"))
    pg.wait_for_timeout(300)
    data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
    open(out, "wb").write(base64.b64decode(data.split(",")[1])); b.close()
    if errors: print("page errors:", *errors, sep="\n  "); sys.exit(1)
srv.shutdown(); print("wrote", out)
