// การบังตัวละคร (พอร์ตจาก legacy Render.frame): กำแพงที่อยู่หน้าผู้เล่นและทับกรอบภาพ → โปร่งใส + เงาเส้นประ
export interface WallBox { k: number; x0: number; y0: number; x1: number; y1: number }
export interface PlayerRect { x0: number; y0: number; x1: number; y1: number }
export const playerRect = (px: number, py: number): PlayerRect => ({ x0: px - 9, y0: py - 27, x1: px + 9, y1: py + 2 });
/** pk = x+y ของผู้เล่น · กำแพงถูกนับว่าบังเมื่อลึกกว่าผู้เล่นไม่เกิน 6 และกรอบทับกัน */
export function occludes(w: WallBox, pk: number, pr: PlayerRect): boolean {
  if (!(w.k > pk && w.k < pk + 6)) return false;
  return w.x0 < pr.x1 && w.x1 > pr.x0 && w.y0 < pr.y1 && w.y1 > pr.y0 && w.y0 < pr.y1 - 4;
}
