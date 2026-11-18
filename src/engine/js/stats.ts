// @ts-nocheck
// ===== stats: ค่าสถานะอัตโนมัติ + ค่าที่คำนวณจากอาวุธ =====
PD.Stats = {
  expNeed(L) { const c = PD_DATA.config.exp; return Math.round(c.base * Math.pow(L, c.pow)); },
  baseStats(L, clsId) {
    const c = PD_DATA.classes[clsId || 'drawer'], o = {};
    for (const k in c.base) o[k] = Math.floor(c.base[k] + c.growth[k] * (L - 1));
    return o;
  },
  affixSum(w) {
    const s = { agi: 0 }; for (const a of PD_DATA.affixes) s[a.id] = 0;
    if (w) for (const a of w.affixes) s[a.id] = (s[a.id] || 0) + a.v;
    return s;
  },
  // เซต: อาวุธ (ชนิด) + เสื้อ + กางเกง ตรงกันครบ 3 ชิ้น
  setCount(p, s) { const g = p.gear || {}; return (p.weapon && p.weapon.base === s.weapon ? 1 : 0) + (g.body && g.body.base === s.body ? 1 : 0) + (g.legs && g.legs.base === s.legs ? 1 : 0); },
  activeSet(p) { return (PD_DATA.gearSets || []).find(s => this.setCount(p, s) === 3) || null; },
  setOf(item) { return (PD_DATA.gearSets || []).find(s => item.kind === 'gear' ? s[item.slot] === item.base : s.weapon === item.base) || null; },
  derive(p) {
    const c = PD_DATA.classes[p.cls], b = this.baseStats(p.level, p.cls), w = p.weapon;
    const base = PD_DATA.weaponBases.find(x => x.id === w.base), a = this.affixSum(w);
    for (const k in (p.gear || {})) { const g = p.gear[k]; if (g) for (const x of g.stats.concat(g.affixes)) a[x.id] = (a[x.id] || 0) + x.v; } // ชุดสวมใส่
    const set = this.activeSet(p); if (set) for (const k in set.bonus) a[k] = (a[k] || 0) + set.bonus[k]; // เซตครบ 3 ชิ้น
    // ===== Artifact bonuses =====
    const artBonus = { physDmgPct: 0, hpOnKill: 0, critRate: 0, spellBurn: 0, slowOnHit: 0, dmgReduction: 0, dodge: 0, spellFreeze: 0, chainHit: 0, reflect: 0, aspdBonus: 0, spellPierce: 0, lifesteal: 0, maxHpBonus: 0, moveSpeed: 0, inkRegen: 0, burnOnHit: 0, defBonus: 0, hpPct: 0, hpRegen: 0, magicDmg: 0, allStatInk: 0 };
    const arts = p.artifacts || {};
    for (const slot in arts) {
      const art = arts[slot]; if (!art) continue;
      // v2.3.1: ผลลัพธ์ขึ้นกับ (ธาตุ × ช่องที่สวม) ไม่ใช่ตัว def เอง — เลือกช่องอิสระตอนสวม
      const cell = PD_DATA.artifactCellValue(art.defId, slot, art.grade); if (!cell) continue;
      artBonus[cell.mechanic] = (artBonus[cell.mechanic] || 0) + cell.val;
    }
    const d = Object.assign({}, b);
    d.STR += a.str + artBonus.allStatInk;
    d.VIT += a.vit + artBonus.allStatInk;
    d.AGI += a.agi + artBonus.allStatInk;
    d.INT += a.int;
    d.DEX = a.dex;
    d.artBonus = artBonus; // เก็บไว้ให้ UI แสดง + game.ts ใช้ในสู้รบ
    d.maxHp = Math.round((c.hpBase + d.VIT * c.hpPerVit + a.hp + artBonus.maxHpBonus) * (1 + (a.hpPct + artBonus.hpPct) / 100));
    d.maxInk = Math.round(c.inkBase + d.INT * c.inkPerInt + a.ink + artBonus.allStatInk);
    d.inkRegen = c.inkRegen + d.INT * c.inkRegenPerInt + a.regen + artBonus.inkRegen;
    d.hpRegen = (c.hpRegen || 0) + d.VIT * (c.hpRegenPerVit || 0) + artBonus.hpRegen;
    d.def = (d.VIT * c.defPerVit + a.def + artBonus.defBonus) * (1 + a.defPct / 100);
    const K = PD_DATA.statCaps || {}; d.dmgReduce = Math.min(K.dmgReduce || 1, d.def / (d.def + c.defK + (c.defKPerLevel || 0) * (p.level - 1))) + (a.physReduce + artBonus.dmgReduction) / 100;
    d.mdef = d.INT * (c.mdefPerInt || 0) + (a.mdef || 0);
    d.dmgReduceMagic = Math.min(K.dmgReduce || 1, d.mdef / (d.mdef + c.defK + (c.defKPerLevel || 0) * (p.level - 1))) + (a.magicReduce + artBonus.dmgReduction) / 100;
    d.crit = Math.min(K.crit || 1, c.critBase + d.AGI * c.critPerAgi + a.crit / 100 + artBonus.critRate / 100);
    d.critMult = c.critMult + a.critDamage / 100;
    d.aspd = Math.min(K.aspd || 9, 1 + a.aspd / 100 + d.AGI * (c.aspdPerAgi || 0) + artBonus.aspdBonus / 100);
    d.move = Math.min(K.move || 9, 1 + a.move / 100 + d.AGI * c.movePerAgi + artBonus.moveSpeed / 100);
    d.atkPct = a.atkPct + artBonus.physDmgPct; d.skillPct = a.skillPct; d.leech = Math.min(K.leech || 1, a.leech / 100 + artBonus.lifesteal / 100);
    d.elem = { fire: 0, ice: 0, bolt: 0 }; // v2.0.7: ไม่มีดาเมจธาตุจากไอเท็มแล้ว (ไอเท็มเก่าที่มีออปชันธาตุไม่มีผล)
    d.dodge = Math.min(K.dodge || 0.5, (a.dodge + artBonus.dodge) / 100);
    d.set = set ? set.id : null;
    d.wspeed = base.speed * d.aspd; d.range = base.range; d.arc = base.arc; d.shape = base.shape;
    const characterPower = p.level + d.STR * c.physPowerPerStr + d.DEX + a.physFlat;
    const physicalMultiplier = 1 + d.atkPct / 100;
    d.physMin = (characterPower + w.min) * physicalMultiplier;
    d.physMax = (characterPower + w.max) * physicalMultiplier;
    d.physPower = (d.physMin + d.physMax) / 2;
    d.spellPower = (c.magicBase + d.INT * c.magicPerInt + (base.magic || 0) * (1 + (w.ilvl - 1) * 0.3)) * (1 + (a.skillPct + artBonus.magicDmg + Math.min(20, a.magicDmg)) / 100);
    d.magicPower = base.physical ? 0 : d.spellPower;
    d.spellDamage = a.spellDamage;
    const config = PD_DATA.config;
    d.attackDuration = Math.max(config.attackMinTime, Math.min(1.2, config.attackTime / d.wspeed));
    d.aps = 1 / d.attackDuration;
    d.staffHit = d.magicPower * config.staffAttackMultiplier;
    d.dps = (w.base === 'staff' ? d.staffHit : d.physPower * (1 + d.crit * (d.critMult - 1))) * d.aps;
    return d;
  }
};
