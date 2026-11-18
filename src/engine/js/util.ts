// @ts-nocheck
// ===== util: สุ่มแบบ seed, คณิต, iso projection =====
window.PD = window.PD || {};
PD.U = {
  img(p) { const m = window.PD_IMGS; return (m && m[p]) || p; }, // ที่อยู่รูปจาก editor: โหมดทดลองใช้ dataURL · เกมจริงใช้ไฟล์ใน custom/
  rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },
  strSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  },
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  randInt: (r, a, b) => a + Math.floor(r() * (b - a + 1)),
  pick: (r, arr) => arr[Math.floor(r() * arr.length)],
  shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
  norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; },
  // world(tile units) -> iso pixel space
  iso(x, y) { return { x: (x - y) * 16, y: (x + y) * 8 }; },
  // screen-space direction -> world direction (normalized)
  screenDirToWorld(sx, sy) {
    const a = sx / 16, b = sy / 8;
    const wx = (a + b) / 2, wy = (b - a) / 2;
    const l = Math.hypot(wx, wy);
    return l < 1e-6 ? { x: 0, y: 0 } : { x: wx / l, y: wy / l };
  },
  worldDirToScreen(wx, wy) { const sx = (wx - wy) * 16, sy = (wx + wy) * 8; const l = Math.hypot(sx, sy) || 1; return { x: sx / l, y: sy / l }; },
  uid: (() => { let n = 1; return () => 'w' + Date.now().toString(36) + (n++); })(),
  chebyshev: (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))
};
