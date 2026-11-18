// @ts-nocheck
// ===== sound: เพลง + เอฟเฟกต์เสียง (ไม่บังคับ — ทำงานได้แม้ไม่มีไฟล์เสียง) =====
PD.Sound = (function () {
  const S = {};
  const cfg = () => PD_DATA.config.sound || {};
  let bgm = null, ctx = null, unlocked = false, bgmGain = null, sfxGain = null;
  // มือถือ (iOS ฯลฯ) ไม่สนใจ element.volume → ถ้ามี WebAudio ให้คุมเสียงผ่าน GainNode แทน (ไม่ซ้อนกับ element.volume)
  const applyMusicVol = () => { if (!bgm) return; if (bgmGain) { bgm.volume = 1; bgmGain.gain.value = mv(); } else bgm.volume = mv(); };
  const route = () => {
    if (!ctx || bgmGain) return;
    try {
      bgmGain = ctx.createGain(); sfxGain = ctx.createGain(); sfxGain.gain.value = sv(); sfxGain.connect(ctx.destination);
      bgmGain.connect(ctx.destination); ctx.createMediaElementSource(bgm).connect(bgmGain); applyMusicVol();
    } catch (_) { bgmGain = null; sfxGain = null; }
  };

  // ระดับเสียง: 0 = เงียบจริง (เดิมใช้ || ทำให้ 0 กลายเป็น 0.3 ตอนเปลี่ยนเพลง) · จำค่าไว้ในเครื่อง
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
  const mv = () => num(cfg().musicVol, 0.3), sv = () => num(cfg().sfxVol, 0.5);
  S.setVol = function (kind, v) {
    const c = PD_DATA.config.sound; c[kind === 'music' ? 'musicVol' : 'sfxVol'] = num(v, 0.3);
    if (kind === 'music') applyMusicVol(); else if (sfxGain) sfxGain.gain.value = sv();
    try { localStorage.setItem('pd_sound', JSON.stringify({ m: c.musicVol, s: c.sfxVol, e: c.enabled })); } catch (_) {}
  };
  S.saveEnabled = function () { S.setVol('music', mv()); };
  S.init = function () {
    try { const o = JSON.parse(localStorage.getItem('pd_sound') || 'null'); if (o) { const c = PD_DATA.config.sound; c.musicVol = num(o.m, c.musicVol); c.sfxVol = num(o.s, c.sfxVol); if (typeof o.e === 'boolean') c.enabled = o.e; } } catch (_) {}
    bgm = document.getElementById('bgm');
    if (!bgm) return;
    bgm.volume = mv();
    // unlock audio context on first user interaction
    const unlock = () => { if (unlocked) return; unlocked = true;
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); route(); } catch (_) {}
      bgm.play().catch(() => {});
      document.removeEventListener('pointerdown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    // มือถือ: สลับแอป/ล็อกจอ → หยุดเพลง กลับมาเล่นต่อ (ประหยัดแบต + ไม่ให้เพลงดังค้าง)
    window.addEventListener('pagehide', () => { if (bgm) bgm.pause(); }); // ปิดแท็บ/ออกจากแอป → เพลงต้องหยุด
    document.addEventListener('visibilitychange', () => { if (!bgm) return; if (document.hidden) bgm.pause(); else if (unlocked && cfg().enabled && bgm.getAttribute('src')) bgm.play().catch(() => {}); });
  };

  S.playMusic = function (key) {
    if (!bgm || !cfg().enabled) return;
    const src = key === 'town' ? cfg().townMusic : key === 'dungeon' ? cfg().dungeonMusic : key;
    if (!src || bgm.getAttribute('src') === src) return;
    bgm.src = src;
    applyMusicVol();
    bgm.play().catch(() => {});
  };

  S.stopMusic = function () { if (bgm) { bgm.pause(); bgm.removeAttribute('src'); } };

  S.sfx = function (id) {
    if (!cfg().enabled) return;
    const path = (cfg().sfx || {})[id]; if (!path) return;
    try {
      const a = new Audio(path);
      if (ctx && sfxGain) { a.volume = 1; try { ctx.createMediaElementSource(a).connect(sfxGain); } catch (_) { a.volume = sv(); } } else a.volume = sv();
      a.play().catch(() => {});
    } catch (_) {}
  };

  return S;
})();
