import './play.css';
import Phaser from 'phaser';
import './engine';
import { PlayScene, playSize } from './scenes/PlayScene';
import { lanternCavePreview } from './engine/data/lanternCavePreview';

const params = new URLSearchParams(location.search);
const cavePreview = params.get('cave') === '1';
if (cavePreview) (window as any).PD_DATA.testmap = lanternCavePreview;

if (cavePreview || params.getAll('preview').includes('1')) {
  (window as any).PD.Save.disablePersistence();
}

// ปุ่มโหมดออนไลน์ที่หน้าแรก (ซิงก์ตัวละครกับบัญชีทำในหน้า online.html)
{ const UI = (window as any).PD.UI, orig = UI.showTitle;
  UI.showTitle = function (...a: any[]) { orig.apply(UI, a); const row = document.querySelector('#overlay .obtns'); if (row && !cavePreview) { const b = document.createElement('button'); b.id = 'ob-online'; b.textContent = 'ออนไลน์'; b.onclick = () => { location.href = './online.html'; }; row.appendChild(b); } }; }

const { W, H } = playSize((window as any).PD_DATA.config.lowResHeight);
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'stage', width: W, height: H, backgroundColor: '#f8f4ea',
  pixelArt: true, antialias: false, roundPixels: true, banner: false, disableContextMenu: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { powerPreference: 'high-performance' },
  scene: [new PlayScene(cavePreview)]
});
(window as any).__game = game;
