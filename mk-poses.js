// Desk Dialer monkeys · bodies, outfits, props and every animation.
// Poses are small data tables (hand targets, face, props, fx per frame); the engine does the painting.
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const MK = G.MK, { Buf, paint, shape, shade, blit, hex, RAMP, C, ik, head } = MK;
  RAMP.pink = RAMP.pink || MK.RAMP.pink;
  const { ell, rect, cap, poly, or, sub, both } = shape, { ball, bay } = shade;
  const R5 = (a) => a.map(hex);

  /* ---------- limb shader ---------- */
  function limb(R, x1, y1, x2, y2, r) {
    let dx = x2 - x1, dy = y2 - y1; const l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l;
    if (nx * -0.5 + ny * -0.8 < 0) { nx = -nx; ny = -ny; }
    return (x, y) => { const s = ((x - x1) * nx + (y - y1) * ny) / r, t = 0.5 + s * 0.5 + (bay(x, y) - 0.5) * 0.16; return R[t < 0.26 ? 1 : t < 0.62 ? 2 : t < 0.86 ? 3 : 4]; };
  }

  /* ---------- tail ---------- */
  function tail(g, ch, by, ph) {
    const fur = ch.fur, p = [[43, 54 + by], [48, 51 + by], [51.5, 46 + by], [50.5 + ph, 41 + by], [47 + ph * 2, 37.5 + by + ph]];
    const fn = or(...p.slice(1).map((pt, i) => cap(p[i][0], p[i][1], pt[0], pt[1], 2.1)));
    paint(g, fn, (x, y) => { const t = (x - 42) / 12 + (bay(x, y) - 0.5) * 0.3; return fur[t < 0.35 ? 3 : t < 0.7 ? 2 : 1]; }, fur[0]);
    paint(g, ell(p[4][0], p[4][1], 2.3, 2.3), ch.face[2], fur[0]); // pale tip
  }

  /* ---------- torso + outfits ---------- */
  function torso(g, ch, by) {
    const cl = ch.cloth, fur = ch.fur;
    const body = or(ell(28, 47 + by, 15.6, 12.8), rect(12.4, 47 + by, 43.6, 60));
    const tm = paint(g, body, ball(cl, 21, 36 + by, 24, 22, { bias: -0.05 }), cl[0]);
    const clip = tm, P = (fn, c, ol) => paint(g, fn, c, ol, clip);
    if (ch.outfit === 'hawaii') {
      P(poly([[24, 33.5 + by], [32, 33.5 + by], [28, 42.5 + by]]), ball(ch.face, 26, 35 + by, 8, 8), ch.face[1]);
      P(poly([[19.5, 34 + by], [25.8, 32.8 + by], [28.4, 42 + by], [22.6, 38.4 + by]]), cl[4], cl[0]);
      P(poly([[36.5, 34 + by], [30.2, 32.8 + by], [27.6, 42 + by], [33.4, 38.4 + by]]), cl[3], cl[0]);
      for (const [fx, fy, a, b] of [[17, 45, C.PNK, C.YEL], [35.5, 44, C.YEL, C.PNK], [23, 52, C.PNK, C.YEL], [33, 52, C.ORG, C.YEL2], [40, 50, C.PNK, C.YEL], [28, 48, C.YEL, C.ORG]]) {
        const y = fy + by; for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (clip[Math.floor(y + dy) * g.w + Math.floor(fx + dx)]) g.set(fx + dx, y + dy, a); g.set(fx, y, b);
      }
      for (const [fx, fy] of [[20, 49], [37, 47], [26, 44], [30, 55]]) { const y = fy + by; if (clip[Math.floor(y) * g.w + fx]) { g.set(fx, y, RAMP.green[3]); g.set(fx + 1, y + 1, RAMP.green[2]); } }
      for (const [x, y] of [[25, 35], [25.5, 37], [26.5, 39], [27.5, 40.5], [30, 35], [29.5, 37], [29, 39], [28.5, 40.5]]) g.set(x, y + by, RAMP.gold[x < 28 ? 3 : 2]);
      paint(g, ell(28, 43.4 + by, 1.8, 1.8), RAMP.banana[3], RAMP.gold[0]);
    } else if (ch.outfit === 'labcoat') {
      P(poly([[22.5, 33.5 + by], [33.5, 33.5 + by], [28, 49 + by]]), ball(RAMP.green, 24, 36 + by, 10, 14), RAMP.green[0]);
      P(poly([[19, 34 + by], [25, 33 + by], [27.4, 49 + by], [21, 41 + by]]), cl[3], cl[1]);
      P(poly([[37, 34 + by], [31, 33 + by], [28.6, 49 + by], [35, 41 + by]]), cl[3], cl[1]);
      for (let y = 49; y < 60; y++) g.set(28, y + by, cl[1]);
      P(rect(16.5, 43 + by, 24, 51 + by), cl[3], cl[1]);
      for (const [x, y, c] of [[18, 41, C.RED], [18, 42, C.RED], [20, 40, hex('#3a80e0')], [20, 41, hex('#3a80e0')], [20, 42, hex('#3a80e0')], [22, 41, hex('#35a352')], [22, 42, hex('#35a352')]]) g.set(x, y + by, c);
      for (const [x, y] of [[18, 46], [19, 46], [20, 46], [21, 46]]) g.set(x, y + by, cl[2]);
      // bow tie
      paint(g, poly([[28, 36 + by], [22.2, 33.4 + by], [22.2, 38.8 + by]]), RAMP.red[3], RAMP.red[0]);
      paint(g, poly([[28, 36 + by], [33.8, 33.4 + by], [33.8, 38.8 + by]]), RAMP.red[2], RAMP.red[0]);
      paint(g, rect(26.5, 34.4 + by, 29.5, 37.6 + by), RAMP.red[1], RAMP.red[0]);
    } else if (ch.outfit === 'hoodie') {
      P(ell(28, 34 + by, 8.6, 3.2), cl[1], cl[0]);
      P(poly([[18.5, 46.5 + by], [37.5, 46.5 + by], [41, 60], [15, 60]]), ball(cl, 24, 44 + by, 22, 14, { bias: -0.2 }), cl[0]);
      for (let y = 35; y < 43; y++) { g.set(25, y + by, C.W); g.set(31, y + by - (y > 40 ? 1 : 0), C.W2); }
      g.set(25, 43 + by, RAMP.gold[3]); g.set(31, 42 + by, RAMP.gold[3]); g.set(25, 44 + by, RAMP.gold[2]); g.set(31, 43 + by, RAMP.gold[2]);
      blit(g, 25, 49 + by, ['...y...', '..yyy..', '.yyYyy.', '..y.y..'].map((s) => s), { y: C.STAR, Y: C.YEL2 });
    } else if (ch.outfit === 'stripes') {
      P((x, y) => Math.floor((y - by) / 3) % 2 === 0, ball(RAMP.white, 22, 36 + by, 24, 22), null);
      P(poly([[24, 33.5 + by], [32, 33.5 + by], [28, 41 + by]]), ball(ch.face, 26, 35 + by, 8, 8), ch.face[1]);
      P(poly([[14.5, 35 + by], [24.5, 33.6 + by], [23, 41 + by], [25.5, 60], [13, 60]]), ball(RAMP.dark, 18, 38 + by, 14, 20), RAMP.dark[0]);
      P(poly([[41.5, 35 + by], [31.5, 33.6 + by], [33, 41 + by], [30.5, 60], [43, 60]]), ball(RAMP.dark, 36, 38 + by, 14, 20), RAMP.dark[0]);
      for (const [x, y] of [[22.5, 44], [33.5, 44], [22.8, 48.5], [33.2, 48.5]]) { g.set(x, y + by, RAMP.gold[3]); g.set(x + 1, y + by, RAMP.gold[2]); }
      for (const [x, y] of [[26, 34.6], [27, 36], [28, 37.4], [29, 36], [30, 34.6]]) g.set(x, y + by, RAMP.gold[3]); // lace-up collar
    } else if (ch.outfit === 'tux') {
      P(poly([[23, 33.5 + by], [33, 33.5 + by], [28, 49 + by]]), ball(RAMP.white, 25, 36 + by, 10, 14), RAMP.white[1]);
      P(poly([[18.5, 34 + by], [25, 33 + by], [27.4, 49 + by], [21, 41 + by]]), cl[3], cl[0]);
      P(poly([[37.5, 34 + by], [31, 33 + by], [28.6, 49 + by], [35, 41 + by]]), cl[3], cl[0]);
      for (let y = 36; y < 49; y += 3) g.set(28, y + by, RAMP.white[1]);
      P(poly([[16.5, 43 + by], [21.5, 43 + by], [19, 40.6 + by]]), RAMP.pink[3], RAMP.pink[1]);
      paint(g, poly([[28, 36 + by], [22.4, 33.6 + by], [22.4, 38.6 + by]]), RAMP.gold[3], RAMP.gold[0]);
      paint(g, poly([[28, 36 + by], [33.6, 33.6 + by], [33.6, 38.6 + by]]), RAMP.gold[2], RAMP.gold[0]);
      paint(g, rect(26.6, 34.6 + by, 29.4, 37.6 + by), RAMP.gold[1], RAMP.gold[0]);
    } else if (ch.outfit === 'leather') {
      P(poly([[23.5, 33.5 + by], [32.5, 33.5 + by], [28, 45 + by]]), ball(RAMP.white, 25, 36 + by, 10, 14), RAMP.white[1]);
      blit(g, 26, 38 + by, ['..p..', 'ppppp', '.ppp.', 'pp.pp'], { p: C.PNK });
      P(poly([[16, 34 + by], [25, 33 + by], [26.4, 46 + by], [18.5, 47 + by]]), cl[3], cl[0]);
      P(poly([[40, 34 + by], [31, 33 + by], [29.6, 46 + by], [37.5, 47 + by]]), cl[3], cl[0]);
      for (const [x, y] of [[18, 36], [20, 39], [22, 42], [38, 36], [36, 39], [34, 42], [16.5, 37], [39.5, 37]]) { g.set(x, y + by, RAMP.white[3]); g.set(x + 1, y + by, RAMP.white[4]); }
      for (let x = 21; x <= 35; x += 2.5) { g.set(x, 33 + by, RAMP.white[3]); g.set(x, 32 + by, RAMP.white[4]); } // spiked collar
      for (let i = 0; i < 10; i++) g.set(28 + (i % 2) * 0.01, 46 + i + by, cl[4]);
    } else if (ch.outfit === 'western') {
      P((x, y) => Math.floor(x) % 5 === 0 || Math.floor(y - by) % 5 === 0, cl[1], null);
      P(poly([[14.5, 36 + by], [24, 34 + by], [25.5, 60], [13, 60]]), ball(RAMP.wood, 17, 40 + by, 16, 22), RAMP.wood[0]);
      P(poly([[41.5, 36 + by], [32, 34 + by], [30.5, 60], [43, 60]]), ball(RAMP.wood, 38, 40 + by, 16, 22), RAMP.wood[0]);
      blit(g, 17, 40 + by, ['..y..', 'yyyyy', '.yyy.', 'yy.yy'], { y: RAMP.gold[3] }); g.set(19, 42 + by, RAMP.gold[1]);
      paint(g, poly([[22.5, 33.2 + by], [33.5, 33.2 + by], [28, 41.5 + by]]), ball(RAMP.blue, 25, 35 + by, 10, 10), RAMP.blue[0]);
      for (const [x, y] of [[25, 35], [28, 38], [30, 35], [27, 34.4]]) g.set(x, y + by, C.W);
    } else if (ch.outfit === 'astro') {
      P(rect(19, 44 + by, 37, 52 + by), ball(RAMP.dark, 22, 44 + by, 20, 10), RAMP.dark[0]);
      for (const [x, c] of [[21, C.RED], [24, C.GRN], [27, C.YEL], [30, hex('#3a80e0')], [33, C.PNK]]) { g.set(x, 46 + by, c); g.set(x + 1, 46 + by, c); g.set(x, 49 + by, c); }
      for (let x = 20; x < 36; x += 2) g.set(x, 51 + by, RAMP.dark[4]);
      P(rect(15, 37 + by, 22, 42 + by), RAMP.red[2], RAMP.white[1]); P(rect(15, 40 + by, 22, 42 + by), RAMP.blue[2], null);
      P(ell(28, 34 + by, 12.5, 3.4), ball(RAMP.white, 20, 32 + by, 18, 8), RAMP.white[1]); for (let x = 17; x < 40; x += 3) g.set(x, 35.4 + by, RAMP.white[1]);
    }
  }

  /* ---------- arms ---------- */
  function arm(g, ch, side, S, Ht, o) {
    o = o || {}; const { E, H } = ik(S, Ht, 9.8, 9.8, null);
    const slv = ch.sleeves === 'long' ? ch.cloth : ch.cloth, forearm = ch.sleeves === 'long' ? ch.cloth : ch.fur, fur = ch.fur;
    paint(g, cap(S[0], S[1], E[0], E[1], 3), limb(slv, S[0], S[1], E[0], E[1], 3), slv[0]);
    paint(g, cap(E[0], E[1], H[0], H[1], 2.5), limb(forearm, E[0], E[1], H[0], H[1], 2.5), forearm[0]);
    if (ch.sleeves === 'long') { // cuff
      const dx = H[0] - E[0], dy = H[1] - E[1], l = Math.hypot(dx, dy) || 1, cx = H[0] - (dx / l) * 2.6, cy = H[1] - (dy / l) * 2.6;
      paint(g, ell(cx, cy, 3, 3), ch.cloth[ch.outfit === 'labcoat' ? 2 : 3], ch.cloth[0]);
    }
    if (!o.noHand) {
      paint(g, ell(H[0], H[1], 3.1, 3), ball(fur, H[0] - 1, H[1] - 1.4, 4, 4), fur[0]);
      g.set(H[0] - 1, H[1] - 0.5, fur[0]); g.set(H[0] + 1, H[1] - 0.5, fur[0]); // finger gaps
    }
    return { E, H };
  }

  /* ---------- props ---------- */
  function handset(g, a, b, bow) {
    const mx = (a[0] + b[0]) / 2 + (bow == null ? -1.6 : bow), my = (a[1] + b[1]) / 2, D = RAMP.dark, fn = or(cap(a[0], a[1], mx, my, 1.7), cap(mx, my, b[0], b[1], 1.7));
    paint(g, fn, limb(D, a[0], a[1], b[0], b[1], 1.7), D[0]);
    paint(g, ell(a[0], a[1], 3.2, 3.5), ball(D, a[0] - 1, a[1] - 1.5, 4, 4.4), D[0]);
    paint(g, ell(b[0], b[1], 2.9, 3.0), ball(D, b[0] - 1, b[1] - 1.5, 3.5, 3.8), D[0]);
    g.set(a[0] - 1, a[1] - 1, D[4]); g.set(a[0], a[1] - 2, D[3]);
  }
  const KEYS = [[30, 42], [34, 42], [38, 42], [30, 44], [34, 44], [38, 44], [30, 46], [34, 46], [38, 46]];
  function desk(g, ch, F) {
    const W = RAMP.wood, D = RAMP.dark;
    // wooden desk front + top edge
    paint(g, rect(0, 50.5, 56, 60), (x, y) => (y < 51.5 ? W[4] : y < 53 ? W[3] : y < 55 ? W[2] : W[1]), null);
    for (let x = 0; x < 56; x++) { g.set(x, 50, W[0]); g.set(x, 53, bay(x, 53) > 0.5 ? W[2] : W[3]); }
    for (let x = 6; x < 56; x += 17) for (let y = 54; y < 56; y++) g.set(x, y, W[0]);
    if (F.desk === 'bare') return;
    if (F.box) return lunchbox(g, F.box);
    // desk phone
    const base = poly([[19, 40.5], [43, 40.5], [46, 50.6], [16, 50.6]]);
    paint(g, base, (x, y) => (y < 47.5 ? D[3] : y < 49 ? D[2] : D[1]), D[0]);
    for (let x = 17; x < 45; x++) g.set(x, 47.5, D[4]);
    paint(g, rect(20.5, 41.8, 27.8, 46), F.lcd === 'red' ? hex('#ff6b5e') : C.LCD, D[0]);
    for (let x = 21; x < 27; x += 1) if ((x * 3) & 1) g.set(x, 43, F.lcd === 'red' ? hex('#a0261c') : C.LCD2);
    g.set(22, 45, F.lcd === 'red' ? hex('#a0261c') : C.LCD2); g.set(23, 45, F.lcd === 'red' ? hex('#a0261c') : C.LCD2);
    KEYS.forEach(([kx, ky], i) => { const on = F.press === i, lit = F.keys; g.set(kx, ky, on ? C.YEL2 : lit ? C.GRN : D[4]); g.set(kx + 1, ky, on ? C.YEL : lit ? RAMP.green[2] : D[4]); g.set(kx + 2, ky, on ? C.YEL2 : lit ? C.GRN : D[4]); });
    for (let i = 0; i < 4; i++) g.set(24 + i * 3, 49, D[1]);
    // cradle + resting handset
    paint(g, poly([[11.5, 38.5], [18, 38.5], [18, 50.6], [11.5, 50.6]]), D[2], D[0]);
    if (F.handset === 'rest') handset(g, [13.6, 39.4], [15.8, 49], -1.2);
    else { g.set(13, 38, D[0]); g.set(16, 38, D[0]); g.set(13, 39, D[3]); g.set(16, 39, D[3]); }
  }
  function lunchbox(g, b) { // red tin lunch box; b.open 0..1 swings the lid up behind the body
    const R = RAMP.red, S = RAMP.white, o = b.open || 0, x0 = 15, x1 = 41, yb = 50.6, yt = 44.6;
    if (o > 0.04) { // open lid, seen from the inside
      const top = yt - 1 - 7 * o;
      paint(g, rect(x0 + 1, top, x1 - 1, yt + 0.6), (x, y) => (y < top + 2 ? hex('#e07a70') : hex('#b84a58')), R[0]);
      for (let x = x0 + 4; x < x1 - 4; x += 4) g.set(x, top + 3, hex('#8f1d2c'));
    } else { // closed lid + handle
      paint(g, rect(x0, yt - 3.4, x1, yt + 0.6), ball(R, 22, yt - 6, 28, 8, { bias: -0.05 }), R[0]);
      paint(g, or(cap(24, yt - 5.6, 24, yt - 3.6, 1.1), cap(32, yt - 5.6, 32, yt - 3.6, 1.1), cap(24, yt - 5.8, 32, yt - 5.8, 1.1)), S[2], S[0]);
    }
    if (b.inside && o > 0.2) paint(g, rect(x0 + 2, yt - 0.4, x1 - 2, yt + 2), (x, y) => (y < yt + 0.6 ? hex('#fff3c4') : hex('#f1d98e')), null);
    paint(g, rect(x0, yt + 0.6, x1, yb), ball(R, 22, yt - 2, 30, 12, { bias: -0.02 }), R[0]);
    for (let x = x0 + 1; x < x1 - 1; x++) g.set(x, yt + 1, S[2]);
    paint(g, rect(x0 + 3, yt + 1.6, x0 + 6, yt + 4), S[3], S[0]); paint(g, rect(x1 - 6, yt + 1.6, x1 - 3, yt + 4), S[3], S[0]);
    for (let x = x0 + 8; x < x1 - 8; x += 3) g.set(x, yt + 3.2, R[1]);
  }
  function banana(g, H, T, st) { // st: 0 whole, 1 peeled, 2 one bite, 3 stub, 4 peel only
    const B = RAMP.banana, FR = R5(['#8a7a4a', '#e8dcae', '#fff0bf', '#fff9dc', '#ffffff']), dx = T[0] - H[0], dy = T[1] - H[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const at = (t, off) => [H[0] + dx * t + nx * (off || 0), H[1] + dy * t + ny * (off || 0)];
    const body = (t0, t1, r, R) => { const p = [at(t0, 0), at((t0 + t1) / 2, 0.9), at(t1, 0)]; paint(g, or(cap(p[0][0], p[0][1], p[1][0], p[1][1], r), cap(p[1][0], p[1][1], p[2][0], p[2][1], r)), limb(R, p[0][0], p[0][1], p[2][0], p[2][1], r), R[0]); };
    const strips = (t) => { const m = at(t, 0); for (const [sx, sy, w] of [[-4.2, 5.2, 1.3], [0.2, 6.4, 1.3], [4.2, 5, 1.3]]) paint(g, cap(m[0], m[1], m[0] + sx, m[1] + sy, w), B[3], B[0]); g.set(m[0] - 4, m[1] + 6, B[0]); };
    if (st === 0) { body(0, 1, 2.6, B); const tp = at(1, 0), hp = at(0, 0); g.set(tp[0], tp[1], hex('#5a3a10')); g.set(hp[0] - ux, hp[1] - uy, hex('#5a3a10')); g.set(hp[0] - 2 * ux, hp[1] - 2 * uy, hex('#5a3a10')); return; }
    if (st === 4) { strips(0.25); const m = at(0.25, 0); paint(g, cap(m[0], m[1], m[0] - ux * 2, m[1] - uy * 2, 1.3), B[2], B[0]); return; }
    strips(0.3); body(0.3, st === 1 ? 1 : st === 2 ? 0.74 : 0.5, 2.5, FR);
    if (st === 2) { const e = at(0.74, 0); g.set(e[0] + nx * 1.5, e[1] + ny * 1.5, 0); g.set(e[0] - nx * 1.5, e[1] - ny * 1.5, 0); }
  }
  function bottle(g, a, b, level) { // water bottle from base a to cap b
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, B = RAMP.blue, lv = level == null ? 0.7 : level;
    const neck = [a[0] + ux * l * 0.74, a[1] + uy * l * 0.74];
    paint(g, cap(a[0], a[1], neck[0], neck[1], 3.7), (x, y) => { const t = ((x - a[0]) * ux + (y - a[1]) * uy) / l, s = (x - a[0]) * -uy + (y - a[1]) * ux; return t < lv * 0.74 ? (s < -0.8 ? B[4] : s < 0.9 ? B[3] : B[2]) : (s < -0.9 ? C.W : hex('#cfe6ff')); }, RAMP.dark[1]);
    paint(g, cap(neck[0], neck[1], b[0] - ux * 1.5, b[1] - uy * 1.5, 1.7), hex('#cfe3f7'), RAMP.dark[1]);
    paint(g, cap(b[0] - ux * 1.8, b[1] - uy * 1.8, b[0], b[1], 1.9), RAMP.red[3], RAMP.red[0]);
  }
  MK.props = { handset, banana, bottle };

  /* ---------- the bust ---------- */
  const S_L = [14.6, 36.4], S_R = [41.4, 36.4];
  function bust(ch, F) {
    F = F || {}; const g = new Buf(56, 56), by = F.by || 0, hx = 28 + (F.hdx || 0), hy = 19 + by + (F.hdy || 0);
    tail(g, ch, by, F.tail || 0); torso(g, ch, by);
    if (F.back) { arm(g, ch, -1, [S_L[0], S_L[1] + by], F.lh); arm(g, ch, 1, [S_R[0], S_R[1] + by], F.rh); } // hands clasped behind the head
    head(g, ch, hx, hy, F);
    const hasDesk = F.desk !== false, dl = hasDesk ? [13, 53.5] : [13.4, 52], dr = hasDesk ? [43, 53.5] : [42.6, 52];
    const L = F.lh || dl, Rr = F.rh || dr, under = (t) => hasDesk && t[1] >= 51;
    if (!F.back && under(L)) arm(g, ch, -1, [S_L[0], S_L[1] + by], L); if (!F.back && under(Rr)) arm(g, ch, 1, [S_R[0], S_R[1] + by], Rr);
    if (hasDesk) desk(g, ch, F);
    if (F.handset && F.handset !== 'rest') handset(g, F.handset[0], F.handset[1], F.handset[2]);
    if (F.bottle) bottle(g, F.bottle[0], F.bottle[1], F.bottle[2]);
    if (!F.back && !under(L)) arm(g, ch, -1, [S_L[0], S_L[1] + by], L); if (!F.back && !under(Rr)) arm(g, ch, 1, [S_R[0], S_R[1] + by], Rr);
    if (F.banana) banana(g, [F.banana[0], F.banana[1]], [F.banana[2], F.banana[3]], F.banana[4]);
    MK.fx(g, F.fx);
    return g;
  }
  MK.bust = bust;

  /* ---------- animations (bust) ---------- */
  const handsetEar = (dx, dy) => [[11.2 + (dx || 0), 20.2 + (dy || 0)], [14.4 + (dx || 0), 30 + (dy || 0)], -1.2];
  const HL = (dx, dy) => [12.4 + (dx || 0), 26 + (dy || 0)]; // left hand gripping the handset

  const A = {};
  A.idle = { fps: 3, loop: true, frames: [
    { eyes: 'open', mouth: 'smile' }, { eyes: 'open', mouth: 'smile', by: -0.5 }, { eyes: 'open', mouth: 'smile', look: [1, 0] }, { eyes: 'blink', mouth: 'smile' }, { eyes: 'open', mouth: 'grin', by: -0.5 }, { eyes: 'open', mouth: 'smile', look: [-1, 0] },
  ].map((f) => Object.assign({ handset: 'rest', lens: 'happy' }, f)) };
  A.dial = { fps: 5, loop: true, frames: [
    { by: 0, rh: [31.5, 44.6], press: 3, mouth: 'flat', look: [0, 1], eyes: 'open', brows: 'none' },
    { by: 0.5, rh: [35.5, 44.6], press: 4, mouth: 'tongue', look: [0, 1], eyes: 'open', hdy: 0.5, lens: 'wide' },
    { by: 0, rh: [39.5, 42.6], press: 2, mouth: 'tongue', look: [1, 1], eyes: 'open', lens: 'happy' },
    { by: 0, rh: [37, 38.5], press: -1, mouth: 'smile', look: [1, -1], eyes: 'open', brows: 'up', lens: 'happy' },
  ].map((f) => Object.assign({ handset: 'rest', keys: false }, f)) };
  A.ring = { fps: 4, loop: true, frames: [
    { handset: handsetEar(0, 0), lh: HL(0, 0), rh: [38, 52], eyes: 'open', look: [-1, -1], mouth: 'wobble', brows: 'worry', fx: [['note', 3, 8]], lens: 'wide', keys: true },
    { handset: handsetEar(0.6, -0.4), lh: HL(0.6, -0.4), rh: [36, 52], eyes: 'open', look: [0, -1], mouth: 'flat', brows: 'worry', fx: [['note', 2, 5], ['note', 7, 11], ['sweat', 43, 8]], by: -0.5, keys: true },
    { handset: handsetEar(0, 0), lh: HL(0, 0), rh: [38, 52], eyes: 'open', look: [1, -1], mouth: 'wobble', brows: 'worry', fx: [['note', 4, 6], ['sweat', 43, 9]], keys: true },
    { handset: handsetEar(-0.6, 0.4), lh: HL(-0.6, 0.4), rh: [41, 52], eyes: 'blink', look: [0, 0], mouth: 'flat', brows: 'worry', by: -0.5, fx: [['note', 3, 9], ['note', 8, 3]], keys: true },
  ] };
  A.answer = { fps: 7, loop: false, frames: [
    { handset: handsetEar(), lh: HL(), rh: [41, 52], eyes: 'wide', mouth: 'o', brows: 'up', shades: 'down', by: -2.5, fx: [['exclaim', 44, 4]], lens: 'wide', keys: true },
    { handset: handsetEar(), lh: HL(), rh: [42, 40], eyes: 'wide', mouth: 'o', brows: 'up', shades: 'down', by: -1.5, fx: [['exclaim', 44, 4]], lens: 'wide', keys: true },
    { handset: handsetEar(0, -0.5), lh: HL(0, -0.5), rh: [44, 20], eyes: 'star', mouth: 'laugh', brows: 'up', by: -2, hdy: -0.5, fx: [['spark', 4, 6], ['spark2', 45, 4], ['spark2', 38, 2]], lens: 'star', keys: true },
    { handset: handsetEar(), lh: HL(), rh: [45, 15], eyes: 'happy', mouth: 'laugh', brows: 'up', by: -3, hdy: -0.5, fx: [['spark2', 5, 5], ['spark', 46, 2], ['heart', 40, 6]], lens: 'happy', keys: true },
    { handset: handsetEar(), lh: HL(), rh: [44, 17], eyes: 'happy', mouth: 'grin', by: -1, fx: [['spark2', 46, 8]], lens: 'happy', keys: true },
    { handset: handsetEar(), lh: HL(), rh: [44, 16], eyes: 'happy', mouth: 'grin', by: 0, fx: [['spark', 46, 6]], lens: 'happy', keys: true },
  ] };
  A.talk = { fps: 5, loop: true, frames: [
    { handset: handsetEar(), lh: HL(), rh: [40, 36], eyes: 'open', mouth: 'talk0', lens: 'happy', brows: 'none' },
    { handset: handsetEar(), lh: HL(), rh: [44, 31], eyes: 'open', mouth: 'talk1', by: -0.5, lens: 'happy', brows: 'up' },
    { handset: handsetEar(), lh: HL(), rh: [41, 34], eyes: 'open', mouth: 'talk0', look: [1, 0], lens: 'happy', brows: 'none' },
    { handset: handsetEar(), lh: HL(), rh: [45, 36], eyes: 'blink', mouth: 'grin', by: -0.5, lens: 'happy' },
    { handset: handsetEar(), lh: HL(), rh: [42, 29], eyes: 'open', mouth: 'talk1', lens: 'happy', brows: 'up', look: [-1, 0] },
    { handset: handsetEar(), lh: HL(), rh: [40, 35], eyes: 'open', mouth: 'talk0', lens: 'happy' },
  ].map((f) => Object.assign({ keys: true }, f)) };
  A.hangup = { fps: 7, loop: false, frames: [
    { handset: handsetEar(), lh: HL(), eyes: 'open', mouth: 'smile', lens: 'happy', keys: true },
    { handset: [[12, 26], [15, 35.6], -1], lh: [13.4, 31.5], eyes: 'open', mouth: 'grin', lens: 'happy', by: 0.3, keys: true },
    { handset: [[12.6, 34], [14.6, 43.6], -1], lh: [13.4, 40], eyes: 'open', mouth: 'grin', lens: 'happy', by: 0.6, keys: true },
    { handset: 'rest', lh: [14.5, 52], eyes: 'wide', mouth: 'o', by: 1, brows: 'up', fx: [['spark2', 7, 34], ['spark2', 1, 40]], lens: 'wide' },
    { handset: 'rest', back: true, lh: [22, 9], rh: [34, 9], eyes: 'smug', mouth: 'smirk', brows: 'one', by: -0.5, hdy: -0.5, lens: 'happy' },
    { handset: 'rest', back: true, lh: [22, 9], rh: [34, 9], eyes: 'smug', mouth: 'smirk', brows: 'one', glint: 3.5, by: -1, hdy: -0.5, fx: [['spark', 44, 10], ['spark2', 6, 12]], lens: 'happy' },
  ] };
  A.relax = { fps: 2, loop: true, frames: [
    { handset: 'rest', back: true, lh: [22, 9], rh: [34, 9], eyes: 'smug', mouth: 'smirk', brows: 'one', by: -0.5, lens: 'happy', glint: -1.5 },
    { handset: 'rest', back: true, lh: [22, 9], rh: [34, 9], eyes: 'smug', mouth: 'grin', brows: 'one', by: 0, lens: 'happy', glint: 3.5, fx: [['spark2', 45, 11]] },
    { handset: 'rest', back: true, lh: [22, 9], rh: [34, 9], eyes: 'blink', mouth: 'smirk', brows: 'one', by: -0.5, lens: 'happy', glint: -1.5 },
    { handset: 'rest', back: true, lh: [22, 9], rh: [34, 9], eyes: 'smug', mouth: 'smirk', brows: 'one', by: 0, lens: 'happy', glint: 0.5 },
  ] };
  A.shrug = { fps: 3, loop: true, frames: [
    { handset: 'rest', lh: [8, 37], rh: [48, 37], eyes: 'sad', look: [0, -1], mouth: 'frown', brows: 'worry', by: 0, fx: [['q', 40, 2]], lens: 'dizzy' },
    { handset: 'rest', lh: [8, 35], rh: [48, 35], eyes: 'sad', look: [-1, -1], mouth: 'flat', brows: 'worry', by: -1, hdx: -0.5, fx: [['q', 42, 0]], lens: 'dizzy' },
    { handset: 'rest', lh: [8, 37], rh: [48, 37], eyes: 'sad', look: [0, -1], mouth: 'frown', brows: 'worry', by: 0, fx: [['q', 40, 3]], lens: 'dizzy' },
    { handset: 'rest', lh: [8, 35], rh: [48, 35], eyes: 'blink', mouth: 'flat', brows: 'worry', by: -1, hdx: 0.5, fx: [['q', 41, 1]], lens: 'dizzy' },
  ] };
  A.fail = { fps: 4, loop: true, frames: [
    { handset: 'rest', lcd: 'red', rh: [40, 11], eyes: 'dizzy', mouth: 'wobble', brows: 'worry', fx: [['puff', 22, 34], ['anger', 5, 6]], lens: 'dizzy', by: 0 },
    { handset: 'rest', lcd: 'red', rh: [41, 10], eyes: 'cross', mouth: 'frown', brows: 'worry', fx: [['puff', 24, 31], ['puff', 31, 35], ['anger', 6, 4]], lens: 'dizzy', by: -0.5, hdx: 0.5 },
    { handset: 'rest', lcd: 'red', rh: [40, 11], eyes: 'dizzy', mouth: 'wobble', brows: 'worry', fx: [['puff', 21, 33], ['anger', 4, 8]], lens: 'dizzy', by: 0 },
    { handset: 'rest', lcd: 'red', rh: [41, 10], eyes: 'cross', mouth: 'o', brows: 'worry', fx: [['puff', 25, 30], ['puff', 30, 33]], lens: 'dizzy', by: -0.5, hdx: -0.5 },
  ] };
  A.cheer = { fps: 5, loop: true, frames: [
    { desk: false, lh: [9, 12], rh: [47, 17], eyes: 'happy', mouth: 'laugh', by: -2, brows: 'up', lens: 'happy', fx: [['spark', 2, 6], ['spark2', 48, 8]] },
    { desk: false, lh: [10, 18], rh: [46, 11], eyes: 'star', mouth: 'laugh', by: 0, lens: 'star', tail: 1, fx: [['spark2', 4, 12], ['spark', 47, 2]] },
    { desk: false, lh: [9, 12], rh: [47, 17], eyes: 'happy', mouth: 'grin', by: -2, brows: 'up', lens: 'happy', tail: -1, fx: [['spark', 3, 4], ['spark2', 47, 12]] },
    { desk: false, lh: [10, 18], rh: [46, 11], eyes: 'open', mouth: 'laugh', by: 0, lens: 'happy', fx: [['spark2', 5, 9], ['spark2', 48, 4]] },
  ] };
  A.flex = { fps: 4, loop: true, frames: [
    { desk: false, lh: [6.5, 28], rh: [49.5, 28], eyes: 'smug', mouth: 'grin', brows: 'one', lens: 'happy', glint: -1.5, by: 0 },
    { desk: false, lh: [6, 25], rh: [50, 25], eyes: 'smug', mouth: 'grin', brows: 'one', lens: 'happy', glint: 1, by: -1, fx: [['spark2', 3, 20], ['spark2', 51, 21]] },
    { desk: false, lh: [6.5, 28], rh: [49.5, 28], eyes: 'smug', mouth: 'smirk', brows: 'one', lens: 'happy', glint: 3.5, by: 0, fx: [['spark', 50, 8]] },
    { desk: false, lh: [6, 25], rh: [50, 25], eyes: 'blink', mouth: 'grin', brows: 'one', lens: 'happy', glint: 0, by: -1 },
  ] };
  A.hello = { fps: 4, loop: true, frames: [
    { handset: 'rest', rh: [46, 24], eyes: 'open', mouth: 'grin', lens: 'happy', by: 0 },
    { handset: 'rest', rh: [49, 18], eyes: 'happy', mouth: 'grin', lens: 'happy', by: -0.5 },
    { handset: 'rest', rh: [46, 24], eyes: 'open', mouth: 'smile', lens: 'happy', by: 0 },
    { handset: 'rest', rh: [49, 18], eyes: 'blink', mouth: 'grin', lens: 'happy', by: -0.5 },
  ] };
  A.sleep = { fps: 2, loop: true, frames: [
    { desk: 'bare', hdy: 9, hdx: -1, by: 3, lh: [20, 49], rh: [36, 49], eyes: 'sleep', mouth: 'talk0', lens: 'sleep', fx: [['z', 36, 18]] },
    { desk: 'bare', hdy: 9.5, hdx: -1, by: 3.5, lh: [20, 49], rh: [36, 49], eyes: 'sleep', mouth: 'o', lens: 'sleep', fx: [['z', 36, 14], ['z', 42, 8]] },
    { desk: 'bare', hdy: 9, hdx: -1, by: 3, lh: [20, 49], rh: [36, 49], eyes: 'sleep', mouth: 'talk1', lens: 'sleep', fx: [['z', 38, 12], ['z', 44, 5]] },
    { desk: 'bare', hdy: 8.5, hdx: -1, by: 2.5, lh: [20, 49], rh: [36, 49], eyes: 'sleep', mouth: 'talk0', lens: 'sleep', fx: [['z', 36, 18]] },
  ] };
  // water reminder: show the bottle, glug, ahhh
  const BOT = (a, b, lv) => [a, b, lv];
  A.water = { fps: 3, loop: true, frames: [
    { handset: 'rest', desk: 'bare', bottle: BOT([45, 38], [45, 26], 0.8), rh: [45, 37], eyes: 'open', mouth: 'smile', lens: 'happy', brows: 'up', fx: [['drop', 49, 22]] },
    { handset: 'rest', desk: 'bare', bottle: BOT([43, 35], [32, 27.5], 0.7), rh: [42.5, 34], eyes: 'happy', mouth: 'none', lens: 'happy', hdy: -0.5 },
    { handset: 'rest', desk: 'bare', bottle: BOT([44, 31], [32, 27], 0.5), rh: [43, 30], eyes: 'happy', mouth: 'none', lens: 'happy', hdy: -1, hdx: 0.5, fx: [['drop', 36, 36]] },
    { handset: 'rest', desk: 'bare', bottle: BOT([45, 38], [45, 26], 0.35), rh: [45, 37], eyes: 'happy', mouth: 'grin', lens: 'happy', brows: 'up', fx: [['spark', 4, 6], ['spark2', 49, 18]], by: -1 },
  ] };
  // lunch: closed box -> open -> banana -> peel -> bite, then chew
  const BX = (o, ins) => ({ open: o, inside: ins });
  A.lunch = { fps: 3, loop: false, frames: [
    { box: BX(0), lh: [19, 50], rh: [37, 50], eyes: 'squint', look: [0, 1], mouth: 'flat', by: 0 },
    { box: BX(0), lh: [18, 44.5], rh: [38, 44.5], eyes: 'open', look: [0, 1], mouth: 'flat', brows: 'up', by: 0, lens: 'wide' },
    { box: BX(0.45, true), lh: [17, 43], rh: [39, 43], eyes: 'wide', look: [0, 1], mouth: 'o', brows: 'up', by: -0.5, lens: 'wide', fx: [['spark2', 26, 38]] },
    { box: BX(1, true), banana: [28, 49, 28, 41, 0], lh: [17, 44], rh: [39, 44], eyes: 'star', mouth: 'o', brows: 'up', by: -1, lens: 'star', fx: [['spark', 6, 30], ['spark2', 47, 33], ['spark2', 20, 36]] },
    { box: BX(1, true), banana: [28, 44, 28, 32, 0], lh: [23, 42], rh: [33, 42], eyes: 'star', mouth: 'laugh', by: -1, lens: 'star', fx: [['spark2', 14, 30], ['spark2', 43, 31]] },
    { box: BX(1, true), banana: [30, 40, 28, 29, 1], lh: [24, 36], rh: [32, 40], eyes: 'happy', mouth: 'tongue', by: -0.5, lens: 'happy', hdy: 0 },
    { box: BX(1, true), banana: [30, 38, 28, 27.5, 1], lh: [24, 35], rh: [32, 38], eyes: 'happy', mouth: 'shout', by: 0, hdy: -0.5, lens: 'happy', fx: [['spark2', 46, 18]] },
  ] };
  A.eat = { fps: 4, loop: true, frames: [
    { box: BX(1, true), banana: [30, 39, 28, 28.5, 2], lh: [24, 36], rh: [32, 41], eyes: 'happy', mouth: 'bite', by: 0, lens: 'happy' },
    { box: BX(1, true), banana: [30, 40, 28, 30, 2], lh: [24, 37], rh: [32, 42], eyes: 'happy', mouth: 'cheeks', by: 0.5, lens: 'happy' },
    { box: BX(1, true), banana: [30, 40, 28, 30, 2], lh: [24, 37], rh: [32, 42], eyes: 'happy', mouth: 'chew', by: 0, lens: 'happy', fx: [['heart', 43, 8]] },
    { box: BX(1, true), banana: [30, 38, 28, 27.5, 3], lh: [24, 35], rh: [32, 38], eyes: 'star', mouth: 'bite', by: -0.5, hdy: -0.5, lens: 'star' },
    { box: BX(1, true), banana: [30, 40, 28, 31, 3], lh: [24, 37], rh: [32, 42], eyes: 'happy', mouth: 'cheeks', by: 0.5, lens: 'happy' },
    { box: BX(1, true), banana: [30, 41, 28, 32, 4], lh: [24, 38], rh: [32, 43], eyes: 'happy', mouth: 'grin', by: 0, lens: 'happy', fx: [['spark', 44, 14], ['spark2', 5, 14]] },
  ] };
  MK.anims = A;
  MK.ANIM_SIZE = { w: 56, h: 56 };
})();
