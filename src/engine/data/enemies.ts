// @ts-nocheck
// ===== ศัตรู: Monster / ปีศาจ / มนุษย์ต่างดาว — ลายเส้นเดียวกันแต่รูปทรงต่างกัน =====
// ค่าที่เลเวล 1 (ขยายตาม config.enemyScale) · kind: melee | caster
// drops: [{ base: 'weaponBaseId', pct: 0-100 }] — เลือกอาวุธที่ดรอป + % ที่จะดรอป (สุ่มแยกแต่ละรายการ คูณตัวคูณลูท) · เลเวลไอเท็ม = เลเวลศัตรู (บอส +1)
PD_DATA.enemies = {
  blob:       { name: 'ก้อนหมึก',        shape: 'slime', element: 'normal',   size: 0.8, hp: 14, atk: 4, speed: 1.6, aggro: 5, range: 0.9, kind: 'melee', windup: 0.55, cd: 1.4, exp: 5,
    drops: [{ base: 'sword', pct: 8 }, { base: 'dagger', pct: 8 }] },
  crow:       { name: 'อีกากระดาษ',       shape: 'bird', element: 'normal',    size: 0.9, hp: 10, atk: 4, speed: 2.5, aggro: 6, range: 0.9, kind: 'melee', windup: 0.45, cd: 1.2, exp: 5, float: 7,
    drops: [{ base: 'dagger', pct: 9.6 }, { base: 'spear', pct: 6.4 }] },
  slime:      { name: 'สไลม์ลืมชื่อ',      shape: 'slime', element: 'normal',   size: 1.0, hp: 18, atk: 5, speed: 1.5, aggro: 5, range: 0.95, kind: 'melee', windup: 0.55, cd: 1.4, exp: 6,
    drops: [{ base: 'sword', pct: 6.4 }, { base: 'axe', pct: 4.8 }, { base: 'staff', pct: 4.8 }] },
  slime_mage: { name: 'สไลม์ร่ายเวท',     shape: 'slime', element: 'normal',   size: 1.0, hat: true, hp: 14, atk: 6, speed: 1.3, aggro: 6.5, range: 4.5, kind: 'caster', windup: 0.7, cd: 2.0, exp: 7, projColor: '#3a8de0', projSpeed: 4.2,
    drops: [{ base: 'staff', pct: 11.2 }, { base: 'dagger', pct: 4.8 }] },
  bat:        { name: 'ค้างคาวหมึก',      shape: 'bird', element: 'normal',    size: 0.8, bat: true, hp: 11, atk: 5, speed: 2.8, aggro: 6, range: 0.9, kind: 'melee', windup: 0.4, cd: 1.1, exp: 6, float: 9,
    drops: [{ base: 'sword', pct: 1.6 }, { base: 'spear', pct: 0.8 }, { base: 'dagger', pct: 9.6 }, { base: 'axe', pct: 4 }] },
  book:       { name: 'หนังสือดุ',        shape: 'book', element: 'normal',    size: 1.0, hp: 16, atk: 6, speed: 2.0, aggro: 6, range: 0.95, kind: 'melee', windup: 0.5, cd: 1.3, exp: 7, float: 6,
    drops: [{ base: 'staff', pct: 8 }, { base: 'sword', pct: 4.8 }, { base: 'axe', pct: 3.2 }] },
  imp:        { name: 'ปีศาจน้อย',        shape: 'demon', element: 'normal',   size: 0.8, hp: 15, atk: 6, speed: 1.8, aggro: 7, range: 4.8, kind: 'caster', windup: 0.7, cd: 1.9, exp: 8, projColor: '#e0412b', projSpeed: 4.6,
    drops: [{ base: 'staff', pct: 8 }, { base: 'dagger', pct: 4.8 }, { base: 'spear', pct: 3.2 }] },
  ghost:      { name: 'เงาลืมเรื่อง',      shape: 'ghost', element: 'normal',   size: 1.0, hp: 20, atk: 6, speed: 1.4, aggro: 6, range: 1.0, kind: 'melee', windup: 0.6, cd: 1.5, exp: 8, float: 4,
    drops: [{ base: 'sword', pct: 4.8 }, { base: 'staff', pct: 6.4 }, { base: 'axe', pct: 4.8 }] },
  alien:      { name: 'ต่างดาวขโมยดินสอ',  shape: 'alien', element: 'normal', poison: true,   size: 1.0, hp: 16, atk: 6, speed: 1.9, aggro: 7, range: 5.0, kind: 'caster', windup: 0.65, cd: 1.8, exp: 8, projColor: '#2fae47', projSpeed: 5.0,
    drops: [{ base: 'spear', pct: 6.4 }, { base: 'staff', pct: 4.8 }, { base: 'dagger', pct: 4.8 }] },
  goblin:     { name: 'มอนสเตอร์กินไส้ดินสอ', shape: 'monster', element: 'normal', size: 1.0, hp: 24, atk: 7, speed: 1.9, aggro: 6, range: 1.0, kind: 'melee', windup: 0.55, cd: 1.4, exp: 9,
    drops: [{ base: 'axe', pct: 8 }, { base: 'sword', pct: 4.8 }, { base: 'spear', pct: 3.2 }] },
  knight:     { name: 'อัศวินพับ',        shape: 'knight', element: 'normal',  size: 1.05, hp: 34, atk: 8, speed: 1.5, aggro: 6, range: 1.15, kind: 'melee', windup: 0.7, cd: 1.6, exp: 11,
    drops: [{ base: 'sword', pct: 8 }, { base: 'axe', pct: 4.8 }, { base: 'spear', pct: 3.2 }] },
  crane:      { name: 'นกกระเรียนกระดาษ',  shape: 'bird', element: 'normal',    size: 1.1, hp: 14, atk: 6, speed: 3.0, aggro: 7, range: 0.9, kind: 'melee', windup: 0.4, cd: 1.1, exp: 8, float: 8,
    drops: [{ base: 'spear', pct: 8 }, { base: 'dagger', pct: 4.8 }, { base: 'sword', pct: 3.2 }] },
  fishman:    { name: 'มนุษย์ปลาหมึก',     shape: 'monster', element: 'normal', size: 1.05, fin: true, hp: 28, atk: 8, speed: 1.8, aggro: 6, range: 1.05, kind: 'melee', windup: 0.6, cd: 1.5, exp: 10,
    drops: [{ base: 'spear', pct: 6.4 }, { base: 'axe', pct: 4.8 }, { base: 'sword', pct: 4.8 }] },
  jelly:      { name: 'แมงกะพรุนหมึก',     shape: 'jelly', element: 'normal',   size: 1.0, hp: 18, atk: 7, speed: 1.2, aggro: 6.5, range: 4.6, kind: 'caster', windup: 0.75, cd: 2.0, exp: 9, projColor: '#9b4ad6', projSpeed: 4.0, float: 6,
    drops: [{ base: 'staff', pct: 9.6 }, { base: 'dagger', pct: 6.4 }] },
  demon:      { name: 'ปีศาจหมึก',        shape: 'demon', element: 'normal',   size: 1.15, wings: true, hp: 32, atk: 9, speed: 1.9, aggro: 7, range: 1.1, kind: 'melee', windup: 0.6, cd: 1.4, exp: 12,
    drops: [{ base: 'axe', pct: 6.4 }, { base: 'sword', pct: 4.8 }, { base: 'spear', pct: 4.8 }] },
  shade:      { name: 'เงาที่ถูกลบ',       shape: 'ghost', element: 'normal',   size: 1.1, pale: true, hp: 26, atk: 8, speed: 1.7, aggro: 7, range: 4.4, kind: 'caster', windup: 0.7, cd: 1.8, exp: 11, projColor: '#8a8a8a', projSpeed: 4.6, float: 4,
    drops: [{ base: 'staff', pct: 8 }, { base: 'sword', pct: 4.8 }, { base: 'dagger', pct: 3.2 }] },
  eraser_bit: { name: 'เศษยางลบ',         shape: 'eraserbit', element: 'normal', size: 0.9, hp: 20, atk: 8, speed: 2.4, aggro: 8, range: 0.95, kind: 'melee', windup: 0.45, cd: 1.2, exp: 9,
    drops: [{ base: 'axe', pct: 4.8 }, { base: 'dagger', pct: 4.8 }, { base: 'sword', pct: 3.2 }, { base: 'spear', pct: 3.2 }] },

  // ===== ดินแดนหลังจบเกม (ศัตรูเก่ง ×3 ผ่าน land.enemyMult) =====
  mummy:      { name: 'มัมมี่กระดาษทราย',  shape: 'mummy', element: 'normal',     size: 1.1, hp: 30, atk: 9,  speed: 1.6, aggro: 7, range: 1.1, kind: 'melee', windup: 0.6, cd: 1.4, exp: 14,
    drops: [{ base: 'axe', pct: 6.4 }, { base: 'sword', pct: 4.8 }, { base: 'spear', pct: 4.8 }] },
  scorpion:   { name: 'แมงป่องหมึกแห้ง',   shape: 'scorpion', element: 'normal',  size: 1.1, hp: 26, atk: 10, speed: 2.3, aggro: 7, range: 1.1, kind: 'melee', windup: 0.45, cd: 1.2, exp: 14,
    drops: [{ base: 'dagger', pct: 6.4 }, { base: 'spear', pct: 4.8 }, { base: 'axe', pct: 4.8 }] },
  sandwraith: { name: 'วิญญาณพายุทราย',   shape: 'sandwraith', element: 'normal', size: 1.1, hp: 22, atk: 9, speed: 1.5, aggro: 8, range: 5.0, kind: 'caster', windup: 0.7, cd: 1.8, exp: 15, projColor: '#c9a24a', projSpeed: 5.0, float: 3,
    drops: [{ base: 'staff', pct: 8 }, { base: 'sword', pct: 4.8 }, { base: 'dagger', pct: 3.2 }] },
  eyeball:    { name: 'ลูกตาฝันร้าย',      shape: 'eyeball', element: 'normal',   size: 1.1, hp: 22, atk: 10, speed: 1.3, aggro: 8, range: 5.2, kind: 'caster', windup: 0.7, cd: 1.7, exp: 15, projColor: '#c0201a', projSpeed: 5.2, float: 8,
    drops: [{ base: 'staff', pct: 9.6 }, { base: 'dagger', pct: 6.4 }] },
  faceless:   { name: 'ร่างไร้หน้า',       shape: 'faceless', element: 'normal',  size: 1.1, hp: 34, atk: 11, speed: 2.0, aggro: 8, range: 1.4, kind: 'melee', windup: 0.55, cd: 1.3, exp: 16,
    drops: [{ base: 'sword', pct: 4.8 }, { base: 'axe', pct: 4.8 }, { base: 'spear', pct: 3.2 }, { base: 'dagger', pct: 3.2 }] },
  maw:        { name: 'ปากที่ไม่เคยหลับ',   shape: 'maw', element: 'normal',       size: 1.1, hp: 38, atk: 10, speed: 1.5, aggro: 7, range: 1.1, kind: 'melee', windup: 0.6, cd: 1.5, exp: 16,
    drops: [{ base: 'axe', pct: 8 }, { base: 'sword', pct: 4.8 }, { base: 'spear', pct: 3.2 }] },
  thornfairy: { name: 'แฟร์รี่หนาม',       shape: 'thornfairy', element: 'normal', size: 1.0, wings: true, hp: 20, atk: 10, speed: 2.6, aggro: 8, range: 4.8, kind: 'caster', windup: 0.6, cd: 1.6, exp: 15, projColor: '#3c9a5c', projSpeed: 5.4, float: 9,
    drops: [{ base: 'staff', pct: 6.4 }, { base: 'spear', pct: 4.8 }, { base: 'dagger', pct: 4.8 }] },
  shroom:     { name: 'เห็ดกินคน',         shape: 'shroom', element: 'normal',    size: 1.1, hp: 36, atk: 10, speed: 1.4, aggro: 7, range: 1.1, kind: 'melee', windup: 0.6, cd: 1.5, exp: 15,
    drops: [{ base: 'axe', pct: 6.4 }, { base: 'sword', pct: 4.8 }, { base: 'staff', pct: 4.8 }] },
  doll:       { name: 'ตุ๊กตาร้าว',         shape: 'doll', element: 'normal',      size: 1.0, hp: 28, atk: 11, speed: 2.4, aggro: 8, range: 1.0, kind: 'melee', windup: 0.45, cd: 1.2, exp: 16,
    drops: [{ base: 'dagger', pct: 8 }, { base: 'sword', pct: 4.8 }, { base: 'spear', pct: 3.2 }] },

  // v2.0.12: ก้อนหนาม — หน้าตาเป็นก้อนหมึกน่ารัก แต่ตอนโจมตีหนามงอกแหลมรอบตัว · ประเภท tank (hp สูง + armor ลดดาเมจที่ได้รับ 35%) · เจอใน เมืองแฟร์รี่ + ป่าเงาหมึก
  thornblob:  { name: 'ก้อนหมึกหนาม',      shape: 'slime', thorny: true, element: 'normal', size: 1.15, hp: 40, def: 0.35, atk: 8, speed: 1.3, aggro: 5, range: 1.0, kind: 'melee', windup: 0.75, cd: 1.7, exp: 18,
    drops: [{ base: 'axe', pct: 6.4 }, { base: 'sword', pct: 4.8 }, { base: 'spear', pct: 4.8 }] },

  // ===== บอส ===== (patterns: ring slam charge summon + ใหม่ spiral rain cross nova · tailslam = ทุบพื้นเมื่อผู้เล่นยืนชิด)
  boss_smudge:    { name: 'รอยเปื้อนสีเทา', title: 'ผู้ขวางบ่อน้ำ', boss: true, shape: 'ghost', element: 'normal', size: 2.0, hp: 85, maxHp: 725, atk: 7, speed: 1.4, aggro: 8, range: 4, kind: 'caster', windup: 0.8, cd: 2.2, exp: 60, projColor: '#666', projSpeed: 3.8, float: 5, patterns: ['ring', 'slam', 'rain'], patternCd: 3.0 },
  boss_greyslime: { name: 'สไลม์ยักษ์ที่ถูกลบ', title: 'ความทรงจำที่บวมเป่ง', boss: true, shape: 'slime', element: 'normal', size: 2.4, hp: 100, maxHp: 2579, atk: 8, speed: 1.3, aggro: 8, range: 1.5, kind: 'melee', windup: 0.8, cd: 1.8, exp: 90, patterns: ['slam', 'slam', 'spiral'], summonSkill: { skillId: 'boss_summon', roster: { slime: 3 } }, patternCd: 3.2 },
  boss_bookdemon: { name: 'ปีศาจหน้าว่าง', title: 'ผู้กินเรื่องเศร้า', boss: true, shape: 'demon', element: 'normal', size: 1.9, wings: true, hp: 110, maxHp: 5458, atk: 9, speed: 1.6, aggro: 8, range: 1.4, kind: 'melee', windup: 0.7, cd: 1.6, exp: 120, projColor: '#e0412b', projSpeed: 4.2, patterns: ['ring', 'slam', 'cross'], summonSkill: { skillId: 'boss_summon', roster: { book: 3 } }, patternCd: 3.0 },
  boss_alien:     { name: 'ราชาต่างดาว', title: 'นักสะสมดินสอ', boss: true, shape: 'alien', element: 'normal', poison: true, size: 2.0, hp: 115, maxHp: 8875, atk: 9, speed: 1.8, aggro: 9, range: 1.3, kind: 'melee', windup: 0.7, cd: 1.6, exp: 150, projColor: '#2fae47', projSpeed: 4.8, patterns: ['charge', 'ring', 'spiral'], summonSkill: { skillId: 'boss_summon', roster: { alien: 3 }, phaseRosters: [{}, { alien: 2, crow: 1 }] }, bossHeal: { delay: 2, fraction: 0.10 }, patternCd: 2.8 },
  boss_origami:   { name: 'อัศวินพับพันชั้น', title: 'ผู้เฝ้าหอคอย', boss: true, shape: 'knight', element: 'normal', size: 2.0, hp: 130, maxHp: 13333, atk: 10, speed: 1.6, aggro: 9, range: 1.6, kind: 'melee', windup: 0.75, cd: 1.6, exp: 180, patterns: ['absorbShield', 'charge', 'slam', 'charge', 'cross'], absorbShield: { armor: 99, duration: 2 }, patternCd: 2.7 },
  boss_kraken:    { name: 'หมึกยักษ์ไร้เสียง', title: 'ผู้กลืนเพลง', boss: true, shape: 'kraken', element: 'water', size: 2.2, hp: 140, maxHp: 20603, atk: 10, speed: 1.2, aggro: 9, range: 1.6, kind: 'melee', windup: 0.8, cd: 1.7, exp: 220, projColor: '#9b4ad6', projSpeed: 4.0, patterns: ['tentaclePull', 'ring', 'slam', 'nova'], tentaclePull: { cast: 1, range: 8, width: 0.75, damage: 100, stunChance: 0.35 }, inkDrain: { proximity: 2, closeTime: 3, cast: 2, damage: 100 }, summonSkill: { skillId: 'boss_summon', roster: { jelly: 3 } }, patternCd: 2.8 },
  boss_eraser:    { name: 'ผู้ลบ', title: 'นักวาดรุ่นก่อน', boss: true, shape: 'eraser', element: 'normal', size: 1.5, hp: 170, maxHp: 30130, atk: 11, speed: 2.0, aggro: 10, range: 1.5, kind: 'melee', windup: 0.65, cd: 1.4, exp: 0, projColor: '#9a9a9a', projSpeed: 5.0, patterns: ['charge', 'ring', 'slam', 'rain', 'nova'], summonSkill: { skillId: 'boss_summon', roster: { eraser_bit: 3 } }, patternCd: 2.4, persuadeAt: 0.01 },
  boss_sandking:   { name: 'ราชาแมงป่องผืนทราย', title: 'ผู้ฝังเมืองทั้งเมือง', boss: true, tailslam: true, shape: 'scorpion', element: 'earth', size: 2.6, hp: 190, atk: 12, speed: 1.9, aggro: 10, range: 1.8, kind: 'melee', windup: 0.7, cd: 1.5, exp: 400, projColor: '#c9a24a', projSpeed: 5.0, patterns: ['charge', 'ring', 'slam', 'rain'], summonSkill: { skillId: 'boss_summon', roster: { scorpion: 3 } }, patternCd: 2.4 },
  boss_dreameater: { name: 'ดวงตาที่กินความฝัน', title: 'ผู้ไม่เคยกะพริบ', boss: true, shape: 'eyeball', element: 'normal', size: 2.6, hp: 200, atk: 12, speed: 1.4, aggro: 10, range: 4.5, kind: 'caster', windup: 0.75, cd: 1.6, exp: 450, projColor: '#c0201a', projSpeed: 5.0, float: 10, patterns: ['ring', 'ring', 'slam', 'spiral', 'nova'], summonSkill: { skillId: 'boss_summon', roster: { faceless: 3 } }, patternCd: 2.3 },
  boss_fairyqueen: { name: 'ราชินีแฟร์รี่หนาม', title: 'ผู้เย็บปีกด้วยเลือด', boss: true, shape: 'thornfairy', element: 'normal', size: 2.2, wings: true, hat: true, hp: 210, atk: 13, speed: 2.2, aggro: 10, range: 4.6, kind: 'caster', windup: 0.65, cd: 1.5, exp: 500, projColor: '#3c9a5c', projSpeed: 5.6, float: 12, patterns: ['charge', 'ring', 'ring', 'cross', 'rain'], summonSkill: { skillId: 'boss_summon', roster: { thornfairy: 3 } }, patternCd: 2.2 },
  // ===== บอสดันเจี้ยนโบนัส =====
  boss_obsidian:  { name: 'อัศวินออบซิเดียน', title: 'เงาดำแห่งความลับ', boss: true, shape: 'knight', element: 'earth', size: 2.2, hp: 280, atk: 15, speed: 1.8, aggro: 10, range: 1.6, kind: 'melee', windup: 0.65, cd: 1.4, exp: 600, patterns: ['charge', 'slam', 'cross', 'nova', 'charge'], patternCd: 2.2 },
  boss_voidmaw:   { name: 'ปากว่างเปล่า', title: 'ผู้กลืนทุกสิ่ง', boss: true, shape: 'maw', element: 'normal', size: 2.8, hp: 350, atk: 17, speed: 1.5, aggro: 10, range: 1.8, kind: 'melee', windup: 0.7, cd: 1.5, exp: 750, patterns: ['slam', 'ring', 'spiral', 'nova', 'rain'], summonSkill: { skillId: 'boss_summon', roster: { faceless: 3 } }, patternCd: 2.0 },
  boss_inkgod:    { name: 'เทพหมึกโบราณ', title: 'ผู้เขียนทุกเส้น', boss: true, shape: 'demon', element: 'normal', size: 2.6, wings: true, hp: 450, atk: 20, speed: 2.0, aggro: 10, range: 5.0, kind: 'caster', windup: 0.6, cd: 1.3, exp: 1000, projColor: '#1b1b1b', projSpeed: 6.0, patterns: ['charge', 'ring', 'slam', 'spiral', 'rain', 'cross', 'nova'], summonSkill: { skillId: 'boss_summon', roster: { shade: 3 } }, patternCd: 1.8 },
  // ===== v2.0.12: บอสป่าเงาหมึก (ออกทีละตัว) =====
  boss_treant:   { name: 'ต้นไม้เฒ่าผู้ลืมชื่อ', title: 'ผู้เฝ้าป่าลึก', boss: true, shape: 'tree', opts: { ent: true }, element: 'normal', size: 2.5, hp: 1, atk: 12, speed: 1.3, aggro: 9, range: 1.7, kind: 'melee', windup: 0.8, cd: 1.7, exp: 520, projColor: '#3c7a3c', projSpeed: 4.4, patterns: ['slam', 'rain', 'cross', 'slam', 'ring'], summonSkill: { skillId: 'boss_summon', roster: { thornblob: 3 } }, patternCd: 2.6 },
  boss_stag:     { name: 'กวางเขาหมึก', title: 'ราชาแห่งป่าเงา', boss: true, shape: 'stag', element: 'normal', size: 2.4, hp: 1, atk: 14, speed: 2.3, aggro: 10, range: 1.8, kind: 'melee', windup: 0.7, cd: 1.5, exp: 700, projColor: '#3c9a5c', projSpeed: 5.2, patterns: ['roots', 'leaves', 'charge', 'roots', 'slam', 'leaves', 'nova'], patternCd: 2.3 },
};
PD_DATA.enemies.boss_forest_slime = Object.assign({}, PD_DATA.enemies.boss_greyslime, { name: 'สไลม์ยักษ์ผู้ฟื้นคืน', title: 'ด่านแรกของป่าเงา' }); // บอสตัวแรก: เอาของเก่ามาใช้

for (const enemy of Object.values(PD_DATA.enemies)) { enemy.def ??= 0; enemy.mdef ??= 0; }
