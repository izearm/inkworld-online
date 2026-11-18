// Collision: วงกลมที่เท้า vs ช่องตาราง — พอร์ตจาก legacy G.solidAt/collides/moveEnt (ไม่ขึ้นกับภาพ/PNG)
import type { MapGeometry } from '../maps/MapGeometry';
export interface PuzzleState { inkMode: 'black' | 'white'; bridgeT: number; isSolved(blockerIdx: number): boolean }
export const gateSolid = (m: MapGeometry, i: number, s: PuzzleState) => (m.gate[i] === 1 && s.inkMode === 'black') || (m.gate[i] === 2 && s.inkMode === 'white');
export function solidAt(m: MapGeometry, s: PuzzleState, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
  const i = ty * m.w + tx;
  if (m.grid[i] !== 0) return true;
  if (m.gate[i] && gateSolid(m, i, s)) return true;
  if (m.chasm[i] && s.bridgeT <= 0) return true;
  if (m.block[i] && !s.isSolved(m.block[i] - 1)) return true;
  return false;
}
export function collides(m: MapGeometry, s: PuzzleState, x: number, y: number, r: number): boolean {
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
    if (!solidAt(m, s, tx, ty)) continue;
    const nx = Math.min(Math.max(x, tx), tx + 1), ny = Math.min(Math.max(y, ty), ty + 1);
    if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true;
  }
  return false;
}
/** เดินแยกแกน + substep 0.15 ช่อง (ไถลตามกำแพง, กันทะลุ) · คืน true ถ้าโดนบล็อก */
export function moveCircle(m: MapGeometry, s: PuzzleState, e: { x: number; y: number }, dx: number, dy: number, r: number): boolean {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.15));
  const sx = dx / n, sy = dy / n; let blocked = false;
  for (let i = 0; i < n; i++) {
    if (!collides(m, s, e.x + sx, e.y, r)) e.x += sx; else blocked = true;
    if (!collides(m, s, e.x, e.y + sy, r)) e.y += sy; else blocked = true;
  }
  return blocked;
}
