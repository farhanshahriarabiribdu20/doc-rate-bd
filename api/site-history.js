import { getDoc, putDoc, listDocs, delDocs, exportAll, migrateFromBlob, storeStatus } from './_store.js';
import { count, getMeter } from './_budget.js';
import { timingSafeEqual } from 'node:crypto';
import { requireAdmin, snapshotTime } from './_lib.js';
import { readFresh } from './_fresh.js';

const HISTORY_PREFIX = 'history/';
const ID_RE = /^history\/[0-9TZ-]+-[A-Za-z0-9]+\.json$/;

async function readBlob(pathname) {
  const data = await getDoc(pathname);
  return data && typeof data === 'object' ? data : null;
}

// ---------- daily backups ----------
// One combined file per day: published site data (rates, ready rates, settings), the marketplace
// listings (without seller passwords, those live in separate files) and the gallery index. Pictures
// themselves are not copied. Kept for 14 days. A Vercel Cron (vercel.json) calls ?cron=1 once a day;
// that is ~3 blob operations a day out of the 2,000/month free quota. Files get a random suffix so
// their addresses cannot be guessed.
const BACKUP_PREFIX = 'backups/';
const BACKUP_ID_RE = /^backups\/\d{4}-\d{2}-\d{2}-[A-Za-z0-9]+\.json$/;
const BACKUP_KEEP_DAYS = 14;
const BACKUP_MIN_GAP_MS = 20 * 3600 * 1000;
const CRON_THROTTLE_MS = 15 * 60 * 1000;
let lastCronCheck = 0;

const dhakaDay = (ms = Date.now()) => new Date(ms + 6 * 3600 * 1000).toISOString().slice(0, 10);
const backupDay = (pathname) => pathname.slice(BACKUP_PREFIX.length, BACKUP_PREFIX.length + 10);

async function listBackups() {
  return (await listDocs(BACKUP_PREFIX))
    .filter((b) => BACKUP_ID_RE.test(b.path))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function safe(fn) {
  try { return await fn(); } catch { return null; }
}

/** Writes today's backup; returns { skipped } when it is not needed. `force` ignores the 20 h gap. */
async function runBackup(force) {
  const existing = await listBackups();
  await count('backup', 1);
  const newest = existing[0] ? new Date(existing[0].updatedAt).getTime() : 0;
  if (!force && Date.now() - newest < BACKUP_MIN_GAP_MS) return { skipped: 'recent' };

  const site = await safe(() => readBlob('site-data.json'));
  const market = await safe(() => readFresh('market/listings.json'));
  const gallery = await safe(() => readFresh('gallery/index.json'));
  const feeds = await safe(() => readFresh('feed-prices.json'));
  const dealers = await safe(() => readFresh('dealers.json'));
  if (!site && !market && !gallery && !feeds && !dealers) return { skipped: 'nothing' };

  const day = dhakaDay();
  const payload = { version: 1, createdAt: new Date().toISOString(), site, market, gallery, feeds, dealers };
  await count('backup', 1);
  const created = await putDoc(`${BACKUP_PREFIX}${day}.json`, payload, { suffix: true });

  // retention: one file per day (the newest), at most 14 days
  const all = [{ path: created, updatedAt: new Date().toISOString() }, ...existing.filter((b) => b.path !== created)];
  const seen = new Set();
  const drop = [];
  all.forEach((b) => {
    const d = backupDay(b.path);
    if (seen.has(d) || seen.size >= BACKUP_KEEP_DAYS) drop.push(b);
    else seen.add(d);
  });
  if (drop.length) await safe(() => delDocs(drop));
  return { created, removed: drop.length };
}

const cronAllowed = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured: the 20 h gap + 15 min throttle already cap the cost
  const given = String(req.headers?.authorization || '');
  const want = `Bearer ${secret}`;
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
};

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
    const q = req.query || {};

    // Vercel Cron (once a day)
    if (req.method === 'GET' && q.cron) {
      if (!cronAllowed(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });
      if (Date.now() - lastCronCheck < CRON_THROTTLE_MS) return res.status(200).json({ success: true, skipped: 'throttled' });
      lastCronCheck = Date.now();
      return res.status(200).json({ success: true, ...(await runBackup(false)) });
    }

    if (req.method !== 'GET' && !(req.method === 'POST' && q.run)) return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!(await requireAdmin(req, res))) return;

    if (req.method === 'POST') return res.status(200).json({ success: true, ...(await runBackup(true)) });

    if (q.store) return res.status(200).json({ success: true, ...(await storeStatus()) });
    if (q.export) {
      const files = await exportAll();
      return res.status(200).json({ success: true, version: 1, exportedAt: new Date().toISOString(), count: Object.keys(files).length, files });
    }
    if (q.migrate) {
      try { return res.status(200).json({ success: true, ...(await migrateFromBlob()) }); }
      catch (err) { return res.status(502).json({ success: false, error: String(err?.message || err).slice(0, 200) }); }
    }

    if (q.usage) return res.status(200).json({ success: true, ...(await getMeter()) });

    if (q.backups) {
      await count('admin', 1);
      const files = await listBackups();
      return res.status(200).json({
        success: true,
        backups: files.map((b) => ({ id: b.path, day: backupDay(b.path), uploadedAt: b.updatedAt, size: b.size }))
      });
    }
    if (typeof q.backup === 'string') {
      if (!BACKUP_ID_RE.test(q.backup)) return res.status(400).json({ success: false, error: 'Invalid id' });
      const data = await readBlob(q.backup);
      if (!data) return res.status(404).json({ success: false, error: 'Backup not found' });
      return res.status(200).json({ success: true, data });
    }

    const id = getId(req);
    if (id) {
      if (!ID_RE.test(id)) return res.status(400).json({ success: false, error: 'Invalid id' });
      const data = await readBlob(id);
      if (!data) return res.status(404).json({ success: false, error: 'Version not found' });
      return res.status(200).json({ success: true, data });
    }

    await count('admin', 1);
    const sorted = [...(await listDocs(HISTORY_PREFIX))].sort((a, b) => snapshotTime(b.path) - snapshotTime(a.path));
    const versions = (
      await Promise.all(
        sorted.map(async (b) => {
          try {
            const d = await readBlob(b.path);
            if (!d) return null;
            const rates = Array.isArray(d.rates) ? d.rates : [];
            return {
              id: b.path,
              replacedAt: new Date(snapshotTime(b.path)).toISOString(),
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
