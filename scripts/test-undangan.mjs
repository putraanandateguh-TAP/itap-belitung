import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire('/tmp/pw/package.json')('playwright-core');
const ART = '/opt/cursor/artifacts';
const failures = [];
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
};
const prices = readFileSync(new URL('../undangan/config.js', import.meta.url), 'utf8');
check('market prices', /39000/.test(prices) && /59000/.test(prices) && /69000/.test(prices) && /99000/.test(prices) && /119000/.test(prices) && /400000/.test(prices));
const sql = readFileSync(new URL('../supabase/undangan.sql', import.meta.url), 'utf8');
check('owner email rls', /owner_email/.test(sql) && /edit_token_hash/.test(sql) && /invitation_manage/.test(sql) && /invitation_save_token/.test(sql));
check('no shared password', !/password\s*[:=]\s*['\"][^'\"]+['\"]/i.test(sql + readFileSync(new URL('../undangan/admin/admin.js', import.meta.url), 'utf8')));
check('token is 32 bytes', /new Uint8Array\(32\)/.test(readFileSync(new URL('../undangan/admin/admin.js', import.meta.url), 'utf8')));
const server = spawn('python3', ['-m', 'http.server', '8821', '--bind', '127.0.0.1'], { cwd: '/workspace', stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 200));
const browser = await chromium.launch({ executablePath: '/usr/local/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:8821/undangan/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#prices .price');
const priceText = await page.locator('#prices').innerText();
check('landing shows 69rb tier', /69\.000/.test(priceText) && /39\.000/.test(priceText), priceText.slice(0, 80));
check('no copied brand', !/Indoinvite|indoinvite/i.test(await page.locator('body').innerText()));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
check('landing 390 no overflow', !overflow);
await page.screenshot({ path: path.join(ART, 'undangan-landing.png') });
await page.setViewportSize({ width: 320, height: 844 });
check('landing 320 no overflow', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)));
await page.setViewportSize({ width: 412, height: 844 });
check('landing 412 no overflow', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)));

async function themeShot(slug, fileCover, fileInside) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:8821/u/?s=' + slug + '&to=%3Cscript%3E', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#to');
  const shown = await page.locator('#to').innerText();
  check(slug + ' escapes guest', shown === '<script>', shown);
  await page.screenshot({ path: path.join(ART, fileCover) });
  await page.click('#buka');
  await page.waitForTimeout(200);
  check(slug + ' has rsvp', await page.locator('#rsvp').count() === 1);
  await page.screenshot({ path: path.join(ART, fileInside) });
}
await themeShot('demo-melayu', 'undangan-melayu-cover.png', 'undangan-melayu-dalam.png');
await themeShot('demo-pantai', 'undangan-pantai-cover.png', 'undangan-pantai-dalam.png');
await page.fill('#wish input[name=name]', 'Tamu Uji');
await page.fill('#wish textarea', 'Semoga acaranya lancar, ini contoh.');
await page.click('#wish button');
await page.waitForTimeout(150);
check('wish stored locally', /Tamu Uji/.test(await page.locator('#wishes').innerText()));
await page.screenshot({ path: path.join(ART, 'undangan-ucapan.png') });
await page.locator('#rsvp').scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(ART, 'undangan-rsvp.png') });

await page.goto('http://127.0.0.1:8821/undangan/pesan/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#package');
const opts = await page.locator('#package').innerText();
check('order lists lengkap price', /69\.000/.test(opts));
check('order 390 no overflow', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)));
await page.screenshot({ path: path.join(ART, 'undangan-pesan.png') });
await page.setViewportSize({ width: 320, height: 700 });
check('order 320 no overflow', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)));

await browser.close();
server.kill();
if (failures.length) { console.log('FAILED', failures.length); process.exit(1); }
console.log('ALL_PASS');
