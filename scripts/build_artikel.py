#!/usr/bin/env python3
"""Bangun halaman artikel statis dari folder konten (Markdown + YAML front matter).
Pakai: python3 scripts/build_artikel.py /workspace/itap-konten-web/content
Field internal (catatan, status, disiapkan, saran_prompt, keterangan_wajib) dan teks setelah ⚠️ tidak pernah ditampilkan."""
import json, sys, os, re, html, shutil
import yaml, markdown
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/itap-konten-web/content'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'artikel')
CAT = {'wisata': ('Wisata', '🏝️'), 'kuliner': ('Kuliner', '🍜'), 'budaya': ('Budaya', '🥁')}
e = lambda s: html.escape(str(s or ''), quote=True)

def clean(s):
    s = str(s or '')
    return re.split(r'\s*⚠', s)[0].strip()

def photo(fm, slug):
    f = fm.get('foto')
    if isinstance(f, dict) and f.get('file') and f.get('pembuat') and f.get('lisensi'):
        src = os.path.join(SRC, f['file'])
        name = slug + '.jpg'
        dst = os.path.join(OUT, 'foto', name)
        im = Image.open(src).convert('RGB')
        im.thumbnail((1100, 1100))
        im.save(dst, 'JPEG', quality=74, optimize=True, progressive=True)  # disimpan ulang tanpa EXIF
        return {'src': 'foto/' + name, 'w': im.width, 'h': im.height, 'alt': f.get('keterangan') or fm['judul'],
                'pembuat': f['pembuat'], 'lisensi': f['lisensi'], 'lisensi_url': f.get('lisensi_url') or '',
                'sumber_url': f.get('sumber_url') or ''}
    return None  # TODO ilustrasi -> placeholder netral, bukan foto palsu

def credit(p):
    lic = f'<a href="{e(p["lisensi_url"])}" target="_blank" rel="noopener license">{e(p["lisensi"])}</a>' if p['lisensi_url'] else e(p['lisensi'])
    src = f' · <a href="{e(p["sumber_url"])}" target="_blank" rel="noopener">Wikimedia Commons</a>' if p['sumber_url'] else ''
    return f'Foto: {e(p["pembuat"])} · {lic}{src}'

def ph(cat, big=False):
    lab, emo = CAT[cat]
    return f'<div class="art-ph{" big" if big else ""}" role="img" aria-label="Belum ada foto untuk artikel ini"><span>{emo}</span><small>iTAP Belitung · {lab}</small></div>'

def main():
    idx = json.load(open(os.path.join(SRC, 'index.json'), encoding='utf-8'))
    os.makedirs(os.path.join(OUT, 'foto'), exist_ok=True)
    cards = []
    for a in idx['artikel']:
        raw = open(os.path.join(SRC, a['path']), encoding='utf-8').read()
        _, fmt, body = raw.split('---', 2)
        fm = yaml.safe_load(fmt)
        slug, cat = fm.get('slug') or a['slug'], (fm.get('kategori') or a['kategori']).lower()
        body = body.replace('lihat daftar sumber di bagian atas', 'lihat daftar sumber di bawah')
        body = re.sub(r'\s*Visual merupakan ilustrasi AI\.?', '', body)  # tidak ada visual AI yang dipasang
        body = '\n'.join(l for l in body.split('\n') if '⚠' not in l and 'TODO' not in l and l.strip() != '🌐 itapbelitung.my.id')
        content = markdown.markdown(body, extensions=['extra', 'sane_lists'])
        p = photo(fm, slug)
        meta = []
        if fm.get('lokasi'): meta.append(f'<li><b>Lokasi:</b> {e(clean(fm["lokasi"]))}</li>')
        if 'jam_buka' in fm and fm['jam_buka'] is not None:
            jb = str(fm['jam_buka'])
            if 'belum terverifikasi' in jb or '⚠' in jb:
                val = clean(jb)
                val = re.sub(r',?\s*diverifikasi[^)]*', '', val).rstrip('. ')
                val = 'belum terverifikasi' if (not val or val == 'belum terverifikasi') else val + ' · belum terverifikasi'
            else:
                val = jb
            meta.append(f'<li><b>Jam buka:</b> {e(val)}</li>')
        k = fm.get('koordinat')
        if isinstance(k, dict) and k.get('lat') is not None and k.get('lon') is not None:
            lat, lon = float(k['lat']), float(k['lon'])
            osm = f'https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}'
            meta.append(f'<li><b>Koordinat:</b> {lat:.5f}, {lon:.5f} · <a href="{e(osm)}" target="_blank" rel="noopener">Buka peta</a> · <a href="https://www.google.com/maps/search/?api=1&amp;query={lat},{lon}" target="_blank" rel="noopener">Google Maps</a><br><small>Data lokasi © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">kontributor OpenStreetMap</a> (ODbL)</small></li>')
        srcs = [s for s in (fm.get('sumber') or []) if isinstance(s, str) and s.startswith('http')]
        srch = ''.join(f'<li><a href="{e(s)}" target="_blank" rel="noopener nofollow">{e(re.sub(r"^https?://(www\\.)?", "", s)[:90])}</a></li>' for s in srcs)
        lab, emo = CAT[cat]
        hero = (f'<figure class="art-hero"><img src="{e(p["src"])}" width="{p["w"]}" height="{p["h"]}" alt="{e(p["alt"])}" decoding="async"><figcaption>{e(p["alt"])}. {credit(p)}</figcaption></figure>' if p else ph(cat, True))
        page = f'''<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(fm["judul"])} · iTAP Belitung</title><meta name="description" content="{e(fm.get("ringkasan") or a.get("ringkasan"))}">
<link rel="canonical" href="https://itapbelitung.my.id/artikel/{slug}.html"><link rel="icon" href="../favicon.png"><link rel="stylesheet" href="../style.css?v=56">
<meta property="og:title" content="{e(fm["judul"])}"><meta property="og:description" content="{e(fm.get("ringkasan"))}">{f'<meta property="og:image" content="https://itapbelitung.my.id/artikel/{p["src"]}">' if p else ''}
<link rel="manifest" href="../manifest.webmanifest"><meta name="theme-color" content="#082c50"></head>
<body><main class="w art"><article>
<p class="art-nav"><a class="more" href="../">← Beranda</a> <a class="more" href="./#{cat}">{emo} {lab}</a></p>
<h1>{e(fm["judul"])}</h1><p class="art-lead">{e(fm.get("ringkasan"))}</p>
{hero}
{f'<ul class="art-meta">{"".join(meta)}</ul>' if meta else ''}
<div class="art-body">{content}</div>
{f'<h2>Sumber</h2><ol class="art-src">{srch}</ol>' if srch else ''}
<p class="mu sm">Ditulis ulang oleh tim iTAP Belitung dari sumber di atas. Ada yang keliru? Kabari kami lewat <a href="../akun/">Kirim kabar</a> atau email putraanandateguh@gmail.com.</p>
</article></main><footer><div class="w"><p class="sm"><a href="../syarat.html">Syarat</a> · <a href="../privasi.html">Privasi</a> · <a href="../credits.html">Kredit foto &amp; lisensi</a></p></div></footer><script src="../pwa.js" data-root="../"></script></body></html>
'''
        open(os.path.join(OUT, slug + '.html'), 'w', encoding='utf-8').write(page)
        cards.append({'slug': slug, 'judul': fm['judul'], 'kategori': cat, 'ringkasan': fm.get('ringkasan') or a.get('ringkasan'),
                      'foto': ('artikel/' + p['src']) if p else None, 'kredit': f'{p["pembuat"]} · {p["lisensi"]}' if p else None})
    json.dump({'diperbarui': idx.get('diperbarui'), 'artikel': cards}, open(os.path.join(ROOT, 'data', 'artikel.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # halaman daftar
    secs = ''
    for cat, (lab, emo) in CAT.items():
        items = [c for c in cards if c['kategori'] == cat]
        cs = ''.join(f'<a class="art-card" href="{c["slug"]}.html">{f"""<img src="{e(c["foto"][8:])}" alt="" loading="lazy">""" if c["foto"] else ph(cat)}<div><h3>{e(c["judul"])}</h3><p>{e(c["ringkasan"])}</p>{f"""<small>Foto: {e(c["kredit"])}</small>""" if c["kredit"] else ""}</div></a>' for c in items)
        secs += f'<section id="{cat}"><h2>{emo} {lab}</h2><div class="art-grid">{cs}</div></section>'
    lst = f'''<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Artikel Wisata, Kuliner &amp; Budaya Belitung · iTAP Belitung</title><meta name="description" content="Artikel iTAP Belitung tentang wisata, kuliner, dan budaya Belitung, lengkap dengan sumber.">
<link rel="canonical" href="https://itapbelitung.my.id/artikel/"><link rel="icon" href="../favicon.png"><link rel="stylesheet" href="../style.css?v=56">
<link rel="manifest" href="../manifest.webmanifest"><meta name="theme-color" content="#082c50"></head>
<body><main class="w art"><p class="art-nav"><a class="more" href="../">← Beranda</a></p><h1>Cerita Belitung</h1><p class="art-lead">Wisata, kuliner, dan budaya Belitung, ditulis ulang tim iTAP dari sumber yang bisa dicek. Foto dari Wikimedia Commons dicantumkan pembuat dan lisensinya.</p>
<nav class="art-tabs"><a href="#wisata">🏝️ Wisata</a><a href="#kuliner">🍜 Kuliner</a><a href="#budaya">🥁 Budaya</a></nav>{secs}</main>
<footer><div class="w"><p class="sm"><a href="../syarat.html">Syarat</a> · <a href="../privasi.html">Privasi</a> · <a href="../credits.html">Kredit foto &amp; lisensi</a></p></div></footer><script src="../pwa.js" data-root="../"></script></body></html>
'''
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(lst)
    print(len(cards), 'artikel')

main()
