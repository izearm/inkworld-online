// อ้างอิงมอนสเตอร์จากแผนที่ที่อบแล้ว (ใช้ตรวจตอน boot และใน Editor)
import type { BakedMap } from './MapGeometry';
export function monsterRefsOf(maps: BakedMap[]) {
  const out: { file: string; path: string; monster: string }[] = [];
  for (const m of maps) {
    m.enemySpawns.forEach((e, i) => out.push({ file: 'maps/' + m.id, path: `enemySpawns.${i}`, monster: e.type }));
    if (m.bossSpawn) out.push({ file: 'maps/' + m.id, path: 'bossSpawn', monster: m.bossSpawn.type });
  }
  return out;
}
