// @ts-nocheck
// ===== mapgen: สร้างแผนที่จากข้อมูล regions.js (seed คงที่ต่อแผนที่ → ทุกครั้งได้แผนที่เดิม) =====
// grid: 0=พื้น 1=กำแพง 2=ต้นไม้ 3=บ้าน · gate: 1=ประตูหมึกดำ 2=ประตูหมึกขาว · chasm: 1=เหว
PD.MapGen = (function () {
  const U = PD.U, CS = 11;

  function walk(r, cw, ch, n) {
    const path = [[U.randInt(r, 0, cw - 1), U.randInt(r, 0, ch - 1)]];
    const used = new Set([path[0].join()]);
    while (path.length < n) {
      const [x, y] = path[path.length - 1];
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [x + d[0], y + d[1]])
        .filter(p => p[0] >= 0 && p[1] >= 0 && p[0] < cw && p[1] < ch && !used.has(p.join()));
      if (!opts.length) return null;
      const p = U.pick(r, opts); used.add(p.join()); path.push(p);
    }
    return path;
  }
  function base(w, h) {
    const g = new Uint8Array(w * h); g.fill(1);
    return { w, h, grid: g, gate: new Uint8Array(w * h), chasm: new Uint8Array(w * h), block: new Uint8Array(w * h), blockers: [], rooms: [], corr: [],
      portals: [], switches: [], searchSpots: [], pickups: [], chests: [], enemySpawns: [], npcSpots: [], puzzleEntr: [] };
  }
  function carveRect(m, x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m.grid[j * m.w + i] = 0; }
  function carveCorridor(m, a, b, r) {
    const set = new Set();
    const put = (x, y) => {
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx > 0 && yy > 0 && xx < m.w - 1 && yy < m.h - 1) { m.grid[yy * m.w + xx] = 0; set.add(yy * m.w + xx); }
      }
    };
    let x = a.cx, y = a.cy;
    const goX = tx => { while (x !== tx) { put(x, y); x += tx > x ? 1 : -1; } put(x, y); };
    const goY = ty => { while (y !== ty) { put(x, y); y += ty > y ? 1 : -1; } put(x, y); };
    if (r() < 0.5) { goX(b.cx); goY(b.cy); } else { goY(b.cy); goX(b.cx); }
    return set;
  }
  function entrances(m, roomIdx, corrIdx) {
    const R = m.rooms[roomIdx], set = m.corr[corrIdx], other = m.corr[roomIdx], out = [];
    for (let y = R.y - 1; y <= R.y + R.h; y++) for (let x = R.x - 1; x <= R.x + R.w; x++) {
      const border = x === R.x - 1 || x === R.x + R.w || y === R.y - 1 || y === R.y + R.h;
      if (!border) continue;
      const i = y * m.w + x;
      if (m.grid[i] === 0 && set.has(i) && !(other && other.has(i))) out.push(i);
    }
    return out;
  }
  function reach(m, sx, sy, blocked) {
    const seen = new Uint8Array(m.w * m.h), q = [sy * m.w + sx]; seen[q[0]] = 1;
    while (q.length) {
      const i = q.pop(), x = i % m.w, y = (i / m.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const j = ny * m.w + nx;
        if (seen[j] || m.grid[j] !== 0 || (blocked && blocked.has(j))) continue;
        seen[j] = 1; q.push(j);
      }
    }
    return seen;
  }
  function randTileInRoom(m, R, r, taken) {
    for (let t = 0; t < 60; t++) {
      const x = U.randInt(r, R.x + 1, R.x + R.w - 2), y = U.randInt(r, R.y + 1, R.y + R.h - 2);
      const k = y * m.w + x;
      if (taken.has(k) || m.grid[k] !== 0 || (x === R.cx && y === R.cy)) continue;
      taken.add(k); return { x, y };
    }
    return null;
  }

  function genDungeon(def, r) {
    const [cw, ch] = def.cells, n = def.rooms;
    const w = cw * CS + 2, h = ch * CS + 2;
    let path = null;
    for (let t = 0; t < 300 && !path; t++) path = walk(r, cw, ch, n);
    if (!path) return null;
    const m = base(w, h);
    path.forEach((c, idx) => {
      const big = def.boss && idx === n - 1;
      const r0 = def.roomMin || 5, r1 = Math.min(CS - 2, def.roomMax || 8);
      const rw = big ? CS - 2 : U.randInt(r, r0, r1), rh = big ? CS - 2 : U.randInt(r, r0, r1);
      const cx0 = 1 + c[0] * CS, cy0 = 1 + c[1] * CS;
      const x = cx0 + U.randInt(r, 1, CS - 1 - rw), y = cy0 + U.randInt(r, 1, CS - 1 - rh);
      carveRect(m, x, y, rw, rh);
      m.rooms.push({ x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) });
    });
    for (let i = 0; i < n - 1; i++) m.corr.push(carveCorridor(m, m.rooms[i], m.rooms[i + 1], r));

    // ----- ปริศนา (เลขห้อง = ห้องที่ถูกปิดทางเข้า; ของช่วยไขอยู่ห้องก่อนหน้า) -----
    const P = def.puzzle || {};
    m.block = new Uint8Array(w * h); m.blockers = [];
    const aux = new Set();
    const tog = P.ink || P.fold;
    if (tog) { // ประตูสลับ: ink = หมึก 2–4 สี (ดำ/ขาว/แดง/ฟ้า) ตามจำนวนห้อง, fold = พับกระดาษ 2 ชุด
      m.toggleStyle = P.ink ? 'ink' : 'fold'; m.inkColors = Math.min(4, tog.length);
      const KIND = ['gateBlack', 'gateWhite', 'gateRed', 'gateBlue'];
      for (let k = 0; k < m.inkColors; k++) {
        const room = tog[k], e = entrances(m, room, room - 1); if (!e.length) return null;
        e.forEach(i => m.gate[i] = k + 1); m.puzzleEntr.push({ tiles: e, room, kind: KIND[k] });
        const t = randTileInRoom(m, m.rooms[room - 1], r, aux); if (!t) return null; m.switches.push(t);
      }
    }
    if (P.bridge !== undefined) {
      const e = entrances(m, P.bridge, P.bridge - 1);
      if (!e.length) return null;
      e.forEach(i => m.chasm[i] = 1);
      m.puzzleEntr.push({ tiles: e, room: P.bridge, kind: 'chasm' });
    }
    for (const kind of ['trace', 'circuit', 'erase']) {
      if (P[kind] === undefined) continue;
      const room = P[kind], e = entrances(m, room, room - 1);
      if (!e.length) return null;
      const id = m.blockers.length, B = { kind, room, tiles: e };
      e.forEach(i => { m.block[i] = id + 1; aux.add(i); });
      const R = m.rooms[room - 1];
      if (kind === 'trace') { // เส้นประให้เดินวาดทับ
        let path = null;
        for (let t = 0; t < 40 && !path; t++) {
          const st = randTileInRoom(m, R, r, new Set(aux)); if (!st) continue;
          const pth = [st], used = new Set([st.y * w + st.x]);
          while (pth.length < 6) {
            const c = pth[pth.length - 1];
            const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => ({ x: c.x + d[0], y: c.y + d[1] }))
              .filter(q => q.x > R.x && q.y > R.y && q.x < R.x + R.w - 1 && q.y < R.y + R.h - 1 && !used.has(q.y * w + q.x) && !aux.has(q.y * w + q.x));
            if (!nb.length) break;
            const q = PD.U.pick(r, nb); used.add(q.y * w + q.x); pth.push(q);
          }
          if (pth.length === 6) path = pth;
        }
        if (!path) return null;
        path.forEach(q => aux.add(q.y * w + q.x)); B.path = path;
      } else if (kind === 'circuit') { // 4 หมุดเป็นวง
        B.nodes = [[R.x + 1, R.y + 1], [R.x + R.w - 2, R.y + 1], [R.x + R.w - 2, R.y + R.h - 2], [R.x + 1, R.y + R.h - 2]].map(([x, y]) => ({ x, y }));
        B.nodes.forEach(q => aux.add(q.y * w + q.x));
      } else if (kind === 'erase') { // ยางลบอยู่ห้องก่อนหน้า
        const t = randTileInRoom(m, R, r, aux); if (!t) return null; B.eraser = t;
      }
      m.blockers.push(B);
      m.puzzleEntr.push({ tiles: e, room, kind });
    }
    // ตรวจว่าปริศนาปิดทางจริง (ไม่มีทางอ้อม)
    const R0 = m.rooms[0];
    const all = reach(m, R0.cx, R0.cy, null);
    for (const R of m.rooms) if (!all[R.cy * w + R.cx]) return null;
    for (const pe of m.puzzleEntr) {
      const s = reach(m, R0.cx, R0.cy, new Set(pe.tiles));
      const R = m.rooms[pe.room];
      if (s[R.cy * w + R.cx]) return null;
    }

    // ----- วางของ -----
    const taken = new Set(aux);
    for (const pe of m.puzzleEntr) pe.tiles.forEach(i => taken.add(i));
    for (const sw of m.switches) taken.add(sw.y * w + sw.x);
    const last = m.rooms[n - 1];
    taken.add(last.cy * w + last.cx);
    // ประตู
    const pPrev = { x: R0.x + 1, y: R0.y + 1 }; taken.add(pPrev.y * w + pPrev.x);
    m.portals.push({ x: pPrev.x, y: pPrev.y, to: 'prev' });
    m.spawnBack = { x: R0.cx + 0.5, y: R0.cy + 0.5 };
    if (!def.boss) {
      const pn = { x: last.x + last.w - 2, y: last.y + last.h - 2 }; taken.add(pn.y * w + pn.x);
      m.portals.push({ x: pn.x, y: pn.y, to: 'next' });
      m.spawnFwd = { x: last.cx + 0.5, y: last.cy + 0.5 };
    } else {
      m.bossSpawn = { type: def.boss, x: last.cx + 0.5, y: last.cy + 0.5 };
      m.townPortal = { x: last.x + 1, y: last.y + 1, to: 'town' }; taken.add(m.townPortal.y * w + m.townPortal.x);
      m.spawnFwd = { x: last.cx + 0.5, y: last.cy + 1.5 };
    }
    // ไอเท็มเควส / กองค้นหา
    const qItem = def.items && def.items[0];
    if (P.search) {
      for (let k = 0; k < P.search; k++) {
        const roomI = k === 0 ? n - 1 : U.randInt(r, 1, n - 1);
        const t = randTileInRoom(m, m.rooms[roomI], r, taken); if (!t) return null;
        m.searchSpots.push({ x: t.x, y: t.y, item: k === 0 ? qItem : null });
      }
      U.shuffle(r, m.searchSpots);
    } else if (qItem) {
      m.pickups.push({ x: last.cx + 1.5, y: last.cy + 0.5, kind: 'quest', item: qItem });
      taken.add(last.cy * w + last.cx + 1);
    }
    const lastNormal = def.boss ? n - 2 : n - 1;
    for (let k = 0; k < (def.chests || 0); k++) {
      const t = randTileInRoom(m, m.rooms[U.randInt(r, 1, Math.max(1, lastNormal))], r, taken); if (t) m.chests.push(t);
    }
    for (let k = 0; k < (def.collect || 0); k++) {
      const t = randTileInRoom(m, m.rooms[U.randInt(r, 1, Math.max(1, lastNormal))], r, taken);
      if (t) m.pickups.push({ x: t.x + 0.5, y: t.y + 0.5, kind: 'side', idx: k });
    }
    for (const [type, cnt] of (def.enemies || [])) {
      for (let k = 0; k < cnt; k++) {
        const t = randTileInRoom(m, m.rooms[U.randInt(r, 1, Math.max(1, lastNormal))], r, taken);
        if (t) m.enemySpawns.push({ type, x: t.x + 0.5, y: t.y + 0.5 });
      }
    }
    return m;
  }

  function genTown(def, r, land) {
    const w = def.w, h = def.h, m = base(w, h);
    carveRect(m, 2, 2, w - 4, h - 4);
    m.rooms.push({ x: 2, y: 2, w: w - 4, h: h - 4, cx: w >> 1, cy: h >> 1 });
    const reserved = new Set();
    const reserve = (x, y, rad) => { for (let j = y - rad; j <= y + rad; j++) for (let i = x - rad; i <= x + rad; i++) reserved.add(j * w + i); };
    const sp = { x: w >> 1, y: h >> 1 };
    m.spawnBack = { x: sp.x + 0.5, y: sp.y + 0.5 };
    reserve(sp.x, sp.y, 2);
    const pw = { x: 2, y: h >> 1, to: 'world' }, pn = land.maps.length > 1 ? { x: w - 3, y: h >> 1, to: 'next' } : null; // ดินแดนแผนที่เดียว: ไม่มีประตูถัดไป
    m.portals.push(pw); reserve(pw.x, pw.y, 2); if (pn) { m.portals.push(pn); reserve(pn.x, pn.y, 2); }
    m.spawnFwd = pn ? { x: pn.x - 0.8, y: pn.y + 0.5 } : { x: pw.x + 1.8, y: pw.y + 0.5 };
    m.spawnWorld = { x: pw.x + 1.8, y: pw.y + 0.5 };
    for (const id in PD_DATA.npcs) {
      const nd = PD_DATA.npcs[id]; if (nd.land !== land.id || nd.indoor) continue; // indoor: วางตำแหน่งผ่าน def.room แทน
      const x = U.clamp(Math.round(nd.pos[0] * w), 3, w - 4), y = U.clamp(Math.round(nd.pos[1] * h), 3, h - 4);
      m.npcSpots.push({ id, x: x + 0.5, y: y + 0.5 }); reserve(x, y, 1);
    }
    // v2.3: บ้านที่เดินเข้าไปได้ (กำแพงรอบ + ประตูเปิดด้านล่าง) — NPC indoor (ถ้ามี) วางไว้กลางห้อง
    if (def.room) {
      const rm = def.room;
      for (let j = rm.y; j < rm.y + rm.h; j++) for (let i = rm.x; i < rm.x + rm.w; i++) {
        const edge = i === rm.x || i === rm.x + rm.w - 1 || j === rm.y || j === rm.y + rm.h - 1;
        m.grid[j * w + i] = edge ? 1 : 0;
        reserved.add(j * w + i);
      }
      const doorX = rm.x + (rm.w >> 1), doorY = rm.y + rm.h - 1;
      m.grid[doorY * w + doorX] = 0; // ประตู: เปิดกำแพงด้านล่างตรงกลาง
      if (rm.npc && PD_DATA.npcs[rm.npc]) m.npcSpots.push({ id: rm.npc, x: rm.x + (rm.w >> 1) + 0.5, y: rm.y + 1 + 0.5 });
      m.houseRoom = rm;
    }
    for (let k = 0; k < (def.houses || 0); k++) {
      for (let t = 0; t < 60; t++) {
        const hw = U.randInt(r, 2, 3), hh = U.randInt(r, 2, 3);
        const x = U.randInt(r, 3, w - 4 - hw), y = U.randInt(r, 3, h - 4 - hh);
        let ok = true;
        for (let j = y - 1; j <= y + hh && ok; j++) for (let i = x - 1; i <= x + hw; i++) if (m.grid[j * w + i] !== 0 || reserved.has(j * w + i)) { ok = false; break; }
        if (!ok) continue;
        for (let j = y; j < y + hh; j++) for (let i = x; i < x + hw; i++) m.grid[j * w + i] = 3;
        break;
      }
    }
    for (let k = 0; k < (def.trees || 0); k++) {
      for (let t = 0; t < 30; t++) {
        const x = U.randInt(r, 3, w - 4), y = U.randInt(r, 3, h - 4), i = y * w + x;
        if (m.grid[i] !== 0 || reserved.has(i)) continue;
        let near = false;
        for (let j = -1; j <= 1; j++) for (let q = -1; q <= 1; q++) if (m.grid[i + j * w + q] !== 0) near = true;
        if (near) continue;
        m.grid[i] = 2; break;
      }
    }
    // พื้นที่เข้าไม่ถึง → ปิดเป็นกำแพง
    const s = reach(m, sp.x, sp.y, null);
    for (let i = 0; i < w * h; i++) if (m.grid[i] === 0 && !s[i]) m.grid[i] = 1;
    for (const p of m.portals) if (!s[p.y * w + p.x]) return null;
    for (const n of m.npcSpots) if (!s[(n.y | 0) * w + (n.x | 0)]) return null;
    return m;
  }

  // แผนที่วาดเอง (Testmap จาก mapedit.html): rows '.'=พื้น '#'=กำแพง 'T'=ต้นไม้ 'H'=บ้าน · ขอบนอก = กำแพงเสมอ
  function genCustom(def) {
    const w = def.w, h = def.h, m = base(w, h), T = { '.': 0, '#': 1, 'T': 2, 'H': 3 };
    for (let y = 0; y < h; y++) { const row = def.rows[y] || ''; for (let x = 0; x < w; x++) m.grid[y * w + x] = x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 1 : (row[x] in T ? T[row[x]] : 1); }
    const fl = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && m.grid[y * w + x] === 0;
    if (def.theme === 'lanternCave') {
      m.lanterns = (def.lanterns || []).filter(([x, y]) => fl(x, y)).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    }
    const sp = def.spawn || { x: 1, y: 1 }; m.grid[sp.y * w + sp.x] = 0;
    m.rooms.push({ x: 1, y: 1, w: w - 2, h: h - 2, cx: sp.x, cy: sp.y });
    m.spawnBack = m.spawnFwd = m.spawnWorld = { x: sp.x + 0.5, y: sp.y + 0.5 };
    if (def.exit && fl(def.exit.x, def.exit.y)) m.portals.push({ x: def.exit.x, y: def.exit.y, to: 'world' });
    for (const e of def.enemies || []) if (PD_DATA.enemies[e[0]] && fl(e[1], e[2])) m.enemySpawns.push({ type: e[0], x: e[1] + 0.5, y: e[2] + 0.5 });
    // บอส: bosses = [[id,x,y], ...] (หลายตัว) · รองรับ boss = [id,x,y] แบบเก่า
    m.bossSpawns = (def.bosses || (def.boss ? [def.boss] : [])).filter(b => PD_DATA.enemies[b[0]] && fl(b[1], b[2])).map(b => ({ type: b[0], x: b[1] + 0.5, y: b[2] + 0.5 }));
    if (m.bossSpawns.length) m.bossSpawn = m.bossSpawns[0];
    for (const c of def.chests || []) if (fl(c[0], c[1])) m.chests.push({ x: c[0], y: c[1] });
    for (const p of def.potions || []) if (fl(p[0], p[1])) m.pickups.push({ x: p[0] + 0.5, y: p[1] + 0.5, kind: 'potion' });
    return m;
  }


  // ===== v2.0.12: ป่า — ลานหิน → ป่าไม่หนา → ป่าสูงทึบ → ทางแคบ → ลานโล่ง (ห้องบอส) · ไม่มีเมือง · เดินจากซ้ายไปขวา =====
  // zone: 0=ลานหิน 1=ป่าไม่หนา 2=ป่าสูง 3=ทางเข้าลาน 4=ลานโล่ง · treeTk: 0=พุ่ม 1=ต้นเล็ก 2=ต้นสูง 3=ไม้เก่าแก่
  function genForest(def, r, land) {
    const w = def.w || 88, h = def.h || 42, m = base(w, h), mid = h >> 1, I = (x, y) => y * w + x;
    m.forest = true; m.zone = new Uint8Array(w * h); m.treeTk = new Uint8Array(w * h); m.grid.fill(2);
    const X1 = 18, X2 = 40, X3 = 62, X4 = 68, BC = { x: 77, y: mid }, BR = 10;
    const zoneOf = x => x < X1 ? 0 : x < X2 ? 1 : x < X3 ? 2 : x < X4 ? 3 : 4;
    const reserved = new Set(), keep = (x, y, rad) => { for (let j = y - rad; j <= y + rad; j++) for (let i = x - rad; i <= x + rad; i++) if (i > 1 && j > 1 && i < w - 2 && j < h - 2) reserved.add(I(i, j)); };
    const floor = (x, y) => { if (x > 1 && y > 1 && x < w - 2 && y < h - 2) { m.grid[I(x, y)] = 0; m.zone[I(x, y)] = zoneOf(x); } };
    // 1) ลานหินตอนเริ่ม (วงรี)
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < X1; x++) { const a = (x - 9) / 7.2, b = (y - mid) / 9; if (a * a + b * b <= 1) floor(x, y); }
    // 2) ผืนป่า: ช่วง 1-2 เป็นพื้นโล่งก่อน แล้วค่อยปลูกต้นไม้ตามความหนา
    for (let y = 3; y < h - 3; y++) for (let x = X1 - 2; x < X3; x++) floor(x, y);
    // 3) ทางแคบ + ลานโล่ง (วงกลม)
    for (let y = mid - 2; y <= mid + 2; y++) for (let x = X3 - 1; x < BC.x - BR + 2; x++) floor(x, y);
    for (let y = 2; y < h - 2; y++) for (let x = BC.x - BR - 1; x <= BC.x + BR + 1; x++) { const a = x - BC.x, b = (y - BC.y) * 0.95; if (a * a + b * b <= BR * BR) floor(x, y); }
    // 4) ทางเดินรับประกันตลอดแนว (สายคดเคี้ยว กว้าง 3) + ลานย่อยที่ศัตรูเฝ้า
    const path = []; let py = mid;
    for (let x = X1 - 4; x <= X3 + 2; x++) { if (r() < 0.35) py = U.clamp(py + (r() < 0.5 ? -1 : 1), 8, h - 9); for (let k = -1; k <= 1; k++) { path.push([x, py + k]); reserved.add(I(x, py + k)); } }
    const groves = [];
    for (let k = 0; k < 7; k++) { const gx = U.randInt(r, X1 + 3, X3 - 5), gy = U.randInt(r, 7, h - 8); groves.push([gx, gy]); keep(gx, gy, 2); }
    keep(9, mid, 3); keep(BC.x, BC.y, 4); for (let y = mid - 3; y <= mid + 3; y++) for (let x = X3 - 2; x < BC.x - BR + 3; x++) reserved.add(I(x, y));
    // 5) ต้นไม้: ช่วง 1 บาง · ช่วง 2 หนาและสูง
    for (let y = 2; y < h - 2; y++) for (let x = X1 - 2; x < X3; x++) {
      const i = I(x, y); if (m.grid[i] !== 0 || reserved.has(i)) continue;
      const z = zoneOf(x), dens = z === 1 ? 0.07 + (x - X1) / (X2 - X1) * 0.07 : 0.28 + (x - X2) / (X3 - X2) * 0.14;
      if (r() < dens) m.grid[i] = 2;
    }
    // วงต้นไม้สูงรอบลานโล่ง เว้นปากทางทิศตะวันตก
    for (let y = 2; y < h - 2; y++) for (let x = BC.x - BR - 2; x <= BC.x + BR + 2; x++) { const i = I(x, y); if (m.grid[i] !== 0) continue; const a = x - BC.x, b = (y - BC.y) * 0.95, d2 = a * a + b * b; if (d2 > (BR - 1.5) * (BR - 1.5) && d2 <= BR * BR && !(a < -BR * 0.6 && Math.abs(y - mid) <= 2)) m.grid[i] = 2; }
    // พื้นที่เข้าไม่ถึง → ปิดเป็นต้นไม้
    const sp = { x: 9, y: mid }, s = reach(m, sp.x, sp.y, null);
    for (let i = 0; i < w * h; i++) if (m.grid[i] === 0 && !s[i]) m.grid[i] = 2;
    if (!s[I(BC.x, BC.y)]) return null;
    // ชนิดต้นไม้ตามโซน (ใช้ตอนวาด)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = I(x, y); if (m.grid[i] !== 2) continue; const z = zoneOf(x), hh = U.hash(x, y, 31);
      m.treeTk[i] = z === 0 ? 1 : z === 1 ? (hh < 0.4 ? 0 : 1) : z === 2 ? (hh > 0.72 ? 3 : 2) : z === 3 ? 2 : 3; }
    // ----- ของในแผนที่ -----
    const portal = { x: 3, y: mid, to: 'world' }; m.portals.push(portal); keep(portal.x, portal.y, 1);
    m.spawnBack = m.spawnFwd = m.spawnWorld = { x: 6.5, y: mid + 0.5 };
    m.rooms.push({ x: 2, y: 2, w: X1 - 2, h: h - 4, cx: 9, cy: mid }, { x: BC.x - BR, y: BC.y - BR, w: BR * 2, h: BR * 2, cx: BC.x, cy: BC.y });
    for (const id in PD_DATA.npcs) {
      const nd = PD_DATA.npcs[id]; if (nd.land !== land.id) continue;
      const x = U.clamp(Math.round(nd.pos[0] * w), 3, w - 4), y = U.clamp(Math.round(nd.pos[1] * h), 3, h - 4);
      if (m.grid[I(x, y)] !== 0) return null; m.npcSpots.push({ id, x: x + 0.5, y: y + 0.5 }); keep(x, y, 1);
    }
    const seq = (def.bosses || []).filter(b => PD_DATA.enemies[b.type]);
    m.bossSeq = seq.map(b => ({ type: b.type, ttk: b.ttk })); m.bossSpawn = { type: seq[0].type, x: BC.x + 0.5, y: BC.y + 0.5 };
    m.townPortal = { x: BC.x + BR - 2, y: BC.y, to: 'world' }; // ประตูกลับ ปรากฏหลังบอสตัวสุดท้ายตาย
    const spots = (z0, z1) => { const a = []; for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { const i = I(x, y); if (m.grid[i] === 0 && m.zone[i] >= z0 && m.zone[i] <= z1 && !reserved.has(i)) a.push([x, y]); } return a; };
    const taken = new Set(), take = (a) => { for (let t = 0; t < 40; t++) { const q = a[(r() * a.length) | 0]; if (!q) return null; const i = I(q[0], q[1]); if (!taken.has(i)) { taken.add(i); return q; } } return null; };
    const field = spots(1, 2), grove = []; for (const [gx, gy] of groves) for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (m.grid[I(gx + i, gy + j)] === 0) grove.push([gx + i, gy + j]);
    for (const [type, cnt] of (def.enemies || [])) for (let k = 0; k < cnt; k++) { const q = take(k % 2 && grove.length ? grove : field); if (q) m.enemySpawns.push({ type, x: q[0] + 0.5, y: q[1] + 0.5 }); }
    for (let k = 0; k < (def.chests || 0); k++) { const q = take(spots(2, 2)); if (q) m.chests.push({ x: q[0], y: q[1] }); }
    return m;
  }

  function finish(m) {
    const { w, h, grid } = m;
    m.wallList = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = grid[y * w + x]; if (!v) continue;
      let edge = false;
      for (let j = -1; j <= 1 && !edge; j++) for (let i = -1; i <= 1; i++) {
        const nx = x + i, ny = y + j;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && grid[ny * w + nx] === 0) { edge = true; break; }
      }
      if (!edge) continue;
      // กำแพงด้านหน้า (มีพื้นอยู่ด้านหลังในเชิงลึก) → วาดเตี้ยแบบตัดครึ่ง เพื่อไม่ให้บังห้อง
      const fl = (i, j) => i >= 0 && j >= 0 && i < w && j < h && grid[j * w + i] === 0;
      const low = v === 1 && (fl(x - 1, y) || fl(x, y - 1) || fl(x - 1, y - 1));
      m.wallList.push({ x, y, v, low, variant: ((PD.U.hash(x, y, 7) * 4) | 0) + (m.treeTk ? m.treeTk[y * w + x] * 4 : 0) });
    }
    m.corr = null; // ไม่ต้องใช้หลังสร้าง
  }

  function genOpenDesert(def, r) {
    const w = Math.max(48, Math.floor(def.w || 88)), h = Math.max(24, Math.floor(def.h || 40));
    const m = base(w, h), mid = h >> 1, bossX = w - 12, radius = 9;
    m.grid.fill(1);
    m.uniformEnemyLevel = !!def.uniformEnemyLevel;
    m.desertArena = { x: bossX, y: mid, radius };
    const spots = [];
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const shore = Math.abs(y - mid), edge = Math.min(x - 1, bossX - x);
      const dunes = x < bossX - 6 && shore <= Math.min(mid - 3, 4 + edge * 0.55 + Math.sin(x * 0.19) * 2);
      const arena = Math.hypot(x - bossX, y - mid) <= radius;
      if (!dunes && !arena) continue;
      const obstacle = dunes && !arena && x > 12 && shore > 5 && r() < 0.035;
      m.grid[y * w + x] = obstacle ? 2 : 0;
      if (!obstacle && x > 12 && x < bossX - radius - 2) spots.push({ x, y });
    }
    m.spawnBack = m.spawnFwd = m.spawnWorld = { x: 6.5, y: mid + 0.5 };
    m.portals.push({ x: 3, y: mid, to: 'prev' });
    m.townPortal = { x: bossX + radius - 2, y: mid, to: 'town' };
    m.rooms.push({ x: 2, y: 2, w: bossX - radius - 2, h: h - 4, cx: 6, cy: mid },
      { x: bossX - radius, y: mid - radius, w: radius * 2 + 1, h: radius * 2 + 1, cx: bossX, cy: mid });
    m.bossSpawn = { type: def.boss, x: bossX + 0.5, y: mid + 0.5 };
    const connected = reach(m, 6, mid, null);
    const available = spots.filter(({ x, y }) => connected[y * w + x]);
    const takeSpot = () => available.splice(Math.floor(r() * available.length), 1)[0];
    for (const [type, count] of def.enemies || []) {
      for (let i = 0; i < count && available.length; i++) {
        const { x, y } = takeSpot();
        m.enemySpawns.push({ type, x: x + 0.5, y: y + 0.5 });
      }
    }
    for (let i = 0; i < (def.chests || 0) && available.length; i++) m.chests.push(takeSpot());
    return m;
  }

  function decorateDungeon(m, theme) {
    const start = m.spawnBack;
    const origin = Math.floor(start.y) * m.w + Math.floor(start.x);
    const distances = new Int16Array(m.w * m.h).fill(-1);
    const queue = [origin]; distances[origin] = 0;
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k], x = i % m.w, y = Math.floor(i / m.w);
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy, next = ny * m.w + nx;
        if (nx < 0 || nx >= m.w || ny < 0 || ny >= m.h || m.grid[next] !== 0 || distances[next] >= 0) continue;
        distances[next] = distances[i] + 1; queue.push(next);
      }
    }
    if (theme === 'fairy') {
      const boss = m.bossSpawn;
      const end = boss ? distances[Math.floor(boss.y) * m.w + Math.floor(boss.x)] : -1;
      m.fairyLight = { distances, span: end > 8 ? end : Math.max(1, distances[queue.at(-1)]) };
      return;
    }
    m.rockCave = true;
    m.lanterns = [];
    const torches = new Set();
    for (const i of queue) {
      const x = i % m.w, y = Math.floor(i / m.w);
      const bucket = Math.floor(x / 7) + ':' + Math.floor(y / 7);
      if (torches.has(bucket) || (i !== origin && ![i - 1, i + 1, i - m.w, i + m.w].some(index => m.grid[index] === 1))) continue;
      if (m.lanterns.some(lamp => Math.hypot(lamp.x - x - 0.5, lamp.y - y - 0.5) < 4)) continue;
      torches.add(bucket);
      m.lanterns.push({ x: x + 0.5, y: y + 0.5, wall: i !== origin });
    }
  }

  const BOOK_STEPS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  function bookDistances(m, start) {
    const distances = new Int16Array(m.grid.length).fill(-1), queue = [start];
    distances[start] = 0;
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k], x = i % m.w, y = Math.floor(i / m.w);
      for (const [dx, dy] of BOOK_STEPS) {
        const j = (y + dy) * m.w + x + dx;
        if (m.grid[j] !== 0 || distances[j] >= 0) continue;
        distances[j] = distances[i] + 1;
        queue.push(j);
      }
    }
    return distances;
  }

  function genBookMaze(def, r) {
    const folded = def.book === 'folded';
    const m = base(folded ? 76 : 57, 42), index = (x, y) => y * m.w + x;
    const carve = points => {
      const tiles = [];
      for (let segment = 1; segment < points.length; segment++) {
        let [x, y] = points[segment - 1];
        const [endX, endY] = points[segment];
        const dx = Math.sign(endX - x), dy = Math.sign(endY - y);
        if (dx && dy) throw new Error('Book maze segments must be orthogonal');
        while (x !== endX || y !== endY) {
          m.grid[index(x, y)] = 0; tiles.push([x, y]);
          x += dx; y += dy;
        }
      }
      const [x, y] = points.at(-1);
      m.grid[index(x, y)] = 0; tiles.push([x, y]);
      return tiles;
    };
    let start, exit, chamber;
    const encounterTiles = [];
    const patrolTiles = [];
    let lampRoute = [];
    if (folded) {
      start = [7, 17]; exit = [4, 17];
      chamber = { x: 64, y: 21, w: 10, h: 10 };
      carveRect(m, 3, 13, 8, 9);
      const corridor = points => {
        for (let i = 1; i < points.length; i++) {
          const [ax, ay] = points[i - 1], [bx, by] = points[i];
          carveRect(m, Math.min(ax, bx), Math.min(ay, by), Math.max(2, Math.abs(bx - ax) + 1), Math.max(2, Math.abs(by - ay) + 1));
        }
      };
      corridor([start, [14, 17], [14, 8], [30, 8], [30, 20], [42, 20], [42, 8], [52, 8], [52, 25], [64, 25]]);
      const branches = [
        [[14, 12], [11, 12], [11, 4], [3, 4]],
        [[19, 8], [19, 13]],
        [[30, 14], [36, 14]],
        [[35, 20], [35, 35], [21, 35]],
        [[52, 14], [58, 14]],
        [[52, 25], [52, 36], [46, 36]]
      ];
      branches.forEach(corridor);
      for (const [id, x, y, keyX, keyY] of [[0, 24, 8, 3, 4], [1, 48, 8, 21, 35]]) {
        const tiles = [index(x, y), index(x, y + 1)];
        tiles.forEach(tile => { m.block[tile] = id + 1; });
        m.blockers.push({ kind: 'pageDoor', tiles, x, y, key: id });
        m.pickups.push({ x: keyX + 0.5, y: keyY + 0.5, kind: 'pageKey', item: id });
      }
      for (const [x, y, art] of [[4,14,'house'],[7,14,'house'],[9,15,'house'],[4,20,'house'],[8,20,'house'],[6,19,'tree'],[9,19,'stall']]) {
        m.grid[index(x, y)] = art === 'house' ? 3 : 2;
        m.paperProps ??= {};
        m.paperProps[index(x, y)] = art;
      }
      const pockets = [[19, 13], [36, 14], [30, 35], [58, 14], [46, 36], [59, 25]];
      for (const [x, y] of pockets) {
        carveRect(m, x - 2, y - 2, 5, 5);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) encounterTiles.push([x + dx, y + dy]);
      }
      patrolTiles.push([12, 17], [14, 9], [15, 10], [28, 8], [31, 17], [38, 20], [39, 21],
        [42, 12], [52, 19], [53, 20], [63, 25]);
    } else {
      const cols = 8, rows = 7, nodes = Array.from({ length: cols * rows }, (_, i) => ({
        x: 5 + i % cols * 5, y: 5 + Math.floor(i / cols) * 5, parent: -1, path: null
      }));
      const stack = [0], seen = new Set(stack);
      while (stack.length) {
        const i = stack.at(-1), x = i % cols, y = Math.floor(i / cols);
        const choices = BOOK_STEPS.map(([dx, dy]) => [x + dx, y + dy])
          .filter(([nx, ny]) => nx >= 0 && nx < cols && ny >= 0 && ny < rows && !seen.has(ny * cols + nx));
        if (!choices.length) { stack.pop(); continue; }
        const [nx, ny] = U.pick(r, choices), j = ny * cols + nx;
        const a = nodes[i], b = nodes[j];
        const bend = r() < 0.5 ? -1 : 1;
        const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
        b.parent = i;
        b.path = carve([
          [a.x, a.y],
          [a.x + 2 * dx, a.y + 2 * dy],
          [a.x + 2 * dx + dy * bend, a.y + 2 * dy + dx * bend],
          [a.x + 3 * dx + dy * bend, a.y + 3 * dy + dx * bend],
          [a.x + 3 * dx, a.y + 3 * dy],
          [b.x, b.y]
        ]);
        seen.add(j); stack.push(j);
      }
      const route = [];
      for (let i = nodes.length - 1; nodes[i].parent !== -1; i = nodes[i].parent) route.push(nodes[i].path);
      if (route.length < 13 || route.length > 37) return null;
      lampRoute = route.reverse().flat().filter(([x, y], i, points) => i === 0 || x !== points[i - 1][0] || y !== points[i - 1][1]);
      start = [5, 5]; exit = [3, 5];
      const end = nodes.at(-1);
      chamber = { x: 46, y: end.y - 4, w: 9, h: 9 };
      carve([[end.x, end.y], [46, end.y]]);
      carveRect(m, 3, 3, 5, 4);
      for (const [i, { x, y }] of nodes.entries()) {
        if (i < 2 || i === nodes.length - 1) continue;
        encounterTiles.push([x, y]);
        if (i % 7 === 2) {
          carveRect(m, x - 1, y - 1, 3, 3);
          encounterTiles.push([x - 1, y], [x + 1, y]);
        }
      }
    }
    carveRect(m, chamber.x, chamber.y, chamber.w, chamber.h);
    const cx = chamber.x + Math.floor(chamber.w / 2), cy = chamber.y + Math.floor(chamber.h / 2);
    m.spawnBack = m.spawnFwd = m.spawnWorld = { x: start[0] + 0.5, y: start[1] + 0.5 };
    m.portals.push({ x: exit[0], y: exit[1], to: 'world' });
    m.bossSpawn = { type: def.boss, x: cx + 0.5, y: cy + 0.5 };
    m.townPortal = { x: cx + 2, y: cy, to: 'world' };
    const distances = bookDistances(m, index(...start));
    m.book = {
      style: def.book, revision: folded ? 2 : 1, chamber, distances, span: distances[index(cx, cy)],
      lamps: lampRoute.filter((_, i) => i % 23 === 8 && i < lampRoute.length - 13)
        .map(([x, y]) => ({ x: x + 0.5, y: y + 0.5, wall: true }))
    };
    U.shuffle(r, encounterTiles);
    const available = encounterTiles.filter(([x, y]) => distances[index(x, y)] >= 7 && !m.block[index(x, y)]
      && !m.pickups.some(p => Math.floor(p.x) === x && Math.floor(p.y) === y));
    for (let i = 0; i < (def.chests || 0) && available.length; i++) {
      const [x, y] = available.pop(); m.chests.push({ x, y });
    }
    if (folded) {
      const types = (def.enemies || []).flatMap(([type, count]) => Array(count).fill(type));
      U.shuffle(r, types);
      const positions = [...patrolTiles, ...available];
      types.forEach((type, i) => {
        const [x, y] = positions[i];
        m.enemySpawns.push({ type, x: x + 0.5, y: y + 0.5 });
      });
    } else for (const [type, count] of def.enemies || []) {
      for (let i = 0; i < count && available.length; i++) {
        const [x, y] = available.pop();
        m.enemySpawns.push({ type, x: x + 0.5, y: y + 0.5 });
      }
    }
    return m;
  }

  function generate(land, mapIndex) {
    const def = land.maps[mapIndex];
    const seed = U.strSeed(land.id + ':' + mapIndex);
    for (let attempt = 0; attempt < 60; attempt++) {
      const r = U.rng(seed + attempt * 7919);
      const m = def.book ? genBookMaze(def, r) : def.type === 'custom' ? genCustom(def) : def.type === 'town' ? genTown(def, r, land) : def.type === 'forest' ? genForest(def, r, land) : def.type === 'openDesert' ? genOpenDesert(def, r) : genDungeon(def, r);
      if (m) { m.attempt = attempt; m.type = def.type; m.name = def.name; m.landId = land.id; m.mapIndex = mapIndex; if (def.type === 'dungeon') {
        if (land.id === 'slime_cave') m.softCave = true;
        else if (['fairy', 'cave'].includes(land.theme)) decorateDungeon(m, land.theme);
      } if (m.lanterns) m.rockCave = true; finish(m); return m; }
    }
    throw new Error('mapgen failed: ' + land.id + ' #' + mapIndex);
  }
  return { generate, reach };
})();
