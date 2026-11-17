// Desk Dialer monkeys · pixel engine.
// Sprites are painted procedurally the way retro artists do it: shaded forms (4 tones + dithering),
// 1px outlines, hand-placed face details. No image files. Output = RGBA pixel buffers (Uint32, ABGR).
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const MK = (G.MK = G.MK || {});

  /* ---------- colour ---------- */
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; };
  const R5 = (a) => a.map(hex); // ramp: [outline, shadow, base, light, highlight]
  const RAMP = {
    brown: R5(['#2a160e', '#5b3420', '#8a5632', '#b27a47', '#d6a068']),
    tan: R5(['#7a4a2d', '#c58a5b', '#e4b184', '#f4d0a4', '#fde6c4']),
    pink: R5(['#7a3a4a', '#c4607a', '#e68aa0', '#f7b0c0', '#ffd0da']),
    char: R5(['#12111a', '#2b2937', '#434156', '#5d5a74', '#7b7894']),
    cream: R5(['#6a5568', '#cbb89e', '#e8d9c0', '#f6ecda', '#fffaf0']),
    orange: R5(['#4a1c0a', '#a8481b', '#d9702a', '#f5973f', '#ffc47e']),
    peach: R5(['#8a421c', '#e09a6a', '#f5bf92', '#fddab5', '#ffeedd']),
    teal: R5(['#0c2e33', '#1b6b73', '#2aa0a8', '#4bd0c6', '#9af5e6']),
    purple: R5(['#241238', '#4a2c82', '#7a4fc2', '#a07be8', '#cdb6fa']),
    white: R5(['#4a4f63', '#aeb6cc', '#d9deea', '#f1f4fa', '#ffffff']),
    gold: R5(['#5a3c00', '#b8860b', '#f2c230', '#ffe066', '#fff6b0']),
    dark: R5(['#07090d', '#161a24', '#262d3d', '#3c475d', '#5f6e8c']),
    wood: R5(['#2b160a', '#5a3118', '#7d4a26', '#a3693b', '#c58a55']),
    red: R5(['#3a0a10', '#8f1d2c', '#d1344a', '#f0586b', '#ff98a5']),
    green: R5(['#0b2a14', '#1f6a36', '#35a352', '#63cf7a', '#a8f0b6']),
    blue: R5(['#0a1a3a', '#1f4b99', '#3a80e0', '#6fb0ff', '#bfe0ff']),
    banana: R5(['#5a3a00', '#c99a08', '#f6c92b', '#ffe566', '#fff7b8']),
    leaf: R5(['#07240f', '#145a2a', '#23863e', '#3fb458', '#8ee6a0']),
    rust: R5(['#3a1408', '#7a2e14', '#a8461f', '#cc6a35', '#e8955a']),
    silver: R5(['#2a2d38', '#6b7184', '#9aa1b5', '#c3c9d9', '#e8ecf5']),
    ink: R5(['#07080f', '#161b2e', '#252d4a', '#3a4570', '#566596']),
    blond: R5(['#5a3a08', '#b8832a', '#e0a93d', '#f5cb66', '#ffe49a']),
    steel: R5(['#141c2b', '#33496a', '#5679a6', '#86aad4', '#bcd6f0']),
    hotpink: R5(['#4a0a30', '#b01a70', '#e8328f', '#ff63b4', '#ffb0dc']),
    leather: R5(['#07070d', '#17172a', '#2b2b45', '#45456a', '#7474a0']),
    hat: R5(['#3a2210', '#7a4e26', '#a8703a', '#cf9a58', '#ecc088']),
    skyN: R5(['#10163a', '#1d2a63', '#34499a', '#5d7bd0', '#9ab6f5']),
  };
  const C = {
    K: hex('#1a0f0c'), W: hex('#ffffff'), W2: hex('#dfe6f2'), RED: hex('#c93a4a'), TNG: hex('#ff7a9a'), TNG2: hex('#d9506f'),
    TEETH: hex('#fff7e6'), SW: hex('#7cc8ff'), SW2: hex('#d8f1ff'), YEL: hex('#ffd93b'), YEL2: hex('#fff3a0'), ORG: hex('#ff9d2e'),
    PNK: hex('#ff6fa5'), GRN: hex('#5fd08f'), BLUSH: hex('#ff8f9f'), STAR: hex('#ffe14a'), LCD: hex('#8fffb8'), LCD2: hex('#2f8a58'),
  };
  MK.hex = hex; MK.RAMP = RAMP; MK.C = C;

  /* ---------- buffer + shapes ---------- */
  function Buf(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  Buf.prototype.set = function (x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; };
  Buf.prototype.get = function (x, y) { x = Math.floor(x); y = Math.floor(y); return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x]; };
  MK.Buf = Buf;

  const ell = (cx, cy, rx, ry) => (x, y) => { const a = (x - cx) / rx, b = (y - cy) / ry; return a * a + b * b <= 1; };
  const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  const cap = (x1, y1, x2, y2, r) => (x, y) => {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy; let t = l2 ? ((x - x1) * dx + (y - y1) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = x1 + t * dx - x, py = y1 + t * dy - y; return px * px + py * py <= r * r;
  };
  const poly = (pts) => (x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const or = (...f) => (x, y) => { for (let i = 0; i < f.length; i++) if (f[i](x, y)) return true; return false; };
  const sub = (a, b) => (x, y) => a(x, y) && !b(x, y);
  const both = (a, b) => (x, y) => a(x, y) && b(x, y);
  MK.shape = { ell, rect, cap, poly, or, sub, both };

  const maskOf = (g, fn) => { const m = new Uint8Array(g.w * g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (fn(x + 0.5, y + 0.5)) m[y * g.w + x] = 1; return m; };
  // paint a shape: optional 1px outline (4-neighbour), then fill with a colour or a shader(x,y)
  function paint(g, fn, shade, ol, clip) {
    const m = maskOf(g, fn), w = g.w, h = g.h;
    if (clip) for (let i = 0; i < m.length; i++) if (m[i] && !clip[i]) m[i] = 0;
    if (ol) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
      if (x > 0 && !m[y * w + x - 1]) g.d[y * w + x - 1] = ol; if (x < w - 1 && !m[y * w + x + 1]) g.d[y * w + x + 1] = ol;
      if (y > 0 && !m[(y - 1) * w + x]) g.d[(y - 1) * w + x] = ol; if (y < h - 1 && !m[(y + 1) * w + x]) g.d[(y + 1) * w + x] = ol;
    }
    const f = typeof shade === 'function';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) g.d[y * w + x] = f ? shade(x + 0.5, y + 0.5) : shade;
    return m;
  }
  MK.paint = paint; MK.maskOf = maskOf;

  /* ---------- shaders ---------- */
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => (B4[((y | 0) & 3) * 4 + ((x | 0) & 3)] + 0.5) / 16;
  // lit sphere: 4 tones from a ramp, light from the upper-left, ordered-dither between bands
  function ball(R, cx, cy, rx, ry, o) {
    o = o || {}; const lx = o.lx == null ? -0.5 : o.lx, ly = o.ly == null ? -0.65 : o.ly, lz = Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly)), bias = o.bias == null ? -0.12 : o.bias, dd = o.dither == null ? 0.16 : o.dither;
    return (x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, r2 = Math.min(1, nx * nx + ny * ny), nz = Math.sqrt(1 - r2);
      const l = nx * lx + ny * ly + nz * lz, t = l * 0.5 + 0.5 + bias + (bay(x, y) - 0.5) * dd;
      return R[t < 0.34 ? 1 : t < 0.66 ? 2 : t < 0.9 ? 3 : 4];
    };
  }
  // flat horizontal tubes (limbs): lit from above
  function tube(R, x1, y1, x2, y2, r) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    return (x, y) => { let s = ((x - x1) * nx + (y - y1) * ny) / r; if (nx * 0 + ny > 0 && false) s = -s; const lit = -(s * (ny >= 0 ? 1 : -1)) * 0.5 + 0.5 - 0.0; const t = lit + (bay(x, y) - 0.5) * 0.14; return R[t < 0.3 ? 1 : t < 0.7 ? 2 : t < 0.9 ? 3 : 4]; };
  }
  const vgrad = (R, y0, y1) => (x, y) => { const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0))) + (bay(x, y) - 0.5) * 0.2; return R[t < 0.3 ? 4 : t < 0.55 ? 3 : t < 0.8 ? 2 : 1]; };
  MK.shade = { ball, tube, vgrad, bay };

  function blit(g, x0, y0, rows, map) {
    for (let j = 0; j < rows.length; j++) { const r = rows[j]; for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === '.' || ch === ' ') continue; const c = map[ch]; if (c != null) g.set(x0 + i, y0 + j, c); } }
  }
  MK.blit = blit;

  /* ---------- characters ---------- */
  const CH = {
    bongo: { id: 'bongo', name: 'Bongo', tag: 'Chill surfer. Treats every call like a wave.', fur: RAMP.brown, face: RAMP.tan, ear: RAMP.pink, cloth: RAMP.teal, outfit: 'hawaii', acc: ['shades', 'tuft'], sleeves: 'short' },
    peel: { id: 'peel', name: 'Prof. Peel', tag: 'Mad scientist. Statistics are his love language.', fur: RAMP.char, face: RAMP.cream, ear: RAMP.pink, cloth: RAMP.white, outfit: 'labcoat', acc: ['nerd', 'poof'], sleeves: 'long' },
    mango: { id: 'mango', name: 'Mango', tag: 'Deadpan hoodie goblin. Cares. Won\u2019t say it.', fur: RAMP.orange, face: RAMP.peach, ear: RAMP.pink, cloth: RAMP.purple, outfit: 'hoodie', acc: ['hood', 'phones'], sleeves: 'long', calm: true },
  };
  Object.assign(CH, {
    captain: { id: 'captain', name: 'Capt. Chomps', tag: 'Pirate captain. Treats every lead like buried treasure.', fur: RAMP.rust, face: RAMP.tan, ear: RAMP.pink, cloth: RAMP.red, outfit: 'stripes', acc: ['pirate'], sleeves: 'long' },
    reggie: { id: 'reggie', name: 'Sir Reginald', tag: 'Distinguished gentleman. Dials with the pinky raised.', fur: RAMP.silver, face: RAMP.cream, ear: RAMP.pink, cloth: RAMP.dark, outfit: 'tux', acc: ['tophat', 'monocle', 'stache'], sleeves: 'long' },
    riot: { id: 'riot', name: 'Riot', tag: 'Punk rocker. Loud hair, louder follow-ups.', fur: RAMP.ink, face: RAMP.peach, ear: RAMP.pink, cloth: RAMP.leather, outfit: 'leather', acc: ['mohawk', 'studs'], sleeves: 'long' },
    sheriff: { id: 'sheriff', name: 'Sheriff Banjo', tag: 'Cowboy. This town ain\u2019t big enough for unanswered leads.', fur: RAMP.blond, face: RAMP.tan, ear: RAMP.pink, cloth: RAMP.red, outfit: 'western', acc: ['cowboy'], sleeves: 'long' },
    cosmo: { id: 'cosmo', name: 'Cosmo', tag: 'Astronaut. Houston, we have a lead.', fur: RAMP.steel, face: RAMP.cream, ear: RAMP.pink, cloth: RAMP.white, outfit: 'astro', acc: ['helmet'], sleeves: 'long' },
  });
  MK.CH = CH; MK.chars = Object.keys(CH);

  /* ---------- tiny bitmaps ---------- */
  const BM = {
    spiral: ['.kkk.', 'k...k', 'k.k.k', 'k.kk.', '.kk..'].map((s) => s),
    cross: ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'],
    star: ['..y..', '.yyy.', 'yyyyy', '.yyy.', 'y...y'],
    heart: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
  };
  const EM = { k: C.K, y: C.STAR, r: C.RED, w: C.W };

  /* ---------- mouths: centre-aligned bitmaps ---------- */
  const MOUTH = {
    smile: ['k.......k', '.kkkkkkk.'],
    flat: ['.kkkkkkk.'],
    smirk: ['.......k.', '..kkkkk..', '.k.......'],
    grin: ['kkkkkkkkkkk', 'kwwwwwwwwwk', '.krrrrrrrk.', '..kkkkkkk..'],
    laugh: ['kkkkkkkkkkk', 'kwwwwwwwwwk', 'krrrrrrrrrk', 'krrtttttrrk', '.krtttttrk.', '..kkkkkkk..'],
    open: ['.kkkkk.', 'krrrrrk', 'krtttrk', '.kkkkk.'],
    talk0: ['.kkkk.', 'krrrrk', '.kkkk.'],
    talk1: ['..kkk..', '.krrrk.', '.krrrk.', '..kkk..'],
    shout: ['.kkkkkkk.', 'kwwwwwwwk', 'krrrrrrrk', 'krrtttrrk', '.krtttrk.', '..kkkkk..'],
    o: ['.kkk.', 'krrrk', 'krrrk', '.kkk.'],
    frown: ['..kkkkk..', '.k.....k.', 'k.......k'],
    wobble: ['k...k...k', '.k.k.k.k.', '..k...k..'],
    tongue: ['k.......k', '.kkkkkkk.', '..ktttk..', '..ktttk..', '...kkk...'],
    cheeks: ['.kkkkkkkkk.', 'kpppppppppk', '.kkkkkkkkk.'],
    chew: ['.kkkkkkk.', 'k.......k', '.kkkkkkk.'],
    bite: ['kkkkkkkkkkk', 'kwwwwwwwwwk', 'krrrrrrrrrk', '.kkkkkkkkk.'],
    kiss: ['..kkk..', '.kppk..', '..kkk..'],
  };
  const MM = { k: C.K, w: C.TEETH, r: C.RED, t: C.TNG, p: C.BLUSH };
  function mouth(g, cx, cy, kind) {
    const rows = MOUTH[kind] || MOUTH.smile, w = rows[0].length; blit(g, Math.round(cx - w / 2), Math.round(cy), rows, MM);
  }

  /* ---------- eyes ---------- */
  function eye(g, ex, ey, kind, look, side) {
    look = look || [0, 0]; const K = C.K, lx = look[0], ly = look[1];
    const wh = (rx, ry, y0) => paint(g, ell(ex, (y0 == null ? ey : y0), rx, ry), (x, y) => (y > ey + ry * 0.45 ? C.W2 : C.W), K);
    switch (kind) {
      case 'open': {
        wh(2.7, 3.3); paint(g, ell(ex + lx, ey + ly + 0.4, 1.45, 1.9), K); g.set(ex + lx - 0.6, ey + ly - 0.6, C.W); break;
      }
      case 'wide': {
        wh(3.2, 3.9); paint(g, ell(ex + lx * 0.6, ey + ly * 0.6, 1.0, 1.2), K); break;
      }
      case 'blink': { for (let i = -2; i <= 2; i++) g.set(ex + i, ey + 1, K); g.set(ex - 3, ey, K); g.set(ex + 3, ey, K); break; }
      case 'happy': { g.set(ex - 3, ey + 1.5, K); g.set(ex - 2, ey + 0.5, K); g.set(ex - 1, ey - 0.5, K); g.set(ex, ey - 0.5, K); g.set(ex + 1, ey + 0.5, K); g.set(ex + 2, ey + 1.5, K); g.set(ex - 2, ey + 1.5, K); g.set(ex + 1, ey + 1.5, K); break; }
      case 'sleep': { for (let i = -2; i <= 2; i++) g.set(ex + i, ey + (Math.abs(i) === 2 ? 0 : 1), K); g.set(ex - 3, ey - 1, K); g.set(ex + 3, ey - 1, K); break; }
      case 'squint': { // deadpan half-lid
        paint(g, both(ell(ex, ey + 0.7, 2.8, 2.5), rect(ex - 4, ey - 0.4, ex + 4, ey + 4)), C.W, K); paint(g, ell(ex + lx, ey + 1.1, 1.4, 1.2), K); for (let i = -3; i <= 3; i++) g.set(ex + i, ey - 1, K); break;
      }
      case 'smug': { paint(g, both(ell(ex, ey + 0.5, 2.8, 2.7), rect(ex - 4, ey - 0.5, ex + 4, ey + 4)), C.W, K); paint(g, ell(ex + lx, ey + 1.0, 1.4, 1.3), K); for (let i = -3; i <= 3; i++) g.set(ex + i, ey - 1.5, K); break; }
      case 'angry': {
        wh(2.7, 3.0); paint(g, ell(ex + lx, ey + ly + 0.8, 1.45, 1.6), K);
        for (let i = -3; i <= 3; i++) g.set(ex + i, ey - 2.5 + (side < 0 ? (i + 3) * 0.45 : (3 - i) * 0.45), K); break;
      }
      case 'sad': {
        wh(2.7, 3.3); paint(g, ell(ex + lx, ey + ly - 0.4, 1.5, 1.9), K); g.set(ex + lx - 0.6, ey + ly - 1.4, C.W); g.set(ex + (side < 0 ? 3 : -3), ey + 4.2, C.SW); g.set(ex + (side < 0 ? 3 : -3), ey + 5.2, C.SW); break;
      }
      case 'dizzy': blit(g, ex - 2.5, ey - 2.5, BM.spiral, EM); break;
      case 'cross': blit(g, ex - 2.5, ey - 2.5, BM.cross, EM); break;
      case 'star': blit(g, ex - 2.5, ey - 2.5, BM.star, EM); break;
      case 'heart': blit(g, ex - 2.5, ey - 2.5, BM.heart, EM); break;
      default: eye(g, ex, ey, 'open', look, side);
    }
  }

  /* ---------- brows ---------- */
  function brows(g, ex, ey, kind, K) {
    K = K || C.K; if (!kind || kind === 'none') return;
    for (const s of [-1, 1]) {
      const x = ex + s * 4.6; let pts;
      if (kind === 'up') pts = [[-2, -5], [-1, -6], [0, -6], [1, -6], [2, -5]];
      else if (kind === 'angry') pts = s < 0 ? [[-2, -6], [-1, -5], [0, -5], [1, -4], [2, -4]] : [[2, -6], [1, -5], [0, -5], [-1, -4], [-2, -4]];
      else if (kind === 'sad' || kind === 'worry') pts = s < 0 ? [[-2, -4], [-1, -4], [0, -5], [1, -5], [2, -6]] : [[2, -4], [1, -4], [0, -5], [-1, -5], [-2, -6]];
      else if (kind === 'one') pts = s < 0 ? [[-2, -5], [-1, -5], [0, -5], [1, -5], [2, -5]] : [[-2, -4], [-1, -6], [0, -7], [1, -7], [2, -6]];
      else pts = [[-2, -5], [-1, -5], [0, -5], [1, -5], [2, -5]];
      for (const [dx, dy] of pts) g.set(x + dx, ey + dy, K);
    }
  }

  /* ---------- accessories on the face ---------- */
  // lens faces: tiny expression visible through the sunglasses
  function lensFace(g, lx, ly, kind) {
    const W = hex('#bfe3ff');
    if (kind === 'happy') { g.set(lx - 1, ly + 1, W); g.set(lx, ly, W); g.set(lx + 1, ly, W); g.set(lx + 2, ly + 1, W); }
    else if (kind === 'wide') { g.set(lx - 1, ly - 1, W); g.set(lx, ly - 1, W); g.set(lx - 1, ly, W); g.set(lx, ly, W); g.set(lx + 1, ly - 1, W); g.set(lx + 1, ly, W); }
    else if (kind === 'sleep') { g.set(lx - 1, ly + 1, W); g.set(lx, ly + 1, W); g.set(lx + 1, ly + 1, W); }
    else if (kind === 'dizzy') { g.set(lx - 1, ly - 1, W); g.set(lx + 1, ly - 1, W); g.set(lx, ly, W); g.set(lx - 1, ly + 1, W); g.set(lx + 1, ly + 1, W); }
    else if (kind === 'heart') { const r = C.PNK; g.set(lx - 1, ly - 1, r); g.set(lx + 1, ly - 1, r); g.set(lx - 1, ly, r); g.set(lx, ly, r); g.set(lx + 1, ly, r); g.set(lx, ly + 1, r); }
    else if (kind === 'angry') { g.set(lx - 1, ly - 1, W); g.set(lx, ly, W); g.set(lx + 1, ly + 1, W); }
    else if (kind === 'star') { g.set(lx, ly - 1, C.STAR); g.set(lx - 1, ly, C.STAR); g.set(lx, ly, C.STAR); g.set(lx + 1, ly, C.STAR); g.set(lx, ly + 1, C.STAR); }
  }
  function shades(g, hx, ey, F) {
    const down = F.shades === 'down', y0 = ey + (down ? 3 : 0), gold = RAMP.gold, lensR = R5(['#050813', '#0b1430', '#16295f', '#2d57b0', '#cfe8ff']);
    for (let x = hx - 14; x < hx - 9; x++) g.set(x, y0 - 1, gold[1]); for (let x = hx + 9; x < hx + 14; x++) g.set(x, y0 - 1, gold[1]);
    for (const s of [-1, 1]) {
      const cx = hx + s * 4.8, lens = or(ell(cx, y0 + 0.3, 4.5, 3.4), rect(cx - 4.5, y0 - 3, cx + 4.5, y0));
      paint(g, lens, (x, y) => {
        const t = (y - (y0 - 3)) / 6.4, d = (x - cx) - (y - y0) * 1.1, gl = Math.abs(d - (F.glint != null ? F.glint : -1.5)) < 0.75;
        if (gl) return lensR[4]; return t < 0.42 ? lensR[1] : t < 0.78 ? lensR[2] : lensR[3];
      }, gold[0]);
      for (let x = Math.round(cx - 4); x <= Math.round(cx + 3); x++) g.set(x, y0 - 3, gold[3]);
      if (!down) lensFace(g, Math.round(cx), Math.round(y0), F.lens);
    }
    for (let x = hx - 1; x <= hx; x++) { g.set(x, y0 - 2, gold[2]); g.set(x, y0 - 1, gold[1]); }
  }
  function nerd(g, hx, ey, F) {
    const fr = hex('#24142f'), fr2 = hex('#4a2f63');
    for (const s of [-1, 1]) {
      const cx = hx + s * 4.8, ring = sub(ell(cx, ey, 5, 5), ell(cx, ey, 3.5, 3.5));
      paint(g, ring, (x, y) => (y < ey - 2 ? fr2 : fr));
      g.set(cx - 2.5, ey - 2.5, C.W); g.set(cx - 1.5, ey - 3, C.W); g.set(cx - 2.5, ey - 1.5, C.W2);
    }
    paint(g, rect(hx - 1.5, ey - 2.5, hx + 1.5, ey - 0.5), fr);
    paint(g, rect(hx - 2, ey - 3.2, hx + 2, ey - 1.2), (x, y) => (((x | 0) + (y | 0)) & 1 ? C.W : C.W2), hex('#9d927b')); // tape
  }

  MK.parts = { eye, brows, mouth, shades, nerd, lensFace, blit, EM, MM };

  /* ---------- the head ---------- */
  function head(g, ch, hx, hy, F) {
    F = F || {}; const fur = ch.fur, face = ch.face, has = (a) => ch.acc.indexOf(a) >= 0, K = C.K;
    const rx = ch.hood ? 12.4 : 13, ry = ch.hood ? 10.6 : 11.4;
    if (has('hood')) paint(g, or(ell(hx, hy - 1, 16.8, 14.6), rect(hx - 15, hy + 4, hx + 15, hy + 11)), ball(ch.cloth, hx - 3, hy - 6, 20, 18), ch.cloth[0]);
    if (has('poof')) for (const s of [-1, 1]) {
      paint(g, ell(hx + s * 13.6, hy - 3, 5, 5.6), ball(RAMP.white, hx + s * 13, hy - 5, 6, 6), RAMP.white[0]);
      paint(g, ell(hx + s * 15.8, hy + 1.5, 3, 3.6), ball(RAMP.white, hx + s * 15.5, hy, 4, 4), RAMP.white[0]);
    }
    if (!has('hood')) for (const s of [-1, 1]) {
      paint(g, ell(hx + s * 13.8, hy + 1, 4.4, 4.8), ball(fur, hx + s * 13.8, hy, 5, 5), fur[0]);
      paint(g, ell(hx + s * 14, hy + 1.2, 2.3, 2.9), ball(ch.ear, hx + s * 14, hy + 1, 3, 3.4), null);
    }
    // skull
    paint(g, or(ell(hx, hy, rx, ry), ell(hx, hy + 2.6, rx - 0.8, ry - 1.7)), ball(fur, hx - 3, hy - 4, 17, 15), fur[0]);
    // face mask (heart shaped)
    const fm = or(ell(hx - 4.7, hy - 0.4, 6.7, 6.4), ell(hx + 4.7, hy - 0.4, 6.7, 6.4), ell(hx, hy + 4.7, 8.4, 5.7));
    paint(g, fm, ball(face, hx - 2, hy - 3, 15, 14, { bias: -0.02 }), face[0]);
    // headgear that sits on top of the head
    if (has('tuft')) {
      const sp = [[-4, 3], [-2, 5], [0, 6], [2, 5], [4, 3]];
      for (const [dx, l] of sp) { for (let i = 0; i < l; i++) g.set(hx + dx, hy - 10 - i, i > l - 3 ? fur[3] : fur[2]); g.set(hx + dx, hy - 10 - l, fur[0]); g.set(hx + dx - 1, hy - 10 - l + 1, fur[0]); g.set(hx + dx + 1, hy - 10 - l + 1, fur[0]); }
      for (const dx of [-3, -1, 1, 3]) g.set(hx + dx, hy - 11, fur[2]);
    }
    if (has('poof')) {
      const Wr = RAMP.white, tufts = [[-8, -9.5, 4.2, 3.6], [-3.5, -11.5, 4.6, 4], [2.2, -12, 4.8, 4.2], [7.6, -10, 4.2, 3.6], [0, -8.4, 9, 2.4]];
      for (const [dx, dy, rx2, ry2] of tufts) paint(g, ell(hx + dx, hy + dy, rx2, ry2), ball(Wr, hx + dx - 1, hy + dy - 2, rx2 + 1, ry2 + 1), Wr[0]);
      for (const [dx, dy] of [[-12, -7], [-11, -9], [-6, -14], [-1, -16], [4, -15], [9, -13], [11, -9], [12, -7]]) { g.set(hx + dx, hy + dy, Wr[3]); g.set(hx + dx + (dx < 0 ? 1 : -1), hy + dy + 1, Wr[2]); }
      g.set(hx - 6, hy - 15, Wr[0]); g.set(hx - 1, hy - 17, Wr[0]); g.set(hx + 4, hy - 16, Wr[0]); g.set(hx + 9, hy - 14, Wr[0]);
      for (const dx of [-8, -3, 3, 8]) g.set(hx + dx, hy - 12 + (Math.abs(dx) > 5 ? 2 : 0), Wr[4]);
    }

    if (has('mohawk')) {
      const P = RAMP.hotpink; paint(g, ell(hx, hy - 9.2, 5, 2), ball(P, hx - 2, hy - 11, 8, 4), P[0]);
      for (const [dx, h] of [[-3, 4], [-1.5, 6], [0, 7.5], [1.5, 6], [3, 4]]) paint(g, cap(hx + dx, hy - 9.5, hx + dx, hy - 9.5 - h, 1.5), ball(P, hx + dx - 1, hy - 9.5 - h, 3, h + 2), P[0]);
    }
    if (has('pirate')) {
      const Rd = RAMP.red, skull = or(ell(hx, hy, rx + 0.4, ry + 0.4), ell(hx, hy + 2.6, rx - 0.4, ry - 1.3));
      paint(g, poly([[hx + 10.5, hy - 7.5], [hx + 18.5, hy - 3.5], [hx + 17, hy - 9.5]]), Rd[2], Rd[0]); paint(g, poly([[hx + 10.5, hy - 6.5], [hx + 17.5, hy - 0.5], [hx + 14.5, hy - 1.5]]), Rd[1], Rd[0]);
      paint(g, both(skull, rect(0, 0, 99, hy - 4.2)), ball(Rd, hx - 4, hy - 12, 16, 10), Rd[0]);
      for (const [dx, dy] of [[-8, -7], [-4, -9], [1, -8], [5, -10], [9, -7], [-1, -6]]) { g.set(hx + dx, hy + dy, C.W); g.set(hx + dx + 1, hy + dy, C.W2); }
    }
    if (has('tophat')) {
      const Bk = RAMP.dark; paint(g, rect(hx - 6.5, hy - 17, hx + 6.5, hy - 9.5), ball(Bk, hx - 3, hy - 16, 16, 10), Bk[0]);
      paint(g, rect(hx - 6.5, hy - 12.4, hx + 6.5, hy - 10.2), RAMP.red[2]); for (let y = hy - 16; y < hy - 13; y++) g.set(hx - 4, y, Bk[4]);
      paint(g, ell(hx, hy - 9.3, 12, 2.5), ball(Bk, hx - 4, hy - 11, 14, 5), Bk[0]); for (let x = hx - 8; x < hx - 2; x++) g.set(x, hy - 10.8, Bk[3]);
    }
    if (has('cowboy')) {
      const H = RAMP.hat, W = RAMP.wood;
      paint(g, poly([[hx - 7.5, hy - 8], [hx - 6.5, hy - 16], [hx - 2.5, hy - 16.5], [hx, hy - 14.5], [hx + 2.5, hy - 16.5], [hx + 6.5, hy - 16], [hx + 7.5, hy - 8]]), ball(H, hx - 4, hy - 16, 16, 10), H[0]);
      paint(g, ell(hx, hy - 8.4, 15.8, 3.3), ball(H, hx - 6, hy - 11, 20, 7), H[0]);
      paint(g, ell(hx - 14.5, hy - 10.2, 2.4, 2), H[3], H[0]); paint(g, ell(hx + 14.5, hy - 10.2, 2.4, 2), H[2], H[0]);
      paint(g, rect(hx - 7.2, hy - 11.6, hx + 7.2, hy - 9.6), W[1]); paint(g, rect(hx - 1, hy - 11.6, hx + 1, hy - 9.6), RAMP.gold[3]);
    }
    // face details
    const ex = hx, ey = hy - 1.4;
    const wearing = has('shades') ? 'shades' : has('nerd') ? 'nerd' : null;
    const eyesK = F.eyes || (ch.calm ? 'squint' : 'open'), eyesR = F.eyesR || eyesK;
    if (!(wearing === 'shades' && F.shades !== 'down')) {
      if (!has('pirate')) eye(g, ex - 4.7, ey, eyesK, F.look, -1); eye(g, ex + 4.7, ey, eyesR, F.look, 1);
    }
    if (wearing === 'shades') shades(g, hx, ey, F); else if (wearing === 'nerd') nerd(g, hx, ey, F);
    if (has('poof')) { // bushy white eyebrows
      const lift = F.brows === 'up' ? -1 : F.brows === 'angry' ? 1 : 0;
      for (const s2 of [-1, 1]) { const bx = ex + s2 * 4.8; paint(g, ell(bx, ey - 6.6 + lift, 4.2, 1.5), ball(RAMP.white, bx - 1, ey - 8, 5, 3), RAMP.white[0]); }
    } else brows(g, ex, ey, F.brows, fur[1]);
    // muzzle: nostrils + mouth
    g.set(hx - 2, hy + 3, face[0]); g.set(hx + 1, hy + 3, face[0]);
    if (F.mouth !== 'none') mouth(g, hx, hy + 6, F.mouth || 'smile');
    // blush
    if (F.blush) for (const s of [-1, 1]) { g.set(hx + s * 9 - (s < 0 ? 0 : 1), hy + 3, C.BLUSH); g.set(hx + s * 9 - (s < 0 ? 1 : 0) - (s < 0 ? 0 : 1), hy + 3, C.BLUSH); g.set(hx + s * 8.5 - (s < 0 ? 0 : 1), hy + 4, C.BLUSH); }

    if (has('pirate')) {
      for (let t = 0; t <= 1; t += 0.04) g.set(hx - 9 + t * 21, ey - 3 - t * 5.5, RAMP.dark[1]);
      paint(g, ell(hx - 4.7, ey, 4.2, 3.7), ball(RAMP.dark, hx - 6, ey - 2, 6, 6), RAMP.dark[0]); g.set(hx - 6, ey - 1, RAMP.dark[4]); g.set(hx - 5, ey - 2, RAMP.dark[3]);
      for (let a = 0; a < 6.28; a += 0.5) g.set(hx + 15.6 + Math.cos(a) * 1.9, hy + 6.6 + Math.sin(a) * 1.9, RAMP.gold[2]); // hoop earring
      for (const [dx, dy] of [[-6, 9], [-3, 10], [0, 10], [3, 10], [6, 9], [-7, 7], [7, 7]]) g.set(hx + dx, hy + dy, fur[1]); // stubble
    }
    if (has('monocle')) {
      paint(g, sub(ell(hx + 4.8, ey, 4.7, 4.7), ell(hx + 4.8, ey, 3.5, 3.5)), RAMP.gold[2]); g.set(hx + 2.5, ey - 3, RAMP.gold[4]); g.set(hx + 3.5, ey - 3.6, RAMP.gold[4]);
      for (let i = 0; i < 10; i++) g.set(hx + 9.2 + i * 0.35, ey + 4 + i * 1.6, i % 2 ? RAMP.gold[3] : RAMP.gold[1]);
    }
    if (has('stache')) {
      const Sc = RAMP.char;
      for (const s2 of [-1, 1]) { paint(g, ell(hx + s2 * 3.2, hy + 4.6, 3.3, 1.5), ball(Sc, hx + s2 * 3 - 1, hy + 3, 4, 2.6), Sc[0]); g.set(hx + s2 * 6.8, hy + 3.6, Sc[1]); g.set(hx + s2 * 7.2, hy + 2.6, Sc[1]); g.set(hx + s2 * 6.8, hy + 1.8, Sc[2]); }
    }
    if (has('studs')) for (const [dx, dy] of [[14.8, 6.5], [15.5, 3.5], [-14.8, 6.5], [-15.5, 3.5]]) { g.set(hx + dx, hy + dy, RAMP.white[3]); g.set(hx + dx + 1, hy + dy, RAMP.white[4]); }
    if (has('helmet')) {
      const Wh = RAMP.white; paint(g, sub(ell(hx, hy - 0.5, 17.6, 15.4), ell(hx, hy - 0.5, 16, 13.8)), ball(Wh, hx - 6, hy - 10, 20, 18), Wh[0]);
      for (let a = -150; a <= -95; a += 5) { const r = a * Math.PI / 180; g.set(hx + Math.cos(r) * 13.6, hy - 0.5 + Math.sin(r) * 11.8, C.W); }
      g.set(hx - 11, hy - 4, C.W); g.set(hx - 11, hy - 3, C.W); g.set(hx - 10, hy - 6, C.W2); g.set(hx + 12, hy + 6, C.W2); g.set(hx + 11, hy + 8, C.W2);
      paint(g, cap(hx + 11, hy - 13.5, hx + 13, hy - 17, 0.9), RAMP.dark[3], RAMP.dark[0]); paint(g, ell(hx + 13, hy - 17.4, 1.6, 1.6), RAMP.red[3], RAMP.red[0]);
    }
    // hood rim + headphones sit above the face
    if (has('hood')) {
      // hood opening shadow on forehead
      for (let x = hx - 9; x <= hx + 8; x++) { const t = (x - hx) / 10; g.set(x, hy - 9 + Math.round(t * t * 2.2), ch.cloth[1]); }
    }
    if (has('phones')) {
      for (let a = -150; a <= -30; a += 4) { const r = a * Math.PI / 180, bx = hx + Math.cos(r) * 15.2, by = hy - 2 + Math.sin(r) * 13.6; g.set(bx, by, hex('#2f3a4f')); g.set(bx, by - 1, hex('#566176')); }
      for (const s of [-1, 1]) {
        const cx = hx + s * 15.3;
        paint(g, ell(cx, hy + 1, 3.3, 5), ball(RAMP.teal, cx - 1, hy - 2, 4, 6), RAMP.dark[0]);
        paint(g, ell(cx, hy + 1, 1.6, 3), RAMP.dark[2]);
      }
    }
  }
  MK.head = head;

  /* ---------- small fx (drawn on top) ---------- */
  const FXBM = {
    sweat: ['.b.', 'bbb', 'bbb', '.b.'],
    exclaim: ['rr', 'rr', 'rr', 'rr', '..', 'rr'],
    q: ['.yyy.', 'y...y', '...y.', '..y..', '.....', '..y..'],
    z: ['zzzz', '..z.', '.z..', 'zzzz'],
    note: ['..nn', '..n.', '..n.', 'nn..', 'nn..'],
    spark: ['..y..', '..y..', 'yyYyy', '..y..', '..y..'],
    spark2: ['y.y', '.Y.', 'y.y'],
    heart: ['.r.r.', 'rrrrr', '.rrr.', '..r..'],
    anger: ['r.r', '.r.', 'r.r'],
    drop: ['.b.', 'bbb', '.b.'],
    puff: ['.www.', 'wwwww', '.www.'],
  };
  const FXM = { b: C.SW, r: C.RED, y: C.STAR, Y: C.YEL2, z: hex('#bcd6ff'), n: C.W, w: C.W2 };
  function fx(g, list) {
    for (const f of list || []) { const k = f[0], x = f[1], y = f[2]; if (FXBM[k]) blit(g, x, y, FXBM[k], FXM); else if (k === 'ring') { for (let i = 0; i < 3; i++) { const rr = 3 + i * 2.5; for (let a = -50; a <= 50; a += 14) { const t = a * Math.PI / 180; g.set(x + Math.cos(t) * rr * (f[3] || 1), y + Math.sin(t) * rr, i === f[4] ? C.YEL2 : C.YEL); } } } }
  }
  MK.fx = fx;

  /* ---------- bones ---------- */
  function ik(S, H, l1, l2, outward) {
    let dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy) || 0.01; const mx = l1 + l2 - 0.02;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; H = [S[0] + dx, S[1] + dy]; }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), bx = S[0] + (dx * a) / d, by = S[1] + (dy * a) / d;
    const e1 = [bx - (dy * h) / d, by + (dx * h) / d], e2 = [bx + (dy * h) / d, by - (dx * h) / d];
    const pick = (A, B) => (Math.abs(A[0] - 28) !== Math.abs(B[0] - 28) ? (Math.abs(A[0] - 28) > Math.abs(B[0] - 28) ? A : B) : A[1] > B[1] ? A : B);
    return { E: outward == null ? pick(e1, e2) : outward ? pick(e1, e2) : (pick(e1, e2) === e1 ? e2 : e1), H };
  }
  MK.ik = ik;
})();
