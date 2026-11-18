// PlayScene — ฉากเล่นจริง: Phaser ดูแล ลูปเกม / การย่อขยายจอ / texture ของภาพ · ลอจิก+ตัววาดเป็นของ v1.1.2 (src/engine)
// Render.frame วาดฉากพิกเซลลงผืนผ้าใบ buf แล้วนำขึ้นจอเป็น CanvasTexture (กล้องเลื่อนเศษพิกเซลด้วย CSS เหมือนเดิม)
import Phaser from 'phaser';
import { lowRes } from '../core/layout';

const PD = () => (window as any).PD;
export class PlayScene extends Phaser.Scene {
  private buf!: HTMLCanvasElement; private tex!: Phaser.Textures.CanvasTexture; private img!: Phaser.GameObjects.Image; private shiftEl?: HTMLElement;
  constructor(private readonly cavePreview = false) { super('Play'); }

  create() {
    const pd = PD(); this.buf = document.createElement('canvas'); this.shiftEl = this.game.canvas;
    pd.Render.onFilter = (f: string) => { const c = this.game.canvas; if (c.style.filter !== f) c.style.filter = f; };
    pd.Render.onShift = (_x: number, _y: number, tr: string) => { if (this.shiftEl && this.shiftEl.style.transform !== tr) this.shiftEl.style.transform = tr; };
    pd.Game.boot(this.buf);                       // Render.init(buf) → ขนาด buf ตามจอ · Input/UI/Sound เริ่มทำงาน
    if (this.cavePreview) {
      pd.Game.newGame({ skipIntro: true });
      pd.Game.travel('testmap');
    }
    this.makeTexture();
    const onResize = () => { pd.Render.resize(); this.scale.setGameSize(pd.Render.W, pd.Render.H); this.makeTexture(); };
    window.addEventListener('resize', onResize); window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
    this.events.once('shutdown', () => window.removeEventListener('resize', onResize));
    (window as any).__play = { scene: this, tex: () => this.tex };
  }
  private makeTexture() {
    const buf = this.buf; if (this.textures.exists('pd_view')) this.textures.remove('pd_view');
    this.tex = this.textures.addCanvas('pd_view', buf)!;
    if (!this.img) this.img = this.add.image(0, 0, 'pd_view').setOrigin(0, 0); else this.img.setTexture('pd_view');
    this.img.setDisplaySize(buf.width, buf.height);
  }
  update(_t: number, delta: number) {
    const pd = PD(), G = pd.Game;
    if (!G.testMode) G.frame(delta / 1000);       // โหมดทดสอบ (?test=1): ทดสอบสั่งก้าวเองด้วย G.step
    if (this.img.width !== this.buf.width || this.img.height !== this.buf.height) this.makeTexture();
    if (G.map) this.tex.refresh();
  }
}
export const playSize = (lowResHeight: number) => lowRes(window.innerWidth || 844, window.innerHeight || 390, lowResHeight);
