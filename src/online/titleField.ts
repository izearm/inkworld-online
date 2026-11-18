// หน้าแรก: ลานกระดาษขาว · ต้นหมึกโบราณกิ่งดำไม่มีใบอยู่กลางลาน
// เดินเข้าใกล้ต้นไม้ → ป๊อปอัป (เข้าเกม / เข้าชม / เร็วๆ นี้) · เดินออกห่าง → จอค่อยๆ มืด · เกินขอบ → เดินต่อไม่ได้
import { TITLE_FIELD, TITLE_TREE, TITLE_LIMIT } from './onlineData';

const W = () => window as any;
const PD = () => W().PD;
const POP_R = 2.3, TRUNK_R = 0.55;

export type TitleMenu = { html: string; bind: (root: HTMLElement) => void } | null;

export class TitleField {
  active = false;
  near = false;
  pinned = false;                 // ฟอร์ม login/ตั้งชื่อเปิดอยู่ → ไม่ซ่อนป๊อปอัปแม้เดินออก
  dark = 0;
  private darkEl: HTMLDivElement;
  private pop: HTMLDivElement;
  private menu: () => TitleMenu;

  constructor(menu: () => TitleMenu) {
    this.menu = menu;
    const root = document.getElementById('game')!;
    this.darkEl = document.createElement('div'); this.darkEl.id = 'title-dark'; root.appendChild(this.darkEl);
    this.pop = document.createElement('div'); this.pop.id = 'tree-pop'; this.pop.className = 'hidden'; root.appendChild(this.pop);
  }

  /** เข้าลาน: ตัวละครชั่วคราว (ยังไม่ผูกบัญชี) หรือตัวจริง (ถ้าส่ง save มา) */
  start(save?: any) {
    const G = PD().Game, UI = PD().UI;
    G.S = save ? JSON.parse(JSON.stringify(save)) : G.freshSave(); G.stats = {}; G.mapCache = {};
    G.initPlayer(!!save);
    G.loadMap(TITLE_FIELD, 0, 'world');
    G.npcs = []; G.map.blankFloor = true; G.rebuildFloor();
    G.state = 'play'; UI.hideOverlay(); UI.showHud(true);
    document.body.classList.add('title-mode');
    G.drawExtra = (h: any) => this.drawTree(h);
    this.active = true; this.near = false; this.pinned = false; this.setDark(0); this.hidePop();
  }
  stop() {
    const G = PD().Game;
    this.active = false; this.pinned = false; this.hidePop(); this.setDark(0);
    document.body.classList.remove('title-mode'); G.drawExtra = null;
  }

  tick() {
    if (!this.active) return;
    const G = PD().Game, pl = G.player; if (!pl || G.land?.id !== TITLE_FIELD) return;
    let dx = pl.x - TITLE_TREE.x, dy = pl.y - TITLE_TREE.y, d = Math.hypot(dx, dy) || 0.001;
    if (d > TITLE_LIMIT.darkR) { pl.x = TITLE_TREE.x + dx / d * TITLE_LIMIT.darkR; pl.y = TITLE_TREE.y + dy / d * TITLE_LIMIT.darkR; d = TITLE_LIMIT.darkR; }  // ขอบลาน
    if (d < TRUNK_R) { pl.x = TITLE_TREE.x + dx / d * TRUNK_R; pl.y = TITLE_TREE.y + dy / d * TRUNK_R; d = TRUNK_R; }                                         // ลำต้นทึบ
    const k = Math.max(0, Math.min(1, (d - TITLE_LIMIT.lightR) / (TITLE_LIMIT.darkR - TITLE_LIMIT.lightR)));
    this.setDark(Math.pow(k, 1.3) * 0.94);
    const near = d < POP_R;
    if (near && !this.near) this.showPop();
    else if (!near && this.near && !this.pinned) this.hidePop();
    this.near = near;
  }
  setDark(v: number) { this.dark = v; this.darkEl.style.opacity = v.toFixed(3); }

  /** วาดเนื้อหาป๊อปอัปใหม่ (เมนู/ฟอร์ม) */
  render() { const m = this.menu(); if (!m) return this.hidePop(); this.pop.innerHTML = '<div class="tp-box sketch">' + m.html + '</div>'; this.pop.classList.remove('hidden'); m.bind(this.pop); }
  showPop() { this.render(); }
  hidePop() { this.pop.classList.add('hidden'); this.pop.innerHTML = ''; }

  // ---------- ต้นหมึกโบราณ: กิ่งดำแตกแขนง ไม่มีใบ (สุ่มแบบตายตัว ไหวเล็กน้อยที่ปลายกิ่ง) ----------
  private drawTree(h: any) {
    if (!this.active) return;
    const s = h.scr(TITLE_TREE.x, TITLE_TREE.y);
    h.ent(TITLE_TREE.x + TITLE_TREE.y, () => {
      const c: CanvasRenderingContext2D = h.c, P = PD().P, t = h.t;
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      c.fillStyle = 'rgba(27,27,27,0.18)'; P.ellipse(c, s.x, s.y + 1, 16, 6, 40);
      c.fillStyle = '#1b1b1b';
      const branch = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
        const sway = depth >= 3 ? Math.sin(t * 1.3 + depth + x * 0.07) * 0.05 * depth : 0;
        const a = ang + sway, x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
        for (let k = 0; k < w; k++) P.line(c, Math.round(x + k - (w >> 1)), Math.round(y), Math.round(x1 + (k - (w >> 1)) * 0.5), Math.round(y1));
        if (depth >= 5 || len < 4) { if (rnd() < 0.5) c.fillRect(Math.round(x1), Math.round(y1) - 1, 1, 2); return; }   // ปลายกิ่งงอเป็นตะขอ
        const n = depth < 2 ? 3 : 2;
        for (let i = 0; i < n; i++) branch(x1, y1, a + (i - (n - 1) / 2) * (0.45 + rnd() * 0.3) + (rnd() - 0.5) * 0.25, len * (0.62 + rnd() * 0.18), Math.max(1, w - 1), depth + 1);
      };
      for (const r of [-0.9, -0.4, 0.35, 0.85]) P.line(c, s.x, s.y - 2, Math.round(s.x + r * 14), Math.round(s.y + 2 + Math.abs(r) * 2));   // ราก
      branch(s.x, s.y, -Math.PI / 2, 26, 4, 0);
    });
  }
}
