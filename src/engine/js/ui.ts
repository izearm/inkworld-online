// @ts-nocheck
// ===== ui: HUD, ปุ่ม, กระเป๋า, สกิล, สถานะ, เควส, แผนที่โลก, บทสนทนา, หน้าจอ title/ตาย/จบ =====
PD.UI = (function () {
  const UI = {}, $ = id => document.getElementById(id), G = () => PD.Game;
  let accPref = null, dlg = null, cache = {}, selUid = null, cmpOn = false, eqSel = null, panelName = null, hintTimer = null, sellQueue = {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const setTxt = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
  const setW = (id, v) => { v = Math.round(v * 1000) / 10; if (cache[id] !== v) { cache[id] = v; $(id).style.width = v + '%'; } };

  UI.init = function () {
    document.querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => UI.openPanel(b.dataset.panel)));
    $('panel').querySelector('.pclose').addEventListener('click', () => UI.closePanel());
    $('panel').addEventListener('pointerdown', e => { if (e.target.id === 'panel') UI.closePanel(); });
    $('dialog').addEventListener('pointerdown', e => { e.preventDefault(); UI.dialogNext(); });
    $('rotate-x').addEventListener('click', () => { UI.rotateDismissed = true; $('rotate').classList.add('hidden'); });
    const chkRot = () => $('rotate').classList.toggle('hidden', UI.rotateDismissed || window.innerWidth >= window.innerHeight);
    window.addEventListener('resize', chkRot); chkRot();
  };

  // ---------- จอ title / ตาย / จบ ----------
  UI.overlay = function (html, dim) { const o = $('overlay'); o.innerHTML = html; o.className = 'on' + (dim ? ' dim' : ''); };
  UI.hideOverlay = function () { $('overlay').className = ''; $('overlay').innerHTML = ''; UI.showHud(true); };
  UI.showHud = on => { $('hud').classList.toggle('hidden', !on); $('controls').classList.toggle('hidden', !on); };
  // ---------- โหมดเต็มหน้าจอ: ถามตอนเข้าเกม + ปุ่มสลับในเมนูหยุด (iPhone Safari ไม่รองรับ → ไม่ถาม) ----------
  const DE = document.documentElement;
  UI.fsAvail = () => !!(DE.requestFullscreen || DE.webkitRequestFullscreen);
  UI.isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  UI.setFs = function (on) {
    try { const r = on ? (DE.requestFullscreen || DE.webkitRequestFullscreen).call(DE) : (document.exitFullscreen || document.webkitExitFullscreen).call(document); r && r.catch && r.catch(() => { }); } catch (_) { }
  };
  function askFs(start) {
    if (!UI.fsAvail() || UI.isFs() || UI.fsAsked || navigator.webdriver) { start(); return; }
    UI.fsAsked = true;
    UI.confirm('เข้าโหมดเต็มหน้าจอไหม?', () => { UI.setFs(true); start(); }, start, '⛶ เต็มหน้าจอ', 'ไม่ใช้');
  }
  UI.showTitle = function () {
    UI.showHud(false); if (PD.Sound) PD.Sound.stopMusic(); // กลับหน้าแรก = หยุดเพลง (เดิมเพลงค้าง)
    const has = PD.Save.has();
    UI.overlay('<h1>Paper Dungeon</h1><h2>โลกหมึก · Ink World</h2>' +
      '<p>โลกถูกลบจนเหลือกระดาษขาว คุณคือนักวาดคนสุดท้ายที่ยังมีหมึก<br>เก็บหน้ากระดาษ วางลงบนแผนที่ แล้วช่วยฟังเรื่องของคนอื่น</p>' +
      '<div class="obtns">' + (has ? '<button id="ob-cont">เล่นต่อ</button>' : '') + '<button id="ob-new">เริ่มเรื่องใหม่</button></div>' +
      '<div class="small">มือถือ: แนวนอน · จอยซ้าย / ปุ่มฟัน+สกิลขวา &nbsp;|&nbsp; PC: WASD เดิน · 1–3 สกิล · 4 / คลิกซ้าย โจมตี · คลิกขวา สกิล 1</div>');
    if (has) $('ob-cont').onclick = () => askFs(() => { UI.hideOverlay(); G().continueGame(); });
    $('ob-new').onclick = () => {
      if (has && !confirmNew()) return;
      askFs(() => { UI.hideOverlay(); G().newGame(); });
    };
  };
  function confirmNew() { try { return window.confirm('เริ่มใหม่จะลบเซฟเดิม ตกลงไหม?'); } catch (e) { return true; } }
  UI.showDead = function (loss, lost) {
    UI.showHud(false);
    UI.overlay('<h1>หมึกจางหาย...</h1><h2>เส้นของเธอถูกลบไปชั่วครู่</h2><p>เสีย EXP ' + loss + ' · กลับไปตื่นที่ "' + esc(G().land.maps[0].name) + '"</p>' + (lost ? '<p style="color:#c0201a"><b>ดันเจี้ยนพิเศษ: ของทั้งหมดหาย ' + lost + ' ชิ้น เหลือแค่เงิน (Lumi)</b></p>' : '') + '<div class="obtns"><button id="ob-res">วาดตัวเองขึ้นใหม่</button></div>', true);
    $('ob-res').onclick = () => G().respawn();
  };
  UI.showEnding = function () {
    UI.showHud(false);
    const S = G().S, t = Math.round(S.playTime / 60);
    UI.overlay('<h1>— จบ —</h1><h2>เรื่องใหม่ที่วาดด้วยกัน</h2>' +
      '<p>Lv ' + S.player.level + ' · ล้มศัตรู ' + S.kills + ' · ตาย ' + S.deaths + ' · ' + t + ' นาที</p>' +
      '<p style="opacity:.7">ไม่มีใครเป็นวีรบุรุษ แต่ทุกคนเลือกจะจำ<br>...และนั่นก็อบอุ่นพอแล้ว</p>' +
      '<div class="obtns"><button id="ob-free">เดินเล่นในโลกต่อ</button><button id="ob-title">หน้าแรก</button></div>');
    $('ob-free').onclick = () => G().continueAfterEnding();
    $('ob-title').onclick = () => { G().state = 'title'; UI.showTitle(); };
  };

  // ---------- บทสนทนา ----------
  UI.dialog = function (lines, onDone) {
    if (!lines || !lines.length) { onDone && onDone(); return; }
    const g = G();
    dlg = { lines, i: 0, onDone, prev: g.state === 'dialog' ? 'play' : g.state };
    g.state = 'dialog'; PD.Input.attackHeld = false;
    $('dialog').classList.remove('hidden'); showLine();
  };
  function showLine() {
    const [who, txt] = dlg.lines[dlg.i];
    $('dialog').querySelector('.who').textContent = who;
    $('dialog').querySelector('.txt').textContent = txt;
    $('dialog').classList.toggle('narr', !who);
  }
  UI.dialogNext = function () {
    if (!dlg) return;
    dlg.i++;
    if (dlg.i < dlg.lines.length) { showLine(); return; }
    const d = dlg; dlg = null; $('dialog').classList.add('hidden');
    const g = G(); if (g.state === 'dialog') g.state = d.prev === 'dialog' ? 'play' : (d.prev || 'play');
    if (g.state === 'title') g.state = 'play';
    d.onDone && d.onDone();
    UI.refreshTracker();
  };
  UI.inDialog = () => !!dlg;

  // ---------- กล่องถามยืนยัน ----------
  UI.confirm = function (text, onYes, onNo, yesL, noL, danger) {
    const g = G(), box = $('confirm'), prev = g.state;
    box.querySelector('.cq').textContent = text; box.classList.toggle('danger', !!danger); // danger = ข้อความเตือนสีแดง
    box.querySelector('#cf-yes').textContent = yesL || 'ตกลง'; box.querySelector('#cf-no').textContent = noL || 'ยกเลิก';
    box.classList.remove('hidden'); PD.Input.attackHeld = false;
    if (prev === 'play') g.state = 'confirm';
    const done = yes => { box.classList.add('hidden'); if (g.state === 'confirm') g.state = 'play'; UI._cf = null; (yes ? onYes : onNo) && (yes ? onYes : onNo)(); };
    UI._cf = done;
    box.querySelector('#cf-yes').onclick = () => done(true);
    box.querySelector('#cf-no').onclick = () => done(false);
  };
  UI.confirmAnswer = yes => UI._cf && UI._cf(yes);
  UI.confirmOpen = () => !!UI._cf;
  // popup ข้อมูลล้วน (ปุ่มเดียว ปิดได้)
  UI.info = function (html) {
    const g = G(), box = $('confirm'), prev = g.state, btnRow = box.querySelector('.btnrow');
    box.querySelector('.cq').innerHTML = html; box.classList.remove('danger', 'hidden'); PD.Input.attackHeld = false;
    if (prev === 'play') g.state = 'confirm';
    btnRow.innerHTML = '<button id="cf-no">ปิด</button>';
    const done = () => { box.classList.add('hidden'); btnRow.innerHTML = '<button id="cf-yes">ตกลง</button><button id="cf-no">ยกเลิก</button>'; if (g.state === 'confirm') g.state = 'play'; UI._cf = null; };
    UI._cf = done; btnRow.querySelector('#cf-no').onclick = done;
  };
  // popup เลือกช่องสกิล 1/2/3
  UI.slotPick = function (skillId, info) {
    const g = G(), box = $('confirm'), prev = g.state;
    const P = g.S.player, slots = [0,1,2].map(i => { const d = P.slots[i] && PD.Skills.def(P.slots[i]); return (d ? d.icon + ' ' + d.name : '—'); });
    box.querySelector('.cq').innerHTML = 'เลือกช่องสกิล:';
    box.classList.remove('danger', 'hidden'); PD.Input.attackHeld = false;
    if (prev === 'play') g.state = 'confirm';
    const btnRow = box.querySelector('.btnrow');
    btnRow.innerHTML = [0,1,2].map(i => '<button class="sl-pick" data-sl="' + i + '">' + (i+1) + ') ' + slots[i] + '</button>').join('') + '<button id="cf-no">ยกเลิก</button>';
    const done = (slot) => { box.classList.add('hidden'); btnRow.innerHTML = '<button id="cf-yes">ตกลง</button><button id="cf-no">ยกเลิก</button>'; if (g.state === 'confirm') g.state = 'play'; UI._cf = null; if (slot != null) { PD.Skills.equip(skillId, slot); UI.renderPanel(); } };
    UI._cf = () => done(null);
    btnRow.querySelectorAll('.sl-pick').forEach(b => b.onclick = () => done(+b.dataset.sl));
    btnRow.querySelector('#cf-no').onclick = () => done(null);
  };
  // v2.3.6: หน้าสวมใส่ Artifact — เปิดแล้วเห็นภาพรวม 4 ช่อง STR/VIT/AGI/INT ก่อน (ช่องไหนว่างโชว่าง) · กดช่องไหน → เปิดกริดไอเท็ม (เฉพาะ Artifact ในกระเป๋า) → เลือกแล้วย้อนกลับมาหน้าภาพรวมอัตโนมัติ
  // ใช้ overlay #confirm เดียวกับ slotPick (DOM คงที่ เสถียรกว่าปุ่มในพาเนลที่ re-render บ่อย)
  UI.statusArtifactPick = function () {
    const g = G(), box = $('confirm'), prev = g.state;
    const P = g.S.player;
    box.classList.remove('danger', 'hidden'); PD.Input.attackHeld = false;
    if (prev === 'play') g.state = 'confirm';
    const btnRow = box.querySelector('.btnrow'), cq = box.querySelector('.cq');
    const done = () => { box.classList.add('hidden'); btnRow.innerHTML = '<button id="cf-yes">ตกลง</button><button id="cf-no">ยกเลิก</button>'; if (g.state === 'confirm') g.state = 'play'; UI._cf = null;  };
    const showOverview = () => {
      cq.innerHTML = 'ใส่ Artifact';
      btnRow.innerHTML = ['STR', 'VIT', 'AGI', 'INT'].map(s => {
        const a = (P.artifacts || {})[s], def = a && PD_DATA.artifactDefs[a.defId], cell = a && PD_DATA.artifactCellValue(a.defId, s, a.grade);
        return '<button class="art-slot-row" data-sl="' + s + '" style="width:100%;display:flex;align-items:center;gap:8px;text-align:left">' +
          '<b style="min-width:32px">' + s + '</b>' +
          '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:2px solid #1b1b1b;flex:0 0 auto">' + (def ? artifactIcon(a) : '') + '</span>' +
          '<span class="wl">' + (cell ? artifactBonusHtml(cell) : '-') + '</span></button>';
      }).join('') + '<button id="cf-no">ปิด</button>';
      btnRow.querySelectorAll('.art-slot-row').forEach(b => b.onclick = () => showItemPick(b.dataset.sl));
      btnRow.querySelector('#cf-no').onclick = () => done(false);
    };
    const showItemPick = (slot) => {
      const bag = (P.inventory || []).filter(it => it.kind === 'artifact' && PD_DATA.artifactDefs[it.defId]);
      const cur = (P.artifacts || {})[slot];
      cq.innerHTML = 'เลือก Artifact ลงช่อง <b>' + slot + '</b>';
      const tiles = bag.map(it => { const def = PD_DATA.artifactDefs[it.defId], gr = PD_DATA.artifactGrades.find(x => x.id === it.grade);
        return '<div class="slot art-tile art-pick-tile" data-uid="' + it.uid + '" style="--rc:' + (gr ? gr.color : '#3a3a3a') + '">' + artifactIcon(it) + '</div>'; }).join('');
      btnRow.innerHTML = '<div class="slots" style="width:100%;max-height:140px;overflow-y:auto">' + (tiles || '<span class="wl" style="opacity:.6;grid-column:1/-1">ไม่มี Artifact ในกระเป๋า</span>') + '</div>' +
        (cur ? '<button id="b-unequip-pick">ถอดออก</button>' : '') + '<button id="cf-back">← กลับ</button>';
      btnRow.querySelectorAll('.art-pick-tile').forEach(t => t.onclick = () => { if (g.equipArtifact(t.dataset.uid, slot) && panelName) UI.renderPanel(); showOverview(); });
      const un = btnRow.querySelector('#b-unequip-pick'); if (un) un.onclick = () => { if (g.unequipArtifact(slot) && panelName) UI.renderPanel(); showOverview(); };
      btnRow.querySelector('#cf-back').onclick = () => showOverview();
    };
    UI._cf = () => done(false);
    showOverview();
  };
  // ---------- toast / hint ----------
  UI.toast = function (txt, col) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = txt; el.style.color = col || '#1b1b1b';
    const box = $('toasts'); box.appendChild(el); while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), 3300);
  };
  UI.levelUp = function (lv, pts) {
    const el = $('lvup'); el.textContent = '▲ Lv ' + lv + ' · แต้มสกิล +' + pts;
    el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(UI._lvT); UI._lvT = setTimeout(() => el.classList.add('hidden'), 2600);
  };
  UI.hint = function (txt) {
    if (!txt) return; $('hinttxt').textContent = txt; $('hint').classList.remove('hidden');
    clearTimeout(hintTimer); hintTimer = setTimeout(() => $('hint').classList.add('hidden'), 5200);
  };

  // ---------- HUD ----------
  UI.onMapLoaded = function () {
    const g = G(), ls = g.S.lands[g.land.id];
    $('bossbar').classList.toggle('dark-scene', g.map.book?.style === 'graphite');
    const mn = g.land.maps[g.mapIndex].name; setTxt('mapname', mn === g.land.name ? mn : g.land.name + ' · ' + mn);
    { const el = $('mapname'); el.classList.remove('intro'); void el.offsetWidth; el.classList.add('intro'); clearTimeout(UI._mapT); UI._mapT = setTimeout(() => el.classList.remove('intro'), PD_DATA.config.mapNameIntro * 1000); } // ชื่อพื้นที่: โชว์กลางจอชั่วคราว แล้วเลื่อนเป็นป้ายเล็ก
    const pl = ls && ls.placement !== 'home' ? PD_DATA.config.placement[ls.placement].label : 'บ้าน';
    setTxt('landmood', g.land.name);
    $('landmood').title = mn + ' · ' + pl;
    $('bossbar').classList.add('hidden');
    UI.refreshTracker(); UI.showHud(g.state !== 'title');
  };
  // หลอดเลือดบอส v2.0.9: ติดตามบอสที่กำลังสู้จริง (ใกล้สุดที่ไม่ได้อยู่ในสถานะพัก) · หลอดหลายชั้น: 1 ชั้น = hpPerBar HP จริง (ชั้นล่างสุดสีแรก) · เกินชั้นสูงสุดที่ตั้งไว้ → ปรับ HP ต่อชั้นให้พอดี
  UI.renderBossBar = function (g) {
    const box = $('bossbar'); let bo = null, bd = 1e9;
    for (const e of g.enemies) { if (!e.def.boss || e.dead || e.persuaded || e.state === 'idle' || e.state === 'recovery') continue; const d = PD.U.dist(e.x, e.y, g.player.x, g.player.y); if (d < bd) { bd = d; bo = e; } }
    if (!bo) { box.classList.add('hidden'); UI._bossId = null; return; }
    const C = PD_DATA.config.bossBar, per = Math.max(C.hpPerBar, bo.maxHp / C.maxBars), n = Math.max(1, Math.ceil(bo.maxHp / per - 1e-9));
    const k = Math.min(n - 1, Math.max(0, Math.ceil(Math.max(0, bo.hp) / per - 1e-9) - 1)), cap = Math.min(per, bo.maxHp - k * per), col = i => C.colors[i % C.colors.length];
    const bb = box.querySelector('.bb'); box.classList.remove('hidden');
    if (UI._bossId !== bo) { UI._bossId = bo; box.querySelector('.bn').firstChild.textContent = bo.def.name + ' — ' + bo.def.title; }
    bb.style.setProperty('--c', col(k)); bb.style.setProperty('--u', k > 0 ? col(k - 1) : '#999');
    bb.firstChild.style.width = Math.max(bo.hp > 0 ? 2 : 0, Math.min(100, (bo.hp - k * per) / cap * 100)) + '%';
    box.querySelector('.bx').textContent = n > 1 ? '×' + (k + 1) : '';
  };
  // ป้ายเป้าหมาย: ชื่อ · Lv + หลอดเลือดสั้น · สีเลเวลเทียบผู้เล่น (แดง = สูงกว่ามาก, ดำ = ใกล้เคียง, เทา = ต่ำกว่ามาก) · ★ = Alpha · บอสใช้หลอดบอส (ซ่อนป้ายนี้)
  UI.renderTarget = function (g) {
    const box = $('tgt'), e = g.lastTarget, C = PD_DATA.config.targetLabel;
    if (!e || e.dead || e.def.boss || performance.now() - g.lastTargetAt > C.show * 1000 || g.state !== 'play' || !$('portal-label').classList.contains('hidden')) { box.classList.add('hidden'); return; }
    const diff = e.lvl - g.S.player.level, col = diff >= C.hard ? '#d23a2a' : diff >= 1 ? '#b8701a' : diff <= C.easy ? '#888' : '#1b1b1b';
    box.classList.remove('hidden'); const tn = box.querySelector('.tn'), txt = (e.alpha ? '★ ' : '') + e.def.name + ' · Lv.' + e.lvl;
    if (tn.textContent !== txt) tn.textContent = txt; tn.style.color = col;
    box.querySelector('.tb i').style.width = Math.max(2, Math.min(100, e.hp / e.maxHp * 100)) + '%';
  };
  UI.showBoss = function (e) { /* หลอดคุมโดย renderBossBar ทุกเฟรม */ };
  UI.hideBoss = function () { /* หลอดคุมโดย renderBossBar ทุกเฟรม */ };
  UI.refreshTracker = function () {
    if (!G().S) return;
    $('tracker').innerHTML = PD.Quest.trackerText().map(t => '<div>' + esc(t) + '</div>').join('');
  };
  UI.update = function () {
    const g = G(); if (!g.S || !g.player) return;
    const P = g.S.player, D = g.derived, pl = g.player;
    setTxt('lv', '' + P.level);
    setW('hpbar', pl.hp / D.maxHp); setTxt('hptxt', Math.ceil(pl.hp) + '/' + D.maxHp);
    setW('inkbar', pl.ink / D.maxInk); setTxt('inktxt', Math.floor(pl.ink) + '/' + D.maxInk);
    setW('expbar', P.exp / PD.Stats.expNeed(P.level));
    const poison = $('poison-status'), poisonLeft = Math.max(0, pl.poisonT || 0);
    poison.classList.toggle('hidden', !poisonLeft);
    if (poisonLeft) {
      const ratio = Math.min(1, poisonLeft / PD_DATA.config.poison.time);
      poison.title = 'ติดพิษ ' + Math.ceil(poisonLeft) + ' วิ';
      poison.style.setProperty('--poison-left', ratio);
    }
    for (const [id, countId, kind] of [['btn-potion', 'potcnt', g.activeConsumable], ['btn-potion-2', 'potcnt2', g.secondConsumable]]) {
      setTxt(countId, '' + g.itemCount(kind));
      const icon = $(id)?.querySelector('.ic');
      if (!icon) continue;
      let img = icon.querySelector('img');
      if (!img) { img = document.createElement('img'); img.className = 'pimg'; icon.replaceChildren(img); }
      const src = UI.itemIcon({ kind });
      if (img.getAttribute('src') !== src) img.src = src;
      img.alt = ITEM_NAME[kind] || kind;
      const button = $(id), remaining = g.itemCooldownLeft(kind);
      button.querySelector('.potion-time').textContent = remaining > 0 ? String(Math.ceil(remaining)) : '';
      button.querySelector('.cdv').style.height = (remaining > 0 ? Math.min(100, remaining / PD_DATA.config.consumableCooldown * 100) : 0) + '%';
    }
    setTxt('lumicnt', '' + (P.lumi || 0));
    const spb = $('sp-badge'); setTxt('sp-badge', '' + P.skillPoints); spb.classList.toggle('hidden', P.skillPoints <= 0);
    $('page-badge').classList.toggle('hidden', !g.S.pendingPages.length);
    for (let i = 0; i < 3; i++) {
      const id = P.slots[i], b = $('btn-s' + i), d = id && PD.Skills.def(id);
      const key = 's' + i;
      const icon = d ? d.icon : ['หลัก', 'เวท', 'ไม้ตาย'][i];
      if (cache[key] !== icon + (d && d.img || '')) { cache[key] = icon + (d && d.img || ''); b.querySelector('.ic').innerHTML = d ? UI.ico(d) : '<small>' + icon + '</small>'; b.classList.toggle('empty', !d); b.title = d ? d.name : ''; }
      const left = d ? PD.Skills.cdLeft(id) : 0;
      const v = d?.cd > 0 ? Math.round(left / d.cd * 100) : 0;
      if (cache[key + 'cd'] !== v) { cache[key + 'cd'] = v; b.querySelector('.cdv').style.height = v + '%'; }
      const seconds = left > 0 ? String(Math.ceil(left)) : '';
      if (cache[key + 'seconds'] !== seconds) { cache[key + 'seconds'] = seconds; b.querySelector('.skill-time').textContent = seconds; }
      b.classList.toggle('skill-art', !!d?.img);
      b.classList.toggle('noink', !!d && pl.ink < d.ink);
    }
    // ปุ่มโต้ตอบตามบริบท
    if (g.state === 'play') {
      const it = g.findInteract(), act = $('btn-act');
      if (it) { setTxt('btn-act', it.label); act.classList.remove('hidden'); const hk = { bridge: 'chasm', trace: 'trace', circuit: 'circuit', erase: 'erase', search: 'search', switch: g.map.toggleStyle === 'fold' ? 'fold' : 'switch' }[it.type]; if (hk) g.hint(hk); } else { act.classList.add('hidden'); if (g.mapIndex > 0 && g.nearClosedGate(2.2)) g.hint('gate'); }
      let lab = null; for (const p of g.activePortals()) if (PD.U.dist(p.x + 0.5, p.y + 0.5, pl.x, pl.y) < 2.2) lab = '→ ' + g.portalLabel(p);
      if (lab) { setTxt('portal-label', lab); $('portal-label').classList.remove('hidden'); } else $('portal-label').classList.add('hidden');
    }
    UI.renderBossBar(g); UI.renderTarget(g);
  };

  // ---------- Panels ----------
  UI.openPanel = function (name, catalog = null) {
    const g = G(); if (g.state !== 'play' && g.state !== 'panel') return;
    if (panelName !== name) skillQueue = {};
    if (name === 'world') { wmPlace = null; wmPicker = false; }
    if (name === 'shop') sellQueue = {}; eqPop = false; // เข้าร้านใหม่ = เริ่มเลือกของขายใหม่
    arenaStock = name === 'shop' ? catalog : null;
    panelName = name; UI._scrollKey = null; g.state = 'panel'; PD.Input.attackHeld = false;
    $('panel').classList.remove('hidden'); UI.renderPanel();
  };
  UI.closePanel = function () {
    if (!panelName) return; skillQueue = {}; panelName = null; UI._scrollKey = null; $('panel').classList.add('hidden');
    const g = G(); if (g.state === 'panel') g.state = 'play';
    UI.refreshTracker();
  };
  UI.panelOpen = () => panelName;
  UI.renderPanel = function () {
    const box = $('panel'), body = box.querySelector('.pbody'), title = box.querySelector('.ptitle');
    const fn = { shop: panelShop, storage: panelStorage, elements: panelElements, equip: panelEquip, bag: panelBag, skills: panelSkills, status: panelStatus, quest: panelQuest, world: panelWorld, pause: panelPause, artifactShop: panelArtifactShop }[panelName];
    box.classList.toggle('psmall', panelName === 'bag' || panelName === 'skills' || panelName === 'equip' || panelName === 'quest' || panelName === 'world'); // หน้าต่างหลักเล็กลง 20%
    box.classList.toggle('pworld', panelName === 'world'); // แผนที่โลก: ช่องแผนที่กินพื้นที่ที่เหลือและเลื่อนด้วยนิ้วได้
    box.classList.toggle('pstatus', panelName === 'status'); // ย่อหน้าต่าง status ในแนวนอน
    const pv = box.querySelector('.pver'); pv.textContent = 'v' + PD_DATA.config.version; pv.classList.toggle('hidden', panelName !== 'pause');
    accPref = null; const r = fn();
    // วาดหน้าต่างใหม่แล้วต้องไม่เด้งกลับขึ้นบน: จำตำแหน่งเลื่อนของหน้าต่าง + รายการย่อย (ถ้ายังเป็นหน้า/แท็บเดิม)
    const key = panelName + ':' + (panelName === 'shop' ? shopTab : ''), SC = '.shoplist,.slots,.wdet,.shopcol', keep = key === UI._scrollKey ? [body.scrollTop].concat(Array.from(body.querySelectorAll(SC)).map(e => e.scrollTop)) : null;
    UI._scrollKey = key; title.textContent = r.title; body.innerHTML = r.html; r.bind && r.bind(body);
    const pd = box.querySelector('.pdps'); pd.textContent = r.dps || ''; pd.classList.toggle('hidden', !r.dps); // ป้ายข้างปุ่มปิด (หน้าสถานะ: DPS)
    if (keep) { body.scrollTop = keep[0]; Array.from(body.querySelectorAll(SC)).forEach((e, i) => { if (keep[i + 1] != null) e.scrollTop = keep[i + 1]; }); }
  };

  function wcard(w, eqW, sel) {
    const d = PD.Loot.describe(w);
    let cmp = '';
    if (eqW && eqW !== w) {
      const P = G().S.player, a = PD.Stats.derive(P), b = PD.Stats.derive(Object.assign({}, P, { weapon: w }));
      const diff = b.dps - a.dps; cmp = ' <span class="' + (diff >= 0 ? 'up' : 'dn') + '">DPS ' + (diff >= 0 ? '▲' : '▼') + Math.abs(diff).toFixed(1) + '</span>';
    }
    return '<div class="wcard' + (sel ? ' sel' : '') + '" data-uid="' + w.uid + '"><div class="wn" style="color:' + d.color + '">' + esc(d.name) + '</div>' +
      '<div class="wl">' + d.type + ' · ' + d.rarity + ' · iLv ' + d.ilvl + ' · ดาเมจ ' + d.dmg + cmp + '</div>' +
      d.lines.map((l, i) => '<div class="wl"' + (d.kinds?.[i] ? ' style="padding:1px 4px;background:#fff;color:' + (d.kinds[i] === 'main' ? '#805400' : '#1b1b1b') + '"' : '') + '>' + (d.imgs && d.imgs[i] ? '<img class="ico" alt="" src="' + d.imgs[i] + '"> ' : '• ') + esc(l) + '</div>').join('') + '</div>';
  }
  // ไอคอนอาวุธพิกเซล (วาดครั้งเดียวต่อแบบ)
  const iconCache = {};
  UI.ico = d => d.img ? '<img class="ico" alt="" src="' + PD.U.img(d.img) + '">' : d.icon; // ไอคอนสกิล: รูปจาก editor ถ้ามี ไม่งั้นสัญลักษณ์เดิม
  UI.itemIcon = function (it) {
    { const bs = it.kind === 'gear' ? PD.Loot.gearBase(it.base) : (it.base ? PD.Loot.base(it.base) : null); if (bs && bs.img) return PD.U.img(bs.img); } // รูปจาก editor
    if (G().CONSUMABLE[it.kind]) {
      const img = PD_DATA.config.shop.find(entry => entry.kind === it.kind)?.img;
      if (img) return PD.U.img(img);
    }
    if (it.kind === 'potion') return potIcon('#d23a2a', 'pot');
    if (it.kind === 'inkpot') return potIcon('#2f6fd6', 'ink');
    if (it.kind === 'antidote') return potIcon('#3c9a5c', 'anti');
    if (it.kind === 'gear') { const k = 'g_' + it.slot; if (iconCache[k]) return iconCache[k];
      const cv = document.createElement('canvas'); cv.width = 20; cv.height = 20; const c = cv.getContext('2d'); c.fillStyle = '#1b1b1b'; PD.Sprites.gear(c, it.slot, 3, 3, 1); return (iconCache[k] = cv.toDataURL()); }
    return UI.weaponIcon(PD.Loot.base(it.base).shape);
  };
  function potIcon(col, key) { if (iconCache[key]) return iconCache[key];
    const cv = document.createElement('canvas'); cv.width = 20; cv.height = 20; const c = cv.getContext('2d');
    c.fillStyle = '#1b1b1b'; PD.P.circle(c, 10, 12, 5); PD.P.line(c, 10, 7, 10, 3); PD.P.line(c, 8, 3, 12, 3); c.fillStyle = col; c.fillRect(6, 12, 9, 4);
    if (key === 'anti') { c.fillStyle = '#fff'; c.fillRect(9, 9, 3, 1); c.fillRect(10, 8, 1, 3); }
    return (iconCache[key] = cv.toDataURL()); }
  const ITEM_NAME = { potion: 'ยาเติมพลัง', inkpot: 'ยาเติมน้ำหมึก', antidote: 'ยาแก้พิษ' }, ITEM_COL = { potion: '#d23a2a', inkpot: '#2f6fd6', antidote: '#3c9a5c' };
  UI.weaponIcon = function (shape) {
    if (iconCache[shape]) return iconCache[shape];
    const cv = document.createElement('canvas'); cv.width = 20; cv.height = 20; const c = cv.getContext('2d');
    c.fillStyle = '#1b1b1b'; const len = { sword: 10, dagger: 6, axe: 9, spear: 14, staff: 11 }[shape] || 10;
    const sc = Math.min(1.3, 15 / (len + 2));
    PD.Sprites.weapon(c, shape, 3, 17, -Math.PI / 4, sc);
    return (iconCache[shape] = cv.toDataURL());
  };
  // ค่าผู้เล่นถ้าสวมของชิ้นนี้แทน
  function withItem(P, it) { return it.kind === 'gear' ? Object.assign({}, P, { gear: Object.assign({}, P.gear, { [G().gearSlotFor(it, accPref)]: it }) }) : Object.assign({}, P, { weapon: it }); }
  const CMP_ROWS = [['dps', 'DPS', 1], ['physPower', 'พลังกายภาพ', 1], ['magicPower', 'พลังเวท', 1], ['attackRate', 'ตี/วิ', 2], ['range', 'ระยะ', 2],
    ['maxHp', 'HP สูงสุด', 0], ['maxInk', 'หมึกสูงสุด', 0], ['inkRegen', 'หมึก/วินาที', 1], ['def', 'DEF', 1], ['mdef', 'MDEF', 1],
    ['crit', 'คริติคอล %', -1], ['moveUnits', 'ความเร็วเดิน', 0], ['leech', 'ดูดเลือด %', -1], ['skillPct', 'ดาเมจสกิล %', 0], ['atkPct', 'พลังโจมตี %', 0],
    ['fire', 'ดาเมจไฟ', 0], ['ice', 'ดาเมจน้ำแข็ง', 0], ['bolt', 'ดาเมจสายฟ้า', 0]];
  const defenseKeys = { def: 'dmgReduce', mdef: 'dmgReduceMagic' };
  const attackRate = speed => 1 / PD.U.clamp(PD_DATA.config.attackTime / speed, PD_DATA.config.attackMinTime, 1.2);
  function displayStat(d, key) {
    if (key === 'attackRate') return d.aps;
    if (key === 'moveUnits') return d.move * 100;
    return d[key] ?? d.elem[key] ?? 0;
  }
  const defenseValue = (value, reduction) => value + '<small class="defense-reduction">ลด ' + reduction + '</small>';
  function statRows(rows) {
    return rows.map(([label, value, cls]) => '<div' + (cls ? ' class="' + cls + '"' : '') + '><span class="stat-label">' + label + '</span><b class="stat-value">' + value + '</b></div>').join('');
  }
  function cmpTable(it) { // เปรียบเทียบทุกค่า: ใส่อยู่ → ถ้าสวมชิ้นนี้
    const P = G().S.player, a = PD.Stats.derive(P), b = PD.Stats.derive(withItem(P, it));
    const show = (d, key, digits, marker = '') => {
      const value = f(displayStat(d, key), digits) + marker;
      return defenseKeys[key] ? defenseValue(value, f(d[defenseKeys[key]], -1) + '%') : value;
    };
    const f = (x, p) => p < 0 ? (x * 100).toFixed(1) : x.toFixed(p);
    let h = '<table class="cmpt"><tr><th></th><th>ใส่อยู่</th><th>ชิ้นนี้</th></tr>';
    for (const r of CMP_ROWS) { const [key, label, digits] = r, df = displayStat(b, key) - displayStat(a, key), e = Math.abs(df) < 1e-6;
      h += '<tr' + (e ? ' class="eq0"' : '') + '><td>' + label + '</td><td>' + show(a, key, digits) + '</td><td class="' + (e ? '' : df > 0 ? 'up' : 'dn') + '">' + show(b, key, digits, e ? '' : ' ' + (df > 0 ? '▲' : '▼')) + '</td></tr>'; }
    return h + '</table>';
  }
  // เซต: แสดงชิ้นที่ต้องใช้ จำนวนที่ใส่อยู่ และโบนัส
  const SET_TXT = k => (PD_DATA.affixes.find(a => a.id === k) || { text: k + ' +{v}' }).text;
  function setHtml(it) {
    const s = PD.Stats.setOf(it); if (!s) return '';
    const P = G().S.player, n = PD.Stats.setCount(P, s), on = n === 3;
    const parts = [
      [PD.Loot.base(s.weapon).name, P.weapon?.base === s.weapon],
      [PD.Loot.gearBase(s.body).name, P.gear.body?.base === s.body],
      [PD.Loot.gearBase(s.legs).name, P.gear.legs?.base === s.legs]
    ];
    return '<div class="setbox' + (on ? ' on' : '') + '" style="--sc:' + s.aura.color + '"><b>เซต ' + esc(s.name) + ' (' + n + '/3)</b>' +
      '<ul class="set-parts">' + parts.map(([name, worn]) => '<li class="' + (worn ? 'up' : '') + '">' + (worn ? '✓ สวมแล้ว ' : '○ ยังขาด ') + esc(name) + '</li>').join('') + '</ul>' +
      '<b class="wl">' + (on ? 'โบนัสเซตมีผล' : 'โบนัสเมื่อสวมครบ') + '</b>' +
      Object.keys(s.bonus).map(k => '<div class="wl">' + (on ? '✦ ' : '○ ') + esc(SET_TXT(k).replace('{v}', s.bonus[k])) + '</div>').join('') + '</div>';
  }
  const priceHtml = it => '<div class="wl" style="opacity:.7">ขายได้ ' + G().sellPrice(it) + ' Lumi</div>';
  // v2.3.5: Artifact เป็นไอเท็มปกติใน P.inventory — ช่วยแสดงชื่อ/สี/ไอคอน โดยไม่ชนกับโค้ด rarity/base ของอาวุธ-เกราะ
  function artifactDisplay(it) { const def = PD_DATA.artifactDefs[it.defId], gr = PD_DATA.artifactGrades.find(x => x.id === it.grade);
    return { def, gr, name: def ? def.name : '?', color: gr ? gr.color : '#3a3a3a', icon: def ? def.icon : '❔', elemColor: def ? (PD_DATA.artifactElemColors[def.elem] || '#1b1b1b') : '#1b1b1b' }; }
  function itemDisplay(it) {
    if (G().CONSUMABLE[it.kind]) return { name: ITEM_NAME[it.kind] + ' ×' + it.n, color: ITEM_COL[it.kind] };
    if (it.kind === 'artifact') { const a = artifactDisplay(it); return { name: a.name + (a.gr ? ' (' + a.gr.name + ')' : ''), color: a.color }; }
    return { name: it.name, color: PD.Loot.rarity(it.rarity).color };
  }
  function artifactIcon(it) {
    const a = artifactDisplay(it);
    if (a.def?.img) return '<img class="art-image" src="' + esc(PD.U.img(a.def.img)) + '" alt="">';
    return '<span class="art-ico" style="color:' + a.elemColor + '">' + esc(a.icon) + '</span>';
  }
  function itemIconHtml(it) {
    if (it.kind === 'artifact') return artifactIcon(it);
    return '<img src="' + UI.itemIcon(it) + '" alt="">';
  }
  function wdetail(w, cmpWith) {
    if (G().CONSUMABLE[w.kind]) { const sh = PD_DATA.config.shop.find(x => x.kind === w.kind);
      return '<div class="wn" style="color:' + ITEM_COL[w.kind] + '">' + ITEM_NAME[w.kind] + ' ×' + w.n + '</div><div class="wl">ไอเท็มใช้งาน · ' + (sh ? sh.desc : '') + ' · ซ้อนได้ ' + PD_DATA.config.potionMax + '/ช่อง</div>' +
        ('<div class="wl">ใส่ช่อง 1 (Q) หรือช่อง 2 (R) จากกระเป๋า</div>') + '<div class="wl">ขายได้ ' + G().sellPrice(w) + ' Lumi</div>'; }
    if (w.kind === 'artifact') { const a = artifactDisplay(w);
      return '<div class="wn" style="color:' + a.elemColor + '">' + artifactIcon(w) + ' ' + esc(a.name) + '</div><div class="wl">Artifact · ' + (a.gr ? esc(a.gr.name) : '') + '</div>' +
        '<div class="wl">' + (a.def ? esc(a.def.flavor) : '') + '</div><div class="wl">ผลลัพธ์ขึ้นกับช่องที่เลือกสวม (STR/VIT/AGI/INT) — ไปสวมใส่ได้ที่หน้า "สถานะ" เท่านั้น</div>' +
        '<div class="wl">ขายได้ ' + G().sellPrice(w) + ' Lumi</div>'; }
    if (w.kind === 'gear') { const d = PD.Loot.describe(w); let cmp = '';
      if (cmpWith) { const P = G().S.player, diff = PD.Stats.derive(withItem(P, w)).def - PD.Stats.derive(P).def; if (cmpWith !== w) cmp = '<div class="' + (diff >= 0 ? 'up' : 'dn') + '">ป้องกัน ' + (diff >= 0 ? '▲' : '▼') + Math.abs(diff).toFixed(1) + '</div>'; }
      return '<div class="wn" style="color:' + d.color + '">' + esc(d.name) + '</div><div class="wl">' + d.type + ' · ' + d.rarity + ' · iLv ' + d.ilvl + '</div>' + cmp +
        d.base.map(l => '<div class="wl"><b>' + esc(l) + '</b></div>').join('') + d.lines.map((l, i) => '<div class="wl"' + (d.kinds?.[i] ? ' style="padding:1px 4px;background:#fff;color:' + (d.kinds[i] === 'main' ? '#805400' : '#1b1b1b') + '"' : '') + '>' + (d.imgs && d.imgs[i] ? '<img class="ico" alt="" src="' + d.imgs[i] + '"> ' : '• ') + esc(l) + '</div>').join('') + setHtml(w) + priceHtml(w); }
    const d = PD.Loot.describe(w); let cmp = '';
    if (cmpWith && cmpWith !== w) {
      const P = G().S.player, a = PD.Stats.derive(P), b = PD.Stats.derive(Object.assign({}, P, { weapon: w }));
      const diff = b.dps - a.dps; cmp = '<div class="' + (diff >= 0 ? 'up' : 'dn') + '">DPS ' + b.dps.toFixed(1) + ' (' + (diff >= 0 ? '▲' : '▼') + Math.abs(diff).toFixed(1) + ')</div>';
    }
    return '<div class="wn" style="color:' + d.color + '">' + esc(d.name) + '</div><div class="wl">' + d.type + ' · ' + d.rarity + ' · iLv ' + d.ilvl + '</div>' +
      '<div class="wl">ดาเมจ ' + d.dmg + ' · ตี ' + attackRate(d.speed).toFixed(2) + ' ครั้ง/วิ (ฐาน)' + ' · ระยะ ' + d.range + '</div>' + cmp + d.lines.map((l, i) => '<div class="wl"' + (d.kinds?.[i] ? ' style="padding:1px 4px;background:#fff;color:' + (d.kinds[i] === 'main' ? '#805400' : '#1b1b1b') + '"' : '') + '>' + (d.imgs && d.imgs[i] ? '<img class="ico" alt="" src="' + d.imgs[i] + '"> ' : '• ') + esc(l) + '</div>').join('') + setHtml(w) + priceHtml(w);
  }
  function slotHtml(w, extra) {
    if (!w) return '<div class="slot empty"></div>';
    const lk = w.uid && G().isLocked(w.uid) ? '<span class="lock-icon">🔒</span>' : '';
    if (G().CONSUMABLE[w.kind]) return '<div class="slot pot' + (w.uid === selUid ? ' sel' : '') + '" data-uid="' + w.uid + '" style="--rc:' + ITEM_COL[w.kind] + '"><img src="' + UI.itemIcon(w) + '" alt=""><s>×' + w.n + '</s>' + lk + '</div>';
    if (w.kind === 'artifact') { const a = artifactDisplay(w); // v2.3.5: ไอเท็มปกติในกระเป๋า — แตะแค่เลือกดูรายละเอียด สวมใส่ได้ที่หน้าสถานะเท่านั้น
      return '<div class="slot art-tile' + (w.uid === selUid ? ' sel' : '') + '" data-uid="' + w.uid + '" style="--rc:' + a.color + '">' + artifactIcon(w) + lk + '</div>'; }
    const r = PD.Loot.rarity(w.rarity);
    let mark = '';
    if (extra !== 'eq') {
      const current = G().derived, next = PD.Stats.derive(withItem(G().S.player, w));
      const pct = (before, after) => 100 * (after - before) / Math.max(1, before);
      const effectiveHp = stats => stats.maxHp / Math.max(0.01, 1 - stats.dmgReduce);
      const score = 0.50 * pct(current.dps, next.dps) + 0.35 * pct(effectiveHp(current), effectiveHp(next)) + 0.15 * pct(current.maxInk, next.maxInk);
      if (score >= 2) mark = '<i class="up gear-advice" title="แนะนำสำหรับสายสมดุล" aria-label="แนะนำสำหรับสายสมดุล">▲</i>';
      else if (score <= -2) mark = '<i class="dn gear-advice" title="ความคุ้มลดลงสำหรับสายสมดุล" aria-label="ความคุ้มลดลงสำหรับสายสมดุล">▼</i>';
    }
    return '<div class="slot r-' + w.rarity + (w.uid === selUid ? ' sel' : '') + '" data-uid="' + w.uid + '" style="--rc:' + r.color + '"><img src="' + UI.itemIcon(w) + '" alt=""><s>' + w.ilvl + '</s>' + mark + lk + '</div>';
  }
  // ---------- ร้านค้า (NPC พ่อค้า): ซื้อ / ขาย ----------
  let shopTab = 'buy';
  UI.openArenaShop = function (catalog) {
    shopTab = 'buy';
    UI.openPanel('shop', catalog);
  };
  let arenaStock = null;
  function panelShop() {
    const g = G(), P = g.S.player, SH = PD_DATA.config.shop;
    let html = '<div class="chips"><button data-tab="buy" class="' + (shopTab === 'buy' ? 'on' : '') + '">ซื้อ</button><button data-tab="sell" class="' + (shopTab === 'sell' ? 'on' : '') + '">ขาย</button><span style="margin-left:auto"><span class="coin"></span> <b>' + (P.lumi || 0) + '</b> Lumi</span></div>';
    if (shopTab === 'buy' && arenaStock) {
      html += '<div class="chips"><input id="arena-shop-search" aria-label="ค้นหาสินค้า" placeholder="ชื่อหรือ ID"><select id="arena-shop-category" aria-label="หมวดสินค้า"><option value="">ทั้งหมด</option>' +
        Array.from(new Set(arenaStock.map(it => it.category))).map(category => '<option>' + esc(category) + '</option>').join('') + '</select></div>';
      html += '<div class="shoplist" id="arena-shop-list"></div>';
    } else if (shopTab === 'buy') html += '<div class="shoplist">' + SH.map((it, i) => '<div class="shoprow"><img src="' + UI.itemIcon({ kind: it.kind }) + '" alt=""><div><b>' + esc(it.name) + '</b><div class="wl">' + esc(it.desc) + ' · มี ' + g.itemCount(it.kind) + '</div></div><button data-buy="' + i + '"' + ((P.lumi || 0) < it.price ? ' disabled' : '') + '>' + it.price + ' Lumi</button></div>').join('') + '</div>';
    else {
      // Two-panel sell: left=bag, right=sell queue
      const queueItems = Object.keys(sellQueue).map(uid => P.inventory.find(w => w.uid === uid)).filter(Boolean);
      const totalPrice = queueItems.reduce((s, it) => s + g.sellPrice(it), 0);
      html += '<div class="inv"><div class="inv-l"><b>กระเป๋า</b> <span class="wl">แตะเพื่อเลือกขาย</span><div class="shoplist">' +
        (P.inventory.length ? P.inventory.filter(it => !sellQueue[it.uid]).map(it => {
          const locked = g.isLocked(it.uid), disp = itemDisplay(it);
          return '<div class="shoprow' + (locked ? ' locked-item' : '') + '">' + itemIconHtml(it) + '<div><b style="color:' + disp.color + '">' + esc(disp.name) + '</b>' + (locked ? ' 🔒' : '') + '</div>' + (locked ? '' : '<button data-toq="' + it.uid + '">→ ขาย ' + g.sellPrice(it) + '</button>') + '</div>';
        }).join('') : '<div class="wl" style="opacity:.6">กระเป๋าว่าง</div>') + '</div></div>';
      html += '<div class="inv-r"><b>รายการขาย</b> <span class="wl">รวม ' + totalPrice + ' Lumi</span>' + (queueItems.length ? '<div class="btnrow"><button id="b-sellall" style="background:#c0201a;color:#fff">ขายทั้งหมด ' + totalPrice + ' Lumi</button></div>' : '') + '<div class="shoplist">' +
        queueItems.map(it => { const disp = itemDisplay(it); return '<div class="shoprow">' + itemIconHtml(it) + '<div><b style="color:' + disp.color + '">' + esc(disp.name) + '</b></div><button data-rmq="' + it.uid + '">← ยกเลิก</button></div>'; }).join('') +
        '</div></div></div>';
    }
    return { title: arenaStock ? 'Arena · ร้านทดสอบ' : 'พ่อค้ากระดาษ', html, bind(b) {
      const list = b.querySelector('#arena-shop-list');
      if (list && arenaStock) {
        const search = b.querySelector('#arena-shop-search'), category = b.querySelector('#arena-shop-category');
        const render = () => {
          const query = search.value.trim().toLowerCase();
          list.replaceChildren();
          arenaStock.forEach(it => {
            if (category.value && category.value !== it.category) return;
            if (!(it.id + ' ' + it.name).toLowerCase().includes(query)) return;
            const row = document.createElement('div'), name = document.createElement('b'), buy = document.createElement('button');
            row.className = 'shoprow';
            name.textContent = it.name;
            buy.textContent = 'ซื้อ';
            buy.onclick = () => it.buy();
            row.innerHTML = itemIconHtml(it.iconItem);
            row.append(name, buy);
            list.append(row);
          });
        };
        search.oninput = category.onchange = render;
        render();
      }
      b.querySelectorAll('[data-tab]').forEach(x => x.onclick = () => { shopTab = x.dataset.tab; UI.renderPanel(); });
      b.querySelectorAll('[data-buy]').forEach(x => x.onclick = () => { g.buy(+x.dataset.buy); UI.renderPanel(); });
      // แตะได้ทั้งแถว (ไม่ต้องเล็งปุ่มเล็ก)
      b.querySelectorAll('[data-toq]').forEach(x => (x.closest('.shoprow') || x).onclick = () => { sellQueue[x.dataset.toq] = 1; UI.renderPanel(); });
      b.querySelectorAll('[data-rmq]').forEach(x => (x.closest('.shoprow') || x).onclick = () => { delete sellQueue[x.dataset.rmq]; UI.renderPanel(); });
      const sa = b.querySelector('#b-sellall'); if (sa) sa.onclick = () => { for (const uid of Object.keys(sellQueue)) g.sell(uid); sellQueue = {}; UI.renderPanel(); };
    } };
  }
  function confirmSell(it) { try { return window.confirm('ขาย "' + it.name + '" ราคา ' + G().sellPrice(it) + ' Lumi?'); } catch (e) { return true; } }
  // ---------- จุดรับฝาก (หมู่บ้าน) ----------
  function panelStorage() {
    const g = G(), P = g.S.player, cap = PD_DATA.config.storageMax;
    // แถวรายการ: ไอคอน + ชื่อ (สีตามความหายาก) + ชนิด/iLv + สถานะ 🔒 (ของที่ล็อกฝากได้ · ล็อกยังอยู่ตอนถอน)
    const row = (it, act, lab) => {
      const cons = g.CONSUMABLE[it.kind], isArt = it.kind === 'artifact', lk = !cons && g.isLocked(it.uid), disp = itemDisplay(it);
      const sub = cons ? 'ไอเท็มใช้งาน' : isArt ? 'Artifact' : (it.kind === 'gear' ? PD_DATA.gearSlots[it.slot] : PD.Loot.base(it.base).name) + ' · iLv ' + it.ilvl;
      return '<div class="shoprow strow' + (lk ? ' locked-item' : '') + '" data-' + act + '="' + it.uid + '">' + itemIconHtml(it) + '<div><b style="color:' + disp.color + '">' + esc(disp.name) + '</b> ' +
        (lk ? '<span class="lkst">🔒 ล็อก</span>' : '') + '<div class="wl">' + esc(sub) + '</div></div><button>' + lab + '</button></div>';
    };
    const none = '<div class="wl" style="opacity:.6">ว่างเปล่า</div>';
    const html = '<div class="inv"><div class="inv-l stcol"><b>ที่ฝาก ' + P.storage.length + '/' + cap + '</b> <span class="wl">แตะเพื่อถอนเข้ากระเป๋า</span><div class="shoplist">' + (P.storage.length ? P.storage.map(it => row(it, 'wd', 'ถอน')).join('') : none) + '</div></div>' +
      '<div class="inv-r stcol"><b>กระเป๋า ' + P.inventory.length + '/' + PD_DATA.config.inventoryMax + '</b> <span class="wl">แตะเพื่อฝาก (ของที่ล็อกฝากได้)</span><div class="shoplist">' + (P.inventory.length ? P.inventory.map(it => row(it, 'dp', 'ฝาก')).join('') : none) + '</div></div></div>';
    return { title: 'จุดรับฝาก · คุณป้ารับฝาก', html, bind(b) {
      b.querySelectorAll('[data-wd]').forEach(x => x.onclick = () => { g.withdraw(x.dataset.wd); UI.renderPanel(); });
      b.querySelectorAll('[data-dp]').forEach(x => x.onclick = () => { g.deposit(x.dataset.dp); UI.renderPanel(); });
    } };
  }
  // ---------- คู่มือธาตุมอนสเตอร์ ----------
  function panelElements() {
    const E = PD_DATA.config.elements, ks = Object.keys(E.names), col = k => E.colors[k], eico = k => E.imgs && E.imgs[k] ? '<img class="ico" alt="" src="' + PD.U.img(E.imgs[k]) + '"> ' : '';
    let html = '<div class="wl">ตัวคูณดาเมจ: แถว = ธาตุที่ตี · คอลัมน์ = ธาตุมอนสเตอร์ · อาวุธน้ำแข็งนับเป็นธาตุน้ำ · ไฟ = เผาต่อเนื่อง · น้ำแข็ง = ช้า · สายฟ้า = ลูกโซ่ 5 ตัว (100/80/50/15/15%)</div>';
    html += '<table class="cmpt elemt"><tr><th>ตี ↓ / โดน →</th>' + ks.map(k => '<th style="color:' + col(k) + '">' + eico(k) + E.names[k] + '</th>').join('') + '</tr>';
    for (const a of ks) html += '<tr><td style="color:' + col(a) + '"><b>' + eico(a) + E.names[a] + '</b></td>' + ks.map(d => { const v = (E.chart[a] || {})[d] || 1; return '<td class="' + (v > 1 ? 'up' : v < 1 ? 'dn' : 'eq0') + '">' + Math.round(v * 100) + '%</td>'; }).join('') + '</tr>';
    html += '</table><b>ธาตุมอนสเตอร์</b><div class="elist">';
    const all = PD_DATA.enemies;
    for (const id in all) { const e = all[id], k = e.element || 'normal'; html += '<span style="--ec:' + col(k) + '">' + eico(k) + (e.boss ? '💀 ' : '') + esc(e.name) + ' <b>' + E.names[k] + '</b>' + (e.poison ? ' ☠พิษ' : '') + '</span>'; }
    return { title: '📖 คู่มือธาตุมอนสเตอร์', html: html + '</div>', bind() { } };
  }
  let eqPop = false;
  function artifactBonusHtml(cell) {
    const number = String(cell.val);
    const token = cell.desc.includes(number + '%') ? number + '%' : number;
    const label = cell.desc.replace('+' + token, '').replace(token, '').trim().replace(/\s{2,}/g, ' ');
    return '<strong class="art-bonus">' + esc((cell.desc.includes('+' + token) ? '+' : '') + token) + '</strong> ' + esc(label);
  }
  function statBonusFormatter(P, D) {
    const withoutItems = PD.Stats.derive({ ...P, weapon: PD.Loot.starter(), gear: {}, artifacts: {} });
    return (key, digits, scale = 1, unit = '') => {
      const total = Number((displayStat(D, key) * scale).toFixed(digits));
      const base = Number((displayStat(withoutItems, key) * scale).toFixed(digits));
      const added = Number((total - base).toFixed(digits));
      return added > 0 ? '<span class="up">+' + added.toFixed(digits) + unit + '</span> ' + base.toFixed(digits) + unit : total.toFixed(digits) + unit;
    };
  }
  function panelEquip() { // หน้าสวมใส่: อาวุธ + ชุด 3 ช่อง + ค่าสถานะรวม
    const P = G().S.player, D = G().derived, slots = [['weapon', 'อาวุธ', P.weapon]].concat(Object.keys(PD_DATA.gearSlots).map(k => [k, PD_DATA.gearSlots[k], P.gear[k]]));
    if (!slots.some(s => s[0] === eqSel)) eqSel = 'weapon';
    const cur = slots.find(s => s[0] === eqSel)[2];
    accPref = eqSel === 'acc' || eqSel === 'acc2' ? eqSel : null;
    let html = '<div class="inv"><div class="inv-l"><div class="eqgrid">';
    // 2 แถว: อาวุธ · เสื้อ · เครื่องประดับ1 / ว่าง · กางเกง · เครื่องประดับ2
    for (const k of ['weapon', 'body', 'acc', null, 'legs', 'acc2']) {
      const s = k && slots.find(x => x[0] === k);
      html += !s ? '<div class="eqcell nil"></div>' : '<div class="eqcell' + (s[0] === eqSel ? ' on' : '') + '" data-es="' + s[0] + '">' + (s[2] ? slotHtml(s[2], 'eq') : '<div class="slot empty"></div>') + '<small>' + s[1] + '</small></div>';
    }
    const aS = PD.Stats.activeSet(P);
    html += '</div>';
    // รายการที่สวมได้ในช่องนี้: อยู่ใต้ช่องสวมใส่เลย (แนวนอนไม่ต้องเลื่อนลงไปหา) · เครื่องประดับใส่ได้ทั้ง 2 ช่อง
    const compat = P.inventory.filter(w => (eqSel === 'weapon' ? (w.kind === undefined || w.kind === 'weapon') : (w.kind === 'gear' && (eqSel === 'acc2' ? 'acc' : eqSel) === w.slot)));
    html += '<div class="eqpick"><b>เลือกสวมใส่' + (eqSel === 'weapon' ? ' (อาวุธ)' : ' (' + PD_DATA.gearSlots[eqSel] + ')') + ':</b><div class="slots">' + (compat.length ? compat.map(w => slotHtml(w)).join('') : '<span class="wl" style="opacity:.6;grid-column:1/-1">ไม่มีของที่ใส่ช่องนี้ได้ในกระเป๋า</span>') + '</div></div>';
    const selectedSet = cur && PD.Stats.setOf(cur);
    if (selectedSet) html += setHtml(cur);
    if (aS && aS !== selectedSet) html += setHtml(P.weapon);
    html += '<div class="btnrow ibtns">' + (cur && eqSel !== 'weapon' ? '<span class="sp"></span><button id="b-off">ถอด</button>' : '') + '</div>';
    html += '</div>';
    const bonus = statBonusFormatter(P, D);
    html += '<div class="inv-r"><b>ค่าสถานะรวม</b><div class="stat-grid">' + statRows(CMP_ROWS.map(([key, label, digits]) => {
      const value = bonus(key, digits < 0 ? 1 : digits, digits < 0 ? 100 : 1);
      return [label, defenseKeys[key] ? defenseValue(value, bonus(defenseKeys[key], 0, 100, '%')) : value];
    })) + '</div>';
    const artifactBonuses = Object.entries(P.artifacts || {}).flatMap(([slot, item]) => {
      const cell = item && PD_DATA.artifactCellValue(item.defId, slot, item.grade);
      return cell ? ['<div class="wl">' + artifactIcon(item) + ' <b>' + esc(slot) + '</b> ' + artifactBonusHtml(cell) + '</div>'] : [];
    });
    const summary = artifactBonuses.length ? '<div class="equip-art-bonuses"><b>โบนัส Artifact</b>' + artifactBonuses.join('') + '</div>' : '';
    html += summary + '</div></div>';
    return { title: 'สวมใส่', html, bind(b) {
      b.querySelectorAll('[data-es]').forEach(c => c.onclick = () => { eqSel = c.dataset.es; eqPop = !!slots.find(x => x[0] === eqSel)[2]; UI.renderPanel(); });
      if (eqPop && cur) { // pop-up รายละเอียดลอย แตะตรงไหนก็ปิด
        const pop = document.createElement('div'); pop.className = 'eqpop';
        pop.innerHTML = '<div class="eqpopc"><div class="wl" style="opacity:.55;text-align:center;margin-bottom:2px">แตะที่ใดก็ได้เพื่อปิด</div>' + wdetail(cur) + '</div>';
        pop.onclick = () => { eqPop = false; UI.renderPanel(); };
        b.appendChild(pop);
      }
      const off = b.querySelector('#b-off'); if (off) off.onclick = () => { if (!G().unequip(eqSel)) G().hint('bagfull', true); UI.renderPanel(); };
      b.querySelectorAll('.eqpick .slot[data-uid]').forEach(c => c.onclick = () => { G().equip(c.dataset.uid, eqSel); eqPop = false; UI.renderPanel(); });
    } };
  }
  // เรียงกระเป๋า: 1) ของที่ล็อก (Item Lock) ก่อนเสมอ 2) ชนิด: อาวุธ → เสื้อ → กางเกง → เครื่องประดับ → ไอเท็มใช้งาน (ยา/หมึก/ยาแก้พิษ)
  //             3) ความหายาก สูง→ต่ำ 4) ความสามารถ (DPS อาวุธ / ป้องกันของชุด) สูง→ต่ำ 5) iLv สูง→ต่ำ
  function sortBag(inv) {
    const g = G(), P = g.S.player, ri = id => PD_DATA.rarities.findIndex(r => r.id === id);
    const GS = { body: 1, legs: 2, acc: 3 }, CS = { potion: 0, inkpot: 1, antidote: 2 };
    const grp = it => g.CONSUMABLE[it.kind] ? 10 + (CS[it.kind] || 0) : it.kind === 'artifact' ? 7 : it.kind === 'gear' ? 1 + (GS[it.slot] || 4) : 0;
    const pw = it => (g.CONSUMABLE[it.kind] || it.kind === 'artifact') ? 0 : PD.Stats.derive(withItem(P, it))[it.kind === 'gear' ? 'def' : 'dps']; // artifact ไม่ใช่อาวุธ/เกราะ ห้ามส่งเข้า withItem+derive
    const memo = new Map(inv.map(it => [it, pw(it)]));
    inv.sort((x, y) => (g.isLocked(y.uid) ? 1 : 0) - (g.isLocked(x.uid) ? 1 : 0) || grp(x) - grp(y) || ri(y.rarity) - ri(x.rarity) || memo.get(y) - memo.get(x) || (y.ilvl || 0) - (x.ilvl || 0));
  }
  function panelBag() {
    const P = G().S.player, inv = P.inventory, cap = PD_DATA.config.inventoryMax, g = G();
    const sel = inv.find(w => w.uid === selUid), shown = sel || P.weapon;
    const isArt = sel && sel.kind === 'artifact';
    if (!sel || isArt) cmpOn = false;
    const isLocked = sel && g.isLocked(sel.uid), isCons = sel && g.CONSUMABLE[sel.kind];
    const isActive = isCons && g.activeConsumable === sel.kind;
    const isSecond = isCons && g.secondConsumable === sel.kind;
    // ข้อมูล 4 บรรทัดแรก (ชื่อ · ชนิด/ความหายาก/iLv · ค่าหลัก · เปรียบเทียบ) อยู่ข้างรูป · ที่เหลือ (ออปชัน/เซต/ราคา) อยู่ในกล่องล่าง
    const full = document.createElement('div'); full.innerHTML = wdetail(shown, sel ? P.weapon : undefined);
    const kids = Array.from(full.children), head = kids.slice(0, 4).map(k => k.outerHTML).join(''), rest = kids.slice(4).map(k => k.outerHTML).join('');
    const tag = sel ? '<span class="tag pick">ที่เลือก</span> <span class="wl">ถืออยู่ DPS ' + g.derived.dps.toFixed(1) + '</span>' : '<span class="tag held">ถืออยู่</span> <span class="wl">DPS ' + g.derived.dps.toFixed(1) + '</span>';
    let html = '<div class="inv"><div class="inv-l"><div class="icard">';
    html += '<div class="eqrow"><div class="eqbig">' + slotHtml(shown, 'eq').replace(' sel"', '"') + '</div><div class="eqhead"><div class="tagrow">' + tag + '</div>' + head + '</div></div>';
    // v2.3.5: Artifact สวมใส่ได้ที่หน้า "สถานะ" เท่านั้น — ในกระเป๋าแค่เลือกดูรายละเอียด/ล็อก/ทิ้ง เหมือนไอเท็มทั่วไป ไม่มีปุ่มสวมใส่ตรงนี้
    html += '<div class="btnrow ibtns">' + (sel ? (isCons
      ? '<button id="b-use">ใช้</button><button id="b-setact"' + (isActive ? ' class="eq"' : '') + '>' + (isActive ? '✓ ช่อง 1' : 'ใส่ช่อง 1') + '</button><button id="b-setact2"' + (isSecond ? ' class="eq"' : '') + '>' + (isSecond ? '✓ ช่อง 2' : 'ใส่ช่อง 2') + '</button>'
      : isArt
        ? '<span class="wl hintline">👆 ไปสวมใส่ได้ที่หน้า "สถานะ"</span><button id="b-lock">' + (isLocked ? 'ปลดล็อก' : 'ล็อก') + '</button>'
        : '<button id="b-eq">สวมใส่</button><button id="b-cmp" class="' + (cmpOn ? 'eq' : '') + '">เปรียบเทียบ</button><button id="b-lock">' + (isLocked ? 'ปลดล็อก' : 'ล็อก') + '</button>')
      : '<span class="wl hintline">👆 แตะช่องในกระเป๋าเพื่อดูรายละเอียดและเทียบกับที่ถืออยู่</span>') + '</div>';
    html += '<div class="wdet">' + (sel && cmpOn && !isCons && !isArt ? cmpTable(sel) : (rest || '<span class="wl" style="opacity:.6">—</span>')) + '</div>';
    html += '</div></div>';
    html += '<div class="inv-r"><div class="invhead"><b>กระเป๋า ' + inv.length + '/' + cap + '</b><span class="coin"></span><b>' + P.lumi + '</b> Lumi · ยา ' + g.potionCount() + '</div><div class="slots">';
    for (let i = 0; i < cap; i++) html += slotHtml(inv[i]);
    html += '</div><div class="legend">▲ ดีกว่าที่ถืออยู่ · ▼ แย่กว่า · 🔒 ล็อก · ขอบสี = ความหายาก</div>';
    html += '<div class="btnrow"><button id="b-sort">เรียงของ</button><button id="b-dropn">ทิ้งของธรรมดา</button>' + (sel && !isLocked ? '<button id="b-drop" class="bdrop">ทิ้ง</button>' : '') + '</div>';
    const qi = Object.keys(g.S.questItems).filter(k => g.S.questItems[k]);
    const tools = Object.keys(g.S.tools || {}).filter(k => g.S.tools[k]);
    if (qi.length || tools.length) html += '<div class="chips">' + tools.map(() => '<span class="chip">ยางลบ</span>').join('') + qi.map(k => '<span class="chip q">' + (PD_DATA.questItems[k].img ? '<img class="ico" alt="" src="' + PD.U.img(PD_DATA.questItems[k].img) + '"> ' : '') + esc(PD_DATA.questItems[k].name) + '</span>').join('') + '</div>';
    html += '</div></div>';
    return { title: 'กระเป๋า', html, bind(b) {
      b.querySelectorAll('.slots .slot[data-uid]').forEach(c => c.onclick = () => { selUid = selUid === c.dataset.uid ? null : c.dataset.uid; UI.renderPanel(); });
      b.querySelector('.eqbig .slot').onclick = () => { selUid = null; UI.renderPanel(); };
      const eq = b.querySelector('#b-eq'); if (eq) eq.onclick = () => { G().equip(selUid); selUid = null; UI.renderPanel(); };
      const cm = b.querySelector('#b-cmp'); if (cm) cm.onclick = () => { cmpOn = !cmpOn; UI.renderPanel(); };
      const us = b.querySelector('#b-use'); if (us) us.onclick = () => { const item = P.inventory.find(x => x.uid === selUid); if (item) G().useItem(item.kind, true); if (!P.inventory.some(x => x.uid === selUid)) selUid = null; UI.renderPanel(); };
      for (const [id, key] of [['#b-setact', 'activeConsumable'], ['#b-setact2', 'secondConsumable']]) {
        const button = b.querySelector(id);
        if (button) button.onclick = () => {
          const it = P.inventory.find(x => x.uid === selUid);
          if (!it || !g.CONSUMABLE[it.kind]) return;
          g[key] = it.kind;
          g.save();
          g.toast('ติดตั้ง ' + (ITEM_NAME[it.kind] || it.kind));
          UI.renderPanel();
        };
      }
      const dr = b.querySelector('#b-drop'); if (dr) dr.onclick = () => { if (G().isLocked(selUid)) { G().toast('ของถูกล็อกอยู่'); return; } G().discard(selUid); selUid = null; UI.renderPanel(); };
      const lk = b.querySelector('#b-lock'); if (lk) lk.onclick = () => { G().toggleLock(selUid); UI.renderPanel(); };
      b.querySelector('#b-sort').onclick = () => { sortBag(P.inventory); UI.renderPanel(); };
      b.querySelector('#b-dropn').onclick = () => { P.inventory = P.inventory.filter(w => G().CONSUMABLE[w.kind] || w.rarity !== 'normal' || G().isLocked(w.uid)); selUid = null; UI.renderPanel(); };
    } };
  }
  function skillDetail(s) {
    const lv = PD.Skills.level(s.id), L = Math.max(1, lv), at = a => Array.isArray(a) ? a[L - 1] : a;
    const pw = s.power[L - 1], rows = [];
    const ct = s.castTime !== undefined ? at(s.castTime) : s.cat === 'ult' ? (PD_DATA.config.ultCastTime || 0) : 0;
    rows.push(['เลเวลที่แสดง', 'Lv ' + L + (lv ? '' : ' (ยังไม่เรียน)')], ['เวลาร่าย', ct ? ct + ' วิ' : 'ทันที'], ['คูลดาวน์', s.cd + ' วิ'], ['หมึก', s.ink]);
    if (s.kind === 'heal') rows.push(['ผล', 'ฟื้น ' + Math.round(pw * 100) + '% ของ HP สูงสุด']);
    else if (s.kind === 'freeze') rows.push(['หยุดศัตรู', pw + ' วิ'], ['ศัตรูรับดาเมจเพิ่ม', Math.round((s.vuln - 1) * 100) + '%'], ['รัศมี', s.radius + ' ช่อง']);
    else {
      rows.push(['ดาเมจ', '×' + pw + (s.cat === 'magic' ? ' พลังเวท' : ' พลังกายภาพ') + (s.strikes ? ' ต่อหยด' : '')]);
      if (s.strikes) rows.push(['จำนวนหยด', s.strikes[L - 1]], ['ระยะเวลาทำดาเมจ', at(s.dur) + ' วิ'], ['วงกว้าง', s.area + ' ช่อง']);
      if (s.radius && s.kind !== 'freeze') rows.push(['รัศมี', s.radius + ' ช่อง']);
      if (s.range) rows.push(['ระยะ', s.range + ' ช่อง']);
      if (s.dist) rows.push(['ระยะพุ่ง', s.dist + ' ช่อง']);
      if (s.slow) rows.push(['ชะลอศัตรู', Math.round(s.slow * 100) + '% นาน ' + s.slowDur + ' วิ']);
    }
    return '<b>' + UI.ico(s) + ' ' + esc(s.name) + '</b><div style="text-align:left;margin-top:6px">' + rows.map(r => '<div><span style="opacity:.7">' + r[0] + ':</span> <b>' + r[1] + '</b></div>').join('') + '<div style="margin-top:6px">' + esc(s.desc) + '</div></div>';
  }
  let skillQueue = {};
  function panelSkills() {
    const g = G(), P = g.S.player, K = PD.Skills;
    const spent = Object.values(P.skills).reduce((sum, lv) => sum + lv, 0) -
      Object.values(PD_DATA.startPlayer.skills).reduce((sum, lv) => sum + lv, 0);
    const queued = Object.values(skillQueue).reduce((sum, count) => sum + count, 0);
    const available = P.skillPoints - queued;
    const cost = d => '<span class="skill-cost">หมึก ' + d.ink + ' · คูลดาวน์ ' + d.cd + ' วิ</span>';
    const install = (id, equipped) => '<button data-install="' + id + '"' +
      (equipped ? ' class="eq" aria-pressed="true"' : ' aria-pressed="false"') + '>ติดตั้ง</button>';
    let html = '<div class="skill-summary"><strong>แต้มสกิลคงเหลือ ' + available + '/' +
      (P.skillPoints + spent) + '</strong><div class="skill-commit"><button id="skill-apply"' +
      (queued ? '' : ' disabled') + '>ยืนยัน' + (queued ? ' (' + queued + ')' : '') +
      '</button>' + (queued ? '<button id="skill-reset">ล้างที่เลือก</button>' : '') + '</div></div>';
    html += '<div class="cols skill-grid">';
    for (const [cat, section] of Object.entries(PD_DATA.skillCats)) {
      html += '<section class="skcat"><h4>' + (section.slot + 1) + '. ' + section.name + '</h4>';
      for (const s of PD_DATA.skills.filter(d => d.cat === cat)) {
        const lv = K.level(s.id), count = skillQueue[s.id] || 0, next = lv + count;
        const why = K.canLearn(s.id, next, available);
        const required = K.requiredLevel(s.id, next);
        const levelClass = P.level < required ? ' skill-locked' : '';
        html += '<div class="sk skill-card"><div class="si">' + UI.ico(s) +
          '</div><div class="skill-card-body"><div class="skill-heading"><b>' + esc(s.name) + '</b><strong class="skill-level">LV.' + next + '/' + s.maxLv +
          '</strong></div><div class="skill-metadata">' + cost(s) +
          (next < s.maxLv ? '<span class="skill-requirement' + levelClass + '">ขั้นถัดไป Lv.' + required + '</span>' : '') +
          '</div><div class="skill-actions"><button data-learn="' + s.id + '"' +
          (why ? ' disabled title="' + esc(why) + '"' : '') + '>' + 'อัพ' +
          '</button>' + (count ? '<button data-unqueue="' + s.id + '" aria-label="ลดแต้มที่เลือก">−</button>' : '') +
          '<button data-sinfo="' + s.id + '">รายละเอียด</button>' +
          (lv ? install(s.id, P.slots.includes(s.id)) : '') + '</div></div></div>';
      }
      html += '</section>';
    }
    html += '</div>';
    const weaponSkills = K.weaponSkills();
    if (weaponSkills.length) {
      html += '<section class="skcat skill-weapons"><h4>สกิลอาวุธ</h4>';
      for (const id of weaponSkills) {
        const d = K.def(id); if (!d) continue;
        html += '<div class="sk skill-weapon"><div class="si">' + UI.ico(d) + '</div><div class="sd"><b>' +
          esc(d.name) + '</b><div>' + esc(d.desc || '') + '</div>' + cost(d) +
          '</div>' + install(id, P.slots.includes(id)) + '</div>';
      }
      html += '</section>';
    }
    return { title: 'สกิล', html, bind(b) {
      b.querySelectorAll('[data-learn]').forEach(button => button.onclick = () => {
        const id = button.dataset.learn, count = skillQueue[id] || 0;
        if (!K.canLearn(id, K.level(id) + count, available)) skillQueue[id] = count + 1;
        UI.renderPanel();
      });
      b.querySelectorAll('[data-unqueue]').forEach(button => button.onclick = () => {
        const id = button.dataset.unqueue;
        if (--skillQueue[id] === 0) delete skillQueue[id];
        UI.renderPanel();
      });
      const reset = b.querySelector('#skill-reset');
      if (reset) reset.onclick = () => { skillQueue = {}; UI.renderPanel(); };
      b.querySelector('#skill-apply').onclick = () => {
        const entries = Object.entries(skillQueue);
        if (!entries.length || queued > P.skillPoints ||
            entries.some(([id, count]) => K.canLearn(id, K.level(id) + count - 1, P.skillPoints))) return;
        for (const [id, count] of entries) for (let i = 0; i < count; i++) K.learn(id);
        skillQueue = {}; g.save(); UI.renderPanel();
      };
      b.querySelectorAll('[data-sinfo]').forEach(button => button.onclick = () => UI.info(skillDetail(K.def(button.dataset.sinfo))));
      b.querySelectorAll('[data-install]').forEach(button => button.onclick = () => {
        const current = P.slots.map((id, i) => (i + 1) + ') ' + (K.def(id)?.name || '—')).join('\n');
        UI.slotPick(button.dataset.install, current);
      });
    } };
  }
  function statBonusStr(base, bonus) { return bonus > 0 ? '<span class="up">+' + bonus + '</span> ' + base : '' + base; }
  function panelStatus() {
    const g = G(), P = g.S.player, D = g.derived, N = PD_DATA.statNames, c = PD_DATA.classes[P.cls];
    // คำนวณโบนัสจากอาวุธ/ชุด/Artifact
    const baseS = PD.Stats.baseStats(P.level, P.cls);
    const gearBonus = k => D[k] - baseS[k];
    const bonus = statBonusFormatter(P, D);
    const rows = [['อาชีพ', c.name], ['เลเวล', '' + P.level], ['EXP', P.exp + ' / ' + PD.Stats.expNeed(P.level), 'wide'],
      [N.STR, statBonusStr(baseS.STR, gearBonus('STR'))], [N.AGI, statBonusStr(baseS.AGI, gearBonus('AGI'))],
      [N.VIT, statBonusStr(baseS.VIT, gearBonus('VIT'))], [N.INT, statBonusStr(baseS.INT, gearBonus('INT'))],
      ['โจมตีกายภาพ', bonus('physPower', 1)], ['DEF', defenseValue(bonus('def', 1), bonus('dmgReduce', 0, 100, '%'))],
      ['โจมตีเวท', bonus('magicPower', 1)], ['MDEF', defenseValue(bonus('mdef', 1), bonus('dmgReduceMagic', 0, 100, '%'))],
      ['HP สูงสุด', bonus('maxHp', 0)], ['หมึกสูงสุด', bonus('maxInk', 0)],
      ['ฟื้น HP/วิ', bonus('hpRegen', 1)], ['ฟื้นหมึก/วิ', bonus('inkRegen', 1)],
      ['ตี/วิ', bonus('attackRate', 2)], ['คริติคอล', bonus('crit', 0, 100, '%')],
      ['ความเร็วเดิน', bonus('moveUnits', 0)], ['ดูดเลือด', bonus('leech', 0, 100, '%')]];
    // v2.3.5: สวมใส่/ถอด Artifact ทำได้จากหน้านี้เท่านั้น — ปุ่มอยู่บนสุด (ก่อน stat-grid) เสมอ กันตกขอบจอแบบที่เคยเกิด (บั๊ก v2.3.1→v2.3.2)
    const arts = P.artifacts || {};
    let artHtml = '<div class="btnrow" style="margin-bottom:8px"><button id="b-artifact">สวมใส่ Artifact</button></div>';
    const equipped = ['STR', 'VIT', 'AGI', 'INT'].filter(s => arts[s] && PD_DATA.artifactDefs[arts[s].defId]); // กันของเก่าที่ defId ไม่มีแล้ว (เซฟก่อน v2.3.3) ไม่ให้พังทั้งพาเนล
    if (equipped.length) {
      artHtml += '<div class="art-equipped" style="margin-bottom:8px">';
      for (const s of equipped) {
        const a = arts[s], def = PD_DATA.artifactDefs[a.defId], gr = PD_DATA.artifactGrades.find(x => x.id === a.grade), cell = PD_DATA.artifactCellValue(a.defId, s, a.grade);
        artHtml += '<div class="art-eq-row"><div class="art-eq-head"><span class="art-eq-name" title="' + esc(def.name) + '">' + artifactIcon(a) + ' <b>' + s + '</b> ' + esc(def.name) + ' <small style="color:' + (gr ? gr.color : '#333') + '">(' + (gr ? gr.name : '') + ')</small></span><button data-unequip="' + s + '">ถอด</button></div><div class="wl">' + (cell ? artifactBonusHtml(cell) : '') + '</div></div>';
      }
      artHtml += '</div>';
    } else {
      artHtml += '<p class="wl" style="opacity:.6;margin-bottom:8px">ยังไม่ได้สวม Artifact</p>';
    }
    return { title: 'สถานะ', dps: 'DPS ' + D.dps.toFixed(1), html: artHtml + '<div class="stat-grid">' + statRows(rows) + '</div>' +
      '<p style="opacity:.7">เลเวลอัพแต่ละครั้ง: ' + Object.keys(c.growth).map(k => N[k] + ' +' + c.growth[k]).join(', ') + '</p>',
      bind(b) { const ab = b.querySelector('#b-artifact'); if (ab) ab.onclick = () => UI.statusArtifactPick();
        b.querySelectorAll('[data-unequip]').forEach(x => x.onclick = () => { g.unequipArtifact(x.dataset.unequip); UI.renderPanel(); }); }
    };
  }
  // ---------- ร้าน Artifact (v2.3.1: ขายแค่ 4 อย่างตามธาตุ — ไม่ผูก stat) ----------
  let artShopTab = 'all';
  function panelArtifactShop() {
    const g = G(), P = g.S.player;
    if (!PD_DATA.artifactShopItems) PD_DATA.artifactShopItems = PD_DATA.buildArtifactShop();
    const items = PD_DATA.artifactShopItems;
    const ELEMS = [['all', 'ทั้งหมด'], ['fire', '🔥ไฟ'], ['ice', '❄น้ำแข็ง'], ['bolt', '⚡สายฟ้า'], ['ink', '✒หมึก']];
    let html = '<div class="chips">' + ELEMS.map(e => '<button data-et="' + e[0] + '" class="' + (artShopTab === e[0] ? 'on' : '') + '">' + e[1] + '</button>').join('') + '<span style="margin-left:auto"><span class="coin"></span> <b>' + (P.lumi || 0) + '</b> Lumi</span></div>';
    html += '<p class="wl" style="opacity:.7">ซื้อแล้วค่อยเลือกช่องสวมใส่ทีหลังได้ (STR/VIT/AGI/INT) — ของชิ้นเดียวกันให้ผลต่างกันตามช่องที่เลือก</p>';
    const filtered = artShopTab === 'all' ? items : items.filter(it => it.elem === artShopTab);
    html += '<div class="shoplist">' + filtered.map((it) => {
      const idx = items.indexOf(it);
      return '<div class="shoprow">' + artifactIcon(it) + '<div><b style="color:' + it.gradeColor + '">' + esc(it.name) + ' (' + it.gradeName + ')</b><div class="wl">' + esc(it.flavor) + '</div></div><button data-abuy="' + idx + '"' + ((P.lumi || 0) < it.price ? ' disabled' : '') + '>' + it.price + ' Lumi</button></div>';
    }).join('') + '</div>';
    return { title: 'ร้านความทรงจำ', html, bind(b) {
      b.querySelectorAll('[data-et]').forEach(x => x.onclick = () => { artShopTab = x.dataset.et; UI.renderPanel(); });
      b.querySelectorAll('[data-abuy]').forEach(x => x.onclick = () => { const it = items[+x.dataset.abuy]; if (it && g.buyArtifact(it.defId, it.grade)) UI.renderPanel(); });
    } };
  }
  // v2.3.3: การสวมใส่ Artifact ย้ายไปอยู่ที่หน้า "กระเป๋า" แล้ว (แตะช่อง Artifact → UI.artifactSlotPick) —
  // พาเนลแยกแบบเดิม (เลือกช่อง > เลือกของ > พรีวิว) ถูกเอาออก เพราะมีปัญหาปุ่มกดไม่ติดบนมือถือจริงซ้ำสองรอบ
  // ส่วนการถอด ทำได้ตรงจากหน้าสถานะ (ดู panelStatus ด้านบน)
  function panelQuest() {
    const S = G().S; let html = '';
    // เรียงตามลำดับที่เควสเริ่มจริง (seq) · เซฟเก่าที่ไม่มี seq ใช้ลำดับดินแดน/หลัก→รอง แทน · จัดกลุ่มตามดินแดน (ดินแดนที่เริ่มก่อนอยู่บน)
    const seqOf = {}; let fb = 0;
    for (const land of PD_DATA.lands) for (const qid of [land.mainQuest, land.sideQuest].concat(land.extraQuests || [])) if (qid) seqOf[qid] = (S.quests[qid] && S.quests[qid].seq) || (1000 + fb++);
    const landQ = land => [land.mainQuest, land.sideQuest].concat(land.extraQuests || []).filter(q => q && S.quests[q]).sort((a, b) => seqOf[a] - seqOf[b]);
    const lands = PD_DATA.lands.filter(l => S.lands[l.id] && landQ(l).length).sort((a, b) => seqOf[landQ(a)[0]] - seqOf[landQ(b)[0]]);
    for (const land of lands) {
      html += '<h4 style="margin:8px 0 2px">' + esc(land.name) + ' <small style="opacity:.6">' + esc(land.story) + '</small></h4>';
      for (const qid of landQ(land)) {
        const st = S.quests[qid], q = PD_DATA.quests[qid]; if (!st || (q.hidden && !st.done)) continue; // เควสลับไม่โชว์จนกว่าจะจบ
        html += '<div class="qitem' + (st.done ? ' done' : '') + '"><b>' + (q.type === 'main' ? '◆ ' : '◇ ') + esc(q.name) + (st.done ? ' ✓' : '') + '</b><div class="steps">' +
          q.steps.map((s, i) => '<div class="' + (i < st.step || st.done ? 'ok' : i === st.step ? 'now' : '') + '">' + (i + 1) + '. ' + esc(s.text) + (i === st.step && s.t === 'collect' && !st.done ? ' (' + st.cnt + '/' + s.count + ')' : '') + '</div>').join('') + '</div></div>';
      }
    }
    return { title: 'บันทึกเควส', html };
  }
  const LAND_ICON = {
    village: 'M4 20V11L12 4L20 11V20Z M10 20v-5h4v5',
    cave: 'M3 20 Q12 -1 21 20 M8 20 Q12 9 16 20',
    library: 'M4 6 Q8 4 12 6 Q16 4 20 6 V19 Q16 17 12 19 Q8 17 4 19Z M12 6V19',
    field: 'M6 18 L16 8 L19 11 L9 21 L5 22Z M16 8 L18 6 L21 9 L19 11',
    castle: 'M5 21V9H8V12H11V9H13V12H16V9H19V21Z M10 21v-4h4v4',
    sea: 'M2 9 Q5 6 8 9 T14 9 T20 9 M2 14 Q5 11 8 14 T14 14 T20 14 M4 19 Q7 16 10 19 T16 19',
    tree: 'M12 22V12 M12 15 L8 11 M12 14 L16 10 M12 3 a6 5 0 1 0 0.1 0',
    desert: 'M2 20 Q7 13 12 20 Q17 12 22 20 M15 9 V3 M15 6 H18 V4 M15 7 H12 V5',
    dream: 'M3 12 Q12 3 21 12 Q12 21 3 12Z M12 9 a3 3 0 1 0 0.1 0 M17 3 l1 2 l2 0.5 l-2 0.5 l-1 2 l-1 -2 l-2 -0.5 l2 -0.5Z',
    minworld: 'M12 3 a9 9 0 1 0 0.1 0 M8 10 h2 M14 10 h2 M8 15 Q12 18 16 15',
    forest: 'M12 21 V15 M12 3 L6 11 H9 L5 16 H19 L15 11 H18 Z',
    fairy: 'M12 20 V13 M12 13 Q5 4 4 11 Q6 14 12 13 Q19 14 20 11 Q19 4 12 13 M10 20 Q12 17 14 20'
  };
  const icon = th => '<svg viewBox="0 0 24 24" class="licon"><path d="' + (LAND_ICON[th] || LAND_ICON.village) + '"/></svg>';
  // ภาพเมืองจริง: town_01..10.webp ตามลำดับดินแดน (256×256 ขอบล่างชิดรูป → ใช้เป็นจุดยึดล่าง ย่อด้วยสัดส่วนเดียวกันทุกรูป)
  const TOWN = { village: 1, slime_cave: 2, ink_library: 3, pencil_field: 4, folded_castle: 5, ink_sea: 6, ink_tree: 7, desert_city: 8, dream_city: 9, fairy_city: 10 };
  const BONUS_ART = { bonus_obsidian: '001.webp', bonus_void: 'folded-book-town.png', bonus_inkgod: '003.webp', shadow_forest: '004.webp' };
  const picon = l => BONUS_ART[l.id] ? '<img class="town" draggable="false" alt="" src="town/' + BONUS_ART[l.id] + '">' : TOWN[l.id] ? '<img class="town" draggable="false" alt="" src="town/town_' + String(TOWN[l.id]).padStart(2, '0') + '.webp">' : icon(l.theme);
  let wmPlace = null, wmPicker = false;
  // แสดงรอยเท้าระหว่างเดินทาง
  function wmWalk(wm, from, to, done) {
    const R = wm.getBoundingClientRect(), a = from.getBoundingClientRect(), t = to.getBoundingClientRect();
    const ax = a.left + a.width / 2 - R.left, ay = a.bottom - a.height * .25 - R.top, bx = t.left + t.width / 2 - R.left, by = t.bottom - t.height * .25 - R.top;
    const len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
    // เวลาเดิน: ช่องซ้ายสุด→ขวาสุดของตาราง = 2 วิ ที่เหลือเฉลี่ยตามระยะทาง · แสดงเฉพาะรอยเท้า (ไม่มีเส้นประ)
    const gr = wm.querySelector('.wgrid2'), span = gr ? gr.getBoundingClientRect().width * (PD_DATA.config.worldGrid.cols - 1) / PD_DATA.config.worldGrid.cols : 0;
    const T = Math.max(0.25, span > 0 ? 2 * len / span : 0.5), n = Math.max(3, Math.round(len / 26));
    const ov = document.createElement('div'); ov.className = 'wwalk';
    for (let i = 0; i < n; i++) {
      const f = (i + .5) / n, side = i % 2 ? 5 : -5, nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1), d = document.createElement('i');
      d.className = 'wfoot'; d.style.left = (ax + (bx - ax) * f + nx * side) + 'px'; d.style.top = (ay + (by - ay) * f + ny * side) + 'px'; d.style.setProperty('--r', (ang + 90) + 'deg'); d.style.animationDelay = (T * i / n) + 's';
      ov.appendChild(d);
    }
    wm.appendChild(ov);
    setTimeout(done, T * 1000 + 250);
  }
  function panelWorld() {
    const g = G(), S = g.S, gw = PD_DATA.config.worldGrid, PL = PD_DATA.config.placement;
    const pending = S.pendingPages.map(id => g.landById(id)).filter(Boolean);
    const pend = pending.find(land => land.id === wmPlace)?.id;
    if (!pend) wmPlace = null;
    if (!pending.length) wmPicker = false;
    const at = {}; for (const id in S.lands) at[S.lands[id].placed.join()] = id;
    const kindOf = (c, r) => { const d = PD.U.chebyshev([c, r], gw.home); return d <= PL.warm.maxDist ? 'warm' : d <= PL.normal.maxDist ? 'normal' : 'strange'; };
    const lvBadge = l => (l.postgame || l.bonus) ? '<em class="wlv">Lv ' + (!l.bonus && l.id !== 'shadow_forest' && S.lands[l.id]?.placed[0] >= 0 ? g.landLevel(l) : l.baseLevel) + '</em>' : '';
    const tile = (l, extra, lab, placed = false) => {
      const ls = S.lands[l.id] || {}, done = !!ls.completed;
      const picture = placed ? '<div class="world-town-art">' + picon(l) + '</div>' : picon(l);
      return '<div class="wland' + (done ? ' done' : '') + (g.land.id === l.id ? ' here' : '') + (extra || '') + '" style="--lc:' + l.color + '" data-go="' + l.id + '">' + picture + '<b><u>' + esc(l.name) + '</u>' + (done ? '<i class="wtick">✓</i>' : '') + '</b>' + (lab ? '<span>' + lab + '</span>' : '') + lvBadge(l) + '</div>';
    };
    let html = '<div class="wm"><div class="wscroll"><div class="wmap"><div class="wgrid2">';
    for (let r = 0; r < gw.rows; r++) for (let c = 0; c < gw.cols; c++) {
      const id = at[c + ',' + r];
      if (id) { const ls = S.lands[id]; html += tile(g.landById(id), ' pl-' + ls.placement, ls.placement === 'home' ? 'บ้าน' : PL[ls.placement].label, true); }
      else if (pend && wmPlace) { const k = kindOf(c, r); html += '<div class="wslot ' + k + '" data-place="' + c + ',' + r + '"><em>+</em><span>' + PL[k].label + '</span></div>'; }
      else html += '<div class="wempty"></div>';
    }
    html += '</div></div></div>';
    const post = PD_DATA.lands.filter(l => l.postgame && S.lands[l.id] && S.lands[l.id].placed[0] < 0); // ดินแดนหลังจบเกมของเซฟเก่า (ยังอยู่นอกตาราง)
    if (post.length) html += '<div class="wpost"><b>ดินแดนใหม่ · ศัตรูเก่งขึ้น</b><div>' + post.map(l => tile(l, '', 'Lv ' + l.baseLevel + '+')).join('') + '</div></div>';
    const bonus = PD_DATA.lands.filter(l => S.ended && l.bonus && !(S.lands[l.id]?.placed[0] >= 0) && !S.pendingPages.includes(l.id)); // โบนัสดันเจี้ยน (ปิดชั่วคราว)
    if (bonus.length || pending.length) {
      html += '<section class="world-footer"><div class="world-footer-row">';
      if (bonus.length) html += '<span class="bonus-locked"><b>🏰 โบนัสดันเจี้ยน</b> <span class="coming-soon">เร็วๆนี้</span></span>';
      if (bonus.length) html += '<div class="world-bonus-grid bonus-locked">' + bonus.map(l => '<div class="wland disabled" style="--lc:#999">' + picon(l) + '<b>' + esc(l.name) + '</b><em class="wlv">Lv ' + l.baseLevel + '</em></div>').join('') + '</div>';
      if (pending.length) html += '<button type="button" class="world-pending-button" data-pick="1" aria-expanded="' + wmPicker + '">เมืองรอวาง <span>' + pending.length + '</span></button>';
      html += '</div>';
      if (pend) html += '<div class="world-footer-head"><span class="world-placement">' + esc(g.landById(pend).name) + ' · แตะช่องว่างเพื่อวาง</span><button type="button" data-cancel="1">ยกเลิก</button></div>';
      if (wmPicker) html += '<div class="world-city-picker"><div class="world-footer-head"><b>เลือกเมืองเพื่อวาง</b><button type="button" data-pick="1" aria-label="ปิดตัวเลือกเมือง">×</button></div>' +
        pending.map(l => '<button type="button" class="world-city-option" data-pending-city="' + esc(l.id) + '">' + picon(l) + '<span>' + esc(l.name) + '</span></button>').join('') + '</div>';
      html += '</section>';
    }
    html += '</div>';
    return { title: 'แผนที่โลก · กระดาษที่เธอวาดเอง', html, bind(b) {
      const rerenderWorld = () => {
        const before = b.querySelector('.wscroll');
        const left = before.scrollLeft, top = before.scrollTop;
        UI.renderPanel();
        const after = b.querySelector('.wscroll');
        after.scrollLeft = left; after.scrollTop = top;
      };
      b.querySelectorAll('[data-pick]').forEach(button => button.onclick = () => { wmPicker = !wmPicker; rerenderWorld(); });
      b.querySelectorAll('[data-pending-city]').forEach(button => button.onclick = () => {
        wmPlace = button.dataset.pendingCity; wmPicker = false; rerenderWorld();
      });
      const cn = b.querySelector('[data-cancel]'); if (cn) cn.onclick = () => { wmPlace = null; rerenderWorld(); };
      b.querySelectorAll('[data-place]').forEach(x => x.onclick = () => {
        const [c, r] = x.dataset.place.split(',').map(Number), L = g.landById(pend);
        UI.confirm('วางหน้า "' + L.name + '" ตรงนี้? (' + PL[kindOf(c, r)].label + ')', () => { g.placeLand(pend, c, r); wmPlace = null; rerenderWorld(); }, null, 'วางเลย', 'ยังก่อน');
      });
      const sc = b.querySelector('.wscroll'), here = b.querySelector('.wland.here'); // เปิดมาโฟกัสเมืองปัจจุบันครั้งแรก แล้วเลื่อนได้อิสระ
      if (sc && here) { sc.scrollLeft = here.offsetLeft + here.offsetWidth / 2 - sc.clientWidth / 2 + (here.offsetParent === sc ? 0 : 0); sc.scrollLeft = Math.max(0, here.getBoundingClientRect().left - sc.getBoundingClientRect().left + sc.scrollLeft - sc.clientWidth / 2 + here.offsetWidth / 2); sc.scrollTop = Math.max(0, here.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - sc.clientHeight / 2 + here.offsetHeight / 2); }
      if (sc) { // ลากนิ้ว/เมาส์เพื่อเลื่อนแผนที่ (ทำเองด้วย pointer events ไม่พึ่ง touch-action ของเบราว์เซอร์) · ลากแล้วไม่นับเป็นการแตะเมือง
        let dr = null, moved = false;
        sc.addEventListener('pointerdown', e => { dr = { id: e.pointerId, x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop }; moved = false; });
        sc.addEventListener('pointermove', e => {
          if (!dr || e.pointerId !== dr.id) return; const dx = e.clientX - dr.x, dy = e.clientY - dr.y;
          if (!moved && Math.hypot(dx, dy) > 6) { moved = true; try { sc.setPointerCapture(e.pointerId); } catch (_) { } }
          if (moved) { sc.scrollLeft = dr.l - dx; sc.scrollTop = dr.t - dy; e.preventDefault(); }
        });
        const endDrag = e => { if (dr && e.pointerId === dr.id) dr = null; };
        sc.addEventListener('pointerup', endDrag); sc.addEventListener('pointercancel', endDrag);
        sc.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
      }
      let walking = false;
      b.querySelectorAll('.wland[data-go]').forEach(x => x.onclick = () => {
        const id = x.dataset.go; if (walking) return;
        if (id === g.land.id && g.mapIndex === 0) { UI.closePanel(); return; }
        if (!here || here === x) { UI.closePanel(); g.travel(id); return; }
        walking = true; wmWalk(b.querySelector('.wm'), here, x, () => { UI.closePanel(); g.travel(id); });
      });
    } };
  }
  function panelPause() {
    const sc = PD_DATA.config.sound || {}, muted = !sc.enabled;
    return { title: 'หยุดเกม', html: '<div class="btnrow"><button id="p-res">เล่นต่อ</button><button id="p-elem" class="wood">📖 คู่มือธาตุ</button><button id="p-fs">' + (UI.isFs() ? 'ออกจากเต็มจอ' : '⛶ เต็มหน้าจอ') + '</button><button id="p-title">หน้าแรก</button></div>' +
      '<div class="snd-ctrl sketch"><b>♪ เสียง</b><div class="snd-row"><button id="p-mute" class="sbtn' + (muted ? ' muted' : '') + '">' + (muted ? '🔇' : '🔊') + '</button><label>เพลง <input type="range" id="p-mvol" min="0" max="100" value="' + Math.round((sc.musicVol ?? 0.3) * 100) + '"></label><label>เอฟเฟกต์ <input type="range" id="p-svol" min="0" max="100" value="' + Math.round((sc.sfxVol ?? 0.5) * 100) + '"></label></div></div>' +
      '<p>เวลาเล่น <b>' + Math.round(G().S.playTime / 60) + ' นาที</b></p>' +
      '<p>PC: WASD/ลูกศร เดิน · 1–3 สกิล · 4/J/Space โจมตี · คลิกซ้าย โจมตี · คลิกขวา สกิล 1 · E คุย/ใช้ · Q/R ไอเท็ม · I กระเป๋า · K สกิล · C สถานะ · L เควส · M แผนที่โลก</p>' +
      '', bind(b) {
      b.querySelector('#p-res').onclick = () => UI.closePanel();
      b.querySelector('#p-elem').onclick = () => UI.openPanel('elements');
      const fsb = b.querySelector('#p-fs'); if (!UI.fsAvail()) fsb.remove(); else fsb.onclick = () => { UI.setFs(!UI.isFs()); setTimeout(() => UI.renderPanel(), 300); };
      b.querySelector('#p-title').onclick = () => { G().save(); UI.closePanel(); G().state = 'title'; UI.showTitle(); };
      b.querySelector('#p-mute').onclick = () => { const s = PD_DATA.config.sound; s.enabled = !s.enabled; PD.Sound.saveEnabled(); if (!s.enabled) PD.Sound.stopMusic(); else PD.Sound.playMusic(G().inDungeon() ? 'dungeon' : 'town'); UI.renderPanel(); };
      b.querySelector('#p-mvol').oninput = e => PD.Sound.setVol('music', e.target.value / 100);
      b.querySelector('#p-svol').oninput = e => PD.Sound.setVol('sfx', e.target.value / 100);
    } };
  }
  return UI;
})();
