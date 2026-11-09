# Older phones (idea 9 Nov): plays the game in headless Chromium made to behave like the oldest phone the game supports —
# Safari 15.0 / iOS 15.0 (the iPhone app's floor), Chrome 90, Samsung Internet 15:
#   * index.html is served with every CSS rule that uses :has() taken out (an older browser drops them the same way),
#     and CSS.supports('selector(:has(…))') says no;
#   * Object.hasOwn, Array/String .at(), structuredClone, findLast and the rest of web/'s newer-than-floor list are taken
#     away before the page runs, so anything that still uses them throws as it would on the phone.
# Then: the board starts, a real move is played and answered, Settings opens and its button rows wrap under their words
# (the :has rule's twin, web/oldcss.js) with nothing wider than the phone, in English and in French with the largest words;
# and the first-game tip stands above the words under the board. No page error anywhere.
# Usage: python3 tools/oldphones.py [picture.png]   (default docs/render-2026-11-09-oldphones.png)
import functools, http.server, os, re, sys, threading
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-09-oldphones.png"))
PORT = int(os.environ.get("PORT", "8797"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/web/index.html" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []

def strip_has(html):
    # take out every rule whose selector has :has( (outside comments), as a browser without it drops them
    def style(m):
        css = re.sub(r"/\*[\s\S]*?\*/", "", m.group(2))
        css = re.sub(r"(?:(?<=[{}\n])|^)[^{}@]*:has\([^{}]*\{[^{}]*\}", "", css, flags=re.M)
        return m.group(1) + css + m.group(3)
    return re.sub(r"(<style[^>]*>)([\s\S]*?)(</style>)", style, html)

OLD = """(() => {
  delete Object.hasOwn; delete Array.prototype.at; delete String.prototype.at; delete Array.prototype.findLast; delete Array.prototype.findLastIndex;
  delete Array.prototype.toSorted; delete Array.prototype.toReversed; delete globalThis.structuredClone; delete globalThis.BroadcastChannel;
  try { delete Crypto.prototype.randomUUID; } catch {}
  const sup = CSS.supports.bind(CSS); CSS.supports = function (a, b) { if (String(a).includes(':has(')) return false; return b === undefined ? sup(a) : sup(a, b); };
})();"""

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("oldphones: " + what + ((" · " + errs[0]) if errs else ""))

def open_(b, lang=None, ts=None, tutorial=False, tag="page"):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    sets = ("" if tutorial else "localStorage.setItem('ayo.tutorial','3');") + "localStorage.setItem('ayo.lesson','done');"
    if lang: sets += "localStorage.setItem('ayo.lang','%s');" % lang
    if ts: sets += "localStorage.setItem('ayo.textsize','%s');" % ts
    ctx.add_init_script("if (!sessionStorage.getItem('set')) { sessionStorage.setItem('set','1'); %s }" % sets)
    ctx.add_init_script(OLD)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    page = strip_has(open(os.path.join(root, "web", "index.html"), encoding="utf-8").read())
    pg.route(re.compile(r".*/web/index\.html(\?.*)?$"), lambda r: r.fulfill(body=page, content_type="text/html; charset=utf-8"))
    pg.goto(BASE); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
    return ctx, pg

def settings_fit(pg, what):
    pg.evaluate("document.querySelector('#homeSettings').click()"); pg.wait_for_selector("#settings:not([hidden])", timeout=10000); pg.wait_for_timeout(400)
    got = pg.evaluate("""(() => { const rows = [...document.querySelectorAll('#settings .row')].filter((r) => r.offsetParent && [...r.children].some((c) => c.classList.contains('seg')));
      const W = innerWidth; return { n: rows.length, marked: rows.filter((r) => r.classList.contains('hasSeg')).length,
        wrap: rows.filter((r) => getComputedStyle(r).flexWrap === 'wrap').length,
        wide: rows.filter((r) => { const b = r.getBoundingClientRect(); return b.right > W + 0.5 || [...r.querySelectorAll('.segbtn')].some((s) => s.getBoundingClientRect().right > W + 0.5); }).map((r) => r.querySelector('.t b') && r.querySelector('.t b').textContent),
        noHas: document.documentElement.classList.contains('noHas') }; })()""")
    check(got["noHas"] and got["n"] > 8 and got["marked"] == got["n"], "%s: the page knows it has no :has and marks all %d button rows (%d)" % (what, got["n"], got["marked"]))
    check(got["wrap"] == got["n"], "%s: every button row wraps under its words, as the :has rule did" % what)
    check(not got["wide"], "%s: nothing wider than the phone %s" % (what, got["wide"]))

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        ctx, pg = open_(b, tag="english")
        check(pg.evaluate("typeof Object.hasOwn === 'undefined' && typeof structuredClone === 'undefined' && ![].at"), "the newer methods are really gone")
        check(pg.evaluate("![...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.selectorText && r.selectorText.includes(':has(')); } catch (e) { return false; } })"), "no :has rule on the page")
        pg.click("#playBtn")
        if pg.evaluate("document.querySelector('#playBtn').classList.contains('armed')"): pg.click("#playBtn")
        pg.wait_for_function("!document.querySelector('#home') || document.querySelector('#home').hidden", timeout=20000)
        pg.wait_for_function("!window.__ayo.busy", timeout=60000)
        before = pg.evaluate("JSON.stringify(window.__ayo.state.pits)")
        pit = pg.evaluate("window.__ayo.state.pits.findIndex((n, i) => i < 6 && n > 0)")
        x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit); pg.mouse.click(x, y); pg.wait_for_timeout(300); pg.mouse.click(x, y)
        pg.wait_for_function("window.__ayo.state.turn === 0 && !window.__ayo.busy && JSON.stringify(window.__ayo.state.pits) !== %r" % before, timeout=240000)
        check(True, "a real move played and answered on the board")
        pg.screenshot(path=out, animations="disabled")
        pg.evaluate("document.querySelector('#homeBtn') && document.querySelector('#homeBtn').click()"); pg.wait_for_timeout(600)
        settings_fit(pg, "English")
        ctx.close()

        ctx, pg = open_(b, lang="fr", ts="larger", tag="french larger")
        settings_fit(pg, "French, largest words")
        ctx.close()

        ctx, pg = open_(b, tag="tip")
        # the tip the first game puts up (web/game.js), placed as the game places it: after the words under the board
        bottoms = pg.evaluate("""(async () => { const w = document.querySelector('#words'), l = document.querySelector('#lastMove'), k = document.querySelector('#take');
          let t = document.querySelector('#tip'); if (!t) { t = document.createElement('div'); t.id = 'tip'; t.innerHTML = '<p>tip</p>'; w.parentNode.appendChild(t); }
          const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const b = () => parseFloat(getComputedStyle(t).bottom); const out = [];
          [...w.children].forEach((c) => { c.hidden = true; }); await frame(); out.push(b());
          l.hidden = false; await frame(); out.push(b()); k.hidden = false; await frame(); out.push(b());
          l.hidden = true; k.hidden = true; await frame(); out.push(b()); return out; })()""")
        check(bottoms[0] < bottoms[1] < bottoms[2] and bottoms[3] == bottoms[0], "the first-game tip steps up above one line and two under the board, and back down %s" % bottoms)
        ctx.close()
        b.close()
    check(not errs, "no page error: %s" % errs)

main()
