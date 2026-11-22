// Client for the seller marketplace API (/api/market).

const TOKEN_KEY = 'fn_seller_token';
const USER_KEY = 'fn_seller_user';

const json = async (res) => {
  try { return await res.json(); } catch { return null; }
};

const post = async (payload, headers = {}) => {
  try {
    const res = await fetch('/api/market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload)
    });
    const body = await json(res);
    return { ok: res.ok && body?.success === true, status: res.status, ...(body || {}), error: body?.error || '' };
  } catch {
    return { ok: false, status: 0, error: 'ইন্টারনেট সংযোগ চেক করুন' };
  }
};

// ---------- session (kept in this browser only) ----------
export const getSeller = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return token && user ? { token, user } : null;
  } catch { return null; }
};

export const saveSeller = (token, user) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch { /* private mode */ }
};

export const clearSeller = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
};

// ---------- public ----------
/** Live listings, or null on failure. */
export async function fetchListings() {
  try {
    const res = await fetch('/api/market', { cache: 'no-cache' }); // revalidate; the CDN answers cheaply
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.items) ? body.items : null;
  } catch { return null; }
}

export const registerSeller = (data) => post({ action: 'register', ...data });
export const loginSeller = (userId, password) => post({ action: 'login', userId, password });

// ---------- seller (token) ----------
export const fetchMine = (token) => post({ action: 'mine', token });
export const createListing = (token, data) => post({ action: 'create', token, ...data });
export const updateListing = (token, id, op) => post({ action: 'update', token, id, op });

// ---------- admin ----------
export async function fetchMarketAdmin(key) {
  try {
    const res = await fetch('/api/market?admin=1', { headers: { 'x-admin-key': key } });
    const body = await json(res);
    return res.ok && body?.success ? body : null;
  } catch { return null; }
}

export const marketAdminAction = (key, payload) => post({ action: 'admin', ...payload }, { 'x-admin-key': key });

// ---------- labels shared by the UI ----------
export const PRODUCT_OPTIONS = [
  { key: 'broiler', bn: 'ব্রয়লার মুরগি', emoji: '🍗' },
  { key: 'sonali', bn: 'সোনালী মুরগি', emoji: '🐓' },
  { key: 'color', bn: 'কালার বার্ড', emoji: '🐔' },
  { key: 'layer_hen', bn: 'লেয়ার মুরগি (পুরনো/কাল)', emoji: '🐥' },
  { key: 'egg', bn: 'ডিম', emoji: '🥚' },
  { key: 'duck', bn: 'হাঁস', emoji: '🦆' },
  { key: 'other', bn: 'অন্যান্য', emoji: '📦' }
];

export const PRODUCT_BN = Object.fromEntries(PRODUCT_OPTIONS.map((p) => [p.key, p]));

export const UNIT_OPTIONS = [
  { key: 'kg', bn: 'কেজি', per: 'প্রতি কেজি' },
  { key: 'pcs', bn: 'পিস', per: 'প্রতি পিস' },
  { key: 'hali', bn: 'হালি', per: 'প্রতি হালি' },
  { key: 'dozen', bn: 'ডজন', per: 'প্রতি ডজন' }
];

export const UNIT_BN = Object.fromEntries(UNIT_OPTIONS.map((u) => [u.key, u]));
