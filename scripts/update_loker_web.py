#!/usr/bin/env python3
"""Segarkan web/src/data/loker.json (dibaca /lowongan & /api/jobs) dari sumber
publik, tanpa asisten/kredit (23 Nov 2026, jalan di GitHub Actions).

Sumber:
- JobStreet: API pencarian publik (lokasi Belitung & Bangka Belitung).
- NyamanKerje (portal resmi Pemkab Belitung Timur): halaman daftar lowongan.
- Glints & Loker.id: dari data/loker.json hasil scripts/update_loker.py.
Aturan:
- Entri kurasi lama dipertahankan (ringkasan tulisan tim tidak ditimpa),
  'dicek' diperbarui bila lowongan masih tampil di sumber.
- Dibuang: batas_lamaran sudah lewat, atau tanggal_posting > 45 hari.
- Bila semua sumber gagal (< 5 lowongan terbaca), file lama TIDAK diubah.
"""
import datetime as dt, html, json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "web", "src", "data", "loker.json")
SCRAPED = os.path.join(ROOT, "data", "loker.json")
WIB = dt.timezone(dt.timedelta(hours=7))
TODAY = dt.datetime.now(WIB).date()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
MAX_AGE = 45
BELITUNG = re.compile(r"belitung|belitong|tanjung ?pandan|manggar|sijuk|membalong|badau|selat nasik|gantung|kelapa kampit|dendang|damar|simpang renggiang|simpang pesak", re.I)
MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"])}
MONTHS.update({"may": 5, "aug": 8, "oct": 10, "dec": 12})

def get(url, timeout=30):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read().decode("utf-8", "ignore")

def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def norm(url):
    return (url or "").strip().split("?")[0].rstrip("/").lower()

def bagian(text):
    t = re.sub(r"(provinsi |prov\.? |kep(ulauan|\.)? )?bangka[ -]belitung|\bbabel\b", " ", text.lower())
    return "Belitung" if BELITUNG.search(t) else "Babel lainnya"

def wib_date(iso):
    try:
        return dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(WIB).date().isoformat()
    except Exception:
        return None

def jobstreet():
    out, seen = [], set()
    for where in ("Belitung", "Bangka Belitung"):
        for page in (1, 2, 3):
            q = urllib.parse.urlencode({"siteKey": "ID-Main", "where": where, "page": page, "pageSize": 100, "locale": "id-ID"})
            d = json.loads(get("https://id.jobstreet.com/api/jobsearch/v5/search?" + q))
            data = d.get("data") or []
            for j in data:
                if j["id"] in seen:
                    continue
                seen.add(j["id"])
                loc = ", ".join(l.get("label", "") for l in j.get("locations") or []) or where
                cls = (j.get("classifications") or [{}])[0].get("classification", {}).get("description")
                teaser = clean(j.get("teaser"))
                out.append({
                    "judul": clean(j.get("title")), "perusahaan": clean((j.get("advertiser") or {}).get("description")) or "Tidak tercantum",
                    "lokasi": loc, "kategori": cls, "gaji": clean(j.get("salaryLabel")) or None,
                    "tanggal_posting": wib_date(j.get("listingDate", "")), "dicek": TODAY.isoformat(), "sumber": "JobStreet",
                    "link": f"https://id.jobstreet.com/id/job/{j['id']}", "ringkasan": teaser or None,
                    "bagian": bagian(loc + " | " + j.get("title", "")), "batas_lamaran": None,
                })
            if len(data) < 100:
                break
    return out

def nyamankerje():
    h = get("https://nyamankerje.beltim.go.id/lowongan-kerja")
    out = []
    for card in re.split(r'(?=Batas Pendaftaran:)', h)[1:]:
        m = re.search(r'<a href="(https://nyamankerje\.beltim\.go\.id/lowongan-kerja/[0-9a-f-]{36})">(.*?)</a>', card, re.S)
        if not m:
            continue
        title = clean(m.group(2))
        comp = re.search(r'</h3>\s*<p[^>]*>(.*?)</p>', card, re.S)
        bl = re.match(r"Batas Pendaftaran:\s*(\d{1,2}) (\w{3})\w* (\d{4})", clean(card[:120]))
        deadline = None
        if bl and bl.group(2).lower()[:3] in MONTHS:
            deadline = dt.date(int(bl.group(3)), MONTHS[bl.group(2).lower()[:3]], int(bl.group(1))).isoformat()
        loc = re.search(r'</svg>\s*([^<]{3,80}?)\s*</div>', card[card.find('border-t'):] if 'border-t' in card else "")
        lokasi = clean(loc.group(1)).replace("...", "").strip(" ,") if loc else "Belitung Timur"
        if "belitung timur" not in lokasi.lower():
            lokasi = (lokasi + ", Belitung Timur").strip(", ")
        out.append({
            "judul": re.sub(r"^Lowongan Kerja\s+", "", title), "perusahaan": clean(comp.group(1)) if comp else "Tidak tercantum",
            "lokasi": lokasi, "kategori": None, "gaji": None, "tanggal_posting": None, "dicek": TODAY.isoformat(),
            "sumber": "NyamanKerje (Pemkab Belitung Timur)", "link": m.group(1), "ringkasan": None,
            "bagian": "Belitung", "batas_lamaran": deadline,
        })
    return out

def scraped():
    try:
        items = json.load(open(SCRAPED)).get("items", [])
    except Exception:
        return []
    out = []
    for j in items:
        if j.get("source") not in ("Glints", "Loker.id"):
            continue  # sumber berita bukan lowongan langsung
        out.append({
            "judul": j.get("title"), "perusahaan": j.get("company") or "Tidak tercantum", "lokasi": j.get("location") or "Bangka Belitung",
            "kategori": None, "gaji": None, "tanggal_posting": (j.get("date") or "")[:10] or None, "dicek": TODAY.isoformat(),
            "sumber": j.get("source"), "link": j.get("url"), "ringkasan": None,
            "bagian": bagian((j.get("location") or "") + " | " + (j.get("title") or "")), "batas_lamaran": None,
        })
    return out

cur = json.load(open(OUT))
fresh, errors = [], []
for name, fn in (("JobStreet", jobstreet), ("NyamanKerje", nyamankerje), ("Glints/Loker.id", scraped)):
    try:
        got = fn()
        print(f"{name}: {len(got)}")
        fresh += got
    except Exception as e:
        errors.append(f"{name}: {e}")
        print(f"::warning::{name} gagal: {e}")
if len(fresh) < 5:
    sys.exit("Sumber lowongan < 5 entri, loker.json lama dipertahankan")

by_link = {norm(j["link"]): j for j in fresh if j.get("link") and j.get("judul")}
merged, used = [], set()
for j in cur.get("lowongan", []):
    k = norm(j.get("link"))
    if k in by_link:
        f = by_link[k]
        j = dict(j)
        j["dicek"] = TODAY.isoformat()
        for key in ("batas_lamaran", "gaji", "tanggal_posting"):
            if not j.get(key) and f.get(key):
                j[key] = f[key]
        used.add(k)
    merged.append(j)
for k, j in by_link.items():
    if k not in used:
        merged.append(j)

def keep(j):
    bl = j.get("batas_lamaran")
    if bl and re.match(r"\d{4}-\d{2}-\d{2}", str(bl)) and str(bl)[:10] < TODAY.isoformat():
        return False
    tp = j.get("tanggal_posting")
    if tp and re.match(r"\d{4}-\d{2}-\d{2}", str(tp)):
        if (TODAY - dt.date.fromisoformat(str(tp)[:10])).days > MAX_AGE:
            return False
    return True

merged = [j for j in merged if keep(j)]
merged.sort(key=lambda j: (j.get("bagian") != "Belitung", -(int((j.get("tanggal_posting") or "0000-00-00").replace("-", "")))))
bel = sum(1 for j in merged if j.get("bagian") == "Belitung")
meta = dict(cur.get("meta") or {})
meta.update({
    "diperbarui": TODAY.isoformat(),
    "jumlah": {"belitung": bel, "babel_lainnya": len(merged) - bel, "total": len(merged)},
    "otomatis": "GitHub Actions update-data.yml (scripts/update_loker_web.py): JobStreet, NyamanKerje, Glints, Loker.id",
})
new = {**cur, "meta": meta, "lowongan": merged}
old_cmp = {**cur, "meta": {**(cur.get("meta") or {}), "diperbarui": None}}
new_cmp = {**new, "meta": {**meta, "diperbarui": None}}
if json.dumps(old_cmp, sort_keys=True) == json.dumps(new_cmp, sort_keys=True):
    print("Lowongan tidak berubah")
    sys.exit(0)
json.dump(new, open(OUT, "w"), ensure_ascii=False, indent=2)
print(f"loker.json: {len(merged)} lowongan ({bel} Belitung)", "| gagal:", errors or "-")
