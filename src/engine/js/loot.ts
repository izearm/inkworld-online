// @ts-nocheck
// ===== loot: สุ่มอาวุธ + ออปชันแบบ Diablo =====
PD.Loot = {
  rarity(id) { return PD_DATA.rarities.find(r => r.id === id); },
  base(id) { return PD_DATA.weaponBases.find(b => b.id === id); },
  rollRarity(rng, lootMult, minRarity) {
    const R = PD_DATA.rarities, m = lootMult || 1;
    const minI = minRarity ? R.findIndex(r => r.id === minRarity) : 0;
    const ws = R.map((r, i) => i < minI ? 0 : r.weight * Math.pow(m, i * 0.8));
    let t = rng() * ws.reduce((s, v) => s + v, 0);
    for (let i = 0; i < R.length; i++) { t -= ws[i]; if (t <= 0) return R[i].id; }
    return R[R.length - 1].id;
  },
  // v2.0.3 งบออปชัน: ไอเท็มแต่ละชิ้นมีงบ = itemBudget.slot[ช่อง] × rarity.budget แบ่งให้ออปชันที่สุ่มได้ (น้ำหนัก 0.6–1.4) ÷ cost
  // → พลังรวมของไอเท็มความหายาก/ช่องเดียวกันเท่ากันเสมอ ต่างกันแค่การกระจายออปชัน · ออปชันที่แพงเกินส่วนแบ่งจะไม่ถูกสุ่ม (เช่น ดูดเลือด/ธาตุในของระดับต่ำ)
  affixCost(a, ilvl) { return a.flat ? a.cost / (1 + PD_DATA.itemBudget.growth * (ilvl - 1)) : a.cost; },
  budgetOf(rarityId, slot) { return (PD_DATA.itemBudget.slot[slot === 'acc2' ? 'acc' : slot] || 0) * this.rarity(rarityId).budget; },
  rollAffixes(rng, count, ilvl, rarityId, slot) {
    const budget = this.budgetOf(rarityId, slot); if (!count || budget <= 0) return [];
    const legacy = PD_DATA.affixes.filter(a => a.cost > 0);
    const common = legacy.filter(a => a.tier !== 'rare'), rare = legacy.filter(a => a.tier === 'rare');
    const share0 = budget / count, used = {}, picked = [];
    const pick = pool => {
      let av = pool.filter(a => !used[a.id] && this.affixCost(a, ilvl) <= share0 * 1.2);
      if (!av.length) av = legacy.filter(a => !used[a.id] && this.affixCost(a, ilvl) <= share0 * 1.2);
      if (!av.length) return null;
      const a = PD.U.pick(rng, av); used[a.id] = true; return a;
    };
    for (let i = 0; i < count; i++) { const a = pick(rng() < 0.25 && rare.length ? rare : common); if (a) picked.push(a); }
    const w = picked.map(() => 0.6 + 0.8 * rng()), wt = w.reduce((x, y) => x + y, 0) || 1;
    return picked.map((a, i) => ({ id: a.id, v: Math.max(1, Math.round(budget * w[i] / wt / this.affixCost(a, ilvl))) }));
  },
  rollTierAffixes(rng, ilvl, rarity, poolId) {
    if (rarity === 'normal') return [];
    const [regularMain, regularSecondary, extraChance, extraMain] = {
      magic: [1, 0, 0.4, false],
      rare: [2, 1, 0.5, false],
      legend: [2, 2, 0.4, true],
      mythic: [3, 2, 0.4, false]
    }[rarity];
    const extra = rng() < extraChance;
    const mains = regularMain + Number(extra && extraMain);
    const secondaries = regularSecondary + Number(extra && !extraMain);
    const tier = Math.min(10, Math.max(1, Math.ceil(ilvl / 10)));
    let available = Object.entries(PD_DATA.affixPools[poolId]);
    const result = [];
    for (const kind of ['main', 'secondary']) {
      const count = kind === 'main' ? mains : secondaries;
      const affixTier = kind === 'main' ? tier : Math.max(1, tier - 1);
      for (let i = 0; i < count; i++) {
        const eligible = available.filter(([, def]) => def.weight > 0 && (kind !== 'main' || !def.secondaryOnly));
        let roll = rng() * eligible.reduce((sum, [, def]) => sum + def.weight, 0);
        const picked = eligible.find(([, def]) => (roll -= def.weight) < 0) || eligible.at(-1);
        if (!picked) throw new Error('Affix pool too small: ' + poolId);
        const [id, def] = picked;
        const [min, max] = def.ranges[affixTier - 1];
        result.push({ id, v: min + Math.floor(rng() * (max - min + 1)), kind, tier: affixTier });
        available = available.filter(([key]) => key !== id);
      }
    }
    return result;
  },
  displayAffixes(item) {
    return item.affixes.slice().sort((a, b) => Number(a.kind === 'main') - Number(b.kind === 'main'));
  },
  make(baseId, rarityId, ilvl, rng, fixedName) {
    rng = rng || Math.random;
    const b = this.base(baseId), r = this.rarity(rarityId);
    const scale = 1 + PD_DATA.weaponScalePerLevel * (ilvl - 1);
    const affixes = this.rollTierAffixes(rng, ilvl, rarityId, baseId === 'staff' ? 'staff' : 'weapon');
    const w = { uid: PD.U.uid(), base: baseId, rarity: rarityId, ilvl,
      min: Math.max(1, Math.round(b.min * scale * r.dmgMult)), max: Math.max(2, Math.round(b.max * scale * r.dmgMult)), affixes };
    if (w.max <= w.min) w.max = w.min + 1;
    if (fixedName) w.name = fixedName;
    else if (rarityId === 'legend') w.name = PD.U.pick(rng, PD_DATA.legendaryNames);
    else if (rarityId === 'mythic') w.name = PD.U.pick(rng, PD_DATA.mythicNames || PD_DATA.legendaryNames);
    else {
      const word = id => { const d = PD_DATA.affixes.find(a => a.id === id); return d ? d.word : ''; };
      if (rarityId === 'normal') w.name = b.name;
      else if (rarityId === 'magic') w.name = b.name + (affixes[0] ? word(affixes[0].id) : '');
      else w.name = b.name + (affixes[0] ? word(affixes[0].id) : '') + (affixes[1] ? ' แห่ง' + word(affixes[1].id) : '');
    }
    return w;
  },
  roll(ilvl, lootMult, minRarity, forcedBase) {
    const rng = Math.random;
    const b = forcedBase || PD.U.pick(rng, PD_DATA.weaponBases).id;
    return this.make(b, this.rollRarity(rng, lootMult, minRarity), Math.max(1, ilvl), rng);
  },
  gearBase(id) { return PD_DATA.gearBases.find(b => b.id === id); },
  makeGear(baseId, rarityId, ilvl, rng) {
    rng = rng || Math.random;
    const b = this.gearBase(baseId), r = this.rarity(rarityId), sc = 1 + PD_DATA.gearScalePerLevel * (ilvl - 1);
    const affixes = b.slot === 'acc'
      ? this.rollAffixes(rng, PD.U.randInt(rng, r.affixes[0], r.affixes[1]), ilvl, rarityId, b.slot)
      : this.rollTierAffixes(rng, ilvl, rarityId, b.slot);
    const PCT = { crit: 1, atkPct: 1, aspd: 1, skillPct: 1, move: 1 }; // ค่า % ของเกราะคงที่ (ไม่โตตามเลเวล/ความหายาก) — พลังมาจากงบออปชันเท่านั้น
    const stats = Object.keys(b.stats).map(id => ({ id, v: PCT[id] ? b.stats[id] : Math.max(1, Math.round(b.stats[id] * sc * r.dmgMult)) }));
    const word = id => { const d = PD_DATA.affixes.find(a => a.id === id); return d ? d.word : ''; };
    const name = rarityId === 'normal' ? b.name : rarityId === 'magic' ? b.name + (affixes[0] ? word(affixes[0].id) : '') : b.name + (affixes[0] ? word(affixes[0].id) : '') + (affixes[1] ? ' แห่ง' + word(affixes[1].id) : '');
    return { uid: PD.U.uid(), kind: 'gear', slot: b.slot, base: baseId, rarity: rarityId, ilvl, stats, affixes, name };
  },
  rollGear(ilvl, lootMult, minRarity, rng) {
    rng = rng || Math.random;
    return this.makeGear(PD.U.pick(rng, PD_DATA.gearBases).id, this.rollRarity(rng, lootMult, minRarity), Math.max(1, ilvl), rng);
  },
  starter() { const s = PD_DATA.starterWeapon; return this.make(s.base, s.rarity, s.ilvl, () => 0.5, s.name); },
  affixImg(a) { const d = PD_DATA.affixes.find(x => x.id === a.id); return d && d.img ? PD.U.img(d.img) : null; },
  affixText(a) { const d = PD_DATA.affixes.find(x => x.id === a.id); return d ? d.text.replace('{v}', a.v) : a.id + ':' + a.v; },
  describe(w) {
    if (w.kind === 'gear') { const g = this.gearBase(w.base), r = this.rarity(w.rarity);
      return { name: w.name, color: r.color, rarity: r.name, type: PD_DATA.gearSlots[w.slot] + ' · ' + g.name, ilvl: w.ilvl, gear: true,
        base: w.stats.map(a => this.affixText(a)), lines: this.displayAffixes(w).map(a => this.affixText(a)), imgs: this.displayAffixes(w).map(a => this.affixImg(a)), kinds: this.displayAffixes(w).map(a => a.kind) }; }
    const b = this.base(w.base), r = this.rarity(w.rarity);
    return { name: w.name, color: r.color, rarity: r.name, type: b.name, ilvl: w.ilvl,
      dmg: w.min + '–' + w.max, speed: b.speed, range: b.range,
      lines: this.displayAffixes(w).map(a => this.affixText(a)), imgs: this.displayAffixes(w).map(a => this.affixImg(a)), kinds: this.displayAffixes(w).map(a => a.kind) };
  }
};
