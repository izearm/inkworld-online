// Combat + Enemy AI (logic ล้วน ไม่ import Phaser/rendering) — พอร์ตจาก legacy js/game.js (updateEnemy, startPattern/firePattern, startAttack/resolveAttack,
// damageEnemy/killEnemy/hurtPlayer, dropLoot, gainExp, projectiles/zones/fx) + js/skills.js (dash_strike)
// กติกา: ลำดับการเรียก rng เท่ากับ Math.random ของต้นฉบับ → ทดสอบ parity แบบ seed เดียวกันได้ · ค่าตัวเลขมาจาก balance.json/monsters.json เท่านั้น
import type { GameData } from '../data/loaders/loadGameData';
import type { Monster } from '../data/schemas';
import type { MapGeometry } from '../maps/MapGeometry';
import { moveCircle, collides, solidAt, type PuzzleState } from './CollisionSystem';
import { screenDirToWorld, worldDirToScreen, clamp, type Vec, type MoveInput } from './MovementSystem';
import { derive, expNeed, type Weapon } from './StatsSystem';
import { rollWeapon } from './LootSystem';
import type { Rng } from './rng';

/** idle = ไม่เห็นผู้เล่น (เดินสุ่มรอบบ้านเท่านั้น) · chase = ไล่ตามแต่ไม่โจมตี · full = AI เต็มของจริง (ค่าเริ่มต้นของเกม) */
export type AIMode = 'idle' | 'chase' | 'full';
export type EState = 'idle' | 'chase' | 'windup' | 'cd' | 'pattern' | 'charging';
export interface Enemy {
  id: number; type: string; def: Monster; lvl: number; x: number; y: number; homeX: number; homeY: number; hp: number; maxHp: number; atk: number; radius: number;
  state: EState; t: number; anim: number; facing: 1 | -1; moving: boolean; hurtT: number; slowT: number; slowMul: number; frozenT: number; vuln: number;
  patT: number; patIdx: number; dead: boolean; wander: Vec | null; tier: number; summoned?: boolean; persuaded?: boolean; rewarded?: boolean;
  pat?: string; enraged?: boolean; cv?: Vec; chargeLeft?: number; chargeHit?: boolean;
}
export interface Proj { owner: 'enemy'; x: number; y: number; vx: number; vy: number; r: number; dmg: number; life: number; style: 'orb'; col: string }
export interface Zone { x: number; y: number; r: number; t: number; dur: number; dmg: number }
export interface Line { x0: number; y0: number; x1: number; y1: number; t: number; dur: number }
export interface Fx { type: 'slash' | 'ring' | 'text'; x: number; y: number; t: number; dur: number; col?: string; ang?: number; arc?: number; r?: number; dir?: number; r0?: number; r1?: number; text?: string; scale?: number }
export interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; col: string; sz: number }
export interface Floater { x: number; y: number; z: number; text: string; col: string; life: number; scale: number }
export interface DropPickup { x: number; y: number; kind: 'weapon' | 'potion' | 'lumi'; w?: Weapon; amount?: number }
export interface PlayerRef { x: number; y: number; facing: 1 | -1; lastDir: Vec; anim: number; moving: boolean }
export interface WorldRef { player: PlayerRef; map: MapGeometry; puzzle: PuzzleState; pickups: Array<{ x: number; y: number; kind: string }> }
export interface PCombat {
  hp: number; ink: number; invuln: number; hurtT: number; cd: Record<string, number>; atk: { t: number; dur: number; hit: boolean } | null;
  aim: Vec; aimAng: number; swingDir: 1 | -1; dashT: number; dashV: Vec; dashHit: Set<Enemy>; dashDmg: number;
}
export interface Progress { level: number; exp: number; skillPoints: number; potions: number; lumi: number; weapon: Weapon; inventory: Weapon[]; skills: Record<string, number>; slots: (string | null)[]; kills: number; deaths: number; bosses: Record<string, boolean> }
export interface CombatStats { damageDealt: number; damageTaken: number; kills: number; expGained: number; drops: { weapon: number; potion: number; lumi: number }; levelUps: number }
export interface SkillDef { id: string; kind: string; ink: number; cd: number; power: number[]; dist?: number; range?: number }

const nz = (x: number, y: number): Vec => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
export const enemyRadius = (d: { size?: number; boss?: boolean }) => 0.3 * (d.size || 1) * (d.boss ? 0.8 : 1);

export class CombatSystem {
  enemies: Enemy[] = []; projectiles: Proj[] = []; zones: Zone[] = []; lines: Line[] = []; effects: Fx[] = []; particles: Particle[] = []; floaters: Floater[] = [];
  p: PCombat; prog: Progress; derived: ReturnType<typeof derive>; ai: AIMode = 'full'; invincible = false; infiniteInk = false; dead = false; time = 0; lootMult = 1; tier = 0;
  input: MoveInput = { x: 0, y: 0, active: false };
  stats: CombatStats = { damageDealt: 0, damageTaken: 0, kills: 0, expGained: 0, drops: { weapon: 0, potion: 0, lumi: 0 }, levelUps: 0 };
  /** เหตุการณ์ที่ scene อ่านแล้วล้าง (เสียง/toast/สร้าง pickup view) */
  events: Array<{ type: 'kill' | 'drop' | 'levelUp' | 'playerDead' | 'toast'; text?: string; enemy?: Enemy; pickup?: DropPickup }> = [];
  private nextId = 1; private cfg: any;
  constructor(readonly data: GameData, readonly w: WorldRef, readonly rng: Rng, prog: Progress) {
    this.cfg = data.balance.config; this.prog = prog;
    this.derived = derive(data, { cls: data.balance.startPlayer.cls, level: prog.level, weapon: prog.weapon });
    this.p = { hp: this.derived.maxHp, ink: this.derived.maxInk, invuln: 0, hurtT: 0, cd: {}, atk: null, aim: { x: 1, y: 0 }, aimAng: 0, swingDir: 1, dashT: 0, dashV: { x: 0, y: 0 }, dashHit: new Set(), dashDmg: 0 };
  }
  static newProgress(data: GameData, weapon: Weapon, extraSkills: Record<string, number> = {}): Progress {
    const sp = data.balance.startPlayer;
    return { level: sp.level, exp: 0, skillPoints: sp.skillPoints, potions: (data.balance.config as any).potionStart, lumi: 0, weapon, inventory: [], skills: { ...sp.skills, ...extraSkills }, slots: [...sp.slots], kills: 0, deaths: 0, bosses: {} };
  }
  get liveEnemies() { return this.enemies.filter(e => !e.dead && !e.persuaded); }
  skillDef(id: string): SkillDef | undefined { return (this.data.balance.skills as any[]).find(s => s.id === id); }

  // ---------- ศัตรู: เกิด / ล้าง ----------
  spawn(type: string, x: number, y: number, lvl: number): Enemy {
    const d = this.data.monsters.get(type) as Monster, sc = this.cfg.enemyScale, rng = this.rng;
    let hpMul = 1 + sc.hp * (lvl - 1), atkMul = 1 + sc.atk * (lvl - 1);
    const tier = d.boss ? this.tier : 0, bp = this.cfg.bossPower;
    if (d.boss) { hpMul *= bp.hpMult * (1 + bp.hpPerTier * tier); atkMul *= bp.atkMult * (1 + bp.atkPerTier * tier); }
    const t0 = rng() * 2, a0 = rng() * 5;
    const e: Enemy = { id: this.nextId++, type, def: d, lvl, x, y, homeX: x, homeY: y, hp: Math.round(d.hp * hpMul), maxHp: Math.round(d.hp * hpMul), atk: d.atk * atkMul,
      radius: enemyRadius(d), state: 'idle', t: t0, anim: a0, facing: 1, moving: false, hurtT: 0, slowT: 0, slowMul: 1, frozenT: 0, vuln: 1,
      patT: (d.patternCd || 3) * 0.6 * (d.boss ? this.cfg.bossSpeed.patternCd : 1), patIdx: 0, dead: false, wander: null, tier };
    this.enemies.push(e); return e;
  }
  /** เกิดแบบปลอดภัย (Development Arena): ห้ามซ้อนกำแพง/ผู้เล่น/ศัตรูอื่น — คืน null ถ้าไม่มีที่ว่าง */
  spawnSafe(type: string, cx: number, cy: number, lvl: number): Enemy | null {
    const d = this.data.monsters.get(type); if (!d) return null; const r = enemyRadius(d), pr = this.cfg.playerRadius as number, pl = this.w.player;
    for (let k = 0; k < 60; k++) {
      const ang = k * 2.399963, rad = k === 0 ? 0 : 0.5 * Math.sqrt(k), x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (collides(this.w.map, this.w.puzzle, x, y, r)) continue;
      if (Math.hypot(x - pl.x, y - pl.y) < r + pr + 0.3) continue;
      if (this.enemies.some(o => !o.dead && Math.hypot(x - o.x, y - o.y) < r + o.radius + 0.1)) continue;
      return this.spawn(type, x, y, lvl);
    }
    return null;
  }
  /** ล้างศัตรู + ของที่ศัตรูสร้าง (กระสุน/วงเตือน/เส้น/เอฟเฟกต์) — ไม่เหลือ event ค้าง */
  clearEnemies() { this.enemies = []; this.projectiles = []; this.zones = []; this.lines = []; this.effects = []; this.particles = []; this.floaters = []; this.events = []; }

  // ---------- ตัวช่วยเอฟเฟกต์ ----------
  sparks(x: number, y: number, col: string, n: number) {
    const r = this.rng;
    for (let i = 0; i < n; i++) { const a = r() * 6.28, s = 1 + r() * 2.5; this.particles.push({ x, y, z: 10 + r() * 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 20 + r() * 40, life: 0.35 + r() * 0.3, max: 0.6, col, sz: r() < 0.3 ? 2 : 1 }); }
  }
  floater(x: number, y: number, text: string | number, col: string, delay = 0, scale = 1) { this.floaters.push({ x: x + (this.rng() - 0.5) * 0.3, y, z: 24, text: String(text), col, life: 0.9 + delay, scale }); }
  private moveEnt(e: { x: number; y: number }, dx: number, dy: number, r: number) { return moveCircle(this.w.map, this.w.puzzle, e, dx, dy, r); }

  // ---------- ผู้เล่น ----------
  tickPlayerTimers(dt: number) {
    const p = this.p, D = this.derived; this.time += dt;
    p.invuln = Math.max(0, p.invuln - dt); p.hurtT = Math.max(0, p.hurtT - dt);
    for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
    p.ink = this.infiniteInk ? D.maxInk : Math.min(D.maxInk, p.ink + D.inkRegen * dt);
  }
  get dashing() { return this.p.dashT > 0; }
  attackMoveMul() { return this.p.atk ? this.cfg.attackMoveMult as number : 1; }
  dashStep(dt: number) {
    const p = this.p, pl = this.w.player; p.dashT -= dt; pl.moving = true;
    this.moveEnt(pl, p.dashV.x * dt, p.dashV.y * dt, this.cfg.playerRadius);
    for (const e of this.liveEnemies) if (!p.dashHit.has(e) && Math.hypot(e.x - pl.x, e.y - pl.y) < 0.9 + e.radius) { p.dashHit.add(e); this.damageEnemy(e, this.rollSkill(p.dashDmg), {}); }
    if (this.rng() < 0.8) this.particles.push({ x: pl.x, y: pl.y, z: 6 + this.rng() * 10, vx: 0, vy: 0, vz: 0, life: 0.3, max: 0.3, col: '#1b1b1b', sz: 1 });
  }
  /** หลังเดิน/พุ่ง: เริ่มฟันถ้ากดค้าง + เดินเฟรมการฟัน (ปล่อยดาเมจที่ attackHitAt) */
  attackStep(dt: number, attackHeld: boolean) {
    const p = this.p, cfg = this.cfg;
    if (attackHeld && !p.atk && p.dashT <= 0) this.startAttack();
    if (p.atk) {
      p.atk.t += dt;
      if (!p.atk.hit && p.atk.t >= p.atk.dur * cfg.attackHitAt) { p.atk.hit = true; this.resolveAttack(); }
      if (p.atk.t >= p.atk.dur) p.atk = null;
    }
  }
  pickAim(range?: number): Vec {
    const pl = this.w.player, inp = this.input;
    if (inp.active) { const w = screenDirToWorld(inp.x, inp.y); if (w.x || w.y) return w; }
    let best: Enemy | null = null, bd = range || this.cfg.autoAimRange;
    for (const e of this.liveEnemies) { const d = Math.hypot(e.x - pl.x, e.y - pl.y); if (d < bd) { bd = d; best = e; } }
    if (best) return nz(best.x - pl.x, best.y - pl.y);
    return pl.lastDir;
  }
  private setAim(aim: Vec) {
    const pl = this.w.player, s = worldDirToScreen(aim.x, aim.y); this.p.aim = aim; this.p.aimAng = Math.atan2(s.y, s.x); if (Math.abs(s.x) > 0.05) pl.facing = s.x > 0 ? 1 : -1;
  }
  startAttack(): boolean {
    const p = this.p, pl = this.w.player, D = this.derived;
    if (p.atk || p.dashT > 0 || this.dead) return false;
    const aim = this.pickAim(); this.setAim(aim); pl.lastDir = aim;
    p.swingDir = (-p.swingDir) as 1 | -1;
    p.atk = { t: 0, dur: clamp(this.cfg.attackTime / D.wspeed, this.cfg.attackMinTime, 1.2), hit: false };
    this.effects.push({ type: 'slash', x: pl.x, y: pl.y, ang: p.aimAng, arc: D.arc * Math.PI / 180, r: 10 + D.range * 7, dir: p.swingDir, t: 0, dur: Math.max(0.16, p.atk.dur * 0.8) });
    return true;
  }
  rollPhys() {
    const D = this.derived, r = this.rng; let dmg = (D.wmin + r() * (D.wmax - D.wmin)) * D.strMul * (1 + D.atkPct / 100);
    let elem: string | null = null; for (const k of ['fire', 'ice', 'bolt'] as const) if (D.elem[k] > 0) { dmg += D.elem[k]; elem = elem || k; }
    const crit = r() < D.crit; if (crit) dmg *= D.critMult;
    return { dmg, crit, elem };
  }
  rollSkill(base: number) { const D = this.derived, r = this.rng, crit = r() < D.crit; return { dmg: base * (0.9 + r() * 0.2) * (crit ? D.critMult : 1), crit, elem: null as string | null }; }
  resolveAttack(): number {
    const p = this.p, pl = this.w.player, D = this.derived, cosA = Math.cos(D.arc * Math.PI / 360); let hits = 0;
    for (const e of this.liveEnemies) {
      const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy);
      if (d > D.range + e.radius) continue;
      if (d > 0.45 && (dx * p.aim.x + dy * p.aim.y) / d < cosA) continue;
      const r = this.rollPhys(); this.damageEnemy(e, r, { elem: r.elem, kx: dx / (d || 1), ky: dy / (d || 1) }); hits++;
    }
    return hits;
  }
  /** ใช้สกิลช่อง slot — ตอนนี้รองรับ dash (พุ่งขีดเส้น); ใช้สกิล = ยกเลิกการฟันที่ค้างอยู่ (Dash Cancel ตามต้นฉบับ: pl.atk=null → ดาเมจฟันที่ยังไม่ออกจะไม่ออก) */
  useSkill(slot: number): boolean {
    const P = this.prog, p = this.p, id = P.slots[slot]; if (!id || this.dead) return false;
    const d = this.skillDef(id), lv = P.skills[id] || 0, pl = this.w.player; if (!d || !lv || (p.cd[id] || 0) > 0 || p.dashT > 0) return false;
    if (d.kind !== 'dash') { this.events.push({ type: 'toast', text: `สกิล ${id} ยังไม่ถูกพอร์ต` }); return false; }
    if (p.ink < d.ink) { this.floater(pl.x, pl.y, 'INK', '#2f6fd6'); return false; }
    p.ink -= d.ink; p.cd[id] = d.cd;
    const pw = d.power[lv - 1], D = this.derived, phys = D.physPower * pw * (1 + D.skillPct / 100);
    const aim = this.pickAim(Math.max(d.range || 0, 5)); p.atk = null;
    p.dashT = 0.2; p.dashV = { x: aim.x * d.dist! / 0.2, y: aim.y * d.dist! / 0.2 }; p.dashHit = new Set(); p.dashDmg = phys; p.invuln = Math.max(p.invuln, 0.3);
    return true;
  }
  hurtPlayer(amount: number): boolean {
    const p = this.p;
    if (p.invuln > 0 || p.dashT > 0 || this.dead || this.invincible) return false;
    const pl = this.w.player, dmg = Math.max(1, Math.round(amount * (1 - this.derived.dmgReduce) * (0.9 + this.rng() * 0.2)));
    p.hp -= dmg; p.invuln = this.cfg.hurtInvuln; p.hurtT = 0.2;
    this.floater(pl.x, pl.y, '-' + dmg, '#d23a2a'); this.sparks(pl.x, pl.y, '#d23a2a', 6);
    this.stats.damageTaken += dmg;
    if (p.hp <= 0) { p.hp = 0; this.die(); }
    return true;
  }
  private die() {
    this.dead = true; this.prog.deaths++; const loss = Math.floor(this.prog.exp * this.cfg.deathExpLossPct); this.prog.exp -= loss; this.p.atk = null;
    this.events.push({ type: 'playerDead', text: `-${loss} EXP` });
  }

  // ---------- ศัตรูถูกตี / ตาย / รางวัล (ครั้งเดียวเสมอ) ----------
  damageEnemy(e: Enemy, r: { dmg: number; crit: boolean }, o: { elem?: string | null; kx?: number; ky?: number }) {
    if (e.dead || e.persuaded) return;
    const dmg = Math.max(1, Math.round(r.dmg * (e.frozenT > 0 ? e.vuln : 1)));
    e.hp -= dmg; e.hurtT = 0.27;
    if (e.state === 'idle' && this.ai !== 'idle') e.state = 'chase';
    const col = o.elem ? this.data.loot.elemColors[o.elem] : '#1b1b1b';
    this.sparks(e.x, e.y, col, r.crit ? 10 : 6);
    if (o.elem === 'ice') { e.slowT = Math.max(e.slowT, 1.2); e.slowMul = Math.min(e.slowMul, 0.7); }
    this.floater(e.x, e.y, r.crit ? dmg + '!' : '' + dmg, r.crit ? '#e0661b' : '#1b1b1b', 0, r.crit ? 2 : 1);
    if (!e.def.boss && o.kx !== undefined) this.moveEnt(e, o.kx * 0.12, o.ky! * 0.12, e.radius);
    if (this.derived.leech > 0) this.p.hp = Math.min(this.derived.maxHp, this.p.hp + dmg * this.derived.leech);
    this.stats.damageDealt += dmg;
    if (e.def.persuadeAt && e.hp / e.maxHp <= e.def.persuadeAt) { e.hp = Math.ceil(e.maxHp * e.def.persuadeAt); this.persuade(e); return; }
    if (e.hp <= 0) this.killEnemy(e);
  }
  private persuade(e: Enemy) { // arena: ข้ามบทพูด — จบการต่อสู้ทันที (ไม่มี EXP/ของ เหมือนต้นฉบับ)
    e.persuaded = true; e.state = 'idle'; this.zones = []; this.lines = []; this.projectiles = [];
    for (const x of this.enemies) if (x !== e && !x.dead) { x.dead = true; this.sparks(x.x, x.y, '#999', 6); }
    e.dead = true; this.prog.bosses[e.type] = true;
  }
  killEnemy(e: Enemy) {
    if (e.rewarded) return; // กันรางวัลซ้ำ
    e.rewarded = true; e.dead = true; this.prog.kills++; this.stats.kills++;
    const exp = Math.round(e.def.exp * (1 + this.cfg.enemyScale.exp * (e.lvl - 1)));
    this.sparks(e.x, e.y, '#1b1b1b', 14);
    this.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.2, r1: 0.9 * (e.def.size || 1), t: 0, dur: 0.35 });
    this.gainExp(exp); this.dropLoot(e);
    if (e.def.boss) {
      this.prog.bosses[e.type] = true; this.zones = []; this.lines = [];
      for (const x of this.enemies) if (!x.dead && x.summoned) { x.dead = true; this.sparks(x.x, x.y, '#1b1b1b', 6); }
    }
    this.events.push({ type: 'kill', enemy: e, text: e.def.name });
  }
  /** Development Arena: ตั้งเลเวล/อาวุธผู้เล่นใหม่ผ่าน derive() เดิม (ไม่ซ้ำสูตร) แล้วเติม HP/INK */
  devSetLoadout(o: { level?: number; weapon?: Weapon }) {
    const P = this.prog; if (o.level) { P.level = Math.max(1, Math.floor(o.level)); P.exp = 0; } if (o.weapon) P.weapon = o.weapon;
    this.derived = derive(this.data, { cls: this.data.balance.startPlayer.cls, level: P.level, weapon: P.weapon }); this.devHeal();
  }
  devHeal() { this.p.hp = this.derived.maxHp; this.p.ink = this.derived.maxInk; this.dead = false; }
  gainExp(n: number) {
    const P = this.prog, pl = this.w.player; if (n <= 0) return;
    P.exp += n; this.stats.expGained += n; this.floater(pl.x, pl.y - 0.3, '+' + n + 'X', '#b98f00', 0.3);
    let ups = 0;
    while (P.exp >= expNeed(this.data, P.level)) { P.exp -= expNeed(this.data, P.level); P.level++; P.skillPoints++; ups++; }
    if (ups) {
      this.derived = derive(this.data, { cls: this.data.balance.startPlayer.cls, level: P.level, weapon: P.weapon });
      this.p.hp = this.derived.maxHp; this.p.ink = this.derived.maxInk;
      this.effects.push({ type: 'text', text: 'LV UP', x: pl.x, y: pl.y, t: 0, dur: 1.0, col: '#b98f00', scale: 1 });
      this.effects.push({ type: 'ring', x: pl.x, y: pl.y, r0: 0.2, r1: 2.2, t: 0, dur: 0.7, col: '#e8c21a' });
      this.sparks(pl.x, pl.y, '#e8c21a', 18); this.stats.levelUps += ups; this.events.push({ type: 'levelUp', text: 'LV ' + P.level });
    }
  }
  private addDrop(p: DropPickup) { this.w.pickups.push(p); this.stats.drops[p.kind]++; this.events.push({ type: 'drop', pickup: p }); }
  dropLumi(x: number, y: number, amount: number, pieces: number) {
    amount = Math.max(1, Math.round(amount)); pieces = Math.min(pieces || 1, amount); const each = Math.floor(amount / pieces), r = this.rng;
    for (let k = 0; k < pieces; k++) { const a = r() * 6.28, rr = pieces > 1 ? 0.3 + r() * 0.7 : 0.2; this.addDrop({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, kind: 'lumi', amount: k === pieces - 1 ? amount - each * (pieces - 1) : each }); }
  }
  dropLoot(e: Enemy) {
    const d = e.def, dc = this.cfg.dropChance, lm = this.lootMult, r = this.rng, lu = this.cfg.lumi;
    const drop = (w: Weapon, k: number) => this.addDrop({ x: e.x + (k % 2 ? 0.4 : -0.4) * (k + 1) * 0.5, y: e.y + 0.3, kind: 'weapon', w });
    this.dropLumi(e.x, e.y, Math.round(lu.base * (1 + lu.perLevel * (e.lvl - 1)) * (0.6 + r() * 0.8) * lm * (d.boss ? lu.bossMult : 1) * (d.drops?.lumiMult ?? 1)), d.boss ? 6 : 1);
    if (d.boss) { for (let k = 0; k < dc.bossWeapons; k++) drop(rollWeapon(this.data, e.lvl + 1, r, lm * 1.5, k === 0 ? 'rare' : 'magic'), k); this.addDrop({ x: e.x, y: e.y - 0.5, kind: 'potion' }); return; }
    if (r() < (d.drops?.weaponChance ?? dc.weapon) * lm) drop(rollWeapon(this.data, e.lvl, r, lm), 0);
    if (r() < (d.drops?.potionChance ?? dc.potion)) this.addDrop({ x: e.x, y: e.y, kind: 'potion' });
  }
  canCollect(p: { kind: string }) {
    if (p.kind === 'weapon') return this.prog.inventory.length < this.cfg.inventoryMax;
    if (p.kind === 'potion') return this.prog.potions < this.cfg.potionMax;
    return true;
  }
  collect(p: DropPickup) {
    const pl = this.w.player, P = this.prog;
    if (p.kind === 'weapon') { P.inventory.push(p.w!); this.events.push({ type: 'toast', text: 'ได้รับ: ' + p.w!.name }); }
    else if (p.kind === 'potion') { P.potions++; this.events.push({ type: 'toast', text: `ได้ยาฟื้นฟู (${P.potions})` }); }
    else if (p.kind === 'lumi') { P.lumi += p.amount!; this.floater(pl.x, pl.y - 0.2, '+' + p.amount, '#d9a400'); }
  }

  // ---------- AI ศัตรู ----------
  step(dt: number) { // ศัตรู → แยกตัว → กระสุน → วงเตือน → เอฟเฟกต์ (ลำดับเดียวกับ legacy G.update)
    if (this.dead) return;
    const pl = this.w.player, cfg = this.cfg;
    for (const e of this.enemies) if (!e.dead) this.updateEnemy(e, dt);
    const live = this.liveEnemies;
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.radius + b.radius;
      if (d > 0 && d < min) { const push = (min - d) / 2; this.moveEnt(a, -dx / d * push, -dy / d * push, a.radius); this.moveEnt(b, dx / d * push, dy / d * push, b.radius); }
    }
    if (this.enemies.length > 40) this.enemies = this.enemies.filter(e => !e.dead);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const m = this.w.map; let dead = p.life <= 0 || solidAt(m, this.w.puzzle, Math.floor(p.x), Math.floor(p.y)) && !m.chasm[Math.floor(p.y) * m.w + Math.floor(p.x)];
      if (this.rng() < 0.6) this.particles.push({ x: p.x, y: p.y, z: 10, vx: 0, vy: 0, vz: 5, life: 0.25, max: 0.3, col: p.col, sz: 1 });
      if (Math.hypot(p.x - pl.x, p.y - pl.y) < p.r + cfg.playerRadius) { if (this.hurtPlayer(p.dmg)) dead = true; else if (this.p.dashT <= 0 && this.p.invuln <= 0) dead = true; }
      if (dead) { this.sparks(p.x, p.y, p.col, 4); this.projectiles.splice(i, 1); }
      if (this.dead) return;
    }
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; z.t += dt;
      if (z.t >= z.dur) { if (Math.hypot(z.x - pl.x, z.y - pl.y) < z.r) this.hurtPlayer(z.dmg); this.sparks(z.x, z.y, '#d23a2a', 10); this.zones.splice(i, 1); if (this.dead) return; }
    }
    for (let i = this.lines.length - 1; i >= 0; i--) { this.lines[i].t += dt; if (this.lines[i].t > this.lines[i].dur + 0.1) this.lines.splice(i, 1); }
    for (let i = this.effects.length - 1; i >= 0; i--) { this.effects[i].t += dt; if (this.effects[i].t >= this.effects[i].dur) this.effects.splice(i, 1); }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt; p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5; p.vz -= 120 * dt; p.z = Math.max(0, p.z + p.vz * dt);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    for (let i = this.floaters.length - 1; i >= 0; i--) { const f = this.floaters[i]; f.life -= dt; f.z += 18 * dt; if (f.life <= 0) this.floaters.splice(i, 1); }
  }
  private updateEnemy(e: Enemy, dt: number) {
    const pl = this.w.player, d = e.def, cfg = this.cfg, bs = cfg.bossSpeed, rng = this.rng, full = this.ai === 'full';
    e.hurtT = Math.max(0, e.hurtT - dt);
    if (e.frozenT > 0) { e.frozenT -= dt; e.moving = false; return; }
    e.anim += dt; e.slowT -= dt; if (e.slowT <= 0) e.slowMul = 1;
    if (e.persuaded) { e.moving = false; return; }
    const dx = pl.x - e.x, dy = pl.y - e.y, dist = Math.hypot(dx, dy), spd = d.speed * e.slowMul;
    const moveTo = (tx: number, ty: number, s: number) => { const n = nz(tx - e.x, ty - e.y); this.moveEnt(e, n.x * s * dt, n.y * s * dt, e.radius); e.moving = true; const sd = worldDirToScreen(n.x, n.y); if (Math.abs(sd.x) > 0.1) e.facing = sd.x > 0 ? 1 : -1; };
    e.moving = false; e.t -= dt;
    if (d.boss && full && e.state !== 'idle' && e.state !== 'pattern' && e.state !== 'charging') {
      e.patT -= dt;
      if (e.patT <= 0 && dist < 9) { this.startPattern(e); return; }
    }
    switch (e.state) {
      case 'idle':
        if (this.ai !== 'idle' && dist < d.aggro) { e.state = 'chase'; break; }
        if (!e.wander || e.t <= 0) { const wx = e.homeX + (rng() - 0.5) * 3, wy = e.homeY + (rng() - 0.5) * 3; e.wander = { x: wx, y: wy }; e.t = 1.5 + rng() * 2; }
        if (Math.hypot(e.x - e.wander.x, e.y - e.wander.y) > 0.3) moveTo(e.wander.x, e.wander.y, spd * 0.35);
        break;
      case 'chase': {
        if (dist > d.aggro * 2.2 && !d.boss) { e.state = 'idle'; break; }
        const wu = d.windup * (d.boss ? bs.attack : 1);
        if (d.kind === 'caster') {
          if (dist > d.range) moveTo(pl.x, pl.y, spd);
          else if (dist < d.range * 0.5) moveTo(e.x - dx, e.y - dy, spd * 0.8);
          if (full && dist <= d.range + 0.5) { e.state = 'windup'; e.t = wu; }
        } else {
          if (dist > d.range * 0.85) moveTo(pl.x, pl.y, spd);
          if (full && dist <= d.range + 0.1) { e.state = 'windup'; e.t = wu; }
        }
        if (Math.abs(dx - dy) > 0.1) e.facing = (dx - dy) > 0 ? 1 : -1;
        break;
      }
      case 'windup':
        if (e.t <= 0) {
          if (d.kind === 'caster') {
            const n = nz(dx, dy);
            this.projectiles.push({ owner: 'enemy', x: e.x, y: e.y, vx: n.x * d.projSpeed!, vy: n.y * d.projSpeed!, r: 0.25, dmg: e.atk, life: 3, style: 'orb', col: d.projColor || '#555' });
          } else {
            if (dist <= d.range + 0.35) this.hurtPlayer(e.atk); // โดนเฉพาะเมื่ออยู่ในระยะตอนฟาด (ชนเฉยๆ ไม่ทำดาเมจ)
            const sd = worldDirToScreen(dx, dy);
            this.effects.push({ type: 'slash', x: e.x, y: e.y, ang: Math.atan2(sd.y, sd.x), arc: 1.6, r: 10 * (d.size || 1), dir: 1, t: 0, dur: 0.25, col: '#7a2a20' });
          }
          e.state = 'cd'; e.t = d.cd * (d.boss ? bs.attack : 1);
        }
        break;
      case 'cd':
        if (d.kind === 'caster' && dist < d.range * 0.5) moveTo(e.x - dx, e.y - dy, spd * 0.7);
        if (e.t <= 0) e.state = 'chase';
        break;
      case 'pattern':
        if (e.t <= 0) { this.firePattern(e); e.state = 'cd'; e.t = 0.35; } // เหมือนต้นฉบับทุกตัวอักษร: ท่า charge ถูกเขียนทับเป็น cd จึงไม่พุ่งจริง (บัคเดิม — ดู MIGRATION_STATUS)
        break;
      case 'charging': {
        const s = 9 + e.tier * 0.6, blocked = this.moveEnt(e, e.cv!.x * s * dt, e.cv!.y * s * dt, e.radius); e.moving = true;
        e.chargeLeft! -= s * dt;
        if (!e.chargeHit && Math.hypot(e.x - pl.x, e.y - pl.y) < e.radius + 0.45) { e.chargeHit = true; this.hurtPlayer(e.atk * 1.3); }
        if (blocked || e.chargeLeft! <= 0) { e.state = 'cd'; e.t = 0.8; this.sparks(e.x, e.y, '#1b1b1b', 6); }
        break;
      }
    }
  }
  private startPattern(e: Enemy) {
    const d = e.def, pl = this.w.player, pats = d.patterns!, pat = pats[e.patIdx++ % pats.length], bs = this.cfg.bossSpeed, w = bs.windup, bp = this.cfg.bossPower, r = this.rng;
    const enr = e.hp / e.maxHp < bp.enrageAt ? bp.enrageCd : 1;
    if (enr < 1 && !e.enraged) { e.enraged = true; this.events.push({ type: 'toast', text: d.name + ' โกรธแล้ว!' }); }
    e.pat = pat; e.patT = d.patternCd! * bs.patternCd * enr; e.state = 'pattern';
    if (pat === 'slam') {
      e.t = 0.95 * w; this.zones.push({ x: pl.x, y: pl.y, r: 1.7, t: 0, dur: 0.95 * w, dmg: e.atk * 1.4 });
      const extra = Math.floor(e.tier / 2) + (e.enraged ? 1 : 0);
      for (let k = 0; k < extra; k++) { const a = r() * 6.28, rr = 1.6 + r() * 1.2; this.zones.push({ x: pl.x + Math.cos(a) * rr, y: pl.y + Math.sin(a) * rr, r: 1.4, t: 0, dur: 0.95 * w + 0.15 * (k + 1), dmg: e.atk * 1.2 }); }
    } else if (pat === 'ring') { e.t = 0.7 * w; this.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 1.5, r1: 0.3, t: 0, dur: 0.7 * w, col: '#d23a2a' }); }
    else if (pat === 'summon') { e.t = 0.6 * w; this.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.3, r1: 2, t: 0, dur: 0.6 * w, col: '#9b4ad6' }); }
    else if (pat === 'charge') {
      e.t = 0.75 * w; const n = nz(pl.x - e.x, pl.y - e.y); e.cv = n;
      this.lines.push({ x0: e.x, y0: e.y, x1: e.x + n.x * 5, y1: e.y + n.y * 5, t: 0, dur: 0.75 * w });
    }
  }
  private firePattern(e: Enemy) {
    const d = e.def, r = this.rng;
    if (e.pat === 'ring') {
      const nRing = 12 + e.tier * 2 + (e.enraged ? 4 : 0), off = r() * 6.28;
      for (let k = 0; k < nRing; k++) { const a = off + k / nRing * Math.PI * 2, sp = d.projSpeed || 4; this.projectiles.push({ owner: 'enemy', x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.25, dmg: e.atk * 0.8, life: 3, style: 'orb', col: d.projColor || '#555' }); }
    } else if (e.pat === 'summon') {
      const alive = this.liveEnemies.filter(x => x.summoned).length, nSum = 2 + Math.floor(e.tier / 3);
      for (let k = 0; k < nSum && alive + k < this.cfg.maxEnemiesSummon; k++) {
        const a = r() * 6.28, x = e.x + Math.cos(a) * 1.5, y = e.y + Math.sin(a) * 1.5;
        if (!collides(this.w.map, this.w.puzzle, x, y, 0.3)) { const m = this.spawn(d.summon!, x, y, Math.max(1, e.lvl - 1)); m.summoned = true; m.state = 'chase'; this.sparks(x, y, '#9b4ad6', 8); }
      }
    } else if (e.pat === 'charge') { e.state = 'charging'; e.chargeLeft = 5; e.chargeHit = false; this.lines = []; }
  }
}
