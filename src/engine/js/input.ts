// @ts-nocheck
// ===== input: จอยสัมผัส (multi-touch) + ปุ่ม + คีย์บอร์ด =====
PD.Input = (function () {
  const I = { move: { active: false, x: 0, y: 0 }, attackHeld: false, mouseAttack: null, attackTap: false, keys: {}, joy: { id: null, ox: 0, oy: 0, x: 0, y: 0 }, virtual: null, attackVirtual: false };
  const R = 52; // รัศมีจอย (CSS px)
  // กันเบราว์เซอร์มือถือซูมเมื่อแตะเร็วๆ (double-tap) / บีบนิ้ว / แตะหลายนิ้ว
  I.blockZoom = function () {
    const opt = { passive: false };
    I.lastTouchEnd = 0; I.zoomBlocked = 0;
    document.addEventListener('touchend', e => {
      if (e.target?.closest?.('#arena, #arena-shop-search, #arena-shop-category')) return;
      const now = Date.now();
      if (now - I.lastTouchEnd < 450) {
        e.preventDefault(); I.zoomBlocked++;
        // ปุ่มที่ใช้ click (เมนู/หน้าต่าง) ต้องยังกดติดแม้แตะเร็ว
        const t = e.target && e.target.closest && e.target.closest('[data-panel],.pbox button,.pbox [data-pick],.pbox [data-place],.pbox [data-go],.pbox .slot,#confirm button,#overlay button,#rotate button');
        if (t) t.click();
      }
      I.lastTouchEnd = now;
    }, opt);
    document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault(); }, opt);
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), opt));
    document.addEventListener('dblclick', e => e.preventDefault(), opt);
    document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, opt);
    document.addEventListener('contextmenu', e => e.preventDefault());
  };
  I.init = function () {
    I.blockZoom();
    // Keep mouse combat and ground targeting on the game canvas.
    const game = document.getElementById('game');
    game.addEventListener('pointerdown', e => {
      const G = PD.Game, T = G.targeting, R = PD.Render;
      if (G.state !== 'play' || (e.button !== 0 && e.button !== 2)) return;
      if (e.target.closest('button, input, select, textarea, a, #panel, #confirm, #overlay, #arena, #hud-left')) return;
      const rect = game.querySelector('#stage canvas')?.getBoundingClientRect();
      if (!rect?.width || !rect.height || e.clientX < rect.left || e.clientX >= rect.right ||
          e.clientY < rect.top || e.clientY >= rect.bottom) return;
      if (e.pointerType === 'mouse' && e.button === 2) {
        e.preventDefault(); e.stopPropagation(); PD.Skills.use(0); return;
      }
      if (e.button !== 0) return;
      if (!T) {
        if (e.pointerType !== 'mouse') return;
        I.mouseAttack = e.pointerId;
        I.attackTap = true;
        e.preventDefault(); e.stopPropagation(); return;
      }
      e.preventDefault();
      e.stopPropagation();
      const sx = (e.clientX - rect.left) * R.W / rect.width;
      const sy = (e.clientY - rect.top) * R.H / rect.height;
      const a = (sx - R.ox) / 16, b = (sy - R.oy) / 8;
      let x = (a + b) / 2, y = (b - a) / 2;
      const pl = G.player, dx = x - pl.x, dy = y - pl.y, distance = Math.hypot(dx, dy);
      if (distance > T.range) {
        x = pl.x + dx / distance * T.range;
        y = pl.y + dy / distance * T.range;
      }
      PD.Skills.use(T.slot, { cx: x, cy: y });
    }, true);
    const zone = document.getElementById('joy-zone'), base = document.getElementById('joy'), knob = document.getElementById('joy-knob');
    const place = (x, y) => { const r = zone.getBoundingClientRect(); base.style.left = (x - r.left - 60) + 'px'; base.style.top = (y - r.top - 60) + 'px'; }; // พิกัดนิ้วเป็นของจอ แต่วงจอยอยู่ในโซนจอย → ลบมุมโซนออก (เดิมวงเด้งลงล่าง)
    const reset = () => { base.style.left = ''; base.style.top = ''; knob.style.transform = 'translate(0px,0px)'; base.classList.remove('on'); };
    zone.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || I.joy.id !== null) return;
      I.joy.id = e.pointerId; I.joy.ox = e.clientX; I.joy.oy = e.clientY; I.joy.x = 0; I.joy.y = 0;
      place(e.clientX, e.clientY); base.classList.add('on');
      try { zone.setPointerCapture(e.pointerId); } catch (_) { }
      e.preventDefault();
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== I.joy.id) return;
      let dx = e.clientX - I.joy.ox, dy = e.clientY - I.joy.oy; const l = Math.hypot(dx, dy);
      if (l > R) { dx = dx / l * R; dy = dy / l * R; }
      I.joy.x = dx / R; I.joy.y = dy / R; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      e.preventDefault();
    });
    const end = e => { if (e.pointerId !== I.joy.id) return; I.joy.id = null; I.joy.x = 0; I.joy.y = 0; reset(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    window.addEventListener('pointerup', end, true); window.addEventListener('pointercancel', end, true); // นิ้วปล่อยนอกโซน/บนหน้าจอตาย → ปล่อยจอยเสมอ
    const stopMouseAttack = e => {
      if (e.pointerId === I.mouseAttack && (e.type === 'pointercancel' || !(e.buttons & 1))) I.mouseAttack = null;
    };
    for (const name of ['pointerup', 'pointercancel', 'pointermove']) window.addEventListener(name, stopMouseAttack, true);
    I.releaseAll = () => { try { if (I.joy.id !== null) zone.releasePointerCapture(I.joy.id); } catch (_) { } I.joy.id = null; I.joy.x = 0; I.joy.y = 0; I.attackHeld = false; I.keyAttack = false; I.attackVirtual = false; I.mouseAttack = null; I.attackTap = false; I.keys = {}; reset(); document.querySelectorAll('.down').forEach(e => e.classList.remove('down')); };

    const hold = (el, on, off) => {
      el.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); el.classList.add('down'); on(); try { el.setPointerCapture(e.pointerId); } catch (_) { } });
      const up = e => { el.classList.remove('down'); off && off(); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    };
    hold(document.getElementById('btn-attack'), () => { I.attackHeld = true; }, () => { I.attackHeld = false; });
    [0, 1, 2].forEach(i => hold(document.getElementById('btn-s' + i), () => PD.Skills.use(i)));
    hold(document.getElementById('btn-act'), () => PD.Game.interact());
    hold(document.getElementById('btn-potion'), () => PD.Game.useActiveItem());
    hold(document.getElementById('btn-potion-2'), () => PD.Game.useActiveItem(2));

    const keyFor = e => {
      if (/^(Digit|Numpad)[1-4]$/.test(e.code)) return e.code;
      if (/^Key[WASD]$/.test(e.code)) return e.code.slice(-1).toLowerCase();
      return e.key.toLowerCase();
    };
    window.addEventListener('keydown', e => {
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const k = keyFor(e); I.keys[k] = true;
      const G = PD.Game;
      if (G.state === 'dialog' && (k === ' ' || k === 'enter' || k === 'e')) { PD.UI.dialogNext(); e.preventDefault(); return; }
      if (PD.UI.confirmOpen()) { if (k === 'enter' || k === 'e' || k === ' ') PD.UI.confirmAnswer(true); else if (k === 'escape') PD.UI.confirmAnswer(false); e.preventDefault(); return; }
      if (G.state === 'panel' && k === 'escape') { PD.UI.closePanel(); return; }
      if (G.state !== 'play') return;
      if (/^(Digit|Numpad)[1-3]$/.test(k)) { e.preventDefault(); if (!e.repeat) PD.Skills.use(Number(k.at(-1)) - 1); }
      else if (k === 'Digit4' || k === 'Numpad4') { e.preventDefault(); if (!e.repeat) I.attackTap = true; }
      else if (k === 'e' || k === 'f') G.interact();
      else if (k === 'q') G.useActiveItem();
      else if (k === 'r') G.useActiveItem(2);
      else if (k === 'i') PD.UI.openPanel('bag');
      else if (k === 'k') PD.UI.openPanel('skills');
      else if (k === 'c') PD.UI.openPanel('status');
      else if (k === 'l') PD.UI.openPanel('quest');
      else if (k === 'm') PD.UI.openPanel('world');
      else if (k === 'escape' || k === 'p') PD.UI.openPanel('pause');
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { I.keys[keyFor(e)] = false; });
    window.addEventListener('blur', I.releaseAll);
  };
  I.poll = function () {
    const k = I.keys; let x = 0, y = 0;
    if (k['a'] || k['arrowleft']) x -= 1; if (k['d'] || k['arrowright']) x += 1;
    if (k['w'] || k['arrowup']) y -= 1; if (k['s'] || k['arrowdown']) y += 1;
    if (x || y) { const l = Math.hypot(x, y); x /= l; y /= l; }
    else if (I.joy.id !== null) { x = I.joy.x; y = I.joy.y; }
    if (I.virtual) { x = I.virtual.x; y = I.virtual.y; }
    I.move.x = x; I.move.y = y; I.move.active = Math.hypot(x, y) > 0.15;
    I.keyAttack = !!(k.j || k[' '] || k.Digit4 || k.Numpad4 || I.attackTap);
    I.attackTap = false;
    I.attackHeldEff = I.attackHeld || I.keyAttack || I.attackVirtual;
  };
  Object.defineProperty(I, 'attackHeld', { get() { return this._ah || this.keyAttack || this.mouseAttack !== null || this.attackVirtual; }, set(v) { this._ah = v; } });
  return I;
})();
