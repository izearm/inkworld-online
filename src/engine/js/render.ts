// @ts-nocheck
// ===== render: วาดฉาก isometric 2.5D ความละเอียดต่ำ + จัดลำดับความลึก + ระบบบังตัวละคร =====
PD.Render = (function () {
  const P = PD.P, U = PD.U, SP = PD.Sprites;
  const R = { canvas: null, ctx: null, W: 480, H: 240, floor: null, floorOx: 0, lastOccluded: false, lastDrawn: 0, stats: {} };

  R.init = function (canvas) {
    R.canvas = canvas; R.ctx = canvas.getContext('2d');
    if (!bookPaper) {
      bookPaper = new Image();
      bookPaper.onload = () => bookSprites.clear();
      bookPaper.src = 'town/book-paper-grain.png';
    }
    R.resize();
  };
  R.resize = function () {
    const H = PD_DATA.config.lowResHeight;
    const vw = window.innerWidth || 844, vh = window.innerHeight || 390;
    const aspect = vw / vh;
    // แนวนอน: ความสูง 240 · แนวตั้ง: ความกว้าง 270 (ให้เห็นรอบตัวพอ)
    if (aspect >= 1) { R.H = H; R.W = Math.round(H * aspect); }
    else { R.W = 270; R.H = Math.round(270 / aspect); }
    R.canvas.width = R.W; R.canvas.height = R.H;
    R.ctx.imageSmoothingEnabled = false;
    R.scale = vh / R.H; R.cssScale = vh / R.H;
  };

  function diamondFill(c, x, y) { for (let dy = 0; dy < 16; dy++) { const hw = dy < 8 ? (dy + 1) * 2 : (16 - dy) * 2; c.fillRect(x - hw, y + dy, hw * 2, 1); } }
  function diamondLine(c, x, y) { P.poly(c, [[x, y], [x + 16, y + 8], [x, y + 16], [x - 16, y + 8]], true); }
  R.diamondFill = diamondFill;

  const bookSprites = new Map();
  let bookPaper, shadowLayer;

  function paperPolygon(c, points, color, stroke = '#665447') {
    c.beginPath();
    for (const [i, [x, y]] of points.entries()) i ? c.lineTo(x, y) : c.moveTo(x, y);
    c.closePath();
    c.fillStyle = color; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 0.8; c.stroke(); }
  }

  function drawAbsorbShield(c, pos, enemy, time) {
    const size = enemy.def.size || 1, flash = time < (enemy.shieldFlashUntil || 0);
    c.save();
    c.translate(pos.x, pos.y - 10 * size);
    c.scale(size, size);
    c.beginPath(); c.ellipse(0, 2, 16, 17, 0, 0, Math.PI * 2);
    c.fillStyle = flash ? 'rgba(235,208,255,0.58)' : 'rgba(153,101,220,0.24)';
    c.fill();
    c.strokeStyle = flash ? '#fff4ff' : '#7848ae'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#ebd0ff'; c.lineWidth = 0.8; c.stroke();
    const side = enemy.facing * 10;
    paperPolygon(c, [[side-6,-7],[side+6,-7],[side+5,2],[side,7],[side-5,2]],
      flash ? '#f8e3ff' : '#b984ee', '#4d2675');
    c.fillStyle = '#fff3ff';
    P.line(c, side, -5, side, 3); P.line(c, side - 3, -2, side + 3, -2);
    c.restore();
  }

  function drawFreezeCast(c, pos, cast, time) {
    const progress = U.clamp((time - cast.start) / cast.duration, 0, 1);
    c.save();
    c.strokeStyle = '#306eb9'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(pos.x, pos.y, 22, 11, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#c7efff'; c.lineWidth = 2.5;
    c.beginPath(); c.ellipse(pos.x, pos.y, 22, 11, 0, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); c.stroke();
    c.fillStyle = '#e5f7ff';
    for (let i = 0; i < 4; i++) {
      const angle = time * 5 + i * Math.PI / 2;
      c.fillRect(Math.round(pos.x + Math.cos(angle) * 19), Math.round(pos.y - 13 + Math.sin(angle) * 7), 2, 2);
    }
    c.restore();
  }

  function paperGrain(c, y, height) {
    if (!bookPaper?.naturalWidth) return;
    c.save(); c.clip(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.52;
    c.drawImage(bookPaper, 0, y, 33, height); c.restore();
  }

  function bookSprite(style, kind, variant, low) {
    const key = [style, kind, variant, low].join(':');
    if (bookSprites.has(key)) return bookSprites.get(key);
    const cv = document.createElement('canvas'), c = cv.getContext('2d');
    cv.width = 33; cv.height = 52;
    const folded = style === 'folded', v = variant - 1.5;
    const wallHeight = (low ? 6 : 18) + (folded ? 0 : variant);
    cv.wh = kind === 'wall' ? wallHeight : kind === 'stall' ? 13 : 23;
    const base = SP.WALL_TOP + cv.wh;
    if (kind === 'house' || kind === 'stall') {
      const roof = kind === 'house' ? 14 : 9;
      paperPolygon(c, [[3,base-10],[17,base-3],[17,base+12],[3,base+5]], '#dfbd8c');
      paperPolygon(c, [[17,base-3],[30,base-10],[30,base+5],[17,base+12]], '#b49b76');
      paperPolygon(c, [[2,base-10],[8,base-10-roof],[22,base-3-roof],[17,base-2]], ['#ead4a2','#c5a380','#b4a08c','#d7ad95'][variant]);
      paperPolygon(c, [[8,base-10-roof],[22,base-3-roof],[31,base-10],[17,base-3]], '#f2e2b9');
      paperPolygon(c, [[12,base+3],[16,base+5],[16,base+11],[12,base+9]], '#73584c', null);
      paperPolygon(c, [[6,base-3],[10,base-1],[10,base+3],[6,base+1]], '#ffdd93', '#92744d');
      paperPolygon(c, [[21,base+1],[26,base-2],[26,base+3],[21,base+6]], '#ffe0a2', '#92744d');
    } else if (kind === 'tree') {
      paperPolygon(c, [[14,base-1],[18,base-1],[18,base+7],[14,base+7]], '#aa8864');
      paperPolygon(c, [[16,base-22],[4,base+1],[16,base-3]], '#b6ad83');
      paperPolygon(c, [[16,base-22],[16,base-3],[28,base+2]], '#dcd0a4');
    } else if (kind === 'door') {
      paperPolygon(c, [[2,base-17],[16,base-24],[30,base-17],[16,base-10]], '#bba274');
      paperPolygon(c, [[2,base-17],[16,base-10],[16,base+13],[2,base+6]], '#765542');
      paperPolygon(c, [[16,base-10],[30,base-17],[30,base+6],[16,base+13]], '#967451');
      paperPolygon(c, [[5,base-12],[13,base-8],[13,base+8],[5,base+4]], '#be9c66', '#c99834');
      paperPolygon(c, [[19,base-8],[27,base-12],[27,base+4],[19,base+8]], '#d7b978', '#c99834');
      c.fillStyle = '#443122'; c.fillRect(14,base-1,5,6);
      c.fillStyle = '#ffe18b'; c.fillRect(15,base,3,2); c.fillRect(16,base+2,1,2);
    } else {
      const y = base - cv.wh;
      const left = [[0,y+8],[7,y+10-v],[16,y+16],[16,base+16],[0,base+8]];
      const right = [[16,y+16],[24,y+10+v],[32,y+8],[32,base+8],[16,base+16]];
      const top = [[0,y+8],[6,y+4+v],[16,y],[23,y+3-v],[32,y+8],[24,y+10+v],[16,y+16],[7,y+10-v]];
      paperPolygon(c, left, folded ? '#c5a77e' : '#a8a190');
      if (folded) paperGrain(c, y + 8, cv.wh + 8);
      paperPolygon(c, right, folded ? '#dfc69d' : '#bcb4a1');
      if (folded) paperGrain(c, y + 8, cv.wh + 8);
      paperPolygon(c, top, folded ? '#f4e3bd' : '#d4cdbc');
      if (folded) paperGrain(c, y, 17);
      c.strokeStyle = folded ? 'rgba(108,81,61,0.32)' : 'rgba(61,55,53,0.54)';
      for (let band = 3; band < cv.wh; band += folded ? 3 : 4) {
        c.beginPath(); c.moveTo(1, y + 8 + band);
        c.quadraticCurveTo(8, y + 10 + band - v, 16, y + 16 + band);
        c.quadraticCurveTo(25, y + 10 + band + v, 32, y + 8 + band); c.stroke();
      }
      if (!folded) {
        c.save();
        c.strokeStyle = 'rgba(51,46,43,0.45)';
        for (const offset of [0, 1.25]) {
          c.beginPath(); c.moveTo(2,y+7+offset); c.bezierCurveTo(8,y-2+v,11,y+6-v,17,y+1+offset);
          c.bezierCurveTo(21,y+1,25,y+9+v,31,y+7+offset); c.stroke();
        }
        c.strokeStyle = 'rgba(48,43,40,0.22)';
        for (let x = 4; x < 29; x += 4) {
          const height = 2 + Math.round(U.hash(x, variant, 37) * (cv.wh - 2));
          const edgeY = y + (x < 16 ? 8 + x / 2 : 24 - x / 2);
          c.beginPath(); c.moveTo(x, edgeY + 2); c.lineTo(x + v, edgeY + height); c.stroke();
        }
        c.restore();
      }
    }
    bookSprites.set(key, cv);
    return cv;
  }

  function bookFloor(c, style, x, y, sx, sy, grain) {
    const folded = style === 'folded';
    c.fillStyle = folded ? (grain < 0.5 ? '#efdfb8' : '#e8d4ab') : (grain < 0.5 ? '#d3cbb8' : '#ded7c7');
    diamondFill(c, sx, sy);
    c.fillStyle = folded ? '#c6ad84' : '#aaa38f';
    if (folded && y % 3 === 0) P.line(c, sx - 13, sy + 9, sx + 1, sy + 16);
    if (folded && x === 9) P.line(c, sx - 1, sy + 1, sx - 14, sy + 8);
    if (grain < 0.48) {
      P.line(c, sx - 4, sy + 8, sx + 2, sy + 6 + (x % 3));
      c.fillRect(sx + 4, sy + 9, 2, 1);
    }
    if (!folded && grain > 0.58) {
      c.strokeStyle = 'rgba(74,63,55,0.24)'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(sx - 12, sy + 9);
      c.quadraticCurveTo(sx - 2, sy + 4 + grain * 5, sx + 10, sy + 8); c.stroke();
    }
  }

  function bookLighting(c, m, player, scr, width, height, time) {
    const book = m.book, room = book.chamber;
    const inside = player.x >= room.x && player.x < room.x + room.w && player.y >= room.y && player.y < room.y + room.h;
    const walked = book.distances[Math.floor(player.y) * m.w + Math.floor(player.x)];
    const depth = U.clamp(walked / Math.max(1, book.span), 0, 1);
    const ambient = book.style === 'folded' ? 0.30 : inside ? 1 : 0.30 + 0.61 * depth;
    shadowLayer ??= document.createElement('canvas');
    if (shadowLayer.width !== width || shadowLayer.height !== height) {
      shadowLayer.width = width; shadowLayer.height = height;
    }
    const mask = shadowLayer.getContext('2d');
    mask.globalCompositeOperation = 'source-over';
    mask.clearRect(0, 0, width, height);
    mask.fillStyle = 'rgba(0,0,0,' + ambient + ')';
    mask.fillRect(0, 0, width, height);
    mask.globalCompositeOperation = 'destination-out';
    const light = (x, y, radius, flatten, power) => {
      if (x < -radius || x > width + radius || y < -radius || y > height + radius) return;
      mask.save(); mask.translate(x, y); mask.scale(1, flatten);
      const glow = mask.createRadialGradient(0, 0, 0, 0, 0, radius);
      glow.addColorStop(0, 'rgba(0,0,0,' + power + ')');
      glow.addColorStop(0.32, 'rgba(0,0,0,' + power + ')');
      glow.addColorStop(0.72, 'rgba(0,0,0,' + power * 0.47 + ')');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      mask.fillStyle = glow; mask.fillRect(-radius, -radius, radius * 2, radius * 2);
      mask.restore();
    };
    if (book.style === 'graphite') {
      if (!inside) for (const lamp of book.lamps) {
        const pos = scr(lamp.x, lamp.y);
        light(pos.x, pos.y - 14, 55, 0.76, 0.77 + Math.sin(time * 7 + lamp.x) * 0.06);
      }
      const pos = scr(player.x, player.y);
      light(pos.x, pos.y - 13, inside ? 83 : 75, 0.72, 1);
    }
    c.drawImage(shadowLayer, 0, 0);
  }

  // ----- พื้นแผนที่ (สร้างครั้งเดียวต่อแผนที่) -----
  // พื้นป่า: 0 ลานหิน (แผ่นหินปูเป็นลายตาราง) · 1 หญ้าบางพร้อมดอกไม้เล็ก · 2 พื้นมอสใบไม้ร่วง เฟิร์น · 3 รากไม้โผล่ · 4 ลานโล่ง (วงหินรอบ + ตราตรงกลาง)
  function forestFloor(c, m, x, y, sx, sy, h) {
    const z = m.zone[y * m.w + x], G1 = 'rgba(60,120,70,0.6)', I1 = 'rgba(27,27,27,0.4)';
    if (z === 0) {
      c.fillStyle = I1; if ((x + y) % 2 === 0) diamondLine(c, sx, sy); else { c.fillStyle = 'rgba(27,27,27,0.12)'; diamondFill(c, sx, sy); }
      if (h < 0.1) { c.fillStyle = I1; P.line(c, sx - 3, sy + 6, sx, sy + 9); P.line(c, sx, sy + 9, sx + 2, sy + 6); }
      else if (h > 0.93) { c.fillStyle = G1; c.fillRect(sx - 2, sy + 7, 3, 1); c.fillRect(sx - 1, sy + 6, 1, 1); } // มอสตามร่องหิน
    } else if (z === 1) {
      c.fillStyle = 'rgba(27,27,27,0.2)'; c.fillRect(sx, sy, 1, 1);
      if (h < 0.2) { c.fillStyle = G1; P.line(c, sx - 2, sy + 8, sx - 3, sy + 4); P.line(c, sx, sy + 8, sx, sy + 3); P.line(c, sx + 2, sy + 8, sx + 3, sy + 4); }
      else if (h > 0.96) { c.fillStyle = '#e8c21a'; c.fillRect(sx, sy + 7, 2, 2); c.fillStyle = P.INK; c.fillRect(sx, sy + 8, 1, 1); }
    } else if (z === 2 || z === 3) {
      if (h < 0.35) { c.fillStyle = 'rgba(60,100,70,0.16)'; diamondFill(c, sx, sy); }
      if (h < 0.18) { c.fillStyle = G1; P.line(c, sx, sy + 9, sx - 4, sy + 4); P.line(c, sx, sy + 9, sx, sy + 3); P.line(c, sx, sy + 9, sx + 4, sy + 4); P.line(c, sx - 2, sy + 7, sx - 4, sy + 7); } // เฟิร์น
      else if (h > 0.9) { c.fillStyle = I1; P.line(c, sx - 5, sy + 8, sx, sy + 6); P.line(c, sx, sy + 6, sx + 4, sy + 8); } // รากไม้
      else if (h > 0.8) { c.fillStyle = 'rgba(150,110,50,0.55)'; c.fillRect(sx - 2, sy + 7, 2, 1); c.fillRect(sx + 2, sy + 5, 2, 1); } // ใบไม้ร่วง
    } else {
      const dx = x - 77, dy = (y - m.rooms[1].cy) * 0.95, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 7.2 && d < 8.4 && h < 0.7) { c.fillStyle = I1; P.ellipse(c, sx, sy + 8, 4, 2, 10); } // วงก้อนหินรอบลาน
      else if (d < 4.6 && Math.abs(d - 3.2) < 0.55) { c.fillStyle = 'rgba(60,120,70,0.5)'; diamondLine(c, sx, sy); } // วงตราตรงกลาง
      else if (d < 1.2) { c.fillStyle = 'rgba(27,27,27,0.28)'; diamondFill(c, sx, sy); }
      else if (h < 0.08) { c.fillStyle = G1; P.line(c, sx - 1, sy + 8, sx - 2, sy + 5); P.line(c, sx + 1, sy + 8, sx + 2, sy + 5); }
    }
  }
  function caveFloor(c, lanterns, x, y, sx, sy, grain) {
    let light = 0;
    for (const lamp of lanterns) {
      const falloff = Math.max(0, 1 - Math.hypot(x + 0.5 - lamp.x, y + 0.5 - lamp.y) / 4.2);
      light = Math.max(light, falloff * falloff);
    }
    const texture = Math.floor(grain * 11);
    c.fillStyle = 'rgb(' + [45 + texture + Math.round(light * 112), 47 + texture + Math.round(light * 76), 56 + texture + Math.round(light * 31)].join(',') + ')';
    diamondFill(c, sx, sy);
    c.fillStyle = 'rgba(14,17,25,0.26)';
    if (grain < 0.36) P.line(c, sx - 6, sy + 8, sx + 2, sy + 10);
    if (grain > 0.58) {
      c.fillStyle = 'rgba(213,196,164,0.20)';
      c.fillRect(sx + 3, sy + 6, 3, 1);
      c.fillRect(sx - 5, sy + 10, 2, 1);
    }
  }

  function caveLantern(c, s, time, wall) {
    const x = s.x, y = s.y;
    const glow = c.createRadialGradient(x, y - 14, 1, x, y - 14, 23);
    glow.addColorStop(0, 'rgba(255,191,91,0.4)');
    glow.addColorStop(1, 'rgba(255,155,56,0)');
    c.fillStyle = glow; c.fillRect(x - 23, y - 37, 46, 46);
    c.fillStyle = '#221a18'; c.fillRect(x - 7, y - 22, 3, wall ? 8 : 24); c.fillRect(x - 7, y - 22, 10, 2);
    c.fillStyle = '#88614a'; c.fillRect(x - 6, y - 21, 1, wall ? 6 : 21);
    c.fillStyle = '#302119'; c.fillRect(x - 3, y - 19, 8, 10);
    c.fillStyle = '#f7a744'; c.fillRect(x - 2, y - 17, 6, 6);
    c.fillStyle = Math.sin(time * 9 + x * 0.1) > 0 ? '#fff1b2' : '#ffd675';
    c.fillRect(x, y - 16, 2, 4);
  }

  R.buildFloor = function (m, land, ls) {
    const cv = document.createElement('canvas');
    cv.width = (m.w + m.h) * 16 + 2; cv.height = (m.w + m.h) * 8 + 18;
    const c = cv.getContext('2d'); R.floorOx = m.h * 16;
    const completed = ls && ls.completed, strange = ls && ls.placement === 'strange';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x; if (m.grid[i] !== 0 || m.blankFloor) continue; // blankFloor: ลานกระดาษขาวหน้าแรก ไม่วาดพื้น
      const sx = R.floorOx + (x - y) * 16, sy = (x + y) * 8, h = U.hash(x, y, 11);
      if (m.book) { bookFloor(c, m.book.style, x, y, sx, sy, h); continue; }
      if (m.desertArena) {
        const { x: cx, y: cy, radius } = m.desertArena;
        const dist = Math.hypot(x - cx, y - cy);
        c.fillStyle = dist <= radius ? (h < 0.5 ? '#dfbf87' : '#e3c58e') : (h < 0.5 ? '#efd7a8' : '#f0daaf');
        diamondFill(c, sx, sy);
        if (dist >= radius - 0.8 && dist <= radius) {
          c.fillStyle = '#a98054'; P.ellipse(c, sx, sy + 8, 5, 2, 12);
        } else if (h < 0.19) {
          c.fillStyle = '#b9986e'; P.line(c, sx - 6, sy + 8, sx + 4, sy + 6);
          c.fillRect(sx + 2, sy + 10, 3, 1);
        }
        continue;
      }
      if (completed && h < 0.65) { c.fillStyle = land.color; c.globalAlpha = 0.12 + U.hash(x, y, 5) * 0.14; diamondFill(c, sx, sy); c.globalAlpha = 1; }
      if (m.chasm[i]) {
        c.fillStyle = '#3a3530'; diamondFill(c, sx, sy);
        c.fillStyle = P.INK; diamondLine(c, sx, sy);
        c.fillStyle = '#6b645a'; for (let k = 3; k < 14; k += 3) c.fillRect(sx - 12 + k, sy + k, 8, 1);
        continue;
      }
      if (m.fairyLight) {
        const { distances, span } = m.fairyLight;
        const depth = U.clamp(distances[i] / span, 0, 1), grain = Math.round(h * 9);
        c.fillStyle = 'rgb(' + [184 - depth * 128 + grain, 201 - depth * 128 + grain, 146 - depth * 84 + grain].map(Math.round).join(',') + ')';
        diamondFill(c, sx, sy);
        if (h < 0.18) {
          c.fillStyle = depth < 0.4 ? '#f2cbdb' : '#839575';
          c.fillRect(sx - 3, sy + 8, 2, 1);
          c.fillRect(sx + 5, sy + 7, 1, 2);
        }
        continue;
      }
      if (m.lanterns) { caveFloor(c, m.lanterns, x, y, sx, sy, h); continue; }
      if (m.forest) { forestFloor(c, m, x, y, sx, sy, h); continue; }
      c.fillStyle = 'rgba(27,27,27,0.22)';
      c.fillRect(sx, sy, 1, 1);
      if (h < 0.07) { c.fillStyle = 'rgba(27,27,27,0.5)'; P.line(c, sx - 2, sy + 6, sx - 1, sy + 8); P.line(c, sx - 1, sy + 8, sx + 1, sy + 5); }
      else if (h < 0.1) { c.fillStyle = 'rgba(27,27,27,0.4)'; c.fillRect(sx + 3, sy + 7, 3, 1); c.fillRect(sx + 4, sy + 6, 1, 3); }
      else if (strange && h < 0.16) { c.fillStyle = 'rgba(120,60,160,0.55)'; P.ellipse(c, sx, sy + 8, 3, 1.5, 10); c.fillRect(sx, sy + 8, 1, 1); }
      if (completed && h > 0.95) { // ดอกไม้
        c.fillStyle = land.color; c.fillRect(sx - 1, sy + 7, 3, 1); c.fillRect(sx, sy + 6, 1, 3);
        c.fillStyle = P.INK; c.fillRect(sx, sy + 7, 1, 1);
      }
    }
    R.floor = cv;
  };

  // ----- เฟรม -----
  R.frame = function (G) {
    const c = R.ctx, W = R.W, H = R.H, m = G.map;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.fillStyle = m?.book ? (m.book.style === 'folded' ? '#9b8065' : '#5f594f') : m?.rockCave ? '#161923' : m?.fairyLight ? '#253a36' : m?.softCave ? '#e8e2d6' : P.PAPER; c.fillRect(0, 0, W, H);
    if (!m) return;
    const camY = PD_DATA.config.cameraScreenY;
    const sh = G.shakeOff || { x: 0, y: 0 };
    const fx = W / 2 - G.cam.x + sh.x, fy = H * camY - G.cam.y + sh.y;
    const ox = Math.floor(fx), oy = Math.floor(fy); R.ox = ox; R.oy = oy;
    // เศษพิกเซลของกล้อง → เลื่อนผืนผ้าใบด้วย CSS ให้กล้องเลื่อนลื่น ไม่กระตุกทีละพิกเซลใหญ่
    const ssx = ((fx - ox) * R.cssScale).toFixed(2), ssy = ((fy - oy) * R.cssScale).toFixed(2);
    const tr = 'translate(' + ssx + 'px,' + ssy + 'px)';
    if (R.onShift) R.onShift(ssx, ssy, tr);
    const scr = (x, y) => ({ x: ox + (x - y) * 16, y: oy + (x + y) * 8 });
    R.toScreen = scr;
    c.drawImage(R.floor, ox - R.floorOx, oy);
    const WH = PD_DATA.config.wallH, T = SP.WALL_TOP, t = G.time;
    const inView = (x, y, mx) => x > -mx && x < W + mx && y > -mx - 30 && y < H + mx;

    // ----- decals (บนพื้น) -----
    c.fillStyle = P.INK;
    for (let i = 0; i < m.w * m.h; i++) {
      if (!m.gate[i] && !m.chasm[i] && !m.block[i]) continue;
      const x = i % m.w, y = (i / m.w) | 0, s = scr(x, y);
      if (!inView(s.x, s.y, 20)) continue;
      if (m.chasm[i] && G.bridgeT > 0) {
        if (G.bridgeT > 5 || ((t * 8) | 0) % 2) {
          c.fillStyle = '#d8c7a6'; diamondFill(c, s.x, s.y + 1);
          c.fillStyle = P.INK; for (let k = 2; k < 15; k += 3) P.line(c, s.x - 13 + k, s.y + 2 + k * 0.5, s.x + k - 2, s.y + 9 + k * 0.5 - 6);
        }
      }
      if (m.block[i] && G.blockerOpen(m.block[i] - 1)) { c.fillStyle = 'rgba(27,27,27,0.3)'; P.dash = 1; diamondLine(c, s.x, s.y); P.dash = 0; }
      if (m.gate[i] && !G.gateSolid(i)) { c.fillStyle = 'rgba(27,27,27,0.5)'; P.dash = 2; diamondLine(c, s.x, s.y); P.dash = 0; }
    }
    // วงเตือนการโจมตีของศัตรู
    for (const fx of G.effects) {
      if (fx.type !== 'freezeArea') continue;
      const pos = scr(fx.x, fx.y), rx = fx.radius * 22.6, ry = fx.radius * 11.3;
      const fade = Math.min(1, (fx.dur - fx.t) / 0.35);
      c.save();
      c.fillStyle = '#416b9a';
      // Keep the dots fixed to the ground and stagger their pulses.
      for (let row = -Math.floor(ry / 7); row <= Math.floor(ry / 7); row++) {
        for (let col = -Math.floor(rx / 10); col <= Math.floor(rx / 10); col++) {
          const x = col * 10 + (row % 2) * 4, y = row * 7;
          if ((x / rx) ** 2 + (y / ry) ** 2 > 0.94) continue;
          const pulse = Math.sin(fx.t * 4 + col * 2.3 + row * 1.7);
          c.globalAlpha = fade * (pulse > 0.55 ? 0.63 : 0.20);
          const size = pulse > 0.55 ? 2 : 1;
          c.fillRect(Math.round(pos.x + x), Math.round(pos.y + y), size, size);
        }
      }
      // Brighter pixels mark the exact outer edge of the skill.
      for (let i = 0; i < 64; i++) {
        const angle = i * Math.PI / 32;
        c.globalAlpha = fade * (0.52 + 0.22 * Math.sin(fx.t * 4 + (i % 5) * 1.3));
        c.fillRect(Math.round(pos.x + Math.cos(angle) * rx), Math.round(pos.y + Math.sin(angle) * ry), 2, 2);
      }
      c.restore();
    }
    for (const z of G.zones) {
      const s = scr(z.x, z.y), k = U.clamp(z.t / z.dur, 0, 1);
      c.fillStyle = z.col || '#d23a2a'; P.dash = 2; P.ellipse(c, s.x, s.y, z.r * 22.6, z.r * 11.3, 40); P.dash = 0;
      c.globalAlpha = 0.25 + k * 0.35; P.ellipse(c, s.x, s.y, z.r * 22.6 * k, z.r * 11.3 * k, 30); c.globalAlpha = 1;
    }
    for (const ln of G.lines) { const a = scr(ln.x0, ln.y0), b = scr(ln.x1, ln.y1); c.fillStyle = '#d23a2a'; P.dash = 3; P.line(c, a.x, a.y, b.x, b.y); P.dash = 0; }
    // ปริศนา: เส้นประให้วาด / วงจรหมึก
    m.blockers.forEach((b, bi) => {
      const solved = G.blockerOpen(bi);
      if (b.kind === 'trace') {
        const tr = G.trace && G.trace.idx === bi ? G.trace : null;
        for (let k = 0; k < b.path.length; k++) {
          const q = b.path[k], s = scr(q.x + 0.5, q.y + 0.5);
          const inked = solved || (tr && tr.done.has(k));
          if (k > 0) { const p0 = b.path[k - 1], s0 = scr(p0.x + 0.5, p0.y + 0.5); c.fillStyle = inked ? P.INK : '#4a6fb0'; P.dash = inked ? 0 : 2; P.line(c, s0.x, s0.y, s.x, s.y); P.dash = 0; }
          c.fillStyle = inked ? P.INK : '#4a6fb0'; P.circle(c, s.x, s.y, 1.5, inked);
        }
        if (!solved && !tr) { const s = scr(b.path[0].x + 0.5, b.path[0].y + 0.5); c.fillStyle = '#4a6fb0'; P.circle(c, s.x, s.y, 4 + Math.sin(t * 5), false); P.line(c, s.x + 3, s.y - 12, s.x, s.y - 4); P.line(c, s.x + 5, s.y - 11, s.x + 2, s.y - 3); }
        if (tr) { const s = scr(G.player.x, G.player.y); const k = U.clamp(tr.t / PD_DATA.config.puzzle.traceTime, 0, 1); c.fillStyle = 'rgba(27,27,27,0.5)'; c.fillRect(s.x - 8, s.y - 34, 16, 2); c.fillStyle = '#4a6fb0'; c.fillRect(s.x - 8, s.y - 34, Math.round(16 * k), 2); }
      } else if (b.kind === 'circuit') {
        const cs = solved ? [1, 1, 1, 1] : G.circuit[bi];
        for (let k = 0; k < 4; k++) {
          const a = b.nodes[k], d = b.nodes[(k + 1) % 4], sa = scr(a.x + 0.5, a.y + 0.5), sd = scr(d.x + 0.5, d.y + 0.5);
          const ready = !cs[k] && cs[(k + 3) % 4];
          if (cs[k]) { c.fillStyle = P.INK; P.line(c, sa.x, sa.y, sd.x, sd.y); c.fillStyle = '#e8c21a'; const q = (t * 0.8 + k * 0.25) % 1; c.fillRect(Math.round(U.lerp(sa.x, sd.x, q)), Math.round(U.lerp(sa.y, sd.y, q)), 2, 1); }
          else { c.fillStyle = ready && ((t * 4) | 0) % 2 ? '#d9a400' : '#9a9488'; P.dash = 2; P.line(c, sa.x, sa.y, sd.x, sd.y); P.dash = 0; }
        }
        b.nodes.forEach((q, k) => { const s = scr(q.x + 0.5, q.y + 0.5); c.fillStyle = k === 0 || solved ? '#e8c21a' : '#fff'; P.circle(c, s.x, s.y, 3, true); c.fillStyle = P.INK; P.circle(c, s.x, s.y, 3, false); });
      }
    });
    // สวิตช์
    for (const sw of m.switches) {
      const s = scr(sw.x + 0.5, sw.y + 0.5); c.fillStyle = P.INK;
      P.ellipse(c, s.x, s.y, 7, 3.5, 20); P.ellipse(c, s.x, s.y, 4, 2, 14); const ang = [-0.6, -2.5, -1.55, -0.1][G.INK_MODES.indexOf(G.inkMode)] || -0.6;
      P.line(c, s.x, s.y, s.x + Math.cos(ang) * 10, s.y + Math.sin(ang) * 10); P.circle(c, s.x + Math.cos(ang) * 10, s.y + Math.sin(ang) * 10, 2, true);
      if (inView(s.x, s.y, 30)) { // ลูกศรลอยเหนือสวิตช์ + วงเรืองให้หาเจอง่าย
        const bob = Math.round(Math.sin(t * 5) * 2), ay = s.y - 22 + bob; c.fillStyle = '#d9a400';
        P.line(c, s.x, ay + 6, s.x, ay); P.line(c, s.x - 3, ay + 3, s.x, ay + 6); P.line(c, s.x + 3, ay + 3, s.x, ay + 6);
        c.globalAlpha = 0.35 + Math.sin(t * 5) * 0.2; P.dash = 2; P.ellipse(c, s.x, s.y, 10, 5, 24); P.dash = 0; c.globalAlpha = 1;
      }
    }

    // ----- รายการวัตถุเรียงลึก -----
    const list = [];
    for (const wl of m.wallList) {
      const s = scr(wl.x, wl.y);
      if (!inView(s.x, s.y, 40)) continue;
      if (m.book) {
        const art = m.paperProps?.[wl.y * m.w + wl.x] || 'wall';
        list.push({ k: wl.x + wl.y + 1, wall: 1, s, sp: bookSprite(m.book.style, art, wl.variant, wl.low) });
        continue;
      }
      let theme = m.rockCave ? 'lanternCave' : G.land.theme;
      let variant = wl.variant;
      if (m.fairyLight && wl.v === 1) {
        const depth = m.fairyLight;
        let nearest = Infinity;
        for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]) {
          const distance = depth.distances[(wl.y + dy) * m.w + wl.x + dx];
          if (distance >= 0) nearest = Math.min(nearest, distance);
        }
        const band = Math.min(3, Math.floor(nearest / depth.span * 4));
        theme = 'fairyForest';
        variant += band * 4;
      }
      list.push({ k: wl.x + wl.y + 1, wall: 1, s, sp: SP.wallSprite(theme, wl.v, variant, 0, wl.low) });
    }
    for (let i = 0; i < m.w * m.h; i++) {
      if (!m.gate[i] || !G.gateSolid(i)) continue;
      const gcode = m.toggleStyle === 'fold' ? 3 : [0, 1, 2, 7, 8][m.gate[i]];
      const x = i % m.w, y = (i / m.w) | 0, s = scr(x, y);
      if (!inView(s.x, s.y, 40)) continue;
      list.push({ k: x + y + 1, wall: 1, s, sp: SP.wallSprite(G.land.theme, 1, 0, gcode) });
    }
    for (let i = 0; i < m.w * m.h; i++) {
      if (!m.block[i] || G.blockerOpen(m.block[i] - 1)) continue;
      const x = i % m.w, y = (i / m.w) | 0, s = scr(x, y);
      if (!inView(s.x, s.y, 40)) continue;
      const kind = m.blockers[m.block[i] - 1].kind;
      const sp = kind === 'pageDoor' ? bookSprite(m.book.style, 'door', 0, false) : SP.wallSprite(G.land.theme, 1, 0, { trace: 4, circuit: 5, erase: 6 }[kind]);
      list.push({ k: x + y + 1, wall: 1, s, sp });
    }
    const ent = (k, fn, ref) => list.push({ k, fn, ref });
    for (const lamp of m.book?.lamps || m.lanterns || []) {
      const pos = scr(lamp.x, lamp.y);
      if (inView(pos.x, pos.y, 40)) ent(lamp.x + lamp.y, () => caveLantern(c, pos, t, lamp.wall));
    }
    // ประตูเปลี่ยนแผนที่
    for (const p of G.activePortals()) {
      ent(p.x + p.y + 1, () => {
        const s = scr(p.x + 0.5, p.y + 0.5); c.fillStyle = P.INK;
        P.line(c, s.x - 6, s.y, s.x - 6, s.y - 18); P.line(c, s.x + 6, s.y, s.x + 6, s.y - 18); P.line(c, s.x - 6, s.y - 18, s.x + 6, s.y - 18);
        P.dash = 2; P.line(c, s.x - 4, s.y - 2, s.x - 4, s.y - 15); P.line(c, s.x + 4, s.y - 2, s.x + 4, s.y - 15); P.dash = 0;
        c.fillStyle = p.to === 'world' ? '#e8b04a' : p.to === 'town' ? '#3c9a5c' : '#2f6fd6';
        for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.1; c.fillRect(Math.round(s.x + Math.cos(a) * 3), Math.round(s.y - 9 + Math.sin(a) * 5), 1, 1); }
        if (p.to === 'next' || p.to === 'town') { c.fillStyle = P.INK; P.line(c, s.x - 2, s.y - 22, s.x + 2, s.y - 22); P.line(c, s.x + 2, s.y - 22, s.x, s.y - 24); P.line(c, s.x + 2, s.y - 22, s.x, s.y - 20); }
      });
    }
    // กองกระดาษค้นหา
    m.searchSpots.forEach((sp, idx) => {
      ent(sp.x + sp.y + 1, () => {
        const s = scr(sp.x + 0.5, sp.y + 0.5); c.fillStyle = P.INK;
        if (G.isUsed('search', idx)) { P.ellipse(c, s.x, s.y, 5, 2, 14); return; }
        P.circle(c, s.x - 3, s.y - 2, 2); P.circle(c, s.x + 2, s.y - 3, 3); P.circle(c, s.x, s.y - 6, 2);
        P.line(c, s.x - 6, s.y, s.x + 6, s.y);
        if (((t * 2 + idx) | 0) % 3 === 0) { c.fillStyle = '#e8c21a'; c.fillRect(s.x + 3, s.y - 9, 1, 1); }
      });
    });
    // หีบ
    m.chests.forEach((ch, idx) => {
      ent(ch.x + ch.y + 1, () => {
        const s = scr(ch.x + 0.5, ch.y + 0.5), open = G.isUsed('chest', idx); c.fillStyle = P.INK;
        P.poly(c, [[s.x - 6, s.y - 2], [s.x, s.y + 1], [s.x + 6, s.y - 2], [s.x + 6, s.y - 7], [s.x, s.y - 4], [s.x - 6, s.y - 7]], true);
        P.line(c, s.x, s.y + 1, s.x, s.y - 4);
        if (open) P.poly(c, [[s.x - 6, s.y - 7], [s.x - 3, s.y - 13], [s.x + 3, s.y - 10], [s.x, s.y - 4]]);
        else { P.poly(c, [[s.x - 6, s.y - 7], [s.x, s.y - 10], [s.x + 6, s.y - 7]]); c.fillStyle = '#e8c21a'; c.fillRect(s.x - 1, s.y - 5, 2, 2); }
      });
    });
    // ของบนพื้น
    for (const pk of G.pickups) {
      ent(pk.x + pk.y, () => {
        const s = scr(pk.x, pk.y), b = Math.sin(t * 4 + pk.x) * 1.5;
        if (pk.kind === 'weapon') {
          const col = PD.Loot.rarity(pk.w.rarity).color; c.fillStyle = P.INK;
          const pimg = (pk.w.kind === 'gear' ? PD.Loot.gearBase(pk.w.base) : PD.Loot.base(pk.w.base)).groundImg; // รูปตอนตกพื้น แยกจากรูปไอเท็ม (img)
          if (pimg && SP.drawImg(c, pimg, s.x, s.y + b, 14)) { /* รูปจาก editor */ } else if (pk.w.kind === 'gear') SP.gear(c, pk.w.slot, s.x - 5, s.y - 10 + b, 0.7); else SP.weapon(c, PD.Loot.base(pk.w.base).shape, s.x - 4, s.y - 2 + b, -0.5, 0.8);
          c.fillStyle = col; if (pk.w.rarity !== 'normal') { c.fillRect(s.x - 5, s.y - 6 + b, 1, 1); c.fillRect(s.x + 3, s.y - 9 + b, 1, 1); c.fillRect(s.x + 1, s.y - 3 + b, 1, 1); }
        } else if (pk.kind === 'pageKey') {
          c.save();
          c.translate(Math.round(s.x), Math.round(s.y - 11 + b));
          c.scale(Math.max(0.2, Math.abs(Math.cos(t * 4.5))), 1);
          c.strokeStyle = '#5c3a12'; c.lineWidth = 5;
          c.beginPath(); c.arc(-4, 0, 3.5, 0, Math.PI * 2); c.moveTo(-1, 0); c.lineTo(8, 0); c.lineTo(8, 3); c.moveTo(4, 0); c.lineTo(4, 2); c.stroke();
          c.strokeStyle = '#ffcf50'; c.lineWidth = 2.5; c.stroke();
          c.restore();
          c.fillStyle = '#fff1af';
          c.fillRect(s.x + Math.cos(t * 5) * 10, s.y - 17 + b, 2, 2);
        } else if (pk.kind === 'lumi') { // เหรียญ Lumi สีทอง
          const rx = Math.max(0.6, Math.abs(Math.cos(t * 4 + pk.x * 3)) * 2.6), cy = s.y - 4 + b;
          c.fillStyle = '#e8b923'; P.ellipse(c, s.x, cy, rx, 2.6, 12); c.fillRect(Math.round(s.x - rx + 1), Math.round(cy - 1), Math.max(1, Math.round(rx * 2 - 1)), 3);
          c.fillStyle = '#8a6a00'; P.ellipse(c, s.x, cy, rx + 0.4, 3, 14);
          c.fillStyle = '#fff6c8'; c.fillRect(Math.round(s.x - rx / 2), Math.round(cy - 1), 1, 1);
        } else if (pk.kind === 'tool') { // ยางลบ
          c.fillStyle = '#f2b8c6'; c.fillRect(s.x - 4, s.y - 8 + b, 4, 4); c.fillStyle = '#cfe0f5'; c.fillRect(s.x, s.y - 8 + b, 4, 4);
          c.fillStyle = P.INK; P.poly(c, [[s.x - 5, s.y - 9 + b], [s.x + 4, s.y - 9 + b], [s.x + 4, s.y - 4 + b], [s.x - 5, s.y - 4 + b]], true);
        } else if (pk.kind === 'potion' && SP.drawImg(c, PD_DATA.config.shop.find(it => it.kind === 'potion')?.img, s.x, s.y + b, 14)) {
          // Custom item image.
        } else if (pk.kind === 'potion') {
          c.fillStyle = P.INK; P.circle(c, s.x, s.y - 4 + b, 3); P.line(c, s.x, s.y - 7 + b, s.x, s.y - 9 + b);
          c.fillStyle = '#d23a2a'; c.fillRect(s.x - 2, s.y - 4 + b, 5, 2);
        } else {
          const col = pk.kind === 'quest' ? '#e8a21a' : G.land.color;
          c.fillStyle = col; for (let k = 0; k < 4; k++) { const a = t * 2 + k * Math.PI / 2; c.fillRect(Math.round(s.x + Math.cos(a) * 4), Math.round(s.y - 6 + b + Math.sin(a) * 2), 1, 1); }
          c.fillStyle = P.INK; P.poly(c, [[s.x - 3, s.y - 4 + b], [s.x, s.y - 9 + b], [s.x + 3, s.y - 4 + b], [s.x, s.y - 2 + b]], true);
          c.fillStyle = col; c.fillRect(s.x - 1, s.y - 5 + b, 2, 2);
        }
      });
    }
    // NPC
    for (const n of G.npcs) {
      ent(n.x + n.y, () => {
        const s = scr(n.x, n.y), d = n.def;
        SP.drawActor(c, s.x, s.y, { shape: d.shape, opts: d.opts, t: t + n.phase, facing: n.facing, size: d.shape === 'tree' ? 1.3 : 1, sprite: d.sprite });
        if (G.npcHasQuest(n.id)) { c.fillStyle = '#e8a21a'; P.text(c, '!', s.x, s.y - (d.shape === 'tree' ? 56 : 32) + Math.sin(t * 5) * 1.5); }
      });
    }
    // ศัตรู
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.blinkT > 0) { e.blinkT -= 1 / 60; if (Math.floor(G.time * 16) % 2) continue; } // บอสสุดท้ายกะพริบรัวๆ ก่อนฉากจบ
      ent(e.x + e.y, () => {
        const s = scr(e.x, e.y), d = e.def;
        let col = P.INK;
        if (e.hurtT > 0) { const k = e.hurtT / 0.27; col = k > 0.6 ? '#d23a2a' : k > 0.3 ? '#ffffff' : '#555'; }
        if (e.frozenT > 0) col = '#3a8de0';
        else if (e.hurtT <= 0 && e.alpha) col = CFG_A().color; // Alpha: สีอมม่วง
        else if (e.hurtT <= 0 && e.slowT > 0 && e.slowMul < 1) col = '#3a6fa8';
        if (e.alpha) { c.globalAlpha = 0.35 + Math.sin(t * 5) * 0.15; c.fillStyle = CFG_A().color; P.ellipse(c, s.x, s.y, 9 * d.size, 4.5 * d.size, 20); c.globalAlpha = 1; }
        SP.drawActor(c, s.x, s.y, { shape: d.shape, opts: Object.assign({ tentacleFlash: e.state === 'pattern' && e.pat === 'inkDrain' && Math.floor(t * 12) % 2 === 0, hat: d.hat, bat: d.bat, wings: d.wings, fin: d.fin, big: d.size > 1.05 && d.shape === 'bird', wig: e.wigT > 0 }, d.opts, d.thorny ? { thorny: true, spiky: e.state === 'windup' || (e.state === 'cd' && e.t > d.cd - 0.4) } : null), size: d.size, t: e.anim, moving: e.moving, facing: e.facing, z: (d.float || 0) + Math.sin(e.anim * 3) * (d.float ? 1.5 : 0), color: col, dashed: d.pale, sprite: d.sprite, attackP: e.state === 'windup' ? U.clamp(e.t / Math.max(0.1, d.windup || 0.5), 0, 1) : (e.state === 'cd' && e.t > d.cd - 0.4) ? 0.9 : -1 });
        if (e.shieldArmor !== undefined) drawAbsorbShield(c, s, e, t);
        const top = s.y - 26 * d.size - (d.float || 0);
        if (e.state === 'windup' && !e.frozenT) { c.fillStyle = '#d23a2a'; P.text(c, '!', s.x, top - 6); }
        if (e.alpha) { c.fillStyle = CFG_A().color; P.text(c, 'α', s.x + 8, top - 4); }
        if (e.hp < e.maxHp && !d.boss) { c.fillStyle = 'rgba(27,27,27,0.6)'; c.fillRect(s.x - 6, top, 12, 2); c.fillStyle = '#d23a2a'; c.fillRect(s.x - 6, top, Math.max(1, Math.round(12 * e.hp / e.maxHp)), 2); }
      });
    }
    // ผู้เล่น + ปลายปากกา
    const pl = G.player, ps = scr(pl.x, pl.y);
    const heroOpts = () => ({ sprite: PD_DATA.heroSprite || undefined, shape: 'hero', size: 1, t: pl.anim, moving: pl.moving, facing: pl.facing, weapon: G.derived.shape,
      attackP: pl.atk ? U.clamp(pl.atk.t / pl.atk.dur, 0, 1) : -1, charge: pl.castT > 0 ? 1 - pl.castT / pl.castDur : -1, aimAng: pl.aimAng, arc: G.derived.arc, swingDir: pl.swingDir,
      color: pl.hurtT > 0 ? '#d23a2a' : P.INK, wcolor: PD.Loot.rarity(G.S.player.weapon.rarity).color, wglow: G.S.player.weapon.rarity === PD_DATA.rarities[PD_DATA.rarities.length - 1].id });
    const aSet = G.derived.set && PD_DATA.gearSets.find(x => x.id === G.derived.set);
    ent(pl.x + pl.y, () => {
      if (pl.freezeCast) drawFreezeCast(c, ps, pl.freezeCast, t);
      if (aSet) { c.globalAlpha = 0.25 + Math.sin(t * 6) * 0.1; c.fillStyle = aSet.aura.color; P.ellipse(c, ps.x, ps.y, 11, 5.5, 24); P.ellipse(c, ps.x, ps.y - 1, 9, 4.5, 24); c.globalAlpha = 1; } // แสงเรืองเซต
      if (pl.poisonT > 0) { c.fillStyle = '#3c9a5c'; P.text(c, '☠', ps.x - 9, ps.y - 30); }
      if ((pl.invuln > 0 || pl.immortalT > 0) && pl.hurtT <= 0 && ((t * 20) | 0) % 2) c.globalAlpha = 0.5;
      SP.drawActor(c, ps.x, ps.y, heroOpts());
      c.globalAlpha = 1;
      if (pl.shieldT > 0 && (pl.shieldT > 0.4 || ((t * 14) | 0) % 2)) { // โล่ป้องกัน: วงรีเส้นประสองชั้นรอบตัว + ประกายหมุน
        c.fillStyle = '#6b5d44'; P.dash = 1; P.ellipse(c, ps.x, ps.y - 12, 14, 18, 40); P.dash = 0;
        c.fillStyle = '#8a7b60'; P.ellipse(c, ps.x, ps.y - 12, 11, 15, 32);
        for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1; c.fillStyle = '#e8c21a'; c.fillRect(Math.round(ps.x + Math.cos(a) * 12), Math.round(ps.y - 12 + Math.sin(a) * 16), 1, 1); }
      }
    }, 'player');
    const nibS = scr(G.nib.x, G.nib.y);
    ent(G.nib.x + G.nib.y, () => SP.drawActor(c, nibS.x, nibS.y, { shape: 'nib', t, z: 14, noShadow: false, color: P.INK }));

    if (G.net && G.net.drawRemotes) G.net.drawRemotes({ ent, scr, c, t, inView }); // ออนไลน์: ผู้เล่นคนอื่น (ออฟไลน์ไม่มี G.net)
    if (G.drawExtra) G.drawExtra({ ent, scr, c, t, inView }); // ฉากพิเศษ (ลานต้นหมึกหน้าแรก)
    list.sort((a, b) => a.k - b.k || (a.wall ? -1 : 0) - (b.wall ? -1 : 0));
    // ---- บังตัวละคร: กำแพงที่อยู่หน้าตัวผู้เล่นและทับกรอบภาพ → โปร่ง ----
    const pk = pl.x + pl.y, pr = { x0: ps.x - 9, y0: ps.y - 27, x1: ps.x + 9, y1: ps.y + 2 };
    let occluded = false, drawn = 0;
    const occA = PD_DATA.config.occlusionAlpha;
    for (const it of list) {
      if (it.wall) {
        const x = it.s.x - 16, y = it.s.y - T - it.sp.wh;
        let a = 1;
        if (it.k > pk && it.k < pk + 6) {
          const sx0 = x, sy0 = y + (it.sp.height > 40 ? 0 : 0), sx1 = x + 33, sy1 = it.s.y + 16;
          if (sx0 < pr.x1 && sx1 > pr.x0 && sy0 < pr.y1 && sy1 > pr.y0 && sy0 < pr.y1 - 4) { a = occA; occluded = true; }
        }
        c.globalAlpha = a; c.drawImage(it.sp, x, y); c.globalAlpha = 1; drawn++;
      } else { it.fn(); drawn++; }
    }
    if (occluded) { // เงาร่างเส้นประให้เห็นตำแหน่ง
      const o = heroOpts(); o.dashed = true; o.noShadow = true; o.color = '#2f6fd6';
      SP.drawActor(c, ps.x, ps.y, o);
    }
    R.lastOccluded = occluded; R.lastDrawn = drawn;

    if (G.arenaHitboxes) {
      const ring = (x, y, radius, color) => {
        const pos = scr(x, y);
        c.strokeStyle = color;
        c.beginPath();
        c.ellipse(pos.x, pos.y, radius * 22.6, radius * 11.3, 0, 0, Math.PI * 2);
        c.stroke();
      };
      c.save();
      ring(G.player.x, G.player.y, G.derived.range, '#7052a0');
      for (const e of G.enemies) if (!e.dead) {
        ring(e.x, e.y, e.radius, '#b43d33');
        if (e.def.range > 0) ring(e.x, e.y, e.def.range, '#a77736');
      }
      c.restore();
    }
    if (m.fairyLight) {
      const { distances, span } = m.fairyLight;
      c.save();
      for (let y = 1; y < m.h - 1; y += 2) for (let x = 1; x < m.w - 1; x += 2) {
        if (distances[y * m.w + x] < span * 0.38 || U.hash(x, y, 73) > 0.62) continue;
        const p = scr(x + 0.5, y + 0.5);
        if (!inView(p.x, p.y, 12)) continue;
        const phase = U.hash(x, y, 79) * 12, glow = 0.48 + Math.sin(t * 2.3 + phase) * 0.42;
        p.x += Math.sin(t * 0.9 + phase) * 5;
        p.y -= 5 + Math.cos(t * 0.8 + phase) * 3;
        c.globalAlpha = glow * 0.24; c.fillStyle = '#b9ef79'; P.circle(c, p.x, p.y, 4, true);
        c.globalAlpha = glow; c.fillStyle = '#f4ffbb'; c.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      }
      c.restore();
    }

    // ----- เอฟเฟกต์ -----
    for (const fx of G.effects) if (fx.type !== 'freezeArea') drawEffect(c, fx, scr, t);
    if (G.targeting && G.player) { const ps = scr(G.player.x, G.player.y); c.globalAlpha = 0.8; c.fillStyle = '#8a3fd1'; P.ellipse(c, ps.x, ps.y, G.targeting.range * 22.6, G.targeting.range * 11.3, 64); c.globalAlpha = 1; }
    for (const pj of G.projectiles) {
      const s = scr(pj.x, pj.y); const z = 10;
      c.fillStyle = pj.col;
      if (pj.style === 'wave') { const d = U.worldDirToScreen(pj.vx, pj.vy), px = -d.y, py = d.x; c.fillStyle = P.INK; for (let k = -5; k <= 5; k++) { const bend = Math.abs(k) * 0.5; c.fillRect(Math.round(s.x + px * k - d.x * bend), Math.round(s.y - z + py * k - d.y * bend), 1, 1); } }
      else if (pj.style === 'bolt') { c.fillStyle = '#8a3fd1'; c.fillRect(s.x - 2, s.y - z - 2, 5, 5); c.fillStyle = '#fff'; c.fillRect(s.x - 1, s.y - z - 1, 3, 3); c.fillStyle = P.INK; P.circle(c, s.x, s.y - z, 3, false); }
      else { P.circle(c, s.x, s.y - z, pj.style === 'fire' ? 3 : 2, true); c.fillStyle = P.INK; P.circle(c, s.x, s.y - z, pj.style === 'fire' ? 3 : 2, false); }
    }
    for (const p of G.particles) {
      const s = scr(p.x, p.y); c.globalAlpha = U.clamp(p.life / p.max * 1.4, 0, 1); c.fillStyle = p.col;
      c.fillRect(Math.round(s.x), Math.round(s.y - p.z), p.sz, p.sz);
    }
    c.globalAlpha = 1;
    if (m.book) bookLighting(c, m, pl, scr, W, H, t);
    for (const f of G.floaters) {
      const s = scr(f.x, f.y); c.globalAlpha = U.clamp(f.life * 2, 0, 1);
      c.fillStyle = '#ffffff'; P.text(c, f.text, s.x + 1, s.y - f.z + 1, f.scale || 1);
      c.fillStyle = f.col; P.text(c, f.text, s.x, s.y - f.z, f.scale || 1);
    }
    c.globalAlpha = 1;
    if (G.foldFx > 0) { // เอฟเฟกต์พับกระดาษกวาดผ่านจอ
      const k = 1 - G.foldFx / 0.5, x = Math.round(k * (W + 60)) - 30;
      c.globalAlpha = 0.85; c.fillStyle = P.PAPER; c.beginPath(); c.moveTo(x - 40, 0); c.lineTo(x, 0); c.lineTo(x - 30, H); c.lineTo(x - 70, H); c.closePath(); c.fill();
      c.globalAlpha = 1; c.fillStyle = P.INK; P.dash = 3; P.line(c, x, 0, x - 30, H); P.dash = 0;
    }
    { const f = m.toggleStyle === 'fold' ? '' : ({ white: 'invert(1)', red: 'sepia(1) saturate(8) hue-rotate(-45deg) brightness(0.9)', blue: 'sepia(1) saturate(4) hue-rotate(175deg) brightness(0.95)' }[G.inkMode] || ''); if (R.onFilter) R.onFilter(f); else R.canvas.style.filter = f; }
    R.stats = { walls: m.wallList.length, drawn };
  };

  const CFG_A = () => PD_DATA.config.alpha;
  function drawEffect(c, fx, scr, t) {
    if (fx.type === 'tentacle') {
      const a = scr(fx.x0, fx.y0), b = scr(fx.x1, fx.y1), progress = Math.min(1, fx.t / fx.dur * 3);
      const x = U.lerp(a.x, b.x, progress), y = U.lerp(a.y - 10, b.y - 5, progress);
      c.save();
      c.strokeStyle = '#843c75'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(a.x, a.y - 10);
      c.quadraticCurveTo((a.x + x) / 2, (a.y + y) / 2 - 12, x, y); c.stroke();
      if (fx.wrap && progress === 1) { c.beginPath(); c.ellipse(x, y, 8, 4, 0, 0, Math.PI * 2); c.stroke(); }
      c.restore();
      return;
    }
    if (fx.type === 'zap') { // สายฟ้าลูกโซ่: เส้นซิกแซกพิกเซล
      const a = scr(fx.x0, fx.y0), b = scr(fx.x1, fx.y1), k = U.clamp(fx.t / fx.dur, 0, 1), n = 7;
      c.globalAlpha = 1 - k * 0.7; c.fillStyle = fx.col || '#e8c21a'; let px = a.x, py = a.y - 12;
      for (let i = 1; i <= n; i++) { const q = i / n, nx = a.x + (b.x - a.x) * q + (i < n ? (Math.random() - 0.5) * 6 : 0), ny = a.y - 12 + (b.y - a.y) * q + (i < n ? (Math.random() - 0.5) * 6 : 0); P.line(c, px, py, nx, ny); px = nx; py = ny; }
      c.globalAlpha = 1; return;
    }
    if (fx.type === 'ghost') { // เงาตัวเองทิ้งไว้ตามทางถอย: จางตามเวลา · a0 ยิ่งใกล้ตำแหน่งปัจจุบันยิ่งเข้ม
      const gk = U.clamp(fx.t / fx.dur, 0, 1), gs = scr(fx.x, fx.y);
      c.globalAlpha = Math.max(0, fx.a0 * (1 - gk));
      SP.drawActor(c, gs.x, gs.y, { shape: 'hero', size: 1, t: fx.anim, moving: true, facing: fx.facing, weapon: PD.Game.derived.shape, attackP: -1, charge: -1, color: P.INK, noShadow: true, wcolor: P.INK });
      c.globalAlpha = 1; return;
    }
    if (fx.type === 'streak') { // เส้นขีดแนวตั้งจากเท้าถึงหัว (ประมาณ 26px) แบบวาร์ป
      const ss = scr(fx.x, fx.y), sk = U.clamp(fx.t / fx.dur, 0, 1), x = Math.round(ss.x + fx.ox), top = Math.round(ss.y - fx.h - 2 - sk * 4);
      c.globalAlpha = 1 - sk; c.fillStyle = P.INK;
      for (let y = top; y < ss.y - 1; y += 5) c.fillRect(x, y, 1, 3);
      c.globalAlpha = 1; return;
    }
    if (fx.type === 'charge') { // ชาร์จที่ปลายคทา: จุดพิกเซลไหลเข้าหาแกนกลางที่ค่อยๆ โต
      const pl = PD.Game.player, q = U.clamp(fx.t / fx.dur, 0, 1), tip = scr(pl.x + fx.ax * 0.6, pl.y + fx.ay * 0.6), ty = tip.y - 15;
      c.fillStyle = '#8a3fd1';
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + q * 5, rr = (1 - q) * 11 + 1; c.fillRect(Math.round(tip.x + Math.cos(a) * rr), Math.round(ty + Math.sin(a) * rr * 0.8), 1, 1); }
      const sz = 1 + Math.round(q * 2); c.fillRect(tip.x - sz, ty - sz, sz * 2 + 1, sz * 2 + 1); c.fillStyle = '#fff'; c.fillRect(tip.x, ty, 1, 1); c.globalAlpha = 1; return;
    }
    const k = U.clamp(fx.t / fx.dur, 0, 1), s = scr(fx.x, fx.y);
    c.globalAlpha = 1 - k; c.fillStyle = fx.col || P.INK;
    if (fx.type === 'slash') { // เส้นฟันที่ค่อยๆ จาง
      const arc = fx.arc, prog = Math.min(1, k * 2.2);
      for (let i = 0; i <= 18; i++) {
        const q = i / 18; if (q > prog) break;
        const a = fx.ang - fx.dir * arc / 2 + fx.dir * arc * q;
        const rr = fx.r * (0.85 + 0.15 * Math.sin(q * Math.PI));
        c.fillRect(Math.round(s.x + Math.cos(a) * rr), Math.round(s.y - 12 + Math.sin(a) * rr * 0.75), q > 0.3 && q < 0.8 ? 2 : 1, 1);
      }
    } else if (fx.type === 'ring') {
      const r = U.lerp(fx.r0, fx.r1, k); P.ellipse(c, s.x, s.y, r * 22.6, r * 11.3, 48);
    } else if (fx.type === 'spike') {
      P.line(c, s.x - 2, s.y, s.x, s.y - 8); P.line(c, s.x, s.y - 8, s.x + 2, s.y); P.line(c, s.x + 2, s.y - 1, s.x + 3, s.y - 5);
    } else if (fx.type === 'drop') {
      const fall = Math.max(0, 1 - k * 3) * 60; if (fall > 0) { P.circle(c, s.x, s.y - fall, 3, true); }
      else P.ellipse(c, s.x, s.y, 14 * (k + 0.3), 7 * (k + 0.3), 30);
    } else if (fx.type === 'text') {
      P.text(c, fx.text, s.x, s.y - 30 - k * 10, fx.scale || 2);
    } else if (fx.type === 'heal') {
      for (let i = 0; i < 6; i++) { const a = i + t * 3; c.fillRect(Math.round(s.x + Math.cos(a) * 7), Math.round(s.y - 10 - k * 14 + Math.sin(a * 2) * 3), 1, 2); }
    }
    c.globalAlpha = 1;
  }
  return R;
})();
