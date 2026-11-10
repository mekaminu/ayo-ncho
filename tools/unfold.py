# The Fold opens, the board glides (idea 10 Nov). Opens the game in headless Chromium as the Fold folded (390x760, touch), plays
# a move, then changes the screen's shape the ways a phone does and checks that
#   1. opening the Fold (to 832x690, the wide layout) glides the board: the first frame is the board as it was seen, the frames
#      after it lie between the two views, and it comes to rest exactly at the new framing (the tilt and distance it chose);
#   2. every pit is still where a tap lands on it once it rests, and a move plays there;
#   3. the browser's bar or the keyboard (height only) reframes at once, with no glide;
#   4. closing it again glides back; a phone turned on its side (844x390) glides its quarter turn; a finger on the board stops a glide;
#   5. with Reduce motion on, a change of shape reframes at once;
#   6. no page error.
# Usage: python3 tools/unfold.py [picture.png]  -> the picture (default docs/render-2026-11-10-unfold.png): the Fold opening, three
#        moments of the glide side by side (slowed for the picture with window.__unfoldPace)
import functools, http.server, math, os, sys, threading
from playwright.sync_api import sync_playwright
from PIL import Image
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-10-unfold.png"))
PORT = int(os.environ.get("PORT", "8797"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/web/index.html?capture=1" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("unfold: " + what + ((" · " + errs[0]) if errs else ""))

def page(ctx):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e).split("\n")[0]))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg

def ready(pg, t=150000): pg.wait_for_function("document.querySelector('#home').hidden && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0 && window.__ayo.tweens === 0", timeout=t)
def cam(pg): return pg.evaluate("window.__ayo.cam")
def logn(pg): return len(pg.evaluate("window.__ayo.unfold.log"))
def near(a, b, eps=1e-3): return all(abs(a[k] - b[k]) <= eps * max(1, abs(b[k])) for k in ("theta", "phi", "dist", "x", "y"))
def between(v, a, b, k): lo, hi = min(a[k], b[k]), max(a[k], b[k]); return lo - 1e-6 <= v[k] <= hi + 1e-6

def move(pg):
    ready(pg); n = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    for _ in range(6):
        if not pg.evaluate("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % n): break
        pg.mouse.click(x, y); pg.wait_for_timeout(350)
    pg.wait_for_function("window.__ayo.state.over || (window.__ayo.state.moves.length >= %d && window.__ayo.state.turn === 0 && !window.__ayo.busy)" % (n + 2), timeout=150000)

def reshape(pg, w, h, samples=0, gap=60):
    before = logn(pg); pg.set_viewport_size({"width": w, "height": h}); seen = []
    for _ in range(samples): seen.append(cam(pg)); pg.wait_for_timeout(gap)
    pg.wait_for_function("window.__ayo.tweens === 0", timeout=20000); pg.wait_for_timeout(120)
    log = pg.evaluate("window.__ayo.unfold.log"); return (log[-1] if len(log) > before else None), seen

def glide_ok(pg, what, w, h):
    e, seen = reshape(pg, w, h, samples=8, gap=45)
    check(e is not None, what + ": the board glides")
    a, b = e["start"], e["end"]; moved = [v for v in seen if not near(v, b)]
    check(all(all(between(v, a, b, k) for k in ("phi", "x", "y")) and min(a["dist"], b["dist"]) * 0.999 <= v["dist"] <= max(a["dist"], b["dist"]) * 1.001 for v in seen), what + ": every frame of it lies between the two views")
    check(len(moved) >= 2, what + ": it takes its time (%d of %d frames on the way)" % (len(moved), len(seen)))
    end = cam(pg); look = pg.evaluate("window.__ayo.look")
    check(near(end, b) and abs(end["phi"] - look["fitPhi"]) < 1e-6 and abs(end["dist"] - look["fitDist"]) < 1e-6, what + ": it rests at the new framing")
    return e

def pits_ok(pg, what):
    bad = pg.evaluate("[...Array(12).keys()].filter((i) => { const [x, y] = window.__ayo.pitAt(i); return !window.__ayo.hitTest(x, y).includes(i) || x < 0 || y < 0 || x > innerWidth || y > innerHeight; })")
    check(not bad, what + ": every pit is where a tap lands on it" + ((" (not %s)" % bad) if bad else ""))

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx = b.new_context(viewport={"width": 390, "height": 760}, has_touch=True, is_mobile=True, device_scale_factor=1)
        ctx.add_init_script("localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done');")
        pg = page(ctx); pg.goto(URL)
        pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
        pg.evaluate("(async () => { const b = document.querySelector('#playBtn'); b.click(); await new Promise((r) => setTimeout(r, 300)); if (b.classList.contains('armed')) b.click(); })()")
        move(pg); ready(pg)
        was = cam(pg)
        e = glide_ok(pg, "1. the Fold opened (390x760 to 832x690)", 832, 690)
        check(near(e["start"], {**was, "theta": e["start"]["theta"]}) and abs(math.cos(e["start"]["theta"]) - math.cos(was["theta"])) < 1e-6, "1. it starts from the board as it was seen")
        pits_ok(pg, "2. open"); move(pg); check(True, "2. a move plays on the opened Fold")
        e2, _ = reshape(pg, 832, 640)
        check(e2 is None, "3. the browser's bar (height only): reframed at once, no glide"); pits_ok(pg, "3. after the bar")
        glide_ok(pg, "4. the Fold closed again", 390, 760); pits_ok(pg, "4. closed")
        e4 = glide_ok(pg, "4. a phone on its side (844x390)", 844, 390)
        check(abs(e4["start"]["theta"] - e4["end"]["theta"]) > 1.0, "4. on its side: the quarter turn is part of the glide")
        pits_ok(pg, "4. on its side")
        # a finger on the board stops a glide where it is
        pg.evaluate("window.__unfoldPace = 6"); pg.set_viewport_size({"width": 390, "height": 760}); pg.wait_for_timeout(500)
        pg.mouse.move(12, 380); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(60)  # wood at the screen's edge, no pit
        held = cam(pg); pg.wait_for_timeout(400)
        now = cam(pg); check(all(abs(now[k] - held[k]) < 1e-6 for k in ("theta", "phi", "dist")) and not near(now, e4["end"]), "4. a finger on the board stops the glide where it is")
        pg.wait_for_function("window.__ayo.tweens === 0", timeout=20000); pg.evaluate("window.__unfoldPace = 1")
        reshape(pg, 844, 390); reshape(pg, 390, 760); ready(pg)  # straight again: a change through the wide layout faces you

        # the picture: the Fold opening, slowed, three moments side by side
        pg.evaluate("window.__unfoldPace = 5"); shots = []
        pg.set_viewport_size({"width": 832, "height": 690})
        for k in range(3):
            path = out + ".%d.png" % k; pg.screenshot(path=path); shots.append(path); pg.wait_for_timeout(700)
        pg.wait_for_function("window.__ayo.tweens === 0", timeout=150000); pg.evaluate("window.__unfoldPace = 1")
        last = out + ".3.png"; pg.screenshot(path=last); shots.append(last)
        ims = [Image.open(s).convert("RGB") for s in (shots[0], shots[2], shots[3])]
        W = sum(i.width for i in ims) + 16 * (len(ims) - 1); H = max(i.height for i in ims)
        sheet = Image.new("RGB", (W, H), (20, 14, 10)); x = 0
        for i in ims: sheet.paste(i, (x, 0)); x += i.width + 16
        sheet = sheet.resize((W // 2, H // 2), Image.LANCZOS); sheet.save(out)
        for s in shots: os.remove(s)

        # 5. Reduce motion
        ctx2 = b.new_context(viewport={"width": 390, "height": 760}, has_touch=True, is_mobile=True, reduced_motion="reduce")
        ctx2.add_init_script("localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done');")
        q = page(ctx2); q.goto(URL + "&stay=home"); q.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
        q.wait_for_timeout(300); n0 = logn(q); q.set_viewport_size({"width": 832, "height": 690}); q.wait_for_timeout(400)
        check(logn(q) == n0 and q.evaluate("window.__ayo.unfold.prev.w") == 832, "5. Reduce motion: the new shape is framed at once")
        check(not errs, "6. no page error" + ((": " + "; ".join(errs)) if errs else ""))
        b.close()
    srv.shutdown(); print("picture:", os.path.relpath(out, root)); print("the Fold opens, the board glides")

main()
