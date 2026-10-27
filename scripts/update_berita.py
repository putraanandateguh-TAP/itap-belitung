#!/usr/bin/env python3
"""Ambil berita Belitung dari beberapa RSS -> data/berita.json. Hanya judul, link, cuplikan singkat.
Kalau semua sumber gagal / hasil kosong, data lama dipertahankan (exit 1)."""
import json, re, html, sys, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
WIB = timezone(timedelta(hours=7)); OUT = "data/berita.json"
GN = "https://news.google.com/rss/search?hl=id&gl=ID&ceid=ID:id&q="
SOURCES = [  # (nama, url, wajib filter kata kunci, maks item)
  ("Belitong Ekspres", GN + urllib.parse.quote("site:belitongekspres.disway.id (Belitung OR Beltim OR Tanjungpandan OR Manggar) when:14d"), True, 5),
  ("ANTARA Babel", "https://babel.antaranews.com/rss/terkini.xml", True, 4),
  ("Pos Belitung", GN + urllib.parse.quote("site:belitung.tribunnews.com when:7d"), False, 3),
  ("Bangka Pos", GN + urllib.parse.quote("site:bangka.tribunnews.com Belitung when:7d"), True, 3),
  ("Babel Pos", GN + urllib.parse.quote("site:babelpos.disway.id Belitung when:7d"), True, 3),
  ("Google Berita", GN + urllib.parse.quote("Belitung when:3d"), True, 6),
]
KW = re.compile(r"belitu?ng|belitong|tanjung ?pandan|tanjungpandan|beltim|manggar|gantung|membalong|sijuk|badau|kelapa kampit|dendang|simpang renggiang|damar|selat nasik|laskar pelangi", re.I)
UA = {"User-Agent": "Mozilla/5.0 (iTAP Belitung news bot; +https://itapbelitung.my.id)"}
def clean(s, n=None):
    s = html.unescape(re.sub(r"<[^>]+>", " ", html.unescape(s or ""))); s = re.sub(r"\s+", " ", s).strip()
    return (s[:n].rsplit(" ", 1)[0] + "…") if n and len(s) > n else s
def fetch(name, url, filt, cap):
    raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25).read()
    out = []
    for it in ET.fromstring(raw).iter("item"):
        t = clean(it.findtext("title")); link = (it.findtext("link") or "").strip()
        src = it.find("source"); pub = name
        if src is not None and src.text and "news.google" in url:
            pub = src.text.strip(); t = re.sub(r"\s+-\s+" + re.escape(pub) + r"$", "", t)
            if "belitongekspres" in (src.get("url") or ""): pub = "Belitong Ekspres"
            t = re.sub(r"\s+-\s+[\w.]+\.(id|com|co)$", "", t)
        desc = it.findtext("description") or ""
        snip = "" if "news.google" in url else clean(desc, 160)
        if re.match(r"(berita terbaru hari ini|tag:|indeks)", t, re.I): continue
        if not t or not link or (filt and not KW.search(t + " " + snip)): continue
        try: dt = parsedate_to_datetime(it.findtext("pubDate")).astimezone(WIB)
        except Exception: continue
        img = None
        m = it.find("enclosure")
        if m is not None and (m.get("type") or "").startswith("image"): img = m.get("url")
        if not img:
            mm = re.search(r'<img[^>]+src="([^"]+)"', html.unescape(desc)); img = mm.group(1) if mm else None
        out.append({"title": t, "url": link, "source": pub, "published": dt.isoformat(timespec="minutes"), "snippet": snip, "image": img})
    out.sort(key=lambda x: x["published"], reverse=True)
    return out[:cap]
def key(t): return re.sub(r"[^a-z0-9]", "", t.lower())[:60]
items, seen, ok = [], set(), []
for s in SOURCES:
    try: got = fetch(*s); ok.append(f"{s[0]}:{len(got)}")
    except Exception as e: print(f"::warning::{s[0]} gagal: {e}"); continue
    for x in got:
        k = key(x["title"])
        if k in seen: continue
        seen.add(k); items.append(x)
print("sumber:", ", ".join(ok))
# tiap sumber dijamin max 2 item teratas, sisanya diisi yang terbaru
pri, rest, cnt = [], [], {}
for x in items:
    (pri if cnt.get(x["source"], 0) < 2 else rest).append(x); cnt[x["source"]] = cnt.get(x["source"], 0) + 1
rest.sort(key=lambda x: x["published"], reverse=True)
items = sorted((pri + rest)[:15] if len(pri) <= 15 else pri[:15], key=lambda x: x["published"], reverse=True)
if len(items) < 3: print("Item terlalu sedikit, data lama dipertahankan"); sys.exit(1)
try: old = json.load(open(OUT))
except Exception: old = {}
if old.get("items") == items: print("Tidak ada berita baru"); sys.exit(0)
json.dump({"updated": datetime.now(WIB).isoformat(timespec="minutes"), "items": items}, open(OUT, "w"), ensure_ascii=False, indent=1)
print(f"{len(items)} berita ditulis")
