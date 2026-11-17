(async () => {
  'use strict';
  if (!(await window.__licenseReady)) return; // locked — license.js shows the activation overlay
  const FULL = new URLSearchParams(location.search).has('full');
  document.body.classList.toggle('full', FULL);
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- storage ---------- */
  const SYNC_KEYS = ['sheetLists', 'sheetSrc', 'detect', 'sheet', 'sheetMeta', 'prefs', 'tpl', 'cc', 'laptop', 'hdr', 'snd', 'hangVar', 'well'];
  const db = await chrome.storage.local.get(null);
  try { chrome.storage.sync.remove(['desk', 'sheetKey']).catch(() => {}); } catch (e) {} // secrets are never kept in the Chrome account
  try { // a fresh install picks its settings back up from the Chrome account
    const remote = await chrome.storage.sync.get(SYNC_KEYS);
    for (const k of SYNC_KEYS) if (!(k in db) && k in remote) { db[k] = remote[k]; chrome.storage.local.set({ [k]: remote[k] }); }
  } catch (e) {}
  const get = (k, d) => (k in db ? db[k] : d);
  const set = (k, v) => { db[k] = v; chrome.storage.local.set({ [k]: v }); if (SYNC_KEYS.includes(k)) { try { chrome.storage.sync.set({ [k]: v }).catch(() => {}); } catch (e) {} } };
  chrome.storage.onChanged.addListener((ch, area) => { if (area !== 'local') return; for (const [k, v] of Object.entries(ch)) db[k] = v.newValue; });
  // The secret key lives in its own key so no form can overwrite it. Old installs kept it inside "sheet".
  if (get('sheet', {}).token) { if (!get('sheetKey', '')) set('sheetKey', get('sheet', {}).token); const { token, ...rest } = get('sheet', {}); set('sheet', rest); }

  /* ---------- helpers ---------- */
  const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysAgo = (iso) => (iso ? Math.floor((Date.now() - new Date(iso)) / 864e5) : null);
  const ago = (iso) => { const d = daysAgo(iso); return d == null ? 'never' : d < 1 ? 'today' : d < 14 ? `${d}d ago` : d < 60 ? `${Math.round(d / 7)}w ago` : `${Math.round(d / 30)}mo ago`; };
  const initials = (n) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const fmtMs = (ms) => { const m = Math.round(ms / 60000); return m < 1 ? '<1 min' : m < 90 ? `${m} min` : `${(m / 60).toFixed(1)} h`; };
  const toIntl = (p, cc) => { const d = String(p).replace(/\D/g, '').replace(/^0+/, ''); return d.length <= 10 ? cc + d : d; };
  const P = {
    phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    chat: 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
    sms: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z',
    mail: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    cloud: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z',
    down: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z', play: 'M8 5v14l11-7z', stop: 'M6 6h12v12H6z',
    scan: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
    chart: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
    next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z', more: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    retry: 'M17.65 6.35A7.958 7.958 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A5.99 5.99 0 0 1 12 18a6 6 0 1 1 0-12c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    expand: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
    hang: 'M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z',
  };
  Object.assign(P, {
    calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z',
    users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    bolt: 'M7 2v11h3v9l7-12h-4l4-8z',
    clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    trend: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    table: 'M3 3h18v18H3V3zm2 4v3h6V7H5zm8 0v3h6V7h-6zM5 12v3h6v-3H5zm8 0v3h6v-3h-6z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    filter: 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z',
    link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
    mute: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z',
  });
  Object.assign(P, {
    moon: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
    sun: 'M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
  });
  const ic = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="${P[n]}"/></svg>`;
  const COL = { Contact: '#2F8F5B', Active: '#2F8F5B', Inactive: '#C98A0B', Low: '#C4453C', New: '#3B6EA5', Check: '#C4453C', Listed: '#2D6A4F' };
  const ORDER = ['Active', 'Low', 'Inactive', 'Never rode', 'New', 'Listed', 'Check'];

  const viaWorker = (msg) => new Promise((res) => { try { chrome.runtime.sendMessage(msg, (x) => res(chrome.runtime.lastError ? null : x)); } catch (e) { res(null); } });
  async function http(url, { method = 'GET', headers, body, timeout = 8000 } = {}) {
    if (/^https?:\/\/(\d{1,3}\.){3}\d{1,3}[:/]/.test(url)) { const r = await viaWorker({ type: 'http', url, method, headers, body, timeout }); if (r) return r; }
    const c = new AbortController(), t = setTimeout(() => c.abort(), timeout);
    try { const r = await fetch(url, { method, headers, body, signal: c.signal }); return { ok: true, status: r.status, text: await r.text() }; }
    catch (e) { return { ok: false, error: e.name === 'AbortError' ? 'timed out' : e.message }; }
    finally { clearTimeout(t); }
  }
  // "Does anything answer at this address?" Works even when the reply cannot be read.
  async function probe(url) {
    const r = await viaWorker({ type: 'probe', url, timeout: 4000 }); if (r) return !!r.ok;
    try { await fetch(url, { mode: 'no-cors', signal: AbortSignal.timeout(4000) }); return true; } catch (e) { return false; }
  }

  /* ---------- static icons + phone dial ---------- */
  const css = document.documentElement.style;
  css.setProperty('--vine', `url(${Monkey.url('vine')})`); css.setProperty('--scene', `url(${Monkey.url('jungle', 128, 58, document.documentElement.dataset.pal)})`);
  q('.logo').innerHTML = Monkey.html('bongo', 'face', { scale: 1, frame: 0 });
  q('#full').innerHTML = ic('expand', 19); if (FULL) q('#full').hidden = true;
  q('#tb-results').innerHTML = `${ic('users', 17)}Contacts<span class="bdg" id="rcount"></span>`;
  q('#tb-calls').innerHTML = `${ic('phone', 17)}Calls`;
  q('#tb-setup').innerHTML = `${ic('tune', 17)}Setup`;
  q('#rexp').innerHTML = `${ic('down', 16)}<span>Export</span>`; q('#rsync').innerHTML = `${ic('cloud', 16)}<span>Send to sheet</span>`;
  q('#cclose').innerHTML = ic('close', 20); q('#rptBtn').innerHTML = ic('chat', 18);
  qa('[data-i]').forEach((el) => (el.innerHTML = ic(el.dataset.i, el.classList.contains('ci') ? 20 : 17)));
  q('#imp').innerHTML = `${ic('upload', 16)}<span>Import CSV</span>`; q('#cfBtn').innerHTML = ic('filter'); q('#imx').innerHTML = ic('close', 20);
  q('#full').onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('app.html?full=1') });
  const setTheme = (t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem('rd-theme', t); } catch (e) {} q('#theme').innerHTML = ic(t === 'dark' ? 'sun' : 'moon', 19); };
  q('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  setTheme(document.documentElement.dataset.theme || 'light');

  /* ---------- illustrations ---------- */
  const mkc = () => Monkey.pickChar('random'), one = (a) => a[Math.floor(Math.random() * a.length)];
  const ILLU = {
    get phone() { return one([() => `<div class="art">${Monkey.html(mkc(), 'sleep', { scale: 2, cls: 'mkx', attrs: { 'data-k': 'sleep' } })}</div>`, () => `<div class="art">${Monkey.html('sloth', 'sloth_sleep', { scale: 2, cls: 'mkx', attrs: { 'data-k': 'sloth' } })}</div>`])(); },
    get sheet() { return one([() => `<div class="art">${Monkey.html(mkc(), 'rideIdle', { scale: 1, cls: 'mkx', attrs: { 'data-k': 'ride' } })}</div>`, () => `<div class="art">${Monkey.html('parrot', 'parrot_perch', { scale: 2, cls: 'mkx', attrs: { 'data-k': 'parrot' } })}</div>`, () => `<div class="art">${Monkey.html('cham', 'cham_idle', { scale: 2, cls: 'mkx', attrs: { 'data-k': 'cham' } })}</div>`])(); },
    get done() { return one([() => `<div class="art hop">${Monkey.html(mkc(), 'cheer', { scale: 2, cls: 'mkx', attrs: { 'data-k': 'cheer' } })}${Monkey.html('bongo', 'banana', { scale: 2 })}</div>`, () => `<div class="art">${Monkey.html('toucan', 'toucan_laugh', { scale: 2, cls: 'mkx', attrs: { 'data-k': 'toucan' } })}</div>`])(); },
    get vine() { return one([() => `<div class="art"><div class="vine"><div class="cl">${Monkey.html(mkc(), 'climb', { scale: 1, cls: 'mkx', attrs: { 'data-k': 'climb' } })}</div></div></div>`, () => `<div class="art">${Monkey.html('sloth', 'sloth_hang', { scale: 2, cls: 'mkx', attrs: { 'data-k': 'sloth' } })}</div>`])(); },
  };
  const hue = (s) => { let h = 0; for (const ch of String(s || '?')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const emptyHtml = (title, sub, actions) => `<div class="empty">${ILLU.phone}<b>${title}</b><span>${sub}</span><div class="row">${actions}</div></div>`;
  const loadBtn = () => (sheetOk() ? '<button class="btn sm ink" data-load>Load from sheet</button>' : '');

  /* ---------- state ---------- */
  const S = {
    results: [], meta: null, running: false, paused: false, tab: 'calls', rv: 'list',
    called: get('called', {}), sheetErr: '',
    run: { pages: [], t0: 0, checked: 0, failed: 0, pct: 0, eta: null, pg: '–', pi: 0, pn: 0 },
  };
  const R = { f: 'all', s: '', sort: 'added', limit: 80 };
  const Cl = { f: 'all', s: '', sort: 'added', limit: 40, c: 'todo' };
  const loadResults = () => { const sv = get('results4', null); S.results = sv?.rows ? sv.rows.slice() : []; S.meta = sv?.meta || null; };
  loadResults();
  const tagOf = (r) => { const c = S.called[r.phone]; return !c || c.outcome === 'note' ? null : c.outcome === 'noanswer' ? 'no' : 'ans'; };

  /* ---------- config forms ---------- */
  let savedT = null;
  function savedHint() { clearTimeout(savedT); savedT = setTimeout(() => toast('Saved'), 700); }
  function bind(key, defaults, map) {
    const cur = { ...defaults, ...get(key, {}) };
    for (const [f, sel] of Object.entries(map)) { const el = q(sel); if (el.type === 'checkbox') el.checked = !!cur[f]; else el.value = cur[f] ?? ''; }
    const save = () => {
      const o = {};
      for (const [f, sel] of Object.entries(map)) { const el = q(sel); o[f] = el.type === 'checkbox' ? el.checked : el.value.trim(); }
      set(key, { ...get(key, {}), ...o }); readiness(); savedHint();
    };
    for (const sel of Object.values(map)) { q(sel).addEventListener('input', save); q(sel).addEventListener('change', save); }
  }
  bind('desk', { on: false, ip: '', pass: '', prefix: '' }, { on: '#dpOn', ip: '#dpIp', pass: '#dpPass', prefix: '#dpPre' });
  bind('detect', { on: true, path: 'api-get_line_status', conn: '(talk|connect|establish|in.?call|active)', ring: '(ring|dial|calling|alert|outgoing|proceed)' }, { on: '#detOn', path: '#stPath', conn: '#reConn', ring: '#reRing' });
  bind('sheet', { url: '' }, { url: '#shUrl' });
  bind('laptop', { ip: '' }, { ip: '#lapIp' });
  bind('join', { on: false, dial: false, pbx: '', ext: '210', code: '*56' }, { on: '#jnOn', dial: '#jnDial', pbx: '#jnPbx', ext: '#jnExt', code: '#jnCode' });
  const desk = () => get('desk', {}), det = () => get('detect', {}), sheetCfg = () => get('sheet', {}), sheetKey = () => get('sheetKey', '');
  // Pasting the whole `const TOKEN = '...';` line (or the whole script) works too.
  const cleanKey = (v) => { const m = /TOKEN\s*=\s*['"]([^'"]+)['"]/.exec(v); return (m ? m[1] : v).trim().replace(/^['"]|['"]$/g, ''); };
  q('#shKey').value = sheetKey();
  q('#shKey').addEventListener('input', () => { set('sheetKey', cleanKey(q('#shKey').value)); S.sheetErr = ''; set('sheetMeta', null); readiness(); savedHint(); });
  q('#shKey').addEventListener('change', () => { q('#shKey').value = sheetKey(); });
  q('#shUrl').addEventListener('change', () => { set('sheetMeta', null); S.sheetErr = ''; sheetUi(); });
  q('#tpl').value = get('tpl', 'Hello {name}, I tried to reach you by phone. Please call me back when you have a moment.');
  q('#cc').value = get('cc', '');

  function sheetUi() {
    const m = get('sheetMeta', null), url = sheetCfg().url, box = q('#shLinked');
    box.className = 'shl' + (url && m && !S.sheetErr ? '' : ' off');
    box.innerHTML = !url ? 'Not linked' : S.sheetErr ? esc(S.sheetErr) : m ? `${ic('cloud')}<span><b>${esc(m.name)}</b> · tab “${esc(m.tab)}”</span><a href="${esc(m.url)}" target="_blank" rel="noopener">Open</a>` : 'Press Test to see which sheet this is';
  }
  function readiness() {
    const mk = (id, cls, t, label, icon) => { const el = q(id); el.className = 'rdy ' + cls; el.title = t; el.innerHTML = `${ic(icon, 17)}<span class="lb">${esc(label)}</span><i></i>`; };
    const d = desk(); mk('#rd-ph', d.on && d.ip && d.pass ? 'ok' : '', d.on ? 'Desk phone on' : 'Desk phone off (Setup)', 'Phone', 'phone');
    const url = sheetCfg().url, m = get('sheetMeta', null);
    mk('#rd-sh', url && m && !S.sheetErr ? 'ok' : url ? 'warn' : '', url ? (m ? `Linked: ${m.name}` : 'Press Test in Setup') : 'Sheet not linked (Setup)', url && m ? m.name : 'Sheet', 'table');
    const b1 = q('#b-dp'), b2 = q('#b-sh');
    b1.textContent = d.on && d.ip ? 'On' : 'Off'; b1.className = 'badge' + (d.on && d.ip ? ' ok' : '');
    b2.textContent = S.sheetErr ? 'Check key' : url ? (m ? 'Linked' : 'Untested') : 'Not linked'; b2.className = 'badge' + (url && m && !S.sheetErr ? ' ok' : '');
    q('#rsync').hidden = !url; sheetUi(); if (S.tab === 'results') renderSheetPanel();
  }
  /* ---------- tabs ---------- */
  function fresh(sel) { const v = q(sel); v.classList.remove('fresh'); void v.offsetWidth; v.classList.add('fresh'); setTimeout(() => v.classList.remove('fresh'), 1400); }
  const TABS = ['results', 'calls', 'setup'];
  function showTab(t) {
    S.tab = t;
    TABS.forEach((x) => (q('#v-' + x).hidden = x !== t));
    qa('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    q('.tabs').dataset.on = t;
    q('#ind').style.transform = `translateX(${TABS.indexOf(t) * 100}%)`;
    fresh('#v-' + t);
    if (t === 'results') renderResults();
    if (t === 'calls') renderCalls();
    if (t === 'setup') { renderPrev(); renderAcct(); }
  }
  qa('.tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.t)));
  qa('[data-go]').forEach((b) => (b.onclick = () => showTab(b.dataset.go)));

  /* ---------- account + permission checklist ---------- */
  function renderAcct() {
    const L = window.license, u = L.user, box = q('#acct'); if (!box) return;
    const left = u.expiresAt ? Math.ceil((u.expiresAt - Date.now()) / 864e5) : null;
    const until = u.expiresAt ? `Access until ${new Date(u.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}${left > 0 ? ' · ' + left + ' day' + (left === 1 ? '' : 's') + ' left' : ''}` : 'No expiry date';
    box.innerHTML = `<div class="who"><span class="pic mkx" data-k="logo">${Monkey.html('bongo', 'faceBlink', { scale: 1 })}</span><div><b>${esc(u.name || u.email || 'Your account')}</b><small>${esc(u.email || '')}${u.email ? ' · ' : ''}${esc(until)}</small></div><button class="btn sm" id="signOut">Sign out</button></div>`;
    q('#signOut').onclick = () => window.license.signOut();
    const n = (get('water', {}).date === fmtD(new Date()) ? get('water', {}).n : 0) || 0, wc = q('#waterCount'); if (wc) wc.textContent = n ? `Glasses of water today: ${n}` : 'No water logged today yet.';
  }
  setInterval(() => { if (S.tab === 'setup') renderAcct(); }, 60000);

  /* ---------- status model ---------- */
    const isFail = () => false;
  const statusOf = () => 'Contact';
  const cc = () => (q('#cc').value || '').replace(/\D/g, '');
  const firstName = (n) => { const w = (n || '').split(/\s+/)[0] || ''; return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); };
  const msgFor = (r) => q('#tpl').value.replace(/\{fullname\}/gi, r.name).replace(/\{name\}/gi, firstName(r.name));
  const waLink = (r) => `https://wa.me/${toIntl(r.phone, cc())}?text=${encodeURIComponent(msgFor(r))}`;
  const smsLink = (r) => `sms:+${toIntl(r.phone, cc())}?body=${encodeURIComponent(msgFor(r))}`;
  const renderPrev = () => { q('#prev').textContent = msgFor(S.results.find((r) => !r.skipped) || { name: 'Sam Example' }); };
  q('#tpl').oninput = () => { set('tpl', q('#tpl').value); renderPrev(); };
  q('#cc').oninput = () => { set('cc', q('#cc').value); renderPrev(); };

  let toastT;
  function toast(m, err) { const t = q('#toast'); t.innerHTML = `<span class="tf">${Monkey.mood(Monkey.anyChar(), err ? 'err' : 'ok')}</span><span class="tm"></span>`; t.querySelector('.tm').textContent = m; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), err ? 7000 : 3200); }
  const logEl = q('#log');
  const log = (m) => { logEl.textContent += `[${new Date().toLocaleTimeString()}] ${m}\n`; logEl.scrollTop = logEl.scrollHeight; };

  /* =====================================================================
     RESULTS TAB
  ===================================================================== */
  const SORTS = {
    added: () => 0,
    recent: (a, b) => ((S.called[b.phone] || {}).ts || 0) - ((S.called[a.phone] || {}).ts || 0),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  function rowsFor(x) {
    const s = x.s.trim().toLowerCase(), isNum = /^[\d\s+()-]+$/.test(s), dg = s.replace(/\D/g, '');
    return S.results.filter((r) => {
      const t = tagOf(r);
      return (x.f === 'all' || statusOf(r) === x.f || r.change === x.f) &&
        (!x.c || x.c === 'all' || (x.c === 'todo' && !t) || (x.c === 'ans' && t === 'ans') || (x.c === 'no' && t === 'no')) &&
        (!s || r.name.toLowerCase().includes(s) || (isNum && dg && r.phone.replace(/\D/g, '').includes(dg)));
    }).sort(SORTS[x.sort]);
  }
  function counts() { const c = {}; S.results.forEach((r) => { const s = statusOf(r); c[s] = (c[s] || 0) + 1; if (r.change) c[r.change] = (c[r.change] || 0) + 1; }); return c; }
  function chipsHtml() { return ''; }
  const kpiHtml = (arr) => arr.map(([n, l, s, col, ico]) => `<div class="kpi" style="--c:${col}">${ico ? `<span class="ki">${ic(ico, 22)}</span>` : ''}<b>${n}</b><span>${l}</span><em>${s}</em></div>`).join('');

  function renderSheetPanel() {
    const url = sheetCfg().url, m = get('sheetMeta', null), ok = url && m && !S.sheetErr, pend = get('pending', []).length;
    const logged = Object.values(S.called).filter((c) => c.outcome !== 'note').length;
    const box = q('#shPanel'); box.className = 'shp' + (!url ? ' off' : !ok ? ' warn' : '');
    if (!url) { box.innerHTML = `${ILLU.sheet}<div class="sh1"><div><b>Connect your Google Sheet</b><small>Load contacts from it and log every answered call back.</small></div></div><div class="sha"><button class="btn sm ink" data-go="setup">Link a sheet</button></div>`; }
    else box.innerHTML = `<div class="sh1"><span class="ci">${ic('table', 20)}</span><div><b>${ok ? esc(m.name) : 'Google Sheet'}</b><small>${ok ? 'Tab “' + esc(m.tab) + '” · connected' : esc(S.sheetErr || 'Not tested yet')}</small></div></div>
      <div class="shs"><div><b>${S.results.length}</b><span>Contacts here</span></div><div><b>${logged}</b><span>Logged calls</span></div><div><b>${pend}</b><span>Waiting to send</span></div></div>
      <div class="sha">${ok ? `<button class="btn sm ink" id="shLoad">Load from sheet</button><a class="btn sm" href="${esc(m.url)}" target="_blank" rel="noopener">Open sheet</a>` : '<button class="btn sm ink" data-go="setup">Fix in Setup</button>'}<button class="btn sm" id="shRecheck">${pend ? 'Send queued now' : 'Check link'}</button></div>`;
    qa('#shPanel [data-go]').forEach((b) => (b.onclick = () => showTab('setup')));
    const sl = q('#shLoad'); if (sl) sl.onclick = () => openLoad();
    renderListChips();
    const rc = q('#shRecheck'); if (rc) rc.onclick = async () => { rc.disabled = true; await verifySheet(true); await flushPending(); renderSheetPanel(); };
  }
  function renderResults() {
    renderSheetPanel();
    const all = S.results, total = all.length;
    q('#rcount').textContent = total || ''; q('#sub').textContent = total ? `${total} contacts ready` : 'Import a CSV to begin';
    const rows = rowsFor(R), shown = rows.slice(0, R.limit);
    if (!total) {
      q('#kpis').innerHTML = '';
      q('#pipe').hidden = true;
      q('#rtable').innerHTML = emptyHtml('No contacts yet', sheetOk() ? 'Pull them from your sheet, or import a CSV file.' : 'Link a Google Sheet in Setup, or import a CSV file.', `${loadBtn()}<button class="btn sm" data-imp>Import a CSV</button>`);
      q('#rmore').hidden = true; return;
    }
    const ans = all.filter((r) => tagOf(r) === 'ans').length, no = all.filter((r) => tagOf(r) === 'no').length;
    const pct = (n) => (total ? (n / total) * 100 : 0), reached = ans + no;
    q('#pipe').hidden = false;
    q('#pipe').innerHTML = `<div class="ph1"><b>${reached} of ${total} contacts reached</b><span>${Math.round(pct(reached))}%</span></div>
      <div class="stack"><i class="a" style="width:${pct(ans)}%"></i><i class="n" style="width:${pct(no)}%"></i></div>
      <div class="pleg"><span style="--c:var(--ok)"><i></i>${ans} answered</span><span style="--c:var(--am)"><i></i>${no} no answer</span><span style="--c:var(--ln)"><i></i>${total - reached} still to call</span></div>`;
    q('#kpis').innerHTML = kpiHtml([
      [total, 'Contacts', '', '#2D6A4F', 'users'], [ans, 'Answered', '', COL.Active, 'check'],
      [no, 'Not answered', '', '#C98A0B', 'close'], [total - ans - no, 'To call', '', '#3B6EA5', 'phone'],
    ]);
    q('#rtable').innerHTML = `<div class="th c3"><span>Contact</span><span>Result</span><span>Talk</span></div>` +
      (shown.length ? shown.map((r) => {
        const t = tagOf(r), c = S.called[r.phone];
        return `<div class="tr c3"><div class="rw"><b>${esc(r.name)}</b><small>${esc(r.phone)}</small></div>
          <div class="tt">${t === 'ans' ? 'Answered' : t === 'no' ? 'No answer' : '–'}</div><div class="ls">${c && c.talk ? mmss(c.talk) : '–'}</div></div>`;
      }).join('') : '<div class="empty">No contacts match.</div>');
    q('#rmore').hidden = rows.length <= shown.length; q('#rmore').textContent = `Show ${Math.min(80, rows.length - shown.length)} more`;
  }
  q('#rsearch').oninput = (e) => { R.s = e.target.value; R.limit = 80; renderResults(); };
  q('#rsort').onchange = (e) => { R.sort = e.target.value; renderResults(); };
  q('#rmore').onclick = () => { R.limit += 80; renderResults(); };
  q('#load').onclick = () => { loadResults(); renderResults(); toast(`Loaded ${S.results.length} saved contacts`); };
  q('#clear').onclick = () => { if (!confirm('Clear all contacts? Call tags are kept.')) return; S.results = []; S.meta = null; set('results4', { meta: null, rows: [] }); renderResults(); renderCalls(); };

  const HEAD = ['Sn', 'Name', 'Phone', 'Call Status', 'Called At', 'Talk Time (s)', 'Remark', 'Called By'];
  const whoAmI = () => { const n = String((get('prefs', {}) || {}).by || '').trim(); if (n) return n; try { return window.license.user.email || ''; } catch (e) { return ''; } };
  const hdrOn = () => true; // CSV export always includes the header row
  const sheetRow = (r) => [r.name, r.phone];
  const fullRow = (r, n) => { const c = S.called[r.phone], t = tagOf(r), rm = c?.remark || '', by = whoAmI(); return [n + 1, r.name, r.phone].concat(!c || t === null ? ['', '', '', rm, ''] : [c.label || defLabel(c), fmtD(new Date(c.ts)), t === 'no' ? 0 : c.talk || 0, rm, by]); };
  const csvEsc = (v) => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  q('#rexp').onclick = () => {
    if (!window.license.can('exportData')) return toast('Exporting is not enabled for your account.', 1);
    const rows = rowsFor(R); if (!rows.length) return toast('Nothing to export yet.', 1);
    const csv = [...(hdrOn() ? [HEAD] : []), ...rows.map((r, n) => fullRow(r, n))].map((r) => r.map(csvEsc).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const m = S.meta || { from: '', to: '' }; a.download = `contacts_${m.from}_to_${m.to}.csv`; document.body.appendChild(a); a.click(); a.remove();
  };

  /* ---------- CSV import ---------- */
  const IM = { rows: [], mode: 'add' };
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], cell = '', inQ = false;
    const endRow = () => { row.push(cell); cell = ''; if (row.some((c) => c.trim() !== '')) rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch; }
      else if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; endRow(); }
      else cell += ch;
    }
    endRow(); return rows;
  }
  const imHeads = () => { const hdr = q('#imHdr').checked; return (IM.rows[0] || []).map((h, i) => (hdr && String(h).trim() ? String(h).trim() : `Column ${i + 1}`)); };
  function importRecords() {
    const hdr = q('#imHdr').checked, heads = imHeads(), pi = +q('#imPhone').value, ni = +q('#imName').value, mi = +q('#imMail').value;
    const out = [], seen = new Set(); let skipped = 0;
    for (const row of IM.rows.slice(hdr ? 1 : 0)) {
      const phone = String(row[pi] ?? '').trim(), key = phone.replace(/\D/g, '').slice(-10);
      if (key.length < 7 || seen.has(key)) { skipped++; continue; } seen.add(key);
      const extra = {}; heads.forEach((h, i) => { if (i !== pi && i !== ni && i !== mi && String(row[i] ?? '').trim()) extra[h] = String(row[i]).trim(); });
      out.push({ name: ni >= 0 ? String(row[ni] ?? '').trim() || phone : phone, phone, email: mi >= 0 ? String(row[mi] ?? '').trim() : '', note: '', imported: true, extra });
    }
    return { out, skipped };
  }
  function renderImPrev() {
    const { out, skipped } = importRecords();
    q('#imprev').innerHTML = out.length ? `<b>${out.length} contacts ready${skipped ? ` · ${skipped} skipped` : ''}</b>` + out.slice(0, 3).map((r) => `<div><span>${esc(r.name)}</span><span>${esc(r.phone)}</span></div>`).join('') : '<b>No valid phone numbers in that column.</b>';
    q('#imgo').disabled = !out.length;
  }
  function fillImSelects() {
    const heads = imHeads(), opts = heads.map((h, i) => `<option value="${i}">${esc(h)}</option>`).join('');
    q('#imPhone').innerHTML = opts; q('#imName').innerHTML = '<option value="-1">— none —</option>' + opts; q('#imMail').innerHTML = '<option value="-1">— none —</option>' + opts;
    const find = (re) => heads.findIndex((h) => re.test(h));
    let ph = find(/phone|mobile|contact|cell|tel|number|whatsapp/i);
    if (ph < 0) { // pick the column where most values look like phone numbers
      const body = IM.rows.slice(q('#imHdr').checked ? 1 : 0, 40); let bc = 0;
      heads.forEach((_, i) => { const c = body.filter((r) => String(r[i] || '').replace(/\D/g, '').length >= 7).length; if (c > bc) { bc = c; ph = i; } });
    }
    if (ph >= 0) q('#imPhone').value = ph;
    q('#imName').value = find(/name|contact|customer|full/i); q('#imMail').value = find(/mail/i);
    renderImPrev();
  }
  function openImport(file) {
    if (!window.license.can('importContacts')) return toast('Importing contacts is not enabled for your account.', 1);
    file.text().then((t) => {
      IM.rows = parseCSV(t); IM.mode = 'add';
      if (!IM.rows.length) return toast('That file looks empty.', 1);
      qa('#imMode button').forEach((x) => x.classList.toggle('on', x.dataset.m === 'add'));
      q('#imfile').textContent = `${file.name} · ${IM.rows.length} rows`; q('#imHdr').checked = true; fillImSelects(); q('#im').hidden = false;
    });
  }
  q('#imp').onclick = () => q('#csvFile').click();
  document.addEventListener('click', (e) => { if (e.target.closest('[data-imp]')) q('#csvFile').click(); if (e.target.closest('[data-load]')) openLoad(); });
  q('#csvFile').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) openImport(f); };
  q('#imx').onclick = () => (q('#im').hidden = true);
  q('#imHdr').onchange = fillImSelects;
  ['#imPhone', '#imName', '#imMail'].forEach((id) => (q(id).onchange = renderImPrev));
  qa('#imMode button').forEach((b) => (b.onclick = () => { IM.mode = b.dataset.m; qa('#imMode button').forEach((x) => x.classList.toggle('on', x === b)); }));
  q('#imgo').onclick = () => {
    const { out } = importRecords(); if (!out.length) return;
    const k10 = (r) => r.phone.replace(/\D/g, '').slice(-10); let added = out;
    if (IM.mode === 'replace') { S.results = out; S.meta = null; }
    else { const have = new Set(S.results.map(k10)); added = out.filter((r) => !have.has(k10(r))); S.results = S.results.concat(added); }
    set('results4', { meta: S.meta, rows: S.results });
    q('#im').hidden = true; Cl.c = 'todo'; Cl.f = 'all'; R.f = 'all';
    q('#rcount').textContent = S.results.length || '';
    showTab('calls'); toast(`Imported ${added.length} contacts. Ready to call.`);
  };

  /* =====================================================================
     GOOGLE SHEET
  ===================================================================== */
  const KEYFIX = 'Wrong key. In your Apps Script, copy the text between the quotes after const TOKEN and paste it in the Secret key field.';
  const SHEET_URL = /^https:\/\/script\.google\.com\/(a\/macros\/[\w.-]+|macros)\/s\/[\w-]+\/exec$/;
  async function postSheet(body) {
    if (!window.license.can('sheetLog')) return { ok: false, error: 'Sheet logging is not enabled for your account.' };
    const s = sheetCfg(); if (!s.url) return null;
    if (!SHEET_URL.test(s.url)) return { ok: false, error: 'That is not a Google Apps Script web app URL (it should start with https://script.google.com/ and end in /exec).' };
    if (!sheetKey()) return { ok: false, error: 'Enter the Secret key from your script (or press Copy script to make a new one).' };
    // Calls are logged on the tab contacts were loaded from, found by that tab's own header names.
    if (['called', 'note', 'sync'].includes(body.action) && body.tab === undefined) { const src = get('sheetSrc', null); if (src?.tab) Object.assign(body, { tab: src.tab, phoneH: src.phoneH, nameH: src.nameH || '', emailH: src.emailH || '' }); }
    if (body.action === 'called' && !body.by) body.by = whoAmI();
    const r = await http(s.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: sheetKey(), ...body }), timeout: 30000 });
    if (!r.ok) return { ok: false, error: r.error, net: true };
    let j; try { j = JSON.parse(r.text); } catch (e) { return { ok: false, error: 'Unexpected reply. Deploy with access “Anyone” and use the URL ending in /exec.' }; }
    if (!j.ok && /secret key/i.test(j.error || '')) { j.error = KEYFIX; j.key = true; }
    if (!j.ok && /unknown action/i.test(j.error || '')) j.error = 'Your sheet script is older than the app. Copy script, paste it over the old one, then Deploy › Manage deployments › New version (one time).';
    return j;
  }
  async function verifySheet(quiet) {
    if (!sheetCfg().url || !sheetKey()) return;
    const r = await postSheet({ action: 'ping' });
    if (r?.ok && (r.v || 1) < 3) S.sheetErr = 'Your sheet script is older than the app. Copy script, paste it over the old one, then Deploy › Manage deployments › New version (one time).';
    else if (r?.ok) { S.sheetErr = ''; set('sheetMeta', { name: r.name || 'Your sheet', tab: r.tab, url: r.url || '#' }); }
    else if (r?.key) S.sheetErr = KEYFIX;
    else if (r && !r.net) S.sheetErr = r.error;
    readiness();
    if (!quiet) q('#shMsg').textContent = r?.ok ? '' : r?.error || '';
    return r;
  }
  async function flushPending() {
    const list = get('pending', []); if (!list.length || !sheetCfg().url) return;
    const left = []; for (const b of list) { const r = await postSheet(b); if (!r?.ok) left.push(b); }
    set('pending', left); if (list.length > left.length) toast(`${list.length - left.length} queued call(s) saved to the sheet`);
  }
  q('#shCopy').onclick = async () => {
    let token = cleanKey(q('#shKey').value) || sheetKey();
    if (!token) token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    set('sheetKey', token); q('#shKey').value = token;
    const code = (await (await fetch(chrome.runtime.getURL('sheet/Code.gs'))).text()).replace('__TOKEN__', token);
    try { await navigator.clipboard.writeText(code); toast('Script copied. Paste it in Apps Script, Save, then Deploy a new version.'); }
    catch (e) { toast('The browser blocked copying. Click this panel and try again.', 1); }
  };
  q('#shNew').onclick = () => chrome.tabs.create({ url: 'https://sheets.new' });
  q('#shTest').onclick = async () => {
    if (!sheetCfg().url) { q('#shMsg').textContent = 'Paste the Web app URL first.'; return; }
    if (!sheetKey()) { q('#shMsg').textContent = 'Enter the Secret key first.'; return; }
    q('#shMsg').textContent = 'Testing…';
    const r = await verifySheet(); q('#shMsg').textContent = r?.ok ? 'Connected ✓' : r?.error || '';
  };
  q('#rsync').onclick = async () => {
    const rows = rowsFor(R).map(sheetRow); if (!rows.length) return toast('Nothing to send.', 1);
    const btn = q('#rsync'); btn.classList.add('spin'); btn.disabled = true;
    let added = 0, updated = 0;
    for (let i = 0; i < rows.length; i += 150) {
      const r = await postSheet({ action: 'sync', rows: rows.slice(i, i + 150) });
      if (!r?.ok) { toast('Sheet error: ' + (r?.error || 'unknown'), 1); break; }
      added += r.added; updated += r.updated;
    }
    btn.classList.remove('spin'); btn.disabled = false;
    if (added + updated) toast(`Sheet updated · ${added} new, ${updated} refreshed`);
  };

  /* =====================================================================
     LOAD CONTACTS FROM THE SHEET
     tab -> columns (auto-detected) -> rules (pick values from what is really in the column)
     -> live count -> load. A setup can be saved as a quick list and re-run in one tap.
  ===================================================================== */
  const SL = { headers: [], rows: [], cfg: null, find: {}, total: 0, truncated: false };
  const norm = (v) => String(v ?? '').trim().toLowerCase();
  const hIdx = (h) => (h ? SL.headers.indexOf(h) : -1);
  const digits10 = (p) => String(p).replace(/\D/g, '').slice(-10);
  const blankCfg = (tab) => ({ tab, phoneH: '', nameH: '', emailH: '', rules: [], skipCalled: true, snFrom: '', snTo: '', mode: 'replace' });
  const CALLCOLS = ['sn', 'call status', 'called', 'called at', 'talk time (s)', 'remark', 'called by'];
  const isAgain = (v) => /^call\s*again$/i.test(String(v).trim());
  // If a rule picks Call Status values itself, "skip already called" must not hide those rows (that made the value list empty).
  const statusRule = (cfg) => { const i = calledIdx(); return i >= 0 && (cfg.rules || []).some((r) => r.col === SL.headers[i]); };
  const skipOn = (cfg) => !!cfg.skipCalled && !statusRule(cfg);
  const calledIdx = () => { const i = SL.headers.findIndex((h) => norm(h) === 'call status'); return i >= 0 ? i : SL.headers.findIndex((h) => norm(h) === 'called'); };
  const lists = () => get('sheetLists', []);
  function sheetOk() { return !!(sheetCfg().url && sheetKey()); }

  function setSheetData(r) {
    SL.headers = (r.headers || []).map((h, i) => String(h).trim() || `Column ${i + 1}`);
    SL.rows = (r.rows || []).filter((row) => row.some((c) => String(c).trim() !== ''));
    const sni = SL.headers.findIndex((h) => norm(h) === 'sn'); SL.sn = new Map();
    SL.rows.forEach((row, i) => SL.sn.set(row, sni >= 0 && parseInt(row[sni]) > 0 ? parseInt(row[sni]) : i + 1));
    SL.total = r.total || SL.rows.length; SL.truncated = !!r.truncated;
  }
  function detectCols(cfg) {
    const H = SL.headers, body = SL.rows.slice(0, 60);
    const score = (i) => (body.length ? body.filter((r) => String(r[i] || '').replace(/\D/g, '').length >= 7).length / body.length : 0);
    const has = (h) => H.includes(h);
    if (!has(cfg.phoneH)) {
      let i = H.findIndex((h) => /phone|mobile|cell|tel|whatsapp/i.test(h));
      if (i < 0) i = H.findIndex((h) => /number|contact|no\.?$/i.test(h) && !/name/i.test(h));
      if (i < 0 || score(i) < 0.3) { let b = -1, bs = 0.3; H.forEach((_, k) => { const s = score(k); if (s > bs) { bs = s; b = k; } }); if (b >= 0) i = b; }
      cfg.phoneH = i >= 0 ? H[i] : '';
    }
    const used = () => [cfg.phoneH, cfg.nameH];
    if (!has(cfg.nameH)) { const i = H.findIndex((h) => /name|customer|client|full/i.test(h) && h !== cfg.phoneH); cfg.nameH = i >= 0 ? H[i] : ''; }
    if (!has(cfg.emailH)) { const i = H.findIndex((h) => /mail/i.test(h) && !used().includes(h)); cfg.emailH = i >= 0 ? H[i] : ''; }
  }
  const missingCols = (cfg) => [cfg.phoneH, ...cfg.rules.map((r) => r.col)].filter((h) => !h || !SL.headers.includes(h));

  function rowPasses(row, cfg, skipRule) {
    const f = parseInt(cfg.snFrom) || 0, t = parseInt(cfg.snTo) || 0;
    if (f || t) { const n = SL.sn.get(row) || 0; if ((f && n < f) || (t && n > t)) return false; }
    const ci = calledIdx();
    if (skipOn(cfg) && ci >= 0 && String(row[ci]).trim() && !isAgain(row[ci])) return false;
    for (let i = 0; i < cfg.rules.length; i++) {
      if (i === skipRule) continue;
      const r = cfg.rules[i], k = hIdx(r.col); if (k < 0) return false;
      const v = norm(row[k]);
      if (r.op === 'empty') { if (v) return false; }
      else if (r.op === 'notempty') { if (!v) return false; }
      else if (r.vals.length && !r.vals.some((x) => norm(x) === v)) return false;
    }
    return true;
  }
  function buildRecords(cfg) {
    const pi = hIdx(cfg.phoneH), ni = hIdx(cfg.nameH), mi = hIdx(cfg.emailH), ci = calledIdx();
    const ai = SL.headers.findIndex((h) => norm(h) === 'called at'), ti = SL.headers.findIndex((h) => norm(h) === 'talk time (s)'), ri = SL.headers.findIndex((h) => norm(h) === 'remark');
    const out = [], calls = {}, seen = new Set(); let skipped = 0;
    for (const row of SL.rows) {
      if (!rowPasses(row, cfg, -1)) continue;
      const phone = String(row[pi] ?? '').trim(), key = digits10(phone);
      if (key.length < 7 || seen.has(key)) { skipped++; continue; } seen.add(key);
      const extra = {};
      SL.headers.forEach((h, i) => { if (i !== pi && i !== ni && i !== mi && !CALLCOLS.includes(norm(h)) && String(row[i] ?? '').trim()) extra[h] = String(row[i]).trim(); });
      out.push({ name: ni >= 0 ? String(row[ni] ?? '').trim() || phone : phone, phone, email: mi >= 0 ? String(row[mi] ?? '').trim() : '', note: '', imported: true, extra });
      const lab = ci >= 0 ? String(row[ci]).trim() : '';
      if (lab && !isAgain(lab)) calls[phone] = { ts: Date.parse(row[ai]) || Date.now(), via: 'sheet', talk: parseInt(row[ti]) || 0, outcome: /^not\s*answered$/i.test(lab) ? 'noanswer' : 'answered', label: lab, ...(ri >= 0 && String(row[ri]).trim() ? { remark: String(row[ri]).trim() } : {}) };
    }
    const already = ci >= 0 && skipOn(cfg) ? SL.rows.filter((row) => String(row[ci]).trim() && !isAgain(row[ci]) && rowPasses(row, { ...cfg, skipCalled: false }, -1)).length : 0;
    return { out, calls, skipped, already };
  }
  function applyLoad(info, cfg, listId) {
    let added = info.out;
    if (cfg.mode === 'replace') S.results = info.out;
    else { const have = new Set(S.results.map((r) => digits10(r.phone))); added = info.out.filter((r) => !have.has(digits10(r.phone))); S.results = S.results.concat(added); }
    for (const [p, c] of Object.entries(info.calls)) if (!S.called[p]) S.called[p] = c;
    set('called', S.called); set('results4', { meta: S.meta, rows: S.results });
    set('sheetSrc', { tab: cfg.tab, phoneH: cfg.phoneH, nameH: cfg.nameH || '', emailH: cfg.emailH || '', listId: listId || '' });
    q('#rcount').textContent = S.results.length || ''; Cl.c = 'todo'; Cl.f = 'all'; R.f = 'all';
    showTab('calls'); return added.length;
  }

  /* ----- the modal ----- */
  const optsH = (sel, none) => (none ? '<option value="">— none —</option>' : '') + SL.headers.map((h) => `<option value="${esc(h)}" ${h === sel ? 'selected' : ''}>${esc(h)}</option>`).join('');
  function chipsHtml2(i) {
    const cfg = SL.cfg, r = cfg.rules[i], k = hIdx(r.col), cnt = new Map();
    if (k >= 0) for (const row of SL.rows) { if (!rowPasses(row, cfg, i)) continue; const v = String(row[k]).trim(); if (v) cnt.set(v, (cnt.get(v) || 0) + 1); }
    const sel = new Set(r.vals.map(norm)), f = norm(SL.find[i] || '');
    let all = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
    r.vals.forEach((v) => { if (!cnt.has(v) && !all.some(([x]) => norm(x) === norm(v))) all.unshift([v, 0]); });
    const shownAll = all.filter(([v]) => !f || norm(v).includes(f)), shown = shownAll.slice(0, 40);
    return (shown.map(([v, n]) => `<button class="chip ${sel.has(norm(v)) ? 'on' : ''}" data-v="${esc(v)}">${esc(v.length > 28 ? v.slice(0, 28) + '…' : v)}<b>${n}</b></button>`).join('') || '<span class="mu">No values here.</span>') + (shownAll.length > 40 ? `<span class="mu">+${shownAll.length - 40} more, type to find</span>` : '');
  }
  function renderRules() {
    q('#slRules').innerHTML = SL.cfg.rules.map((r, i) => `<div class="slr" data-r="${i}">
      <div class="row"><select class="rc-col grow">${optsH(r.col)}</select><select class="rc-op"><option value="in" ${r.op === 'in' ? 'selected' : ''}>is any of</option><option value="empty" ${r.op === 'empty' ? 'selected' : ''}>is empty</option><option value="notempty" ${r.op === 'notempty' ? 'selected' : ''}>is not empty</option></select><button class="xb rc-del" title="Remove rule">×</button></div>
      ${r.op === 'in' ? `<div class="slchips">${chipsHtml2(i)}</div><input class="rc-find" type="text" placeholder="Search, or type a value and press Enter" value="${esc(SL.find[i] || '')}" autocomplete="off">` : ''}</div>`).join('');
    q('#slSkipW').hidden = calledIdx() < 0;
    const ov = statusRule(SL.cfg); q('#slSkip').disabled = ov; q('#slSkipW').style.opacity = ov ? '.5' : ''; q('#slSkipW').title = ov ? 'Not used while a rule picks Call Status values' : '';
  }
  function updatePrev() {
    const cfg = SL.cfg, miss = missingCols(cfg).filter(Boolean);
    if (!cfg.phoneH) { q('#slPrev').innerHTML = '<b class="bad">Choose which column holds the phone numbers.</b>'; q('#slGo').disabled = true; return; }
    if (miss.length) { q('#slPrev').innerHTML = `<b class="bad">Column “${esc(miss[0])}” is not in this tab.</b>`; q('#slGo').disabled = true; return; }
    const info = buildRecords(cfg);
    q('#slPrev').innerHTML = info.out.length
      ? `<b>${info.out.length} contacts match${info.already ? ` · ${info.already} already called, skipped` : ''}${info.skipped ? ` · ${info.skipped} duplicate/invalid` : ''}</b>` + info.out.slice(0, 3).map((r) => `<div><span>${esc(r.name)}</span><span>${esc(r.phone)}</span></div>`).join('')
      : `<b>No contacts match${info.already ? ` (${info.already} were already called. Untick “Skip contacts already answered” to load them)` : ''}.</b>`;
    q('#slGo').disabled = !info.out.length;
    q('#slGo').textContent = info.out.length ? `Load ${info.out.length} contacts` : 'Load contacts';
  }
  function renderSL() {
    const cfg = SL.cfg;
    q('#slPhone').innerHTML = optsH(cfg.phoneH, true); q('#slName2').innerHTML = optsH(cfg.nameH, true); q('#slMail').innerHTML = optsH(cfg.emailH, true);
    q('#slColsHint').textContent = cfg.phoneH ? `Detected: ${cfg.phoneH}${cfg.nameH ? ' + ' + cfg.nameH : ''}` : '';
    qa('#slMode button').forEach((x) => x.classList.toggle('on', x.dataset.m === cfg.mode));
    q('#slSkip').checked = cfg.skipCalled; q('#slSnFrom').value = cfg.snFrom || ''; q('#slSnTo').value = cfg.snTo || '';
    q('#slColsBox').hidden = q('#slRulesBox').hidden = false;
    renderRules(); updatePrev();
  }
  async function loadTab(tab, restore) {
    q('#slInfo').textContent = `Reading “${tab}”…`; q('#slColsBox').hidden = q('#slRulesBox').hidden = true; q('#slPrev').innerHTML = ''; q('#slGo').disabled = true;
    const r = await postSheet({ action: 'read', tab });
    if (!r?.ok) { q('#slInfo').textContent = r?.error || 'Could not read that tab.'; return; }
    setSheetData(r);
    if (!SL.headers.length) { q('#slInfo').textContent = 'That tab is empty. Put headers in row 1.'; return; }
    q('#slInfo').textContent = `${SL.total} rows${SL.truncated ? ` · only the first ${SL.rows.length} are loaded` : ''}. Headers are read from row 1.`;
    SL.find = {}; SL.cfg = restore ? { ...blankCfg(tab), ...restore, tab, rules: (restore.rules || []).map((x) => ({ ...x, vals: [...(x.vals || [])] })) } : blankCfg(tab);
    detectCols(SL.cfg); renderSL();
  }
  async function openLoad(preset) {
    if (!window.license.can('importContacts')) return toast('Loading contacts is not enabled for your account.', 1);
    if (!sheetOk()) { toast('Link a sheet first (Setup).', 1); return showTab('setup'); }
    q('#sl').hidden = false; q('#slInfo').textContent = 'Loading tabs…'; q('#slColsBox').hidden = q('#slRulesBox').hidden = true; q('#slPrev').innerHTML = ''; q('#slGo').disabled = true; q('#slSave').value = preset?.name || '';
    const r = await postSheet({ action: 'tabs' });
    if (!r?.ok) { q('#slInfo').textContent = r?.error || 'Could not reach the sheet.'; return; }
    const last = preset || get('sheetLast', null);
    q('#slTab').innerHTML = r.tabs.map((t) => `<option value="${esc(t.name)}">${esc(t.name)} · ${t.rows} rows</option>`).join('');
    const tab = last && r.tabs.some((t) => t.name === last.tab) ? last.tab : (r.tabs.find((t) => t.rows > 0) || r.tabs[0]).name;
    q('#slTab').value = tab; await loadTab(tab, last && last.tab === tab ? last : null);
  }
  const touch = () => { updatePrev(); };
  q('#slx').onclick = () => (q('#sl').hidden = true);
  q('#slTab').onchange = (e) => loadTab(e.target.value, null);
  q('#slRefresh').onclick = () => loadTab(q('#slTab').value, SL.cfg);
  q('#slPhone').onchange = (e) => { SL.cfg.phoneH = e.target.value; q('#slColsHint').textContent = ''; touch(); };
  q('#slName2').onchange = (e) => { SL.cfg.nameH = e.target.value; touch(); };
  q('#slMail').onchange = (e) => { SL.cfg.emailH = e.target.value; touch(); };
  q('#slSnFrom').oninput = (e) => { SL.cfg.snFrom = e.target.value.replace(/\D/g, ''); updatePrev(); };
  q('#slSnTo').oninput = (e) => { SL.cfg.snTo = e.target.value.replace(/\D/g, ''); updatePrev(); };
  q('#slSkip').onchange = (e) => { SL.cfg.skipCalled = e.target.checked; renderRules(); updatePrev(); };
  qa('#slMode button').forEach((b) => (b.onclick = () => { SL.cfg.mode = b.dataset.m; qa('#slMode button').forEach((x) => x.classList.toggle('on', x === b)); }));
  q('#slAddRule').onclick = () => {
    const used = new Set(SL.cfg.rules.map((r) => r.col)), skip = [SL.cfg.phoneH, SL.cfg.nameH, SL.cfg.emailH, ...SL.headers.filter((h) => CALLCOLS.includes(norm(h)))];
    const col = SL.headers.find((h) => !used.has(h) && !skip.includes(h)) || SL.headers[0];
    SL.cfg.rules.push({ col, op: 'in', vals: [] }); renderRules(); updatePrev();
  };
  const ruleOf = (el) => { const b = el.closest('.slr'); return b ? +b.dataset.r : -1; };
  q('#slRules').addEventListener('click', (e) => {
    const i = ruleOf(e.target); if (i < 0) return; const r = SL.cfg.rules[i];
    if (e.target.closest('.rc-del')) { SL.cfg.rules.splice(i, 1); SL.find = {}; renderRules(); updatePrev(); return; }
    const c = e.target.closest('.chip'); if (!c) return;
    const v = c.dataset.v, at = r.vals.findIndex((x) => norm(x) === norm(v));
    if (at >= 0) r.vals.splice(at, 1); else r.vals.push(v);
    renderRules(); updatePrev();
  });
  q('#slRules').addEventListener('change', (e) => {
    const i = ruleOf(e.target); if (i < 0) return; const r = SL.cfg.rules[i];
    if (e.target.classList.contains('rc-col')) { r.col = e.target.value; r.vals = []; SL.find[i] = ''; }
    else if (e.target.classList.contains('rc-op')) r.op = e.target.value;
    else return;
    renderRules(); updatePrev();
  });
  q('#slRules').addEventListener('input', (e) => {
    if (!e.target.classList.contains('rc-find')) return;
    const i = ruleOf(e.target); SL.find[i] = e.target.value; e.target.closest('.slr').querySelector('.slchips').innerHTML = chipsHtml2(i);
  });
  q('#slRules').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target.classList.contains('rc-find')) return; e.preventDefault();
    const i = ruleOf(e.target), v = e.target.value.trim(); if (!v) return; const r = SL.cfg.rules[i];
    if (!r.vals.some((x) => norm(x) === norm(v))) r.vals.push(v);
    SL.find[i] = ''; renderRules(); updatePrev(); q(`#slRules [data-r="${i}"] .rc-find`)?.focus();
  });
  q('#slGo').onclick = () => {
    const cfg = SL.cfg, info = buildRecords(cfg); if (!info.out.length) return;
    const name = q('#slSave').value.trim(); let id = '';
    set('sheetLast', JSON.parse(JSON.stringify(cfg)));
    if (name) {
      const L = lists().slice(), at = L.findIndex((l) => norm(l.name) === norm(name)); id = at >= 0 ? L[at].id : crypto.randomUUID().slice(0, 8);
      const item = { ...JSON.parse(JSON.stringify(cfg)), id, name }; if (at >= 0) L[at] = item; else L.push(item); set('sheetLists', L);
    }
    const n = applyLoad(info, cfg, id); q('#sl').hidden = true; renderListChips();
    toast(`Loaded ${n} contacts from “${cfg.tab}”. Ready to call.`);
  };

  /* ----- quick lists ----- */
  function renderListChips() {
    const L = lists(), cur = get('sheetSrc', {}).listId, show = L.length && sheetOk();
    const html = L.map((l) => `<span class="chip lc ${cur === l.id ? 'on' : ''}" role="button" data-l="${esc(l.id)}" title="Reload “${esc(l.name)}” from the sheet">${ic('cloud', 14)}<span>${esc(l.name)}</span><button class="lx" data-del="${esc(l.id)}" title="Remove this list">×</button></span>`).join('');
    for (const id of ['#slChips', '#slChipsC']) { const el = q(id); el.innerHTML = html; el.hidden = !show; }
  }
  async function runList(l, el) {
    if (!window.license.can('importContacts')) return toast('Loading contacts is not enabled for your account.', 1);
    el.classList.add('busy'); toast(`Reading “${l.tab}”…`);
    try {
      const r = await postSheet({ action: 'read', tab: l.tab });
      if (!r?.ok) return toast(r?.error || 'Could not read the sheet.', 1);
      setSheetData(r); const cfg = { ...l }, miss = missingCols(cfg);
      if (miss.length) return toast(`Column “${miss[0] || 'phone'}” is not in “${l.tab}” any more. Open Load from sheet to fix this list.`, 1);
      const info = buildRecords(cfg);
      if (!info.out.length) return toast(`Nobody matches “${l.name}” right now${info.already ? ` (${info.already} already called)` : ''}.`);
      const n = applyLoad(info, cfg, l.id); renderListChips(); toast(`${l.name}: ${n} contacts ready.`);
    } finally { el.classList.remove('busy'); }
  }
  const listClick = (e) => {
    const x = e.target.closest('[data-del]');
    if (x) { e.stopPropagation(); const l = lists().find((v) => v.id === x.dataset.del); if (l && confirm(`Remove the quick list “${l.name}”?`)) { set('sheetLists', lists().filter((v) => v.id !== l.id)); renderListChips(); } return; }
    const c = e.target.closest('[data-l]'); const l = c && lists().find((v) => v.id === c.dataset.l); if (l) runList(l, c);
  };
  q('#slChips').onclick = listClick; q('#slChipsC').onclick = listClick;

  /* =====================================================================
     DESK PHONE
  ===================================================================== */
  const hostOnly = (ip) => String(ip || '').trim().replace(/:\d+$/, '');
  async function ensurePhoneAccess(ip) {
    const h = hostOnly(ip); if (!h) return false;
    const origins = [`http://${h}/*`, `https://${h}/*`];
    try { if (await chrome.permissions.contains({ origins })) return true; return await chrome.permissions.request({ origins }); }
    catch (e) { return false; }
  }
  const phoneUrl = (path, extra = '') => `https://${desk().ip}/cgi-bin/${path}?passcode=${encodeURIComponent(desk().pass)}${extra}`;
  const sendKey = (k) => http(phoneUrl('api-send_key', `&keys=${encodeURIComponent(k)}`), { timeout: 4000 });
  async function dialPhone(raw) {
    if (!window.license.can('dial')) return { ok: false, msg: 'Dialing is not enabled for your account.' };
    const d = desk();
    if (!/^[\w.-]+(:\d+)?$/.test(d.ip || '') || !d.pass) return { ok: false, msg: 'Add the phone IP and passcode in Setup.' };
    const num = (d.prefix || '') + String(raw).replace(/\D/g, '');
    if (num.length < 5) return { ok: false, msg: 'That number looks too short.' };
    if (!(await ensurePhoneAccess(d.ip))) return { ok: false, msg: 'Allow access to the phone: press Check phone in Setup and accept the browser prompt.' };
    const r = await http(phoneUrl('api-make_call', `&phonenumber=${encodeURIComponent(num)}`), { timeout: 10000 });
    if (r.ok) {
      if (r.status === 200 && (/success/i.test(r.text) || !/error|fail|denied|invalid|forbid|unauthor/i.test(r.text))) return { ok: true };
      return { ok: false, msg: `The phone refused (${r.status}). Check the passcode and that this laptop's IP is allowed.` };
    }
    // The phone often starts the call but sends a reply the browser can't read ("Failed to fetch").
    // Check that it is alive before calling this a failure, and never dial twice.
    await sleep(900);
    if (await probe(`https://${d.ip}/`)) return { ok: true, unverified: true };
    return { ok: false, msg: `Cannot reach the phone (${r.error}). Check its IP and the network.` };
  }
  q('#dpTest').onclick = async () => { const r = await dialPhone(q('#dpNum').value); toast(r.ok ? 'Dialing on your desk phone' : r.msg, !r.ok); };
  q('#dpPing').onclick = async () => {
    const ip = q('#dpIp').value.trim(), out = q('#dpPingMsg');
    if (!ip) { out.textContent = 'Enter the phone IP first'; return; }
    out.textContent = 'Checking…';
    if (!(await ensurePhoneAccess(ip))) { out.textContent = 'Access to the phone was not allowed.'; return; }
    out.textContent = (await probe(`https://${ip}/`)) ? 'Phone found ✓' : 'Not reachable. Check the IP and the network.';
  };
  q('#lapCopy').onclick = async () => { const ip = q('#lapIp').value.trim(); if (!ip) return toast('Detect or type your laptop IP first.', 1); await navigator.clipboard.writeText(ip); toast('Laptop IP copied'); };
  q('#lapDetect').onclick = async () => {
    const ips = await new Promise((res) => {
      const found = new Set();
      try {
        const pc = new RTCPeerConnection({ iceServers: [] }); pc.createDataChannel('');
        pc.onicecandidate = (e) => { if (!e.candidate) { pc.close(); return res([...found]); } const m = e.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/); if (m) found.add(m[1]); };
        pc.createOffer().then((o) => pc.setLocalDescription(o));
        setTimeout(() => { try { pc.close(); } catch (e) {} res([...found]); }, 2500);
      } catch (e) { res([]); }
    });
    const ip = ips.find((x) => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(x));
    if (ip) { q('#lapIp').value = ip; set('laptop', { ip }); toast('Laptop IP found'); }
    else toast('Chrome hid the address. Type it in (run ipconfig).', 1);
  };

  const sigOf = (t) => { const x = String(t).replace(/\d+/g, '').replace(/\s+/g, ' ').trim().slice(0, 4000); let h = 2166136261; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '.' + x.length.toString(36); };
  // GRP2601P reports {"body":[{"line":1,"state":"idle|calling|ringback|connected"},...]}
  function classify(text) {
    let b; try { b = JSON.parse(text).body; } catch (e) { return null; }
    if (!Array.isArray(b)) return null;
    const st = b.map((l) => l.state);
    if (st.includes('connected')) return 'conn';
    if (st.some((x) => x === 'calling' || x === 'dialing' || x === 'ringback' || x === 'ringing')) return 'ring';
    return st.every((x) => x === 'idle') ? 'idle' : null;
  }
  const readStatus = async () => { const r = await http(phoneUrl('api-get_line_status'), { timeout: 4000 }); return r.ok ? { text: r.text, cls: classify(r.text) } : { err: r.error }; };
  let watching = false;
  q('#watch').onclick = async () => {
    const out = q('#watchOut'), btn = q('#watch');
    if (watching) { watching = false; return; }
    if (!desk().ip) return toast('Add the phone IP and passcode first.', 1);
    watching = true; btn.textContent = 'Stop'; out.textContent = 'Watching 60 s. Dial from the extension, answer on your mobile, then hang up from your mobile…\n';
    const paths = [...CAND, 'api-get_call_info', 'api-get_active_call', 'api-phone_status'], last = {}, t0 = Date.now();
    for (let i = 0; i < 120 && watching; i++) {
      await Promise.all(paths.map(async (p) => {
        const r = await http(phoneUrl(p), { timeout: 2500 });
        const line = r.ok ? `${r.status} ${r.text.replace(/\s+/g, ' ').slice(0, 200)}` : `error: ${r.error}`;
        if (last[p] !== line) { last[p] = line; out.textContent += `[${((Date.now() - t0) / 1000).toFixed(1)}s] ${p}: ${line}\n`; out.scrollTop = out.scrollHeight; }
      }));
      await sleep(500);
    }
    watching = false; btn.textContent = 'Watch phone'; out.textContent += 'Done.';
  };

  /* ---------- auto-sync calibration: learn how this phone reports a call ---------- */
  const CAND = ['api-get_line_status', 'api-get_phone_status', 'api-get_call_status', 'api-get_account_status', 'api-get_status'];
  let cal = null;
  function renderCal() {
    const L = det().learned, b = q('#b-sync');
    b.textContent = L ? 'Auto' : 'Manual'; b.className = 'badge' + (L ? ' ok' : '');
    q('#calReset').hidden = !L;
    if (!cal) q('#calMsg').textContent = L ? `Calibrated. Reading “${L.path}” · ${L.conn.length} pickup, ${L.ring.length} ring, ${L.idle.length} idle signatures.` : 'Teach the extension how your phone reports a call. One test call to your own mobile, about a minute.';
  }
  q('#calReset').onclick = () => { const { learned, ...rest } = det(); set('detect', rest); renderCal(); };
  q('#calGo').onclick = async () => {
    if (cal) return;
    const d = desk(), num = q('#dpNum').value.trim();
    if (!d.ip || !d.pass) return toast('Add the phone IP and passcode first.', 1);
    if (num.replace(/\D/g, '').length < 5) return toast('Type your own mobile number in the Test dial field first.', 1);
    q('#calMsg').textContent = 'Checking what the phone reports…';
    const paths = [...new Set([det().path, ...CAND].filter(Boolean))];
    const probe = await Promise.all(paths.map(async (p) => ({ p, r: await http(phoneUrl(p), { timeout: 3000 }) })));
    const ok = probe.filter((x) => x.r.ok && x.r.status === 200 && x.r.text.trim().length > 1).map((x) => x.p);
    if (!ok.length) { q('#calMsg').textContent = 'The phone did not answer. Check the IP, passcode and Remote Control, then try again.'; return; }
    cal = { phase: 'idle', run: true, rec: Object.fromEntries(ok.map((p) => [p, { idle: new Set(), ring: new Set(), conn: new Set() }])) };
    (async () => { while (cal && cal.run) { await Promise.all(ok.map(async (p) => { const r = await http(phoneUrl(p), { timeout: 2500 }); if (r.ok && cal) cal.rec[p][cal.phase].add(sigOf(r.text)); })); await sleep(450); } })();
    q('#calGo').disabled = true; await sleep(1600);
    const res = await dialPhone(num);
    if (!res.ok) { cal.run = false; cal = null; q('#calGo').disabled = false; q('#calMsg').textContent = res.msg; return; }
    cal.phase = 'ring'; q('#calMsg').textContent = 'Calling your mobile. Answer it, then press “I answered”.'; q('#calAns').hidden = false;
  };
  q('#calAns').onclick = () => { if (!cal) return; cal.phase = 'conn'; q('#calAns').hidden = true; q('#calHang').hidden = false; q('#calMsg').textContent = 'Talk a few seconds, then hang up and press “I hung up”.'; };
  q('#calHang').onclick = async () => {
    if (!cal) return; cal.phase = 'idle'; q('#calHang').hidden = true; q('#calMsg').textContent = 'Recording the hang-up…';
    await sleep(3500); cal.run = false;
    let best = null;
    for (const [p, v] of Object.entries(cal.rec)) {
      const conn = [...v.conn].filter((x) => !v.idle.has(x)), ring = [...v.ring].filter((x) => !v.idle.has(x) && !v.conn.has(x));
      if (!conn.length) continue;
      const score = (ring.length ? 2 : 1) + (p === det().path ? 0.1 : 0);
      if (!best || score > best.score) best = { path: p, idle: [...v.idle], ring, conn, score };
    }
    const done = cal; cal = null; q('#calGo').disabled = false;
    if (!best) { q('#calMsg').textContent = `None of the ${Object.keys(done.rec).length} endpoints I tried change during a call, so this phone can't report pickup. Manual buttons still work. Open Advanced › Watch phone and send me what it shows.`; renderCal(); return; }
    const { score, ...learned } = best; set('detect', { ...det(), learned });
    q('#calMsg').textContent = ''; renderCal(); toast('Auto-sync is ready. Pickup, hang-up and call time now follow your phone.');
  };

  /* =====================================================================
     CALLS TAB
  ===================================================================== */
  /* ---------- preferences + custom sheet entries ---------- */
  const PREF_D = { auto: false, autoSec: 5, hang: false, hangSec: 30, hangNext: true, skipNo: true, logNo: false, pad: true, by: '', hs: false, hsKey: 'HEADSET', mute: false, label: 'Called', quick: 'Interested, Call back, Not interested, Wrong number' };
  const pref = () => ({ ...PREF_D, ...get('prefs', {}) });
  bind('prefs', PREF_D, { auto: '#pAuto', autoSec: '#pAutoSec', hang: '#pHang', hangSec: '#pHangSec', hangNext: '#pHangNext', skipNo: '#pSkipNo', pad: '#pPad', by: '#pBy', hs: '#pHs', hsKey: '#pHsKey', mute: '#pMute' });
  const quickLabels = () => ['Call again'];
  const defLabel = (e) => (e && e.outcome === 'noanswer' ? 'Not Answered' : 'Answered');
  function nextQueue() { return rowsFor({ ...Cl, c: 'all' }).filter((r) => { const t = tagOf(r); return !t || (t === 'no' && !pref().skipNo); }); }
  async function saveEntry(r, patch, quiet) {
    const old = S.called[r.phone];
    const e = { ...(old || { ts: Date.now(), via: 'note', talk: 0, outcome: 'note' }), ...patch };
    S.called[r.phone] = e; set('called', S.called);
    if (!sheetCfg().url) return;
    const body = e.outcome === 'note' ? { action: 'note', name: r.name, phone: r.phone, remark: e.remark || '' }
      : { action: 'called', name: r.name, phone: r.phone, talk: e.talk || 0, label: e.label || defLabel(e), remark: e.remark || '' };
    const res = await postSheet(body);
    if (res?.ok) { if (!quiet) toast('Saved to your sheet'); }
    else if (res && !res.net) toast(res.error, 1);
    else { set('pending', [...get('pending', []), body]); toast('Offline. Will save to the sheet later.', 1); }
  }
  const reopen = (phone) => { renderCalls(); q(`.rc[data-p="${CSS.escape(phone)}"]`)?.classList.add('open'); };

  const calllog = () => get('calllog', []);
  function avatar(r, t) {
    const s = statusOf(r), col = COL[s], Rr = 21, C = 2 * Math.PI * Rr, frac = t ? 1 : 0;
    return `<div class="av" style="--c:${col};--h:${hue(r.name)}"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="${Rr}" fill="none" style="stroke:var(--ln)" stroke-width="4"/><circle cx="26" cy="26" r="${Rr}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${frac * C} ${C}"/></svg><span>${esc(initials(r.name))}</span>${t ? `<em class="${t}">${ic(t === 'ans' ? 'check' : 'close', 12)}</em>` : ''}</div>`;
  }
  function cardHtml(r, i = 0) {
    const s = statusOf(r), t = tagOf(r), c = S.called[r.phone];
    const lab = c?.label && !/^(answered|not\s*answered|called)$/i.test(c.label) ? c.label : null;
    const tag = t === 'ans' ? `<span class="ctag ans">${ic('check', 12)}${esc(lab || 'Answered')}${c.talk ? ' · ' + mmss(c.talk) : ''}</span>` : t === 'no' ? `<span class="ctag no">${esc(lab || 'Not answered')}</span>` : '';
    const rem = c?.remark ? `<div class="rem">${esc(c.remark)}</div>` : '';
    const chips = t ? `<div class="qchips">${quickLabels().map((l) => `<button class="qc ${c.label === l ? 'on' : ''}" data-a="qlabel" data-l="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : '';
    const note = `<div class="nt">${chips}<div class="row"><input class="ntin" type="text" placeholder="Remark for the sheet" value="${esc(c?.remark || '')}"><button class="xb" data-a="savenote">Save</button></div></div>`;
    const warn = isFail(r) || /^Duplicate/.test(r.note || '') ? `<div class="warn">${esc(r.note)}</div>` : '';
    const ex = Object.entries(r.extra || {}).filter(([, v]) => String(v).trim());
    const meta = ex.slice(0, 2).map(([, v]) => `<span>${esc(String(v).slice(0, 26))}</span>`).join('');
    const det = ex.length ? `<div class="det">${ex.map(([k, v]) => `<span><em>${esc(k)}</em> ${esc(v)}</span>`).join('')}</div>` : '';
    return `<article class="rc ${t ? 'is-' + t : ''}" style="--i:${i}" data-p="${esc(r.phone)}">${avatar(r, t)}
      <div class="rm"><b>${esc(r.name)}${tag}</b><span class="ph">${esc(r.phone)}</span>
        ${rem}<div class="mt">${meta}</div>${warn}</div>
      <div class="ra"><button class="pb dial" data-a="call">${ic('phone')}${t ? 'Redial' : 'Call'}</button><a class="pb wa" data-a="wa" href="${waLink(r)}" target="_blank" rel="noopener">${ic('chat')}WhatsApp</a><button class="pb mo" data-a="more" title="More">${ic('more')}</button></div>
      <div class="xtra">${note}${det}<a class="xb" href="${smsLink(r)}">${ic('sms', 15)}SMS</a>${r.email ? `<a class="xb" href="mailto:${esc(r.email)}">${ic('mail', 15)}Email</a>` : ''}<button class="xb" data-a="copy">${ic('copy', 15)}Copy number</button><button class="xb ${t === 'ans' ? 'on' : ''}" data-a="mark">${ic('check', 15)}${t === 'ans' ? 'Answered ✓' : 'Mark as answered'}</button></div></article>`;
  }
  let roadPn = 0; const roadChar = Monkey.pickChar('random');
  function renderCalls() {
    renderListChips();
    const total = S.results.length, c = counts();
    const today = calllog().filter((x) => new Date(x.ts).toDateString() === new Date().toDateString());
    const ans = today.filter((x) => x.outcome === 'answered'), miss = today.filter((x) => x.outcome === 'noanswer');
    const rate = today.length ? Math.round((ans.length / today.length) * 100) : 0;
    const avg = ans.length ? Math.round(ans.reduce((a, x) => a + (x.talk || 0), 0) / ans.length) : 0;
    const Rr = 34, C = 2 * Math.PI * Rr;
    const reachedN = S.results.filter((r) => tagOf(r)).length, pn = total ? reachedN / total : 0;
    q('#cdash').innerHTML = `<svg viewBox="0 0 84 84" class="ring"><g transform="rotate(-90 42 42)"><circle cx="42" cy="42" r="${Rr}" fill="none" style="stroke:var(--sf)" stroke-width="8"/><circle cx="42" cy="42" r="${Rr}" fill="none" stroke="${COL.Active}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(rate / 100) * C} ${C}"/></g><text x="42" y="47" font-size="16" font-weight="700">${rate}%</text></svg>
      <div class="cstat"><div><b>${today.length}</b><span>calls today</span></div><div><b>${ans.length}</b><span>answered</span></div><div><b>${miss.length}</b><span>missed</span></div><div><b>${avg ? mmss(avg) : '–'}</b><span>avg talk</span></div></div>
      <div class="road" id="road" style="--pn:${roadPn}"><div class="rt"></div><div class="rd"></div><span class="rpct">${total ? reachedN + ' of ' + total + ' reached' : 'No list yet'}</span><span class="rflag">${Monkey.html('bongo', 'banana', { scale: 1 })}</span><div class="rider">${Monkey.html(roadChar, 'rideIdle', { scale: 1, cls: 'mkx', attrs: { 'data-k': 'ride' } })}</div></div>`;
    if (pn !== roadPn) {
      const rd = q('#road'), rider = rd.querySelector('.rider'), rsp = rider.querySelector('.sp'); rider.classList.add('moving'); Monkey.setAnim(rsp, 'ride');
      requestAnimationFrame(() => requestAnimationFrame(() => rd.style.setProperty('--pn', pn)));
      setTimeout(() => { rider.classList.remove('moving'); const sp = rider.querySelector('.sp'); if (sp) Monkey.setAnim(sp, 'rideIdle'); }, 1300); roadPn = pn;
    }
    const n = { todo: 0, ans: 0, no: 0 }; S.results.forEach((r) => { const t = tagOf(r); n[t || 'todo']++; });
    q('#cseg').innerHTML = [['todo', 'To call'], ['ans', 'Answered'], ['no', 'Not answered'], ['all', 'All']].map(([k, l]) => `<button data-c="${k}" class="${Cl.c === k ? 'on' : ''}">${l}<b>${k === 'all' ? total : n[k]}</b></button>`).join('');
    if (Cl.f !== 'all' && !c[Cl.f]) Cl.f = 'all';
    q('#cchips').innerHTML = chipsHtml(Cl, c); q('#cchips').hidden = !Cl.showF;
    const rows = rowsFor(Cl), shown = rows.slice(0, Cl.limit), left = nextQueue().length;
    q('#callNext').innerHTML = `${ic('phone')}Call next contact · ${left} to call`; q('#callNext').disabled = !left;
    q('#clist').innerHTML = shown.length ? shown.map((r, i) => cardHtml(r, Math.min(i, 12))).join('') : (total ? `<div class="empty">${Cl.c === 'todo' ? ILLU.done : ILLU.vine}<b>${Cl.c === 'todo' ? 'Everyone here has been called' : 'No contacts match'}</b><span>${Cl.c === 'todo' ? 'Load a fresh list to keep going.' : 'Try another filter or search.'}</span>${Cl.c === 'todo' ? `<div class="row">${loadBtn()}</div>` : ''}</div>` : emptyHtml('Nobody to call yet', 'Load contacts from your sheet or import a CSV.', `${loadBtn()}<button class="btn sm" data-imp>Import a CSV</button>`));
    q('#cmore').hidden = rows.length <= shown.length; q('#cmore').textContent = `Show ${Math.min(40, rows.length - shown.length)} more`;
    const hist = calllog().slice(-15).reverse();
    q('#chist').innerHTML = hist.length ? hist.map((x) => `<div class="hist"><i class="dot" style="--c:${x.outcome === 'answered' ? COL.Active : x.outcome === 'failed' ? COL.Check : '#C98A0B'}"></i><b>${esc(x.name)}</b><span>${x.outcome === 'answered' ? 'answered · ' + mmss(x.talk || 0) : x.outcome === 'failed' ? 'failed' : 'not answered'}</span><span>${new Date(x.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>`).join('') : '<div class="mu">No calls yet.</div>';
  }
  q('#cseg').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) { Cl.c = b.dataset.c; Cl.limit = 40; fresh('#v-calls'); renderCalls(); } };
  q('#cchips').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) { Cl.f = b.dataset.f; Cl.limit = 40; fresh('#v-calls'); renderCalls(); } };
  q('#csearch').oninput = (e) => { Cl.s = e.target.value; Cl.limit = 40; renderCalls(); };
  q('#csort').onchange = (e) => { Cl.sort = e.target.value; renderCalls(); };
  q('#cfBtn').onclick = () => { Cl.showF = !Cl.showF; renderCalls(); };
  q('#cmore').onclick = () => { Cl.limit += 40; renderCalls(); };
  q('#callNext').onclick = () => { const r = nextQueue()[0]; if (r) startCall(r); };
  q('#clist').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const card = b.closest('.rc'), r = S.results.find((x) => x.phone === card.dataset.p); if (!r) return;
    const a = b.dataset.a;
    if (a === 'call') startCall(r);
    else if (a === 'more') card.classList.toggle('open');
    else if (a === 'copy') { await navigator.clipboard.writeText(r.phone); toast('Number copied'); }
    else if (a === 'qlabel') { const cur = S.called[r.phone]; await saveEntry(r, { label: cur?.label === b.dataset.l ? defLabel(cur) : b.dataset.l }); reopen(r.phone); }
    else if (a === 'savenote') { await saveEntry(r, { remark: card.querySelector('.ntin').value.trim() }); reopen(r.phone); }
    else if (a === 'mark') {
      if (S.called[r.phone]) delete S.called[r.phone];
      else {
        S.called[r.phone] = { ...(S.called[r.phone] || {}), ts: Date.now(), via: 'manual', talk: 0, outcome: 'answered', label: defLabel() };
        if (sheetCfg().url) { const res = await postSheet({ action: 'called', name: r.name, phone: r.phone, talk: 0, first: true, label: defLabel(), remark: S.called[r.phone].remark || '' }); toast(res?.ok ? 'Marked Answered in your sheet' : 'Marked here. Sheet: ' + (res?.error || 'not reachable'), !res?.ok); }
      }
      set('called', S.called); const open = card.classList.contains('open'); renderCalls(); if (open) q(`.rc[data-p="${CSS.escape(r.phone)}"]`)?.classList.add('open');
    }
  });

  /* ---------- call window ---------- */
  Object.assign(P, {
    bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    mic: 'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z',
  });
  const C = { r: null, s: 'idle', t0: 0, connAt: 0, seen: null, poll: null, tick: null, ringT: null, cdT: null, cd: 0, sheet: null, mode: 'manual', talk: 0, logged: false, err: '', by: 'you', hanging: false, typing: false };
  const LABEL = { dialing: 'Dialing', ringing: 'Ringing', wait: 'Waiting for pickup', connected: 'On call', ended: 'Call ended', noanswer: 'Not answered', failed: 'Could not call' };
  const LIVE = ['dialing', 'ringing', 'wait'], DONE = ['ended', 'noanswer', 'failed'];
  const autoNext = () => pref().auto;

  /* optional synthesized sounds (speaker icon, off by default) */
  let actx = null;
  const soundOn = () => get('snd', false);
  function tone(f, d, v = 0.05, type = 'sine', when = 0) {
    if (!soundOn()) return;
    try {
      actx = actx || new AudioContext();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      const t = actx.currentTime + when;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d);
    } catch (e) {}
  }
  const tick = () => tone(1800, 0.03, 0.03, 'square');
  const ringBurst = () => { for (let i = 0; i < 6; i++) tone(i % 2 ? 480 : 440, 0.07, 0.05, 'triangle', i * 0.08); };
  q('#snd').onclick = () => { set('snd', !soundOn()); q('#pSnd').checked = soundOn(); renderCall(); tone(880, 0.1); };
  q('#pSnd').checked = soundOn(); q('#pSnd').onchange = (e) => { set('snd', e.target.checked); renderCall(); };
  q('#anBtn').onclick = () => { set('prefs', { ...get('prefs', {}), auto: !pref().auto }); q('#pAuto').checked = pref().auto; if (!pref().auto) { clearInterval(C.cdT); C.cd = 0; } renderCall(); };
  let noteT = null;
  function flushNote() { if (noteT && C.r) { clearTimeout(noteT); noteT = null; saveEntry(C.r, { remark: q('#cremark').value.trim() }, true); } }
  q('#cremark').oninput = () => { clearTimeout(noteT); noteT = setTimeout(() => { noteT = null; if (C.r) saveEntry(C.r, { remark: q('#cremark').value.trim() }, true); }, 900); };
  q('#qchips').onclick = (e) => { const b = e.target.closest('[data-l]'); if (!b || !C.r) return; const cur = S.called[C.r.phone]; saveEntry(C.r, { label: cur?.label === b.dataset.l ? defLabel(cur) : b.dataset.l }, true).then(renderCall); };

  q('#wave').innerHTML = Array.from({ length: 22 }, (_, k) => `<i style="--k:${k};--h:${10 + Math.round(Math.abs(Math.sin(k * 1.7)) * 22)}px"></i>`).join('');
  q('#steps4').innerHTML = [['phone', 'Dial'], ['bell', 'Ring'], ['mic', 'Talk'], ['hang', 'End']].map(([i, l], n) => `${n ? '<span class="s4l"></span>' : ''}<div class="s4"><i>${ic(i, 16)}</i>${l}</div>`).join('');

  let typeRun = 0;
  async function typeNumber(num) {
    const id = ++typeRun, digits = String(num).replace(/\D/g, ''), out = q('#cphone'); C.typing = true; let t = '';
    for (const ch of digits) { if (id !== typeRun || !C.r) break; t += ch; out.textContent = t + '·'.repeat(Math.max(0, digits.length - t.length)); tick(); await sleep(70); }
    if (id === typeRun) { C.typing = false; if (C.r) out.textContent = C.r.phone; }
  }

  function renderCall() {
    q('#snd').innerHTML = ic(soundOn() ? 'vol' : 'mute', 20);
    q('#anBtn').classList.toggle('on', autoNext());
    const r = C.r; q('#cm').hidden = !r; if (!r) return;
    q('#pcard').dataset.s = C.s;
    q('#cav').textContent = initials(r.name); q('#cname').textContent = r.name; if (!C.typing) q('#cphone').textContent = r.phone;
    q('#clabel').textContent = C.hanging ? 'Hanging up…' : LABEL[C.s];
    const vn = q('#cvine'), still = !LIVE.includes(C.s); vn.classList.toggle('still', still);
    if (vn.dataset.m !== String(still)) { vn.dataset.m = String(still); const sp = vn.querySelector('.sp'); if (sp) Monkey.setAnim(sp, 'climb', still ? { frame: 1 } : {}); }
    stageState();
    const si = C.s === 'dialing' ? 0 : C.s === 'ringing' || C.s === 'wait' ? 1 : C.s === 'connected' ? 2 : 3, skip = DONE.includes(C.s) && !C.connAt;
    qa('#steps4 .s4').forEach((el, n) => { el.className = 's4' + (n < si ? ' done' : n === si ? ' on' : '') + (skip && n === 2 ? ' skip' : ''); });
    qa('#steps4 .s4l').forEach((el, n) => el.classList.toggle('done', n < si));
    q('#cres').innerHTML = C.s === 'ended' ? `${ic('check', 22)}Answered · ${mmss(C.talk)}<small>ended by ${C.by}</small>` : C.s === 'noanswer' ? `${ic('close', 22)}Not answered<small>${C.by === 'phone' ? 'phone stopped ringing' : C.by === 'timeout' ? `no answer after ${pref().hangSec}s, hung up automatically` : 'you hung up'}</small>` : C.s === 'failed' ? `${ic('close', 22)}${esc(C.err)}` : '';
    const url = sheetCfg().url, m = get('sheetMeta', null);
    const ph = C.mode === 'auto' ? ['ok', 'Phone · auto-synced'] : ['warn', 'Phone · manual'];
    q('#sy-ph').className = 'sy ' + ph[0]; q('#sy-ph').innerHTML = `<i></i>${ph[1]}`;
    const sh = !url ? ['', 'Sheet · off'] : C.sheet === 'saved' ? ['ok', 'Sheet · saved'] : C.sheet === 'saving' ? ['busy', 'Sheet · saving'] : C.sheet === 'queued' ? ['bad', 'Sheet · offline, will retry'] : C.sheet === 'err' ? ['bad', 'Sheet · error'] : ['', `Sheet · ${m?.name || 'linked'}`];
    q('#sy-sh').className = 'sy ' + sh[0]; q('#sy-sh').innerHTML = `<i></i>${esc(sh[1])}`;
    const live = LIVE.includes(C.s), B = (id, cls, icon, label) => `<button class="cbn ${cls}" data-a="${id}"><i>${ic(icon, cls === 'hang' ? 30 : 24)}</i>${label}</button>`;
    q('#cacts').innerHTML = live ? (C.mode === 'manual' ? B('yes', 'ok', 'check', 'Picked up') : '') + B('hang', 'hang', 'hang', 'Hang up')
      : C.s === 'connected' ? B('hang', 'hang', 'hang', 'Hang up')
      : B('next', 'nx', 'next', C.cd > 0 ? `Next in ${C.cd}` : 'Next contact') + (C.s === 'failed' ? B('rep', '', 'chat', 'Report') : '') + B('close', '', 'close', 'Close');
    q('#cdbar').hidden = !(C.cd > 0); q('#cdbar i').style.width = C.cd > 0 ? (C.cd / (C.cdMax || 5)) * 100 + '%' : '0';
    q('#chint').textContent = live || C.s === 'connected' ? (C.mode === 'auto' ? 'Pickup, hang-up and time follow your phone' : `Manual: tap Picked up when they answer${C.why ? ' (' + C.why + ')' : ''}`) : '';
    if (live && C.rem != null) q('#chint').textContent = `No answer? Hanging up in ${C.rem}s`;
    const ent = S.called[r.phone], showPad = pref().pad && (C.s === 'connected' || C.s === 'ended' || C.s === 'noanswer');
    q('#cnote').hidden = !showPad;
    if (showPad) {
      q('#qchips').innerHTML = quickLabels().map((l) => `<button class="qc ${ent?.label === l ? 'on' : ''}" data-l="${esc(l)}">${esc(l)}</button>`).join('');
      if (document.activeElement !== q('#cremark')) q('#cremark').value = ent?.remark || '';
    }
  }
  const stopCall = () => { clearInterval(C.poll); clearInterval(C.tick); clearInterval(C.ringT); clearInterval(C.wdT); C.poll = C.tick = C.ringT = C.wdT = null; };
  let logCall = function (outcome) {
    if (C.logged || !C.r) return; C.logged = true;
    set('calllog', [...calllog(), { name: C.r.name, phone: C.r.phone, ts: Date.now(), outcome, talk: C.talk }].slice(-300));
  };
  function setState(s) {
    const prev = C.s; C.s = s;
    if (DONE.includes(s)) stopCall();
    if (s === 'ringing' && !C.ringT) { ringBurst(); C.ringT = setInterval(ringBurst, 2400); }
    if (s !== 'ringing' && C.ringT) { clearInterval(C.ringT); C.ringT = null; }
    if (s === 'connected' && prev !== 'connected') { tone(660, 0.12, 0.06); tone(880, 0.16, 0.06, 'sine', 0.12); }
    if ((s === 'ended' || s === 'noanswer') && prev !== s) tone(130, 0.22, 0.09);
    renderCall();
  }
  async function pushCalled(r, talk, first) {
    if (!sheetCfg().url) return;
    const e = S.called[r.phone] || {};
    const body = { action: 'called', name: r.name, phone: r.phone, talk, first: !!first, label: e.label || defLabel(e), remark: e.remark || '', by: whoAmI() }, res = await postSheet(body);
    if (res?.ok) { C.sheet = 'saved'; S.sheetErr = ''; }
    else if (res && !res.net) { C.sheet = 'err'; if (res.key) { S.sheetErr = KEYFIX; readiness(); } toast(res.error, 1); }
    else { set('pending', [...get('pending', []), body]); C.sheet = 'queued'; }
    if (C.r === r) renderCall();
  }
  // Asks the laptop softphone (via its sip: handler) to dial a number or the PBX barge code.
  async function openSip(uri) {
    try { const t = await chrome.tabs.create({ url: uri, active: false }); setTimeout(() => chrome.tabs.remove(t.id).catch(() => {}), 2500); }
    catch (e) { toast('Could not open the softphone: ' + e.message, 1); }
  }
  async function joinOnLaptop(force) {
    const j = get('join', {}), pbx = (j.pbx || '').trim();
    if (!pbx || (!force && !j.on)) return;
    openSip(`sip:${(j.code || '*56').trim()}${(j.ext || '210').trim()}@${pbx}`);
  }
  q('#jnTest').onclick = () => { if (!(get('join', {}).pbx || '').trim()) { q('#jnMsg').textContent = 'Enter the PBX IP first'; return; } q('#jnMsg').textContent = ''; joinOnLaptop(true); };
  async function connected(via) {
    if (C.connAt || !C.r || DONE.includes(C.s)) return;
    C.connAt = Date.now() - (via === 'auto' ? 1200 : 0); // two polls of detection delay, so the timer matches the phone
    const r = C.r; C.hanging = false;
    S.called[r.phone] = { ...(S.called[r.phone]?.remark ? { remark: S.called[r.phone].remark } : {}), ts: Date.now(), via, talk: 0, outcome: 'answered', label: defLabel() }; set('called', S.called);
    C.tick = setInterval(() => { q('#ctimer').textContent = mmss(Math.floor((Date.now() - C.connAt) / 1000)); }, 250);
    C.sheet = sheetCfg().url ? 'saving' : null; setState('connected'); if (!C.lap) { joinOnLaptop(); if (pref().mute) sendKey('MUTE'); }
    renderCalls(); await pushCalled(r, 0, true);
  }
  function startCountdown() {
    clearInterval(C.cdT); C.cd = 0;
    if (!pref().auto || !C.r) return;
    const nxt = nextQueue().find((x) => x.phone !== C.r.phone); if (!nxt) return;
    const sec = Math.max(0, Math.min(60, Math.round(+pref().autoSec || 0))); C.cdMax = Math.max(sec, 1);
    if (sec === 0) { setTimeout(() => { if (C.r && DONE.includes(C.s)) { closeCall(); startCall(nxt); } }, 700); return; }
    C.cd = sec;
    C.cdT = setInterval(() => { C.cd--; if (C.cd <= 0) { clearInterval(C.cdT); C.cdT = null; C.cd = 0; closeCall(); startCall(nxt); } else renderCall(); }, 1000);
  }
  function finish(s, by = 'you') {
    const r = C.r; if (!r || DONE.includes(C.s)) return;
    C.by = by; C.hanging = false;
    if (C.connAt) {
      C.talk = Math.max(0, Math.floor((Date.now() - C.connAt - (by === 'phone' ? 1200 : 0)) / 1000));
      S.called[r.phone] = { ...(S.called[r.phone] || { ts: Date.now(), via: 'manual' }), outcome: 'answered', talk: C.talk }; set('called', S.called);
      if (C.talk > 0) pushCalled(r, C.talk);
      q('#ctimer').textContent = mmss(C.talk); logCall('answered'); s = 'ended';
    } else if (s === 'failed') logCall('failed');
    else { S.called[r.phone] = { ...(S.called[r.phone]?.remark ? { remark: S.called[r.phone].remark } : {}), ts: Date.now(), via: by, talk: 0, outcome: 'noanswer', label: 'Not Answered' }; set('called', S.called); logCall('noanswer'); s = 'noanswer'; pushCalled(r, 0, true); }
    setState(s); renderCalls();
    if (s !== 'failed' && by !== 'timeout') startCountdown();
  }

  /* hang up on the telecom too: tries the known command styles until the phone confirms */
  async function endOnPhone() {
    const d = desk(); if (!(d.on && d.ip && d.pass)) return { ok: true, skipped: true };
    const known = get('hangVar', null);
    const list = known ? [known] : [['cmd', 'endcall'], ['arg', 'endcall'], ['cmd', 'hangup'], ['arg', 'hangup'], ['arg', 'ENDCALL'], ['cmd', 'ENDCALL']];
    for (const [k, v] of list) {
      const r = await http(phoneUrl('api-phone_operation', `&${k}=${v}`), { timeout: 3000 });
      log(`Hang-up ${k}=${v}: ${r.ok ? r.status + ' ' + r.text.replace(/\s+/g, ' ').slice(0, 60) : r.error}`);
      if (r.ok && r.status === 200 && !/error|invalid|fail|not.?support/i.test(r.text)) {
        await sleep(700);
        const st = await readStatus();
        if (!st.err && st.cls === 'conn') continue;
        set('hangVar', [k, v]); return { ok: true };
      }
    }
    set('hangVar', null); return { ok: false };
  }
  async function hangUp() {
    if (C.hanging || !C.r || DONE.includes(C.s)) return;
    C.hanging = true; renderCall();
    const res = C.lap ? { ok: false } : await endOnPhone();
    if (!res.ok) toast(C.lap ? 'Hang up the call in your softphone too.' : "The phone didn't confirm the hang-up. Hang up on the handset too.", 1);
    finish(C.connAt ? 'ended' : 'noanswer', 'you');
  }

  function waitTick() {
    if (!C.r || C.connAt || DONE.includes(C.s)) return;
    const p = pref();
    if (!p.hang) { if (C.rem != null) { C.rem = null; renderCall(); } return; }
    const left = Math.max(0, Math.round(+p.hangSec - (Date.now() - C.t0) / 1000));
    C.rem = left; if (left <= 0) { autoHang(); return; } renderCall();
  }
  async function autoHang() {
    if (C.hanging || !C.r || DONE.includes(C.s)) return;
    const r = C.r, p = pref(); C.hanging = true; C.rem = null; renderCall();
    await endOnPhone();
    finish('noanswer', 'timeout');
    if (p.hangNext) { const nxt = nextQueue().find((x) => x.phone !== r.phone); if (nxt) setTimeout(() => { if (C.r === r) { closeCall(); startCall(nxt); } }, 1600); }
  }
  async function startCall(r) {
    if (C.r && !DONE.includes(C.s)) return toast('Finish the current call first.', 1);
    stopCall(); clearInterval(C.cdT);
    Object.assign(C, { r, s: 'dialing', t0: Date.now(), connAt: 0, seen: { ring: false, conn: 0, idle: 0 }, sheet: null, err: '', talk: 0, mode: 'manual', logged: false, by: 'you', hanging: false, cd: 0 });
    q('#ctimer').textContent = '00:00'; startStage(); renderCall(); typeNumber(r.phone);
    const d = desk(), j = get('join', {}); C.lap = false;
    if (j.dial && (j.pbx || '').trim()) { C.lap = true; openSip(`sip:${(d.prefix || '') + String(r.phone).replace(/\D/g, '')}@${j.pbx.trim()}`); return setState('wait'); }
    if (!d.on) { const a = document.createElement('a'); a.href = `tel:+${toIntl(r.phone, cc())}`; a.click(); return setState('wait'); }
    C.why = ''; const auto = det().on !== false && d.ip;
    const base = auto ? await readStatus() : null;
    const res = await dialPhone(r.phone);
    if (!res.ok) { C.err = res.msg; finish('failed'); return; }
    if (pref().hs) setTimeout(() => sendKey((pref().hsKey || 'HEADSET').trim().toUpperCase()), 800);
    C.rem = null; C.wdT = setInterval(waitTick, 1000);
    if (auto && !base.err && base.cls !== 'conn') { C.mode = 'auto'; setState('dialing'); C.poll = setInterval(pollTick, 600); }
    else { C.why = det().on === false ? 'auto-sync is off in Setup' : !d.ip ? 'no phone IP' : base.err ? `could not read the phone: ${base.err}` : 'phone already shows a call'; setState('wait'); }
  }
  let polling = false;
  async function pollTick() {
    if (polling) return; polling = true;
    let s; try { s = await readStatus(); } finally { polling = false; }
    if (!C.r || !C.poll || s.err) return;
    const age = Date.now() - C.t0, k = C.seen, ringKnown = true;
    if (s.cls === 'conn') { k.conn++; k.idle = 0; if (k.conn >= 2 && !C.connAt) connected('auto'); }
    else if (s.cls === 'ring') { k.conn = 0; k.idle = 0; k.ring = true; if (C.s === 'dialing') setState('ringing'); }
    else if (s.cls === 'idle') {
      k.conn = 0; k.idle++;
      if (C.connAt && k.idle >= 2) finish('ended', 'phone');
      else if (!C.connAt && k.idle >= 3 && (ringKnown ? (k.ring || age > 20000) : age > 35000)) finish('noanswer', 'phone');
    } else k.conn = 0;
    if (!C.connAt && age > 90000) finish('noanswer', 'phone');
  }
  q('#cacts').onclick = (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'yes') connected('manual'); else if (a === 'hang') hangUp(); else if (a === 'close') closeCall();
    else if (a === 'rep') { const why = C.err || 'The call could not be placed.'; closeCall(); rptPrefill('phone', `The call could not be placed. App said: ${why}`); }
    else if (a === 'next') { const cur = C.r.phone, nxt = nextQueue().find((x) => x.phone !== cur); closeCall(); if (nxt) startCall(nxt); else toast('No more contacts to call in this list.'); }
  };
  function closeCall() { flushNote(); stageRun++; typeRun++; C.typing = false; clearInterval(C.cdT); C.cd = 0; stopCall(); C.r = null; C.s = 'idle'; renderCall(); renderCalls(); }
  q('#cclose').onclick = async () => {
    if (C.r && (LIVE.includes(C.s) || C.s === 'connected')) { if (!confirm('Close the call window? This also hangs up the phone.')) return; await hangUp(); }
    closeCall();
  };
  chrome.storage.onChanged.addListener((ch) => { if (ch.called) S.called = ch.called.newValue || {}; });

  /* =====================================================================
     MONKEYS: speech bubbles, call-window stage, poking
  ===================================================================== */
  const pickLine = (a) => a[Math.floor(Math.random() * a.length)];
  function say(host, text, ms) {
    if (!host) return; host.querySelectorAll(':scope > .say').forEach((x) => x.remove());
    const b = document.createElement('div'); b.className = 'say'; b.textContent = text; host.appendChild(b);
    clearTimeout(host._sayT); host._sayT = setTimeout(() => b.remove(), ms || 2800);
  }
  const CALL_SAY = {
    dialing: ['Dialing! Fingers crossed.', 'Beep boop beep boop...', 'Pressing the shiny buttons!', 'Here goes nothing!', 'Tongue out = focus mode.'],
    ringing: ['Ring ring... pick up!', 'Come on, answer...', 'Hope they\u2019re not at lunch.', 'Tapping my foot. Silently.', 'Any second now...'],
    wait: ['Dialing on the phone...', 'Ring ring... pick up!', 'Come on, answer...'],
    connected: ['SOMEONE ANSWERED!!', 'Smile! They can hear it.', 'Talk like a legend.', 'You\u2019ve got this!'],
    ended: ['Smooth. Very smooth.', 'Nailed it, champ.', 'Hung up like a pro.', 'Sunglasses: still on.'],
    noanswer: ['Their loss!', 'Not today. Next one!', 'Voicemail wins this round.', 'Shrug. Moving on.'],
    failed: ['The phone said no. Check Setup?', 'Oops. Phone glitch!', 'Hmm. Is it plugged in?'],
  };
  let stageRun = 0, stageBase = null;
  async function stageState() {
    const r = C.r, el = q('#cmkw .sp'); if (!r || !el) return;
    const key = r.phone + '|' + C.s; if (key === C.stageKey) return; C.stageKey = key; const my = ++stageRun, s = C.s;
    if (CALL_SAY[s]) say(q('#cstage'), pickLine(CALL_SAY[s]), 3400);
    const play = (an, loop) => { stageBase = { an, loop }; return Monkey.setAnim(el, an, { loop }); };
    if (C.skA && (s === 'connected' || s === 'ended' || s === 'noanswer' || s === 'failed')) { const se = q('#csk .sp'); if (se) { Monkey.setAnim(se, C.skA[1], { loop: C.skA[1] !== 'cham_snap' }); setTimeout(() => { if (q('#csk .sp') === se) Monkey.setAnim(se, C.skA[0]); }, 2400); } }
    if (s === 'dialing') play('dial', true);
    else if (s === 'ringing' || s === 'wait') play('ring', true);
    else if (s === 'connected') { await play('answer', false); if (my === stageRun) play('talk', true); }
    else if (s === 'ended') { await play('hangup', false); if (my === stageRun) play('relax', true); }
    else if (s === 'noanswer') play('shrug', true);
    else if (s === 'failed') play('fail', true);
  }
  function startStage() {
    C.mk = Monkey.pickChar(well().buddy); C.stageKey = ''; stageRun++; stageBase = null;
    q('#cmkw').innerHTML = Monkey.html(C.mk, 'dial', { scale: 3, cls: 'mkx', attrs: { 'data-k': 'call' } });
    q('#cvine .cl').innerHTML = Monkey.html(C.mk, 'climb', { scale: 1, cls: 'mkx', attrs: { 'data-k': 'climb' } }); q('#cvine').dataset.m = '';
    C.sk = pickLine(['parrot', 'toucan', 'cham']); C.skA = { parrot: ['parrot_perch', 'parrot_squawk'], toucan: ['toucan_perch', 'toucan_laugh'], cham: ['cham_idle', 'cham_snap'] }[C.sk];
    q('#csk').innerHTML = Monkey.html(C.sk, C.skA[0], { scale: 1, cls: 'mkx', attrs: { 'data-k': C.sk } });
  }

  const POKE = {
    call: ['Hey! I\u2019m working here!', 'Boop received.', 'Careful, these shades are vintage.', 'Do I look like a stress ball?', 'Tickles!', 'Eyes on the phone, boss!'],
    sleep: ['Huh?! I wasn\u2019t sleeping!', 'Five more minutes...', 'Who touched the monkey?!', 'I was resting my eyes.'],
    cheer: ['Again! Again!', 'Banana time?', 'Woo! Thanks!', 'You\u2019re the best caller here.'],
    ride: ['BEEP BEEP!', 'Wheelie time!', 'Vroom vroom!', 'Hold my banana!'],
    climb: ['AAAAAH!', 'WHY WOULD YOU DO THAT?!', 'Nooooooo!', 'Ooh ooh AAAH!'],
    buddy: ['Hi hi!', 'Still here!', 'Need anything?'],
  };
  Object.assign(POKE, {
    parrot: ['Squawk! Polly wants a callback!', 'Pretty bird! Pretty lead!', 'Rawk! Dial the next one!', 'Squawk! Have you tried turning it off and on?'],
    sloth: ['...huh? Was I supposed to do something?', 'Slooowly... that tickles...', 'Five more minutes. Or hours.', 'I\u2019ll get to it. Eventually.'],
    toucan: ['Nice beak, right?', 'Haha! Tickles my beak!', 'I could talk about my beak all day.', 'Toot toot! Wrong bird? Right bird.'],
    cham: ['Got a fly! ...oh, that was you.', 'Changing colours just for you!', 'I\u2019m invisible. Wait, you can see me?', 'Tongue go zzzap!'],
  });
  const CRIT_REACT = { parrot: { an: 'parrot_squawk', loop: true, ms: 1500, t: [880, 1175] }, sloth: { an: 'sloth_munch', loop: true, ms: 2600, t: [262, 220] }, toucan: { an: 'toucan_laugh', loop: true, ms: 1500, t: [660, 990] }, cham: { an: 'cham_snap', loop: false, ms: 0, t: [520, 780] } };
  const poking = new WeakSet();
  async function fallClimber(el) {
    const cl = el.closest('.cl'), vine = el.closest('.vine'); if (!cl || !vine || cl._busy) return; cl._busy = true;
    const host = vine.parentElement, m = new DOMMatrix(getComputedStyle(cl).transform), y = m.m42;
    cl.style.animation = 'none'; cl.style.opacity = '1'; cl.style.transform = `translateY(${y}px)`;
    Monkey.setAnim(el, 'fall'); say(host, pickLine(POKE.climb), 1400); tone(520, 0.3, 0.07, 'sawtooth'); tone(260, 0.35, 0.07, 'sawtooth', 0.2);
    const dist = Math.max(10, 6 - y);
    try { await cl.animate([{ transform: `translateY(${y}px)` }, { transform: 'translateY(0px)' }], { duration: 260 + dist * 7, easing: 'cubic-bezier(.55,0,1,.7)', fill: 'forwards' }).finished; } catch (e) {}
    cl.style.transform = 'translateY(0px)'; Monkey.setAnim(el, 'dizzy'); host.classList.add('shake'); tone(110, 0.2, 0.1, 'square'); setTimeout(() => host.classList.remove('shake'), 520);
    cl.getAnimations().forEach((a) => a.cancel());
    await sleep(1700);
    cl.style.cssText = ''; Monkey.setAnim(el, 'climb', vine.classList.contains('still') ? { frame: 1 } : {}); cl._busy = false;
  }
  async function poke(el) {
    const k = el.dataset.k; if (!k || poking.has(el)) return;
    if (k === 'climb') return fallClimber(el);
    poking.add(el); const done = () => poking.delete(el);
    if (k === 'logo') {
      const sp = el.querySelector('.sp'), i = ((+el.dataset.i || 0) + 1) % 8; el.dataset.i = i;
      if (sp) { Monkey.setAnim(sp, 'face', { frame: i, char: sp.dataset.ch }); }
      if (el.classList.contains('logo')) say(q('.top'), pickLine(PEP.bongo), 4200);
      tone(600 + i * 70, 0.08, 0.05, 'square'); return setTimeout(done, 300);
    }
    if (k === 'call') {
      if (!stageBase || !stageBase.loop) return done();
      say(q('#cstage'), pickLine(POKE.call), 2200); const base = stageBase; await Monkey.setAnim(el, 'hello', { loop: false }); await sleep(1100);
      if (stageBase === base) Monkey.setAnim(el, base.an, { loop: base.loop }); return done();
    }
    if (k === 'ride') {
      const an = el.dataset.an, host = el.parentElement; say(host, pickLine(POKE.ride), 1500); tone(330, 0.12, 0.07, 'square'); tone(440, 0.2, 0.07, 'square', 0.14);
      Monkey.setAnim(el, 'ride', { speed: 2.5 }); el.style.transformOrigin = '19% 82%';
      try { await el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-22deg) translateY(-3px)', offset: 0.25 }, { transform: 'rotate(-22deg) translateY(-3px)', offset: 0.7 }, { transform: 'rotate(0)' }], { duration: 1100, easing: 'ease-out' }).finished; } catch (e) {}
      Monkey.setAnim(el, an === 'ride' && host.classList.contains('rider') && host.classList.contains('moving') ? 'ride' : 'rideIdle'); return done();
    }
    const host = el.closest('.stage') || el.closest('.art') || el.closest('.bmk') || el.parentElement;
    if (k === 'sleep') { say(host, pickLine(POKE.sleep), 1800); await Monkey.setAnim(el, 'answer', { loop: false }); await sleep(900); Monkey.setAnim(el, 'sleep'); return done(); }
    if (k === 'cheer') { say(host, pickLine(POKE.cheer), 1800); tone(700, 0.1, 0.05, 'square'); tone(940, 0.14, 0.05, 'square', 0.1); await Monkey.setAnim(el, 'flex'); await sleep(1500); Monkey.setAnim(el, 'cheer'); return done(); }
    if (k === 'buddy' || k === 'lunch') { say(host, pickLine(POKE.buddy), 1500); const an = el.dataset.an; Monkey.setAnim(el, 'hello'); await sleep(1300); if (!q('#buddy').hidden || !q('#lw').hidden) Monkey.setAnim(el, an); return done(); }
    if (CRIT_REACT[k]) {
      const r = CRIT_REACT[k], base = el.dataset.an; if (k === 'sloth') await sleep(700);
      say(host, pickLine(POKE[k]), 2400); tone(r.t[0], 0.1, 0.06, 'square'); tone(r.t[1], 0.14, 0.06, 'square', 0.1);
      await Monkey.setAnim(el, r.an, { loop: r.loop }); if (r.loop) await sleep(r.ms); else await sleep(500);
      if (el.isConnected) Monkey.setAnim(el, base); return done();
    }
    done();
  }
  document.addEventListener('click', (e) => { const el = e.target.closest('.mkx'); if (el) poke(el); });

  /* =====================================================================
     MONKEY BUDDY: pep talks, water, lunch
  ===================================================================== */
  const WELL_D = { pep: true, pepMin: 30, water: true, waterMin: 60, lunchOn: true, lunch: '13:00', lunchLen: 30, buddy: 'random' };
  const well = () => ({ ...WELL_D, ...get('well', {}) });
  bind('well', WELL_D, { pep: '#wPep', pepMin: '#wPepMin', water: '#wWater', waterMin: '#wWaterMin', lunchOn: '#wLunchOn', lunch: '#wLunch', lunchLen: '#wLunchLen' });
  const num = (v, d, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v) || d));
  q('#wWaterMin').min = 1; // was 10: picking 1 minute silently became 10
  const waterEvery = () => num(well().waterMin, 60, 1, 240) * 60000;
  const pepEvery = () => num(well().pepMin, 30, 5, 240) * 60000;
  const PEP = {
    bongo: ['Every \u201Cno\u201D is just a \u201Cyes\u201D wearing sunglasses.', 'Dial like it\u2019s hot, friend.', 'You\u2019re one call away from a legendary day. Stay bananas.', 'Calls are just waves. Paddle, pop up, ride.', 'Smile before you dial. They can hear it. It\u2019s science. Bongo science.', 'Chill voice, big energy. That\u2019s the move.', 'Rejection is just the universe redirecting your call. Next!', 'Even the tallest palm started as a tiny coconut.', 'You\u2019re not bothering them. You\u2019re brightening their day with a plot twist.', 'Hydrate, dial, repeat. The holy trinity.', 'Plot twist: today you\u2019re the best caller in the building.', 'No worries, just good vibes and a working phone.'],
    peel: ['Statistically, the next call is the one. I made that statistic up, but it feels right.', 'Fun fact: persistence beats talent when talent forgets to dial.', 'My research shows 100% of answered calls begin with a ring. Keep ringing!', 'According to my calculations, you\u2019re doing great. Margin of error: bananas.', 'Hypothesis: you will crush the next call. Experiment: dial it.', 'Posture check! Shoulders back, voice forward.', 'Every great discovery started with someone not giving up. And lab coats.', 'Eureka! \u2026Oh, that\u2019s just my sandwich. Back to calling!', 'Failure is data. Data is power. Power needs coffee. Hmm.', 'The mitochondria is the powerhouse of the cell. And you\u2019re the powerhouse of this list.', 'A smile travels through phone lines at nearly the speed of light. Don\u2019t quote me.', 'Peer review says: you\u2019re awesome.'],
    mango: ['You\u2019re doing fine. Don\u2019t make it weird.', 'Another call. Another chance to be mildly heroic.', 'Cool. Dial the next one. I\u2019ll be here, looking unimpressed but proud.', 'Not saying you\u2019re the best. But I haven\u2019t found anyone better. Yet.', 'Sure, it\u2019s Monday-ish. You\u2019re still the main character.', 'The phone won\u2019t dial itself. I checked. Twice.', 'Rejection builds character. You have so much character.', 'Look at you, being all productive and stuff.', 'Breathe in. Breathe out. Dial. Repeat. Very zen.', 'I believe in you. That took a lot out of me.', 'Take a sip of something. Sit up. Ok go.', 'Today\u2019s forecast: 90% chance of absolutely nailing it.'],
  };
  const WATER = {
    bongo: ['Hydration check, dude! Your brain is 75% water. Mine is 75% banana.', 'Sip time! Stay fresh like a coconut.', 'Water break! Your voice will thank you.', 'Gulp gulp! Good calls need good hydration.'],
    peel: ['Scientific fact: a hydrated caller is a charming caller. Drink up!', 'Your cells are sending a polite memo: more water, please.', 'Experiment: drink water. Expected result: you feel great.', 'Dry throat detected. Prescription: one glass of water.'],
    mango: ['Drink water. I\u2019m not asking twice. (I will ask twice.)', 'Hydrate. Or don\u2019t. Your throat, your problem. Hydrate.', 'Sip. Gulp. Feel slightly better. You\u2019re welcome.', 'Water. Now. Please. I\u2019m worried. In a chill way.'],
  };
  const LUNCH = {
    bongo: ['Lunch time, dude! Even legends refuel.', 'Break time! Your calls will taste sweeter after.'],
    peel: ['Time for the most important experiment: lunch!', 'Brain fuel required. Nutrition is science too.'],
    mango: ['Lunch. Go eat. The phone can wait. I\u2019ll guard it.', 'Food now. Calls later. Trust me.'],
  };
  const HELLO = { morning: 'Good morning! Let\u2019s make some calls today.', afternoon: 'Afternoon! Fresh energy, let\u2019s dial.', evening: 'Still dialing? Respect. You\u2019re a machine.' };
  const MILE = { 5: 'FIVE calls already! Warm-up complete.', 10: 'TEN calls! You\u2019re on fire (the good kind).', 20: 'TWENTY calls! Absolute legend behaviour.', 30: 'THIRTY calls?! Somebody give this human a banana.', 50: 'FIFTY calls!! I\u2019m telling the whole jungle.' };

  const BD = { t: null, q: [] };
  function buddyShow(o) {
    const el = q('#buddy'); clearTimeout(BD.t); BD.kind = o.kind; BD.char = o.char; el.className = 'buddy' + (o.kind === 'water' ? ' water' : '');
    q('#bname').textContent = Monkey.CH[o.char].name.toUpperCase(); q('#btext').textContent = o.text;
    q('#bmk').innerHTML = Monkey.html(o.char, o.anim, { scale: 2, cls: 'mkx', attrs: { 'data-k': 'buddy' } });
    q('#bact').innerHTML = (o.actions || []).map((a) => `<button class="${a.alt ? 'alt' : ''}" data-b="${a.id}">${esc(a.label)}</button>`).join('');
    el.hidden = false; BD.t = setTimeout(() => buddyHide(true), o.ms || 14000);
    tone(784, 0.08, 0.05, 'square'); tone(1046, 0.12, 0.05, 'square', 0.09);
  }
  function buddyHide(timeout) {
    clearTimeout(BD.t); if (q('#buddy').hidden) return; const kind = BD.kind; q('#buddy').hidden = true; q('#bmk').innerHTML = '';
    if (kind === 'water' && timeout !== 'drank' && timeout !== 'later') setNext({ water: Date.now() + waterEvery() });
  }
  q('#bclose').innerHTML = ic('close', 14); q('#bclose').onclick = () => buddyHide();
  q('#bact').onclick = (e) => {
    const b = e.target.closest('[data-b]'); if (!b) return; const id = b.dataset.b;
    if (id === 'drank') {
      const d = fmtD(new Date()), w = get('water', {}), n = (w.date === d ? w.n : 0) + 1; set('water', { date: d, n }); setNext({ water: Date.now() + waterEvery() });
      buddyHide('drank'); toast(`${n} glass${n === 1 ? '' : 'es'} of water today. Nice!`); tone(900, 0.08, 0.05); tone(1200, 0.1, 0.05, 'sine', 0.08); if (S.tab === 'setup') renderAcct();
    } else if (id === 'later') { buddyHide('later'); setNext({ water: Date.now() + 10 * 60000 }); toast('Okay, I\u2019ll nudge you in 10 minutes.'); }
    else buddyHide();
  };
  const pepTalk = (text, char) => { char = char || Monkey.pickChar(well().buddy); buddyShow({ kind: 'pep', char, anim: pickLine(['flex', 'hello', 'cheer']), text: text || pickLine(PEP[char]), actions: [{ id: 'ok', label: 'Thanks, monkey!' }], ms: 13000 }); };
  const waterNudge = () => { const char = Monkey.pickChar(well().buddy); buddyShow({ kind: 'water', char, anim: 'water', text: pickLine(WATER[char]), actions: [{ id: 'drank', label: 'I drank it' }, { id: 'later', label: 'In 10 min', alt: true }], ms: 180000 }); setNext({ water: Date.now() + waterEvery() }); };

  // Next-due times are kept in storage so closing/reopening the panel doesn't lose or restart the timer.
  const _wn = get('wellNext', {}), _t0 = Date.now();
  let nextPep = Math.min(+_wn.pep || Infinity, _t0 + pepEvery()), nextWater = Math.min(+_wn.water || Infinity, _t0 + waterEvery());
  function setNext(o) { if ('pep' in o) nextPep = o.pep; if ('water' in o) nextWater = o.water; set('wellNext', { pep: nextPep, water: nextWater }); }
  setNext({});
  let _wcfg = '';
  const wcfg = () => { const W = well(); return `${W.water}|${W.waterMin}|${W.pep}|${W.pepMin}`; };
  _wcfg = wcfg();
  // Re-plan whenever a reminder setting changes (typing, spinner or toggle), not only on blur.
  function planWell() {
    const W = well(), now = Date.now(), c = wcfg(); if (c === _wcfg) return; _wcfg = c;
    setNext({ pep: now + pepEvery(), water: now + waterEvery() });
  }
  ['input', 'change'].forEach((ev) => q('#wellCard').addEventListener(ev, planWell));
  const hm = (v) => { const m = /^(\d{1,2}):(\d{2})$/.exec(v || ''); return m ? +m[1] * 60 + +m[2] : null; };
  function lunchDue() {
    const W = well(), t = hm(W.lunch); if (!W.lunchOn || t == null) return false;
    const d = new Date(), mins = d.getHours() * 60 + d.getMinutes(), st = get('lunchSt', {});
    if (st.date === fmtD(d) && (st.done || (st.until && Date.now() < st.until))) return false;
    return mins >= t && mins < t + 120;
  }
  const busyNow = () => (C.r && !DONE.includes(C.s)) || !q('#cm').hidden || !q('#lw').hidden || !q('#sl').hidden || !q('#im').hidden;
  function tickWell() {
    if (document.hidden || busyNow()) return;
    const W = well(), now = Date.now();
    if (lunchDue()) return lunchOpen('ask');
    if (!q('#buddy').hidden) return;
    if (BD.q.length) { const m = BD.q.shift(); return pepTalk(m.text, m.char); }
    if (W.water && now >= nextWater) return waterNudge();
    if (W.pep && now >= nextPep) { setNext({ pep: now + pepEvery() }); pepTalk(); }
  }
  setInterval(tickWell, 5000);
  // milestones: queued when a call is logged, shown once the call window is closed
  const _logCall = logCall;
  logCall = function (outcome) {
    _logCall(outcome); const today = calllog().filter((x) => new Date(x.ts).toDateString() === new Date().toDateString()).length;
    if (MILE[today] && outcome !== 'failed') BD.q.push({ text: MILE[today], char: Monkey.pickChar(well().buddy) });
  };

  /* ----- lunch window ----- */
  const LW = { mode: '', char: 'mango', end: 0, tick: null, preview: false };
  const lunchLen = () => num(well().lunchLen, 30, 5, 180);
  function lunchOpen(mode, preview) {
    LW.preview = !!preview; LW.char = Monkey.pickChar(well().buddy === 'random' ? 'random' : well().buddy);
    q('#lst').style.setProperty('--scene', `url(${Monkey.url('picnic', 128, 58)})`);
    q('#lmkw').innerHTML = Monkey.html(LW.char, 'lunch', { scale: 3, cls: 'mkx', attrs: { 'data-k': 'lunch' }, loop: false });
    q('#lsk').innerHTML = Monkey.html('sloth', 'sloth_munch', { scale: 1, cls: 'mkx', attrs: { 'data-k': 'sloth' } });
    q('#lw').hidden = false; lunchMode(mode);
    const sp = q('#lmkw .sp'); if (sp && mode === 'ask') Monkey.setAnim(sp, 'lunch', { loop: false }).then(() => { if (LW.mode === 'ask' && !q('#lw').hidden) Monkey.setAnim(sp, 'eat'); });
    tone(523, 0.12, 0.06, 'square'); tone(659, 0.12, 0.06, 'square', 0.12); tone(784, 0.2, 0.06, 'square', 0.24);
  }
  function lunchMode(mode) {
    LW.mode = mode; const card = q('#lcard'), len = LW.preview ? 20 : lunchLen(), name = Monkey.CH[LW.char].name; card.dataset.m = mode;
    q('#lbig').hidden = q('#lbar').hidden = mode !== 'timer';
    const B = (id, label, alt) => `<button class="pxb ${alt ? 'alt' : ''}" data-l="${id}">${label}</button>`;
    if (mode === 'ask') {
      q('#ltitle').textContent = 'Lunch time!';
      q('#lsub').textContent = `${name} unpacked the lunch box. ${pickLine(LUNCH[LW.char])}`;
      q('#lacts').innerHTML = B('start', `Start lunch \u00B7 ${LW.preview ? '20 sec preview' : len + ' min'}`) + B('later', 'Continue working', true);
    } else if (mode === 'timer') {
      q('#ltitle').textContent = 'Enjoy your lunch!'; q('#lsub').textContent = 'Banana up, phone down. I\u2019ll yell when time\u2019s up.';
      q('#lacts').innerHTML = B('back', 'Back to work now', true);
    } else {
      q('#ltitle').textContent = 'Lunch is over!'; q('#lsub').textContent = `${name} says: you\u2019re fuelled and fabulous. Let\u2019s go dial.`;
      q('#lacts').innerHTML = B('back', 'Back to work');
      const sp = q('#lmkw .sp'); if (sp) Monkey.setAnim(sp, 'flex'); say(q('#lst'), 'BACK TO WORK!', 4000);
      tone(660, 0.12, 0.07, 'square'); tone(880, 0.12, 0.07, 'square', 0.14); tone(1320, 0.3, 0.07, 'square', 0.28);
    }
  }
  function lunchStart() {
    const len = LW.preview ? 20 : lunchLen(); LW.end = Date.now() + len * 1000 * (LW.preview ? 1 : 60); LW.total = len * 1000 * (LW.preview ? 1 : 60);
    if (!LW.preview) { set('lunchEnd', { end: LW.end, total: LW.total, char: LW.char }); set('lunchSt', { date: fmtD(new Date()), done: true }); }
    const sp = q('#lmkw .sp'); if (sp) Monkey.setAnim(sp, 'eat'); lunchMode('timer'); lunchTick(); clearInterval(LW.tick); LW.tick = setInterval(lunchTick, 500);
  }
  function lunchTick() {
    const left = Math.max(0, LW.end - Date.now()); q('#lbig').textContent = mmss(Math.ceil(left / 1000)); q('#lbar i').style.width = (left / (LW.total || 1)) * 100 + '%';
    if (left <= 0) { clearInterval(LW.tick); LW.tick = null; if (!LW.preview) set('lunchEnd', null); lunchMode('over'); }
  }
  function lunchClose() { clearInterval(LW.tick); LW.tick = null; q('#lw').hidden = true; if (!LW.preview) set('lunchEnd', null); q('#lmkw').innerHTML = ''; q('#lsk').innerHTML = ''; }
  q('#lacts').onclick = (e) => {
    const b = e.target.closest('[data-l]'); if (!b) return; const id = b.dataset.l;
    if (id === 'start') lunchStart();
    else if (id === 'later') {
      if (!LW.preview) { const st = get('lunchSt', {}), nags = (st.date === fmtD(new Date()) ? st.nags || 0 : 0) + 1; set('lunchSt', { date: fmtD(new Date()), nags, done: nags >= 2, until: Date.now() + 20 * 60000 }); toast(nags >= 2 ? 'Okay, no more lunch nagging today.' : 'Okay! I\u2019ll remind you again in 20 minutes.'); }
      lunchClose();
    } else lunchClose();
  };
  function resumeLunch() {
    const r = get('lunchEnd', null); if (!r) return;
    if (Date.now() - r.end > 30 * 60000) return set('lunchEnd', null);
    LW.char = r.char || 'mango'; LW.preview = false; LW.end = r.end; LW.total = r.total;
    q('#lst').style.setProperty('--scene', `url(${Monkey.url('picnic', 128, 58)})`); q('#lmkw').innerHTML = Monkey.html(LW.char, 'eat', { scale: 3, cls: 'mkx', attrs: { 'data-k': 'lunch' } });
    q('#lsk').innerHTML = Monkey.html('sloth', 'sloth_munch', { scale: 1, cls: 'mkx', attrs: { 'data-k': 'sloth' } });
    q('#lw').hidden = false;
    if (r.end > Date.now()) { lunchMode('timer'); lunchTick(); LW.tick = setInterval(lunchTick, 500); } else lunchMode('over');
  }


  /* ----- colour palettes ----- */
  const PALS = [['jungle', 'Jungle', '#2D6A4F', '#E2EFE7'], ['sunset', 'Sunset', '#D4511F', '#FBE3D6'], ['ocean', 'Ocean', '#1F6FB5', '#DCEAF8'], ['grape', 'Grape', '#7A47C9', '#E9DEF8'], ['bubblegum', 'Bubblegum', '#D12F7C', '#FADCE9'], ['banana', 'Banana', '#C98A0B', '#F8EBC4'], ['graphite', 'Graphite', '#3C4250', '#E4E5EA']];
  function applyPalette(id) {
    document.documentElement.dataset.pal = id; try { localStorage.setItem('rd-pal', id); } catch (e) {}
    css.setProperty('--scene', `url(${Monkey.url('jungle', 128, 58, id)})`); renderPalettes();
  }
  function renderPalettes() {
    const cur = document.documentElement.dataset.pal || 'jungle';
    q('#palPick').innerHTML = PALS.map(([id, name, a, b]) => `<button class="pal ${cur === id ? 'on' : ''}" data-p="${id}" style="--a:${a};--b:${b}"><i></i>${name}</button>`).join('');
  }
  q('#palPick').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { applyPalette(b.dataset.p); tone(660, 0.07, 0.05, 'square'); tone(880, 0.09, 0.05, 'square', 0.07); } };
  renderPalettes();
  Object.assign(PEP, {
    captain: ['Arr! Every lead be buried treasure. Start digging, matey!', 'Fair winds and fast dials, ye scallywag!', 'A \u201Cno\u201D be just a squall. Steer through it!', 'Shiver me timbers, ye be crushin\u2019 it today!', 'Keep yer eyes on the horizon and yer finger on the dial!', 'The best crew calls early and calls often. Yarr!', 'I lost an eye, not me nerve. Dial the next one!', 'X marks the spot, and the spot be the next contact.'],
    reggie: ['One does not simply give up. One dials, with elegance.', 'A pleasant tone, a firm resolve, and a splendid hat. That is all one needs.', 'Rejection? Merely a rehearsal for acceptance, my dear friend.', 'Do sit up straight. The telephone can sense posture.', 'Splendid effort! I shall inform the staff.', 'Politeness opens more doors than any key. Do carry on.', 'I have dialed in better circumstances, but never with better company.', 'Marvellous. Now, the next call, if you please.'],
    riot: ['Turn it up! Every call is a gig. Own the stage!', 'Rejection is just feedback with a bad attitude. Next song!', 'No rules, just dials. LET\u2019S GO!', 'You\u2019re a rockstar on the phone. Don\u2019t forget it.', 'Spikes up, voice up, follow-ups up!', 'They said no? Cool. Play it louder.', 'Be the loudest, kindest voice in the room. Mostly kind.', 'Smash that dial button like it owes you money!'],
    sheriff: ['Saddle up, partner. There\u2019s leads to wrangle.', 'This town ain\u2019t big enough for unanswered calls.', 'Slow and steady wins the round-up. Keep dialing.', 'A \u201Cno\u201D is just a \u201Cyes\u201D that ain\u2019t had its coffee yet.', 'Ride on, cowpoke. The next lead is waitin\u2019.', 'Hat on, head up, voice warm as a campfire.', 'Mighty fine work today, partner. Mighty fine.', 'Yeehaw! Now go call somebody.'],
    cosmo: ['Houston, we have a lead. Initiating call sequence!', 'One small dial for you, one giant leap for your numbers.', 'Rejection is just gravity. Push off and keep floating!', 'Mission control says: you\u2019re doing great. Over.', 'Countdown to your next success: 3... 2... dial!', 'Space is big, but your potential is bigger.', 'All systems go. Smile, they can hear it in orbit.', 'Fuel up, hydrate, launch the next call!'],
  });
  Object.assign(WATER, {
    captain: ['Arr, drink up, matey! Even pirates stay hydrated (mostly with rum, but water works).', 'Scurvy ain\u2019t the only danger. Dry throats be worse! Drink!', 'Hoist the water bottle, ye landlubber!'],
    reggie: ['A refreshing glass of water, if you please. Pinky out.', 'One must stay hydrated to remain devastatingly charming.', 'Do take a sip. It is the civilised thing to do.'],
    riot: ['Hydrate or die-drate! Drink some water, rockstar!', 'Even punks need water. Sip it LOUD.', 'Your voice is the instrument. Water is the tune-up!'],
    sheriff: ['Watering hole time, partner. Drink up!', 'Even the toughest cowboys drink water. Go on.', 'Yer horse is hydrated. Be like yer horse.'],
    cosmo: ['Hydration levels low. Initiating water protocol!', 'Astronauts drink water. Be like an astronaut.', 'Life support check: drink some water, human.'],
  });
  Object.assign(LUNCH, {
    captain: ['Time for grub, matey! Even pirates break for lunch.', 'Man the galley! Lunch be served!'],
    reggie: ['Luncheon is served, my dear friend. Do enjoy.', 'A gentleman never skips lunch. Shall we?'],
    riot: ['Lunch break! Go fuel the rockstar!', 'Eat something! Mosh pit later.'],
    sheriff: ['Chuck wagon\u2019s open, partner. Come get it!', 'Time to rest yer saddle and eat some grub.'],
    cosmo: ['Mealtime! Preparing nutritional supplies for launch.', 'Refuel the astronaut. Lunch is go!'],
  });
  [['#sl', 'Kiko will fetch your contacts. Pick a tab to begin.'], ['#im', 'Kiko checks every column. Match them below.']].forEach(([sel, txt]) => {
    const ih = q(sel + ' .ih'); if (ih) ih.insertAdjacentHTML('afterend', `<div class="critrow">${Monkey.html('cham', 'cham_idle', { scale: 1, cls: 'mkx', attrs: { 'data-k': 'cham' } })}<span>${txt}</span></div>`);
  });
  /* ----- settings: buddy picker + previews ----- */
  function renderBuddyPick() {
    const cur = well().buddy;
    q('#buddyPick').innerHTML = `<button class="bp ${cur === 'random' ? 'on' : ''}" data-b="random"><span class="fc">\uD83C\uDFB2</span>Surprise me</button>` + Monkey.names.map((id) => `<button class="bp ${cur === id ? 'on' : ''}" data-b="${id}"><span class="fc">${Monkey.html(id, 'face', { scale: 1, frame: 0 })}</span>${esc(Monkey.CH[id].name)}</button>`).join('');
  }
  q('#buddyPick').onclick = (e) => {
    const b = e.target.closest('[data-b]'); if (!b) return; set('well', { ...get('well', {}), buddy: b.dataset.b }); renderBuddyPick(); savedHint();
    if (b.dataset.b !== 'random') { say(q('#buddyPick').parentElement, Monkey.CH[b.dataset.b].tag, 3200); }
  };
  q('#pvPep').onclick = () => pepTalk(); q('#pvWater').onclick = () => waterNudge(); q('#pvLunch').onclick = () => lunchOpen('ask', true);
  renderBuddyPick();
  setTimeout(() => { // greeting once every few hours
    if (!well().pep || busyNow() || !q('#buddy').hidden) return; const last = get('lastHello', 0); if (Date.now() - last < 3 * 3600 * 1000) return; set('lastHello', Date.now());
    const h = new Date().getHours(); pepTalk(HELLO[h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening']);
  }, 4000);
  planWell(); resumeLunch();

  /* =====================================================================
     MESSAGE THE ADMIN: problem reports (queued, retried, reviewed in the admin dashboard)
  ===================================================================== */
  const RPT_CATS = [['bug', 'Something is broken'], ['phone', 'Desk phone / dialing'], ['sheet', 'Google Sheet'], ['contacts', 'Contacts / import'], ['access', 'Sign-in or access'], ['idea', 'Idea or request'], ['other', 'Something else']];
  const RPT_MAX = 1500, RPT_MIN = 10;
  const reports = () => get('reports', []), saveReports = (a) => set('reports', a.slice(-30));
  const maskSensitive = (t) => String(t).replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, 'x.x.x.x').replace(/\d{5,}/g, (m) => m.slice(0, 2) + '\u2022\u2022\u2022' + m.slice(-1)).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '(email)');
  q('#rptCat').innerHTML = RPT_CATS.map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
  q('#rptBird').innerHTML = Monkey.html('parrot', 'parrot_perch', { scale: 1 });
  function rptDiag() {
    const d = {};
    try {
      const man = chrome.runtime.getManifest(), dk = desk(), j = get('join', {}), sh = sheetCfg(), rows = (get('results4', {}) || {}).rows;
      Object.assign(d, {
        app: man.version, chrome: (/Chrome\/([\d.]+)/.exec(navigator.userAgent) || [])[1], os: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform,
        lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, viewport: `${innerWidth}x${innerHeight}`, tab: S.tab,
        look: `${document.documentElement.dataset.pal}/${document.documentElement.dataset.theme}`,
        setup: { deskFieldsSet: Object.keys(dk).filter((k) => dk[k]), sheetLinked: !!sh.url, laptopSoftphone: !!j.dial, joinOnLaptop: !!j.on, soundOn: !!(pref() && pref().sound) },
        counts: { contacts: rows ? rows.length : 0, callsToday: calllog().filter((x) => new Date(x.ts).toDateString() === new Date().toDateString()).length, queuedReports: reports().filter((r) => r.st === 'queued').length },
        lastLog: maskSensitive((q('#log').textContent || '').trim().split('\n').slice(-25).join('\n')),
      });
    } catch (e) { d.error = String(e && e.message || e); }
    return d;
  }
  const catLabel = (id) => (RPT_CATS.find((c) => c[0] === id) || [0, 'Other'])[1];
  function rptRender() {
    const list = reports().slice().reverse().slice(0, 6);
    q('#rptList').innerHTML = list.map((r) => `<div class="rpi ${r.st}"><i></i><div><b>${esc(catLabel(r.cat))}</b><small>${new Date(r.ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} \u00B7 ${r.st === 'sent' ? 'Delivered to the admin' : 'Waiting to send\u2026 will retry automatically'}</small><p>${esc(r.msg.slice(0, 140))}${r.msg.length > 140 ? '\u2026' : ''}</p></div>${r.st === 'queued' ? `<button class="btn sm" data-retry="1">Retry</button>` : ''}</div>`).join('');
    const qd = list.some((r) => r.st === 'queued'); q('#rptList').querySelectorAll('[data-retry]').forEach((b) => (b.onclick = () => rptFlush(true)));
    return qd;
  }
  let rptBusy = false;
  async function rptFlush(manual) {
    if (rptBusy) return; const all = reports(), todo = all.filter((r) => r.st === 'queued'); if (!todo.length) return; rptBusy = true;
    let delivered = 0, why = '';
    for (const r of todo) {
      const res = await window.license.report({ rid: r.id, category: r.cat, message: r.msg, diagnostics: r.diag || null, createdAt: r.ts }).catch(() => ({ ok: false, reason: 'unreachable' }));
      r.tries = (r.tries || 0) + 1;
      if (res.ok) { r.st = 'sent'; r.srv = res.id || ''; delivered++; } else { why = res.reason; if (['unreachable', 'endpoint_missing', 'session_expired', 'server_error', 'rate_limited'].includes(res.reason)) break; }
    }
    saveReports(all); rptBusy = false; rptRender();
    const bird = q('#rptBird .sp');
    if (delivered) { toast(`Delivered! The admin will review it.`); if (bird) { Monkey.setAnim(bird, 'parrot_squawk'); setTimeout(() => bird.isConnected && Monkey.setAnim(bird, 'parrot_perch'), 1800); } q('#rptStatus').textContent = 'Delivered to the admin. Thank you!'; }
    else if (manual || why) q('#rptStatus').textContent = why === 'endpoint_missing' ? 'Saved on this computer. The admin server is not set up to receive reports yet. It will keep retrying.' : why === 'unreachable' ? 'No connection. Saved here and will be sent automatically when you are back online.' : why === 'session_expired' ? 'Please sign in again, then it will send automatically.' : why === 'rate_limited' ? 'Too many reports in a short time. It will send a bit later.' : 'Could not send right now. Saved here and will retry automatically.';
  }
  q('#rptMsg').oninput = () => { const n = q('#rptMsg').value.length; q('#rptCount').textContent = `${n} / ${RPT_MAX}`; };
  q('#rptSend').onclick = async () => {
    const msg = q('#rptMsg').value.trim(); if (msg.length < RPT_MIN) return toast('Please describe the problem in a few words so the admin can help.', 1);
    const recent = reports().filter((r) => Date.now() - r.ts < 3600e3).length; if (recent >= 5) return toast('You have sent 5 reports in the last hour. Please wait a bit.', 1);
    const item = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)), ts: Date.now(), cat: q('#rptCat').value, msg, diag: q('#rptDiag').checked ? rptDiag() : null, st: 'queued', tries: 0 };
    saveReports([...reports(), item]); q('#rptMsg').value = ''; q('#rptCount').textContent = `0 / ${RPT_MAX}`; q('#rptStatus').textContent = 'Sending\u2026'; rptRender();
    const bird = q('#rptBird .sp'); if (bird) Monkey.setAnim(bird, 'parrot_fly'); tone(660, 0.08, 0.05, 'square'); tone(990, 0.1, 0.05, 'square', 0.08);
    await sleep(1400); await rptFlush(true); if (bird && bird.isConnected) Monkey.setAnim(bird, 'parrot_perch');
  };
  function rptPrefill(cat, text) {
    showTab('setup'); setTimeout(() => { q('#rptCat').value = cat || 'bug'; q('#rptMsg').value = text || ''; q('#rptMsg').oninput(); q('#rptCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); q('#rptMsg').focus(); }, 250);
  }
  q('#rptBtn').onclick = () => rptPrefill('bug', '');
  rptRender(); setInterval(() => rptFlush(false), 5 * 60000); setTimeout(() => rptFlush(false), 4000);

  /* ---------- backup ---------- */
  q('#bkExp').onclick = () => {
    if (!window.license.can('backup')) return toast('Backup is not enabled for your account.', 1);
    if (!confirm('This file contains your desk-phone passcode, sheet key and contact details in plain text. Keep it private. Export?')) return;
    const LICENSE = ['licenseToken', 'activatedAt', 'lastServerOk', 'licSession', 'licDeviceId', 'licEmail', 'licLastOk'];
    const out = Object.fromEntries(Object.entries(db).filter(([k]) => !LICENSE.includes(k)));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
    a.download = `contact-desk-backup-${fmtD(new Date())}.json`; document.body.appendChild(a); a.click(); a.remove();
  };
  q('#bkImp').onclick = () => { if (!window.license.can('backup')) return toast('Restore is not enabled for your account.', 1); q('#bkFile').click(); };
  q('#bkFile').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      let o = JSON.parse(await f.text()); if (typeof o !== 'object' || Array.isArray(o)) throw new Error('bad');
      const ALLOWED = new Set([...SYNC_KEYS, 'desk', 'sheetKey', 'called', 'calllog', 'counts4', 'results4', 'pending', 'progress', 'snaps']);
      o = Object.fromEntries(Object.entries(o).filter(([k]) => ALLOWED.has(k)));
      await chrome.storage.local.set(o);
      const sy = {}; for (const k of SYNC_KEYS) if (k in o) sy[k] = o[k]; chrome.storage.sync.set(sy).catch(() => {});
      toast('Backup restored. Reloading…'); setTimeout(() => location.reload(), 900);
    } catch (err) { toast('That file is not a valid backup.', 1); }
  };

  /* ---------- startup ---------- */
  readiness(); renderPrev(); q('#sub').textContent = S.results.length ? `${S.results.length} contacts ready` : 'Import a CSV to begin'; renderCall(); renderCal();
  q('#rcount').textContent = S.results.length || '';
  showTab(S.results.length ? 'results' : 'calls');
  verifySheet(true).then(flushPending);
})();
