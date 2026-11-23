#!/usr/bin/env python3
"""Penentu langkah update-data.yml (23 Nov 2026).

Jadwal cron GitHub sering telat 1-5 jam atau DILEWATI saat antrean padat
(terbukti: slot 00:00 UTC harga pangan beberapa hari tidak jalan, slot kurs
09:15/12:15/16:15 WIB sering hilang). Karena itu tiap jalan terjadwal ikut
memeriksa apakah data sudah basi, bukan hanya mencocokkan slot cron:
- pangan  : tiap jalan terjadwal (skrip hanya menulis bila data berubah).
- keuangan: Senin-Jumat 08:30-17:59 WIB bila kurs terakhir > 150 menit lalu.
- berita/loker: jalan bila 'updated' > 5 jam lalu.
workflow_dispatch: ikut input target (semua = jalankan semua).
Menulis key=true/false ke $GITHUB_OUTPUT.
"""
import datetime as dt, json, os, re, sys

WIB = dt.timezone(dt.timedelta(hours=7))
now = dt.datetime.now(WIB)
event = os.environ.get("EVENT", "schedule")
target = (os.environ.get("TARGET") or "semua").strip()

def load(p):
    try:
        return json.load(open(p))
    except Exception:
        return {}

def parse(s):
    """'2026-11-23 07:04 WIB' / '2026-11-23T10:32+07:00' -> datetime WIB."""
    if not s:
        return None
    m = re.match(r"(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})", s)
    if not m:
        return None
    return dt.datetime.strptime(f"{m.group(1)} {m.group(2)}:{m.group(3)}", "%Y-%m-%d %H:%M").replace(tzinfo=WIB)

def age_min(s):
    t = parse(s)
    return 1e9 if t is None else (now - t).total_seconds() / 60

if event == "workflow_dispatch":
    out = {k: target in ("semua", k) for k in ("pangan", "keuangan", "berita", "loker")}
else:
    hp = load("data/harga-pangan.json")
    ku = load("data/keuangan.json")
    be = load("data/berita.json")
    lo = load("data/loker.json")
    # Panel Harga murah dipanggil & skrip hanya menulis bila isi berubah ->
    # cek tiap jalan terjadwal agar entri harian enumerator cepat tampil.
    pangan = True
    jam = now.hour * 60 + now.minute
    keu = now.weekday() < 5 and 8 * 60 + 30 <= jam <= 17 * 60 + 59 and age_min((ku.get("kurs") or {}).get("diambil")) > 150
    out = {
        "pangan": pangan,
        "keuangan": keu,
        "berita": age_min(be.get("updated")) > 300,
        "loker": age_min(lo.get("updated")) > 300,
    }

lines = [f"{k}={'true' if v else 'false'}" for k, v in out.items()]
print(now.strftime("%Y-%m-%d %H:%M WIB"), event, target, " ".join(lines))
gh = os.environ.get("GITHUB_OUTPUT")
if gh:
    with open(gh, "a") as f:
        f.write("\n".join(lines) + "\n")
