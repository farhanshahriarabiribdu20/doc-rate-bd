import { put, get, list, del } from '@vercel/blob';
import {
  parseBody,
  requireAdmin,
  snapshotTime,
  sanitizeRates,
  sanitizeReadyRates,
  sanitizeSettings
} from './_lib.js';
import { isDate, saveRateDay } from './_days.js';

const BLOB_PATH = 'site-data.json';
const HISTORY_PREFIX = 'history/';
const HISTORY_KEEP = 40; // versions kept for "undo"
// Free Blob plan = 2,000 "advanced" operations (put / list / copy) a month, so a publish must stay cheap:
// the undo copy is made once per editing session (not per publish) and the day archive only when the date changes.
const SNAPSHOT_MIN_GAP_MS = Number(process.env.SNAPSHOT_MIN_GAP_MS ?? 3 * 3600 * 1000);


async function readPublished() {
  const result = await get(BLOB_PATH, { access: 'public', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  const text = await new Response(result.stream).text();
  const data = JSON.parse(text);
  return data && typeof data === 'object' ? data : null;
}

// Keep the previous published version so the admin can undo a bad publish.
// Never blocks publishing: any error here is only logged.
async function snapshotPrevious(prev, force) {
  try {
    if (!prev) return;
    // No list() just to decide: the age of the version being replaced tells whether a new editing session started.
    const prevAt = Date.parse(prev.updatedAt || '');
    if (!force && Number.isFinite(prevAt) && Date.now() - prevAt < SNAPSHOT_MIN_GAP_MS) return;
    const { blobs } = await list({ prefix: HISTORY_PREFIX });
    const sorted = [...blobs].sort((a, b) => snapshotTime(b.pathname) - snapshotTime(a.pathname));
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
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
      let data = null;
      let readError = '';
      try {
        data = await readPublished();
      } catch (err) {
        console.error('site-data read failed:', err);
        readError = `${err?.name || 'Error'}: ${String(err?.message || '').slice(0, 160)}`;
      }
      if (readError) { // a failed read must not be cached at the edge, or every visitor keeps seeing "no data"
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ success: true, data: null, readError });
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

      let prev = null;
      try { prev = await readPublished(); } catch (err) { console.error('previous version read failed:', err); }

      // Nothing changed (e.g. the "publish" button pressed again): no writes at all.
      const same = (a, b) => JSON.stringify([a.rates, a.readyRates, a.notice, a.settings]) === JSON.stringify([b.rates, b.readyRates, b.notice, b.settings]);
      if (prev && body.snapshot !== 'force' && same(prev, payload)) return res.status(200).json({ success: true, updatedAt: prev.updatedAt || payload.updatedAt, unchanged: true });

      await snapshotPrevious(prev, body.snapshot === 'force');

      await put(BLOB_PATH, JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 60
      });

      // Day archive for the visitors' "date-wise rate" view and the trend chart. Written ONCE per day: when the
      // report date moves on, the version being replaced holds that day's final rates. (Today's rates are the live
      // ones, and the trend chart adds them in the browser.) Never blocks publishing.
      try {
        const oldDate = prev?.settings?.reportDateISO;
        if (isDate(oldDate) && isDate(payload.settings?.reportDateISO) && oldDate !== payload.settings.reportDateISO) {
          const finalRates = (prev.rates || []).filter((r) => !r.rateDate || r.rateDate === oldDate);
          if (finalRates.length) await saveRateDay(oldDate, finalRates);
        }
      } catch (err) {
        console.error('rate day archive failed:', err);
      }
      try {
        const oldReady = prev?.settings?.readyDateISO;
        if (isDate(oldReady) && isDate(payload.settings?.readyDateISO) && oldReady !== payload.settings.readyDateISO && (prev.readyRates || []).length) await saveRateDay(oldReady, prev.readyRates, 'ready');
      } catch (err) {
        console.error('ready day archive failed:', err);
      }

      return res.status(200).json({ success: true, updatedAt: payload.updatedAt });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('site-data API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
