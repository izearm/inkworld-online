// @ts-nocheck
PD.Ending = { install(G) {
  G.startEnding = function () {
    if (G.S.ended || G.S.endingStage === 'return') return;
    G.S.endingStage = 'narration'; G.save();
    PD.UI.dialog(PD_DATA.dialogue.ending, () => {
      const st = G.S.quests.q_tree;
      if (st && !st.done) { st.done = true; G.S.lands.ink_tree.completed = true; }
      G.S.ended = true; G.S.endingStage = 'return'; G.save();
    });
  };
  G.finishEnding = function () {
    G.S.endingStage = 'done'; G.S.endingLoot = [];
    G.state = 'ending'; G.save(); PD.UI.showEnding();
  };
  G.continueAfterEnding = function () { G.unlockPostLands(true); G.loadMap('ink_tree', 0, 'back'); G.state = 'play'; PD.UI.hideOverlay(); PD.UI.dialog(PD_DATA.dialogue.post_challenge); };
  G.unlockPostLands = function (say) { // ดินแดนหลังจบเกม: ผู้เล่นวางเองบนตาราง (เซฟเก่าที่ถูกวางไว้นอกตารางยังใช้ได้) · โบนัสยังอยู่นอกตาราง
    let k = 0;
    for (const l of PD_DATA.lands) {
      if (G.S.lands[l.id]) continue;
      if (l.postgame && !G.S.pendingPages.includes(l.id)) { k++; G.S.pendingPages.push(l.id); }
    }
    if (k && say) G.toast('ดินแดนใหม่ ' + k + ' แห่งรอวางบนแผนที่โลก!', '#8a3fd1');
  };

  G.unlockBonusLands = function (say) {
    const seq = G.landById('shadow_forest')?.maps[0].bosses;
    const unlocked = G.S.lands.shadow_forest?.completed || (seq?.length && seq.every(b => G.S.bosses[b.type]));
    let added = 0;
    for (const land of PD_DATA.lands.filter(l => l.bonus)) {
      if (!unlocked || G.S.lands[land.id]?.placed[0] >= 0 || G.S.pendingPages.includes(land.id)) continue;
      G.S.pendingPages.push(land.id);
      added++;
    }
    if (added && say) G.toast('เมืองโบนัส ' + added + ' แห่งรอวาง!', '#8a3fd1');
  };

} };
