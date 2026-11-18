// Ink World Online — หน้า online.html: login → ตั้งชื่อ → เมืองออนไลน์ → ดันเจี้ยน Co-op
// ใช้ Runtime เดิมทั้งหมด (src/engine) · เซฟถูกสลับเป็น "สำเนาออนไลน์" แล้วซิงก์ตัวละครกลับเซิร์ฟเวอร์ + เครื่อง
import './play.css';
import './online/online.css';
import Phaser from 'phaser';
import './engine';
import { PlayScene, playSize } from './scenes/PlayScene';
import { installOnlineData, ONLINE_TOWN, ONLINE_DUNGEON } from './online/onlineData';
import { Api, Account } from './online/api';
import { Net } from './online/net';
import { readLocal, pickBase, unlocked, savedAt, backupLocal, writeLocal, mergeCharacter, sessionCopy, makeTestCharacter } from './online/saveSync';

const w = window as any, PD = w.PD, G = PD.Game;
installOnlineData(w.PD_DATA);

// ---------- เซฟ: ไม่เขียน localStorage ตรงๆ ระหว่างออนไลน์ ----------
PD.Save.disablePersistence();
let acc: Account | null = null, net: Net | null = null, base: any = null, serverAt = 0, inSession = false, syncTimer: any = null;
PD.Save.write = () => { if (inSession && !syncTimer) syncTimer = setTimeout(() => { syncTimer = null; syncNow(); }, 20_000); return true; };

function mergedNow() {
  const at = Math.max(Date.now(), serverAt + 1);
  const m = mergeCharacter(base, G.S); m._savedAt = at; return m;
}
async function syncNow() {
  if (!inSession || !acc || !G.S) return false;
  if (G.player) { G.S.player.hp = Math.round(G.player.hp); G.S.player.ink = Math.round(G.player.ink); }
  const m = mergedNow(); base = m; if (!m.testChar) writeLocal(m);
  try { const r = await Api.putSave(acc.token, m, m._savedAt); serverAt = r.savedAt; pill(); return true; }
  catch (e: any) { if (e.status === 409) { serverAt = e.data?.savedAt || serverAt; } toastErr('ซิงก์เซฟไม่สำเร็จ: ' + e.message); return false; }
}
const flushBeacon = () => { if (!inSession || !acc) return; if (G.player) { G.S.player.hp = Math.round(G.player.hp); G.S.player.ink = Math.round(G.player.ink); } const m = mergedNow(); base = m; if (!m.testChar) writeLocal(m); Api.beaconSave(acc.token, m, m._savedAt); };
window.addEventListener('pagehide', flushBeacon);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushBeacon(); });

// ---------- UI ----------
const ui = document.createElement('div'); ui.id = 'online-ui'; document.getElementById('game')!.appendChild(ui);
const hudPill = document.createElement('div'); hudPill.id = 'net-pill'; hudPill.className = 'hidden'; document.getElementById('game')!.appendChild(hudPill);
const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
const show = (html: string) => { ui.innerHTML = '<div class="ol-box sketch">' + html + '</div>'; ui.classList.remove('hidden'); };
const hide = () => { ui.classList.add('hidden'); ui.innerHTML = ''; };
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const toastErr = (t: string) => PD.UI.toast ? PD.UI.toast(t, '#d23a2a') : alert(t);
let netStatus = '';
function pill() {
  if (!inSession || !net) { hudPill.classList.add('hidden'); return; }
  const n = 1 + [...net.remotes.values()].filter(r => !r.away).length;
  const where = net.area === 'dungeon' ? 'ป่าเงาหมึก · ' + (net.isHost ? 'Host' : 'Guest') : 'เมือง';
  hudPill.innerHTML = '<span class="dot ' + (net.connected ? 'on' : 'off') + '"></span><b>' + esc(where) + '</b> · ' + n + ' คน' + (netStatus && netStatus !== 'ออนไลน์' ? ' · ' + esc(netStatus) : '') + '<button id="net-leave">ออก</button>';
  hudPill.classList.remove('hidden');
  $('net-leave').onclick = () => leave();
}

function showLogin(msg = '') {
  G.state = 'title'; PD.UI.showHud(false);
  show('<h1>Ink World Online</h1><p class="ol-sub">เข้าสู่ระบบเพื่อเล่นร่วมกับผู้อื่น · ต้องจบเนื้อเรื่อง 7 ด่านก่อน</p>' +
    '<label>ID<input id="ol-id" autocomplete="username" maxlength="16" placeholder="a-z 0-9 _"></label>' +
    '<label>รหัสผ่าน<input id="ol-pass" type="password" autocomplete="current-password" maxlength="64"></label>' +
    '<div class="ol-err">' + esc(msg) + '</div>' +
    '<div class="obtns"><button id="ol-login">เข้าสู่ระบบ</button><button id="ol-reg">สมัคร</button></div>' +
    '<a class="ol-link" href="./index.html">← กลับเกมออฟไลน์</a>');
  const go = async (fn: 'login' | 'register') => {
    const id = $('ol-id').value.trim(), pass = $('ol-pass').value;
    try { acc = await Api[fn](id, pass); afterLogin(); }
    catch (e: any) { showLogin(e.message); $('ol-id').value = id; }
  };
  $('ol-login').onclick = () => go('login'); $('ol-reg').onclick = () => go('register');
  $('ol-pass').onkeydown = e => { if (e.key === 'Enter') go('login'); };
}

async function afterLogin() {
  const local = readLocal();
  const pick = pickBase(local, acc!.save, acc!.savedAt);
  if (!pick.base || !unlocked(pick.base)) return showLocked();
  backupLocal();   // สำรองเซฟในเครื่องก่อนทุกครั้ง (localStorage: ..._backup_online)
  base = pick.base; serverAt = acc!.savedAt || 0;
  if (pick.from === 'local' && savedAt(local) > serverAt) {          // เซฟในเครื่องใหม่กว่า → อัปโหลดเป็นเซฟหลัก
    try { const at = Math.max(savedAt(local) || Date.now(), serverAt + 1); base._savedAt = at; const r = await Api.putSave(acc!.token, base, at); serverAt = r.savedAt; }
    catch (e: any) { return showLogin('อัปโหลดเซฟไม่สำเร็จ: ' + e.message); }
  } else if (pick.from === 'server' && !base.testChar && serverAt > savedAt(local)) writeLocal(base); // บัญชีใหม่กว่า → ดึงลงเครื่อง (เกมออฟไลน์เล่นต่อจากตัวนี้)
  if (!acc!.name) return showName();
  start();
}

function showLocked(msg = '') {
  show('<h2>ยังเข้าโหมดออนไลน์ไม่ได้</h2><p>ต้องเล่นเนื้อเรื่องครบ 7 ด่าน (จบฉากผู้ลบ) ก่อน<br>หรือใส่รหัสเชิญเพื่อรับตัวละครทดสอบ Lv50</p>' +
    '<label>รหัสเชิญ<input id="ol-invite" maxlength="32" autocomplete="off"></label><div class="ol-err">' + esc(msg) + '</div>' +
    '<div class="obtns"><button id="ol-invite-ok">ใช้รหัสเชิญ</button><a class="btn" href="./index.html">ไปเล่นเกมออฟไลน์</a></div>' +
    '<p class="ol-sub">ตัวละครทดสอบเก็บในบัญชีเท่านั้น ไม่ทับเซฟเกมออฟไลน์ในเครื่องนี้</p>');
  const ok = async () => {
    try {
      await Api.invite(acc!.token, $('ol-invite').value);
      const s = makeTestCharacter(PD, w.PD_DATA);
      const r = await Api.putSave(acc!.token, s, Math.max(s._savedAt, (acc!.savedAt || 0) + 1), true);
      acc!.save = s; acc!.savedAt = r.savedAt; afterLogin();
    } catch (e: any) { showLocked(e.message); }
  };
  $('ol-invite-ok').onclick = ok; $('ol-invite').onkeydown = e => { if (e.key === 'Enter') ok(); };
}

function showName(msg = '') {
  const P = base.player;
  show('<h2>สร้างตัวละครออนไลน์</h2><p class="ol-sub">ใช้ตัวละคร Lv ' + P.level + (base.testChar ? ' (ตัวทดสอบ)' : ' จากเซฟของคุณ') + ' · ตั้งชื่อที่ผู้เล่นคนอื่นจะเห็น</p>' +
    '<label>ชื่อตัวละคร<input id="ol-name" maxlength="12" placeholder="2–12 ตัวอักษร"></label><div class="ol-err">' + esc(msg) + '</div>' +
    '<div class="obtns"><button id="ol-name-ok">เริ่มเล่น</button></div>');
  const ok = async () => { try { const r = await Api.setName(acc!.token, $('ol-name').value); acc!.name = r.name; start(); } catch (e: any) { showName(e.message); } };
  $('ol-name-ok').onclick = ok; $('ol-name').onkeydown = e => { if (e.key === 'Enter') ok(); };
}

function start() {
  hide();
  G.S = sessionCopy(base); G.stats = {}; G.mapCache = {};
  G.initPlayer(true);
  inSession = true;
  net = new Net(acc!.token, {
    status: s => { netStatus = s; pill(); },
    roomChanged: () => pill(),
    kicked: why => { inSession = false; clearTimeout(syncTimer); G.state = 'title'; PD.UI.showHud(false); hudPill.classList.add('hidden'); show('<h2>ออกจากออนไลน์</h2><p>' + esc(why) + '</p><div class="obtns"><button onclick="location.reload()">เข้าสู่ระบบใหม่</button></div>'); },
    lostRoom: () => { G.toast('หลุดนานเกินไป กลับมาที่เมือง', '#d23a2a'); G.loadMap(ONLINE_TOWN, 0, 'world'); }
  });
  net.install();
  w.__online.net = net;
  net.connect();
  G.loadMap(ONLINE_TOWN, 0, 'world');
  G.state = 'play'; PD.UI.hideOverlay(); PD.UI.showHud(true);
  pill();
  G.toast('ยินดีต้อนรับ ' + acc!.name + ' · ประตูฝั่งตะวันตกไปป่าเงาหมึก', '#2f6fd6');
}

async function leave() {
  if (!inSession) return;
  PD.UI.confirm('ออกจากโหมดออนไลน์? (บันทึกตัวละครแล้วกลับหน้าแรก)', async () => {
    clearTimeout(syncTimer); syncTimer = null;
    const ok = await syncNow();
    inSession = false; net?.close(); G.state = 'title'; PD.UI.showHud(false); hudPill.classList.add('hidden');
    show('<h2>ออกจากออนไลน์แล้ว</h2><p>' + (ok ? (base.testChar ? 'บันทึกตัวละครทดสอบลงบัญชีแล้ว' : 'บันทึกตัวละครลงบัญชีและเครื่องนี้แล้ว') : 'บันทึกขึ้นเซิร์ฟเวอร์ไม่สำเร็จ แต่บันทึกในเครื่องแล้ว') + '</p>' +
      '<div class="obtns"><button onclick="location.reload()">เข้าออนไลน์อีกครั้ง</button><a class="btn" href="./index.html">ไปเกมออฟไลน์</a></div>');
  });
}

// ---------- ผูกกับเอนจิน ----------
PD.UI.showTitle = () => { if (inSession) { G.state = 'play'; PD.UI.showHud(true); leave(); } else showLogin(); };
const origOpen = PD.UI.openPanel;
PD.UI.openPanel = function (name: string, ...a: any[]) { if (name === 'world') { G.portalLock = true; return G.toast('แผนที่โลกใช้ไม่ได้ในโหมดออนไลน์', '#777'); } return origOpen.call(PD.UI, name, ...a); };
const origFrame = G.frame;
G.frame = function (dt: number) { origFrame.call(G, dt); if (inSession && net) net.tick(Math.min(0.05, dt)); };
setInterval(() => { if (inSession) pill(); }, 1000);
w.__online = { syncNow, get acc() { return acc; }, get base() { return base; }, get inSession() { return inSession; }, ONLINE_TOWN, ONLINE_DUNGEON, net: null as Net | null };

const { W, H } = playSize(w.PD_DATA.config.lowResHeight);
w.__game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'stage', width: W, height: H, backgroundColor: '#f8f4ea',
  pixelArt: true, antialias: false, roundPixels: true, banner: false, disableContextMenu: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { powerPreference: 'high-performance' },
  scene: [new PlayScene(false)]
});
