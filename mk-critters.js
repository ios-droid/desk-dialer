// Desk Dialer critters · parrot, sloth, toucan, chameleon. Same pixel engine as the monkeys.
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const MK = G.MK, { Buf, paint, shape, shade, blit, hex, RAMP, C } = MK;
  const { ell, rect, cap, poly, or, sub, both } = shape, { ball, bay } = shade, A = MK.anims;
  const R5 = (a) => a.map(hex);
  const RP = {
    ivory: R5(['#4a4036', '#a89a84', '#d9ccb4', '#f2e8d4', '#fff9ea']),
    sloth: R5(['#2f2620', '#6b5a4a', '#9a8470', '#c2ad96', '#e3d4bf']),
    slothFace: R5(['#6b5a4a', '#d9c7a8', '#eadcc2', '#f6ecd6', '#fff8e8']),
    beak: R5(['#5a2a05', '#d9731a', '#f5a21f', '#ffc83d', '#fff0a0']),
    mask: R5(['#1a1210', '#2a1e18', '#3a2c22', '#4e3d30', '#6a5444']),
  };
  const K = C.K;
  function limb(R, x1, y1, x2, y2, r) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx * -0.5 + ny * -0.8 < 0) { nx = -nx; ny = -ny; }
    return (x, y) => { const s = ((x - x1) * nx + (y - y1) * ny) / r, t = 0.5 + s * 0.5 + (bay(x, y) - 0.5) * 0.16; return R[t < 0.26 ? 1 : t < 0.62 ? 2 : t < 0.86 ? 3 : 4]; };
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function branch(g, y, x0, x1) {
    const W = RAMP.wood; paint(g, rect(x0, y, x1, y + 4), (x, yy) => (yy < y + 1.4 ? W[4] : yy < y + 2.6 ? W[3] : W[2]), W[0]);
    for (const x of [x0 + 9, x1 - 14]) { g.set(x, y + 2, W[1]); g.set(x + 1, y + 2, W[1]); }
    for (const [x, dy, c] of [[x0 + 2, -2, RAMP.leaf], [x1 - 5, -2, RAMP.leaf]]) paint(g, ell(x + 1, y + dy, 3.6, 2), ball(c, x, y + dy - 1, 4, 3), c[0]);
  }
  function eye(g, x, y, kind, look, r) {
    look = look || 0; r = r || 2.2;
    if (kind === 'blink') { for (let i = -2; i <= 2; i++) g.set(x + i, y, K); return; }
    if (kind === 'happy') { g.set(x - 2, y + 1, K); g.set(x - 1, y, K); g.set(x, y - 0.5, K); g.set(x + 1, y, K); g.set(x + 2, y + 1, K); return; }
    paint(g, ell(x, y, r, r), kind === 'wide' ? C.W : RAMP.banana[3], K); paint(g, ell(x + look, y, kind === 'wide' ? 0.9 : 1.2, kind === 'wide' ? 0.9 : 1.2), K); g.set(x + look - 0.6, y - 0.8, C.W);
  }

  /* ---------------- PARROT (red macaw) ---------------- */
  function parrot(F) {
    const g = new Buf(56, 56), by = F.by || 0, R = RAMP.red, B = RAMP.blue, Y = RAMP.banana, hx = 28 + (F.hdx || 0), hy = 19 + by + (F.hdy || 0), fly = !!F.fly;
    if (!fly) branch(g, 50, 3, 53);
    // tail feathers
    paint(g, cap(26.5, 47 + by, 24, 58, 2.6), limb(B, 26, 47, 24, 58, 2.6), B[0]); paint(g, cap(30.5, 47 + by, 33, 58, 2.4), limb(R, 30, 47, 33, 58, 2.4), R[0]);
    // spread wings when flying
    if (fly) for (const s of [-1, 1]) {
      const S = [28 + s * 6, 33 + by], T = [28 + s * 26, F.tip + by], m1 = lerp(S, T, 0.42), m2 = lerp(S, T, 0.74);
      paint(g, cap(m2[0], m2[1], T[0], T[1], 3.4), limb(B, m2[0], m2[1], T[0], T[1], 3.4), B[0]);
      paint(g, cap(m1[0], m1[1], m2[0], m2[1], 4), limb(Y, m1[0], m1[1], m2[0], m2[1], 4), Y[0]);
      paint(g, cap(S[0], S[1], m1[0], m1[1], 4.6), limb(R, S[0], S[1], m1[0], m1[1], 4.6), R[0]);
    }
    paint(g, ell(28, 37 + by, 10.8, 13.6), ball(R, 21, 28 + by, 16, 20), R[0]);
    paint(g, ell(28, 41 + by, 5.4, 8), ball(R, 25, 36 + by, 7, 10, { bias: 0.12 }), null);
    if (!fly) for (const s of [-1, 1]) paint(g, ell(28 + s * 9.9, 38 + by, 4.3, 11.4), (x, y) => { const t = y - by; return t < 35.5 ? R[x < 28 ? 3 : 2] : t < 40 ? Y[x < 28 ? 3 : 2] : B[x < 28 ? 3 : 2]; }, R[0]);
    if (fly) { // claws holding a letter
      for (const s of [-1, 1]) { paint(g, cap(28 + s * 3.4, 46 + by, 28 + s * 3.4, 49 + by, 1.2), RP.ivory[1], null); }
      if (F.letter !== false) { paint(g, rect(20.5, 48 + by, 35.5, 57), (x, y) => (y < 51.5 + by ? C.W : RAMP.white[3]), RAMP.white[0]); paint(g, poly([[20.5, 48 + by], [35.5, 48 + by], [28, 53.4 + by]]), RAMP.white[2], RAMP.white[1]); paint(g, ell(28, 53 + by, 1.6, 1.4), RAMP.red[2], RAMP.red[0]); }
    } else for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) g.set(28 + s * 4 + i, 49, RP.ivory[1]);
    // head
    paint(g, ell(hx, hy, 10, 9.6), ball(R, hx - 3, hy - 5, 13, 12), R[0]);
    paint(g, ell(hx, hy + 2, 7.4, 6.2), ball(RAMP.white, hx - 2, hy, 9, 8, { bias: 0.1 }), hex('#b86a6a'));
    for (const [dx, dy] of [[-5, 3], [-4, 5], [4, 5], [5, 3], [-2, 6], [2, 6]]) g.set(hx + dx, hy + dy, hex('#ecb8b8'));
    for (const s of [-1, 1]) eye(g, hx + s * 4.2, hy - 0.4, F.eyes === 'wink' ? (s > 0 ? 'happy' : 'open') : F.eyes || 'open', F.look || 0, 2.3);
    // beak: lower mandible, mouth, upper hooked beak
    const o = F.beak || 0;
    paint(g, ell(hx, hy + 9.4 + o * 1.3, 3.3, 1.8), RP.ivory[1], K);
    if (o) { paint(g, ell(hx, hy + 8.2 + o * 0.7, 2.7, 0.6 + o * 0.7), hex('#c4405a'), null); if (o > 1) g.set(hx, hy + 9 + o * 0.6, hex('#ff8fa6')); }
    paint(g, poly([[hx - 4.8, hy + 3.4], [hx + 4.8, hy + 3.4], [hx + 4.3, hy + 8], [hx + 2.2, hy + 11.4], [hx, hy + 12.8], [hx - 2, hy + 11.2], [hx - 4.2, hy + 8]]), ball(RP.ivory, hx - 2, hy + 4, 9, 11), RP.ivory[0]);
    g.set(hx - 1, hy + 5, K); g.set(hx + 1, hy + 5, K);
    MK.fx(g, F.fx);
    return g;
  }
  const PP = (a) => a.map((f) => ({ make: () => parrot(f) }));
  A.parrot_perch = { fps: 3, loop: true, frames: PP([{ eyes: 'open' }, { eyes: 'open', by: -0.5, look: 1 }, { eyes: 'blink' }, { eyes: 'open', hdx: -1, look: -1, beak: 1, fx: [['note', 44, 8]] }]) };
  A.parrot_squawk = { fps: 6, loop: true, frames: PP([{ eyes: 'wide', beak: 3, hdy: -1.5, fx: [['exclaim', 44, 4], ['spark2', 6, 12]] }, { eyes: 'wide', beak: 1, hdy: -0.5, fx: [['exclaim', 44, 3]] }, { eyes: 'wide', beak: 3, hdy: -1.5, hdx: 1, fx: [['spark2', 46, 12], ['exclaim', 6, 4]] }, { eyes: 'open', beak: 0 }]) };
  A.parrot_fly = { fps: 8, loop: true, frames: PP([{ fly: true, tip: 8, by: -1, eyes: 'open' }, { fly: true, tip: 24, eyes: 'open', by: 0 }, { fly: true, tip: 44, by: 1, eyes: 'happy' }, { fly: true, tip: 26, eyes: 'open', by: 0 }]) };

  /* ---------------- SLOTH ---------------- */
  function sloth(F) {
    const g = new Buf(56, 56), by = F.by || 0, dx = F.dx || 0, Fu = RP.sloth, Fc = RP.slothFace, W = RAMP.wood;
    // branch + hanging leaves
    paint(g, rect(0, 2, 56, 7), (x, y) => (y < 3.4 ? W[4] : y < 5 ? W[3] : W[2]), W[0]);
    for (const [x, y] of [[4, 8], [17, 8], [40, 8.5], [51, 8]]) paint(g, ell(x, y, 3.2, 2.4), ball(RAMP.leaf, x - 1, y - 1, 4, 3), RAMP.leaf[0]);
    const arm = (s, hold) => {
      const S = [28 + s * 10 + dx, 33 + by], H = hold ? [28 + s * 13 + dx * 0.4, 8] : F.hand || [35, 33 + by];
      let E = hold ? [28 + s * 18 + dx * 0.6, 19] : F.elbow || [47, 22];
      paint(g, or(cap(S[0], S[1], E[0], E[1], 3.3), cap(E[0], E[1], H[0], H[1], 2.9)), (x, y) => limb(Fu, S[0], S[1], H[0], H[1], 3)(x, y), Fu[0]);
      paint(g, ell(H[0], H[1], 3.2, 2.8), ball(Fu, H[0] - 1, H[1] - 1, 4, 4), Fu[0]);
      if (hold) for (const k of [-1.6, 0, 1.6]) { g.set(H[0] + k, 4.6, RP.ivory[3]); g.set(H[0] + k, 5.6, RP.ivory[2]); }
      return H;
    };
    arm(-1, true);
    paint(g, ell(28 + dx, 45 + by, 12.5, 13), ball(Fu, 21 + dx, 36 + by, 18, 18), Fu[0]);
    paint(g, ell(28 + dx, 48.5 + by, 7, 8), ball(Fc, 25 + dx, 44 + by, 9, 10, { bias: 0.05 }), null);
    for (const s of [-1, 1]) { paint(g, cap(23 + s * 5 + dx, 54 + by, 22 + s * 5.5 + dx, 58, 2.6), limb(Fu, 0, 0, 0, 5, 2.6), Fu[0]); }
    if (F.arm2) { const H = arm(1, false); if (F.leaf) { paint(g, poly([[H[0] - 4, H[1] + 1], [H[0] + 2, H[1] - 4], [H[0] + 5, H[1] - 1], [H[0] + 1, H[1] + 3]]), ball(RAMP.leaf, H[0] - 2, H[1] - 3, 7, 7), RAMP.leaf[0]); g.set(H[0], H[1], RAMP.leaf[4]); g.set(H[0] + 1, H[1] - 1, RAMP.leaf[4]); } } else arm(1, true);
    // head
    const hx = 28 + dx + (F.hdx || 0), hy = 27 + by + (F.hdy || 0);
    paint(g, ell(hx, hy, 11, 9.8), ball(Fu, hx - 3, hy - 4, 14, 13), Fu[0]);
    for (const dxx of [-3, 0, 3]) { g.set(hx + dxx, hy - 10, Fu[2]); g.set(hx + dxx + 0.01, hy - 9, Fu[3]); }
    paint(g, ell(hx, hy + 1, 8.6, 7.6), ball(Fc, hx - 2, hy - 2, 11, 10, { bias: 0.04 }), Fc[0]);
    for (const s of [-1, 1]) paint(g, cap(hx + s * 7.4, hy - 3, hx + s * 3.6, hy + 3, 2.1), RP.mask[2], RP.mask[0]);
    const ek = F.eyes || 'open';
    for (const s of [-1, 1]) {
      const ex = hx + s * 4.8, ey = hy - 0.2;
      if (ek === 'open' || ek === 'wide') { paint(g, ell(ex, ey, 1.9, ek === 'wide' ? 2.6 : 2.1), C.W, null); paint(g, ell(ex + (F.look || 0), ey + 0.2, 1, 1.2), K); g.set(ex + (F.look || 0) - 0.5, ey - 0.6, C.W); }
      else if (ek === 'sleep') { for (let i = -2; i <= 2; i++) g.set(ex + i, ey + (Math.abs(i) > 1 ? 0 : 1), C.W2); }
      else if (ek === 'blink') { for (let i = -2; i <= 2; i++) g.set(ex + i, ey + 0.6, C.W2); }
      else if (ek === 'happy') { g.set(ex - 2, ey + 1, C.W); g.set(ex - 1, ey, C.W); g.set(ex, ey - 0.4, C.W); g.set(ex + 1, ey, C.W); g.set(ex + 2, ey + 1, C.W); }
    }
    paint(g, ell(hx, hy + 3.6, 2.5, 1.7), ball(RP.mask, hx - 1, hy + 2.6, 3, 3), RP.mask[0]); g.set(hx - 1, hy + 3, C.W2);
    const m = F.mouth || 'smile';
    if (m === 'smile') blit(g, hx - 3, hy + 6, ['k.....k', '.kkkkk.'], { k: K });
    else if (m === 'big') blit(g, hx - 3, hy + 6, ['kkkkkkk', 'kwwwwwk', '.kkkkk.'], { k: K, w: C.TEETH });
    else if (m === 'chew') blit(g, hx - 2, hy + 6, ['.kkkkk.', 'k.....k', '.kkkkk.'.slice(0, 7)].slice(0, 2), { k: K });
    else if (m === 'o') blit(g, hx - 2, hy + 5.6, ['.kkk.', 'krrrk', '.kkk.'], { k: K, r: C.RED });
    if (F.blush) for (const s of [-1, 1]) { g.set(hx + s * 7.4, hy + 4, C.BLUSH); g.set(hx + s * 6.4, hy + 4.6, C.BLUSH); }
    MK.fx(g, F.fx);
    return g;
  }
  const SL = (a) => a.map((f) => ({ make: () => sloth(f) }));
  A.sloth_hang = { fps: 1.6, loop: true, frames: SL([{ dx: 0, eyes: 'open', blush: 1 }, { dx: 1, eyes: 'open', by: 0.5, look: 1, blush: 1 }, { dx: 1, eyes: 'blink', by: 0.5, blush: 1 }, { dx: 0, eyes: 'open', mouth: 'big', look: -1, blush: 1 }, { dx: -1, eyes: 'happy', blush: 1 }, { dx: -1, eyes: 'open', by: 0.5, blush: 1 }]) };
  A.sloth_sleep = { fps: 1.5, loop: true, frames: SL([{ eyes: 'sleep', mouth: 'o', hdy: 1.5, hdx: -1, fx: [['z', 40, 14]] }, { eyes: 'sleep', mouth: 'smile', hdy: 1.5, hdx: -1, by: 0.5, fx: [['z', 41, 11], ['z', 46, 6]] }, { eyes: 'sleep', mouth: 'o', hdy: 2, hdx: -1, fx: [['z', 42, 9], ['z', 47, 4]] }, { eyes: 'sleep', mouth: 'smile', hdy: 1.5, hdx: -1, fx: [['z', 40, 14]] }]) };
  A.sloth_munch = { fps: 2.5, loop: true, frames: SL([{ arm2: true, leaf: true, hand: [37, 32], elbow: [48, 24], eyes: 'happy', mouth: 'chew', blush: 1 }, { arm2: true, leaf: true, hand: [36, 33], elbow: [48, 25], eyes: 'happy', mouth: 'smile', blush: 1, by: 0.5 }, { arm2: true, leaf: true, hand: [37, 32], elbow: [48, 24], eyes: 'open', mouth: 'chew', blush: 1 }, { arm2: true, leaf: true, hand: [33, 36], elbow: [47, 28], eyes: 'blink', mouth: 'smile', blush: 1, fx: [['heart', 40, 8]] }]) };

  /* ---------------- TOUCAN (profile, facing right) ---------------- */
  function toucan(F) {
    const g = new Buf(56, 56), by = F.by || 0, I = RAMP.ink, Bk = RP.beak, hy = 22 + by + (F.hdy || 0), hx = 31 + (F.hdx || 0), o = F.beak || 0;
    branch(g, 51, 2, 54);
    paint(g, cap(14, 44 + by, 4, 54, 3), limb(I, 14, 44, 4, 54, 3), I[0]); paint(g, ell(9.5, 48 + by, 2.4, 2), RAMP.red[2], null);
    paint(g, ell(22, 39 + by, 11.5, 11), ball(I, 16, 32 + by, 15, 14), I[0]);
    paint(g, ell(31.5, 36 + by, 6.6, 7.8), hex('#ffcf40'), I[0]); paint(g, ell(31.3, 36 + by, 5.4, 6.6), ball(RAMP.white, 29, 32 + by, 8, 8, { bias: 0.1 }), null);
    paint(g, ell(19, 40 + by, 6.5, 8.6), ball(I, 16, 34 + by, 9, 10, { bias: -0.2 }), I[0]);
    for (let i = 0; i < 4; i++) g.set(15 + i * 2, 47 + by, I[4]);
    for (const x of [21, 26]) for (let i = 0; i < 3; i++) g.set(x + i, 51, RP.ivory[1]);
    paint(g, ell(hx, hy, 8.2, 7.6), ball(I, hx - 3, hy - 4, 11, 10), I[0]);
    paint(g, ell(hx + 3, hy - 1.2, 4.4, 4), ball(RAMP.blue, hx + 1, hy - 3, 6, 6, { bias: 0.1 }), RAMP.blue[0]);
    if (F.eyes === 'blink') { for (let i = -1; i <= 1; i++) g.set(hx + 3.6 + i, hy - 1, K); }
    else if (F.eyes === 'happy') { g.set(hx + 2, hy - 0.2, K); g.set(hx + 3, hy - 1.2, K); g.set(hx + 4, hy - 1.2, K); g.set(hx + 5, hy - 0.2, K); }
    else { paint(g, ell(hx + 3.8, hy - 1.2, 1.7, 1.7), K); g.set(hx + 3, hy - 2, C.W); }
    // beak (lower first)
    const bx = hx + 5.5, tipY = hy + 5 + o * 1.2;
    paint(g, poly([[bx, hy + 4.6], [bx + 13.5, hy + 5.8 + o * 1.4], [bx + 11, hy + 9.2 + o * 1.8], [bx, hy + 7.6]]), (x, y) => Bk[((x - bx) / 13 < 0.5 ? 2 : 1)], Bk[0]);
    if (o) paint(g, poly([[bx + 1, hy + 5.4], [bx + 12, hy + 6.2], [bx + 12, hy + 6.2 + o * 1.4], [bx + 1, hy + 5.4 + o * 1.4]]), hex('#c4405a'), null);
    paint(g, poly([[bx - 1, hy - 3.6], [bx + 14, hy + 0.6], [bx + 17.5, hy + 4.4], [bx + 13, hy + 5.4], [bx, hy + 5]]), (x, y) => { const t = (x - bx) / 17; const c = t < 0.2 ? Bk[4] : t < 0.45 ? Bk[3] : t < 0.8 ? Bk[2] : Bk[1]; return y < hy - 0.8 + t * 3 && t > 0.1 && t < 0.9 && ((x * 7 + y) & 7) === 0 ? Bk[4] : c; }, Bk[0]);
    for (let x = Math.round(bx + 14); x < bx + 18; x++) g.set(x, hy + 3.4, RP.mask[0]);
    for (let x = Math.round(bx + 1); x < bx + 14; x++) g.set(x, hy + 4.6 + (x - bx) * 0.07, Bk[0]);
    MK.fx(g, F.fx);
    return g;
  }
  const TC = (a) => a.map((f) => ({ make: () => toucan(f) }));
  A.toucan_perch = { fps: 3, loop: true, frames: TC([{ eyes: 'open' }, { eyes: 'open', by: -0.5, hdy: -0.5 }, { eyes: 'blink' }, { eyes: 'open', beak: 1, hdy: -1, fx: [['note', 3, 8]] }]) };
  A.toucan_laugh = { fps: 6, loop: true, frames: TC([{ eyes: 'happy', beak: 2, hdy: -2, fx: [['spark2', 6, 14]] }, { eyes: 'happy', beak: 0, hdy: -0.5, by: -0.5 }, { eyes: 'happy', beak: 2, hdy: -2, fx: [['spark2', 46, 6]] }, { eyes: 'happy', beak: 0, hdy: 0 }]) };

  /* ---------------- CHAMELEON (profile, facing right) ---------------- */
  const HUES = [RAMP.green, RAMP.teal, RAMP.blue, RAMP.purple, RAMP.red, RAMP.orange, RAMP.banana];
  function cham(F) {
    const g = new Buf(56, 56), by = F.by || 0, Rm = F.hue || RAMP.green, ox = -3, K2 = Rm[0];
    // twig + leaves
    paint(g, or(cap(1, 51, 30, 49, 1.8), cap(30, 49, 54, 47, 1.6)), (x, y) => RAMP.wood[y < 49 ? 3 : 2], RAMP.wood[0]);
    for (const [x, y] of [[8, 54], [44, 44]]) paint(g, ell(x, y, 3.6, 2), ball(RAMP.leaf, x - 1, y - 1, 5, 3), RAMP.leaf[0]);
    // curled tail
    const pts = []; for (let t = 0; t <= 3.2; t += 0.35) { const r = 9 - t * 2.4; pts.push([13 + ox - Math.cos(t + 0.6) * r * 0.2 - Math.sin(t) * r * 0.55 * 0 + (-Math.sin(t * 1) * r), 41 + by + Math.cos(t) * r - r + 3]); }
    const tail = or(...pts.slice(1).map((p, i) => cap(pts[i][0], pts[i][1], p[0], p[1], 2.4 - i * 0.12)));
    paint(g, tail, (x, y) => Rm[((x + y) & 3) === 0 ? 3 : 2], Rm[0]);
    // legs
    for (const [x, y] of [[36 + ox, 47], [16 + ox, 47]]) { paint(g, cap(x, 42 + by, x + 1, y, 2.3), limb(Rm, x, 42, x + 1, y, 2.3), Rm[0]); for (const dx of [-1.6, 0.4, 2.2]) g.set(x + dx, 49, Rm[0]); }
    // body, spots, ridge
    paint(g, ell(26 + ox, 37 + by, 14, 9), ball(Rm, 18 + ox, 30 + by, 18, 14), Rm[0]);
    for (const [x, y] of [[20, 37], [24, 40], [29, 36], [33, 40], [17, 41], [27, 33], [22, 34], [31, 42]]) { g.set(x + ox, y + by, Rm[4]); g.set(x + ox + 1, y + by, Rm[3]); }
    for (let x = 15; x < 38; x += 2) { g.set(x + ox, 28 + by + (x < 22 ? 0.4 : x > 33 ? 1.6 : 0.01), Rm[0]); g.set(x + ox, 27 + by + (x < 22 ? 0.4 : x > 33 ? 1.6 : 0.01), Rm[3]); }
    // head
    const hx = 40 + ox, hy = 33 + by + (F.hdy || 0);
    paint(g, poly([[hx - 6, hy - 3], [hx, hy - 8.4], [hx + 6, hy - 4]]), ball(Rm, hx - 3, hy - 8, 10, 7), Rm[0]);
    paint(g, ell(hx, hy, 8.6, 6.2), ball(Rm, hx - 3, hy - 4, 12, 9), Rm[0]); paint(g, ell(hx + 7.4, hy + 2, 3.8, 2.8), ball(Rm, hx + 5, hy, 6, 5), Rm[0]);
    // mouth + tongue
    const mo = F.mouth || 0; for (let i = 0; i < 9; i++) g.set(hx + 3.5 + i, hy + 4.4 + (mo ? i * 0.3 : -i * 0.12), Rm[0]); g.set(hx + 10.5, hy + 1.2, Rm[0]);
    if (F.tongue) { const T = [hx + 9 + F.tongue * 8, hy + 4 - F.tongue * 7.5]; paint(g, cap(hx + 9, hy + 4.5, T[0], T[1], 1.1), hex('#ff7a9a'), hex('#a02a4a')); paint(g, ell(T[0], T[1], 1.9, 1.9), hex('#ff4f7a'), hex('#a02a4a')); }
    if (F.fly) { const [fx, fy] = F.fly; paint(g, ell(fx, fy, 1.5, 1.2), K); for (const s of [-1, 1]) paint(g, ell(fx + s * 1.8, fy - 1.6, 1.8, 1), (x, y) => hex('#cfe9ff'), hex('#5a7a99')); }
    // turret eye
    const eyx = hx + 1.6, eyy = hy - 3.6, lk = F.look || [0, 0];
    paint(g, ell(eyx, eyy, 4.4, 4.2), ball(Rm, eyx - 2, eyy - 2, 6, 6, { bias: 0.15 }), Rm[0]); paint(g, sub(ell(eyx, eyy, 3.1, 3), ell(eyx, eyy, 2.4, 2.3)), Rm[4], null);
    if (F.eyes === 'blink') { for (let i = -2; i <= 2; i++) g.set(eyx + i, eyy, Rm[0]); }
    else { paint(g, ell(eyx, eyy, 2.3, 2.2), hex('#ffe9a8'), null); paint(g, ell(eyx + lk[0], eyy + lk[1], 1.3, 1.3), K); g.set(eyx + lk[0] - 0.6, eyy + lk[1] - 0.8, C.W); }
    MK.fx(g, F.fx);
    return g;
  }
  const CM = (a) => a.map((f) => ({ make: () => cham(f) }));
  A.cham_idle = { fps: 3, loop: true, frames: CM([{ hue: HUES[0], look: [1, 0] }, { hue: HUES[1], look: [0, 1], by: -0.4 }, { hue: HUES[2], look: [-1, 0] }, { hue: HUES[3], look: [0, -1], eyes: 'blink', by: -0.4 }, { hue: HUES[5], look: [1, 1] }, { hue: HUES[6], look: [-1, -1], by: -0.4 }]) };
  A.cham_snap = { fps: 5, loop: false, frames: CM([{ hue: HUES[0], look: [1, -1], fly: [53, 20], fx: [] }, { hue: HUES[0], look: [1, -1], fly: [53, 20], tongue: 0.5, mouth: 1 }, { hue: HUES[1], look: [1, -1], fly: [52.5, 19.5], tongue: 1, mouth: 1 }, { hue: HUES[1], look: [1, 0], mouth: 0, fx: [['heart', 20, 14]] }, { hue: HUES[5], look: [0, 0], mouth: 0, eyes: 'blink' }]) };

  /* ---------------- portraits (toasts, avatars): 40x36 ---------------- */
  function face(kind, i) {
    const g = new Buf(40, 36), sweat = i === 1; // 0 happy, 1 worried, 2 wink, 3 open
    if (kind === 'parrot') {
      const R = RAMP.red; paint(g, ell(20, 17, 13, 12), ball(R, 15, 9, 17, 15), R[0]); paint(g, ell(20, 20, 9.4, 7.8), ball(RAMP.white, 17, 16, 11, 10, { bias: 0.1 }), hex('#b86a6a'));
      for (const s of [-1, 1]) eye(g, 20 + s * 5.2, 17, i === 2 ? (s > 0 ? 'happy' : 'open') : i === 1 ? 'wide' : 'open', 0, 2.8);
      const o = i === 3 ? 3 : i === 1 ? 1 : 0; paint(g, ell(20, 31 + o * 1.2, 3.8, 2), RP.ivory[1], K); if (o) paint(g, ell(20, 29.6 + o * 0.5, 3, 0.7 + o * 0.6), hex('#c4405a'), null);
      paint(g, poly([[14.8, 22.5], [25.2, 22.5], [24.5, 27.5], [22, 31.4], [20, 33], [18, 31.2], [15.5, 27.5]]), ball(RP.ivory, 17, 23, 10, 12), RP.ivory[0]);
    } else if (kind === 'sloth') {
      const Fu = RP.sloth, Fc = RP.slothFace; paint(g, ell(20, 18, 15, 12.6), ball(Fu, 14, 10, 18, 16), Fu[0]); paint(g, ell(20, 19.4, 11.6, 9.8), ball(Fc, 17, 15, 14, 12, { bias: 0.04 }), Fc[0]);
      for (const s of [-1, 1]) { paint(g, cap(20 + s * 9.4, 14, 20 + s * 4.8, 21, 2.7), RP.mask[2], RP.mask[0]); const ex = 20 + s * 6.2, ey = 17.4; if (i === 2 && s < 0 || i === 1 && false) { for (let k = -2; k <= 2; k++) g.set(ex + k, ey + (Math.abs(k) > 1 ? 0 : 1), C.W2); } else { paint(g, ell(ex, ey, 2.4, i === 1 ? 3.2 : 2.6), C.W, null); paint(g, ell(ex, ey + 0.2, 1.2, 1.4), K); g.set(ex - 0.6, ey - 0.8, C.W); } }
      paint(g, ell(20, 22.4, 3.2, 2.2), ball(RP.mask, 19, 21, 4, 4), RP.mask[0]); g.set(19, 21.6, C.W2);
      if (i === 0 || i === 2) blit(g, 16, 26.4, ['k.......k', '.kkkkkkk.'], { k: K }); else if (i === 3) blit(g, 16, 26, ['kkkkkkkkk', 'kwwwwwwwk', '.krrrrrk.', '..kkkkk..'], { k: K, w: C.TEETH, r: C.RED }); else blit(g, 16, 27, ['..kkkkk..', '.k.....k.'], { k: K });
    } else if (kind === 'toucan') {
      const I = RAMP.ink, Bk = RP.beak; paint(g, ell(13, 19, 11, 10.6), ball(I, 8, 12, 14, 13), I[0]); paint(g, ell(16, 17, 5, 4.6), ball(RAMP.blue, 14, 15, 7, 7, { bias: 0.1 }), RAMP.blue[0]);
      if (i === 2) { g.set(14, 17, K); g.set(15, 16, K); g.set(16, 16, K); g.set(17, 17, K); } else { paint(g, ell(16.6, 16.6, 2.1, 2.1), K); g.set(15.8, 15.6, C.W); }
      const d = i === 1 ? 3 : 0, o = i === 3 ? 4 : 0;
      paint(g, poly([[20, 24 + d], [37, 25 + d + o], [34, 28.5 + d + o], [20, 27 + d]]), Bk[1], Bk[0]);
      paint(g, poly([[19, 14 + d * 0.5], [34, 19 + d], [38, 24 + d], [34, 25.5 + d], [20, 25 + d]]), (x) => { const t = (x - 19) / 19; return t < 0.2 ? Bk[4] : t < 0.5 ? Bk[3] : t < 0.8 ? Bk[2] : Bk[1]; }, Bk[0]);
      if (sweat) { g.set(8, 10, C.SW); g.set(8, 11, C.SW); g.set(7, 12, C.SW); }
    } else { // chameleon: two turret eyes up top
      let Rm = [RAMP.green, RAMP.teal, RAMP.purple, RAMP.orange][i];
      paint(g, ell(20, 22, 14.4, 10.6), ball(Rm, 14, 14, 18, 14), Rm[0]);
      paint(g, poly([[13, 15], [20, 6], [27, 15]]), ball(Rm, 16, 8, 12, 10), Rm[0]);
      for (const s of [-1, 1]) { const ex = 20 + s * 10.4, ey = 12; paint(g, ell(ex, ey, 5, 4.8), ball(Rm, ex - 2, ey - 2, 7, 7, { bias: 0.15 }), Rm[0]); paint(g, ell(ex, ey, 3.6, 3.5), hex('#ffe9a8'), null); paint(g, ell(ex + (i === 1 ? -s * 1 : s * 0.4), ey + (i === 1 ? 1 : 0), 1.6, 1.6), K); g.set(ex - 1, ey - 1.2, C.W); }
      if (i === 3) blit(g, 14, 25, ['kkkkkkkkkkkk', 'krrrrrrrrrrk', 'krrtttttrrrk', '.kkkkkkkkkk.'], { k: K, r: C.RED, t: C.TNG }); else if (i === 1) blit(g, 15, 27, ['k.k.k.k.k.k'], { k: K }); else blit(g, 13, 25.4, ['k..........k', '.kkkkkkkkkk.'], { k: K });
      if (i === 2) { paint(g, cap(20, 28, 20, 33, 1.3), hex('#ff7a9a'), hex('#a02a4a')); paint(g, ell(20, 33.4, 2, 1.8), hex('#ff4f7a'), hex('#a02a4a')); }
    }
    return g;
  }
  MK.CRIT = {
    parrot: { id: 'parrot', name: 'Polly', tag: 'Messenger parrot. Repeats everything. Delivers your reports.' },
    sloth: { id: 'sloth', name: 'Slowpoke', tag: 'Unbothered sloth. Will get there. Eventually.' },
    toucan: { id: 'toucan', name: 'Tuco', tag: 'Toucan with a very big opinion (and beak).' },
    cham: { id: 'cham', name: 'Kiko', tag: 'Chameleon. Changes colour. Catches flies. Loading specialist.' },
  };
  for (const id of Object.keys(MK.CRIT)) MK.CRIT[id].face = (i) => face(id === 'cham' ? 'cham' : id, i);
  A.cface = { w: 40, h: 36, fps: 0, loop: false, frames: [0, 1, 2, 3].map((i) => ({ make: (C2) => C2.face(i) })) };
  MK.critters = Object.keys(MK.CRIT);
})();
