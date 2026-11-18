// Shared data schemas — ใช้ร่วมกันระหว่างเกมและ Data Editor (แหล่งความจริงเดียว)
import { z } from 'zod';

export const SCHEMA_VERSION = 1;
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'ID ต้องเป็น a-z, A-Z, 0-9, _ และขึ้นต้นด้วยตัวอักษร (ID เดิมบางตัวเป็น camelCase เช่น atkPct)');
const color = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);
const num = (min = 0) => z.number().finite().min(min);

// ---------- Visual (แยกจาก logic: เปลี่ยน procedural ↔ PNG ได้โดยไม่แตะ hitbox) ----------
export const PROCEDURAL_SHAPES = ['human', 'hero', 'knight', 'demon', 'alien', 'eraser', 'mermaid', 'monster', 'slime', 'bird', 'book', 'ghost', 'jelly', 'kraken', 'eraserbit', 'tree', 'nib', 'sword', 'dagger', 'axe', 'spear', 'staff'] as const; // 5 ตัวท้าย = รูปอาวุธ
export const ANIM_STATES = ['idle', 'move', 'attack', 'windup', 'hurt'] as const;
export const ProceduralVisual = z.object({
  type: z.literal('procedural'),
  shape: z.enum(PROCEDURAL_SHAPES),
  scale: num(0.1).default(1),
  flags: z.record(z.string(), z.boolean()).default({}),
  floatPx: num().default(0),
  dashed: z.boolean().default(false)
}).strict();
export const SpriteVisual = z.object({
  type: z.literal('sprite'),
  textureKey: id,
  file: z.string().regex(/^[\w\-/]+\.png$/, 'ต้องเป็นไฟล์ .png ใน public/assets'),
  frameWidth: z.number().int().positive().optional(),
  frameHeight: z.number().int().positive().optional(),
  origin: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).default({ x: 0.5, y: 1 }), // เท้า = ล่างกลาง
  offset: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  scale: num(0.01).default(1),
  floatPx: num().default(0),
  anims: z.record(z.enum(ANIM_STATES), z.object({ frames: z.array(z.number().int().min(0)).min(1), fps: num(1).default(8), loop: z.boolean().default(true) })).default({})
}).strict();
export const VisualDef = z.discriminatedUnion('type', [ProceduralVisual, SpriteVisual]);
export type VisualDef = z.infer<typeof VisualDef>;

// ---------- Monster ----------
export const BOSS_PATTERNS = ['slam', 'ring', 'summon', 'charge'] as const;
export const Monster = z.object({
  id, name: z.string().min(1), title: z.string().optional(),
  kind: z.enum(['melee', 'caster']), boss: z.boolean().default(false),
  size: num(0.1),            // ตัวคูณ hitbox (radius = 0.3*size) — ไม่ขึ้นกับภาพ
  hp: num(1), atk: num(0), speed: num(0), aggro: num(0), range: num(0.1),
  windup: num(0), cd: num(0), exp: num(0),
  projColor: color.optional(), projSpeed: num(0).optional(),
  patterns: z.array(z.enum(BOSS_PATTERNS)).optional(), patternCd: num(0.1).optional(),
  summon: id.optional(), persuadeAt: z.number().min(0).max(1).optional(),
  drops: z.object({ weaponChance: z.number().min(0).max(1).optional(), potionChance: z.number().min(0).max(1).optional(), lumiMult: num().optional() }).strict().optional(),
  visual: VisualDef
}).strict().superRefine((m, ctx) => {
  if (m.kind === 'caster' && (m.projSpeed === undefined || !m.projColor)) ctx.addIssue({ code: 'custom', message: 'caster ต้องมี projColor และ projSpeed', path: ['projSpeed'] });
  if (m.boss && (!m.patterns || !m.patterns.length || !m.patternCd)) ctx.addIssue({ code: 'custom', message: 'บอสต้องมี patterns และ patternCd', path: ['patterns'] });
  if (m.patterns?.includes('summon') && !m.summon) ctx.addIssue({ code: 'custom', message: "ท่า summon ต้องระบุ summon", path: ['summon'] });
});
export type Monster = z.infer<typeof Monster>;

// ---------- Item ----------
export const WeaponItem = z.object({
  id, type: z.literal('weapon'), name: z.string().min(1),
  min: num(0), max: num(0), speed: num(0.1), range: num(0.1), arc: z.number().min(1).max(360), magic: num(),
  visual: VisualDef
}).strict().refine(w => w.max >= w.min, { message: 'max ต้อง ≥ min', path: ['max'] });
export const QuestItem = z.object({ id, type: z.literal('quest'), name: z.string().min(1), desc: z.string().default('') }).strict();
export const Item = z.union([WeaponItem, QuestItem]);
export type Item = z.infer<typeof Item>;

export const Affix = z.object({ id, word: z.string(), text: z.string().includes('{v}'), min: num(), max: num(), lvl: num(), elem: z.enum(['fire', 'ice', 'bolt', 'ink']).optional() }).strict();
export const Rarity = z.object({ id, name: z.string(), color, affixes: z.tuple([z.number().int().min(0), z.number().int().min(0)]), weight: num(), dmgMult: num(0.1) }).strict();
export const LootTables = z.object({
  weaponScalePerLevel: num(), rarities: z.array(Rarity).min(1), affixes: z.array(Affix).min(1),
  legendaryNames: z.array(z.string()).min(1), elemColors: z.record(z.string(), color),
  starterWeapon: z.object({ base: id, name: z.string(), rarity: id, ilvl: z.number().int().min(1), affixes: z.array(z.any()) }).strict()
}).strict();

// ---------- NPC / Dialogue / Quest ----------
export const Npc = z.object({
  id, name: z.string(), landId: id, pos: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  dialogue: z.object({ idle: id, done: id }).strict(), requires: id.optional(), visual: VisualDef
}).strict();
export const DialogueLine = z.tuple([z.string(), z.string().min(1)]);
export const QuestStep = z.discriminatedUnion('t', [
  z.object({ t: z.literal('talk'), npc: id, dlg: id, text: z.string() }).strict(),
  z.object({ t: z.literal('talkMany'), npcs: z.array(id).min(1), dlg: z.record(id, id), text: z.string() }).strict(),
  z.object({ t: z.literal('item'), item: id, text: z.string() }).strict(),
  z.object({ t: z.literal('kill'), target: id, text: z.string() }).strict(),
  z.object({ t: z.literal('collect'), item: id, count: z.number().int().min(1), text: z.string() }).strict(),
  z.object({ t: z.literal('ending'), text: z.string() }).strict()
]);
export const Quest = z.object({
  id, landId: id, type: z.enum(['main', 'side']), name: z.string(), steps: z.array(QuestStep).min(1),
  reward: z.object({ exp: num().default(0), page: id.optional(), weapon: id.optional() }).strict()
}).strict();

// ---------- Land (ข้อมูลดินแดน + อ้างอิงแผนที่ที่อบแล้ว) ----------
export const Land = z.object({
  id, order: z.number().int().min(0), name: z.string(), mood: z.string(), story: z.string(), puzzleText: z.string(),
  theme: z.enum(['village', 'cave', 'library', 'field', 'castle', 'sea', 'tree']), baseLevel: z.number().int().min(1), color,
  mainQuest: id, sideQuest: id, sideItem: id, nextPage: id.nullable(), maps: z.array(id).length(3)
}).strict();

// ---------- ไฟล์ข้อมูล (มี revision กันเขียนทับเวอร์ชันใหม่กว่า) ----------
export const fileOf = <T extends z.ZodTypeAny>(item: T) => z.object({ schemaVersion: z.literal(SCHEMA_VERSION), revision: z.number().int().min(1), items: z.array(item) }).strict();
export const DATA_FILES = {
  monsters: fileOf(Monster), items: fileOf(Item), npcs: fileOf(Npc), quests: fileOf(Quest), lands: fileOf(Land)
} as const;
export type DataFileName = keyof typeof DATA_FILES;
export const DialogueFile = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), revision: z.number().int().min(1), entries: z.record(id, z.array(DialogueLine).min(1)), hints: z.record(id, z.string()) }).strict();
export const LootFile = LootTables.extend({ schemaVersion: z.literal(SCHEMA_VERSION), revision: z.number().int().min(1) });
// balance: ตัวเลขระบบจาก config.js + อาชีพ — ตรวจโครงหลัก ปล่อยคีย์เสริมได้
export const BalanceFile = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION), revision: z.number().int().min(1),
  config: z.object({ playerSpeed: num(0.1), playerRadius: num(0.05), attackTime: num(0.05), tileW: z.number().int(), tileH: z.number().int(), cameraSmooth: num(), cameraRecenter: num(), cameraDeadX: num(), cameraDeadY: num() }).passthrough(),
  classes: z.record(id, z.object({ name: z.string(), base: z.record(z.string(), z.number()), growth: z.record(z.string(), z.number()) }).passthrough()),
  startPlayer: z.object({ cls: id, level: z.number().int(), skills: z.record(id, z.number().int()), slots: z.array(id.nullable()).length(3), skillPoints: z.number().int() }).strict(),
  skillCats: z.record(id, z.object({ name: z.string(), slot: z.number().int() })),
  skills: z.array(z.object({ id, cat: id, name: z.string(), kind: id, power: z.array(z.number()).min(1) }).passthrough()),
  statNames: z.record(z.string(), z.string())
}).strict();
