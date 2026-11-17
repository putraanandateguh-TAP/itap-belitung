#!/usr/bin/env python3
"""Audit repo itapbelitung.my.id. Jalankan dari root repo: python3 scripts/audit.py [--render]"""
import json, os, re, subprocess, sys, glob
ok = []; bad = []
def chk(name, cond, detail=""):
    (ok if cond else bad).append(f"{name}{(' | ' + detail) if detail and not cond else ''}")
def read(p): return open(p, encoding="utf-8", errors="replace").read()
files = lambda pat: [f for f in glob.glob(pat, recursive=True) if "node_modules" not in f and ".git/" not in f and ".bak" not in f]

# 1. sintaks JS
js = files("**/*.js") + files("**/*.mjs")
errs = []
for f in js:
    r = subprocess.run(["node", "--check", f], capture_output=True, text=True)
    if r.returncode: errs.append(f"{f}: {r.stderr.strip().splitlines()[0][:80] if r.stderr.strip() else 'error'}")
chk(f"sintaks JS ({len(js)} file)", not errs, "; ".join(errs[:4]))

# 2. index.html: id ganda, anchor tanpa target, gambar tanpa alt
if os.path.exists("index.html"):
    h = read("index.html")
    ids = re.findall(r'\bid="([^"]+)"', h)
    dup = sorted({i for i in ids if ids.count(i) > 1})
    chk("id ganda di index.html", not dup, ", ".join(dup[:8]))
    anchors = {a for a in re.findall(r'href="#([^"]+)"', h) if a}
    miss = sorted(a for a in anchors if a not in ids)
    chk("anchor tanpa target", not miss, ", ".join(miss[:8]))
    noalt = len([t for t in re.findall(r"<img[^>]*>", h) if "alt=" not in t])
    chk("gambar tanpa alt", noalt == 0, str(noalt))
    title = re.search(r"<title>(.*?)</title>", h, re.S)
    og = re.search(r'og:title" content="([^"]*)"', h)
    chk("judul <title> sama dengan og:title", bool(title and og and title.group(1).strip() == og.group(1).strip()),
        f"title={title.group(1).strip()[:40] if title else None} og={og.group(1)[:40] if og else None}")

# 3. service worker: precache ada, VER
if os.path.exists("sw.js"):
    t = read("sw.js")
    m = re.search(r"PRECACHE\s*=\s*\[([\s\S]*?)\]", t)
    lst = re.findall(r"'([^']+)'", m.group(1)) if m else []
    gone = []
    for p in lst:
        q = p.split("?")[0].lstrip("/") or "index.html"
        if not (os.path.exists(q) or os.path.exists(q.rstrip("/") + "/index.html")): gone.append(p)
    chk(f"precache sw.js ({len(lst)} entri) file ada semua", not gone, ", ".join(gone[:6]))
    chk("VER sw.js terdefinisi", bool(re.search(r"const VER = 'itap-v\d+'", t)))

# 4. manifest + sitemap
if os.path.exists("manifest.webmanifest"):
    mf = json.loads(read("manifest.webmanifest"))
    gone = [i["src"] for i in mf.get("icons", []) if not os.path.exists(i["src"].lstrip("/"))]
    chk("ikon manifest ada", not gone, ", ".join(gone))
if os.path.exists("sitemap.xml"):
    locs = re.findall(r"<loc>https://itapbelitung\.my\.id/([^<]*)</loc>", read("sitemap.xml"))
    gone = [p for p in locs if p and not (os.path.exists(p) or os.path.exists(p.rstrip("/") + "/index.html") or os.path.exists(p + ".html"))]
    chk(f"sitemap ({len(locs)} url) menunjuk ke file ada", not gone, ", ".join(gone[:6]))

# 5. YAML workflow valid
try:
    import yaml
    bady = []
    for f in files(".github/workflows/*.yml") + files(".github/workflows/*.yaml"):
        try: yaml.safe_load(read(f))
        except Exception as e: bady.append(f"{f}: {str(e).splitlines()[0][:60]}")
    chk("YAML workflow valid", not bady, "; ".join(bady))
except ImportError:
    ok.append("YAML workflow: DILEWATI (pip install pyyaml untuk mengaktifkan)")

# 6. rahasia di repo
pat = re.compile(r"service_role\s*[:=]\s*['\"]ey|sb_secret_[A-Za-z0-9]{10}|AIza[0-9A-Za-z_-]{30}|sk-[A-Za-z0-9]{24}|ghp_[A-Za-z0-9]{30}|-----BEGIN [A-Z ]*PRIVATE KEY-----|VAPID_PRIVATE_KEY\s*[:=]\s*['\"][A-Za-z0-9_-]{40}")
hits = []
for f in files("**/*"):
    if os.path.isfile(f) and os.path.getsize(f) < 2_000_000 and not f.endswith((".png", ".jpg", ".webp", ".apk", ".mp3", ".ico", ".woff2")):
        if pat.search(read(f)): hits.append(f)
chk("tidak ada rahasia di repo", not hits, ", ".join(hits[:5]))

# 7. VAPID publik
if os.path.exists("config.js"):
    k = re.search(r"VAPID_PUBLIC_KEY:\s*'([^']*)'", read("config.js"))
    chk("VAPID_PUBLIC_KEY di config.js (87 karakter)", bool(k and len(k.group(1)) == 87), "kosong atau panjang salah")

# 8. render (opsional)
if "--render" in sys.argv:
    try:
        import socket, time
        from playwright.sync_api import sync_playwright
        s = socket.socket(); s.bind(("", 0)); port = s.getsockname()[1]; s.close()
        srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1.5)
        try:
            with sync_playwright() as p:
                b = p.chromium.launch()
                for w in (360, 390, 768, 1280):
                    pg = b.new_page(viewport={"width": w, "height": 800}); errs = []
                    pg.on("pageerror", lambda e: errs.append(str(e)[:60]))
                    for pid in ("beranda", "menu", "berita", "cuaca", "sos"):
                        pg.goto(f"http://localhost:{port}/index.html#{pid}", wait_until="networkidle"); pg.wait_for_timeout(600)
                        chk(f"render {w}px #{pid}: tanpa geser samping", not pg.evaluate("document.documentElement.scrollWidth>document.documentElement.clientWidth"))
                    chk(f"render {w}px: tanpa galat JS", not errs, "; ".join(errs[:2]))
                    pg.close()
                b.close()
        finally:
            srv.terminate()
    except ImportError:
        ok.append("render: DILEWATI (butuh playwright)")

print("LULUS:"); [print("  +", x) for x in ok]
print("GAGAL:" if bad else "GAGAL: (tidak ada)"); [print("  !", x) for x in bad]
sys.exit(1 if bad else 0)
