// @ts-nocheck
// แผง Arena (dev) บนเอนจินจริง: ผู้เล่น / แผนที่+seed / สร้างศัตรู / ท่าบอส / ตัวเลขวัดผล
// ใช้ PD.Game / PD_DATA ตรงๆ — ไม่มีสำเนาข้อมูล จึงตรงกับเกมจริงเสมอ
const PD = () => window.PD, D = () => window.PD_DATA, G = () => PD().Game;

// เลเวลผู้เล่น "ตอนเข้าดินแดน" ตามที่จำลองในรายงานบาลานซ์ (npm run balance) — ใช้เป็นค่าเริ่มต้นของปุ่ม "ตามเกมจริง"
const ENTRY_LEVEL = { village: 1, slime_cave: 5, ink_library: 8, pencil_field: 11, folded_castle: 13, ink_sea: 16, ink_tree: 18, desert_city: 20, dream_city: 23, fairy_city: 27 };
// ท่าบอสทั้งหมด + คำอธิบายสั้น (ตรงกับ startPattern/firePattern ใน game.ts)
export const PATTERNS = {
  slam: 'วงเตือนใต้เท้าผู้เล่น → ทุบพื้น', ring: 'วงหดรอบบอส → ยิงกระสุนวงกลม', charge: 'เส้นเตือน → พุ่งชน',
  spiral: 'วงเหลือง → กระสุนเกลียว', rain: 'วงเตือนหลายจุดรอบผู้เล่น → หมึกตก',
  cross: 'วงเตือนเป็นเส้นกากบาท 4 แฉก', nova: 'วงแดงหดเข้า → ระเบิดรอบตัว',
  roots: 'รากพุ่งเป็นแฉกเขียวไปทางผู้เล่น (กวางเงา)', leaves: 'ใบไม้ยิงเป็นพัดตามแนวเล็ง (กวางเงา)'
};
const css = `#arena{position:fixed;top:0;right:0;bottom:0;z-index:50;width:min(320px, 41vw);padding-right:max(6px,env(safe-area-inset-right));padding-top:max(6px,env(safe-area-inset-top));overflow:auto;box-sizing:border-box;font:12px/1.35 sans-serif;color:#1b1b1b;background:#fffdf6;border:2px solid #1b1b1b;border-width:0 0 0 2px;padding-left:6px;padding-bottom:max(6px,env(safe-area-inset-bottom))}
#arena.min{bottom:auto;width:auto;border-width:0 0 2px 2px;border-radius:0 0 0 6px}#arena.min .ab{display:none}
#arena h4{margin:6px 0 3px;font-size:12px;border-bottom:1px dashed #1b1b1b88}
#arena .r{display:flex;gap:3px;align-items:center;margin:2px 0;flex-wrap:wrap}
#arena select,#arena input[type=number],#arena input[type=text]{font:inherit;padding:1px 2px;border:1px solid #1b1b1b;background:#fff;min-width:0;flex:1}
#arena input[type=number]{width:48px;flex:none}
#arena button{font:inherit;padding:2px 6px;border:1.5px solid #1b1b1b;border-radius:4px;background:#fff;cursor:pointer}
#arena button.red{border-color:#a8554a;color:#8f3b31;background:#f6e6e2}
#arena button:active{background:#eee}
#arena .ro{white-space:pre-wrap;font:11px/1.3 monospace;background:#f4efe2;padding:3px;border-radius:3px}
#game #hud-left{max-width:calc(100% - 16px - var(--sl) - var(--sr))}#game #menu{position:static;max-width:min(286px,100%);justify-content:flex-start}#game #tracker,#game #toasts{max-width:40%}
#arena,#arena .ab{touch-action:pan-y}#arena button,#arena select,#arena input{touch-action:manipulation}#arena [hidden]{display:none!important}#arena button,#arena select,#arena input:not([type=checkbox]){min-height:32px;box-sizing:border-box}#arena .tabs button[aria-pressed=true]{background:#222;color:white}#arena label{display:flex;align-items:center;gap:2px}`;

export function mountArenaPanel() {
  const g = G(), pd = PD(), data = D();
  g.hint = () => {}; // ปิดข้อความสอนเล่น
  const st = { inv: true, infInk: true, freeze: false, scale: 1, seed: '', killFlush: 0 };
  const meas = { t: 0, dealt0: 0, taken0: 0, win: [] }; // วัดดาเมจ ต่อวินาที (หน้าต่าง 8 วิ)
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);
  const el = document.createElement('div'); el.id = 'arena'; document.body.appendChild(el);
  const opt = (arr, f) => arr.map(f).join('');
  const lands = data.lands.slice().sort((a, b) => a.order - b.order);
  const enemies = Object.keys(data.enemies).map(id => ({ id, d: data.enemies[id] }));
  const bosses = enemies.filter(e => e.d.boss), mobs = enemies.filter(e => !e.d.boss);
  const skillOpts = c => '<option value="">—</option>' + opt(data.skills.filter(s => s.cat === c), s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`);
  el.innerHTML = `<div class="r"><b style="flex:1">🧪 Arena (เอนจินจริง) v${data.config.version}</b><button id="a-min">▾</button></div><div class="ab">
  <div class="r tabs" aria-label="เครื่องมือ Arena"></div>
  <section data-tool="Player">
  <div class="r">Lv <input id="a-lv" type="number" min="1" max="60" value="1"> อาวุธ <select id="a-wb">${opt(data.weaponBases, b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`)}</select></div>
  <div class="r">ระดับ <select id="a-wr">${opt(data.rarities, r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`)}</select> ilvl <input id="a-il" type="number" min="1" max="80" value="1"> <label><input id="a-gear" type="checkbox" checked>เกราะ</label></div>
  <div class="r">เซ็ต <select id="a-set"><option value="">— ไม่ใช้เซ็ต —</option>${opt(data.gearSets || [], t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`)}</select></div>
  <div class="r"><button id="a-apply">ใช้ค่าที่ตั้ง</button><button id="a-real">ตามเกมจริง (ดินแดนนี้)</button><button id="a-heal">เติมเต็ม</button></div>
  <div class="r"><label><input id="a-inv" type="checkbox" checked>ไม่ตาย</label><label><input id="a-ink" type="checkbox" checked>หมึกไม่หมด</label></div>
  <div class="r"><label>HP <input id="a-hp" type="number" min="1"></label><label>Ink <input id="a-mp" type="number" min="0"></label><button id="a-vitals">ตั้งค่า</button><button id="a-player-reset">รีเซ็ตผู้เล่น</button></div></section>
  <section data-tool="Skill">
  <div class="r">สกิล Lv <input id="a-sl" type="number" min="1" max="5" value="3"></div>
  <div class="r"><select id="a-s0">${skillOpts('main')}</select><select id="a-s1">${skillOpts('magic')}</select><select id="a-s2">${skillOpts('ult')}</select></div>
  <div class="r"><label>สกิลอาวุธ <select id="a-wskill"></select></label><button id="a-sapply">ใช้สกิลที่เลือก</button><button id="a-cd">รีเซ็ต Ink / CD</button></div>
  <div class="r"><button id="a-skill-target">สร้างเป้าจากหมวด Monster / Boss</button></div><div class="ro" id="a-cd-info"></div></section>
  <section data-tool="Map">
  <div class="r"><select id="a-land">${opt(lands, l => `<option value="${esc(l.id)}">${l.order}. ${esc(l.name)}${l.testmap ? ' (test)' : ''}</option>`)}</select> #<select id="a-map"></select></div>
  <div class="r">seed เพิ่ม <input id="a-seed" type="text" placeholder="ว่าง = seed เดิมของเกม"><button id="a-load">โหลด</button></div>
  <div class="r"><button id="a-rseed">สุ่ม seed</button><button id="a-stress">ทดสอบสร้าง 30 seed</button><label><input id="a-noen" type="checkbox">ไม่มีศัตรู</label></div>
  <div class="ro" id="a-mapinfo"></div>
  </section><section data-tool="Monster / Boss">
  <div class="r"><select id="a-en"><optgroup label="บอส">${opt(bosses, e => `<option value="${esc(e.id)}">${esc(e.d.name)}</option>`)}</optgroup><optgroup label="มอนสเตอร์">${opt(mobs, e => `<option value="${esc(e.id)}">${esc(e.d.name)}</option>`)}</optgroup></select></div>
  <div class="r">Lv พื้นที่ <input id="a-elv" type="number" min="1" max="99" value="1"> จำนวน <input id="a-ecnt" type="number" min="1" max="12" value="1"> <button id="a-spawn">สร้าง</button><button id="a-clear" class="red">ล้าง</button></div>
  <h4>ท่าบอส (ดูวงเตือน)</h4>
  <div class="r"><select id="a-pat">${opt(Object.keys(PATTERNS), p => `<option value="${p}">${p} — ${PATTERNS[p]}</option>`)}</select><button id="a-fire">ปล่อยท่า</button></div>
  <div class="r"><label><input id="a-frz" type="checkbox">แช่แข็ง AI</label> ความเร็วเกม <select id="a-ts"><option value="0.25">×0.25</option><option value="0.5">×0.5</option><option value="1" selected>×1</option><option value="2">×2</option></select></div>
  <div class="r"><button id="a-en-reset">รีเซ็ตศัตรู</button></div><div class="ro" id="a-ai"></div></section>
  <section data-tool="Item"><div class="r"><input id="a-item-search" type="text" placeholder="ชื่อหรือ ID" aria-label="ค้นหาไอเท็ม"><select id="a-category" aria-label="หมวดไอเท็ม"><option value="">ทั้งหมด</option><option>Weapon</option><option>Armor</option><option>Artifact</option><option>Consumable</option><option>Other</option></select></div>
  <div class="r"><select id="a-item" aria-label="ไอเท็ม"></select></div><div class="r"><label>Lv <input id="a-item-level" type="number" min="1" max="80" value="1"></label><label>จำนวน <input id="a-item-count" type="number" min="1" max="99" value="1"></label><button id="a-add">เพิ่มเข้ากระเป๋า</button></div></section>
  <section data-tool="Shop"><div class="r"><button id="a-shop">เปิดร้าน 0 Lumi</button></div></section>
  <section data-tool="Debug"><div class="ro" id="a-stat"></div>
  <div class="r"><label><input id="a-hitboxes" type="checkbox">Hitbox / Range</label><button id="a-reset">รีเซ็ตตัววัด</button><button id="a-reset-all">รีเซ็ต Arena</button></div></section></div>`;
  const $ = id => el.querySelector('#' + id);
  const sections = [...el.querySelectorAll('[data-tool]')];
  const tabs = sections.map(section => {
    const button = document.createElement('button');
    button.textContent = section.dataset.tool;
    button.onclick = () => {
      sections.forEach((panel, i) => {
        panel.hidden = panel !== section;
        tabs[i].setAttribute('aria-pressed', String(panel === section));
      });
    };
    el.querySelector('.tabs').append(button);
    return button;
  });
  tabs[0].click();
  const P = () => g.S.player;
  const landOf = () => data.lands.find(l => l.id === $('a-land').value);
  const fillMaps = () => { const l = landOf(); $('a-map').innerHTML = opt(l.maps.map((m, i) => i), i => `<option value="${i}">${i}: ${esc(l.maps[i].name || '')}</option>`); };

  const wb = $('a-wb');
  function fillWeaponSkills() {
    const select = $('a-wskill'), previous = select.value;
    select.replaceChildren(new Option('—', ''));
    for (const id of data.weaponSkills?.[wb.value] || []) {
      const def = pd.Skills.def(id);
      if (def) select.add(new Option(def.name, id));
    }
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
  }
  wb.onchange = fillWeaponSkills;
  function applySkills() {
    const p = P(), level = Math.max(1, +$('a-sl').value | 0);
    p.skills = {};
    p.slots = [0, 1, 2].map(i => $('a-s' + i).value || null);
    const weaponSkill = $('a-wskill').value;
    if (weaponSkill && pd.Skills.hasWeaponSkill(weaponSkill)) p.slots[0] = weaponSkill;
    for (const id of p.slots.filter(Boolean)) {
      const def = pd.Skills.def(id);
      p.skills[id] = Math.min(level, def.maxLv || 1);
    }
    pd.Skills.sanitizeSlots();
    pd.UI.update();
  }
  const heal = () => { g.player.hp = g.derived.maxHp; g.player.ink = g.derived.maxInk; };
  const freshPlayer = () => {
    const { x, y } = g.player;
    g.S.player = g.freshSave().player;
    g.initPlayer();
    Object.assign(g.player, { x, y });
    heal();
    $('a-lv').value = P().level;
    pd.UI.update();
  };
  $('a-vitals').onclick = () => {
    st.inv = $('a-inv').checked = false;
    st.infInk = $('a-ink').checked = false;
    if ($('a-hp').value !== '') g.player.hp = Math.max(1, Math.min(g.derived.maxHp, +$('a-hp').value));
    if ($('a-mp').value !== '') g.player.ink = Math.max(0, Math.min(g.derived.maxInk, +$('a-mp').value));
  };
  $('a-player-reset').onclick = freshPlayer;
  $('a-sapply').onclick = applySkills;
  $('a-skill-target').onclick = () => {
    clearEnemies();
    spawn();
  };
  $('a-cd').onclick = () => { g.player.cd = {}; g.player.ink = g.derived.maxInk; };
  const catalog = [
    ...data.config.shop.map((it, i) => ({
      id: it.kind, name: it.name, category: 'Consumable', iconItem: { kind: it.kind },
      add: (_, count) => {
        const inv = P().inventory, stack = data.config.potionMax;
        const space = inv.filter(item => item.kind === it.kind).reduce((sum, item) => sum + Math.max(0, stack - item.n), 0);
        if (count > space + Math.max(0, data.config.inventoryMax - inv.length) * stack) return false;
        return g.addItem(it.kind, count);
      },
      buy: () => g.buy(i, true)
    })),
    ...data.buildArtifactShop().map(it => ({
      id: it.defId + ':' + it.grade, name: it.name + ' (' + it.gradeName + ')', category: 'Artifact', iconItem: { kind: 'artifact', defId: it.defId, grade: it.grade },
      add: () => g.addEquipment({ uid: pd.U.uid(), kind: 'artifact', defId: it.defId, grade: it.grade }),
      buy: () => g.buyArtifact(it.defId, it.grade, true)
    })),
    ...[['Weapon', data.weaponBases, pd.Loot.make], ['Armor', data.gearBases.filter(it => ['body','legs'].includes(it.slot)), pd.Loot.makeGear], ['Other', data.gearBases.filter(it => !['body','legs'].includes(it.slot)), pd.Loot.makeGear]]
      .flatMap(([category, bases, make]) => bases.map(it => {
        const add = level => g.addEquipment(make(it.id, 'normal', level));
        return { id: it.id, name: it.name, category, iconItem: { kind: category === 'Weapon' ? 'weapon' : 'gear', base: it.id, slot: it.slot, rarity: 'normal' }, add, buy: () => g.purchase(it.name, 0, () => add(1)) };
      }))
  ];
  const item = $('a-item'), itemSearch = $('a-item-search'), category = $('a-category');
  function filterItems() {
    const query = itemSearch.value.trim().toLowerCase();
    item.replaceChildren();
    catalog.forEach((entry, i) => {
      if (category.value && entry.category !== category.value) return;
      if ((entry.id + ' ' + entry.name).toLowerCase().includes(query)) item.add(new Option(entry.name, String(i)));
    });
    updateItemOptions();
  }
  function updateItemOptions() {
    const entry = item.value === '' ? null : catalog[+item.value];
    $('a-add').disabled = !entry;
    $('a-item-level').disabled = !entry || !['Weapon', 'Armor', 'Other'].includes(entry.category);
    $('a-item-count').disabled = entry?.category !== 'Consumable';
  }
  itemSearch.oninput = category.onchange = filterItems;
  item.onchange = updateItemOptions;
  $('a-add').onclick = () => {
    if (item.value === '') return;
    const entry = catalog[+item.value], level = Math.max(1, Math.min(80, +$('a-item-level').value | 0));
    const count = Math.max(1, Math.min(99, +$('a-item-count').value | 0));
    g.toast(entry.add(level, count) ? 'เพิ่ม ' + entry.name : 'กระเป๋าเต็ม', '#555');
  };
  $('a-shop').onclick = () => pd.UI.openArenaShop(catalog);
  filterItems();
  // ---- ผู้เล่น ----
  function applyPlayer() {
    const p = P(), lv = Math.max(1, +$('a-lv').value | 0), il = Math.max(1, +$('a-il').value | 0), rar = $('a-wr').value;
    p.level = lv; p.exp = 0;
    const set = (data.gearSets || []).find(t => t.id === $('a-set').value);
    if (set) { $('a-wb').value = set.weapon; $('a-gear').checked = true; } // เลือกเซ็ต → อาวุธ+เสื้อ+กางเกงของเซ็ตครบ 3 ชิ้น (เปิดโบนัสเซ็ต)
    p.weapon = pd.Loot.make($('a-wb').value, rar, il, () => 0.5);
    if ($('a-gear').checked) for (const slot of ['body', 'legs']) { const id = set ? set[slot] : (data.gearBases.find(x => x.slot === slot) || {}).id; if (id) p.gear[slot] = pd.Loot.makeGear(id, rar, il, () => 0.5); }
    else p.gear = { body: null, legs: null, acc: null, acc2: null };
    fillWeaponSkills();
    g.recalc();
    applySkills();
    heal();
  }
  function realPreset() { const l = landOf(); const lv = ENTRY_LEVEL[l.id] || Math.max(1, l.baseLevel - 2); $('a-lv').value = lv; $('a-il').value = lv; $('a-wr').value = 'magic'; $('a-gear').checked = lv > 1; $('a-sl').value = Math.min(5, 1 + Math.floor(lv / 6)); applyPlayer(); }
  // ค่าเริ่มต้นสกิล: ตัวแรกของแต่ละหมวด
  ['main', 'magic', 'ult'].forEach((c, i) => { const s = data.skills.find(x => x.cat === c); if (s) $('a-s' + i).value = s.id; });
  $('a-apply').onclick = applyPlayer; $('a-real').onclick = realPreset;
  $('a-heal').onclick = heal;
  $('a-inv').onchange = e => { st.inv = e.target.checked; }; $('a-ink').onchange = e => { st.infInk = e.target.checked; };
  $('a-frz').onchange = e => { st.freeze = e.target.checked; }; $('a-ts').onchange = e => { st.scale = +e.target.value; };

  // ---- แผนที่ ----
  const origSeed = pd.U.strSeed.bind(pd.U);
  const setSeed = s => { st.seed = s; pd.U.strSeed = s ? (str => origSeed(str + '|' + s)) : origSeed; };
  function mapInfo(m) {
    const cnt = {}; for (const e of m.enemySpawns) cnt[e.type] = (cnt[e.type] || 0) + 1;
    const kinds = {}; for (const b of m.blockers || []) kinds[b.kind] = (kinds[b.kind] || 0) + 1;
    $('a-mapinfo').textContent = `${m.name} · ${m.w}×${m.h} · ลองสร้าง ${m.attempt + 1} ครั้ง\nศัตรู ${m.enemySpawns.length}: ` + Object.keys(cnt).map(k => data.enemies[k].name + '×' + cnt[k]).join(', ') +
      `\nบอส: ${(m.bossSpawns || []).map(b => data.enemies[b.type].name).join(', ') || '—'} · ปริศนา: ${Object.keys(kinds).map(k => k + '×' + kinds[k]).join(', ') || '—'} · rooms ${m.rooms ? m.rooms.length : '-'}`;
  }
  function refreshEnemyLevels() {
    const current = landOf(), index = +$('a-map').value || 0;
    for (const option of $('a-en').options) {
      const def = data.enemies[option.value];
      const matches = (map, id) => map.boss === id || map.boss?.[0] === id ||
        map.bosses?.some(b => (b.type || b[0]) === id) || map.enemies?.some(e => e[0] === id);
      let land = current, mapIndex = index;
      if (!matches(current.maps[index], option.value)) {
        land = lands.find(candidate => candidate.maps.some(map => matches(map, option.value))) || current;
        const first = land.maps.findIndex(map => matches(map, option.value));
        if (first >= 0) mapIndex = first;
      }
      const sequence = land.maps[mapIndex]?.bosses?.findIndex(b => b.type === option.value) ?? -1;
      const base = g.landLevel(land) + mapIndex + (def.boss ? 1 + Math.max(0, sequence) : 0);
      option.dataset.level = base;
      option.textContent = def.name + ' (Lv.' + g.enemyLevel(def, base) + ')';
    }
    $('a-elv').value = $('a-en').selectedOptions[0]?.dataset.level || 1;
  }
  $('a-en').onchange = () => { $('a-elv').value = $('a-en').selectedOptions[0]?.dataset.level || 1; };
  $('a-map').onchange = refreshEnemyLevels;
  function loadMap() {
    const l = landOf(), mi = +$('a-map').value || 0;
    setSeed($('a-seed').value.trim()); delete g.mapCache[l.id + ':' + mi];
    g.S.lands[l.id] = g.S.lands[l.id] || { placed: [0, 0], placement: 'home', completed: false }; g.S.bosses = {};
    g.loadMap(l.id, mi, 'back'); g.state = 'play';
    if ($('a-noen').checked) { g.enemies.length = 0; g.boss = null; }
    refreshEnemyLevels(); mapInfo(g.map);
  }
  $('a-land').onchange = () => { fillMaps(); refreshEnemyLevels(); };
  $('a-load').onclick = loadMap;
  $('a-rseed').onclick = () => { $('a-seed').value = Math.random().toString(36).slice(2, 7); loadMap(); };
  $('a-stress').onclick = () => { // สร้างทุกแผนที่ของดินแดนนี้ด้วย 30 seed → นับว่าล้มเหลว/ลองหลายครั้ง
    const l = landOf(); const keep = st.seed; let fail = 0, retry = 0, tot = 0; const t0 = performance.now();
    for (let mi = 0; mi < l.maps.length; mi++) for (let k = 0; k < 30; k++) { setSeed('s' + k); tot++; try { const m = pd.MapGen.generate(l, mi); if (m.attempt > 0) retry++; } catch (e) { fail++; } }
    setSeed(keep); $('a-mapinfo').textContent = `ทดสอบ ${l.name}: ${tot} แผนที่ · ล้มเหลว ${fail} · ต้องลองซ้ำ ${retry} · ${(performance.now() - t0).toFixed(0)}ms`;
  };

  // ---- ศัตรู / ท่าบอส ----
  function spawn() {
    const type = $('a-en').value, lv = Math.max(1, +$('a-elv').value | 0), n = Math.max(1, Math.min(12, +$('a-ecnt').value | 0)), pl = g.player;
    for (let k = 0; k < n; k++) {
      const a = (g.player.aimAng || 0) + (k - (n - 1) / 2) * 0.6; let r = 3.2, x, y;
      for (; r > 1; r -= 0.4) { x = pl.x + Math.cos(a) * r; y = pl.y + Math.sin(a) * r; if (!g.collides(x, y, 0.4)) break; }
      const e = g.spawnEnemy(type, x, y, lv); e.state = 'chase';
      if (e.def.boss) { g.boss = e; pd.UI.showBoss(e); }
    }
  }
  $('a-spawn').onclick = spawn;
  const clearEnemies = $('a-clear').onclick = () => { g.enemies.length = 0; g.boss = null; pd.UI.hideBoss(); g.projectiles.length = 0; g.zones.length = 0; g.lines.length = 0; };
  $('a-en-reset').onclick = () => { clearEnemies(); spawn(); };
  $('a-fire').onclick = () => {
    const pat = $('a-pat').value, bs = g.enemies.filter(e => !e.dead && e.def.boss); if (!bs.length) return g.toast('ยังไม่มีบอส — กด "สร้าง" บอสก่อน');
    for (const e of bs) {
      if (!e._all) { e._all = 1; e.def = Object.assign({}, e.def, { patterns: Object.keys(PATTERNS) }); } // ให้ทุกบอสใช้ได้ทุกท่า (เฉพาะตัวที่สร้างใน Arena)
      e.patIdx = Object.keys(PATTERNS).indexOf(pat); e.patT = 0; e.frozenT = 0;
      if (e.state === 'idle' || e.state === 'recovery') e.state = 'chase';
    }
  };

  // ---- ลูปต่อเฟรม: ล็อกพลัง / แช่แข็ง / สเกลเวลา / วัดผล ----
  const frame0 = g.frame;
  g.frame = function (dt) {
    const pl = g.player;
    if (pl) { if (st.inv && pl.hp < g.derived.maxHp * 0.5) pl.hp = g.derived.maxHp; if (st.infInk) pl.ink = g.derived.maxInk; }
    if (st.freeze) for (const e of g.enemies) if (!e.dead) e.frozenT = Math.max(e.frozenT, 0.2);
    dt *= st.scale; frame0(dt);
    meas.t += dt; const dd = g.stats.damageDealt || 0, dt2 = g.stats.damageTaken || 0;
    meas.win.push([meas.t, dd, dt2]); while (meas.win.length > 1 && meas.t - meas.win[0][0] > 8) meas.win.shift();
  };
  $('a-hitboxes').onchange = e => { g.arenaHitboxes = e.target.checked; };
  $('a-reset').onclick = () => { g.stats.damageDealt = 0; g.stats.damageTaken = 0; meas.win = []; meas.t = 0; };
  setInterval(() => {
    if (!g.derived) return; const D = g.derived, P0 = P(), w = meas.win, a = w[0], b = w[w.length - 1], span = a && b ? Math.max(0.01, b[0] - a[0]) : 1;
    const live = g.enemies.filter(e => !e.dead && !e.persuaded).sort((x, y) => Math.hypot(x.x - g.player.x, x.y - g.player.y) - Math.hypot(y.x - g.player.x, y.y - g.player.y))[0];
    const hit = live ? Math.max(1, live.atk * (1 - D.dmgReduce)) : 0;
    $('a-ai').textContent = live ? live.def.name + ' ? HP ' + Math.round(live.hp) + '/' + live.maxHp + ' ? ' + live.state : '??????????';
    $('a-cd-info').textContent = P0.slots.filter(Boolean).map(id => pd.Skills.def(id).name + ' ' + pd.Skills.cdLeft(id).toFixed(1) + 's').join(' ? ');
    $('a-stat').textContent = `ผู้เล่น Lv${P0.level} HP ${Math.round(g.player.hp)}/${D.maxHp} DPS ${D.dps.toFixed(0)} ลดดาเมจ ${(D.dmgReduce * 100).toFixed(0)}%\n` +
      (live ? `ใกล้สุด: ${live.def.name} Lv${live.lvl}${live.alpha ? ' (Alpha)' : ''}\n  HP ${Math.round(live.hp)}/${live.maxHp} ATK ${live.atk.toFixed(1)}\n  คาดฟันตาย ${(live.hp / D.dps).toFixed(1)}s · โดนตี ~${Math.ceil(D.maxHp / hit)} ครั้งจึงตาย\n` : 'ไม่มีศัตรู\n') +
      `วัดจริง (8วิล่าสุด): ทำ ${(a && b ? (b[1] - a[1]) / span : 0).toFixed(0)}/s · โดน ${(a && b ? (b[2] - a[2]) / span : 0).toFixed(0)}/s\nรวม: ทำ ${g.stats.damageDealt || 0} · โดน ${g.stats.damageTaken || 0}`;
  }, 250);
  // จัดวางแบบ dock: หดหน้าเกมไม่ให้แผงบัง HUD (Render.resize/Phaser อ่านความกว้างจาก window.innerWidth)
  const realW = () => document.documentElement.clientWidth;
  const dockWidth = () => el.classList.contains('min') ? 0 : el.offsetWidth;
  Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => realW() - dockWidth() });
  const game = document.getElementById('game');
  const dock = () => {
    game.style.right = dockWidth() + 'px';
    window.dispatchEvent(new Event('resize'));
  };
  $('a-min').onclick = () => { el.classList.toggle('min'); $('a-min').textContent = el.classList.contains('min') ? '▸' : '▾'; dock(); };
  // เริ่มต้น: หมู่บ้านเลเวล 1 — แล้วให้ปรับต่อเอง
  if (realW() < 900) el.classList.add('min'); // จอเล็ก (มือถือ): เริ่มแบบย่อ
  new ResizeObserver(() => {
    const right = dockWidth() + 'px';
    if (game.style.right !== right) dock();
  }).observe(el);
  $('a-reset-all').onclick = () => location.reload();
  dock(); fillMaps(); $('a-lv').value = P().level; $('a-il').value = 1; applyPlayer(); loadMap();
  window.__arena = { st, loadMap, applyPlayer, spawn };
}
