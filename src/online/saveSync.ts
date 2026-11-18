// เซฟร่วมออฟไลน์/ออนไลน์ — เซิร์ฟเวอร์เป็นที่เก็บหลัก
// · ตอนเข้าออนไลน์: เทียบเซฟในเครื่อง (_savedAt) กับเซิร์ฟเวอร์ → ใช้ฉบับใหม่กว่า · สำรองฉบับในเครื่องไว้ก่อนเสมอ
// · ระหว่างเล่น: ทำงานบน "สำเนา" ของเซฟ แล้วเขียนกลับเฉพาะตัวละคร (เลเวล/EXP/สเตตัส/สกิล/อุปกรณ์/กระเป๋า/ที่ฝาก/Lumi/Artifact)
//   ไม่แตะเควส ดินแดน ตำแหน่ง หรือฉากจบของเกมออฟไลน์ → เปิดเกมออฟไลน์ต่อได้ที่จุดเดิม
export const SAVE_KEY = 'paperdungeon_inkworld_save_v1';
export const BACKUP_KEY = SAVE_KEY + '_backup_online';

export const readLocal = (): any => { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const writeLocalRaw = (s: any) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch { return false; } };
export const backupLocal = () => { try { const s = localStorage.getItem(SAVE_KEY); if (s) localStorage.setItem(BACKUP_KEY, s); } catch { /* storage ปิด */ } };

export const unlocked = (s: any) => !!(s && s.ended);   // ปลดล็อก: จบเนื้อเรื่อง 7 ด่าน (ฉากจบผู้ลบ)
export const savedAt = (s: any) => (s && Number(s._savedAt)) || 0;

/** เลือกเซฟฐาน: ใหม่กว่าชนะ · คืน { base, from } */
export function pickBase(local: any, server: any, serverAt: number) {
  if (server && server.testChar) return { base: server, from: 'server' as const };   // บัญชีทดสอบ (รหัสเชิญ): ใช้ตัวบนเซิร์ฟเวอร์เสมอ
  const la = savedAt(local), sa = serverAt || savedAt(server);
  if (server && (!local || sa >= la)) return { base: server, from: 'server' as const };
  if (local) return { base: local, from: 'local' as const };
  return { base: null, from: 'none' as const };
}

const deep = (o: any) => JSON.parse(JSON.stringify(o));
/** ข้อมูลตัวละครจากสำเนาออนไลน์ → ใส่กลับลงเซฟฐาน */
export function mergeCharacter(base: any, session: any) {
  const out = deep(base);
  out.player = deep(session.player);
  out.kills = session.kills; out.deaths = session.deaths; out.playTime = session.playTime;
  out._savedAt = Date.now();
  return out;
}
/** สร้างสำเนาสำหรับเล่นออนไลน์: ล้างสถานะบอส/ฟาร์มของดินแดนออนไลน์ ไม่ให้เซฟออฟไลน์ไปบังคับบอสออนไลน์ */
export function sessionCopy(base: any) {
  const s = deep(base);
  s.bosses = {}; s.farmClears = {}; s.endingLoot = null;
  return s;
}
export function writeLocal(s: any) { return writeLocalRaw(s); }

/** ตัวละครทดสอบจากรหัสเชิญ: Lv50 อุปกรณ์หายากครบชุด · เก็บบนเซิร์ฟเวอร์อย่างเดียว ไม่เขียนทับเซฟในเครื่อง */
export function makeTestCharacter(PD: any, D: any) {
  const s = PD.Game.freshSave(), P = s.player, L = PD.Loot, lv = 50;
  s.ended = true; s.endingStage = 'return'; s.testChar = true;
  P.level = lv; P.exp = 0; P.skillPoints += lv - 1; P.lumi = 3000;
  P.weapon = L.make('sword', 'rare', lv, Math.random);
  const base = (slot: string) => (D.gearBases.find((b: any) => b.slot === slot) || {}).id;
  for (const [k, slot] of [['body', 'body'], ['legs', 'legs'], ['acc', 'acc'], ['acc2', 'acc']]) { const b = base(slot); if (b) P.gear[k] = L.makeGear(b, 'rare', lv, Math.random); }
  const pot = P.inventory.find((i: any) => i.kind === 'potion'); if (pot) pot.n = 10;
  s._savedAt = Date.now();
  return s;
}
