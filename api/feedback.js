import { put, list, del } from '@vercel/blob';

const BLOB_PATH = 'feedbacks.json';

const getToken = () => process.env.BLOB_READ_WRITE_TOKEN;

// Input limits to keep abuse / oversized payloads out of the stored JSON
const MAX_FEEDBACK_LEN = 2000;
const MAX_NAME_LEN = 80;
const MAX_PHONE_LEN = 20;
const MAX_STORED = 500;
const ALLOWED_CATEGORIES = ['পরামর্শ', 'তথ্য আপডেট', 'সমস্যা', 'সাধারণ'];

const parseBody = (req) => {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return req.body || {};
};

async function getStoredFeedbacks() {
  const token = getToken();
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, token });
    const target = blobs.find(b => b.pathname === BLOB_PATH);
    if (!target) return [];

    // Fetch latest JSON with cache-busting
    const fetchUrl = target.url.includes('?') 
      ? `${target.url}&_cb=${Date.now()}` 
      : `${target.url}?_cb=${Date.now()}`;
    const res = await fetch(fetchUrl, { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching feedbacks from blob:', err);
    return [];
  }
}

async function saveStoredFeedbacks(feedbacks) {
  const token = getToken();
  const blob = await put(BLOB_PATH, JSON.stringify(feedbacks), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    token
  });
  return blob;
}

export default async function handler(req, res) {
  // Prevent any CDN / Browser caching of feedback API
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // The site calls this API from the same origin, so no CORS headers are needed.
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // GET: Fetch all feedbacks
    if (req.method === 'GET') {
      const feedbacks = await getStoredFeedbacks();
      return res.status(200).json({ success: true, feedbacks });
    }

    // POST: Add new feedback
    if (req.method === 'POST') {
      const body = parseBody(req);
      if (!body) {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
      const { category, name, phone, feedback } = body;

      if (typeof feedback !== 'string' || !feedback.trim()) {
        return res.status(400).json({ success: false, error: 'Feedback text is required' });
      }
      if (feedback.trim().length > MAX_FEEDBACK_LEN) {
        return res.status(400).json({ success: false, error: 'Feedback is too long' });
      }

      const existing = await getStoredFeedbacks();
      const newEntry = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        category: ALLOWED_CATEGORIES.includes(category) ? category : 'পরামর্শ',
        name: (typeof name === 'string' && name.trim().slice(0, MAX_NAME_LEN)) || 'সম্মানিত ভিজিটর',
        phone: (typeof phone === 'string' && phone.trim().slice(0, MAX_PHONE_LEN)) || '',
        feedback: feedback.trim(),
        date: new Intl.DateTimeFormat('bn-BD', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date()),
        dateRaw: new Date().toISOString()
      };

      const updated = [newEntry, ...existing].slice(0, MAX_STORED);
      await saveStoredFeedbacks(updated);

      return res.status(201).json({ success: true, feedback: newEntry, count: updated.length });
    }

    // DELETE: Delete single or all feedbacks
    if (req.method === 'DELETE') {
      const body = parseBody(req);
      if (!body) {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
      const { id, all } = body;

      if (all) {
        await saveStoredFeedbacks([]);
        return res.status(200).json({ success: true, message: 'All feedbacks cleared' });
      }

      if (id) {
        const existing = await getStoredFeedbacks();
        const updated = existing.filter(f => f.id !== id);
        await saveStoredFeedbacks(updated);
        return res.status(200).json({ success: true, message: 'Feedback deleted' });
      }

      return res.status(400).json({ success: false, error: 'id or all required' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
