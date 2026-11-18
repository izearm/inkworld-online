// ระบบเล่นร่วมกัน (เมือง + ดันเจี้ยน Co-op 2 คน) — ต่อกับเอนจินเดิมผ่าน G.net และการห่อฟังก์ชันของ PD.Game
// ผู้ตัดสิน:
//   · การเคลื่อนที่: เครื่องของผู้เล่นคนนั้น (ส่งสถานะ 10 ครั้ง/วิ เครื่องอื่นเลื่อนตามนุ่มๆ)
//   · AI/HP/การตายของศัตรู, Alpha, ลำดับบอส: Host (คนแรกในห้องดันเจี้ยน)
//   · ดาเมจที่ผู้เล่นตี: คนตีคิดด้วยสเตตัสตัวเอง แล้วส่งเลขให้ Host หัก HP
//   · ดาเมจที่ศัตรูทำ: Host ตัดสินว่าโดน → ผู้โดนหักเกราะเองด้วย hurtPlayer เดิม
//   · ของดรอป: แยกต่อคน (ทุกคนสุ่มของตัวเองตอนศัตรูตาย เห็นเฉพาะของตัวเอง)
import { wsUrl } from './api';
import { ONLINE_DUNGEON, ONLINE_TOWN } from './onlineData';

type St = { x: number; y: number; f: number; mv: boolean; an: number; ap: number; ch: number; aa: number; sw: number; arc?: number; w: string; wc: string; hp: number; mhp: number; lv: number; hu: boolean; iv: boolean; sh: boolean; dash: boolean; map: string };
type Remote = { id: string; name: string; st: St | null; x: number; y: number; tx: number; ty: number; anim: number; away: boolean;
  // ช่องที่ AI ศัตรูของ Host อ่าน/เขียนตอนใช้เป็นเป้าแทน G.player
  hp: number; invuln: number; dashT: number; shieldT: number; immortalT: number; stunT: number; [k: string]: any };

const W = () => (window as any);
const PD = () => W().PD, D = () => W().PD_DATA;
const SEND_MS = 100, SNAP_MS = 100;

export type NetEvents = { status?: (s: string) => void; kicked?: (why: string) => void; roomChanged?: () => void; lostRoom?: () => void };

export class Net {
  ws: WebSocket | null = null;
  me = ''; name = '';
  area: 'town' | 'dungeon' | 'solo' | null = null;   // solo = ด่านเนื้อเรื่อง/ด่านเก่า (เล่นคนเดียว ไม่อยู่ในห้อง)
  roomId = ''; hostId: string | null = null; roomReady = false;
  remotes = new Map<string, Remote>();
  cur: Remote | null = null;          // เป้าหมายระยะไกลที่ AI ศัตรูกำลังเล็งอยู่ (Host)
  suppressKill = false; fromNet = false;
  private sendAcc = 0; private snapAcc = 0; private nidSeq = 0;
  private closedByUs = false; private retry = 0; private retryTimer: any = null;
  private pendingJoin: string | null = null;
  private joinedOnce = false;
  stats = { sent: 0, recv: 0, snaps: 0, dmgOut: 0, dmgIn: 0, kills: 0, hurtsOut: 0, hurtsIn: 0 };

  constructor(public token: string, public ev: NetEvents = {}) {}

  get G() { return PD().Game; }
  get isHost() { return this.area === 'dungeon' && this.roomReady && this.hostId === this.me; }
  get isGuest() { return this.area === 'dungeon' && !(this.roomReady && this.hostId === this.me); }
  get connected() { return !!this.ws && this.ws.readyState === 1; }

  // ---------- การเชื่อมต่อ ----------
  connect() {
    this.closedByUs = false;
    const ws = new WebSocket(wsUrl(this.token)); this.ws = ws;
    this.ev.status?.('กำลังเชื่อมต่อ...');
    ws.onmessage = e => { this.stats.recv++; let m: any; try { m = JSON.parse(e.data); } catch { return; } this.onMsg(m); };
    ws.onclose = e => {
      if (this.ws !== ws) return;
      this.ws = null; this.roomReady = false;
      if (e.code === 4001) return this.ev.kicked?.('กรุณาเข้าสู่ระบบใหม่');
      if (e.code === 4002) return this.ev.kicked?.('บัญชีนี้เข้าเล่นจากที่อื่น');
      if (this.closedByUs) return;
      const wait = Math.min(8000, 1000 * 2 ** this.retry++);
      this.ev.status?.('หลุดการเชื่อมต่อ · ต่อใหม่ใน ' + Math.round(wait / 1000) + ' วิ');
      this.retryTimer = setTimeout(() => this.connect(), wait);
    };
  }
  close() { this.closedByUs = true; clearTimeout(this.retryTimer); try { this.send({ t: 'leave' }); this.ws?.close(1000); } catch { /* */ } this.ws = null; this.remotes.clear(); }
  /** ทดสอบ: ตัดสายแบบไม่ตั้งใจ (เหมือนเน็ตหลุด) */
  dropForTest() { try { this.ws?.close(4999); } catch { /* */ } }
  send(m: any) { if (this.connected) { this.ws!.send(JSON.stringify(m)); this.stats.sent++; } }
  evTo(to: string, e: any) { this.send({ t: 'ev', to, e }); }
  evHost(e: any) { this.send({ t: 'ev', toHost: true, e }); }
  evAll(e: any) { this.send({ t: 'ev', e }); }

  private onMsg(m: any) {
    const G = this.G;
    switch (m.t) {
      case 'welcome':
        this.me = m.you; this.name = m.name; this.retry = 0;
        this.ev.status?.('ออนไลน์');
        if (m.resumed) break;                                   // ห้องเดิมยังอยู่ (กลับมาทันเวลา) → รอข้อความ room
        if (this.joinedOnce && this.area === 'dungeon') { this.ev.lostRoom?.(); break; } // หลุดนานเกินเวลา → ถูกนำออกจากดันเจี้ยน
        if (this.pendingJoin || this.area) this.join((this.pendingJoin || this.area) as any);
        else this.join('solo');
        break;
      case 'room': {
        const want = this.area;
        this.roomId = m.room; this.area = m.area; this.roomReady = true; this.pendingJoin = null;
        if (want && want !== m.area) { /* ไม่ควรเกิด */ }
        this.remotes.clear(); this.joinedOnce = true;
        for (const p of m.players) this.addRemote(p);
        if (m.area === 'dungeon' && m.host !== this.me) { this.hostId = m.host; this.clearWorld(); if (m.snap) this.applySnap(m.snap, true); }
        else this.setHost(m.host, m.snap);
        this.ev.roomChanged?.();
        break;
      }
      case 'pj': this.addRemote(m.p); this.ev.roomChanged?.(); break;
      case 'pl': this.remotes.delete(m.id); this.ev.roomChanged?.(); break;
      case 'away': { const r = this.remotes.get(m.id); if (r) r.away = true; this.ev.roomChanged?.(); break; }
      case 'back': { const r = this.remotes.get(m.id); if (r) r.away = false; this.ev.roomChanged?.(); break; }
      case 'host': this.setHost(m.id, m.snap); this.ev.roomChanged?.(); break;
      case 'st': { const r = this.remotes.get(m.id); if (!r) break; const first = !r.st; r.st = m; r.tx = m.x; r.ty = m.y; r.hp = m.hp; r.away = false;
        if (first || Math.hypot(r.x - m.x, r.y - m.y) > 4) { r.x = m.x; r.y = m.y; } break; }
      case 'snap': if (!this.isHost && this.area === 'dungeon') this.applySnap(m.d, false); break;
      case 'ev': this.onEvent(m.from, m.e); break;
    }
    void G;
  }

  join(area: 'town' | 'dungeon' | 'solo') {
    this.area = area; this.roomReady = false; this.hostId = null; this.remotes.clear();
    if (!this.connected) { this.pendingJoin = area; return; }
    this.send({ t: 'join', area, st: this.myState() });
  }

  private addRemote(p: any) {
    const st = p.st || null;
    this.remotes.set(p.id, { id: p.id, name: p.name, st, x: st?.x ?? 0, y: st?.y ?? 0, tx: st?.x ?? 0, ty: st?.y ?? 0, anim: 0, away: !!p.away,
      hp: st?.hp ?? 1, invuln: 0, dashT: 0, shieldT: 0, immortalT: 0, stunT: 0, facing: 1, aim: { x: 1, y: 0 } });
  }

  // ---------- Host / Guest ----------
  private setHost(id: string | null, snap: any) {
    const was = this.isHost;
    this.hostId = id;
    if (this.area !== 'dungeon') return;
    if (this.isHost && !was) this.becomeHost(snap);
    else if (!this.isHost && was) this.clearWorld();
  }
  /** เป็น Host: ถ้ามี snapshot (Host เดิมหลุด) ใช้ศัตรูจากนั้นต่อ · ถ้าเปิดห้องใหม่ใช้ศัตรูที่ loadMap สร้างไว้ */
  private becomeHost(snap: any) {
    const G = this.G;
    if (snap && snap.en) {
      this.applySnap(snap, true);
      for (const e of G.enemies) { if (!e.dead && e.state !== 'idle') { e.state = 'idle'; e.t = 0.6; } } // สถานะท่าที่ต้องใช้วัตถุอ้างอิงหายไปกับ Host เดิม → เริ่มคิดใหม่
      G.zones.length = 0; G.lines.length = 0; G.projectiles = G.projectiles.filter((p: any) => p.owner !== 'enemy');
      const m = G.map; if (m.bossSeq && !G.enemies.some((e: any) => e.def.boss && !e.dead) && m.bossSeq.some((b: any) => !G.S.bosses[b.type])) G.later(3, () => { if (!G.boss && this.isHost) G.spawnNextBoss(true); });
    }
    for (const e of G.enemies) if (!e.nid) e.nid = this.newNid();
    G.toast('คุณเป็น Host ของห้องนี้', '#2f6fd6');
  }
  private clearWorld() { const G = this.G; G.enemies = []; G.boss = null; G.zones = []; G.lines = []; G.projectiles = G.projectiles.filter((p: any) => p.owner !== 'enemy'); }
  newNid() { return this.me + ':' + (++this.nidSeq); }

  // ---------- สถานะของเรา ----------
  myState(): St {
    const G = this.G, pl = G.player, U = PD().U;
    const rar = G.S?.player?.weapon ? PD().Loot.rarity(G.S.player.weapon.rarity).color : '#1b1b1b';
    return { x: pl ? pl.x : 0, y: pl ? pl.y : 0, f: pl?.facing === -1 ? -1 : 1, mv: !!pl?.moving, an: pl?.anim || 0,
      ap: pl?.atk ? U.clamp(pl.atk.t / pl.atk.dur, 0, 1) : -1, ch: pl?.castT > 0 ? 1 - pl.castT / pl.castDur : -1, aa: pl?.aimAng || 0, sw: pl?.swingDir === -1 ? -1 : 1, arc: G.derived?.arc || 120,
      w: G.derived?.shape || 'sword', wc: rar, hp: Math.round(pl?.hp || 0), mhp: Math.round(G.derived?.maxHp || 1), lv: G.S?.player?.level || 1,
      hu: pl?.hurtT > 0, iv: pl?.invuln > 0 || pl?.immortalT > 0, sh: pl?.shieldT > 0, dash: pl?.dashT > 0, map: G.land?.id || '' };
  }

  // ---------- ทุกเฟรม (เรียกหลัง G.frame) ----------
  tick(dt: number) {
    const G = this.G; if (!G.map || !this.area || this.area === 'solo') return;
    for (const r of this.remotes.values()) {
      const k = Math.min(1, dt * 12); r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k;
      if (r.st?.mv) r.anim += dt; r.invuln = Math.max(0, r.invuln - dt);
    }
    // Host เปิดกระเป๋า/คุย/หน้าต่างอยู่ → โลกยังเดินต่อให้เพื่อน (ตัว Host ไม่โดนตีระหว่างนั้น)
    if (this.isHost && G.state !== 'play' && G.state !== 'title') { G.playerActive = false; try { G.updateWorld(dt); } finally { G.playerActive = true; } }
    if (this.isGuest) for (const e of G.enemies) if (e.tx !== undefined && !e.dead) { const k = Math.min(1, dt * 10); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; if (e.moving) e.anim += dt; }
    this.sendAcc += dt * 1000;
    if (this.sendAcc >= SEND_MS) { this.sendAcc = 0; if (this.roomReady) this.send({ t: 'st', ...this.myState() }); }
    if (this.isHost) { this.snapAcc += dt * 1000; if (this.snapAcc >= SNAP_MS) { this.snapAcc = 0; this.send({ t: 'snap', d: this.makeSnap() }); this.stats.snaps++; } }
  }

  // ---------- Snapshot ศัตรู (Host → Guest) ----------
  makeSnap() {
    const G = this.G, R = (v: number) => Math.round(v * 100) / 100;
    const en = G.enemies.filter((e: any) => e.nid).map((e: any) => {
      const o: any = {};
      for (const k in e) { const v = e[k]; const t = typeof v; if (k === 'def' || v === null || v === undefined) continue; if (t === 'number') o[k] = R(v); else if (t === 'boolean' || t === 'string') o[k] = v; }
      return o;
    });
    const zones = G.zones.map((z: any) => ({ x: R(z.x), y: R(z.y), r: z.r, t: R(z.t), dur: z.dur, col: z.col }));
    const proj = G.projectiles.filter((p: any) => p.owner === 'enemy').map((p: any) => ({ x: R(p.x), y: R(p.y), vx: R(p.vx), vy: R(p.vy), r: p.r, life: R(p.life), col: p.col, style: p.style }));
    const lines = G.lines.map((l: any) => ({ x0: R(l.x0), y0: R(l.y0), x1: R(l.x1), y1: R(l.y1), t: R(l.t), dur: l.dur }));
    return { en, zones, proj, lines, bosses: Object.keys(G.S.bosses || {}), map: G.land.id };
  }
  applySnap(d: any, full: boolean) {
    const G = this.G; if (!d || d.map !== G.land?.id) return;
    const byId = new Map<string, any>(); for (const e of G.enemies) if (e.nid) byId.set(e.nid, e);
    const seen = new Set<string>();
    for (const s of d.en) {
      seen.add(s.nid);
      let e = byId.get(s.nid);
      if (!e) {
        if (s.dead) continue;
        if (!D().enemies[s.type]) continue;
        e = G.spawnEnemy(s.type, s.x, s.y, s.lvl || 1);
      }
      const hpBefore = e.hp;
      for (const k in s) if (k !== 'x' && k !== 'y' && k !== 'anim') e[k] = s[k];
      e.tx = s.x; e.ty = s.y;
      if (full || Math.hypot(e.x - s.x, e.y - s.y) > 3) { e.x = s.x; e.y = s.y; }
      if (!full && hpBefore - e.hp >= 1 && !e.dead && !e._localHit) G.floater(e.x, e.y, '-' + Math.round(hpBefore - e.hp), '#6b6b6b');   // ดาเมจจากเพื่อน
      e._localHit = false;
    }
    G.enemies = G.enemies.filter((e: any) => !e.nid || seen.has(e.nid));
    G.boss = G.enemies.find((e: any) => e.def.boss && !e.dead) || null;
    G.zones = d.zones.map((z: any) => ({ ...z, ghost: true }));
    G.projectiles = G.projectiles.filter((p: any) => p.owner !== 'enemy').concat(d.proj.map((p: any) => ({ ...p, owner: 'enemy', ghost: true, dmg: 0 })));
    G.lines = d.lines.slice();
    for (const b of d.bosses || []) G.S.bosses[b] = true;
  }

  // ---------- เหตุการณ์ ----------
  private onEvent(from: string, e: any) {
    const G = this.G; if (!e) return;
    if (e.k === 'dmg' && this.isHost) {          // Guest ตีโดน → Host หัก HP จริง
      const en = G.enemies.find((x: any) => x.nid === e.id); if (!en || en.dead || en.persuaded) return;
      const d = Math.max(0, Math.min(Number(e.d) || 0, en.maxHp)); if (!d) return;
      this.stats.dmgIn += d;
      en.hp -= d; en.hurtT = 0.15; G.floater(en.x, en.y, '-' + Math.round(d), '#6b6b6b');
      if (en.state === 'idle') { en.state = 'chase'; en.t = 0; }
      if (en.hp <= 0) G.killEnemy(en);
    } else if (e.k === 'kill' && this.isGuest) {  // Host ยืนยันศัตรูตาย → เราได้ EXP + สุ่มของของตัวเอง
      const en = G.enemies.find((x: any) => x.nid === e.id); if (!en || en.dead) return;
      this.stats.kills++;
      this.fromNet = true; try { G.killEnemy(en); } finally { this.fromNet = false; }
    } else if (e.k === 'hurt') {                  // Host บอกว่าเราโดน → หักเกราะเองด้วยระบบเดิม
      this.stats.hurtsIn++;
      const src = { owner: e.mg ? 'enemy' : undefined, poison: e.pz || 0, hurtFromNet: true };
      G.hurtPlayer(Number(e.a) || 0, src);
    } else if (e.k === 'stun') G.stunPlayer(Number(e.d) || 1);
    void from;
  }

  // ---------- จุดต่อกับเอนจิน (G.net) ----------
  /** Host: ศัตรูแต่ละตัวเล็งผู้เล่นที่ใกล้ที่สุดในแผนที่เดียวกัน · Guest: ไม่คิด AI (รอ snapshot) */
  enemyLoop(dt: number, updateEnemy: (e: any, dt: number) => void) {
    const G = this.G;
    if (this.area === 'dungeon' && !this.isHost) return;
    const real = G.player, local = G.playerActive !== false && G.state === 'play';
    const targets = [...this.remotes.values()].filter(r => r.st && !r.away && r.st.map === G.land.id && r.st.hp > 0);
    for (const e of G.enemies) {
      if (e.dead) continue;
      let best: Remote | null = null, bd = local ? Math.hypot(real.x - e.x, real.y - e.y) - 0.5 : Infinity; // เป้าเดิมได้เปรียบเล็กน้อย กันสลับไปมา
      for (const r of targets) { const d = Math.hypot(r.x - e.x, r.y - e.y) - (e.tgtId === r.id ? 0.5 : 0); if (d < bd) { bd = d; best = r; } }
      if (best) {
        e.tgtId = best.id; this.cur = best; G.player = best;
        try { updateEnemy(e, dt); } finally { G.player = real; this.cur = null; }
      } else { e.tgtId = ''; updateEnemy(e, dt); }
    }
  }
  private hitRemote(r: Remote, amount: number, mg: boolean, pz: number) {
    if (r.invuln > 0 || r.st?.dash || r.st?.sh || r.st?.iv) return false;
    r.invuln = D().config.hurtInvuln || 0.6;
    this.stats.hurtsOut++;
    this.evTo(r.id, { k: 'hurt', a: Math.round(amount * 100) / 100, mg, pz });
    return true;
  }
  projHitRemote(p: any) {
    if (!this.isHost) return false;
    const pr = D().config.playerRadius;
    for (const r of this.remotes.values()) if (r.st && !r.away && r.st.map === this.G.land.id && Math.hypot(p.x - r.x, p.y - r.y) < p.r + pr) return this.hitRemote(r, p.dmg, true, p.poison || 0);
    return false;
  }
  zoneHitRemote(z: any) {
    if (!this.isHost) return;
    for (const r of this.remotes.values()) if (r.st && !r.away && r.st.map === this.G.land.id && Math.hypot(z.x - r.x, z.y - r.y) < z.r) this.hitRemote(r, z.dmg, true, 0);
  }

  /** วาดผู้เล่นคนอื่น + ชื่อเหนือหัว (ไม่วาดชื่อของเราเอง) */
  drawRemotes(h: { ent: any; scr: any; c: CanvasRenderingContext2D; t: number; inView: any }) {
    const G = this.G, SP = PD().Sprites;
    for (const r of this.remotes.values()) {
      const st = r.st; if (!st || st.map !== G.land.id) continue;
      const s = h.scr(r.x, r.y); if (!h.inView(s.x, s.y, 40)) continue;
      h.ent(r.x + r.y, () => {
        const c = h.c;
        c.globalAlpha = r.away ? 0.35 : (st.iv && !st.hu && ((h.t * 20) | 0) % 2 ? 0.5 : 1);
        SP.drawActor(c, s.x, s.y, { sprite: D().heroSprite || undefined, shape: 'hero', size: 1, t: r.anim, moving: st.mv, facing: st.f, weapon: st.w, attackP: st.ap, charge: st.ch, aimAng: st.aa, arc: st.arc || 120, swingDir: st.sw, color: st.hu ? '#d23a2a' : '#1b1b1b', wcolor: st.wc });
        if (st.sh) { c.fillStyle = '#8a7b60'; PD().P.ellipse(c, s.x, s.y - 12, 11, 15, 32); }
        c.globalAlpha = r.away ? 0.6 : 1;
        // ชื่อ + หลอดเลือดเล็ก
        c.font = '7px "Tahoma", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        const label = r.name + (r.away ? ' (หลุด)' : '');
        c.lineWidth = 2; c.strokeStyle = '#f8f4ea'; c.strokeText(label, Math.round(s.x), Math.round(s.y - 33));
        c.fillStyle = r.id === this.hostId && this.area === 'dungeon' ? '#2f6fd6' : '#1b1b1b'; c.fillText(label, Math.round(s.x), Math.round(s.y - 33));
        const k = Math.max(0, Math.min(1, st.hp / (st.mhp || 1)));
        c.fillStyle = 'rgba(27,27,27,0.6)'; c.fillRect(Math.round(s.x) - 8, Math.round(s.y) - 31, 16, 2);
        c.fillStyle = '#3c9a5c'; c.fillRect(Math.round(s.x) - 8, Math.round(s.y) - 31, Math.max(1, Math.round(16 * k)), 2);
        c.globalAlpha = 1;
      });
    }
  }

  // ---------- ห่อฟังก์ชันเอนจิน ----------
  install() {
    const G = this.G, net = this;
    G.net = this;
    const origDamage = G.damageEnemy, origKill = G.killEnemy, origHurt = G.hurtPlayer, origStun = G.stunPlayer, origNextBoss = G.spawnNextBoss, origSpawn = G.spawnEnemy;
    G.damageEnemy = function (e: any, r: any, o: any) {
      if (!net.isGuest || !e || e.dead) return origDamage.call(G, e, r, o);
      const before = e.hp; net.suppressKill = true;
      try { origDamage.call(G, e, r, o); } finally { net.suppressKill = false; }
      const d = before - e.hp;
      if (d > 0 && e.nid) { net.stats.dmgOut += d; e._localHit = true; net.evHost({ k: 'dmg', id: e.nid, d: Math.round(d * 100) / 100 }); }
      if (e.hp <= 0) e.hp = 0;                 // รอ Host ยืนยันการตาย
    };
    G.killEnemy = function (e: any) {
      if (net.isGuest && !net.fromNet) return;  // Guest: ศัตรูยังไม่ตายจนกว่า Host ยืนยัน
      origKill.call(G, e);
      if (net.isHost && e.nid) net.evAll({ k: 'kill', id: e.nid });
    };
    G.hurtPlayer = function (amount: number, src: any) {
      if (net.cur) return net.hitRemote(net.cur, amount, !!(src && src.owner), (src && (src.poison || (src.def && src.def.poison && src.atk))) || 0);
      return origHurt.call(G, amount, src);
    };
    G.stunPlayer = function (t: number) { if (net.cur) { net.evTo(net.cur.id, { k: 'stun', d: t }); return; } return origStun.call(G, t); };
    G.spawnNextBoss = function (announce: boolean) { if (net.isGuest) return; return origNextBoss.call(G, announce); };
    G.spawnEnemy = function (...a: any[]) { const e = origSpawn.apply(G, a); if (net.isHost && !e.nid) e.nid = net.newNid(); return e; };
    // แผนที่: เมืองออนไลน์ = ห้องเมือง · ดันเจี้ยนออนไลน์ = ห้อง Co-op · ที่อื่น (เนื้อเรื่อง/ด่านเก่า/ลานต้นหมึก) = เล่นคนเดียว
    const origLoad = G.loadMap;
    G.loadMap = function (landId: string, idx: number, entry: string) {
      const area = landId === ONLINE_DUNGEON ? 'dungeon' : landId === ONLINE_TOWN ? 'town' : 'solo';
      net.area = area; net.roomReady = false; net.hostId = null;   // ระหว่างรอห้อง: ไม่คิด AI ศัตรู
      origLoad.call(G, landId, idx, entry);
      if (area === 'dungeon') { for (const e of G.enemies) e.nid = undefined; }
      net.join(area);
    };
    const origUse = G.usePortal;
    G.usePortal = function (p: any) {
      if (G.land.id === ONLINE_TOWN && p.to === 'next') return G.loadMap(ONLINE_DUNGEON, 0, 'world');   // ประตูตะวันออก → ป่าเงาหมึก Co-op
      if (G.land.id === ONLINE_DUNGEON) return G.loadMap(ONLINE_TOWN, 0, 'fwd');                        // ประตูในป่า → กลับเมืองฝั่งตะวันออก
      return origUse.call(G, p);
    };
    const origLabel = G.portalLabel;
    G.portalLabel = function (p: any) {
      if (G.land.id === ONLINE_DUNGEON) return 'เมืองหมึกออนไลน์';
      return origLabel.call(G, p);
    };
    // ตายในโหมดออนไลน์: เสีย EXP ตามกติกาเดิม ไม่เสียของ แล้วเกิดใหม่ที่ทางเข้าทันที (โลกของเพื่อนไม่หยุด)
    const origDie = G.die;
    G.die = function () {
      if (net.area !== 'dungeon' && net.area !== 'town') return origDie.call(G);   // ด่านเนื้อเรื่อง/ด่านเก่า: ตายตามกติกาเดิม
      const P = G.S.player, CFG = D().config, pl = G.player;
      G.S.deaths++; const loss = Math.floor(P.exp * CFG.deathExpLossPct); P.exp -= loss;
      pl.atk = null; pl.poisonT = 0; pl.stunT = 0; pl.freezeCast = null; pl.dashT = 0; pl.castT = 0;
      const sp = G.map.spawnWorld || G.map.spawnBack;
      pl.x = sp.x; pl.y = sp.y; pl.hp = G.derived.maxHp; pl.ink = G.derived.maxInk; pl.invuln = 2.5; pl.cd = {};
      PD().Input.releaseAll && PD().Input.releaseAll(); G.snapCamera();
      G.toast('ล้มลง! เกิดใหม่ที่ทางเข้า' + (loss ? ' (EXP -' + loss + ')' : ''), '#d23a2a'); G.save();
    };
  }
}
