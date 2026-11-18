// วัตถุที่วาดด้วยโค้ดพิกเซล (procedural) → CanvasTexture ใบเดียวต่อ entity วาดทับซ้ำ (ไม่สร้าง texture ใหม่)
// ตำแหน่ง: วาง Image ที่ floor(iso) แล้วส่งเศษทศนิยมเข้าไปใน draw → พิกเซลเท่ากับต้นฉบับที่วาดตรงลง canvas
import Phaser from 'phaser';
import type { Ctx } from './pixel';

export class CanvasView {
  readonly tex: Phaser.Textures.CanvasTexture; readonly img: Phaser.GameObjects.Image; private ctx: Ctx;
  constructor(scene: Phaser.Scene, readonly key: string, readonly w: number, readonly h: number, readonly ax: number, readonly ay: number) {
    this.tex = scene.textures.createCanvas(key, w, h)!; this.ctx = this.tex.getContext();
    this.img = scene.add.image(0, 0, key).setOrigin(0, 0);
  }
  /** isoX/isoY = ตำแหน่งเท้าในพิกัด iso-pixel · fn วาดโดยถือว่าเท้าอยู่ที่ (sx,sy) ในผืนผ้าใบ */
  draw(isoX: number, isoY: number, depth: number, fn: (c: Ctx, sx: number, sy: number) => void) {
    const fx = Math.floor(isoX), fy = Math.floor(isoY);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.globalAlpha = 1;
    fn(this.ctx, this.ax + (isoX - fx), this.ay + (isoY - fy));
    this.tex.refresh();
    this.img.setPosition(fx - this.ax, fy - this.ay).setDepth(depth);
  }
  setVisible(v: boolean) { this.img.setVisible(v); return this; }
  destroy() { this.img.destroy(); this.tex.destroy(); }
}
