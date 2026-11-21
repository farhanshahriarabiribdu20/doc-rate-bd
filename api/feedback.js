import { put, list, del } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import { noStore, parseBody, requireAdmin } from './_lib.js';

// Each feedback is stored as its own small blob ("feedbacks/<id>-<random>.json").
//  - no read-modify-write race when two people submit at the same time
//  - the random suffix makes every URL unguessable, so entries are not publicly browsable
//  - only an authenticated admin can list or delete them
const PREFIX = 'feedbacks/';
const LEGACY_PATH = 'feedbacks.json'; // old single public file, migrated automatically

const MAX_FEEDBACK_LEN = 2000;
const MAX_NAME_LEN = 80;
const MAX_PHONE_LEN = 20;
const MAX_STORED = 1000;
const ALLOWED_CATEGORIES = ['পরামর্শ', 'তথ্য আপডেট', 'সমস্যা', 'সাধারণ'];
const ID_RE = /^fb-\d+-[a-z0-9]{3,12}$/;

const newId = () => `fb-${Date.now()}-${randomBytes(3).toString('hex')}`;

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && out.length < 5000);
  return out;
}

async function saveEntry(entry) {
  await put(`${PREFIX}${entry.id}.json`, JSON.stringify(entry), {
    access: 'public', // store is public; the random suffix keeps the URL secret
    addRandomSuffix: true,
    contentType: 'application/json'
  });
}

// Move entries from the old public feedbacks.json into per-item blobs, then delete it.
async function migrateLegacy() {
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
  const blobs = await listAll(PREFIX);
  const settled = await Promise.allSettled(
    blobs.slice(0, 500).map(async (b) => {
      const r = await fetch(b.url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
  );
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

      const existing = await listAll(PREFIX);
      if (existing.length >= MAX_STORED) {
        return res.status(429).json({ success: false, error: 'Feedback inbox is full' });
      }

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
      await migrateLegacy();
      const feedbacks = await readAll();
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
        const blobs = await listAll(PREFIX);
        for (let i = 0; i < blobs.length; i += 100) {
          await del(blobs.slice(i, i + 100).map((b) => b.url));
        }
        return res.status(200).json({ success: true, message: 'All feedbacks cleared' });
      }

      if (typeof id === 'string' && ID_RE.test(id)) {
        const { blobs } = await list({ prefix: `${PREFIX}${id}-` });
        if (blobs.length) await del(blobs.map((b) => b.url));
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
