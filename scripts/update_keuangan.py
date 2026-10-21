#!/usr/bin/env python3
"""Info Keuangan -> data/keuangan.json. Sumber: Yahoo Finance (^JKSE, delay), BCA (kurs e-Rate/TT/Bank Notes), emasantam.id (Antam 1 gr).
Tiap bagian independen: kalau gagal, nilai lama dipertahankan (tidak ada angka karangan)."""
import json, re, os, urllib.request, datetime
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "keuangan.json")
UA = {"User-Agent": "Mozilla/5.0 (iTAP Belitung)"}
WIB = datetime.timezone(datetime.timedelta(hours=7))
now = lambda: datetime.datetime.now(WIB).strftime("%Y-%m-%d %H:%M WIB")
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read().decode("utf-8", "ignore")
try: old = json.load(open(OUT))
except Exception: old = {}
d = dict(old)
try:
    m = json.loads(get("https://query1.finance.yahoo.com/v8/finance/chart/%5EJKSE?range=1d&interval=1d"))["chart"]["result"][0]["meta"]
    prev = m.get("chartPreviousClose") or m.get("previousClose")
    d["ihsg"] = {"nilai": round(m["regularMarketPrice"], 2), "perubahan": round(m["regularMarketPrice"] - prev, 2) if prev else None,
                 "persen": round((m["regularMarketPrice"] / prev - 1) * 100, 2) if prev else None,
                 "waktu_pasar": datetime.datetime.fromtimestamp(m["regularMarketTime"], WIB).strftime("%Y-%m-%d %H:%M WIB"),
                 "sumber": "Yahoo Finance (^JKSE, tertunda)", "diambil": now()}
except Exception as e: print("IHSG gagal:", e)
try:
    h = get("https://www.bca.co.id/id/informasi/kurs"); k = {}
    for b, s, c in re.findall(r'data-value-buy="([\d.\-]+)"\s+data-value-sell="([\d.\-]+)"\s+data-text=(\w+)>', h):
        if c in ("USD","SGD","MYR","EUR","SAR","CNH","JPY","AUD") and c not in k:
            b, s = [list(map(float, x.split("-"))) for x in (b, s)]
            k[c] = {"erate": [b[0], s[0]], "tt": [b[1], s[1]], "bn": [b[2], s[2]]}
    if len(k) >= 5: d["kurs"] = {"data": k, "sumber": "BCA (e-Rate, TT Counter, Bank Notes) · beli/jual", "diambil": now()}
    else: print("Kurs: parsing < 5")
except Exception as e: print("Kurs gagal:", e)
try:
    g = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", get("https://emasantam.id/harga-emas-antam-harian/")))
    m = re.search(r"Harga Emas 1 gram (\d+ \w+ \d{4}) Rp\. ([\d.]+) Harga Sebelumnya .*? Rp\. ([\d.]+) Perubahan", g)
    if m: d["emas"] = {"harga": int(m.group(2).replace(".", "")), "sebelumnya": int(m.group(3).replace(".", "")), "tanggal": m.group(1),
                       "sumber": "emasantam.id (Antam 1 gram, situs non-resmi)", "diambil": now()}
    else: print("Emas: parsing gagal")
except Exception as e: print("Emas gagal:", e)
json.dump(d, open(OUT, "w"), ensure_ascii=False, indent=1); print(json.dumps(d, ensure_ascii=False)[:600])
