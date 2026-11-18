// ข้อมูลเฉพาะโหมดออนไลน์ — เพิ่มเข้า PD_DATA ตอนเปิด online.html เท่านั้น (เกมออฟไลน์ไม่เห็นดินแดนเหล่านี้)
export const ONLINE_TOWN = 'online_town';
export const ONLINE_DUNGEON = 'online_forest';

export function installOnlineData(D: any) {
  if (D.lands.some((l: any) => l.id === ONLINE_TOWN)) return;
  const forest = D.lands.find((l: any) => l.id === 'shadow_forest');
  const fmap = forest ? forest.maps[0] : null;
  // เมืองกลางขนาดกลาง: ร้านค้า / รับฝาก / ร้าน Artifact (ในบ้าน) / ผู้นำทาง · ประตูฝั่งตะวันตก = ทางเข้าดันเจี้ยน
  D.lands.push({ id: ONLINE_TOWN, order: 98, online: true, name: 'เมืองหมึกออนไลน์', mood: 'คึกคัก', story: 'จุดพบปะของนักวาดทุกคน', theme: 'village', baseLevel: 1, color: '#2f6fd6',
    // แผนที่ที่ 2 เป็นแค่ป้ายชื่อให้ประตูฝั่งตะวันออก (genTown สร้างประตู next เมื่อมี >1 แผนที่) · เดินเข้าแล้วไปดันเจี้ยนออนไลน์จริง (ONLINE_DUNGEON)
    maps: [{ name: 'เมืองหมึกออนไลน์', type: 'town', w: 34, h: 26, houses: 9, trees: 14, room: { x: 5, y: 3, w: 6, h: 5, npc: 'artifact_keeper' } },
      { name: 'ป่าเงาหมึก (Co-op 2 คน · Lv50)', type: 'forest', portalOnly: true }] });
  // ดันเจี้ยนที่โล่ง ปลายทางเป็นบอส · ใช้ผังและค่าจากป่าเงาหมึก (Lv50 · ศัตรูแรง ×1.35 · บอส 3 ตัวออกทีละตัว)
  D.lands.push({ id: ONLINE_DUNGEON, order: 99, online: true, name: 'ป่าเงาหมึก (ออนไลน์)', mood: 'เงียบ ลึก มืดลงเรื่อยๆ', story: 'ดันเจี้ยน Co-op 2 คน',
    theme: 'forest', baseLevel: forest ? forest.baseLevel : 50, enemyMult: forest ? forest.enemyMult : 1.35, bossTier: forest ? forest.bossTier : 9, color: '#2f7a4a',
    maps: [Object.assign({}, fmap || { type: 'forest', w: 88, h: 42, enemies: [['thornblob', 14]], bosses: [{ type: 'boss_forest_slime', ttk: 85 }], chests: 5 }, { name: 'ป่าเงาหมึก (ออนไลน์)' })] });
  const npc = (o: any) => Object.assign({ land: ONLINE_TOWN, shape: 'human' }, o);
  D.npcs.merchant_online = npc({ name: 'พ่อค้ากระดาษ', pos: [0.3, 0.7], opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' });
  D.npcs.keeper_online = npc({ name: 'คุณป้ารับฝาก', pos: [0.72, 0.7], opts: { glasses: true, book: true }, storage: true, idle: 'keeper_idle', done: 'keeper_idle' });
  D.npcs.guide_online = npc({ name: 'ผู้นำทางหมึก', pos: [0.84, 0.42], opts: { cape: true, hat: true }, idle: 'online_guide_idle', done: 'online_guide_idle' });
  D.dialogue.online_guide_idle = [['ผู้นำทางหมึก', 'ประตูฝั่งตะวันออกพาไปป่าเงาหมึก เข้าไปได้ทีละ 2 คน · ประตูฝั่งตะวันตกกลับแผนที่โลก'], ['ผู้นำทางหมึก', 'ศัตรูในนั้นเลเวล 50 ระวังตัวด้วยนะ ของที่ดรอปเป็นของใครของมัน']];
}

// ---------- ลานต้นหมึก (หน้าแรกก่อนเข้าเกม) ----------
export const TITLE_FIELD = 'title_field';
export const TITLE_TREE = { x: 25.5, y: 25.5 };          // กลางแผนที่ (กำแพงขอบอยู่ไกลพ้นจอ)
export const TITLE_LIMIT = { lightR: 3.2, darkR: 6.2 };  // เดินออกเกิน lightR เริ่มมืด · ถึง darkR มืดเกือบสนิทและเดินต่อไม่ได้
export function installTitleField(D: any) {
  if (D.lands.some((l: any) => l.id === TITLE_FIELD)) return;
  const n = 51, rows: string[] = [];
  for (let y = 0; y < n; y++) rows.push(y === 0 || y === n - 1 ? '#'.repeat(n) : '#' + '.'.repeat(n - 2) + '#');
  D.lands.push({ id: TITLE_FIELD, order: -1, title: true, name: 'ลานกระดาษขาว', mood: '', story: '', theme: 'village', baseLevel: 1, color: '#1b1b1b',
    maps: [{ name: '', type: 'custom', w: n, h: n, rows, spawn: { x: 25, y: 28 } }] });
}
