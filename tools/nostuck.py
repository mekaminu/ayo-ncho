# Never stuck on "thinking…" (8 Nov): the long-evening check (tools/soak.py) once found a game stopped after your first move,
# the opponent "thinking…" for ever. This breaks a game on purpose, the three ways that could happen, and fails unless the
# game goes on to your next turn each time — in headless Chromium as a phone (390x844):
#   then   a step of your move's animation throws (a pit's number refuses to be written, once): before, the move never ended
#   frame  something inside a frame throws (the first Math.sin after your tap): before, the frame loop stopped for good
#   hang   the opponent's worker never answers (its messages dropped): before, they thought for ever
# Usage: python3 tools/nostuck.py [then|frame|hang ...]   (all three by default; about a minute each)
import functools, http.server, json, os, sys, threading
from playwright.sync_api import sync_playwright
root = os.environ.get("ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
PORT = int(os.environ.get("PORT", "8790"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BREAK = {
    "then": """() => { let k = 0; const d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent'); for (const el of document.querySelectorAll('#badges > *'))
      Object.defineProperty(el, 'textContent', { configurable: true, get() { return d.get.call(this); }, set(v) { if (k++ < 1) throw new Error('broken on purpose: a pit number'); d.set.call(this, v); } }); }""",
    "frame": """() => { const sin = Math.sin; let k = 0; Math.sin = function (x) { if (k++ === 0) throw new Error('broken on purpose: inside a frame'); return sin(x); }; }""",
    "hang": """() => { Worker.prototype.postMessage = function () {}; }""",
}
def one(b, mode):
    pg = b.new_page(viewport={"width": 390, "height": 844}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.add_init_script("localStorage.setItem('ayo.tutorial','3');localStorage.setItem('ayo.lesson','done');localStorage.setItem('ayo.level','easy');localStorage.setItem('ayo.talk','few');")
    pg.goto("http://127.0.0.1:%d/web/index.html?capture=1&stay=home" % PORT); pg.wait_for_function("window.__done===true", timeout=180000)
    pg.evaluate("document.querySelector('#playBtn').click()")
    pg.wait_for_function("document.querySelector('#home').hidden && window.__ayo.state.turn === 0 && !window.__ayo.busy", timeout=120000)
    n = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    pg.mouse.click(x, y); pg.wait_for_timeout(400); pg.evaluate(BREAK[mode])
    for _ in range(4):
        if not pg.evaluate("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % n): break
        pg.mouse.click(x, y); pg.wait_for_timeout(400)
    try: pg.wait_for_function("window.__ayo.state.over || (window.__ayo.state.moves.length >= %d && window.__ayo.state.turn === 0 && !window.__ayo.busy)" % (n + 2), timeout=90000); ok = True
    except Exception: ok = False
    r = pg.evaluate("(() => { const a = window.__ayo; return { moves: a.state.moves.length, turn: a.state.turn, busy: a.busy, tweens: a.tweens, sub: document.querySelector('#oppSub').textContent, caught: a.caught ? { n: a.caught.n, relaid: a.caught.relaid, asks: a.caught.asks } : null }; })()")
    want = {"then": 1, "frame": 1, "hang": 0}[mode]  # the error itself still reaches the page (so every other check sees it); hang throws nothing
    ok = ok and len(errs) == want
    print("%-5s %s %s%s" % (mode, "goes on" if ok else "STUCK", json.dumps(r), (" · page errors: " + "; ".join(errs)) if errs else ""), flush=True)
    pg.close(); return ok
modes = [a for a in sys.argv[1:] if a in BREAK] or list(BREAK)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    bad = [m for m in modes if not one(b, m)]
    b.close()
srv.shutdown()
if bad: raise SystemExit("stuck: " + ", ".join(bad))
print("the game goes on every time")
