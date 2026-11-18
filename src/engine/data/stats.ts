// @ts-nocheck
// ===== ค่าสถานะอาชีพ (อัปอัตโนมัติเมื่อเลเวลอัพ) =====
PD_DATA.classes = {
  drawer: {
    name: 'นักวาด',
    desc: 'คนเดียวที่ยังวาดเส้นได้ เส้นที่วาดกลายเป็นของจริงชั่วคราว',
    base:   { STR: 5, VIT: 5, INT: 5, AGI: 5 },
    growth: { STR: 2, VIT: 2, INT: 1.5, AGI: 1 },   // เพิ่มต่อเลเวล (auto)
    hpBase: 40, hpPerVit: 8,
    hpRegen: 0, hpRegenPerVit: 0.04,   // v2.2.0: ฟื้น HP/วิ จาก VIT (นิดหน่อย)
    inkBase: 30, inkPerInt: 3,
    inkRegen: 2.0, inkRegenPerInt: 0.04,
    defPerVit: 1.0, defK: 60, defKPerLevel: 3,       // ลดดาเมจ = def/(def+defK)
    critBase: 0.05, critPerAgi: 0.10 / 54, critMult: 1.75,
    physPowerPerStr: 2,             // พลังโจมตีกายภาพต่อ 1 STR
    magicBase: 6, magicPerInt: 1.0, // พลังเวทพื้นฐาน · INT 1 = พลังเวท 1
    movePerAgi: 0.002, aspdPerAgi: 0.002,
    mdefPerInt: 1.0                 // v2.2.0: ป้องกันเวท = INT × ค่านี้ (ลดดาเมจจากกระสุน/วงเวทของศัตรู สูตรเดียวกับ def)
  }
};
PD_DATA.statNames = { STR: 'STR', VIT: 'VIT', INT: 'INT', AGI: 'AGI' };
PD_DATA.startPlayer = {
  cls: 'drawer', level: 1,
  skills: { slash_wave: 1 },
  slots: ['slash_wave', null, null],
  skillPoints: 0
};
