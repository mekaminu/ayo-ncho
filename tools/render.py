# Render web/index.html to a PNG with headless Chromium (software WebGL). Usage: python3 tools/render.py out.png [?query]
import sys, base64, http.server, threading, functools, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; q = sys.argv[2] if len(sys.argv) > 2 else "?still=1"
root = os.path.join(os.path.dirname(__file__), "..", "web")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(http.server.SimpleHTTPRequestHandler, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.goto("http://127.0.0.1:8766/index.html" + q, wait_until="load")
    pg.wait_for_function("window.__done===true", timeout=180000)
    data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
    open(out, "wb").write(base64.b64decode(data.split(",")[1])); b.close()
srv.shutdown(); print("wrote", out)
