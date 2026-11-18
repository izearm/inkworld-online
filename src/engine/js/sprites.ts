// @ts-nocheck
// ===== sprites: ตัวละครลายเส้นมนุษย์ก้างปลา + ศัตรู + บล็อกกำแพง isometric =====
// ทุกอย่างวาดด้วยพิกเซลจริง (ไม่มีภาพไฟล์) — พิกัด (sx,sy) = จุดเท้าบนจอ
PD.Sprites = (function () {
  const P = PD.P;
  let C, OX, OY, S, F; // context, origin, scale, flip
  const L = (x1, y1, x2, y2) => P.line(C, OX + x1 * S * F, OY + y1 * S, OX + x2 * S * F, OY + y2 * S);
  const CIR = (x, y, r, fill) => P.circle(C, OX + x * S * F, OY + y * S, r * S, fill);
  const ELL = (x, y, rx, ry, a0, a1) => P.ellipse(C, OX + x * S * F, OY + y * S, rx * S, ry * S, 0, a0, a1);
  const DOT = (x, y) => C.fillRect(Math.round(OX + x * S * F), Math.round(OY + y * S), 1, 1);

  function weapon(c, shape, hx, hy, ang, s) {
    const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    const seg = (a, b, pa, pb) => P.line(c, hx + dx * a * s + px * pa * s, hy + dy * a * s + py * pa * s, hx + dx * b * s + px * pb * s, hy + dy * b * s + py * pb * s);
    if (shape === 'sword') { seg(0, 10, 0, 0); seg(1.5, 1.5, -2, 2); }
    else if (shape === 'dagger') { seg(0, 6, 0, 0); seg(1, 1, -1.5, 1.5); }
    else if (shape === 'axe') { seg(0, 9, 0, 0); seg(9, 6, 0, 3.5); seg(6, 8.5, 3.5, 3.5); seg(8.5, 9, 3.5, 0); }
    else if (shape === 'spear') { seg(-2, 14, 0, 0); seg(14, 12, 0, 1.6); seg(14, 12, 0, -1.6); }
    else if (shape === 'staff') { seg(-2, 11, 0, 0); P.circle(c, hx + dx * 12.5 * s, hy + dy * 12.5 * s, 2 * s, false); }
    else seg(0, 8, 0, 0);
  }

  function human(o) {
    const op = o.opts || {}; const walk = o.moving ? Math.sin(o.t * 11) : 0;
    const hunch = op.hunch ? 2 : 0;
    // ขา
    if (op.scarecrow) { L(0, -9, 0, 0); }
    else if (o.mermaid) { L(0, -9, -3, -4); L(-3, -4, 1, -1); L(1, -1, -1, 1); L(1, -1, 4, 0); L(0, -9, 2, -4); L(2, -4, 1, -1); }
    else { L(0, -9, -2 + walk * 3, 0); L(0, -9, 2 - walk * 3, 0); }
    // ลำตัว
    L(0, -9, hunch, -15);
    const sh = { x: hunch, y: -14 };
    // แขนหลัง
    if (op.scarecrow) { L(-6, -14, 6, -14); }
    else L(sh.x, sh.y, -3, -9 + walk);
    // หัว
    const hx = hunch * 1.4, hy = -18.5 + hunch * 0.5;
    if (o.alienHead) { ELL(hx, hy - 1.5, 4.5, 3.5); DOT(hx + 1.5, hy - 1); DOT(hx + 2.5, hy - 1); DOT(hx - 1, hy - 1); L(hx - 1, hy - 5, hx - 3, hy - 8); L(hx + 2, hy - 5, hx + 4, hy - 8); DOT(hx - 3, hy - 9); DOT(hx + 4, hy - 9); }
    else if (o.helm) { L(hx - 4, hy + 2, hx, hy - 6); L(hx, hy - 6, hx + 4, hy + 2); L(hx - 4, hy + 2, hx + 4, hy + 2); L(hx, hy - 6, hx + 1, hy + 2); }
    else if (o.hood) { CIR(hx, hy, 3); L(hx - 4, hy + 2, hx, hy - 7); L(hx, hy - 7, hx + 4, hy + 2); }
    else CIR(hx, hy, 3);
    if (op.hat) { L(hx - 5, hy - 3, hx + 5, hy - 3); L(hx - 2, hy - 3, hx - 2, hy - 6); L(hx - 2, hy - 6, hx + 2, hy - 6); L(hx + 2, hy - 6, hx + 2, hy - 3); }
    if (op.crown) { L(hx - 3, hy - 3, hx - 3, hy - 6); L(hx - 3, hy - 6, hx - 1, hy - 4); L(hx - 1, hy - 4, hx + 1, hy - 7); L(hx + 1, hy - 7, hx + 2, hy - 4); L(hx + 2, hy - 4, hx + 3, hy - 6); L(hx + 3, hy - 6, hx + 3, hy - 3); }
    if (op.hair) { L(hx - 3, hy - 1, hx - 4, hy + 4); L(hx + 3, hy - 1, hx + 4, hy + 4); }
    if (o.mermaid) { L(hx - 3, hy, hx - 5, hy + 7); L(hx + 3, hy, hx + 4, hy + 6); }
    if (op.glasses) { DOT(hx + 1, hy); DOT(hx + 2.5, hy); L(hx + 1, hy - 0.5, hx + 2.5, hy - 0.5); }
    if (op.cape) { L(0, -14, -4, -4); L(-4, -4, -1, -3); }
    if (op.scarecrow) { L(hx - 1, hy + 1, hx + 1, hy + 1); }
    if (o.coat) { L(0, -14, -5, -3); L(0, -14, 5, -3); L(-5, -3, 5, -3); }
    if (o.horns) { L(hx - 2, hy - 2, hx - 4, hy - 6); L(hx + 2, hy - 2, hx + 4, hy - 6); }
    if (o.tail) { L(0, -9, -4, -7); L(-4, -7, -6, -10); L(-6, -10, -7, -9); L(-6, -10, -5, -11); }
    if (o.wings) { const f = Math.sin(o.t * 9) * 2; L(0, -13, -6, -18 - f); L(-6, -18 - f, -5, -14); L(-5, -14, -8, -15 - f); L(-8, -15 - f, -1, -11); }
    // แขนหน้า + อาวุธ / อุปกรณ์
    if (o.weapon) {
      const shx = OX + sh.x * S * F, shy = OY + sh.y * S;
      let ang;
      if (o.attackP >= 0) {
        const arc = (o.arc || 110) * Math.PI / 180, p = 1 - Math.pow(1 - o.attackP, 2);
        const dir = o.swingDir || 1;
        ang = o.aimAng - dir * arc / 2 + dir * arc * p;
      } else if (o.charge >= 0) { // ท่าชาร์จ/ร่าย: ง้างอาวุธไปข้างหลังเหนือหัว สั่นแรงขึ้นเมื่อใกล้เต็ม
        const sh = Math.sin(o.t * 60) * 0.06 * o.charge; ang = (F > 0 ? -2.2 : Math.PI + 2.2) + sh;
      } else ang = F > 0 ? 0.75 : Math.PI - 0.75; // ท่ายืน: แขนลง ไม่ยกอาวุธ
      const hx2 = shx + Math.cos(ang) * 5 * S, hy2 = shy + Math.sin(ang) * 5 * S;
      P.line(C, shx, shy, hx2, hy2);
      const fs = C.fillStyle; if (o.wcolor && !o.dashed) C.fillStyle = o.wcolor; // สีอาวุธตามระดับ
      weapon(C, o.weapon, hx2, hy2, ang, S);
      if (o.wglow && !o.dashed) { // อาวุธระดับสูงสุด: ประกายแสงพิกเซล
        const ga = C.globalAlpha, L2 = { sword: 10, dagger: 6, axe: 9, spear: 14, staff: 12 }[o.weapon] || 9;
        for (let k = 0; k < 6; k++) { const q = (o.t * 1.7 + k / 6) % 1, d = q * L2 * S, w = Math.sin(o.t * 9 + k * 2.1) * 2.5 * S;
          C.globalAlpha = ga * 0.85 * (1 - Math.abs(q - 0.5)); C.fillStyle = k % 2 ? '#ffd23a' : o.wcolor;
          C.fillRect(Math.round(hx2 + Math.cos(ang) * d - Math.sin(ang) * w), Math.round(hy2 + Math.sin(ang) * d + Math.cos(ang) * w), 1, 1); }
        C.globalAlpha = ga;
      }
      C.fillStyle = fs;
    } else if (!op.scarecrow) {
      if (op.cane) { L(sh.x, sh.y, 4, -9); L(4, -9, 5, 0); }
      else if (op.rod) { L(sh.x, sh.y, 4, -10); L(4, -10, 11, -22); L(11, -22, 12, -14); }
      else if (op.book) { L(sh.x, sh.y, 3, -10); L(2, -12, 6, -12); L(6, -12, 6, -9); L(6, -9, 2, -9); L(2, -9, 2, -12); }
      else if (op.bucket) { L(sh.x, sh.y, 3, -10); L(2, -10, 6, -10); L(2, -10, 3, -6); L(6, -10, 5, -6); L(3, -6, 5, -6); }
      else if (o.eraserBlock) { L(sh.x, sh.y, 4, -11); L(3, -14, 9, -14); L(9, -14, 9, -9); L(9, -9, 3, -9); L(3, -9, 3, -14); L(5, -14, 5, -9); }
      else if (o.shield) { L(sh.x, sh.y, 4, -11); L(3, -14, 7, -14); L(7, -14, 7, -8); L(7, -8, 5, -6); L(5, -6, 3, -8); L(3, -8, 3, -14); }
      else if (o.claws) { L(sh.x, sh.y, 5, -8); L(5, -8, 7, -7); L(5, -8, 6, -6); }
      else L(sh.x, sh.y, 3, -10 - walk);
    }
  }

  const EYE = (x, y) => { const f = C.fillStyle; C.fillStyle = '#c0201a'; DOT(x, y); DOT(x + 0.6, y); C.fillStyle = f; }; // ตาแดง (ศัตรูดินแดนใหม่)
  const shapes = {
    human,
    tiny(o) { // ชาวจิ๋ว (แผนที่ลับ): ตัวกลมเล็ก หมวกกระดาษพับ ถือโคมเหลืองอ่อน
      const b = Math.abs(Math.sin(o.t * 4 + (o.opts.v || 0))) * 1.5, v = o.opts.v || 0;
      L(-1, -1, -2, 0); L(1, -1, 2, 0);
      CIR(0, -5 - b, 4); L(-3, -8 - b, 0, -13 - b); L(0, -13 - b, 3, -8 - b);
      DOT(-1.5, -6 - b); DOT(1.5, -6 - b);
      const f = C.fillStyle; C.fillStyle = '#f2e6a0'; C.fillRect(OX + (4 + v % 2) * S * F - (F < 0 ? 2 * S : 0), OY + (-6 - b) * S, 2 * S, 3 * S); C.fillStyle = f;
      L(4, -4 - b, 3, -2 - b);
    },
    // ===== ศัตรูดินแดนหลังจบเกม (ทะเลทราย / ความฝัน / แฟร์รี่) =====
    mummy(o) { // มัมมี่: แขนยื่นไปข้างหน้า ผ้าพันรอบตัว
      const w = o.moving ? Math.sin(o.t * 7) : 0;
      L(0, -9, -2 + w * 2, 0); L(0, -9, 2 - w * 2, 0); L(0, -9, 0, -16);
      for (let y = -15; y <= -10; y += 2.5) L(-2, y, 2, y + 1);
      L(0, -15, 8, -14 + w); L(0, -13, 8, -12 - w); L(8, -14 + w, 9, -15 + w); L(8, -12 - w, 9, -11 - w);
      CIR(0.5, -19, 3); L(-2.5, -20, 3, -18); L(-2, -17.5, 3.5, -20); EYE(1.5, -19.5);
      C.globalAlpha *= 0.5; L(-1, -9, -4, -4 + w); C.globalAlpha /= 0.5;
    },
    scorpion(o) { // แมงป่องทราย: ก้ามใหญ่ หางงอข้ามหลัง
      const w = o.moving ? Math.sin(o.t * 12) : 0, s = Math.sin(o.t * 3);
      ELL(0, -4, 6, 3);
      for (let k = -1; k <= 1; k++) { L(k * 3, -3, k * 3 - 2 + w * (k % 2 ? 1 : -1), 0); L(k * 3, -3, k * 3 + 2 - w * (k % 2 ? 1 : -1), 0); }
      L(5, -5, 9, -7); L(9, -7, 12, -5); L(12, -5, 10, -4); L(9, -7, 12, -9); L(12, -9, 11, -7);
      if (o.opts && o.opts.wig) { const wg = Math.sin(o.t * 28) * 3; L(-5, -5, -9, -10); L(-9, -10, -8 + wg, -16); L(-8 + wg, -16, -3 + wg * 1.5, -19); L(-3 + wg * 1.5, -19, 1 + wg * 1.5, -17); EYE(4, -6); return; } // กระดิกหาง
      L(-5, -5, -9, -10); L(-9, -10, -8, -16); L(-8, -16, -3 + s, -19); L(-3 + s, -19, 1 + s, -17); L(1 + s, -17, 0 + s, -15);
      EYE(4, -6);
    },
    sandwraith(o) { // วิญญาณทราย: ผ้าคลุมขาดลุ่ย ใบหน้ากลวง
      const w = Math.sin(o.t * 5);
      L(0, -24, -6, -4); L(0, -24, 6, -4);
      for (let i = 0; i < 5; i++) L(-6 + i * 3, -4 + (i % 2 ? w : -w) * 2, -4.5 + i * 3, 0 + (i % 2 ? -w : w));
      ELL(0, -18, 3, 3.5); C.globalAlpha *= 0.6; for (let y = -20; y < -15; y++) L(-2, y, 2, y); C.globalAlpha /= 0.6;
      EYE(-1.5, -18.5); EYE(1, -18.5);
      L(-4, -12, -9, -9 - w); L(-9, -9 - w, -11, -10); L(4, -12, 9, -9 + w); L(9, -9 + w, 11, -10);
    },
    eyeball(o) { // ลูกตาฝันร้าย: ลอยได้ หนวดใต้ตา
      const t = o.t, look = Math.sin(t * 1.3) * 1.5;
      CIR(0, -10, 6); CIR(look, -10, 2.5);
      const f = C.fillStyle; C.fillStyle = '#c0201a'; CIR(look, -10, 1.2, true); C.fillStyle = f;
      L(-5, -13, -2, -12); L(5, -13, 2, -12.5);
      for (let k = 0; k < 5; k++) { const bx = -4 + k * 2, sw = Math.sin(t * 5 + k) * 2.5; L(bx, -5, bx + sw, -1); L(bx + sw, -1, bx - sw * 0.5, 3); }
    },
    faceless(o) { // ร่างไร้หน้า: สูงผอม แขนยาวถึงพื้น
      const w = o.moving ? Math.sin(o.t * 6) : 0, sway = Math.sin(o.t * 2) * 1;
      L(0, -14, -2 + w * 2, 0); L(0, -14, 2 - w * 2, 0); L(0, -14, sway, -26);
      L(sway, -25, -5, -14); L(-5, -14, -6, -2); L(-6, -2, -8, 0); L(-6, -2, -5, 0);
      L(sway, -25, 5, -14); L(5, -14, 7, -2); L(7, -2, 9, 0); L(7, -2, 6, 0);
      ELL(sway, -29, 2.5, 3.5); C.globalAlpha *= 0.35; L(sway - 1, -28, sway + 1, -28); C.globalAlpha /= 0.35;
    },
    maw(o) { // ปากฝันร้าย: ก้อนที่มีปากฟันแหลมและตาหลายดวง
      const q = Math.sin(o.t * 5) * 0.1, op = 2 + Math.abs(Math.sin(o.t * 4)) * 2;
      ELL(0, -7, 8 * (1 + q), 7 * (1 - q));
      L(-6, -7, 6, -7); L(-6, -7 + op, 6, -7 + op);
      for (let i = -5; i < 6; i += 2) { L(i, -7, i + 1, -5); L(i, -7 + op, i + 1, -9 + op); }
      EYE(-4, -11); EYE(0, -13); EYE(4, -11); EYE(2, -10);
      L(-6, -2, -8, 0); L(6, -2, 8, 0);
    },
    thornfairy(o) { // แฟร์รี่หนาม: ปีกแมลง กรงเล็บ หนามรอบตัว
      const f = Math.sin(o.t * 16) * 3;
      L(0, -8, 0, -15); L(0, -8, -2, -3); L(0, -8, 2, -3); L(-2, -3, -3, -1); L(2, -3, 3, -1);
      L(0, -14, -4, -10); L(-4, -10, -6, -11); L(0, -14, 4, -10); L(4, -10, 6, -11);
      L(0, -13, -8, -20 - f); L(-8, -20 - f, -6, -12); L(0, -12, -7, -9 + f); L(0, -13, 8, -20 - f); L(8, -20 - f, 6, -12); L(0, -12, 7, -9 + f);
      CIR(0, -18, 2.5); L(-2, -20, -4, -23); L(2, -20, 4, -23); EYE(-1, -18); EYE(0.6, -18);
      if (o.opts && o.opts.hat) { L(-3, -21, -3, -24); L(-3, -24, -1, -22); L(-1, -22, 0, -25); L(0, -25, 1, -22); L(1, -22, 3, -24); L(3, -24, 3, -21); }
      DOT(-3, -6); DOT(3, -7); DOT(-1, -10);
    },
    shroom(o) { // เห็ดกินคน: หมวกเห็ดมีจุด ลำตัวมีปากอ้า รากเป็นขา
      const w = o.moving ? Math.sin(o.t * 8) : 0;
      L(-2, -4, -4 + w, 0); L(2, -4, 4 - w, 0); L(0, -4, 0, 0);
      L(-3, -4, -3, -11); L(3, -4, 3, -11);
      ELL(0, -11, 8, 6, Math.PI, Math.PI * 2); L(-8, -11, 8, -11);
      CIR(-3, -14, 1); CIR(3, -15, 1.2); CIR(0, -16, 0.8);
      L(-2, -9, 2, -9); L(-2, -9, 0, -6); L(2, -9, 0, -6); L(-1, -9, -0.5, -8); L(1, -9, 0.5, -8);
      EYE(-2, -10.5); EYE(1.5, -10.5);
    },
    doll(o) { // ตุ๊กตาร้าว: ขยับกระตุก ตาเย็บกากบาท
      const jt = Math.floor(o.t * 3) % 2 ? 1 : -1, w = o.moving ? jt : 0;
      L(0, -8, -2 + w, 0); L(0, -8, 2 - w, 0); L(0, -8, 0, -14);
      L(0, -13, -5, -9 + jt); L(0, -13, 5, -11 - jt);
      CIR(0, -19, 5); L(-3, -21, -1, -19); L(-1, -21, -3, -19); L(1, -21, 3, -19); L(3, -21, 1, -19);
      L(-2, -16, 2, -16); L(1, -24, 0, -21); L(0, -21, 2, -19);
      const f = C.fillStyle; C.fillStyle = '#c0201a'; DOT(-2, -15); C.fillStyle = f;
    },
    hero(o) { human(o); },
    knight(o) { o.helm = true; o.shield = true; human(o); },
    demon(o) { o.horns = true; o.tail = true; o.claws = true; o.wings = o.opts && o.opts.wings; human(o); },
    alien(o) { o.alienHead = true; human(o); },
    eraser(o) { o.hood = true; o.coat = true; o.eraserBlock = true; human(o); },
    mermaid(o) { o.mermaid = true; o.opts = Object.assign({ hair: true }, o.opts); human(o); },
    monster(o) {
      const w = o.moving ? Math.sin(o.t * 9) : 0;
      L(-2, -6, -4 + w * 2, 0); L(2, -6, 4 - w * 2, 0);
      ELL(0, -10, 6, 5);
      L(3, -9, 9, -6); L(9, -6, 10, -4); L(9, -6, 11, -7);
      L(-3, -9, -7, -5);
      // ปาก/ฟัน
      L(1, -10, 6, -10); for (let i = 0; i < 3; i++) { DOT(2 + i * 1.5, -11); }
      DOT(2, -13); DOT(4, -13);
      if (o.opts && o.opts.fin) { L(-2, -15, 0, -19); L(0, -19, 3, -15); }
      else { L(-3, -14, -4, -17); L(3, -14, 4, -17); }
    },
    slime(o) {
      const q = Math.sin(o.t * 6) * 0.08;
      ELL(0, 0, 6 * (1 + q), 6 * (1 - q), Math.PI, Math.PI * 2);
      L(-6 * (1 + q), 0, 6 * (1 + q), 0);
      DOT(-2, -3); DOT(2, -3);
      if (o.opts && o.opts.friendly) { DOT(-1, -1); DOT(0, -1); DOT(1, -1); }
      if (o.opts && o.opts.thorny) { // ก้อนหนาม: ปกติน่ารัก (แก้มกลม) · ตอนโจมตีหนามแหลมงอกรอบตัว ตาเหลือบ
        if (o.opts.spiky) { C.fillStyle = '#3c7a3c'; for (let k = 0; k < 9; k++) { const a = Math.PI + (k + 0.5) / 9 * Math.PI, c = Math.cos(a), sn = Math.sin(a), g = 1 + (k % 2) * 0.35; L(c * 5.5, sn * 5.5, c * 11 * g, sn * 11 * g); L(c * 5.5 - sn * 1.2, sn * 5.5 + c * 1.2, c * 11 * g, sn * 11 * g); } C.fillStyle = o.color || P.INK; L(-3.5, -5, -1, -4); L(3.5, -5, 1, -4); }
        else { DOT(-4, -2); DOT(4, -2); }
      }
      if (o.opts && o.opts.hat) { L(-4, -6, 0, -13); L(0, -13, 4, -6); L(-5, -6, 5, -6); }
      C.globalAlpha *= 0.5; L(-3, -2, 3, -2); C.globalAlpha /= 0.5;
    },
    bird(o) {
      const f = Math.sin(o.t * 14) * 3, z = -2;
      ELL(0, z, 3, 2);
      if (o.opts && o.opts.bat) { L(-2, z, -5, z - 3 - f); L(-5, z - 3 - f, -6, z - 1); L(-6, z - 1, -8, z - 3 - f); L(2, z, 5, z - 3 - f); L(5, z - 3 - f, 6, z - 1); L(6, z - 1, 8, z - 3 - f); }
      else { L(-1, z - 1, -6, z - 4 - f); L(-6, z - 4 - f, -2, z); L(1, z - 1, 5, z - 5 - f); L(5, z - 5 - f, 2, z); L(3, z - 1, 6, z - 1); }
      if (o.opts && o.opts.big) { L(2, z - 1, 4, z - 8); L(4, z - 8, 7, z - 8); L(-1, z + 2, -1, z + 9); L(1, z + 2, 1, z + 9); }
      DOT(2, z - 1);
    },
    book(o) {
      const f = Math.sin(o.t * 10) * 2;
      L(0, -2, -6, -4 - f); L(-6, -4 - f, -6, 1 - f); L(-6, 1 - f, 0, 3); L(0, 3, 0, -2);
      L(0, -2, 6, -4 - f); L(6, -4 - f, 6, 1 - f); L(6, 1 - f, 0, 3);
      L(-4, -2 - f, -2, -1); L(2, -1, 4, -2 - f); DOT(-3, 0); DOT(3, 0);
    },
    ghost(o) {
      const w = Math.sin(o.t * 5);
      ELL(0, -8, 6, 6, Math.PI, Math.PI * 2);
      L(-6, -8, -6, 0); L(6, -8, 6, 0);
      for (let i = 0; i < 4; i++) L(-6 + i * 3, 0 + (i % 2 ? w : -w), -3 + i * 3, 0 + (i % 2 ? -w : w));
      L(-3, -10, -2, -8); L(2, -10, 3, -8);
      C.globalAlpha *= 0.45; for (let i = -3; i <= 3; i += 2) L(i, -6, i + 2, -2); C.globalAlpha /= 0.45;
    },
    jelly(o) {
      const w = Math.sin(o.t * 6) * 1.5;
      ELL(0, -8, 6, 4, Math.PI, Math.PI * 2); L(-6, -8, 6, -8);
      for (let i = -4; i <= 4; i += 2.7) { L(i, -8, i + w, -4); L(i + w, -4, i - w, 0); }
      DOT(-2, -10); DOT(2, -10);
    },
    kraken(o) {
      const t = o.t;
      ELL(0, -12, 7, 7, Math.PI, Math.PI * 2); L(-7, -12, -6, -6); L(7, -12, 6, -6); L(-6, -6, 6, -6);
      CIR(-3, -11, 1.4); CIR(3, -11, 1.4);
      const originalColor = C.fillStyle;
      if (o.opts?.tentacleFlash) C.fillStyle = '#d23a2a';
      for (let k = 0; k < 6; k++) { const bx = -6 + k * 2.4, sw = Math.sin(t * 4 + k) * 3; L(bx, -6, bx + sw - 2, -1); L(bx + sw - 2, -1, bx - sw * 0.5 + (k < 3 ? -4 : 4), 2); }
      C.fillStyle = originalColor;
    },
    eraserbit(o) {
      const hop = Math.abs(Math.sin(o.t * 9)) * 3;
      L(-5, -hop, 5, -hop); L(5, -hop, 5, -7 - hop); L(5, -7 - hop, -5, -7 - hop); L(-5, -7 - hop, -5, -hop);
      L(-1, -7 - hop, -1, -hop); DOT(1.5, -4.5 - hop); DOT(3.5, -4.5 - hop);
      DOT(-6, 0); DOT(6, 1); DOT(-4, 1);
    },
    tree(o) {
      L(-2, 0, -2, -18); L(2, 0, 2, -18); L(-2, 0, -5, 1); L(2, 0, 5, 1);
      L(0, -18, -6, -24); L(0, -18, 5, -25);
      CIR(0, -30, 9); CIR(-7, -26, 5); CIR(7, -27, 5);
      if (o.opts && o.opts.ent) { // ต้นไม้เฒ่า: แขนกิ่งไม้โบก ตาโกรธ ปากแหลม หนามที่ไหล่
        const sw = Math.sin(o.t * 2.5) * 2;
        L(-2, -14, -10, -12 + sw); L(-10, -12 + sw, -13, -17 + sw); L(-10, -12 + sw, -14, -11 + sw); L(2, -14, 10, -12 - sw); L(10, -12 - sw, 13, -17 - sw); L(10, -12 - sw, 14, -11 - sw);
        L(-6, -22, -9, -29); L(6, -22, 9, -29); L(0, -38, 0, -43); L(-4, -37, -7, -42); L(4, -37, 7, -42);
        L(-3, -13, -1, -12); L(3, -13, 1, -12); L(-2, -8, -1, -6); L(0, -6, 1, -8); L(-2, -6, 2, -6);
        return;
      }
      DOT(-2, -12); DOT(1, -12); L(-1, -9, 0, -9);
    },
    stag(o) { // กวางเขาหมึก: ลำตัวยาว คอสูง เขากวางแตกกิ่งใหญ่ ตาแดง
      const w = o.moving ? Math.sin(o.t * 10) : 0, sw = Math.sin(o.t * 2.2);
      ELL(0, -11, 9, 4.6); L(-9, -12, -12, -14 + sw); // ลำตัว+หาง
      L(-6, -7, -7 + w * 2.5, 0); L(-3, -7, -3 - w * 2.5, 0); L(3, -7, 3 + w * 2.5, 0); L(6, -7, 7 - w * 2.5, 0); // ขา 4
      L(6, -14, 10, -20); L(8, -12, 12, -18); L(10, -20, 14, -19); L(14, -19, 17, -16); L(17, -16, 14, -15); L(12, -18, 14, -15); // คอ+หัว
      EYE(13, -18);
      for (const sd of [0, 1]) { const x0 = 10 + sd * 3, y0 = -20; // เขา 2 ข้าง แตกกิ่ง
        L(x0, y0, x0 - 1 + sd * 2, y0 - 8); L(x0 - 1 + sd * 2, y0 - 8, x0 - 4 + sd * 4, y0 - 13); L(x0 - 1 + sd * 2, y0 - 8, x0 + 2 + sd * 3, y0 - 13); L(x0 - 1 + sd, y0 - 4, x0 - 5 + sd * 6, y0 - 7); L(x0 - 4 + sd * 4, y0 - 13, x0 - 6 + sd * 5, y0 - 15); }
    },
    nib(o) {
      const b = Math.sin(o.t * 4) * 1.5;
      C.fillStyle = o.color; CIR(0, -4 + b, 3, true);
      C.fillStyle = '#ffffff'; DOT(-1, -5 + b); DOT(1, -5 + b);
      C.fillStyle = o.color; L(0, -1 + b, 0, 1 + b);
    }
  };

  function drawActor(c, sx, sy, o) {
    C = c; OX = Math.round(sx); OY = Math.round(sy); S = o.size || 1; F = (o.facing || 1) < 0 ? -1 : 1;
    o.t = o.t || 0; if (o.attackP === undefined) o.attackP = -1;
    // เงา
    if (!o.noShadow) { c.fillStyle = 'rgba(80,70,50,0.25)'; P.ellipse(c, OX, OY + 1, 5 * S, 2 * S, 14); }
    if (o.z) OY -= o.z;
    c.fillStyle = o.color || P.INK;
    if (o.sprite && spriteImg(o.sprite, o)) { drawSprite(c, o); return; } // รูป Sprite จาก editor (ไม่มี/โหลดไม่ได้ → ลายเส้นเดิม)
    P.dash = o.dashed ? 2 : 0;
    (shapes[o.shape] || human)(o);
    P.dash = 0;
  }
  // ----- Sprite รูปภาพ: แถบเฟรมแนวนอน · เท้าอยู่กึ่งกลางขอบล่าง · 1 พิกเซลรูป = 1 พิกเซลจอเกม × size -----
  const imgs = {};
  // sprite = "path" | {src,frames,fps,scale} | {idle:X, walk:X, atk:X} (X = path หรือ {src,frames,fps}) — สถานะที่ไม่มีใช้ idle แทน
  function pick(sp, o) {
    if (!sp) return null; if (typeof sp === 'string') return { src: sp };
    if (sp.src) return sp;
    const atk = o.attackP >= 0 || o.state === 'atk', pk = (atk ? sp.atk : o.moving ? sp.walk : null) || sp.idle || sp.walk || sp.atk; if (!pk) return null;
    const r = typeof pk === 'string' ? { src: pk } : pk; return Object.assign({ atkState: atk && pk === sp.atk }, r);
  }
  function imgOf(src) {
    if (!src) return null; src = PD.U.img(src);
    let im = imgs[src]; if (!im) { im = imgs[src] = new Image(); im.onerror = () => { im.bad = true; }; im.src = src; }
    return im.complete && !im.bad && im.naturalWidth ? im : null;
  }
  function spriteImg(sp, o) { const p = pick(sp, o || {}); return p ? imgOf(p.src) : null; }
  function drawSprite(c, o) {
    const sp = pick(o.sprite, o), im = imgOf(sp.src), sc = sp.scale || 1;
    const n = Math.max(1, sp.frames || 1), fw = im.naturalWidth / n, fh = im.naturalHeight, fps = sp.fps || 6;
    const fr = n > 1 ? (sp.atkState && o.attackP >= 0 ? Math.min(n - 1, Math.floor(o.attackP * n)) : Math.floor(o.t * fps) % n) : 0, w = fw * S * sc, h = fh * S * sc;
    c.save(); const a = c.globalAlpha;
    if (o.dashed) c.globalAlpha = a * 0.4; else if (o.color && o.color !== P.INK) c.globalAlpha = a * 0.65; // บัง / โดนตี
    c.translate(OX, OY); if (F < 0) c.scale(-1, 1);
    c.imageSmoothingEnabled = false; c.drawImage(im, fr * fw, 0, fw, fh, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
    c.restore();
  }
  // รูปไอเท็มบนพื้น/ไอคอน: วาดกึ่งกลางที่ (x,y) กว้าง w พิกเซล · คืน true ถ้ามีรูปและวาดแล้ว
  function drawImg(c, path, x, y, w) { const im = imgOf(path); if (!im) return false; const h = w * im.naturalHeight / im.naturalWidth; c.imageSmoothingEnabled = false; c.drawImage(im, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h)); return true; }

  // ----- บล็อกกำแพง (แคช) -----
  const cache = {};
  const T = 16; // ขอบบนเผื่อของสูง
  function wallSprite(theme, v, variant, gate, low) {
    const key = theme + '|' + v + '|' + variant + '|' + (gate || 0) + '|' + (low ? 1 : 0);
    if (cache[key]) return cache[key];
    const WH = low ? PD_DATA.config.wallLowH : PD_DATA.config.wallH;
    const cv = document.createElement('canvas'); cv.width = 33; cv.height = T + 16 + WH + 2;
    const c = cv.getContext('2d'); cv.wh = WH;
    const j = (k) => ((PD.U.hash(variant, k, 3) * 3) | 0) - 1; // ความยึกยัก ±1
    const top = [[16, T + j(1)], [32, T + 8], [16, T + 16], [0, T + 8]];
    const lf = [[0, T + 8], [16, T + 16], [16, T + 16 + WH], [0, T + 8 + WH]];
    const rf = [[16, T + 16], [32, T + 8], [32, T + 8 + WH], [16, T + 16 + WH]];
    const fillPoly = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.closePath(); c.fill(); };
    if (v === 1 && !gate && theme === 'lanternCave') {
      const base = T + WH + 14, rise = low ? 14 : WH + 11;
      const rock = [[1,base-6],[2,base-rise+9],[7,base-rise+3],[13,base-rise-1+j(4)],[20,base-rise+1],[26,base-rise+6],[31,base-rise+12],[32,base-6],[25,base-2],[14,base],[6,base-2]];
      fillPoly(rock, ['#414753','#4b4d56','#393f4d','#454854'][variant % 4]);
      fillPoly([[2,base-rise+9],[10,base-rise+5],[16,base-rise+6],[16,base-1],[7,base-2],[1,base-6]], '#343b49');
      fillPoly([[16,base-rise+6],[24,base-rise+5],[31,base-rise+12],[32,base-6],[24,base-2],[16,base]], '#282e3a');
      c.fillStyle = '#171b24'; P.poly(c, rock, true);
      c.fillStyle = '#636372';
      for (let offset = 6; offset < rise - 5; offset += 6) {
        const y = base - offset;
        P.line(c, 4, y - 2, 12, y + j(offset));
        P.line(c, 12, y + j(offset), 25, y - 3);
      }
      return (cache[key] = cv);
    }
    if (v === 1 && !gate && theme === 'fairyForest') {
      const band = variant >> 2, base = T + WH + 13, size = low ? 10 : 13 + band;
      const leaf = ['#7e9f62','#577d54','#3e654e','#294c42'][band];
      const shade = ['#53774b','#405e44','#2c4a3a','#20392f'][band];
      fillPoly([[12,base],[13,base-size-4],[18,base-size-4],[19,base],[15,base-2]], '#514a3d');
      const crown = base - size - (low ? 2 : 7);
      c.fillStyle = shade; P.circle(c, 16, crown, size, true);
      c.fillStyle = leaf; P.circle(c, 10+j(1), crown-2, size*.63, true); P.circle(c, 21+j(2), crown-3, size*.62, true);
      c.fillStyle = '#263e34'; P.circle(c, 16, crown, size, false);
      c.fillStyle = band < 2 ? '#c5d095' : '#5c8870'; P.line(c, 7, crown-4, 11, crown-6);
      return (cache[key] = cv);
    }
    if (v === 2) { // ต้นไม้
      c.fillStyle = P.INK; const bx = 16, by = T + WH + 8;
      if (theme === 'desert') { // กระบองเพชร
        P.line(c, bx - 2, by, bx - 2, by - 20); P.line(c, bx + 2, by, bx + 2, by - 20); P.line(c, bx - 2, by - 20, bx + 2, by - 20);
        P.line(c, bx - 2, by - 10, bx - 6, by - 10); P.line(c, bx - 6, by - 10, bx - 6, by - 16); P.line(c, bx + 2, by - 13, bx + 6, by - 13); P.line(c, bx + 6, by - 13, bx + 6, by - 19);
      } else if (theme === 'forest') { // ป่าเงาหมึก: tk 0 พุ่ม · 1 ต้นเล็กโปร่ง · 2 ต้นสูง (สนซ้อนชั้น) · 3 ไม้เก่าแก่ใหญ่สูง
        const tk = variant >> 2, vj = variant & 3;
        if (tk === 0) { P.circle(c, bx - 3, by - 3, 4, false); P.circle(c, bx + 3, by - 4, 5, false); P.circle(c, bx, by - 7, 3, false); P.line(c, bx - 1, by, bx - 1, by - 3); }
        else if (tk === 1) { P.line(c, bx - 1, by, bx - 1, by - 14); P.line(c, bx + 1, by, bx + 1, by - 14); P.circle(c, bx, by - 19, 6 + (vj % 2), false); P.circle(c, bx - 5, by - 16, 3, false); P.line(c, bx - 1, by - 8, bx - 5, by - 12); }
        else { const hgt = tk === 2 ? 30 : 38; // สนซ้อนชั้น: ยิ่งสูงยิ่งแคบ
          P.line(c, bx - 1, by, bx - 1, by - 10); P.line(c, bx + 1, by, bx + 1, by - 10);
          for (let k = 0; k < (tk === 2 ? 3 : 4); k++) { const y0 = by - 8 - k * (hgt / 4.2), wd = 9 - k * 1.8 + (tk === 3 ? 2 : 0); P.line(c, bx - wd, y0, bx, y0 - hgt / 3.4); P.line(c, bx + wd, y0, bx, y0 - hgt / 3.4); P.line(c, bx - wd, y0, bx + wd, y0); }
          if (tk === 3) { c.fillStyle = 'rgba(27,27,27,0.4)'; for (let k = 0; k < 4; k++) P.line(c, bx + 1 + k, by - 10 - k * 7, bx + 4 + k, by - 6 - k * 7); c.fillStyle = P.INK; } }
      } else if (theme === 'field') { // ดินสอยักษ์
        P.line(c, bx - 3, by, bx - 3, by - 18); P.line(c, bx + 3, by, bx + 3, by - 18); P.line(c, bx - 3, by, bx + 3, by);
        P.line(c, bx - 3, by - 18, bx, by - 25); P.line(c, bx + 3, by - 18, bx, by - 25); P.line(c, bx, by, bx, by - 18);
        c.fillStyle = '#e8c21a'; c.fillRect(bx - 2, by - 16, 2, 14); c.fillStyle = P.INK; c.fillRect(bx, by - 25, 1, 2);
      } else {
        P.line(c, bx - 1, by, bx - 1, by - 12); P.line(c, bx + 1, by, bx + 1, by - 12);
        const cy = by - 20, r = 7 + (variant % 2);
        if (theme === 'sea') { for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + (a - 2) * 0.6; P.line(c, bx, by - 12, bx + Math.cos(an) * 10, by - 12 + Math.sin(an) * 7 + 3); } }
        else { P.circle(c, bx, cy, r, false); P.circle(c, bx - 5, cy + 3, 4, false); P.circle(c, bx + 5, cy + 2, 4, false);
          if (theme === 'tree') { c.fillStyle = 'rgba(27,27,27,0.35)'; P.circle(c, bx, cy, r - 2, true); } }
      }
      return (cache[key] = cv);
    }
    // gate: 1=หมึกดำ 2=หมึกขาว 3=แผ่นพับ 4=เส้นประรอวาด 5=วงจร 6=กำแพงดินสอ
    if (gate >= 3) {
      const col = { 3: P.INK, 4: '#4a6fb0', 5: P.INK, 6: '#8a8a8a' }[gate];
      if (gate !== 4) { fillPoly(top, gate === 6 ? '#e6e3dc' : '#fbf8f0'); fillPoly(lf, gate === 6 ? '#dcd8cf' : '#f1ebdd'); fillPoly(rf, gate === 6 ? '#d2cec4' : '#e9e2d1'); }
      c.fillStyle = col; P.dash = gate === 4 ? 1 : 0;
      P.poly(c, top, true); P.poly(c, lf, true); P.poly(c, rf, true); P.dash = 0;
      if (gate === 3) { P.dash = 2; P.line(c, 0, T + 8, 32, T + 8 + WH); P.line(c, 16, T, 16, T + 16 + WH); P.dash = 0; P.poly(c, [[16, T], [24, T + 4], [16, T + 7]], true); }
      if (gate === 5) { c.fillStyle = '#d9a400'; P.poly(c, [[9, T + 12], [5, T + 19], [10, T + 19], [6, T + 27]]); P.poly(c, [[25, T + 12], [21, T + 19], [26, T + 19], [22, T + 26]]); }
      if (gate === 6) { for (let x = 2; x < 32; x += 3) P.line(c, x, T + 10 + Math.abs(16 - x) / 2, x + 2, T + 8 + WH - Math.abs(16 - x) / 2); }
      return (cache[key] = cv);
    }
    const GC = { 1: ['#333', '#2a2a2a', '#202020'], 7: ['#c0473a', '#a83a2f', '#912f26'], 8: ['#3a6fc0', '#2f5ea8', '#264e91'] }[gate]; // ประตูหมึก ดำ/แดง/ฟ้า
    const cave = theme === 'lanternCave' && !gate;
    const colors = GC || (cave ? ['#414756', '#343a47', '#272e3b'] : [P.PAPER, '#efe9dc', '#e3dccb']);
    const [tc, lfc, rfc] = colors;
    if (gate !== 2) { fillPoly(top, tc); fillPoly(lf, lfc); fillPoly(rf, rfc); }
    c.fillStyle = P.INK;
    if (gate === 2) P.dash = 2;
    P.poly(c, top, true); P.poly(c, lf, true); P.poly(c, rf, true);
    P.dash = 0;
    if (!gate) {
      // แรเงาด้านขวา
      c.fillStyle = 'rgba(27,27,27,0.45)';
      for (let x = 19; x < 32; x += 3) P.line(c, x, T + 17 - (x - 16) / 2, x, T + 15 + WH - (x - 16) / 2);
      c.fillStyle = P.INK;
      const deco = {
        village: () => { P.line(c, 1, T + 9 + WH / 2, 15, T + 17 + WH / 2); P.line(c, 8, T + 13, 8, T + 12 + WH / 2); },
        lanternCave: () => {
          c.fillStyle = '#53596a';
          P.line(c, 2, T + 11 + j(2), 14, T + 17 + j(3));
          P.line(c, 2, T + 15 + j(4), 14, T + 21 + j(5));
          P.line(c, 18, T + 19, 30, T + 12 + j(6));
          P.line(c, 8, T + 6, 15, T + 3 + j(7));
          P.line(c, 12, T + 10, 21, T + 6 + j(8));
        },
        cave: () => { P.line(c, 4, T + 14, 7, T + 18); P.line(c, 7, T + 18, 5, T + 22); c.fillRect(10, T + 7, 1, 1); c.fillRect(20, T + 6, 1, 1); },
        library: () => { for (let s = 6; s < WH; s += 6) P.line(c, 1, T + 8 + s, 15, T + 16 + s); for (let x = 3; x < 15; x += 3) P.line(c, x, T + 9 + x / 2 + 1, x, T + 9 + x / 2 + 4); },
        field: () => { for (let x = 4; x < 16; x += 4) P.line(c, x, T + 9 + x / 2, x, T + 8 + WH + x / 2); },
        castle: () => { P.line(c, 0, T + 8, 16, T + 16 + WH); P.line(c, 16, T, 16, T + 16); },
        sea: () => { for (let x = 1; x < 15; x++) c.fillRect(x, Math.round(T + 12 + x / 2 + Math.sin(x * 0.9) * 1.5), 1, 1); },
        tree: () => { P.line(c, 5, T + 12, 6, T + 8 + WH); P.line(c, 11, T + 15, 10, T + 12 + WH); },
        desert: () => { for (let x = 2; x < 15; x += 4) c.fillRect(x, T + 12 + x / 2 + (x % 3), 1, 1); P.line(c, 1, T + 9 + WH * 0.6, 15, T + 17 + WH * 0.6); },
        dream: () => { P.circle(c, 8, T + 14 + WH / 3, 2.5, false); c.fillRect(8, T + 14 + WH / 3, 1, 1); },
        minworld: () => { const f = c.fillStyle; c.fillStyle = '#e8dc8a'; for (let x = 3; x < 15; x += 4) c.fillRect(x, T + 11 + WH / 2 + (x % 3), 2, 2); c.fillStyle = f; },
        forest: () => { P.line(c, 2, T + 11, 5, T + 13); P.line(c, 8, T + 17, 11, T + 16); c.fillRect(12, T + 9, 1, 1); },
        fairy: () => { P.line(c, 3, T + 8 + WH, 6, T + 14); P.line(c, 6, T + 14, 9, T + 10 + WH); P.line(c, 5, T + 16, 3, T + 15); P.line(c, 7, T + 18, 9, T + 17); }
      };
      (deco[theme] || deco.village)();
      if (v === 3) { // บ้าน: หน้าต่าง/ประตู + หลังคา
        P.line(c, 4, T + 14, 4, T + 19); P.line(c, 9, T + 16, 9, T + 21); P.line(c, 4, T + 14, 9, T + 16); P.line(c, 4, T + 19, 9, T + 21);
        P.line(c, 8, T + 4, 24, T + 12); P.line(c, 4, T + 6, 20, T + 14); P.line(c, 12, T + 2, 28, T + 10);
      }
    }
    return (cache[key] = cv);
  }
  // ไอคอนชุดสวมใส่ (เสื้อ/กางเกง/เครื่องประดับ) ในกรอบ 14×14 จากมุมซ้ายบน
  function gear(c, slot, x, y, s) {
    s = s || 1; const pts = { body: [[3,1,0,4],[0,4,2,6],[2,6,3,5],[3,5,3,13],[3,13,11,13],[11,13,11,5],[11,5,12,6],[12,6,14,4],[14,4,11,1],[3,1,5,1],[9,1,11,1],[5,1,7,3],[7,3,9,1]],
      legs: [[3,1,11,1],[3,1,2,13],[2,13,6,13],[6,13,7,5],[7,5,8,13],[8,13,12,13],[12,13,11,1]],
      acc: [[7,1,5,3],[7,1,9,3],[5,3,9,3],[4,5,10,5],[4,5,3,8],[10,5,11,8],[3,8,7,13],[11,8,7,13]] }[slot] || [];
    for (const q of pts) P.line(c, x + q[0] * s, y + q[1] * s, x + q[2] * s, y + q[3] * s);
  }
  return { drawActor, drawImg, weapon, gear, wallSprite, WALL_TOP: T };
})();
