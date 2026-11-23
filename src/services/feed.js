const adminHeaders = (key) => ({ 'Content-Type': 'application/json', 'x-admin-key': key });

export async function fetchFeeds() {
  try {
    const res = await fetch('/api/gallery?feed=1');
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.feeds) ? json.feeds : [];
  } catch { return []; }
}

export async function saveFeeds(key, feeds) {
  try {
    const res = await fetch('/api/gallery?feed=1', { method: 'POST', headers: adminHeaders(key), body: JSON.stringify({ feeds }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return { ok: false, error: json.error || 'সেভ হয়নি' };
    return { ok: true, feeds: json.feeds };
  } catch { return { ok: false, error: 'নেটওয়ার্ক সমস্যা' }; }
}
