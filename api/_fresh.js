import { getDoc, putDoc } from './_store.js';
import { count } from './_budget.js';

// Read-modify-write helper for small JSON blobs that get overwritten (gallery list, market listings).
//
// Why: on a PUBLIC Blob store an overwritten file can still be served from the CDN cache for up to
// ~60 seconds (`useCache:false` only works for private stores). Reading that stale copy, changing it and
// writing it back silently undoes the previous change (e.g. a picture vanished after its caption was
// edited). So every write carries a version number `v`, and this function instance remembers the last
// version it wrote; a read returns whichever copy is newer. Callers can also pass the copy the admin's
// browser already has (see gallery.js).
const memo = new Map(); // path -> { v, json }

async function readBlob(path) {
  try {
    return await getDoc(path);
  } catch (err) {
    // A failed read (store blocked, rate limit, network) must NOT look like an empty file: callers would write an
    // empty list back over the real data (e.g. wipe all marketplace ads).
    console.error('store read failed:', path, err);
    throw err;
  }
}

/** Newest known copy of the JSON at `path` (a fresh object every call), or null. */
export async function readFresh(path) {
  const blob = await readBlob(path);
  const m = memo.get(path);
  if (m && (!blob || !(Number(blob.v) >= m.v))) return JSON.parse(m.json);
  return blob;
}

// Which part of the site a blob belongs to, for the admin's write meter.
const kindOfPath = (p) => (/^market\//.test(p) ? 'ad' : /^gallery\//.test(p) ? 'gallery' : /^(trend|rate-days|ready-days)\//.test(p) ? 'archive'
  : p === 'feed-prices.json' ? 'feeds' : /^rate-submissions\//.test(p) ? 'submission' : /vote/.test(p) ? 'votes' : /report/.test(p) ? 'report'
  : /stat|visit/.test(p) ? 'stats' : 'other');

/** Writes `data` with a new version number (always higher than `prevV`) and returns that version. */
export async function writeFresh(path, data, prevV = 0, kind = '') {
  const m = memo.get(path);
  const v = Math.max(Date.now(), Number(prevV) + 1, (m ? m.v : 0) + 1);
  const doc = { ...data, v };
  await putDoc(path, doc);
  memo.set(path, { v, json: JSON.stringify(doc) });
  await count(kind || kindOfPath(path));
  return v;
}
