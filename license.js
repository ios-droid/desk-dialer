// Desk Dialer access gate: Sign in with Google + server-side allow list.
// Loaded before app.js (see app.html). The whole side panel stays behind a full-screen
// overlay until the server confirms that this Google account is allowed, unexpired,
// not suspended, and signed in on its ONE locked device.
//
// - window.license.can('dial' | 'sheetLog' | 'importContacts' | 'exportData' | 'backup')
//   tells app.js which features the admin switched on for this user.
// - The server is re-asked on every panel open and every RECHECK_MS, so suspensions,
//   expiry, device resets and permission changes take effect within a minute.
// - Fail-locked: if the server cannot be reached, the panel stays locked.
(function () {
  const LICENSE_SERVER = 'https://server-mocha-eta-42.vercel.app';
  const GOOGLE_CLIENT_ID = '1060711022919-dt9fgvglmu6u9605oo667ie5jsf21b83.apps.googleusercontent.com'; // see SETUP.md, step 2
  const RECHECK_MS = 60 * 1000;
  const VERSION = chrome.runtime.getManifest().version;
  const K = ['licSession', 'licDeviceId', 'licEmail', 'licLastOk'];

  const state = { permissions: {}, name: '', email: '', expiresAt: 0 };
  // Single source of truth for feature permissions. The admin dashboard must offer exactly these keys.
  const PERMISSIONS = [
    { key: 'dial', label: 'Dial from desk phone', desc: 'Place calls through the Grandstream phone.' },
    { key: 'sheetLog', label: 'Log calls to Google Sheet', desc: 'Write answered calls and notes back to the linked sheet.' },
    { key: 'importContacts', label: 'Import and load contacts', desc: 'Import CSV files and load lists from a Google Sheet.' },
    { key: 'exportData', label: 'Export data', desc: 'Download contacts and results as CSV.' },
    { key: 'backup', label: 'Backup and restore', desc: 'Export and import settings and call history.' },
  ];
  window.license = {
    PERMISSIONS,
    can: (k) => !!state.permissions[k],
    get user() { return { ...state }; },
    // Sends a problem report to the admin dashboard. Returns { ok:true, id } or { ok:false, reason }.
    report: async (p) => {
      const { licSession } = await chrome.storage.local.get('licSession');
      if (!licSession) return { ok: false, reason: 'session_expired' };
      const r = await post('/api/report', { token: licSession, deviceId: await deviceId(), version: VERSION, ...p });
      if (r && r.ok === true) return r;
      if (r && r.reason === 'server_error' && /HTTP (404|405)/.test(r.detail || '')) return { ok: false, reason: 'endpoint_missing' };
      return { ok: false, reason: (r && r.reason) || 'server_error' };
    },
    signOut: async () => { await chrome.storage.local.remove(['licSession', 'licEmail', 'licLastOk']); location.reload(); },
  };

  async function deviceId() {
    const { licDeviceId } = await chrome.storage.local.get('licDeviceId');
    if (licDeviceId) return licDeviceId;
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ licDeviceId: id });
    return id;
  }
  function deviceName() {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || 'Computer';
    const v = (/Chrome\/(\d+)/.exec(navigator.userAgent) || [])[1];
    return p + ' · Chrome ' + (v || '');
  }

  async function post(path, body) {
    try {
      const r = await fetch(LICENSE_SERVER + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return { ok: false, valid: false, reason: 'server_error', detail: 'HTTP ' + r.status + ' from ' + path };
      return await r.json();
    } catch (e) { return { ok: false, valid: false, reason: 'unreachable' }; }
  }

  // Opens Google's account chooser and returns an access token (scope: email only).
  function googleToken() {
    const redirect = chrome.identity.getRedirectURL();
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, response_type: 'token', redirect_uri: redirect,
      scope: 'email', prompt: 'select_account',
    });
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url, interactive: true }, (resp) => {
        if (chrome.runtime.lastError || !resp) return reject(new Error('google_cancelled'));
        const t = new URLSearchParams(new URL(resp).hash.slice(1)).get('access_token');
        t ? resolve(t) : reject(new Error('google_failed'));
      });
    });
  }

  function apply(r) {
    state.permissions = r.permissions || {};
    state.name = r.name || '';
    state.expiresAt = r.expiresAt || 0;
  }

  async function status() {
    const { licSession, licEmail } = await chrome.storage.local.get(['licSession', 'licEmail']);
    if (!licSession) return { ok: false, reason: 'not_signed_in' };
    const r = await post('/api/validate', { token: licSession, deviceId: await deviceId(), version: VERSION });
    if (!r.valid) return { ok: false, reason: r.reason || 'unreachable', info: r };
    state.email = licEmail || '';
    apply(r);
    await chrome.storage.local.set({ licLastOk: Date.now() });
    return { ok: true };
  }

  async function signIn(accessToken, pin) {
    const r = await post('/api/auth', { accessToken, deviceId: await deviceId(), deviceName: deviceName(), version: VERSION, pin });
    if (!r.ok) { const e = new Error(r.reason || 'server_error'); e.info = r; throw e; }
    state.email = r.user.email;
    apply(r.user);
    await chrome.storage.local.set({ licSession: r.session, licEmail: r.user.email, licLastOk: Date.now() });
  }

  const fmt = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  function message(reason, info = {}) {
    if (info.message) return info.message;
    if (reason === 'server_error' && info.detail) return 'Server error (' + info.detail + '). Tell the administrator.'; // e.g. the maintenance text you wrote in the dashboard
    const who = info.email ? ' (' + info.email + ')' : '';
    return ({
      not_signed_in: '',
      google_cancelled: 'Sign-in was cancelled.',
      google_failed: 'Google sign-in failed. Try again.',
      not_allowed: 'This Google account' + who + ' is not approved. Ask the administrator to add it, or use a different account.',
      expired: 'Your access ended' + (info.expiresAt ? ' on ' + fmt(info.expiresAt) : '') + '. Contact the administrator to renew.',
      not_started: 'Your access has not started yet.',
      suspended: 'Your access is suspended. Contact the administrator.',
      device_locked: 'This account is already in use on another computer. Ask the administrator to reset your device.',
      pin_required: 'Enter your PIN to continue.',
      bad_pin: 'Wrong PIN. Try again.',
      rate_limited: 'Too many attempts. Wait a few minutes and try again.',
      session_expired: 'Please sign in again.',
      unreachable: 'Could not reach the server. Check your internet connection.',
      server_error: 'Server error. Try again shortly.',
      bad_signature: 'Please sign in again.',
      maintenance: 'Desk Dialer is temporarily unavailable. Please try again later.',
      update_required: 'Please update Desk Dialer to the latest version, then reopen it.',
      legacy_disabled: 'This license key is no longer accepted. Sign in with Google instead.',
    })[reason] ?? 'Access denied.';
  }

  /* ---------- overlay ---------- */
  let pendingToken = null; // Google token kept in memory while the user types a PIN
  function overlay(reason, info) {
    let el = document.getElementById('license-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'license-overlay';
      const M = window.Monkey, mk = M ? M.html(M.pickChar('random'), 'ride', { scale: 1 }) + M.html('parrot', 'parrot_fly', { scale: 1, cls: 'bird' }) : '';
      el.innerHTML = `
        <style>
          #license-overlay{position:fixed;inset:0;z-index:999999;background:var(--bg,#F5F4EF);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--tx,#1E2420);padding:16px}
          #license-overlay .box{background:var(--card,#fff);border:1px solid var(--ln,#E2DFD6);padding:24px 22px 18px;border-radius:14px;width:100%;max-width:320px;text-align:center;box-shadow:0 12px 40px rgba(30,36,32,.08)}
          #license-overlay .hd{display:flex;align-items:center;justify-content:center;gap:10px}
          #license-overlay .hd b{font-size:17px;letter-spacing:-.01em}
          #license-overlay .hd .sp{margin-top:2px}
          #license-overlay p{font-size:12.5px;line-height:1.5;color:var(--mu,#6A706A);margin:8px 0 16px}
          #license-overlay input{width:100%;box-sizing:border-box;padding:10px;margin:0 0 10px;border-radius:10px;border:1px solid var(--ln,#E2DFD6);background:var(--card,#fff);color:inherit;font-size:14px;text-align:center;letter-spacing:3px}
          #license-overlay input:focus{outline:none;border-color:var(--g,#2D6A4F);box-shadow:0 0 0 3px rgba(45,106,79,.18)}
          #license-overlay button{width:100%;padding:11px;border-radius:10px;border:1px solid var(--g,#2D6A4F);background:var(--g,#2D6A4F);color:#fff;cursor:pointer;font:600 13.5px inherit}
          #license-overlay button:hover:not(:disabled){background:var(--g2,#1F5039)}
          #license-overlay button.alt{background:transparent;border:1px solid var(--ln,#E2DFD6);margin-top:8px;color:var(--tx,#1E2420)}
          #license-overlay button:disabled{opacity:.55;cursor:default}
          #license-overlay .msg{font-size:12.5px;color:var(--warnc,#8F5F00);margin-top:12px;min-height:16px;line-height:1.4}
          #license-overlay .lane{position:relative;height:100px;margin:18px -6px 0;overflow:hidden}
          #license-overlay .lane::after{content:"";position:absolute;left:0;right:0;bottom:7px;height:2px;background:repeating-linear-gradient(90deg,var(--ln2,#CFCBBF) 0 8px,transparent 8px 14px)}
          #license-overlay .lane .sp{position:absolute;bottom:3px;left:-90px;animation:lo-ride 5s linear infinite}
          #license-overlay .lane .bird{bottom:40px;animation:lo-fly 8s linear infinite;animation-delay:-3s}
          @keyframes lo-fly{0%{transform:translate(-100px,0)}50%{transform:translate(200px,-8px)}100%{transform:translate(520px,0)}}
          @keyframes lo-ride{to{transform:translateX(480px)}}
          @media (prefers-reduced-motion:reduce){#license-overlay .lane .sp{animation:none;left:120px}}
        </style>
        <div class="box"><div class="hd">${M ? M.html('bongo', 'face', { scale: 1, frame: 0 }) : ''}<b>Desk Dialer</b></div><p id="lo-sub">Sign in with the Google account your administrator approved.</p>
          <input id="lo-pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" hidden>
          <button id="lo-go">Sign in with Google</button>
          <button id="lo-alt" class="alt" hidden>Use a different account</button>
          <div class="msg" id="lo-msg" role="alert"></div>
          <div class="lane">${mk}</div></div>`;
      document.body.appendChild(el);
      const msg = el.querySelector('#lo-msg'), go = el.querySelector('#lo-go'), pin = el.querySelector('#lo-pin'), alt = el.querySelector('#lo-alt');
      const run = async (fresh) => {
        go.disabled = true; msg.textContent = 'Checking…';
        try {
          if (fresh || !pendingToken) { pendingToken = null; pendingToken = await googleToken(); }
          await signIn(pendingToken, pin.hidden ? undefined : pin.value.trim());
          pendingToken = null; location.reload();
        } catch (e) {
          const r = e.info?.reason || e.message;
          msg.textContent = message(r, e.info);
          const needPin = r === 'pin_required' || r === 'bad_pin';
          pin.hidden = !needPin; if (needPin) pin.focus(); else pendingToken = null;
          alt.hidden = !['not_allowed', 'expired', 'suspended', 'not_started', 'device_locked'].includes(r);
          go.textContent = needPin ? 'Continue' : 'Sign in with Google';
        } finally { go.disabled = false; }
      };
      go.onclick = () => run(pin.hidden);
      alt.onclick = () => { pin.hidden = true; pin.value = ''; run(true); };
      pin.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    }
    if (reason !== 'not_signed_in') el.querySelector('#lo-msg').textContent = message(reason, info);
  }

  async function gate() {
    const s = await status();
    if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
    if (!s.ok) { overlay(s.reason, s.info); return false; }
    document.getElementById('license-overlay')?.remove();
    return true;
  }

  // app.js awaits this before it starts.
  window.__licenseReady = gate();
  setInterval(gate, RECHECK_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) gate(); });
})();
