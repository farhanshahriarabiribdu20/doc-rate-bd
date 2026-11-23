import { noStore, parseBody, requireAdmin } from './_lib.js';
import { readFresh, writeFresh } from './_fresh.js';

// "Live visitors" = how many browsers pinged in the last two minutes.
// A heartbeat needs a fast shared store, and Vercel Blob is not made for that (the free plan only
// has 2,000 writes a month). Two modes:
//  - Redis (exact): add "Upstash Redis" from the Vercel Marketplace (Project -> Storage). It adds
//    KV_REST_API_URL / KV_REST_API_TOKEN (or the UPSTASH_REDIS_REST_* pair) automatically.
//  - No setup (free, approximate): the visitors are kept in this function instance's memory. That is
//    right while one warm instance serves the site (typical for a small site) but can undercount when
//    traffic spreads over several instances, and it restarts from zero after a deploy / cold start.
// Only a random per-tab id is stored (no IP, no cookies) and it expires after the window.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KEY = 'fn:live-visitors';
const WINDOW_MS = 120 * 1000;
const SID_RE = /^[a-zA-Z0-9-]{8,48}$/;

// best-effort fallback store (see above)
const memory = new Map(); // sid -> last ping (ms)
const MEMORY_MAX = 5000;
function countInMemory(sid, now) {
  for (const [id, t] of memory) if (now - t > WINDOW_MS) memory.delete(id);
  if (sid && (memory.has(sid) || memory.size < MEMORY_MAX)) memory.set(sid, now);
  return memory.size;
}

async function redis(commands) {
  const res = await fetch(`${URL_.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`redis HTTP ${res.status}`);
  return res.json();
}

// ---------- usage statistics (admin dashboard) ----------
// Same endpoint (Vercel's free plan allows only 12 functions). The browser sends small event names
// ("visit", "tab:market", "tool:fcr" ...) in batches; the admin reads daily totals.
//  - Redis configured: exact daily counters (HINCRBY), kept 40 days.
//  - Otherwise: counted in memory and merged into ONE small blob ("analytics/stats.json") at most every
//    3 hours (or 1 hour when 40+ events are waiting) so it stays far below the 2,000-writes/month Blob
//    quota (worst case ~720). Events still waiting when an instance is recycled can be lost, so the
//    numbers are approximate in this mode.
const STATS_PATH = 'analytics/stats.json';
const KEEP_DAYS = 35;
const EVENT_RE = /^[a-z0-9_:.-]{1,40}$/;
const MAX_EVENTS_PER_REQUEST = 25;
const MAX_KEYS_PER_DAY = 120;
const FLUSH_MS = 3 * 3600 * 1000;
const FLUSH_BUSY_MS = 3600 * 1000;
const FLUSH_BUSY_COUNT = 40;
const CHECK_MS = 10 * 60 * 1000;

const dayKey = (ms = Date.now()) => new Date(ms + 6 * 3600 * 1000).toISOString().slice(0, 10); // Asia/Dhaka (UTC+6)

let pending = {}; // day -> { event: count }
let pendingTotal = 0;
let lastCheck = Date.now();
let flushedAt = 0; // newest flush time we know of (from the blob)

const addTo = (target, day, name, n = 1) => {
  const d = (target[day] = target[day] || {});
  if (!(name in d) && Object.keys(d).length >= MAX_KEYS_PER_DAY) return;
  d[name] = (d[name] || 0) + n;
};

async function flushPending(now) {
  const data = (await readFresh(STATS_PATH)) || { days: {} };
  const days = data.days && typeof data.days === 'object' ? data.days : {};
  flushedAt = Number(data.flushedAt) || 0;
  const due = now - flushedAt >= FLUSH_MS || (pendingTotal >= FLUSH_BUSY_COUNT && now - flushedAt >= FLUSH_BUSY_MS);
  if (!due) return;
  for (const [day, evs] of Object.entries(pending)) for (const [k, n] of Object.entries(evs)) addTo(days, day, k, n);
  const cutoff = dayKey(now - KEEP_DAYS * 86400000);
  for (const day of Object.keys(days)) if (day < cutoff) delete days[day];
  await writeFresh(STATS_PATH, { days, flushedAt: now }, data.v);
  flushedAt = now;
  pending = {};
  pendingTotal = 0;
}

async function recordEvents(events, now) {
  const day = dayKey(now);
  const clean = events.filter((e) => typeof e === 'string' && EVENT_RE.test(e)).slice(0, MAX_EVENTS_PER_REQUEST);
  if (!clean.length) return 'none';
  if (URL_ && TOKEN) {
    const key = `fn:stats:${day}`;
    const cmds = clean.map((e) => ['HINCRBY', key, e, '1']);
    cmds.push(['EXPIRE', key, String(40 * 86400)]);
    await redis(cmds);
    return 'redis';
  }
  clean.forEach((e) => { addTo(pending, day, e); pendingTotal += 1; });
  if (now - lastCheck >= CHECK_MS) {
    lastCheck = now;
    try { await flushPending(now); } catch (err) { console.error('stats flush failed:', err); }
  }
  return 'blob';
}

async function readStats(now) {
  const days = {};
  let mode = 'blob';
  if (URL_ && TOKEN) {
    mode = 'redis';
    const keys = [];
    for (let i = 0; i < 31; i += 1) keys.push(dayKey(now - i * 86400000));
    const out = await redis(keys.map((k) => ['HGETALL', `fn:stats:${k}`]));
    out.forEach((o, i) => {
      const r = o?.result;
      const obj = {};
      if (Array.isArray(r)) for (let j = 0; j + 1 < r.length; j += 2) obj[r[j]] = Number(r[j + 1]) || 0;
      else if (r && typeof r === 'object') Object.entries(r).forEach(([k, v]) => { obj[k] = Number(v) || 0; });
      if (Object.keys(obj).length) days[keys[i]] = obj;
    });
    return { mode, days };
  }
  const data = await readFresh(STATS_PATH);
  Object.entries(data?.days || {}).forEach(([d, evs]) => { days[d] = { ...evs }; });
  Object.entries(pending).forEach(([d, evs]) => Object.entries(evs).forEach(([k, n]) => addTo(days, d, k, n)));
  return { mode, days, flushedAt: Number(data?.flushedAt) || 0 };
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const now = Date.now();

  if (req.method === 'GET' && req.query?.stats) {
    if (!(await requireAdmin(req, res))) return;
    try {
      return res.status(200).json({ success: true, today: dayKey(now), ...(await readStats(now)) });
    } catch (err) {
      console.error('stats read failed:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const b = parseBody(req);
    if (b && b.action === 'events') {
      try {
        const mode = await recordEvents(Array.isArray(b.events) ? b.events : [], now);
        return res.status(200).json({ success: true, mode });
      } catch (err) {
        console.error('stats record failed:', err); // never break the page for statistics
        return res.status(200).json({ success: true, mode: 'error' });
      }
    }
  }

  const sid = req.method === 'POST' ? parseBody(req)?.sid : '';
  const validSid = typeof sid === 'string' && SID_RE.test(sid) ? sid : '';

  if (!URL_ || !TOKEN) {
    return res.status(200).json({ success: true, enabled: true, approx: true, count: countInMemory(validSid, now) });
  }

  try {
    const commands = [];
    if (validSid) commands.push(['ZADD', KEY, String(now), validSid]);
    commands.push(['ZREMRANGEBYSCORE', KEY, '0', String(now - WINDOW_MS)]);
    commands.push(['ZCARD', KEY]);
    const out = await redis(commands);
    const count = Number(out[out.length - 1]?.result);
    return res.status(200).json({ success: true, enabled: true, count: Number.isFinite(count) ? count : 0 });
  } catch (err) {
    console.error('Live visitors error:', err);
    // never break the page for a counter
    return res.status(200).json({ success: true, enabled: true, approx: true, count: countInMemory(validSid, now) });
  }
}
