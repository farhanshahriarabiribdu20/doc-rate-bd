import React, { useEffect, useMemo, useState } from 'react';
import { fetchReadyTrend } from '../services/api';
import { formatBn, formatEn, toBnDigits } from '../utils/date';

const WINDOW = 7;          // days compared
const SAME_PCT = 0.01;     // change under 1% counts as "about the same"
const W = 640, H = 210, PL = 44, PR = 14, PT = 14, PB = 28;

const AVG = (d, keys) => {
  const v = keys.map((k) => d?.[k]).filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

const ROWS = [
  { id: 'g', bn: 'ব্রয়লার — ছোট (১.৩–১.৪ কেজি)', en: 'Broiler small (1.3–1.4 kg)', unitBn: 'কেজি', unitEn: 'kg', get: (d) => d.broilerGrill },
  { id: 'm', bn: 'ব্রয়লার — মাঝারি (১.৫–১.৭ কেজি)', en: 'Broiler medium (1.5–1.7 kg)', unitBn: 'কেজি', unitEn: 'kg', get: (d) => d.broilerMedium },
  { id: 'b', bn: 'ব্রয়লার — বড় (১.৮+ কেজি)', en: 'Broiler big (1.8+ kg)', unitBn: 'কেজি', unitEn: 'kg', get: (d) => d.broilerBig },
  { id: 'c', bn: 'কালার বার্ড', en: 'Colour bird', unitBn: 'কেজি', unitEn: 'kg', get: (d) => d.colorBird },
  { id: 's', bn: 'সোনালী মুরগি', en: 'Sonali', unitBn: 'কেজি', unitEn: 'kg', get: (d) => d.sonali },
  { id: 'eb', bn: 'ডিম — বাদামী', en: 'Egg — brown', unitBn: 'পিস', unitEn: 'pc', get: (d) => d.eggBrown, egg: true },
  { id: 'ew', bn: 'ডিম — সাদা', en: 'Egg — white', unitBn: 'পিস', unitEn: 'pc', get: (d) => d.eggWhite, egg: true },
  { id: 'p', bn: 'পুরনো মুরগি (PS-Cull)', en: 'Old hen (PS-Cull)', unitBn: 'কেজি', unitEn: 'kg', get: (d) => d.psCull },
];

const short = (iso, bn) => (bn ? formatBn(iso) : formatEn(iso)).split('(')[0].replace(/,?\s*(\d{4}|[০-৯]{4})\s*$/, '').replace(/^[A-Za-z]+,\s*/, '').trim();

function LineChart({ title, series, dates, bn }) {
  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  if (all.length < 2) return null;
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = Math.max((hi - lo) * 0.25, hi > 50 ? 1 : 0.05);
  const yMin = lo - pad, yMax = hi + pad;
  const x = (i) => PL + (dates.length === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (dates.length - 1));
  const y = (v) => PT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PT - PB);
  const fmt = (v) => (hi > 50 ? Math.round(v) : v.toFixed(1));
  const ticks = [yMin + pad * 0.4, (yMin + yMax) / 2, yMax - pad * 0.4];
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4">
      <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 mb-2">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={PL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#64748b">{fmt(t)}</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            <path d={s.values.map((v, i) => (v == null ? '' : `${i && s.values[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => v != null && (
              <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2.5"><title>{`${s.name} · ${short(dates[i], bn)} · ৳${v.toFixed(2)}`}</title></circle>
            ))}
          </g>
        ))}
        {dates.map((d, i) => (
          <text key={d} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'} fontSize="10.5" fontWeight="700" fill="#64748b">
            {i === 0 || i === dates.length - 1 || i % 2 === 0 ? short(d, bn) : ''}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <i className="w-3 h-1 rounded-full" style={{ background: s.color }} />{s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Trend chart analysis" of the ready market: last 7 days vs today, with three line charts. First thing on the ready tab. */
export default function ReadyTrendAnalysis({ lang, liveRates, liveDate }) {
  const bn = lang === 'bn';
  const [fetched, setFetched] = useState(undefined);
  useEffect(() => { let on = true; fetchReadyTrend().then((t) => on && setFetched(t)); return () => { on = false; }; }, []);

  const days = useMemo(() => {
    if (!fetched) return null;
    const out = { ...fetched.days };
    // Today is archived only once it is over, so today's point comes from the live rates (unless the sheet already has it).
    if (/^\d{4}-\d{2}-\d{2}$/.test(liveDate || '') && !out[liveDate] && Array.isArray(liveRates)) {
      const day = {};
      for (const f of ['broilerGrill', 'broilerMedium', 'broilerBig', 'colorBird', 'sonali', 'eggBrown', 'eggWhite', 'psCull']) {
        const v = liveRates.map((r) => Number(r?.[f])).filter((n) => Number.isFinite(n) && n > 0);
        if (v.length) day[f] = v.reduce((a, b) => a + b, 0) / v.length;
      }
      if (Object.keys(day).length) out[liveDate] = day;
    }
    return out;
  }, [fetched, liveRates, liveDate]);

  const dates = useMemo(() => (days ? Object.keys(days).sort().slice(-WINDOW) : []), [days]);
  if (!days || dates.length < 2) return null;

  const first = days[dates[0]], last = days[dates[dates.length - 1]];
  const num = (v, d = 1) => (bn ? toBnDigits(v.toFixed(d)) : v.toFixed(d));
  const series = (name, color, get) => ({ name, color, values: dates.map((d) => { const v = get(days[d]); return Number.isFinite(v) ? v : null; }) });
  const t = (b, e) => (bn ? b : e);

  return (
    <section id="ready-trend" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-700 shadow-xs p-4 sm:p-6 scroll-mt-40" aria-label={t('ট্রেন্ড চার্ট বিশ্লেষণ', 'Trend chart analysis')}>
      <h2 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">🐔 {t('আজকের বাজারদর — ব্রয়লার, কালার বার্ড, সোনালী ও ডিম', "Today's market — broiler, colour bird, sonali & egg")}</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
        {t('তারিখ', 'Date')}: {short(dates[dates.length - 1], bn)} · {t('তুলনা', 'compared with')}: {short(dates[0], bn)} {t('থেকে আজ পর্যন্ত', 'to today')} ({t(`${toBnDigits(dates.length)} দিন`, `${dates.length} days`)})
      </p>

      <div className="mt-4 overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm min-w-[30rem]">
          <thead>
            <tr className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left font-bold py-2 pr-2">{t('পণ্য', 'Product')}</th>
              <th className="text-right font-bold py-2 px-2">{t(`${toBnDigits(dates.length)} দিন আগে`, `${dates.length}d ago`)}</th>
              <th className="text-right font-bold py-2 px-2">{t('আজকের গড়', "Today's avg")}</th>
              <th className="text-right font-bold py-2 px-2">{t('পরিবর্তন', 'Change')}</th>
              <th className="text-right font-bold py-2 pl-2">{t('অবস্থা', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const a = r.get(first), b = r.get(last);
              if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
              const diff = b - a;
              const same = Math.abs(diff) / a < SAME_PCT;
              const tone = same ? 'text-slate-500' : diff > 0 ? 'text-emerald-600' : 'text-rose-600';
              const dp = r.egg ? 2 : 1;
              return (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="py-2.5 pr-2 font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{t(r.bn, r.en)} <span className="text-[10px] text-slate-400 font-semibold">/{t(r.unitBn, r.unitEn)}</span></td>
                  <td className="py-2.5 px-2 text-right font-semibold text-slate-600 dark:text-slate-300 tabular-nums">৳{num(a, dp)}</td>
                  <td className="py-2.5 px-2 text-right font-black text-slate-900 dark:text-white tabular-nums">৳{num(b, dp)}</td>
                  <td className={`py-2.5 px-2 text-right font-black tabular-nums ${tone}`}>{diff > 0 ? '+' : diff < 0 ? '−' : ''}৳{num(Math.abs(diff), dp)}</td>
                  <td className={`py-2.5 pl-2 text-right font-black whitespace-nowrap text-xs ${tone}`}>{same ? t('― প্রায় একই', '― About same') : diff > 0 ? t('▲ বেড়েছে', '▲ Up') : t('▼ কমেছে', '▼ Down')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">{t('* ডিমের দর প্রতি পিসের, বাকি সব প্রতি কেজির। সব জেলার অফিসারদের দেওয়া রেটের গড়।', '* Eggs are per piece, the rest per kg. Averages of all district officers\' rates.')}</p>

      <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-2">
        <LineChart bn={bn} dates={dates} title={t('ব্রয়লার মুরগির গড় দর (টাকা/কেজি) — গত ৭ দিন', 'Broiler average price (TK/kg) — last 7 days')}
          series={[series(t('ছোট', 'Small'), '#c00000', (d) => d.broilerGrill), series(t('মাঝারি', 'Medium'), '#ed7d31', (d) => d.broilerMedium), series(t('বড়', 'Big'), '#2e75b6', (d) => d.broilerBig)]} />
        <LineChart bn={bn} dates={dates} title={t('কালার বার্ড ও সোনালীর দর — গত ৭ দিন (টাকা/কেজি)', 'Colour bird & sonali — last 7 days (TK/kg)')}
          series={[series(t('কালার বার্ড', 'Colour bird'), '#548235', (d) => d.colorBird), series(t('সোনালী', 'Sonali'), '#7030a0', (d) => d.sonali), series('PS-Cull', '#7f7f7f', (d) => d.psCull)]} />
        <LineChart bn={bn} dates={dates} title={t('ডিমের দর — গত ৭ দিন (টাকা/পিস)', 'Egg price — last 7 days (TK/pc)')}
          series={[series(t('বাদামী', 'Brown'), '#843c0b', (d) => d.eggBrown), series(t('সাদা', 'White'), '#2e75b6', (d) => d.eggWhite)]} />
      </div>
    </section>
  );
}
