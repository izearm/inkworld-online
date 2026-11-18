// @ts-nocheck
// ===== อาวุธ (ถือได้ชิ้นเดียว) + ออปชันสุ่มแบบ Diablo =====
PD_DATA.weaponBases = [
  { id: 'sword',  name: 'ดาบ',    shape: 'sword',  min: 3, max: 6,  speed: 1.0,  range: 1.25, arc: 110, magic: 0, physical: true },
  { id: 'dagger', name: 'มีดสั้น', shape: 'dagger', min: 2, max: 4,  speed: 1.55, range: 1.0,  arc: 90,  magic: 0, physical: true },
  { id: 'axe',    name: 'ขวาน',   shape: 'axe',    min: 5, max: 10, speed: 0.7,  range: 1.3,  arc: 140, magic: 0, physical: true },
  { id: 'spear',  name: 'หอก',    shape: 'spear',  min: 3, max: 7,  speed: 0.9,  range: 2.5,  arc: 50,  magic: 0, physical: true },
  { id: 'staff',  name: 'คทา',    shape: 'staff',  min: 2, max: 5,  speed: 0.9,  range: 1.2,  arc: 100, magic: 4 }
];
PD_DATA.weaponScalePerLevel = 0.28;   // ดาเมจฐาน +28% ต่อ item level
// v2.0.3 งบพลัง: dmgMult ต่ำ (ความหายากไม่ใช่ตัวคูณดาเมจหลัก) · budget = สัดส่วนของ "งบออปชัน" ต่อช่อง (itemBudget.slot) · เป้า: ชุด Mythic ≈ ×1.8 ของชุด Normal
PD_DATA.rarities = [
  { id: 'normal', name: 'ธรรมดา',  color: '#3a3a3a', affixes: [0, 0], weight: 60, dmgMult: 1.0,  budget: 0 },
  { id: 'magic',  name: 'เวทมนตร์', color: '#2f6fd6', affixes: [1, 2], weight: 30, dmgMult: 1.03, budget: 0.17 },
  { id: 'rare',   name: 'หายาก',   color: '#b98f00', affixes: [3, 4], weight: 9,  dmgMult: 1.08, budget: 0.4 },
  { id: 'legend', name: 'ตำนาน',   color: '#e0661b', affixes: [4, 5], weight: 1,  dmgMult: 1.15, budget: 0.65 },
  { id: 'mythic', name: 'เทพนิยาย', color: '#c2185b', affixes: [5, 6], weight: 0.25, dmgMult: 1.25, budget: 1.0 }
];
// งบออปชันเต็ม (หน่วย pts ≈ 1% ของพลังโดยประมาณ) ต่อช่อง · growth = ค่าแบบตัวเลขตรง (hp/def/ธาตุ…) ถูกลงตามเลเวลไอเท็ม เพราะพลังฐานโตตาม
PD_DATA.itemBudget = { slot: { weapon: 34, body: 20, legs: 20, acc: 14 }, growth: 0.25 };
// ค่าสูงสุดของสถานะสะสม (ใช้ใน stats.ts derive)
PD_DATA.statCaps = { crit: 1, aspd: 1.6, leech: 0.08, move: 1.4, dmgReduce: 0.75 };
// v2.0.3: ค่าออปชันไม่สุ่มช่วงแล้ว — แบ่งจาก 'งบออปชัน' ของไอเท็ม ÷ cost (ดู loot.ts rollAffixes) · cost = pts ต่อ 1 หน่วยค่า · flat = ค่าแบบตัวเลขตรง
// tier: 'common' = ดรอปง่าย, 'rare' = ดรอปยาก (โอกาส 25%)
PD_DATA.affixes = [
  { id: 'atkPct',   word: 'คม',         text: '+{v}% พลังโจมตี',          cost: 1.0, tier: 'common' },
  { id: 'crit',     word: 'แม่นยำ',      text: '+{v}% โอกาสคริติคอล',       cost: 1.4, tier: 'common' },
  { id: 'aspd',     word: 'ว่องไว',      text: '+{v}% ความเร็วโจมตี',       cost: 1.1, tier: 'common' },
  { id: 'hp',       word: 'อดทน',       text: '+{v} HP สูงสุด',            cost: 0.7, flat: 1, tier: 'common' },
  { id: 'ink',      word: 'หมึกเข้ม',    text: '+{v} หมึกสูงสุด',           cost: 0.3, flat: 1, tier: 'common' },
  { id: 'move',     word: 'ปลายเท้าเบา', text: '+{v}% ความเร็วเดิน',        cost: 0.5, tier: 'common' },
  { id: 'def',      word: 'แข็งแรง',     text: '+{v} ป้องกัน',             cost: 0.8, flat: 1, tier: 'common' },
  { id: 'leech',    word: 'ดูดหมึก',     text: 'ดูดเลือด {v}% ของดาเมจ',    cost: 3, tier: 'rare' },
  { id: 'skillPct', word: 'นักเวท',      text: '+{v}% ดาเมจสกิล',          cost: 0.5, tier: 'rare' },
  // v2.0.7: ตัดออปชันธาตุ (ไฟ/น้ำแข็ง/สายฟ้า) — อาวุธมีดาเมจกายภาพล้วน (คทา = พลังเวทล้วน) · ธาตุเหลือเฉพาะจากสกิล
  { id: 'regen',    word: 'ฟื้นฟู',      text: '+{v} หมึก/วินาที',          cost: 5, flat: 1, tier: 'rare' }
];
PD_DATA.elemColors = { fire: '#e0412b', ice: '#3a8de0', bolt: '#e8c21a', ink: '#1b1b1b' };
PD_DATA.legendaryNames = ['ปากกาขนนกของผู้ลบ', 'ไม้บรรทัดแห่งเส้นตรง', 'ดินสอทองรุ่นแรก', 'กรรไกรพับปราสาท',
  'เปลือกหอยร้องเพลง', 'กิ่งต้นหมึก', 'ยางลบที่ไม่ยอมลบ', 'ชอล์กสุดท้ายของห้องเรียน'];
PD_DATA.starterWeapon = { base: 'sword', name: 'ปากกาดาบ', rarity: 'normal', ilvl: 1, affixes: [] };
// ===== ชุดสวมใส่ 5 ช่อง (สุ่มดรอปแบบอาวุธ: ความหายาก + ออปชัน) — stats ใช้ id เดียวกับ affixes =====
PD_DATA.gearSlots = { body: 'เสื้อ', legs: 'กางเกง', acc: 'เครื่องประดับ 1', acc2: 'เครื่องประดับ 2' };
PD_DATA.gearBases = [
  { id: 'robe',      slot: 'body', name: 'ชุดคลุมปราชญ์หมึก',     stats: { def: 2, ink: 8 } },
  { id: 'vest',      slot: 'body', name: 'เสื้อกั๊กเงาปลายปากกา',  stats: { def: 4, hp: 10 } },
  { id: 'coat',      slot: 'body', name: 'เสื้อเกราะอัศวินพับ',    stats: { def: 7 } },
  { id: 'hide',      slot: 'body', name: 'เสื้อหนังนักรบขวาน',     stats: { def: 5, hp: 8 } },
  { id: 'cloak',     slot: 'body', name: 'ผ้าคลุมนักล่าสายลม',     stats: { def: 3, move: 3 } },
  { id: 'shorts',    slot: 'legs', name: 'กางเกงเงาปลายปากกา',     stats: { def: 1, move: 4 } },
  { id: 'trousers',  slot: 'legs', name: 'กางเกงปราชญ์หมึก',       stats: { def: 3, hp: 6 } },
  { id: 'greaves',   slot: 'legs', name: 'สนับแข้งอัศวินพับ',      stats: { def: 5 } },
  { id: 'hidepants', slot: 'legs', name: 'กางเกงหนังนักรบขวาน',    stats: { def: 4, hp: 6 } },
  { id: 'windlegs',  slot: 'legs', name: 'สนับขานักล่าสายลม',      stats: { def: 2, move: 5 } },
  { id: 'ring',      slot: 'acc',  name: 'แหวนหยดหมึก',        stats: { crit: 3, skillPct: 5 } },
  { id: 'amulet',    slot: 'acc',  name: 'จี้ปลายปากกา',        stats: { hp: 15, regen: 1 } },
  { id: 'bracelet',  slot: 'acc',  name: 'สายรัดข้อหมึก',       stats: { atkPct: 5, aspd: 5 } },
  { id: 'earring',   slot: 'acc',  name: 'ตุ้มหูกระดาษ',        stats: { ink: 10, skillPct: 4 } },
  { id: 'charm',     slot: 'acc',  name: 'เครื่องรางปากกา',     stats: { def: 4, hp: 12 } }
];
PD_DATA.gearScalePerLevel = 0.2;   // ค่าฐานชุด +20% ต่อ item level
// ===== 10 ช่วงเลเวลอุปกรณ์: ilvl สุ่มจากช่วงที่ตรงกับเลเวลมอนสเตอร์ =====
PD_DATA.equipBrackets = [
  { min: 1, max: 10 }, { min: 11, max: 20 }, { min: 21, max: 30 }, { min: 31, max: 40 }, { min: 41, max: 50 },
  { min: 51, max: 60 }, { min: 61, max: 70 }, { min: 71, max: 80 }, { min: 81, max: 90 }, { min: 91, max: 100 }
];
// ===== เซตอุปกรณ์: อาวุธ (ชนิด) + เสื้อ + กางเกง ครบ 3 ชิ้น → ออปชันพิเศษคงที่ (ไม่สุ่ม) + แสงเรืองรอบตัว =====
// bonus ใช้รหัสเดียวกับออปชัน · aura.style: flame / shadow / rage / spark / orbit
PD_DATA.gearSets = [
  { id: 'paper_knight', name: 'อัศวินกระดาษพับ', weapon: 'sword',  body: 'coat',  legs: 'greaves',   bonus: { def: 12, hp: 40, atkPct: 8 },   aura: { color: '#e8c21a', style: 'flame' } },
  { id: 'shadow_nib',   name: 'เงาปลายปากกา',   weapon: 'dagger', body: 'vest',  legs: 'shorts',    bonus: { crit: 12, move: 8 },            aura: { color: '#7a2fa8', style: 'shadow' } },
  { id: 'axe_berserk',  name: 'นักรบขวานหมึก',   weapon: 'axe',    body: 'hide',  legs: 'hidepants', bonus: { atkPct: 14, leech: 3, hp: 25 }, aura: { color: '#d23a2a', style: 'rage' } },
  { id: 'wind_hunter',  name: 'นักล่าสายลม',     weapon: 'spear',  body: 'cloak', legs: 'windlegs',  bonus: { aspd: 12, move: 8, atkPct: 6 }, aura: { color: '#3a9ad9', style: 'spark' } },
  { id: 'ink_sage',     name: 'ปราชญ์หมึก',      weapon: 'staff',  body: 'robe',  legs: 'trousers',  bonus: { skillPct: 15, ink: 30, regen: 1.5 }, aura: { color: '#3c9a5c', style: 'orbit' } }
];
PD_DATA.mythicNames = ['ปากกาที่เขียนโลก', 'หมึกแรกของจักรวาล', 'เส้นที่ไม่มีวันลบ', 'หน้ากระดาษสุดท้าย', 'ดาบแห่งต้นฉบับ'];
// ===== สกิลประจำอาวุธ =====
// weaponSkills[weaponBaseId] = สกิลที่ใช้ได้เมื่อถืออาวุธนั้น (อ้าง id ใน PD_DATA.weaponSkillDefs)
PD_DATA.weaponSkills = {
  sword:  ['wsk_back_dash', 'wsk_fwd_dash'],
  dagger: ['wsk_back_dash', 'wsk_fwd_dash'],
  axe:    ['wsk_block'],
  spear:  ['wsk_push'],
  staff:  ['wsk_area_magic']
};
// คำอธิบายสกิลอาวุธ
PD_DATA.weaponSkillDefs = {
  wsk_back_dash:  { name: 'ถอยเงา', icon: '⇦', ink: 5, cd: 4, desc: 'ถอยหลังพร้อมเงาทิ้งไว้', dist: 1.7, invuln: 0.4 },
  wsk_fwd_dash:   { name: 'พุ่งตะลุย', icon: '⇨', ink: 5, cd: 4, desc: 'พุ่งไปข้างหน้าพร้อมเส้นวาร์ป', dist: 1.9, invuln: 0.3 },
  wsk_block:      { name: 'ตั้งรับ', icon: '🛡', ink: 5, cd: 2, desc: 'ตั้งรับ ไม่โดนดาเมจ 1.5 วินาที (โจมตีไม่ได้)', dur: 1.5 },
  wsk_push:       { name: 'ผลักไล่', icon: '⇶', ink: 5, cd: 3, desc: 'ผลักศัตรูด้วยกรวยกว้าง ไม่โดนดาเมจ 1.5 วิ', arc: 150, range: 2.0, invuln: 1.5 },
  wsk_area_magic: { dropColor: '#1b1b1b', name: 'อสุนีหมึก', icon: '⚡', ink: 20, cd: 20, desc: 'แตะพื้นเพื่อเลือกเป้าหมาย ลำแสงหมุนวนต่อเนื่อง 5 วินาที', castTime: 2, maxLv: 3, power: [4.5, 5.0, 6.0], range: 6, area: 2.5, dur: 5, targetGround: true }
};

PD_DATA.heroSprite = null; // รูปตัวละครผู้เล่น (ตั้งใน Editor): { idle:{src,frames,fps}, walk:{..}, atk:{..}, scale }

// ค่าที่สุ่มจริงตาม Tier 1–10 ต่อประเภทอุปกรณ์
PD_DATA.affixPools = {
  weapon: {
    physFlat: {"weight":100,"ranges":[[6,9],[10,14],[14,22],[22,32],[30,45],[36,54],[44,65],[51,77],[60,90],[69,103]]},
    atkPct: {"weight":90,"ranges":[[3,4],[4,6],[5,8],[7,10],[8,12],[9,13],[10,15],[11,17],[12,18],[13,20]]},
    crit: {"weight":80,"ranges":[[2,4],[4,6],[6,9],[8,12],[10,15],[12,18],[14,21],[16,24],[18,27],[20,30]]},
    critDamage: {"weight":70,"ranges":[[7,11],[10,15],[13,20],[17,26],[20,30],[22,34],[25,38],[28,41],[30,45],[33,50]]},
    aspd: {"weight":80,"ranges":[[3,4],[4,6],[5,8],[7,10],[8,12],[9,13],[10,15],[11,17],[12,18],[13,20]]},
    hp: {"weight":40,"ranges":[[12,20],[19,32],[29,48],[43,72],[60,100],[72,120],[87,145],[102,170],[120,200],[138,230]]},
    str: {"weight":100,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    dex: {"weight":100,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    agi: {"weight":80,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    vit: {"weight":60,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    int: {"weight":80,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
  },
  body: {
    physFlat: {"weight":30,"ranges":[[2,3],[3,5],[4,7],[6,11],[8,15],[10,18],[12,22],[14,26],[16,30],[18,35]]},
    atkPct: {"weight":25,"ranges":[[1,2],[2,3],[2,3],[3,4],[3,5],[3,6],[4,6],[4,7],[5,8],[5,8]]},
    crit: {"weight":25,"ranges":[[1,2],[1,3],[2,3],[2,4],[2,5],[3,5],[3,6],[4,6],[4,7],[5,8]]},
    aspd: {"weight":24,"ranges":[[1,1],[1,2],[1,3],[2,3],[2,4],[2,4],[3,5],[3,6],[3,6],[3,7]]},
    def: {"weight":120,"ranges":[[5,8],[8,13],[12,19],[18,29],[25,40],[30,48],[36,58],[43,68],[50,80],[57,92]]},
    defPct: {"weight":100,"ranges":[[3,4],[4,6],[5,8],[7,10],[8,12],[9,13],[10,15],[11,17],[12,18],[13,20]]},
    hp: {"weight":110,"ranges":[[16,26],[26,42],[38,62],[58,94],[80,130],[96,156],[116,189],[136,221],[160,260],[184,299]]},
    hpPct: {"weight":90,"ranges":[[2,4],[3,5],[4,7],[5,9],[6,10],[7,11],[8,13],[8,14],[9,15],[10,17]]},
    str: {"weight":60,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    dex: {"weight":60,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    agi: {"weight":60,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    vit: {"weight":100,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    int: {"weight":70,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
  },
  legs: {
    physFlat: {"weight":10,"ranges":[[1,2],[1,3],[2,4],[3,6],[4,8],[5,10],[6,12],[7,14],[8,16],[9,18]]},
    atkPct: {"weight":9,"ranges":[[1,1],[1,2],[1,3],[2,3],[2,4],[2,4],[3,5],[3,6],[3,6],[3,7]]},
    crit: {"weight":25,"ranges":[[1,2],[1,3],[2,3],[2,4],[2,5],[3,5],[3,6],[4,6],[4,7],[5,8]]},
    aspd: {"weight":8,"ranges":[[1,1],[1,2],[1,2],[1,3],[1,3],[1,3],[1,4],[1,4],[2,5],[2,5]]},
    def: {"weight":120,"ranges":[[4,7],[6,11],[10,17],[14,25],[20,35],[24,42],[29,51],[34,60],[40,70],[46,81]]},
    defPct: {"weight":100,"ranges":[[2,4],[3,5],[4,7],[5,9],[6,10],[7,11],[8,13],[8,14],[9,15],[10,17]]},
    hp: {"weight":100,"ranges":[[12,22],[19,35],[29,53],[43,79],[60,110],[72,132],[87,160],[102,187],[120,220],[138,253]]},
    hpPct: {"weight":80,"ranges":[[2,3],[3,4],[3,5],[4,7],[5,8],[6,9],[6,10],[7,11],[8,12],[8,13]]},
    dodge: {"weight":80,"ranges":[[1,2],[2,3],[2,3],[3,4],[3,5],[3,6],[4,6],[4,7],[5,8],[5,8]]},
    move: {"weight":70,"ranges":[[1,2],[2,3],[3,4],[3,5],[4,6],[4,7],[5,8],[6,8],[6,9],[7,10]]},
    str: {"weight":60,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    dex: {"weight":70,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    agi: {"weight":100,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    vit: {"weight":100,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
    int: {"weight":60,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]]},
  },
  staff: {
    magicDmg: {"weight":100,"ranges":[[3,4],[4,6],[5,8],[7,10],[8,12],[9,13],[10,15],[11,17],[12,18],[13,20]],"secondaryOnly":false},
    spellDamage: {"weight":90,"ranges":[[3,4],[4,6],[5,8],[7,10],[8,12],[9,13],[10,15],[11,17],[12,18],[13,20]],"secondaryOnly":false},
    int: {"weight":80,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]],"secondaryOnly":false},
    ink: {"weight":65,"ranges":[[3,5],[5,8],[8,12],[11,18],[15,25],[18,30],[22,37],[26,43],[30,50],[35,58]],"secondaryOnly":false},
    regen: {"weight":50,"ranges":[[1,1],[1,2],[1,2],[1,3],[1,3],[1,3],[1,4],[1,4],[2,5],[2,5]],"secondaryOnly":true},
    hp: {"weight":40,"ranges":[[12,20],[19,32],[29,48],[43,72],[60,100],[72,120],[87,145],[102,170],[120,200],[138,230]],"secondaryOnly":true},
    move: {"weight":25,"ranges":[[1,2],[2,3],[3,4],[3,5],[4,6],[4,7],[5,8],[6,8],[6,9],[7,10]],"secondaryOnly":true},
    vit: {"weight":35,"ranges":[[2,2],[3,4],[4,6],[6,9],[8,12],[10,14],[12,17],[14,20],[16,24],[18,28]],"secondaryOnly":true},
  },
};

PD_DATA.affixes.push(
  {"id":"physFlat","word":"โจมตีกายภาพ","text":"+{v} โจมตีกายภาพ"},
  {"id":"critDamage","word":"ตัวคูณดาเมจคริติคอล","text":"+{v}% ตัวคูณดาเมจคริติคอล"},
  {"id":"physPen","word":"เจาะเกราะกายภาพ","text":"+{v}% เจาะเกราะกายภาพ"},
  {"id":"defPct","word":"เกราะ","text":"+{v}% เกราะ"},
  {"id":"hpPct","word":"HP สูงสุด","text":"+{v}% HP สูงสุด"},
  {"id":"physReduce","word":"ลดดาเมจกายภาพ","text":"{v}% ลดดาเมจกายภาพ"},
  {"id":"magicReduce","word":"ลดดาเมจเวท","text":"{v}% ลดดาเมจเวท"},
  {"id":"dodge","word":"โอกาสหลบ","text":"+{v}% โอกาสหลบ"},
  {"id":"str","word":"STR","text":"+{v} STR"},
  {"id":"dex","word":"DEX","text":"+{v} DEX"},
  {"id":"agi","word":"AGI","text":"+{v} AGI"},
  {"id":"vit","word":"VIT","text":"+{v} VIT"},
  {"id":"int","word":"INT","text":"+{v} INT"},
  {"id":"magicDmg","word":"เจาะเวท","text":"+{v}% ดาเมจเวท"},
  {"id":"spellDamage","word":"ร่ายหมึก","text":"+{v}% ดาเมจสกิลเวท"}
);
