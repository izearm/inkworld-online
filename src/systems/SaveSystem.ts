// Save/Load มีเวอร์ชัน + migration + สำรอง · ไม่เขียนทับเซฟที่เสียเอง (R-02, R-03)
import { z } from 'zod';
export const SAVE_KEY = 'paperdungeon_inkworld_save_v1'; // คีย์เดิมของ legacy → เซฟเก่าในเบราว์เซอร์ใช้ต่อได้
export const SAVE_VERSION = 2;
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

const WeaponS = z.object({ base: z.string(), name: z.string(), rarity: z.string(), ilvl: z.number(), min: z.number(), max: z.number(), affixes: z.array(z.object({ id: z.string(), v: z.number() })) }).passthrough();
export const SaveV2 = z.object({
  saveVersion: z.literal(2),
  player: z.object({ cls: z.string(), level: z.number().int().min(1), exp: z.number().min(0), hp: z.number(), ink: z.number(), weapon: WeaponS, inventory: z.array(WeaponS),
    potions: z.number().int().min(0), skills: z.record(z.string(), z.number().int()), slots: z.array(z.string().nullable()).length(3), skillPoints: z.number().int().min(0), lumi: z.number().min(0) }).strict(),
  lands: z.record(z.string(), z.object({ placed: z.tuple([z.number().int(), z.number().int()]), placement: z.enum(['home', 'warm', 'normal', 'strange']), completed: z.boolean() })),
  pendingPages: z.array(z.string()), quests: z.record(z.string(), z.object({ step: z.number().int(), cnt: z.number().int(), talked: z.record(z.string(), z.boolean()), done: z.boolean() })),
  questItems: z.record(z.string(), z.boolean()), used: z.record(z.string(), z.number()), bosses: z.record(z.string(), z.boolean()), hints: z.record(z.string(), z.number()),
  tools: z.record(z.string(), z.boolean()), loc: z.object({ land: z.string(), map: z.number().int().min(0).max(2) }),
  playTime: z.number().min(0), ended: z.boolean(), kills: z.number().int().min(0), deaths: z.number().int().min(0)
}).strict();
export type SaveData = z.infer<typeof SaveV2>;

/** v1 (legacy v1.0.0–1.0.3: มี `v:1`, อาจไม่มี lumi/tools) → v2 */
export function migrateSave(raw: any): SaveData {
  let s = JSON.parse(JSON.stringify(raw));
  const ver = s.saveVersion ?? s.v ?? 1;
  if (ver === 1) {
    delete s.v; s.saveVersion = 2;
    s.player.lumi = s.player.lumi ?? 0; s.tools = s.tools ?? {};
    s.kills = s.kills ?? 0; s.deaths = s.deaths ?? 0; s.ended = !!s.ended;
  }
  return SaveV2.parse(s);
}
export type ReadResult =
  | { status: 'none' } | { status: 'ok'; data: SaveData; migratedFrom?: number }
  | { status: 'corrupt'; error: string } | { status: 'future'; version: number };

export function readSave(kv: KV): ReadResult {
  const txt = kv.getItem(SAVE_KEY); if (!txt) return { status: 'none' };
  let raw: any;
  try { raw = JSON.parse(txt); } catch (e) { return { status: 'corrupt', error: 'JSON เสีย: ' + (e as Error).message }; }
  const ver = raw?.saveVersion ?? raw?.v;
  if (typeof ver !== 'number') return { status: 'corrupt', error: 'ไม่มีเลขเวอร์ชันเซฟ' };
  if (ver > SAVE_VERSION) return { status: 'future', version: ver };
  try {
    const data = migrateSave(raw);
    if (ver < SAVE_VERSION) { const bk = `${SAVE_KEY}.backup.v${ver}`; if (!kv.getItem(bk)) kv.setItem(bk, txt); return { status: 'ok', data, migratedFrom: ver }; }
    return { status: 'ok', data };
  } catch (e) { return { status: 'corrupt', error: e instanceof z.ZodError ? e.issues.slice(0, 3).map(i => i.path.join('.') + ': ' + i.message).join('; ') : String(e) }; }
}
/** เขียนเซฟ: ตรวจก่อนเขียน, เก็บเซฟก่อนหน้าไว้ที่ .prev, ไม่ทับเซฟเสีย/เวอร์ชันใหม่กว่าเว้นแต่ผู้เล่นยืนยัน */
export function writeSave(kv: KV, data: SaveData, opts: { overwriteBroken?: boolean } = {}): { ok: true } | { ok: false; reason: string } {
  const v = SaveV2.safeParse(data); if (!v.success) return { ok: false, reason: 'ข้อมูลเซฟไม่ผ่าน schema: ' + v.error.issues[0].message };
  const prev = kv.getItem(SAVE_KEY);
  if (prev) {
    const st = readSave(kv);
    if ((st.status === 'corrupt' || st.status === 'future') && !opts.overwriteBroken) return { ok: false, reason: 'เซฟเดิม ' + st.status + ' — ต้องให้ผู้เล่นยืนยันก่อนเขียนทับ' };
    if (st.status === 'ok') kv.setItem(SAVE_KEY + '.prev', prev);
  }
  kv.setItem(SAVE_KEY, JSON.stringify(v.data));
  return { ok: true };
}
