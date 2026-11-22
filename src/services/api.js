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
