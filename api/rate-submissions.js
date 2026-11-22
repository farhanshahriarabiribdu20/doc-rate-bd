import { put, list, del } from '@vercel/blob';
import { createHash, randomBytes } from 'node:crypto';
import { noStore, parseBody, requireAdmin } from './_lib.js';

// Visitor-submitted rates wait here until the admin approves them (nothing a visitor sends is ever
// published by itself).
//   POST   (public) -> store a pending submission
//   GET    (admin)  -> list the pending submissions
//   DELETE (admin)  -> remove one (after approving it in the admin panel, or to reject it)
// Each submission is its own small blob ("rate-submissions/<id>.json") so two people submitting at the
// same time never overwrite each other; the random suffix keeps the URLs unguessable.
const PREFIX = 'rate-submissions/';
const MAX_PENDING = 300;
const MAX_PENDING_PER_IP = 6;
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

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && out.length < 2000);
  return out;
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
      const mine = await listAll(`${PREFIX}rs-${hash}-`);
      if (mine.length >= MAX_PENDING_PER_IP) {
        return res.status(429).json({ success: false, code: 'TOO_MANY', error: 'আপনার আগের রেটগুলো যাচাই হওয়ার অপেক্ষায় আছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' });
      }
      const all = await listAll(PREFIX);
      if (all.length >= MAX_PENDING) return res.status(429).json({ success: false, code: 'FULL', error: 'Inbox is full' });

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
      await put(`${PREFIX}${entry.id}.json`, JSON.stringify(entry), {
        access: 'public',
        addRandomSuffix: true,
        contentType: 'application/json'
      });
      return res.status(201).json({ success: true });
    }

    if (req.method === 'GET') {
      if (!(await requireAdmin(req, res))) return;
      const blobs = await listAll(PREFIX);
      const settled = await Promise.allSettled(
        blobs.slice(0, 400).map(async (b) => {
          const r = await fetch(b.url, { cache: 'no-store' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
      );
      const seen = new Set();
      const submissions = settled
        .filter((s) => s.status === 'fulfilled' && s.value && ID_RE.test(s.value.id || ''))
        .map((s) => s.value)
        .filter((x) => (seen.has(x.id) ? false : seen.add(x.id)))
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      return res.status(200).json({ success: true, submissions });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      const body = parseBody(req);
      const ids = Array.isArray(body?.ids) ? body.ids : typeof body?.id === 'string' ? [body.id] : [];
      const valid = ids.filter((id) => typeof id === 'string' && ID_RE.test(id)).slice(0, 100);
      if (!valid.length) return res.status(400).json({ success: false, error: 'valid id required' });
      for (const id of valid) {
        const { blobs } = await list({ prefix: `${PREFIX}${id}` });
        if (blobs.length) await del(blobs.map((b) => b.url));
      }
      return res.status(200).json({ success: true, deleted: valid.length });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Rate submissions API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
