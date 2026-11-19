// Ink World — ทางเข้าเกมทางเดียว (ต้องออนไลน์เสมอ)
// ลานต้นหมึก → เข้าเกม → ID/รหัส (สมัครได้) → ตั้งชื่อ → เนื้อเรื่อง → จบ 7 ด่าน → เมืองออนไลน์ (วางบนแผนที่โลก) → ฟาร์มด่านเก่า/ด่านออนไลน์
// เซฟอยู่บนบัญชีเท่านั้น · ?preview=1 / ?cave=1 (จาก Editor) ยังเปิดแบบเดิมโดยไม่ต้องล็อกอิน
// โหมดออฟไลน์ (npm run build:offline → dist-offline): ลานต้นหมึก → เข้าเกม → เซฟในเบราว์เซอร์ · ไม่มีบัญชี/เมืองออนไลน์/Co-op
import './play.css';
import './online/online.css';
import Phaser from 'phaser';
import './engine';
import { PlayScene, playSize } from './scenes/PlayScene';
import { lanternCavePreview } from './engine/data/lanternCavePreview';
import { installOnlineData, installTitleField, ONLINE_TOWN, ONLINE_DUNGEON } from './online/onlineData';
import { Api, Account } from './online/api';
import { Net } from './online/net';
import { TitleField } from './online/titleField';
import { makeTestCharacter } from './online/testChar';

const w = window as any, PD = w.PD, G = PD.Game, UI = PD.UI;
const params = new URLSearchParams(location.search);
const cavePreview = params.get('cave') === '1';
const devPreview = cavePreview || params.getAll('preview').includes('1');
if (cavePreview) w.PD_DATA.testmap = lanternCavePreview;

const OFFLINE = (import.meta as any).env?.VITE_OFFLINE === '1';   // ตั้งจาก .env.offline ตอน build:offline
if (devPreview) PD.Save.disablePersistence();      // เครื่องมือ Editor: เปิดแบบออฟไลน์เดิม
else if (OFFLINE) bootOffline();
else bootOnline();

const { W, H } = playSize(w.PD_DATA.config.lowResHeight);
w.__game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'stage', width: W, height: H, backgroundColor: '#f8f4ea',
  pixelArt: true, antialias: false, roundPixels: true, banner: false, disableContextMenu: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { powerPreference: 'high-performance' },
  scene: [new PlayScene(cavePreview)]
});

function bootOnline() {
  installOnlineData(w.PD_DATA); installTitleField(w.PD_DATA);
  const TOKEN_KEY = 'inkworld_online_token';
  let acc: Account | null = null, net: Net | null = null, inGame = false, serverAt = 0;
  let step: 'menu' | 'login' | 'name' = 'menu', formMsg = '';
  const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
  const setToken = (t: string) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* */ } };

  // ---------- เซฟบนบัญชี ----------
  let syncTimer: any = null, failN = 0, offline = false, prevState = 'play', retryTimer: any = null;
  const offlineEl = document.createElement('div'); offlineEl.id = 'net-offline'; offlineEl.className = 'hidden';
  offlineEl.innerHTML = '<div class="ol-box sketch"><b>ขาดการเชื่อมต่อ</b><p>เกมหยุดไว้ก่อน กำลังเชื่อมต่อใหม่...</p></div>';
  document.getElementById('game')!.appendChild(offlineEl);
  PD.Save.has = () => false; PD.Save.clear = () => {};
  PD.Save.write = () => { if (inGame && !syncTimer) syncTimer = setTimeout(() => { syncTimer = null; syncNow(); }, 4000); return true; };
  function snapshot() {
    if (G.player) { G.S.player.hp = Math.round(G.player.hp); G.S.player.ink = Math.round(G.player.ink); }
    const s = JSON.parse(JSON.stringify(G.S));
    if (s.loc && s.loc.land === ONLINE_DUNGEON) s.loc = { land: ONLINE_TOWN, map: 0 };   // ออกกลางดันเจี้ยน → กลับมาที่เมือง
    s._savedAt = Math.max(Date.now(), serverAt + 1);
    return s;
  }
  async function syncNow() {
    if (!inGame || !acc) return false;
    const s = snapshot();
    try { const r = await Api.putSave(acc.token, s, s._savedAt); serverAt = r.savedAt; acc.save = s; failN = 0; if (offline) setOffline(false); return true; }
    catch (e: any) {
      if (e.status === 401) { kick('กรุณาเข้าสู่ระบบใหม่'); return false; }
      if (e.status === 409) serverAt = e.data?.savedAt || serverAt;
      if (++failN >= 2) setOffline(true);
      clearTimeout(retryTimer); retryTimer = setTimeout(syncNow, 4000);
      return false;
    }
  }
  function setOffline(on: boolean) {   // ต้องออนไลน์เสมอ: บันทึกไม่ได้ → หยุดเกมจนกว่าจะต่อได้
    offline = on; offlineEl.classList.toggle('hidden', !on);
    if (on) { if (G.state !== 'offline') { prevState = G.state; G.state = 'offline'; } }
    else if (G.state === 'offline') G.state = prevState === 'offline' ? 'play' : prevState;
  }
  const beacon = () => { if (inGame && acc) { const s = snapshot(); Api.beaconSave(acc.token, s, s._savedAt); } };
  window.addEventListener('pagehide', beacon);
  document.addEventListener('visibilitychange', () => { if (document.hidden) beacon(); });

  // ---------- ลานต้นหมึก + ป๊อปอัป ----------
  const title = new TitleField(menu);
  function menu() {
    const errLine = '<div class="ol-err">' + esc(formMsg) + '</div>';
    if (step === 'login') return {
      html: '<h3>เข้าสู่ระบบ</h3><label>ID<input id="ol-id" autocomplete="username" maxlength="16" placeholder="a-z 0-9 _"></label>' +
        '<label>รหัสผ่าน<input id="ol-pass" type="password" autocomplete="current-password" maxlength="64"></label>' + errLine +
        '<div class="obtns"><button id="ol-login">เข้าสู่ระบบ</button><button id="ol-reg">สมัคร</button></div><a class="ol-link" id="ol-back">← กลับ</a>',
      bind: (r: HTMLElement) => {
        const go = async (fn: 'login' | 'register') => {
          const id = (r.querySelector('#ol-id') as HTMLInputElement).value.trim(), pass = (r.querySelector('#ol-pass') as HTMLInputElement).value;
          try { acc = await Api[fn](id, pass); setToken(acc.token); formMsg = ''; afterAuth(); }
          catch (e: any) { formMsg = e.message; title.render(); (title as any).pop.querySelector('#ol-id').value = id; }
        };
        (r.querySelector('#ol-login') as HTMLElement).onclick = () => go('login');
        (r.querySelector('#ol-reg') as HTMLElement).onclick = () => go('register');
        (r.querySelector('#ol-pass') as HTMLInputElement).onkeydown = e => { if (e.key === 'Enter') go('login'); };
        (r.querySelector('#ol-back') as HTMLElement).onclick = () => { step = 'menu'; formMsg = ''; title.pinned = false; title.render(); };
        setTimeout(() => (r.querySelector('#ol-id') as HTMLInputElement)?.focus(), 0);
      }
    };
    if (step === 'name') return {
      html: '<h3>ตั้งชื่อตัวละคร</h3><p class="ol-sub">ผู้เล่นคนอื่นจะเห็นชื่อนี้ในเมืองออนไลน์</p><label>ชื่อ<input id="ol-name" maxlength="12" placeholder="2–12 ตัวอักษร"></label>' +
        '<label class="ol-small">รหัสเชิญผู้ทดสอบ (ถ้ามี)<input id="ol-invite" maxlength="32" autocomplete="off" placeholder="เว้นว่าง = เริ่มเรื่องใหม่"></label>' + errLine +
        '<div class="obtns"><button id="ol-name-ok">เริ่มเล่น</button></div>',
      bind: (r: HTMLElement) => {
        const ok = async () => {
          const name = (r.querySelector('#ol-name') as HTMLInputElement).value, code = (r.querySelector('#ol-invite') as HTMLInputElement).value.trim();
          try {
            if (code) await Api.invite(acc!.token, code);          // ตรวจรหัสก่อนจองชื่อ
            const n = await Api.setName(acc!.token, name); acc!.name = n.name;
            if (code) { const s = makeTestCharacter(PD, w.PD_DATA); const res = await Api.putSave(acc!.token, s, Math.max(Date.now(), (acc!.savedAt || 0) + 1), true); acc!.save = s; acc!.savedAt = res.savedAt; }
            formMsg = ''; enterGame();
          } catch (e: any) { formMsg = e.message; title.render(); }
        };
        (r.querySelector('#ol-name-ok') as HTMLElement).onclick = ok;
        (r.querySelector('#ol-name') as HTMLInputElement).onkeydown = e => { if (e.key === 'Enter') ok(); };
        setTimeout(() => (r.querySelector('#ol-name') as HTMLInputElement)?.focus(), 0);
      }
    };
    return {
      html: '<div class="tp-menu"><button id="tp-play">เข้าเกม' + (acc?.name ? '<small>' + esc(acc.name) + '</small>' : '') + '</button>' +
        '<button id="tp-view" class="soon">เข้าชม<small>เร็วๆ นี้</small></button><button class="soon" disabled>เร็วๆ นี้</button></div>' +
        (acc ? '<a class="ol-link" id="tp-logout">ออกจากระบบ</a>' : '') + errLine,
      bind: (r: HTMLElement) => {
        (r.querySelector('#tp-play') as HTMLElement).onclick = () => { formMsg = ''; if (acc) afterAuth(); else { step = 'login'; title.pinned = true; title.render(); } };
        (r.querySelector('#tp-view') as HTMLElement).onclick = () => G.toast('โหมดเข้าชมเนื้อเรื่อง เร็วๆ นี้', '#777');
        const lo = r.querySelector('#tp-logout') as HTMLElement | null;
        if (lo) lo.onclick = () => { acc = null; setToken(''); net?.close(); net = null; title.render(); };
      }
    };
  }
  function afterAuth() {
    if (!acc!.name) { step = 'name'; title.pinned = true; return title.render(); }
    enterGame();
  }
  function enterGame() {
    step = 'menu'; title.stop();
    serverAt = acc!.savedAt || 0;
    if (!net) { net = new Net(acc!.token, { status: () => {}, roomChanged: () => pill(), kicked: kick, lostRoom: () => { G.toast('หลุดนานเกินไป กลับมาที่เมือง', '#d23a2a'); G.loadMap(ONLINE_TOWN, 0, 'world'); } }); net.install(); net.connect(); w.__online.net = net; }
    inGame = true;
    if (acc!.save) {
      const s = acc!.save; PD.Save.read = () => JSON.parse(JSON.stringify(s));
      if (s.loc && s.loc.land === ONLINE_DUNGEON) s.loc = { land: ONLINE_TOWN, map: 0 };
      if (!G.continueGame()) G.newGame();
    } else G.newGame();
    UI.showHud(true); pill();
  }
  function kick(why: string) {
    inGame = false; net?.close(); net = null; acc = null; setToken('');
    G.state = 'title'; UI.showHud(false); hudPill.classList.add('hidden');
    UI.overlay('<h2>ออกจากเกม</h2><p>' + esc(why) + '</p><div class="obtns"><button id="ob-relogin">กลับหน้าแรก</button></div>');
    (document.getElementById('ob-relogin') as HTMLElement).onclick = () => { UI.hideOverlay(); title.start(); };
  }

  // ---------- ผูกกับเอนจิน ----------
  UI.showTitle = async () => {   // ตอนเปิดเกม และปุ่ม "กลับหน้าแรก" ในเมนูหยุด
    if (inGame) { clearTimeout(syncTimer); syncTimer = null; await syncNow(); inGame = false; }
    hudPill.classList.add('hidden');
    title.start(acc?.save || undefined);
  };
  const origOpen = UI.openPanel;
  UI.openPanel = function (name: string, ...a: any[]) {
    if (title.active) return;                                                   // ลานต้นหมึก: ไม่มีเมนู
    if (name === 'world' && G.land?.id === ONLINE_DUNGEON) { G.portalLock = true; return G.toast('เดินออกทางประตูก่อนเปิดแผนที่โลก', '#777'); }
    return origOpen.call(UI, name, ...a);
  };
  const origUnlock = G.unlockPostLands;
  G.unlockPostLands = function (say: boolean) {   // จบ 7 ด่าน → หน้าเมืองออนไลน์รอวางบนแผนที่โลก
    origUnlock.call(G, say);
    if (G.S.ended && !G.S.lands[ONLINE_TOWN] && !G.S.pendingPages.includes(ONLINE_TOWN)) { G.S.pendingPages.push(ONLINE_TOWN); if (say) G.toast('ปลดล็อกเมืองออนไลน์! วางบนแผนที่โลกได้แล้ว', '#2f6fd6'); }
  };
  const origFrame = G.frame;
  G.frame = function (dt: number) { origFrame.call(G, dt); title.tick(); if (inGame && net) net.tick(Math.min(0.05, dt)); };

  // ป้ายสถานะห้อง (เฉพาะเมือง/ดันเจี้ยนออนไลน์)
  const hudPill = document.createElement('div'); hudPill.id = 'net-pill'; hudPill.className = 'hidden'; document.getElementById('game')!.appendChild(hudPill);
  function pill() {
    if (!inGame || !net || (net.area !== 'town' && net.area !== 'dungeon')) { hudPill.classList.add('hidden'); return; }
    const n = 1 + [...net.remotes.values()].filter(r => !r.away).length;
    hudPill.innerHTML = '<span class="dot ' + (net.connected ? 'on' : 'off') + '"></span><b>' + (net.area === 'dungeon' ? 'ป่าเงาหมึก · ' + (net.isHost ? 'Host' : 'Guest') : 'เมืองออนไลน์') + '</b> · ' + n + ' คน';
    hudPill.classList.remove('hidden');
  }
  setInterval(pill, 1000);

  // จำการล็อกอิน: มี token เดิม → ตรวจกับเซิร์ฟเวอร์ (ไม่ผ่านก็แค่ต้องล็อกอินใหม่)
  const t = getToken();
  if (t) Api.me(t).then(a => { acc = a; if (title.active && title.near) title.render(); }).catch(() => setToken(''));
  w.__online = { syncNow, title, get acc() { return acc; }, get inGame() { return inGame; }, net: null as Net | null };
}

// ---------- โหมดออฟไลน์: ลานต้นหมึกเดียวกัน แต่เซฟลง localStorage ของเบราว์เซอร์ ----------
// เลิกใช้เมื่อไหร่ก็แค่ไม่ build:offline อีก (โค้ดออนไลน์ไม่ต้องแก้)
function bootOffline() {
  installTitleField(w.PD_DATA);
  let inGame = false;
  const origWrite = PD.Save.write.bind(PD.Save);
  PD.Save.write = (S: any) => (inGame ? origWrite(S) : true);   // อยู่ในลานต้นหมึก: ไม่เขียนทับเซฟจริง
  const title = new TitleField(() => {
    const has = PD.Save.has();
    return {
      html: '<div class="tp-menu"><button id="tp-play">เข้าเกม<small>' + (has ? 'เล่นต่อ' : 'เริ่มเรื่องใหม่') + '</small></button>' +
        '<button id="tp-view" class="soon">เข้าชม<small>เร็วๆ นี้</small></button><button class="soon" disabled>เร็วๆ นี้</button></div>' +
        (has ? '<a class="ol-link" id="tp-new">เริ่มเกมใหม่ (ลบเซฟเดิม)</a>' : '') +
        '<p class="ol-sub" style="margin-top:6px">เวอร์ชันออฟไลน์ · เซฟอยู่ในเบราว์เซอร์นี้</p>',
      bind: (r: HTMLElement) => {
        (r.querySelector('#tp-play') as HTMLElement).onclick = () => enter();
        (r.querySelector('#tp-view') as HTMLElement).onclick = () => G.toast('โหมดเข้าชมเนื้อเรื่อง เร็วๆ นี้', '#777');
        const nw = r.querySelector('#tp-new') as HTMLElement | null;
        if (nw) nw.onclick = () => UI.confirm('เริ่มเกมใหม่? เซฟเดิมในเบราว์เซอร์นี้จะถูกลบ', () => { PD.Save.clear(); enter(); });
      }
    };
  });
  function enter() {
    title.stop(); inGame = true;
    if (PD.Save.has()) { if (!G.continueGame()) G.newGame(); } else G.newGame();
    UI.showHud(true);
  }
  UI.showTitle = () => {   // ตอนเปิดเกม และปุ่ม "กลับหน้าแรก" ในเมนูหยุด
    if (inGame) { G.save(); inGame = false; }
    title.start(PD.Save.read() || undefined);
  };
  const origFrame = G.frame;
  G.frame = function (dt: number) { origFrame.call(G, dt); title.tick(); };
  w.__offline = { title, get inGame() { return inGame; } };
}
