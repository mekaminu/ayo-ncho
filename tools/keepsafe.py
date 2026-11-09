# Kept safe (idea 9 Nov): checks in headless Chromium as a phone (390x844, touch) that
#   1. a first day with nothing finished asks the browser nothing, and Settings → New phone says a browser may clear it;
#   2. a second day played asks the browser once to keep the game for good (navigator.storage.persist, a stand-in here that
#      answers yes or no); a yes is said in Settings, and after a reload nothing is asked again;
#   3. a browser that said no is not asked again on the next visit (a month later it is);
#   4. a phone too full to keep the game (every save of it refused with QuotaExceededError): the first refused save of the visit
#      says so once, Settings says "not being kept · this phone is full", and once there is room again the next save is kept
#      and the line goes back; no page error anywhere.
# Usage: python3 tools/keepsafe.py [picture.png]   -> the picture (default docs/render-2026-11-09-keepsafe.png) is Settings → New phone
import functools, http.server, json, os, sys, threading
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-keepsafe.png"))
PORT = int(os.environ.get("PORT", "8797"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/web/index.html?stay=home" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []
# the browser's answer, kept across reloads in sessionStorage: ks.answer is what persist() says, ks.kept whether it was given
FAKE = """(() => { const S = sessionStorage; const g = (k, d) => S.getItem('ks.' + k) ?? d;
  const st = { persist: () => { S.setItem('ks.asked', String(+g('asked', 0) + 1)); const yes = g('answer', 'yes') === 'yes'; if (yes) S.setItem('ks.kept', '1'); return Promise.resolve(yes); },
               persisted: () => Promise.resolve(g('kept', '0') === '1'), estimate: () => Promise.resolve({ usage: 0, quota: 1e9 }) };
  Object.defineProperty(navigator, 'storage', { get: () => st, configurable: true });
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { if (this === localStorage && window.__full && k === 'ayo.game') throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); return set.call(this, k, v); };
  window.__toasts = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent); }).observe(document, { childList: true, subtree: true });
})();"""

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("kept safe: " + what + ((" · " + errs[0]) if errs else ""))

def days(n):
    from datetime import date, timedelta
    d = [str(date.today() - timedelta(days=i)) for i in range(n, 0, -1)]
    return "localStorage.setItem('ayo.streak', %s);" % json.dumps(json.dumps({"days": d, "seen": []}))

def open_(b, setup, answer="yes", tag="page"):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    ctx.add_init_script("if (!sessionStorage.getItem('set')) { sessionStorage.setItem('set','1'); sessionStorage.setItem('ks.answer', %s); localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); %s }" % (json.dumps(answer), setup))
    ctx.add_init_script(FAKE)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.goto(URL); up(pg)
    return ctx, pg

def up(pg): pg.wait_for_function("window.__ayoUp === true && !!window.__ayo && !document.querySelector('#home').hidden", timeout=180000); pg.wait_for_timeout(400)
def keep(pg): return pg.evaluate("window.__ayo.keep")
def asked(pg): return int(pg.evaluate("sessionStorage.getItem('ks.asked') || '0'"))
def ready(pg, t=150000): pg.wait_for_function("document.querySelector('#home').hidden && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0", timeout=t)

def move(pg):  # one move of ours and the computer's reply
    ready(pg); n = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    for _ in range(6):
        if not pg.evaluate("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % n): break
        pg.mouse.click(x, y); pg.wait_for_timeout(350)
    pg.wait_for_function("window.__ayo.state.over || (window.__ayo.state.moves.length >= %d && window.__ayo.state.turn === 0 && !window.__ayo.busy)" % (n + 2), timeout=150000)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx, pg = open_(b, days(0), tag="first day")
        k = keep(pg); check(asked(pg) == 0 and not k["persisted"] and k["supported"], "a first day with nothing finished: nothing asked")
        check("a browser may clear it" in (k["line"] or ""), "Settings says a browser may clear it: " + str(k["line"])); ctx.close()

        ctx, pg = open_(b, days(2), tag="second day")
        k = keep(pg); check(asked(pg) == 1 and k["persisted"] and k["granted"], "a second day: the browser asked once, and it said yes")
        pg.evaluate("document.querySelector('#homeSettings').click()"); pg.wait_for_selector("#settings:not([hidden])")
        pg.evaluate("document.querySelector('#keepRow').scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(700)
        check(pg.evaluate("document.querySelector('#keepNow').textContent").startswith("the browser has promised"), "Settings → New phone says the browser has promised")
        box = pg.evaluate("(() => { const r = document.querySelector('#keepRow').getBoundingClientRect(); return [r.left, r.right, innerWidth]; })()")
        check(box[0] >= 0 and box[1] <= box[2], "the row fits the phone (%d–%d of %d)" % tuple(box))
        pg.screenshot(path=out); print("picture", os.path.relpath(out, root))
        pg.reload(); up(pg); check(asked(pg) == 1 and keep(pg)["persisted"], "after a reload: kept, nothing asked again"); ctx.close()

        ctx, pg = open_(b, days(3), answer="no", tag="said no")
        k = keep(pg); check(asked(pg) == 1 and not k["persisted"] and k["asked"] > 0, "a browser that says no")
        pg.reload(); up(pg); check(asked(pg) == 1, "is not asked again on the next visit"); ctx.close()

        ctx, pg = open_(b, days(0), tag="full phone")
        pg.evaluate("window.__full = true")
        pg.evaluate("(async () => { const b = document.querySelector('#playBtn'); b.click(); await new Promise((r) => setTimeout(r, 300)); if (b.classList.contains('armed')) b.click(); })()")
        move(pg); pg.wait_for_timeout(300); k = keep(pg); t = pg.evaluate("window.__toasts")
        full = [x for x in t if x.startswith("This phone is full")]
        check(k["failing"] == "full" and k["fails"] >= 1, "a full phone: the save is refused (%d times)" % k["fails"])
        check(len(full) == 1, "and said once: " + str(full))
        check((k["line"] or "").startswith("not being kept · this phone is full"), "Settings says it is not being kept")
        move(pg); pg.wait_for_timeout(300)
        check(len([x for x in pg.evaluate("window.__toasts") if x.startswith("This phone is full")]) == 1, "not said again on the next move")
        pg.evaluate("window.__full = false"); move(pg); pg.wait_for_timeout(300); k = keep(pg)
        check(k["failing"] is None and pg.evaluate("!!localStorage.getItem('ayo.game')"), "with room again the game is kept and the line goes back")
        ctx.close(); b.close()
    check(not errs, "no page error")

main()
