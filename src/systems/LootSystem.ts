// สุ่มอาวุธแบบ Diablo — พอร์ตจาก legacy js/loot.js (rng ฉีดเข้ามา → ทดสอบซ้ำได้)
import type { GameData } from '../data/loaders/loadGameData';
import type { Weapon } from './StatsSystem';
import { pick, randInt, shuffle, type Rng } from './rng';
let uidN = 1;
export const weaponBases = (d: GameData) => [...d.items.values()].filter(i => i.type === 'weapon');
export function rollRarity(d: GameData, rng: Rng, lootMult = 1, minRarity?: string): string {
  const R = d.loot.rarities, minI = minRarity ? R.findIndex(r => r.id === minRarity) : 0;
  const ws = R.map((r, i) => (i < minI ? 0 : r.weight * Math.pow(lootMult, i * 0.8)));
  let t = rng() * ws.reduce((s, v) => s + v, 0);
  for (let i = 0; i < R.length; i++) { t -= ws[i]; if (t <= 0) return R[i].id; }
  return R[R.length - 1].id;
}
export function makeWeapon(d: GameData, baseId: string, rarityId: string, ilvl: number, rng: Rng, fixedName?: string): Weapon {
  const b = d.items.get(baseId), r = d.loot.rarities.find(x => x.id === rarityId);
  if (!b || b.type !== 'weapon' || !r) throw new Error(`weapon/rarity ไม่มี: ${baseId}/${rarityId}`);
  const scale = 1 + d.loot.weaponScalePerLevel * (ilvl - 1);
  const n = randInt(rng, r.affixes[0], r.affixes[1]);
  const pool = shuffle(rng, d.loot.affixes.slice()).slice(0, n);
  const affixes = pool.map(a => ({ id: a.id, v: Math.max(1, Math.round(a.min + rng() * (a.max - a.min) + a.lvl * ilvl)) }));
  const w: Weapon = { uid: 'w' + Date.now().toString(36) + uidN++, base: baseId, rarity: rarityId, ilvl, name: '',
    min: Math.max(1, Math.round(b.min * scale * r.dmgMult)), max: Math.max(2, Math.round(b.max * scale * r.dmgMult)), affixes };
  if (w.max <= w.min) w.max = w.min + 1;
  const word = (id: string) => d.loot.affixes.find(a => a.id === id)!.word;
  if (fixedName) w.name = fixedName;
  else if (rarityId === 'legend') w.name = pick(rng, d.loot.legendaryNames);
  else if (rarityId === 'normal') w.name = b.name;
  else if (rarityId === 'magic') w.name = b.name + word(affixes[0].id);
  else w.name = b.name + word(affixes[0].id) + ' แห่ง' + word(affixes[1].id);
  return w;
}
export function rollWeapon(d: GameData, ilvl: number, rng: Rng, lootMult = 1, minRarity?: string): Weapon {
  const b = pick(rng, weaponBases(d)).id;
  return makeWeapon(d, b, rollRarity(d, rng, lootMult, minRarity), Math.max(1, ilvl), rng);
}
export function starterWeapon(d: GameData): Weapon { const s = d.loot.starterWeapon; return makeWeapon(d, s.base, s.rarity, s.ilvl, () => 0.5, s.name); }
