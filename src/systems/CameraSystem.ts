// กล้อง: deadzone + ตามนุ่ม + กลับกลางจอเมื่อหยุด — พอร์ตจาก legacy G.updateCamera (frame-rate independent ด้วย exp)
export interface CameraCfg { cameraSmooth: number; cameraRecenter: number; cameraDeadX: number; cameraDeadY: number }
export const iso = (x: number, y: number) => ({ x: (x - y) * 16, y: (x + y) * 8 });
export function updateCamera(cam: { x: number; y: number }, target: { x: number; y: number }, moving: boolean, dt: number, cfg: CameraCfg): void {
  let dx = cam.x, dy = cam.y, rate = cfg.cameraSmooth;
  if (moving) {
    const ex = target.x - cam.x, ey = target.y - cam.y;
    if (Math.abs(ex) > cfg.cameraDeadX) dx = target.x - Math.sign(ex) * cfg.cameraDeadX;
    if (Math.abs(ey) > cfg.cameraDeadY) dy = target.y - Math.sign(ey) * cfg.cameraDeadY;
  } else { dx = target.x; dy = target.y; rate = cfg.cameraRecenter; }
  const k = 1 - Math.exp(-dt * rate);
  cam.x += (dx - cam.x) * k; cam.y += (dy - cam.y) * k;
}
