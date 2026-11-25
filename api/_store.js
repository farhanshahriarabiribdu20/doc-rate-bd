// Storage for every small JSON document of the site (rates, settings, listings, feedback, history, meter ...).
//
//   STORE=supabase + SUPABASE_URL + SUPABASE_SERVICE_KEY  -> table `docs(key, data jsonb, updated_at)` in Supabase
//   anything else                                          -> Vercel Blob (the old behaviour, nothing changes)
//
// Pictures are NOT handled here: they stay in Vercel Blob (market/gallery code calls @vercel/blob directly).
// The Supabase calls are plain REST fetches (no SDK), always with the service key, so the table can stay closed to the
// public (row level security on, no policies). See `supabase/setup.sql`.

import { put, get, list, del } from '@vercel/blob';
import { randomBytes } from 'node:crypto';

const env = (k) => String(process.env[k] || '').trim();
export const isSupabase = () => env('STORE') === 'supabase' && !!env('SUPABASE_URL') && !!env('SUPABASE_SERVICE_KEY');
export const supabaseReady = () => !!env('SUPABASE_URL') && !!env('SUPABASE_SERVICE_KEY'); // keys present (the STORE switch may still be off)
export const storeName = () => (isSupabase() ? 'supabase' : 'blob');

const TIMEOUT_MS = 8000;

async function rest(method, query, body, extra = {}) {
  const base = env('SUPABASE_URL').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_KEY');
  const res = await fetch(`${base}/rest/v1/docs${query}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Supabase ${method} ${res.status}: ${text.slice(0, 160)}`);
    err.name = 'SupabaseError';
    throw err;
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

const enc = encodeURIComponent;
// a LIKE pattern for "starts with prefix" (PostgREST uses * as the wildcard)
const likePrefix = (p) => enc(`${String(p).replace(/[*%_]/g, '')}*`);

/** The JSON document at `path`, or null when it does not exist. THROWS when the store cannot be read (never "null" for an error). */
export async function getDoc(path) {
  if (isSupabase()) {
    const rows = await rest('GET', `?key=eq.${enc(path)}&select=data`);
    return Array.isArray(rows) && rows[0] ? rows[0].data : null;
  }
  try {
    const r = await get(path, { access: 'public', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch (err) {
    if (err && err.name === 'BlobNotFoundError') return null;
    throw err;
  }
}

/** Saves `data` (overwrites). With `suffix:true` the stored path gets a random tail (unguessable / unique); returns the path used. */
export async function putDoc(path, data, { suffix = false } = {}) {
  if (isSupabase()) {
    const key = suffix ? path.replace(/(\.json)?$/, `-${randomBytes(3).toString('hex')}$1`) : path;
    await rest('POST', '?on_conflict=key', { key, data, updated_at: new Date().toISOString() }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
    return key;
  }
  const blob = await put(path, JSON.stringify(data), {
    access: 'public', addRandomSuffix: suffix, allowOverwrite: !suffix, contentType: 'application/json', cacheControlMaxAge: 60
  });
  return blob.pathname;
}

/** All documents whose path starts with `prefix`: [{ path, updatedAt, url? }] (newest first). */
export async function listDocs(prefix) {
  if (isSupabase()) {
    const out = [];
    for (let from = 0; from < 20000; from += 1000) {
      const rows = await rest('GET', `?key=like.${likePrefix(prefix)}&select=key,updated_at&order=updated_at.desc&limit=1000&offset=${from}`);
      if (!Array.isArray(rows)) break;
      out.push(...rows.map((r) => ({ path: r.key, updatedAt: r.updated_at })));
      if (rows.length < 1000) break;
    }
    return out;
  }
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    out.push(...page.blobs.map((b) => ({ path: b.pathname, updatedAt: new Date(b.uploadedAt).toISOString(), url: b.url })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && out.length < 20000);
  return out.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

/** Deletes documents. Accepts items from listDocs() (needed for Blob, which deletes by url) or plain paths. */
export async function delDocs(items) {
  const arr = (Array.isArray(items) ? items : [items]).filter(Boolean);
  if (!arr.length) return;
  if (isSupabase()) {
    const keys = arr.map((i) => (typeof i === 'string' ? i : i.path));
    for (let i = 0; i < keys.length; i += 50) {
      const inList = keys.slice(i, i + 50).map((k) => `"${k.replace(/"/g, '')}"`).join(',');
      await rest('DELETE', `?key=in.(${enc(inList)})`, undefined, { Prefer: 'return=minimal' });
    }
    return;
  }
  const urls = arr.map((i) => (typeof i === 'string' ? i : i.url)).filter(Boolean);
  for (let i = 0; i < urls.length; i += 100) await del(urls.slice(i, i + 100));
}

/** The documents under `prefix` with their content: [{ path, updatedAt, data }] (newest first, at most `limit`). Paged queries on Supabase. */
export async function readDocs(prefix, limit = 500) {
  if (isSupabase()) {
    const out = [];
    for (let from = 0; from < limit; from += 1000) {
      const n = Math.min(1000, limit - from);
      const rows = await rest('GET', `?key=like.${likePrefix(prefix)}&select=key,data,updated_at&order=updated_at.desc&limit=${n}&offset=${from}`);
      if (!Array.isArray(rows)) break;
      out.push(...rows.map((r) => ({ path: r.key, updatedAt: r.updated_at, data: r.data })));
      if (rows.length < n) break;
    }
    return out;
  }
  const items = (await listDocs(prefix)).slice(0, limit);
  const settled = await Promise.allSettled(items.map(async (i) => ({ ...i, data: await getDoc(i.path) })));
  return settled.filter((s) => s.status === 'fulfilled' && s.value.data).map((s) => s.value);
}

// Paths that are not site data: the undo history, daily backups and the write meter are rebuilt on their own.
const EXCLUDED = /^(history|backups|meta)\//;

/** Every data document of the current store as { path: data } (for the admin's "download everything" button). */
export async function exportAll() {
  const docs = (await readDocs('', 5000)).filter((d) => /\.json$/.test(d.path) && !EXCLUDED.test(d.path) && d.data);
  const out = {};
  docs.forEach((d) => { out[d.path] = d.data; });
  return out;
}

// Marketplace list: when both stores have one, keep every ad / ban / verification / rating from both (newer copy of an ad wins).
export function mergeListings(blob, sb) {
  const byId = new Map();
  [...(blob.items || []), ...(sb.items || [])].forEach((it) => {
    if (!it || !it.id) return;
    const old = byId.get(it.id);
    if (!old || Number(it.updatedAt || it.createdAt || 0) >= Number(old.updatedAt || old.createdAt || 0)) byId.set(it.id, it);
  });
  const uniq = (a, b) => [...new Set([...(a || []), ...(b || [])])];
  return { ...blob, ...sb, items: [...byId.values()], banned: uniq(blob.banned, sb.banned), verified: uniq(blob.verified, sb.verified), ratings: { ...(blob.ratings || {}), ...(sb.ratings || {}) }, v: Date.now() };
}
const MERGE_ONLY = 'market/listings.json';

/**
 * Copies the JSON documents of the Vercel Blob store into Supabase (needs the Supabase keys, not the STORE switch).
 * NEVER overwrites a document Supabase already has (it may hold newer rates): only missing ones are added,
 * except the marketplace list, which is merged. Safe to repeat.
 */
export async function migrateFromBlob() {
  if (!supabaseReady()) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY are not set');
  const items = [];
  let cursor;
  do {
    const page = await list({ limit: 1000, cursor });
    items.push(...page.blobs.filter((b) => /\.json$/.test(b.pathname) && !EXCLUDED.test(b.pathname)));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && items.length < 20000);
  let copied = 0;
  const failed = [];
  const keptNewer = [];
  for (let i = 0; i < items.length; i += 20) {
    const rows = [];
    await Promise.all(items.slice(i, i + 20).map(async (b) => {
      try {
        const r = await get(b.pathname, { access: 'public', useCache: false });
        if (!r || r.statusCode !== 200) throw new Error('unreadable');
        rows.push({ key: b.pathname, data: JSON.parse(await new Response(r.stream).text()), updated_at: new Date(b.uploadedAt).toISOString() });
      } catch { failed.push(b.pathname); }
    }));
    for (const row of rows) {
      const existing = await rest('GET', `?key=eq.${enc(row.key)}&select=data`);
      const there = Array.isArray(existing) && existing[0] ? existing[0].data : null;
      if (there && row.key === MERGE_ONLY) {
        await rest('POST', '?on_conflict=key', [{ key: row.key, data: mergeListings(row.data, there), updated_at: new Date().toISOString() }], { Prefer: 'resolution=merge-duplicates,return=minimal' });
        copied += 1;
      } else if (there) {
        keptNewer.push(row.key);
      } else {
        await rest('POST', '?on_conflict=key', [row], { Prefer: 'resolution=ignore-duplicates,return=minimal' });
        copied += 1;
      }
    }
  }
  return { found: items.length, copied, keptNewer, failed };
}

/** A quick health check for the admin card: can we read the main document from the active store? */
export async function storeStatus() {
  const out = { store: storeName(), supabaseKeys: supabaseReady(), switchOn: env('STORE') === 'supabase' };
  try { out.siteData = !!(await getDoc('site-data.json')); out.readOk = true; } catch (err) { out.readOk = false; out.error = String(err?.message || err).slice(0, 160); }
  return out;
}
