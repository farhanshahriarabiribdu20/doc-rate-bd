import { put, get } from '@vercel/blob';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { noStore, parseBody, requireAdmin } from './_lib.js';
import { readFresh, writeFresh } from './_fresh.js';

// Seller marketplace: anyone can open a free seller account (user id + password), log in and post
// ready-bird / egg listings. Everybody can browse the live listings.
//
//   GET  ?                         (public) -> live listings (CDN cached)
//   POST {action:'register'}       (public) -> create a seller account, returns a login token
//   POST {action:'login'}          (public) -> log in, returns a login token
//   POST {action:'mine'|'create'|'update'}  (seller token) -> my listings / new listing / sold, renew, delete
//   GET  ?admin=1                  (admin)  -> everything incl. pending listings and settings
//   POST {action:'admin'}          (admin)  -> approve, hide, delete, ban, approval on/off
//
// Storage is Vercel Blob. The free plan has only ~2,000 write/list operations a month shared with the
// whole site, so there is exactly ONE blob for all listings and ONE small blob per account. A listing
// costs one write; browsing costs nothing (CDN cache).
const LISTINGS_PATH = 'market/listings.json';
const USER_PREFIX = 'market/u/';
const TOKEN_TTL_MS = 30 * 24 * 3600 * 1000;
const LISTING_TTL_MS = 10 * 24 * 3600 * 1000;
const KEEP_MS = 30 * 24 * 3600 * 1000; // old listings are dropped after this
const MAX_ACTIVE_PER_SELLER = 5;
const MAX_ITEMS = 600;
const MIN_FORM_MS = 2500;

const PRODUCTS = ['broiler', 'sonali', 'color', 'layer_hen', 'egg', 'duck', 'other'];
const UNITS = ['kg', 'pcs', 'hali', 'dozen'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const strMulti = (v, max) => (typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');

const secret = () => process.env.MARKET_SECRET || process.env.ADMIN_PASSWORD || '';
const hmac = (data) => createHmac('sha256', secret()).update(data).digest();
const b64 = (buf) => Buffer.from(buf).toString('base64url');

const userPath = (userId) => `${USER_PREFIX}${hmac(`user:${userId}`).toString('hex').slice(0, 40)}.json`;

const scryptAsync = (password, salt) =>
  new Promise((resolve, reject) => scrypt(password, salt, 32, (err, key) => (err ? reject(err) : resolve(key))));

// ---------- tokens ----------
function makeToken(user) {
  const payload = b64(JSON.stringify({ u: user.userId, n: user.name, p: user.phone, exp: Date.now() + TOKEN_TTL_MS }));
  return `${payload}.${b64(hmac(`token:${payload}`))}`;
}

function readToken(token) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = hmac(`token:${payload}`);
  let given;
  try { given = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.u !== 'string' || !(data.exp > Date.now())) return null;
    return { userId: data.u, name: str(data.n, 80), phone: str(data.p, 20) };
  } catch { return null; }
}

// ---------- blob helpers ----------
async function readJson(path) {
  try {
    const r = await get(path, { access: 'public', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch { return null; }
}

const writeJson = (path, data) =>
  put(path, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60
  });

const emptyStore = () => ({ settings: { requireApproval: true }, banned: [], items: [] });

async function readStore() {
  const data = await readFresh(LISTINGS_PATH);
  const base = emptyStore();
  if (!data || typeof data !== 'object') return base;
  return {
    v: Number(data.v) || 0,
    settings: { requireApproval: data.settings?.requireApproval !== false },
    banned: Array.isArray(data.banned) ? data.banned.filter((x) => typeof x === 'string').slice(0, 500) : [],
    items: Array.isArray(data.items) ? data.items : []
  };
}

/**
 * Read -> change -> write -> read back. If another request overwrote ours in between (blob has no
 * transactions) the change is applied again, up to 3 tries.
 */
async function mutateStore(change, verify) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const store = await readStore();
    const outcome = change(store);
    if (outcome && outcome.error) return outcome;
    const { v: prevV, ...data } = store;
    await writeFresh(LISTINGS_PATH, data, prevV);
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
  store.items = store.items
    .filter((it) => now - (it.createdAt || 0) < KEEP_MS)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_ITEMS);
}

const publicItem = (it) => ({
  id: it.id, sellerName: it.sellerName, phone: it.phone, product: it.product, quantity: it.quantity, unit: it.unit,
  price: it.price, location: it.location, details: it.details, createdAt: it.createdAt, expiresAt: it.expiresAt
});

const mineItem = (it, now) => ({
  ...publicItem(it), status: it.status === 'live' && it.expiresAt <= now ? 'expired' : it.status
});

const adminItem = (it, now) => ({ ...mineItem(it, now), userId: it.userId });

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
  const details = strMulti(body.details, 300);
  return { value: { product, unit, quantity, price, location, details } };
}

// ---------- accounts ----------
const USER_RE = /^[a-z0-9_]{3,20}$/;
const PHONE_RE = /^(?:\+?88)?(01[3-9]\d{8})$/;

const bnDigits = (s) => String(s || '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));

async function register(body, res) {
  if (body.website) return res.status(200).json({ success: true, token: '' }); // honeypot: pretend it worked
  const elapsed = Number(body.formMs);
  if (Number.isFinite(elapsed) && elapsed < MIN_FORM_MS) return res.status(429).json({ success: false, error: 'একটু ধীরে, আবার চেষ্টা করুন' });

  const userId = str(body.userId, 30).toLowerCase();
  if (!USER_RE.test(userId)) return res.status(400).json({ success: false, error: 'ইউজার আইডি ৩–২০ অক্ষরের হতে হবে (a-z, 0-9, _)' });
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 6 || password.length > 100) return res.status(400).json({ success: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন' });
  const name = str(body.name, 60);
  if (name.length < 2) return res.status(400).json({ success: false, error: 'আপনার নাম / ফার্মের নাম দিন' });
  const phoneMatch = PHONE_RE.exec(bnDigits(str(body.phone, 20)).replace(/[\s-]/g, ''));
  if (!phoneMatch) return res.status(400).json({ success: false, error: 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)' });

  const path = userPath(userId);
  if (await readJson(path)) return res.status(409).json({ success: false, error: 'এই ইউজার আইডি আগেই নেওয়া হয়েছে, অন্য একটি দিন' });

  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt);
  const user = { userId, name, phone: phoneMatch[1], salt: salt.toString('hex'), hash: hash.toString('hex'), createdAt: Date.now() };
  await writeJson(path, user);
  return res.status(200).json({ success: true, token: makeToken(user), user: { userId, name, phone: user.phone } });
}

async function login(body, res) {
  const userId = str(body.userId, 30).toLowerCase();
  const password = typeof body.password === 'string' ? body.password.slice(0, 100) : '';
  const fail = async () => {
    await wait(700);
    return res.status(401).json({ success: false, error: 'ইউজার আইডি বা পাসওয়ার্ড ভুল' });
  };
  if (!USER_RE.test(userId) || !password) return fail();
  const user = await readJson(userPath(userId));
  if (!user || !user.salt || !user.hash) return fail();
  const hash = await scryptAsync(password, Buffer.from(user.salt, 'hex'));
  const stored = Buffer.from(user.hash, 'hex');
  if (hash.length !== stored.length || !timingSafeEqual(hash, stored)) return fail();
  return res.status(200).json({ success: true, token: makeToken(user), user: { userId, name: user.name, phone: user.phone } });
}

// ---------- seller actions ----------
async function sellerAction(action, body, me, res) {
  const now = Date.now();

  if (action === 'mine') {
    const store = await readStore();
    const items = store.items.filter((it) => it.userId === me.userId).map((it) => mineItem(it, now));
    return res.status(200).json({ success: true, items, banned: store.banned.includes(me.userId), requireApproval: store.settings.requireApproval });
  }

  if (action === 'create') {
    const parsed = validateListing(body);
    if (parsed.error) return res.status(400).json({ success: false, error: parsed.error });
    const id = `ml-${now.toString(36)}-${randomBytes(3).toString('hex')}`;
    const outcome = await mutateStore((store) => {
      if (store.banned.includes(me.userId)) return { error: 'আপনার অ্যাকাউন্টটি বন্ধ করা আছে', status: 403 };
      const active = store.items.filter((it) => it.userId === me.userId && isActive(it) && it.expiresAt > now).length;
      if (active >= MAX_ACTIVE_PER_SELLER) return { error: `একসাথে সর্বোচ্চ ${MAX_ACTIVE_PER_SELLER}টি বিজ্ঞাপন চালু রাখা যায়। আগেরটি বিক্রি/মুছে নতুন দিন`, status: 400 };
      const status = store.settings.requireApproval ? 'pending' : 'live';
      store.items.unshift({
        id, userId: me.userId, sellerName: me.name, phone: me.phone, ...parsed.value,
        status, createdAt: now, expiresAt: now + LISTING_TTL_MS
      });
      prune(store, now);
      return { status };
    }, (check) => check.items.some((it) => it.id === id));
    if (outcome.error) return res.status(outcome.status || 400).json({ success: false, error: outcome.error });
    return res.status(200).json({ success: true, id, status: outcome.status });
  }

  if (action === 'update') {
    const id = str(body.id, 40);
    const op = body.op;
    if (!['sold', 'delete', 'renew'].includes(op) || !id) return res.status(400).json({ success: false, error: 'অনুরোধ সঠিক নয়' });
    const outcome = await mutateStore((store) => {
      const idx = store.items.findIndex((it) => it.id === id && it.userId === me.userId);
      if (idx < 0) return { error: 'বিজ্ঞাপনটি পাওয়া যায়নি', status: 404 };
      const it = store.items[idx];
      if (op === 'delete') store.items.splice(idx, 1);
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
    });
    if (outcome.error) return res.status(outcome.status || 400).json({ success: false, error: outcome.error });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ success: false, error: 'unknown action' });
}

// ---------- admin ----------
async function adminAction(body, res) {
  const now = Date.now();
  const op = body.op;
  const id = str(body.id, 40);
  const userId = str(body.userId, 30).toLowerCase();

  const outcome = await mutateStore((store) => {
    if (op === 'approve' || op === 'hide' || op === 'delete') {
      const idx = store.items.findIndex((it) => it.id === id);
      if (idx < 0) return { error: 'বিজ্ঞাপনটি পাওয়া যায়নি', status: 404 };
      if (op === 'delete') store.items.splice(idx, 1);
      else {
        store.items[idx].status = op === 'approve' ? 'live' : 'hidden';
        if (op === 'approve' && store.items[idx].expiresAt <= now) store.items[idx].expiresAt = now + LISTING_TTL_MS;
      }
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
    if (op === 'settings') {
      store.settings.requireApproval = body.requireApproval !== false;
      return {};
    }
    if (op === 'approveAll') {
      store.items.forEach((it) => { if (it.status === 'pending') it.status = 'live'; });
      return {};
    }
    return { error: 'unknown op', status: 400 };
  }, (check) => {
    if (op === 'delete') return !check.items.some((it) => it.id === id);
    if (op === 'approve') return check.items.every((it) => it.id !== id || it.status === 'live');
    if (op === 'hide') return check.items.every((it) => it.id !== id || it.status === 'hidden');
    if (op === 'ban') return check.banned.includes(userId);
    if (op === 'unban') return !check.banned.includes(userId);
    if (op === 'settings') return check.settings.requireApproval === (body.requireApproval !== false);
    if (op === 'approveAll') return !check.items.some((it) => it.status === 'pending');
    return true;
  });
  if (outcome.error) return res.status(outcome.status || 400).json({ success: false, error: outcome.error });
  const s = outcome.store;
  return res.status(200).json({ success: true, items: s.items.map((it) => adminItem(it, now)), banned: s.banned, requireApproval: s.settings.requireApproval });
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
        return res.status(200).json({ success: true, items: store.items.map((it) => adminItem(it, now)), banned: store.banned, requireApproval: store.settings.requireApproval });
      }
      const store = await readStore();
      const items = store.items.filter((it) => isLive(it, now) && !store.banned.includes(it.userId)).map(publicItem);
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
      return res.status(200).json({ success: true, items });
    }

    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const body = parseBody(req);
    if (!body || typeof body !== 'object') return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    const action = body.action;

    if (action === 'register') return await register(body, res);
    if (action === 'login') return await login(body, res);
    if (action === 'admin') {
      if (!(await requireAdmin(req, res))) return;
      return await adminAction(body, res);
    }
    if (action === 'mine' || action === 'create' || action === 'update') {
      const me = readToken(body.token);
      if (!me) return res.status(401).json({ success: false, code: 'LOGIN_REQUIRED', error: 'আবার লগইন করুন' });
      return await sellerAction(action, body, me, res);
    }
    return res.status(400).json({ success: false, error: 'unknown action' });
  } catch (err) {
    console.error('market error', err);
    return res.status(500).json({ success: false, error: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন' });
  }
}
