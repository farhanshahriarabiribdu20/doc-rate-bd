// Shared helpers for the serverless API.
// Files that start with "_" are NOT exposed as routes by Vercel.
import { createHash, timingSafeEqual } from 'node:crypto';

// ---------- request / response helpers ----------

export const parseBody = (req) => {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return req.body && typeof req.body === 'object' ? req.body : {};
};

export const noStore = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
};

// ---------- admin authentication ----------
// The admin password lives ONLY in the ADMIN_PASSWORD environment variable
// (Vercel -> Project -> Settings -> Environment Variables). It is never sent to
// the browser bundle. The browser sends it in the `x-admin-key` header over HTTPS.

const digest = (value) => createHash('sha256').update(String(value)).digest();

export const isAdminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Returns true when the request carries the correct admin key.
 * Otherwise sends the error response itself and returns false.
 */
export async function requireAdmin(req, res) {
  if (!isAdminConfigured()) {
    res.status(503).json({
      success: false,
      code: 'ADMIN_NOT_CONFIGURED',
      error: 'ADMIN_PASSWORD environment variable is not set on the server'
    });
    return false;
  }

  const provided = req.headers['x-admin-key'];
  const ok =
    typeof provided === 'string' &&
    provided.length > 0 &&
    timingSafeEqual(digest(provided), digest(process.env.ADMIN_PASSWORD));

  if (!ok) {
    await wait(700); // slow down password guessing
    res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Wrong admin password' });
    return false;
  }
  return true;
}

// ---------- sanitizers for published site data ----------

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const num = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1000000, n));
};

const RATE_CATEGORIES = ['broiler', 'sonali', 'layer_brown', 'layer_white', 'cockerel'];
const RATE_STATUSES = ['available', 'booking_open', 'limited'];
const ZONE_IDS = ['narayanganj', 'gazipur', 'narsingdi', 'tangail', 'kishoreganj', 'mymensingh', 'cumilla', 'noakhali', 'chattogram', 'sylhet', 'faridpur', 'gopalgonj', 'jhenaidah', 'khulna', 'barishal', 'bogura', 'rajshahi', 'sirajgonj', 'rangpur', 'dinajpur'];
const DIVISION_IDS = ['dhaka', 'chittagong', 'rajshahi', 'rangpur', 'khulna', 'sylhet', 'mymensingh', 'barisal'];

const genId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function sanitizeRates(input) {
  if (!Array.isArray(input)) return null;
  return input.slice(0, 300).map((r) => {
    const item = r && typeof r === 'object' ? r : {};
    const divisionRates = {};
    if (item.divisionRates && typeof item.divisionRates === 'object') {
      for (const d of DIVISION_IDS) {
        if (item.divisionRates[d] !== undefined) divisionRates[d] = num(item.divisionRates[d]);
      }
    }
    const zoneRates = {};
    if (item.zoneRates && typeof item.zoneRates === 'object') {
      for (const z of ZONE_IDS) {
        if (item.zoneRates[z] !== undefined) zoneRates[z] = num(item.zoneRates[z]);
      }
    }
    return {
      id: str(item.id, 64) || genId('doc'),
      company: str(item.company, 120),
      companyEn: str(item.companyEn, 120),
      category: RATE_CATEGORIES.includes(item.category) ? item.category : 'broiler',
      breed: str(item.breed, 80),
      todayRate: num(item.todayRate),
      yesterdayRate: num(item.yesterdayRate),
      status: RATE_STATUSES.includes(item.status) ? item.status : 'available',
      minBooking: num(item.minBooking) || 500,
      bookingPhone: str(item.bookingPhone, 20),
      notes: str(item.notes, 200),
      divisionRates,
      zoneRates,
      rateDate: /^\d{4}-\d{2}-\d{2}$/.test(String(item.rateDate || '')) ? String(item.rateDate) : '',
      regionBn: str(item.regionBn, 120),
      regionEn: str(item.regionEn, 120),
      verified: item.verified !== false
    };
  });
}

export function sanitizeReadyRates(input) {
  if (!Array.isArray(input)) return null;
  return input.slice(0, 100).map((r, i) => {
    const item = r && typeof r === 'object' ? r : {};
    return {
      id: str(item.id, 64) || genId('ready'),
      serial: Number.isFinite(Number(item.serial)) ? Number(item.serial) : i + 1,
      regionEn: str(item.regionEn, 80),
      regionBn: str(item.regionBn, 80),
      officerName: str(item.officerName, 80),
      officerPhone: str(item.officerPhone, 20),
      broilerGrill: num(item.broilerGrill),
      broilerMedium: num(item.broilerMedium),
      broilerBig: num(item.broilerBig),
      colorBird: num(item.colorBird),
      sonali: num(item.sonali),
      sonaliSuper: num(item.sonaliSuper),
      eggBrown: num(item.eggBrown),
      eggWhite: num(item.eggWhite),
      psCull: num(item.psCull)
    };
  });
}

// Only public, non-secret settings are ever published.
export function sanitizeSettings(input) {
  const s = input && typeof input === 'object' ? input : {};
  const out = {
    brandName: str(s.brandName, 60),
    taglineBn: str(s.taglineBn, 160),
    taglineEn: str(s.taglineEn, 160),
    hotline: str(s.hotline, 20),
    whatsapp: str(s.whatsapp, 20),
    fbPage: /^https?:\/\//i.test(str(s.fbPage, 200)) ? str(s.fbPage, 200) : '',
    reportDateBn: str(s.reportDateBn, 80),
    reportDateEn: str(s.reportDateEn, 80)
  };
  const iso = str(s.reportDateISO, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) out.reportDateISO = iso;
  const readyIso = str(s.readyDateISO, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(readyIso)) out.readyDateISO = readyIso;
  // drop empty strings so bundled defaults can fill the gaps on the client
  Object.keys(out).forEach((k) => { if (out[k] === '') delete out[k]; });
  return out;
}

/** Timestamp (ms) encoded in a history snapshot path, or 0. */
export const snapshotTime = (pathname) => {
  const m = /history\/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/.exec(pathname || '');
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]) : 0;
};
