// Desk Dialer monkeys · runtime. Renders pixel strips once (canvas -> PNG data URL) and plays them
// with the Web Animations API. Any element made by Monkey.html() is animated automatically.
(function () {
  'use strict';
  const MK = window.MK, A = MK.anims;
  const cache = {}, reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toUrl(frames, w, h) {
    const c = document.createElement('canvas'); c.width = w * frames.length; c.height = h; const x = c.getContext('2d');
    frames.forEach((b, i) => x.putImageData(new ImageData(new Uint8ClampedArray(b.d.buffer.slice(0)), b.w, b.h), i * w, 0));
    return c.toDataURL('image/png');
  }
  function strip(ch, an) {
    const key = ch + '|' + an; if (cache[key]) return cache[key];
    const def = A[an]; if (!def) return null; const C = MK.CH[ch] || (MK.CRIT && MK.CRIT[ch]) || MK.CH.bongo, w = def.w || 56, h = def.h || 56;
    const frames = def.frames.map((F) => (F.make ? F.make(C) : MK.bust(C, F)));
    return (cache[key] = { url: toUrl(frames, w, h), w, h, n: frames.length, fps: def.fps, loop: def.loop });
  }
  function url(kind, w, h, pal) {
    const key = kind + w + 'x' + h + (pal || ''); if (cache[key]) return cache[key];
    const b = kind === 'vine' ? MK.vineTile() : MK.scene(kind, w, h, pal); return (cache[key] = toUrl([b], b.w, b.h));
  }

  // apply an animation to an element (or a single frame when o.frame is given)
  function setAnim(el, an, o) {
    o = o || {}; const ch = o.char || el.dataset.ch, sc = +(o.scale || el.dataset.sc || 2), s = strip(ch, an); if (!s) return Promise.resolve();
    if (el._a) { try { el._a.cancel(); } catch (e) {} el._a = null; }
    Object.assign(el.dataset, { ch, sc, an, on: '1' });
    const st = el.style; st.backgroundImage = 'url(' + s.url + ')'; st.width = s.w * sc + 'px'; st.height = s.h * sc + 'px'; st.backgroundSize = s.w * s.n * sc + 'px ' + s.h * sc + 'px';
    const loop = o.loop == null ? s.loop : o.loop, fps = s.fps * (o.speed || 1);
    st.backgroundPosition = '-' + (o.frame || 0) * s.w * sc + 'px 0';
    if (s.n < 2 || !fps || reduce() || o.frame != null) return Promise.resolve();
    el._a = el.animate([{ backgroundPosition: '0px 0' }, { backgroundPosition: '-' + (loop ? s.n : s.n - 1) * s.w * sc + 'px 0' }], { duration: (s.n / fps) * 1000, easing: loop ? 'steps(' + s.n + ', end)' : 'steps(' + s.n + ', jump-none)', iterations: loop ? Infinity : 1, fill: 'forwards' });
    return loop ? Promise.resolve() : el._a.finished.then(() => {}, () => {});
  }
  // markup: <span class="sp">, started by the observer below
  function html(ch, an, o) {
    o = o || {}; const s = strip(ch, an); if (!s) return ''; const sc = o.scale || 2;
    const at = Object.entries(o.attrs || {}).map(([k, v]) => ' ' + k + '="' + String(v).replace(/"/g, '&quot;') + '"').join('');
    return '<span class="sp ' + (o.cls || '') + '" data-ch="' + ch + '" data-an="' + an + '" data-sc="' + sc + '"' + (o.frame != null ? ' data-frame="' + o.frame + '"' : '') + (o.loop === false ? ' data-once="1"' : '') + at + ' style="width:' + s.w * sc + 'px;height:' + s.h * sc + 'px;background-image:url(' + s.url + ');background-size:' + s.w * s.n * sc + 'px ' + s.h * sc + 'px"></span>';
  }
  function startEl(el) {
    if (el.dataset.on) return; el.dataset.on = '1'; const fr = el.dataset.frame;
    setAnim(el, el.dataset.an, { frame: fr != null ? +fr : undefined, loop: el.dataset.once ? false : undefined });
  }
  function hydrate(root) { if (root.classList && root.classList.contains('sp')) startEl(root); if (root.querySelectorAll) root.querySelectorAll('.sp:not([data-on])').forEach(startEl); }
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) hydrate(n); }))).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => hydrate(document));

  const pickChar = (pref) => (MK.CH[pref] ? pref : MK.chars[Math.floor(Math.random() * MK.chars.length)]);
  const crit = () => MK.critters || [];
  const anyChar = () => { const all = MK.chars.concat(crit()); return all[Math.floor(Math.random() * all.length)]; };
  // tiny portrait for toasts / avatars: kind 'ok' | 'err'
  function mood(id, kind, o) {
    o = o || {}; const isC = crit().indexOf(id) >= 0;
    return html(id, isC ? 'cface' : 'face', { scale: 1, frame: kind === 'err' ? (isC ? 1 : 2) : (isC ? 0 : 1), cls: o.cls || '', attrs: o.attrs });
  }
  window.Monkey = { mood, anyChar, crit, strip, url, html, setAnim, hydrate, pickChar, names: MK.chars, CH: MK.CH, CRIT: MK.CRIT, anims: A };
})();
