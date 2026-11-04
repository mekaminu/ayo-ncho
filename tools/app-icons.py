"""The Android app's icons and splash, from web/icon.svg (the web link's icon), so the app never shows Capacitor's own.
Run: python3 tools/app-icons.py   (L6 will replace icon.svg with one cut from the 3D render; run this again then.)
  - mipmap-*/ic_launcher.png, ic_launcher_round.png: the whole icon (legacy launchers)
  - mipmap-*/ic_launcher_foreground.png: the board alone on transparent, inside the adaptive icon's safe circle,
    over the dark background colour (values/ic_launcher_background.xml)
  - drawable*/splash.png: the board small in the middle of the dark lamp-lit wood colour
"""
import io, pathlib, re
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
RES = ROOT / 'android/app/src/main/res'
DARK = (13, 9, 6, 255)
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
SPLASH = {'mdpi': (320, 480), 'hdpi': (480, 800), 'xhdpi': (720, 1280), 'xxhdpi': (960, 1600), 'xxxhdpi': (1280, 1920)}

def render(svg, px):
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': px, 'height': px})
        pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width=\"{px}\" height=\"{px}\" ", 1)}</body></html>')
        png = pg.screenshot(omit_background=True, clip={'x': 0, 'y': 0, 'width': px, 'height': px}); b.close()
    return Image.open(io.BytesIO(png)).convert('RGBA')

def main():
    svg = (ROOT / 'web/icon.svg').read_text()
    whole = render(svg, 1024)
    board_only = render(re.sub(r'<rect width="512" height="512"[^>]*/>', '', svg, count=1), 1024)  # no dark tile: the adaptive background is the tile
    for d, k in DENS.items():
        out = RES / f'mipmap-{d}'
        s = round(48 * k); whole.resize((s, s), Image.LANCZOS).save(out / 'ic_launcher.png')
        # round: the same icon cut to a circle
        r = whole.resize((s, s), Image.LANCZOS); m = Image.new('L', (s * 4, s * 4), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(m).ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255); m = m.resize((s, s), Image.LANCZOS)
        bg = Image.new('RGBA', (s, s), (0, 0, 0, 0)); bg.paste(r, (0, 0), m); bg.save(out / 'ic_launcher_round.png')
        f = round(108 * k); inner = round(f * 0.62)  # inside the 66 dp safe zone
        fg = Image.new('RGBA', (f, f), (0, 0, 0, 0)); fg.alpha_composite(board_only.resize((inner, inner), Image.LANCZOS), ((f - inner) // 2, (f - inner) // 2))
        fg.save(out / 'ic_launcher_foreground.png')
    def splash(w, h, path):
        im = Image.new('RGBA', (w, h), DARK); s = round(min(w, h) * 0.34)
        im.alpha_composite(board_only.resize((s, s), Image.LANCZOS), ((w - s) // 2, (h - s) // 2)); im.convert('RGB').save(path)
    for d, (w, h) in SPLASH.items():
        splash(w, h, RES / f'drawable-port-{d}/splash.png'); splash(h, w, RES / f'drawable-land-{d}/splash.png')
    splash(480, 320, RES / 'drawable/splash.png')
    (RES / 'values/ic_launcher_background.xml').write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0D0906</color>\n</resources>\n')
    print('icons and splash written under', RES.relative_to(ROOT))

if __name__ == '__main__':
    main()
