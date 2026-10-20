#!/usr/bin/env python3
"""Ambil harga pangan harian dari ADAT Belitung (Diskominfo Kab. Belitung) -> data/harga-pangan.json"""
import json, re, sys, urllib.request, datetime, os
from bs4 import BeautifulSoup
URL = "https://adat.belitung.go.id/komoditas"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "harga-pangan.json")
html = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (iTAP Belitung)"}), timeout=60).read().decode("utf-8", "ignore")
s = BeautifulSoup(html, "html.parser")
items = []
for w in s.select(".komoditas-item-wrapper"):
    nm = w.select_one(".komoditas-name"); pr = w.select_one(".komoditas-price")
    if not pr: continue
    name = nm.get_text(" ", strip=True) if nm else ""
    if not name:
        im = w.select_one("img[alt]"); name = im["alt"].strip() if im else ""
    txt = pr.get_text(" ", strip=True)
    m = re.search(r"Rp\s*([\d.]+)\s*/?\s*(.*)", txt)
    if not name or not m: continue
    d = w.select_one(".komoditas-delta")
    items.append({"komoditas": name, "harga": int(m.group(1).replace(".", "")), "satuan": m.group(2).strip().lower() or "-",
                  "status": w.get("data-status", ""), "perubahan": d.get_text(" ", strip=True) if d else ""})
upd = re.search(r"Update Terakhir:\s*</?[^>]*>?\s*(?:<strong[^>]*>)?\s*(\d{2}-\d{2}-\d{4})", html)
pasar = re.search(r"fa-map-marker[^>]*></i>\s*([^<]+)", html)
if len(items) < 3:
    sys.exit("Gagal parsing: komoditas < 3, JSON lama dipertahankan")
data = {"tanggal_sumber": upd.group(1) if upd else None, "lokasi": pasar.group(1).strip() if pasar else "Pasar Tanjung Pandan, Belitung",
        "diambil": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime("%Y-%m-%d %H:%M WIB"),
        "sumber": "ADAT Belitung, Diskominfo Kab. Belitung (data: Dinas Ketahanan Pangan dan Pertanian Kab. Belitung)",
        "url": URL, "items": items}
json.dump(data, open(OUT, "w"), ensure_ascii=False, indent=1)
print(len(items), "komoditas,", data["tanggal_sumber"])
