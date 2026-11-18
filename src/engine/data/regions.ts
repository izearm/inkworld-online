// @ts-nocheck
// ===== 7 ดินแดน (เมืองใหญ่) × 3 แผนที่ =====
// map[0] = เมือง (town, ปลอดภัย, มี NPC) · map[1] = ดันเจี้ยน (มีปริศนา/ไอเท็มเควส) · map[2] = ดันเจี้ยนลึก (บอส)
// dungeon: cells=[คอลัมน์,แถว] ของช่องห้อง (ช่องละ 11 tile), rooms=จำนวนห้องที่ต่อกันเป็นสาย
// puzzle: ตัวเลข = ห้องที่ถูกปิดทางเข้า (ของช่วยไขอยู่ห้องก่อนหน้า)
//   trace=เดินวาดทับเส้นประ, circuit=ต่อเส้นหมึกให้ครบวง, erase=ลบกำแพงดินสอด้วยยางลบ, bridge=วาดสะพานข้ามเหว
//   ink=[ห้อง,ห้อง] ประตูหมึกดำ/ขาว+สวิตช์, fold=[ห้อง,ห้อง] พับกระดาษ+สวิตช์, search=จำนวนกองกระดาษให้ค้นหา
// collect = จำนวนไอเท็มเควสรอง (land.sideItem) ที่วางในแผนที่นี้
// *** v2.0.1: baseLevel ไล่ตามเลเวลผู้เล่นที่ควรมีตอนมาถึง (เคลียร์เต็มทุกดินแดน): village1 cave4 lib7 field9 castle12 sea15 tree18 + postgame 21/25/29 · bonus 30/34/38 ***
PD_DATA.lands = [
  { id: 'village', order: 0, extraQuests: ['ink_letters'], name: 'หมู่บ้านว่างเปล่า', mood: 'เหงา เงียบ', story: 'ไม่มีใครจำใครได้',
    puzzleText: 'สอนวาดเส้น: เดินวาดทับเส้นประ', theme: 'village', baseLevel: 1, color: '#e8b04a',
    mainQuest: 'q_village', sideQuest: 's_village', sideItem: 'laugh_piece', nextPage: 'slime_cave',
    maps: [
      { name: 'หมู่บ้านว่างเปล่า', type: 'town', w: 26, h: 22, houses: 6, trees: 10, room: { x: 4, y: 3, w: 6, h: 5, npc: 'artifact_keeper' } }, // v2.3: บ้านความทรงจำ เดินเข้าไปได้ ร้าน Artifact อยู่ข้างใน
      { name: 'ทุ่งขอบกระดาษ', type: 'dungeon', cells: [4, 3], rooms: 8, roomMin: 6, roomMax: 9, enemies: [['blob', 13], ['crow', 5]], puzzle: { trace: 4 }, items: ['torn_diary'], chests: 1, collect: 2 },
      { name: 'บ่อน้ำเก่า', type: 'dungeon', cells: [4, 3], rooms: 6, roomMin: 6, roomMax: 9, enemies: [['blob', 10], ['crow', 8]], boss: 'boss_smudge', chests: 1, collect: 1 }
    ] },
  { id: 'slime_cave', order: 1, name: 'ถ้ำสไลม์', mood: 'คิดถึงเพื่อน', story: 'เด็กคนหนึ่งลืมเพื่อนที่เป็นสไลม์ แต่สไลม์ยังรออยู่หน้าถ้ำทุกวัน',
    puzzleText: 'วาดสะพานข้ามเหว ตามหารูปวาดของเพื่อน', theme: 'cave', baseLevel: 5, color: '#6fbf73',
    mainQuest: 'q_slime', sideQuest: 's_slime', sideItem: 'shiny_goo', nextPage: 'ink_library',
    maps: [
      { name: 'ปากถ้ำ', type: 'town', w: 24, h: 20, houses: 3, trees: 12 },
      { name: 'ถ้ำชั้นนอก', type: 'dungeon', cells: [4, 4], rooms: 10, roomMin: 6, roomMax: 9, enemies: [['slime', 15], ['bat', 10]], puzzle: { bridge: 5 }, items: ['friend_drawing'], chests: 1, collect: 2 },
      { name: 'ถ้ำชั้นใน', type: 'dungeon', cells: [4, 3], rooms: 8, roomMin: 6, roomMax: 9, enemies: [['slime', 12], ['slime_mage', 8], ['bat', 5]], boss: 'boss_greyslime', chests: 1, collect: 1 }
    ] },
  { id: 'ink_library', order: 2, name: 'ห้องสมุดหมึก', mood: 'อยากจำ แต่ก็กลัวเจ็บ', story: 'บรรณารักษ์ลบความทรงจำตัวเองทิ้ง แต่อยากจำได้อีกครั้ง',
    puzzleText: 'ลบกำแพงดินสอด้วยยางลบ + ค้นกองกระดาษ', theme: 'library', baseLevel: 8, color: '#7d8fd8',
    mainQuest: 'q_library', sideQuest: 's_library', sideItem: 'bookmark', nextPage: 'pencil_field',
    maps: [
      { name: 'ห้องโถงหมึก', type: 'town', w: 24, h: 20, houses: 7, trees: 0 },
      { name: 'ชั้นหนังสือ', type: 'dungeon', cells: [5, 3], rooms: 10, roomMin: 6, roomMax: 9, enemies: [['book', 15], ['ghost', 10]], puzzle: { erase: 5, search: 4 }, items: ['sad_book'], chests: 1, collect: 2 },
      { name: 'ห้องเก็บเรื่องเศร้า', type: 'dungeon', cells: [4, 3], rooms: 8, roomMin: 6, roomMax: 9, enemies: [['book', 10], ['imp', 10], ['ghost', 5]], boss: 'boss_bookdemon', chests: 1, collect: 1 }
    ] },
  { id: 'pencil_field', order: 3, name: 'ทุ่งดินสอ', mood: 'อบอุ่น ขำๆ', story: 'ชาวนาปลูกดินสอแทนข้าว เพราะไม่มีใครวาดรูปแล้ว',
    puzzleText: 'ต่อเส้นหมึกให้ครบวงจร + ค้นกองฟาง', theme: 'field', baseLevel: 10, color: '#f0c43c',
    mainQuest: 'q_field', sideQuest: 's_field', sideItem: 'pencil_seed', nextPage: 'folded_castle',
    maps: [
      { name: 'บ้านลุงแดง', type: 'town', w: 26, h: 20, houses: 3, trees: 14 },
      { name: 'ทุ่งดินสอ', type: 'dungeon', cells: [5, 3], rooms: 10, roomMin: 6, roomMax: 9, enemies: [['alien', 12], ['crow', 10], ['goblin', 8]], puzzle: { circuit: 5, search: 5 }, items: ['golden_pencil'], chests: 1, collect: 2 },
      { name: 'จานบินตก', type: 'dungeon', cells: [4, 3], rooms: 8, roomMin: 6, roomMax: 9, enemies: [['alien', 12], ['goblin', 10]], boss: 'boss_alien', chests: 1, collect: 1 }
    ] },
  { id: 'folded_castle', order: 4, name: 'ปราสาทพับ', mood: 'กลัวการออกไปข้างนอก', story: 'เจ้าชายพับกระดาษเป็นปราสาทเพื่อซ่อนตัว เพราะกลัวถูกลบอีก',
    puzzleText: 'พับกระดาษเปิด/ปิดทาง', theme: 'castle', baseLevel: 12, color: '#e07fa0',
    mainQuest: 'q_castle', sideQuest: 's_castle', sideItem: 'paper_bird', nextPage: 'ink_sea',
    maps: [
      { name: 'ลานหน้าปราสาท', type: 'town', w: 24, h: 22, houses: 5, trees: 6 },
      { name: 'ทางเดินพับ', type: 'dungeon', cells: [4, 4], rooms: 11, roomMin: 6, roomMax: 9, enemies: [['knight', 12], ['crane', 12]], puzzle: { fold: [4, 6] }, items: ['paper_window'], chests: 1, collect: 2 },
      { name: 'หอคอยพับซ้อน', type: 'dungeon', cells: [4, 3], rooms: 8, roomMin: 6, roomMax: 9, enemies: [['knight', 10], ['imp', 8], ['crane', 5]], boss: 'boss_origami', chests: 1, collect: 1 }
    ] },
  { id: 'ink_sea', order: 5, name: 'ทะเลหมึก', mood: 'เศร้าแต่สวย', story: 'นางเงือกร้องเพลงไม่ได้แล้ว เพราะเสียงถูกลบไปกับหน้ากระดาษ',
    puzzleText: 'สลับหมึกดำ-ขาว เปิดประตูหมึก', theme: 'sea', baseLevel: 15, color: '#4aa6c9',
    mainQuest: 'q_sea', sideQuest: 's_sea', sideItem: 'ink_bubble', nextPage: 'ink_tree',
    maps: [
      { name: 'ชายหาดหมึก', type: 'town', w: 26, h: 20, houses: 3, trees: 8 },
      { name: 'ถ้ำทะเลกลับสี', type: 'dungeon', cells: [4, 4], rooms: 10, roomMin: 6, roomMax: 9, enemies: [['fishman', 12], ['jelly', 12]], puzzle: { ink: [3, 5, 7, 9] }, items: ['voice_shell'], chests: 1, collect: 2 },
      { name: 'ก้นทะเลหมึก', type: 'dungeon', cells: [4, 3], rooms: 8, roomMin: 6, roomMax: 9, enemies: [['jelly', 10], ['demon', 8], ['fishman', 5]], boss: 'boss_kraken', chests: 1, collect: 1 }
    ] },
  { id: 'ink_tree', order: 6, name: 'ต้นหมึก', mood: 'ความหวังสุดท้าย', story: 'ต้นไม้ต้นสุดท้ายที่ยังผลิตหมึกได้ แต่กำลังจะแห้งตาย',
    puzzleText: 'ทุกปริศนารวมกัน: สะพาน + ยางลบ + สลับหมึก + วงจร + ค้นหา', theme: 'tree', baseLevel: 18, color: '#3c9a5c',
    mainQuest: 'q_tree', sideQuest: 's_tree', sideItem: 'ink_leaf', nextPage: null,
    maps: [
      { name: 'รากต้นหมึก', type: 'town', w: 24, h: 22, houses: 0, trees: 18 },
      { name: 'กิ่งที่แห้ง', type: 'dungeon', cells: [5, 3], rooms: 11, roomMin: 6, roomMax: 9, enemies: [['shade', 12], ['demon', 8], ['alien', 8]], puzzle: { bridge: 2, erase: 3, ink: [4, 6], circuit: 5, search: 3 }, items: ['last_seed'], chests: 1, collect: 2 },
      { name: 'ยอดต้นหมึก', type: 'dungeon', cells: [4, 3], rooms: 8, roomMin: 6, roomMax: 9, enemies: [['eraser_bit', 12], ['shade', 8]], boss: 'boss_eraser', chests: 1, collect: 1 }
    ] },
  // ===== ดินแดนหลังจบเกม: ปลดเมื่อจบเกมแล้วกด "เดินเล่นในโลกต่อ" · เป็นไอคอนบนแผนที่โลก · เมือง + ดันเจี้ยนเดียวกว้างมาก =====
  // postgame: true · enemyMult = ตัวคูณ ATK ศัตรู (HP คงที่ตามเป้า TTK) · roomMin/roomMax = ขนาดห้อง (สูงสุด 9)
  { id: 'desert_city', order: 7, postgame: true, enemyMult: 1.25, name: 'เมืองทะเลทราย', mood: 'แห้งผาก', story: 'เมืองที่หมึกระเหยจนเหลือแต่ทราย สิ่งที่ถูกฝังไว้กำลังตื่น',
    theme: 'desert', baseLevel: 25, color: '#d9a74a',
    maps: [
      { name: 'เมืองทะเลทราย', type: 'town', w: 26, h: 22, houses: 5, trees: 8 },
      { name: 'สุสานทะเลทราย', type: 'openDesert', uniformEnemyLevel: true, w: 88, h: 40, enemies: [['mummy', 17], ['scorpion', 14], ['sandwraith', 10]], boss: 'boss_sandking', chests: 3 }
    ] },
  { id: 'dream_city', order: 8, postgame: true, enemyMult: 1.25, name: 'เมืองในความฝัน', mood: 'หลอน', story: 'เมืองที่คนหลับไม่ตื่น ความฝันของพวกเขาเริ่มมองกลับมา',
    theme: 'dream', baseLevel: 30, color: '#8a6fd1',
    maps: [
      { name: 'เมืองในความฝัน', type: 'town', w: 26, h: 22, houses: 5, trees: 8 },
      { name: 'ทางเดินฝันร้าย', type: 'dungeon', cells: [8, 5], rooms: 22, roomMin: 6, roomMax: 9, enemies: [['eyeball', 12], ['faceless', 14], ['maw', 14]], boss: 'boss_dreameater', chests: 3 }
    ] },
  { id: 'fairy_city', order: 9, postgame: true, enemyMult: 1.25, name: 'เมืองแฟร์รี่', mood: 'งดงามแต่อันตราย', story: 'เมืองที่สวยเกินจริง ทุกดอกไม้มีหนาม ทุกรอยยิ้มมีฟัน',
    theme: 'fairy', baseLevel: 40, color: '#d46fa8',
    maps: [
      { name: 'เมืองแฟร์รี่', type: 'town', w: 26, h: 22, houses: 5, trees: 12 },
      { name: 'ป่าหนามพันปี', type: 'dungeon', cells: [8, 5], rooms: 22, roomMin: 6, roomMax: 9, enemies: [['thornfairy', 14], ['shroom', 12], ['doll', 12], ['thornblob', 10]], boss: 'boss_fairyqueen', chests: 3 }
    ] },
  // ===== v2.0.12: ป่าเงาหมึก — ดินแดนหลังจบเกมระดับสูง · ไม่มีเมือง กดวางแล้วเป็นดันเจี้ยนทันที · บอส 3 ตัวออกทีละตัว =====
  // bossTier = ระดับความแรง/ท่าของบอส (เทียบดินแดนลำดับที่ 9) · bosses[].ttk = เวลาที่ผู้เล่นมัธยฐานใช้ฆ่า (วินาที)
  { id: 'shadow_forest', order: 14, postgame: true, single: true, enemyMult: 1.35, bossTier: 9, name: 'ป่าเงาหมึก', mood: 'เงียบ ลึก มืดลงเรื่อยๆ', story: 'ป่าที่ต้นไม้โตสูงขึ้นทุกครั้งที่มีใครลืมชื่อตัวเอง',
    theme: 'forest', baseLevel: 50, color: '#2f7a4a',
    maps: [
      { name: 'ป่าเงาหมึก', type: 'forest', w: 88, h: 42, enemies: [['thornblob', 14], ['shroom', 12], ['doll', 10], ['thornfairy', 12], ['shade', 8]], bosses: [{ type: 'boss_forest_slime', ttk: 85 }, { type: 'boss_treant', ttk: 115 }, { type: 'boss_stag', ttk: 150 }], chests: 5 }
    ] },
  // ===== v1.1.0: ดันเจี้ยนโบนัส 3 ชั้น (ไม่มีเมือง เข้าจากแผนที่โลก) =====
  // bonus: true · เปิดเมื่อจบเกม · ระดับศัตรูสูง · บอสพิเศษ
  { id: 'bonus_obsidian', order: 11, bonus: true, name: 'เหมืองออบซิเดียน', mood: 'มืดและหนัก', story: 'เหมืองที่ขุดลึกจนเจอสิ่งที่ไม่ควรเจอ',
    theme: 'cave', baseLevel: 55, color: '#2a2a2a',
    maps: [
      { name: 'เหมืองออบซิเดียน', type: 'dungeon', cells: [6, 4], rooms: 16, roomMin: 7, roomMax: 9, enemies: [['knight', 12], ['goblin', 10], ['demon', 8]], puzzle: { erase: 3, circuit: 4 }, boss: 'boss_obsidian', chests: 2 }
    ] },
  { id: 'bonus_void', order: 12, bonus: true, name: 'ช่องว่างระหว่างหน้า', mood: 'ว่างเปล่า', story: 'พื้นที่ระหว่างหน้ากระดาษ ที่ไม่ควรมีอะไรอยู่',
    theme: 'dream', baseLevel: 60, color: '#1a1a2e',
    maps: [
      { name: 'ช่องว่างระหว่างหน้า', type: 'dungeon', book: 'folded', enemies: [['faceless', 12], ['maw', 10], ['shade', 10]], boss: 'boss_voidmaw', chests: 2 }
    ] },
  { id: 'bonus_inkgod', order: 13, bonus: true, name: 'สมุดต้นฉบับ', mood: 'ศักดิ์สิทธิ์', story: 'สมุดเล่มแรกที่ทุกเส้นหมึกถูกเขียนจากที่นี่',
    theme: 'library', baseLevel: 70, color: '#0d0d0d',
    maps: [
      { name: 'สมุดต้นฉบับ', type: 'dungeon', book: 'graphite', enemies: [['shade', 14], ['demon', 12], ['eraser_bit', 10]], boss: 'boss_inkgod', chests: 3 }
    ] },
  // ===== แผนที่ลับ (ไม่บอกผู้เล่นล่วงหน้า): ได้หน้ากระดาษเมื่อทำเควสรอง "จดหมายหมึกหลงทาง" ครบ =====
  { id: 'min_world', order: 10, secret: true, name: 'min world', mood: '???', story: 'ที่ที่ไม่มีใครควรหาเจอ',
    theme: 'minworld', baseLevel: 18, color: '#2b2a24',
    maps: [
      { name: 'min world', type: 'town', w: 22, h: 18, houses: 3, trees: 4 }
    ] }
];
