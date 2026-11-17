// EXAMPLE ONLY. Adapt to your Vercel project (file: api/report.js).
// 1) Replace verifySession() with the same session check your /api/validate uses.
// 2) Replace the `db` helper with your storage (Vercel KV / Upstash Redis shown here).
//    npm i @vercel/kv
const { kv } = require('@vercel/kv');
const { verifySession } = require('../lib/session'); // <-- your existing function: (token) => { email, name } | null

const CATS = ['bug', 'phone', 'sheet', 'contacts', 'access', 'idea', 'other'];
const MAX_PER_HOUR = 10;

module.exports = async (req, res) => {
  const reply = (o) => res.status(200).json(o);
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'bad_request' });
  try {
    const b = req.body || {};
    const user = await verifySession(b.token);
    if (!user) return reply({ ok: false, reason: 'session_expired' });

    const message = String(b.message || '').trim();
    if (!CATS.includes(b.category) || message.length < 10 || message.length > 1500 || !b.rid) return reply({ ok: false, reason: 'bad_request' });

    // idempotent: the extension may resend the same rid after a network error
    const existing = await kv.get(`report:rid:${user.email}:${b.rid}`);
    if (existing) return reply({ ok: true, id: existing });

    // rate limit per user
    const rlKey = `report:rl:${user.email}:${new Date().toISOString().slice(0, 13)}`;
    const count = await kv.incr(rlKey); if (count === 1) await kv.expire(rlKey, 3700);
    if (count > MAX_PER_HOUR) return reply({ ok: false, reason: 'rate_limited' });

    const id = 'rp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const report = {
      id, rid: b.rid, status: 'new', email: user.email, name: user.name || '', deviceId: String(b.deviceId || '').slice(0, 64),
      version: String(b.version || '').slice(0, 20), category: b.category, message,
      diagnostics: b.diagnostics && typeof b.diagnostics === 'object' ? b.diagnostics : null,
      createdAt: Number(b.createdAt) || Date.now(), receivedAt: Date.now(),
    };
    await kv.set(`report:${id}`, report);
    await kv.lpush('report:index', id);                      // newest first
    await kv.set(`report:rid:${user.email}:${b.rid}`, id, { ex: 60 * 60 * 24 * 14 });
    return reply({ ok: true, id });
  } catch (e) {
    return reply({ ok: false, reason: 'server_error' });
  }
};

// --- Admin side (put behind your existing admin auth) -----------------------------------------
// GET /api/admin/reports?status=new
//   const ids = await kv.lrange('report:index', 0, 199);
//   const all = await Promise.all(ids.map((id) => kv.get(`report:${id}`)));
//   return res.json({ reports: all.filter((r) => r && (!status || r.status === status)) });
// POST /api/admin/reports/:id   { status, note }
//   const r = await kv.get(`report:${id}`); r.status = status; if (note) r.note = note; await kv.set(`report:${id}`, r);
