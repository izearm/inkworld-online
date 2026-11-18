// ทดสอบออนไลน์: 2 เบราว์เซอร์ → สมัคร/ตั้งชื่อ → เมือง (เห็นกัน เห็นชื่อคนอื่น) → ดันเจี้ยน Co-op (ศัตรู/ดาเมจ/การตายตรงกัน)
// → หลุด/ต่อใหม่ (Guest และ Host) → ออก → เซฟออฟไลน์เดิมยังเล่นต่อได้
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

(async () => {
  const { startServer } = await import(path.join(ROOT, 'server/index.mjs'));
  const { openStore } = await import(path.join(ROOT, 'server/store.mjs'));
  const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'iwo-')), 'acc.json');
  const srv = await startServer({ port: 0, dist: path.join(ROOT, 'dist'), store: await openStore({ dataFile }), rules: { dungeonGraceMs: 6000, townGraceMs: 3000, inviteCodes: 'INKTEST' } });
  const BASE = 'http://localhost:' + srv.port;
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  async function player(user, name, seedSave) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(user + ': ' + e.message));
    await page.goto(BASE + '/online.html');
    await page.waitForSelector('#ol-id');
    if (seedSave) await page.evaluate(() => { // เซฟออฟไลน์ที่จบ 7 ด่านแล้ว (Lv50) จำลอง
      const G = PD.Game, s = G.freshSave(); s.ended = true; s.endingStage = 'return'; s.player.level = 50; s.player.lumi = 1234;
      s.quests = { q_village: { step: 9, done: true } }; s.loc = { land: 'village', map: 0, x: 10.5, y: 11.5 }; s._savedAt = Date.now() - 60000;
      localStorage.setItem('paperdungeon_inkworld_save_v1', JSON.stringify(s));
    });
    await page.fill('#ol-id', user); await page.fill('#ol-pass', 'pass1234');
    await page.click('#ol-reg');
    await page.waitForSelector('#ol-name');
    await page.fill('#ol-name', name); await page.click('#ol-name-ok');
    await waitFor(page, () => window.__online.inSession && __online.net && __online.net.roomReady && PD.Game.land.id === 'online_town');
    return { ctx, page };
  }

  try {
    // ---------- ล็อก: ยังไม่จบ 7 ด่าน ----------
    {
      const ctx = await browser.newContext(); const page = await ctx.newPage();
      await page.goto(BASE + '/online.html'); await page.waitForSelector('#ol-id');
      await page.fill('#ol-id', 'newbie'); await page.fill('#ol-pass', 'pass1234'); await page.click('#ol-reg');
      await page.waitForTimeout(500);
      check('ล็อกโหมดออนไลน์ถ้ายังไม่จบ 7 ด่าน', (await page.textContent('#online-ui')).includes('ยังเข้าโหมดออนไลน์ไม่ได้'));
      await page.fill('#ol-invite', 'WRONG'); await page.click('#ol-invite-ok'); await page.waitForTimeout(400);
      check('รหัสเชิญผิด: ไม่ปลดล็อก', (await page.textContent('#online-ui')).includes('รหัสเชิญไม่ถูกต้อง'));
      await page.fill('#ol-invite', 'inktest'); await page.click('#ol-invite-ok');
      await page.waitForSelector('#ol-name'); await page.fill('#ol-name', 'ผู้ทดสอบ'); await page.click('#ol-name-ok');
      const ok = await waitFor(page, () => window.__online.inSession && PD.Game.land.id === 'online_town' && __online.net.roomReady);
      const info = await page.evaluate(() => ({ lv: PD.Game.S.player.level, test: __online.base.testChar, gear: Object.values(PD.Game.S.player.gear).filter(Boolean).length, local: localStorage.getItem('paperdungeon_inkworld_save_v1') }));
      check('รหัสเชิญถูก: ได้ตัวทดสอบ Lv50 ครบชุด เข้าเมืองได้', ok && info.lv === 50 && info.test && info.gear === 4, JSON.stringify({ lv: info.lv, gear: info.gear }));
      await page.evaluate(() => __online.syncNow());
      check('ตัวทดสอบไม่เขียนเซฟในเครื่อง', (await page.evaluate(() => localStorage.getItem('paperdungeon_inkworld_save_v1'))) === null);
      await ctx.close();
    }
    const A = await player('alice', 'อลิซ', true);
    const B = await player('bob_2', 'บ็อบ', true);
    const offlineBefore = await A.page.evaluate(() => JSON.parse(localStorage.getItem('paperdungeon_inkworld_save_v1')));

    // ---------- เมือง ----------
    const seen = await waitFor(B.page, () => [...__online.net.remotes.values()].some(r => r.name === 'อลิซ' && r.st));
    check('เมือง: B เห็น A พร้อมชื่อ', seen);
    check('เมือง: ไม่มีตัวเราในรายชื่อผู้เล่นอื่น (ไม่วาดชื่อตัวเอง)', await A.page.evaluate(() => ![...__online.net.remotes.keys()].includes(__online.net.me)));
    await A.page.keyboard.down('KeyD'); await sleep(900); await A.page.keyboard.up('KeyD'); await sleep(600);
    const posA = await A.page.evaluate(() => ({ x: PD.Game.player.x, y: PD.Game.player.y }));
    const viewB = await B.page.evaluate(() => { const r = [...__online.net.remotes.values()].find(r => r.name === 'อลิซ'); return { x: r.x, y: r.y }; });
    const moved = Math.hypot(posA.x - offlineBefore.loc.x, posA.y - offlineBefore.loc.y);
    check('เมือง: การเดินของ A ตรงกันบนจอ B', Math.hypot(posA.x - viewB.x, posA.y - viewB.y) < 0.3, 'A=' + posA.x.toFixed(2) + ',' + posA.y.toFixed(2) + ' B เห็น=' + viewB.x.toFixed(2) + ',' + viewB.y.toFixed(2));
    void moved;
    check('เมือง: มีร้านค้าและ NPC', await A.page.evaluate(() => ['merchant_online', 'keeper_online', 'guide_online', 'artifact_keeper'].every(id => PD.Game.npcs.some(n => n.id === id))));
    await A.page.screenshot({ path: path.join(ROOT, 'tests/play/online_town.png') });

    // ---------- ดันเจี้ยน ----------
    await A.page.evaluate(() => PD.Game.usePortal({ to: 'world' }));
    await waitFor(A.page, () => __online.net.isHost);
    await B.page.evaluate(() => PD.Game.usePortal({ to: 'world' }));
    await waitFor(B.page, () => __online.net.roomReady && __online.net.area === 'dungeon' && PD.Game.enemies.length > 0);
    const room = await Promise.all([A, B].map(p => p.page.evaluate(() => ({ room: __online.net.roomId, host: __online.net.hostId, me: __online.net.me, isHost: __online.net.isHost }))));
    check('ดันเจี้ยน: อยู่ห้องเดียวกัน A เป็น Host B เป็น Guest', room[0].room === room[1].room && room[0].isHost && !room[1].isHost && room[1].host === room[0].me, JSON.stringify(room));
    await sleep(500);
    const enemyIds = await Promise.all([A, B].map(p => p.page.evaluate(() => PD.Game.enemies.filter(e => !e.dead).map(e => e.nid).sort().join('|'))));
    check('ดันเจี้ยน: ศัตรูชุดเดียวกันทั้งสองเครื่อง', enemyIds[0] === enemyIds[1] && enemyIds[0].length > 0, (enemyIds[0].split('|').length) + ' ตัว');
    // B ยืนข้างศัตรู แล้วตีด้วยระบบเดิม (G.damageEnemy) → Host หัก HP
    const target = await A.page.evaluate(() => { const e = PD.Game.enemies.find(e => !e.dead && !e.def.boss); return { nid: e.nid, hp: e.hp, x: e.x, y: e.y }; });
    await B.page.evaluate(t => { const G = PD.Game, e = G.enemies.find(e => e.nid === t.nid); G.player.x = e.x - 0.8; G.player.y = e.y; G.damageEnemy(e, { dmg: 40, crit: false }, { src: 'attack' }); }, target);
    await sleep(500);
    const hpAfter = await Promise.all([A, B].map(p => p.page.evaluate(id => PD.Game.enemies.find(e => e.nid === id).hp, target.nid)));
    check('ต่อสู้: ดาเมจจาก Guest หัก HP ศัตรูที่ Host และจอทั้งสองตรงกัน', hpAfter[0] < target.hp && Math.abs(hpAfter[0] - hpAfter[1]) < 1, 'HP ' + target.hp + ' → A:' + hpAfter[0] + ' B:' + hpAfter[1]);
    const expB0 = await B.page.evaluate(() => ({ exp: PD.Game.S.player.exp, kills: PD.Game.S.kills, lvl: PD.Game.S.player.level }));
    await B.page.evaluate(id => { const G = PD.Game, e = G.enemies.find(e => e.nid === id); G.damageEnemy(e, { dmg: 1e7, crit: true }, { src: 'attack' }); }, target.nid);
    await sleep(600);
    const dead = await Promise.all([A, B].map(p => p.page.evaluate(id => { const e = PD.Game.enemies.find(e => e.nid === id); return !e || e.dead; }, target.nid)));
    const expB1 = await B.page.evaluate(() => ({ exp: PD.Game.S.player.exp, kills: PD.Game.S.kills, lvl: PD.Game.S.player.level }));
    check('ต่อสู้: ศัตรูตายตรงกันทั้งสองเครื่อง (Host ยืนยัน)', dead[0] && dead[1]);
    check('ต่อสู้: Guest ได้ EXP/นับการฆ่าจากการยืนยันของ Host', expB1.kills === expB0.kills + 1 && (expB1.exp !== expB0.exp || expB1.lvl > expB0.lvl), JSON.stringify(expB0) + ' → ' + JSON.stringify(expB1));
    // Host ฆ่าเอง → Guest เห็นตาย
    const t2 = await A.page.evaluate(() => { const G = PD.Game, e = G.enemies.find(e => !e.dead && !e.def.boss); G.damageEnemy(e, { dmg: 1e7, crit: false }, { src: 'attack' }); return e.nid; });
    await sleep(500);
    check('ต่อสู้: Host ฆ่า → Guest เห็นศัตรูตาย', await B.page.evaluate(id => { const e = PD.Game.enemies.find(e => e.nid === id); return !e || e.dead; }, t2));
    // ศัตรูของ Host โจมตี Guest
    await A.page.evaluate(() => { const G = PD.Game; G.player.x = G.map.spawnBack.x; G.player.y = G.map.spawnBack.y; G.player.immortalT = 999; });
    await B.page.evaluate(() => { const G = PD.Game, e = G.enemies.filter(e => !e.dead && !e.def.boss).sort((a, b) => b.x - a.x)[0]; G.player.x = e.x - 0.6; G.player.y = e.y; });
    const hurt = await waitFor(B.page, () => __online.net.stats.hurtsIn > 0, null, 12000);
    check('ต่อสู้: ศัตรูที่ Host ควบคุมโจมตี Guest ได้ (Guest หักเกราะเอง)', hurt, 'hurtsIn=' + await B.page.evaluate(() => __online.net.stats.hurtsIn));
    await B.page.evaluate(() => { const G = PD.Game; G.player.x = G.map.spawnBack.x + 1; G.player.y = G.map.spawnBack.y; G.player.immortalT = 999; });
    await A.page.screenshot({ path: path.join(ROOT, 'tests/play/online_dungeon_host.png') });
    await B.page.screenshot({ path: path.join(ROOT, 'tests/play/online_dungeon_guest.png') });

    // ---------- หลุด/ต่อใหม่: Guest ----------
    await B.page.evaluate(() => __online.net.dropForTest());
    check('หลุด: Host เห็น Guest เป็น "หลุด"', await waitFor(A.page, () => [...__online.net.remotes.values()].some(r => r.away), null, 3000));
    const back = await waitFor(B.page, () => __online.net.roomReady && __online.net.area === 'dungeon', null, 8000);
    const sameRoom = back && await B.page.evaluate(r => __online.net.roomId === r, room[0].room);
    check('ต่อใหม่: Guest กลับเข้าห้องเดิมภายในเวลา', sameRoom);
    check('ต่อใหม่: Host เห็น Guest กลับมา', await waitFor(A.page, () => [...__online.net.remotes.values()].every(r => !r.away), null, 3000));

    // ---------- หลุด: Host → สลับ Host ----------
    await A.page.evaluate(() => { __online.net.dropForTest(); });
    const became = await waitFor(B.page, () => __online.net.isHost, null, 3000);
    check('Host หลุด: Guest ได้เป็น Host ทันทีและคุมศัตรูต่อ', became && await B.page.evaluate(() => PD.Game.enemies.every(e => e.nid)));
    const aBack = await waitFor(A.page, () => __online.net.roomReady && !__online.net.isHost && __online.net.area === 'dungeon', null, 8000);
    await sleep(600);
    const ids2 = await Promise.all([A, B].map(p => p.page.evaluate(() => PD.Game.enemies.filter(e => !e.dead).map(e => e.nid).sort().join('|'))));
    check('Host เดิมกลับมาเป็น Guest และเห็นศัตรูชุดเดียวกัน', aBack && ids2[0] === ids2[1]);

    // ---------- หลุดนานเกินเวลา → กลับเมือง ----------
    await A.page.evaluate(() => { const n = __online.net; n.ws.onclose = null; n.ws.close(); n.ws = null; n.roomReady = false; window.__reconnectLater = () => n.connect(); });
    await sleep(7000);
    await A.page.evaluate(() => window.__reconnectLater());
    check('หลุดเกิน 30 วิ (ทดสอบตั้ง 6 วิ): กลับมาที่เมือง', await waitFor(A.page, () => PD.Game.land.id === 'online_town' && __online.net.area === 'town' && __online.net.roomReady, null, 8000));

    // ---------- ออก + เซฟ ----------
    const lvlA = await A.page.evaluate(() => { PD.Game.S.player.lumi += 77; return PD.Game.S.player.lumi; });
    await A.page.click('#net-leave'); await A.page.click('#cf-yes');
    await A.page.waitForSelector('text=ออกจากออนไลน์แล้ว');
    const local = await A.page.evaluate(() => JSON.parse(localStorage.getItem('paperdungeon_inkworld_save_v1')));
    const backup = await A.page.evaluate(() => !!localStorage.getItem('paperdungeon_inkworld_save_v1_backup_online'));
    check('ออก: เซฟในเครื่องได้ตัวละครล่าสุด (Lumi)', local.player.lumi === lvlA, local.player.lumi + ' vs ' + lvlA);
    check('ออก: ตำแหน่ง/เควส/ฉากจบของเกมออฟไลน์ไม่ถูกแก้', JSON.stringify(local.loc) === JSON.stringify(offlineBefore.loc) && JSON.stringify(local.quests) === JSON.stringify(offlineBefore.quests) && local.ended === true && JSON.stringify(local.lands) === JSON.stringify(offlineBefore.lands));
    check('ออก: มีสำเนาสำรองเซฟเดิม', backup);
    await sleep(400); // ที่เก็บแบบไฟล์เขียนลงดิสก์ทุก 200ms
    const acc = JSON.parse(fs.readFileSync(dataFile, 'utf8')).accounts.alice;
    check('ออก: เซิร์ฟเวอร์เก็บเซฟเดียวกัน', acc.save && acc.save.player.lumi === lvlA && acc.name === 'อลิซ');
    // เปิดเกมออฟไลน์ในเบราว์เซอร์เดิม → เล่นต่อได้
    await A.page.goto(BASE + '/index.html');
    await A.page.waitForSelector('#ob-cont');
    check('ออฟไลน์: หน้าแรกมีปุ่ม "ออนไลน์"', await A.page.$('#ob-online'));
    await A.page.evaluate(() => { PD.UI.hideOverlay(); PD.Game.continueGame(); });
    await sleep(500);
    const off = await A.page.evaluate(() => ({ st: PD.Game.state, land: PD.Game.land.id, lumi: PD.Game.S.player.lumi, x: PD.Game.player.x }));
    check('ออฟไลน์: เล่นต่อจากเซฟเดิมได้ (ที่เดิม + ตัวละครล่าสุด)', off.st === 'play' && off.land === 'village' && off.lumi === lvlA && Math.abs(off.x - 10.5) < 0.01, JSON.stringify(off));
    // ล็อกอินใหม่: เซิร์ฟเวอร์ใหม่กว่า/เท่ากัน → ใช้ตัวเดิม
    await A.page.goto(BASE + '/online.html'); await A.page.waitForSelector('#ol-id');
    await A.page.fill('#ol-id', 'alice'); await A.page.fill('#ol-pass', 'pass1234'); await A.page.click('#ol-login');
    check('เข้าสู่ระบบอีกครั้ง: ข้ามหน้าตั้งชื่อ เข้าเมืองได้เลย', await waitFor(A.page, () => window.__online.inSession && PD.Game.land.id === 'online_town'));
    check('ไม่มี error ในหน้าเว็บ', errors.length === 0, errors.slice(0, 3).join(' | '));
  } catch (e) { console.error(e); check('สคริปต์ทดสอบทำงานจบ', false, e.message); }
  await browser.close(); await srv.close();
  const fail = results.filter(r => !r.ok).length;
  console.log('\n' + (results.length - fail) + '/' + results.length + ' PASS');
  process.exit(fail ? 1 : 0);
})();
