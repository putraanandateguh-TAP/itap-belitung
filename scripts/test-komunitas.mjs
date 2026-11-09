import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire('/tmp/pw/package.json')('playwright-core');
const ART = '/opt/cursor/artifacts';
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const failures = [];
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
};
for (const table of ['profiles', 'listings', 'listing_photos', 'listing_reports', 'stories', 'ai_usage']) {
  check('rls ' + table, new RegExp('alter table public\\.' + table + ' enable row level security', 'i').test(schema));
}
check('schema blocks role change', /keep_profile_role/.test(schema) && /new\.role := old\.role/.test(schema));
check('schema keeps story pending', /new\.status := 'pending'/.test(schema));
check('anon cannot read ai usage', /revoke all on public\.ai_usage from anon, authenticated/i.test(schema));
const komunitas = readFileSync(new URL('../komunitas.js', import.meta.url), 'utf8');
const config = readFileSync(new URL('../config.js', import.meta.url), 'utf8');
check('delete button calls delete-account', /functions\.invoke\('delete-account'/.test(komunitas));
check('ai function is chat', /AI_FUNCTION:\s*'chat'/.test(config));

const server = spawn('python3', ['-m', 'http.server', '8797', '--bind', '127.0.0.1'], { cwd: '/workspace', stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 250));
const browser = await chromium.launch({ executablePath: '/usr/local/bin/google-chrome', args: ['--no-sandbox'] });
const base = 'http://127.0.0.1:8797/';

const plain = await browser.newPage({ viewport: { width: 390, height: 844 } });
await plain.route('**/config.js', (route) => route.fulfill({
  contentType: 'application/javascript',
  body: "window.ITAP_CONFIG={SUPABASE_URL:'',SUPABASE_ANON_KEY:'',AI_FUNCTION:''};"
}));
const leaked = [];
plain.on('request', (req) => {
  if (/supabase\.co|generativelanguage\.googleapis/.test(req.url())) leaked.push(req.url());
});
await plain.goto(base + '#jualbeli', { waitUntil: 'domcontentloaded' });
await plain.waitForTimeout(300);
const soon = await plain.locator('#jual-root').innerText();
const mid = await plain.locator('.bnav-mid').getAttribute('href');
check('unconfigured jual beli says segera hadir', /Segera hadir/.test(soon) && !/Tayangkan/.test(soon), soon.slice(0, 80));
check('center stays WhatsApp', /wa\.me\/6285141121283/.test(mid || ''), mid || '');
await plain.goto(base + '#kabar', { waitUntil: 'domcontentloaded' });
check('unconfigured kabar', /Segera hadir/.test(await plain.locator('#kabar-root').innerText()));
await plain.goto(base + '#akun', { waitUntil: 'domcontentloaded' });
check('unconfigured login', /Segera hadir/.test(await plain.locator('#akun-root').innerText()));
await plain.goto(base + '#cctv', { waitUntil: 'domcontentloaded' });
await plain.waitForTimeout(200);
const cctvSrc = await plain.locator('#cctv iframe').first().getAttribute('src');
check('cctv embed starts only on that page', /youtube-nocookie\.com\/embed\/Ur4BxRk-HY8/.test(cctvSrc || ''), cctvSrc || '');
check('no supabase call before config', leaked.length === 0, leaked.join(' '));
await plain.close();

const seed = {
  user: null,
  profile: null,
  listings: [{
    id: '44444444-4444-4444-8444-444444444444',
    owner_id: '22222222-2222-4222-8222-222222222222',
    title: 'Sepeda lipat',
    price: 1500000,
    category: 'kendaraan',
    description: 'Masih mulus, warna hitam, dipakai di Tanjung Pandan.',
    wa: '081234567890',
    hidden: false,
    flagged: false,
    photos: []
  }],
  stories: [{
    id: '33333333-3333-4333-8333-333333333333',
    owner_id: '22222222-2222-4222-8222-222222222222',
    title: 'Pasar pagi Tanjung Pandan',
    body: 'Catatan uji yang cukup panjang untuk melewati batas empat puluh karakter pada draf kabar.',
    category: 'kabar',
    status: 'pending'
  }],
  reports: [],
  aiCount: 0
};

const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('dialog', (dialog) => dialog.accept());
await page.addInitScript((initial) => {
  window.ITAP_AUTH_MOCK = { ai: true, reply: 'Jawaban uji. Bukan model sungguhan, dan bukan data live.' };
  if (!sessionStorage.getItem('itap_mock_db')) sessionStorage.setItem('itap_mock_db', JSON.stringify(initial));
}, seed);

await page.goto(base + '#akun', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#login-form');
await page.screenshot({ path: path.join(ART, 'login-mobile.png') });
await page.fill('#login-form input[name=email]', 'warga@example.com');
await page.click('#login-form button[type=submit]');
await page.waitForTimeout(100);
check('magic link notice', /Tautan masuk dikirim/.test(await page.locator('#auth-note').innerText()));
await page.evaluate(() => {
  const db = JSON.parse(sessionStorage.getItem('itap_mock_db'));
  db.user = { id: '11111111-1111-4111-8111-111111111111', email: 'warga@example.com' };
  db.profile = { display_name: 'Warga Uji', phone: '081234567890', role: 'user' };
  sessionStorage.setItem('itap_mock_db', JSON.stringify(db));
});
await page.goto(base + 'index.html#jualbeli', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#listing-form');
check('foreign listing visible', /Sepeda lipat/.test(await page.locator('#jual-root').innerText()));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await page.setInputFiles('#listing-form input[name=photos]', { name: 'uji.png', mimeType: 'image/png', buffer: png });
await page.fill('#listing-form input[name=title]', 'Lampu bekas');
await page.fill('#listing-form input[name=price]', '75000');
await page.selectOption('#listing-form select[name=category]', 'elektronik');
await page.fill('#listing-form textarea[name=description]', 'Lampu meja masih menyala, diambil di Tanjung Pandan.');
await page.fill('#listing-form input[name=wa]', '081298765432');
await page.click('#listing-form button[type=submit]');
await page.waitForTimeout(200);
let jualText = await page.locator('#jual-root').innerText();
check('own listing saved', /Lampu bekas/.test(jualText) && /Iklan tersimpan/.test(jualText), jualText.slice(0, 180));
await page.screenshot({ path: path.join(ART, 'jualbeli-mobile.png') });
await page.click('[data-edit]');
await page.fill('#listing-form input[name=title]', 'Lampu meja');
await page.click('#listing-form button[type=submit]');
await page.waitForTimeout(200);
check('listing edited', /Lampu meja/.test(await page.locator('#jual-root').innerText()));
await page.locator('.lapor summary').first().click();
await page.fill('.report-form input[name=reason]', 'Harga tidak sesuai foto');
await page.click('.report-form button[type=submit]');
await page.waitForTimeout(150);
check('report sent', /Laporan terkirim/.test(await page.locator('#jual-root').innerText()));
await page.click('[data-del]');
await page.waitForTimeout(150);
check('listing deleted', !/Lampu meja/.test(await page.locator('#jual-root').innerText()));

await page.goto(base + 'index.html#kabar', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#story-form');
await page.fill('#story-form input[name=title]', 'Pantai sore di Sijuk');
await page.selectOption('#story-form select[name=category]', 'wisata');
await page.fill('#story-form textarea[name=body]', 'Catatan warga tentang pantai yang ramai saat sore, ditulis untuk ditinjau admin sebelum tayang.');
await page.click('#story-form button[type=submit]');
await page.waitForTimeout(200);
const kabarText = await page.locator('#kabar-root').innerText();
check('story waits for review', /menunggu/.test(kabarText) && /belum tayang/i.test(kabarText), kabarText.slice(0, 160));
await page.screenshot({ path: path.join(ART, 'kabar-mobile.png') });

await page.evaluate(() => {
  const db = JSON.parse(sessionStorage.getItem('itap_mock_db'));
  db.profile.role = 'admin';
  sessionStorage.setItem('itap_mock_db', JSON.stringify(db));
});
await page.goto(base + 'index.html?admin=1#kabar', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-story]');
await page.click('[data-status=approved]');
await page.waitForTimeout(200);
check('admin approves story', /disetujui/.test(await page.locator('#kabar-root').innerText()));
await page.goto(base + 'index.html?admin=1#jualbeli', { waitUntil: 'domcontentloaded' });
await page.click('[data-flag]');
await page.waitForTimeout(200);
check('admin flags listing', /disembunyikan/.test(await page.locator('#jual-root').innerText()));

await page.goto(base + 'index.html?admin=1#chat', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#chat-form');
check('center opens chat when configured', (await page.locator('.bnav-mid').getAttribute('href')) === '#chat');
await page.fill('#chat-form input[name=message]', 'Di mana pasar pagi?');
await page.click('#chat-form button[type=submit]');
await page.waitForTimeout(150);
const chatText = await page.locator('#chat-log').innerText();
check('chat shows mock reply', /Jawaban uji/.test(chatText) && /bukan data live/i.test(chatText), chatText);
await page.screenshot({ path: path.join(ART, 'chat-mobile.png') });

await page.evaluate(() => {
  const db = JSON.parse(sessionStorage.getItem('itap_mock_db'));
  db.aiCount = 12;
  sessionStorage.setItem('itap_mock_db', JSON.stringify(db));
});
await page.fill('#chat-form input[name=message]', 'Sekali lagi');
await page.click('#chat-form button[type=submit]');
await page.waitForTimeout(150);
check('chat rate limit', /Cukup dulu/.test(await page.locator('#chat-note').innerText()));
await page.goto(base + 'index.html?hapus=1#akun', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#delete-account');
await page.click('#delete-account');
await page.waitForTimeout(200);
check('delete account button runs', /Akun uji dihapus/.test(await page.locator('#auth-note').innerText()));

const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
await guest.addInitScript(() => {
  window.ITAP_AUTH_MOCK = { ai: true, reply: 'tidak dipakai' };
  sessionStorage.setItem('itap_mock_db', JSON.stringify({ user: null, profile: null, listings: [], stories: [], reports: [] }));
});
await guest.goto(base + '#chat', { waitUntil: 'domcontentloaded' });
await guest.waitForSelector('.bnav-mid[href="#chat"]');
const guestText = await guest.locator('#chat-root').innerText();
check('logged out chat asks to sign in', /Masuk/.test(guestText) && /WhatsApp/.test(guestText) && await guest.locator('#chat-form').count() === 0, guestText.slice(0, 160));
await guest.screenshot({ path: path.join(ART, 'chat-guest-mobile.png') });
await guest.close();

const wired = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fnPosts = [];
wired.on('request', (req) => {
  if (req.method() === 'POST' && /functions\/v1\//.test(req.url())) fnPosts.push(req.url());
});
await wired.goto(base + '#chat', { waitUntil: 'domcontentloaded' });
await wired.waitForFunction(() => /Masuk dulu/.test(document.getElementById('chat-root')?.innerText || ''));
const wiredText = await wired.locator('#chat-root').innerText();
check('configured chat stays logged out', /Masuk/.test(wiredText) && /WhatsApp/.test(wiredText), wiredText.slice(0, 180));
check('logged out does not call the function', fnPosts.length === 0, fnPosts.join(' '));
await wired.close();

await browser.close();
server.kill();
if (failures.length) {
  console.log('FAILED', failures.length);
  process.exit(1);
}
console.log('ALL_PASS');
