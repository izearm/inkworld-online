// @ts-nocheck
// ===== quests: เดินขั้นเควสตามข้อมูล quests.js =====
PD.Quest = (function () {
  const Q = {};
  const G = () => PD.Game, S = () => PD.Game.S, D = () => PD_DATA.quests;

  Q.activate = function (landId) {
    const land = PD_DATA.lands.find(l => l.id === landId);
    const ids = [land.mainQuest, land.sideQuest].concat(land.extraQuests || []); // extraQuests = เควสเพิ่มที่เริ่มพร้อมดินแดนนี้
    for (const qid of ids) if (qid && !S().quests[qid]) S().quests[qid] = { step: 0, cnt: 0, talked: {}, done: false, seq: (S().questSeq = (S().questSeq || 0) + 1) }; // seq = ลำดับที่เควสเริ่มจริง (ใช้เรียงในบันทึกเควส)
    for (const qid of ids) Q.autoCheck(qid);
  };
  Q.state = qid => S().quests[qid];
  Q.cur = qid => { const st = S().quests[qid]; return st && !st.done ? D()[qid].steps[st.step] : null; };
  Q.activeIds = () => Object.keys(S().quests).filter(q => !S().quests[q].done);

  Q.npcHasQuest = function (npcId) {
    for (const qid of Q.activeIds()) {
      if (D()[qid].hidden) continue; // เควสลับ: ไม่มีเครื่องหมาย ! บอกใบ้
      const s = Q.cur(qid); if (!s) continue;
      if (s.t === 'talk' && s.npc === npcId) return qid;
      if (s.t === 'talkMany' && s.npcs.includes(npcId) && !S().quests[qid].talked[npcId]) return qid;
    }
    return null;
  };
  // คืนค่า { dlg, after } สำหรับคุยกับ npc
  Q.talk = function (npcId) {
    const qid = Q.npcHasQuest(npcId), npc = PD_DATA.npcs[npcId];
    if (qid) {
      const s = Q.cur(qid), st = S().quests[qid];
      if (s.t === 'talk') return { dlg: s.dlg, after: () => Q.advance(qid) };
      return { dlg: s.dlg[npcId], after: () => { st.talked[npcId] = true; if (s.npcs.every(n => st.talked[n])) Q.advance(qid); } };
    }
    const land = PD_DATA.lands.find(l => l.id === npc.land);
    const done = S().quests[land.mainQuest] && S().quests[land.mainQuest].done;
    return { dlg: done ? npc.done : npc.idle, after: null };
  };
  Q.onItem = function (item) {
    for (const qid of Q.activeIds()) { const s = Q.cur(qid); if (s && s.t === 'item' && s.item === item) Q.advance(qid); }
  };
  Q.onCollect = function (item) {
    for (const qid of Q.activeIds()) {
      const s = Q.cur(qid); if (!s || s.t !== 'collect' || s.item !== item) continue;
      const st = S().quests[qid]; st.cnt++;
      G().toast(PD_DATA.questItems[item].name + ' ' + st.cnt + '/' + s.count, '#e8a21a');
      if (st.cnt >= s.count) Q.advance(qid);
    }
  };
  Q.onKill = function (target) {
    for (const qid of Q.activeIds()) { const s = Q.cur(qid); if (s && s.t === 'kill' && s.target === target) Q.advance(qid); }
  };
  // ข้ามขั้นที่ทำสำเร็จไปแล้ว (เช่น เก็บไอเท็มมาก่อนได้รับเควส)
  Q.autoCheck = function (qid) {
    const st = S().quests[qid]; if (!st || st.done) return;
    const s = Q.cur(qid); if (!s) return;
    if (s.t === 'item' && S().questItems[s.item]) Q.advance(qid);
    else if (s.t === 'kill' && S().bosses[s.target]) Q.advance(qid);
    else if (s.t === 'collect' && st.cnt >= s.count) Q.advance(qid);
    else if (s.t === 'ending') G().startEnding();
  };
  Q.advance = function (qid) {
    const st = S().quests[qid], def = D()[qid];
    st.step++; st.talked = {};
    if (def.steps[st.step] && def.steps[st.step].t !== 'collect') st.cnt = 0;
    if (st.step >= def.steps.length) Q.complete(qid);
    else { G().toast('เควส: ' + def.steps[st.step].text, '#2f6fd6'); Q.autoCheck(qid); }
    G().onQuestChanged();
  };
  Q.complete = function (qid) {
    const st = S().quests[qid], def = D()[qid];
    st.done = true;
    G().toast('สำเร็จ: ' + def.name, '#3c9a5c');
    const rw = def.reward || {};
    if (rw.exp) G().gainExp(rw.exp);
    if (rw.lumi) { S().player.lumi = (S().player.lumi || 0) + rw.lumi; G().toast('+' + rw.lumi + ' Lumi', '#b98f00'); }
    if (rw.weapon) {
      const land = PD_DATA.lands.find(l => l.id === def.land);
      G().giveWeapon(PD.Loot.roll(G().landLevel(land) + 2, 1.3, rw.weapon));
    }
    if (def.type === 'main') {
      S().lands[def.land].completed = true;
      if (G().land && G().land.id === def.land) G().rebuildFloor();
    }
    if (rw.page && !S().lands[rw.page] && !S().pendingPages.includes(rw.page)) {
      S().pendingPages.push(rw.page);
      G().hint('page', true);
    }
  };
  Q.trackerText = function () {
    // แสดงเควสหลักของดินแดนปัจจุบันก่อน
    const G0 = G(); const out = [];
    if (S().pendingPages.length) out.push('★ วางหน้ากระดาษ "' + PD_DATA.lands.find(l => l.id === S().pendingPages[0]).name + '" บนแผนที่โลก');
    const ids = Q.activeIds().filter(q => !D()[q].hidden).sort((a, b) => {
      const la = D()[a].land === (G0.land && G0.land.id) ? 0 : 1, lb = D()[b].land === (G0.land && G0.land.id) ? 0 : 1;
      return la - lb || (D()[a].type === 'main' ? -1 : 1);
    });
    for (const qid of ids.slice(0, 2)) {
      const s = Q.cur(qid), st = S().quests[qid];
      let t = s.text; if (s.t === 'collect') t += ' (' + st.cnt + '/' + s.count + ')';
      if (s.t === 'talkMany') t += ' (' + Object.keys(st.talked).length + '/' + s.npcs.length + ')';
      out.push((D()[qid].type === 'main' ? '◆ ' : '◇ ') + t);
    }
    return out;
  };
  return Q;
})();
