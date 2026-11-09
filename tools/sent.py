# The puzzle you were sent (idea 9 Nov): checks the daily puzzle's sent link in headless Chromium as a phone (390x844, touch).
#   1. a phone on Nchò opens an Ayo puzzle link of today (?puzzle=ayo&d=<today>): the puzzle screen says Ayo rules, the
#      position is Ayo's, the answer solves it and the day is kept under Ayo; Back to home is the phone's own Nchò again;
#   2. a link from another day (?puzzle=ncho&d=<yesterday>) opens today's puzzle and says "Sent on … · this is today's puzzle"
#      (the picture); in French too;
#   3. the old ?puzzle=1 and a spoiled link (?puzzle=constructor&d=2026-02-30) open the phone's own game, today, nothing said;
#   no page error anywhere.
# Usage: python3 tools/sent.py [picture.png]   (default docs/render-2026-11-09-sent.png)
import functools, http.server, os, sys, threading
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-sent.png"))
PORT = int(os.environ.get("PORT", "8796"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/web/index.html" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
TODAY = str(date.today()); YESTERDAY = str(date.today() - timedelta(days=1))
errs = []

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("sent: " + what + ((" · " + errs[0]) if errs else ""))

def open_(b, query, lang=None, tag="page"):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    ctx.add_init_script("if (!sessionStorage.getItem('set')) { sessionStorage.setItem('set','1'); localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); %s }" % (("localStorage.setItem('ayo.lang','%s');" % lang) if lang else ""))
    # every toast the page puts up, kept to be read after it has gone
    ctx.add_init_script("window.__toasts = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) setTimeout(() => window.__toasts.push(n.textContent), 50); }).observe(document, { childList: true, subtree: true });")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.goto(BASE + query); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo && window.__ayo.puzzle && window.__ayo.puzzle.on", timeout=180000)
    return ctx, pg

def tap(pg, pit):
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit); pg.mouse.click(x, y); pg.wait_for_timeout(300); pg.mouse.click(x, y)
def txt(pg, sel): return pg.evaluate("document.querySelector(%r).textContent" % sel)
def toasts(pg, wait=1600): pg.wait_for_timeout(wait); return pg.evaluate("window.__toasts")

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx, pg = open_(b, "?puzzle=ayo&d=%s" % TODAY, tag="ayo link")
        pz = pg.evaluate("window.__ayo.puzzle")
        check(pz["variant"] == "ayo" and pz["visit"] == "ayo" and pz["key"] == TODAY, "an Ayo link on a Nchò phone opens today's Ayo puzzle")
        check(txt(pg, "#pzRules") == "Ayo rules", "the puzzle screen says Ayo rules")
        check(not any("Sent on" in t for t in toasts(pg)), "today's link says nothing more")
        tap(pg, pz["answer"]); pg.wait_for_function("!window.__ayo.busy && window.__ayo.puzzle.played", timeout=240000); pg.wait_for_selector("#pzCard:not([hidden])", timeout=10000)
        check(pg.evaluate("window.__ayo.puzzle.got") >= pz["target"] and txt(pg, "#pzBadge").startswith("Solved"), "the answer solves it: " + txt(pg, "#pzBadge"))
        days = pg.evaluate("window.__ayo.puzzle.daily.days")
        check(("%s:ayo" % TODAY) in days and ("%s:ncho" % TODAY) not in days, "the day is kept under Ayo")
        pg.click("#pzHome"); pg.wait_for_function("!document.querySelector('#home').hidden", timeout=20000); pg.wait_for_timeout(400)
        pz = pg.evaluate("window.__ayo.puzzle")
        check(not pz["on"] and pz["visit"] is None and pz["variant"] == "ncho", "Back to home: the phone's own Nchò again")
        check(txt(pg, "#puzzleState") == "not yet played", "Home's card is Nchò's, not yet played: " + txt(pg, "#puzzleState"))
        pg.click("#puzzleCard"); pg.wait_for_function("window.__ayo.puzzle.on", timeout=10000)
        check(pg.evaluate("window.__ayo.puzzle.variant") == "ncho" and txt(pg, "#pzRules") == "Nchò rules", "the card opens Nchò's puzzle")
        ctx.close()

        ctx, pg = open_(b, "?puzzle=ncho&d=%s" % YESTERDAY, tag="yesterday")
        pg.wait_for_function("[...document.querySelectorAll('.toast')].some((t) => t.textContent.startsWith('Sent on'))", timeout=5000)
        pg.wait_for_timeout(250); pg.screenshot(path=out, animations="disabled")
        said = [t for t in toasts(pg, 200) if t.startswith("Sent on")]
        pz = pg.evaluate("window.__ayo.puzzle")
        check(pz["key"] == TODAY and pz["variant"] == "ncho", "yesterday's link opens today's puzzle")
        check(len(said) == 1 and said[0].endswith("· this is today's puzzle"), "and says so once: %s" % said)
        ctx.close()

        ctx, pg = open_(b, "?puzzle=ayo&d=%s&lang=fr" % YESTERDAY, lang="fr", tag="french")
        pg.wait_for_function("[...document.querySelectorAll('.toast')].some((t) => t.textContent.startsWith('Envoyée le'))", timeout=5000)
        said = [t for t in toasts(pg, 200) if "nvoy" in t or "Sent" in t]
        check(len(said) == 1 and said[0].endswith("voici l’énigme du jour") and pg.evaluate("window.__ayo.puzzle.variant") == "ayo", "in French: %s" % said)
        ctx.close()

        for q in ("?puzzle=1", "?puzzle=constructor&d=2026-02-30"):
            ctx, pg = open_(b, q, tag=q)
            pz = pg.evaluate("window.__ayo.puzzle")
            check(pz["variant"] == "ncho" and pz["visit"] is None and pz["key"] == TODAY and not any("Sent" in t for t in toasts(pg)), "%s opens the phone's own game, today" % q)
            ctx.close()
        b.close()
    srv.shutdown()
    check(not errs, "no page error" + (": " + "; ".join(errs) if errs else ""))
    print("wrote", out)

main()
