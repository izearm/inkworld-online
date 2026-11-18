// @ts-nocheck
// ===== เควส: แต่ละดินแดนมีเควสหลัก 1 + เควสรอง 1 =====
// ประเภทขั้น (t): talk (คุย npc), talkMany (คุยครบทุกคน), item (เก็บไอเท็มเควส),
//                kill (ล้มเป้าหมาย), collect (เก็บของ count ชิ้น), ending (เปิดฉากจบ)
// reward.page = หน้ากระดาษดินแดนถัดไปที่ได้รับ
PD_DATA.questItems = {
  torn_diary:     { name: 'สมุดบันทึกขาดๆ', desc: 'ลายมือสั่นๆ เขียนเรื่องชาสองถ้วย' },
  friend_drawing: { img: 'quest-item/003.webp', name: 'รูปวาดเด็กกับสไลม์', desc: 'วาดด้วยดินสอทื่อๆ สองสามแท่ง' },
  sad_book:       { name: 'หนังสือปกสีเทา', desc: 'หนักกว่าที่คิด' },
  golden_pencil:  { name: 'ดินสอทอง', desc: 'เมล็ดพันธุ์ดินสอรุ่นแรก' },
  paper_window:   { img: 'quest-item/005.webp', name: 'หน้าต่างกระดาษ', desc: 'พับไว้สี่ทบ กางออกเห็นท้องฟ้า' },
  voice_shell:    { img: 'quest-item/007.webp', name: 'เปลือกหอยเก็บเสียง', desc: 'แนบหูแล้วได้ยินเสียงฮัมเบาๆ' },
  last_seed:      { name: 'เมล็ดสุดท้าย', desc: 'หมึกหยดสุดท้ายของต้นหมึก' },
  laugh_piece:    { img: 'quest-item/002.webp', name: 'เสียงหัวเราะที่หล่นหาย', desc: 'เศษกระดาษที่มีเสียงหัวเราะติดอยู่' },
  shiny_goo:      { img: 'quest-item/004.webp', name: 'เมือกแวววาว', desc: 'สไลม์ชอบมาก' },
  bookmark:       { name: 'ที่คั่นหนังสือ', desc: 'คั่นไว้หน้าที่ยังอ่านไม่จบ' },
  pencil_seed:    { name: 'เมล็ดดินสอ', desc: 'ปลูกแล้วงอกเป็นดินสอ HB' },
  paper_bird:     { img: 'quest-item/006.webp', name: 'นกกระดาษ', desc: 'พับไม่ค่อยเนียน' },
  ink_bubble:     { img: 'quest-item/008.webp', name: 'ฟองหมึก', desc: 'แตกแล้วได้ยินเสียงคลื่น' },
  ink_leaf:       { name: 'ใบหมึก', desc: 'ใบไม้ที่ร่วงจากต้นหมึก' }
};

PD_DATA.quests = {
  // ----- หมู่บ้านว่างเปล่า -----
  q_village: { land: 'village', type: 'main', name: 'หมู่บ้านที่ไม่มีใครจำใคร', steps: [
    { t: 'talkMany', npcs: ['old_woman', 'man_bucket', 'girl_window'], dlg: { old_woman: 'v_old_1', man_bucket: 'v_man_1', girl_window: 'v_girl_1' }, text: 'คุยกับชาวบ้านทั้ง 3 คน' },
    { t: 'item', item: 'torn_diary', text: 'วาดเส้นตามเส้นประ แล้วหาสมุดบันทึกใน "ทุ่งขอบกระดาษ"' },
    { t: 'kill', target: 'boss_smudge', text: 'ลบรอยเปื้อนที่ "บ่อน้ำเก่า"' },
    { t: 'talk', npc: 'old_woman', dlg: 'v_old_end', text: 'นำสมุดกลับไปให้ยายไม่มีชื่อ' }
  ], reward: { exp: 60, page: 'slime_cave' } },
  s_village: { land: 'village', type: 'side', name: 'เสียงหัวเราะที่หล่นหาย', steps: [
    { t: 'collect', item: 'laugh_piece', count: 3, text: 'เก็บ "เสียงหัวเราะที่หล่นหาย" 3 ชิ้นในดันเจี้ยน' }
  ], reward: { exp: 40, weapon: 'magic' } },

  // ----- ถ้ำสไลม์ -----
  q_slime: { land: 'slime_cave', type: 'main', name: 'เพื่อนที่รออยู่หน้าถ้ำ', steps: [
    { t: 'talk', npc: 'kid_tom', dlg: 's_kid_1', text: 'คุยกับเด็กชายโท' },
    { t: 'talk', npc: 'slime_pom', dlg: 's_pom_1', text: 'คุยกับสไลม์หน้าถ้ำ' },
    { t: 'item', item: 'friend_drawing', text: 'วาดสะพานข้ามเหว หารูปวาดใน "ถ้ำชั้นนอก"' },
    { t: 'kill', target: 'boss_greyslime', text: 'ล้มสไลม์ยักษ์ใน "ถ้ำชั้นใน"' },
    { t: 'talk', npc: 'kid_tom', dlg: 's_kid_end', text: 'เอารูปวาดให้โทดู' }
  ], reward: { exp: 150, page: 'ink_library' } },
  s_slime: { land: 'slime_cave', type: 'side', name: 'ของขวัญให้ปอม', steps: [
    { t: 'collect', item: 'shiny_goo', count: 3, text: 'เก็บ "เมือกแวววาว" 3 ก้อน' }
  ], reward: { exp: 90, weapon: 'magic' } },

  // ----- ห้องสมุดหมึก -----
  q_library: { land: 'ink_library', type: 'main', name: 'หนังสือที่อยากลืม', steps: [
    { t: 'talk', npc: 'librarian_nim', dlg: 'l_nim_1', text: 'คุยกับบรรณารักษ์นิ่ม' },
    { t: 'item', item: 'sad_book', text: 'หายางลบ ลบกำแพงดินสอ แล้วค้นหา "หนังสือปกสีเทา" ใน "ชั้นหนังสือ"' },
    { t: 'kill', target: 'boss_bookdemon', text: 'ล้มปีศาจหน้าว่างใน "ห้องเก็บเรื่องเศร้า"' },
    { t: 'talk', npc: 'librarian_nim', dlg: 'l_nim_end', text: 'คืนหนังสือให้บรรณารักษ์' }
  ], reward: { exp: 280, page: 'pencil_field' } },
  s_library: { land: 'ink_library', type: 'side', name: 'หน้าที่ยังอ่านไม่จบ', steps: [
    { t: 'collect', item: 'bookmark', count: 3, text: 'เก็บ "ที่คั่นหนังสือ" 3 อัน' }
  ], reward: { exp: 160, weapon: 'rare' } },

  // ----- ทุ่งดินสอ -----
  q_field: { land: 'pencil_field', type: 'main', name: 'ดินสอทองของลุงแดง', steps: [
    { t: 'talk', npc: 'farmer_dang', dlg: 'f_dang_1', text: 'คุยกับลุงแดง' },
    { t: 'item', item: 'golden_pencil', text: 'ต่อวงจรเส้นหมึก แล้วค้นกองฟางหา "ดินสอทอง" ใน "ทุ่งดินสอ"' },
    { t: 'kill', target: 'boss_alien', text: 'ล้มราชาต่างดาวที่ "จานบินตก"' },
    { t: 'talk', npc: 'farmer_dang', dlg: 'f_dang_end', text: 'คืนดินสอทองให้ลุงแดง' }
  ], reward: { exp: 420, page: 'folded_castle' } },
  s_field: { land: 'pencil_field', type: 'side', name: 'เมล็ดที่ปลิวหาย', steps: [
    { t: 'collect', item: 'pencil_seed', count: 3, text: 'เก็บ "เมล็ดดินสอ" 3 เมล็ด' }
  ], reward: { exp: 240, weapon: 'rare' } },

  // ----- ปราสาทพับ -----
  q_castle: { land: 'folded_castle', type: 'main', name: 'หน้าต่างของเจ้าชาย', steps: [
    { t: 'talk', npc: 'prince_ori', dlg: 'c_ori_1', text: 'คุยกับเสียงหลังประตู' },
    { t: 'item', item: 'paper_window', text: 'พับกระดาษเปิดทาง หา "หน้าต่างกระดาษ" ใน "ทางเดินพับ"' },
    { t: 'kill', target: 'boss_origami', text: 'ล้มอัศวินพับพันชั้นใน "หอคอยพับซ้อน"' },
    { t: 'talk', npc: 'prince_ori', dlg: 'c_ori_end', text: 'นำหน้าต่างไปให้เจ้าชาย' }
  ], reward: { exp: 600, page: 'ink_sea' } },
  s_castle: { land: 'folded_castle', type: 'side', name: 'นกที่ไม่กล้าบิน', steps: [
    { t: 'collect', item: 'paper_bird', count: 3, text: 'เก็บ "นกกระดาษ" 3 ตัว' }
  ], reward: { exp: 340, weapon: 'rare' } },

  // ----- ทะเลหมึก -----
  q_sea: { land: 'ink_sea', type: 'main', name: 'เพลงที่ถูกลบ', steps: [
    { t: 'talk', npc: 'mermaid_lin', dlg: 'o_lin_1', text: 'คุยกับนางเงือกลิน' },
    { t: 'item', item: 'voice_shell', text: 'สลับหมึกดำ-ขาว หา "เปลือกหอย" ใน "ถ้ำทะเลกลับสี"' },
    { t: 'kill', target: 'boss_kraken', text: 'ล้มหมึกยักษ์ไร้เสียงที่ "ก้นทะเลหมึก"' },
    { t: 'talk', npc: 'mermaid_lin', dlg: 'o_lin_end', text: 'คืนเปลือกหอยให้ลิน' }
  ], reward: { exp: 800, page: 'ink_tree' } },
  s_sea: { land: 'ink_sea', type: 'side', name: 'ฟองคลื่น', steps: [
    { t: 'collect', item: 'ink_bubble', count: 3, text: 'เก็บ "ฟองหมึก" 3 ฟอง' }
  ], reward: { exp: 450, weapon: 'rare' } },

  // ----- ต้นหมึก (ฉากจบ) -----
  q_tree: { land: 'ink_tree', type: 'main', name: 'เรื่องใหม่ที่วาดด้วยกัน', steps: [
    { t: 'talk', npc: 'tree_spirit', dlg: 't_tree_1', text: 'คุยกับต้นหมึก' },
    { t: 'item', item: 'last_seed', text: 'ใช้ทุกปริศนา หา "เมล็ดสุดท้าย" ใน "กิ่งที่แห้ง"' },
    { t: 'kill', target: 'boss_eraser', text: 'หยุดผู้ลบที่ "ยอดต้นหมึก" (ไม่ต้องฆ่า)' },
    { t: 'ending', text: 'วาดเรื่องใหม่ด้วยกัน' }
  ], reward: { exp: 0 } },
  s_tree: { land: 'ink_tree', type: 'side', name: 'ใบไม้ที่ร่วง', steps: [
    { t: 'collect', item: 'ink_leaf', count: 3, text: 'เก็บ "ใบหมึก" 3 ใบ' }
  ], reward: { exp: 600, weapon: 'legend' } },
  // ----- เควสรองเชื่อม 7 เมือง (เปิดทีละเมืองเมื่อวางเมืองแล้ว · ไม่เกี่ยวกับการจบเกม) -----
  ink_letters: { land: 'village', type: 'side', hidden: true, name: 'จดหมายหมึกหลงทาง', steps: [ // hidden = เควสลับ ไม่มี ! บนหัว NPC ไม่ขึ้นในตัวติดตามเควส
    { t: 'talk', npc: 'post_village', dlg: 'ql_1', text: 'คุยกับปุ๊กที่หมู่บ้าน' },
    { t: 'talk', npc: 'post_slime_cave', dlg: 'ql_2', text: 'ส่งจดหมายให้ปุ๊กที่ "ถ้ำสไลม์"' },
    { t: 'talk', npc: 'post_ink_library', dlg: 'ql_3', text: 'ส่งจดหมายให้ปุ๊กที่ "ห้องสมุดหมึก"' },
    { t: 'talk', npc: 'post_pencil_field', dlg: 'ql_4', text: 'ส่งจดหมายให้ปุ๊กที่ "ทุ่งดินสอ"' },
    { t: 'talk', npc: 'post_folded_castle', dlg: 'ql_5', text: 'ส่งจดหมายให้ปุ๊กที่ "ปราสาทพับ"' },
    { t: 'talk', npc: 'post_ink_sea', dlg: 'ql_6', text: 'ส่งจดหมายให้ปุ๊กที่ "ทะเลหมึก"' },
    { t: 'talk', npc: 'post_ink_tree', dlg: 'ql_7', text: 'ส่งจดหมายให้ปุ๊กที่ "ต้นหมึก"' }
  ], reward: { exp: 2500, lumi: 3000, page: 'min_world' } }
};
