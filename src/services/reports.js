export async function fetchReports() {
  try {
    const res = await fetch('/api/feedback?reports=1');
    if (!res.ok) return {};
    const json = await res.json();
    return json && json.d && typeof json.d === 'object' ? json.d : {};
  } catch { return {}; }
}

export async function sendReport(data) {
  try {
    const res = await fetch('/api/feedback?reports=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    let body = null;
    try { body = await res.json(); } catch { /* ignore */ }
    return { ok: res.ok, error: body?.error || '' };
  } catch { return { ok: false, error: '' }; }
}
