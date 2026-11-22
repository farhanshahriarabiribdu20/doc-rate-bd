import { put, get, list, del } from '@vercel/blob';
import {
  parseBody,
  requireAdmin,
  snapshotTime,
  sanitizeRates,
  sanitizeReadyRates,
  sanitizeSettings
} from './_lib.js';

const BLOB_PATH = 'site-data.json';
const HISTORY_PREFIX = 'history/';
const HISTORY_KEEP = 40; // versions kept for "undo"
const SNAPSHOT_MIN_GAP_MS = Number(process.env.SNAPSHOT_MIN_GAP_MS ?? 2 * 60 * 1000); // one burst of edits = one undo step


async function readPublished() {
  const result = await get(BLOB_PATH, { access: 'public', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  const text = await new Response(result.stream).text();
  const data = JSON.parse(text);
  return data && typeof data === 'object' ? data : null;
}

// Keep the previous published version so the admin can undo a bad publish.
// Never blocks publishing: any error here is only logged.
async function snapshotPrevious(force) {
  try {
    const prev = await readPublished();
    if (!prev) return;
    const { blobs } = await list({ prefix: HISTORY_PREFIX });
    const sorted = [...blobs].sort((a, b) => snapshotTime(b.pathname) - snapshotTime(a.pathname));
    const newest = sorted[0] ? snapshotTime(sorted[0].pathname) : 0;
    if (!force && Date.now() - newest < SNAPSHOT_MIN_GAP_MS) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await put(`${HISTORY_PREFIX}${stamp}.json`, JSON.stringify(prev), {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'application/json'
    });
    const extra = sorted.slice(HISTORY_KEEP - 1);
    if (extra.length) await del(extra.map((b) => b.url));
  } catch (err) {
    console.error('history snapshot failed:', err);
  }
}

// GET (public)  -> latest published rates / notice / public settings
// PUT (admin)   -> publish new data for every visitor
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Cached at the Vercel edge: visitors never hit Blob storage on every page view.
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
      let data = null;
      try {
        data = await readPublished();
      } catch (err) {
        console.error('site-data read failed:', err);
      }
      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      res.setHeader('Cache-Control', 'no-store');
      if (!(await requireAdmin(req, res))) return;

      const body = parseBody(req);
      if (!body) {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }

      const rates = sanitizeRates(body.rates);
      const readyRates = sanitizeReadyRates(body.readyRates);
      if (!rates || !readyRates) {
        return res.status(400).json({ success: false, error: 'rates and readyRates arrays are required' });
      }

      const payload = {
        rates,
        readyRates,
        notice: typeof body.notice === 'string' ? body.notice.trim().slice(0, 500) : '',
        settings: sanitizeSettings(body.settings),
        updatedAt: new Date().toISOString()
      };

      await snapshotPrevious(body.snapshot === 'force');

      await put(BLOB_PATH, JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 60
      });

      return res.status(200).json({ success: true, updatedAt: payload.updatedAt });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('site-data API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
