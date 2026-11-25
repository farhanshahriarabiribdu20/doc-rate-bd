import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { put, del } from '@vercel/blob';
import { noStore, parseBody, requireAdmin } from './_lib.js';
import { readFresh, writeFresh } from './_fresh.js';
import { allow, countBlob } from './_budget.js';
import { DISTRICTS } from '../src/data/districts.js';

// Seller marketplace: NO login. Anyone posts a listing with name, mobile number and location. The
// seller is identified by the mobile number; the browser that posted keeps a private edit key per
// listing so the poster can mark it sold / renew / delete it later.
//
//   GET  ?                         (public) -> live listings (CDN cached)
//   POST {action:'post'}           (public) -> new listing, returns {id, editKey}
//   POST {action:'mine'}           (public) -> status of my listings, given [{id, key}] from this browser
//   POST {action:'update'}         (public, needs the listing's editKey) -> sold, renew, delete
//   POST {action:'rate'}           (public) -> buyer star rating
//   GET  ?admin=1                  (admin)  -> every listing
//   POST {action:'admin'}          (admin)  -> delete, ban, verified tick, rating reset (no approval: ads go live at once)
//
// Storage is Vercel Blob. The free plan has only ~2,000 write/list operations a month shared with the
// whole site, so there is exactly ONE blob for all listings and ONE small blob per account. A listing
// costs one write; browsing costs nothing (CDN cache).
const LISTINGS_PATH = 'market/listings.json';
const USER_PREFIX = 'market/u/';
const LISTING_TTL_MS = 10 * 24 * 3600 * 1000;
const KEEP_MS = 30 * 24 * 3600 * 1000; // old listings are dropped after this
const MAX_ACTIVE_PER_SELLER = 5; // per phone number
const MAX_ACTIVE_PER_IP = 8;
const MAX_POSTS_PER_IP_DAY = 10;
const MAX_MINE = 20;
const MAX_IMAGES = 1; // pictures per listing (phone photos are shrunk in the browser first)
const MAX_IMAGE_BYTES = 450 * 1024;
const IMG_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_ITEMS = 600;
const MAX_RATED_SELLERS = 500;
const MAX_VOTERS = 100; // per seller
const MIN_FORM_MS = 2500;

const PRODUCTS = ['broiler', 'sonali', 'color', 'layer_hen', 'egg', 'duck', 'other'];
const UNITS = ['kg', 'pcs', 'hali', 'dozen'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const strMulti = (v, max) => (typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');

const secret = () => process.env.MARKET_SECRET || process.env.ADMIN_PASSWORD || '';
const hmac = (data) => createHmac('sha256', secret()).update(data).digest();
const b64 = (buf) => Buffer.from(buf).toString('base64url');

const hashKey = (key) => hmac(`edit:${key}`).toString('hex').slice(0, 32);

const emptyStore = () => ({ settings: { requireApproval: false }, banned: [], verified: [], ratings: {}, items: [] });

async function readStore() {
  const data = await readFresh(LISTINGS_PATH);
  const base = emptyStore();
  if (!data || typeof data !== 'object') return base;
  return {
    v: Number(data.v) || 0,
    settings: { requireApproval: false }, // ads are published at once; the admin can only delete / block
    banned: Array.isArray(data.banned) ? data.banned.filter((x) => typeof x === 'string').slice(0, 500) : [],
    verified: Array.isArray(data.verified) ? data.verified.filter((x) => typeof x === 'string').slice(0, 500) : [],
    ratings: data.ratings && typeof data.ratings === 'object' && !Array.isArray(data.ratings) ? data.ratings : {},
    items: (Array.isArray(data.items) ? data.items : []).map((it) => (it && it.status === 'pending' ? { ...it, status: 'live' } : it))
  };
}

/**
 * Read -> change -> write -> read back. If another request overwrote ours in between (blob has no
 * transactions) the change is applied again, up to 3 tries.
 */
async function mutateStore(change, verify, kind = 'ad') {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const store = await readStore();
    const outcome = change(store);
    if (outcome && outcome.error) return outcome;
    const { v: prevV, ...data } = store;
    await writeFresh(LISTINGS_PATH, data, prevV, kind);
    const check = await readStore();
    if (verify(check)) return { ...(outcome || {}), store: check };
    await wait(150 + Math.random() * 250);
  }
  return { error: 'সার্ভার ব্যস্ত, আবার চেষ্টা করুন', status: 503 };
}

// ---------- listings ----------
const isActive = (it) => it.status === 'pending' || it.status === 'live';
const isLive = (it, now) => it.status === 'live' && it.expiresAt > now;

function prune(store, now) {
  const before = store.items;
  store.items = before
    .filter((it) => now - (it.createdAt || 0) < KEEP_MS)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_ITEMS);
  const kept = new Set(store.items);
  return before.filter((it) => !kept.has(it)).flatMap((it) => it.imgs || []);
}

// Pictures live in their own blobs; they are removed when their listing goes away. A leftover blob is harmless.
const dropImages = async (urls) => {
  await Promise.all((urls || []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).map((u) => del(u).catch(() => {})));
};

function magicOk(buf, type) {
  if (type === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (type === 'image/png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
}

/** Checks the pictures (data URLs) sent with a listing; returns decoded buffers or an error. */
function decodeImages(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_IMAGES) : [];
  const out = [];
  for (const d of list) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(typeof d === 'string' ? d : '');
    if (!m) return { error: 'শুধু JPG, PNG বা WebP ছবি দিন' };
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_IMAGE_BYTES) return { error: 'ছবি খুব বড়, ছোট ছবি দিন' };
    if (!magicOk(buf, m[1])) return { error: 'ছবির ফাইলটি সঠিক নয়' };
    out.push({ buf, type: m[1] });
  }
  return { images: out };
}

const publicItem = (it) => ({
  id: it.id, sellerName: it.sellerName, phone: it.phone, product: it.product, customName: it.customName || '', age: it.age || 0, ageUnit: it.ageUnit || 'day', quantity: it.quantity, unit: it.unit,
  price: it.price, location: it.location, district: it.district || '', details: it.details, imgs: it.imgs || [], createdAt: it.createdAt, expiresAt: it.expiresAt
});

// Seller trust info shown next to a listing: admin-granted "verified" tick and buyers' star rating.
const trustOf = (store, userId) => {
  const r = store.ratings[userId];
  return { verified: store.verified.includes(userId), rating: r && r.count > 0 ? { avg: Math.round((r.sum / r.count) * 10) / 10, count: r.count } : null };
};

const mineItem = (it, now) => ({
  ...publicItem(it), status: it.status === 'live' && it.expiresAt <= now ? 'expired' : it.status
});

const adminItem = (it, now, store) => ({ ...mineItem(it, now), userId: it.userId, ...(store ? trustOf(store, it.userId) : {}) });

function validateListing(body) {
  const product = PRODUCTS.includes(body.product) ? body.product : null;
  if (!product) return { error: 'পণ্যের ধরন বাছাই করুন' };
  const unit = UNITS.includes(body.unit) ? body.unit : null;
  if (!unit) return { error: 'একক বাছাই করুন' };
  const quantity = Math.round(Number(body.quantity) * 100) / 100;
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000000) return { error: 'পরিমাণ সঠিক দিন' };
  const rawPrice = body.price === '' || body.price === null || body.price === undefined ? 0 : Number(body.price);
  if (!Number.isFinite(rawPrice) || rawPrice < 0 || rawPrice > 100000) return { error: 'দাম সঠিক দিন' };
  const price = Math.round(rawPrice * 100) / 100; // 0 = "দর আলোচনা সাপেক্ষে"
  const location = str(body.location, 80);
  if (location.length < 2) return { error: 'এলাকা/ঠিকানা লিখুন' };
  const district = DISTRICTS.includes(body.district) ? body.district : '';
  if (!district) return { error: 'জেলা বাছাই করুন' };
  const customName = product === 'other' ? str(body.customName, 40) : '';
  const ageNum = body.age === '' || body.age === null || body.age === undefined ? 0 : Math.round(Number(body.age));
  if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 3650) return { error: 'বয়স সঠিক দিন' };
  const ageUnit = ['day', 'week', 'month'].includes(body.ageUnit) ? body.ageUnit : 'day';
  const details = strMulti(body.details, 300);
  return { value: { product, customName, age: ageNum, ageUnit, unit, quantity, price, location, district, details } };
}

// ---------- posting (no account) ----------
const USER_RE = /^[a-z0-9_]{3,20}$/;
const PHONE_RE = /^(?:\+?88)?(01[3-9]\d{8})$/;
const bnDigits = (s) => String(s || '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
const clientIp = (req) => String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || '').split(',')[0].trim() || 'unknown';

async function postListing(body, req, res) {
  if (body.website) return res.status(200).json({ success: true, id: '', editKey: '', status: 'live' }); // honeypot: pretend it worked
  const elapsed = Number(body.formMs);
  if (Number.isFinite(elapsed) && elapsed < MIN_FORM_MS) return res.status(429).json({ success: false, error: 'একটু ধীরে, আবার চেষ্টা করুন' });

  const name = str(body.name, 60);
  if (name.length < 2) return res.status(400).json({ success: false, error: 'আপনার নাম / ফার্মের নাম দিন' });
  const phoneMatch = PHONE_RE.exec(bnDigits(str(body.phone, 20)).replace(/[\s-]/g, ''));
  if (!phoneMatch) return res.status(400).json({ success: false, error: 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)' });
  const phone = phoneMatch[1];
  const parsed = validateListing(body);
  if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
  const pics = decodeImages(body.images);
  if (pics.error) return res.status(400).json({ success: false, error: pics.error });

  const gate = await allow('ad');
  if (!gate.ok) return res.status(429).json({ success: false, error: gate.error });

  const now = Date.now();
  const userId = phone; // seller identity = mobile number (also the key for ban / verified / rating)
  const ih = hmac(`ip:${clientIp(req)}`).toString('hex').slice(0, 16);
  const id = `ml-${now.toString(36)}-${randomBytes(3).toString('hex')}`;
  const editKey = randomBytes(12).toString('base64url');

  // Upload the pictures first (one blob write each); they are removed again if the listing is refused.
  let imgs = [];
  if (pics.images.length) {
    try {
      await countBlob('ad', pics.images.length);
      imgs = await Promise.all(pics.images.map((p, i) => put(`market/img/${id}-${i}.${IMG_TYPES[p.type]}`, p.buf, {
        access: 'public', addRandomSuffix: true, contentType: p.type, cacheControlMaxAge: 31536000
      }).then((b) => b.url)));
    } catch {
      await dropImages(imgs);
      return res.status(503).json({ success: false, error: 'ছবি আপলোড হয়নি, আবার চেষ্টা করুন' });
    }
  }
  let dropped = [];
  const outcome = await mutateStore((store) => {
    if (store.banned.includes(userId)) return { error: 'এই নম্বর থেকে বিজ্ঞাপন দেওয়া বন্ধ করা আছে', status: 403 };
    const activeOf = (fn) => store.items.filter((it) => fn(it) && isActive(it) && it.expiresAt > now).length;
    if (activeOf((it) => it.userId === userId) >= MAX_ACTIVE_PER_SELLER) return { error: `এই নম্বরে একসাথে সর্বোচ্চ ${MAX_ACTIVE_PER_SELLER}টি বিজ্ঞাপন চালু রাখা যায়। আগেরটি বিক্রি/মুছে নতুন দিন`, status: 400 };
    if (activeOf((it) => it.ih === ih) >= MAX_ACTIVE_PER_IP) return { error: 'আপনার ডিভাইস থেকে অনেক বিজ্ঞাপন চালু আছে। আগেরগুলো বিক্রি/মুছে নতুন দিন', status: 429 };
    if (store.items.filter((it) => it.ih === ih && now - it.createdAt < 24 * 3600 * 1000).length >= MAX_POSTS_PER_IP_DAY) return { error: 'আজকের জন্য বিজ্ঞাপন দেওয়ার সীমা শেষ, কাল আবার চেষ্টা করুন', status: 429 };
    const status = 'live';
    store.items.unshift({
      id, userId, sellerName: name, phone, ...parsed.value, imgs, status, ih, mk: hashKey(editKey), createdAt: now, expiresAt: now + LISTING_TTL_MS
    });
    dropped = prune(store, now);
    return { status };
  }, (check) => check.items.some((it) => it.id === id));
  if (dropped.length) await dropImages(dropped);
  if (outcome.error) {
    await dropImages(imgs);
    return res.status(outcome.status || 400).json({ success: false, error: outcome.error });
  }
  return res.status(200).json({ success: true, id, editKey, status: outcome.status });
}

const keyOk = (it, key) => {
  if (!it.mk || typeof key !== 'string' || key.length > 60) return false;
  const a = Buffer.from(it.mk);
  const b = Buffer.from(hashKey(key));
  return a.length === b.length && timingSafeEqual(a, b);
};

async function mineAction(body, res) {
  const now = Date.now();
  const refs = Array.isArray(body.refs) ? body.refs.slice(0, MAX_MINE) : [];
  const store = await readStore();
  const items = [];
  for (const r of refs) {
    const it = store.items.find((x) => x.id === str(r?.id, 40));
    if (it && keyOk(it, r.key)) items.push(mineItem(it, now));
  }
  return res.status(200).json({ success: true, items, requireApproval: store.settings.requireApproval });
}

async function updateAction(body, res) {
  const now = Date.now();
  const id = str(body.id, 40);
  const op = body.op;
  const key = body.key;
  if (!['sold', 'delete', 'renew'].includes(op) || !id) return res.status(400).json({ success: false, error: 'অনুরোধ সঠিক নয়' });
  const gate = await allow('adedit');
  if (!gate.ok) return res.status(429).json({ success: false, error: gate.error });
  let removedImgs = [];
  const outcome = await mutateStore((store) => {
    const idx = store.items.findIndex((it) => it.id === id);
    if (idx < 0 || !keyOk(store.items[idx], key)) return { error: 'বিজ্ঞাপনটি পাওয়া যায়নি', status: 404 };
    const it = store.items[idx];
    if (op === 'delete') { removedImgs = it.imgs || []; store.items.splice(idx, 1); }
    else if (op === 'sold') it.status = 'sold';
    else if (op === 'renew') {
      if (it.status === 'sold' || it.status === 'hidden') return { error: 'এই বিজ্ঞাপন নবায়ন করা যাবে না', status: 400 };
      it.expiresAt = now + LISTING_TTL_MS;
    }
    return {};
  }, (check) => {
    const it = check.items.find((x) => x.id === id);
    if (op === 'delete') return !it;
    if (op === 'sold') return !it || it.status === 'sold';
    return !it || it.expiresAt >= now + LISTING_TTL_MS - 1000;
  }, 'adedit');
  if (outcome.error) return res.status(outcome.status || 400).json({ success: false, error: outcome.error });
  if (removedImgs.length) await dropImages(removedImgs);
  return res.status(200).json({ success: true });
}

// ---------- admin ----------
async function adminAction(body, res) {
  const now = Date.now();
  const op = body.op;
  const id = str(body.id, 40);
  const userId = str(body.userId, 30).toLowerCase();
  let removedImgs = [];

  const outcome = await mutateStore((store) => {
    if (op === 'delete') {
      const idx = store.items.findIndex((it) => it.id === id);
      if (idx < 0) return { error: 'বিজ্ঞাপনটি পাওয়া যায়নি', status: 404 };
      removedImgs = store.items[idx].imgs || [];
      store.items.splice(idx, 1);
      return {};
    }
    if (op === 'edit') {
      const it = store.items.find((x) => x.id === id);
      if (!it) return { error: 'বিজ্ঞাপনটি পাওয়া যায়নি', status: 404 };
      const f = body.fields || {};
      const sellerName = str(f.sellerName, 60);
      if (sellerName.length < 2) return { error: 'বিক্রেতার নাম দিন', status: 400 };
      const parsed = validateListing({ ...f, district: DISTRICTS.includes(f.district) ? f.district : it.district });
      if (parsed.error) return { error: parsed.error, status: 400 };
      Object.assign(it, parsed.value, { sellerName });
      return {};
    }
    if (op === 'ban' || op === 'unban') {
      if (!USER_RE.test(userId)) return { error: 'userId দিন', status: 400 };
      const set = new Set(store.banned);
      if (op === 'ban') {
        set.add(userId);
        store.items.forEach((it) => { if (it.userId === userId && isActive(it)) it.status = 'hidden'; });
      } else set.delete(userId);
      store.banned = [...set].slice(0, 500);
      return {};
    }
    if (op === 'verify' || op === 'unverify') {
      if (!USER_RE.test(userId)) return { error: 'userId দিন', status: 400 };
      const set = new Set(store.verified);
      if (op === 'verify') set.add(userId); else set.delete(userId);
      store.verified = [...set].slice(0, 500);
      return {};
    }
    if (op === 'resetRating') {
      if (!USER_RE.test(userId)) return { error: 'userId দিন', status: 400 };
      delete store.ratings[userId];
      return {};
    }
    return { error: 'unknown op', status: 400 };
  }, (check) => {
    if (op === 'delete') return !check.items.some((it) => it.id === id);
    if (op === 'edit') return true;
    if (op === 'ban') return check.banned.includes(userId);
    if (op === 'unban') return !check.banned.includes(userId);
    if (op === 'verify') return check.verified.includes(userId);
    if (op === 'unverify') return !check.verified.includes(userId);
    if (op === 'resetRating') return !check.ratings[userId];
    return true;
  }, 'admin');
  if (outcome.error) return res.status(outcome.status || 400).json({ success: false, error: outcome.error });
  if (removedImgs.length) await dropImages(removedImgs);
  const s = outcome.store;
  return res.status(200).json({ success: true, items: s.items.map((it) => adminItem(it, now, s)), banned: s.banned, requireApproval: s.settings.requireApproval });
}

// ---------- buyer rating ----------
// Buyers have no accounts, so one vote per person is approximated by a hash of (IP + seller). It is not
// fraud-proof, which is why the admin can reset a seller's rating. One rating costs one blob write.
async function rateSeller(body, req, res) {
  const id = str(body.id, 40);
  const stars = Math.round(Number(body.stars));
  if (!id || !(stars >= 1 && stars <= 5)) return res.status(400).json({ success: false, error: 'রেটিং ১ থেকে ৫ এর মধ্যে দিন' });
  const now = Date.now();
  const ip = clientIp(req);
  const gate = await allow('adrate');
  if (!gate.ok) return res.status(429).json({ success: false, error: gate.error });
  let voter = '';
  const outcome = await mutateStore((store) => {
    const it = store.items.find((x) => x.id === id && isLive(x, now));
    if (!it) return { error: 'বিজ্ঞাপনটি পাওয়া যায়নি', status: 404 };
    voter = hmac(`voter:${ip}|${it.userId}`).toString('hex').slice(0, 16);
    const r = store.ratings[it.userId] || { sum: 0, count: 0, voters: [] };
    if (r.voters.includes(voter)) return { error: 'আপনি এই বিক্রেতাকে আগেই রেটিং দিয়েছেন', status: 409 };
    if (r.voters.length >= MAX_VOTERS) return { error: 'এই বিক্রেতার রেটিং সীমা পূর্ণ', status: 400 };
    if (!store.ratings[it.userId] && Object.keys(store.ratings).length >= MAX_RATED_SELLERS) return { error: 'এখন রেটিং নেওয়া যাচ্ছে না', status: 503 };
    store.ratings[it.userId] = { sum: r.sum + stars, count: r.count + 1, voters: [...r.voters, voter] };
    return { userId: it.userId };
  }, (check) => Object.values(check.ratings).some((r) => r.voters.includes(voter)), 'adrate');
  if (outcome.error) return res.status(outcome.status || 400).json({ success: false, error: outcome.error });
  return res.status(200).json({ success: true, ...trustOf(outcome.store, outcome.userId) });
}

export default async function handler(req, res) {
  noStore(res);
  try {
    if (!secret()) {
      return res.status(503).json({ success: false, code: 'NOT_CONFIGURED', error: 'ADMIN_PASSWORD (or MARKET_SECRET) environment variable is not set on the server' });
    }
    const now = Date.now();

    if (req.method === 'GET') {
      if (req.query?.admin) {
        if (!(await requireAdmin(req, res))) return;
        const store = await readStore();
        return res.status(200).json({ success: true, items: store.items.map((it) => adminItem(it, now, store)), banned: store.banned, requireApproval: store.settings.requireApproval });
      }
      const store = await readStore();
      const items = store.items.filter((it) => isLive(it, now) && !store.banned.includes(it.userId)).map((it) => ({ ...publicItem(it), ...trustOf(store, it.userId) }));
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
      return res.status(200).json({ success: true, items });
    }

    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const body = parseBody(req);
    if (!body || typeof body !== 'object') return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    const action = body.action;

    if (action === 'post') return await postListing(body, req, res);
    if (action === 'mine') return await mineAction(body, res);
    if (action === 'update') return await updateAction(body, res);
    if (action === 'rate') return await rateSeller(body, req, res);
    if (action === 'admin') {
      if (!(await requireAdmin(req, res))) return;
      return await adminAction(body, res);
    }
    return res.status(400).json({ success: false, error: 'unknown action' });
  } catch (err) {
    console.error('market error', err);
    return res.status(500).json({ success: false, error: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন' });
  }
}
