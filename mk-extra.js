// Desk Dialer monkeys · climbing / falling / riding sprites, portraits, scenes and tiles.
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const MK = G.MK, { Buf, paint, shape, shade, blit, hex, RAMP, C, head } = MK;
  const { ell, rect, cap, poly, or, sub } = shape, { ball, bay } = shade;
  const A = MK.anims;

  /* small limb helper (own copy: tube-lit capsule) */
  function limb(R, x1, y1, x2, y2, r) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx * -0.5 + ny * -0.8 < 0) { nx = -nx; ny = -ny; }
    return (x, y) => { const s = ((x - x1) * nx + (y - y1) * ny) / r, t = 0.5 + s * 0.5 + (bay(x, y) - 0.5) * 0.16; return R[t < 0.26 ? 1 : t < 0.62 ? 2 : t < 0.86 ? 3 : 4]; };
  }
  function bone(g, R, a, b, r, ol) { paint(g, cap(a[0], a[1], b[0], b[1], r), limb(R, a[0], a[1], b[0], b[1], r), ol || R[0]); }
  // two-bone reach (elbow/knee bends toward `side`)
  function reach(S, H, l1, l2, side) {
    let dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy) || 0.01; const mx = l1 + l2 - 0.02; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; H = [S[0] + dx, S[1] + dy]; }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), bx = S[0] + (dx * a) / d, by = S[1] + (dy * a) / d;
    const e1 = [bx - (dy * h) / d, by + (dx * h) / d], e2 = [bx + (dy * h) / d, by - (dx * h) / d];
    return { E: (e1[0] - e2[0]) * side > 0 ? e1 : e2, H };
  }
  function hand(g, ch, p) { paint(g, ell(p[0], p[1], 3, 2.9), ball(ch.fur, p[0] - 1, p[1] - 1.4, 4, 4), ch.fur[0]); }
  function limbPair(g, ch, S, H, side, rUp, rLo, upR, loR, l1, l2) {
    const { E, H: H2 } = reach(S, H, l1, l2, side); bone(g, upR, S, E, rUp); bone(g, loR, E, H2, rLo); return H2;
  }
  function miniTorso(g, ch, cx, cy, rx, ry) {
    const cl = ch.cloth; paint(g, or(ell(cx, cy, rx, ry), rect(cx - rx + 1, cy, cx + rx - 1, cy + ry)), ball(cl, cx - 4, cy - 6, rx * 2.4, ry * 2.2, { bias: -0.04 }), cl[0]);
    if (ch.outfit === 'hawaii') { for (const [dx, dy, a] of [[-4, 0, C.PNK], [3, 3, C.YEL], [-2, 6, C.ORG], [4, -3, C.PNK]]) { g.set(cx + dx, cy + dy, a); g.set(cx + dx + 1, cy + dy, a); g.set(cx + dx, cy + dy - 1, a); } for (let i = 0; i < 4; i++) g.set(cx - 2 + i * 1.3, cy - ry + 2 + Math.abs(i - 1.5) * 1.4, RAMP.gold[3]); }
    else if (ch.outfit === 'labcoat') { paint(g, poly([[cx - 3, cy - ry + 1], [cx + 3, cy - ry + 1], [cx, cy + 4]]), RAMP.green[2], null); g.set(cx, cy - ry + 3, RAMP.red[3]); g.set(cx - 1, cy - ry + 3, RAMP.red[2]); g.set(cx + 1, cy - ry + 3, RAMP.red[2]); for (let y = cy + 4; y < cy + ry; y++) g.set(cx, y, cl[1]); }
    else if (ch.outfit === 'hoodie') { for (let y = cy - ry + 2; y < cy - 2; y++) { g.set(cx - 2, y, C.W); g.set(cx + 2, y, C.W2); } paint(g, rect(cx - 5, cy + 2, cx + 5, cy + ry - 1), cl[1], null); }
    else if (ch.outfit === 'stripes') { for (let y = cy - ry + 2; y < cy + ry; y += 4) for (let x = cx - rx + 1; x < cx + rx; x++) if (ell(cx, cy, rx - 0.6, ry - 0.6)(x + 0.5, y + 0.5) && y < cy + ry - 1) { g.set(x, y, RAMP.white[3]); g.set(x, y + 1, RAMP.white[2]); } paint(g, rect(cx - 5, cy - ry + 1, cx - 1, cy + ry - 1), RAMP.dark[2], null); paint(g, rect(cx + 1, cy - ry + 1, cx + 5, cy + ry - 1), RAMP.dark[2], null); }
    else if (ch.outfit === 'tux') { paint(g, poly([[cx - 3, cy - ry + 1], [cx + 3, cy - ry + 1], [cx, cy + 6]]), RAMP.white[3], null); g.set(cx, cy - ry + 3, RAMP.gold[3]); g.set(cx - 1, cy - ry + 3, RAMP.gold[2]); g.set(cx + 1, cy - ry + 3, RAMP.gold[2]); }
    else if (ch.outfit === 'leather') { paint(g, poly([[cx - 3, cy - ry + 1], [cx + 3, cy - ry + 1], [cx, cy + 3]]), RAMP.white[3], null); for (const [dx, dy] of [[-5, -3], [-4, 0], [4, -3], [3, 0]]) g.set(cx + dx, cy + dy, RAMP.white[4]); }
    else if (ch.outfit === 'western') { paint(g, rect(cx - 7, cy - ry + 2, cx - 2, cy + ry - 1), RAMP.wood[2], null); paint(g, rect(cx + 2, cy - ry + 2, cx + 7, cy + ry - 1), RAMP.wood[2], null); g.set(cx - 4, cy - 2, RAMP.gold[3]); g.set(cx - 5, cy - 1, RAMP.gold[3]); g.set(cx - 3, cy - 1, RAMP.gold[3]); g.set(cx - 4, cy - 1, RAMP.gold[3]); paint(g, poly([[cx - 3, cy - ry + 1], [cx + 3, cy - ry + 1], [cx, cy - ry + 6]]), RAMP.blue[3], null); }
    else if (ch.outfit === 'astro') { paint(g, rect(cx - 4, cy - 1, cx + 4, cy + 4), RAMP.dark[2], null); g.set(cx - 2, cy + 1, C.RED); g.set(cx, cy + 1, C.GRN); g.set(cx + 2, cy + 1, C.YEL); paint(g, rect(cx - 8, cy - ry + 3, cx - 5, cy - ry + 7), RAMP.red[2], null); }
  }
  function tailDown(g, ch, x, y, ph) {
    const p = [[x, y], [x + 4, y + 4], [x + 6 + ph, y + 9], [x + 3 + ph * 2, y + 13]], fn = or(...p.slice(1).map((pt, i) => cap(p[i][0], p[i][1], pt[0], pt[1], 1.8)));
    paint(g, fn, ball(ch.fur, x, y, 10, 12), ch.fur[0]);
  }

  /* ---------- climbing on a vine (vine itself is a CSS tile behind the sprite) ---------- */
  const CW = 48, CHh = 56;
  function climber(ch, f) {
    const g = new Buf(CW, CHh), by = f.by || 0; const L = f.l, R = f.r, fl = f.fl, fr = f.fr;
    tailDown(g, ch, 25, 43 + by, f.tail || 0);
    // legs behind torso, feet grip the vine
    for (const [hip, foot, side] of [[[20, 43 + by], fl, -1], [[28, 43 + by], fr, 1]]) { limbPair(g, ch, hip, foot, side, 3, 2.6, ch.fur, ch.fur, 7, 7); hand(g, ch, foot); }
    miniTorso(g, ch, 24, 35 + by, 9.4, 10);
    for (const [sh, H, side] of [[[16, 29 + by], L, -1], [[32, 29 + by], R, 1]]) { const h = limbPair(g, ch, sh, H, side, 2.8, 2.4, ch.sleeves === 'short' ? ch.cloth : ch.cloth, ch.sleeves === 'long' ? ch.cloth : ch.fur, 8.5, 8.5); hand(g, ch, h); }
    head(g, ch, 24, 15 + by + (f.hdy || 0), Object.assign({ look: [0, -1], lens: 'happy' }, f.face));
    MK.fx(g, f.fx); return g;
  }
  A.climb = { w: CW, h: CHh, fps: 6, loop: true, frames: [
    { l: [21.5, 5], r: [26.5, 22], fl: [22, 51], fr: [26, 41], by: 0, face: { mouth: 'smile' } },
    { l: [21.5, 10], r: [26.5, 15], fl: [22, 49], fr: [26, 45], by: -1, face: { mouth: 'tongue' } },
    { l: [21.5, 20], r: [26.5, 6], fl: [22, 41], fr: [26, 51], by: 0, face: { mouth: 'smile' } },
    { l: [21.5, 14], r: [26.5, 11], fl: [22, 45], fr: [26, 49], by: -1, face: { mouth: 'tongue', eyes: 'blink' } },
  ].map((f) => ({ ...f, make: (ch) => climber(ch, f) })) };
  A.fall = { w: CW, h: CHh, fps: 8, loop: true, frames: [
    { l: [6, 7], r: [42, 9], fl: [13, 52], fr: [35, 50], by: 0, face: { eyes: 'wide', mouth: 'shout', brows: 'up', shades: 'down', lens: 'wide' }, fx: [['exclaim', 40, 1]] },
    { l: [8, 5], r: [40, 6], fl: [15, 51], fr: [33, 52], by: -1, face: { eyes: 'wide', mouth: 'o', brows: 'up', shades: 'down', lens: 'wide' }, fx: [['exclaim', 5, 2]] },
  ].map((f) => ({ ...f, make: (ch) => climber(ch, f) })) };
  function dizzy(ch, k) {
    const g = new Buf(CW, CHh), a = (k / 4) * Math.PI * 2;
    miniTorso(g, ch, 24, 49, 10, 9);
    for (const [S, H, side] of [[[16, 44], [9, 54], -1], [[32, 44], [39, 54], 1]]) { const h = limbPair(g, ch, S, H, side, 2.8, 2.4, ch.cloth, ch.sleeves === 'long' ? ch.cloth : ch.fur, 8, 8); hand(g, ch, h); }
    head(g, ch, 24, 35, { eyes: 'dizzy', mouth: k % 2 ? 'wobble' : 'o', brows: 'worry', lens: 'dizzy', shades: ch.acc.indexOf('shades') >= 0 ? 'down' : undefined });
    const st = [];
    for (let i = 0; i < 3; i++) { const t = a + (i * Math.PI * 2) / 3; st.push(['spark2', Math.round(24 + Math.cos(t) * 15) - 1, Math.round(16 + Math.sin(t) * 3.2)]); }
    MK.fx(g, st); return g;
  }
  A.dizzy = { w: CW, h: CHh, fps: 6, loop: true, frames: [0, 1, 2, 3].map((k) => ({ make: (ch) => dizzy(ch, k) })) };

  /* ---------- scooter rider (side view body, front-facing head) ---------- */
  const RW = 72, RH = 56;
  function wheel(g, cx, cy, ph) {
    const D = RAMP.dark;
    paint(g, ell(cx, cy, 8.4, 8.4), ball(D, cx - 2, cy - 3, 9, 9), D[0]);
    paint(g, ell(cx, cy, 5.2, 5.2), RAMP.white[3], RAMP.white[1]);
    for (let i = 0; i < 6; i++) { const t = ph + (i * Math.PI) / 3; const x2 = cx + Math.cos(t) * 4.6, y2 = cy + Math.sin(t) * 4.6; for (let k = 1; k <= 4; k++) g.set(cx + (x2 - cx) * k / 4.6, cy + (y2 - cy) * k / 4.6, i % 2 ? RAMP.white[1] : RAMP.white[2]); }
    paint(g, ell(cx, cy, 1.3, 1.3), RAMP.gold[2], RAMP.gold[0]);
  }
  function rider(ch, f) {
    const g = new Buf(RW, RH), R = RAMP.red, S = RAMP.white, ph = f.ph || 0, by = f.by || 0;
    // scarf streaming back
    const sc = [[34, 28 + by], [28, 29 + by + f.sw], [22, 28 + by - f.sw], [16, 30 + by + f.sw]];
    paint(g, or(...sc.slice(1).map((p, i) => cap(sc[i][0], sc[i][1], p[0], p[1], 2))), ball(RAMP.red, 30, 26, 14, 6), RAMP.red[0]);
    wheel(g, 14, 46, ph); wheel(g, 58, 46, ph);
    // deck + rear body + front column
    paint(g, poly([[16, 41], [54, 41], [57, 46], [18, 46]]), ball(R, 30, 40, 40, 8), R[0]);
    paint(g, or(ell(21, 40, 8, 4), rect(16, 38, 26, 42)), ball(R, 18, 36, 14, 8), R[0]);
    paint(g, cap(57, 44, 53, 22, 1.8), limb(S, 57, 44, 53, 22, 1.8), S[0]);
    paint(g, cap(48, 21.5, 59, 21.5, 1.3), S[3], S[0]); paint(g, ell(59.5, 21.5, 1.8, 1.8), RAMP.gold[3], RAMP.gold[0]);
    // exhaust puffs
    for (const [x, y] of f.puff || []) MK.fx(g, [['puff', x, y]]);
    // rider: leg, torso, arm, head
    const knee = [38, 38 + by];
    paint(g, or(cap(30, 36 + by, knee[0], knee[1], 3), cap(knee[0], knee[1], 43, 40, 2.5)), limb(ch.fur, 30, 36, 43, 40, 3), ch.fur[0]);
    paint(g, ell(44, 40.5, 3.6, 2.3), RAMP.dark[3], RAMP.dark[0]);
    paint(g, or(ell(32, 34 + by, 6.5, 6), ell(36, 29 + by, 7, 7.5)), ball(ch.cloth, 30, 22, 16, 18), ch.cloth[0]);
    for (const [x, y, c] of [[31, 33, C.PNK], [35, 30, C.YEL], [33, 36, C.ORG]]) if (ch.outfit === 'hawaii') { g.set(x, y + by, c); g.set(x + 1, y + by, c); }
    head(g, ch, 41, 17 + by, { eyes: 'open', look: [1, 0], mouth: f.mouth || 'grin', lens: 'happy', brows: f.brows, glint: f.glint });
    const S2 = [40, 31 + by], { E, H } = reach(S2, [55, 22.5], 9, 9, 1); bone(g, ch.cloth, S2, E, 2.8); bone(g, ch.sleeves === 'long' ? ch.cloth : ch.fur, E, H, 2.4); hand(g, ch, H);
    MK.fx(g, f.fx); return g;
  }
  A.ride = { w: RW, h: RH, fps: 10, loop: true, frames: [0, 1, 2, 3].map((k) => { const f = { ph: (k * Math.PI) / 12, sw: k % 2 ? 1.5 : -1.5, by: k % 2 ? -0.5 : 0, glint: [-1.5, 0.5, 2.5, 4][k], puff: [[[3, 41 - k * 0], [8, 38 + (k % 2)]], [[1, 39], [6, 36]], [[2, 42], [7, 40]], [[4, 38], [0, 40]]][k], mouth: k === 2 ? 'laugh' : 'grin' }; return { make: (ch) => rider(ch, f) }; }) };
  // idle ride (parked): no streaming scarf, wheels still
  A.rideIdle = { w: RW, h: RH, fps: 2, loop: true, frames: [0, 1].map((k) => ({ make: (ch) => rider(ch, { ph: 0, sw: 0.4, by: k ? -0.5 : 0, glint: k ? 3 : -1.5, mouth: 'smile' }) })) };

  /* ---------- portraits (logo / avatar): expression strip ---------- */
  const FACES = [
    { mouth: 'smile', lens: 'happy', glint: -1.5 }, { mouth: 'grin', lens: 'happy', glint: 2 }, { mouth: 'o', eyes: 'wide', brows: 'up', shades: 'down', lens: 'wide' },
    { mouth: 'kiss', lens: 'heart', eyes: 'heart' }, { mouth: 'tongue', lens: 'happy', eyes: 'happy', glint: 3.5 }, { mouth: 'laugh', lens: 'happy', eyes: 'happy', brows: 'up' },
    { mouth: 'smirk', brows: 'one', eyes: 'smug', lens: 'happy', glint: 0 }, { mouth: 'wobble', eyes: 'dizzy', lens: 'dizzy', brows: 'worry' },
  ];
  A.face = { w: 40, h: 36, fps: 0, loop: false, frames: FACES.map((F) => ({ make: (ch) => { const g = new Buf(40, 36); head(g, ch, 20, 19, F); return g; } })) };
  A.faceBlink = { w: 40, h: 36, fps: 1, loop: true, frames: [FACES[0], FACES[0], FACES[0], Object.assign({}, FACES[1], { eyes: 'blink' })].map((F) => ({ make: (ch) => { const g = new Buf(40, 36); head(g, ch, 20, 19, F); return g; } })) };

  /* ---------- tiny props as sprites ---------- */
  A.banana = { w: 18, h: 16, fps: 3, loop: true, frames: [0, 1].map((k) => ({ make: () => { const g = new Buf(18, 16); MK.props.banana(g, [3, 13 - k], [14, 4 - k], 0); if (k) MK.fx(g, [['spark2', 14, 11]]); return g; } })) };

  /* ---------- scenes (backdrops) ---------- */
  const SKY = {
    jungle: ['#1d2a63', '#2d3c82', '#4b3f98', '#7a4fc2', '#b4559a', '#e0707a', '#f5973f'],
    sunset: ['#3a1850', '#7a2860', '#c0405a', '#e8645a', '#f58a4a', '#ffb067', '#ffd68a'],
    ocean: ['#0a2a5a', '#124a8a', '#1f6fb5', '#3a92d0', '#6cb8e6', '#a6dcf2', '#d4f2fa'],
    grape: ['#1a1040', '#2f1c6e', '#4f2e9a', '#7a47c9', '#a672e0', '#cfa0f0', '#f0c8f8'],
    bubblegum: ['#4a1d5e', '#8a2c7a', '#c4408f', '#e8639f', '#ff8fb8', '#ffb8d0', '#ffd9e6'],
    banana: ['#3a2a08', '#7a5410', '#b57d12', '#e0a41a', '#f5c542', '#ffdf7a', '#fff0b3'],
    graphite: ['#0d1020', '#1c2236', '#2e374e', '#47526e', '#6a7794', '#98a3bd', '#c4cde0'],
  };
  function scene(kind, w, h, pal) {
    const g = new Buf(w, h), T = (x, y) => (kind === 'picnic' ? 0 : 0);
    const bandsDusk = (SKY[pal] || SKY.jungle).map(hex), bandsDay = ['#4a9be8', '#62adf0', '#7bbdf5', '#9ccbf8', '#b9dafa', '#d6e9fb'].map(hex);
    const bands = kind === 'picnic' ? bandsDay : bandsDusk, hor = Math.round(h * 0.62);
    for (let y = 0; y < hor; y++) for (let x = 0; x < w; x++) { const t = (y / hor) * (bands.length - 1), i = Math.floor(t), fr = t - i; g.set(x, y, bay(x, y) < fr ? bands[Math.min(i + 1, bands.length - 1)] : bands[i]); }
    if (kind !== 'picnic') { for (let i = 0; i < 26; i++) { const x = (i * 47 + 13) % w, y = (i * 29 + 5) % Math.round(hor * 0.5); g.set(x, y, i % 3 ? hex('#cfe0ff') : C.STAR); } paint(g, ell(w * 0.78, hor - 2, 11, 11), ball(RAMP.banana, w * 0.78 - 3, hor - 8, 14, 14), null); }
    else { for (const [cx, cy, s] of [[w * 0.2, 10, 1], [w * 0.62, 7, 0.8], [w * 0.88, 14, 0.9]]) paint(g, or(ell(cx, cy, 9 * s, 3.4 * s), ell(cx - 5 * s, cy + 1, 5 * s, 3 * s), ell(cx + 5 * s, cy + 1, 6 * s, 3 * s)), ball(RAMP.white, cx - 3, cy - 3, 14 * s, 8 * s), null); }
    // far hills
    for (let x = 0; x < w; x++) { const y0 = hor - 6 - Math.round(Math.sin(x / 11) * 3 + Math.sin(x / 5.3) * 1.5); for (let y = y0; y < h; y++) g.set(x, y, kind === 'picnic' ? RAMP.green[3] : RAMP.leaf[1]); }
    // trees / palms
    const trees = kind === 'picnic' ? [[0.1, 9], [0.9, 8]] : [[0.06, 16], [0.2, 11], [0.93, 15], [0.8, 10]];
    for (const [fx, th] of trees) { const x = Math.round(fx * w), top = hor - th; for (let y = top; y < hor + 4; y++) { g.set(x, y, RAMP.wood[1]); g.set(x + 1, y, RAMP.wood[2]); }
      for (const [dx, dy, rx, ry] of [[-5, 1, 5, 2], [5, 1, 5, 2], [0, -2, 4, 3], [-3, 3, 4, 1.6], [3, 3, 4, 1.6]]) paint(g, ell(x + dx, top + dy, rx, ry), ball(kind === 'picnic' ? RAMP.green : RAMP.leaf, x + dx - 1, top + dy - 2, rx + 1, ry + 2), (kind === 'picnic' ? RAMP.green : RAMP.leaf)[0]); }
    // ground
    const gy = hor + 2; for (let y = gy; y < h; y++) for (let x = 0; x < w; x++) {
      if (kind === 'picnic') { const sq = Math.floor((x + (y - gy) * 0.0) / 6) + Math.floor((y - gy) / 4); g.set(x, y, sq & 1 ? hex('#f1f4fa') : hex('#d1344a')); if (y === gy) g.set(x, y, hex('#8f1d2c')); }
      else g.set(x, y, bay(x, y) < 0.35 ? RAMP.leaf[1] : RAMP.leaf[0]);
    }
    if (kind !== 'picnic') for (let x = 0; x < w; x += 4) { g.set(x, gy - 1, RAMP.leaf[3]); g.set(x + 1, gy - 2 + (x % 3 ? 0 : 1), RAMP.leaf[2]); }
    return g;
  }
  MK.scene = scene; MK.palettes = Object.keys(SKY);

  /* ---------- vine tile (12 x 24, repeats vertically) ---------- */
  function vineTile() {
    const g = new Buf(12, 24), L = RAMP.leaf;
    for (let y = 0; y < 24; y++) { const x = 5 + Math.round(Math.sin((y / 24) * Math.PI * 2) * 1.2); g.set(x, y, L[0]); g.set(x + 1, y, L[2]); g.set(x + 2, y, L[0]); g.set(x + 1, y, y % 3 ? L[3] : L[2]); }
    for (const [y, side] of [[5, -1], [17, 1]]) { const x = side < 0 ? 1 : 8; paint(g, ell(x + 2, y, 3.6, 1.9), ball(L, x + 1, y - 1, 4, 3), L[0]); for (let k = 0; k < 3; k++) g.set(x + 1 + k, y, L[4]); }
    return g;
  }
  MK.vineTile = vineTile;
})();
