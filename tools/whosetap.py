# A tap that says whose move (idea 10 Nov, night). Opens the game in headless Chromium as the Fold folded (390x760) and checks:
#   1. on your move, a tap on a pit on their side shakes it, sweeps your pits' glow along the row again and the line says
#      "that's their side · your pits are the lit ones" (no move played);
#   2. while they think, a tap on a pit pulses their card and the line names whose move it is;
#   3. coming back to the page after a while on your move sweeps the glow once (a glance away does not);
#   4. in French, the line is French; and on the Mac a key (1-6, Enter) pressed while they think answers as a tap does;
#   5. no page error.
# Usage: python3 tools/whosetap.py [picture.png]  -> the picture (default docs/render-2026-11-10-whosetap.png): the tap on their
#        side with the glow sweeping, and the tap while they think
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright
from PIL import Image
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-10-whosetap.png"))
PORT = int(os.environ.get("PORT", "8798"))
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

def their_tap(pg):
    ready(pg); n = pg.evaluate("window.__ayo.state.moves.length"); before = len(taps(pg))
    theirs = pg.evaluate("[0,1,2,3,4,5,6,7,8,9,10,11].filter((i) => !window.__ayo.legal.includes(i) && window.__ayo.state.pits[i] > 0 && i >= 6)")
    check(len(theirs) > 0, "a pit on their side to tap")
    x, y = at(pg, theirs[0]); pg.mouse.click(x, y); pg.wait_for_timeout(120)
    t = taps(pg); check(len(t) == before + 1 and t[-1].get("tap") == "theirs", "a tap on their pit on your move answers ('theirs')")
    check(pg.evaluate("window.__ayo.state.moves.length") == n, "no move played")
    return pg.evaluate("window.__ayo.turnCue")

def open_game(ctx, q=""):
    pg = page(ctx); pg.goto(URL + q); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
    pg.evaluate("(async () => { const b = document.querySelector('#playBtn'); b.click(); await new Promise((r) => setTimeout(r, 300)); if (b.classList.contains('armed')) b.click(); })()")
    ready(pg); pg.wait_for_timeout(600); return pg

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    ctx = b.new_context(viewport={"width": 390, "height": 760}, device_scale_factor=1)
    ctx.add_init_script("try { localStorage.setItem('ayo.lesson', 'done'); localStorage.setItem('ayo.tutorial', '3'); } catch (e) {}")
    pg = open_game(ctx)
    cue = their_tap(pg)
    hint = pg.evaluate("document.querySelector('#hint').textContent")
    check(hint == "that's their side · your pits are the lit ones", "the line says which pits are yours: " + hint)
    pg.wait_for_timeout(260); shot1 = "/tmp/whosetap-1.png"; pg.screenshot(path=shot1)
    pg.wait_for_timeout(600); check(len(pg.evaluate("window.__ayo.turnCue.lit")) > 0, "your pits glow again after the sweep")

    # a glance away does not sweep; a while away does
    before = len(taps(pg))
    pg.evaluate("dispatchEvent(new Event('blur')); dispatchEvent(new Event('focus'))"); pg.wait_for_timeout(100)
    check(len(taps(pg)) == before, "a glance away: no sweep")
    pg.evaluate("dispatchEvent(new Event('blur')); window.__ayo.whoseAway(20000); dispatchEvent(new Event('focus'))"); pg.wait_for_timeout(100)
    t = taps(pg); check(len(t) == before + 1 and t[-1].get("back") == "focus", "back after a while on your move: the glow sweeps once")

    # their move: play a pit, then tap while they think (try a few turns: the computer can be quick)
    seen = False
    for _ in range(6):
        ready(pg); n = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]"); x, y = at(pg, pit)
        for _ in range(4):
            if pg.evaluate("window.__ayo.state.moves.length !== %d || window.__ayo.busy" % n): break
            pg.mouse.click(x, y); pg.wait_for_timeout(250)
        try: pg.wait_for_function("window.__ayo.turnCue.side === 'far' && !window.__ayo.hurry.playing && window.__ayo.state.turn === 1", timeout=60000, polling=10)
        except Exception: continue
        before = len(taps(pg)); fx, fy = at(pg, 8); pg.mouse.click(fx, fy); h0 = pg.evaluate("[document.querySelector('#hint').textContent, document.querySelector('.hud.top').classList.contains('poke')]"); shot2 = "/tmp/whosetap-2.png"; pg.screenshot(path=shot2)
        t = taps(pg)
        if len(t) == before + 1 and t[-1].get("tap") == "wait":
            seen = True; hint, poke = h0
            break
        if pg.evaluate("window.__ayo.state.over"): break
    check(seen, "a tap while they think answers ('wait')")
    check(hint.endswith("'s move · your pits light up when it's yours"), "the line names whose move: " + hint)
    check(poke, "their card pulses")

    # the keys on the Mac ask too: 1-6 or Enter while they think
    seen = False
    for key in ["3", "Enter", "1", "Enter", "2", "Enter"]:
        if pg.evaluate("window.__ayo.state.over"): break
        ready(pg); n = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]"); x, y = at(pg, pit)
        for _ in range(4):
            if pg.evaluate("window.__ayo.state.moves.length !== %d || window.__ayo.busy" % n): break
            pg.mouse.click(x, y); pg.wait_for_timeout(250)
        try: pg.wait_for_function("window.__ayo.turnCue.side === 'far' && !window.__ayo.hurry.playing && window.__ayo.state.turn === 1", timeout=60000, polling=10)
        except Exception: continue
        before = len(taps(pg)); pg.keyboard.press(key); t = taps(pg)
        if len(t) == before + 1 and t[-1].get("tap") == "wait": seen = key; break
    check(bool(seen), "a key while they think answers ('wait'): " + str(seen))
    pg.close()

    fr = open_game(ctx, "&lang=fr"); their_tap(fr)
    hint = fr.evaluate("document.querySelector('#hint').textContent")
    check(hint == "c’est le côté d’en face · les vôtres sont ceux qui brillent", "in French: " + hint)
    fr.close()
    check(not errs, "no page error" + ((": " + errs[0]) if errs else ""))
    b.close()

a, c = Image.open(shot1), Image.open(shot2)
pic = Image.new("RGB", (a.width + c.width + 24, max(a.height, c.height)), (18, 12, 8)); pic.paste(a, (0, 0)); pic.paste(c, (a.width + 24, 0)); pic.save(out)
print("picture:", out)
