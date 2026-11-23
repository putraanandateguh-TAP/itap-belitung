#!/usr/bin/env python3
"""Harga pangan harian Kab. Belitung -> data/harga-pangan.json (situs lama) +
web/src/data/harga-pangan.json (situs Next.js, dibaca getDailyPrices).

Sumber utama (23 Nov 2026): PIHPS Nasional Bank Indonesia, pasar tradisional
Tanjung Pandan (province_id=9, regency_id=21), diperbarui tiap hari kerja, plus
harga hari data sebelumnya. Bisa diakses dari runner GitHub (diuji 23 Nov).
Cadangan: Panel Harga Bapanas Kab. Belitung (city_id=140), tetapi API-nya
timeout dari runner GitHub (kemungkinan blokir IP luar negeri).
ADAT Belitung (adat.belitung.go.id/komoditas) tidak diperbarui sejak 01-11-2026,
jadi hanya dipakai sebagai cadangan kalau Panel Harga gagal.
Gagal = keluar non-zero, JSON lama dipertahankan (tidak ada angka karangan).
"""
import datetime as dt, json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_OLD = os.path.join(ROOT, "data", "harga-pangan.json")
OUT_WEB = os.path.join(ROOT, "web", "src", "data", "harga-pangan.json")
WIB = dt.timezone(dt.timedelta(hours=7))
NOW = dt.datetime.now(WIB)
UA = {"User-Agent": "Mozilla/5.0 (iTAP Belitung; +https://itapbelitung.my.id)", "Accept": "application/json"}
API = "https://api-panelhargav2.badanpangan.go.id/api/front/harga-pangan-informasi?province_id=9&city_id=140&level_harga_id=3"
PAGE = "https://panelharga.badanpangan.go.id/"
SOURCE = "Panel Harga Pangan Badan Pangan Nasional (harga eceran Kab. Belitung)"
PIHPS_API = "https://www.bi.go.id/hargapangan/WebSite/TabelHarga/GetGridDataDaerah"
PIHPS_PAGE = "https://www.bi.go.id/hargapangan"
PIHPS_SOURCE = "PIHPS Nasional Bank Indonesia (pasar tradisional Tanjung Pandan)"

def get(url, timeout=40, tries=3):
    last = None
    for _ in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read().decode("utf-8", "ignore")
        except Exception as e:  # coba ulang singkat
            last = e
    raise last

def rp(n):
    return "Rp " + f"{int(round(n)):,}".replace(",", ".")

def pct(x):
    return f"{x * 100:.1f}".replace(".", ",") + "%"

def unit(s):
    s = (s or "").lower().replace("rp.", "").replace("rp", "").replace("/", "").strip()
    return {"kg": "kg", "liter": "liter"}.get(s, s or "kg")

def bi_pihps():
    """Bank Indonesia PIHPS, pasar tradisional Tanjung Pandan (regency 21). Hari kerja."""
    end = NOW.date(); start = end - dt.timedelta(days=12)
    q = urllib.parse.urlencode({"price_type_id": 1, "comcat_id": "", "province_id": 9, "regency_id": 21, "market_id": "",
                                "tipe_laporan": 1, "start_date": start.isoformat(), "end_date": end.isoformat()})
    data = json.loads(get(PIHPS_API + "?" + q, timeout=30)).get("data", [])
    num = lambda v: int(str(v).replace(",", "")) if re.fullmatch(r"[\d,]+", str(v or "").strip()) else None
    items, dates = [], set()
    for r in data:
        if r.get("level") != 2:
            continue
        cols = sorted([k for k in r if re.fullmatch(r"\d{2}/\d{2}/\d{4}", k)], key=lambda k: dt.datetime.strptime(k, "%d/%m/%Y"))
        vals = [(k, num(r[k])) for k in cols if num(r[k])]
        if not vals:
            continue
        (d1, today), prev = vals[-1], (vals[-2] if len(vals) > 1 else (None, None))
        dates.add(d1)
        name = re.sub(r"\s+", " ", r["name"]).strip()
        items.append({"id": "pihps-" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"), "name": name,
                      "unit": "liter" if "minyak" in name.lower() else "kg", "today": today, "prev": prev[1], "prev_date": prev[0]})
    if not items:
        raise RuntimeError("PIHPS kosong")
    latest = max(dates, key=lambda k: dt.datetime.strptime(k, "%d/%m/%Y"))
    items = [i for i in items]  # semua komoditas level 2
    return {"source": PIHPS_SOURCE, "url": PIHPS_PAGE, "market": "Pasar tradisional Tanjung Pandan (pantauan PIHPS Bank Indonesia)",
            "date": dt.datetime.strptime(latest, "%d/%m/%Y").date(), "items": items}

def bapanas():
    """Panel Harga Bapanas Kab. Belitung (city 140). Diblokir dari runner GitHub (timeout), cadangan saja."""
    raw = json.loads(get(API, timeout=15, tries=1))
    rows = [r for r in raw.get("data", []) if (r.get("today") or 0) > 0]
    if len(rows) < 8:
        raise RuntimeError(f"Panel Harga: hanya {len(rows)} komoditas")
    kem = rows[0].get("yesterday_date")
    try:
        date = dt.datetime.strptime(kem, "%d-%m-%Y").date() + dt.timedelta(days=1)
    except Exception:
        date = NOW.date()
    return {"source": SOURCE, "url": PAGE, "market": "Kab. Belitung (pasar pantauan Panel Harga Pangan)", "date": date,
            "items": [{"id": f"panelharga-{r['id']}", "name": r["name"], "unit": unit(r.get("satuan")), "today": int(round(r["today"])),
                       "prev": int(round(r.get("yesterday") or 0)) or None, "prev_date": kem} for r in rows]}

src, errs = None, []
for fn in (bi_pihps, bapanas):
    try:
        src = fn(); break
    except Exception as e:
        errs.append(f"{fn.__name__}: {e}")
        print(f"::warning::{fn.__name__} gagal: {e}")
if not src or len(src["items"]) < 8:
    sys.exit("Semua sumber harga pangan gagal, JSON lama dipertahankan | " + "; ".join(errs))

old_items, web_items = [], []
for r in src["items"]:
    today, prev, pd = r["today"], r["prev"], r.get("prev_date") or "kemarin"
    if not prev:
        status, note = "tetap", "Harga sebelumnya belum tercatat di sumber."
    elif today > prev:
        status, note = "naik", f"Naik {rp(today - prev)} ({pct(today / prev - 1)}) dari {rp(prev)} ({pd})."
    elif today < prev:
        status, note = "turun", f"Turun {rp(prev - today)} ({pct(1 - today / prev)}) dari {rp(prev)} ({pd})."
    else:
        status, note = "tetap", f"Sama dengan {pd} ({rp(prev)})."
    old_items.append({"komoditas": r["name"], "harga": today, "satuan": r["unit"], "status": status, "perubahan": note, "harga_sebelumnya": prev})
    web_items.append({"id": r["id"], "commodity": r["name"], "price": today, "unit": r["unit"], "previous_price": prev,
                      "status": status if status != "tetap" else "—", "change_note": note})

data_date = src["date"]
tgl = data_date.strftime("%d-%m-%Y")
kemarin = src["items"][0].get("prev_date")
old = {"tanggal_sumber": tgl, "tanggal_sebelumnya": kemarin, "lokasi": src["market"],
       "diambil": NOW.strftime("%Y-%m-%d %H:%M WIB"), "sumber": src["source"], "url": src["url"], "items": old_items}
web = {"source": src["source"], "source_url": src["url"], "market": src["market"],
       "source_date": data_date.isoformat(), "fetched_at": NOW.isoformat(timespec="seconds"), "items": web_items}

def same(path, new, keys):
    try:
        cur = json.load(open(path))
    except Exception:
        return False
    return all(cur.get(k) == new.get(k) for k in keys)

# Tulis hanya bila isi berubah atau hari baru (hindari commit kosong tiap jam).
if not same(OUT_WEB, web, ("source_date", "items")):
    json.dump(web, open(OUT_WEB, "w"), ensure_ascii=False, indent=1)
if not same(OUT_OLD, old, ("tanggal_sumber", "items")):
    json.dump(old, open(OUT_OLD, "w"), ensure_ascii=False, indent=1)
print(len(web_items), "komoditas,", src["source"], tgl, "| sebelumnya", kemarin)
