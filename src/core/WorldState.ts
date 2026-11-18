// สถานะโลกของ pilot (ผู้เล่น/กล้อง/ของบนพื้น/ประตู) — logic ล้วน ไม่ import Phaser · ทดสอบ parity กับ legacy G.update ได้ใน Node
import type { MapGeometry } from '../maps/MapGeometry';
import { moveCircle, type PuzzleState } from '../systems/CollisionSystem';
import { updateCamera, iso, type CameraCfg } from '../systems/CameraSystem';
import type { CombatSystem } from '../systems/CombatSystem';
import { walkVelocity, worldDirToScreen, type MoveInput, type Vec } from '../systems/MovementSystem';

export interface WorldCfg extends CameraCfg { playerSpeed: number; playerRadius: number; pickupRange: number }
export interface PlayerState { x: number; y: number; facing: 1 | -1; anim: number; moving: boolean; lastDir: Vec }
export interface PickupState { x: number; y: number; kind: 'quest' | 'side' | 'weapon' | 'potion' | 'lumi'; item?: string; idx?: number; w?: any; amount?: number }
export interface ActionInput { attack: boolean; skill: number | null }
/** วิ่งอัตโนมัติ (PROPOSED — มาจาก Rulebook baseline 165→245 px/s หลังเดินต่อเนื่อง 2 วิ; ไม่มีใน legacy → ปิดไว้เป็นค่าเริ่มต้น) */
export interface AutoRun { delay: number; mult: number }
export type WorldEvent = { type: 'pickup'; pickup: PickupState } | { type: 'portal'; portal: MapGeometry['portals'][number] };
export type Puzzle = PuzzleState & { inkMode: 'black' | 'white' };

export class WorldState {
  combat: CombatSystem | null = null; autoRun: AutoRun | null = null; runT = 0;
  player: PlayerState; cam: Vec; nib: Vec; time = 0; portalLock = true; pickups: PickupState[];
  constructor(public map: MapGeometry, public cfg: WorldCfg, public moveMul: number, public puzzle: Puzzle, entry: 'back' | 'fwd' = 'back') {
    const pos = entry === 'fwd' ? map.spawnFwd : map.spawnBack;
    this.player = { x: pos.x, y: pos.y, facing: 1, anim: 0, moving: false, lastDir: { x: 0.707, y: 0.707 } };
    this.pickups = map.pickups.map(p => ({ x: p.x, y: p.y, kind: p.kind, item: p.item, idx: p.idx }));
    this.cam = iso(pos.x, pos.y);
    this.nib = { x: pos.x - 0.6, y: pos.y - 0.3 };
  }
  /** หนึ่งเฟรม — ลำดับเหมือน legacy G.update: เดิน → ปากกา → เก็บของ → ประตู → กล้อง · คืนเหตุการณ์ที่เกิดขึ้น */
  step(dt: number, inp: MoveInput, act?: ActionInput): WorldEvent[] {
    const { cfg, player: pl } = this, ev: WorldEvent[] = [], c = this.combat;
    this.time += dt;
    if (c?.dead) { updateCamera(this.cam, iso(pl.x, pl.y), false, dt, cfg); return ev; }
    if (c) { c.input = inp; if (act?.skill != null) c.useSkill(act.skill); c.tickPlayerTimers(dt); }
    if (c && c.dashing) c.dashStep(dt);
    else {
      const { dir, speed } = walkVelocity(inp, cfg, this.moveMul, c ? c.attackMoveMul() : 1);
      pl.moving = !!(dir.x || dir.y) && speed > 0;
      const run = this.autoRun; if (run) { this.runT = pl.moving ? this.runT + dt : 0; }
      const rm = run && this.runT >= run.delay ? run.mult : 1;
      if (pl.moving) {
        moveCircle(this.map, this.puzzle, pl, dir.x * speed * rm * dt, dir.y * speed * rm * dt, cfg.playerRadius);
        pl.lastDir = dir;
        const s = worldDirToScreen(dir.x, dir.y); if (Math.abs(s.x) > 0.1 && !c?.p.atk) pl.facing = s.x > 0 ? 1 : -1;
      }
    }
    if (pl.moving) pl.anim += dt;
    if (c) c.attackStep(dt, !!act?.attack);
    const nx = pl.x - 0.55 * pl.facing - 0.3, ny = pl.y + 0.55 * pl.facing - 0.3, k = Math.min(1, dt * 4);
    this.nib.x += (nx - this.nib.x) * k; this.nib.y += (ny - this.nib.y) * k;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i], pd = Math.hypot(p.x - pl.x, p.y - pl.y);
      if (p.kind === 'lumi' && pd < 1.6 && pd > 0.05) { const k = Math.min(1, dt * 8); p.x += (pl.x - p.x) * k; p.y += (pl.y - p.y) * k; }
      if (pd > cfg.pickupRange) continue;
      if (c && !c.canCollect(p)) continue;
      this.pickups.splice(i, 1); ev.push({ type: 'pickup', pickup: p });
      if (c && (p.kind === 'weapon' || p.kind === 'potion' || p.kind === 'lumi')) c.collect(p as any);
    }
    if (c) c.step(dt);
    const pe = this.checkPortals(); if (pe) ev.push(pe);
    updateCamera(this.cam, iso(pl.x, pl.y), pl.moving, dt, cfg);
    return ev;
  }
  /** เหมือน legacy checkPortals: เข้าใกล้ <0.55 ครั้งแรกถึงจะเรียก, ต้องเดินห่าง >1.1 จึงปลดล็อก */
  private checkPortals(): WorldEvent | null {
    const pl = this.player; let onAny = false;
    for (const p of this.map.portals) {
      if (Math.hypot(p.x + 0.5 - pl.x, p.y + 0.5 - pl.y) < 0.55) {
        onAny = true; if (this.portalLock) continue;
        this.portalLock = true; return { type: 'portal', portal: p };
      }
    }
    if (!onAny) {
      let near = false; for (const p of this.map.portals) if (Math.hypot(p.x + 0.5 - pl.x, p.y + 0.5 - pl.y) < 1.1) near = true;
      if (!near) this.portalLock = false;
    }
    return null;
  }
}
