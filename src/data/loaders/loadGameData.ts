// โหลด + ตรวจข้อมูลเกมตอน boot (schema + ID ซ้ำ + อ้างอิงข้ามไฟล์) — Editor ใช้ฟังก์ชันเดียวกัน
import { z } from 'zod';
import { DATA_FILES, DialogueFile, LootFile, BalanceFile, Monster, Item, Npc, Quest, Land } from '../schemas';
export interface RawData { monsters: unknown; items: unknown; npcs: unknown; quests: unknown; lands: unknown; dialogue: unknown; loot: unknown; balance: unknown }
export interface GameData {
  monsters: Map<string, z.infer<typeof Monster>>; items: Map<string, z.infer<typeof Item>>; npcs: Map<string, z.infer<typeof Npc>>;
  quests: Map<string, z.infer<typeof Quest>>; lands: Map<string, z.infer<typeof Land>>;
  dialogue: z.infer<typeof DialogueFile>; loot: z.infer<typeof LootFile>; balance: z.infer<typeof BalanceFile>;
}
export interface DataIssue { file: string; path: string; message: string }
export type LoadResult = { ok: true; data: GameData; issues: [] } | { ok: false; issues: DataIssue[] };

const zIssues = (file: string, e: z.ZodError): DataIssue[] => e.issues.map(i => ({ file, path: i.path.join('.'), message: i.message }));

/** extraRefs: อ้างอิงจากแผนที่ที่อบแล้ว (เช่น enemySpawns) เพื่อกันลบมอนสเตอร์ที่แผนที่ใช้อยู่ */
export function loadGameData(raw: RawData, extraRefs: { file: string; path: string; monster: string }[] = []): LoadResult {
  const issues: DataIssue[] = [];
  const parsed: Record<string, any> = {};
  for (const name of Object.keys(DATA_FILES) as (keyof typeof DATA_FILES)[]) {
    const r = DATA_FILES[name].safeParse(raw[name]);
    if (!r.success) issues.push(...zIssues(name, r.error)); else parsed[name] = r.data;
  }
  for (const [name, sch] of [['dialogue', DialogueFile], ['loot', LootFile], ['balance', BalanceFile]] as const) {
    const r = (sch as z.ZodTypeAny).safeParse(raw[name]);
    if (!r.success) issues.push(...zIssues(name, r.error)); else parsed[name] = r.data;
  }
  if (issues.length) return { ok: false, issues };
  const maps: Record<string, Map<string, any>> = {};
  for (const name of Object.keys(DATA_FILES)) {
    maps[name] = new Map();
    parsed[name].items.forEach((it: { id: string }, i: number) => {
      if (maps[name].has(it.id)) issues.push({ file: name, path: `items.${i}.id`, message: `ID ซ้ำ: ${it.id}` });
      maps[name].set(it.id, it);
    });
  }
  issues.push(...checkRefs(maps, parsed.dialogue, parsed.loot));
  for (const r of extraRefs) if (!maps.monsters.has(r.monster)) issues.push({ file: r.file, path: r.path, message: `อ้างถึง monster "${r.monster}" ที่ไม่มีอยู่` });
  if (issues.length) return { ok: false, issues };
  return { ok: true, issues: [], data: { ...(maps as any), dialogue: parsed.dialogue, loot: parsed.loot, balance: parsed.balance } };
}

/** ตรวจอ้างอิงข้ามไฟล์ (ใช้ใน Editor ก่อนบันทึกด้วย) */
export function checkRefs(m: Record<string, Map<string, any>>, dialogue: { entries: Record<string, unknown> }, loot: { rarities: { id: string }[] }): DataIssue[] {
  const out: DataIssue[] = [];
  const need = (file: string, path: string, kind: string, id: string | null | undefined, ok: boolean) => { if (id && !ok) out.push({ file, path, message: `อ้างถึง ${kind} "${id}" ที่ไม่มีอยู่` }); };
  const rar = new Set(loot.rarities.map(r => r.id));
  m.monsters.forEach((mo, id) => need('monsters', `${id}.summon`, 'monster', mo.summon, !mo.summon || m.monsters.has(mo.summon)));
  m.npcs.forEach((n, id) => {
    need('npcs', `${id}.landId`, 'land', n.landId, m.lands.has(n.landId));
    need('npcs', `${id}.dialogue.idle`, 'dialogue', n.dialogue.idle, n.dialogue.idle in dialogue.entries);
    need('npcs', `${id}.dialogue.done`, 'dialogue', n.dialogue.done, n.dialogue.done in dialogue.entries);
    need('npcs', `${id}.requires`, 'quest', n.requires, !n.requires || m.quests.has(n.requires));
  });
  m.quests.forEach((q, id) => {
    need('quests', `${id}.landId`, 'land', q.landId, m.lands.has(q.landId));
    need('quests', `${id}.reward.page`, 'land', q.reward.page, !q.reward.page || m.lands.has(q.reward.page));
    need('quests', `${id}.reward.weapon`, 'rarity', q.reward.weapon, !q.reward.weapon || rar.has(q.reward.weapon));
    q.steps.forEach((s: any, i: number) => {
      const p = `${id}.steps.${i}`;
      if (s.npc) need('quests', p + '.npc', 'npc', s.npc, m.npcs.has(s.npc));
      if (s.npcs) s.npcs.forEach((n: string) => need('quests', p + '.npcs', 'npc', n, m.npcs.has(n)));
      if (typeof s.dlg === 'string') need('quests', p + '.dlg', 'dialogue', s.dlg, s.dlg in dialogue.entries);
      if (s.dlg && typeof s.dlg === 'object') Object.values(s.dlg).forEach((d: any) => need('quests', p + '.dlg', 'dialogue', d, d in dialogue.entries));
      if (s.item) need('quests', p + '.item', 'item', s.item, m.items.has(s.item));
      if (s.target) need('quests', p + '.target', 'monster', s.target, m.monsters.has(s.target));
    });
  });
  m.lands.forEach((l, id) => {
    need('lands', `${id}.mainQuest`, 'quest', l.mainQuest, m.quests.has(l.mainQuest));
    need('lands', `${id}.sideQuest`, 'quest', l.sideQuest, m.quests.has(l.sideQuest));
    need('lands', `${id}.sideItem`, 'item', l.sideItem, m.items.has(l.sideItem));
    need('lands', `${id}.nextPage`, 'land', l.nextPage, !l.nextPage || m.lands.has(l.nextPage));
  });
  return out;
}
