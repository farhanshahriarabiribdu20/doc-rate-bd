import { getDoc } from './_store.js';
import { createHash, randomBytes } from 'node:crypto';
import { noStore, parseBody, requireAdmin } from './_lib.js';
import { readFresh, writeFresh } from './_fresh.js';
import { allow } from './_budget.js';

// Visitor-submitted rates go live at once, with no admin approval. The site shows them with a
// "ইউজারের দেওয়া রেট" tag (they never touch the admin's published data, so the admin's own rates stay as they are).
//   POST   (public)         -> store a submission (it is live straight away)
//   GET ?live=1 (public)    -> today's user rates, one value per rate (the median when several people sent one)
//   GET    (admin)          -> list all stored submissions with name / phone
//   DELETE (admin)          -> remove one (e.g. a wrong or spam rate)
// The last few days of submissions live in ONE small blob. A submission is then a single storage write and
// reading them never needs list() (on the free Vercel Blob plan every put / list counts against 2,000 a month).
const RECENT_PATH = 'rate-submissions/recent.json';
const MAX_STORED = 400;
const MAX_PER_IP_PER_DAY = 30;
const KEEP_DAYS = 3; // older submissions are cleaned up
const DAY_MS = 24 * 60 * 60 * 1000;
const SITE_DATA_PATH = 'site-data.json';
// A rate this far from the one on the site is treated as a typo and refused.
const MAX_DEVIATION = 0.5;
const ID_RE = /^rs-[a-f0-9]{8}-\d+-[a-f0-9]{6}$/;

// field -> [min, max]. Anything outside is rejected as a typo or spam.
const READY_FIELDS = {
  broilerGrill: [30, 600], broilerMedium: [30, 600], broilerBig: [30, 600], colorBird: [30, 700],
  sonali: [30, 700], sonaliSuper: [30, 700], eggBrown: [1, 30], eggWhite: [1, 30], psCull: [30, 700]
};
const DOC_RATE = [1, 200];

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const dhakaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
const ipHash = (req) => {
  const fwd = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim();
  return createHash('sha256').update(`fn-rs:${fwd}`).digest('hex').slice(0, 8);
};

const tsOf = (name) => Number(/rs-[a-f0-9]{8}-(\d+)-/.exec(name || '')?.[1]) || 0;

const median = (nums) => {
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

// The rates the admin published (only used to catch typos; any failure just skips the check).
async function readPublishedSafe() {
  try {
    return await getDoc(SITE_DATA_PATH);
  } catch { return null; }
}

const farFrom = (ref, next) => Number(ref) > 0 && Math.abs(Number(next) - Number(ref)) / Number(ref) > MAX_DEVIATION;

async function typoError(v) {
  const pub = await readPublishedSafe();
  if (!pub) return '';
  const msg = 'এই রেটটি সাইটের বর্তমান রেটের থেকে অনেক আলাদা। সংখ্যাটি আবার দেখে লিখুন।';
  if (v.kind === 'doc') {
    const item = (pub.rates || []).find((r) => r.id === v.targetId);
    if (!item) return '';
    const ref = (v.zoneId && item.zoneRates?.[v.zoneId]) || item.todayRate;
    return farFrom(ref, v.values.rate) ? msg : '';
  }
  const item = (pub.readyRates || []).find((r) => r.id === v.targetId);
  if (!item) return '';
  return Object.entries(v.values).some(([k, n]) => farFrom(item[k], n)) ? msg : '';
}

async function readItems() {
  const d = await readFresh(RECENT_PATH);
  const cutoff = Date.now() - KEEP_DAYS * DAY_MS;
  const items = (Array.isArray(d?.items) ? d.items : []).filter((e) => e && ID_RE.test(e.id || '') && tsOf(e.id) > cutoff);
  return { v: Number(d?.v) || 0, items };
}

function validate(body) {
  const kind = body.kind === 'doc' ? 'doc' : body.kind === 'ready' ? 'ready' : null;
  if (!kind) return { error: 'kind must be ready or doc' };
  const targetId = str(body.targetId, 64);
  if (!/^[\w.-]{1,64}$/.test(targetId)) return { error: 'targetId is required' };

  if (kind === 'ready') {
    const values = {};
    for (const [field, [min, max]] of Object.entries(READY_FIELDS)) {
      const raw = body.values?.[field];
      if (raw === undefined || raw === null || raw === '') continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < min || n > max) return { error: `${field} must be between ${min} and ${max}` };
      values[field] = Math.round(n * 100) / 100;
    }
    if (!Object.keys(values).length) return { error: 'at least one rate is required' };
    return { kind, targetId, values, zoneId: '' };
  }

  const n = Number(body.rate);
  if (!Number.isFinite(n) || n < DOC_RATE[0] || n > DOC_RATE[1]) return { error: `rate must be between ${DOC_RATE[0]} and ${DOC_RATE[1]}` };
  const zoneId = str(body.zoneId, 24);
  if (zoneId && !/^[a-z]{3,20}$/.test(zoneId)) return { error: 'invalid zone' };
  return { kind, targetId, values: { rate: Math.round(n * 100) / 100 }, zoneId };
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const body = parseBody(req);
      if (!body) return res.status(400).json({ success: false, error: 'Invalid JSON body' });

      // Honeypot: people never see this field, bots fill it.
      if (typeof body.website === 'string' && body.website.trim() !== '') return res.status(201).json({ success: true });

      const v = validate(body);
      if (v.error) return res.status(400).json({ success: false, error: v.error });

      const hash = ipHash(req);
      const gate = await allow('submission');
      if (!gate.ok) return res.status(429).json({ success: false, code: 'BUDGET', error: gate.error });

      const { v: prevV, items } = await readItems();
      const now = Date.now();
      const mineToday = items.filter((e) => e.id.startsWith(`rs-${hash}-`) && now - tsOf(e.id) < DAY_MS);
      if (mineToday.length >= MAX_PER_IP_PER_DAY) {
        return res.status(429).json({ success: false, code: 'TOO_MANY', error: 'আজকের জন্য আপনি অনেকগুলো রেট পাঠিয়েছেন। কাল আবার চেষ্টা করুন।' });
      }

      const typo = await typoError(v);
      if (typo) return res.status(400).json({ success: false, code: 'FAR', error: typo });

      const entry = {
        id: `rs-${hash}-${Date.now()}-${randomBytes(3).toString('hex')}`,
        kind: v.kind,
        targetId: v.targetId,
        targetLabel: str(body.targetLabel, 120),
        zoneId: v.zoneId,
        values: v.values,
        rateDate: dhakaToday(),
        name: str(body.name, 80) || 'ভিজিটর',
        phone: str(body.phone, 20),
        note: str(body.note, 300),
        createdAt: new Date().toISOString()
      };
      await writeFresh(RECENT_PATH, { items: [...items, entry].slice(-MAX_STORED) }, prevV, 'submission');
      return res.status(201).json({ success: true });
    }

    if (req.method === 'GET' && req.query?.live) {
      // public, cached for a short while at the edge
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
      const today = dhakaToday();
      const entries = (await readItems()).items
        .filter((x) => x.rateDate === today)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

      // newest report of each person (ip hash) for each rate, then the median of those
      const docGroups = new Map();
      const readyGroups = new Map();
      for (const e of entries) {
        const who = e.id.split('-')[1];
        if (e.kind === 'doc') {
          const key = `${e.targetId}|${e.zoneId || ''}`;
          if (!docGroups.has(key)) docGroups.set(key, { targetId: e.targetId, zoneId: e.zoneId || '', byWho: new Map() });
          docGroups.get(key).byWho.set(who, { v: Number(e.values?.rate), at: e.createdAt });
        } else {
          if (!readyGroups.has(e.targetId)) readyGroups.set(e.targetId, { targetId: e.targetId, fields: new Map() });
          const g = readyGroups.get(e.targetId);
          for (const [f, n] of Object.entries(e.values || {})) {
            if (!g.fields.has(f)) g.fields.set(f, new Map());
            g.fields.get(f).set(who, { v: Number(n), at: e.createdAt });
          }
        }
      }
      const agg = (byWho) => {
        const list = [...byWho.values()].filter((x) => Number.isFinite(x.v) && x.v > 0);
        return list.length ? { value: Math.round(median(list.map((x) => x.v)) * 100) / 100, n: list.length, at: list.map((x) => x.at).sort().pop() } : null;
      };
      const doc = [...docGroups.values()].map((g) => ({ targetId: g.targetId, zoneId: g.zoneId, ...agg(g.byWho) })).filter((x) => x.value);
      const ready = [...readyGroups.values()].map((g) => {
        const values = {}; const counts = {}; let at = '';
        for (const [f, byWho] of g.fields) {
          const a = agg(byWho);
          if (a) { values[f] = a.value; counts[f] = a.n; if (a.at > at) at = a.at; }
        }
        return { targetId: g.targetId, values, counts, at };
      }).filter((x) => Object.keys(x.values).length);
      return res.status(200).json({ success: true, date: today, doc, ready, people: new Set(entries.map((e) => e.id.split('-')[1])).size });
    }

    if (req.method === 'GET') {
      if (!(await requireAdmin(req, res))) return;
      const submissions = (await readItems()).items
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      return res.status(200).json({ success: true, submissions });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      const body = parseBody(req);
      const ids = Array.isArray(body?.ids) ? body.ids : typeof body?.id === 'string' ? [body.id] : [];
      const valid = ids.filter((id) => typeof id === 'string' && ID_RE.test(id)).slice(0, 100);
      if (!valid.length) return res.status(400).json({ success: false, error: 'valid id required' });
      const { v: prevV, items } = await readItems();
      const drop = new Set(valid);
      const kept = items.filter((e) => !drop.has(e.id));
      if (kept.length !== items.length) await writeFresh(RECENT_PATH, { items: kept }, prevV, 'admin');
      return res.status(200).json({ success: true, deleted: valid.length });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Rate submissions API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
