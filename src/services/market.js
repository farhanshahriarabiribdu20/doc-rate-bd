// Client for the seller marketplace API (/api/market).

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

// ---------- this browser's own ads (no account) ----------
// Each posted ad gets a private edit key from the server; it is kept here so the poster can later mark
// the ad sold / renew / delete it. The name and phone are remembered to prefill the next ad.
const ADS_KEY = 'fn_my_ads';
const PROFILE_KEY = 'fn_seller_profile';

export const getMyAds = () => {
  try {
    const list = JSON.parse(localStorage.getItem(ADS_KEY) || '[]');
    return Array.isArray(list) ? list.filter((x) => x && x.id && x.key).slice(0, 20) : [];
  } catch { return []; }
};

const setMyAds = (list) => { try { localStorage.setItem(ADS_KEY, JSON.stringify(list.slice(0, 20))); } catch { /* private mode */ } };
export const addMyAd = (id, key) => setMyAds([{ id, key }, ...getMyAds().filter((x) => x.id !== id)]);
export const removeMyAd = (id) => setMyAds(getMyAds().filter((x) => x.id !== id));

export const getProfile = () => {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {}; } catch { return {}; }
};
export const saveProfile = (data) => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); } catch { /* ignore */ } };

// ---------- public ----------
/** Live listings, or null on failure. */
export async function fetchListings() {
  try {
    const res = await fetch('/api/market', { cache: 'no-cache' }); // revalidate; the CDN answers cheaply
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.items) ? body.items : null;
  } catch { return null; }
}

/** Buyer rates the seller of a listing (1-5). One vote per person is enforced on the server. */
export const rateSeller = (id, stars) => post({ action: 'rate', id, stars });

// ---------- posting (public, no login) ----------
export const postListing = (data) => post({ action: 'post', ...data });
/** Status of this browser's ads. */
export const fetchMine = (refs) => post({ action: 'mine', refs });
export const updateListing = (id, key, op) => post({ action: 'update', id, key, op });

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
/** Product info for a listing; a custom name typed under "অন্যান্য" replaces the label. */
export const prodOf = (it) => {
  const base = PRODUCT_BN[it.product] || PRODUCT_BN.other;
  return it.customName ? { ...base, bn: it.customName } : base;
};

export const UNIT_OPTIONS = [
  { key: 'kg', bn: 'কেজি', per: 'প্রতি কেজি' },
  { key: 'pcs', bn: 'পিস', per: 'প্রতি পিস' },
  { key: 'hali', bn: 'হালি', per: 'প্রতি হালি' },
  { key: 'dozen', bn: 'ডজন', per: 'প্রতি ডজন' }
];

export const UNIT_BN = Object.fromEntries(UNIT_OPTIONS.map((u) => [u.key, u]));
