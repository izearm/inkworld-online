// ตัวละครทดสอบจากรหัสเชิญ (ใช้เฉพาะช่วงทดสอบ): Lv50 จบเนื้อเรื่องแล้ว อุปกรณ์หายากครบชุด → ไปเมืองออนไลน์ได้ทันที
export function makeTestCharacter(PD: any, D: any) {
  const s = PD.Game.freshSave(), P = s.player, L = PD.Loot, lv = 50;
  s.ended = true; s.endingStage = 'done'; s.testChar = true;
  P.level = lv; P.exp = 0; P.skillPoints += lv - 1; P.lumi = 3000;
  P.weapon = L.make('sword', 'rare', lv, Math.random);
  const base = (slot: string) => (D.gearBases.find((b: any) => b.slot === slot) || {}).id;
  for (const [k, slot] of [['body', 'body'], ['legs', 'legs'], ['acc', 'acc'], ['acc2', 'acc']]) { const b = base(slot); if (b) P.gear[k] = L.makeGear(b, 'rare', lv, Math.random); }
  const pot = P.inventory.find((i: any) => i.kind === 'potion'); if (pot) pot.n = 10;
  s.pendingPages.push('online_town');
  return s;
}
