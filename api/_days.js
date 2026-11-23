// Daily rate archive: one blob per date (rate-days/YYYY-MM-DD.json) so visitors can look at an earlier day.
import { put, get, list } from '@vercel/blob';
import { readFresh, writeFresh } from './_fresh.js';

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
  if (kind === 'doc') {
    try { await updateTrend(date, rates); } catch (err) { console.error('trend update failed:', err); }
  }
}

// ---- Rate trend: one small rolling blob (last 31 days) so the trend chart needs a single read, no list() ----
const TREND_PATH = 'trend/doc.json';
const TREND_DAYS = 31;
export const trendKey = (r) => `${r.company}|${r.breed}`;

function addDay(trend, date, rates) {
  const day = {};
  for (const r of rates) {
    const rate = Number(r.todayRate);
    if (!r || !r.company || !Number.isFinite(rate) || rate <= 0) continue;
    const k = trendKey(r);
    day[k] = rate;
    trend.names[k] = { company: r.company, breed: r.breed || '', category: r.category || '' };
  }
  if (Object.keys(day).length) trend.days[date] = day;
}

function trimTrend(trend) {
  const keep = Object.keys(trend.days).sort().slice(-TREND_DAYS);
  const days = {};
  keep.forEach((d) => { days[d] = trend.days[d]; });
  const used = new Set(keep.flatMap((d) => Object.keys(days[d])));
  const names = {};
  Object.keys(trend.names).forEach((k) => { if (used.has(k)) names[k] = trend.names[k]; });
  return { days, names };
}

export async function updateTrend(date, rates) {
  const cur = await readFresh(TREND_PATH);
  const trend = { days: { ...(cur?.days || {}) }, names: { ...(cur?.names || {}) } };
  addDay(trend, date, rates);
  await writeFresh(TREND_PATH, trimTrend(trend), cur?.v || 0);
}

/** The rolling trend; built once from the daily archive if it does not exist yet. */
export async function readTrend() {
  const cur = await readFresh(TREND_PATH);
  if (cur && cur.days) return { days: cur.days, names: cur.names || {} };
  const dates = (await listRateDays('doc')).slice(0, TREND_DAYS);
  const trend = { days: {}, names: {} };
  for (const d of dates) {
    const day = await readRateDay(d, 'doc');
    if (day) addDay(trend, d, day.rates);
  }
  const out = trimTrend(trend);
  if (Object.keys(out.days).length) { try { await writeFresh(TREND_PATH, out, 0); } catch (err) { console.error('trend backfill failed:', err); } }
  return out;
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
