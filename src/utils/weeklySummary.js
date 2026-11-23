// Weekly DOC market summary, computed from the rolling trend ({ days: {date: {key: rate}}, names: {key: {company, breed}} }).
// Pure functions: used by the site (card) and by the weekly Telegram cron.

const BN = '০১২৩৪৫৬৭৮৯';
export const toBn = (n) => String(n).replace(/\d/g, (d) => BN[d]);

const dayMs = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** Compare the newest day with the day ~7 days earlier (closest date at least 5 days back). */
export function weeklySummary(trend, topN = 3) {
  const dates = Object.keys(trend?.days || {}).sort();
  if (dates.length < 2) return null;
  const to = dates[dates.length - 1];
  const target = dayMs(to) - 7 * 86400000;
  const older = dates.filter((d) => dayMs(to) - dayMs(d) >= 5 * 86400000);
  if (!older.length) return null;
  const from = older.reduce((best, d) => (Math.abs(dayMs(d) - target) < Math.abs(dayMs(best) - target) ? d : best), older[0]);

  const a = trend.days[from], b = trend.days[to];
  const rows = [];
  for (const k of Object.keys(b)) {
    if (a[k] == null || !trend.names?.[k]) continue;
    rows.push({ key: k, ...trend.names[k], from: a[k], to: b[k], diff: Math.round((b[k] - a[k]) * 100) / 100 });
  }
  if (rows.length < 2) return null;
  const avg = (f) => rows.reduce((s, r) => s + r[f], 0) / rows.length;
  const avgFrom = avg('from'), avgTo = avg('to');
  const label = (r) => `${r.company}${r.breed ? ` (${r.breed})` : ''}`;
  rows.forEach((r) => { r.label = label(r); });
  return {
    from, to, count: rows.length,
    avgFrom: Math.round(avgFrom * 10) / 10, avgTo: Math.round(avgTo * 10) / 10,
    avgDiff: Math.round((avgTo - avgFrom) * 10) / 10,
    up: rows.filter((r) => r.diff > 0).sort((x, y) => y.diff - x.diff).slice(0, topN),
    down: rows.filter((r) => r.diff < 0).sort((x, y) => x.diff - y.diff).slice(0, topN),
    cheapest: rows.reduce((m, r) => (r.to < m.to ? r : m), rows[0]),
    dearest: rows.reduce((m, r) => (r.to > m.to ? r : m), rows[0])
  };
}

const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '');
const fmtDiff = (n) => `${sign(n)}৳${toBn(Math.abs(n))}`;

/** Plain-text Bangla message (Telegram / WhatsApp / copy). */
export function weeklyText(s, siteUrl = 'https://fosholnexa.com') {
  if (!s) return '';
  const lines = [
    `📊 সাপ্তাহিক DOC বাজার সারসংক্ষেপ`,
    `${toBn(s.from)} → ${toBn(s.to)} (${toBn(s.count)}টি ফার্ম)`,
    '',
    `গড় রেট: ৳${toBn(s.avgFrom)} → ৳${toBn(s.avgTo)} (${s.avgDiff === 0 ? 'অপরিবর্তিত' : fmtDiff(s.avgDiff)})`
  ];
  if (s.up.length) { lines.push('', '📈 বেশি বেড়েছে:'); s.up.forEach((r) => lines.push(`• ${r.label}: ৳${toBn(r.from)} → ৳${toBn(r.to)} (${fmtDiff(r.diff)})`)); }
  if (s.down.length) { lines.push('', '📉 বেশি কমেছে:'); s.down.forEach((r) => lines.push(`• ${r.label}: ৳${toBn(r.from)} → ৳${toBn(r.to)} (${fmtDiff(r.diff)})`)); }
  lines.push('', `সবচেয়ে কম রেট: ${s.cheapest.label} ৳${toBn(s.cheapest.to)}`, `সবচেয়ে বেশি রেট: ${s.dearest.label} ৳${toBn(s.dearest.to)}`, '', `আজকের রেট: ${siteUrl}`);
  return lines.join('\n');
}
