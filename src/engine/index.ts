// ลอจิกเกม v1.1.2 (พอร์ตตรงจาก HTML เวอร์ชันเล่นจริง — พฤติกรรมเหมือนเดิม) · โหลดตามลำดับเดียวกับ index.html เดิม
// ใช้ globals PD / PD_DATA ต่อไปเพื่อให้ชุดทดสอบ v1.1.2 รันกับ build นี้ได้ · Phaser ดูแลเฉพาะ จอ/ลูป/วาดภาพ
import './data/config'; import './data/stats'; import './data/skills'; import './data/weapons'; import './data/enemies';
import './data/regions'; import './data/npcs'; import './data/quests'; import './data/dialogue'; import './data/artifacts'; import './data/testmap';
// Testmap จาก mapedit.html / โหมดทดลองจาก editor.html (เหมือน index.html เดิม)
try { const w: any = window, q = location.search;
  if (/testmap=0/.test(q)) localStorage.removeItem('pd_testmap'); else { const t = JSON.parse(localStorage.getItem('pd_testmap') || 'null'); if (t) w.PD_DATA.testmap = t; }
  if (new URLSearchParams(q).getAll('preview').includes('0')) localStorage.removeItem('pd_editor_preview');
  else if (new URLSearchParams(q).getAll('preview').includes('1')) { const d = JSON.parse(localStorage.getItem('pd_editor_preview') || 'null'); if (d) { Object.assign(w.PD_DATA, d); w.PD_PREVIEW = true; } } } catch (e) { /* storage ปิดอยู่ */ }
// overrides.json (จาก editor.html) + โหมดทดลอง ?preview=1 (ค่าที่ตั้งใน editor เก็บใน localStorage pd_ops_preview)
import { applyOps, loadOverridesFile } from './overrides';
try { const w: any = window; w.PD_OVERRIDE_BAD = loadOverridesFile(w.PD_DATA);
  if (new URLSearchParams(location.search).getAll('preview').includes('1')) { const o = JSON.parse(localStorage.getItem('pd_ops_preview') || 'null'); if (o) { w.PD_OVERRIDE_BAD += applyOps(w.PD_DATA, o.ops || o); w.PD_PREVIEW = true; } try { w.PD_IMGS = o?.imgs ?? JSON.parse(localStorage.getItem('pd_img_preview') || '{}'); } catch (e2) { } } } catch (e) { /* storage ปิดอยู่ */ }
import './js/util'; import './js/pixel'; import './js/sprites'; import './js/mapgen'; import './js/stats'; import './js/loot'; import './js/save';
import './js/quests'; import './js/skills'; import './js/render'; import './js/input'; import './js/sound'; import './js/ui'; import './js/element'; import './js/status'; import './js/combat'; import './js/ending';
import './js/game';
