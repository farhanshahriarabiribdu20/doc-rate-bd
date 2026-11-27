// Daily rate archive: one blob per date (rate-days/YYYY-MM-DD.json) so visitors can look at an earlier day.
import { getDoc, putDoc, listDocs } from './_store.js';
import { readFresh, writeFresh } from './_fresh.js';
import { count } from './_budget.js';
import { updateReadyTrend } from './_readyTrend.js';

const prefixOf = (kind) => (kind === 'ready' ? 'ready-days/' : 'rate-days/');

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export async function saveRateDay(date, rates, kind = 'doc') {
  await putDoc(`${prefixOf(kind)}${date}.json`, { date, rates, savedAt: new Date().toISOString() });
  await count('archive', 1);
  await addToIndex(date, kind);
  if (kind === 'doc') {
    try { await updateTrend(date, rates); } catch (err) { console.error('trend update failed:', err); }
  } else {
    try { await updateReadyTrend(date, rates); } catch (err) { console.error('ready trend update failed:', err); }
  }
}

// The list of archived dates lives in one small blob that is READ (a cheap operation). A list() call is an
// "advanced" operation and the free plan only has 2,000 of them a month, so list() runs only to build the index once.
const indexPath = (kind) => `${prefixOf(kind)}index.json`;

async function addToIndex(date, kind) {
  try {
    const cur = await readFresh(indexPath(kind));
    if (cur && Array.isArray(cur.dates)) {
      if (cur.dates.includes(date)) return; // already known: no write
      await writeFresh(indexPath(kind), { dates: [...cur.dates, date].sort().reverse() }, cur.v);
    }
    // no index yet: the next listRateDays() builds it from the real files
  } catch (err) { console.error('date index update failed:', err); }
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
  const cur = await readFresh(indexPath(kind));
  if (cur && Array.isArray(cur.dates) && cur.dates.every(isDate)) return cur.dates;
  const PREFIX = prefixOf(kind);
  const docs = await listDocs(PREFIX);
  const dates = docs
    .map((b) => b.path.slice(PREFIX.length).replace(/\.json$/, ''))
    .filter(isDate)
    .sort()
    .reverse();
  if (dates.length) { try { await writeFresh(indexPath(kind), { dates }, cur?.v || 0); } catch (err) { console.error('date index build failed:', err); } }
  return dates;
}

export async function readRateDay(date, kind = 'doc') {
  const data = await getDoc(`${prefixOf(kind)}${date}.json`);
  return data && Array.isArray(data.rates) ? data : null;
}
