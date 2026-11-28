// A visitor's own rate-giving record, kept in this browser only (the site has no login).
const KEY = 'fn_contrib';
const dhaka = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
const dayBefore = (iso) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };

export const BADGES = [
  { min: 1, icon: '🌱', name: 'নতুন রেটদাতা' },
  { min: 5, icon: '🥉', name: 'ব্রোঞ্জ রেটদাতা' },
  { min: 15, icon: '🥈', name: 'সিলভার রেটদাতা' },
  { min: 30, icon: '🥇', name: 'গোল্ড রেটদাতা' },
  { min: 60, icon: '💎', name: 'ডায়মন্ড রেটদাতা' }
];

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };

export function recordRate(who) {
  const s = read();
  const today = dhaka();
  const days = Array.isArray(s.days) ? s.days.filter((d) => d !== today) : [];
  const next = {
    total: (Number(s.total) || 0) + 1,
    days: [...days, today].slice(-60),
    todayCount: s.lastDay === today ? (Number(s.todayCount) || 0) + 1 : 1,
    lastDay: today,
    who: who || s.who || ''
  };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  window.dispatchEvent(new Event('fn-contrib-changed'));
  return getStats();
}

export function getStats() {
  const s = read();
  const total = Number(s.total) || 0;
  const days = new Set(Array.isArray(s.days) ? s.days : []);
  const today = dhaka();
  let streak = 0;
  let cur = days.has(today) ? today : dayBefore(today); // yesterday still keeps the streak alive
  while (days.has(cur)) { streak += 1; cur = dayBefore(cur); }
  const badge = [...BADGES].reverse().find((b) => total >= b.min) || null;
  const nextBadge = BADGES.find((b) => total < b.min) || null;
  const prev = badge ? badge.min : 0;
  const pct = nextBadge ? Math.round(((total - prev) / (nextBadge.min - prev)) * 100) : 100;
  return { total, streak, daysCount: days.size, todayCount: s.lastDay === today ? Number(s.todayCount) || 0 : 0, badge, nextBadge, pct, who: s.who || '' };
}

export const bnNum = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
