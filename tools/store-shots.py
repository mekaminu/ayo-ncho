"""The store pictures (Launch L15, slice 2): the eight captioned screenshots in the sizes Apple and Google ask for, and Google
Play's feature graphic — all cut from the real game, never drawn by hand.

    python3 tools/store-shots.py            render the game's screens, then frame them (about 25 minutes in SwiftShader)
    python3 tools/store-shots.py --frame    frame again from the screens already rendered (after a caption changes)
    python3 tools/store-shots.py --only=hand,path   render just those screens again, then frame everything

1. Render. Each of the eight screenshots in docs/launch/store/listing.json ("screenshots": caption, what it shows, the render it
   starts from) is played through tools/render.py's own check for it — the same flow that proves the feature works — on a phone
   (390 × 844 at 3×, touch, so the words say "tap") and on the wide layout (1180 × 820 at 2.4×, the iPad and a tablet). RENDER_SCALE
   tells render.py the pixel density; nothing about the layout changes. The renders go to docs/launch/store/src/ (kept out of git).
2. Frame. tools/store-frame.html sets each one on the dark wood under its caption (Fraunces, from @fontsource like the apps), in
   rounded corners with a brass edge, at each store's exact size, and it is saved as a JPEG with no alpha (both stores take it):
     ios-6.9      1320 × 2868  iPhone 6.9" (App Store Connect: the one iPhone size it requires; smaller iPhones are scaled from it)
     ios-13       2752 × 2064  iPad 13" landscape (required because the app runs on iPad)
     play-phone   1080 × 1920  Google Play phone, 9:16 (each side 320–3840 px, the long side at most twice the short; 1080+ for
                               the games' promotion slots)
     play-tablet  2560 × 1600  Google Play 10" tablet, 16:10
   and play-feature-1024x500.jpg, Google's feature graphic, from tools/feature-scene.html (the board itself, drawn by board.js).
3. A contact sheet, docs/launch/store/shots/sheet.jpg, for Meka to look at all of them at once, and README.md saying what goes where.

    python3 tools/store-shots.py --lang=fr  the same for the French store pages (idea 5 Nov, from L18): each check plays as in
   English (its words still prove the feature) and the picture is taken with the game turned French in place, as Settings →
   Language → Français does it (RENDER_LANG=fr in tools/render.py); framed under the French captions of listing-fr.json, the
   feature graphic's line in French, into docs/launch/store/shots-fr/ (renders in docs/launch/store/src-fr/, kept out of git).
"""
import sys, os, json, subprocess, shutil, http.server, threading, functools, urllib.parse
from playwright.sync_api import sync_playwright
from PIL import Image

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LANG = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--lang=")), "en"); assert LANG in ("en", "fr"), LANG
FR = LANG == "fr"; sfx = "-fr" if FR else ""
store = os.path.join(root, "docs", "launch", "store"); src = os.path.join(store, "src" + sfx); outd = os.path.join(store, "shots" + sfx)
english = json.load(open(os.path.join(store, "listing.json")))  # what each picture shows (the README), and the English captions
listing = json.load(open(os.path.join(store, "listing-fr.json"))) if FR else english
# Each screenshot: its short name and the render.py check that plays it (the picture is that check's <out>).
FLOWS = [("sow", ["--smoke", "--hand"]), ("path", ["--smoke", "--path"]), ("lesson", ["--lesson"]), ("friend", ["--online"]),
         ("puzzle", ["--puzzle"]), ("rating", ["--record"]), ("twoofus", ["--local"]), ("store", ["--store"])]
FORMATS = {  # name: (width, height, which render, caption size as a share of the width, the screen's share of the height)
    "ios-6.9": (1320, 2868, "phone", 0.083, 0.8), "play-phone": (1080, 1920, "phone", 0.072, 0.79),
    "ios-13": (2752, 2064, "wide", 0.052, 0.78), "play-tablet": (2560, 1600, "wide", 0.048, 0.76),
}
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
assert len(FLOWS) == len(listing["screenshots"]) == 8, "one flow for each of the listing's eight screenshots"

def render(only):
    os.makedirs(src, exist_ok=True)
    for i, (name, flags) in enumerate(FLOWS):
        if only and name not in only: continue
        for kind, scale, extra in (("phone", "3", []), ("wide", "2.4", ["--wide"])):
            out = os.path.join(src, f"{i+1:02d}-{name}-{kind}.png")
            print(f"render {name} ({kind}) …", flush=True)
            for attempt in (1, 2):  # a check that times out once under SwiftShader at the larger size gets one more go
                r = subprocess.run(["python3", os.path.join(root, "tools", "render.py"), out, *flags, *extra], cwd=root,
                                   env={**os.environ, "RENDER_SCALE": scale, **({"RENDER_LANG": "fr"} if FR else {})}, capture_output=True, text=True, timeout=900)
                if r.returncode == 0 and os.path.exists(out): break
                print(f"  again ({r.stdout.strip().splitlines()[-1:] or r.stderr.strip().splitlines()[-1:]})", flush=True)
            if r.returncode != 0 or not os.path.exists(out):
                print(r.stdout[-2000:], r.stderr[-3000:]); sys.exit(f"render {name} ({kind}) failed")

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv

def jpeg(png, path, size):
    im = Image.open(png).convert("RGB")
    if im.size != size: im = im.resize(size, Image.LANCZOS)
    im.save(path, "JPEG", quality=88, optimize=True, progressive=True, subsampling=0)

def frame():
    os.makedirs(outd, exist_ok=True)
    for f in os.listdir(outd):
        if f.endswith(".jpg"): os.remove(os.path.join(outd, f))
    srv = serve(); base = f"http://127.0.0.1:{srv.server_port}"; tmp = os.path.join(src, "_frame.png"); made = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        for fmt, (w, h, kind, cap, share) in FORMATS.items():
            pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            for i, (name, _) in enumerate(FLOWS):
                img = os.path.join(src, f"{i+1:02d}-{name}-{kind}.png")
                if not os.path.exists(img): sys.exit(f"missing {img}: run tools/store-shots.py without --frame first")
                q = urllib.parse.urlencode({"img": "/" + os.path.relpath(img, root), "caption": listing["screenshots"][i]["caption"], "cap": cap, "share": share, "lang": LANG})
                pg.goto(f"{base}/tools/store-frame.html?{q}", wait_until="load"); pg.wait_for_function("window.__done === true", timeout=30000)
                assert pg.evaluate("window.__fit"), f"{fmt} {name}: the caption does not fit in two lines"
                pg.screenshot(path=tmp); path = os.path.join(outd, f"{fmt}-{i+1:02d}-{name}.jpg"); jpeg(tmp, path, (w, h)); made.append(path)
                print("framed", os.path.relpath(path, root), flush=True)
            pg.close()
        pg = b.new_page(viewport={"width": 1024, "height": 500}, device_scale_factor=2)
        pg.goto(f"{base}/tools/feature-scene.html" + ("?lang=fr" if FR else ""), wait_until="load"); pg.wait_for_function("window.__done === true", timeout=180000)
        pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(300)
        pg.screenshot(path=tmp); feat = os.path.join(outd, "play-feature-1024x500.jpg"); jpeg(tmp, feat, (1024, 500)); made.append(feat)
        print("feature graphic", os.path.relpath(feat, root)); b.close()
    os.remove(tmp); srv.shutdown(); sheet(); readme()

def sheet():  # every picture small on one page, for Meka
    rows = []
    for fmt in FORMATS:
        ims = [Image.open(os.path.join(outd, f"{fmt}-{i+1:02d}-{n}.jpg")) for i, (n, _) in enumerate(FLOWS)]
        hh = 520 if FORMATS[fmt][2] == "phone" else 300; ims = [im.resize((round(im.width * hh / im.height), hh), Image.LANCZOS) for im in ims]
        rows.append(ims)
    feat = Image.open(os.path.join(outd, "play-feature-1024x500.jpg")).resize((614, 300), Image.LANCZOS); rows.append([feat])
    gap = 16; W = max(sum(im.width for im in r) + gap * (len(r) + 1) for r in rows); H = sum(r[0].height for r in rows) + gap * (len(rows) + 1)
    S = Image.new("RGB", (W, H), (13, 9, 6)); y = gap
    for r in rows:
        x = gap
        for im in r: S.paste(im, (x, y)); x += im.width + gap
        y += r[0].height + gap
    S.save(os.path.join(outd, "sheet.jpg"), "JPEG", quality=82, optimize=True)

def readme():
    if FR: return readme_fr()
    L = ["# The store pictures", "", "Made by `python3 tools/store-shots.py` from the real game (do not edit by hand; run it again after the look changes).",
         "Every picture is a JPEG with no transparency, at exactly the size its store asks for. `sheet.jpg` shows them all at once.", "",
         "| Where it goes | Files | Size |", "|---|---|---|",
         "| App Store Connect → iPhone 6.9\" Display | `ios-6.9-01-…` to `-08-…` | 1320 × 2868 |",
         "| App Store Connect → iPad 13\" Display | `ios-13-01-…` to `-08-…` | 2752 × 2064 |",
         "| Play Console → Main store listing → Phone screenshots | `play-phone-01-…` to `-08-…` | 1080 × 1920 |",
         "| Play Console → Main store listing → 10-inch tablet screenshots (7-inch takes the same) | `play-tablet-01-…` to `-08-…` | 2560 × 1600 |",
         "| Play Console → Main store listing → Feature graphic | `play-feature-1024x500.jpg` | 1024 × 500 |", "",
         "Upload them in this order (the first two or three are the ones people see in search):", ""]
    for i, s in enumerate(listing["screenshots"]): L.append(f"{i+1}. **{s['caption']}** — {s['shows']}")
    open(os.path.join(outd, "README.md"), "w").write("\n".join(L) + "\n")

def readme_fr():
    L = ["# The store pictures in French", "",
         "Made by `python3 tools/store-shots.py --lang=fr` from the real game in French (do not edit by hand). The same eight screens as",
         "`../shots/`, the same sizes, under the French captions of `../listing-fr.json`. `sheet.jpg` shows them all at once.", "",
         "| Where it goes (French, fr-FR) | Files | Size |", "|---|---|---|",
         "| App Store Connect → the French localisation → iPhone 6.9\" Display | `ios-6.9-01-…` to `-08-…` | 1320 × 2868 |",
         "| App Store Connect → the French localisation → iPad 13\" Display | `ios-13-01-…` to `-08-…` | 2752 × 2064 |",
         "| Play Console → Main store listing → Manage translations → French → Phone screenshots | `play-phone-01-…` to `-08-…` | 1080 × 1920 |",
         "| Play Console → … → French → 10-inch tablet screenshots (7-inch takes the same) | `play-tablet-01-…` to `-08-…` | 2560 × 1600 |",
         "| Play Console → … → French → Feature graphic | `play-feature-1024x500.jpg` | 1024 × 500 |", "",
         "In this order, as the English:", ""]
    for i, s in enumerate(listing["screenshots"]): L.append(f"{i+1}. **{s['caption']}** — {english['screenshots'][i]['shows']}")
    open(os.path.join(outd, "README.md"), "w").write("\n".join(L) + "\n")

if __name__ == "__main__":
    only = next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--only=")), None)
    if "--frame" not in sys.argv: render(only)
    frame()
