// Arena (dev) — เครื่องมือเทสบนเอนจินจริง (src/engine) · ไม่แตะเซฟจริง (Save ถูกสลับเป็นหน่วยความจำ)
// เปิด: npm run dev → http://localhost:5173/arena.html  · ทุกอย่างที่เห็นคือข้อมูล/บาลานซ์/แผนที่ของเกมจริง
import './play.css';
import Phaser from 'phaser';
import './engine';
import { PlayScene, playSize } from './scenes/PlayScene';
import { mountArenaPanel } from './arena/panel';

const w = window as any, PD = w.PD;
const { W, H } = playSize(w.PD_DATA.config.lowResHeight);
// เซฟแยก: เล่น/ทดสอบแค่ใน session นี้ ปิดแท็บแล้วหาย — ไม่ทับเซฟเกมจริง
PD.Save.disablePersistence();
// Game.boot() จบด้วย showTitle() → เปลี่ยนเป็นเริ่มสนามทดสอบทันที
PD.UI.showTitle = () => { PD.Game.newGame({ skipIntro: true }); mountArenaPanel(); };
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'stage', width: W, height: H, backgroundColor: '#f8f4ea',
  pixelArt: true, antialias: false, roundPixels: true, banner: false, disableContextMenu: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [PlayScene]
});
w.__game = game;
