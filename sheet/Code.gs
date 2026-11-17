/**
 * Desk Dialer - Google Sheet helper (v3, fixed columns).
 * The extension copies this script to your clipboard with the secret key already filled in.
 * Paste it in: your Sheet > Extensions > Apps Script > select all > paste > Save > Deploy.
 *
 * Fixed columns (an empty tab gets them automatically):
 *   Sn | Name | Phone | Call Status | Called At | Talk Time (s) | Remark | Called By
 *
 * Call Status is a dropdown:
 *   Answered      - the person picked up
 *   Not Answered  - nobody picked up
 *   Call again    - you want to call this number again (it is NOT skipped when you load contacts)
 *
 * Actions: tabs | read | ping | sync | called | note
 * Updating from v1/v2? Paste this over the old script, then Deploy > Manage deployments > New version.
 * Your secret key stays the same.
 */
const TOKEN = '__TOKEN__';
const VERSION = 3;
const HEADERS = ['Sn', 'Name', 'Phone', 'Call Status', 'Called At', 'Talk Time (s)', 'Remark', 'Called By'];
const CALL_HEADS = ['Call Status', 'Called At', 'Talk Time (s)', 'Remark', 'Called By'];
const STATUSES = ['Answered', 'Not Answered', 'Call again'];
const MAX_ROWS = 50000;

const key_ = (p) => String(p).replace(/\D/g, '').slice(-10);
const out_ = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const status_ = (v) => {
  const s = String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return STATUSES.find((x) => x.toLowerCase() === s) || (s === 'called' ? 'Answered' : 'Answered');
};

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.token !== TOKEN) return out_({ ok: false, error: 'Wrong secret key. Copy the key from your script (const TOKEN) into the extension.' });
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = SpreadsheetApp.getActive();
      if (b.action === 'tabs') return out_(tabs_(ss));
      if (b.action === 'read') return out_(read_(ss, b));
      const sh = sheet_(ss, b);
      if (b.action === 'ping') { prep_(sh); return out_({ ok: true, v: VERSION, tab: sh.getName(), name: ss.getName(), url: ss.getUrl() }); }
      if (b.action === 'sync') { prep_(sh); return out_(sync_(sh, b)); }
      if (b.action === 'called') { prep_(sh); return out_(called_(sh, b)); }
      if (b.action === 'note') { prep_(sh); return out_(note_(sh, b)); }
      return out_({ ok: false, error: 'Unknown action' });
    } finally { lock.releaseLock(); }
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function sheet_(ss, b) {
  if (b && b.tab) {
    const t = ss.getSheetByName(b.tab);
    if (!t) throw new Error('There is no tab named "' + b.tab + '" in this spreadsheet.');
    return t;
  }
  return ss.getSheetByName('Contacts') || ss.getSheets()[0];
}

function tabs_(ss) {
  return {
    ok: true, name: ss.getName(), url: ss.getUrl(),
    tabs: ss.getSheets().map((s) => ({ name: s.getName(), rows: Math.max(s.getLastRow() - 1, 0), cols: s.getLastColumn() })),
  };
}

// Row 1 = headers. Display values are sent so phone numbers keep their look (no 9.7E+9).
function read_(ss, b) {
  const sh = sheet_(ss, b);
  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (!lr || !lc) return { ok: true, tab: sh.getName(), headers: [], rows: [], total: 0, truncated: false };
  const n = Math.min(lr - 1, MAX_ROWS);
  return {
    ok: true, tab: sh.getName(),
    headers: sh.getRange(1, 1, 1, lc).getDisplayValues()[0],
    rows: n > 0 ? sh.getRange(2, 1, n, lc).getDisplayValues() : [],
    total: lr - 1, truncated: lr - 1 > MAX_ROWS,
  };
}

// Empty tab: write the fixed layout. Older tab: rename a legacy "Called" column to "Call Status".
function prep_(sh) {
  if (!sh.getLastColumn() || !sh.getLastRow()) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.getRange(1, 3, sh.getMaxRows(), 1).setNumberFormat('@');
    sh.setFrozenRows(1);
    return;
  }
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map((h) => String(h).trim().toLowerCase());
  const legacy = head.indexOf('called');
  if (legacy >= 0 && head.indexOf('call status') < 0) sh.getRange(1, legacy + 1).setValue('Call Status').setFontWeight('bold');
}

// {header name: 1-based column}. Missing headers are added at the end.
function cols_(sh, names) {
  const n = sh.getLastColumn();
  const head = n ? sh.getRange(1, 1, 1, n).getValues()[0].map(String) : [];
  const map = {};
  names.forEach((name) => {
    let i = head.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    if (i < 0) { head.push(name); i = head.length - 1; sh.getRange(1, i + 1).setValue(name).setFontWeight('bold'); }
    map[name] = i + 1;
  });
  return map;
}
function colIdx_(sh, name) {
  const n = sh.getLastColumn(); if (!n) return 0;
  const head = sh.getRange(1, 1, 1, n).getValues()[0].map((h) => String(h).trim().toLowerCase());
  return head.indexOf(name.toLowerCase()) + 1;
}

// After every write: dropdown on Call Status, and Sn numbers for rows that have a phone but no Sn yet.
function finish_(sh, phoneCol) {
  const cs = colIdx_(sh, 'Call Status');
  if (cs) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false)
      .setHelpText('Answered, Not Answered or Call again').build();
    sh.getRange(2, cs, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(rule);
  }
  const sn = colIdx_(sh, 'Sn'), lr = sh.getLastRow();
  if (sn && phoneCol && lr > 1) {
    const snv = sh.getRange(2, sn, lr - 1, 1).getValues(), pv = sh.getRange(2, phoneCol, lr - 1, 1).getValues();
    let changed = false;
    const res = snv.map((r, i) => { if (String(pv[i][0]) !== '' && r[0] === '') { changed = true; return [i + 1]; } return r; });
    if (changed) sh.getRange(2, sn, lr - 1, 1).setValues(res);
  }
}

// Which headers hold the phone and name for this request (defaults: Phone / Name).
function target_(b) { return { P: b.phoneH || 'Phone', N: 'nameH' in b ? b.nameH : 'Name' }; }

// Adds or refreshes Name + Phone only (the extension's "Send to sheet").
function sync_(sh, b) {
  const heads = [b.nameH || 'Name', b.phoneH || 'Phone'];
  const c = cols_(sh, heads.concat(CALL_HEADS));
  const pc = c[heads[1]];
  sh.getRange(1, pc, sh.getMaxRows(), 1).setNumberFormat('@');
  const last = sh.getLastRow(), idx = {};
  if (last > 1) sh.getRange(2, pc, last - 1, 1).getValues().forEach((r, i) => { idx[key_(r[0])] = i + 2; });
  const contiguous = c[heads[1]] === c[heads[0]] + 1;
  const next = Math.max(last, 1) + 1;
  let upd = 0;
  const adds = [];
  (b.rows || []).forEach((r) => {
    const row = idx[key_(r[1])];
    const vals = [r[0], r[1]];
    if (!row) { adds.push(vals); return; }
    upd++;
    if (contiguous) sh.getRange(row, c[heads[0]], 1, 2).setValues([vals]);
    else heads.forEach((h, j) => sh.getRange(row, c[h]).setValue(vals[j]));
  });
  if (adds.length) {
    if (contiguous) sh.getRange(next, c[heads[0]], adds.length, 2).setValues(adds);
    else adds.forEach((r, k) => heads.forEach((h, j) => sh.getRange(next + k, c[h]).setValue(r[j])));
  }
  finish_(sh, pc);
  return { ok: true, updated: upd, added: adds.length };
}

function findRow_(sh, c, b, t) {
  const last = sh.getLastRow(), k = key_(b.phone);
  if (last > 1) {
    const ph = sh.getRange(2, c[t.P], last - 1, 1).getValues();
    for (let i = 0; i < ph.length; i++) if (key_(ph[i][0]) === k) return i + 2;
  }
  const row = Math.max(last, 1) + 1;
  sh.getRange(row, c[t.P]).setNumberFormat('@').setValue(String(b.phone));
  if (t.N) sh.getRange(row, c[t.N]).setValue(b.name || '');
  return row;
}
function setRemark_(sh, row, remark) {
  if (remark) { const c = cols_(sh, ['Remark']); sh.getRange(row, c.Remark).setValue(remark); }
  else { const i = colIdx_(sh, 'Remark'); if (i) sh.getRange(row, i).clearContent(); }
}

// Logs one call. Call Status is Answered / Not Answered / Call again. Safe to send many times:
// later sends update the status, remark and talk time. "first" stamps a fresh Called At.
function called_(sh, b) {
  const t = target_(b);
  const c = cols_(sh, [t.P].concat(t.N ? [t.N] : [], CALL_HEADS));
  const row = findRow_(sh, c, b, t);
  sh.getRange(row, c['Call Status']).setValue(status_(b.label));
  const at = sh.getRange(row, c['Called At']);
  if (b.first || !at.getValue()) at.setValue(new Date()).setNumberFormat('dd mmm yyyy, hh:mm AM/PM');
  sh.getRange(row, c['Talk Time (s)']).setValue(b.talk || 0);
  if (b.by) sh.getRange(row, c['Called By']).setValue(String(b.by));
  if (typeof b.remark === 'string') setRemark_(sh, row, b.remark);
  finish_(sh, c[t.P]);
  return { ok: true, row: row };
}

// Remark only, for contacts you have not called.
function note_(sh, b) {
  const t = target_(b);
  const c = cols_(sh, [t.P].concat(t.N ? [t.N] : []));
  const row = findRow_(sh, c, b, t);
  setRemark_(sh, row, b.remark || '');
  finish_(sh, c[t.P]);
  return { ok: true, row: row };
}
