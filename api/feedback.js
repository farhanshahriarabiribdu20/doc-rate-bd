import { put, list, del } from '@vercel/blob';

const BLOB_PATH = 'feedbacks.json';

const getToken = () => process.env.BLOB_READ_WRITE_TOKEN;

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

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: Fetch all feedbacks
    if (req.method === 'GET') {
      const feedbacks = await getStoredFeedbacks();
      return res.status(200).json({ success: true, feedbacks });
    }

    // POST: Add new feedback
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { category, name, phone, feedback } = body || {};

      if (!feedback || !feedback.trim()) {
        return res.status(400).json({ success: false, error: 'Feedback text is required' });
      }

      const existing = await getStoredFeedbacks();
      const newEntry = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        category: category || 'পরামর্শ',
        name: (name && name.trim()) || 'সম্মানিত ভিজিটর',
        phone: (phone && phone.trim()) || '',
        feedback: feedback.trim(),
        date: new Intl.DateTimeFormat('bn-BD', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date()),
        dateRaw: new Date().toISOString()
      };

      const updated = [newEntry, ...existing];
      await saveStoredFeedbacks(updated);

      return res.status(201).json({ success: true, feedback: newEntry, count: updated.length });
    }

    // DELETE: Delete single or all feedbacks
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
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
    return res.status(500).json({ success: false, error: err.message });
  }
}
