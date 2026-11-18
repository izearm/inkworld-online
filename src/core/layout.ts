// ขนาดจอภายใน (พิกเซลต่ำ) — เหมือน legacy Render.resize: แนวนอนสูง = lowResHeight, แนวตั้งกว้าง 270
export function lowRes(vw: number, vh: number, lowResHeight: number): { W: number; H: number } {
  const aspect = vw / vh;
  if (aspect >= 1) return { W: Math.round(lowResHeight * aspect), H: lowResHeight };
  return { W: 270, H: Math.round(270 / aspect) };
}
/** ตำแหน่งวาดแบบ legacy: จุดกล้อง → ออฟเซ็ตแบบจำนวนเต็ม + เศษพิกเซล (ใช้เลื่อน canvas ด้วย CSS ให้กล้องลื่น) */
export function cameraOffset(cam: { x: number; y: number }, W: number, H: number, camScreenY: number) {
  const fx = W / 2 - cam.x, fy = H * camScreenY - cam.y;
  const ox = Math.floor(fx), oy = Math.floor(fy);
  return { ox, oy, fracX: fx - ox, fracY: fy - oy };
}
