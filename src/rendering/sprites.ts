// พอร์ตตรงจาก legacy js/sprites.js — ตัวละครลายเส้น + ศัตรู + บล็อกกำแพง isometric (วาดด้วยโค้ดลง Canvas 2D)
// ลอจิกวาดห้ามเปลี่ยน: tests/pixelparity.e2e.mjs เทียบพิกเซลกับต้นฉบับ
import { P, type Ctx } from './pixel';
import { hash } from '../systems/rng';

export interface ActorOpts {
  shape: string; opts?: Record<string, any>; t: number; moving?: boolean; facing?: number; size?: number; z?: number; color: string; dashed?: boolean; noShadow?: boolean;
  weapon?: string; attackP: number; aimAng: number; arc?: number; swingDir?: number;
  alienHead?: boolean; helm?: boolean; hood?: boolean; mermaid?: boolean; coat?: boolean; horns?: boolean; tail?: boolean; wings?: boolean; shield?: boolean; claws?: boolean; eraserBlock?: boolean;
}
/** อินพุตของ drawActor — ฟิลด์ที่ขาดจะถูกเติมค่าเริ่มต้นเหมือนต้นฉบับ */
export type ActorIn = Partial<ActorOpts> & { shape: string };
export type WallCanvas = HTMLCanvasElement & { wh: number };
/** ความสูงกำแพง (จาก balance.config) — เรียกตอน boot ก่อนสร้าง sprite กำแพง */
export const WALL_CFG = { wallH: 20, wallLowH: 6 };
export const configureWalls = (c: { wallH: number; wallLowH: number }) => { WALL_CFG.wallH = c.wallH; WALL_CFG.wallLowH = c.wallLowH; };
  let C: Ctx, OX: number, OY: number, S: number, F: number; // context, origin, scale, flip
const L = (x1: number, y1: number, x2: number, y2: number) => P.line(C, OX + x1 * S * F, OY + y1 * S, OX + x2 * S * F, OY + y2 * S);
const CIR = (x: number, y: number, r: number, fill?: boolean) => P.circle(C, OX + x * S * F, OY + y * S, r * S, fill);
const ELL = (x: number, y: number, rx: number, ry: number, a0?: number, a1?: number) => P.ellipse(C, OX + x * S * F, OY + y * S, rx * S, ry * S, 0, a0, a1);
const DOT = (x: number, y: number) => C.fillRect(Math.round(OX + x * S * F), Math.round(OY + y * S), 1, 1);

function weapon(c: Ctx, shape: string, hx: number, hy: number, ang: number, s: number) {
  const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
  const seg = (a: number, b: number, pa: number, pb: number) => P.line(c, hx + dx * a * s + px * pa * s, hy + dy * a * s + py * pa * s, hx + dx * b * s + px * pb * s, hy + dy * b * s + py * pb * s);
  if (shape === 'sword') { seg(0, 10, 0, 0); seg(1.5, 1.5, -2, 2); }
  else if (shape === 'dagger') { seg(0, 6, 0, 0); seg(1, 1, -1.5, 1.5); }
  else if (shape === 'axe') { seg(0, 9, 0, 0); seg(9, 6, 0, 3.5); seg(6, 8.5, 3.5, 3.5); seg(8.5, 9, 3.5, 0); }
  else if (shape === 'spear') { seg(-2, 14, 0, 0); seg(14, 12, 0, 1.6); seg(14, 12, 0, -1.6); }
  else if (shape === 'staff') { seg(-2, 11, 0, 0); P.circle(c, hx + dx * 12.5 * s, hy + dy * 12.5 * s, 2 * s, false); }
  else seg(0, 8, 0, 0);
}

function human(o: ActorOpts) {
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
    } else ang = F > 0 ? -1.0 : Math.PI + 1.0;
    const hx2 = shx + Math.cos(ang) * 5 * S, hy2 = shy + Math.sin(ang) * 5 * S;
    P.line(C, shx, shy, hx2, hy2);
    weapon(C, o.weapon, hx2, hy2, ang, S);
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

const shapes: Record<string, (o: ActorOpts) => void> = {
  human,
  hero(o: ActorOpts) { human(o); },
  knight(o: ActorOpts) { o.helm = true; o.shield = true; human(o); },
  demon(o: ActorOpts) { o.horns = true; o.tail = true; o.claws = true; o.wings = o.opts && o.opts.wings; human(o); },
  alien(o: ActorOpts) { o.alienHead = true; human(o); },
  eraser(o: ActorOpts) { o.hood = true; o.coat = true; o.eraserBlock = true; human(o); },
  mermaid(o: ActorOpts) { o.mermaid = true; o.opts = Object.assign({ hair: true }, o.opts); human(o); },
  monster(o: ActorOpts) {
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
  slime(o: ActorOpts) {
    const q = Math.sin(o.t * 6) * 0.08;
    ELL(0, 0, 6 * (1 + q), 6 * (1 - q), Math.PI, Math.PI * 2);
    L(-6 * (1 + q), 0, 6 * (1 + q), 0);
    DOT(-2, -3); DOT(2, -3);
    if (o.opts && o.opts.friendly) { DOT(-1, -1); DOT(0, -1); DOT(1, -1); }
    if (o.opts && o.opts.hat) { L(-4, -6, 0, -13); L(0, -13, 4, -6); L(-5, -6, 5, -6); }
    C.globalAlpha *= 0.5; L(-3, -2, 3, -2); C.globalAlpha /= 0.5;
  },
  bird(o: ActorOpts) {
    const f = Math.sin(o.t * 14) * 3, z = -2;
    ELL(0, z, 3, 2);
    if (o.opts && o.opts.bat) { L(-2, z, -5, z - 3 - f); L(-5, z - 3 - f, -6, z - 1); L(-6, z - 1, -8, z - 3 - f); L(2, z, 5, z - 3 - f); L(5, z - 3 - f, 6, z - 1); L(6, z - 1, 8, z - 3 - f); }
    else { L(-1, z - 1, -6, z - 4 - f); L(-6, z - 4 - f, -2, z); L(1, z - 1, 5, z - 5 - f); L(5, z - 5 - f, 2, z); L(3, z - 1, 6, z - 1); }
    if (o.opts && o.opts.big) { L(2, z - 1, 4, z - 8); L(4, z - 8, 7, z - 8); L(-1, z + 2, -1, z + 9); L(1, z + 2, 1, z + 9); }
    DOT(2, z - 1);
  },
  book(o: ActorOpts) {
    const f = Math.sin(o.t * 10) * 2;
    L(0, -2, -6, -4 - f); L(-6, -4 - f, -6, 1 - f); L(-6, 1 - f, 0, 3); L(0, 3, 0, -2);
    L(0, -2, 6, -4 - f); L(6, -4 - f, 6, 1 - f); L(6, 1 - f, 0, 3);
    L(-4, -2 - f, -2, -1); L(2, -1, 4, -2 - f); DOT(-3, 0); DOT(3, 0);
  },
  ghost(o: ActorOpts) {
    const w = Math.sin(o.t * 5);
    ELL(0, -8, 6, 6, Math.PI, Math.PI * 2);
    L(-6, -8, -6, 0); L(6, -8, 6, 0);
    for (let i = 0; i < 4; i++) L(-6 + i * 3, 0 + (i % 2 ? w : -w), -3 + i * 3, 0 + (i % 2 ? -w : w));
    L(-3, -10, -2, -8); L(2, -10, 3, -8);
    C.globalAlpha *= 0.45; for (let i = -3; i <= 3; i += 2) L(i, -6, i + 2, -2); C.globalAlpha /= 0.45;
  },
  jelly(o: ActorOpts) {
    const w = Math.sin(o.t * 6) * 1.5;
    ELL(0, -8, 6, 4, Math.PI, Math.PI * 2); L(-6, -8, 6, -8);
    for (let i = -4; i <= 4; i += 2.7) { L(i, -8, i + w, -4); L(i + w, -4, i - w, 0); }
    DOT(-2, -10); DOT(2, -10);
  },
  kraken(o: ActorOpts) {
    const t = o.t;
    ELL(0, -12, 7, 7, Math.PI, Math.PI * 2); L(-7, -12, -6, -6); L(7, -12, 6, -6); L(-6, -6, 6, -6);
    CIR(-3, -11, 1.4); CIR(3, -11, 1.4);
    for (let k = 0; k < 6; k++) { const bx = -6 + k * 2.4, sw = Math.sin(t * 4 + k) * 3; L(bx, -6, bx + sw - 2, -1); L(bx + sw - 2, -1, bx - sw * 0.5 + (k < 3 ? -4 : 4), 2); }
  },
  eraserbit(o: ActorOpts) {
    const hop = Math.abs(Math.sin(o.t * 9)) * 3;
    L(-5, -hop, 5, -hop); L(5, -hop, 5, -7 - hop); L(5, -7 - hop, -5, -7 - hop); L(-5, -7 - hop, -5, -hop);
    L(-1, -7 - hop, -1, -hop); DOT(1.5, -4.5 - hop); DOT(3.5, -4.5 - hop);
    DOT(-6, 0); DOT(6, 1); DOT(-4, 1);
  },
  tree(o: ActorOpts) {
    L(-2, 0, -2, -18); L(2, 0, 2, -18); L(-2, 0, -5, 1); L(2, 0, 5, 1);
    L(0, -18, -6, -24); L(0, -18, 5, -25);
    CIR(0, -30, 9); CIR(-7, -26, 5); CIR(7, -27, 5);
    DOT(-2, -12); DOT(1, -12); L(-1, -9, 0, -9);
  },
  nib(o: ActorOpts) {
    const b = Math.sin(o.t * 4) * 1.5;
    C.fillStyle = o.color; CIR(0, -4 + b, 3, true);
    C.fillStyle = '#ffffff'; DOT(-1, -5 + b); DOT(1, -5 + b);
    C.fillStyle = o.color; L(0, -1 + b, 0, 1 + b);
  }
};

function drawActor(c: Ctx, sx: number, sy: number, oin: ActorIn) {
const o = oin as ActorOpts;
  C = c; OX = Math.round(sx); OY = Math.round(sy); S = o.size || 1; F = (o.facing || 1) < 0 ? -1 : 1;
  o.t = o.t || 0; if (o.attackP === undefined) o.attackP = -1; if (o.aimAng === undefined) o.aimAng = 0;
  // เงา
  if (!o.noShadow) { c.fillStyle = 'rgba(80,70,50,0.25)'; P.ellipse(c, OX, OY + 1, 5 * S, 2 * S, 14); }
  if (o.z) OY -= o.z;
  c.fillStyle = o.color || P.INK;
  P.dash = o.dashed ? 2 : 0;
  (shapes[o.shape] || human)(o);
  P.dash = 0;
}

// ----- บล็อกกำแพง (แคช) -----
const cache: Record<string, WallCanvas> = {};
const T = 16; // ขอบบนเผื่อของสูง
const WALL_TOP = T;
function wallSprite(theme: string, v: number, variant: number, gate?: number, low?: boolean): WallCanvas {
  const key = theme + '|' + v + '|' + variant + '|' + (gate || 0) + '|' + (low ? 1 : 0);
  if (cache[key]) return cache[key];
  const WH = low ? WALL_CFG.wallLowH : WALL_CFG.wallH;
  const cv = document.createElement('canvas') as WallCanvas; cv.width = 33; cv.height = T + 16 + WH + 2;
  const c = cv.getContext('2d')!; cv.wh = WH;
  const j = (k: number) => ((hash(variant, k, 3) * 3) | 0) - 1; // ความยึกยัก ±1
  const top = [[16, T + j(1)], [32, T + 8], [16, T + 16], [0, T + 8]];
  const lf = [[0, T + 8], [16, T + 16], [16, T + 16 + WH], [0, T + 8 + WH]];
  const rf = [[16, T + 16], [32, T + 8], [32, T + 8 + WH], [16, T + 16 + WH]];
  const fillPoly = (pts: number[][], col: string) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.closePath(); c.fill(); };
  if (v === 2) { // ต้นไม้
    c.fillStyle = P.INK; const bx = 16, by = T + WH + 8;
    if (theme === 'field') { // ดินสอยักษ์
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
  if ((gate || 0) >= 3) {
    const col = ({ 3: P.INK, 4: '#4a6fb0', 5: P.INK, 6: '#8a8a8a' } as Record<number, string>)[gate!];
    if (gate !== 4) { fillPoly(top, gate === 6 ? '#e6e3dc' : '#fbf8f0'); fillPoly(lf, gate === 6 ? '#dcd8cf' : '#f1ebdd'); fillPoly(rf, gate === 6 ? '#d2cec4' : '#e9e2d1'); }
    c.fillStyle = col; P.dash = gate === 4 ? 1 : 0;
    P.poly(c, top, true); P.poly(c, lf, true); P.poly(c, rf, true); P.dash = 0;
    if (gate === 3) { P.dash = 2; P.line(c, 0, T + 8, 32, T + 8 + WH); P.line(c, 16, T, 16, T + 16 + WH); P.dash = 0; P.poly(c, [[16, T], [24, T + 4], [16, T + 7]], true); }
    if (gate === 5) { c.fillStyle = '#d9a400'; P.poly(c, [[9, T + 12], [5, T + 19], [10, T + 19], [6, T + 27]]); P.poly(c, [[25, T + 12], [21, T + 19], [26, T + 19], [22, T + 26]]); }
    if (gate === 6) { for (let x = 2; x < 32; x += 3) P.line(c, x, T + 10 + Math.abs(16 - x) / 2, x + 2, T + 8 + WH - Math.abs(16 - x) / 2); }
    return (cache[key] = cv);
  }
  const lfc = gate === 1 ? '#2a2a2a' : '#efe9dc', rfc = gate === 1 ? '#202020' : '#e3dccb', tc = gate === 1 ? '#333' : P.PAPER;
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
    const deco: Record<string, () => void> = {
      village: () => { P.line(c, 1, T + 9 + WH / 2, 15, T + 17 + WH / 2); P.line(c, 8, T + 13, 8, T + 12 + WH / 2); },
      cave: () => { P.line(c, 4, T + 14, 7, T + 18); P.line(c, 7, T + 18, 5, T + 22); c.fillRect(10, T + 7, 1, 1); c.fillRect(20, T + 6, 1, 1); },
      library: () => { for (let s = 6; s < WH; s += 6) P.line(c, 1, T + 8 + s, 15, T + 16 + s); for (let x = 3; x < 15; x += 3) P.line(c, x, T + 9 + x / 2 + 1, x, T + 9 + x / 2 + 4); },
      field: () => { for (let x = 4; x < 16; x += 4) P.line(c, x, T + 9 + x / 2, x, T + 8 + WH + x / 2); },
      castle: () => { P.line(c, 0, T + 8, 16, T + 16 + WH); P.line(c, 16, T, 16, T + 16); },
      sea: () => { for (let x = 1; x < 15; x++) c.fillRect(x, Math.round(T + 12 + x / 2 + Math.sin(x * 0.9) * 1.5), 1, 1); },
      tree: () => { P.line(c, 5, T + 12, 6, T + 8 + WH); P.line(c, 11, T + 15, 10, T + 12 + WH); }
    };
    (deco[theme] || deco.village)();
    if (v === 3) { // บ้าน: หน้าต่าง/ประตู + หลังคา
      P.line(c, 4, T + 14, 4, T + 19); P.line(c, 9, T + 16, 9, T + 21); P.line(c, 4, T + 14, 9, T + 16); P.line(c, 4, T + 19, 9, T + 21);
      P.line(c, 8, T + 4, 24, T + 12); P.line(c, 4, T + 6, 20, T + 14); P.line(c, 12, T + 2, 28, T + 10);
    }
  }
  return (cache[key] = cv);
}

export { drawActor, weapon, wallSprite, WALL_TOP };
export const clearWallCache = () => { for (const k of Object.keys(cache)) delete cache[k]; };
