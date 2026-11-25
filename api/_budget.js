// Free-plan guard for Vercel Blob. The free plan allows 2,000 "advanced" operations (put / list / copy) a month;
// past that the whole store is blocked and the site stops reading its own data. This keeps a running estimate
// (one small meter blob, updated in batches) and lets visitor-triggered writes say "not today" before that happens.
//
//   count(kind, n)      add n writes to the meter (batched: one meter write per ~8 counted writes)
//   allow(kind)         { ok } or { ok:false, error } - checks the daily cap of that kind and the monthly stop line
//   getMeter()          what the admin panel shows
//
// The meter is an estimate (a recycled function instance can lose a few pending counts), so the stop line is kept
// well under 2,000. Admin actions are counted but never blocked.
import { put, get } from '@vercel/blob';

export const MONTH_LIMIT = 2000;
export const STOP_VISITORS_AT = Number(process.env.BLOB_STOP_AT) || 1500; // visitor-triggered writes pause here until the next month
const FLUSH_EVERY = 8;
const FLUSH_GAP_MS = 30 * 60 * 1000;
const METER_PATH = 'meta/ops-meter.json';

// Most writes a day for each visitor-triggered kind (an ad counts 2: its picture + the list).
export const DAILY_CAPS = { submission: 15, report: 15, feedback: 8, ad: 16, adrate: 10, adedit: 10 };

const ist = () => new Date(Date.now() + 6 * 3600 * 1000).toISOString(); // Asia/Dhaka
const monthKey = () => ist().slice(0, 7);
const dayKey = () => ist().slice(0, 10);

const blank = () => ({ v: 0, m: monthKey(), d: dayKey(), total: 0, by: {}, dayBy: {} });
const normalize = (raw) => {
  const b = blank();
  if (!raw || typeof raw !== 'object') return b;
  if (raw.m === b.m) { b.total = Number(raw.total) || 0; b.by = raw.by && typeof raw.by === 'object' ? { ...raw.by } : {}; }
  if (raw.d === b.d) b.dayBy = raw.dayBy && typeof raw.dayBy === 'object' ? { ...raw.dayBy } : {};
  b.v = Number(raw.v) || 0;
  return b;
};

let mem = null; // last meter we know of
let memAt = 0;
let pend = { n: 0, by: {} };
let lastFlush = 0;

async function readMeter() {
  try {
    const r = await get(METER_PATH, { access: 'public', useCache: false });
    if (!r || r.statusCode !== 200) return blank();
    return normalize(JSON.parse(await new Response(r.stream).text()));
  } catch (err) {
    if (err && err.name === 'BlobNotFoundError') return blank();
    throw err;
  }
}

async function load() {
  if (mem && Date.now() - memAt < 60000) return mem;
  try {
    const fresh = await readMeter();
    mem = !mem || fresh.v >= mem.v ? fresh : normalize(mem); // never go back to an older copy
  } catch (err) {
    console.error('ops meter read failed:', err);
    mem = mem ? normalize(mem) : blank();
  }
  memAt = Date.now();
  return mem;
}

async function flush() {
  if (!pend.n) return;
  const base = await load();
  const next = normalize(base);
  for (const [k, n] of Object.entries(pend.by)) {
    next.by[k] = (next.by[k] || 0) + n;
    next.dayBy[k] = (next.dayBy[k] || 0) + n;
    next.total += n;
  }
  next.by.meter = (next.by.meter || 0) + 1; // this write itself
  next.total += 1;
  next.v = Date.now();
  pend = { n: 0, by: {} };
  lastFlush = Date.now();
  mem = next;
  memAt = Date.now();
  await put(METER_PATH, JSON.stringify(next), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
}

/** Note n advanced operations of this kind. Never throws. */
export async function count(kind, n = 1) {
  try {
    pend.n += n;
    pend.by[kind] = (pend.by[kind] || 0) + n;
    if (pend.n >= FLUSH_EVERY || Date.now() - lastFlush >= FLUSH_GAP_MS) await flush();
  } catch (err) { console.error('ops meter write failed:', err); }
}

/** Gate for a visitor-triggered write. Fails open if the meter itself cannot be read. */
export async function allow(kind) {
  try {
    const m = await load();
    if (m.total + pend.n >= STOP_VISITORS_AT) {
      return { ok: false, error: 'এই মাসের জন্য সাইটের সংরক্ষণ সীমা শেষ হয়েছে। নতুন মাসে আবার চেষ্টা করুন।' };
    }
    const cap = DAILY_CAPS[kind];
    if (cap && (m.dayBy[kind] || 0) + (pend.by[kind] || 0) >= cap) {
      return { ok: false, error: 'আজকের জন্য এটি গ্রহণের সীমা শেষ হয়েছে। কাল আবার চেষ্টা করুন।' };
    }
    return { ok: true };
  } catch { return { ok: true }; }
}

export async function getMeter() {
  const m = normalize(await load());
  for (const [k, n] of Object.entries(pend.by)) { m.by[k] = (m.by[k] || 0) + n; m.dayBy[k] = (m.dayBy[k] || 0) + n; }
  m.total += pend.n;
  return { month: m.m, day: m.d, total: m.total, limit: MONTH_LIMIT, stopAt: STOP_VISITORS_AT, by: m.by, dayBy: m.dayBy, caps: DAILY_CAPS };
}
