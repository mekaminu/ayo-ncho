# Tell us what went wrong (idea 9 Nov): checks in headless Chromium as a phone (390x844, touch) that
#   1. Settings → Something wrong? says nothing has gone wrong on a fresh visit, and the row fits the phone;
#   2. an error thrown in the page (its message carrying an address with a room code) is noted: the row counts it;
#   3. Send with no share sheet copies one block of text: the build, the phone, the screen, the board, the game, the trouble
#      counted — and never the room code; with a share sheet (a stand-in here) the same text goes to it;
#   4. in French the row and the toast are French (the block stays English, for whoever fixes the game).
# Usage: python3 tools/report.py [picture.png]   -> the picture (default docs/render-2026-11-09-report.png) is Settings → Something wrong?
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-report.png"))
PORT = int(os.environ.get("PORT", "8798"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/web/index.html?stay=home" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []
SPY = """(() => { window.__toasts = []; window.__clip = null; window.__shared = null;
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent); }).observe(document, { childList: true, subtree: true });
  try { Object.defineProperty(navigator, 'clipboard', { get: () => ({ writeText: (t) => { window.__clip = t; return Promise.resolve(); } }), configurable: true }); } catch (e) {}
  if (sessionStorage.getItem('share') === '1') navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; else { try { delete Navigator.prototype.share; } catch (e) {} navigator.share = undefined; }
})();"""

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("report: " + what)

def open_(b, lang="en", share=False, tag="page"):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    ctx.add_init_script("sessionStorage.setItem('share', '%s'); localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); localStorage.setItem('ayo.lang','%s');" % ("1" if share else "0", lang))
    ctx.add_init_script(SPY)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.goto(URL); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo && !document.querySelector('#home').hidden", timeout=180000); pg.wait_for_timeout(400)
    return ctx, pg

def settings(pg):
    pg.evaluate("document.querySelector('#homeSettings').click()"); pg.wait_for_selector("#settings:not([hidden])")
    pg.evaluate("document.querySelector('#reportGroup').scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(700)

BOOM = "setTimeout(() => { throw new Error('test boom at https://ayo-ncho.onrender.com/ws?room=QZXV') }, 0)"

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx, pg = open_(b, tag="english")
        settings(pg); r = pg.evaluate("window.__ayo.report")
        check(r["count"] == 0 and r["row"] == "nothing has gone wrong since the game opened", "a fresh visit: nothing has gone wrong · " + str(r["row"]))
        box = pg.evaluate("(() => { const r = document.querySelector('#reportGroup').getBoundingClientRect(), b = document.querySelector('#reportSend').getBoundingClientRect(); return [r.left, r.right, b.right, innerWidth]; })()")
        check(box[0] >= 0 and box[1] <= box[3] and box[2] <= box[3], "the row and its button fit the phone (%d–%d, button to %d, of %d)" % tuple(box))
        pg.evaluate(BOOM); pg.wait_for_timeout(300); errs.clear()  # the thrown error is ours
        r = pg.evaluate("window.__ayo.report")
        check(r["count"] == 1 and r["row"] == "the game has met 1 problem since it opened", "an error is noted and counted · " + str(r["row"]))
        check("QZXV" not in r["notes"][0]["m"], "the note keeps no room code: " + r["notes"][0]["m"])
        pg.screenshot(path=out); print("picture", os.path.relpath(out, root))
        pg.evaluate("document.querySelector('#reportSend').click()"); pg.wait_for_timeout(500)
        clip = pg.evaluate("window.__clip") or ""
        for w in ["Ayo & Nchò — what went wrong", "Build: ", "Phone: ", "Screen: 390×844", "Board: ", "Game: ", "Trouble (1):", "test boom at ws"]:
            check(w in clip, "the copied block holds " + repr(w))
        check("QZXV" not in clip, "and never the room code")
        check(any(t.startswith("Copied — paste it") for t in pg.evaluate("window.__toasts")), "and says it was copied")
        print(clip); ctx.close()

        ctx, pg = open_(b, share=True, tag="share sheet")
        settings(pg); pg.evaluate("document.querySelector('#reportSend').click()"); pg.wait_for_timeout(500)
        sh = pg.evaluate("window.__shared")
        check(bool(sh) and "Trouble: none seen" in sh["text"] and sh["title"] == "Ayo & Nchò", "with a share sheet the block goes to it")
        check(any(t.startswith("Shared — add a line") for t in pg.evaluate("window.__toasts")), "and says it was shared"); ctx.close()

        ctx, pg = open_(b, lang="fr", tag="french")
        settings(pg)
        g = pg.evaluate("document.querySelector('#reportGroup .eyebrow').textContent"); check(g.replace("\xa0", " ").replace("\u202f", " ") == "Un souci ?", "French: the group is Un souci ? · " + repr(g))
        check(pg.evaluate("document.querySelector('#reportNow').textContent").startswith("rien ne s’est mal passé"), "French: the row's line")
        pg.evaluate("document.querySelector('#reportSend').click()"); pg.wait_for_timeout(500)
        check(any(t.startswith("Copié") for t in pg.evaluate("[...document.querySelectorAll('.toast')].map((t) => t.textContent)")), "French: the toast")
        check((pg.evaluate("window.__clip") or "").startswith("Ayo & Nchò — what went wrong"), "French: the block stays English")
        ctx.close(); b.close()
    check(not errs, "no page error " + str(errs[:2]))

main()
