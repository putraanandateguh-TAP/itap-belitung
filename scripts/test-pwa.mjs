import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire('/tmp/pw/package.json');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ART = process.env.ART || '/opt/cursor/artifacts';
const PORT = 8765;
const failures = [];
function check(name, ok, detail = '') {
  const line = `${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  if (!ok) failures.push(line);
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
await mkdir(ART, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

async function shot(page, name) {
  const file = path.join(ART, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
const base = `http://127.0.0.1:${PORT}/`;
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const home = await page.evaluate(() => {
  const visible = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && r.height > 0;
  };
  return {
    scroll: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    beranda: visible('beranda'),
    berita: visible('berita'),
    loker: visible('loker'),
    belanja: visible('belanja'),
    cuaca: visible('cuaca'),
    apkHidden: document.getElementById('apk-dl')?.hidden,
    apkText: document.getElementById('apk-dl')?.innerText || '',
    pwaInlineHidden: document.getElementById('pwa-inline')?.hidden,
    nav: [...document.querySelectorAll('.bnav a')].map((a) => a.innerText.replace(/\s+/g, ' ').trim())
  };
});
console.log('HOME', JSON.stringify(home));
check('beranda visible', home.beranda);
check('berita hidden on home', !home.berita);
check('lowongan hidden on home', !home.loker);
check('belanja hidden on home', !home.belanja);
check('no horizontal overflow', !home.overflow);
check('nav labels', home.nav.join('|') === '🏠 Beranda|🛒 Belanja|📰 Berita|💼 Lowongan|☰ Menu', home.nav.join('|'));
check('pwa button is not an apk link', home.pwaInlineHidden === true);
await shot(page, 'home-mobile.png');

const apk = await page.evaluate(() => {
  const box = document.getElementById('apk-dl');
  const link = box?.querySelector('[data-apk-link]');
  return { hidden: box?.hidden, ver: box?.querySelector('[data-apk-ver]')?.textContent, href: link?.getAttribute('href'), sha: box?.querySelector('[data-apk-sha]')?.textContent };
});
check('apk row visible', apk.hidden === false, JSON.stringify(apk));
check('apk version matches', apk.ver === '0.1.0-test' && apk.href === 'downloads/itap-belitung-0.1.0-test.apk');
check('apk hash shown', /^[a-f0-9]{64}$/.test(apk.sha || ''));
await page.locator('#pasang').scrollIntoViewIfNeeded();
await shot(page, 'pasang-apk-mobile.png');

await page.locator('.bnav a[href="#berita"]').click();
await page.waitForTimeout(300);
const berita = await page.evaluate(() => ({
  hash: location.hash,
  berita: getComputedStyle(document.getElementById('berita')).display !== 'none',
  beranda: getComputedStyle(document.getElementById('beranda')).display !== 'none',
  text: document.getElementById('berita')?.innerText.slice(0, 80)
}));
check('berita category', berita.hash === '#berita' && berita.berita && !berita.beranda, JSON.stringify(berita));
await shot(page, 'berita-mobile.png');

await page.goto(base + '#loker');
await page.waitForTimeout(400);
const loker = await page.evaluate(() => getComputedStyle(document.getElementById('loker')).display !== 'none' && !!document.getElementById('loker-list'));
check('lowongan deep link', loker);

await page.goto(base + '#produk');
await page.waitForTimeout(300);
const shop = await page.evaluate(() => ({
  belanja: getComputedStyle(document.getElementById('belanja')).display !== 'none',
  lynk: !!document.querySelector('#produk a[href*="lynk.id"]'),
  kasir: !!document.querySelector('#produk a[href="kasir/app.html"]'),
  generator: !!document.querySelector('#produk a[href="generator/"]'),
  price: document.getElementById('produk')?.innerText.includes('Rp49')
}));
check('belanja keeps checkout', shop.belanja && shop.lynk && shop.kasir && shop.generator && shop.price, JSON.stringify(shop));
await shot(page, 'belanja-mobile.png');

await page.goto(base + '#menu');
await page.waitForTimeout(200);
await shot(page, 'menu-mobile.png');
await page.locator('#menu a[href="#cuaca"]').click();
await page.waitForTimeout(300);
const cuaca = await page.evaluate(() => ({
  hash: location.hash,
  shown: getComputedStyle(document.getElementById('panel-cuaca')).display !== 'none',
  wx: !!document.getElementById('wx')
}));
check('menu opens cuaca', cuaca.hash === '#cuaca' && cuaca.shown && cuaca.wx, JSON.stringify(cuaca));

await page.goto(base + '#keuangan');
await page.waitForTimeout(400);
const uang = await page.evaluate(() => getComputedStyle(document.getElementById('panel-angka')).display !== 'none' && !!document.getElementById('hp') && !!document.getElementById('kg-top'));
check('kurs and food prices reachable', uang);

await page.goBack();
check('browser back', page.url().includes('#cuaca') || page.url().includes('#menu'));

await page.goto(base + '#kelas');
await page.reload({ waitUntil: 'networkidle' });
check('refresh keeps kelas', page.url().includes('#kelas'));
const kelas = await page.evaluate(() => getComputedStyle(document.getElementById('belanja')).display !== 'none' && document.body.innerText.includes('Rp79.000'));
check('kelas price still there', kelas);

const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  const manifestLink = document.querySelector('link[rel="manifest"]')?.href;
  const manifest = await (await fetch(manifestLink)).json();
  const icons = await Promise.all(manifest.icons.map(async (icon) => {
    const url = new URL(icon.src, manifestLink).href;
    const res = await fetch(url);
    return { src: icon.src, purpose: icon.purpose, status: res.status, type: res.headers.get('content-type') };
  }));
  return { scope: reg.scope, active: !!reg.active, name: manifest.name, display: manifest.display, start: manifest.start_url, icons };
});
check('manifest name', sw.name === 'iTAP Belitung' && sw.display === 'standalone');
check('service worker', sw.active && sw.scope === base, sw.scope);
check('icons', sw.icons.every((icon) => icon.status === 200) && sw.icons.some((icon) => icon.purpose === 'maskable'));

await page.evaluate(() => localStorage.setItem('itap_kasir_db', JSON.stringify({ toko: { nama: 'Warung Uji', alamat: '' }, produk: [{ id: '1', nama: 'Es' }], trx: [], kulakan: [], opname: [], scan: {} })));
await page.goto(base + 'kasir/app.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const kasir = await page.evaluate(() => localStorage.getItem('itap_kasir_db'));
check('kasir data kept', kasir && kasir.includes('Warung Uji'));

const cachesOk = await page.evaluate(async () => {
  const names = await caches.keys();
  let hit = false;
  for (const name of names) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    if (keys.some((req) => /harga-pangan|keuangan\.json|itap-belitung-.*\.apk|itap-android\.json/.test(req.url))) hit = true;
  }
  return { names, hit };
});
check('live data and apk not cached', !cachesOk.hit, JSON.stringify(cachesOk.names));

await page.context().setOffline(true);
await page.goto(base, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(500);
const offline = await page.evaluate(() => document.body.innerText);
check('offline shell or notice', /iTAP Belitung|butuh internet|offline/i.test(offline));
await page.screenshot({ path: path.join(ART, 'offline-mobile.png') }).catch(() => {});

const noisy = errors.filter((line) => !/Failed to load resource|net::ERR|favicon/i.test(line));
check('no unexpected console errors', noisy.length === 0, noisy.slice(0, 5).join(' | '));

const ios = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
await ios.goto(base, { waitUntil: 'domcontentloaded' });
await ios.waitForTimeout(300);
const iosText = await ios.locator('#pwa-install').innerText();
check('ios guidance', /Tambahkan ke Layar Utama/.test(iosText) && !/Unduh APK/.test(iosText));
const iosApk = await ios.locator('#pwa-install [data-install]').getAttribute('hidden');
check('ios has no fake install button', iosApk !== null);
await ios.screenshot({ path: path.join(ART, 'ios-install-guidance.png') });
await ios.close();

await writeFile(path.join(ART, 'home-metrics.json'), JSON.stringify({ home, apk, sw }, null, 2));
await browser.close();
server.kill();
if (failures.length) {
  console.log('FAILED', failures.length);
  process.exit(1);
}
console.log('ALL_PASS');
