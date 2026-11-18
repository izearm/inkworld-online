// @ts-nocheck
// ===== Paper Dungeon: Ink World — ค่าตั้งระบบหลัก (แก้ตัวเลขได้ที่นี่) =====
window.PD_DATA = window.PD_DATA || {};
PD_DATA.config = {
  // หลอดเลือดบอส: 1 ชั้น = hpPerBar HP (ชั้นล่างสุดสีแรก ชั้นถัดไปสีถัดไป) · ถ้าบอสมี HP มากเกิน maxBars ชั้น → HP ต่อชั้นเพิ่มให้พอดี
  bossBar: { hpPerBar: 500, maxBars: 8, colors: ['#d23a2a', '#2f6fd6', '#8a3fd1', '#3c9a5c', '#e08a1b', '#1f9aa8', '#d6479a', '#7a5230'] },
  // ป้ายเป้าหมาย (ตีโดนศัตรู → โชว์ชื่อ · เลเวล · หลอดเลือด) show = วินาทีที่ค้าง · hard/easy = ส่วนต่างเลเวลเทียบผู้เล่นที่เปลี่ยนสี (แดง/เทา)
  targetLabel: { show: 4, hard: 3, easy: -3 },
  firstStageHpMult: 0.6, // ดินแดนแรก (หมู่บ้าน): ตัวคูณ HP มอนสเตอร์ (ไม่รวมบอส) — ลดให้ผู้เล่นใหม่ผ่อนคลาย
  mapNameIntro: 2.8, // วินาทีที่ชื่อพื้นที่โชว์กลางจอก่อนย่อเป็นป้ายเล็ก
  version: 'Phase0.5.4',
  lowResHeight: 220,          // ความสูงจอภายใน (พิกเซลต่ำ) — ภาพถูกขยายแบบ pixelated
  tileW: 32, tileH: 16, wallH: 20, wallLowH: 6, // ขนาดช่อง isometric (logical px) · wallLowH = กำแพงด้านหน้าแบบตัดเตี้ย
  playerRadius: 0.28,         // รัศมีชนที่เท้า (หน่วย = ช่อง)
  playerSpeed: 4.4,           // ช่อง/วินาที (v1.0.2: 3.4 → 4.4)
  attackMoveMult: 0.55,       // ระหว่างฟันเดินได้ 55%
  hurtInvuln: 0.7,            // อมตะหลังโดนตี (วินาที)
  consumableCooldown: 5,      // คูลดาวน์แยกตามชนิดไอเท็ม (วินาที)
  staffAttackMultiplier: 0.36,
  potionHealPct: 0.45, potionStart: 3, potionMax: 99,
  inventoryMax: 32, // v2.3.7: ขยายจาก 24 (คำสั่งผู้ใช้)
  exp: { base: 18, pow: 1.55 },       // EXP ที่ต้องใช้ = base * level^pow
  deathExpLossPct: 0.10,              // ตายเสีย EXP 10% ของหลอดปัจจุบัน (ไม่ลดเลเวล)
  bridge: { duration: 45, inkCost: 10, range: 1.9 },
  interactRange: 1.5,
  pickupRange: 0.75,
  autoAimRange: 3.8,
  cameraSmooth: 3.2,          // ความไวกล้องตอนเดิน (น้อย = นุ่ม/ไม่เวียนหัว)
  cameraRecenter: 1.4,        // ความไวที่กล้องค่อยๆ กลับมากลางจอเมื่อหยุดเดิน
  cameraDeadX: 26, cameraDeadY: 14, // กรอบที่ตัวละครขยับได้โดยกล้องไม่ขยับ (พิกเซลต่ำ)
  cameraShake: false,         // สั่นจอ (ปิดไว้ กันเวียนหัว)
  attackTime: 0.34,           // เวลาฟัน 1 ครั้ง (วิ) ÷ ความเร็วอาวุธ — v1.0.1: 0.46, v1.0.0: 0.75
  attackHitAt: 0.32,          // จุดที่ดาเมจเกิดในท่าฟัน (สัดส่วน)
  attackMinTime: 0.16,
  ultCastTime: 2.5,           // เวลาร่ายท่าไม้ตาย (วินาที)
  bossPower: { atkMult: 0.82, atkPerTier: 0.015, enrageAt: 0.5, enrageCd: 0.7 }, // บอสเก่งขึ้นทุกด่าน (tier = ลำดับดินแดน 0-6)
  lumi: { base: 3, perLevel: 0.25, bossMult: 12, chest: 15 }, // เงิน Lumi ที่ตกจากมอนสเตอร์
  puzzle: { traceTime: 20, traceInkPerTile: 1, circuitInk: 4 },
  bossCharge: { lockExtra: 0.5, speedMult: 1.25, stagger: 0.22, stunChance: 0.35 },
  bossSpeed: { patternCd: 0.6, windup: 0.85, attack: 0.7 }, // บอสออกท่าเร็วขึ้น (ตัวคูณเวลา ยิ่งน้อยยิ่งเร็ว)
  cameraScreenY: 0.56,        // ตำแหน่งตัวละครบนจอแนวตั้ง (0=บน 1=ล่าง)
  occlusionAlpha: 0.38,       // ความโปร่งของกำแพงที่บังตัวละคร
  worldGrid: { cols: 7, rows: 5, home: [3, 2] },
  placement: {                // ระยะจากหมู่บ้าน (Chebyshev) → นิสัยดินแดน
    warm:    { maxDist: 1,  lvl: -1, loot: 1.0, label: 'อบอุ่น' },
    normal:  { maxDist: 2,  lvl: 0,  loot: 1.25, label: 'ธรรมดา' },
    strange: { maxDist: 99, lvl: 2,  loot: 1.8, label: 'แปลกประหลาด' }
  },
  equipmentDrops: { normal: 0.20, alpha: 0.45, boss: 1, accessoryNormal: 0.10, accessoryAlpha: 0.10, accessoryBoss: 0.35 },
  dropChance: { weapon: 0.16, gear: 0.12, potion: 0.08, bossWeapons: 2, chestWeapons: 1 },
  // v2.0.3 สมดุลศัตรูแบบอ้างอิงผู้เล่น P50: HP ศัตรู = (hp ฐาน ÷ mobRefHp) × เวลากำจัดเป้า × refDps(เลเวล) · บอส = เวลากำจัดตามลำดับดินแดน × refDps
  // refDps = DPS ของผู้เล่นมัธยฐาน ln(dps)=a+b·ln(L)+c·ln²(L) · ค่าจาก `node tests/play/evalpage.cjs tests/play/cases/balance_calibrate.js` (รันใหม่ทุกครั้งที่แก้สูตรไอเท็ม/ผู้เล่น)
  refDps: [2.674, 0.1972, 0.21882],
  refEhp: [4.50997, 0.48896, 0.08414], // ความทนของผู้เล่นมัธยฐาน EHP=HP/(1-ลดดาเมจ) (ฟิตแบบเดียวกัน) · ATK ศัตรู = d.atk ÷ atkRef × refEhp(L) ÷ hits
  ttk: { mob: 3.0, tank: 5.5, tankHp: 28, mobRefHp: 18, tankRefHp: 32.5, alphaHp: 2.3, hits: 10, atkRef: 7.65, boss: { start: 20, end: 120, mainLast: 6, postBase: 30, postStep: 5 } }, // tank = มอนที่ hp ฐาน ≥ tankHp · ความต่างของ hp/atk ฐานในกลุ่มเดียวกันคงไว้แค่ 30% (กันศัตรูท้ายเกมเพี้ยนจากตัวเลขฐาน) · hits = มอนทั่วไปตีผู้เล่น P50 ตายกี่ครั้ง · เป้า (วินาที ที่ P50): มอน 2–4 · Tank 4–7 · Elite=Alpha 6–12 · บอสต้นเกม 20 → ผู้ลบ (ด่านสุดท้ายเนื้อเรื่อง order 6) 120 → ดินแดนหลังจบ 120+postBase แล้ว +postStep/ด่าน (postBase ชดเชยที่ผู้เล่นเลเวลสูงขึ้นระหว่างเล่นดินแดนนั้น)
  enemyScale: { exp: 0.3 }, // exp เชิงเส้นเดิม (HP/ATK ศัตรูใช้ refDps/refEhp ด้านบน)
  // ===== v1.0.9 =====
  // ธาตุ: ตัวคูณดาเมจ [ธาตุที่ตี][ธาตุศัตรู] (ไม่ระบุ = ×1) · ice ของผู้เล่นนับเป็นน้ำ
  elements: {
    names: { normal: 'ปกติ', fire: 'ไฟ', earth: 'ดิน', water: 'น้ำ', bolt: 'สายฟ้า' },
    colors: { normal: '#555555', fire: '#e0412b', earth: '#9a6a2a', water: '#3a8de0', bolt: '#e8c21a' },
    attackOf: { fire: 'fire', ice: 'water', bolt: 'bolt' },
    chart: { normal: {}, fire: { earth: 2, bolt: 0.5 }, earth: { water: 2, fire: 0.5 }, water: { bolt: 2, earth: 0.5 }, bolt: { water: 2, fire: 1.5 } }
  },
  burn: { time: 3, tick: 0.5, pct: 0.3 },          // ไฟ: เผาต่อเนื่อง 3 วิ รวม 30% ของดาเมจที่โดน
  chill: { time: 2, mul: 0.55 },                   // น้ำแข็ง: ช้าเหลือ 55% นาน 2 วิ
  boltChain: { range: 2.6, mult: [0.8, 0.5, 0.15, 0.15] }, // สายฟ้า: กระโดดต่อ (ตัวแรก 100%) รวมไม่เกิน 5 ตัว
  poison: { time: 5, dpsAtk: 0.25 },               // พิษ (เผ่าต่างดาว): 5 วิ · ต่อวินาที = 25% ของพลังโจมตีศัตรู
  stunTime: 3,
  alpha: { chance: 0.3, mult: 1.3, exp: 2, loot: 2, color: '#7a2fa8' }, // Alpha: 1 ตัวต่อกลุ่มศัตรู (ไม่มีในบอส)
  shop: [                                          // ร้านค้า NPC พ่อค้า (ราคาเป็น Lumi)
    { kind: 'potion', name: 'ยาเติมพลัง', price: 50, desc: 'ฟื้น HP 45%' },
    { kind: 'inkpot', name: 'ยาเติมน้ำหมึก', price: 60, desc: 'ฟื้นหมึก 50%' },
    { kind: 'antidote', name: 'ยาแก้พิษ', price: 40, desc: 'หายพิษทันที' }
  ],
  inkpotPct: 0.5,
  sellByLevel: [[1, 5], [10, 150], [20, 300]], // ราคาขายอุปกรณ์ตามเลเวลไอเท็ม [เลเวล, ลูมิ] — ระหว่างจุดเป็นเส้นตรง เกินจุดท้ายต่อด้วยความชันเดิม
  sellRarityMult: [1, 1, 1, 1, 1],                 // ตัวคูณตามความหายาก (ธรรมดา→เทพนิยาย) ตอนนี้ล็อกตามเลเวลอย่างเดียว = 1 ทุกระดับ
  sellPrice: [200, 1200, 4500, 11000, 22000],     // ราคาขายอุปกรณ์ตามระดับ tier1–5 (ธรรมดา → เทพนิยาย)
  sellConsumablePct: 0.5,                          // ขายยาได้ครึ่งราคา
  storageMax: 48,                                  // จุดรับฝาก (หมู่บ้านเท่านั้น)
  tailSlam: { closeTime: 3, range: 1.8, radius: 3.4, stunChance: [0.15, 0.2, 0.35], dmgMult: 1.5 }, // บอสแมงป่อง: ยืนชิด > 3 วิ → ทุบพื้น
  // ===== v1.1.0 =====
  bossRecovery: { healPct: 0.10, tickRate: 1.0 },  // บอสฟื้น 10% maxHP/วิ เมื่อผู้เล่นออกจากห้อง
  bossDetectRange: 12,                              // ระยะบอสจับผู้เล่น (ช่อง)
  spriteStandard: { hero: [48, 48], npc: [48, 48], monsterS: [32, 32], monsterM: [48, 48], monsterL: [64, 64], boss: [96, 96], bossGiant: [128, 128], item: [16, 16], fx: [64, 64], footY: 4 }, // ดู docs/SPRITE_STANDARD.md (ยังไม่ใช้ในเอนจิน ใช้เมื่อเปลี่ยนเป็น sprite)
  dungeonLock: false,                               // v2.0.1: เปลี่ยนอาวุธ/สกิลในดันเจี้ยนได้ปกติ (ตั้ง true เพื่อห้าม)
  sound: {
    enabled: true,
    musicVol: 0.3,
    sfxVol: 0.5,
    townMusic: 'snd/town.mp3',
    dungeonMusic: 'snd/dungeon.mp3',
    sfx: { hit: 'snd/hit.mp3', monDeath: 'snd/mon_death.mp3', bossDeath: 'snd/boss_death.mp3', coin: 'snd/coin.mp3', item: 'snd/item.mp3' }
  }
};

