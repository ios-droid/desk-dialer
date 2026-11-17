// Clicking the toolbar icon opens the side panel. "Open in full tab" lives inside the app.
const init = () => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

// Desk-phone requests run here. A service worker can read plain-http LAN devices that send no CORS
// headers; "probe" only asks "does it answer at all?" and never needs to read the reply.
// Chrome rejects the phone's self-signed cert for extension fetches but not for a tab the user accepted it in,
// so on failure we run the request inside a tab on the phone's own origin (same-origin: no CORS, no cert error).
async function viaTab(m) {
  const origin = new URL(m.url).origin;
  let [tab] = await chrome.tabs.query({ url: origin + '/*' });
  if (!tab) tab = await chrome.tabs.create({ url: origin + '/', active: false });
  for (let i = 0; i < 40 && (await chrome.tabs.get(tab.id)).status !== 'complete'; i++) await new Promise((r) => setTimeout(r, 250));
  const [res] = await chrome.scripting.executeScript({
    target: { tabId: tab.id }, world: 'MAIN', args: [m.url, m.method || 'GET', m.body || null, m.timeout || 8000],
    func: async (url, method, body, timeout) => {
      const c = new AbortController(), t = setTimeout(() => c.abort(), timeout);
      try { const r = await fetch(url, { method, body, signal: c.signal, cache: 'no-store' }); return { ok: true, status: r.status, text: await r.text() }; }
      catch (e) { return { ok: false, error: e.message }; } finally { clearTimeout(t); }
    },
  });
  return res.result;
}


// Only this extension's own pages may use the request helper, and only for private-network devices
// (the desk phone). Content scripts on web pages are rejected.
const isPrivateHost = (h) =>
  /^(localhost|[\w-]+\.local)$/i.test(h) ||
  /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
  false;
function allowedRequest(m, sender) {
  if (!sender || sender.id !== chrome.runtime.id || !(sender.url || '').startsWith(chrome.runtime.getURL(''))) return false;
  try { const u = new URL(m.url); return (u.protocol === 'http:' || u.protocol === 'https:') && isPrivateHost(u.hostname); }
  catch (e) { return false; }
}

chrome.runtime.onMessage.addListener((m, sender, send) => {
  if (m.type !== 'http' && m.type !== 'probe') return;
  if (!allowedRequest(m, sender)) { send({ ok: false, error: 'blocked: only private-network devices are allowed' }); return; }
  (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), m.timeout || 8000);
    try {
      const r = await fetch(m.url, { method: m.method || 'GET', headers: m.headers, body: m.body, signal: ctrl.signal, cache: 'no-store', mode: m.type === 'probe' ? 'no-cors' : 'cors' });
      send(m.type === 'probe' ? { ok: true } : { ok: true, status: r.status, text: await r.text() });
    } catch (e) {
      let err = e.name === 'AbortError' ? 'timed out' : e.message;
      if (m.url.startsWith('https://')) {
        try { const r = await viaTab(m); send(m.type === 'probe' ? { ok: r.ok } : r); return; }
        catch (e2) { err = `open ${new URL(m.url).origin} in a tab and accept the certificate warning (${e2.message})`; }
      }
      send({ ok: false, error: err });
    } finally { clearTimeout(timer); }
  })();
  return true;
});

// GitHub update notice (manual update): checks the public repository's manifest.json.
// It never downloads or installs code. Users update with `git pull`, then reload the extension.
const REPO = 'ios-droid/desk-dialer';
const UPDATE_CHECK_ALARM = 'desk-dialer-update-check';
const UPDATE_CHECK_INTERVAL_MINUTES = 6 * 60;
const UPDATE_MANIFEST_URL = `https://raw.githubusercontent.com/${REPO}/main/manifest.json`;

function compareVersions(a, b) {
  const aa = String(a).split('.').map((n) => Number.parseInt(n, 10) || 0);
  const bb = String(b).split('.').map((n) => Number.parseInt(n, 10) || 0);
  const length = Math.max(aa.length, bb.length);
  for (let i = 0; i < length; i++) {
    const x = aa[i] || 0;
    const y = bb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

async function checkForExtensionUpdate() {
  try {
    const response = await fetch(`${UPDATE_MANIFEST_URL}?check=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github.raw+json' },
    });
    if (!response.ok) return;
    const remoteManifest = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;
    const latestVersion = remoteManifest && remoteManifest.version;
    if (!latestVersion || compareVersions(latestVersion, currentVersion) <= 0) return;

    const { deskDialerNotifiedVersion } = await chrome.storage.local.get('deskDialerNotifiedVersion');
    if (deskDialerNotifiedVersion === latestVersion) return;

    await chrome.notifications.create(`desk-dialer-update-${latestVersion}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: `Desk Dialer update available (v${latestVersion})`,
      message: `You have v${currentVersion}. Open your Desk Dialer folder in Terminal, run git pull, then reload Desk Dialer at chrome://extensions.`,
      priority: 1,
    });
    await chrome.storage.local.set({ deskDialerNotifiedVersion: latestVersion });
  } catch (error) {
    // Offline, GitHub unavailable, or repository not published yet: retry on the next alarm.
  }
}

function scheduleUpdateChecks() {
  chrome.alarms.create(UPDATE_CHECK_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: UPDATE_CHECK_INTERVAL_MINUTES,
  });
  checkForExtensionUpdate();
}

chrome.runtime.onInstalled.addListener(scheduleUpdateChecks);
chrome.runtime.onStartup.addListener(scheduleUpdateChecks);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_CHECK_ALARM) checkForExtensionUpdate();
});

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: `https://github.com/${REPO}` });
});

