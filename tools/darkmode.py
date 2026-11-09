# Dark mode leaves the board alone (idea 9 Nov, night): a phone's browser can be set to darken every website — Samsung
# Internet's own Dark mode (the Fold's own browser), Chrome on Android's "Darken websites" with the phone's dark theme — and
# the browser then repaints a page's colours itself, without asking the page: light things go dark, dark things go light, and
# images it judges to be icons are turned round. The game is already dark, so if the browser took it for a light page the
# opponents' faces would come out pale and washed (Adaeze's dark skin pink), the brass Play button's words white, the outlines
# of the pills gone. A page stops that by saying it is dark already (color-scheme: dark), which the browser reads when the
# phone asks for dark (prefers-color-scheme: dark), as both browsers do when they darken websites.
# This opens the real server's pages in headless Chromium with Chromium's own darkening switched on (the code Samsung Internet
# and Chrome share: --blink-settings=forceDarkModeEnabled=true) and the phone asking for dark, and in a plain browser, and checks:
#   1. Home, Settings (top and Feel), the Store, the daily puzzle, a game at its start, How to play, and the privacy, terms and
#      support pages are the same picture both ways (nothing repainted), at the phone (390x844) and on the Mac (1180x820);
#   2. the page says it is dark before anything is drawn: <meta name="color-scheme" content="dark"> and :root color-scheme: dark;
#   3. no page error.
# It also reports (never fails on) the one case a page cannot stop: a browser that darkens while telling the page the phone
# is light — what it would repaint, so a report from a phone can be matched to it.
# Usage: python3 tools/darkmode.py [picture.png]   -> the picture (default docs/render-2026-11-09-dark.png): Home plain | darkened
import os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-dark.png"))
tmp = os.path.join(os.environ.get("TMPDIR", "/tmp"), "ayo-dark"); os.makedirs(tmp, exist_ok=True)
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
# Playwright gives headless Chromium a mouse through the same switch (--blink-settings=…PointerType…), and a second
# --blink-settings replaces the first, so the mouse is said again here or the darkened browser would be a touch screen
DARKEN = "--blink-settings=forceDarkModeEnabled=true,primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4"
SAME = 0.002  # at most this share of pixels may differ (anti-aliasing at the board's edge); a repaint changes far more
errs = []

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p
PORT = int(os.environ.get("PORT", "0")) or free_port()
BASE = "http://127.0.0.1:%d" % PORT

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("darkmode: " + what + ((" · " + errs[0]) if errs else ""))

def page(ctx, tag):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    pg.route("https://fonts.gstatic.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg

def up(pg): pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
def home(pg):
    pg.goto(BASE + "/?capture=1&stay=home", wait_until="load"); up(pg)
    pg.wait_for_function("!document.querySelector('#home').hidden", timeout=30000)

# each screen: a name and how to get there; every one ends with the page still (the phone asks for less motion too)
def s_home(pg): home(pg)
def s_settings(pg): home(pg); pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
def s_feel(pg):
    s_settings(pg); pg.evaluate("document.querySelector('#physicsNow').closest('.row').scrollIntoView({ block: 'center' })")
def s_store(pg): home(pg); pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])")
def s_puzzle(pg): home(pg); pg.click("#puzzleCard")
def s_game(pg):
    pg.goto(BASE + "/?capture=1", wait_until="load"); up(pg)
    pg.wait_for_function("window.__ayo.state && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0", timeout=60000)
def s_rules(pg): s_game(pg); pg.click("#rulesBtn"); pg.wait_for_selector("#rules:not([hidden])")
def legal(name):
    def go(pg): pg.goto(BASE + "/" + name, wait_until="load")
    return go
SCREENS = [("Home", s_home), ("Settings", s_settings), ("Settings → Feel", s_feel), ("The Store", s_store), ("The daily puzzle", s_puzzle),
           ("A game at its start", s_game), ("How to play", s_rules), ("Privacy", legal("privacy")), ("Terms", legal("terms")), ("Support", legal("support"))]
SIZES = [("phone", {"width": 390, "height": 844, "touch": True}), ("Mac", {"width": 1180, "height": 820, "touch": False})]

def shoot(browser, size, scheme, tag):
    w = size[1]
    ctx = browser.new_context(viewport={"width": w["width"], "height": w["height"]}, has_touch=w["touch"], is_mobile=w["touch"],
                              color_scheme=scheme, reduced_motion="reduce", locale="en-GB")
    ctx.add_init_script("localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); localStorage.setItem('ayo.name','Meka');")
    pg = page(ctx, tag); shots = {}
    for name, go in SCREENS:
        go(pg); pg.wait_for_timeout(1500)
        # an opponent's word comes and goes by the clock, so one browser may catch it and the other not: put it away in both
        pg.evaluate("(() => { const b = document.querySelector('#bubble'); if (b) b.hidden = true; })()")
        f = os.path.join(tmp, "%s-%s-%s.png" % (tag, size[0], name.replace(" ", "_").replace("→", "")))
        pg.screenshot(path=f); shots[name] = f
        if name == "Home":
            meta = pg.evaluate("(document.querySelector('meta[name=color-scheme]') || {}).content || ''")
            css = pg.evaluate("getComputedStyle(document.documentElement).colorScheme")
            shots["_says"] = (meta, css)
        if name == "Privacy":
            shots["_legal"] = (pg.evaluate("(document.querySelector('meta[name=color-scheme]') || {}).content || ''"), pg.evaluate("getComputedStyle(document.documentElement).colorScheme"))
    ctx.close(); return shots

def differs(a, b):
    A = Image.open(a).convert("RGB"); B = Image.open(b).convert("RGB")
    if A.size != B.size: return 1.0, None
    d = ImageChops.difference(A, B).convert("L").point(lambda v: 255 if v > 24 else 0)
    box = d.getbbox(); n = sum(d.histogram()[255:]); return n / float(A.size[0] * A.size[1]), box

def main():
    srv = subprocess.Popen(["node", os.path.join(root, "server", "index.js")], env=dict(os.environ, PORT=str(PORT)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try: socket.create_connection(("127.0.0.1", PORT), 0.2).close(); break
            except OSError: time.sleep(0.1)
        with sync_playwright() as p:
            plain = p.chromium.launch(args=GL); dark = p.chromium.launch(args=GL + [DARKEN])
            home_pair = None; light_report = []
            for size in SIZES:
                a = shoot(plain, size, "dark", "plain"); b = shoot(dark, size, "dark", "darkened")
                if size[0] == "phone":
                    check(a["_says"][0] == "dark", "the game says it is dark before anything is drawn (<meta name=color-scheme content=%r>)" % a["_says"][0])
                    check(a["_says"][1] == "dark", "…and its own colours say so too (:root color-scheme: %r)" % a["_says"][1])
                    check(a["_legal"] == ("dark", "dark"), "the privacy, terms and support pages say so as well (%r)" % (a["_legal"],))
                for name, _ in SCREENS:
                    share, box = differs(a[name], b[name])
                    check(share <= SAME, "%s, %s: the same picture with the browser darkening websites (%.2f%% of pixels differ)" % (name, size[0], share * 100))
                if size[0] == "phone": home_pair = (a["Home"], b["Home"])
                if size[0] == "phone":
                    c = shoot(dark, size, "light", "lightpref")
                    for name, _ in SCREENS:
                        share, box = differs(a[name], c[name])
                        if share > SAME: light_report.append("%s %.1f%%" % (name, share * 100))
            plain.close(); dark.close()
        A = Image.open(home_pair[0]); B = Image.open(home_pair[1]); w, h = A.size
        pic = Image.new("RGB", (w * 2 + 12, h), (13, 9, 6)); pic.paste(A, (0, 0)); pic.paste(B, (w + 12, 0))
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True); pic.save(out)
        print("note a browser that darkens while telling the page the phone is light (no page can stop it) would repaint: " + (", ".join(light_report) or "nothing"))
    finally:
        srv.terminate()
    check(not errs, "no page error" + ("" if not errs else ": " + "; ".join(errs[:3])))
    print("darkmode: every screen keeps its own colours when the browser darkens websites (%s)" % os.path.relpath(out, root))

main()
