#!/usr/bin/env python3
"""Cek status kamera Portal CCTV Diskominfo Kabupaten Belitung -> data/cctv.json.
Kamera HLS dicek apakah playlist-nya ada; kamera YouTube dicek apakah siarannya sedang live.
Kalau siaran YouTube lama sudah berhenti, dicari siaran "[LIVE] CCTV ..." terbaru di kanal
Kominfo Belitung TV dengan nama yang cocok."""
import json, re, urllib.request, datetime, html as H
PORTAL = 'https://cctv.belitung.go.id/'
CHANNEL = 'https://www.youtube.com/channel/UCf4UarcBkJ9xFnmKeFLgTHw/streams'
UA = 'Mozilla/5.0 (iTAP Belitung status check; +https://itapbelitung.my.id)'

def get(url, headers=None, timeout=15):
    h = {'User-Agent': UA, 'Accept-Language': 'id'}
    h.update(headers or {})
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout) as r:
            return r.read().decode('utf-8', 'replace')
    except Exception:
        return ''

def norm(s):
    s = s.lower().replace('[live]', '').replace('cctv', '')
    s = re.sub(r'[^a-z0-9]+', ' ', s).strip()
    return re.sub(r'\bsimp\b', 'simpang', s)

def yt_id(u):
    m = re.search(r'(?:live/|v=|youtu\.be/|embed/)([\w-]{11})', u)
    return m.group(1) if m else None

def yt_live(vid):
    p = get('https://www.youtube.com/watch?v=' + vid)
    t = re.search(r'<title>([^<]*)', p)
    return '"isLiveNow":true' in p, H.unescape(t.group(1)).replace(' - YouTube', '') if t else ''

def main():
    page = get(PORTAL, timeout=25)
    i = page.find('[{"id":')
    if i < 0:
        raise SystemExit('daftar kamera tidak ditemukan')
    cams, _ = json.JSONDecoder().raw_decode(page[i:])
    # siaran CCTV yang sedang live di kanal Kominfo
    ch = get(CHANNEL, timeout=20)
    cand = []
    for v in dict.fromkeys(re.findall(r'"videoId":"([\w-]{11})"', ch)):
        live, title = yt_live(v)
        if live and 'cctv' in title.lower():
            cand.append((v, norm(title)))
    out = []
    for c in cams:
        if str(c.get('is_active')) != '1':
            continue
        u = c.get('stream_url') or ''
        item = {'id': c['id'], 'nama': c['nama'].replace('CCTV ', '', 1).strip(),
                'wilayah': c.get('region') or 'Lainnya', 'kategori': c.get('category') or '',
                'portal': f"{PORTAL}?page=detail&id={c['id']}", 'live': False, 'yt': None}
        vid = yt_id(u) if 'youtu' in u else None
        if vid:
            live, _ = yt_live(vid)
            if not live:
                n = norm(c['nama'])
                vid = next((v for v, t in cand if t == n or n in t or t in n), None)
                live = bool(vid)
            item['live'], item['yt'] = live, vid if live else None
        elif u:
            m = get(u, {'Origin': 'https://cctv.belitung.go.id', 'Referer': PORTAL}, timeout=10)
            item['live'] = m.lstrip().startswith('#EXTM3U')
        out.append(item)
    if not any(x['live'] for x in out):
        raise SystemExit('semua kamera terbaca mati, kemungkinan cek gagal; data lama dipertahankan')
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7)))
    json.dump({'diperbarui': now.strftime('%Y-%m-%d %H:%M WIB'), 'sumber': PORTAL, 'items': out},
              open('data/cctv.json', 'w'), ensure_ascii=False, indent=1)
    print(sum(x['live'] for x in out), 'dari', len(out), 'kamera hidup')

if __name__ == '__main__':
    main()
