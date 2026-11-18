// @ts-nocheck
import './editor.css';
// ===== Editor: แก้ค่าเกมเองโดยไม่ต้องแก้โค้ด · ผลลัพธ์ = overrides.json (ชุดคำสั่ง set/add/del) =====
import './engine/data/config'; import './engine/data/stats'; import './engine/data/skills'; import './engine/data/weapons'; import './engine/data/enemies';
import './engine/data/regions'; import './engine/data/npcs'; import './engine/data/quests'; import './engine/data/dialogue';
import './engine/data/artifacts';
import { applyOps, getAt, clone, keyOf } from './engine/overrides';

const D = (window as any).PD_DATA;
const SECTIONS = [
  ['config', 'ตั้งค่าระบบ/บาลานซ์'], ['lands', 'ดินแดนและแผนที่'], ['enemies', 'ศัตรู/บอส'], ['skills', 'สกิล'], ['bossSkillDefs', 'สกิลบอส'], ['weaponSkillDefs', 'สกิลอาวุธ'], ['weaponSkills', 'สกิลอาวุธ (ผูกชนิด)'],
  ['weaponBases', 'อาวุธ (ชนิด)'], ['affixes', 'ออปชันไอเท็ม'], ['rarities', 'ความหายาก'], ['gearBases', 'เสื้อ/กางเกง'], ['gearSets', 'เซ็ตอุปกรณ์'],
  ['affixPools', 'กองสุ่มและ Tier'], ['artifactDefs', 'Artifact'], ['artifactGrades', 'เกรด Artifact'], ['itemBudget', 'งบเครื่องประดับ (ระบบเดิม)'], ['statCaps', 'เพดานสถานะ'], ['equipBrackets', 'ช่วงเลเวลอุปกรณ์'], ['classes', 'อาชีพ/สถานะ'], ['heroSprite', 'ตัวละครผู้เล่น (รูป)'], ['startPlayer', 'ผู้เล่นเริ่มต้น'], ['starterWeapon', 'อาวุธเริ่มต้น'],
  ['quests', 'เควส'], ['questItems', 'ไอเท็มเควส'], ['npcs', 'NPC'], ['dialogue', 'บทพูด'], ['hints', 'คำใบ้']
].filter(([k]) => D[k] !== undefined);
const TH = { name: 'ชื่อ', hp: 'พลังชีวิต', atk: 'พลังโจมตี', speed: 'ความเร็ว', aggro: 'ระยะเห็นผู้เล่น', range: 'ระยะ', windup: 'เวลาง้าง', level: 'เลเวลตายตัว', lvlOffset: 'เลเวลบวก/ลบ', priceMult: 'ตัวคูณราคาขาย', img: 'รูป', sprite: 'สไปรต์', cd: 'คูลดาวน์', exp: 'EXP', size: 'ขนาดตัว', mdef: 'MDEF', drops: 'ดรอป', rate: 'ดรอป % = โอกาสที่ศัตรูตัวนี้จะดรอปอาวุธชนิดนั้น (0–100) สุ่มแยกแต่ละรายการ แล้วคูณตัวคูณลูทของดินแดน · บอสได้อาวุธการันตีอยู่แล้ว ใช้ % เป็นน้ำหนักเลือกชนิด · เลเวลไอเท็ม = เลเวลศัตรู (บอส +1)',
  desc: 'คำอธิบาย', ink: 'หมึกที่ใช้', power: 'ตัวคูณดาเมจต่อเลเวล', castTime: 'เวลาร่าย', dur: 'ระยะเวลา', dist: 'ระยะพุ่ง', radius: 'รัศมี', reqLevel: 'เลเวลที่ปลดล็อก', maxLv: 'เลเวลสูงสุด',
  min: 'ดาเมจต่ำสุด', max: 'ดาเมจสูงสุด', arc: 'องศาฟัน', icon: 'ไอคอน', atkMult: 'ตัวคูณโจมตีบอส', patternCd: 'พักระหว่างท่า', attack: 'เวลาโจมตี', stunChance: 'โอกาสสตั้น', dmgMult: 'ตัวคูณดาเมจ',
  stack: 'ซ้อนได้', weight: 'น้ำหนักสุ่ม', color: 'สี', slot: 'ช่อง', def: 'DEF', crit: 'คริติคอล%', aspd: 'ความเร็วโจมตี%', move: 'ความเร็วเดิน%', leech: 'ดูดเลือด%', regen: 'ฟื้นเลือด', atkPct: 'โจมตี%', skillPct: 'ดาเมจสกิล%', bonus: 'โบนัสเซ็ต' };
const helpFor = (path, key) => HELP[path[path.length - 2] + '.' + key] || HELP[path[0] + '.' + key] || HELP[key] || '';
const lab = k => TH[k] ? `${TH[k]}<small>${k}</small>` : k;


// ===== คำอธิบายค่า (แสดงต่อท้ายช่อง) =====
Object.assign(TH, {
  equipmentDrops: 'เรทดรอปอุปกรณ์ต่อการฆ่า',
  accessoryNormal: 'เครื่องประดับ · มอนสเตอร์ทั่วไป',
  accessoryAlpha: 'เครื่องประดับ · Alpha',
  accessoryBoss: 'เครื่องประดับ · บอส'
});
const HELP = {
  'config.equipmentDrops': 'ใส่สัดส่วน 0–1 เช่น 0.10 = 10% ต่อการฆ่า เครื่องประดับนับรวมในโควตาอุปกรณ์ บอสนับเฉพาะรอบที่มีสิทธิ์ดรอปอุปกรณ์',
  'equipmentDrops.normal': 'โอกาสดรอปอุปกรณ์รวมของมอนสเตอร์ทั่วไป',
  'equipmentDrops.alpha': 'โอกาสดรอปอุปกรณ์รวมของ Alpha',
  'equipmentDrops.boss': 'โอกาสดรอปอุปกรณ์รวมของบอสที่มีสิทธิ์ดรอป (1 = การันตี)',
  bossMaxHp: 'HP ฐานของบอสตัวนี้ที่ตำแหน่งปกติ ตำแหน่งอุ่น/ม่วงยังปรับตามผลต่างเลเวล เว้นว่างเพื่อใช้สูตร HP เดิม',
  uniformEnemyLevel: 'บอส ลูกน้อง และตัวที่เรียกใช้เลเวลดินแดนเดียวกัน รวมผลจากตำแหน่งบนแผนที่โลก',
  'bossCharge.lockExtra': 'เพิ่มเวลาล็อกเป้าของท่าพุ่ง (วินาที)',
  'bossCharge.speedMult': 'ตัวคูณความเร็วพุ่งหลังล็อกเป้า',
  'bossSkillDefs.thresholds': 'สัดส่วน HP ในแต่ละรอบหลังเปิดไฟต์ เรียงจากมากไปน้อย เช่น 0.70, 0.35',
  'bossSkillDefs.cooldown': 'เริ่มนับเวลาจากรอบที่เรียกสำเร็จ',
  'bossSkillDefs.waveSize': 'จำนวนลูกน้องต่อรอบ ต้องตรงกับยอดในชุดลูกน้อง',
  'bossSkillDefs.maxAlive': 'จำนวนลูกน้องของบอสตัวนี้ที่มีชีวิตพร้อมกันได้',
  'absorbShield.armor': 'แต้มเกราะชั่วคราวระหว่างโล่ทำงาน ดาเมจที่เข้ามาถูกเปลี่ยนเป็นฮีลเต็มจำนวน',
  'absorbShield.duration': 'เวลายกโล่ดูดซับ (วินาที)',
  'bossHeal.delay': 'เวลาที่ไม่ได้รับดาเมจก่อนฟื้นเลือด (วินาที)',
  'bossHeal.fraction': 'สัดส่วน HP สูงสุดที่ฟื้น (0.10 = 10%)',
  'tentaclePull.cast': 'เวลาที่แสดงเส้นเตือนก่อนดึง (วินาที)',
  'tentaclePull.stunChance': 'โอกาสสตั้นหลังโจมตีโดน (0.35 = 35%)',
  'inkDrain.closeTime': 'ต้องอยู่ในระยะนานกี่วินาทีก่อนเริ่มร่าย',
  'inkDrain.cast': 'เวลาร่ายและกะพริบหนวดแดง (วินาที)',
  // งบไอเท็ม / เพดาน / ป้ายเป้าหมาย
  'itemBudget.slot': 'งบพลังออปชันต่อ 1 ชิ้น ของช่องนั้น (อาวุธ/เสื้อ/กางเกง/เครื่องประดับ) · มาก = ออปชันบนไอเท็มแรงขึ้น น้อย = อ่อนลง', 'itemBudget.growth': 'ออปชันแบบตัวเลขตรง (HP, ป้องกัน, หมึก, ฟื้นหมึก) เพิ่มกี่เท่าต่อ item level · 0.25 = +25% ต่อเลเวล',
  'statCaps.crit': 'เพดานคริติคอล · 0.5 = สูงสุด 50%', 'statCaps.aspd': 'เพดานความเร็วโจมตี · 1.6 = เร็วสุด ×1.6 (+60%)', 'statCaps.leech': 'เพดานดูดเลือด · 0.08 = สูงสุด 8% ของดาเมจ', 'statCaps.move': 'เพดานความเร็วเดิน · 1.4 = เร็วสุด ×1.4', 'statCaps.dmgReduce': 'เพดานลดดาเมจจากเกราะ · 0.75 = ลดได้สูงสุด 75%',
  'targetLabel.show': 'ป้ายชื่อ/เลเวลศัตรูแสดงกี่วินาทีหลังตีโดน', 'targetLabel.hard': 'ศัตรูเลเวลสูงกว่าผู้เล่นตั้งแต่กี่เลเวล → ป้ายเป็นสีแดง (อันตราย)', 'targetLabel.easy': 'ศัตรูเลเวลต่ำกว่าผู้เล่นตั้งแต่กี่เลเวล (ใส่ติดลบ เช่น -3) → ป้ายเป็นสีเทา (ง่าย)',
  // ความหายาก
  'rarities.affixes': 'จำนวนออปชันสุ่มบนไอเท็ม [ต่ำสุด, สูงสุด] — ใส่ได้เกิน 2 (ตอนนี้ตำนาน 4-5 เทพนิยาย 5-6) แต่ต้องมีออปชันในระบบมากพอ (ตอนนี้ 10 แบบ) และงบ (budget) พอ ถ้าแพงเกินส่วนแบ่งจะถูกข้าม',
  'rarities.weight': 'น้ำหนักสุ่มดรอป ยิ่งมากยิ่งเจอบ่อย', 'rarities.dmgMult': 'ตัวคูณดาเมจอาวุธตามความหายาก', 'rarities.budget': 'สัดส่วนงบออปชัน 0-1 (1 = เต็มงบของช่อง)',
  // ศัตรู
  hp: 'พลังชีวิตฐาน (เกมปรับตามเลเวล/TTK อีกที)', atk: 'พลังโจมตีฐาน (เกมปรับตามเลเวลอีกที)', speed: 'ความเร็วเดิน', aggro: 'ระยะที่เห็นผู้เล่นแล้วไล่ (ช่อง)', range: 'ระยะโจมตี (ช่อง)',
  windup: 'เวลาง้าง: เวลาตั้งท่า (เห็นเครื่องหมาย !) ก่อนตีจริง ยิ่งมากผู้เล่นยิ่งหลบทัน', cd: 'พักหลังโจมตี (วินาที) ก่อนโจมตีรอบถัดไป', exp: 'EXP ที่ให้', size: 'ขนาดตัว', 'enemies.def': 'ลดดาเมจกายภาพ 0–1 (0.35 = ลด 35%)', mdef: 'ลดดาเมจเวท 0–1 (0.35 = ลด 35%)',
  level: 'เลเวลตายตัวของศัตรูตัวนี้ (เว้นว่าง = ตามเลเวลดินแดน) · HP/ATK ปรับตามเลเวลอัตโนมัติ', lvlOffset: 'บวก/ลบเลเวลจากเลเวลดินแดน เช่น +3 = เก่งกว่าเพื่อนในดินแดน 3 เลเวล (ไม่ใช้ถ้าตั้งเลเวลตายตัว)',
  priceMult: 'ตัวคูณราคาขายของชนิดนี้ (ว่าง/1 = ตามตารางเลเวล · 2 = ขายได้ 2 เท่า)', sellByLevel: 'ราคาขายตามเลเวลไอเท็ม: แต่ละแถว [เลเวล, ลูมิ] เช่น [10,150] = ไอเท็มเลเวล 10 ขายได้ 150 · ระหว่างจุดคิดเป็นเส้นตรง · เกินจุดสุดท้ายต่อตามความชันเดิม', sellRarityMult: 'ตัวคูณราคาตามความหายาก [ธรรมดา, เวทมนตร์, หายาก, ตำนาน, เทพนิยาย] ตอนนี้ 1 ทุกระดับ (ราคาล็อกตามเลเวล)',
  tier: 'common = ดรอปง่าย · rare = ดรอปยาก (โอกาส 25%)', cost: 'ราคางบต่อ 1 หน่วยค่าออปชัน ยิ่งแพงยิ่งได้ค่าน้อย', rate: 'โอกาสดรอปเทียบกัน (สัดส่วนต่อดรอปทั้งหมดของศัตรูตัวนี้)'
};
const SECDOC = {
  itemBudget: '<b>งบไอเท็ม</b> = "พลังออปชันรวม" ที่ไอเท็มหนึ่งชิ้นได้ · สูตร: งบ = <code>slot[ช่อง] × budget ของความหายาก</code> แล้วแบ่งให้ออปชันแต่ละอัน (÷ cost) → ไอเท็มช่อง/ความหายากเดียวกันแรงเท่ากัน ต่างกันที่ออปชันอะไร<br><b>ค่ามาก</b> = ออปชันแรงขึ้นทั้งเกม (ดรอปแรงขึ้น) · <b>ค่าน้อย</b> = อ่อนลง · slot.weapon/body/legs/acc = งบของแต่ละช่อง · growth = ออปชันตัวเลขตรงโตกี่เท่าต่อ item level',
  statCaps: '<b>เพดานสถานะ</b> = ค่าสูงสุดที่ผู้เล่นได้ ต่อให้ใส่ของดีแค่ไหนก็ไม่เกิน · เป็น <b>สัดส่วน/ตัวคูณ ไม่ใช่เปอร์เซ็นต์ตรงๆ</b>: crit 0.5 = คริสูงสุด 50% · aspd 1.6 = ตีเร็วสุด ×1.6 · leech 0.08 = ดูดเลือดสูงสุด 8% · move 1.4 = เดินเร็วสุด ×1.4 · dmgReduce 0.75 = ลดดาเมจสูงสุด 75%',
  rarities: '<b>ความหายาก</b> · affixes [ต่ำสุด, สูงสุด] = จำนวนออปชันสุ่มบนไอเท็ม ใส่เกิน 2 ได้ (ตอนนี้สูงสุด 6) · ต้องมีออปชันในรายการ "ออปชันไอเท็ม" พอ และ budget มากพอจึงจะได้ครบ · weight = โอกาสดรอป',
  config: '<b>targetLabel</b> = ป้ายชื่อ+เลเวลศัตรูเหนือหัวตอนตีโดน: show = แสดงกี่วินาที · hard = ศัตรูเลเวลสูงกว่าเราเท่านี้ขึ้นไปป้ายแดง · easy = ต่ำกว่าเราเท่านี้ขึ้นไปป้ายเทา · <b>elements.imgs</b> ใส่รูปธาตุด้านบนของหน้านี้',
  enemies: 'ค่าแก้ได้ทุกตัว · ใส่รูป 3 สถานะ (ยืน/เดิน/โจมตี) ที่บล็อก "รูปสไปรต์" · เพิ่ม/ลบของดรอปที่บล็อก "ของที่ดรอป" · ตั้งเลเวลที่บล็อก "ระดับ"',
  gearBases: 'เสื้อ/กางเกง/เครื่องประดับ · ใส่รูป ราคา และดูเซ็ตที่ชิ้นนี้อยู่ได้ที่ด้านบน · กด "＋ สร้างอุปกรณ์ใหม่" ได้ (ยังไม่มีรูป = ใช้ภาพวาดเดิม)',
  weaponBases: 'อาวุธ (ชนิด) · รูปใช้เป็นไอคอนไอเท็ม + ของบนพื้น (ยังไม่ใช้เป็นรูปในมือตัวละคร)'
};
const IMG_MAX = 2048;
const imgs = {}; // path → dataURL (รูปที่อัปโหลดในเครื่องนี้)
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('pd_editor', 1); r.onupgradeneeded = () => r.result.createObjectStore('imgs'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbAll() { try { const db = await idb(); return await new Promise(res => { const o = {}, st = db.transaction('imgs').objectStore('imgs'), q = st.openCursor(); q.onsuccess = () => { const c = q.result; if (c) { o[c.key] = c.value; c.continue(); } else res(o); }; q.onerror = () => res(o); }); } catch (e) { return {}; } }
async function idbPut(k, v) { try { const db = await idb(); db.transaction('imgs', 'readwrite').objectStore('imgs').put(v, k); } catch (e) { } }
async function idbClear() { try { const db = await idb(); db.transaction('imgs', 'readwrite').objectStore('imgs').clear(); } catch (e) { } }
function fileToPng(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, IMG_MAX / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k)); const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/png')); }; im.onerror = () => rej(); im.src = fr.result; }; fr.onerror = () => rej(); fr.readAsDataURL(file); }); }
const imgSrc = v => (v && (imgs[v] || v)) || '';
function usedImgs() { const m = JSON.stringify(ops).match(/custom\/[A-Za-z0-9_\-]+\.png/g) || []; return [...new Set(m)]; }
// zip แบบไม่บีบอัด (store) พอสำหรับ json + png
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function makeZip(files) { // files: [{name, data:Uint8Array}]
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const u16 = v => [v & 255, v >> 8 & 255], u32 = v => [v & 255, v >> 8 & 255, v >> 16 & 255, v >>> 24 & 255];
  for (const f of files) { const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(sz), ...u32(sz), ...u16(nm.length), 0, 0]); parts.push(lh, nm, f.data);
    cen.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(sz), ...u32(sz), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nm); off += lh.length + nm.length + sz; }
  let cs = 0; for (const c of cen) cs += c.length; const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), 0, 0]);
  return new Blob([...parts, ...cen, end], { type: 'application/zip' });
}
const dataToBytes = d => { const b = atob(d.split(',')[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

const base = clone(D); // ค่าเดิมของเกม (ก่อนแก้)
let ops = []; try { ops = JSON.parse(localStorage.getItem('pd_ops_draft') || '[]'); } catch (e) {}
let cur = null; let sec = null, entry = null, filter = '';
const $ = id => document.getElementById(id);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pk = p => JSON.stringify(p);

function rebuild() { cur = clone(base); applyOps(cur, ops); localStorage.setItem('pd_ops_draft', JSON.stringify(ops)); $('cnt').textContent = ops.length ? `แก้แล้ว ${ops.length} จุด` : 'ยังไม่ได้แก้'; }
function setValue(path, v) {
  const key = pk(path); ops = ops.filter(o => !(o.op === 'set' && pk(o.path) === key));
  const b = getAt(base, path);
  if (b === undefined || !eq(b, v)) ops.push({ op: 'set', path, value: v });
  rebuild();
}
function entries(s) {
  const n = cur[s]; if (Array.isArray(n)) return n.map((e, i) => [keyOf(e, i), e && e.name ? e.name : keyOf(e, i)]);
  if (n && typeof n === 'object') { const vals = Object.values(n); const nested = vals.length && vals.every(v => v && typeof v === 'object' && !Array.isArray(v)); if (nested) return Object.keys(n).map(k => [k, n[k].name ? `${n[k].name} (${k})` : k]); return null; }
  return null;
}
function isChanged(path) { const a = getAt(base, path), b = getAt(cur, path); return !eq(a, b); }

function fChg(path) { return getAt(base, path) !== undefined && isChanged(path); } // ช่องในรายการที่เพิ่มใหม่ไม่ต้องเหลืองทั้งหมด
function renderSide() {
  const menu = $('side');
  const scroll = menu.scrollTop, left = menu.scrollLeft;
  menu.replaceChildren();
  for (const [key, title] of SECTIONS) {
    const button = mk('button', key === sec ? 'on' : '');
    button.textContent = title;
    const id = mk('small'); id.textContent = key; button.appendChild(id);
    button.setAttribute('aria-pressed', String(key === sec));
    button.onclick = () => {
      sec = key; entry = entries(sec)?.[0]?.[0] ?? null; filter = '';
      renderSide(); renderList(); renderForm();
      $('side').querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
    };
    menu.appendChild(button);
  }
  menu.scrollTop = scroll; menu.scrollLeft = left;
}
function renderList() {
  const L = $('list'); L.innerHTML = ''; if (!sec) return; const es = entries(sec); if (!es) { L.style.display = 'none'; return; } L.style.display = '';
  const heading = mk('div', 'list-heading'); heading.textContent = SECTIONS.find(([key]) => key === sec)[1]; L.appendChild(heading);
  const q = document.createElement('input'); q.type = 'search'; q.setAttribute('aria-label', 'ค้นหารายการในหมวด'); q.placeholder = 'ค้นหาชื่อหรือรหัส'; q.value = filter; q.oninput = () => { filter = q.value; renderItems(); }; L.appendChild(q);
  if (NEWTPL[sec]) { const nb = document.createElement('button'); nb.textContent = '＋ สร้างใหม่'; nb.className = 'pri newbtn'; nb.onclick = () => newModal(sec); L.appendChild(nb); }
  const box = document.createElement('div'); box.id = 'items'; L.appendChild(box); renderItems();
}
function renderItems() {
  const box = $('items'); if (!box) return; box.innerHTML = ''; const es = entries(sec) || [];
  const matches = es.filter(([key, title]) => !filter || (key + title).toLowerCase().includes(filter.toLowerCase()));
  for (const [key, title] of matches) {
    const button = mk('button', (key === entry ? 'on ' : '') + (isChanged([sec, key]) ? 'chg' : ''));
    button.textContent = title;
    button.setAttribute('aria-pressed', String(key === entry));
    button.onclick = () => { entry = key; renderItems(); renderForm(); $('items').querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true }); };
    box.appendChild(button);
  }
  if (!matches.length) box.appendChild(mk('p', 'hint', 'ไม่พบรายการที่ตรงกัน'));
}
function field(path, key, val, depth) {
  const row = document.createElement('div'); row.className = 'row' + (fChg(path) ? ' chg' : ''); const l = document.createElement('label'); l.innerHTML = lab(String(key)); row.appendChild(l);
  let inp;
  const done = v => { setValue(path, v); row.classList.toggle('chg', fChg(path)); renderItems(); $('cnt').textContent = $('cnt').textContent; };
  const eo = typeof val === 'string' ? enumFor(path, key) : null;
  if (eo) { inp = document.createElement('select'); (eo.includes(val) ? eo : [val, ...eo]).forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = referenceLabel(path, key, o); inp.appendChild(op); }); inp.value = val; inp.onchange = () => done(inp.value); }
  else if (typeof val === 'string' && /^#[0-9a-f]{6}$/i.test(val) && /color/i.test(String(key))) { inp = Object.assign(mk('input'), {type:'color', value:val}); inp.onchange = () => done(inp.value); }
  else if (typeof val === 'boolean') { inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = val; inp.onchange = () => done(inp.checked); }
  else if (typeof val === 'number') { inp = document.createElement('input'); inp.type = 'number'; inp.step = 'any'; inp.value = val; inp.onchange = () => { const n = parseFloat(inp.value); if (isNaN(n)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); done(n); }; }
  else if (typeof val === 'string') { inp = String(val).length > 50 ? document.createElement('textarea') : Object.assign(document.createElement('input'), { type: 'text' }); inp.value = val; inp.onchange = () => done(inp.value); }
  else if (Array.isArray(val) && val.every(x => typeof x === 'number' || typeof x === 'string')) { // array ค่าล้วน → คอมมา
    inp = Object.assign(document.createElement('input'), { type: 'text' }); inp.value = val.join(', ');
    const num = val.length && val.every(x => typeof x === 'number');
    inp.onchange = () => { const parts = inp.value.split(',').map(s => s.trim()).filter(s => s !== ''); const out = num ? parts.map(parseFloat) : parts; if (num && out.some(isNaN)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); done(out); };
  } else { inp = document.createElement('span'); inp.textContent = '(ไม่รองรับ)'; }
  if (inp.matches('input,select,textarea')) { inp.id = 'field-' + JSON.stringify(path); l.htmlFor = inp.id; }
  row.appendChild(inp); const hp_ = helpFor(path, String(key)); if (hp_) { const nt = document.createElement('span'); nt.className = 'note'; nt.textContent = hp_; row.appendChild(nt); }
  const rv = document.createElement('button'); rv.className = 'rv'; rv.textContent = '↺'; rv.title = 'คืนค่าเดิม';
  rv.onclick = () => { const key = pk(path); ops = ops.filter(o => !(o.op === 'set' && pk(o.path) === key)); rebuild(); renderForm(); renderItems(); }; row.appendChild(rv); return row;
}
function node(path, key, val, depth) {
  if ((key === 'summonSkill' || key === 'maxHp') && path[0] === 'enemies' && path.length === 3) return document.createDocumentFragment();
  if (key === 'patterns' && path[0] === 'enemies' && Array.isArray(val)) return bossPatterns(path, val);
  if (key === 'img' || key === 'groundImg' || (key === 'sprite' && (path[0] === 'enemies' || path[0] === 'npcs')) || (key === 'drops' && path[0] === 'enemies') || (key === 'imgs' && path[1] === 'elements')) return document.createDocumentFragment();
  if (val && typeof val === 'object' && !(Array.isArray(val) && val.every(x => typeof x !== 'object'))) {
    const fs = document.createElement('fieldset'); const lg = document.createElement('legend'); lg.textContent = (TH[key] || key) + (TH[key] ? ` (${key})` : ''); fs.appendChild(lg); { const h = helpFor(path, String(key)); if (h) { const nt = document.createElement('div'); nt.className = 'note blk'; nt.textContent = h; fs.appendChild(nt); } }
    if (Array.isArray(val)) val.forEach((e, i) => fs.appendChild(node([...path, keyOf(e, i)], e && e.name ? e.name : keyOf(e, i), e, depth + 1)));
    else for (const k of Object.keys(val)) fs.appendChild(node([...path, k], k, val[k], depth + 1));
    return fs;
  }
  return field(path, key, val, depth);
}
// ===== ตัวช่วยฟอร์มพิเศษ =====
const SHAPES = () => [...new Set([...Object.values(cur.enemies || {}).map(e => e.shape), ...Object.values(cur.npcs || {}).map(e => e.shape), 'human', 'knight', 'demon', 'alien', 'eraser', 'mermaid', 'monster', 'slime', 'bird', 'book', 'ghost', 'jelly', 'kraken', 'eraserbit', 'tree'].filter(Boolean))].sort();
function bossPatterns(path, patterns) {
  const enemy = getAt(cur, path.slice(0, -1));
  const labels = { charge: 'พุ่ง', slam: 'ทุบพื้น', ring: 'ยิงวง', spiral: 'ยิงเกลียว', rain: 'ฝนหมึก', cross: 'กากบาท', nova: 'ระเบิดวง', roots: 'รากไม้', leaves: 'พายุใบไม้', absorbShield: 'โล่ดูดซับดาเมจ', tentaclePull: 'ดึงมาดูด' };
  const special = { absorbShield: enemy.absorbShield, tentaclePull: enemy.tentaclePull };
  const options = Object.keys(labels).filter(key => !(key in special) || special[key]);
  const box = mk('fieldset');
  box.appendChild(mk('legend', '', 'ลำดับท่าบอส'));
  const update = next => { setValue(path, next); renderForm(); };
  patterns.forEach((pattern, index) => {
    const row = mk('div', 'row'), select = mk('select'), remove = mk('button', '', 'ลบท่านี้');
    select.setAttribute('aria-label', 'ท่าบอสลำดับ ' + (index + 1));
    for (const key of options.includes(pattern) ? options : [pattern, ...options]) select.add(new Option(labels[key] || key, key));
    select.value = pattern;
    select.onchange = () => update(patterns.map((value, i) => i === index ? select.value : value));
    remove.disabled = patterns.length <= 1;
    remove.onclick = () => update(patterns.filter((_, i) => i !== index));
    row.append(select, remove); box.appendChild(row);
  });
  const add = mk('button', '', 'เพิ่มท่า');
  add.onclick = () => update([...patterns, 'slam']); box.appendChild(add);
  if (enemy.inkDrain) box.appendChild(mk('p', 'note', 'หมึกหิวหมึกทำงานตามเวลาที่ผู้เล่นอยู่ใกล้'));
  return box;
}
function referenceLabel(path, key, id) {
  const lookups = { weapon: cur.weaponBases, body: cur.gearBases, legs: cur.gearBases, base: cur.weaponBases, rarity: cur.rarities, land: cur.lands, boss: Object.entries(cur.enemies).map(([id, value]) => ({ id, name: value.name })), summon: Object.entries(cur.enemies).map(([id, value]) => ({ id, name: value.name })), cls: Object.entries(cur.classes).map(([id, value]) => ({ id, name: value.name })) };
  const name = lookups[key]?.find(item => item.id === id)?.name;
  return name ? name + ' · ' + id : id;
}
function enumFor(path, key) {
  const sec0 = path[0];
  if (sec0 === 'lands' && path.includes('maps') && key === 'type') return ['town', 'dungeon', 'forest', 'openDesert', 'custom'];
  if (sec0 === 'lands' && path.includes('maps') && key === 'boss') return Object.entries(cur.enemies).filter(([, enemy]) => enemy.boss).map(([id]) => id);
  if (sec0 === 'bossSkillDefs' && key === 'effectId') return ['summon'];
  if (sec0 === 'gearBases' && key === 'slot') return Object.keys(cur.gearSlots || {});
  if (sec0 === 'affixes' && key === 'tier') return ['common', 'rare'];
  if (sec0 === 'weaponBases' && key === 'shape') return ['sword', 'dagger', 'axe', 'spear', 'staff'];
  if ((sec0 === 'enemies' || sec0 === 'npcs') && key === 'shape' && path.length === 3) return SHAPES();
  if (sec0 === 'enemies' && key === 'element' && path.length === 3) return Object.keys(cur.config.elements.names);
  if (sec0 === 'gearSets' && key === 'weapon') return cur.weaponBases.map(b => b.id);
  if (sec0 === 'gearSets' && (key === 'body' || key === 'legs')) return cur.gearBases.filter(b => b.slot === key).map(b => b.id);
  if (sec0 === 'startPlayer' && key === 'cls') return Object.keys(cur.classes);
  if ((sec0 === 'quests' || sec0 === 'npcs') && key === 'land') return cur.lands.map(x => x.id);
  if (sec0 === 'quests' && key === 'npc') return Object.keys(cur.npcs);
  if (sec0 === 'quests' && key === 'target') return Object.keys(cur.enemies);
  if (sec0 === 'starterWeapon' && key === 'base') return cur.weaponBases.map(b => b.id);
  if (sec0 === 'starterWeapon' && key === 'rarity') return cur.rarities.map(r => r.id);
  if (sec0 === 'npcs' && key === 'land' && path.length === 3) return (cur.lands || []).map(l => l.id);
  if (sec0 === 'npcs' && (key === 'idle' || key === 'done') && path.length === 3) return Object.keys(cur.dialogue || {});
  return null;
}
const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const slug = path => path.join('_').replace(/[^A-Za-z0-9_]/g, '').slice(0, 40) + '_' + Date.now().toString(36);
function pickImage(path, done) { const f = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
  f.onchange = async () => { if (!f.files[0]) return; try { const d = await fileToPng(f.files[0]); const key = 'custom/' + slug(path) + '.png'; imgs[key] = d; idbPut(key, d); done(key); } catch (e) { alert('อ่านรูปไม่ได้'); } }; f.click(); }
// ช่องรูปเดี่ยว: เก็บ "custom/xxx.png" หรือ null
function imgRow(label, path, help) {
  const val = getAt(cur, path) || null, row = mk('div', 'row' + (!eq(getAt(base, path) || null, val) ? ' chg' : ''));
  row.appendChild(mk('label', '', label + '<small>' + path[path.length - 1] + '</small>'));
  const th = mk('img', 'thumb'); th.src = imgSrc(val); th.style.visibility = val ? 'visible' : 'hidden'; th.onerror = () => { th.style.visibility = 'hidden'; }; row.appendChild(th);
  const up = mk('button', '', val ? '🖼 เปลี่ยนรูป' : '🖼 เลือกรูป'); up.onclick = () => pickImage(path, k => { setElemImg(path, k); renderForm(); renderItems(); });
  const cl = mk('button', '', '✕ ไม่ใช้รูป'); cl.onclick = () => { setElemImg(path, null); renderForm(); renderItems(); }; cl.style.visibility = val ? 'visible' : 'hidden';
  row.append(up, cl, mk('span', 'note', (help || 'ไม่ใส่ = ใช้ภาพวาดเดิมของเกม') + (val ? ' · ' + val : ''))); return row;
}
function setElemImg(path, v) { // elements.imgs อาจยังไม่มี → ตั้งทั้งก้อน
  if (path[1] === 'elements' && path[2] === 'imgs') { const o = { ...(getAt(cur, path.slice(0, 3)) || {}) }; if (v) o[path[3]] = v; else delete o[path[3]]; setValue(path.slice(0, 3), o); } else setValue(path, v);
}
// sprite 3 สถานะ: { idle:{src,frames,fps}, walk:{...}, atk:{...}, scale }
function spriteBlock(path) {
  const box = mk('fieldset', 'blk'), cur0 = getAt(cur, path), sp = cur0 && typeof cur0 === 'object' ? JSON.parse(JSON.stringify(cur0)) : (typeof cur0 === 'string' ? { idle: { src: cur0 } } : {});
  box.appendChild(mk('legend', '', 'รูปสไปรต์ (ยืน / เดิน / โจมตี)'));
  box.appendChild(mk('div', 'note blk', 'รูปเดียวหรือแถบเฟรมแนวนอน (ใส่จำนวนเฟรมที่ช่อง "เฟรม") · เท้าอยู่กึ่งกลางขอบล่างของรูป · สถานะที่ไม่มีรูปใช้ "ยืน" แทน · ไม่มีรูปเลย = ใช้ลายเส้นเดิม · ศัตรู: "โจมตี" แสดงตอนง้าง/ตี'));
  const save = () => { for (const k of ['idle', 'walk', 'atk']) if (sp[k] && !sp[k].src) delete sp[k]; const empty = !sp.idle && !sp.walk && !sp.atk; setValue(path, empty ? null : sp); };
  for (const [k, t] of [['idle', 'ยืน'], ['walk', 'เดิน'], ['atk', 'โจมตี']]) {
    const st = sp[k] = typeof sp[k] === 'string' ? { src: sp[k] } : sp[k] || {}, row = mk('div', 'row'); row.appendChild(mk('label', '', t + '<small>' + k + '</small>'));
    const th = mk('img', 'thumb'); th.src = imgSrc(st.src); th.style.visibility = st.src ? 'visible' : 'hidden'; row.appendChild(th);
    const up = mk('button', '', st.src ? '🖼 เปลี่ยน' : '🖼 เลือกรูป'); up.onclick = () => pickImage([...path, k], key => { st.src = key; save(); renderForm(); });
    const cl = mk('button', '', '✕'); cl.style.visibility = st.src ? 'visible' : 'hidden'; cl.onclick = () => { st.src = null; save(); renderForm(); };
    const fr = Object.assign(mk('input'), { type: 'number', min: 1, value: st.frames || 1, title: 'จำนวนเฟรม' }), fp = Object.assign(mk('input'), { type: 'number', min: 1, value: st.fps || 6, title: 'เฟรมต่อวินาที' });
    fr.onchange = () => { st.frames = Math.max(1, parseInt(fr.value) || 1); save(); }; fp.onchange = () => { st.fps = Math.max(1, parseInt(fp.value) || 6); save(); };
    row.append(up, cl, mk('span', '', ' เฟรม'), fr, mk('span', '', ' fps'), fp); fr.style.width = fp.style.width = '56px'; box.appendChild(row);
  }
  const rs = mk('div', 'row'); rs.appendChild(mk('label', '', 'ขนาดรูป<small>scale</small>')); const sc = Object.assign(mk('input'), { type: 'number', step: 'any', value: sp.scale || 1 }); sc.onchange = () => { sp.scale = parseFloat(sc.value) || 1; save(); };
  rs.append(sc, mk('span', 'note', '1 = พิกเซลรูปละ 1 พิกเซลในเกม · ตัวละครปกติสูงราว 30 พิกเซล')); box.appendChild(rs); return box;
}
function numRow(label, key, path, help, intOnly) {
  const val = getAt(cur, path), row = mk('div', 'row' + (!eq(getAt(base, path) == null ? null : getAt(base, path), val == null ? null : val) ? ' chg' : '')); row.appendChild(mk('label', '', label + '<small>' + key + '</small>'));
  const i = Object.assign(mk('input'), { type: 'number', step: 'any', value: val == null ? '' : val, placeholder: 'ว่าง = ไม่ใช้' });
  i.onchange = () => { const n = parseFloat(i.value); setValue(path, isNaN(n) ? null : (intOnly ? Math.round(n) : n)); renderForm(); }; row.append(i, mk('span', 'note', help)); return row;
}
function dropsBlock(path) {
  const box = mk('fieldset', 'blk'), dr = (getAt(cur, path) || []).map(d => ({ ...d })); box.appendChild(mk('legend', '', 'อาวุธที่อาจดรอป (น้ำหนักเลือกชนิด · บอส iLvl +1)'));
  const save = () => { setValue(path, dr); renderForm(); }, ids = cur.weaponBases.map(b => b.id);
  dr.forEach((d, i) => { const row = mk('div', 'row'), sel = mk('select'); (ids.includes(d.base) ? ids : [d.base, ...ids]).forEach(o => { const op = mk('option'); op.value = o; const wb = cur.weaponBases.find(b => b.id === o); op.textContent = wb ? wb.name + ' (' + o + ')' : o; sel.appendChild(op); }); sel.value = d.base; sel.onchange = () => { d.base = sel.value; save(); };
    const rt = Object.assign(mk('input'), { type: 'number', step: 'any', min: 0, max: 100, value: d.pct != null ? d.pct : Math.round((d.rate || 0) * 1600) / 10 }); rt.onchange = () => { d.pct = Math.min(100, Math.max(0, parseFloat(rt.value) || 0)); delete d.rate; save(); };
    const x = mk('button', '', '🗑'); x.onclick = () => { dr.splice(i, 1); save(); }; row.append(sel, mk('span', '', ' น้ำหนัก'), rt, x); box.appendChild(row); });
  const add = mk('button', '', '＋ เพิ่มรายการดรอป'); add.onclick = () => { dr.push({ base: ids[0], pct: 8 }); save(); }; const r2 = mk('div', 'row'); r2.append(add, mk('span', 'note', HELP.rate)); box.appendChild(r2); return box;
}
let setMsg = '';
function setInfo(sec0, id) { // ชิ้นนี้อยู่ในเซตไหน + เมนูเลือกเซ็ต + โบนัสเซต
  const key = sec0 === 'weaponBases' ? 'weapon' : (cur.gearBases.find(b => b.id === id) || {}).slot, allSets = cur.gearSets || [], sets = allSets.filter(g => g[key] === id), box = mk('fieldset', 'blk');
  box.appendChild(mk('legend', '', 'ชุดเซ็ต'));
  const nm = x => { const b = cur.weaponBases.find(w => w.id === x) || cur.gearBases.find(w => w.id === x); return b ? b.name : x; };
  if (key === 'acc' || key === 'acc2') { box.appendChild(mk('div', 'note blk', 'เครื่องประดับไม่อยู่ในเซ็ต')); return box; }
  const cs = sets[0], row = mk('div', 'row'), sel = mk('select');
  row.appendChild(mk('label', '', 'เซ็ตที่ชิ้นนี้สังกัด<small>gearSets.' + key + '</small>'));
  if (!cs) { const o = mk('option'); o.value = ''; o.textContent = '— ยังไม่อยู่ในเซ็ตใด —'; sel.appendChild(o); }
  for (const g of allSets) { const o = mk('option'); o.value = g.id; o.textContent = g.name + ' (' + g.id + ') · ตอนนี้ใส่: ' + nm(g[key]); sel.appendChild(o); }
  sel.value = cs ? cs.id : '';
  sel.onchange = () => {
    const to = allSets.find(g => g.id === sel.value); if (!to || (cs && to.id === cs.id)) return;
    const old = to[key], msgs = [];
    if (cs && old) { setValue(['gearSets', cs.id, key], old); msgs.push('สลับ: "' + nm(old) + '" ย้ายไปอยู่เซ็ต "' + cs.name + '" แทน'); }
    else if (old) msgs.push('"' + nm(old) + '" ถูกถอดออกจากเซ็ต "' + to.name + '" (ตอนนี้ไม่อยู่ในเซ็ตใด)');
    setValue(['gearSets', to.id, key], id); setMsg = '✔ ย้ายเข้าเซ็ต "' + to.name + '" แล้ว · ' + msgs.join(' · '); renderForm();
  };
  row.append(sel, mk('span', 'note', 'แต่ละเซ็ตมี อาวุธ 1 + เสื้อ 1 + กางเกง 1 เสมอ → เปลี่ยนเซ็ตคือ "สลับที่" กับชิ้นเดิมของเซ็ตนั้น (ไม่มีเซ็ตขาดชิ้น) · อยากสร้างเซ็ตใหม่ไปหมวด "เซ็ตอุปกรณ์" → ＋ สร้างใหม่'));
  box.appendChild(row); if (setMsg) { box.appendChild(mk('div', 'note blk', setMsg)); setMsg = ''; }
  for (const g of sets) { box.appendChild(mk('div', 'note blk', '<b>' + g.name + '</b> (' + g.id + ') · อาวุธ ' + nm(g.weapon) + ' + เสื้อ ' + nm(g.body) + ' + กางเกง ' + nm(g.legs) + '<br>โบนัสเมื่อครบ 3 ชิ้น: ' + Object.entries(g.bonus).map(([k, v]) => (TH[k] || k) + ' +' + v).join(' · ') + ' · ออร่า ' + g.aura.style));
    const go = mk('button', '', '→ ไปแก้เซ็ตนี้'); go.onclick = () => { sec = 'gearSets'; entry = g.id; renderSide(); renderList(); renderForm(); }; box.appendChild(go); }
  return box;
}
function priceBlock(path) {
  const box = mk('fieldset', 'blk'); box.appendChild(mk('legend', '', 'ราคาขาย'));
  box.appendChild(numRow('ตัวคูณราคาขาย', 'priceMult', [...path, 'priceMult'], HELP.priceMult));
  const T = cur.config.sellByLevel, m = getAt(cur, [...path, 'priceMult']) || 1, at = L => { let i = 1; while (i < T.length - 1 && L > T[i][0]) i++; const A = T[i - 1], B = T[i]; return Math.max(1, Math.round((A[1] + (B[1] - A[1]) * (L - A[0]) / Math.max(1, B[0] - A[0])) * m)); };
  box.appendChild(mk('div', 'note blk', 'ราคาขายตามเลเวลไอเท็ม: ' + [1, 5, 10, 20, 30, 50].map(L => 'Lv' + L + ' = ' + at(L)).join(' · ') + ' ลูมิ — ตารางหลักแก้ที่หมวด "ตั้งค่าระบบ" → sellByLevel'));
  return box;
}
const artifactSlots = ['STR', 'VIT', 'AGI', 'INT'];
const currentArtifactEffects = Object.values(base.artifactMatrix).flatMap(group => Object.values(group));
const legacyArtifactEffects = Object.values(base.legacyArtifactMatrix).flatMap(group => Object.values(group));
const artifactEffects = [...currentArtifactEffects, ...legacyArtifactEffects];
function artifactBonuses(id, def) {
  const box = mk('fieldset', 'blk');
  box.appendChild(mk('legend', '', 'โบนัสตามช่องสวมใส่'));
  const current = def.bonuses || cur.artifactMatrix[id];
  for (const slot of artifactSlots) {
    const cell = current[slot], row = mk('div', 'row');
    const effect = mk('select');
    for (const option of artifactEffects.filter((item, i) => artifactEffects.findIndex(x => x.mechanic === item.mechanic) === i)) effect.add(new Option(option.desc.replace('{v}', '…'), option.mechanic));
    effect.value = cell.mechanic;
    const value = Object.assign(mk('input'), { type: 'number', min: '0', step: 'any', value: String(cell.base), required: true });
    value.setAttribute('aria-label', 'โบนัส ' + slot);
    effect.setAttribute('aria-label', 'เอฟเฟกต์ ' + slot);
    const update = () => {
      if (!value.reportValidity() || !Number.isFinite(value.valueAsNumber)) return;
      const template = artifactEffects.find(option => option.mechanic === effect.value);
      setValue(['artifactDefs', id, 'bonuses'], { ...current, [slot]: { ...template, base: value.valueAsNumber } });
      renderForm();
    };
    effect.onchange = value.onchange = update;
    row.append(mk('label', '', slot), effect, value);
    box.appendChild(row);
  }
  return box;
}
function summonBinding(path, enemy) {
  const box = mk('fieldset', 'blk');
  box.appendChild(mk('legend', '', 'สกิลเรียกลูกน้อง'));
  const monsters = Object.entries(cur.enemies).filter(([, def]) => !def.boss);
  const binding = clone(enemy.summonSkill || {});
  const skillPath = [...path, 'summonSkill'];
  const save = value => { const form = form; const top = form.scrollTop; setValue(skillPath, value); renderForm(); form.scrollTop = top; };
  const select = mk('select');
  select.setAttribute('aria-label', 'สกิลเรียกลูกน้อง');
  select.add(new Option('ไม่ใช้สกิลเรียกลูกน้อง', ''));
  for (const [id, def] of Object.entries(cur.bossSkillDefs)) select.add(new Option(def.name, id));
  select.value = binding.skillId || '';
  select.onchange = () => {
    const skill = cur.bossSkillDefs[select.value];
    save(skill ? { skillId: select.value, roster: { [monsters[0][0]]: skill.waveSize } } : null);
  };
  box.appendChild(select);
  const skill = cur.bossSkillDefs[binding.skillId];
  if (!skill) return box;
  const help = mk('p', 'note');
  help.textContent = 'ตั้งจำนวนรวมให้ครบ ' + skill.waveSize + ' ตัวต่อรอบ รอบ HP ที่เว้นว่างจะใช้ชุดเปิดไฟต์';
  box.appendChild(help);
  const rounds = ['เปิดไฟต์', ...skill.thresholds.map(hp => 'HP ' + hp * 100 + '%')];
  for (const [index, title] of rounds.entries()) {
    const roster = index === 0 ? binding.roster : binding.phaseRosters?.[index - 1] || {};
    const group = mk('fieldset');
    const legend = mk('legend'); legend.textContent = title; group.appendChild(legend);
    const saveRoster = value => {
      if (index === 0) binding.roster = value;
      else {
        binding.phaseRosters ||= skill.thresholds.map(() => ({}));
        for (let i = 0; i < index; i++) binding.phaseRosters[i] ||= {};
        binding.phaseRosters[index - 1] = value;
      }
      save(binding);
    };
    const total = Object.values(roster).reduce((sum, count) => sum + count, 0);
    const info = mk('p', 'note'); info.textContent = total ? total + ' / ' + skill.waveSize + ' ตัว' : 'ใช้ชุดเปิดไฟต์';
    group.appendChild(info);
    for (const [id, count] of Object.entries(roster)) {
      const row = mk('div', 'row'), monster = mk('select'), qty = mk('input'), remove = mk('button', '', 'เอาออก');
      monster.setAttribute('aria-label', 'มอนสเตอร์ ' + title);
      for (const [key, def] of monsters.filter(([key]) => key === id || !Object.hasOwn(roster, key))) monster.add(new Option(def.name + ' · ' + key, key));
      monster.value = id;
      monster.onchange = () => { const next = { ...roster }; delete next[id]; next[monster.value] = count; saveRoster(next); };
      Object.assign(qty, { type: 'number', min: 1, max: skill.waveSize, step: 1, value: count });
      qty.setAttribute('aria-label', 'จำนวน ' + id);
      qty.onchange = () => { if (qty.checkValidity() && qty.valueAsNumber > 0) saveRoster({ ...roster, [id]: qty.valueAsNumber }); };
      remove.onclick = () => { const next = { ...roster }; delete next[id]; saveRoster(next); };
      row.append(monster, qty, remove); group.appendChild(row);
    }
    const available = monsters.find(([id]) => !Object.hasOwn(roster, id));
    if (available) {
      const add = mk('button', '', 'เพิ่มมอนสเตอร์');
      add.onclick = () => saveRoster({ ...roster, [available[0]]: Math.max(1, skill.waveSize - total) });
      group.appendChild(add);
    }
    box.appendChild(group);
  }
  return box;
}
function blocks(path, val) {
  const wrap = mk('div'), s0 = path[0];
  if (SECDOC[s0]) { const d = mk('details', 'doc'); d.innerHTML = '<summary>📘 คำอธิบายหมวดนี้ (กดพับ/ขยาย)</summary><div>' + SECDOC[s0] + '</div>'; wrap.appendChild(d); }
  if (s0 === 'heroSprite') { wrap.appendChild(spriteBlock(['heroSprite'])); wrap.appendChild(mk('div', 'note blk', 'เมื่อใส่รูป เกมจะใช้รูปแทนลายเส้นตัวละคร (รวมอาวุธในลายเส้น — ให้วาดอาวุธไว้ในรูปเอง) · "โจมตี" แสดงตอนฟัน/ร่าย')); return wrap; }
  if (path.length < 2) { if (s0 === 'config') { const bx = mk('fieldset', 'blk'); bx.appendChild(mk('legend', '', 'รูปธาตุ (คู่มือธาตุ)')); const E = cur.config.elements; for (const k of Object.keys(E.names)) bx.appendChild(imgRow(E.names[k] + ' (' + k + ')', ['config', 'elements', 'imgs', k])); wrap.appendChild(bx);
    const supplies = mk('fieldset', 'blk');
    supplies.appendChild(mk('legend', '', 'รูปไอเท็มใช้งาน'));
    for (const it of cur.config.shop) supplies.appendChild(imgRow(it.name, ['config', 'shop', it.kind, 'img']));
    wrap.appendChild(supplies);
  } return wrap; }
  const key = path[1];
  if (s0 === 'enemies' && val.boss) {
    const hp = mk('fieldset', 'blk');
    hp.appendChild(mk('legend', '', 'เลือดบอส'));
    hp.appendChild(numRow('HP สูงสุด (ค่าฐาน)', 'maxHp', [...path, 'maxHp'], HELP.bossMaxHp, true));
    wrap.appendChild(hp);
    wrap.appendChild(summonBinding(path, val));
  }
  if (s0 === 'enemies' || s0 === 'npcs') wrap.appendChild(spriteBlock([s0, key, 'sprite']));
  if (s0 === 'enemies') { const bx = mk('fieldset', 'blk'); bx.appendChild(mk('legend', '', 'ระดับ (Level)')); bx.appendChild(numRow('เลเวลตายตัว', 'level', [s0, key, 'level'], HELP.level, true)); bx.appendChild(numRow('เลเวลบวก/ลบ', 'lvlOffset', [s0, key, 'lvlOffset'], HELP.lvlOffset, true)); wrap.appendChild(bx); wrap.appendChild(dropsBlock([s0, key, 'drops'])); }
  if (s0 === 'weaponBases' || s0 === 'gearBases') { wrap.appendChild(imgRow('รูปไอเท็ม (กระเป๋า/สวมใส่)', [s0, key, 'img'], 'ไอคอนในกระเป๋า / สวมใส่ / ร้านค้า · ไม่ใส่ = ภาพวาดเดิม')); wrap.appendChild(imgRow('รูปตกพื้น (เห็นในแมพ)', [s0, key, 'groundImg'], 'เห็นเฉพาะในแผนที่ตอนไอเท็มตกอยู่บนพื้น (แยกจากรูปไอเท็ม) · ไม่ใส่ = ภาพวาดเดิม')); wrap.appendChild(priceBlock([s0, key])); wrap.appendChild(setInfo(s0, key)); }
  if (s0 === 'artifactDefs') wrap.appendChild(artifactBonuses(key, val));
  if (s0 === 'artifactDefs') wrap.appendChild(imgRow('รูป Artifact', [s0, key, 'img'], 'ใช้ทุกเกรดของ Artifact ชนิดนี้'));
  if (s0 === 'questItems') wrap.appendChild(imgRow('รูปไอเท็มเควส', [s0, key, 'img'], 'แสดงในกระเป๋า (ชิปไอเท็มเควส)'));
  if (s0 === 'skills' || s0 === 'weaponSkillDefs') wrap.appendChild(imgRow('รูปไอคอนสกิล', [s0, key, 'img'], 'ใช้แทนสัญลักษณ์ icon บนปุ่มสกิลและหน้าสกิล · ไม่ใส่ = ใช้ icon เดิม'));
  if ((s0 === 'skills' && key === 'ink_storm') || (s0 === 'weaponSkillDefs' && key === 'wsk_area_magic')) {
    const row = mk('div', 'row');
    const color = Object.assign(mk('input'), { type: 'color', value: val.dropColor || '#1b1b1b' });
    color.setAttribute('aria-label', 'สีลูกไฟตก');
    color.onchange = () => setValue([s0, key, 'dropColor'], color.value);
    row.append(mk('label', '', 'สีลูกไฟตก'), color);
    wrap.appendChild(row);
  }
  if (s0 === 'affixes') wrap.appendChild(imgRow('รูปไอคอนออปชัน', [s0, key, 'img'], 'แสดงหน้าบรรทัดออปชันบนการ์ดไอเท็ม · ไม่ใส่ = จุด •'));
  return wrap;
}
const NEWTPL = {
  artifactDefs: {
    label: 'Artifact', keyed: true,
    fields: [['id', 'รหัส (a-z0-9_)'], ['name', 'ชื่อ'], ['template', 'ต้นแบบ', () => Object.keys(cur.artifactDefs)]],
    make: f => {
      const template = cur.artifactDefs[f.template];
      return { ...clone(template), id: f.id, name: f.name, bonuses: clone(template.bonuses || cur.artifactMatrix[f.template]) };
    }
  },
  enemies: {
    label: 'มอนสเตอร์ / บอส', keyed: true,
    fields: [['id', 'รหัส (a-z0-9_)'], ['name', 'ชื่อ'], ['template', 'ต้นแบบ Runtime', () => Object.keys(cur.enemies)]],
    make: f => ({ ...clone(cur.enemies[f.template]), name: f.name })
  },
  weaponBases: { label: 'อาวุธ', fields: [['id', 'รหัส (a-z0-9_)'], ['name', 'ชื่อ']], make: f => ({ id: f.id, name: f.name, shape: 'sword', min: 3, max: 6, speed: 1, range: 1.25, arc: 110, magic: 0, physical: true, img: null, priceMult: null }) },
  gearBases: { label: 'อุปกรณ์ (เสื้อ/กางเกง/เครื่องประดับ)', fields: [['id', 'รหัส (a-z0-9_)'], ['name', 'ชื่อ'], ['slot', 'ช่อง', () => Object.keys(cur.gearSlots).filter(k => k !== 'acc2')]], make: f => ({ id: f.id, slot: f.slot, name: f.name, stats: { def: 1 }, img: null, priceMult: null }) },
  gearSets: { label: 'เซ็ตอุปกรณ์', fields: [['id', 'รหัส (a-z0-9_)'], ['name', 'ชื่อเซ็ต'], ['weapon', 'อาวุธ', () => cur.weaponBases.map(b => b.id)], ['body', 'เสื้อ', () => cur.gearBases.filter(b => b.slot === 'body').map(b => b.id)], ['legs', 'กางเกง', () => cur.gearBases.filter(b => b.slot === 'legs').map(b => b.id)]], make: f => ({ id: f.id, name: f.name, weapon: f.weapon, body: f.body, legs: f.legs, bonus: { atkPct: 5 }, aura: { color: '#888888', style: 'spark' } }) },
  questItems: { label: 'ไอเท็มเควส', keyed: true, fields: [['id', 'รหัส (a-z0-9_)'], ['name', 'ชื่อ']], make: f => ({ name: f.name, desc: '', img: null }) }
};
function newModal(sec0) {
  const T = NEWTPL[sec0], ov = mk('div', 'modal'), bx = mk('div', 'mbox'); bx.appendChild(mk('h3', '', '＋ สร้าง' + T.label + 'ใหม่')); const f = {}, ins = {};
  for (const [k, t, opts] of T.fields) { const r = mk('div', 'row'); r.appendChild(mk('label', '', t)); let i; if (opts) { i = mk('select'); opts().forEach(o => { const op = mk('option'); op.value = o; op.textContent = o + (cur.gearSlots[o] ? ' — ' + cur.gearSlots[o] : ''); i.appendChild(op); }); } else i = Object.assign(mk('input'), { type: 'text' }); ins[k] = i; r.appendChild(i); bx.appendChild(r); }
  bx.appendChild(mk('div', 'note blk', 'สร้างแล้วยังไม่มีรูป = ใช้ภาพวาดเดิม (null) · ใส่รูป ราคา ค่าสถานะได้ในหน้าถัดไป'));
  const ok = mk('button', 'pri', 'สร้าง'), no = mk('button', '', 'ยกเลิก'); no.onclick = () => ov.remove();
  ok.onclick = () => { for (const k in ins) f[k] = ins[k].value.trim(); if (!/^[a-z0-9_]+$/.test(f.id || '')) { alert('รหัสต้องเป็น a-z 0-9 _ เท่านั้น'); return; } const exist = T.keyed ? cur[sec0][f.id] : cur[sec0].find(x => x.id === f.id); if (exist) { alert('รหัสนี้มีอยู่แล้ว'); return; } if (!f.name) f.name = f.id;
    ops.push(T.keyed ? { op: 'add', path: [sec0], key: f.id, value: T.make(f) } : { op: 'add', path: [sec0], value: T.make(f) }); rebuild(); entry = f.id; ov.remove(); renderList(); renderForm(); };
  const br = mk('div', 'row'); br.append(ok, no); bx.appendChild(br); ov.appendChild(bx);
  const trigger = document.activeElement;
  bx.setAttribute('role', 'dialog'); bx.setAttribute('aria-modal', 'true'); bx.setAttribute('aria-label', 'สร้าง' + T.label);
  no.onclick = () => { ov.remove(); trigger?.focus(); };
  ov.onkeydown = e => { if (e.key === 'Escape') no.click(); };
  document.body.appendChild(ov); Object.values(ins)[0]?.focus();
}

function renderForm() {
  const F = $('form'); F.innerHTML = ''; if (!sec) { F.innerHTML = '<p class="hint">เลือกหมวดทางซ้ายก่อน</p>'; return; }
  const es = entries(sec); let path, val;
  if (es) { if (!entry) { F.innerHTML = '<p class="hint">เลือกรายการ</p>'; return; } path = [sec, entry]; val = getAt(cur, path); if (val === undefined) { F.innerHTML = '<p class="hint">รายการนี้ถูกลบ</p>'; return; } } else { path = [sec]; val = cur[sec]; }
  F.scrollTop = 0;
  const heading = mk('div', 'editor-heading');
  const category = mk('small'); category.textContent = SECTIONS.find(([key]) => key === sec)[1]; heading.appendChild(category);
  const title = mk('h1'); title.textContent = val?.name || (es ? entry : category.textContent);
  if (!es) category.textContent = sec;
  heading.appendChild(title);
  F.appendChild(heading);
  const bar = document.createElement('div'); bar.className = 'row';
  if (es) { const dup = document.createElement('button'); dup.textContent = '＋ ทำสำเนา'; dup.onclick = () => { const nk = prompt('รหัสใหม่ (a-z0-9_)', entry + '_2'); if (!nk) return; if (!/^[a-z0-9_]+$/.test(nk) || getAt(cur, [sec, nk]) !== undefined) { alert('รหัสไม่ถูกต้องหรือมีอยู่แล้ว'); return; } const v = clone(val); const col = cur[sec];
      if (sec === 'artifactDefs') { v.id = nk; v.bonuses = clone(v.bonuses || cur.artifactMatrix[entry]); }
      if (Array.isArray(col)) { if (v.id !== undefined) v.id = nk; else if (v.base !== undefined) v.base = nk; ops.push({ op: 'add', path: [sec], value: v }); } else ops.push({ op: 'add', path: [sec], key: nk, value: v });
      rebuild(); entry = nk; renderList(); renderForm(); };
    const del = document.createElement('button'); del.textContent = '🗑 ลบรายการ'; del.onclick = () => { if (!confirm('ลบ ' + entry + ' ?')) return; const pre = pk(path).slice(0, -1);
      ops = ops.filter(o => !pk(o.path).startsWith(pre)); if (getAt(base, path) !== undefined) ops.push({ op: 'del', path }); rebuild(); entry = null; renderList(); renderForm(); };
    bar.append(dup, del); if (sec === 'skills' || sec === 'weaponSkillDefs') bar.appendChild(mk('span', 'note', 'การเพิ่มพฤติกรรมสกิลต้องแก้โค้ด Runtime')); F.appendChild(bar); }
  F.appendChild(blocks(path, val)); if (sec === 'heroSprite') return;
  const rt = document.createElement('div'); if (val && typeof val === 'object') { for (const k of Object.keys(val)) { if (k === 'dropColor' && ((sec === 'skills' && entry === 'ink_storm') || (sec === 'weaponSkillDefs' && entry === 'wsk_area_magic'))) continue; if (sec === 'artifactDefs' && ['id', 'bonuses'].includes(k)) continue; rt.appendChild(node([...path, k], k, val[k], 1)); } } else rt.appendChild(field(path, path[path.length - 1], val, 0)); F.appendChild(rt);
}
function summary() { return ops.map(o => `${o.op} ${o.path.join('.')}${o.key ? '.' + o.key : ''}${o.op === 'set' ? ' = ' + JSON.stringify(o.value) + '  (เดิม ' + JSON.stringify(getAt(base, o.path)) + ')' : o.op === 'add' ? ' ' + JSON.stringify(o.value).slice(0, 60) : ''}`).join('\n'); }
function previewImgs() { const m = {}; for (const k of usedImgs()) if (imgs[k]) m[k] = imgs[k]; return m; }
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
function validateDraft(draft) {
  if (!Array.isArray(draft)) return false;
  const copy = clone(base);
  const safe = value => value === null || typeof value !== 'object' ||
    Object.entries(value).every(([key, child]) => !forbiddenKeys.has(key) && safe(child));
  for (const op of draft) {
    if (!op || !['set', 'add', 'del'].includes(op.op) || !Array.isArray(op.path) || !op.path.length ||
        !op.path.every(key => ['string', 'number'].includes(typeof key) && !forbiddenKeys.has(String(key))) ||
        !Object.hasOwn(copy, op.path[0]) || forbiddenKeys.has(op.key) || !safe(op.value)) return false;
    if (op.op !== 'del' && op.value === undefined) return false;
    if (op.op === 'add') {
      const target = getAt(copy, op.path);
      const id = Array.isArray(target) ? op.value?.id || op.value?.base : op.key;
      if (!target || typeof target !== 'object' || (!Array.isArray(target) && !id) ||
          (id && (forbiddenKeys.has(id) || Object.hasOwn(target, id) || (Array.isArray(target) && target.some(item => item?.id === id || item?.base === id))))) return false;
    }
    if (applyOps(copy, [op])) return false;
  }
  const reasonable = value => Number.isFinite(value) && value > 0;
  if (!Object.values(copy.bossSkillDefs).every(skill => skill.effectId === 'summon' &&
    reasonable(skill.castTime) && reasonable(skill.cooldown) &&
    Number.isInteger(skill.waveSize) && skill.waveSize >= 1 &&
    Number.isInteger(skill.maxAlive) && skill.maxAlive >= skill.waveSize && skill.maxAlive <= 30 &&
    Array.isArray(skill.thresholds) && skill.thresholds.every((hp, index) => hp > 0 && hp < (skill.thresholds[index - 1] ?? 1)))) return false;
  for (const enemy of Object.values(copy.enemies)) {
    const binding = enemy.summonSkill;
    if (!binding) continue;
    const skill = copy.bossSkillDefs[binding.skillId];
    const validRoster = roster => roster && typeof roster === 'object' && !Array.isArray(roster) &&
      Object.entries(roster).every(([id, count]) => Object.hasOwn(copy.enemies, id) && !copy.enemies[id].boss && Number.isInteger(count) && count > 0) &&
      Object.values(roster).reduce((total, count) => total + count, 0) === skill.waveSize;
    if (!enemy.boss || !skill || !validRoster(binding.roster) ||
        (binding.phaseRosters != null && (!Array.isArray(binding.phaseRosters) ||
          !binding.phaseRosters.every(roster => roster && typeof roster === 'object' && !Array.isArray(roster) && (!Object.keys(roster).length || validRoster(roster)))))) return false;
  }
  const dropRates = copy.config.equipmentDrops;
  if (![['normal','accessoryNormal'], ['alpha','accessoryAlpha'], ['boss','accessoryBoss']].every(([equipment, accessory]) =>
    Number.isFinite(dropRates?.[equipment]) && dropRates[equipment] >= 0 && dropRates[equipment] <= 1 &&
    Number.isFinite(dropRates[accessory]) && dropRates[accessory] >= 0 && dropRates[accessory] <= dropRates[equipment])) return false;
  const weapons = new Set(copy.weaponBases.map(weapon => weapon.id));
  const gearIn = (id, slot) => copy.gearBases.some(item => item.id === id && item.slot === slot);
  if (!weapons.has(copy.starterWeapon.base) || !copy.classes[copy.startPlayer.cls] ||
      !copy.gearSets.every(set => weapons.has(set.weapon) && gearIn(set.body, 'body') && gearIn(set.legs, 'legs')) ||
      !Object.values(copy.enemies).every(enemy => (enemy.drops || []).every(drop => weapons.has(drop.base)))) return false;
  if (!copy.artifactDefs || !Object.entries(copy.artifactDefs).every(([id, def]) => {
    const bonuses = def?.bonuses || copy.artifactMatrix[id];
    return def?.id === id && typeof def.name === 'string' && artifactSlots.every(slot => {
      const cell = bonuses?.[slot];
      return cell && Number.isFinite(cell.base) && cell.base >= 0 &&
        artifactEffects.some(effect => effect.mechanic === cell.mechanic && effect.desc === cell.desc && effect.unit === cell.unit);
    });
  })) return false;
  return Object.values(copy.enemies).every(enemy => enemy && typeof enemy.name === 'string' &&
    Number.isFinite(enemy.hp) && enemy.hp > 0 && (enemy.maxHp == null || (enemy.boss && Number.isSafeInteger(enemy.maxHp) && enemy.maxHp > 0)) && Number.isFinite(enemy.atk) && enemy.atk > 0) &&
    Array.isArray(copy.skills) && copy.skills.every(skill => typeof skill?.id === 'string' &&
      Number.isInteger(skill.maxLv) && skill.maxLv > 0 && Number.isFinite(skill.cd) && skill.cd >= 0);
}
function draftIsValid() {
  if (validateDraft(ops)) return true;
  alert('Draft มีข้อมูลหรือรหัสไม่ถูกต้อง กรุณาตรวจค่าที่แก้แล้วลองใหม่');
  return false;
}
function pushPreview() {
  if (!draftIsValid()) return false;
  try {
    localStorage.setItem('pd_ops_preview', JSON.stringify({ ops, imgs: previewImgs() }));
    return true;
  } catch {
    alert('ส่ง Draft ไม่สำเร็จ พื้นที่จัดเก็บของเบราว์เซอร์อาจเต็ม');
    return false;
  }
}
$('b-try').onclick = () => { if (pushPreview()) window.open('index.html?preview=1', '_blank'); };
$('b-arena').onclick = () => { if (pushPreview()) window.open('arena.html?preview=1', 'ink-world-arena-preview'); };
$('b-zip').onclick = async () => { if (!draftIsValid()) return; const files = [{ name: 'overrides.json', data: new TextEncoder().encode(JSON.stringify({ version: 1, ops }, null, 1)) }]; let miss = 0;
  for (const k of usedImgs()) {
    if (imgs[k]) { files.push({ name: k, data: dataToBytes(imgs[k]) }); continue; }
    try {
      const response = await fetch(k);
      if (!response.ok || !response.headers.get('Content-Type')?.includes('image/png')) throw Error('Image missing');
      files.push({ name: k, data: new Uint8Array(await response.arrayBuffer()) });
    } catch { miss++; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(makeZip(files)); a.download = 'InkWorld_custom.zip'; a.click();
  if (miss) alert('มีรูป ' + miss + ' ไฟล์ที่อ้างถึงแต่ไม่อยู่ในเบราว์เซอร์นี้ (นำเข้า json จากเครื่องอื่น) → ต้องใช้ไฟล์ custom/ เดิมคู่กับ overrides.json'); };
$('b-dl').onclick = () => { if (!draftIsValid()) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, ops }, null, 1)], { type: 'application/json' })); a.download = 'overrides.json'; a.click(); };
$('b-bundled').onclick = async () => {
  try {
    const response = await fetch('overrides.json', { cache: 'no-store' });
    if (!response.ok) throw Error('No overrides');
    const { ops: installed } = await response.json();
    if (!validateDraft(installed)) throw Error('Invalid overrides');
    if (ops.length && !confirm('แทน Draft ปัจจุบันด้วย overrides ที่ติดมากับเกมหรือไม่?')) return;
    ops = installed; rebuild(); renderList(); renderForm();
    $('b-bundled').closest('details').open = false;
  } catch { alert('โหลด overrides ของเกมไม่ได้ หรือมีการอ้างอิงข้อมูลไม่ถูกต้อง'); }
};
$('b-up').onclick = () => $('file').click();
$('file').onchange = async e => { try { const j = JSON.parse(await e.target.files[0].text()); const imported = j.ops || j; if (!validateDraft(imported)) throw Error('Invalid draft'); ops = imported; rebuild(); renderForm(); renderItems(); } catch (x) { alert('ไฟล์ไม่ถูกต้อง'); } e.target.value = ''; };
$('b-copy').onclick = async () => { try { await navigator.clipboard.writeText(summary()); alert('คัดลอกแล้ว (' + ops.length + ' จุด)'); } catch (e) { prompt('คัดลอกข้อความนี้', summary()); } };
$('b-clr').onclick = () => { if (!ops.length || !confirm('ล้างการแก้ทั้งหมด? (รูปที่อัปโหลดจะถูกลบจากเบราว์เซอร์นี้ด้วย)')) return; ops = []; localStorage.removeItem('pd_ops_preview'); localStorage.removeItem('pd_img_preview'); for (const k in imgs) delete imgs[k]; idbClear(); rebuild(); renderForm(); renderItems(); };
(window as any).__ed = { get ops() { return ops; }, get cur() { return cur; }, base, setValue, imgs, usedImgs, makeZip, rebuild, pick: (s, e) => { sec = s; entry = e || null; renderSide(); renderList(); renderForm(); } };
$('editor-version').textContent = 'v' + base.config.version;
rebuild(); sec = SECTIONS[0][0]; renderSide(); renderList(); renderForm();
idbAll().then(o => { Object.assign(imgs, o); renderForm(); });
