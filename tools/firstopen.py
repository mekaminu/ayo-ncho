# Quick on a slow line (idea 8 Nov): how long the game link takes to reach the board on a phone on a slow line, and what it downloads.
# A friend opening an invite link in Lagos on 3G, or the family on a patchy line, meets the game first through this wait. The real
# server (server/index.js) runs on this machine; headless Chromium opens it as a phone (390x844, touch) on an emulated slow line
# (300 ms round trip, 1.6 Mbit/s down, 750 kbit/s up) with the processor slowed 4x, from a cold cache, and times the open until
# the board has drawn three frames (window.__ayoUp); then it opens the page again (the browser's cache warm) and times that.
# The 3D library comes from the game's own server (?local3d=1), so the test needs no outside network; cdnjs sends it compressed
# just as the game's server now does. Google's fonts are left out (the page draws with its fallback while they come).
# Usage: python3 tools/firstopen.py [report.md] [--budget]   -> prints both opens; writes the report (default docs/launch/firstopen.md)
#        --budget: fail (exit 1) when the first open downloads more than BUDGET_KB or takes longer than BUDGET_S
import json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
out = args[0] if args else os.path.join(root, "docs", "launch", "firstopen.md")
BUDGET_KB, BUDGET_S = 900, 25
PORT = int(os.environ.get("FIRSTOPEN_PORT", "8781"))
LINE = {"offline": False, "latency": 300, "downloadThroughput": 1.6e6 / 8, "uploadThroughput": 750e3 / 8}

def serve():
    env = dict(os.environ, PORT=str(PORT), ROOM_SECRET="firstopen-check")
    p = subprocess.Popen(["node", os.path.join(root, "server", "index.js")], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):
        try: urllib.request.urlopen("http://127.0.0.1:%d/healthz" % PORT, timeout=1); return p
        except Exception: time.sleep(0.1)
    p.kill(); raise SystemExit("the server did not start")

def open_once(ctx, pg, cdp, label):
    seen = {}
    def fin(e): seen[e["requestId"]] = seen.get(e["requestId"], 0) + e.get("encodedDataLength", 0)
    cdp.on("Network.loadingFinished", fin)
    t0 = time.time()
    pg.goto("http://127.0.0.1:%d/?local3d=1" % PORT, wait_until="commit")
    pg.wait_for_function("window.__ayoUp === true", timeout=120000, polling=50)
    s = time.time() - t0
    time.sleep(0.5)
    kb = sum(seen.values()) / 1024
    cdp.remove_listener("Network.loadingFinished", fin)
    return {"open": label, "seconds": round(s, 1), "kb": round(kb), "requests": len(seen)}

def main():
    srv = serve()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
            ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=1)
            pg = ctx.new_page()
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            cdp = ctx.new_cdp_session(pg)  # (no page.route: Playwright turns the browser's cache off while a route is set)
            cdp.send("Network.enable"); cdp.send("Network.setBlockedURLs", {"urls": ["*fonts.googleapis.com*", "*fonts.gstatic.com*"]}); cdp.send("Network.emulateNetworkConditions", LINE)
            cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
            rows = [open_once(ctx, pg, cdp, "first"), open_once(ctx, pg, cdp, "again")]
            b.close()
    finally:
        srv.kill()
    if errors: print("page errors:", errors); sys.exit(1)
    for r in rows: print("%-6s %5.1f s  %5d KB  %3d requests" % (r["open"], r["seconds"], r["kb"], r["requests"]))
    first = rows[0]
    with open(out, "w") as f:
        f.write("# Quick on a slow line\n\nThe game link opened as a phone (390x844) on an emulated slow line (300 ms round trip, 1.6 Mbit/s down) "
                "with the processor slowed 4x, timed until the board has drawn (tools/firstopen.py). Budget for the first open: "
                "%d KB and %d s.\n\n| Open | Time to the board | Downloaded | Requests |\n|---|---|---|---|\n" % (BUDGET_KB, BUDGET_S))
        for r in rows: f.write("| %s | %.1f s | %d KB | %d |\n" % ("First (cold cache)" if r["open"] == "first" else "Again (cache warm)", r["seconds"], r["kb"], r["requests"]))
    print(json.dumps(rows))
    if "--budget" in sys.argv and (first["kb"] > BUDGET_KB or first["seconds"] > BUDGET_S):
        print("over budget"); sys.exit(1)

main()
