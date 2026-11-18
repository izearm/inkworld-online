// พื้นแผนที่ + ลายพื้น (decals) — พอร์ตจาก legacy render.js buildFloor / ส่วน decal / blockers / switches
// ผลลัพธ์เป็นผืนผ้าใบเดียวต่อแผนที่ (สร้างครั้งเดียว) แล้วนำไปเป็น texture ใน Phaser
import { P, type Ctx } from './pixel';
import { hash } from '../systems/rng';
import type { MapGeometry } from '../maps/MapGeometry';
import type { PuzzleState } from '../systems/CollisionSystem';

export interface FloorLand { color: string }
export interface FloorState { completed?: boolean; placement?: string }
export interface FloorResult { canvas: HTMLCanvasElement; ox: number }

export function diamondFill(c: Ctx, x: number, y: number) { for (let dy = 0; dy < 16; dy++) { const hw = dy < 8 ? (dy + 1) * 2 : (16 - dy) * 2; c.fillRect(x - hw, y + dy, hw * 2, 1); } }
export function diamondLine(c: Ctx, x: number, y: number) { P.poly(c, [[x, y], [x + 16, y + 8], [x, y + 16], [x - 16, y + 8]], true); }

export function buildFloor(m: MapGeometry, land: FloorLand, ls?: FloorState): FloorResult {
  const cv = document.createElement('canvas');
  cv.width = (m.w + m.h) * 16 + 2; cv.height = (m.w + m.h) * 8 + 18;
  const c = cv.getContext('2d')!; const ox = m.h * 16;
  const completed = !!(ls && ls.completed), strange = !!(ls && ls.placement === 'strange');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = y * m.w + x; if (m.grid[i] !== 0) continue;
    const sx = ox + (x - y) * 16, sy = (x + y) * 8, h = hash(x, y, 11);
    if (completed && h < 0.65) { c.fillStyle = land.color; c.globalAlpha = 0.12 + hash(x, y, 5) * 0.14; diamondFill(c, sx, sy); c.globalAlpha = 1; }
    if (m.chasm[i]) {
      c.fillStyle = '#3a3530'; diamondFill(c, sx, sy);
      c.fillStyle = P.INK; diamondLine(c, sx, sy);
      c.fillStyle = '#6b645a'; for (let k = 3; k < 14; k += 3) c.fillRect(sx - 12 + k, sy + k, 8, 1);
      continue;
    }
    c.fillStyle = 'rgba(27,27,27,0.22)';
    c.fillRect(sx, sy, 1, 1);
    if (h < 0.07) { c.fillStyle = 'rgba(27,27,27,0.5)'; P.line(c, sx - 2, sy + 6, sx - 1, sy + 8); P.line(c, sx - 1, sy + 8, sx + 1, sy + 5); }
    else if (h < 0.1) { c.fillStyle = 'rgba(27,27,27,0.4)'; c.fillRect(sx + 3, sy + 7, 3, 1); c.fillRect(sx + 4, sy + 6, 1, 3); }
    else if (strange && h < 0.16) { c.fillStyle = 'rgba(120,60,160,0.55)'; P.ellipse(c, sx, sy + 8, 3, 1.5, 10); c.fillRect(sx, sy + 8, 1, 1); }
    if (completed && h > 0.95) {
      c.fillStyle = land.color; c.fillRect(sx - 1, sy + 7, 3, 1); c.fillRect(sx, sy + 6, 1, 3);
      c.fillStyle = P.INK; c.fillRect(sx, sy + 7, 1, 1);
    }
  }
  return { canvas: cv, ox };
}

/** ลายบนพื้นที่ "นิ่ง" ในสถานะปริศนาปัจจุบัน (ประตูหมึก/ช่องว่าง/ตัวบล็อก/เส้นประวาด/วงจร/สวิตช์) — วาดทับลง floor canvas ครั้งเดียว
 *  แอนิเมชัน (วงกะพริบ, เม็ดไฟวิ่งในวงจร, ความคืบหน้าการวาด) จะกลับมาตอนพอร์ตระบบปริศนาเต็ม */
export function bakeStaticDecals(f: FloorResult, m: MapGeometry, st: PuzzleState & { inkMode: 'black' | 'white' }) {
  const c = f.canvas.getContext('2d')!;
  const scr = (x: number, y: number) => ({ x: f.ox + (x - y) * 16, y: (x + y) * 8 });
  const gateSolid = (i: number) => (m.gate[i] === 1 && st.inkMode === 'black') || (m.gate[i] === 2 && st.inkMode === 'white');
  for (let i = 0; i < m.w * m.h; i++) {
    if (!m.gate[i] && !m.chasm[i] && !m.block[i]) continue;
    const x = i % m.w, y = (i / m.w) | 0, s = scr(x, y);
    if (m.chasm[i] && st.bridgeT > 0) {
      c.fillStyle = '#d8c7a6'; diamondFill(c, s.x, s.y + 1);
      c.fillStyle = P.INK; for (let k = 2; k < 15; k += 3) P.line(c, s.x - 13 + k, s.y + 2 + k * 0.5, s.x + k - 2, s.y + 9 + k * 0.5 - 6);
    }
    if (m.block[i] && st.isSolved(m.block[i] - 1)) { c.fillStyle = 'rgba(27,27,27,0.3)'; P.dash = 1; diamondLine(c, s.x, s.y); P.dash = 0; }
    if (m.gate[i] && !gateSolid(i)) { c.fillStyle = 'rgba(27,27,27,0.5)'; P.dash = 2; diamondLine(c, s.x, s.y); P.dash = 0; }
  }
  m.blockers.forEach((b, bi) => {
    const solved = st.isSolved(bi);
    if (b.kind === 'trace' && b.path) {
      for (let k = 0; k < b.path.length; k++) {
        const q = b.path[k], s = scr(q.x + 0.5, q.y + 0.5), inked = solved;
        if (k > 0) { const p0 = b.path[k - 1], s0 = scr(p0.x + 0.5, p0.y + 0.5); c.fillStyle = inked ? P.INK : '#4a6fb0'; P.dash = inked ? 0 : 2; P.line(c, s0.x, s0.y, s.x, s.y); P.dash = 0; }
        c.fillStyle = inked ? P.INK : '#4a6fb0'; P.circle(c, s.x, s.y, 1.5, inked);
      }
      if (!solved) { const s = scr(b.path[0].x + 0.5, b.path[0].y + 0.5); c.fillStyle = '#4a6fb0'; P.circle(c, s.x, s.y, 4, false); P.line(c, s.x + 3, s.y - 12, s.x, s.y - 4); P.line(c, s.x + 5, s.y - 11, s.x + 2, s.y - 3); }
    } else if (b.kind === 'circuit' && b.nodes) {
      const cs = solved ? [1, 1, 1, 1] : [1, 0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const a = b.nodes[k], d = b.nodes[(k + 1) % 4], sa = scr(a.x + 0.5, a.y + 0.5), sd = scr(d.x + 0.5, d.y + 0.5);
        if (cs[k]) { c.fillStyle = P.INK; P.line(c, sa.x, sa.y, sd.x, sd.y); }
        else { c.fillStyle = '#9a9488'; P.dash = 2; P.line(c, sa.x, sa.y, sd.x, sd.y); P.dash = 0; }
      }
      b.nodes.forEach((q, k) => { const s = scr(q.x + 0.5, q.y + 0.5); c.fillStyle = k === 0 || solved ? '#e8c21a' : '#fff'; P.circle(c, s.x, s.y, 3, true); c.fillStyle = P.INK; P.circle(c, s.x, s.y, 3, false); });
    }
  });
  for (const sw of m.switches) {
    const s = scr(sw.x + 0.5, sw.y + 0.5); c.fillStyle = P.INK;
    P.ellipse(c, s.x, s.y, 5, 2.5, 16); const ang = st.inkMode === 'black' ? -0.6 : -2.5;
    P.line(c, s.x, s.y, s.x + Math.cos(ang) * 8, s.y + Math.sin(ang) * 8); P.circle(c, s.x + Math.cos(ang) * 8, s.y + Math.sin(ang) * 8, 1.5, true);
  }
}
