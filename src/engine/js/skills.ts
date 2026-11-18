// @ts-nocheck
// ===== skills: เรียน/อัพ/ใส่ช่อง และการทำงานของสกิล =====
PD.Skills = (function () {
  const K = {}, U = PD.U;
  const G = () => PD.Game;
  // สกิลอาวุธ (wsk_*) อยู่ใน PD_DATA.weaponSkillDefs · ประกอบเป็น def เดียวกับสกิลปกติ (kind = ชื่อหลัง wsk_, เลเวลคงที่ 1)
  const wdefCache = {};
  K.def = id => {
    const base = PD_DATA.skills.find(s => s.id === id); if (base) return base;
    const w = (PD_DATA.weaponSkillDefs || {})[id]; if (!w) return undefined;
    return wdefCache[id] || (wdefCache[id] = Object.assign({ id, cat: id === 'wsk_area_magic' ? 'magic' : 'main', kind: id.replace(/^wsk_/, ''), maxLv: 1, power: [1], reqLevel: 1, weapon: true }, w));
  };
  K.bossDef = id => PD_DATA.bossSkillDefs?.[id];
  const bossEffects = {
    summon(g, caster, roster) {
      const monsters = Object.entries(roster).flatMap(([id, count]) => Array(Math.max(0, Math.floor(count))).fill(id));
      const positions = [];
      const enemies = g.liveEnemies();
      const level = g.map.uniformEnemyLevel ? caster.lvl : Math.max(1, caster.lvl - 1);
      for (const id of monsters) {
        const def = PD_DATA.enemies[id];
        if (!def || def.boss) return false;
        const radius = 0.3 * (def.size || 1);
        let position;
        for (let ring = 1.35; ring <= 4.85 && !position; ring += 0.7) {
          for (let i = 0; i < 16 && !position; i++) {
            const angle = i * Math.PI / 8 + ring;
            const x = caster.x + Math.cos(angle) * ring, y = caster.y + Math.sin(angle) * ring;
            if (g.collides(x, y, radius) || U.dist(x, y, g.player.x, g.player.y) < radius + 0.35 ||
                enemies.some(e => U.dist(x, y, e.x, e.y) < radius + e.radius + 0.15) ||
                positions.some(p => U.dist(x, y, p.x, p.y) < radius + p.radius + 0.15)) continue;
            const steps = Math.ceil(ring / 0.25);
            let clear = true;
            for (let step = 1; step < steps && clear; step++) {
              const t = step / steps;
              clear = !g.solidAt(Math.floor(U.lerp(caster.x, x, t)), Math.floor(U.lerp(caster.y, y, t)));
            }
            if (clear) position = { id, x, y, radius };
          }
        }
        if (!position) return false;
        positions.push(position);
      }
      for (const { id, x, y } of positions) {
        const mob = g.spawnEnemy(id, x, y, level);
        mob.summonedBy = caster;
        mob.state = 'chase';
        g.sparks(x, y, '#9b4ad6', 8);
      }
      return positions.length > 0;
    }
  };
  K.applyBossEffect = (g, skill, caster, args) => bossEffects[skill.effectId]?.(g, caster, args) || false;
  K.level = id => (PD_DATA.weaponSkillDefs || {})[id] ? 1 : (G().S.player.skills[id] || 0);
  K.requiredLevel = (id, lv = K.level(id)) => K.def(id).reqLevel + lv * 2;
  K.canLearn = function (id, lv = K.level(id), points = G().S.player.skillPoints) {
    const d = K.def(id), p = G().S.player;
    if (!d || !PD_DATA.skillCats[d.cat] || lv >= d.maxLv) return 'เต็มแล้ว';
    const required = K.requiredLevel(id, lv);
    if (p.level < required) return 'ต้องเลเวล ' + required;
    if (points <= 0) return 'ไม่มีแต้มสกิล';
    return '';
  };
  K.learn = function (id) {
    if (K.canLearn(id)) return false;
    const p = G().S.player, d = K.def(id);
    p.skillPoints--; p.skills[id] = K.level(id) + 1;
    const slot = PD_DATA.skillCats[d.cat].slot;
    if (!p.slots[slot]) p.slots[slot] = id;
    return true;
  };
  K.equip = function (id, slot) {
    if (!K.level(id) && !K.isWeaponSkill(id)) return false;
    if (PD_DATA.config.dungeonLock && G().inDungeon && G().inDungeon()) { G().toast('ไม่สามารถเปลี่ยนสกิลในดันเจี้ยน'); return false; }
    if (slot == null) { const d = K.def(id); slot = d && PD_DATA.skillCats[d.cat] ? PD_DATA.skillCats[d.cat].slot : 0; }
    const P = G().S.player, dd = K.def(id);
    if (dd && dd.cat === 'ult') for (let i = 0; i < P.slots.length; i++) { const o = P.slots[i] && K.def(P.slots[i]); if (i !== slot && o && o.cat === 'ult') P.slots[i] = null; } // ท่าไม้ตายใส่ได้แค่ 1 อย่าง
    P.slots[slot] = id; return true;
  };
  K.isWeaponSkill = function (id) { return K.weaponSkills ? K.weaponSkills().includes(id) : false; };
  // ถอด/เปลี่ยนอาวุธ → สกิลอาวุธที่อาวุธใหม่ไม่มีถูกถอดออกจากช่องด้วย
  K.sanitizeSlots = function () {
    const p = G().S && G().S.player; if (!p || !p.slots) return;
    const ok = K.weaponSkills();
    for (let i = 0; i < p.slots.length; i++) if (/^wsk_/.test(p.slots[i] || '') && ok.indexOf(p.slots[i]) < 0) p.slots[i] = null;
  };
  K.cdLeft = id => (G().player.cd[id] || 0);

  K.use = function (slot, tgt) {
    const g = G(), p = g.S.player, id = p.slots[slot];
    if (!id || g.state !== 'play') return false;
    const d = K.def(id), lv = K.level(id), pl = g.player;
    if (!d || !lv || (d.weapon && !K.hasWeaponSkill(id)) || K.cdLeft(id) > 0 || pl.dashT > 0 || pl.castT > 0 || pl.stunT > 0) return false;
    if (d.kind === 'freeze' && pl.freezeCast) return false;
    if (pl.ink < d.ink) { g.hint('noink'); g.floater(pl.x, pl.y, 'INK', '#2f6fd6'); return false; }
    // สกิลเล็งพื้น (อสุนีหมึก): กดปุ่มครั้งแรก = เข้าโหมดแตะเลือกเป้าหมาย · แตะพื้น = ร่ายจริง · กดปุ่มซ้ำ = ยกเลิก
    if (d.targetGround && !(tgt && tgt.cx !== undefined)) {
      if (g.targeting && g.targeting.slot === slot) { g.targeting = null; g.toast('ยกเลิกการเล็ง', '#777'); return false; }
      g.targeting = { slot, range: d.range || 6 }; g.toast('แตะบนพื้นเพื่อเลือกเป้าหมาย (กดปุ่มสกิลซ้ำ = ยกเลิก)', '#8a3fd1'); return false;
    }
    g.targeting = null;
    pl.ink -= d.ink; pl.cd[id] = d.cd;
    const pw = (d.power || [1])[lv - 1], D = g.derived;
    let aim = g.pickAim(Math.max(d.range || 0, 5));
    if (tgt && tgt.cx !== undefined) { const n = PD.U.norm(tgt.cx - pl.x, tgt.cy - pl.y); aim = { x: n.x, y: n.y, cx: tgt.cx, cy: tgt.cy }; }
    pl.atk = null;
    const magic = d.damageType === 'weapon' ? g.isStaff() : (d.damageType ?? d.cat) === 'magic';
    const magicBase = d.kind === 'storm' ? D.spellPower : D.magicPower;
    const dmg = (magic ? magicBase * (1 + (D.spellDamage || 0) / 100) : D.physPower) * pw;
    // เวลาร่าย: skill.castTime (วินาที) ถ้าไม่ตั้ง → ท่าไม้ตายใช้ config.ultCastTime, หมวดอื่น 0 · still = ยืนนิ่งระหว่างร่าย
    const ct = d.castTime !== undefined ? (Array.isArray(d.castTime) ? d.castTime[lv - 1] : d.castTime) : d.cat === 'ult' ? (PD_DATA.config.ultCastTime || 0) : 0;
    if (ct > 0 && d.kind === 'freeze') {
      const cast = { start: g.time, duration: ct };
      pl.freezeCast = cast;
      g.floater(pl.x, pl.y, 'ร่าย ' + d.name, '#3a8de0');
      g.later(ct, () => {
        if (g.player !== pl || pl.freezeCast !== cast) return;
        pl.freezeCast = null;
        H.freeze(g, d, pl, aim, dmg, pw);
      });
    } else if (ct > 0) {
      if (d.kind === 'storm') aim = { x: aim.x, y: aim.y, cx: pl.x + aim.x * d.cast, cy: pl.y + aim.y * d.cast };
      g.setAim(aim); const cid = (pl.castId = (pl.castId || 0) + 1);
      pl.castT = pl.castDur = ct; pl.castStill = !!d.still; pl.castFx = d.chargeFx || null;
      g.effects.push({ type: 'ring', x: pl.x, y: pl.y, r0: 1.4, r1: 0.3, t: 0, dur: ct, col: d.chargeFx ? '#e0412b' : '#8a3fd1' });
      if (aim.cx !== undefined) g.effects.push({ type: 'ring', x: aim.cx, y: aim.cy, r0: d.area || 2.5, r1: d.area || 2.5, t: 0, dur: ct + 0.3, col: '#d23a2a' });
      g.floater(pl.x, pl.y, (d.still ? 'ชาร์จ ' : 'ร่าย ') + d.name, d.chargeFx ? '#e0412b' : '#8a3fd1');
      g.later(ct, () => { if (g.state === 'play' && g.player === pl && pl.castId === cid) { pl.castT = 0; H[d.kind](g, d, pl, aim, dmg, pw, magic); } });
    } else H[d.kind](g, d, pl, aim, dmg, pw, magic);
    g.stats.skillsUsed = (g.stats.skillsUsed || 0) + 1;
    return true;
  };

  const H = {
    wave(g, d, pl, aim, dmg) {
      g.projectiles.push({ owner: 'player', x: pl.x + aim.x * 0.4, y: pl.y + aim.y * 0.4, vx: aim.x * d.speed, vy: aim.y * d.speed, r: 0.5, dmg, life: d.range / d.speed, style: 'wave', pierce: true, hitSet: new Set(), col: '#1b1b1b' });
    },
    whirl(g, d, pl, aim, dmg) {
      g.effects.push({ type: 'ring', x: pl.x, y: pl.y, r0: 0.4, r1: d.radius, t: 0, dur: 0.3 });
      g.effects.push({ type: 'ring', x: pl.x, y: pl.y, r0: d.radius * 0.6, r1: d.radius * 1.1, t: 0, dur: 0.4 });
      for (const e of g.liveEnemies()) if (U.dist(e.x, e.y, pl.x, pl.y) <= d.radius + e.radius) g.damageEnemy(e, g.rollSkill(dmg), { src: 'skill' });
    },
    dash(g, d, pl, aim, dmg) {
      pl.dashT = 0.2; pl.dashV = { x: aim.x * d.dist / 0.2, y: aim.y * d.dist / 0.2 }; pl.dashHit = new Set(); pl.dashDmg = dmg;
      pl.invuln = Math.max(pl.invuln, 0.3);
    },
    // ฟันชาร์จ: ดาเมจสกิลกายภาพในวงฟันของอาวุธ + ไฟแตกที่เป้า
    charge(g, d, pl, aim, dmg) {
      const D = g.derived, sa = U.worldDirToScreen(aim.x, aim.y), rng = D.range + (d.rangeAdd || 0.4), arc = Math.max(D.arc, d.arc || 0);
      pl.swingDir = -pl.swingDir; pl.atk = { t: 0, dur: 0.22, hit: true };
      g.effects.push({ type: 'slash', x: pl.x, y: pl.y, ang: Math.atan2(sa.y, sa.x), arc: arc * Math.PI / 180, r: rng * 20, dir: pl.swingDir, t: 0, dur: 0.35 });
      const cosA = Math.cos(arc * Math.PI / 360);
      for (const e of g.liveEnemies()) {
        const dx = e.x - pl.x, dy = e.y - pl.y, dd = Math.hypot(dx, dy);
        if (dd > rng + e.radius || (dd > 0.5 && (dx * aim.x + dy * aim.y) / dd < cosA)) continue;
        const r = g.rollSkill(dmg); r.elem = d.elem;
        g.damageEnemy(e, r, { src: 'skill', burnChance: d.burnChance?.[K.level(d.id) - 1] });
        g.sparks(e.x, e.y, '#e0412b', 12); g.sparks(e.x, e.y, '#e8b923', 9); // ไฟแตก
        g.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.2, r1: 1.1, t: 0, dur: 0.3, col: '#e0412b' });
      }
      g.shake = 0.15;
    },
    fireball(g, d, pl, aim, dmg) {
      g.projectiles.push({ owner: 'player', x: pl.x + aim.x * 0.4, y: pl.y + aim.y * 0.4, vx: aim.x * d.speed, vy: aim.y * d.speed, r: 0.35, dmg, life: d.range / d.speed, style: 'fire', magic: true, explode: d.radius, elem: 'fire', col: '#e0412b' });
    },
    iceline(g, d, pl, aim, dmg) {
      const hit = new Set(), ox = pl.x, oy = pl.y;
      for (let k = 1; k <= d.range; k++) {
        g.later(k * 0.06, () => {
          const x = ox + aim.x * k * 0.9, y = oy + aim.y * k * 0.9;
          if (g.solidAt(Math.floor(x), Math.floor(y))) return;
          g.effects.push({ type: 'spike', x, y, t: 0, dur: 0.6, col: '#3a8de0' });
          g.sparks(x, y, '#3a8de0', 4);
          for (const e of g.liveEnemies()) if (!hit.has(e) && U.dist(e.x, e.y, x, y) < 0.75 + e.radius) { hit.add(e); g.damageEnemy(e, g.rollSkill(dmg, true), { elem: 'ice', src: 'skill' }); e.slowT = d.slowDur; e.slowMul = d.slow; }
        });
      }
    },
    heal(g, d, pl, aim, dmg, pw) {
      const amt = Math.round(g.derived.maxHp * pw); pl.hp = Math.min(g.derived.maxHp, pl.hp + amt);
      g.floater(pl.x, pl.y, '+' + amt, '#3c9a5c'); g.effects.push({ type: 'heal', x: pl.x, y: pl.y, t: 0, dur: 0.8, col: '#3c9a5c' });
      g.sparks(pl.x, pl.y, '#3c9a5c', 10);
    },
    storm(g, d, pl, aim, dmg, _pw, magic) {
      const lv = K.level(d.id), n = d.strikes[lv - 1], gap = (d.dur ? d.dur[lv - 1] : n * 0.16) / n; // ช่วงห่างระหว่างหยด = ระยะเวลาทำดาเมจ ÷ จำนวนหยด
      const snapX = pl.x, snapY = pl.y; // ใช้ตำแหน่งผู้เล่นขณะร่าย
      for (let k = 0; k < n; k++) {
        g.later(0.15 + k * gap, () => {
          const cx = aim.cx !== undefined ? aim.cx : snapX + aim.x * d.cast, cy = aim.cy !== undefined ? aim.cy : snapY + aim.y * d.cast;
          const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * d.area, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          g.effects.push({ type: 'drop', x, y, col: d.dropColor, t: 0, dur: 0.6 });
          g.later(0.18, () => {
            g.sparks(x, y, '#1b1b1b', 8);
            for (const e of g.liveEnemies()) if (U.dist(e.x, e.y, x, y) < 1.0 + e.radius) g.damageEnemy(e, g.rollSkill(dmg, magic), { src: 'skill' });
          });
        });
      }
    },
    brush(g, d, pl, aim, dmg, _pw, magic) {
      const sa = U.worldDirToScreen(aim.x, aim.y);
      g.effects.push({ type: 'slash', x: pl.x, y: pl.y, ang: Math.atan2(sa.y, sa.x), arc: d.arc * Math.PI / 180, r: d.radius * 20, dir: 1, t: 0, dur: 0.45 });
      g.effects.push({ type: 'slash', x: pl.x, y: pl.y, ang: Math.atan2(sa.y, sa.x), arc: d.arc * Math.PI / 180, r: d.radius * 14, dir: 1, t: 0, dur: 0.5 });
      const cosA = Math.cos(d.arc * Math.PI / 360);
      for (const e of g.liveEnemies()) {
        const dx = e.x - pl.x, dy = e.y - pl.y, dd = Math.hypot(dx, dy);
        if (dd <= d.radius + e.radius && (dd < 0.6 || (dx * aim.x + dy * aim.y) / dd >= cosA)) g.damageEnemy(e, g.rollSkill(dmg, magic), { src: 'skill' });
      }
      g.shake = 0.2;
    },
    freeze(g, d, pl, aim, dmg, pw) {
      g.effects.push({ type: 'ring', x: pl.x, y: pl.y, r0: 0.5, r1: d.radius, t: 0, dur: 0.5, col: '#3a8de0' });
      for (const e of g.liveEnemies()) if (U.dist(e.x, e.y, pl.x, pl.y) <= d.radius) { e.frozenT = pw; e.vuln = d.vuln; }
      g.effects.push({ type: 'freezeArea', x: pl.x, y: pl.y, radius: d.radius, t: 0, dur: pw });
      g.zones.length = 0; g.lines.length = 0;
    },
    // === สกิลอาวุธ (ค่าจาก PD_DATA.weaponSkillDefs) ===
    // ถอยหลัง: ถอยออกจากศัตรูที่ใกล้สุด (ไม่มีศัตรู = ถอยทวนทิศที่หันอยู่) · ทิ้งเงาตัวเองไล่ความเข้มจากจุดเริ่ม → ตำแหน่งปัจจุบัน (เข้มสุด)
    back_dash(g, d, pl) {
      let dir = { x: -pl.lastDir.x, y: -pl.lastDir.y }, bd = 6;
      for (const e of g.liveEnemies()) { const k = U.dist(e.x, e.y, pl.x, pl.y); if (k < bd) { bd = k; dir = U.norm(pl.x - e.x, pl.y - e.y); } }
      const T = 0.2; pl.dashT = pl.dashDur = T; pl.dashV = { x: dir.x * d.dist / T, y: dir.y * d.dist / T }; pl.dashHit = new Set(); pl.dashDmg = 0; pl.dashFx = 'ghost';
      pl.invuln = Math.max(pl.invuln, T + 0.05);
      const s = U.worldDirToScreen(-dir.x, -dir.y); if (Math.abs(s.x) > 0.05) pl.facing = s.x > 0 ? 1 : -1; // ยังหันหน้าเข้าหาศัตรูระหว่างถอย
    },
    // พุ่งไปข้างหน้า: เส้นขีดแนวตั้ง (เท้า → หัว) ไล่ตามทางพุ่ง ให้ความรู้สึกวาร์ป (ไม่ทำดาเมจ)
    fwd_dash(g, d, pl, aim) {
      const T = 0.16; pl.dashT = pl.dashDur = T; pl.dashV = { x: aim.x * d.dist / T, y: aim.y * d.dist / T }; pl.dashHit = new Set(); pl.dashDmg = 0; pl.dashFx = 'warp';
      pl.invuln = Math.max(pl.invuln, T + 0.05); g.setAim(aim);
      for (let k = 0; k < 5; k++) g.effects.push({ type: 'streak', x: pl.x, y: pl.y, ox: (k - 2) * 3.5, h: 26, t: 0, dur: 0.35 });
    },
    // โล่: กันได้ทุกอย่าง (ดาเมจ กระสุน พื้นระเบิด มึน) ตามเวลา d.dur
    block(g, d, pl) {
      pl.shieldT = pl.shieldDur = d.dur;
      g.effects.push({ type: 'ring', x: pl.x, y: pl.y, r0: 0.4, r1: 1.1, t: 0, dur: 0.3, col: '#8a7b60' });
      g.floater(pl.x, pl.y, 'โล่!', '#8a7b60');
    },
    // ผลัก: กรวยกว้างด้านหน้า ไม่ทำดาเมจ · ผู้เล่นอมตะ d.invuln วินาที · บอสแค่ถอยนิดหน่อย ไม่ล้ม
    push(g, d, pl, aim) {
      g.setAim(aim); pl.immortalT = Math.max(pl.immortalT || 0, d.invuln);
      const R = d.range + 0.6, cosA = Math.cos((d.arc / 2) * Math.PI / 180), sa = U.worldDirToScreen(aim.x, aim.y), ang = Math.atan2(sa.y, sa.x);
      for (let k = 0; k < 3; k++) g.later(k * 0.07, () => g.effects.push({ type: 'slash', x: pl.x, y: pl.y, ang, arc: d.arc * Math.PI / 180, r: 12 + k * 9, dir: 1, t: 0, dur: 0.3 }));
      g.effects.push({ type: 'ring', x: pl.x, y: pl.y, r0: 0.3, r1: R, t: 0, dur: 0.35, col: '#556b2f' });
      for (const e of g.liveEnemies()) {
        const dx = e.x - pl.x, dy = e.y - pl.y, dd = Math.hypot(dx, dy);
        if (dd > R + e.radius || (dd > 0.4 && (dx * aim.x + dy * aim.y) / dd < cosA)) continue;
        const n = dd < 0.05 ? aim : U.norm(dx, dy), boss = !!e.def.boss;
        g.moveEnt(e, n.x * (boss ? 1.5 : 3), n.y * (boss ? 1.5 : 3), e.radius);
        if (!boss) { e.state = 'cd'; e.t = 1.0; }
        g.sparks(e.x, e.y, '#556b2f', 5);
      }
      g.floater(pl.x, pl.y, 'ผลัก!', '#556b2f'); g.shake = 0.12;
    },
    area_magic(g, d, pl, aim, dmg) {
      // tap target on map — aim has cx,cy from castTime flow
      const cx = aim.cx !== undefined ? aim.cx : pl.x + aim.x * 4;
      const cy = aim.cy !== undefined ? aim.cy : pl.y + aim.y * 4;
      // ลำแสงหมุนวนรอบจุดที่แตะ ต่อเนื่อง 5 วินาที (ยิงทุก 0.25 วิ รวม 20 ครั้ง · ดาเมจต่อครั้ง = 35% ของค่าเดิม)
      const DUR = d.dur || 5, STEP = 0.25, n = Math.round(DUR / STEP);
      g.effects.push({ type: 'ring', x: cx, y: cy, r0: d.area || 2.5, r1: d.area || 2.5, t: 0, dur: DUR, col: '#8a3fd1' });
      for (let k = 0; k < n; k++) {
        g.later(0.1 + k * STEP, () => {
          if (g.state === 'dead') return;
          const a = k * 2.4 + Math.random() * 0.5, r = Math.sqrt(Math.random()) * (d.area || 2.5);
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          g.effects.push({ type: 'drop', x, y, col: d.dropColor, t: 0, dur: 0.5 });
          g.sparks(x, y, '#8a3fd1', 4); g.sparks(x, y, '#e8b923', 2);
          g.later(0.15, () => { for (const e of g.liveEnemies()) if (U.dist(e.x, e.y, x, y) < 1.2 + e.radius) g.damageEnemy(e, g.rollSkill(dmg * 0.35, true), { src: 'skill' }); });
        });
      }
      g.shake = 0.2;
    }
  };

  // Weapon skill access check
  K.weaponSkills = function () {
    const g = G(), w = g.S.player.weapon; if (!w) return [];
    return (PD_DATA.weaponSkills || {})[w.base] || [];
  };
  K.hasWeaponSkill = function (id) { return K.weaponSkills().indexOf(id) >= 0; };

  return K;
})();

