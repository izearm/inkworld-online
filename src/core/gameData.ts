// โหลดข้อมูลเกมที่ bundle มากับ Vite + ตรวจด้วย schema/อ้างอิงข้ามไฟล์ (รวมอ้างอิงจากแผนที่ทั้ง 21) ตอน boot
import monsters from '../data/definitions/monsters.json';
import items from '../data/definitions/items.json';
import npcs from '../data/definitions/npcs.json';
import quests from '../data/definitions/quests.json';
import lands from '../data/definitions/lands.json';
import dialogue from '../data/definitions/dialogue.json';
import loot from '../data/definitions/loot.json';
import balance from '../data/definitions/balance.json';
import { loadGameData, type RawData, type LoadResult } from '../data/loaders/loadGameData';
import { monsterRefsOf } from '../maps/mapRefs';
import type { BakedMap } from '../maps/MapGeometry';

const mapModules = import.meta.glob('../maps/*_[0-2].json', { eager: true, import: 'default' }) as Record<string, BakedMap>;
export const bakedMaps: Map<string, BakedMap> = new Map(Object.values(mapModules).map(m => [m.id, m]));

/** hybrid: ทดลองสลับ blob เป็น PNG (?hybrid=1) · ไฟล์ที่ไม่มี (?hybrid=missing → ทดสอบ fallback) · ข้อมูลผิด (?hybrid=invalid → ทดสอบจอแจ้งข้อผิดพลาด) — ผ่าน schema เหมือนข้อมูลจริง */
export function loadAll(hybrid: string | null): LoadResult {
  const raw: any = { monsters: structuredClone(monsters), items, npcs, quests, lands, dialogue, loot, balance };
  if (hybrid) {
    const blob = raw.monsters.items.find((m: any) => m.id === 'blob');
    blob.visual = hybrid === 'invalid' ? { type: 'sprite', textureKey: 'x', file: 'evil.exe' } : hybrid === 'missing'
      ? { type: 'sprite', textureKey: 'blob_missing', file: 'monsters/does_not_exist.png', frameWidth: 24, frameHeight: 22, origin: { x: 0.5, y: 19 / 22 }, offset: { x: 0, y: 0 }, scale: 1, floatPx: 0, anims: { idle: { frames: [0, 1, 2, 3], fps: 6, loop: true } } }
      : { type: 'sprite', textureKey: 'blob_test', file: 'monsters/blob_test.png', frameWidth: 24, frameHeight: 22, origin: { x: 0.5, y: 19 / 22 }, offset: { x: 0, y: 0 }, scale: 1, floatPx: 0, anims: { idle: { frames: [0, 1, 2, 3], fps: 6, loop: true }, move: { frames: [0, 1, 2, 3], fps: 10, loop: true } } };
  }
  return loadGameData(raw as RawData, monsterRefsOf([...bakedMaps.values()]));
}
