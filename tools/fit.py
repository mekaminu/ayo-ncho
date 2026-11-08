# Nothing cut off (idea 8 Nov): every screen at every size the game is played at, checked for words and buttons that do not fit.
# The accessibility check (tools/a11y.py) reads each screen as a screen reader does; this one looks at it as a hand and an eye do,
# in headless Chromium, at the phone (390x844), the Fold open (820x1000), a phone on its side (844x390), the Mac's small window
# (1024x700) and a big one (1440x900): in English with the words as drawn, and in French with Larger words (the longest words at
# the biggest size, the hardest case). On Home, With friends, Settings (scrolled top to bottom), the Store, the daily puzzle,
# a game after a move and its reply, How to play and the Game over card it fails on:
#   - off the edge: a button or link that is shown but lies partly outside the screen, and no scrolling box can bring it in;
#   - cut off: a line of words wider than the box that clips it (overflow hidden or clip; an ellipsis on a name is allowed);
#   - covered: two buttons that overlap, or a button whose middle is under something else that takes the tap;
#   - too small: a button under 24 x 24 px (WCAG 2.2's target size) that is not a word inside a line.
# Usage: python3 tools/fit.py [report.md] [--quick]   -> prints each screen's result; writes the report (default docs/launch/fit.md)
#        --quick: the phone and the Mac only, English and French (what a build run checks before a push that touches web/)
import functools, http.server, json, os, subprocess, sys, threading, time
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
three = os.path.join(root, "node_modules", "three", "build", "three.module.js")
args = [a for a in sys.argv[1:] if not a.startswith("--")]
out = args[0] if args else os.path.join(root, "docs", "launch", "fit.md")
quick = "--quick" in sys.argv
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
PORT = int(os.environ.get("FIT_PORT", "8769"))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:%d/web/index.html" % PORT
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
SIZES = [("phone", 390, 844, True), ("Fold open", 820, 1000, True), ("sideways", 844, 390, True), ("Mac small", 1024, 700, False), ("Mac", 1440, 900, False)]
if quick: SIZES = [SIZES[0], SIZES[3]]
LOOKS = [("en", "normal"), ("fr", "larger")]

# The check itself, run in the page. Each problem is {kind, what, detail}; `what` names the element so a fix can find it.
CHECK = r"""() => {
  const vw = innerWidth, vh = innerHeight, out = [];
  const name = (e) => { let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; else if (typeof e.className === 'string' && e.className.trim()) s += '.' + e.className.trim().split(/\s+/)[0];
    const p = e.closest('[id]'); if (!e.id && p && p !== e) s = '#' + p.id + ' ' + s; const t = (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40); return t ? s + ' "' + t + '"' : s; };
  const shown = (e) => { for (let n = e; n && n !== document.documentElement; n = n.parentElement) { if (n.hidden) return false; const s = getComputedStyle(n);
    if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse' || +s.opacity < 0.05) return false; } const r = e.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
  const tiny = (n) => { const r = n.getBoundingClientRect(); return r.width <= 2 && r.height <= 2; };
  const sr = (e) => { if (e.closest('.sr, #pits')) return true; for (let n = e; n && n !== document.body; n = n.parentElement) if (tiny(n) && getComputedStyle(n).overflow !== 'visible') return true; return false; }; // read by a screen reader only, drawn nowhere (the pit buttons sit over the 3D pits, #said is a 1px live line)
  // a card or screen laid over others on purpose: the nearest ancestor of `top` (itself included) covering 40% of the screen that does not hold `e`
  const over = (top, e) => { for (let n = top; n && n !== document.body && n !== document.documentElement; n = n.parentElement) { if (n.contains(e)) return false; const r = n.getBoundingClientRect(); if (r.width * r.height >= 0.4 * vw * vh || n.matches('.card, [role=dialog], dialog')) return true; } return false; };
  const onTop = (e) => { const r = e.getBoundingClientRect(); const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(vh - 1, Math.max(0, r.top + r.height / 2)); const t = document.elementFromPoint(cx, cy); return !t || t === e || e.contains(t) || t.contains(e); };
  const scroller = (e) => { for (let n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) { const s = getComputedStyle(n);
    if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) return n; } return null; };
  const controls = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=radio], [role=tab]')]
    .filter((e) => shown(e) && !sr(e) && !(e.closest('[inert]')));
  // off the edge (with no box that scrolls it into view)
  for (const e of controls) { const r = e.getBoundingClientRect(); const box = scroller(e);
    const lim = box ? box.getBoundingClientRect() : { left: 0, top: 0, right: vw, bottom: vh };
    const offX = r.left < -1 || r.right > vw + 1, offY = !box && (r.top < -1 || r.bottom > vh + 1) && !(document.scrollingElement.scrollHeight > vh + 1);
    const away = r.right <= 0 || r.left >= vw || (!box && (r.bottom <= 0 || r.top >= vh)); // wholly out of sight: a drawer slid away, not a cut
    if ((offX || offY) && !away) out.push({ kind: 'off the edge', what: name(e), detail: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} on ${vw}x${vh}` }); }
  // out of reach or covered inside a box that scrolls: scrolled into view one at a time (then put back), as a finger would
  for (const e of controls) { const box = scroller(e); if (!box) continue; const st = box.scrollTop, sl = box.scrollLeft;
    e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = e.getBoundingClientRect(), b = box.getBoundingClientRect();
    const inside = r.top >= b.top - 1 && r.bottom <= b.bottom + 1 && r.left >= b.left - 1 && r.right <= b.right + 1;
    if (!inside && r.height <= b.height && r.width <= b.width) out.push({ kind: 'out of reach', what: name(e), detail: `scrolls no nearer than ${Math.round(r.left)},${Math.round(r.top)} in a box at ${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}` });
    else if (r.top >= 0 && r.bottom <= vh && !onTop(e)) { const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (t && !over(t, e) && getComputedStyle(t).pointerEvents !== 'none') out.push({ kind: 'covered', what: name(e), detail: 'scrolled into view, under ' + name(t) }); }
    box.scrollTop = st; box.scrollLeft = sl; }
  // cut off: a box that clips its own words
  for (const e of document.querySelectorAll('body *')) { if ((e.closest('svg, canvas') || sr(e)) || !e.childNodes.length) continue;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own || !shown(e)) continue;
    const s = getComputedStyle(e); if (!/(hidden|clip)/.test(s.overflowX + s.overflow)) continue;
    if (s.textOverflow === 'ellipsis') continue; // a long name ends in … on purpose
    if (e.scrollWidth > e.clientWidth + 2 || (s.whiteSpace !== 'nowrap' && e.scrollHeight > e.clientHeight + 3 && /(hidden|clip)/.test(s.overflowY))) out.push({ kind: 'cut off', what: name(e), detail: `${e.scrollWidth}x${e.scrollHeight} in ${e.clientWidth}x${e.clientHeight}` }); }
  // words running past the screen's edge (a box that does not clip but whose line is wider than the screen)
  for (const e of document.querySelectorAll('body *')) { if ((e.closest('svg, canvas') || sr(e))) continue; const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own || !shown(e)) continue;
    const g = document.createRange(); g.selectNodeContents(e); const r = g.getBoundingClientRect(); if (r.width < 1) continue; const box = scroller(e);
    if (!box && (r.left < -1 || r.right > vw + 1)) out.push({ kind: 'off the edge', what: name(e), detail: `words from ${Math.round(r.left)} to ${Math.round(r.right)} on ${vw}` }); }
  // covered and overlapping
  const rects = controls.filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw; }).map((e) => [e, e.getBoundingClientRect(), onTop(e)]);
  for (let i = 0; i < rects.length; i++) { const [a, ra, ta] = rects[i];
    for (let j = i + 1; j < rects.length; j++) { const [b, rb, tb] = rects[j]; if (!ta || !tb || a.contains(b) || b.contains(a) || a.closest('.card') !== b.closest('.card')) continue; // both can be tapped and they overlap, on the same card or screen (a card laid over a screen is meant to be)
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 3 && h > 3) out.push({ kind: 'covered', what: name(a) + ' and ' + name(b), detail: `overlap ${Math.round(w)}x${Math.round(h)}` }); }
    const cx = ra.left + ra.width / 2, cy = ra.top + ra.height / 2;
    if (cx >= 0 && cy >= 0 && cx < vw && cy < vh && !scroller(a)) { const top = document.elementFromPoint(cx, cy);
      if (top && top !== a && !a.contains(top) && !top.contains(a) && getComputedStyle(top).pointerEvents !== 'none' && !over(top, a)) out.push({ kind: 'covered', what: name(a), detail: 'under ' + name(top) }); } }
  // too small to tap
  for (const [e, r, t] of rects) { if (!t) continue; if (e.tagName === 'A' && e.closest('p, li, small, span.line')) continue; // a link inside a sentence is exempt (WCAG 2.5.8 inline)
    if ((r.width < 23.5 || r.height < 23.5)) out.push({ kind: 'too small', what: name(e), detail: `${Math.round(r.width)}x${Math.round(r.height)}` }); }
  return out;
}"""

def page(b, size, lang, ts):
    _, w, h, touch = size
    ctx = b.new_context(viewport={"width": w, "height": h}, has_touch=touch, is_mobile=touch, locale="fr-FR" if lang == "fr" else "en-GB")
    pg = ctx.new_page(); errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    if os.path.exists(three): pg.route("https://cdnjs.cloudflare.com/**", lambda r: r.fulfill(path=three, content_type="text/javascript"))
    return pg, errors

def q(lang, ts): return ("&lang=fr" if lang == "fr" else "") + ("&textsize=" + ts if ts != "normal" else "")

def check(pg, name, results, scroll=None):
    pg.wait_for_timeout(700)
    found = []
    if scroll:  # a screen that scrolls: checked at the top, then a screen's height at a time to the bottom
        n = 0
        while True:
            found += pg.evaluate(CHECK); n += 1
            more = pg.evaluate("(s => { const e = document.querySelector(s); if (!e) return false; const before = e.scrollTop; e.scrollTop += e.clientHeight * 0.8; return e.scrollTop > before + 1; })(%s)" % json.dumps(scroll))
            if not more or n > 30: break
            pg.wait_for_timeout(250)
    else: found = pg.evaluate(CHECK)
    seen = set(); v = []
    for x in found:
        k = (x["kind"], x["what"])
        if k not in seen: seen.add(k); v.append(x)
    results.append((name, v))
    print(("ok   " if not v else "FAIL ") + name + "".join("\n       %s: %s (%s)" % (x["kind"], x["what"], x["detail"]) for x in v))
    return v

PITS = """() => { const a = window.__ayo; if (!a || !a.legal) return []; const c = document.querySelector('#c'); const out = [];
  for (const pit of a.legal) { const [x, y] = a.pitAt(pit); const t = document.elementFromPoint(x, y);
    if (t && t !== c) out.push({ kind: 'pit under words', what: 'your pit ' + pit + ' at ' + Math.round(x) + ',' + Math.round(y), detail: 'a tap lands on ' + (t.id ? '#' + t.id : t.tagName.toLowerCase() + (t.closest('[id]') ? ' in #' + t.closest('[id]').id : '')) }); }
  return out; }"""

def pits(pg, name, results):  # every pit you may play takes a tap: nothing laid over it catches the finger first
    v = pg.evaluate(PITS)
    if v:
        for r in results:
            if r[0] == name: r[1].extend(v)
        print("FAIL " + name + "".join("\n       %s: %s (%s)" % (x["kind"], x["what"], x["detail"]) for x in v))
    return v

def tapped(pg, sel, name, results):  # a click a finger could make; if something lies over it, that is the finding
    try: pg.click(sel, timeout=8000); return []
    except Exception: pass
    # a busy machine drawing the turning board in software can starve the click's own checks, and a screen can still be fading
    # in (taking no taps until it has): wait up to 20 s for the button to be the thing under its middle, then press it
    probe = "(s => { const e = document.querySelector(s); if (!e) return 'missing'; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)) ? '' : (t ? (t.id || t.className || t.tagName) : 'nothing'); })(%s)" % json.dumps(sel)
    try:
        try: pg.wait_for_function("!" + probe, timeout=20000)
        except Exception:
            under = pg.evaluate(probe); shot = os.path.join(os.environ.get("FIT_SHOTS", "/tmp"), "fit-tap-%s.png" % name.split(" · ")[1].split(" ")[0].replace(" ", "-")); pg.screenshot(path=shot)
            print("       (diag: %s, %s)" % (shot, pg.evaluate("(() => { const h = document.querySelector('#home'); const s = getComputedStyle(h); return [h.hidden, s.pointerEvents, s.opacity, s.visibility, s.zIndex, document.body.className, document.documentElement.className, [...document.querySelectorAll('section:not([hidden]), .card:not([hidden])')].map(e => e.id)]; })()")))
            raise Exception("under " + under)
        pg.evaluate("document.querySelector(%s).click()" % json.dumps(sel))
        return []
    except Exception as e:
        v = [{"kind": "could not tap", "what": sel, "detail": str(e).split("\n")[-1].strip()[:160]}]
        results.append((name, v)); print("FAIL " + name + "\n       could not tap " + sel + ": " + v[0]["detail"]); return v

def home(pg, extra=""):
    pg.goto(BASE + "?capture=1&stay=home" + extra, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)

def tour(b, size, lang, ts, results):
    tag = "%s %dx%d · %s" % (size[0], size[1], size[2], "French, Larger words" if lang == "fr" else "English")
    qq = q(lang, ts); bad = []
    pg, errors = page(b, size, lang, ts)
    home(pg, qq); bad += check(pg, "Home · " + tag, results)
    pg.click("#friendsBtn"); pg.wait_for_timeout(700)
    if pg.evaluate("!document.querySelector('#nameCard').hidden"):
        bad += check(pg, "With friends, your name · " + tag, results)
        pg.fill("#nameField", "Chukwuemeka"); pg.click("#nameGo"); pg.wait_for_timeout(1500)
    bad += check(pg, "With friends · " + tag, results)
    home(pg, qq); pg.click("#homeSettings"); pg.wait_for_selector("#settings:not([hidden])")
    bad += check(pg, "Settings · " + tag, results, scroll=pg.evaluate("(() => { const s = document.querySelector('#settings'); const all = [s, ...s.querySelectorAll('*')]; const e = all.find((n) => /(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1); return e ? (e.id ? '#' + e.id : null) : null; })()") or "#settings")
    home(pg, qq); pg.click("#homeStore"); pg.wait_for_selector("#store:not([hidden])")
    bad += check(pg, "Store · " + tag, results, scroll="#store")
    home(pg, qq); miss = tapped(pg, "#puzzleCard", "Daily puzzle · " + tag, results); bad += miss
    if not miss: pg.wait_for_timeout(3500); bad += check(pg, "Daily puzzle · " + tag, results)  # the board turns to the puzzle first
    pg.goto(BASE + "?capture=1" + qq, wait_until="load"); pg.wait_for_function("window.__done===true", timeout=180000)
    pg.wait_for_function("window.__ayo && window.__ayo.state && window.__ayo.state.turn === 0 && !window.__ayo.busy", timeout=30000)
    pit = pg.evaluate("window.__ayo.legal[0]")
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % pit); pg.mouse.click(x, y); pg.wait_for_timeout(400)
    if pg.evaluate("window.__ayo.state.moves.length === 0 && !window.__ayo.busy"): pg.mouse.click(x, y)
    pg.wait_for_function("window.__ayo.state.moves.length >= 2 && window.__ayo.state.turn === 0 && !window.__ayo.busy", timeout=120000)
    pg.wait_for_timeout(3500)  # the marks of their move and the chips under the board settle
    bad += check(pg, "A game, after a move and the reply · " + tag, results); bad += pits(pg, "A game, after a move and the reply · " + tag, results)
    pg.click("#rulesBtn"); pg.wait_for_selector("#rules:not([hidden])")
    bad += check(pg, "How to play · " + tag, results, scroll="#rules")
    pg.context.close()
    pg, more = page(b, size, lang, ts); errors += more
    pg.add_init_script("if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('ayo.game', %s); localStorage.setItem('ayo.level', 'hard'); localStorage.setItem('ayo.tutorial', '3'); localStorage.setItem('ayo.lesson', 'done'); }" % json.dumps(json.dumps(WSAVE)))
    home(pg, qq); pg.click("#continueBtn"); pg.wait_for_function("document.querySelector('#home').hidden && !window.__ayo.busy", timeout=20000)
    pg.wait_for_timeout(1500); results.append(("The last move of a game · " + tag, [])); v = pits(pg, "The last move of a game · " + tag, results); bad += v
    if not v: print("ok   The last move of a game · " + tag)
    x, y = pg.evaluate("window.__ayo.pitAt(%d)" % END["pit"]); pg.mouse.click(x, y); pg.wait_for_timeout(400)
    if pg.evaluate("window.__ayo.state.moves.length === %d" % len(END["moves"])): pg.mouse.click(x, y)
    try: pg.wait_for_selector("#gameover:not([hidden])", timeout=60000)
    except Exception:
        shot = os.path.join(os.environ.get("FIT_SHOTS", "/tmp"), "fit-gameover-%s-%s.png" % (size[0].replace(" ", "-"), lang)); pg.screenshot(path=shot)
        info = pg.evaluate("[window.__ayo.state.moves.length, window.__ayo.busy, (document.elementFromPoint(%d, %d) || {}).id || (document.elementFromPoint(%d, %d) || {}).className]" % (x, y, x, y))
        v = [{"kind": "could not play", "what": "the winning move at %d,%d" % (x, y), "detail": "moves %s, busy %s, on top: %s (%s)" % (info[0], info[1], info[2], shot)}]
        results.append(("Game over · " + tag, v)); print("FAIL Game over · " + tag + "\n       " + v[0]["detail"]); pg.context.close(); return bad + v
    pg.wait_for_timeout(2500)
    bad += check(pg, "Game over · " + tag, results, scroll="#gameover")
    if errors: bad.append({"kind": "page error", "what": "; ".join(errors), "detail": ""}); print("FAIL page errors: " + "; ".join(errors))
    pg.context.close()
    return bad

END = json.loads(subprocess.check_output(["node", os.path.join(root, "tools", "endgame.js"), "7", "ncho"]).decode())
WSAVE = {"moves": END["moves"], "variant": "ncho", "rules": {"capture": 4, "relay": True, "last8": True}, "level": "hard", "stats": {"biggest": 8, "captures": 3, "started": int(time.time() * 1000) - 6 * 60 * 1000}}
t0 = time.time()
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS); results = []; bad = []
    only = os.environ.get("FIT_ONLY")  # e.g. FIT_ONLY=phone:fr to run one size and look while fixing
    for size in SIZES:
        for lang, ts in LOOKS:
            if only and only != "%s:%s" % (size[0], lang): continue
            bad += tour(b, size, lang, ts, results)
    b.close()
lines = ["# Nothing cut off", "", "Made by `python3 tools/fit.py` in headless Chromium: every screen at the phone (390×844), the Fold open (820×1000), a phone on its side (844×390), a small Mac window (1024×700) and a big one (1440×900), in English and in French with Larger words. A screen fails on a button or link off the edge of the screen (with nothing to scroll it in), words cut off by their box, two buttons overlapping or one under something else, or a button smaller than 24 × 24 px (WCAG 2.2 target size). Screens that scroll (Settings, the Store, How to play, Game over) are checked a screen at a time down to the bottom.", "", "| Screen | Result |", "|---|---|"]
for name, v in results:
    lines.append("| %s | %s |" % (name, "fits" if not v else "; ".join("%s: %s" % (x["kind"], x["what"].replace("|", "/")) for x in v)))
if not quick and not os.environ.get("FIT_ONLY"): open(out, "w").write("\n".join(lines) + "\n"); print("report:", os.path.relpath(out, root))
print("%.0f s" % (time.time() - t0))
if bad: print("%d problem(s)" % len(bad)); sys.exit(1)
print("every screen fits")
