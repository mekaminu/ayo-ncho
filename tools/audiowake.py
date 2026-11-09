# The sound comes back (idea 9 Nov): checks in headless Chromium as a phone (390x844, touch) that
#   1. the board's audio, made by a first tap, is running;
#   2. put to sleep (as a call or another app's music does), the next tap wakes it — and the board's sounds play on it;
#   3. closed by the browser, it is made again in the next tap and runs, and the game goes on with no page error.
# (Chromium has no "interrupted" state of its own: that one, an iPhone's, is checked in test/audiowake.test.js.)
# Usage: python3 tools/audiowake.py
import functools, http.server, os, threading
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
PORT = int(os.environ.get("PORT", "8799"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/web/index.html?stay=home" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=user-gesture-required"]
errs = []

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("audiowake: " + what)

def tap(pg):  # a real tap on the page (a gesture), on Settings' own title, which does nothing
    tap_on(pg, "#settings .setHead h2")

def tap_on(pg, sel):
    r = pg.evaluate("(() => { const b = document.querySelector('%s').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()" % sel)
    pg.touchscreen.tap(r[0], r[1]); pg.wait_for_timeout(500)

def loud(pg, v):
    pg.evaluate("document.querySelector('#volumeRow').scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(300)
    tap_on(pg, '[data-set="volume"] [data-v="%s"]' % v)
    pg.evaluate("document.querySelector('#settings .setHead').scrollIntoView({ block: 'start' })"); pg.wait_for_timeout(300)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        ctx.add_init_script("localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done');")
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e).split("\n")[0]))
        pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
        if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
        pg.goto(URL); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo && !document.querySelector('#home').hidden", timeout=180000); pg.wait_for_timeout(400)
        tap_on(pg, "#homeSettings"); loud(pg, "loud")  # Settings → Sound level plays a handful of seeds: the audio is made in a real tap
        w = pg.evaluate("window.__ayo.audioWake")
        check(w["state"] == "running", "the board's audio runs after a first tap · " + str(w["state"]))
        pg.evaluate("window.__ayo.audioSleep()"); pg.wait_for_timeout(200)
        check(pg.evaluate("window.__ayo.audioWake.state") == "suspended", "put to sleep, as a call does")
        tap(pg); w = pg.evaluate("window.__ayo.audioWake")
        check(w["state"] == "running" and w["resumes"] >= 1 and w["rebuilds"] == 0, "the next tap wakes it · %s, %d wake, %d made again" % (w["state"], w["resumes"], w["rebuilds"]))
        pg.evaluate("window.__ayo.audioClose()"); pg.wait_for_timeout(200)
        check(pg.evaluate("window.__ayo.audioWake.state") == "closed", "closed, as a browser may do")
        tap(pg); w = pg.evaluate("window.__ayo.audioWake")
        check(w["state"] == "running" and w["rebuilds"] == 1, "the next tap makes it again and it runs · %s, %d made again" % (w["state"], w["rebuilds"]))
        loud(pg, "normal")
        check(pg.evaluate("window.__ayo.audioWake.state") == "running", "the buttons' sounds play on the new one")
        check(not errs, "no page errors: " + "; ".join(errs))
        b.close()
    print("audiowake: all good")

main()
