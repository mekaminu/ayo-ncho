# Every screen as a screen reader and the stores' accessibility checks see it (idea 8 Nov).
# Runs axe-core (node_modules/axe-core, the engine behind Chrome Lighthouse's accessibility score) over each screen of the
# game in headless Chromium, at the phone (390x844, touch) and the Mac (1180x820): Home, With friends, Settings, the Store,
# How to play, a game under way (after a real move) and the Game over card, in English and French. Fails on any WCAG 2.2 A / AA or best-practice
# rule broken (colour contrast is reported, not failed: the wood behind the words is a picture axe cannot read).
# Usage: python3 tools/a11y.py [report.md]   -> prints each screen's result; writes the report (default docs/launch/accessibility.md)
import functools, http.server, json, os, subprocess, sys, threading, time
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
AXE = open(os.path.join(root, "node_modules", "axe-core", "axe.min.js")).read()
out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else os.path.join(root, "docs", "launch", "accessibility.md")
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8768), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:8768/web/index.html"
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
SOFT = {"color-contrast"}  # words over the 3D board and the wood: axe sees no background colour it can measure
RUN = """async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] });
  return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 6).map(n => n.target.join(' ') + ' — ' + (n.failureSummary || '').split('\\n').slice(1, 2).join('').trim()) , count: v.nodes.length })); }"""

def page(b, wide, lang):
    ctx = b.new_context(viewport={"width": 1180, "height": 820} if wide else {"width": 390, "height": 844}, has_touch=not wide, is_mobile=not wide, locale="fr-FR" if lang == "fr" else "en-GB")
    pg = ctx.new_page(); errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg, errors

def check(pg, name, results):
    pg.wait_for_timeout(500)
    if not pg.evaluate("!!window.axe"): pg.add_script_tag(content=AXE)
    v = pg.evaluate(RUN)
    results.append((name, v))
    hard = [x for x in v if x["id"] not in SOFT]
    print(("ok   " if not hard else "FAIL ") + name + "".join("\n       %s (%s, %d): %s" % (x["id"], x["impact"], x["count"], "; ".join(x["nodes"][:3])) for x in v))
    return hard

def visible(pg, sel): return pg.evaluate("(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.getClientRects().length > 0; })(%s)" % json.dumps(sel))

def tour(b, wide, lang, results):
    q = "&lang=fr" if lang == "fr" else ""
    tag = ("Mac" if wide else "phone") + (" · French" if lang == "fr" else "")
    pg, errors = page(b, wide, lang); bad = []
    pg.goto(BASE + "?capture=1&stay=home" + q, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
    bad += check(pg, "Home · " + tag, results)
    pg.click("#friendsBtn"); pg.wait_for_timeout(600)
    if visible(pg, "#nameCard"): bad += check(pg, "With friends, your name · " + tag, results)
    pg.goto(BASE + "?capture=1&stay=home" + q, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
    pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])"); bad += check(pg, "Settings · " + tag, results)
    pg.goto(BASE + "?capture=1&stay=home" + q, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
    pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])"); bad += check(pg, "Store · " + tag, results)
    pg.goto(BASE + "?capture=1" + q, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
    pg.wait_for_function("window.__ayo && window.__ayo.state && window.__ayo.state.turn === 0 && !window.__ayo.busy", timeout=30000)
    pit = pg.evaluate("window.__ayo.legal[0]")
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit); pg.mouse.click(x, y); pg.wait_for_timeout(400)
    if pg.evaluate("window.__ayo.state.moves.length === 0 && !window.__ayo.busy"): pg.mouse.click(x, y)  # the first tap only picked it
    try: pg.wait_for_function("window.__ayo.state.moves.length >= 2 && window.__ayo.state.turn === 0 && !window.__ayo.busy", timeout=90000)
    except Exception: print(pg.evaluate("[window.__ayo.state.moves, window.__ayo.state.turn, window.__ayo.busy, document.querySelector('#hint').textContent]")); raise
    bad += check(pg, "A game, after a move and the reply · " + tag, results)
    pg.click("#rulesBtn"); pg.wait_for_selector("#rules:not([hidden])"); bad += check(pg, "How to play · " + tag, results)
    pg.context.close()
    pg, more = page(b, wide, lang); errors += more  # Game over: a saved game one move from beating Mama Ngozi (tools/endgame.js), that move played
    pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'hard'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); }" % json.dumps(json.dumps(WSAVE)))
    pg.goto(BASE + "?capture=1&stay=home" + q, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
    pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % END["pit"]); pg.mouse.click(x, y); pg.wait_for_timeout(400)
    if pg.evaluate("window.__ayo.state.moves.length === %d" % len(END["moves"])): pg.mouse.click(x, y)
    pg.wait_for_selector("#gameover:not([hidden])", timeout=240000); pg.wait_for_timeout(1500)
    bad += check(pg, "Game over · " + tag, results)
    if errors: bad.append({"id": "page-error", "help": "; ".join(errors)}); print("FAIL page errors: " + "; ".join(errors))
    pg.context.close()
    return bad

END = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "endgame.js"), "7", "ncho"]).decode())
WSAVE = {"moves": END["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "hard", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 6 * 60 * 1000}}
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS); results = []; bad = []
    for wide, lang in ((False, "en"), (True, "en"), (False, "fr")): bad += tour(b, wide, lang, results)
    b.close()
lines = ["# Accessibility check", "", "Made by `python3 tools/a11y.py`: axe-core %s over each screen in headless Chromium (WCAG 2.2 A and AA rules and axe's best practices: one main landmark, one title, everything inside a landmark, tap targets of 24 px or more and not covered), at the phone (390×844, touch), the Mac (1180×820) and the phone in French. Colour contrast is listed but not failed: the words sit over the 3D board and the carved wood, a picture axe cannot measure, so any it finds are listed for a look by eye rather than failed." % json.loads(open(os.path.join(root, "node_modules", "axe-core", "package.json")).read())["version"], "", "| Screen | Result |", "|---|---|"]
for name, v in results:
    hard = [x for x in v if x["id"] not in SOFT]; soft = [x for x in v if x["id"] in SOFT]
    lines.append("| %s | %s |" % (name, ("passes" if not hard else "; ".join("%s ×%d" % (x["id"], x["count"]) for x in hard)) + ("" if not soft else " (contrast over the wood: %d to check by eye)" % sum(x["count"] for x in soft))))
open(out, "w").write("\n".join(lines) + "\n")
print("report:", os.path.relpath(out, root))
if bad: print("%d problem(s)" % len(bad)); sys.exit(1)
print("every screen passes")
