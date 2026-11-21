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
