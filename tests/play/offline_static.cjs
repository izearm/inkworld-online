// ทดสอบโหมดออฟไลน์ (dist-offline) บนเว็บไฟล์ล้วน เหมือน Cloudflare Pages: ไม่มีเซิร์ฟเวอร์เกม
// รัน: npm run build:offline && node tests/play/offline_static.cjs
const path = require('node:path'), http = require('node:http'), fs = require('node:fs');
const { chromium } = require('playwright');
const DIST = path.resolve(__dirname, '../../dist-offline');
const results = []; const check = (n, ok, i = '') => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (i ? ' · ' + i : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(p, fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn).catch(() => false)) return true; await sleep(100); } return false; }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
(async () => {
  const apiHits = [];
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u.startsWith('/api') || u.startsWith('/ws')) { apiHits.push(u); res.writeHead(404); return res.end(); }
    const f = path.join(DIST, u === '/' ? 'index.html' : u);
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
  }).listen(0);
  const BASE = 'http://localhost:' + srv.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  try {
    await p.goto(BASE + '/');
    check('เปิดได้ เจอลานต้นหมึก', await waitFor(p, () => window.__offline && __offline.title.active && PD.Game.land.id === 'title_field'));
    await p.evaluate(() => { const pl = PD.Game.player; pl.x = 25.5; pl.y = 27.2; }); await p.waitForSelector('#tp-play');
    check('ป๊อปอัป: เข้าเกม (เริ่มเรื่องใหม่) ไม่มีช่องล็อกอิน', (await p.textContent('#tree-pop')).includes('เริ่มเรื่องใหม่') && !(await p.$('#ol-id')));
    await p.screenshot({ path: path.join(__dirname, 'offline_title.png') });
    await p.click('#tp-play');
    check('เริ่มเรื่องที่หมู่บ้าน', await waitFor(p, () => __offline.inGame && PD.Game.land.id === 'village'));
    check('ไม่มีเมืองออนไลน์ในข้อมูลเกม', await p.evaluate(() => !PD_DATA.lands.some(l => l.id === 'online_town' || l.id === 'online_forest')));
    await p.evaluate(() => { PD.Game.S.player.lumi = 4321; PD.Game.save(); });
    check('เซฟลงเบราว์เซอร์', await p.evaluate(() => JSON.parse(localStorage.getItem('paperdungeon_inkworld_save_v1')).player.lumi === 4321));
    await p.evaluate(() => PD.UI.showTitle()); await sleep(300);
    check('กลับหน้าแรกแล้วเซฟไม่ถูกลานต้นหมึกเขียนทับ', await p.evaluate(() => __offline.title.active && JSON.parse(localStorage.getItem('paperdungeon_inkworld_save_v1')).loc.land === 'village'));
    await p.reload(); await waitFor(p, () => window.__offline && __offline.title.active);
    await p.evaluate(() => { const pl = PD.Game.player; pl.x = 25.5; pl.y = 27.2; }); await p.waitForSelector('#tp-play');
    check('เปิดใหม่: ปุ่มขึ้น "เล่นต่อ"', (await p.textContent('#tp-play')).includes('เล่นต่อ'));
    await p.click('#tp-play'); await waitFor(p, () => __offline.inGame && PD.Game.land.id !== 'title_field');
    check('เล่นต่อจากเซฟเดิม', await p.evaluate(() => PD.Game.land.id === 'village' && PD.Game.S.player.lumi === 4321));
    await p.evaluate(() => PD.UI.showTitle()); await sleep(200);
    await p.evaluate(() => { const pl = PD.Game.player; pl.x = 25.5; pl.y = 27.2; }); await p.waitForSelector('#tp-new');
    await p.click('#tp-new'); await p.click('#cf-yes');
    check('เริ่มเกมใหม่: ลบเซฟเดิมแล้วเริ่มที่ Lv1', await waitFor(p, () => __offline.inGame && PD.Game.S.player.level === 1 && PD.Game.S.player.lumi !== 4321));
    check('ไม่เรียกเซิร์ฟเวอร์เลย', apiHits.length === 0, apiHits.join(','));
    check('ไม่มี error ในหน้าเว็บ', errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { console.error(e); check('สคริปต์ทำงานจบ', false, e.message); }
  await b.close(); srv.close();
  const f = results.filter(x => !x).length; console.log('\n' + (results.length - f) + '/' + results.length + ' PASS'); process.exit(f ? 1 : 0);
})();
