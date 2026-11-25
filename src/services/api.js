// Client for the serverless API (Vercel). All admin calls send the admin password
// in the `x-admin-key` header; the password itself is checked on the server only.

const json = async (res) => {
  try { return await res.json(); } catch { return null; }
};

const adminHeaders = (key) => ({ 'Content-Type': 'application/json', 'x-admin-key': key });

/** Latest published site data (rates, notice, public settings) or null. */
export async function fetchSiteData() {
  try {
    const res = await fetch('/api/site-data');
    if (!res.ok) return null;
    const body = await json(res);
    return body && body.success ? body.data : null;
  } catch {
    return null;
  }
}

/** { ok, configured, reason } — reason: 'wrong' | 'not_configured' | 'network' */
export async function adminLogin(key) {
  try {
    const res = await fetch('/api/admin-login', { method: 'POST', headers: adminHeaders(key) });
    if (res.ok) return { ok: true, configured: true };
    const body = await json(res);
    if (res.status === 503 || body?.code === 'ADMIN_NOT_CONFIGURED') return { ok: false, configured: false, reason: 'not_configured' };
    if (res.status === 401) return { ok: false, configured: true, reason: 'wrong' };
    return { ok: false, reason: 'network' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Publish data for all visitors. Returns { ok, updatedAt, error }. */
export async function publishSiteData(key, payload) {
  try {
    const res = await fetch('/api/site-data', { method: 'PUT', headers: adminHeaders(key), body: JSON.stringify(payload) });
    const body = await json(res);
    if (res.ok && body?.success) return { ok: true, updatedAt: body.updatedAt };
    return { ok: false, status: res.status, error: body?.error || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message || 'network' };
  }
}

/** Admin: earlier published versions (for undo), newest first, or null on failure. */
export async function fetchHistory(key) {
  try {
    const res = await fetch('/api/site-history', { headers: adminHeaders(key) });
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.versions) ? body.versions : null;
  } catch { return null; }
}

/** Admin: full data of one earlier version, or null. */
export async function fetchHistoryVersion(key, id) {
  try {
    const res = await fetch(`/api/site-history?id=${encodeURIComponent(id)}`, { headers: adminHeaders(key) });
    const body = await json(res);
    return res.ok && body?.success ? body.data : null;
  } catch { return null; }
}

/** Admin: daily backups [{ id, day, uploadedAt, size }], newest first, or null. */
export async function fetchBackups(key) {
  try {
    const res = await fetch('/api/site-history?backups=1', { headers: adminHeaders(key) });
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.backups) ? body.backups : null;
  } catch { return null; }
}

/** Admin: full content of one backup ({ site, market, gallery, createdAt }) or null. */
export async function fetchBackup(key, id) {
  try {
    const res = await fetch(`/api/site-history?backup=${encodeURIComponent(id)}`, { headers: adminHeaders(key) });
    const body = await json(res);
    return res.ok && body?.success ? body.data : null;
  } catch { return null; }
}

/** Admin: take a backup right now. Returns true on success. */
export async function runBackupNow(key) {
  try {
    const res = await fetch('/api/site-history?run=1', { method: 'POST', headers: adminHeaders(key) });
    const body = await json(res);
    return res.ok && body?.success === true && !!body.created;
  } catch { return false; }
}

/** Public: submit visitor feedback. Returns { ok }. */
export async function submitFeedback(data) {
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** Admin: all feedbacks, or null on failure. */
export async function fetchFeedbacks(key) {
  try {
    const res = await fetch('/api/feedback', { headers: adminHeaders(key) });
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.feedbacks) ? body.feedbacks : null;
  } catch {
    return null;
  }
}

export async function deleteFeedback(key, id) {
  try {
    const res = await fetch('/api/feedback', { method: 'DELETE', headers: adminHeaders(key), body: JSON.stringify({ id }) });
    return res.ok;
  } catch { return false; }
}

export async function clearAllFeedbacks(key) {
  try {
    const res = await fetch('/api/feedback', { method: 'DELETE', headers: adminHeaders(key), body: JSON.stringify({ all: true }) });
    return res.ok;
  } catch { return false; }
}

/** Dates that have archived rates, newest first ([] on failure). */
export async function fetchRateDates(kind = 'doc') {
  try {
    const res = await fetch(`/api/rate-days${kind === 'ready' ? '?kind=ready' : ''}`);
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.dates) ? body.dates : [];
  } catch { return []; }
}

/** Rates of `date` or of the latest earlier day that has rates: { date, requested, exact, rates } or null. */
export async function fetchRateDay(date, kind = 'doc') {
  try {
    const res = await fetch(`/api/rate-days?date=${encodeURIComponent(date)}${kind === 'ready' ? '&kind=ready' : ''}`);
    const body = await json(res);
    return res.ok && body?.success ? body : null;
  } catch { return null; }
}

/** Admin: save the archive of several days ([{ date, rates }]) in small batches. Returns { ok, saved }. */
export async function saveRateDays(key, days, kind = 'doc') {
  let saved = 0;
  try {
    for (let i = 0; i < days.length; i += 8) {
      const res = await fetch('/api/rate-days', { method: 'PUT', headers: adminHeaders(key), body: JSON.stringify({ kind, days: days.slice(i, i + 8) }) });
      const body = await json(res);
      if (!res.ok || !body?.success) return { ok: false, saved };
      saved += body.saved || 0;
    }
    return { ok: true, saved };
  } catch { return { ok: false, saved }; }
}

/** Public: a visitor sends a rate; it goes live at once, tagged as given by a user. Returns { ok, error }. */
export async function submitRate(data) {
  try {
    const res = await fetch('/api/rate-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const body = await json(res);
    return { ok: res.ok, error: body?.error || '' };
  } catch {
    return { ok: false, error: '' };
  }
}

/** Public: today's rates given by visitors ({ doc: [...], ready: [...] }), or null. */
export async function fetchLiveUserRates() {
  try {
    const res = await fetch('/api/rate-submissions?live=1');
    const body = await json(res);
    return res.ok && body?.success ? { doc: body.doc || [], ready: body.ready || [] } : null;
  } catch { return null; }
}

/** Admin: the visitor rates sent so far, or null on failure. */
export async function fetchRateSubmissions(key) {
  try {
    const res = await fetch('/api/rate-submissions', { headers: adminHeaders(key) });
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.submissions) ? body.submissions : null;
  } catch { return null; }
}

/** Admin: delete visitor rates (wrong or spam). */
export async function deleteRateSubmissions(key, ids) {
  try {
    const res = await fetch('/api/rate-submissions', { method: 'DELETE', headers: adminHeaders(key), body: JSON.stringify({ ids }) });
    return res.ok;
  } catch { return false; }
}

/** Heartbeat for the "online now" counter. Returns { enabled, count } (enabled=false when the server has no store for it). */
export async function pingLiveVisitors(sid) {
  try {
    const res = await fetch('/api/live-visitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid })
    });
    const body = await json(res);
    return res.ok && body?.success ? { enabled: !!body.enabled, count: Number(body.count) || 0 } : { enabled: false, count: 0 };
  } catch {
    return { enabled: false, count: 0 };
  }
}

// ---------- rate pictures (gallery) ----------
/** Admin: the list with its version number ({ images, v }) or null. */
export async function fetchGalleryFull() {
  try {
    const res = await fetch(`/api/gallery?t=${Date.now()}`, { cache: 'no-store' });
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.images) ? { images: body.images, v: Number(body.v) || 0 } : null;
  } catch { return null; }
}

/** Public: the uploaded rate pictures, newest first, or null on failure. */
export async function fetchGallery() {
  try {
    const res = await fetch('/api/gallery', { cache: 'no-cache' });
    const body = await json(res);
    return res.ok && body?.success && Array.isArray(body.images) ? body.images : null;
  } catch { return null; }
}

/** Admin: add / update / delete a picture. Returns { ok, images, error }. */
export async function galleryAdmin(key, payload) {
  try {
    const res = await fetch('/api/gallery', { method: 'POST', headers: adminHeaders(key), body: JSON.stringify(payload) });
    const body = await json(res);
    return { ok: res.ok && body?.success === true, images: body?.images || null, v: Number(body?.v) || 0, error: body?.error || '' };
  } catch {
    return { ok: false, images: null, error: 'ইন্টারনেট সংযোগ চেক করুন' };
  }
}

/** Rolling daily-rate history for the trend chart: { days, names } or null. */
export async function fetchRateTrend() {
  try {
    const res = await fetch('/api/rate-trend');
    const body = await json(res);
    return res.ok && body?.success ? { days: body.days || {}, names: body.names || {} } : null;
  } catch { return null; }
}

/** Admin: post a message to the Telegram channel. Returns { ok, notConfigured, error }. */
export async function sendTelegram(key, text) {
  try {
    const res = await fetch('/api/telegram', { method: 'POST', headers: adminHeaders(key), body: JSON.stringify({ text }) });
    const body = await json(res);
    if (res.ok && body?.success) return { ok: true };
    return { ok: false, notConfigured: body?.error === 'not_configured', error: body?.error || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.message || 'network' };
  }
}

/** Admin: usage statistics { mode: 'redis'|'blob', today, days: { 'YYYY-MM-DD': { event: count } } } or null. */
export async function fetchStats(key) {
  try {
    const res = await fetch('/api/live-visitors?stats=1', { headers: { 'x-admin-key': key }, cache: 'no-store' });
    const body = await json(res);
    return res.ok && body?.success ? body : null;
  } catch { return null; }
}
