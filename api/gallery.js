import { put, get, del } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import { noStore, parseBody, requireAdmin } from './_lib.js';

// Rate pictures (rate charts, price lists, photos) the admin uploads. They show in a gallery above the
// rates on the DOC tab, the Ready tab, or both.
//   GET  (public) -> the gallery list (CDN cached)
//   POST (admin)  -> {action:'add', image:<data URL>, caption, target} | {action:'update', id, caption, target}
//                    | {action:'delete', id}
// Storage cost on the free Vercel Blob plan: an upload is 2 writes (the picture + the list), delete is
// 1 write (removing a blob is free). The browser shrinks every picture before sending it.
const INDEX_PATH = 'gallery/index.json';
const MAX_IMAGES = 40;
const MAX_BYTES = 1_500_000; // after the browser's compression a picture is ~150-500 KB
const TARGETS = ['doc', 'ready', 'all'];
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

async function readIndex() {
  try {
    const r = await get(INDEX_PATH, { access: 'public', useCache: false });
    if (!r || r.statusCode !== 200) return [];
    const data = JSON.parse(await new Response(r.stream).text());
    return Array.isArray(data.images) ? data.images : [];
  } catch { return []; }
}

const writeIndex = (images) =>
  put(INDEX_PATH, JSON.stringify({ images }), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60
  });

const matchesMagic = (buf, type) => {
  if (type === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (type === 'image/png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (type === 'image/webp') return buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  return false;
};

export default async function handler(req, res) {
  noStore(res);
  try {
    if (req.method === 'GET') {
      const images = await readIndex();
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({ success: true, images });
    }
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!(await requireAdmin(req, res))) return;

    const body = parseBody(req);
    if (!body || typeof body !== 'object') return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    const images = await readIndex();

    if (body.action === 'add') {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(typeof body.image === 'string' ? body.image : '');
      if (!m) return res.status(400).json({ success: false, error: 'শুধু JPG, PNG বা WebP ছবি দিন' });
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > MAX_BYTES) return res.status(413).json({ success: false, error: 'ছবিটি খুব বড় (সর্বোচ্চ ১.৫ MB)' });
      if (!matchesMagic(buf, m[1])) return res.status(400).json({ success: false, error: 'ছবির ফাইলটি সঠিক নয়' });
      if (images.length >= MAX_IMAGES) return res.status(400).json({ success: false, error: `সর্বোচ্চ ${MAX_IMAGES}টি ছবি রাখা যায়, পুরনো কিছু মুছুন` });

      const blob = await put(`gallery/img.${TYPES[m[1]]}`, buf, {
        access: 'public', addRandomSuffix: true, contentType: m[1], cacheControlMaxAge: 31536000
      });
      const item = {
        id: `g-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`,
        url: blob.url,
        caption: str(body.caption, 120),
        target: TARGETS.includes(body.target) ? body.target : 'all',
        createdAt: Date.now()
      };
      const next = [item, ...images];
      await writeIndex(next);
      return res.status(200).json({ success: true, images: next });
    }

    if (body.action === 'update') {
      const id = str(body.id, 40);
      const next = images.map((it) => (it.id === id
        ? { ...it, caption: str(body.caption, 120), target: TARGETS.includes(body.target) ? body.target : it.target }
        : it));
      await writeIndex(next);
      return res.status(200).json({ success: true, images: next });
    }

    if (body.action === 'delete') {
      const id = str(body.id, 40);
      const target = images.find((it) => it.id === id);
      if (!target) return res.status(404).json({ success: false, error: 'ছবিটি পাওয়া যায়নি' });
      const next = images.filter((it) => it.id !== id);
      await writeIndex(next);
      try { await del(target.url); } catch { /* the list no longer points to it; a leftover blob is harmless */ }
      return res.status(200).json({ success: true, images: next });
    }

    return res.status(400).json({ success: false, error: 'unknown action' });
  } catch (err) {
    console.error('gallery error', err);
    return res.status(500).json({ success: false, error: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন' });
  }
}
