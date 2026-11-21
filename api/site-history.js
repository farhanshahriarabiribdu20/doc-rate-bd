import { get, list } from '@vercel/blob';
import { requireAdmin, snapshotTime } from './_lib.js';

const HISTORY_PREFIX = 'history/';
const ID_RE = /^history\/[0-9TZ-]+-[A-Za-z0-9]+\.json$/;

async function readBlob(pathname) {
  const result = await get(pathname, { access: 'public', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  const data = JSON.parse(await new Response(result.stream).text());
  return data && typeof data === 'object' ? data : null;
}

const getId = (req) => {
  if (req.query && typeof req.query.id === 'string') return req.query.id;
  try { return new URL(req.url || '', 'http://x').searchParams.get('id'); } catch { return null; }
};

// Admin only.
// GET            -> list of earlier published versions (newest first) with a short summary
// GET ?id=<id>   -> the full data of one earlier version (the admin panel then re-publishes it)
export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!(await requireAdmin(req, res))) return;

    const id = getId(req);
    if (id) {
      if (!ID_RE.test(id)) return res.status(400).json({ success: false, error: 'Invalid id' });
      const data = await readBlob(id);
      if (!data) return res.status(404).json({ success: false, error: 'Version not found' });
      return res.status(200).json({ success: true, data });
    }

    const { blobs } = await list({ prefix: HISTORY_PREFIX });
    const sorted = [...blobs].sort((a, b) => snapshotTime(b.pathname) - snapshotTime(a.pathname));
    const versions = (
      await Promise.all(
        sorted.map(async (b) => {
          try {
            const d = await readBlob(b.pathname);
            if (!d) return null;
            const rates = Array.isArray(d.rates) ? d.rates : [];
            return {
              id: b.pathname,
              replacedAt: new Date(snapshotTime(b.pathname)).toISOString(),
              publishedAt: d.updatedAt || null,
              reportDateISO: d.settings?.reportDateISO || null,
              companies: rates.length,
              preview: rates.slice(0, 3).map((r) => `${String(r.company || '').split('(')[0].trim()} ${r.todayRate}`)
            };
          } catch {
            return null;
          }
        })
      )
    ).filter(Boolean);
    return res.status(200).json({ success: true, versions });
  } catch (err) {
    console.error('site-history API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
