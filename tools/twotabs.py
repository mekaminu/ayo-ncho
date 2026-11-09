# Two tabs, one game (idea 9 Nov): the game against the computer is kept in the browser's storage, shared by every tab of the
# game on one phone or Mac. This opens two tabs of the game in one headless Chromium (one browser, so one storage, as a phone,
# 390x844, touch) and plays across them the way it happens: a game in tab A; the link opened again (tab B) and the game
# continued there; back to tab A. It checks that
#   1. tab A follows: its board is the game tab B played on (the same moves), with "Picked up from your other tab" said;
#   2. a move in tab A is followed by tab B in turn, and the computer's replies are not doubled or lost;
#   3. tab A out of sight never writes over tab B's newer game (its own save is held back, and it follows when it is back);
#   4. the game finished in the other tab takes this tab back to Home with "That game ended in your other tab";
#   5. no page error anywhere.
# Usage: python3 tools/twotabs.py [picture.png]   -> the picture (default docs/render-2026-11-09-twotabs.png) is tab A as it follows
import functools, http.server, json, os, sys, threading
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-twotabs.png"))
PORT = int(os.environ.get("PORT", "8793"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/web/index.html?capture=1&stay=home" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []

def page(ctx, tag):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    pg.add_init_script("""(() => { window.__toasts = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent); }).observe(document, { childList: true, subtree: true }); })();
    window.addEventListener('storage', (e) => { if (window.__deaf) e.stopImmediatePropagation(); }); // before the game's own: a frozen tab hears nothing""")
    return pg

def up(pg): pg.wait_for_function("window.__ayoUp === true && !!window.__ayo && !document.querySelector('#home').hidden", timeout=180000)
def ready(pg, t=150000): pg.wait_for_function("document.querySelector('#home').hidden && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0", timeout=t)
def moves(pg): return pg.evaluate("window.__ayo.state.moves.slice()")
def saved(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayo.game') || 'null')")

def move(pg):  # one move of ours and the computer's reply
    ready(pg); n = len(moves(pg)); pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    for _ in range(6):
        if not pg.evaluate("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % n): break
        pg.mouse.click(x, y); pg.wait_for_timeout(350)
    pg.wait_for_function("window.__ayo.state.over || (window.__ayo.state.moves.length >= %d && window.__ayo.state.turn === 0 && !window.__ayo.busy)" % (n + 2), timeout=150000)

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("two tabs: " + what + ((" · " + errs[0]) if errs else ""))

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        ctx.add_init_script("if (!localStorage.getItem('ayo.lesson')) { localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); }")
        A = page(ctx, "tab A"); A.goto(URL); up(A)
        A.evaluate("(async () => { const b = document.querySelector('#playBtn'); b.click(); await new Promise((r) => setTimeout(r, 300)); if (b.classList.contains('armed')) b.click(); })()")
        move(A); a1 = moves(A); check(saved(A)["moves"] == a1, "tab A plays and saves its game (%d moves)" % len(a1))

        B = page(ctx, "tab B"); B.goto(URL); up(B)  # the link opened again: a second tab
        B.evaluate("document.querySelector('#continueBtn').click()"); move(B); b1 = moves(B)
        check(b1[:len(a1)] == a1 and len(b1) == len(a1) + 2, "tab B continues the same game and plays on (%d moves)" % len(b1))
        A.bring_to_front(); A.wait_for_function("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % len(b1), timeout=20000)
        check(moves(A) == b1, "1. tab A follows: its board is the game tab B played on")
        check("Picked up from your other tab" in A.evaluate("window.__toasts"), "1. tab A says \"Picked up from your other tab\"")
        same = A.evaluate("JSON.stringify(window.__ayo.state.pits) + JSON.stringify(window.__ayo.state.stores)") == B.evaluate("JSON.stringify(window.__ayo.state.pits) + JSON.stringify(window.__ayo.state.stores)")
        check(same, "1. both tabs show the same pits and troughs")

        move(A); a2 = moves(A)
        B.bring_to_front(); B.wait_for_function("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % len(a2), timeout=20000)
        check(moves(B) == a2 and saved(B)["moves"] == a2, "2. a move in tab A is followed by tab B, the reply neither doubled nor lost (%d moves)" % len(a2))

        # 3. tab A out of sight and not told (a tab the phone has frozen hears nothing): tab B plays on, then A's old game
        #    comes to be saved (a reply landing in a hidden tab) — it must hold back, and follow once it is back in view
        A.evaluate("window.__deaf = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })")
        move(B); b2 = moves(B)
        if moves(A) != a2: print("   (tab A's log: %s)" % A.evaluate("JSON.stringify(window.__ayo.tabs.log)"))
        check(moves(A) == a2 and A.evaluate("window.__ayo.tabs.stale"), "3. tab A out of sight still holds the old game")
        A.evaluate("window.__ayo.saveNow()")
        check(saved(B)["moves"] == b2 and A.evaluate("window.__ayo.tabs.pending || window.__ayo.tabs.log.some((l) => l[0] === 'later')"), "3. tab A out of sight does not write over tab B's newer game")
        A.evaluate("window.__deaf = false; delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange'))")
        A.wait_for_function("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % len(b2), timeout=20000)
        check(moves(A) == b2 and saved(A)["moves"] == b2, "3. tab A, back in view, follows the newer game")
        A.wait_for_timeout(300); A.screenshot(path=out)  # the picture: tab A as it follows, its word on the board

        # 4. the game finished in the other tab (a finished game leaves nothing to continue): tab A goes back to Home
        B.evaluate("localStorage.setItem('ayo.game', 'null')")
        A.wait_for_function("!document.querySelector('#home').hidden", timeout=20000)
        check("That game ended in your other tab" in A.evaluate("window.__toasts") and A.evaluate("document.querySelector('#continueBtn').disabled"), "4. the game ended in the other tab: tab A is at Home, nothing to continue")
        check(not errs, "5. no page error" + ((": " + "; ".join(errs)) if errs else ""))
        b.close()
    srv.shutdown(); print("picture:", os.path.relpath(out, root)); print("two tabs, one game")

main()
