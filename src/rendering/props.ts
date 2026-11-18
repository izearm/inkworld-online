// วัตถุบนพื้น: ประตู / หีบ / กองค้นหา / ของบนพื้น — พอร์ตจาก legacy render.js (พิกัด s = จุดเท้า/กลางช่องในหน่วยพิกเซลของผืนผ้าใบ)
import { P, type Ctx } from './pixel';
import { weapon as drawWeapon } from './sprites';

export type PortalTo = 'prev' | 'next' | 'world' | 'town';
export function drawPortal(c: Ctx, sx: number, sy: number, to: PortalTo, t: number) {
  c.fillStyle = P.INK;
  P.line(c, sx - 6, sy, sx - 6, sy - 18); P.line(c, sx + 6, sy, sx + 6, sy - 18); P.line(c, sx - 6, sy - 18, sx + 6, sy - 18);
  P.dash = 2; P.line(c, sx - 4, sy - 2, sx - 4, sy - 15); P.line(c, sx + 4, sy - 2, sx + 4, sy - 15); P.dash = 0;
  c.fillStyle = to === 'world' ? '#e8b04a' : to === 'town' ? '#3c9a5c' : '#2f6fd6';
  for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.1; c.fillRect(Math.round(sx + Math.cos(a) * 3), Math.round(sy - 9 + Math.sin(a) * 5), 1, 1); }
  if (to === 'next' || to === 'town') { c.fillStyle = P.INK; P.line(c, sx - 2, sy - 22, sx + 2, sy - 22); P.line(c, sx + 2, sy - 22, sx, sy - 24); P.line(c, sx + 2, sy - 22, sx, sy - 20); }
}
export function drawChest(c: Ctx, sx: number, sy: number, open: boolean) {
  c.fillStyle = P.INK;
  P.poly(c, [[sx - 6, sy - 2], [sx, sy + 1], [sx + 6, sy - 2], [sx + 6, sy - 7], [sx, sy - 4], [sx - 6, sy - 7]], true);
  P.line(c, sx, sy + 1, sx, sy - 4);
  if (open) P.poly(c, [[sx - 6, sy - 7], [sx - 3, sy - 13], [sx + 3, sy - 10], [sx, sy - 4]]);
  else { P.poly(c, [[sx - 6, sy - 7], [sx, sy - 10], [sx + 6, sy - 7]]); c.fillStyle = '#e8c21a'; c.fillRect(sx - 1, sy - 5, 2, 2); }
}
export function drawSearchSpot(c: Ctx, sx: number, sy: number, used: boolean, t: number, idx: number) {
  c.fillStyle = P.INK;
  if (used) { P.ellipse(c, sx, sy, 5, 2, 14); return; }
  P.circle(c, sx - 3, sy - 2, 2); P.circle(c, sx + 2, sy - 3, 3); P.circle(c, sx, sy - 6, 2);
  P.line(c, sx - 6, sy, sx + 6, sy);
  if (((t * 2 + idx) | 0) % 3 === 0) { c.fillStyle = '#e8c21a'; c.fillRect(sx + 3, sy - 9, 1, 1); }
}
export interface PickupLook { kind: 'quest' | 'side' | 'potion' | 'tool' | 'lumi' | 'weapon'; x: number; color?: string; weaponShape?: string; rarityColor?: string; rarityNormal?: boolean }
export function drawPickup(c: Ctx, sx: number, sy: number, pk: PickupLook, t: number, landColor: string) {
  const b = Math.sin(t * 4 + pk.x) * 1.5;
  if (pk.kind === 'weapon') {
    c.fillStyle = P.INK; drawWeapon(c, pk.weaponShape || 'sword', sx - 4, sy - 2 + b, -0.5, 0.8);
    c.fillStyle = pk.rarityColor || P.INK; if (!pk.rarityNormal) { c.fillRect(sx - 5, sy - 6 + b, 1, 1); c.fillRect(sx + 3, sy - 9 + b, 1, 1); c.fillRect(sx + 1, sy - 3 + b, 1, 1); }
  } else if (pk.kind === 'lumi') {
    const rx = Math.max(0.6, Math.abs(Math.cos(t * 4 + pk.x * 3)) * 2.6), cy = sy - 4 + b;
    c.fillStyle = '#e8b923'; P.ellipse(c, sx, cy, rx, 2.6, 12); c.fillRect(Math.round(sx - rx + 1), Math.round(cy - 1), Math.max(1, Math.round(rx * 2 - 1)), 3);
    c.fillStyle = '#8a6a00'; P.ellipse(c, sx, cy, rx + 0.4, 3, 14);
    c.fillStyle = '#fff6c8'; c.fillRect(Math.round(sx - rx / 2), Math.round(cy - 1), 1, 1);
  } else if (pk.kind === 'tool') {
    c.fillStyle = '#f2b8c6'; c.fillRect(sx - 4, sy - 8 + b, 4, 4); c.fillStyle = '#cfe0f5'; c.fillRect(sx, sy - 8 + b, 4, 4);
    c.fillStyle = P.INK; P.poly(c, [[sx - 5, sy - 9 + b], [sx + 4, sy - 9 + b], [sx + 4, sy - 4 + b], [sx - 5, sy - 4 + b]], true);
  } else if (pk.kind === 'potion') {
    c.fillStyle = P.INK; P.circle(c, sx, sy - 4 + b, 3); P.line(c, sx, sy - 7 + b, sx, sy - 9 + b);
    c.fillStyle = '#d23a2a'; c.fillRect(sx - 2, sy - 4 + b, 5, 2);
  } else {
    const col = pk.kind === 'quest' ? '#e8a21a' : landColor;
    c.fillStyle = col; for (let k = 0; k < 4; k++) { const a = t * 2 + k * Math.PI / 2; c.fillRect(Math.round(sx + Math.cos(a) * 4), Math.round(sy - 6 + b + Math.sin(a) * 2), 1, 1); }
    c.fillStyle = P.INK; P.poly(c, [[sx - 3, sy - 4 + b], [sx, sy - 9 + b], [sx + 3, sy - 4 + b], [sx, sy - 2 + b]], true);
    c.fillStyle = col; c.fillRect(sx - 1, sy - 5 + b, 2, 2);
  }
}
