import { parseBody, requireAdmin, sanitizeRates } from './_lib.js';
import { isDate, saveRateDay, listRateDays, readRateDay } from './_days.js';

const getQuery = (req, name) => {
  if (req.query && typeof req.query[name] === 'string') return req.query[name];
  try { return new URL(req.url || '', 'http://x').searchParams.get(name); } catch { return null; }
};

// GET (public)            -> { dates: [...] } every archived date, newest first
// GET ?date=YYYY-MM-DD    -> the rates of that day, or of the latest earlier day that has rates
//                            { date, requested, exact, rates } (date is null when nothing that old exists)
// PUT (admin) { days: [{ date, rates }] } -> save (or replace) the archive of those days
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      const requested = getQuery(req, 'date');
      const dates = await listRateDays();
      if (!requested) return res.status(200).json({ success: true, dates });
      if (!isDate(requested)) return res.status(400).json({ success: false, error: 'Invalid date' });
      const found = dates.find((d) => d <= requested);
      if (!found) return res.status(200).json({ success: true, date: null, requested, exact: false, rates: [] });
      const day = await readRateDay(found);
      if (!day) return res.status(200).json({ success: true, date: null, requested, exact: false, rates: [] });
      return res.status(200).json({ success: true, date: found, requested, exact: found === requested, rates: day.rates });
    }

    if (req.method === 'PUT') {
      res.setHeader('Cache-Control', 'no-store');
      if (!(await requireAdmin(req, res))) return;
      const body = parseBody(req);
      const days = Array.isArray(body?.days) ? body.days.slice(0, 40) : null;
      if (!days) return res.status(400).json({ success: false, error: 'days array is required' });
      let saved = 0;
      for (const day of days) {
        const rates = sanitizeRates(day?.rates);
        if (!isDate(day?.date) || !rates || !rates.length) continue;
        await saveRateDay(day.date, rates);
        saved += 1;
      }
      return res.status(200).json({ success: true, saved });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('rate-days API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
