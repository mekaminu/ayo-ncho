# Still, if you ask (idea 9 Nov, night): a phone set to "Remove animations" / "Reduce motion" tells the page so
# (prefers-reduced-motion), and the game promises that then nothing moves for longer than a glance: seeds go straight to their
# pits, the board stops turning behind Home, pulses and bounces hold still, the faces stop blinking. This opens the game in
# headless Chromium as a phone (390x844, touch) with the setting on and checks, on every screen and through real moves:
#   1. Home, With friends, Settings, the Store, the daily puzzle, How to play: nothing on the page runs a CSS animation or
#      transition longer than 300 ms, or for ever (web/still.js restless), and the board behind Home does not turn;
#   2. a move and the computer's reply: sampled every 80 ms while the seeds move, nothing restless; the turn is quick;
#   3. Settings → Feel → Seed physics says the seeds fly straight because the phone asks for less motion;
#   4. the setting changed with the game open (no reload): turned on, the board behind Home stops turning and the line says so;
#      turned off, it turns again — the page follows the phone, it does not wait to be opened again;
#   5. no page error anywhere.
# Usage: python3 tools/still.py [picture.png]   -> the picture (default docs/render-2026-11-09-still.png) is Settings → Feel, still
import functools, http.server, json, os, sys, threading, time
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-still.png"))
PORT = int(os.environ.get("PORT", "8795"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/web/index.html" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []; found = []

# what is moving on the page now, judged by web/still.js
SAMPLE = r"""async () => {
  const { restless } = await import('/web/still.js');
  const name = (e) => { if (!e || !e.tagName) return '?'; let s = e.tagName.toLowerCase(); if (e.id) return s + '#' + e.id;
    if (typeof e.className === 'string' && e.className.trim()) s += '.' + e.className.trim().split(/\s+/).join('.'); const p = e.closest('[id]'); return p && p !== e ? '#' + p.id + ' ' + s : s; };
  const all = document.getAnimations().map((x) => { const t = x.effect && x.effect.getComputedTiming ? x.effect.getComputedTiming() : {};
    return { who: name(x.effect && x.effect.target), kind: x.transitionProperty !== undefined ? 'transition' : 'animation', name: x.animationName || x.transitionProperty || '',
      duration: t.duration, iterations: t.iterations === Infinity ? 'Infinity' : t.iterations, playState: x.playState }; });
  return restless(all);
}"""

def page(ctx, tag):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg

def up(pg): pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
def home(pg, extra=""): pg.goto(BASE + "?capture=1&stay=home" + extra, wait_until="load"); up(pg); pg.wait_for_function("!document.querySelector('#home').hidden", timeout=30000)

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("still: " + what + ((" · " + errs[0]) if errs else ""))

def calm(pg, where, settle=900):
    pg.wait_for_timeout(settle); r = pg.evaluate(SAMPLE)
    for k in r: found.append((where, k))
    check(not r, "%s: nothing moves past a glance%s" % (where, "" if not r else " — " + "; ".join("%s %s %s (%s ms)" % (k["kind"], k["name"], k["who"], k["ms"]) for k in r[:4])))

def turning(pg, ms=1200):
    a = pg.evaluate("window.__ayo.theta"); pg.wait_for_timeout(ms); b = pg.evaluate("window.__ayo.theta"); return abs(b - a)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2, reduced_motion="reduce", locale="en-GB")
        ctx.add_init_script("if (!localStorage.getItem('ayo.lesson')) { localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); localStorage.setItem('ayo.name','Meka'); }")
        pg = page(ctx, "still")
        home(pg)
        st = pg.evaluate("window.__ayo.still"); check(st["reduce"] is True, "the page hears the phone asking for less motion")
        d = turning(pg); check(d < 1e-6, "the board behind Home holds still (turned %.5f rad in 1.2 s)" % d)
        calm(pg, "Home")
        pg.click("#friendsBtn"); pg.wait_for_timeout(600)
        if pg.evaluate("!document.querySelector('#nameCard').hidden"): pg.fill("#nameField", "Meka"); pg.click("#nameGo")
        calm(pg, "With friends", 1500)
        home(pg); pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])"); calm(pg, "Store")
        home(pg); pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])"); calm(pg, "Settings")
        line = pg.evaluate("document.querySelector('#physicsNow').textContent")
        check(line == "now off (your phone asks for less motion)", "Settings → Feel → Seed physics says why the seeds fly straight (%r)" % line)
        pg.evaluate("document.querySelector('#physicsNow').closest('.row').scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(300)
        os.makedirs(os.path.dirname(out) or ".", exist_ok=True); pg.screenshot(path=out)
        home(pg); pg.click("#puzzleCard"); pg.wait_for_timeout(1500); calm(pg, "The daily puzzle")

        # a game: a move and the reply, sampled while it moves
        pg.goto(BASE + "?capture=1", wait_until="load"); up(pg)
        pg.wait_for_function("window.__ayo.state && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0", timeout=60000)
        pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
        t0 = time.time(); pg.mouse.click(x, y); pg.wait_for_timeout(300)
        if pg.evaluate("window.__ayo.state.moves.length === 0 && !window.__ayo.busy"): pg.mouse.click(x, y)
        moving = []
        while time.time() - t0 < 120:
            r = pg.evaluate(SAMPLE); moving += r
            if pg.evaluate("window.__ayo.state.moves.length >= 2 && window.__ayo.state.turn === 0 && !window.__ayo.busy"): break
            pg.wait_for_timeout(80)
        took = time.time() - t0
        check(pg.evaluate("window.__ayo.state.moves.length >= 2"), "a move and the computer's reply are played (%.1f s with the seeds going straight)" % took)
        seen = sorted({"%s %s %s" % (k["kind"], k["name"], k["who"]) for k in moving})
        for k in moving: found.append(("A move and the reply", k))
        check(not moving, "a move and the reply: nothing moves past a glance while the seeds go%s" % ("" if not seen else " — " + "; ".join(seen[:4])))
        calm(pg, "The board after the reply", 1200)
        pg.click("#rulesBtn"); pg.wait_for_selector("#rules:not([hidden])"); calm(pg, "How to play")
        ctx.close()

        # the setting changed with the game open
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, reduced_motion="no-preference", locale="en-GB")
        ctx.add_init_script("localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done');")
        pg = page(ctx, "live")
        home(pg)
        check(pg.evaluate("window.__ayo.still.reduce") is False, "a phone not asking: the page moves as drawn")
        d = turning(pg); check(d > 1e-3, "the board behind Home turns slowly (%.4f rad in 1.2 s)" % d)
        pg.emulate_media(reduced_motion="reduce"); pg.wait_for_function("window.__ayo.still.changes >= 1", timeout=15000)  # heard at the next frame the phone can spare
        st = pg.evaluate("window.__ayo.still"); check(st["reduce"] is True and st["changes"] == 1, "turned on with the game open, the page hears it at once (no reload)")
        d = turning(pg); check(d < 1e-6, "…and the board behind Home stops turning (%.5f rad)" % d)
        check(pg.evaluate("document.querySelector('#physicsNow').textContent") == "now off (your phone asks for less motion)", "…and Seed physics says the seeds fly straight")
        calm(pg, "Home, just turned still")
        pg.emulate_media(reduced_motion="no-preference"); pg.wait_for_function("window.__ayo.still.changes >= 2", timeout=15000)
        st = pg.evaluate("window.__ayo.still"); check(st["reduce"] is False and st["changes"] == 2 and st["log"] == [True, False], "turned off again, the page hears that too")
        d = turning(pg); check(d > 1e-3, "…and the board turns again (%.4f rad)" % d)
        ln = pg.evaluate("document.querySelector('#physicsNow').textContent"); check("less motion" not in ln, "…and Seed physics says its own reason again (%r)" % ln)
        ctx.close(); b.close()
    check(not errs, "no page error" + ("" if not errs else ": " + "; ".join(errs[:3])))
    print("still: every screen keeps still when asked, and follows the phone's setting live")

main()
