#!/usr/bin/env python3
"""Lowongan kerja Belitung/Babel dari sumber publik -> data/loker.json (tanpa API berbayar).
Sumber: Glints (NEXT_DATA), Loker.id (halaman lokasi), Google News RSS. Simpan 30 hari, terbaru dulu."""
import json, re, html, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
WIB = timezone(timedelta(hours=7)); OUT = "data/loker.json"; NOW = datetime.now(WIB)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
LOC = re.compile(r"belitu?ng|belitong|tanjung ?pandan|manggar|bangka|pangkal ?pinang|babel|sungailiat|muntok|toboali|koba", re.I)
def get(u, t=20): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read().decode("utf-8", "ignore")
def clean(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()
def glints():
    out = []
    for kw in ("belitung", "bangka belitung", "pangkal pinang"):
        h = get("https://glints.com/id/opportunities/jobs/explore?keyword=" + urllib.parse.quote(kw))
        d = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', h, re.S).group(1))
        def walk(o):
            if isinstance(o, dict):
                if o.get("__typename") == "Job" and o.get("title"): yield o
                for v in o.values(): yield from walk(v)
            elif isinstance(o, list):
                for v in o: yield from walk(v)
        for j in walk(d):
            loc = j.get("location") or {}; names = [loc.get("formattedName") or ""] + [p.get("name") or "" for p in loc.get("parents") or []]
            locs = ", ".join(n for n in names if n)
            if not LOC.search(locs): continue
            slug = re.sub(r"[^a-z0-9]+", "-", j["title"].lower()).strip("-")
            out.append({"title": clean(j["title"]), "company": (j.get("company") or {}).get("name", ""), "location": locs or "Bangka Belitung",
                        "source": "Glints", "date": j.get("updatedAt") or j.get("createdAt"), "url": f"https://glints.com/id/opportunities/jobs/{slug}/{j['id']}"})
    return out
def lokerid():
    out = []
    for slug, nm in (("belitung", "Belitung"), ("belitung-timur", "Belitung Timur"), ("pangkal-pinang", "Pangkal Pinang"), ("bangka", "Bangka")):
        try: h = get("https://www.loker.id/lokasi-pekerjaan/" + slug)
        except Exception: continue
        for a in re.findall(r"<article class=\"card.*?</article>", h, re.S):
            m = re.search(r'<span class="text-sm[^"]*">(.*?)</span><a[^>]*href="([^"]+)"[^>]*><h3[^>]*>(.*?)</h3>', a, re.S)
            if m: out.append({"title": clean(m.group(3)), "company": clean(m.group(1)), "location": nm, "source": "Loker.id", "date": None, "url": urllib.parse.urljoin("https://www.loker.id", m.group(2))})
    return out
def gnews():
    out = []
    for q in ("lowongan kerja Belitung", "loker Belitung", "lowongan kerja Bangka Belitung", "rekrutmen Belitung"):
        x = get("https://news.google.com/rss/search?hl=id&gl=ID&ceid=ID:id&q=" + urllib.parse.quote(q + " when:30d"))
        for it in ET.fromstring(x).iter("item"):
            t = clean(it.findtext("title")); src = it.findtext("source") or "Google News"
            t = re.sub(r"\s+-\s+" + re.escape(src) + r"$", "", t)
            if not re.search(r"lowongan|loker|rekrutmen|job ?fair|bursa kerja|dibutuhkan|penerimaan", t, re.I) or not LOC.search(t): continue
            out.append({"title": t, "company": "Info loker (berita)", "location": "Bangka Belitung", "source": src.strip(), "date": parsedate_to_datetime(it.findtext("pubDate")).isoformat(), "url": it.findtext("link")})
    return out
try: old = {x["url"]: x for x in json.load(open(OUT))["items"]}
except Exception: old = {}
items, ok, seen = [], [], set()
for name, fn in (("Glints", glints), ("Loker.id", lokerid), ("Google News", gnews)):
    try: got = fn(); ok.append(f"{name}:{len(got)}")
    except Exception as e: print(f"::warning::{name} gagal: {e}"); continue
    items += got
items += list(old.values())  # pertahankan yang lama (difilter 30 hari di bawah)
res = []
for x in items:
    k = re.sub(r"[^a-z0-9]", "", (x["title"] + x.get("company", "")).lower())[:70]
    if k in seen or x["url"] in {r["url"] for r in res}: continue
    seen.add(k)
    if not x.get("date"): x["date"] = (old.get(x["url"]) or {}).get("date") or NOW.isoformat(timespec="minutes")  # tanggal pertama terlihat
    dt = datetime.fromisoformat(x["date"].replace("Z", "+00:00")).astimezone(WIB)
    if NOW - dt > timedelta(days=30): continue
    x["date"] = dt.isoformat(timespec="minutes"); res.append(x)
res.sort(key=lambda x: x["date"], reverse=True); res = res[:80]
print("sumber:", ", ".join(ok), "| total", len(res))
if not res: raise SystemExit(1)
json.dump({"updated": NOW.isoformat(timespec="minutes"), "items": res}, open(OUT, "w"), ensure_ascii=False, indent=1)
