import { noStore, parseBody } from './_lib.js';

// "Live visitors" = how many browsers pinged in the last two minutes.
// A heartbeat needs a fast shared store, and Vercel Blob is not made for that (the free plan only
// has 2,000 writes a month), so this uses Redis through its REST API. Add "Upstash Redis" from the
// Vercel Marketplace (Project -> Storage); it adds KV_REST_API_URL / KV_REST_API_TOKEN (or the
// UPSTASH_REDIS_REST_* pair) automatically. Without it this endpoint answers { enabled: false } and the
// site simply shows no counter.
// Only a random per-tab id is stored (no IP, no cookies) and it expires after the window.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KEY = 'fn:live-visitors';
const WINDOW_MS = 120 * 1000;
const SID_RE = /^[a-zA-Z0-9-]{8,48}$/;

async function redis(commands) {
  const res = await fetch(`${URL_.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`redis HTTP ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (!URL_ || !TOKEN) return res.status(200).json({ success: true, enabled: false });

  try {
    const now = Date.now();
    const sid = req.method === 'POST' ? parseBody(req)?.sid : '';
    const commands = [];
    if (typeof sid === 'string' && SID_RE.test(sid)) commands.push(['ZADD', KEY, String(now), sid]);
    commands.push(['ZREMRANGEBYSCORE', KEY, '0', String(now - WINDOW_MS)]);
    commands.push(['ZCARD', KEY]);
    const out = await redis(commands);
    const count = Number(out[out.length - 1]?.result);
    return res.status(200).json({ success: true, enabled: true, count: Number.isFinite(count) ? count : 0 });
  } catch (err) {
    console.error('Live visitors error:', err);
    // never break the page for a counter
    return res.status(200).json({ success: true, enabled: false });
  }
}
