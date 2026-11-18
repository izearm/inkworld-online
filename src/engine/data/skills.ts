// @ts-nocheck
// ===== สกิล: 3 หมวด (หลัก / เวท / ท่าไม้ตาย) — ผู้เล่นเลือกอัพ และเลือกใส่ช่องเอง =====
// power[] = ตัวคูณดาเมจต่อเลเวลสกิล (heal = % HP, freeze = วินาที)
PD_DATA.skillCats = {
  main:  { name: 'หลัก',      slot: 0 },
  magic: { name: 'เวท',       slot: 1 },
  ult:   { name: 'ท่าไม้ตาย', slot: 2 }
};
PD_DATA.skills = [
  { id: 'slash_wave', cat: 'main', img: 'skill/skill_01.webp', name: 'คลื่นหมึก', icon: '〰', reqLevel: 1, maxLv: 5, ink: 6, cd: 1.2,
    kind: 'wave', power: [1.4, 1.6, 1.8, 2.05, 2.3], range: 6, speed: 9,
    desc: 'ปล่อยคลื่นหมึกทะลุศัตรูเป็นเส้นตรง' },
  { id: 'whirl', cat: 'main', img: 'skill/skill_02.webp', name: 'วงหมึกหมุน', icon: '◎', reqLevel: 2, maxLv: 5, ink: 10, cd: 3,
    kind: 'whirl', power: [1.6, 1.85, 2.1, 2.4, 2.7], radius: 1.9,
    desc: 'หมุนตัววาดวงกลม ฟันศัตรูรอบตัว' },
  { id: 'dash_strike', cat: 'main', img: 'skill/skill_03.webp', name: 'พุ่งขีดเส้น', icon: '➤', reqLevel: 4, maxLv: 5, ink: 8, cd: 2.5,
    kind: 'dash', power: [1.5, 1.75, 2.0, 2.3, 2.6], dist: 3.6,
    desc: 'พุ่งไปข้างหน้าพร้อมฟัน ไม่โดนโจมตีระหว่างพุ่ง' },

  { id: 'fire_doodle', cat: 'magic', img: 'skill/skill_04.webp', name: 'ลูกไฟขยุกขยิก', icon: '✹', reqLevel: 3, maxLv: 5, ink: 12, cd: 4,
    kind: 'charge', damageType: 'physical', power: [2.5, 3.25, 4, 5, 6], burnChance: [0.15, 0.20, 0.25, 0.30, 0.35], castTime: 0.5, still: true, chargeFx: ['#e0412b', '#e8b923'], rangeAdd: 1.0, elem: 'fire',
    desc: 'ชาร์จแล้วฟันหมู่ด้านหน้า ใช้พลังกายภาพรวมสูงสุด 600% มีโอกาสติดไฟเผาสูงสุด 35% ต่อเป้าหมาย' },
  { id: 'ice_line', cat: 'magic', img: 'skill/skill_05.webp', name: 'เส้นน้ำแข็ง', icon: '❄', reqLevel: 3, maxLv: 5, ink: 14, cd: 3.5,
    kind: 'iceline', power: [1.3, 1.5, 1.7, 1.95, 2.2], range: 6, slow: 0.5, slowDur: 2.5, elem: 'ice',
    desc: 'ขีดเส้นหนามน้ำแข็ง ทำให้ศัตรูช้าลง' },
  { id: 'heal_sketch', cat: 'magic', img: 'skill/skill_06.webp', name: 'วาดแผลหาย', icon: '✚', reqLevel: 5, maxLv: 5, ink: 18, cd: 8,
    kind: 'heal', power: [0.25, 0.30, 0.35, 0.40, 0.45],
    desc: 'ฟื้น HP ตาม % ของ HP สูงสุด' },

  { id: 'ink_storm', cat: 'ult', img: 'skill/skill_07.webp', name: 'พายุหมึก', icon: '☄', reqLevel: 8, maxLv: 5, ink: 30, cd: 20,
    kind: 'storm', damageType: 'magic', dropColor: '#1b1b1b', power: [1.6, 1.9, 2.2, 2.6, 3.0], cast: 3.5, area: 2.6, strikes: [10, 12, 14, 16, 18],
    castTime: [1.4, 1.2, 1.0, 0.8, 0.7], dur: [4, 4.5, 5, 5.5, 6], // ร่าย/ระยะเวลาทำดาเมจ ต่อเลเวล (เลเวล 3 = 1 วิ / 5 วิ)
    desc: 'หยดหมึกยักษ์ตกเป็นวงบนพื้นด้านหน้าเป็นช่วงเวลาหนึ่ง' },
  { id: 'giant_brush', cat: 'ult', img: 'skill/skill_08.webp', name: 'พู่กันยักษ์', icon: '✎', reqLevel: 8, maxLv: 5, ink: 28, cd: 16,
    kind: 'brush', damageType: 'weapon', power: [4, 4.6, 5.3, 6.1, 7], radius: 3.6, arc: 220, castTime: [0.6, 0.45, 0.3, 0.25, 0.2], // เลเวล 3 = 0.3 วิ
    desc: 'ปาดพู่กันยักษ์ครึ่งวงกลม ดาเมจมหาศาล' },
  { id: 'time_sketch', cat: 'ult', img: 'skill/skill_09.webp', name: 'ภาพนิ่ง', icon: '⌛', reqLevel: 10, maxLv: 5, ink: 25, cd: 24,
    kind: 'freeze', power: [3, 3.5, 4, 4.5, 5], radius: 5.95, vuln: 1.3,
    desc: 'ศัตรูรอบตัวกลายเป็นภาพนิ่ง หยุดนิ่งและรับดาเมจเพิ่ม 30% ' }
];

PD_DATA.bossSkillDefs = {
  boss_summon: { name: 'เรียกลูกน้อง', effectId: 'summon', castTime: 1.8, cooldown: 20, waveSize: 3, maxAlive: 4, thresholds: [0.7, 0.35] }
};
