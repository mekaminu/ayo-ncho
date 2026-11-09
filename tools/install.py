# On your home screen (idea 9 Nov): checks the brass line on Home in headless Chromium as a phone (390x844, touch).
#   1. a first day played: no line, even with the browser's install question in hand;
#   2. a second day (Chrome on Android): the line comes up under the streak; a tap asks the browser's own question (a stand-in
#      for it here, since headless Chromium never offers to install), "accepted" says so and the line never comes back;
#   3. Not now puts it away (and it stays away after a reload);
#   4. an iPhone (Safari's name and touch): the line says the Share steps when tapped;
#   5. the installed app (display-mode standalone) and the store apps never show it; no page error anywhere.
# Usage: python3 tools/install.py [picture.png]   -> the picture (default docs/render-2026-11-09-install.png) is Home with the line
import functools, http.server, json, os, sys, threading
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-install.png"))
PORT = int(os.environ.get("PORT", "8795"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/web/index.html?capture=1&stay=home" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
errs = []
# the browser's install question, as Chrome hands it over: prompt() and userChoice; `answer` is what the player picks
FAKE = """window.__asked = 0; window.__answer = 'accepted';
window.__offer = () => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.__asked++; return Promise.resolve(); };
  Object.defineProperty(e, 'userChoice', { get: () => Promise.resolve({ outcome: window.__answer }) }); dispatchEvent(e); };"""

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("install: " + what + ((" · " + errs[0]) if errs else ""))

def days(n):  # n days already played, ending yesterday or today
    from datetime import date, timedelta
    d = [str(date.today() - timedelta(days=i)) for i in range(n, 0, -1)]
    return "localStorage.setItem('ayo.streak', %s);" % json.dumps(json.dumps({"days": d, "seen": []}))

def open_(b, setup, ua=None, standalone=False, tag="page"):
    kw = dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    if ua: kw["user_agent"] = ua
    ctx = b.new_context(**kw)
    ctx.add_init_script("if (!sessionStorage.getItem('set')) { sessionStorage.setItem('set','1'); localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); %s }" % setup)
    ctx.add_init_script(FAKE)
    if standalone: ctx.add_init_script("const mm = window.matchMedia.bind(window); window.matchMedia = (q) => /display-mode: *standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q);")
    if ua == IPHONE: ctx.add_init_script("Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.goto(URL); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo && !document.querySelector('#home').hidden", timeout=180000)
    return ctx, pg

def state(pg): return pg.evaluate("window.__ayo.install")
def offer(pg): pg.evaluate("window.__offer()"); pg.wait_for_timeout(300)
def toasts(pg): return pg.evaluate("[...document.querySelectorAll('.toast')].map((t) => t.textContent)")

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx, pg = open_(b, days(0), tag="first day"); offer(pg)
        check(not state(pg)["line"], "a first day: no line, even with the install question in hand"); ctx.close()

        ctx, pg = open_(b, days(2), tag="android"); offer(pg); s = state(pg)
        check(s["line"] and s["kind"] == "prompt" and s["offers"] == 1, "a second day: the line comes up (%s)" % s["kind"])
        pg.wait_for_timeout(1200); box = pg.evaluate("(() => { const r = document.querySelector('#installLine').getBoundingClientRect(); return [r.left, r.right, r.bottom, innerWidth, innerHeight]; })()")
        check(box[0] >= 0 and box[1] <= box[3] and box[2] <= box[4], "the line fits the phone (%d–%d of %d)" % (box[0], box[1], box[3]))
        pg.screenshot(path=out); print("picture", os.path.relpath(out, root))
        pg.click("#installGo"); pg.wait_for_timeout(500); s = state(pg)
        check(pg.evaluate("window.__asked") == 1 and s["done"] and not s["line"], "a tap asks the browser's own question; yes keeps it off for good")
        check(any("home screen" in t for t in toasts(pg)), "and says where it went")
        pg.reload(); pg.wait_for_function("window.__ayoUp === true && !document.querySelector('#home').hidden", timeout=180000); offer(pg)
        check(not state(pg)["line"], "never offered again after a reload"); ctx.close()

        ctx, pg = open_(b, days(3), tag="not now"); offer(pg); check(state(pg)["line"], "offered again on another phone")
        pg.click("#installNo"); pg.wait_for_timeout(300); check(not state(pg)["line"], "Not now puts it away")
        pg.reload(); pg.wait_for_function("window.__ayoUp === true && !document.querySelector('#home').hidden", timeout=180000); offer(pg)
        check(not state(pg)["line"] and state(pg)["offers"] == 1, "and it stays away after a reload"); ctx.close()

        ctx, pg = open_(b, days(2), ua=IPHONE, tag="iphone"); pg.wait_for_timeout(500); s = state(pg)
        check(s["line"] and s["kind"] == "ios", "an iPhone: the line comes up with no install question")
        pg.click("#installGo"); pg.wait_for_timeout(400)
        check(any("Add to Home Screen" in t for t in toasts(pg)) and not state(pg)["line"], "a tap says the Share steps"); ctx.close()

        ctx, pg = open_(b, days(4), standalone=True, tag="installed"); offer(pg)
        check(not state(pg)["line"], "the installed app never offers itself"); ctx.close()
        b.close()
    check(not errs, "no page error")

main()
