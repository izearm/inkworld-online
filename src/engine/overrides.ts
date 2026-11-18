// @ts-nocheck
// ===== Overrides: ชุดคำสั่งแก้ค่าเกมจาก editor.html (ใช้ร่วมกันทั้งเกมและ editor) =====
// op: { op:'set', path:['enemies','blob','hp'], value:20 } · { op:'add', path:['enemies'], key:'x', value:{...} } (array: ไม่ต้องมี key) · { op:'del', path:['enemies','x'] }
// array ที่ element มี id / base → ใช้ id / base เป็นตัวระบุใน path แทนเลขลำดับ (ลำดับเปลี่ยนก็ยังตรง)
export function segIndex(arr, seg) {
  const i = arr.findIndex(el => el && typeof el === 'object' && (el.id === seg || el.base === seg || el.kind === seg));
  return i >= 0 ? i : (/^\d+$/.test(String(seg)) ? +seg : -1);
}
export function step(node, seg) {
  if (Array.isArray(node)) { const i = segIndex(node, seg); return i >= 0 ? node[i] : undefined; }
  return node == null ? undefined : node[seg];
}
export function getAt(root, path) { let n = root; for (const s of path) { n = step(n, s); if (n === undefined) return undefined; } return n; }
export function keyOf(el, i) { return el && typeof el === 'object' && (el.id || el.base) ? String(el.id || el.base) : String(i); }
export function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
export function applyOp(data, o) {
  const p = o.path;
  if (o.op === 'set') {
    const par = getAt(data, p.slice(0, -1)); if (par == null) return false; const last = p[p.length - 1];
    if (Array.isArray(par)) { const i = segIndex(par, last); if (i < 0) return false; par[i] = clone(o.value); } else par[last] = clone(o.value);
    return true;
  }
  if (o.op === 'add') {
    const col = getAt(data, p); if (col == null) return false;
    if (Array.isArray(col)) col.push(clone(o.value)); else col[o.key] = clone(o.value);
    return true;
  }
  if (o.op === 'del') {
    const par = getAt(data, p.slice(0, -1)); if (par == null) return false; const last = p[p.length - 1];
    if (Array.isArray(par)) { const i = segIndex(par, last); if (i < 0) return false; par.splice(i, 1); } else delete par[last];
    return true;
  }
  return false;
}
export function applyOps(data, ops) { let bad = 0; for (const o of ops || []) { try { if (!applyOp(data, o)) bad++; } catch (e) { bad++; } } return bad; }
// โหลด overrides.json (ข้างไฟล์เกม) แบบ sync เพื่อให้ทับก่อนโมดูลเกมอ่านข้อมูล · ไม่มีไฟล์ = ข้าม
export function loadOverridesFile(data) {
  try { const x = new XMLHttpRequest(); x.open('GET', 'overrides.json?' + Date.now(), false); x.send(); if (x.status !== 200) return 0;
    const j = JSON.parse(x.responseText); return applyOps(data, j.ops || j); } catch (e) { return 0; }
}
