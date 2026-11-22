// Daily rate archive: one blob per date (rate-days/YYYY-MM-DD.json) so visitors can look at an earlier day.
import { put, get, list } from '@vercel/blob';

const prefixOf = (kind) => (kind === 'ready' ? 'ready-days/' : 'rate-days/');

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export async function saveRateDay(date, rates, kind = 'doc') {
  await put(`${prefixOf(kind)}${date}.json`, JSON.stringify({ date, rates, savedAt: new Date().toISOString() }), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60
  });
}

/** All archived dates, newest first. */
export async function listRateDays(kind = 'doc') {
  const PREFIX = prefixOf(kind);
  const { blobs } = await list({ prefix: PREFIX });
  return blobs
    .map((b) => b.pathname.slice(PREFIX.length).replace(/\.json$/, ''))
    .filter(isDate)
    .sort()
    .reverse();
}

export async function readRateDay(date, kind = 'doc') {
  const result = await get(`${prefixOf(kind)}${date}.json`, { access: 'public', useCache: false });
  if (!result || result.statusCode !== 200) return null;
  const data = JSON.parse(await new Response(result.stream).text());
  return data && Array.isArray(data.rates) ? data : null;
}
