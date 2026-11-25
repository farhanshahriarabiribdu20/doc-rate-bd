import { list, del } from '@vercel/blob';
import { putDoc, listDocs, readDocs, delDocs, isSupabase } from './_store.js';
import { randomBytes, createHash } from 'node:crypto';
import { DISTRICTS as DISTRICTS_BN } from '../src/data/districts.js';
import { noStore, parseBody, requireAdmin } from './_lib.js';
import { readFresh, writeFresh } from './_fresh.js';
import { allow, count } from './_budget.js';

// ---- "is this rate correct?" votes (?votes=1) ----
// One small blob holds today's counts: { date, c: { 'Company|Breed': [up, down] }, flushedAt }.
// Votes are collected in memory and written to the blob at most every 3 hours (or after 40 votes),
// so even a busy day costs only a handful of Blob writes on the free plan. A cold start can lose the
// few votes still waiting in memory: the counts are a hint for visitors, not an accounting record.
const VOTES_PATH = 'rate-votes.json';
const FLUSH_GAP_MS = 3 * 3600 * 1000;
const FLUSH_COUNT = 40;
let pend = { date: '', c: {}, n: 0 };
let lastFlush = 0;
const dhakaDay = () => new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
const isIso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

function mergeInto(base, add) {
  const c = { ...(base || {}) };
  for (const [k, [u, d]] of Object.entries(add)) {
    const cur = c[k] || [0, 0];
    c[k] = [cur[0] + u, cur[1] + d];
  }
  return c;
}

async function flushVotes(force) {
  if (!pend.n) return;
  const stored = await readFresh(VOTES_PATH);
  if (!lastFlush) lastFlush = Number(stored?.flushedAt) || 0;
  const now = Date.now();
  if (!force && pend.n < FLUSH_COUNT && now - lastFlush < FLUSH_GAP_MS) return;
  let c;
  if (stored?.date === pend.date) c = mergeInto(stored.c, pend.c);
  else if (!stored?.date || pend.date > stored.date) c = pend.c;
  else { pend = { date: '', c: {}, n: 0 }; return; } // older day than the stored one: ignore
  await writeFresh(VOTES_PATH, { date: pend.date, c, flushedAt: now }, stored?.v);
  lastFlush = now;
  pend = { date: '', c: {}, n: 0 };
}

// ---- district rate reports (?reports=1) ----
// Visitors report today's ready-bird/egg rates for any of the 64 districts. A report is shown at once
// (one report = that value, two or more = their median, worked out in the browser). One blob holds the
// current day: { date, d: { district: [ { f: {field: n}, t: ms, h: ipHash, n: name } ] } }.
// A person who reports a district again replaces their own earlier report, so one person cannot
// outweigh others. Everything resets with the next Dhaka day.
const REPORTS_PATH = 'district-reports.json';
const REPORT_FIELDS = { broiler: [30, 600], colorBird: [30, 700], sonali: [30, 700], eggBrown: [1, 30], eggWhite: [1, 30] };
const REPORT_KEEP = 15; // newest reports kept per district
const REPORT_IP_DAILY = 12; // reports one IP may send per day
const ipDay = { date: '', n: new Map() };

const clientHash = (req) => {
  const fwd = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim();
  return createHash('sha256').update(`fn-rp:${fwd}`).digest('hex').slice(0, 10);
};

async function reportsHandler(req, res, districts) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    const stored = await readFresh(REPORTS_PATH);
    const today = dhakaDay();
    const d = stored?.date === today ? stored.d || {} : {};
    // Hash and exact times stay private; the browser only needs the numbers, the time and the name.
    const out = {};
    for (const [k, list] of Object.entries(d)) out[k] = list.map((r) => ({ f: r.f, t: r.t, n: r.n || '' }));
    return res.status(200).json({ success: true, date: today, d: out });
  }
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const body = parseBody(req);
  if (!body) return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  if (typeof body.website === 'string' && body.website.trim() !== '') return res.status(201).json({ success: true });
  const district = typeof body.district === 'string' ? body.district.trim() : '';
  if (!districts.includes(district)) return res.status(400).json({ success: false, error: 'জেলা বেছে নিন।' });
  const f = {};
  for (const [field, [min, max]] of Object.entries(REPORT_FIELDS)) {
    const raw = body.values?.[field];
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const n = Number(String(raw).replace(/,/g, ''));
    if (!Number.isFinite(n) || n < min || n > max) return res.status(400).json({ success: false, error: `রেট ${min}–${max} এর মধ্যে হতে হবে।` });
    f[field] = Math.round(n * 100) / 100;
  }
  if (!Object.keys(f).length) return res.status(400).json({ success: false, error: 'অন্তত একটি রেট লিখুন।' });
  const today = dhakaDay();
  const h = clientHash(req);
  if (ipDay.date !== today) { ipDay.date = today; ipDay.n = new Map(); }
  const used = ipDay.n.get(h) || 0;
  if (used >= REPORT_IP_DAILY) return res.status(429).json({ success: false, error: 'আজকের জন্য আর রেট পাঠানো যাবে না। কাল আবার চেষ্টা করুন।' });
  ipDay.n.set(h, used + 1);
  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  const gate = await allow('report');
  if (!gate.ok) return res.status(429).json({ success: false, error: gate.error });
  const stored = await readFresh(REPORTS_PATH);
  const d = stored?.date === today ? { ...(stored.d || {}) } : {};
  const list = (d[district] || []).filter((r) => r.h !== h);
  list.push({ f, t: Date.now(), h, n: name });
  d[district] = list.slice(-REPORT_KEEP);
  await writeFresh(REPORTS_PATH, { date: today, d }, stored?.v);
  return res.status(201).json({ success: true });
}

async function votesHandler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    const stored = await readFresh(VOTES_PATH);
    const date = typeof req.query?.d === 'string' ? req.query.d : stored?.date;
    let c = stored && stored.date === date ? stored.c || {} : {};
    if (pend.date === date) c = mergeInto(c, pend.c);
    return res.status(200).json({ success: true, date, c });
  }
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const { d, key, v } = parseBody(req) || {};
  const today = Date.parse(`${dhakaDay()}T00:00:00Z`);
  if (!isIso(d) || Math.abs(Date.parse(`${d}T00:00:00Z`) - today) > 3 * 86400000 || typeof key !== 'string' || !key.includes('|') || key.length > 120 || (v !== 'up' && v !== 'down')) {
    return res.status(400).json({ success: false, error: 'Invalid vote' });
  }
  if (pend.n && pend.date !== d) await flushVotes(true);
  pend.date = d;
  const cur = pend.c[key] || [0, 0];
  pend.c[key] = v === 'up' ? [cur[0] + 1, cur[1]] : [cur[0], cur[1] + 1];
  pend.n += 1;
  await flushVotes(false);
  return res.status(200).json({ success: true });
}

// Each feedback is stored as its own small blob ("feedbacks/<id>-<random>.json").
//  - no read-modify-write race when two people submit at the same time
//  - the random suffix makes every URL unguessable, so entries are not publicly browsable
//  - only an authenticated admin can list or delete them
const PREFIX = 'feedbacks/';
const LEGACY_PATH = 'feedbacks.json'; // old single public file, migrated automatically

const MAX_FEEDBACK_LEN = 2000;
const MAX_NAME_LEN = 80;
const MAX_PHONE_LEN = 20;
const ALLOWED_CATEGORIES = ['পরামর্শ', 'তথ্য আপডেট', 'সমস্যা', 'সাধারণ'];
const ID_RE = /^fb-\d+-[a-z0-9]{3,12}$/;

const newId = () => `fb-${Date.now()}-${randomBytes(3).toString('hex')}`;

let inboxCache = { at: 0, list: null }; // admin list, kept 5 minutes: every list() is a counted storage operation
async function saveEntry(entry) {
  inboxCache = { at: 0, list: null };
  await count('feedback', 1);
  await putDoc(`${PREFIX}${entry.id}.json`, entry, { suffix: true }); // random suffix: unguessable / unique
}

// Move entries from the old public feedbacks.json into per-item blobs, then delete it.
async function migrateLegacy() {
  if (isSupabase()) return; // the old single file only ever existed in Blob
  try {
    const { blobs } = await list({ prefix: LEGACY_PATH });
    const legacy = blobs.find((b) => b.pathname === LEGACY_PATH);
    if (!legacy) return;
    const res = await fetch(`${legacy.url}?_cb=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && ID_RE.test(item.id || '') && typeof item.feedback === 'string') {
            await saveEntry(item);
          }
        }
      }
    }
    await del(legacy.url);
  } catch (err) {
    console.error('legacy feedback migration failed:', err);
  }
}

async function readAll() {
  const docs = await readDocs(PREFIX, 500);
  const settled = docs.map((d) => ({ status: 'fulfilled', value: d.data }));
  const seen = new Set();
  return settled
    .filter((s) => s.status === 'fulfilled' && s.value && typeof s.value.feedback === 'string')
    .map((s) => s.value)
    .filter((f) => (seen.has(f.id) ? false : seen.add(f.id)))
    .sort((a, b) => String(b.dateRaw || '').localeCompare(String(a.dateRaw || '')));
}

export default async function handler(req, res) {
  noStore(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.query?.votes) return await votesHandler(req, res);
    if (req.query?.reports) return await reportsHandler(req, res, DISTRICTS_BN);
    // POST (public): submit new feedback
    if (req.method === 'POST') {
      const body = parseBody(req);
      if (!body) {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
      const { category, name, phone, feedback, website } = body;

      // Honeypot: real visitors never fill this hidden field, bots do.
      if (typeof website === 'string' && website.trim() !== '') {
        return res.status(201).json({ success: true });
      }

      if (typeof feedback !== 'string' || !feedback.trim()) {
        return res.status(400).json({ success: false, error: 'Feedback text is required' });
      }
      if (feedback.trim().length > MAX_FEEDBACK_LEN) {
        return res.status(400).json({ success: false, error: 'Feedback is too long' });
      }

      const gate = await allow('feedback');
      if (!gate.ok) return res.status(429).json({ success: false, error: gate.error });

      const entry = {
        id: newId(),
        category: ALLOWED_CATEGORIES.includes(category) ? category : 'পরামর্শ',
        name: (typeof name === 'string' && name.trim().slice(0, MAX_NAME_LEN)) || 'সম্মানিত ভিজিটর',
        phone: (typeof phone === 'string' && phone.trim().slice(0, MAX_PHONE_LEN)) || '',
        feedback: feedback.trim(),
        date: new Intl.DateTimeFormat('bn-BD', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Dhaka'
        }).format(new Date()),
        dateRaw: new Date().toISOString()
      };

      await saveEntry(entry);
      // Visitors only get an acknowledgement, never the stored data of others.
      return res.status(201).json({ success: true, id: entry.id });
    }

    // GET (admin): list all feedbacks
    if (req.method === 'GET') {
      if (!(await requireAdmin(req, res))) return;
      if (req.query?.migrate) await migrateLegacy(); // old single-file inbox: only on request (it costs a list)
      if (!req.query?.fresh && inboxCache.list && Date.now() - inboxCache.at < 5 * 60 * 1000) return res.status(200).json({ success: true, feedbacks: inboxCache.list });
      await count('admin', 1);
      const feedbacks = await readAll();
      inboxCache = { at: Date.now(), list: feedbacks };
      return res.status(200).json({ success: true, feedbacks });
    }

    // DELETE (admin): remove one or all
    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      const body = parseBody(req);
      if (!body) {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
      const { id, all } = body;

      if (all === true) {
        inboxCache = { at: 0, list: null };
        await count('admin', 1);
        await delDocs(await listDocs(PREFIX));
        return res.status(200).json({ success: true, message: 'All feedbacks cleared' });
      }

      if (typeof id === 'string' && ID_RE.test(id)) {
        inboxCache = { at: 0, list: null };
        await count('admin', 1);
        await delDocs(await listDocs(`${PREFIX}${id}-`));
        return res.status(200).json({ success: true, message: 'Feedback deleted' });
      }

      return res.status(400).json({ success: false, error: 'valid id or all=true required' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Feedback API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
