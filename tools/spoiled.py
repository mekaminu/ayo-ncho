# A spoiled save never stops the board (idea 9 Nov): everything the game keeps on a phone lives in the browser's storage
# (localStorage, under "ayo."), and what is there is not always what this build wrote: a write cut off when the battery died or
# the tab was killed mid-save, a value an older build wrote in another shape (the store apps will update over players' saves),
# a phone's storage cleaner, a "Move to a new phone" link from another version, or someone poking at it by hand. One bad value
# read without care stops the page before the board draws ("The board couldn't start"), on every open, until the player
# clears the site's data and loses everything. This spoils the save on purpose, in headless Chromium as a phone (390x844, touch):
#   1. a first visit plays a move, opens Settings and the Store, and lists every key the game wrote (plus every key named in
#      web/, so keys a short visit never writes are spoiled too);
#   2. for each of BAD (cut-off JSON, the wrong type, empty, NaN, an enormous string, names on every JavaScript object, a
#      game's shape with impossible moves, …) every key is set to it at once, and the page must
#        open  — the plain link, no test switches: the board draws and Home shows, with no page error;
#        play  — Play starts a game against the computer, a move is sown and the reply comes, with no page error;
#        again — after a reload (the game has written its own good values over some) it opens and plays again;
#   3. if a value fails, the keys are halved until the one key that breaks it is named.
# Usage: python3 tools/spoiled.py [report.md]   -> one line per bad value; the report (default docs/launch/spoiled.md)
import functools, http.server, json, os, re, sys, threading, time, glob
from playwright.sync_api import sync_playwright
root = os.environ.get("ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
out = next((a for a in sys.argv[1:] if not a.startswith("--")), os.path.join(root, "docs", "launch", "spoiled.md"))
only = [a[7:] for a in sys.argv[1:] if a.startswith("--only=")]  # --only=<name> runs just that bad value (while fixing one)
PORT = int(os.environ.get("PORT", "8792"))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root)); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/web/index.html" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
GAMEISH = json.dumps({"moves": [0, 1, 99, -3, "x"], "variant": "constructor", "rules": {"capture": "x", "relay": 7}, "level": "__proto__", "stats": 5, "local": "yes"})
BAD = [  # (name, the value every key is set to)
    ("empty", ""), ("cut off", '{"moves":[3,8,'), ("null", "null"), ("an empty list", "[]"), ("an empty object", "{}"),
    ("minus one", "-1"), ("NaN", "NaN"), ("too big", "1e999"), ("true", "true"), ("a quoted word", '"x"'),
    ("[object Object]", "[object Object]"), ("__proto__", "__proto__"), ("constructor", "constructor"),
    ("a list of odd things", '[1,"a",null,{},[],true]'), ("odd fields", '{"days":"x","seen":3,"at":"soon","id":{},"level":7,"n":-5,"wins":"many","fps":"x"}'),
    ("a game that cannot be", GAMEISH), ("a huge string", "x" * 20000), ("a far-off date", "9999-99-99"),
]
STATIC = sorted(set(m for f in glob.glob(os.path.join(root, "web", "*.js")) if not f.endswith("es-module-shims.js")
                    for m in re.findall(r"""prefs\.(?:get|set)\('([A-Za-z0-9_.:-]+)'|['"`]ayo\.([A-Za-z0-9_.:-]+)['"`]|_KEY = '([A-Za-z0-9_.:-]+)'""", open(f).read()) for m in m if m))

def where(e):  # the error and the first place in the game's own code it came from
    at = next((l.strip() for l in (e.stack or "").split("\n")[1:] if "/web/" in l), "")
    return str(e).split("\n")[0] + ((" " + re.sub(r"\(?https?://[^/]+/", "(", at).replace("at ", "at ", 1)) if at else "")

def page(ctx, errs, tag):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(tag + ": " + where(e)))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg

def spoil_script(keys, value, keep_lesson):
    # once per context (sessionStorage marks it), before any of the game's code: every key set to the bad value
    good = "localStorage.setItem('ayo.tutorial','3');localStorage.setItem('ayo.lesson','done');" if keep_lesson else ""
    return "if (!sessionStorage.getItem('spoiled')) { sessionStorage.setItem('spoiled','1'); for (const k of %s) { try { localStorage.setItem('ayo.' + k, %s); } catch {} } %s }" % (json.dumps(keys), json.dumps(value), good)

def up(pg, t=90000):  # the board drew (the page's own start-up watch stands down) and Home is the screen
    pg.wait_for_function("window.__ayoUp === true && !!window.__ayo && !document.querySelector('#home').hidden", timeout=t)

def play(pg):  # Play, then one move and the reply
    pg.evaluate("(async () => { const b = document.querySelector('#playBtn'); b.click(); await new Promise((r) => setTimeout(r, 300)); if (b.classList.contains('armed')) b.click(); })()")
    pg.wait_for_function("document.querySelector('#home').hidden && window.__ayo.state.turn === 0 && !window.__ayo.busy && window.__ayo.legal.length > 0", timeout=120000)
    n = pg.evaluate("window.__ayo.state.moves.length"); pit = pg.evaluate("window.__ayo.legal[0]"); x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit)
    for _ in range(6):
        if not pg.evaluate("window.__ayo.state.moves.length === %d && !window.__ayo.busy" % n): break
        pg.mouse.click(x, y); pg.wait_for_timeout(350)
    pg.wait_for_function("window.__ayo.state.over || (window.__ayo.state.moves.length >= %d && window.__ayo.state.turn === 0 && !window.__ayo.busy)" % (n + 2), timeout=150000)

def ctx_of(b):
    return b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=1)

def first_visit(b):  # the keys a short real visit writes
    errs = []; ctx = ctx_of(b); pg = page(ctx, errs, "first visit")
    pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('ayo.tutorial','3'); localStorage.setItem('ayo.lesson','done'); }")
    pg.goto(BASE + "?capture=1&stay=home"); up(pg, 180000); play(pg)
    for a, z in (("#homeBtn", "#home"), ("#homeSettings", "#settings"), ("#settingsBack", "#home"), ("#homeStore", "#store"), ("#storeBack", "#home")):
        pg.evaluate("(s => { const e = document.querySelector(s); if (e) e.click(); })(%s)" % json.dumps(a)); pg.wait_for_timeout(700)
    keys = pg.evaluate("Object.keys(localStorage).filter((k) => k.startsWith('ayo.')).map((k) => k.slice(4))")
    ctx.close()
    if errs: raise SystemExit("the first visit itself had page errors: " + "; ".join(errs))
    return keys

def trial(b, keys, value, full=True):
    """Every key in keys set to value: open (the plain link), play, reload and play again. Returns the first failure or None."""
    errs = []; ctx = ctx_of(b)
    try:
        pg = page(ctx, errs, "open"); pg.add_init_script(spoil_script(keys, value, False))
        pg.goto(BASE)  # the plain link: no test switches (a spoiled lesson or tutorial may show; it must not break)
        try: pg.wait_for_function("window.__ayoUp === true && !!window.__ayo", timeout=90000)
        except Exception: return "open: the board never drew" + ((" · " + errs[0]) if errs else "")
        pg.wait_for_timeout(1500)
        if errs: return errs[0]
        if not full: return None
        pg.close(); ctx.close(); ctx = ctx_of(b)
        pg = page(ctx, errs, "play"); pg.add_init_script(spoil_script(keys, value, True))
        pg.goto(BASE + "?capture=1&stay=home")
        try: up(pg)
        except Exception: return "play: Home never came" + ((" · " + errs[0]) if errs else "")
        try: play(pg)
        except Exception as e: return "play: no move and reply (%s)" % str(e).split("\n")[0][:80] + ((" · " + errs[0]) if errs else "")
        if errs: return errs[0]
        pg.reload()
        try: up(pg); play(pg)
        except Exception as e: return "again: after a reload (%s)" % str(e).split("\n")[0][:80] + ((" · " + errs[0]) if errs else "")
        return errs[0] if errs else None
    finally:
        ctx.close()

def culprit(b, keys, value):  # halve the keys until one key alone breaks it (or a pair that only breaks together)
    while len(keys) > 1:
        half = keys[: len(keys) // 2]
        if trial(b, half, value): keys = half; continue
        rest = keys[len(keys) // 2:]
        if trial(b, rest, value): keys = rest; continue
        return keys  # only together
    return keys

def main():
    t0 = time.time(); rows = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        seen = first_visit(b); keys = sorted(set(seen) | set(STATIC))
        print("%d keys (%d written by a short visit, the rest named in web/)" % (len(keys), len(seen)), flush=True)
        for name, value in BAD:
            if only and name not in only: continue
            t = time.time(); why = trial(b, keys, value)
            who = culprit(b, keys, value) if why else []
            rows.append((name, value, why, who))
            print("%-22s %s%s  (%.0f s)" % (name, "ok" if not why else "BREAKS: " + why, (" · key " + ", ".join(who)) if who else "", time.time() - t), flush=True)
        b.close()
    srv.shutdown()
    bad = [r for r in rows if r[2]]
    show = lambda v: (v[:40] + "… (%d characters)" % len(v)) if len(v) > 48 else v
    lines = ["# A spoiled save never stops the board", "",
             "Made by `python3 tools/spoiled.py` in headless Chromium as a phone (390×844, touch). Every one of the game's %d saved keys (`ayo.*` in the browser's storage: %d written by a short real visit, the rest named in web/) is set to each bad value at once; the plain link must then open with the board drawn and no page error, Play must start a game where a move is sown and answered, and after a reload it must open and play again. %d bad values, %.0f s." % (len(keys), len(seen), len(rows), time.time() - t0), "",
             "| Bad value | What it stands for | Result |", "|---|---|---|"]
    for name, value, why, who in rows:
        lines.append("| `%s` | %s | %s |" % (show(value).replace("|", "\\|") or "(empty)", name, "opens and plays" if not why else "**breaks**: %s (key %s)" % (why.replace("|", "\\|"), ", ".join(who))))
    lines += ["", "**%s**" % ("Every spoiled save opens and plays." if not bad else "%d bad values break the board." % len(bad)), "", "Keys: " + ", ".join("`%s`" % k for k in keys)]
    if not only: open(out, "w").write("\n".join(lines) + "\n"); print("report:", os.path.relpath(out, root))
    print("%.0f s" % (time.time() - t0))
    if bad: raise SystemExit("breaks: " + ", ".join(r[0] for r in bad))
    print("every spoiled save opens and plays")

main()
