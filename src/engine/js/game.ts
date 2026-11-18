// @ts-nocheck
// ===== game: สถานะเกม, โหลดแผนที่, อัปเดตผู้เล่น/ศัตรู/การต่อสู้, ประตู, ตาย, ฉากจบ =====
PD.Game = (function () {
  const U = PD.U, CFG = () => PD_DATA.config;
  const G = {
    state: 'title', time: 0, S: null, land: null, mapIndex: 0, map: null,
    player: null, derived: null, enemies: [], npcs: [], pickups: [], projectiles: [], particles: [], effects: [],
    floaters: [], zones: [], lines: [], timers: [], inkMode: 'black', bridgeT: 0, cam: { x: 0, y: 0 },
    nib: { x: 0, y: 0 }, boss: null, shake: 0, stats: {}, mapCache: {}, testMode: false, ctx: null
  };

  // ---------- สร้าง/โหลดเกม ----------
  G.freshSave = function () {
    const sp = PD_DATA.startPlayer, w = PD.Loot.starter();
    const S = {
      v: 2, player: { cls: sp.cls, level: sp.level, exp: 0, hp: 0, ink: 0, weapon: w, gear: { body: null, legs: null, acc: null, acc2: null }, storage: [], inventory: [{ uid: PD.U.uid(), kind: 'potion', n: CFG().potionStart }],
        skills: Object.assign({}, sp.skills), slots: sp.slots.slice(), skillPoints: sp.skillPoints, lumi: 0, locked: {}, artifacts: {}, artifactBag: [] },
      lands: { village: { placed: CFG().worldGrid.home.slice(), placement: 'home', completed: false } },
      pendingPages: [], quests: {}, questItems: {}, used: {}, bosses: {}, hints: {}, loc: { land: 'village', map: 0 },
      playTime: 0, ended: false, kills: 0, deaths: 0, tools: {}
    };
    return S;
  };
  // Testmap (data/testmap.js ← mapedit.html): ดินแดนทดสอบ 1 แผนที่ เข้าได้จากแผนที่โลกตลอด
  G.setupTestmap = function () {
    const tm = PD_DATA.testmap; if (!tm || G.landById('testmap')) return;
    const name = tm.theme === 'lanternCave' ? tm.name : 'Testmap';
    PD_DATA.lands.push({ id: 'testmap', order: 0, testmap: true, name, mood: 'ทดสอบ', story: 'แผนที่ที่วาดเองใน mapedit.html', theme: tm.theme || 'village',
      baseLevel: tm.level || 1, enemyMult: tm.enemyMult || 1, color: '#7a7a7a', maps: [Object.assign({}, tm, { name, type: 'custom' })] });
  };
  G.unlockTestmap = function () { if (G.landById('testmap') && !G.S.lands.testmap) G.S.lands.testmap = { placed: [-99, -99], placement: 'home', completed: false, test: true }; };
  G.newGame = function (opts) {
    opts = opts || {};
    G.S = G.freshSave(); G.stats = {}; G.mapCache = {}; G.unlockTestmap();
    G.initPlayer();
    PD.Quest.activate('village');
    G.loadMap('village', 0, 'back');
    G.state = 'play'; PD.UI.hideOverlay();
    if (!opts.skipIntro) PD.UI.dialog(PD_DATA.dialogue.intro, () => { G.hint('tut_move', true); G.later(5, () => G.hint('tut_pc', true)); });
    G.save();
  };
  G.continueGame = function () {
    const s = PD.Save.read(); if (!s) return false;
    G.S = s; G.stats = {}; G.mapCache = {};
    s.player.lumi = s.player.lumi || 0; s.tools = s.tools || {}; s.player.artifacts = s.player.artifacts || {}; s.player.artifactBag = s.player.artifactBag || [];
    // v2.3.3: เซฟเก่าก่อนปรับระบบ Artifact (เคยมี 16 defId ตาม ธาตุ×stat) อาจมี defId ที่ไม่มีอยู่แล้ว → ล้างทิ้งกันหน้าพาเนลพัง (undefined.elem)
    s.player.artifactBag = s.player.artifactBag.filter(it => PD_DATA.artifactDefs[it.defId]);
    // v2.3.7: ของที่สวมอยู่จากเซฟเก่า (ก่อนระบบ Artifact=ไอเท็มปกติ) เป็น {defId,grade} เปล่าๆ ไม่มี uid/kind —
    // ถ้าแตะเปลี่ยนของในช่องนั้น ของเก่าจะถูกเด้งกลับกระเป๋าแบบไม่มี uid/kind ทำให้แตะของชิ้นนั้นไม่ติดอีกเลย (ที่ผู้ใช้แจ้งว่า "ติดตั้งไม่ได้")
    // แก้ที่ต้นตอ: เติม uid + kind ให้ของที่สวมอยู่ทุกชิ้นตั้งแต่ตอนโหลดเซฟ ก่อนที่จะมีโอกาสเด้งกลับกระเป๋า
    for (const sl in s.player.artifacts) {
      const a = s.player.artifacts[sl];
      if (a && !PD_DATA.artifactDefs[a.defId]) { delete s.player.artifacts[sl]; continue; }
      if (a) { if (!a.uid) a.uid = PD.U.uid(); if (a.kind !== 'artifact') a.kind = 'artifact'; }
    }
    // v2.3.5: Artifact ย้ายไปอยู่ใน P.inventory เป็นไอเท็มปกติแล้ว (ขายได้ผ่านร้านค้าเหมือนของอื่น) — ย้ายของเก่าจาก artifactBag เข้ากระเป๋าให้ (เท่าที่ที่ว่างพอ) แล้วเลิกใช้ artifactBag
    for (const it of s.player.artifactBag) { if (s.player.inventory.length >= PD_DATA.config.inventoryMax) break; s.player.inventory.push({ uid: it.uid || PD.U.uid(), kind: 'artifact', defId: it.defId, grade: it.grade }); }
    s.player.artifactBag = [];
    s.player.gear = s.player.gear || { body: null, legs: null, acc: null, acc2: null }; if (s.player.gear.acc2 === undefined) s.player.gear.acc2 = null; s.player.storage = s.player.storage || []; s.player.locked = s.player.locked || {};
    if (s.ended) G.unlockPostLands();
    G.unlockBonusLands();
    G.unlockTestmap(); if (!G.landById(s.loc.land)) s.loc = { land: 'village', map: 0 }; // แผนที่ที่เซฟไว้ถูกลบ → กลับหมู่บ้าน
    if (s.player.potions !== undefined) { const n = s.player.potions; delete s.player.potions; if (n > 0) s.player.inventory.unshift({ uid: PD.U.uid(), kind: 'potion', n }); } // เซฟเก่า: ยา → ไอเท็ม
    G.initPlayer(true);
    const at = s.loc.x !== undefined && s.loc.y !== undefined ? { x: s.loc.x, y: s.loc.y, layout: s.loc.layout } : null;
    G.loadMap(s.loc.land, s.loc.map, s.loc.map === 0 ? 'back' : 'back');
    if (at && (!G.map.book || at.layout === G.map.book.revision) && at.x > 0 && at.y > 0 && at.x < G.map.w && at.y < G.map.h && !G.solidAt(Math.floor(at.x), Math.floor(at.y))) { G.player.x = at.x; G.player.y = at.y; G.nib.x = at.x - 0.6; G.nib.y = at.y - 0.3; G.player.invuln = 1.0; }
    G.state = 'play'; PD.UI.hideOverlay();
    if (s.endingStage === 'persuade' || s.endingStage === 'effect') {
      if (G.boss && G.boss.type === 'boss_eraser') G.persuade(G.boss);
    } else if (s.endingStage === 'narration' || PD.Quest.cur('q_tree')?.t === 'ending') {
      if (s.bosses.boss_eraser) PD.Quest.onKill('boss_eraser');
      if (G.state === 'play') G.startEnding();
    }
    else if (s.endingStage === 'return' && G.land.id === 'ink_tree' && G.mapIndex === 0) G.finishEnding();
    return true;
  };
  G.initPlayer = function (keep) {
    const P = G.S.player;
    G.player = { x: 0, y: 0, facing: 1, aim: { x: 1, y: 0 }, aimAng: 0, anim: 0, moving: false, atk: null, swingDir: 1,
      invuln: 0, hurtT: 0, dashT: 0, dashV: null, cd: {}, lastDir: { x: 0.707, y: 0.707 }, hp: 1, ink: 1 };
    G.recalc();
    G.player.hp = keep && P.hp > 0 ? Math.min(P.hp, G.derived.maxHp) : G.derived.maxHp;
    G.player.ink = keep && P.ink > 0 ? Math.min(P.ink, G.derived.maxInk) : G.derived.maxInk;
  };
  G.recalc = function () {
    G.derived = PD.Stats.derive(G.S.player);
    if (PD.Skills && PD.Skills.sanitizeSlots) PD.Skills.sanitizeSlots(); // สกิลอาวุธที่อาวุธปัจจุบันไม่มี → ถอดออกจากช่อง
    if (G.player) { G.player.hp = Math.min(G.player.hp, G.derived.maxHp); G.player.ink = Math.min(G.player.ink, G.derived.maxInk); }
  };
  G.save = function () {
    if (!G.S) return;
    G.S.player.hp = Math.round(G.player.hp); G.S.player.ink = Math.round(G.player.ink);
    // เซฟอัตโนมัติแบบเกมเก่า: จำตำแหน่งที่ยืนอยู่ด้วย (เฉพาะตอนกำลังเล่น) — ออกตอนไหนก็กลับมาที่เดิม
    if (G.state === 'play' && G.map) { G.S.loc.x = Math.round(G.player.x * 100) / 100; G.S.loc.y = Math.round(G.player.y * 100) / 100; }
    PD.Save.write(G.S);
  };

  G.isFarmLand = land => (land.postgame && !land.single) || !!land.bonus;
  G.landById = id => PD_DATA.lands.find(l => l.id === id);
  G.placementMod = function (land) {
    const ls = G.S.lands[land.id]; if (!ls || ls.placement === 'home') return { lvl: 0, loot: 1 };
    return CFG().placement[ls.placement];
  };
  G.landLevel = land => Math.max(1, land.baseLevel + G.placementMod(land).lvl);

  G.loadMap = function (landId, mapIndex, entry) {
    const land = G.landById(landId);
    const key = landId + ':' + mapIndex;
    const farm = G.isFarmLand(land);
    if (farm && (G.S.loc.land !== landId || G.S.loc.map !== mapIndex)) {
      if (G.S.farmClears) delete G.S.farmClears[key];
    }
    const m = G.mapCache[key] || (G.mapCache[key] = PD.MapGen.generate(land, mapIndex));
    G.land = land; G.mapIndex = mapIndex; G.map = m;
    G.S.loc = { land: landId, map: mapIndex };
    if (m.book) G.S.loc.layout = m.book.revision;
    G.inkMode = 'black'; G.bridgeT = 0; G.trace = null; G.foldFx = 0;
    G.circuit = m.blockers.map((b, i) => b.kind === 'circuit' ? (G.blockerOpen(i) ? [1, 1, 1, 1] : [1, 0, 0, 0]) : null);
    G.enemies = []; G.projectiles = []; G.particles = []; G.effects = []; G.floaters = []; G.zones = []; G.lines = []; G.timers = []; G.pickups = []; G.boss = null;
    const pos = entry === 'fwd' ? m.spawnFwd : entry === 'world' ? (m.spawnWorld || m.spawnBack) : m.spawnBack;
    const pl = G.player; pl.x = pos.x; pl.y = pos.y; pl.atk = null; pl.dashT = 0; pl.shieldT = 0; pl.immortalT = 0; pl.invuln = 1.0; pl.castT = 0; pl.castId = (pl.castId || 0) + 1; // ยกเลิกการร่ายเมื่อเปลี่ยนแผนที่
    pl.freezeCast = null;
    const lvl = G.landLevel(land) + (m.uniformEnemyLevel ? 0 : mapIndex);
    // Alpha: ต่อกลุ่มศัตรู (ชนิดเดียวกันในแผนที่) มีโอกาสเกิด Alpha 1 ตัว · บอสไม่มี
    const AL = CFG().alpha, grp = {}, alphaAt = new Set();
    m.enemySpawns.forEach((sp, i) => (grp[sp.type] = grp[sp.type] || []).push(i));
    for (const t in grp) if (!PD_DATA.enemies[t].boss && Math.random() < AL.chance) alphaAt.add(grp[t][(Math.random() * grp[t].length) | 0]);
    m.enemySpawns.forEach((sp, i) => { const en = G.spawnEnemy(sp.type, sp.x, sp.y, lvl); if (alphaAt.has(i)) G.makeAlpha(en); });
    if (m.bossSpawns && m.bossSpawns.length > 1) { for (const b of m.bossSpawns.slice(1)) G.spawnEnemy(b.type, b.x, b.y, lvl + 1); } // Testmap: บอสหลายตัว
    if (m.bossSeq) G.spawnNextBoss(false);   // บอสหลายตัว: ออกทีละตัวตามลำดับ (ตัวที่ยังไม่ตาย)
    else if (m.bossSpawn && (land.testmap || (farm ? !G.S.farmClears?.[key] : !G.S.bosses[m.bossSpawn.type]))) G.boss = G.spawnEnemy(m.bossSpawn.type, m.bossSpawn.x, m.bossSpawn.y, lvl + (m.uniformEnemyLevel ? 0 : 1));
    G.npcs = m.npcSpots.filter(n => { const d = PD_DATA.npcs[n.id]; return !d.requires || (G.S.quests[d.requires] && G.S.quests[d.requires].done); })
      .map(n => ({ id: n.id, def: PD_DATA.npcs[n.id], x: n.x, y: n.y, phase: Math.random() * 5, facing: n.x > m.w / 2 ? -1 : 1 }));
    m.pickups.forEach((p, k) => {
      if (p.kind === 'quest' && G.S.questItems[p.item]) return;
      if (p.kind === 'side' && G.isUsed('side', k)) return;
      if (p.kind === 'pageKey' && G.isUsed('pageKey', p.item)) return;
      G.pickups.push({ x: p.x, y: p.y, kind: p.kind, item: p.kind === 'side' ? land.sideItem : p.item, mapIdx: k });
    });
    m.blockers.forEach(b => { if (b.kind === 'erase' && !G.S.tools.eraser) G.pickups.push({ x: b.eraser.x + 0.5, y: b.eraser.y + 0.5, kind: 'tool', item: 'eraser' }); });
    if (G.S.endingLoot && landId === 'ink_tree' && m.bossSpawn?.type === 'boss_eraser') G.pickups.push(...G.S.endingLoot);
    G.portalLock = true;
    G.nib.x = pl.x - 0.6; G.nib.y = pl.y - 0.3;
    // Sound: play music based on location
    if (PD.Sound) PD.Sound.playMusic(mapIndex === 0 && !m.book ? 'town' : 'dungeon');
    G.snapCamera();
    G.rebuildFloor();
    PD.UI && PD.UI.onMapLoaded && PD.UI.onMapLoaded();
    const ls = G.S.lands[landId];
    if (mapIndex === 0 && ls && ls.placement === 'strange') G.hint('strange');
    if (mapIndex === 0 && ls && ls.placement === 'warm') G.hint('warm');
    G.save();
  };
  G.rebuildFloor = function () { PD.Render.buildFloor(G.map, G.land, G.S.lands[G.land.id]); };
  // กล้อง: มีกรอบ deadzone (เดินนิดหน่อยกล้องไม่ขยับ) + ตามแบบนุ่ม + หยุดเดินแล้วค่อยๆ กลับกลางจอ
  G.updateCamera = function (dt) {
    const cfg = CFG(), pl = G.player, tg = U.iso(pl.x, pl.y), c = G.cam;
    let dx = c.x, dy = c.y, rate = cfg.cameraSmooth;
    if (pl.moving || pl.dashT > 0) {
      const ex = tg.x - c.x, ey = tg.y - c.y;
      if (Math.abs(ex) > cfg.cameraDeadX) dx = tg.x - Math.sign(ex) * cfg.cameraDeadX;
      if (Math.abs(ey) > cfg.cameraDeadY) dy = tg.y - Math.sign(ey) * cfg.cameraDeadY;
    } else { dx = tg.x; dy = tg.y; rate = cfg.cameraRecenter; }
    const k = 1 - Math.exp(-dt * rate);
    c.x += (dx - c.x) * k; c.y += (dy - c.y) * k;
    const hs = G.shakeHard > 0; // สั่นแรงสำหรับเหตุการณ์สำคัญ (ทุบพื้นครั้งที่ 3) ทำงานแม้ปิด cameraShake
    G.shakeOff = ((cfg.cameraShake && G.shake > 0) || hs) ? { x: (Math.random() - 0.5) * (hs ? 6 : 2), y: (Math.random() - 0.5) * (hs ? 6 : 2) } : null;
  };
  G.snapCamera = function () { const s = U.iso(G.player.x, G.player.y); G.cam.x = s.x; G.cam.y = s.y; };

  G.makeAlpha = function (e) { e.alpha = true; e.maxHp = Math.round(e.maxHp * CFG().ttk.alphaHp); e.hp = e.maxHp; e.atk *= CFG().alpha.mult; return e; }; // Alpha = Elite: HP ×ttk.alphaHp · ATK ×alpha.mult
  G.enemyLevel = (def, level) => Math.max(1, def.level || level + (def.lvlOffset || 0));
  G.spawnEnemy = function (type, x, y, lvl, opts) { // opts: { ttk } = เวลากำจัดเป้าของบอสตัวนี้ (ทับสูตรตามลำดับดินแดน)
    const d = PD_DATA.enemies[type];
    const spawnLevel = lvl;
    lvl = G.enemyLevel(d, lvl); // level ตายตัว (level) หรือบวก/ลบจากเลเวลดินแดน (lvlOffset) — ตั้งใน Editor
    const re = CFG().refEhp, tier = d.boss && G.land ? (G.land.bossTier !== undefined ? G.land.bossTier : G.land.order) : 0, bp = CFG().bossPower, K = CFG().ttk, rd = CFG().refDps;
    const refDpsAt = level => Math.exp(rd[0] + rd[1] * Math.log(level) + rd[2] * Math.log(level) ** 2);
    const refDps = refDpsAt(lvl); // DPS ของผู้เล่นมัธยฐาน ณ เลเวลนี้
    const bt = K.boss, bossTtk = opts && opts.ttk ? opts.ttk : tier <= bt.mainLast ? bt.start + (bt.end - bt.start) * tier / bt.mainLast : bt.end + bt.postBase + bt.postStep * (tier - bt.mainLast - 1);
    const refEhp = Math.exp(re[0] + re[1] * Math.log(lvl) + re[2] * Math.log(lvl) ** 2);
    const tank = !d.boss && d.hp >= K.tankHp, vHp = 0.7 + 0.3 * d.hp / (tank ? K.tankRefHp : K.mobRefHp), vAtk = 0.7 + 0.3 * d.atk / K.atkRef;
    let hpBase = d.boss ? bossTtk * refDps : (tank ? K.tank : K.mob) * vHp * refDps, atkMul = refEhp / K.hits * vAtk / d.atk; // atk = refEhp÷hits × vAtk
    if (d.boss && Number.isFinite(d.maxHp) && d.maxHp > 0) {
      const placementLevel = G.land && G.S?.lands ? G.placementMod(G.land).lvl : 0;
      const neutralLevel = G.enemyLevel(d, spawnLevel - placementLevel);
      hpBase = d.maxHp * refDps / refDpsAt(neutralLevel);
    }
    if (d.boss) atkMul *= bp.atkMult * (1 + bp.atkPerTier * tier);
    if (!d.boss && G.land && G.land.order === 0) hpBase *= CFG().firstStageHpMult || 1; // ดินแดนแรก: มอนสเตอร์เลือดน้อยลง ให้ผู้เล่นใหม่ผ่อนคลาย
    const em = (G.land && G.land.enemyMult) || 1; atkMul *= em; // ดินแดนหลังจบเกม: ศัตรูตีแรงขึ้น (HP ยังตามเป้า TTK)
    const e = { type, def: d, lvl, x, y, homeX: x, homeY: y, hp: Math.max(1, Math.round(hpBase)), maxHp: Math.max(1, Math.round(hpBase)), atk: d.atk * atkMul,
      radius: 0.3 * (d.size || 1) * (d.boss ? 0.8 : 1), state: 'idle', t: Math.random() * 2, anim: Math.random() * 5, facing: 1, moving: false,
      hurtT: 0, slowT: 0, slowMul: 1, frozenT: 0, vuln: 1, patT: (d.patternCd || 3) * 0.6 * (d.boss ? CFG().bossSpeed.patternCd : 1), patIdx: 0, dead: false, wander: null, tier };
    G.enemies.push(e);
    return e;
  };
  // บอสต่อเนื่อง (ป่าเงาหมึก): เกิดตัวแรกที่ยังไม่ตายที่กลางลาน · ตัวถัดไปเกิดหลังตัวก่อนตายเท่านั้น
  G.spawnNextBoss = function (announce) {
    const m = G.map, seq = m && m.bossSeq; if (!seq) return null;
    const i = seq.findIndex(b => !G.S.bosses[b.type]); if (i < 0) return null;
    const b = seq[i], lvl = G.landLevel(G.land) + G.mapIndex;
    const e = G.spawnEnemy(b.type, m.bossSpawn.x, m.bossSpawn.y, lvl + 1 + i, { ttk: b.ttk }); G.boss = e; e.seqIdx = i;
    if (announce) { G.effects.push({ type: 'ring', x: e.x, y: e.y, r0: 0.3, r1: 3.5, t: 0, dur: 0.6, col: '#3c7a3c' }); G.sparks(e.x, e.y, '#3c7a3c', 20); G.shake = 0.35; G.toast('บอสตัวที่ ' + (i + 1) + '/' + seq.length + ': ' + e.def.name, '#3c7a3c'); }
    return e;
  };
  G.liveEnemies = () => G.enemies.filter(e => !e.dead && !e.persuaded);
  G.isUsed = (kind, idx) => !!G.S.used[G.land.id + ':' + G.mapIndex + ':' + kind + ':' + idx];
  G.setUsed = (kind, idx) => { G.S.used[G.land.id + ':' + G.mapIndex + ':' + kind + ':' + idx] = 1; };
  G.activePortals = function () {
    const ps = G.map.portals.slice();
    { const bm = G.map, bt = bm.bossSeq ? bm.bossSeq[bm.bossSeq.length - 1].type : bm.bossSpawn && bm.bossSpawn.type; if (bm.townPortal && bt && G.S.bosses[bt] && (!G.isFarmLand(G.land) || !G.boss)) ps.push(bm.townPortal); }
    return ps;
  };
  G.npcHasQuest = id => !!PD.Quest.npcHasQuest(id);

  // ---------- การชน ----------
  // ประตูหมึก k (1..n) เปิดเฉพาะเมื่อโลกเป็นสีลำดับ k % n · n = map.inkColors (2–4: ดำ ขาว แดง ฟ้า)
  G.INK_MODES = ['black', 'white', 'red', 'blue'];
  G.gateSolid = i => { const gv = G.map.gate[i]; if (!gv) return false; return G.INK_MODES.indexOf(G.inkMode) !== gv % (G.map.inkColors || 2); };
  G.blockerOpen = id => G.isUsed('solved', id);
  G.solidAt = function (tx, ty) {
    const m = G.map; if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
    const i = ty * m.w + tx;
    if (m.grid[i] !== 0) return true;
    if (m.gate[i] && G.gateSolid(i)) return true;
    if (m.chasm[i] && G.bridgeT <= 0) return true;
    if (m.block[i] && !G.blockerOpen(m.block[i] - 1)) return true;
    return false;
  };
  G.collides = function (x, y, r) {
    for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
      if (!G.solidAt(tx, ty)) continue;
      const nx = U.clamp(x, tx, tx + 1), ny = U.clamp(y, ty, ty + 1);
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return true;
    }
    return false;
  };
  G.moveEnt = function (e, dx, dy, r) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.15));
    const sx = dx / n, sy = dy / n; let blocked = false;
    for (let i = 0; i < n; i++) {
      if (!G.collides(e.x + sx, e.y, r)) e.x += sx; else blocked = true;
      if (!G.collides(e.x, e.y + sy, r)) e.y += sy; else blocked = true;
    }
    return blocked;
  };

  // ---------- ประสบการณ์ / เลเวล ----------
  G.gainExp = function (n) {
    const P = G.S.player; if (n <= 0) return;
    P.exp += n; G.floater(G.player.x, G.player.y - 0.3, '+' + n + 'X', '#b98f00', 0.3);
    let ups = 0;
    while (P.exp >= PD.Stats.expNeed(P.level)) { P.exp -= PD.Stats.expNeed(P.level); P.level++; P.skillPoints++; ups++; }
    if (ups) {
      G.recalc(); G.player.hp = G.derived.maxHp; G.player.ink = G.derived.maxInk;
      G.effects.push({ type: 'text', text: 'LV UP', x: G.player.x, y: G.player.y, t: 0, dur: 1.0, col: '#b98f00', scale: 1 });
      G.effects.push({ type: 'ring', x: G.player.x, y: G.player.y, r0: 0.2, r1: 2.2, t: 0, dur: 0.7, col: '#e8c21a' });
      G.sparks(G.player.x, G.player.y, '#e8c21a', 18);
      PD.UI && PD.UI.levelUp && PD.UI.levelUp(P.level, ups);
      G.stats.levelUps = (G.stats.levelUps || 0) + ups;
    }
  };

  // ---------- ของ ----------
  G.giveWeapon = function (w) {
    const inv = G.S.player.inventory;
    if (inv.length >= CFG().inventoryMax) { G.pickups.push({ x: G.player.x + 0.3, y: G.player.y + 0.3, kind: 'weapon', w }); G.hint('bagfull', true); return false; }
    inv.push(w); const r = PD.Loot.rarity(w.rarity);
    G.toast('ได้รับ: ' + w.name + ' [' + r.name + ']', r.color);
    if (w.rarity !== 'normal') G.hint('weapon');
    return true;
  };
  G.toggleLock = function (uid) { const P = G.S.player; if (P.locked[uid]) delete P.locked[uid]; else P.locked[uid] = 1; };
  G.isLocked = function (uid) { return !!(G.S.player.locked || {})[uid]; };
  G.inDungeon = function () { return G.mapIndex > 0 || !!(G.map && G.map.forest); };
  // เครื่องประดับมี 2 ช่อง (acc / acc2): ระบุช่องที่เลือกอยู่ได้ · ไม่ระบุ = ช่องว่างช่องแรก · เต็มทั้งคู่ = ทับช่อง 1
  G.gearSlotFor = function (w, pref) {
    if (w.slot !== 'acc') return w.slot;
    const g = G.S.player.gear; if (pref === 'acc' || pref === 'acc2') return pref;
    return !g.acc ? 'acc' : !g.acc2 ? 'acc2' : 'acc';
  };
  G.equip = function (uid, pref) {
    const P = G.S.player, i = P.inventory.findIndex(w => w.uid === uid); if (i < 0) return;
    const w = P.inventory[i]; if (w.kind !== undefined && w.kind !== 'weapon' && w.kind !== 'gear') return;
    if (CFG().dungeonLock && G.inDungeon() && w.kind !== 'gear') { G.toast('ไม่สามารถเปลี่ยนอาวุธในดันเจี้ยน'); return; }
    if (w.kind === 'gear') { const sl = G.gearSlotFor(w, pref), old = P.gear[sl]; if (old) P.inventory[i] = old; else P.inventory.splice(i, 1); P.gear[sl] = w; }
    else { P.inventory[i] = P.weapon; P.weapon = w; }
    G.recalc();
  };
  G.unequip = function (slot) { // ถอดชุดกลับเข้ากระเป๋า
    const P = G.S.player; if (!P.gear[slot] || P.inventory.length >= CFG().inventoryMax) return false;
    P.inventory.push(P.gear[slot]); P.gear[slot] = null; G.recalc(); return true;
  };
  // active consumable: ชนิดไอเท็มที่ผู้เล่นเลือกใช้ในปุ่ม item (เปลี่ยนได้ที่กระเป๋า)
  Object.defineProperty(G, 'activeConsumable', { get() { return G.S.activeConsumable || 'potion'; }, set(v) { G.S.activeConsumable = v; }, configurable: true });
  Object.defineProperty(G, 'secondConsumable', { get() { return G.S.secondConsumable || 'inkpot'; }, set(v) { G.S.secondConsumable = v; }, configurable: true });
  G.useActiveItem = function (slot = 1) { return G.useItem(slot === 2 ? G.secondConsumable : G.activeConsumable); };
  // ยา = ไอเท็มใช้งานในกระเป๋า ซ้อนได้สูงสุด potionMax ต่อช่อง
  G.potionCount = () => G.S.player.inventory.reduce((s, it) => s + (it.kind === 'potion' ? it.n : 0), 0);
  // ไอเท็มใช้งาน (potion / inkpot / antidote) ซ้อนได้ potionMax ต่อช่อง
  G.CONSUMABLE = { potion: 1, inkpot: 1, antidote: 1 };
  G.itemCount = kind => G.S.player.inventory.reduce((s, it) => s + (it.kind === kind ? it.n : 0), 0);
  G.addItem = function (kind, n) {
    const inv = G.S.player.inventory, mx = CFG().potionMax; n = n || 1;
    for (const it of inv) if (it.kind === kind && it.n < mx) { const k = Math.min(n, mx - it.n); it.n += k; n -= k; if (!n) return true; }
    while (n > 0 && inv.length < CFG().inventoryMax) { const k = Math.min(n, mx); inv.push({ uid: PD.U.uid(), kind, n: k }); n -= k; }
    return n === 0;
  };
  G.addPotion = n => G.addItem('potion', n);
  G.takeItem = function (kind) { const P = G.S.player, st = P.inventory.find(it => it.kind === kind && it.n > 0); if (!st) return false; if (--st.n <= 0) P.inventory.splice(P.inventory.indexOf(st), 1); return true; };
  G.itemCooldownLeft = kind => G.player?.itemCooldowns?.[kind] || 0;
  G.useItem = function (kind, fromBag = false) {
    const fromOpenBag = fromBag && G.state === 'panel' && PD.UI.panelOpen() === 'bag';
    if ((G.state !== 'play' && !fromOpenBag) || !Object.hasOwn(G.CONSUMABLE, kind) || G.itemCooldownLeft(kind) > 0) return false;
    if (!consumeItem(kind)) return false;
    (G.player.itemCooldowns ||= {})[kind] = CFG().consumableCooldown;
    return true;
  };
  G.usePotion = () => G.useItem('potion');
  function consumeItem(kind) {
    const pl = G.player, D = G.derived;
    if (kind === 'potion') return consumePotion();
    if (kind === 'inkpot') { if (pl.ink >= D.maxInk || !G.takeItem('inkpot')) return false; const a = Math.round(D.maxInk * CFG().inkpotPct); pl.ink = Math.min(D.maxInk, pl.ink + a); G.floater(pl.x, pl.y, '+' + a + ' หมึก', '#2f6fd6'); G.sparks(pl.x, pl.y, '#2f6fd6', 8); return true; }
    if (kind === 'antidote') { if (!(pl.poisonT > 0)) { G.toast('ยังไม่ได้ติดพิษ', '#777'); return false; } if (!G.takeItem('antidote')) return false; pl.poisonT = 0; G.floater(pl.x, pl.y, 'หายพิษ', '#3c9a5c'); G.sparks(pl.x, pl.y, '#3c9a5c', 8); return true; }
    return false;
  }
  // ---------- ร้านค้า / ขาย / จุดรับฝาก ----------
  G.rarityTier = w => Math.max(0, PD_DATA.rarities.findIndex(r => r.id === w.rarity));
  G.sellPrice = function (it) {
    if (G.CONSUMABLE[it.kind]) { const s = CFG().shop.find(x => x.kind === it.kind); return Math.round((s ? s.price : 20) * CFG().sellConsumablePct) * it.n; }
    if (it.kind === 'artifact') { const g = PD_DATA.artifactGrades.find(x => x.id === it.grade); return Math.max(1, Math.round((g ? g.price : 80) * CFG().sellConsumablePct)); }
    // ราคาขายล็อกตามเลเวลไอเท็ม (config.sellByLevel = [[เลเวล, ราคา], ...] เส้นตรงระหว่างจุด · เกินจุดสุดท้ายต่อตามความชันช่วงสุดท้าย) × ตัวคูณความหายาก (sellRarityMult) × priceMult ของชนิดไอเท็ม
    const T = CFG().sellByLevel, bs = it.kind === 'gear' ? PD.Loot.gearBase(it.base) : PD.Loot.base(it.base), L = Math.max(1, it.ilvl || 1);
    let i = 1; while (i < T.length - 1 && L > T[i][0]) i++;
    const A = T[i - 1], B = T[i], v = A[1] + (B[1] - A[1]) * (L - A[0]) / Math.max(1, B[0] - A[0]);
    return Math.max(1, Math.round(v * ((CFG().sellRarityMult || [])[G.rarityTier(it)] || 1) * (bs && bs.priceMult || 1)));
  };
  G.purchase = function (name, price, receive) {
    const P = G.S.player;
    if ((P.lumi || 0) < price) { G.toast('Lumi ไม่พอ', '#d23a2a'); return false; }
    if (!receive()) { G.toast('กระเป๋าเต็ม ซื้อไม่ได้', '#d23a2a'); return false; }
    P.lumi = (P.lumi || 0) - price;
    G.toast('ซื้อ ' + name, '#3c9a5c');
    return true;
  };
  G.addEquipment = function (item) {
    const inv = G.S.player.inventory;
    if (inv.length >= CFG().inventoryMax) return false;
    inv.push(item);
    return true;
  };
  G.buy = function (i, arena = false) {
    const it = CFG().shop[i]; if (!it) return false;
    return G.purchase(it.name, arena ? 0 : it.price, () => G.addItem(it.kind, 1));
  };
  G.sell = function (uid) {
    const P = G.S.player, i = P.inventory.findIndex(w => w.uid === uid); if (i < 0 || G.isLocked(uid)) return 0;
    const pr = G.sellPrice(P.inventory[i]); P.inventory.splice(i, 1); P.lumi = (P.lumi || 0) + pr; G.toast('ขายได้ ' + pr + ' Lumi', '#b98f00'); return pr;
  };
  G.deposit = function (uid) {
    const P = G.S.player, i = P.inventory.findIndex(w => w.uid === uid); if (i < 0) return false;
    if (P.storage.length >= CFG().storageMax) { G.toast('ที่ฝากเต็มแล้ว', '#d23a2a'); return false; }
    P.storage.push(P.inventory.splice(i, 1)[0]); return true;
  };
  G.withdraw = function (uid) {
    const P = G.S.player, i = P.storage.findIndex(w => w.uid === uid); if (i < 0) return false;
    if (P.inventory.length >= CFG().inventoryMax) { G.hint('bagfull', true); return false; }
    P.inventory.push(P.storage.splice(i, 1)[0]); return true;
  };
  G.discard = function (uid) { const P = G.S.player; P.inventory = P.inventory.filter(w => w.uid !== uid); };

  // ---------- Artifacts ----------
  // v2.3.5: Artifact เป็นไอเท็มปกติใน P.inventory (kind:'artifact') — ซื้อ/ขาย/ล็อก/ทิ้งได้เหมือนไอเท็มทั่วไป
  // สวมใส่/ถอดทำได้เฉพาะจากหน้า Status เท่านั้น (ปุ่ม "สวมใส่ Artifact") — แตะที่ช่องไอเท็มในกระเป๋าจะแค่เลือกดูรายละเอียด ไม่สวมใส่
  G.buyArtifact = function (defId, grade, arena = false) {
    const def = PD_DATA.artifactDefs[defId]; if (!def) return false;
    const g = PD_DATA.artifactGrades.find(x => x.id === grade); if (!g) return false;
    return G.purchase(def.name + ' (' + g.name + ')', arena ? 0 : g.price,
      () => G.addEquipment({ uid: PD.U.uid(), kind: 'artifact', defId, grade }));
  };
  G.equipArtifact = function (uid, slot) {
    // v2.3.5: รับ uid ของไอเท็มใน P.inventory (ไม่ใช่ bagIdx แบบเดิม) — เรียกได้จากหน้า Status เท่านั้น
    const P = G.S.player, idx = (P.inventory || []).findIndex(it => it.uid === uid && it.kind === 'artifact'); if (idx < 0) return false;
    if (!['STR', 'VIT', 'AGI', 'INT'].includes(slot)) return false;
    const item = P.inventory[idx], def = PD_DATA.artifactDefs[item.defId]; if (!def) return false;
    if (!PD_DATA.artifactCellValue(item.defId, slot, item.grade)) return false;
    const old = (P.artifacts || {})[slot];
    P.inventory.splice(idx, 1);
    if (old) P.inventory.push(old); // ย้ายของเก่ากลับกระเป๋าเป็นไอเท็มปกติ (1 ช่อง = 1 ชิ้นเท่านั้น ถอดได้เสมอ)
    if (!P.artifacts) P.artifacts = {};
    P.artifacts[slot] = item;
    G.recalc();
    G.toast('สวม ' + def.name + ' ที่ช่อง ' + slot, '#3c9a5c');
    return true;
  };
  G.unequipArtifact = function (slot) {
    const P = G.S.player; if (!P.artifacts || !P.artifacts[slot]) return false;
    if (P.inventory.length >= CFG().inventoryMax) { G.toast('กระเป๋าเต็ม ถอดไม่ได้', '#d23a2a'); return false; }
    P.inventory.push(P.artifacts[slot]);
    P.artifacts[slot] = null;
    G.recalc();
    G.toast('ถอด Artifact', '#b98f00');
    return true;
  };
  function consumePotion() {
    const P = G.S.player, pl = G.player;
    const st = P.inventory.find(it => it.kind === 'potion' && it.n > 0);
    if (!st || pl.hp >= G.derived.maxHp) return false;
    if (--st.n <= 0) P.inventory.splice(P.inventory.indexOf(st), 1); const amt = Math.round(G.derived.maxHp * CFG().potionHealPct);
    pl.hp = Math.min(G.derived.maxHp, pl.hp + amt); G.floater(pl.x, pl.y, '+' + amt, '#3c9a5c');
    G.sparks(pl.x, pl.y, '#d23a2a', 8); return true;
  }
  G.dropLoot = function (e) {
    const d = e.def, dc = CFG().dropChance, lm = G.placementMod(G.land).loot * (e.alpha ? CFG().alpha.loot : 1);
    const drop = (w, k) => G.pickups.push({ x: e.x + (k % 2 ? 0.4 : -0.4) * (k + 1) * 0.5, y: e.y + 0.3, kind: 'weapon', w });
    G.dropLumi(e.x, e.y, Math.round(CFG().lumi.base * (1 + CFG().lumi.perLevel * (e.lvl - 1)) * (0.6 + Math.random() * 0.8) * lm * (d.boss ? CFG().lumi.bossMult : 1)), d.boss ? 6 : 1);
    const firstBossClear = d.boss && !G.S.bosses[e.type];
    const repeatFarm = d.boss && !firstBossClear && G.isFarmLand(G.land);
    const purpleInkTree = G.land.id === 'ink_tree' && G.S.lands.ink_tree?.placement === 'strange';
    const rates = d.boss ? (purpleInkTree && e.type === 'boss_eraser' ? [0, 0, 55, 40, 5] : [0, 0, 70, 28, 2]) : e.alpha ? [20, 40, 30, 9, 1] : [45, 35, 17, 2.8, 0.2];
    const type = d.boss ? 'boss' : e.alpha ? 'alpha' : 'normal';
    const dropRates = CFG().equipmentDrops;
    const baseChance = purpleInkTree && !d.boss ? (e.alpha ? 0.55 : 0.27) : dropRates[type];
    const equipmentChance = d.boss && !(firstBossClear || repeatFarm) ? 0 : baseChance;
    const accessoryKey = 'accessory' + type[0].toUpperCase() + type.slice(1);
    const dropRoll = Math.random();
    if (dropRoll < equipmentChance) {
      let roll = Math.random() * 100;
      const rarityIndex = rates.findIndex(rate => (roll -= rate) < 0);
      const rarity = PD_DATA.rarities[rarityIndex < 0 ? rates.length - 1 : rarityIndex].id;
      const ilvl = e.lvl + (d.boss ? 1 : 0);
      const category = Math.random();
      const accessories = PD_DATA.gearBases.filter(base => base.slot === 'acc');
      const isAccessory = accessories.length && dropRoll < dropRates[accessoryKey];
      let item;
      if (isAccessory) {
        item = PD.Loot.makeGear(PD.U.pick(Math.random, accessories).id, rarity, ilvl);
      } else if (category < 0.4) {
        const drops = d.drops || [];
        const weights = drops.map(entry => entry.pct ?? (entry.rate || 0) * (dc.weapon || 0) * 100);
        let baseRoll = Math.random() * weights.reduce((total, weight) => total + weight, 0);
        const base = drops[weights.findIndex(weight => (baseRoll -= weight) < 0)]?.base;
        item = PD.Loot.make(base || PD.U.pick(Math.random, PD_DATA.weaponBases).id, rarity, ilvl);
      } else {
        const slot = category < 0.7 ? 'body' : 'legs';
        const gear = PD_DATA.gearBases.filter(base => base.slot === slot);
        item = PD.Loot.makeGear(PD.U.pick(Math.random, gear).id, rarity, ilvl);
      }
      drop(item, 0);
    }
    if (d.boss) G.pickups.push({ x: e.x, y: e.y - 0.5, kind: 'potion' });
    else if (Math.random() < dc.potion) G.pickups.push({ x: e.x, y: e.y, kind: 'potion' });
  };

  G.dropLumi = function (x, y, amount, pieces) {
    amount = Math.max(1, Math.round(amount)); pieces = Math.min(pieces || 1, amount); const each = Math.floor(amount / pieces);
    for (let k = 0; k < pieces; k++) { const a = Math.random() * 6.28, r = pieces > 1 ? 0.3 + Math.random() * 0.7 : 0.2; G.pickups.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, kind: 'lumi', amount: k === pieces - 1 ? amount - each * (pieces - 1) : each }); }
  };
  // ---------- การต่อสู้ ----------
  const { STAFF, updateEnemy } = PD.Combat.install(G);

  // ---------- ตัวช่วยเอฟเฟกต์ ----------
  // แสงเรืองรอบตัวเมื่อใส่เซตครบ (แต่ละเซตต่างแบบ)
  G.auraFx = function (pl, au, dt) {
    const c = au.color, P = G.particles, t = G.time, rnd = Math.random;
    if (au.style === 'flame') { for (let k = 0; k < 3; k++) P.push({ x: pl.x + (rnd() - 0.5) * 0.7, y: pl.y + (rnd() - 0.5) * 0.4, z: rnd() * 8, vx: 0, vy: 0, vz: 30 + rnd() * 30, nog: 1, life: 0.45, max: 0.45, col: rnd() < 0.7 ? c : '#fff3b0', sz: 1 }); }
    else if (au.style === 'shadow') { if (rnd() < 0.8) { const a = rnd() * 6.28; P.push({ x: pl.x, y: pl.y, z: 4 + rnd() * 16, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, vz: 4, nog: 1, life: 0.7, max: 0.7, col: rnd() < 0.6 ? c : '#1b1b1b', sz: 1 }); } }
    else if (au.style === 'rage') { if (rnd() < 0.7) { const a = rnd() * 6.28, s = 2 + rnd() * 3; P.push({ x: pl.x, y: pl.y, z: 8 + rnd() * 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 30 + rnd() * 30, life: 0.4, max: 0.4, col: rnd() < 0.7 ? c : '#e8b923', sz: 1 }); } }
    else if (au.style === 'spark') { for (let k = 0; k < 2; k++) { const a = rnd() * 6.28, r = 0.3 + rnd() * 0.3; P.push({ x: pl.x + Math.cos(a) * r, y: pl.y + Math.sin(a) * r, z: rnd() * 24, vx: 0, vy: 0, vz: 0, nog: 1, life: 0.12, max: 0.12, col: rnd() < 0.6 ? c : '#ffffff', sz: 1 }); } if (rnd() < dt * 2) { const a = rnd() * 6.28; G.effects.push({ type: 'zap', x0: pl.x, y0: pl.y, x1: pl.x + Math.cos(a) * 0.9, y1: pl.y + Math.sin(a) * 0.9, t: 0, dur: 0.15, col: c }); } }
    else if (au.style === 'orbit') { for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.094; P.push({ x: pl.x + Math.cos(a) * 0.55, y: pl.y + Math.sin(a) * 0.55, z: 10 + Math.sin(t * 3 + k) * 6, vx: 0, vy: 0, vz: 0, nog: 1, life: 0.18, max: 0.18, col: k ? c : '#c8f0c8', sz: 1 }); } }
  };
  G.sparks = function (x, y, col, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 2.5; G.particles.push({ x, y, z: 10 + Math.random() * 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 20 + Math.random() * 40, life: 0.35 + Math.random() * 0.3, max: 0.6, col, sz: Math.random() < 0.3 ? 2 : 1 }); }
  };
  G.floater = function (x, y, text, col, delay, scale) { G.floaters.push({ x: x + (Math.random() - 0.5) * 0.3, y, z: 24, text: String(text), col, life: 0.9 + (delay || 0), scale: scale || 1 }); };
  G.later = function (t, fn) { G.timers.push({ t, fn }); };
  G.toast = (txt, col) => PD.UI && PD.UI.toast(txt, col);
  G.hint = function (key, repeat) {
    if (!G.S) return; G._hintT = G._hintT || {};
    if (G.S.hints[key] && !repeat) return;
    if (G._hintT[key] !== undefined && G.time - G._hintT[key] < 8) return;
    G._hintT[key] = G.time; G.S.hints[key] = 1; PD.UI && PD.UI.hint(PD_DATA.hints[key]);
  };
  G.onQuestChanged = function () { PD.UI && PD.UI.refreshTracker(); };

  // ---------- การโต้ตอบ ----------
  G.findInteract = function () {
    const pl = G.player, m = G.map, R = CFG().interactRange; let best = null, bd = 99;
    const consider = (d, o) => { if (d < bd) { bd = d; best = o; } };
    for (const n of G.npcs) { const d = U.dist(n.x, n.y, pl.x, pl.y); if (d < R) consider(d, { type: 'npc', label: 'คุย', ref: n }); }
    m.switches.forEach(s => { const d = U.dist(s.x + 0.5, s.y + 0.5, pl.x, pl.y); if (d < 1.3) consider(d, { type: 'switch', label: m.toggleStyle === 'fold' ? 'พับ' : 'สลับ', ref: s }); });
    m.blockers.forEach((b, i) => {
      if (G.blockerOpen(i)) return;
      if (b.kind === 'pageDoor') {
        const d = U.dist(b.x + 0.5, b.y + 0.5, pl.x, pl.y);
        if (d < 1.55) consider(d, { type: 'pageDoor', label: 'เปิดประตู', idx: i, ref: b });
      }
      if (b.kind === 'trace' && !G.trace) { const s = b.path[0], d = U.dist(s.x + 0.5, s.y + 0.5, pl.x, pl.y); if (d < 1.2) consider(d, { type: 'trace', label: 'วาดเส้น', idx: i }); }
      if (b.kind === 'circuit') {
        const cs = G.circuit[i];
        for (let k = 0; k < 4; k++) { if (cs[k]) continue; const a = b.nodes[k], c2 = b.nodes[(k + 1) % 4], mx = (a.x + c2.x) / 2 + 0.5, my = (a.y + c2.y) / 2 + 0.5;
          const d = U.dist(mx, my, pl.x, pl.y); if (d < 1.5) consider(d, { type: 'circuit', label: 'ต่อเส้น', idx: i, seg: k }); }
      }
      if (b.kind === 'erase') for (const t of b.tiles) { const d = U.dist(t % m.w + 0.5, ((t / m.w) | 0) + 0.5, pl.x, pl.y); if (d < 1.7) { consider(d, { type: 'erase', label: 'ลบ', idx: i }); break; } }
    });
    m.searchSpots.forEach((s, i) => { if (G.isUsed('search', i)) return; const d = U.dist(s.x + 0.5, s.y + 0.5, pl.x, pl.y); if (d < 1.3) consider(d, { type: 'search', label: 'ค้นหา', ref: s, idx: i }); });
    m.chests.forEach((s, i) => { if (G.isUsed('chest', i)) return; const d = U.dist(s.x + 0.5, s.y + 0.5, pl.x, pl.y); if (d < 1.3) consider(d, { type: 'chest', label: 'เปิด', ref: s, idx: i }); });
    if (G.bridgeT <= 0 && G.nearChasm(CFG().bridge.range)) consider(1.0, { type: 'bridge', label: 'วาด' });
    return best;
  };
  G.nearChasm = function (range) {
    const pl = G.player, m = G.map;
    for (let ty = Math.floor(pl.y - range); ty <= Math.floor(pl.y + range); ty++) for (let tx = Math.floor(pl.x - range); tx <= Math.floor(pl.x + range); tx++) {
      if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue;
      if (m.chasm[ty * m.w + tx] && U.dist(tx + 0.5, ty + 0.5, pl.x, pl.y) < range) return true;
    }
    return false;
  };
  // ทางที่ถูกปิดอยู่ (ประตูหมึก/พับ หรือกำแพงปริศนา) ใกล้ผู้เล่นไหม → ใช้เตือนให้หาสวิตช์/ของช่วยไข
  G.nearClosedGate = function (range) {
    const pl = G.player, m = G.map;
    for (let ty = Math.floor(pl.y - range); ty <= Math.floor(pl.y + range); ty++) for (let tx = Math.floor(pl.x - range); tx <= Math.floor(pl.x + range); tx++) {
      if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue; const i = ty * m.w + tx;
      if (((m.gate[i] && G.gateSolid(i)) || (m.block[i] && !G.blockerOpen(m.block[i] - 1))) && U.dist(tx + 0.5, ty + 0.5, pl.x, pl.y) < range) return true;
    }
    return false;
  };
  G.interact = function () {
    if (G.state !== 'play') return false;
    const it = G.findInteract(); if (!it) return false;
    const pl = G.player;
    if (it.type === 'npc') {
      const n = it.ref; n.facing = pl.x - n.x - (pl.y - n.y) > 0 ? 1 : -1;
      if ((n.def.shop || n.def.storage || n.def.artifactShop) && !PD.Quest.npcHasQuest(n.id)) {
        // ร้าน Artifact: ครั้งแรกแสดงคำอธิบายก่อนเปิดร้าน
        if (n.def.artifactShop) {
          const S = G.S;
          if (!S.used.artifact_intro) {
            S.used.artifact_intro = true;
            PD.UI.dialog(PD_DATA.dialogue.artifact_intro, () => PD.UI.openPanel('artifactShop'));
          } else { PD.UI.openPanel('artifactShop'); }
          return true;
        }
        PD.UI.openPanel(n.def.shop ? 'shop' : 'storage'); return true;
      } // พ่อค้า / จุดรับฝาก / ร้าน Artifact
      const r = PD.Quest.talk(n.id);
      PD.UI.dialog(PD_DATA.dialogue[r.dlg] || [[n.def.name, '...']], r.after);
    } else if (it.type === 'switch') {
      // ห้ามสลับถ้าประตูจะปิดทับตัวผู้เล่น
      const fold = G.map.toggleStyle === 'fold';
      const prev = G.inkMode, nC = G.map.inkColors || 2; G.inkMode = G.INK_MODES[(G.INK_MODES.indexOf(prev) + 1) % nC];
      if (G.collides(pl.x, pl.y, CFG().playerRadius)) { G.inkMode = prev; G.toast(fold ? 'ยืนทับรอยพับอยู่ พับไม่ได้' : 'ยืนทับประตูหมึกอยู่ สลับไม่ได้', '#d23a2a'); return false; }
      G.sparks(it.ref.x + 0.5, it.ref.y + 0.5, '#1b1b1b', 10); G.stats.switches = (G.stats.switches || 0) + 1;
      if (fold) { G.foldFx = 0.5; G.toast(G.inkMode === 'white' ? 'พับกระดาษ! ผนังพับเปิด/ปิดสลับกัน' : 'คลี่กระดาษกลับ', '#555'); }
      else G.toast({ white: 'โลกกลายเป็นหมึกขาว', black: 'โลกกลับเป็นหมึกดำ', red: 'โลกกลายเป็นหมึกแดง', blue: 'โลกกลายเป็นหมึกฟ้า' }[G.inkMode], { red: '#c0473a', blue: '#3a6fc0' }[G.inkMode] || '#555');
    } else if (it.type === 'trace') {
      const b = G.map.blockers[it.idx], need = b.path.length * CFG().puzzle.traceInkPerTile;
      if (pl.ink < need) { G.toast('หมึกไม่พอวาดเส้น (ต้องใช้ ' + need + ')', '#2f6fd6'); return false; }
      G.trace = { idx: it.idx, done: new Set(), t: CFG().puzzle.traceTime };
      G.toast('เริ่มวาด! เดินทับเส้นประให้ครบ ' + b.path.length + ' ช่อง', '#1b1b1b'); G.hint('trace', true);
    } else if (it.type === 'circuit') {
      const cs = G.circuit[it.idx];
      if (!cs[(it.seg + 3) % 4]) { G.toast('หมึกยังไหลมาไม่ถึง ต่อจากเส้นที่เรืองแสงก่อน', '#d23a2a'); G.hint('circuit', true); return false; }
      if (pl.ink < CFG().puzzle.circuitInk) { G.toast('หมึกไม่พอต่อเส้น', '#2f6fd6'); return false; }
      pl.ink -= CFG().puzzle.circuitInk; cs[it.seg] = 1;
      const b = G.map.blockers[it.idx], a = b.nodes[it.seg], c2 = b.nodes[(it.seg + 1) % 4];
      G.sparks((a.x + c2.x) / 2 + 0.5, (a.y + c2.y) / 2 + 0.5, '#e8c21a', 10);
      if (cs.every(Boolean)) G.solveBlocker(it.idx, 'วงจรครบ! เส้นหมึกไหลวนเปิดทาง');
      else G.toast('ต่อเส้นแล้ว ' + cs.filter(Boolean).length + '/4', '#b98f00');
    } else if (it.type === 'erase') {
      if (!G.S.tools.eraser) { G.toast('ต้องมียางลบก่อน ลองหาในห้องแถวนี้', '#777'); G.hint('erase', true); return false; }
      G.solveBlocker(it.idx, 'ลบกำแพงดินสอแล้ว!', '#999');
    } else if (it.type === 'pageDoor') {
      if (!G.isUsed('pageKey', it.ref.key)) {
        G.toast('ประตูล็อก · หากุญแจทองที่ปลายทางแยก', '#9d651b');
        return false;
      }
      G.solveBlocker(it.idx, 'ไขประตูด้วยกุญแจทองแล้ว!', '#ba851b');
    } else if (it.type === 'search') {
      G.setUsed('search', it.idx); const s = it.ref;
      G.sparks(s.x + 0.5, s.y + 0.5, '#b9b2a2', 10);
      if (s.item && !G.S.questItems[s.item]) G.getQuestItem(s.item);
      else if (Math.random() < 0.5) { G.pickups.push({ x: s.x + 0.5, y: s.y + 0.9, kind: 'potion' }); G.toast('เจอยาฟื้นฟูในกองกระดาษ', '#d23a2a'); }
      else G.toast('...ว่างเปล่า มีแต่กระดาษยับ', '#777');
    } else if (it.type === 'chest') {
      G.setUsed('chest', it.idx); const s = it.ref; G.sparks(s.x + 0.5, s.y + 0.5, '#e8c21a', 12);
      const lm = G.placementMod(G.land).loot;
      G.pickups.push({ x: s.x + 0.5, y: s.y + 1.1, kind: 'weapon', w: PD.Loot.roll(G.landLevel(G.land) + G.mapIndex, lm * 1.4, 'magic') });
      G.dropLumi(s.x + 0.5, s.y + 0.9, CFG().lumi.chest * (1 + CFG().lumi.perLevel * (G.landLevel(G.land) - 1)), 4);
    } else if (it.type === 'bridge') {
      if (pl.ink < CFG().bridge.inkCost) { G.hint('noink', true); G.toast('หมึกไม่พอวาดสะพาน', '#2f6fd6'); return false; }
      pl.ink -= CFG().bridge.inkCost; G.bridgeT = CFG().bridge.duration; G.stats.bridges = (G.stats.bridges || 0) + 1;
      G.toast('วาดสะพาน! (หายไปใน ' + CFG().bridge.duration + ' วินาที)', '#1b1b1b');
      const m = G.map; for (let i = 0; i < m.w * m.h; i++) if (m.chasm[i]) G.sparks(i % m.w + 0.5, ((i / m.w) | 0) + 0.5, '#1b1b1b', 4);
    }
    return true;
  };
  G.solveBlocker = function (idx, msg, col) {
    G.setUsed('solved', idx); const m = G.map;
    for (const t of m.blockers[idx].tiles) G.sparks(t % m.w + 0.5, ((t / m.w) | 0) + 0.5, col || '#1b1b1b', 6);
    G.toast(msg, '#3c9a5c'); G.stats.puzzles = (G.stats.puzzles || 0) + 1; G.save();
  };
  G.updateTrace = function (dt) {
    const tr = G.trace; if (!tr) return;
    const b = G.map.blockers[tr.idx], pl = G.player, cfg = CFG().puzzle;
    tr.t -= dt;
    const tx = Math.floor(pl.x), ty = Math.floor(pl.y);
    b.path.forEach((q, k) => {
      if (q.x === tx && q.y === ty && !tr.done.has(k)) {
        tr.done.add(k); pl.ink = Math.max(0, pl.ink - cfg.traceInkPerTile); G.sparks(q.x + 0.5, q.y + 0.5, '#1b1b1b', 5);
      }
    });
    if (tr.done.size === b.path.length) { G.trace = null; G.solveBlocker(tr.idx, 'วาดเส้นสำเร็จ! เส้นกลายเป็นของจริง'); return; }
    if (tr.t <= 0 || pl.ink <= 0) { G.trace = null; G.toast('หมึกแห้งก่อนวาดเสร็จ... ลองใหม่', '#d23a2a'); }
  };
  G.getQuestItem = function (item) {
    G.S.questItems[item] = true;
    G.toast('ได้ไอเท็มเควส: ' + PD_DATA.questItems[item].name, '#e8a21a');
    G.sparks(G.player.x, G.player.y, '#e8a21a', 14);
    PD.Quest.onItem(item); G.save();
  };

  // ---------- ประตู / โลก ----------
  G.checkPortals = function () {
    const pl = G.player; let onAny = false;
    for (const p of G.activePortals()) {
      if (U.dist(p.x + 0.5, p.y + 0.5, pl.x, pl.y) < 0.55) {
        onAny = true; if (G.portalLock) continue;
        G.portalLock = true; // ถามก่อนเข้าประตู
        const danger = p.to === 'next' && G.land.postgame && G.mapIndex === 0;
        PD.UI.confirm('เข้าประตูไป "' + G.portalLabel(p) + '" ไหม?' + (danger ? '\n⚠ อันตราย! ถ้าตายในดันเจี้ยนพิเศษ ของทั้งหมดจะหาย เหลือแค่เงิน (Lumi)' : ''), () => G.usePortal(p), null, 'ไป', 'ยังก่อน', danger);
        return;
      }
    }
    if (!onAny) {
      let near = false; for (const p of G.activePortals()) if (U.dist(p.x + 0.5, p.y + 0.5, pl.x, pl.y) < 1.1) near = true;
      if (!near) G.portalLock = false;
    }
  };
  G.usePortal = function (p) {
    if (p.to === 'world') { G.portalLock = true; PD.UI.openPanel('world'); return; }
    if (p.to === 'next') G.loadMap(G.land.id, G.mapIndex + 1, 'back');
    else if (p.to === 'prev') G.loadMap(G.land.id, G.mapIndex - 1, 'fwd');
    else if (p.to === 'town') {
      const finish = G.land.id === 'ink_tree' && G.S.endingStage === 'return';
      G.loadMap(G.land.id, 0, 'fwd');
      if (finish) G.finishEnding();
    }
  };
  G.portalLabel = function (p) {
    if (p.to === 'world') return 'แผนที่โลก';
    if (p.to === 'town') return 'กลับ ' + G.land.maps[0].name;
    const i = p.to === 'next' ? G.mapIndex + 1 : G.mapIndex - 1;
    return G.land.maps[i] ? G.land.maps[i].name : '';
  };
  G.placeLand = function (landId, c, r) {
    const S = G.S; if (!S.pendingPages.includes(landId)) return false;
    for (const id in S.lands) { const p = S.lands[id].placed; if (p[0] === c && p[1] === r) return false; }
    const d = U.chebyshev([c, r], CFG().worldGrid.home), pl = CFG().placement;
    const placement = d <= pl.warm.maxDist ? 'warm' : d <= pl.normal.maxDist ? 'normal' : 'strange';
    S.lands[landId] = { ...S.lands[landId], placed: [c, r], placement, completed: !!S.lands[landId]?.completed };
    S.pendingPages = S.pendingPages.filter(x => x !== landId);
    PD.Quest.activate(landId);
    G.toast('ดินแดนใหม่งอกขึ้นมา: ' + G.landById(landId).name + ' (' + pl[placement].label + ')', G.landById(landId).color);
    G.save(); return placement;
  };
  G.travel = function (landId) { if (!G.S.lands[landId]) return false; G.loadMap(landId, 0, 'world'); return true; };

  // ---------- ฉากจบ ----------
  PD.Ending.install(G);

  // ---------- ลูปหลัก ----------
  G.update = function (dt) {
    // ตัวจับเวลาที่ทำงานแม้ระหว่างบทสนทนา (สำหรับลำดับฉาก)
    if (G.state !== 'play') { G.targeting = null; return; }
    const cfg = CFG(), pl = G.player, D = G.derived, inp = PD.Input;
    G.time += dt; G.S.playTime += dt;
    if (G.S.endingStage === 'effect' && G.endingEffectDone) {
      G.endingEffectTime -= dt;
      if (G.boss) G.boss.blinkT = Math.max(0, G.endingEffectTime);
      if (G.endingEffectTime <= 0) {
        const done = G.endingEffectDone;
        G.endingEffectDone = null;
        done();
      }
      return;
    }
    // timers
    for (let i = G.timers.length - 1; i >= 0; i--) { const tm = G.timers[i]; tm.t -= dt; if (tm.t <= 0) { G.timers.splice(i, 1); tm.fn(); if (G.state !== 'play') return; } }
    // ---- ผู้เล่น ----
    PD.Status.tickPlayer(G, pl, D, dt);
    const aset = D.set && PD_DATA.gearSets.find(s => s.id === D.set); if (aset) G.auraFx(pl, aset.aura, dt);
    if (pl.castT > 0) { // กำลังร่าย/ชาร์จ: ละอองพิกเซลวิ่งเข้าหาตัว (chargeFx = สีที่ใช้)
      pl.castT = Math.max(0, pl.castT - dt);
      if (pl.castFx) for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28, r = 1.6 + Math.random() * 1.2, life = 0.35 + Math.random() * 0.25, z0 = 3 + Math.random() * 18;
        G.particles.push({ x: pl.x + Math.cos(a) * r, y: pl.y + Math.sin(a) * r, z: z0, vx: -Math.cos(a) * r / life * 2, vy: -Math.sin(a) * r / life * 2, vz: (11 - z0) / life, nog: 1, life, max: life, col: pl.castFx[k % pl.castFx.length], sz: 1 }); }
    }
    const mv = inp.move; let wdir = { x: 0, y: 0 };
    if (mv.active && (Math.abs(mv.x) > 0.15 || Math.abs(mv.y) > 0.15)) wdir = U.screenDirToWorld(mv.x, mv.y);
    if (pl.dashT > 0) {
      pl.dashT -= dt; pl.moving = true;
      G.moveEnt(pl, pl.dashV.x * dt, pl.dashV.y * dt, cfg.playerRadius);
      if (pl.dashDmg > 0) for (const e of G.liveEnemies()) if (!pl.dashHit.has(e) && U.dist(e.x, e.y, pl.x, pl.y) < 0.9 + e.radius) { pl.dashHit.add(e); G.damageEnemy(e, G.rollSkill(pl.dashDmg), { src: 'skill' }); }
      if (pl.dashFx === 'ghost') G.effects.push({ type: 'ghost', x: pl.x, y: pl.y, facing: pl.facing, anim: pl.anim, a0: 0.12 + 0.5 * (1 - Math.max(0, pl.dashT) / (pl.dashDur || 0.2)), t: 0, dur: 0.5 }); // เงาไล่ความเข้มไปหาตำแหน่งปัจจุบัน
      else if (pl.dashFx === 'warp') for (let k = 0; k < 2; k++) G.effects.push({ type: 'streak', x: pl.x, y: pl.y, ox: (Math.random() - 0.5) * 16, h: 10 + Math.random() * 16, t: 0, dur: 0.3 });
      if (pl.dashT <= 0 && pl.dashFx === 'warp') for (let k = 0; k < 5; k++) G.effects.push({ type: 'streak', x: pl.x, y: pl.y, ox: (k - 2) * 3.5, h: 26, t: 0, dur: 0.35 });
      if (pl.dashT <= 0) pl.dashFx = null;
      if (!pl.dashFx && Math.random() < 0.8) G.particles.push({ x: pl.x, y: pl.y, z: 6 + Math.random() * 10, vx: 0, vy: 0, vz: 0, life: 0.3, max: 0.3, col: '#1b1b1b', sz: 1 });
    } else {
      const mag = Math.min(1, Math.hypot(mv.x, mv.y));
      const sp = (pl.castT > 0 && pl.castStill) || pl.stunT > 0 ? 0 : cfg.playerSpeed * D.move * (pl.atk ? cfg.attackMoveMult : 1) * (mag > 0.15 ? Math.max(0.5, mag) : 0);
      pl.moving = !!(wdir.x || wdir.y) && sp > 0;
      if (pl.moving) {
        G.moveEnt(pl, wdir.x * sp * dt, wdir.y * sp * dt, cfg.playerRadius);
        pl.lastDir = wdir;
        if (!pl.atk) { const s = U.worldDirToScreen(wdir.x, wdir.y); if (Math.abs(s.x) > 0.1) pl.facing = s.x > 0 ? 1 : -1; }
      }
    }
    if (pl.moving) pl.anim += dt;
    if (inp.attackHeld && !pl.atk && pl.dashT <= 0 && !(pl.castT > 0 && pl.castStill) && !(pl.stunT > 0)) G.startAttack();
    if (pl.atk) {
      pl.atk.t += dt;
      if (!pl.atk.hit && pl.atk.t >= pl.atk.dur * (G.isStaff() ? STAFF.hitAt : cfg.attackHitAt)) {
        pl.atk.hit = true;
        G.resolveAttack();
        if (G.state !== 'play') return;
      }
      if (pl.atk && pl.atk.t >= pl.atk.dur) pl.atk = null;
    }
    // ปลายปากกาลอยตาม
    const nx = pl.x - 0.55 * pl.facing - 0.3, ny = pl.y + 0.55 * pl.facing - 0.3;
    G.nib.x += (nx - G.nib.x) * Math.min(1, dt * 4); G.nib.y += (ny - G.nib.y) * Math.min(1, dt * 4);
    // ของบนพื้น
    for (let i = G.pickups.length - 1; i >= 0; i--) {
      const p = G.pickups[i]; const pd = U.dist(p.x, p.y, pl.x, pl.y);
      if (p.kind === 'lumi' && pd < 1.6 && pd > 0.05) { const k = Math.min(1, dt * 8); p.x += (pl.x - p.x) * k; p.y += (pl.y - p.y) * k; }
      if (pd > cfg.pickupRange) continue;
      if (p.kind === 'weapon') { if (G.S.player.inventory.length >= cfg.inventoryMax) { if (!p.warned) { p.warned = 1; G.hint('bagfull', true); } continue; } G.giveWeapon(p.w); }
      else if (p.kind === 'potion') { if (!G.addPotion(1)) { if (!p.warned) { p.warned = 1; G.hint('bagfull', true); } continue; } G.toast('ได้ยาฟื้นฟู (' + G.potionCount() + ')', '#d23a2a'); }
      else if (p.kind === 'quest') G.getQuestItem(p.item);
      else if (p.kind === 'lumi') { G.S.player.lumi += p.amount; G.floater(pl.x, pl.y - 0.2, '+' + p.amount, '#d9a400'); G.stats.lumi = (G.stats.lumi || 0) + p.amount; if (PD.Sound) PD.Sound.sfx('coin'); }
      else if (p.kind === 'tool') { G.S.tools[p.item] = true; G.toast('ได้ยางลบ! ใช้ลบกำแพงดินสอได้', '#777'); G.hint('eraserGot', true); G.sparks(pl.x, pl.y, '#999', 12); }
      else if (p.kind === 'side') { G.setUsed('side', p.mapIdx); PD.Quest.onCollect(p.item); }
      else if (p.kind === 'pageKey') {
        G.setUsed('pageKey', p.item);
        G.toast('เก็บกุญแจทองแล้ว', '#ba851b');
        G.sparks(p.x, p.y, '#ffd768', 12);
        G.save();
      }
      G.pickups.splice(i, 1);
      if (G.S.endingLoot?.includes(p)) { G.S.endingLoot = G.S.endingLoot.filter(item => item !== p); G.save(); }
      if (G.state !== 'play') return;
    }
    // ---- ศัตรู / กระสุน / วงเตือน ----
    if (G.updateWorld(dt) === false) return;
    for (let i = G.lines.length - 1; i >= 0; i--) { G.lines[i].t += dt; if (G.lines[i].t > G.lines[i].dur + 0.1) G.lines.splice(i, 1); }
    for (let i = G.effects.length - 1; i >= 0; i--) { G.effects[i].t += dt; if (G.effects[i].t >= G.effects[i].dur) G.effects.splice(i, 1); }
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i]; p.life -= dt; p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5; if (!p.nog) p.vz -= 120 * dt; p.z = Math.max(0, p.z + p.vz * dt);
      if (p.life <= 0) G.particles.splice(i, 1);
    }
    if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
    for (let i = G.floaters.length - 1; i >= 0; i--) { const f = G.floaters[i]; f.life -= dt; f.z += 18 * dt; if (f.life <= 0) G.floaters.splice(i, 1); }
    // สะพานหมึก: ไม่หายใต้เท้า
    if (G.bridgeT > 0) {
      G.bridgeT -= dt;
      if (G.bridgeT <= 0) { const m = G.map, tx = Math.floor(pl.x), ty = Math.floor(pl.y); let on = false; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = tx + i, y = ty + j; if (x >= 0 && y >= 0 && x < m.w && y < m.h && m.chasm[y * m.w + x] && Math.abs(x + 0.5 - pl.x) < 0.5 + cfg.playerRadius && Math.abs(y + 0.5 - pl.y) < 0.5 + cfg.playerRadius) on = true; } if (on) G.bridgeT = 0.5; }
    }
    G.shake = Math.max(0, G.shake - dt); G.shakeHard = Math.max(0, (G.shakeHard || 0) - dt); G.foldFx = Math.max(0, (G.foldFx || 0) - dt);
    G.updateTrace(dt);
    G.checkPortals();
    // กล้อง: ตามนุ่มๆ ไม่หน่วง input
    G.updateCamera(dt);
    G.saveT = (G.saveT || 0) + dt; if (G.saveT > 5) { G.saveT = 0; G.save(); }
  };

  // ศัตรู + กระสุน + วงเตือน (แยกออกมาเพื่อให้ Host ออนไลน์เดินโลกต่อได้แม้เปิดหน้าต่าง) · ออฟไลน์เรียกจาก G.update เหมือนเดิมทุกอย่าง
  G.updateWorld = function (dt) {
    const cfg = CFG(), pl = G.player, st0 = G.state;
    if (G.net && G.net.enemyLoop) G.net.enemyLoop(dt, updateEnemy); else for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt); // ออนไลน์: เลือกเป้าหมายผู้เล่นใกล้สุด (ออฟไลน์ = เดิม)
    const live = G.liveEnemies();
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.radius + b.radius;
      if (d > 0 && d < min) { const push = (min - d) / 2; G.moveEnt(a, -dx / d * push, -dy / d * push, a.radius); G.moveEnt(b, dx / d * push, dy / d * push, b.radius); }
    }
    if (G.enemies.length > 40) G.enemies = G.enemies.filter(e => !e.dead);
    // ---- กระสุน ----
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
      const p = G.projectiles[i]; p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      let dead = p.life <= 0 || G.solidAt(Math.floor(p.x), Math.floor(p.y)) && !(G.map.chasm[Math.floor(p.y) * G.map.w + Math.floor(p.x)]);
      if (p.style !== 'wave' && Math.random() < 0.6) G.particles.push({ x: p.x, y: p.y, z: 10, vx: 0, vy: 0, vz: 5, life: 0.25, max: 0.3, col: p.col, sz: 1 });
      if (p.owner === 'enemy') {
        if (!p.ghost && G.playerActive !== false && U.dist(p.x, p.y, pl.x, pl.y) < p.r + cfg.playerRadius) { if (G.hurtPlayer(p.dmg, p)) dead = true; else if (pl.dashT <= 0 && pl.invuln <= 0) dead = true; }
        if (!dead && !p.ghost && G.net && G.net.projHitRemote && G.net.projHitRemote(p)) dead = true;
      } else {
        for (const e of G.liveEnemies()) {
          if (U.dist(p.x, p.y, e.x, e.y) > p.r + e.radius) continue;
          if (p.explode) { dead = true; break; }
          if (p.hitSet && p.hitSet.has(e)) continue;
          if (p.hitSet) p.hitSet.add(e);
          if (p.staffBolt) G.damageEnemy(e, { dmg: G.derived.staffHit * (0.9 + Math.random() * 0.2), crit: false, magic: true }, { src: 'attack', shard: true, noStagger: true }); // คทา: พลังเวทล้วน ไม่คริ ไม่ธาตุ ไม่กระเด็น ไม่ชะงัก
          else G.damageEnemy(e, G.rollSkill(p.dmg, p.magic), { src: 'skill', elem: p.elem });
          if (!p.pierce) { dead = true; break; }
        }
      }
      if (dead) {
        if (p.explode) {
          G.effects.push({ type: 'ring', x: p.x, y: p.y, r0: 0.3, r1: p.explode, t: 0, dur: 0.35, col: p.col });
          G.sparks(p.x, p.y, p.col, 16);
          for (const e of G.liveEnemies()) if (U.dist(p.x, p.y, e.x, e.y) <= p.explode + e.radius) G.damageEnemy(e, G.rollSkill(p.dmg, p.magic), { src: 'skill', elem: p.elem });
        } else G.sparks(p.x, p.y, p.col, 4);
        G.projectiles.splice(i, 1);
      }
      if (G.state !== st0) return false;
    }
    // ---- วงเตือน ----
    for (let i = G.zones.length - 1; i >= 0; i--) {
      const z = G.zones[i]; z.t += dt;
      if (z.t >= z.dur) { if (!z.ghost && G.playerActive !== false && U.dist(z.x, z.y, pl.x, pl.y) < z.r) G.hurtPlayer(z.dmg, z); if (!z.ghost && G.net && G.net.zoneHitRemote) G.net.zoneHitRemote(z); G.sparks(z.x, z.y, '#d23a2a', 10); G.zones.splice(i, 1); if (G.state !== st0) return false; }
    }
    return true;
  };

  G.step = function (dt, n) { for (let i = 0; i < (n || 1); i++) { PD.Input.poll(); G.update(dt); } PD.Render.frame(G); PD.UI.update(); };

  // Phaser: PlayScene เป็นเจ้าของลูปเกม (G.frame เรียกทุกเฟรมจาก Scene.update) — ไม่มี rAF ของตัวเองแล้ว
  G.boot = function (canvas) {
    const flush = () => { if (G.S && G.state === 'play') G.save(); }; window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    G.setupTestmap();
    G.testMode = /[?&]test=1/.test(location.search);
    PD.Render.init(canvas);
    PD.Input.init(); PD.UI.init();
    if (PD.Sound) PD.Sound.init();
    PD.UI.showTitle();
  };
  G.frame = function (dt) {
    dt = Math.min(0.05, dt);
    PD.Input.poll(); G.update(dt);
    if (G.map) PD.Render.frame(G);
    PD.UI.update();
  };
  return G;
})();
