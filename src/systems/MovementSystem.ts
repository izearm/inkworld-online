// ทิศทาง/ความเร็วผู้เล่น (พอร์ตจาก legacy util.js screenDirToWorld/worldDirToScreen + ส่วนเดินของ game.js update) — ไม่ขึ้นกับ Phaser
export interface Vec { x: number; y: number }
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** ทิศบนจอ (ตามจอย) → ทิศในโลก (ช่อง) แบบ normalize */
export function screenDirToWorld(sx: number, sy: number): Vec {
  const a = sx / 16, b = sy / 8;
  const wx = (a + b) / 2, wy = (b - a) / 2;
  const l = Math.hypot(wx, wy);
  return l < 1e-6 ? { x: 0, y: 0 } : { x: wx / l, y: wy / l };
}
export function worldDirToScreen(wx: number, wy: number): Vec {
  const sx = (wx - wy) * 16, sy = (wx + wy) * 8; const l = Math.hypot(sx, sy) || 1;
  return { x: sx / l, y: sy / l };
}
export interface MoveInput { x: number; y: number; active: boolean }
export interface MoveCfg { playerSpeed: number }
/** เวกเตอร์เดินในโลก (ช่อง/วินาที) จากจอย — เหมือน legacy: deadzone 0.15, ความเร็ว ≥ 50% เมื่อขยับ */
export function walkVelocity(inp: MoveInput, cfg: MoveCfg, moveMul: number, attackMult = 1): { dir: Vec; speed: number } {
  let dir: Vec = { x: 0, y: 0 };
  if (inp.active && (Math.abs(inp.x) > 0.15 || Math.abs(inp.y) > 0.15)) dir = screenDirToWorld(inp.x, inp.y);
  const mag = Math.min(1, Math.hypot(inp.x, inp.y));
  const speed = cfg.playerSpeed * moveMul * attackMult * (mag > 0.15 ? Math.max(0.5, mag) : 0);
  return { dir, speed };
}
