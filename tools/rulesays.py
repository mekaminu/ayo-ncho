# How to play says the rules you play (idea 10 Nov): the How to play card's lines are built from the rules the game on the
# board is played with (web/rulesays.js). This opens the game in headless Chromium and, for real:
#   1. the usual Nchò (nothing changed in Settings → Rules): the card's lines are the usual Nchò's, no "Not the usual" line;
#   2. Settings → Rules with one lap and no last 8 (stored as Settings stores them), a new game: the card follows the game
#      on the board — one lap, no last-8 line, "First to 25", and "Not the usual Nchò" above the list — on the phone
#      (390x844, touch; the picture <out>) and the Mac (1180x820; <out>-wide.png);
#   3. the same in French (Settings → Language → Français): every line French, the note too;
#   4. Ayo with captures on 4: Ayo's name, capture-on-4 lines, the note; and the rules changed while a game is on do not
#      change the card until a new game starts (a game keeps the rules it started with);
#   5. a real move and the reply are played under the changed rules; no page error anywhere.
# Usage: python3 tools/rulesays.py [picture.png]   (default docs/render-2026-11-10-rulesays.png)
import functools, http.server, json, os, subprocess, sys, threading
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "render-2026-11-10-rulesays.png"))
PORT = int(os.environ.get("PORT", "8796"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/web/index.html" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
errs = []

# what the card should say, from node: the same module the page runs
def expect(variant, rules, lang="en"):
    js = ("import('./web/rulesays.js').then(async (m) => { const i = await import('./web/i18n.js'); const c = m.rulesCard(%s, %s);"
          " const t = (s) => (%s === 'fr' ? i.translate(s, 'fr') : s); console.log(JSON.stringify({ lines: c.lines.map(t), note: c.note && t(c.note) })); })") % (json.dumps(variant), json.dumps(rules), json.dumps(lang))
    return json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], cwd=root, text=True))

def check(ok, what):
    print(("ok   " if ok else "FAIL ") + what, flush=True)
    if not ok: raise SystemExit("rulesays: " + what + ((" · " + errs[0]) if errs else ""))

def page(ctx, tag):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("%s: %s" % (tag, str(e).split("\n")[0])))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg

def game(pg, extra=""):
    pg.goto(BASE + "?capture=1" + extra, wait_until="load"); pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=180000)
    pg.wait_for_function("window.__ayo.state && !window.__ayo.busy", timeout=60000)

def card(pg):
    pg.click("#rulesBtn"); pg.wait_for_selector("#rules:not([hidden])"); pg.wait_for_timeout(400)
    return pg.evaluate("""(() => { const n = document.querySelector('#rulesNote');
      return { lines: [...document.querySelectorAll('#rulesList li')].map((l) => l.textContent.trim()), note: n.hidden ? null : n.textContent.trim(),
               name: document.querySelector('#gameName').textContent, rules: window.__ayo.state.rules, variant: window.__ayo.state.variant,
               fits: (() => { const r = document.querySelector('#rules').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; })(),
               wide: document.documentElement.scrollWidth <= innerWidth + 1 }; })()""")

def close(pg): pg.click("#rulesClose"); pg.wait_for_timeout(200)

def same(got, want, what):
    check(got["lines"] == want["lines"], "%s: the card's lines are the game's rules%s" % (what, "" if got["lines"] == want["lines"] else " — got %r" % got["lines"]))
    check(got["note"] == want["note"], "%s: the note says %r (got %r)" % (what, want["note"], got["note"]))
    check(got["fits"] and got["wide"], "%s: the card fits the screen, nothing sideways" % what)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        for wide in (False, True):
            ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, has_touch=not wide, is_mobile=not wide, device_scale_factor=2, locale="en-GB")
            ctx.add_init_script("if (!localStorage.getItem('ayo.lesson')) { localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); localStorage.setItem('ayo.name','Meka'); }")
            tag = "the Mac" if wide else "the phone"; pg = page(ctx, tag)
            game(pg); got = card(pg)
            check(got["variant"] == "ncho" and got["name"] == "Nchò", "%s: a game of Nchò" % tag)
            same(got, expect("ncho", got["rules"]), "%s, the usual Nchò" % tag); check(got["note"] is None, "%s: the usual Nchò says nothing more" % tag)
            # Settings → Rules: one lap, no last 8 (as Settings keeps them), then a new game
            pg.evaluate("localStorage.setItem('ayo.rules.relay','0'); localStorage.setItem('ayo.rules.last8','0'); localStorage.removeItem('ayo.game')")
            game(pg); started = pg.evaluate("window.__ayo.state.rules")
            check(started == {"capture": 4, "relay": False, "last8": False}, "%s: the new game is played by Settings' rules (%r)" % (tag, started))
            got = card(pg); same(got, expect("ncho", started), "%s, Nchò with one lap and no last 8" % tag)
            check("Your turn ends where your last seed lands." in got["lines"] and "First to 25 seeds wins." in got["lines"], "%s: one lap and first to 25, said" % tag)
            pg.screenshot(path=out.replace(".png", "-wide.png") if wide else out)
            close(pg)
            if not wide:
                # a real move and the reply under the changed rules
                pg.wait_for_function("window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0", timeout=60000)
                pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
                pg.mouse.click(x, y); pg.wait_for_timeout(300)
                if pg.evaluate("window.__ayo.state.moves.length === 0 && !window.__ayo.busy"): pg.mouse.click(x, y)
                pg.wait_for_function("window.__ayo.state.moves.length >= 2 && window.__ayo.state.turn === 0 && !window.__ayo.busy", timeout=120000)
                check(pg.evaluate("window.__ayo.state.rules.relay === false && window.__ayo.state.moves.length >= 2"), "a move and the reply are played under one lap")
                # rules changed mid-game: the card keeps the game's own until a new one
                pg.evaluate("localStorage.setItem('ayo.rules.capture','23')"); got = card(pg)
                check(got["rules"] == started and got["lines"] == expect("ncho", started)["lines"], "a switch changed mid-game: the card keeps the rules this game is played by"); close(pg)
                # in French
                pg.evaluate("localStorage.setItem('ayo.rules.capture','4'); localStorage.setItem('ayo.lang','fr'); localStorage.removeItem('ayo.game')")
                game(pg); pg.wait_for_timeout(500)
                got = card(pg); same(got, expect("ncho", got["rules"], "fr"), "in French")
                check(got["note"] == "Pas le Nchò habituel — voici les règles de cette partie.", "in French: the note is French")
                pg.screenshot(path=out.replace(".png", "-fr.png")); close(pg)
                # Ayo with captures on 4
                pg.evaluate("localStorage.setItem('ayo.lang','en'); localStorage.setItem('ayo.game.variant','ayo'); localStorage.removeItem('ayo.rules.relay'); localStorage.removeItem('ayo.rules.last8'); localStorage.removeItem('ayo.game')")
                game(pg); got = card(pg)
                check(got["variant"] == "ayo" and got["rules"] == {"capture": 4, "relay": False, "last8": False}, "Ayo with captures on 4 on the board (%r)" % got["rules"])
                same(got, expect("ayo", got["rules"]), "Ayo with captures on 4"); check(got["name"] == "Ayo" and got["note"] == "Not the usual Ayo — these are the rules this game is played with.", "Ayo's name and its note")
                pg.screenshot(path=out.replace(".png", "-ayo.png")); close(pg)
            ctx.close()
        b.close()
    check(not errs, "no page error" + ("" if not errs else ": " + errs[0]))
    print("rulesays: all checks passed")

main()
