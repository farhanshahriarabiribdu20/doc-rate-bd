export async function fetchVotes(date) {
  try {
    const res = await fetch(`/api/feedback?votes=1&d=${encodeURIComponent(date || '')}`);
    if (!res.ok) return {};
    const json = await res.json();
    return json && json.c && typeof json.c === 'object' ? json.c : {};
  } catch { return {}; }
}

export async function sendVote(date, key, v) {
  try {
    const res = await fetch('/api/feedback?votes=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ d: date, key, v }) });
    return res.ok;
  } catch { return false; }
}
