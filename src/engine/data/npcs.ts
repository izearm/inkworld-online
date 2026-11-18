// @ts-nocheck
// ===== NPC: อยู่ในแผนที่เมือง (map 0) ของแต่ละดินแดน =====
// pos = [สัดส่วนแกน x, สัดส่วนแกน y] ของแผนที่ · shape/opts = รูปทรงลายเส้น
// idle = บทพูดก่อน/ระหว่างเควส (ถ้าไม่มีขั้นเควสให้คุย) · done = บทพูดหลังจบเควสหลักของดินแดน
// requires = จะปรากฏหลังเควสนี้จบเท่านั้น
PD_DATA.npcs = {
  old_woman:   { name: 'ยายไม่มีชื่อ', land: 'village', pos: [0.38, 0.42], shape: 'human', opts: { hunch: true, cane: true }, idle: 'v_old_idle', done: 'v_old_done' },
  man_bucket:  { name: 'ชายถือถังเปล่า', land: 'village', pos: [0.62, 0.34], shape: 'human', opts: { bucket: true }, idle: 'v_man_idle', done: 'v_man_done' },
  girl_window: { name: 'เด็กหญิงริมหน้าต่าง', land: 'village', pos: [0.46, 0.7], shape: 'human', opts: { kid: true, hair: true }, idle: 'v_girl_idle', done: 'v_girl_done' },

  kid_tom:     { name: 'โท', land: 'slime_cave', pos: [0.42, 0.5], shape: 'human', opts: { kid: true }, idle: 's_kid_idle', done: 's_kid_done' },
  slime_pom:   { name: 'ปอม', land: 'slime_cave', pos: [0.7, 0.48], shape: 'slime', opts: { friendly: true }, idle: 's_pom_idle', done: 's_pom_done' },

  librarian_nim: { name: 'บรรณารักษ์นิ่ม', land: 'ink_library', pos: [0.5, 0.42], shape: 'human', opts: { glasses: true, hair: true, book: true }, idle: 'l_nim_idle', done: 'l_nim_done' },
  boy_reader:  { name: 'เด็กที่อ่านหนังสือว่าง', land: 'ink_library', pos: [0.3, 0.62], shape: 'human', opts: { kid: true, book: true }, idle: 'l_boy_idle', done: 'l_boy_done' },

  farmer_dang: { name: 'ลุงแดง', land: 'pencil_field', pos: [0.42, 0.45], shape: 'human', opts: { hat: true }, idle: 'f_dang_idle', done: 'f_dang_done' },
  scarecrow:   { name: 'หุ่นไล่กาดินสอ', land: 'pencil_field', pos: [0.6, 0.62], shape: 'human', opts: { scarecrow: true }, idle: 'f_scare_idle', done: 'f_scare_done' },

  prince_ori:  { name: 'เจ้าชายโอริ', land: 'folded_castle', pos: [0.5, 0.3], shape: 'human', opts: { crown: true, cape: true }, idle: 'c_ori_idle', done: 'c_ori_done' },
  crane_guard: { name: 'นกกระเรียนเฝ้าประตู', land: 'folded_castle', pos: [0.38, 0.56], shape: 'bird', opts: { big: true }, idle: 'c_crane_idle', done: 'c_crane_done' },

  mermaid_lin: { name: 'ลิน', land: 'ink_sea', pos: [0.5, 0.36], shape: 'mermaid', opts: {}, idle: 'o_lin_idle', done: 'o_lin_done' },
  fisher_old:  { name: 'ตาแก่หาปลา', land: 'ink_sea', pos: [0.3, 0.6], shape: 'human', opts: { hat: true, rod: true }, idle: 'o_fisher_idle', done: 'o_fisher_done' },

  tree_spirit: { name: 'ต้นหมึก', land: 'ink_tree', pos: [0.5, 0.3], shape: 'tree', opts: {}, idle: 't_tree_idle', done: 't_tree_done' },
  eraser_npc:  { name: 'ผู้ลบ', land: 'ink_tree', pos: [0.62, 0.42], shape: 'eraser', opts: { calm: true }, idle: 't_eraser_done', done: 't_eraser_done', requires: 'q_tree' },
  // ===== v1.0.9: พ่อค้า (ทุกเมือง) · จุดรับฝาก (หมู่บ้านเท่านั้น) · บุรุษไปรษณีย์ (เควสรองเชื่อม 7 เมือง) · ชาวจิ๋ว (แผนที่ลับ) =====
  merchant_village: { name: 'พ่อค้ากระดาษ', land: 'village', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_slime_cave: { name: 'พ่อค้ากระดาษ', land: 'slime_cave', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_ink_library: { name: 'พ่อค้ากระดาษ', land: 'ink_library', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_pencil_field: { name: 'พ่อค้ากระดาษ', land: 'pencil_field', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_folded_castle: { name: 'พ่อค้ากระดาษ', land: 'folded_castle', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_ink_sea: { name: 'พ่อค้ากระดาษ', land: 'ink_sea', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_ink_tree: { name: 'พ่อค้ากระดาษ', land: 'ink_tree', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_desert_city: { name: 'พ่อค้ากระดาษ', land: 'desert_city', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_dream_city: { name: 'พ่อค้ากระดาษ', land: 'dream_city', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  merchant_fairy_city: { name: 'พ่อค้ากระดาษ', land: 'fairy_city', pos: [0.22, 0.66], shape: 'human', opts: { hat: true, bucket: true }, shop: true, idle: 'merchant_idle', done: 'merchant_idle' },
  keeper_village: { name: 'คุณป้ารับฝาก', land: 'village', pos: [0.78, 0.62], shape: 'human', opts: { glasses: true, book: true }, storage: true, idle: 'keeper_idle', done: 'keeper_idle' },
  post_village: { name: 'ปุ๊ก นักส่งจดหมาย', land: 'village', pos: [0.8, 0.3], shape: 'human', opts: { hat: true, cape: true }, idle: 'post_idle', done: 'post_idle' },
  post_slime_cave: { name: 'ปุ๊ก นักส่งจดหมาย', land: 'slime_cave', pos: [0.8, 0.3], shape: 'human', opts: { hat: true, cape: true }, idle: 'post_idle', done: 'post_idle' },
  post_ink_library: { name: 'ปุ๊ก นักส่งจดหมาย', land: 'ink_library', pos: [0.8, 0.3], shape: 'human', opts: { hat: true, cape: true }, idle: 'post_idle', done: 'post_idle' },
  post_pencil_field: { name: 'ปุ๊ก นักส่งจดหมาย', land: 'pencil_field', pos: [0.8, 0.3], shape: 'human', opts: { hat: true, cape: true }, idle: 'post_idle', done: 'post_idle' },
  post_folded_castle: { name: 'ปุ๊ก นักส่งจดหมาย', land: 'folded_castle', pos: [0.8, 0.3], shape: 'human', opts: { hat: true, cape: true }, idle: 'post_idle', done: 'post_idle' },
  post_ink_sea: { name: 'ปุ๊ก นักส่งจดหมาย', land: 'ink_sea', pos: [0.8, 0.3], shape: 'human', opts: { hat: true, cape: true }, idle: 'post_idle', done: 'post_idle' },
  post_ink_tree: { name: 'ปุ๊ก นักส่งจดหมาย', land: 'ink_tree', pos: [0.8, 0.3], shape: 'human', opts: { hat: true, cape: true }, idle: 'post_idle', done: 'post_idle' },
  tiny_0: { name: 'ป๊อบ', land: 'min_world', pos: [0.4, 0.42], shape: 'tiny', opts: { v: 0 }, idle: 'mw_hi', done: 'mw_hi' },
  tiny_1: { name: 'ติ๊ก', land: 'min_world', pos: [0.52, 0.36], shape: 'tiny', opts: { v: 1 }, idle: 'mw_hi', done: 'mw_hi' },
  tiny_2: { name: 'บุ้ง', land: 'min_world', pos: [0.6, 0.5], shape: 'tiny', opts: { v: 2 }, idle: 'mw_hi', done: 'mw_hi' },
  tiny_3: { name: 'ฝอย', land: 'min_world', pos: [0.46, 0.58], shape: 'tiny', opts: { v: 3 }, idle: 'mw_hi', done: 'mw_hi' },
  // v2.0.12: ป่าเงาหมึก
  forest_gatherer: { name: 'คนเก็บของป่า', land: 'shadow_forest', pos: [0.1, 0.42], shape: 'human', opts: { hat: true, bucket: true }, idle: 'w_gather_idle', done: 'w_gather_idle' },
  // v2.3: ร้าน Artifact ในบ้าน (indoor: true = ไม่ใช้ pos ปกติ วางตำแหน่งจริงผ่าน def.room ใน regions.ts)
  artifact_keeper: { name: 'ผู้เฝ้าความทรงจำ', land: 'village', indoor: true, shape: 'human', opts: { glasses: true, cape: true }, artifactShop: true, idle: 'artifact_keeper_idle', done: 'artifact_keeper_idle' }
};
