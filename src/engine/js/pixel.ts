// @ts-nocheck
// ===== pixel: วาดเส้นพิกเซลแบบปากกาบนกระดาษ (Bresenham) =====
PD.P = {
  INK: '#1b1b1b', PAPER: '#f8f4ea', GRAY: '#b9b2a2',
  dash: 0, // 0 = เส้นทึบ, >0 = เส้นประ (ช่วงพิกเซล)
  line(c, x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0; const d = this.dash;
    for (let k = 0; k < 600; k++) {
      if (!d || ((n / d) | 0) % 2 === 0) c.fillRect(x0, y0, 1, 1);
      n++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  },
  poly(c, pts, close) {
    for (let i = 0; i < pts.length - 1; i++) this.line(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (close) this.line(c, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]);
  },
  circle(c, cx, cy, r, fill) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.max(1, Math.round(r));
    let x = r, y = 0, e = 1 - r;
    const plot = (a, b) => {
      if (fill) { c.fillRect(cx - a, cy + b, a * 2 + 1, 1); c.fillRect(cx - a, cy - b, a * 2 + 1, 1); }
      else { c.fillRect(cx + a, cy + b, 1, 1); c.fillRect(cx - a, cy + b, 1, 1); c.fillRect(cx + a, cy - b, 1, 1); c.fillRect(cx - a, cy - b, 1, 1); }
    };
    while (x >= y) {
      plot(x, y); plot(y, x);
      y++;
      if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
    }
  },
  ellipse(c, cx, cy, rx, ry, step, a0, a1) {
    const s = step || Math.max(8, (rx + ry) * 2);
    a0 = a0 || 0; a1 = a1 === undefined ? Math.PI * 2 : a1;
    let px = null, py = null;
    for (let i = 0; i <= s; i++) {
      const a = a0 + (a1 - a0) * i / s;
      const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
      if (x !== px || y !== py) { if (!this.dash || (i % (this.dash * 2)) < this.dash) c.fillRect(x, y, 1, 1); px = x; py = y; }
    }
  },
  // ฟอนต์พิกเซล 3x5 สำหรับตัวเลขดาเมจ/ข้อความสั้น
  glyphs: {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
    'L': '100100100100111', 'E': '111100111100111', 'V': '101101101101010', 'U': '101101101101111', 'P': '111101111100100',
    '!': '010010010000010', '+': '000010111010000', '-': '000000111000000', 'M': '101111111101101', 'I': '111010010010111',
    'S': '111100111001111', 'X': '101101010101101', 'C': '111100100100111', 'R': '110101110101101', 'T': '111010010010010', ' ': '000000000000000'
  },
  text(c, str, x, y, scale) {
    scale = scale || 1; str = String(str).toUpperCase();
    const w = str.length * 4 * scale - scale; let cx = Math.round(x - w / 2); y = Math.round(y);
    for (const ch of str) {
      const g = this.glyphs[ch];
      if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') c.fillRect(cx + (i % 3) * scale, y + ((i / 3) | 0) * scale, scale, scale);
      cx += 4 * scale;
    }
  }
};
