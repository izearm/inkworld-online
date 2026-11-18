// @ts-nocheck
// ===== Artifacts: ความทรงจำที่ให้พลังพิเศษ (ซื้อจาก NPC เท่านั้น) =====
// v2.3.1: ของขายมีแค่ 4 ชิ้น (ไฟ/น้ำแข็ง/สายฟ้า/หมึก) · สวมใส่ลงช่อง STR/VIT/AGI/INT ได้อิสระ
// ผลที่ได้ขึ้นกับ (ธาตุ × ช่องที่เลือกสวม) ตามตาราง artifactMatrix ด้านล่าง (4×4 = 16 กลไก)

// ของที่ขายในร้าน (แค่ 4 อย่างตามธาตุ — ไม่ผูกกับ stat)
PD_DATA.artifactDefs = {
  fire: { id: 'fire', elem: 'fire', name: 'ภาพถ่ายเก่า', icon: '📷', flavor: 'ความทรงจำสีแดงอุ่น ๆ' },
  ice:  { id: 'ice',  elem: 'ice',  name: 'เสื้อผ้าเก่า', icon: '👔', flavor: 'ความทรงจำสีฟ้าเยือกเย็น' },
  bolt: { id: 'bolt', elem: 'bolt', name: 'โมเดลสถานที่', icon: '🏛', flavor: 'ความทรงจำสีเหลืองแวบไว' },
  ink:  { id: 'ink',  elem: 'ink',  name: 'ขนนกดำ',       icon: '🪶', flavor: 'ความทรงจำสีดำสนิท' }
};

// ตาราง 4 ธาตุ × 4 stat = 16 กลไกเฉพาะ — ใช้ตอนเลือกช่องสวมใส่ (ไม่ใช่ตอนซื้อ)
PD_DATA.legacyArtifactMatrix = {
  fire: {
    STR: { desc: '+{v}% โจมตีกายภาพ',          base: 5,  unit: '%',  mechanic: 'physDmgPct' },
    VIT: { desc: 'ฆ่าศัตรูฟื้น {v} HP',         base: 8,  unit: '',   mechanic: 'hpOnKill' },
    AGI: { desc: '+{v}% คริติคอล',              base: 3,  unit: '%',  mechanic: 'critRate' },
    INT: { desc: 'สกิลทำให้ลุกไหม้ {v}/วิ',      base: 2,  unit: '/s', mechanic: 'spellBurn' }
  },
  ice: {
    STR: { desc: 'โจมตีทำให้ช้าลง {v}%',        base: 15, unit: '%',  mechanic: 'slowOnHit' },
    VIT: { desc: '+{v}% ลดดาเมจที่ได้รับ',       base: 4,  unit: '%',  mechanic: 'dmgReduction' },
    AGI: { desc: '{v}% โอกาสหลบ',               base: 4,  unit: '%',  mechanic: 'dodge' },
    INT: { desc: 'สกิลมีโอกาสแช่แข็ง {v}%',      base: 8,  unit: '%',  mechanic: 'spellFreeze' }
  },
  bolt: {
    STR: { desc: 'โจมตีกระโดดไปศัตรูข้าง {v}%', base: 25, unit: '%',  mechanic: 'chainHit' },
    VIT: { desc: 'สะท้อนดาเมจ {v}%',             base: 8,  unit: '%',  mechanic: 'reflect' },
    AGI: { desc: '+{v}% ความเร็วโจมตี',          base: 6,  unit: '%',  mechanic: 'aspdBonus' },
    INT: { desc: 'สกิลทะลุเป้า +{v}',            base: 1,  unit: '',   mechanic: 'spellPierce' }
  },
  ink: {
    STR: { desc: 'ดูดเลือด {v}% ของดาเมจ',       base: 2,  unit: '%',  mechanic: 'lifesteal' },
    VIT: { desc: '+{v} HP สูงสุด',                base: 25, unit: '',   mechanic: 'maxHpBonus' },
    AGI: { desc: '+{v}% ความเร็วเดิน',            base: 6,  unit: '%',  mechanic: 'moveSpeed' },
    INT: { desc: '+{v} หมึก/วินาที',              base: 1,  unit: '/s', mechanic: 'inkRegen' }
  }
};

PD_DATA.artifactMatrix = {
  "fire": {
    "STR": {
      "desc": "+{v}% โจมตีกายภาพ",
      "base": 5,
      "unit": "%",
      "mechanic": "physDmgPct"
    },
    "VIT": {
      "desc": "+{v} เกราะ",
      "base": 10,
      "unit": "",
      "mechanic": "defBonus"
    },
    "AGI": {
      "desc": "+{v}% คริติคอล",
      "base": 5,
      "unit": "%",
      "mechanic": "critRate"
    },
    "INT": {
      "desc": "{v}% โอกาสทำให้ติดไฟเมื่อโจมตี",
      "base": 12.5,
      "unit": "%",
      "mechanic": "burnOnHit"
    }
  },
  "ice": {
    "STR": {
      "desc": "{v}% โอกาสทำให้ติดสโลว์เมื่อโจมตี",
      "base": 12.5,
      "unit": "%",
      "mechanic": "slowOnHit"
    },
    "VIT": {
      "desc": "+{v}% HP สูงสุด",
      "base": 5,
      "unit": "%",
      "mechanic": "hpPct"
    },
    "AGI": {
      "desc": "{v}% โอกาสหลบ",
      "base": 5,
      "unit": "%",
      "mechanic": "dodge"
    },
    "INT": {
      "desc": "+{v} หมึก/วินาที",
      "base": 1,
      "unit": "/s",
      "mechanic": "inkRegen"
    }
  },
  "bolt": {
    "STR": {
      "desc": "+{v}% ดาเมจเวท",
      "base": 10,
      "unit": "%",
      "mechanic": "magicDmg"
    },
    "VIT": {
      "desc": "+{v} HP/วินาที",
      "base": 5,
      "unit": "/s",
      "mechanic": "hpRegen"
    },
    "AGI": {
      "desc": "+{v}% ความเร็วเดิน",
      "base": 10,
      "unit": "%",
      "mechanic": "moveSpeed"
    },
    "INT": {
      "desc": "{v}% โอกาสเกิดสายฟ้าชิ่งเมื่อโจมตี",
      "base": 12.5,
      "unit": "%",
      "mechanic": "chainHit"
    }
  },
  "ink": {
    "STR": {
      "desc": "ดูดเลือด {v}% ของดาเมจ",
      "base": 2.5,
      "unit": "%",
      "mechanic": "lifesteal"
    },
    "VIT": {
      "desc": "+{v}% ลดดาเมจที่ได้รับ",
      "base": 4,
      "unit": "%",
      "mechanic": "dmgReduction"
    },
    "AGI": {
      "desc": "+{v}% ความเร็วโจมตี",
      "base": 6,
      "unit": "%",
      "mechanic": "aspdBonus"
    },
    "INT": {
      "desc": "+{v} STR, VIT, AGI และหมึกสูงสุด",
      "base": 2,
      "unit": "",
      "mechanic": "allStatInk"
    }
  }
};

// ระดับ Artifact: normal, rare, legendary — ค่าคูณ base
PD_DATA.artifactGrades = [
  { id: 'normal',    name: 'ธรรมดา',  color: '#3a3a3a', mult: 1.0,  price: 80 },
  { id: 'rare',      name: 'หายาก',   color: '#b98f00', mult: 1.5,  price: 250 },
  { id: 'legendary', name: 'ตำนาน',   color: '#e0661b', mult: 2.0,  price: 600 }
];

// สีธาตุ (เพิ่ม ink)
PD_DATA.artifactElemColors = { fire: '#e0412b', ice: '#3a8de0', bolt: '#e8c21a', ink: '#1b1b1b' };

// คำนวณผลลัพธ์ของ Artifact (ธาตุ+เกรด) เมื่อสวมใส่ลงช่อง stat ที่กำหนด — ใช้ร่วมกันทั้ง UI และ stats.ts
PD_DATA.artifactCellValue = function (id, stat, gradeId) {
  const cell = (PD_DATA.artifactDefs[id]?.bonuses || PD_DATA.artifactMatrix[id])?.[stat]; if (!cell) return null;
  const grade = PD_DATA.artifactGrades.find(g => g.id === gradeId);
  const val = Math.round(cell.base * (grade ? grade.mult : 1) * 10) / 10;
  return { mechanic: cell.mechanic, unit: cell.unit, val, desc: cell.desc.replace('{v}', '' + val) };
};

// ร้าน Artifact: รายการสินค้าทั้งหมด (สร้างตอนโหลดเกม) — มีแค่ 4 ธาตุ × 3 เกรด = 12 รายการ (ไม่ผูก stat)
PD_DATA.buildArtifactShop = function () {
  const items = [];
  const defs = PD_DATA.artifactDefs;
  const grades = PD_DATA.artifactGrades;
  for (const key in defs) {
    const d = defs[key];
    for (const g of grades) {
      items.push({
        defId: d.id,
        grade: g.id,
        gradeName: g.name,
        name: d.name,
        price: g.price,
        elem: d.elem,
        icon: d.icon,
        flavor: d.flavor,
        color: PD_DATA.artifactElemColors[d.elem],
        gradeColor: g.color
      });
    }
  }
  return items;
};
