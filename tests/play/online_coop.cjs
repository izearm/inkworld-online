// ทดสอบทางเข้าเดียว + ออนไลน์: ลานต้นหมึก → สมัคร → ตั้งชื่อ → เนื้อเรื่อง → ปลดล็อกเมืองออนไลน์ → Co-op 2 คน
// → หลุด/ต่อใหม่ → กลับด่านเก่า (เล่นคนเดียว) → ปิดแล้วเปิดใหม่ เล่นต่อจากเซฟบนบัญชี → เน็ตหลุดเกมหยุด
// รัน: npm run build && node tests/play/online_coop.cjs   (ตั้ง CHROME=/path/to/chrome ได้)
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' · ' + info : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(page, fn, arg, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg).catch(() => false)) return true; await sleep(100); } return false; }
const toTree = page => page.evaluate(() => { const pl = PD.Game.player; pl.x = 25.5; pl.y = 27.2; });

(async () => {
  const { startServer } = await import(path.join(ROOT, 'server/index.mjs'));
  const { openStore } = await import(path.join(ROOT, 'server/store.mjs'));
  const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'iwo-')), 'acc.json');
  const srv = await startServer({ port: 0, dist: path.join(ROOT, 'dist'), store: await openStore({ dataFile }), rules: { dungeonGraceMs: 6000, townGraceMs: 3000, inviteCodes: 'INKTEST' } });
  const BASE = 'http://localhost:' + srv.port;
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  const readAcc = () => JSON.parse(fs.readFileSync(dataFile, 'utf8')).accounts;
  async function newPlayer(user, name, invite) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(user + ': ' + e.message));
    await page.goto(BASE + '/index.html');
    await waitFor(page, () => window.__online && __online.title.active && PD.Game.land && PD.Game.land.id === 'title_field');
    await toTree(page); await page.waitForSelector('#tp-play');
    await page.click('#tp-play');
    await page.fill('#ol-id', user); await page.fill('#ol-pass', 'pass1234'); await page.click('#ol-reg');
    await page.waitForSelector('#ol-name');
    await page.fill('#ol-name', name); if (invite) await page.fill('#ol-invite', invite);
    await page.click('#ol-name-ok');
    await waitFor(page, () => __online.inGame && PD.Game.land.id !== 'title_field');
    return { ctx, page };
  }
  async function goOnlineTown(page) {
    await page.evaluate(() => { const G = PD.Game, gw = PD_DATA.config.worldGrid;
      for (let r = 0; r < gw.rows; r++) for (let c = 0; c < gw.cols; c++) if (G.placeLand('online_town', c, r)) { G.travel('online_town'); return; } });
    return waitFor(page, () => PD.Game.land.id === 'online_town' && __online.net && __online.net.roomReady && __online.net.area === 'town');
  }

  try {
    // ---------- ลานต้นหมึก ----------
    {
      const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } }); const page = await ctx.newPage();
      page.on('pageerror', e => errors.push('title: ' + e.message));
      await page.goto(BASE + '/online.html');
      check('online.html พากลับหน้าแรก', await waitFor(page, () => location.pathname.endsWith('/index.html') && window.__online && __online.title.active));
      check('หน้าแรก: ลานต้นหมึก ไม่มี HUD/เมนู ป๊อปอัปยังไม่ขึ้น', await page.evaluate(() => PD.Game.land.id === 'title_field' && document.body.classList.contains('title-mode') && document.getElementById('tree-pop').classList.contains('hidden')));
      await toTree(page); await sleep(200);
      check('เดินใกล้ต้นไม้ → ป๊อปอัป เข้าเกม/เข้าชม/เร็วๆ นี้', await page.evaluate(() => { const t = document.getElementById('tree-pop').innerText; return t.includes('เข้าเกม') && t.includes('เข้าชม') && t.includes('เร็วๆ นี้'); }));
      await page.screenshot({ path: path.join(ROOT, 'tests/play/title_tree.png') });
      await page.evaluate(() => { const pl = PD.Game.player; pl.x = 25.5; pl.y = 29.6; }); await sleep(200);
      const mid = await page.evaluate(() => ({ d: __online.title.dark, pop: document.getElementById('tree-pop').classList.contains('hidden') }));
      await page.evaluate(() => { const pl = PD.Game.player; pl.x = 25.5; pl.y = 45; }); await sleep(200);
      const far = await page.evaluate(() => ({ d: __online.title.dark, dist: Math.hypot(PD.Game.player.x - 25.5, PD.Game.player.y - 25.5) }));
      check('เดินออกห่าง → ค่อยๆ มืด และป๊อปอัปหาย', mid.d > 0.05 && mid.d < far.d && mid.pop, 'มืด ' + mid.d.toFixed(2) + ' → ' + far.d.toFixed(2));
      check('ขอบลาน: เดินเกิน 6.2 ช่องจากต้นไม้ไม่ได้', far.dist <= 6.21, far.dist.toFixed(2));
      await page.screenshot({ path: path.join(ROOT, 'tests/play/title_dark.png') });
      await page.evaluate(() => { const pl = PD.Game.player; pl.x = 25.5; pl.y = 27.5; }); await sleep(200);
      check('เดินกลับหาต้นไม้ → สว่างขึ้น', await page.evaluate(() => __online.title.dark < 0.01));
      await page.click('#tp-play');
      await page.fill('#ol-id', 'x'); await page.fill('#ol-pass', '1'); await page.click('#ol-login'); await sleep(300);
      check('ล็อกอินผิด → แจ้งในป๊อปอัป', (await page.textContent('#tree-pop')).includes('ไม่ถูกต้อง'));
      await ctx.close();
    }

    // ---------- ผู้เล่นใหม่: เริ่มเนื้อเรื่อง ----------
    const A = await newPlayer('alice', 'อลิซ');
    const a0 = await A.page.evaluate(() => ({ land: PD.Game.land.id, lv: PD.Game.S.player.level, pend: PD.Game.S.pendingPages.includes('online_town'), hud: !document.getElementById('hud').classList.contains('hidden') }));
    check('ผู้เล่นใหม่: เริ่มเรื่องที่หมู่บ้าน Lv1 ยังไม่มีเมืองออนไลน์', a0.land === 'village' && a0.lv === 1 && !a0.pend && a0.hud, JSON.stringify(a0));
    await A.page.evaluate(() => __online.syncNow()); await sleep(400);
    check('เซฟอยู่บนบัญชี (เซิร์ฟเวอร์)', !!readAcc().alice?.save);
    await A.page.evaluate(() => { const G = PD.Game; G.state = 'play'; G.S.ended = true; G.S.player.level = 50; G.recalc(); G.unlockPostLands(true); });
    check('จบ 7 ด่าน → เมืองออนไลน์รอวางบนแผนที่โลก', await A.page.evaluate(() => PD.Game.S.pendingPages.includes('online_town')));
    check('วางเมืองออนไลน์แล้วเดินทางเข้าได้', await goOnlineTown(A.page));

    // ---------- ผู้ทดสอบ: รหัสเชิญ ----------
    const B = await newPlayer('bob_2', 'บ็อบ', 'inktest');
    const b0 = await B.page.evaluate(() => ({ lv: PD.Game.S.player.level, ended: PD.Game.S.ended, pend: PD.Game.S.pendingPages.includes('online_town'), test: PD.Game.S.testChar }));
    check('รหัสเชิญ: ตัวทดสอบ Lv50 จบเรื่องแล้ว มีเมืองออนไลน์รอวาง', b0.lv === 50 && b0.ended && b0.pend && b0.test, JSON.stringify(b0));
    await B.page.evaluate(() => { PD.Game.state = 'play'; });
    check('ผู้ทดสอบเข้าเมืองออนไลน์ได้', await goOnlineTown(B.page));

    // ---------- เมือง ----------
    check('เมือง: B เห็น A พร้อมชื่อ', await waitFor(B.page, () => [...__online.net.remotes.values()].some(r => r.name === 'อลิซ' && r.st)));
    check('เมือง: ไม่มีตัวเราในรายชื่อผู้เล่นอื่น', await A.page.evaluate(() => ![...__online.net.remotes.keys()].includes(__online.net.me)));
    await A.page.keyboard.down('KeyD'); await sleep(900); await A.page.keyboard.up('KeyD'); await sleep(600);
    const posA = await A.page.evaluate(() => ({ x: PD.Game.player.x, y: PD.Game.player.y }));
    const viewB = await B.page.evaluate(() => { const r = [...__online.net.remotes.values()].find(r => r.name === 'อลิซ'); return { x: r.x, y: r.y }; });
    check('เมือง: การเดินของ A ตรงกันบนจอ B', Math.hypot(posA.x - viewB.x, posA.y - viewB.y) < 0.3);
    check('เมือง: ร้านค้า รับฝาก ผู้นำทาง Artifact + ประตูดันเจี้ยน/แผนที่โลก', await A.page.evaluate(() => ['merchant_online', 'keeper_online', 'guide_online', 'artifact_keeper'].every(id => PD.Game.npcs.some(n => n.id === id)) && PD.Game.map.portals.some(p => p.to === 'next') && PD.Game.map.portals.some(p => p.to === 'world')));
    await A.page.screenshot({ path: path.join(ROOT, 'tests/play/online_town.png') });

    // ---------- ดันเจี้ยน ----------
    await A.page.evaluate(() => PD.Game.usePortal({ to: 'next' }));
    await waitFor(A.page, () => __online.net.isHost);
    await B.page.evaluate(() => PD.Game.usePortal({ to: 'next' }));
    await waitFor(B.page, () => __online.net.roomReady && __online.net.area === 'dungeon' && PD.Game.enemies.length > 0);
    const room = await Promise.all([A, B].map(p => p.page.evaluate(() => ({ room: __online.net.roomId, host: __online.net.hostId, me: __online.net.me, isHost: __online.net.isHost }))));
    check('ดันเจี้ยน: ห้องเดียวกัน A Host / B Guest', room[0].room === room[1].room && room[0].isHost && !room[1].isHost && room[1].host === room[0].me);
    await sleep(500);
    const ids = await Promise.all([A, B].map(p => p.page.evaluate(() => PD.Game.enemies.filter(e => !e.dead).map(e => e.nid).sort().join('|'))));
    check('ดันเจี้ยน: ศัตรูชุดเดียวกันทั้งสองเครื่อง', ids[0] === ids[1] && ids[0].length > 0, ids[0].split('|').length + ' ตัว');
    const target = await A.page.evaluate(() => { const e = PD.Game.enemies.find(e => !e.dead && !e.def.boss); return { nid: e.nid, hp: e.hp }; });
    await B.page.evaluate(t => { const G = PD.Game, e = G.enemies.find(e => e.nid === t.nid); G.player.x = e.x - 0.8; G.player.y = e.y; G.damageEnemy(e, { dmg: 40, crit: false }, { src: 'attack' }); }, target);
    await sleep(500);
    const hp = await Promise.all([A, B].map(p => p.page.evaluate(id => PD.Game.enemies.find(e => e.nid === id).hp, target.nid)));
    check('ต่อสู้: Guest ตี → Host หัก HP และสองจอตรงกัน', hp[0] < target.hp && Math.abs(hp[0] - hp[1]) < 1, target.hp + ' → ' + hp.join('/'));
    const k0 = await B.page.evaluate(() => PD.Game.S.kills);
    await B.page.evaluate(id => { const G = PD.Game, e = G.enemies.find(e => e.nid === id); G.damageEnemy(e, { dmg: 1e7, crit: true }, { src: 'attack' }); }, target.nid);
    await sleep(600);
    const dead = await Promise.all([A, B].map(p => p.page.evaluate(id => { const e = PD.Game.enemies.find(e => e.nid === id); return !e || e.dead; }, target.nid)));
    check('ต่อสู้: ศัตรูตายตรงกัน + Guest ได้นับการฆ่า', dead[0] && dead[1] && (await B.page.evaluate(() => PD.Game.S.kills)) === k0 + 1);
    await A.page.evaluate(() => { const G = PD.Game; G.player.x = G.map.spawnBack.x; G.player.y = G.map.spawnBack.y; G.player.immortalT = 999; });
    await B.page.evaluate(() => { const G = PD.Game, e = G.enemies.filter(e => !e.dead && !e.def.boss).sort((a, b) => b.x - a.x)[0]; G.player.x = e.x - 0.6; G.player.y = e.y; });
    check('ต่อสู้: ศัตรูของ Host ตี Guest ได้', await waitFor(B.page, () => __online.net.stats.hurtsIn > 0, null, 12000));
    await B.page.evaluate(() => { const G = PD.Game; G.player.x = G.map.spawnBack.x + 1; G.player.y = G.map.spawnBack.y; G.player.immortalT = 999; });

    // ---------- หลุด / ต่อใหม่ ----------
    await B.page.evaluate(() => __online.net.dropForTest());
    check('Guest หลุด → Host เห็น "หลุด"', await waitFor(A.page, () => [...__online.net.remotes.values()].some(r => r.away), null, 3000));
    check('Guest ต่อใหม่ → ห้องเดิม', await waitFor(B.page, r => __online.net.roomReady && __online.net.roomId === r, room[0].room, 8000));
    await A.page.evaluate(() => __online.net.dropForTest());
    check('Host หลุด → Guest เป็น Host ทันที', await waitFor(B.page, () => __online.net.isHost, null, 3000));
    check('Host เดิมกลับมาเป็น Guest', await waitFor(A.page, () => __online.net.roomReady && !__online.net.isHost && __online.net.area === 'dungeon', null, 8000));

    // ---------- กลับด่านเก่า: เล่นคนเดียว ----------
    await A.page.evaluate(() => PD.Game.usePortal({ to: 'world' }));
    check('ออกจากดันเจี้ยน → กลับเมือง', await waitFor(A.page, () => PD.Game.land.id === 'online_town' && __online.net.area === 'town' && __online.net.roomReady));
    await A.page.evaluate(() => PD.Game.travel('village'));
    await sleep(600);
    check('ไปด่านเก่าได้ (หมู่บ้าน) และไม่อยู่ในห้องออนไลน์', await A.page.evaluate(() => PD.Game.land.id === 'village' && __online.net.area === 'solo' && __online.net.remotes.size === 0));
    check('ผู้เล่นอื่นไม่เห็นคนที่อยู่ด่านเก่า', await waitFor(B.page, () => ![...__online.net.remotes.values()].some(r => r.name === 'อลิซ'), null, 3000));

    // ---------- เน็ตหลุด: ต้องออนไลน์เสมอ ----------
    await A.page.route('**/api/save', r => r.abort());
    await A.page.evaluate(async () => { await __online.syncNow(); await __online.syncNow(); });
    check('บันทึกไม่ได้ → เกมหยุดพร้อมแจ้ง "ขาดการเชื่อมต่อ"', await A.page.evaluate(() => PD.Game.state === 'offline' && !document.getElementById('net-offline').classList.contains('hidden')));
    await A.page.unroute('**/api/save');
    check('ต่อได้อีกครั้ง → เกมเดินต่อ', await waitFor(A.page, () => PD.Game.state !== 'offline' && document.getElementById('net-offline').classList.contains('hidden'), null, 9000));

    // ---------- ปิดแล้วเปิดใหม่ → เล่นต่อจากเซฟบนบัญชี ----------
    const lumi = await A.page.evaluate(async () => { PD.Game.S.player.lumi += 77; await __online.syncNow(); return PD.Game.S.player.lumi; });
    await A.page.reload();
    await waitFor(A.page, () => window.__online && __online.title.active && __online.acc);
    await toTree(A.page); await A.page.waitForSelector('#tp-play');
    check('เปิดใหม่: จำการล็อกอิน แสดงชื่อในปุ่มเข้าเกม', (await A.page.textContent('#tp-play')).includes('อลิซ'));
    await A.page.click('#tp-play');
    await waitFor(A.page, () => __online.inGame && PD.Game.land.id !== 'title_field');
    const back = await A.page.evaluate(() => ({ land: PD.Game.land.id, lumi: PD.Game.S.player.lumi, town: !!PD.Game.S.lands.online_town }));
    check('เล่นต่อจากที่เดิมด้วยตัวละครล่าสุด', back.land === 'village' && back.lumi === lumi && back.town, JSON.stringify(back));
    await A.page.evaluate(() => PD.UI.showTitle());
    check('กลับหน้าแรกได้ (บันทึกก่อนออก)', await waitFor(A.page, () => __online.title.active && !__online.inGame));

    // ---------- เครื่องมือ Editor ยังเปิดแบบเดิม ----------
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage();
      await page.goto(BASE + '/index.html?preview=1');
      check('?preview=1 (Editor) เปิดหน้าเดิมได้โดยไม่ต้องล็อกอิน', await waitFor(page, () => !!document.getElementById('ob-new') && !window.__online));
      await ctx.close();
    }
    check('ไม่มี error ในหน้าเว็บ', errors.length === 0, errors.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); check('สคริปต์ทดสอบทำงานจบ', false, e.message); }
  await browser.close(); await srv.close();
  const fail = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - fail) + '/' + results.length + ' PASS');
  process.exit(fail ? 1 : 0);
})();
