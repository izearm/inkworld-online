// Ink World Online — เซิร์ฟเวอร์ตัวเดียว: บัญชี (id/pass) · เซฟหลัก · ห้องเมือง/ดันเจี้ยน (ส่งต่อข้อมูล + สลับ Host)
// รัน: npm run build && npm run server   → http://localhost:8787/online.html
// ตัวแปร: PORT, DATABASE_URL (Postgres), DATA_FILE (ไฟล์ JSON ถ้าไม่มี DB), DIST_DIR (โฟลเดอร์ build)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { openStore } from './store.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RULES = {
  townGraceMs: 10_000,      // หลุดในเมือง: ตัวละครค้าง 10 วิ
  dungeonGraceMs: 30_000,   // หลุดในดันเจี้ยน: ค้าง 30 วิ (ศัตรูไม่ตี) แล้วนำออกจากห้อง
  dungeonSize: 2,           // Co-op 2 คน
  townSize: 40,
  maxSaveBytes: 600_000
};

export async function startServer({ port = Number(process.env.PORT) || 8787, dist = process.env.DIST_DIR || path.resolve(HERE, '../dist'), store, rules = {} } = {}) {
  Object.assign(RULES, rules);
  store = store || await openStore();
  const sessions = new Map();   // userId → { id, name, ws, room, area, st, away, timer }
  const rooms = new Map();      // roomId → { id, area, players:Set, host, snap }
  let roomSeq = 0;

  // ---------- บัญชี ----------
  const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, 32).toString('hex');
  const newToken = () => crypto.randomBytes(24).toString('hex');
  const ID_RE = /^[a-zA-Z0-9_]{3,16}$/;
  const cleanName = n => String(n || '').replace(/[\u0000-\u001f<>&"'`]/g, '').trim();
  const nameKey = n => n.toLowerCase();
  const fails = new Map(); // ip → { n, until }
  const INVITES = String(process.env.INVITE_CODES ?? rules.inviteCodes ?? '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
  const publicAcc = a => ({ token: a.token, id: a.id, name: a.name || null, save: a.save || null, savedAt: a.savedAt || 0 });

  async function api(req, res, url) {
    const ip = req.socket.remoteAddress || '';
    const body = req.method === 'GET' ? {} : await readJson(req).catch(() => null);
    if (body === null) return send(res, 400, { error: 'ข้อมูลไม่ถูกต้อง' });
    const auth = async () => { const t = (req.headers.authorization || '').replace(/^Bearer /, '') || body.token; return t ? store.byToken(t) : null; };
    const p = url.pathname;
    if (p === '/api/health') return send(res, 200, { ok: true, store: store.kind });
    if (p === '/api/register' && req.method === 'POST') {
      const id = String(body.id || ''), pass = String(body.pass || '');
      if (!ID_RE.test(id)) return send(res, 400, { error: 'ID ใช้ a-z 0-9 _ ยาว 3–16 ตัว' });
      if (pass.length < 4 || pass.length > 64) return send(res, 400, { error: 'รหัสผ่านยาว 4–64 ตัว' });
      const salt = crypto.randomBytes(16).toString('hex');
      const a = { id, salt, hash: hashPass(pass, salt), token: newToken(), name: null, nameKey: null, save: null, savedAt: 0, createdAt: Date.now() };
      if (!await store.create(a)) return send(res, 409, { error: 'ID นี้มีคนใช้แล้ว' });
      return send(res, 200, publicAcc(a));
    }
    if (p === '/api/login' && req.method === 'POST') {
      const f = fails.get(ip); if (f && f.until > Date.now()) return send(res, 429, { error: 'ลองผิดหลายครั้ง รอสักครู่' });
      const a = await store.get(String(body.id || ''));
      if (!a || hashPass(String(body.pass || ''), a.salt) !== a.hash) {
        const n = (f?.n || 0) + 1; fails.set(ip, { n, until: n >= 5 ? Date.now() + 30_000 : 0 });
        return send(res, 401, { error: 'ID หรือรหัสผ่านไม่ถูกต้อง' });
      }
      fails.delete(ip);
      const b = await store.update(a.id, { token: newToken() });
      return send(res, 200, publicAcc(b));
    }
    const a = await auth(); if (!a) return send(res, 401, { error: 'กรุณาเข้าสู่ระบบใหม่' });
    if (p === '/api/me' && req.method === 'GET') return send(res, 200, publicAcc(a));   // จำการล็อกอินไว้ในเครื่อง: ตรวจ token แล้วคืนชื่อ + เซฟ
    if (p === '/api/name' && req.method === 'POST') {
      const name = cleanName(body.name);
      if ([...name].length < 2 || [...name].length > 12) return send(res, 400, { error: 'ชื่อยาว 2–12 ตัวอักษร' });
      if (await store.nameTaken(nameKey(name), a.id)) return send(res, 409, { error: 'ชื่อนี้มีคนใช้แล้ว' });
      await store.update(a.id, { name, nameKey: nameKey(name) });
      return send(res, 200, { name });
    }
    if (p === '/api/invite' && req.method === 'POST') {          // รหัสเชิญ: ปลดล็อกตัวละครทดสอบ Lv50 (ตั้งรหัสใน INVITE_CODES คั่นด้วย ,)
      const f = fails.get(ip); if (f && f.until > Date.now()) return send(res, 429, { error: 'ลองผิดหลายครั้ง รอสักครู่' });
      const code = String(body.code || '').trim().toUpperCase();
      if (!code || !INVITES.includes(code)) { const n = (f?.n || 0) + 1; fails.set(ip, { n, until: n >= 5 ? Date.now() + 30_000 : 0 }); return send(res, 403, { error: 'รหัสเชิญไม่ถูกต้อง' }); }
      fails.delete(ip);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/save' && req.method === 'GET') return send(res, 200, { save: a.save || null, savedAt: a.savedAt || 0 });
    if ((p === '/api/save' && req.method === 'PUT') || (p === '/api/save-beacon' && req.method === 'POST')) {
      const s = body.save, at = Number(body.savedAt) || Date.now();
      if (!s || typeof s !== 'object' || !s.player || typeof s.player !== 'object') return send(res, 400, { error: 'เซฟไม่ถูกต้อง' });
      if (JSON.stringify(s).length > RULES.maxSaveBytes) return send(res, 413, { error: 'เซฟใหญ่เกินไป' });
      if (at < (a.savedAt || 0) && !body.force) return send(res, 409, { error: 'เซฟบนเซิร์ฟเวอร์ใหม่กว่า', savedAt: a.savedAt });
      await store.update(a.id, { save: s, savedAt: at });
      return send(res, 200, { ok: true, savedAt: at });
    }
    return send(res, 404, { error: 'ไม่พบ' });
  }

  // ---------- ไฟล์เกม ----------
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  function serveStatic(req, res, url) {
    let rel = decodeURIComponent(url.pathname); if (rel === '/') rel = '/index.html';
    const file = path.resolve(dist, '.' + rel);
    if (!file.startsWith(path.resolve(dist))) return send(res, 403, { error: 'forbidden' });
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return send(res, 404, { error: 'ไม่พบไฟล์ (ลืม npm run build?)' });
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
      fs.createReadStream(file).pipe(res);
    });
  }

  // CORS: ให้หน้าเกมบน GitHub Pages (คนละโดเมน) เรียก API ได้ · ALLOWED_ORIGINS=https://xxx.github.io (ว่าง = ทุกที่)
  const ALLOWED = String(process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const origin = req.headers.origin;
    if (origin && (!ALLOWED.length || ALLOWED.includes(origin))) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS'); }
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (url.pathname.startsWith('/api/')) return api(req, res, url).catch(e => { console.error(e); send(res, 500, { error: 'เซิร์ฟเวอร์ผิดพลาด' }); });
    serveStatic(req, res, url);
  });

  // ---------- ห้อง ----------
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
  const out = (s, m) => { if (s && s.ws && s.ws.readyState === 1) s.ws.send(JSON.stringify(m)); };
  const others = (room, exceptId) => [...room.players].filter(id => id !== exceptId).map(id => sessions.get(id)).filter(Boolean);
  const bcast = (room, m, exceptId) => { for (const s of others(room, exceptId)) out(s, m); };
  const info = s => ({ id: s.id, name: s.name, st: s.st || null, away: !!s.away });
  const activeIn = room => [...room.players].map(id => sessions.get(id)).filter(s => s && !s.away);

  function pickHost(room) {
    const cur = sessions.get(room.host);
    if (cur && !cur.away && room.players.has(cur.id)) return;
    const next = activeIn(room)[0];
    room.host = next ? next.id : null;
    if (room.area === 'dungeon') bcast(room, { t: 'host', id: room.host, snap: room.snap });
  }
  function leaveRoom(s) {
    const room = rooms.get(s.room); s.room = null; if (!room) return;
    room.players.delete(s.id);
    bcast(room, { t: 'pl', id: s.id });
    if (!room.players.size) { if (room.id !== 'town') rooms.delete(room.id); return; }
    if (room.host === s.id) pickHost(room);
  }
  function findDungeon() {
    for (const r of rooms.values()) if (r.area === 'dungeon' && r.players.size < RULES.dungeonSize && activeIn(r).length > 0) return r;
    const r = { id: 'd' + (++roomSeq), area: 'dungeon', players: new Set(), host: null, snap: null }; rooms.set(r.id, r); return r;
  }
  function joinRoom(s, area) {
    if (s.room) leaveRoom(s);
    let room;
    if (area === 'town') { room = rooms.get('town') || { id: 'town', area: 'town', players: new Set(), host: null, snap: null }; rooms.set('town', room); }
    else room = findDungeon();
    room.players.add(s.id); s.room = room.id; s.area = area;
    if (area === 'dungeon' && (!room.host || !sessions.get(room.host) || sessions.get(room.host).away)) room.host = s.id;
    out(s, { t: 'room', area, room: room.id, host: room.host, players: others(room, s.id).map(info), snap: room.host !== s.id ? room.snap : null });
    bcast(room, { t: 'pj', p: info(s) }, s.id);
  }
  function dropSession(s) {
    clearTimeout(s.timer); leaveRoom(s); sessions.delete(s.id);
  }

  wss.on('connection', async (ws, req) => {
    if (ALLOWED.length && req.headers.origin && !ALLOWED.includes(req.headers.origin) && !String(req.headers.origin).includes(String(req.headers.host))) { ws.close(4003, 'origin'); return; }
    const url = new URL(req.url, 'http://x');
    const acc = await store.byToken(url.searchParams.get('token') || '').catch(() => null);
    if (!acc || !acc.name) { ws.close(4001, 'auth'); return; }
    let s = sessions.get(acc.id), resume = null;
    if (s) {
      if (s.ws && s.ws !== ws) { try { s.ws.close(4002, 'login elsewhere'); } catch { /* */ } }
      clearTimeout(s.timer); s.timer = null; s.ws = ws; s.name = acc.name;
      if (s.room && rooms.get(s.room)) {
        const room = rooms.get(s.room); s.away = false; resume = { area: s.area, room: room.id };
        bcast(room, { t: 'back', id: s.id }, s.id);
        if (room.area === 'dungeon') { const h = sessions.get(room.host); if (!h || h.away) { room.host = s.id; bcast(room, { t: 'host', id: s.id, snap: room.snap }, s.id); } }
      } else s.away = false;
    } else {
      s = { id: acc.id, name: acc.name, ws, room: null, area: null, st: null, away: false, timer: null };
      sessions.set(acc.id, s);
    }
    out(s, { t: 'welcome', you: s.id, name: s.name, rules: RULES, resumed: !!resume });
    if (resume) { const room = rooms.get(s.room); out(s, { t: 'room', area: s.area, room: room.id, host: room.host, players: others(room, s.id).map(info), snap: room.host !== s.id ? room.snap : null, resumed: true }); }

    ws.on('message', raw => {
      if (s.ws !== ws) return;
      let m; try { m = JSON.parse(raw); } catch { return; }
      const room = rooms.get(s.room);
      switch (m.t) {
        case 'join': if (m.area === 'town' || m.area === 'dungeon') { s.st = sanitizeSt(m.st) || s.st; joinRoom(s, m.area); } else if (m.area === 'solo') { leaveRoom(s); s.area = null; } break;
        case 'st': { const st = sanitizeSt(m); if (!st || !room) break; s.st = st; bcast(room, { t: 'st', id: s.id, ...st }, s.id); break; }
        case 'snap': if (room && room.host === s.id && m.d) { room.snap = m.d; bcast(room, { t: 'snap', d: m.d }, s.id); } break;
        case 'ev': if (room && m.e) {
          const msg = { t: 'ev', from: s.id, e: m.e };
          if (m.to) { if (room.players.has(m.to)) out(sessions.get(m.to), msg); }
          else if (m.toHost) { if (room.host && room.host !== s.id) out(sessions.get(room.host), msg); }
          else bcast(room, msg, s.id);
        } break;
        case 'leave': dropSession(s); try { ws.close(1000, 'bye'); } catch { /* */ } break;
        case 'ping': out(s, { t: 'pong', at: m.at }); break;
      }
    });
    ws.on('close', () => {
      if (s.ws !== ws || !sessions.has(s.id)) return;
      s.ws = null; s.away = true;
      const room = rooms.get(s.room);
      if (!room) { sessions.delete(s.id); return; }
      bcast(room, { t: 'away', id: s.id });
      if (room.host === s.id) pickHost(room);
      s.timer = setTimeout(() => dropSession(s), room.area === 'dungeon' ? RULES.dungeonGraceMs : RULES.townGraceMs);
    });
  });

  await new Promise(r => server.listen(port, r));
  const addr = server.address();
  console.log(`[ink-world-online] http://localhost:${addr.port}/online.html · store=${store.kind}`);
  return { server, port: addr.port, sessions, rooms, async close() { for (const c of wss.clients) c.terminate(); wss.close(); await new Promise(r => server.close(r)); await store.close(); } };
}

function sanitizeSt(m) {
  if (!m || typeof m !== 'object') return null;
  const n = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : d);
  return { x: n(m.x), y: n(m.y), f: m.f === -1 ? -1 : 1, mv: !!m.mv, an: n(m.an), ap: n(m.ap, -1), ch: n(m.ch, -1), aa: n(m.aa), sw: m.sw === -1 ? -1 : 1,
    w: typeof m.w === 'string' ? m.w.slice(0, 16) : 'sword', wc: typeof m.wc === 'string' ? m.wc.slice(0, 9) : '#1b1b1b', hp: n(m.hp), mhp: n(m.mhp, 1), lv: n(m.lv, 1),
    hu: !!m.hu, iv: !!m.iv, sh: !!m.sh, dash: !!m.dash, map: typeof m.map === 'string' ? m.map.slice(0, 24) : '' };
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 1_000_000) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer();
