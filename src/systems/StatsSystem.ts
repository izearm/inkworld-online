// ค่าสถานะอัตโนมัติ + ค่าจากอาวุธ — พอร์ตจาก legacy js/stats.js
import type { GameData } from '../data/loaders/loadGameData';
export interface Weapon { uid?: string; base: string; name: string; rarity: string; ilvl: number; min: number; max: number; affixes: { id: string; v: number }[] }
export interface PlayerProgress { cls: string; level: number; weapon: Weapon }
export function expNeed(d: GameData, L: number) { const c = d.balance.config.exp as { base: number; pow: number }; return Math.round(c.base * Math.pow(L, c.pow)); }
export function baseStats(d: GameData, L: number, cls: string) {
  const c = d.balance.classes[cls] as any; const o: Record<string, number> = {};
  for (const k in c.base) o[k] = Math.floor(c.base[k] + c.growth[k] * (L - 1));
  return o;
}
export function affixSum(d: GameData, w?: Weapon) {
  const s: Record<string, number> = {}; for (const a of d.loot.affixes) s[a.id] = 0;
  if (w) for (const a of w.affixes) s[a.id] += a.v;
  return s;
}
export function derive(d: GameData, p: PlayerProgress) {
  const c = d.balance.classes[p.cls] as any, b = baseStats(d, p.level, p.cls), w = p.weapon;
  const base = d.items.get(w.base); if (!base || base.type !== 'weapon') throw new Error('weapon base ไม่มี: ' + w.base);
  const a = affixSum(d, w), cfg = d.balance.config as any;
  const strMul = 1 + b.STR * c.atkPerStr;
  const r = {
    ...b, maxHp: Math.round(c.hpBase + b.VIT * c.hpPerVit + a.hp), maxInk: Math.round(c.inkBase + b.INT * c.inkPerInt + a.ink),
    inkRegen: c.inkRegen + b.INT * c.inkRegenPerInt + a.regen, def: b.VIT * c.defPerVit + a.def, dmgReduce: 0,
    crit: Math.min(0.75, c.critBase + b.AGI * c.critPerAgi + a.crit / 100), critMult: c.critMult as number,
    aspd: 1 + a.aspd / 100, move: 1 + a.move / 100 + b.AGI * c.movePerAgi, atkPct: a.atkPct, skillPct: a.skillPct, leech: a.leech / 100,
    elem: { fire: a.fire, ice: a.ice, bolt: a.bolt }, wmin: w.min, wmax: w.max, wspeed: 0, range: base.range, arc: base.arc,
    shape: base.visual.type === 'procedural' ? base.visual.shape : 'sword', physPower: 0, magicPower: 0, strMul, aps: 0, dps: 0
  };
  r.dmgReduce = r.def / (r.def + c.defK); r.wspeed = base.speed * r.aspd;
  r.physPower = (w.min + w.max) / 2 * strMul * (1 + a.atkPct / 100);
  r.magicPower = (c.magicBase + b.INT * c.magicPerInt + base.magic * (1 + (w.ilvl - 1) * 0.3)) * (1 + a.skillPct / 100);
  r.aps = r.wspeed / cfg.attackTime;
  r.dps = (r.physPower + a.fire + a.ice + a.bolt) * r.aps * (1 + r.crit * (r.critMult - 1));
  return r;
}
