// @ts-nocheck
// Install combat actions on the shared game runtime.
PD.Combat = { install(G) {
  const U = PD.U, CFG = () => PD_DATA.config;
  G.rollPhys = function () {
    const D = G.derived; let dmg = D.physMin + Math.random() * (D.physMax - D.physMin);
    const elem = null; // v2.0.7: ดาเมจกายภาพล้วน
    const crit = Math.random() < D.crit; if (crit) dmg *= D.critMult;
    return { dmg, crit, elem };
  };
  G.rollSkill = function (base, magic = false) { if (!magic) return { dmg: base, crit: false }; return { dmg: base * (0.9 + Math.random() * 0.2), crit: false, magic: true }; };
  G.pickAim = function (range) {
    const pl = G.player, inp = PD.Input.move;
    if (inp.active) { const w = U.screenDirToWorld(inp.x, inp.y); if (w.x || w.y) return w; }
    let best = null, bd = range || CFG().autoAimRange;
    for (const e of G.liveEnemies()) { const d = U.dist(e.x, e.y, pl.x, pl.y); if (d < bd) { bd = d; best = e; } }
    if (best) return U.norm(best.x - pl.x, best.y - pl.y);
    return pl.lastDir;
  };
  G.setAim = function (aim) {
    const pl = G.player; pl.aim = aim; const s = U.worldDirToScreen(aim.x, aim.y);
    pl.aimAng = Math.atan2(s.y, s.x); if (Math.abs(s.x) > 0.05) pl.facing = s.x > 0 ? 1 : -1;
  };
  // คทา = โจมตีระยะไกล (ยิงลูกเวทตามทิศเล็ง) · ชาร์จที่ปลายคทาก่อนยิงนิดหน่อย
  const STAFF = { range: 7, speed: 11, hitAt: 0.6 };
  G.isStaff = function () { const w = G.S.player.weapon; return !!w && w.base === 'staff'; };
  G.startAttack = function () {
    const pl = G.player, D = G.derived;
    if (pl.atk || pl.dashT > 0) return false;
    const staff = G.isStaff(), aim = G.pickAim(staff ? STAFF.range : undefined); G.setAim(aim); pl.lastDir = aim;
    pl.swingDir = -pl.swingDir;
    pl.atk = { t: 0, dur: D.attackDuration, hit: false };
    if (staff) { G.effects.push({ type: 'charge', x: pl.x, y: pl.y, ax: aim.x, ay: aim.y, t: 0, dur: pl.atk.dur * STAFF.hitAt }); return true; } // คทา: ไม่ฟัน → ชาร์จที่ปลายคทาแล้วยิงเวท
    G.effects.push({ type: 'slash', x: pl.x, y: pl.y, ang: pl.aimAng, arc: D.arc * Math.PI / 180, r: 10 + D.range * 7, dir: pl.swingDir, t: 0, dur: Math.max(0.16, pl.atk.dur * 0.8) });
    return true;
  };
  G.resolveAttack = function () {
    const pl = G.player, D = G.derived, cosA = Math.cos(D.arc * Math.PI / 360);
    if (G.isStaff()) { // ยิงลูกเวท (ดาเมจ/ธาตุ/คริ จากค่าอาวุธตามปกติ)
      G.projectiles.push({ owner: 'player', staffBolt: true, x: pl.x + pl.aim.x * 0.6, y: pl.y + pl.aim.y * 0.6, vx: pl.aim.x * STAFF.speed, vy: pl.aim.y * STAFF.speed, r: 0.35, life: STAFF.range / STAFF.speed, style: 'bolt', col: '#8a3fd1' });
      G.sparks(pl.x + pl.aim.x * 0.6, pl.y + pl.aim.y * 0.6, '#8a3fd1', 5); return 0;
    }
    let hits = 0;
    for (const e of G.liveEnemies()) {
      const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy);
      if (d > D.range + e.radius) continue;
      if (d > 0.45 && (dx * pl.aim.x + dy * pl.aim.y) / d < cosA) continue;
      const r = G.rollPhys(); G.damageEnemy(e, r, { src: 'attack', elem: r.elem, kx: dx / (d || 1), ky: dy / (d || 1) }); hits++;
    }
    return hits;
  };
  function bossCanSee(e, pl = G.player) {
    const within = (room, x, y) => x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h;
    const room = G.map.rooms.find(room => within(room, e.homeX, e.homeY));
    if (room && !within(room, pl.x, pl.y)) return false;
    const steps = Math.ceil(U.dist(e.x, e.y, pl.x, pl.y) * 5);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (G.solidAt(Math.floor(U.lerp(e.x, pl.x, t)), Math.floor(U.lerp(e.y, pl.y, t)))) return false;
    }
    return true;
  }
  G.damageEnemy = function (e, r, o) {
    if (e.dead || e.persuaded || G.S.endingStage === 'effect') return;
    o = o || {};
    // ธาตุ: ตัวคูณจาก config.elements.chart [ธาตุที่ตี][ธาตุศัตรู]
    if (e.def.bossHeal) e.healAnchor = G.time;
    const { ael, em } = PD.Element.resolve(e, r, o);
    const armor = r.magic ? (o.dot ? 0 : (e.def.mdef || 0)) : (e.def.def ?? e.def.armor ?? 0);
    let dmg = Math.max(1, Math.round(r.dmg * em * (e.frozenT > 0 ? e.vuln : 1) * (armor ? 1 - armor : 1)));
    G.lastTarget = e; G.lastTargetAt = performance.now(); // ป้ายเป้าหมาย (ชื่อ · เลเวล · เลือด)
    if (e.shieldArmor !== undefined) {
      e.shieldFlashUntil = G.time + 0.17;
      healBoss(e, r.dmg);
      return;
    }
    e.hp -= dmg;
    if (e.summonEncounter) recordSummonThresholds(e);
    if (!o.noStagger) e.hurtT = o.dot ? Math.max(e.hurtT, 0.1) : 0.27;
    if (e.state === 'idle' && (!e.def.boss || !G.map || bossCanSee(e))) e.state = 'chase';
    const col = o.dot ? '#e0412b' : ael ? PD_DATA.elemColors[ael] : '#1b1b1b';
    if (o.shard) { G.sparks(e.x, e.y, '#8a3fd1', 9); G.sparks(e.x, e.y, '#d9b8ff', 5); G.sparks(e.x, e.y, '#ffffff', 2); G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.15, r1: 0.7, t: 0, dur: 0.22, col: '#8a3fd1' }); } // สะเก็ตพลังเวท
    else G.sparks(e.x, e.y, col, o.dot ? 2 : r.crit ? 10 : 6);
    G.floater(e.x, e.y, (r.crit ? dmg + '!' : '' + dmg), o.dot ? '#e0412b' : r.crit ? '#e0661b' : '#1b1b1b', 0, o.dot ? 0.8 : r.crit ? 2 : 1);
    if (em !== 1 && !o.chain) G.floater(e.x, e.y - 0.4, em > 1 ? 'ได้ผล ×' + em : 'ต้านทาน ×' + em, em > 1 ? '#e0661b' : '#888', 0.15, 0.8);
    if (ael === 'fire' && (o.burnChance == null || Math.random() < o.burnChance)) { const B = CFG().burn; e.burnT = B.time; e.burnMagic = !!r.magic; e.burnTick = B.tick; e.burnDmg = Math.max(1, dmg * B.pct / (B.time / B.tick)); }
    if (ael === 'ice') { const Ch = CFG().chill; e.slowT = Math.max(e.slowT, Ch.time); e.slowMul = Math.min(e.slowMul, Ch.mul); }
    if (ael === 'bolt' && !o.chain) { // สายฟ้าลูกโซ่: กระโดดไปตัวที่ใกล้ที่สุด ดาเมจลดลงตามลำดับ
      const BC = CFG().boltChain, hit = new Set([e]); let from = e;
      for (const mul of BC.mult) {
        let best = null, bd = BC.range; for (const x of G.liveEnemies()) if (!hit.has(x)) { const dd = U.dist(x.x, x.y, from.x, from.y); if (dd < bd) { bd = dd; best = x; } }
        if (!best) break; hit.add(best);
        G.effects.push({ type: 'zap', x0: from.x, y0: from.y, x1: best.x, y1: best.y, t: 0, dur: 0.28 });
        G.damageEnemy(best, { dmg: r.dmg * mul, crit: false }, { src: o.src, elem: 'bolt', chain: true }); from = best;
      }
    }
    if (!e.def.boss && o.kx !== undefined) G.moveEnt(e, o.kx * 0.12, o.ky * 0.12, e.radius);
    if (G.derived.leech > 0) G.player.hp = Math.min(G.derived.maxHp, G.player.hp + dmg * G.derived.leech);
    // Artifact combat effects
    const AB = G.derived.artBonus;
    if (AB && !o.dot && !o.chain) {
      if (AB.burnOnHit > 0 && o.src === 'attack' && Math.random() < AB.burnOnHit / 100) {
        const B = CFG().burn;
        e.burnT = B.time; e.burnTick = B.tick; e.burnMagic = !!r.magic;
        e.burnDmg = Math.max(1, dmg * B.pct / (B.time / B.tick));
      }
      // slowOnHit (ice_STR): ตีประชิดมีโอกาสชะลอศัตรู
      if (AB.slowOnHit > 0 && o.src === 'attack' && Math.random() < AB.slowOnHit / 100) { e.slowT = Math.max(e.slowT, 1.5); e.slowMul = Math.min(e.slowMul, 0.4); G.floater(e.x, e.y - 0.3, 'ช้า!', '#3a8de0', 0.1, 0.6); }
      // chainHit (bolt_STR): ตีประชิดมีโอกาสกระเด็นไปศัตรูข้างๆ
      if (AB.chainHit > 0 && o.src === 'attack' && Math.random() < AB.chainHit / 100) { let best = null, bd = 2.5; for (const x of G.liveEnemies()) if (x !== e) { const dd = U.dist(x.x, x.y, e.x, e.y); if (dd < bd) { bd = dd; best = x; } } if (best) { G.effects.push({ type: 'zap', x0: e.x, y0: e.y, x1: best.x, y1: best.y, t: 0, dur: 0.25 }); G.damageEnemy(best, { dmg: dmg * 0.5, crit: false }, { src: 'attack', chain: true }); } }
      // spellBurn (fire_INT): เวทมนตร์ทำให้ศัตรูลุกไหม้
      if (AB.spellBurn > 0 && o.src === 'skill') { const B = CFG().burn; e.burnT = Math.max(e.burnT || 0, B.time); e.burnTick = B.tick; const burn = Math.max(1, dmg * AB.spellBurn / 100); if (burn >= (e.burnDmg || 0)) { e.burnDmg = burn; e.burnMagic = !!r.magic; } }
      // spellFreeze (ice_INT): เวทมนตร์มีโอกาสแช่แข็ง
      if (AB.spellFreeze > 0 && o.src === 'skill' && Math.random() < AB.spellFreeze / 100) { e.frozenT = Math.max(e.frozenT || 0, 2); e.vuln = 1.3; G.floater(e.x, e.y - 0.3, 'แช่แข็ง!', '#3a8de0', 0.1, 0.6); G.sparks(e.x, e.y, '#a0d8ff', 8); }
      // spellPierce remains reserved for future Artifact effects.
    }
    G.stats.damageDealt = (G.stats.damageDealt || 0) + dmg;
    if (G.land.id === 'ink_tree' && e.def.persuadeAt && e.hp / e.maxHp <= e.def.persuadeAt) { G.persuade(e); return; }
    if (e.hp <= 0) G.killEnemy(e);
    else if (PD.Sound) PD.Sound.sfx('hit');
  };
  G.killEnemy = function (e) {
    e.dead = true; G.S.kills++;
    // Artifact: hpOnKill (fire_VIT)
    const AB2 = G.derived.artBonus;
    if (AB2 && AB2.hpOnKill > 0) { const heal = Math.round(G.derived.maxHp * AB2.hpOnKill / 100); G.player.hp = Math.min(G.derived.maxHp, G.player.hp + heal); if (heal > 0) G.floater(G.player.x, G.player.y, '+' + heal, '#3c9a5c', 0, 0.6); }
    if (PD.Sound) PD.Sound.sfx(e.def.boss ? 'bossDeath' : 'monDeath');
    const exp = Math.round(e.def.exp * (1 + CFG().enemyScale.exp * (e.lvl - 1)) * (e.alpha ? CFG().alpha.exp : 1));
    G.sparks(e.x, e.y, '#1b1b1b', 14);
    G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.2, r1: 0.9 * (e.def.size || 1), t: 0, dur: 0.35 });
    if (e.summonedBy) return;
    if (e.def.boss) clearBossSummons(e);
    G.gainExp(exp);
    G.dropLoot(e);
    if (e.def.boss && G.land.testmap) { G.boss = G.enemies.find(x => x.def.boss && !x.dead && x !== e) || null; if (G.boss) PD.UI.showBoss(G.boss); G.toast('ชนะ! ' + e.def.name + ' (Testmap ไม่นับเควส)', '#3c9a5c'); return; }
    if (e.def.boss) {
      G.S.bosses[e.type] = true;
      if (G.isFarmLand(G.land)) (G.S.farmClears ||= {})[G.land.id + ':' + G.mapIndex] = true;
      G.boss = null; G.zones.length = 0; G.lines.length = 0;
      if (G.map.bossSeq && G.map.bossSeq.some(x => !G.S.bosses[x.type])) { // ยังมีบอสตัวถัดไป: ล้างลูกสมุน แล้วปลุกตัวต่อไปหลังพักหายใจ ไม่นับจบดินแดน
        G.toast('ชนะ! ' + e.def.name + ' — มีบางอย่างในลานกำลังตื่น...', '#3c9a5c'); PD.Quest.onKill(e.type); G.save();
        G.later(3, () => { if (G.map.bossSeq && !G.boss) G.spawnNextBoss(true); });
        return;
      }
      { const ls = G.S.lands[G.land.id]; if (ls && G.land.postgame) ls.completed = true; } // ดินแดนหลังจบเกม: ชนะบอส = ชนะดินแดน (ติ๊ก ✓ บนแผนที่โลก)
      if (G.land.id === 'shadow_forest') G.unlockBonusLands(true);
      G.toast('ชนะ! ' + e.def.name, '#3c9a5c');
      G.stats.victories = (G.stats.victories || 0) + 1;
      PD.Quest.onKill(e.type);
      G.hint('bossDone', true);
      G.save();
    }
  };
  G.persuade = function (e) {
    clearBossSummons(e);
    const scene = G.S;
    const resumeEffect = scene.endingStage === 'effect';
    const pl = G.player;
    pl.atk = null; pl.dashT = 0; pl.dashDmg = 0; pl.poisonT = 0; pl.castT = 0; pl.freezeCast = null;
    pl.castId = (pl.castId || 0) + 1;
    e.hp = 1; e.persuaded = true; e.state = 'idle';
    G.zones.length = 0; G.lines.length = 0; G.projectiles.length = 0; G.timers.length = 0;
    G.enemies.forEach(x => { if (x !== e) x.dead = true; });
    PD.Input.releaseAll();
    const effect = () => {
      scene.endingStage = 'effect'; G.save();
      e.blinkT = 0.8;
      G.endingEffectTime = 0.8;
      G.endingEffectDone = () => {
        G.sparks(e.x, e.y, '#1b1b1b', 18);
        e.dead = true; e.blinkT = 0; G.boss = null;
        if (!scene.bosses[e.type]) {
          const firstPickup = G.pickups.length;
          G.dropLoot(e);
          scene.endingLoot = G.pickups.slice(firstPickup);
          scene.bosses[e.type] = true;
          G.stats.victories = (G.stats.victories || 0) + 1;
        }
        scene.endingStage = 'narration'; G.save();
        PD.Quest.onKill(e.type);
        if (G.state === 'play') G.startEnding();
      };
    };
    if (resumeEffect) effect();
    else {
      scene.endingStage = 'persuade'; G.save();
      PD.UI.dialog(PD_DATA.dialogue.eraser_persuade, effect);
    }
  };
  G.hurtPlayer = function (amount, src) {
    const pl = G.player;
    if (pl.shieldT > 0 && G.state === 'play') { if (!(pl.shieldFxT > 0)) { pl.shieldFxT = 0.15; G.sparks(pl.x, pl.y, '#8a7b60', 6); G.floater(pl.x, pl.y, 'กัน!', '#8a7b60', 0, 0.5); } return false; }
    if (pl.invuln > 0 || pl.immortalT > 0 || pl.dashT > 0 || G.state !== 'play') return false;
    // Artifact: dodge (ice_AGI)
    if (G.derived.dodge > 0 && Math.random() < G.derived.dodge) { G.floater(pl.x, pl.y, 'หลบ!', '#3a8de0', 0, 0.7); G.sparks(pl.x, pl.y, '#3a8de0', 4); return false; }
    const magic = !!(src && src.owner); // กระสุน/วงเวทของศัตรู = ดาเมจเวท ใช้ป้องกันเวท · ตีประชิด/พุ่งชน = กายภาพ
    const dmg = Math.max(1, Math.round(amount * (1 - (magic ? G.derived.dmgReduceMagic : G.derived.dmgReduce)) * (0.9 + Math.random() * 0.2)));
    pl.hp -= dmg; pl.invuln = CFG().hurtInvuln; pl.hurtT = 0.2;
    G.floater(pl.x, pl.y, '-' + dmg, '#d23a2a'); G.sparks(pl.x, pl.y, '#d23a2a', 6);
    G.stats.damageTaken = (G.stats.damageTaken || 0) + dmg;
    // Artifact: reflect (bolt_VIT)
    if (G.derived.artBonus && G.derived.artBonus.reflect > 0 && src && src.def) { const rd = Math.max(1, Math.round(dmg * G.derived.artBonus.reflect / 100)); G.damageEnemy(src, { dmg: rd, crit: false }, { dot: true }); G.sparks(src.x, src.y, '#e8c21a', 4); }
    const pz = src && (src.poison || (src.def && src.def.poison && src.atk)); // เผ่าต่างดาว: ติดพิษ
    if (pz && pl.hp > 0) { const Pz = CFG().poison; if (!(pl.poisonT > 0)) G.floater(pl.x, pl.y - 0.4, 'ติดพิษ!', '#3c9a5c', 0.1); pl.poisonT = Pz.time; pl.poisonDps = Math.max(1, Math.round(pz * Pz.dpsAtk)); pl.poisonTick = 1; if (G.itemCount('antidote')) G.hint('poison'); }
    if (pl.hp <= 0) { pl.hp = 0; G.die(); }
    else if (pl.hp < G.derived.maxHp * 0.3 && G.potionCount() > 0) G.hint('lowhp');
    return true;
  };
  G.die = function () {
    const P = G.S.player; G.state = 'dead'; G.S.deaths++; PD.Input.releaseAll && PD.Input.releaseAll();
    const loss = Math.floor(P.exp * CFG().deathExpLossPct); P.exp -= loss; G.lastDeathLoss = loss;
    G.player.atk = null; G.player.poisonT = 0; G.player.stunT = 0; G.player.freezeCast = null;
    let lost = false;
    if (G.land.postgame && G.mapIndex > 0) { // ดันเจี้ยนพิเศษ: ของทั้งหมดหาย เหลือแค่เงิน
      lost = P.inventory.length + Object.values(P.gear).filter(Boolean).length + 1;
      P.inventory = []; P.gear = { body: null, legs: null, acc: null, acc2: null }; P.weapon = PD.Loot.starter(); G.recalc(); G.save();
    }
    PD.UI.showDead(loss, lost);
  };
  G.respawn = function () {
    G.player.hp = G.derived.maxHp; G.player.ink = G.derived.maxInk; G.player.cd = {};
    PD.Input.releaseAll && PD.Input.releaseAll(); G.loadMap(G.land.id, 0, 'back'); G.state = 'play'; PD.UI.hideOverlay();
  };

  // ---------- ศัตรู AI ----------
  function healBoss(e, amount) {
    const gain = Math.min(e.maxHp - e.hp, Math.max(0, Math.round(amount)));
    if (!gain) return;
    e.hp += gain;
    G.floater(e.x, e.y, '+' + gain, '#3c9a5c');
    G.sparks(e.x, e.y, '#3c9a5c', 6);
  }

  function clearBossSummons(boss) {
    delete boss.summonEncounter;
    for (const mob of G.liveEnemies()) {
      if (mob.summonedBy !== boss) continue;
      mob.dead = true;
      G.sparks(mob.x, mob.y, '#9b4ad6', 6);
    }
  }

  function recordSummonThresholds(boss) {
    const state = boss.summonEncounter;
    const hp = boss.hp / boss.maxHp;
    state.earned = Math.max(state.earned, 1 + state.skill.thresholds.filter(threshold => hp <= threshold).length);
  }

  function updateBossSummon(boss, dt) {
    const binding = boss.def.summonSkill;
    if (!binding || boss.persuaded || boss.dead) return false;
    let state = boss.summonEncounter;
    if (!state) {
      if (boss.state === 'idle' || boss.state === 'recovery') return false;
      const skill = PD.Skills.bossDef(binding.skillId);
      if (!skill || skill.effectId !== 'summon') return false;
      state = boss.summonEncounter = { skill, earned: 1, done: 0, readyAt: 0, castLeft: 0 };
      recordSummonThresholds(boss);
    }
    if (state.castLeft > 0) {
      state.castLeft = Math.max(0, state.castLeft - dt);
      if (state.castLeft > 0) return true;
      const roster = state.castRoster;
      delete state.castRoster;
      if (PD.Skills.applyBossEffect(G, state.skill, boss, roster)) {
        state.done++;
        state.readyAt = G.time + state.skill.cooldown;
      } else state.readyAt = G.time + 0.5;
      boss.state = 'cd'; boss.t = 0.35;
      return true;
    }
    if (state.done >= state.earned || G.time < state.readyAt || boss.frozenT > 0 ||
        ['idle', 'recovery', 'pattern', 'charging', 'tail', 'windup'].includes(boss.state) || !bossCanSee(boss)) return false;
    const alive = G.liveEnemies().filter(mob => mob.summonedBy === boss).length;
    const override = state.done ? binding.phaseRosters?.[state.done - 1] : null;
    const roster = override && Object.keys(override).length ? override : binding.roster;
    if (!roster || Object.values(roster).reduce((sum, count) => sum + count, 0) !== state.skill.waveSize ||
        alive + state.skill.waveSize > state.skill.maxAlive) return false;
    state.castRoster = roster;
    state.castLeft = state.skill.castTime;
    boss.moving = false;
    G.effects.push({ type: 'ring', x: boss.x, y: boss.y, r0: 0.3, r1: 2, t: 0, dur: state.castLeft, col: '#9b4ad6' });
    return true;
  }

  function updateEnemy(e, dt) {
    const pl = G.player, d = e.def;
    e.hurtT = Math.max(0, e.hurtT - dt); e.wigT = Math.max(0, (e.wigT || 0) - dt);
    if (PD.Status.tickEnemy(G, e, dt)) return;
    const castingSummon = d.boss && updateBossSummon(e, dt);
    if (e.frozenT > 0) { e.frozenT -= dt; e.moving = false; return; }
    if (castingSummon) return;
    e.anim += dt; e.slowT -= dt; if (e.slowT <= 0) e.slowMul = 1;
    if (e.persuaded) { e.moving = false; return; }
    const dx = pl.x - e.x, dy = pl.y - e.y, dist = Math.hypot(dx, dy);
    const spd = d.speed * e.slowMul;
    const moveTo = (tx, ty, s) => { const n = U.norm(tx - e.x, ty - e.y); G.moveEnt(e, n.x * s * dt, n.y * s * dt, e.radius); e.moving = true; const sd = U.worldDirToScreen(n.x, n.y); if (Math.abs(sd.x) > 0.1) e.facing = sd.x > 0 ? 1 : -1; };
    e.moving = false; e.t -= dt;
    const inCombat = e.state !== 'idle' && e.state !== 'recovery';
    if (d.bossHeal && inCombat && dist <= (CFG().bossDetectRange || 12)) {
      e.healAnchor ??= G.time;
      if (G.time - e.healAnchor > d.bossHeal.delay && e.hp < e.maxHp) {
        healBoss(e, e.maxHp * d.bossHeal.fraction);
        e.healAnchor = G.time;
      }
    }
    if (d.inkDrain) {
      const close = inCombat && dist <= d.inkDrain.proximity;
      e.inkCloseT = close && !(e.state === 'pattern' && e.pat === 'inkDrain') ? (e.inkCloseT || 0) + dt : 0;
      if (e.inkCloseT > d.inkDrain.closeTime && e.state !== 'pattern' && e.state !== 'charging') {
        e.inkCloseT = 0;
        startPattern(e, 'inkDrain');
        return;
      }
    }
    if (e.state === 'tail') return; // บอสแมงป่องกำลังทุบพื้น (ลำดับท่าใน startTail)
    if (d.tailslam && e.state !== 'idle' && e.state !== 'pattern' && e.state !== 'charging') { // ยืนชิดบอสนานเกิน → ทุบพื้น
      const ts = CFG().tailSlam; e.closeT = dist < e.radius + ts.range ? (e.closeT || 0) + dt : 0;
      if (e.closeT > ts.closeTime) { e.closeT = 0; startTail(e); return; }
    }
    if (d.boss && e.state !== 'idle' && e.state !== 'pattern' && e.state !== 'charging') {
      e.patT -= dt;
      if (e.patT <= 0 && dist < 9 && bossCanSee(e, pl)) { startPattern(e); return; }
    }
    switch (e.state) {
      case 'idle':
        if (dist < d.aggro && G.state === 'play' && (!d.boss || bossCanSee(e, pl))) { e.state = 'chase'; if (d.boss) { e.healAnchor = G.time; G.hint('boss', true); if (G.land.testmap) G.boss = e; PD.UI.showBoss(e); } break; }
        break;
      case 'returnHome':
        if (U.dist(e.x, e.y, e.homeX, e.homeY) <= 0.15) { e.x = e.homeX; e.y = e.homeY; e.state = 'idle'; }
        else moveTo(e.homeX, e.homeY, spd);
        break;
      case 'recovery':
        e.recT = (e.recT || 0) + dt; if (e.recT >= (CFG().bossRecovery || {}).tickRate || 1) { e.recT = 0; const heal = Math.round(e.maxHp * ((CFG().bossRecovery || {}).healPct || 0.10)); e.hp = Math.min(e.maxHp, e.hp + heal); }
        if (e.hp >= e.maxHp) { e.state = 'idle'; PD.UI.hideBoss(); G.boss = null; } else if (dist < (CFG().bossDetectRange || 12) && G.state === 'play' && bossCanSee(e, pl)) { e.state = 'chase'; G.hint('boss', true); PD.UI.showBoss(e); }
        e.moving = false; break;
      case 'chase':
        if (d.boss && dist > (CFG().bossDetectRange || 12)) { e.state = 'recovery'; e.recT = 0; PD.UI.hideBoss(); G.boss = null; break; }
        if (!d.boss && (dist > d.aggro * 2.2 || U.dist(e.x, e.y, e.homeX, e.homeY) > d.aggro)) { e.state = 'returnHome'; break; }
        if (d.kind === 'caster') {
          if (dist > d.range) moveTo(pl.x, pl.y, spd);
          else if (dist < d.range * 0.5) moveTo(e.x - dx, e.y - dy, spd * 0.8);
          if (dist <= d.range + 0.5) { e.state = 'windup'; e.t = d.windup * (d.boss ? CFG().bossSpeed.attack : 1); }
        } else {
          if (dist > d.range * 0.85) moveTo(pl.x, pl.y, spd);
          if (dist <= d.range + 0.1) { e.state = 'windup'; e.t = d.windup * (d.boss ? CFG().bossSpeed.attack : 1); }
        }
        if (Math.abs(dx - dy) > 0.1) e.facing = (dx - dy) > 0 ? 1 : -1;
        break;
      case 'windup':
        if (e.t <= 0) {
          if (d.kind === 'caster') {
            const n = U.norm(dx, dy);
            G.projectiles.push({ owner: 'enemy', x: e.x, y: e.y, vx: n.x * d.projSpeed, vy: n.y * d.projSpeed, r: 0.25, dmg: e.atk, life: 3, style: 'orb', col: d.projColor || '#555', poison: d.poison ? e.atk : 0 });
          } else {
            // โจมตีจริง: โดนเฉพาะเมื่ออยู่ในระยะตอนฟาด (ชนเฉยๆ ไม่ทำดาเมจ)
            if (dist <= d.range + 0.35) G.hurtPlayer(e.atk, e);
            G.effects.push({ type: 'slash', x: e.x, y: e.y, ang: Math.atan2(U.worldDirToScreen(dx, dy).y, U.worldDirToScreen(dx, dy).x), arc: 1.6, r: 10 * (d.size || 1), dir: 1, t: 0, dur: 0.25, col: '#7a2a20' });
            if (d.thorny) { G.sparks(e.x, e.y, '#3c7a3c', 10); G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.3, r1: 1.2 * (d.size || 1), t: 0, dur: 0.25, col: '#3c7a3c' }); } // หนามแทงออกรอบตัว
          }
          e.state = 'cd'; e.t = d.cd * (d.boss ? CFG().bossSpeed.attack : 1);
        }
        break;
      case 'cd':
        if (d.kind === 'caster' && dist < d.range * 0.5) moveTo(e.x - dx, e.y - dy, spd * 0.7);
        if (e.t <= 0) e.state = 'chase';
        break;
      case 'pattern':
        if (e.t <= 0) { firePattern(e); if (e.state === 'pattern') { e.state = 'cd'; e.t = 0.35; } }
        break;
      case 'charging': {
        const charge = CFG().bossCharge;
        const x = e.x, y = e.y, s = (9 + e.tier * 0.6) * charge.speedMult;
        const blocked = G.moveEnt(e, e.cv.x * s * dt, e.cv.y * s * dt, e.radius);
        e.moving = true;
        e.chargeLeft -= s * dt;
        if (!e.chargeHit) {
          const dx = e.x - x, dy = e.y - y, lengthSquared = dx * dx + dy * dy;
          const along = lengthSquared ? U.clamp(((pl.x - x) * dx + (pl.y - y) * dy) / lengthSquared, 0, 1) : 0;
          if (U.dist(x + dx * along, y + dy * along, pl.x, pl.y) <= e.radius + CFG().playerRadius) {
            e.chargeHit = true;
            if (G.hurtPlayer(e.atk * 1.3, e) && G.state === 'play') {
              pl.atk = null;
              pl.stunT = Math.max(pl.stunT || 0, charge.stagger);
              if (Math.random() < charge.stunChance) G.stunPlayer(CFG().stunTime);
            }
          }
        }
        if (blocked || e.chargeLeft <= 0) { e.state = 'cd'; e.t = 0.8; G.sparks(e.x, e.y, '#1b1b1b', 6); }
        break;
      }
    }
  }
  function startPattern(e, forced) {
    const d = e.def, pl = G.player, pat = forced || d.patterns[e.patIdx++ % d.patterns.length];
    const bs = CFG().bossSpeed, w = bs.windup;
    const bp = CFG().bossPower, enr = e.hp / e.maxHp < bp.enrageAt ? bp.enrageCd : 1;
    if (enr < 1 && !e.enraged) { e.enraged = true; G.toast(d.name + ' โกรธแล้ว!', '#d23a2a'); }
    e.pat = pat; e.patT = d.patternCd * bs.patternCd * enr; e.state = 'pattern';
    if (pat === 'absorbShield') {
      e.t = d.absorbShield.duration;
      e.shieldArmor = d.absorbShield.armor;
      G.floater(e.x, e.y, 'โล่ +' + e.shieldArmor + ' เกราะ', '#8a5cb2');
    } else if (pat === 'tentaclePull') {
      const n = U.norm(pl.x - e.x, pl.y - e.y);
      const distance = Math.min(d.tentaclePull.range, Math.hypot(pl.x - e.x, pl.y - e.y));
      e.t = d.tentaclePull.cast;
      e.tentacleTarget = { x: e.x + n.x * distance, y: e.y + n.y * distance };
      G.lines.push({ x0: e.x, y0: e.y, x1: e.tentacleTarget.x, y1: e.tentacleTarget.y, t: 0, dur: e.t });
    } else if (pat === 'inkDrain') {
      e.t = d.inkDrain.cast;
      G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: d.inkDrain.proximity, r1: d.inkDrain.proximity, t: 0, dur: e.t, col: '#d23a2a' });
    } else if (pat === 'slam') {
      e.t = 0.95 * w; G.zones.push({ x: pl.x, y: pl.y, r: 1.7, t: 0, dur: 0.95 * w, dmg: e.atk * 1.4, owner: e });
      const extra = Math.floor(e.tier / 2) + (e.enraged ? 1 : 0); // บอสด่านหลังเหยียบหลายวง
      for (let k = 0; k < extra; k++) { const a = Math.random() * 6.28, r = 1.6 + Math.random() * 1.2; G.zones.push({ x: pl.x + Math.cos(a) * r, y: pl.y + Math.sin(a) * r, r: 1.4, t: 0, dur: 0.95 * w + 0.15 * (k + 1), dmg: e.atk * 1.2, owner: e }); }
    }
    else if (pat === 'ring') { e.t = 0.7 * w; G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 1.5, r1: 0.3, t: 0, dur: 0.7 * w, col: '#d23a2a' }); }
    else if (pat === 'spiral') { e.t = 0.5 * w; G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.4, r1: 1.6, t: 0, dur: 0.5 * w, col: '#e8b923' }); }
    else if (pat === 'rain') { // หยดหมึกตกใส่รอบตัวผู้เล่น (มีวงเตือน)
      e.t = 0.3 * w; const n = 6 + e.tier + (e.enraged ? 3 : 0);
      for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, r = Math.random() * 3.5; G.zones.push({ x: pl.x + Math.cos(a) * r, y: pl.y + Math.sin(a) * r, r: 0.9, t: 0, dur: (0.9 + k * 0.12) * w, dmg: e.atk * 0.9, owner: e }); }
    }
    else if (pat === 'cross') { // เส้นกากบาท 4 แฉกจากตัวบอส
      e.t = 0.4 * w; const off = Math.random() < 0.5 ? 0 : Math.PI / 4;
      for (let q = 0; q < 4; q++) { const a = off + q * Math.PI / 2; for (let s = 1.4, k = 0; s < 7; s += 1.15, k++) G.zones.push({ x: e.x + Math.cos(a) * s, y: e.y + Math.sin(a) * s, r: 0.7, t: 0, dur: (0.8 + k * 0.07) * w, dmg: e.atk * 1.1, owner: e }); }
    }
    else if (pat === 'nova') { e.t = 0.9 * w; G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 3.2, r1: 0.4, t: 0, dur: 0.9 * w, col: '#d23a2a' }); }
    else if (pat === 'roots') { // รากไม้พุ่งจากพื้นเป็นลำแฉก (5 เส้น พัดไปทางผู้เล่น) ไล่ออกจากตัวบอส · โกรธ = 7 เส้น
      e.t = 0.5 * w; const base = Math.atan2(pl.y - e.y, pl.x - e.x), nr = e.enraged ? 7 : 5;
      for (let q = 0; q < nr; q++) { const a = base + (q - (nr - 1) / 2) * 0.34; for (let s = 1.5, k = 0; s < 8.5; s += 1.15, k++) G.zones.push({ x: e.x + Math.cos(a) * s, y: e.y + Math.sin(a) * s, r: 0.62, t: 0, dur: (0.85 + k * 0.085) * w, dmg: e.atk * 1.15, owner: e, col: '#3c7a3c' }); }
    }
    else if (pat === 'leaves') { // พายุใบมีด: เล็งผู้เล่น ยิงเป็นพัดใบไม้ 3 ระลอก
      e.t = 0.6 * w; const base = Math.atan2(pl.y - e.y, pl.x - e.x);
      for (const o of [-0.5, 0, 0.5]) G.lines.push({ x0: e.x, y0: e.y, x1: e.x + Math.cos(base + o) * 6, y1: e.y + Math.sin(base + o) * 6, t: 0, dur: 0.6 * w });
    }
    else if (pat === 'charge') {
      e.t = 0.75 * w + CFG().bossCharge.lockExtra; const n = U.norm(pl.x - e.x, pl.y - e.y); e.cv = n;
      G.lines.push({ x0: e.x, y0: e.y, x1: e.x + n.x * 5, y1: e.y + n.y * 5, t: 0, dur: e.t });
    }
  }
  function firePattern(e) {
    const d = e.def;
    if (e.pat === 'absorbShield') {
      delete e.shieldArmor;
    } else if (e.pat === 'tentaclePull') {
      const pl = G.player, target = e.tentacleTarget, skill = d.tentaclePull;
      const dx = target.x - e.x, dy = target.y - e.y, distance = Math.hypot(dx, dy);
      const projection = distance ? U.clamp(((pl.x - e.x) * dx + (pl.y - e.y) * dy) / (distance * distance), 0, 1) : 0;
      G.effects.push({ type: 'tentacle', x0: e.x, y0: e.y, x1: target.x, y1: target.y, t: 0, dur: 0.32 });
      if (U.dist(pl.x, pl.y, e.x + dx * projection, e.y + dy * projection) > skill.width) return;
      const dist = U.dist(e.x, e.y, pl.x, pl.y), dir = U.norm(e.x - pl.x, e.y - pl.y);
      const pull = Math.max(0, dist - e.radius - 0.45);
      const steps = Math.ceil(dist / 0.2);
      for (let i = 1; i < steps; i++) {
        if (G.solidAt(Math.floor(pl.x + dir.x * dist * i / steps), Math.floor(pl.y + dir.y * dist * i / steps))) return;
      }
      if (!G.hurtPlayer(skill.damage, e) || G.state !== 'play') return;
      G.moveEnt(pl, dir.x * pull, dir.y * pull, 0.3);
      if (Math.random() < skill.stunChance) G.stunPlayer(CFG().stunTime);
    } else if (e.pat === 'inkDrain') {
      const pl = G.player;
      if (U.dist(e.x, e.y, pl.x, pl.y) > d.inkDrain.proximity) return;
      const before = pl.hp;
      G.effects.push({ type: 'tentacle', x0: e.x, y0: e.y, x1: pl.x, y1: pl.y, t: 0, dur: 0.42, wrap: true });
      if (G.hurtPlayer(d.inkDrain.damage, e) && !e.dead) healBoss(e, before - pl.hp);
    } else if (e.pat === 'ring') {
      const nRing = 12 + e.tier * 2 + (e.enraged ? 4 : 0), off = Math.random() * 6.28;
      for (let k = 0; k < nRing; k++) { const a = off + k / nRing * Math.PI * 2; G.projectiles.push({ owner: 'enemy', x: e.x, y: e.y, vx: Math.cos(a) * (d.projSpeed || 4), vy: Math.sin(a) * (d.projSpeed || 4), r: 0.25, dmg: e.atk * 0.8, life: 3, style: 'orb', col: d.projColor || '#555', poison: d.poison ? e.atk : 0 }); }
    } else if (e.pat === 'charge') { e.state = 'charging'; e.chargeLeft = 5; e.chargeHit = false; G.lines.length = 0; return; }
    else if (e.pat === 'spiral') { // กระสุนหมุนเป็นเกลียว
      const off = Math.random() * 6.28, sp = (d.projSpeed || 4) * 0.9;
      for (let k = 0; k < 24; k++) G.later(k * 0.05, () => { if (e.dead) return; for (const s of [0, Math.PI]) { const a = off + k * 0.4 + s; G.projectiles.push({ owner: 'enemy', x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.22, dmg: e.atk * 0.7, life: 3, style: 'orb', col: d.projColor || '#555', poison: d.poison ? e.atk : 0 }); } });
    }
    else if (e.pat === 'leaves') { // 3 ระลอก ระลอกละ 7 ใบ กางเป็นพัด เล็งตำแหน่งผู้เล่น ณ ตอนปล่อย
      G.lines.length = 0;
      for (let v = 0; v < 3; v++) G.later(v * 0.32, () => { if (e.dead) return; const base = Math.atan2(G.player.y - e.y, G.player.x - e.x), n = e.enraged ? 9 : 7;
        for (let k = 0; k < n; k++) { const a = base + (k - (n - 1) / 2) * 0.17; G.projectiles.push({ owner: 'enemy', x: e.x, y: e.y, vx: Math.cos(a) * (d.projSpeed || 5) * 1.1, vy: Math.sin(a) * (d.projSpeed || 5) * 1.1, r: 0.22, dmg: e.atk * 0.65, life: 2.6, style: 'orb', col: d.projColor || '#3c9a5c' }); } });
    }
    else if (e.pat === 'nova') { // คลื่นระเบิดรอบตัว
      G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.3, r1: 3.2, t: 0, dur: 0.3, col: '#d23a2a' }); G.sparks(e.x, e.y, '#d23a2a', 16); G.shake = 0.2;
      if (U.dist(e.x, e.y, G.player.x, G.player.y) < 3.2) G.hurtPlayer(e.atk * 1.3, e);
    }
  }
  // บอสแมงป่อง: กระดิกหาง 3 ครั้ง (ประกายทองที่หาง) → ทุบพื้นแรง 3 ครั้ง · ครั้งที่ 3 จอสั่น + โอกาสมึน
  function startTail(e) {
    const d = e.def, ts = CFG().tailSlam, sz = d.size || 1; e.state = 'tail'; e.wigT = 1.25;
    G.floater(e.x, e.y - 1, 'กระดิกหาง!', '#b98f00', 0, 1.2);
    const tailPos = () => { const v = U.screenDirToWorld(-e.facing, -0.5), n = U.norm(v.x, v.y); return { x: e.x + n.x * 0.45 * sz, y: e.y + n.y * 0.45 * sz }; };
    for (let k = 0; k < 3; k++) G.later(k * 0.42, () => { if (e.dead) return; const t = tailPos(); G.sparks(t.x, t.y, '#e8c21a', 12); G.sparks(t.x, t.y, '#fff3b0', 6); G.effects.push({ type: 'ring', x: t.x, y: t.y, r0: 0.2, r1: 0.8, t: 0, dur: 0.3, col: '#e8c21a' }); });
    for (let k = 0; k < 3; k++) {
      const at = 1.35 + k * 0.6;
      G.later(at - 0.45, () => { if (!e.dead) G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: ts.radius, r1: ts.radius, t: 0, dur: 0.45, col: '#d23a2a' }); });
      G.later(at, () => {
        if (e.dead) return; const pl = G.player;
        G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.4, r1: ts.radius, t: 0, dur: 0.3, col: '#9a6a2a' }); G.sparks(e.x, e.y, '#9a6a2a', 14);
        if (k === 2) { G.shakeHard = 0.55; G.shake = 0.55; } else G.shake = 0.15;
        if (U.dist(e.x, e.y, pl.x, pl.y) <= ts.radius) { G.hurtPlayer(e.atk * ts.dmgMult, e); if (pl.dashT <= 0 && Math.random() < ts.stunChance[k]) G.stunPlayer(CFG().stunTime); } // โอกาสมึน 15% / 20% / 35% ตามครั้งที่ทุบ
        if (k === 2) { e.state = 'cd'; e.t = 0.8; }
      });
    }
  }
  G.stunPlayer = function (t) { const pl = G.player; if (pl.shieldT > 0 || pl.immortalT > 0) return; pl.stunT = Math.max(pl.stunT || 0, t); pl.atk = null; G.floater(pl.x, pl.y, 'มึน!', '#e8b923', 0, 1.4); G.toast('มึน ' + t + ' วินาที!', '#b98f00'); };

  return { STAFF, updateEnemy };
} };
