#!/usr/bin/env python3
"""Harga pangan harian Kab. Belitung -> data/harga-pangan.json (situs lama) +
web/src/data/harga-pangan.json (situs Next.js, dibaca getDailyPrices).

Sumber utama (23 Nov 2026): Panel Harga Pangan Badan Pangan Nasional, harga
konsumen/eceran Kab. Belitung (city_id=140, province_id=9), diperbarui tiap hari
oleh enumerator, plus harga kemarin. API publik tanpa key:
  https://api-panelhargav2.badanpangan.go.id/api/front/harga-pangan-informasi
ADAT Belitung (adat.belitung.go.id/komoditas) tidak diperbarui sejak 01-11-2026,
jadi hanya dipakai sebagai cadangan kalau Panel Harga gagal.
Gagal = keluar non-zero, JSON lama dipertahankan (tidak ada angka karangan).
"""
import datetime as dt, json, os, re, sys, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_OLD = os.path.join(ROOT, "data", "harga-pangan.json")
OUT_WEB = os.path.join(ROOT, "web", "src", "data", "harga-pangan.json")
WIB = dt.timezone(dt.timedelta(hours=7))
NOW = dt.datetime.now(WIB)
UA = {"User-Agent": "Mozilla/5.0 (iTAP Belitung; +https://itapbelitung.my.id)", "Accept": "application/json"}
API = "https://api-panelhargav2.badanpangan.go.id/api/front/harga-pangan-informasi?province_id=9&city_id=140&level_harga_id=3"
PAGE = "https://panelharga.badanpangan.go.id/"
SOURCE = "Panel Harga Pangan Badan Pangan Nasional (harga eceran Kab. Belitung)"

def get(url, timeout=40):
    last = None
    for _ in range(3):
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

raw = json.loads(get(API))
rows = [r for r in raw.get("data", []) if (r.get("today") or 0) > 0]
if len(rows) < 8:
    sys.exit(f"Panel Harga: hanya {len(rows)} komoditas berharga, JSON lama dipertahankan")
kemarin = rows[0].get("yesterday_date")  # dd-mm-yyyy

old_items, web_items = [], []
for r in rows:
    today, prev = int(round(r["today"])), int(round(r.get("yesterday") or 0)) or None
    if prev is None:
        status, note = "tetap", "Harga kemarin belum tercatat di sumber."
    elif today > prev:
        status, note = "naik", f"Naik {rp(today - prev)} ({pct(today / prev - 1)}) dari {rp(prev)} kemarin."
    elif today < prev:
        status, note = "turun", f"Turun {rp(prev - today)} ({pct(1 - today / prev)}) dari {rp(prev)} kemarin."
    else:
        status, note = "tetap", f"Sama dengan kemarin ({rp(prev)})."
    old_items.append({"komoditas": r["name"], "harga": today, "satuan": unit(r.get("satuan")), "status": status,
                      "perubahan": note, "harga_kemarin": prev})
    web_items.append({"id": f"panelharga-{r['id']}", "commodity": r["name"], "price": today, "unit": unit(r.get("satuan")),
                      "previous_price": prev, "status": status if status != "tetap" else "—", "change_note": note})

# Tanggal data = hari setelah "yesterday_date" sumber (bukan jam runner).
try:
    data_date = dt.datetime.strptime(kemarin, "%d-%m-%Y").date() + dt.timedelta(days=1)
except Exception:
    data_date = NOW.date()
tgl = data_date.strftime("%d-%m-%Y")
old = {"tanggal_sumber": tgl, "tanggal_kemarin": kemarin, "lokasi": "Kab. Belitung (pasar pantauan Badan Pangan Nasional)",
       "diambil": NOW.strftime("%Y-%m-%d %H:%M WIB"), "sumber": SOURCE, "url": PAGE, "items": old_items}
web = {"source": SOURCE, "source_url": PAGE, "market": "Kab. Belitung (pasar pantauan Panel Harga Pangan)",
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
print(len(rows), "komoditas Kab. Belitung,", tgl, "| kemarin", kemarin)
