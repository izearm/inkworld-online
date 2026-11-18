// @ts-nocheck
PD.Status = {
  tickPlayer(G, pl, D, dt) {
    pl.invuln = Math.max(0, pl.invuln - dt); pl.hurtT = Math.max(0, pl.hurtT - dt);
    pl.shieldT = Math.max(0, (pl.shieldT || 0) - dt); pl.immortalT = Math.max(0, (pl.immortalT || 0) - dt); pl.shieldFxT = Math.max(0, (pl.shieldFxT || 0) - dt);
    for (const k in pl.cd) pl.cd[k] = Math.max(0, pl.cd[k] - dt);
    for (const kind in pl.itemCooldowns) pl.itemCooldowns[kind] = Math.max(0, pl.itemCooldowns[kind] - dt);
    pl.ink = Math.min(D.maxInk, pl.ink + D.inkRegen * dt);
    if (pl.hp > 0 && pl.hp < D.maxHp && D.hpRegen > 0) pl.hp = Math.min(D.maxHp, pl.hp + D.hpRegen * dt);
    if (pl.poisonT > 0) { // พิษ: ลด HP ทุก 1 วิ (ไม่ทำให้ตาย เหลือ 1)
      pl.poisonT -= dt; pl.poisonTick -= dt;
      if (Math.random() < 0.3) G.particles.push({ x: pl.x + (Math.random() - 0.5) * 0.5, y: pl.y, z: 6 + Math.random() * 14, vx: 0, vy: 0, vz: 8, nog: 1, life: 0.5, max: 0.5, col: '#3c9a5c', sz: 1 });
      if (pl.poisonTick <= 0) { pl.poisonTick = 1; const k = Math.min(pl.poisonDps, Math.max(0, Math.ceil(pl.hp) - 1)); if (k > 0) { pl.hp -= k; G.floater(pl.x, pl.y, '-' + k, '#3c9a5c', 0, 0.8); } }
    }
    if (pl.stunT > 0) { pl.stunT -= dt; if (Math.random() < 0.35) { const a = G.time * 6 + Math.random(); G.particles.push({ x: pl.x + Math.cos(a) * 0.3, y: pl.y + Math.sin(a) * 0.3, z: 26, vx: 0, vy: 0, vz: 0, nog: 1, life: 0.25, max: 0.25, col: '#e8b923', sz: 1 }); } }
  },
  tickEnemy(G, e, dt) {
    const CFG = () => PD_DATA.config;
    if (e.burnT > 0) { // ไฟเผา: ลด HP ต่อเนื่อง + ไฟลุกบนพื้นเป็นจุดพิกเซล
      e.burnT -= dt; e.burnTick -= dt;
      if (Math.random() < 0.6) G.particles.push({ x: e.x + (Math.random() - 0.5) * 0.7, y: e.y + (Math.random() - 0.5) * 0.5, z: Math.random() * 3, vx: 0, vy: 0, vz: 16 + Math.random() * 18, nog: 1, life: 0.35 + Math.random() * 0.2, max: 0.5, col: Math.random() < 0.5 ? '#e0412b' : '#e8b923', sz: 1 });
      if (e.burnTick <= 0) { e.burnTick = CFG().burn.tick; G.damageEnemy(e, { dmg: e.burnDmg, crit: false, magic: e.burnMagic }, { dot: true }); if (e.dead) return true; }
    }
    if (e.slowT > 0 && e.slowMul < 1 && Math.random() < 0.3) G.particles.push({ x: e.x + (Math.random() - 0.5) * 0.8, y: e.y + (Math.random() - 0.5) * 0.5, z: 4 + Math.random() * 14, vx: 0, vy: 0, vz: -6, nog: 1, life: 0.5, max: 0.5, col: Math.random() < 0.5 ? '#7fc4f0' : '#ffffff', sz: 1 }); // น้ำแข็ง: เกล็ดฟ้า
    return false;
  }
};
