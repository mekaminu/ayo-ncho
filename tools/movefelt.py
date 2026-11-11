# Your move, felt (idea 11 Nov, early morning). Opens the game in headless Chromium as the Fold folded (390x760) and checks:
#   1. you play a pit; while their seeds fly nothing is felt; once they settle and your card lights, the cue comes once
#      (web/turncue.js yourMoveCue: two soft knocks and a light buzz);
#   2. it comes once per turn of theirs, never on your own move;
#   3. a reload, the saved game coming back on your move, gives none;
#   4. no page error.
# Usage: python3 tools/movefelt.py
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright
from PIL import Image
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-10-whosetap.png"))
PORT = int(os.environ.get("PORT", "8799"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/web/index.html?capture=1" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("whosetap: " + what + ((" · " + errs[0]) if errs else ""))

def page(ctx):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e).split("\n")[0]))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg

def ready(pg, t=150000): pg.wait_for_function("document.querySelector('#home').hidden && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0 && window.__ayo.tweens === 0", timeout=t)
def taps(pg): return [e for e in pg.evaluate("window.__ayo.turnCue.log") if "tap" in e or "back" in e]
def at(pg, pit): return pg.evaluate("window.__ayo.pitAt(%d)" % pit)

def open_game(ctx, q=""):
    pg = page(ctx); pg.goto(URL + q); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
    pg.evaluate("(async () => { const b = document.querySelector('#playBtn'); b.click(); await new Promise((r) => setTimeout(r, 300)); if (b.classList.contains('armed')) b.click(); })()")
    ready(pg); pg.wait_for_timeout(600); return pg


def play_one(pg):
    ready(pg); n = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]"); x, y = at(pg, pit)
    for _ in range(4):
        if pg.evaluate("window.__ayo.state.moves.length !== %d || window.__ayo.busy" % n): break
        pg.mouse.click(x, y); pg.wait_for_timeout(250)
    pg.wait_for_function("window.__ayo.state.moves.length > %d" % n, timeout=30000)

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    ctx = b.new_context(viewport={"width": 390, "height": 760}, device_scale_factor=1)
    ctx.add_init_script("try { localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.tutorial', '3'); } catch (e) {}")
    pg = open_game(ctx)
    check(pg.evaluate("window.__ayo.turnCue.felt") == 0, "a game opening on your move: nothing felt")
    done = 0
    for k in range(3):
        if pg.evaluate("window.__ayo.state.over"): break
        f0 = pg.evaluate("window.__ayo.turnCue.felt")
        play_one(pg)
        check(pg.evaluate("window.__ayo.turnCue.felt") == f0, "your own move: nothing felt")
        try: pg.wait_for_function("window.__ayo.state.turn === 0 && window.__ayo.turnCue.side === 'near' || window.__ayo.state.over", timeout=120000)
        except Exception: check(False, "their move came back to you")
        if pg.evaluate("window.__ayo.state.over"): break
        f1 = pg.evaluate("window.__ayo.turnCue.felt")
        check(f1 == f0 + 1, "their seeds settled, your move: felt once (%d -> %d)" % (f0, f1)); done += 1
    check(done >= 1, "at least one turn came over to you")
    pg.evaluate("window.__ayo.saveNow()"); pg.reload(); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
    pg.wait_for_timeout(1500)
    check(pg.evaluate("window.__ayo.turnCue.felt") == 0, "the saved game coming back: nothing felt")
    check(not errs, "no page error" + ((": " + errs[0]) if errs else ""))
    b.close()
print("movefelt: ok")
