import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchRateTrend } from '../services/api';
import { formatBn, formatEn } from '../utils/date';

const RANGES = [7, 14, 30];
const W = 640, H = 220, PL = 40, PR = 16, PT = 16, PB = 30;

const shortDate = (iso, bn) => {
  const f = (bn ? formatBn(iso) : formatEn(iso)).split('(')[0].trim();
  return f.replace(/[,\s]*(\d{4}|[০-৯]{4})$/, '').trim();
};

/** Day-by-day rate history of one company, from the daily archive. */
export default function TrendChart({ lang }) {
  const bn = lang === 'bn';
  const [trend, setTrend] = useState(undefined); // undefined = loading, null = failed
  const [key, setKey] = useState('');
  const [range, setRange] = useState(14);
  const [hover, setHover] = useState(null);

  useEffect(() => { let on = true; fetchRateTrend().then((t) => on && setTrend(t)); return () => { on = false; }; }, []);

  const dates = useMemo(() => (trend ? Object.keys(trend.days).sort() : []), [trend]);
  const options = useMemo(() => {
    if (!trend) return [];
    const last = dates[dates.length - 1];
    return Object.keys(trend.names)
      .filter((k) => trend.days[last]?.[k] != null)
      .map((k) => ({ k, ...trend.names[k] }))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [trend, dates]);

  const selected = key && options.some((o) => o.k === key) ? key : options[0]?.k;

  const points = useMemo(() => {
    if (!trend || !selected) return [];
    return dates.slice(-range).filter((d) => trend.days[d][selected] != null).map((d) => ({ d, v: trend.days[d][selected] }));
  }, [trend, dates, selected, range]);

  if (trend === undefined) return null;
  if (!trend || options.length === 0 || dates.length < 2) return null; // nothing useful to show yet

  const vals = points.map((p) => p.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(1, Math.round((hi - lo) * 0.25));
  const yMin = Math.max(0, lo - pad), yMax = hi + pad;
  const x = (i) => PL + (points.length === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (points.length - 1));
  const y = (v) => PT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PT - PB);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${line} L${x(points.length - 1).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z` : '';
  const first = vals[0], lastV = vals[vals.length - 1];
  const diff = lastV - first;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const tone = diff > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : diff < 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-50 border-slate-200';
  const ticks = [yMin, Math.round((yMin + yMax) / 2), yMax];
  const labelIdx = points.length <= 5 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const cur = hover != null ? points[hover] : null;
  const name = options.find((o) => o.k === selected);

  return (
    <div id="trend-chart" className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-xs scroll-mt-40">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></span>
            {bn ? 'রেটের ওঠানামা (ট্রেন্ড)' : 'Rate Trend'}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">{bn ? 'কোম্পানি বেছে নিন, দিনে দিনে রেট কেমন বদলেছে দেখুন' : 'Pick a company to see how its rate moved day by day'}</p>
        </div>
        <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl gap-1 border border-slate-200/60">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${range === r ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'}`}>
              {bn ? `${r} দিন` : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      <select value={selected} onChange={(e) => { setKey(e.target.value); setHover(null); }} aria-label={bn ? 'কোম্পানি' : 'Company'}
        className="w-full sm:w-auto sm:min-w-[18rem] mb-4 px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
        {options.map((o) => <option key={o.k} value={o.k}>{o.company} — {o.breed}</option>)}
      </select>

      {points.length < 2 ? (
        <p className="text-sm text-slate-500 font-semibold py-10 text-center">{bn ? 'এই কোম্পানির যথেষ্ট দিনের রেট এখনো জমেনি' : 'Not enough days of rates for this company yet'}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-[11px] font-bold text-slate-500">{bn ? 'এখন' : 'Now'}</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">৳{lastV}</p>
            </div>
            <div className={`rounded-2xl border p-3 ${tone}`}>
              <p className="text-[11px] font-bold opacity-80">{bn ? `${points.length} দিনে` : `Over ${points.length} days`}</p>
              <p className="text-xl sm:text-2xl font-black flex items-center gap-1"><Icon className="w-4 h-4" />{diff > 0 ? '+' : ''}{diff}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-[11px] font-bold text-slate-500">{bn ? 'গড় / সর্বনিম্ন–সর্বোচ্চ' : 'Avg / Low–High'}</p>
              <p className="text-sm sm:text-base font-black text-slate-900">৳{avg.toFixed(1)} <span className="text-[11px] text-slate-500 font-bold">({lo}–{hi})</span></p>
            </div>
          </div>

          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${name?.company} ${bn ? 'রেট ট্রেন্ড' : 'rate trend'}`} onMouseLeave={() => setHover(null)}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity="0.22" /><stop offset="100%" stopColor="#059669" stopOpacity="0" /></linearGradient>
              </defs>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <text x={PL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#64748b">{t}</text>
                </g>
              ))}
              {area && <path d={area} fill="url(#trendFill)" />}
              <path d={line} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p, i) => (
                <g key={p.d} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
                  <rect x={x(i) - 14} y={PT} width="28" height={H - PT - PB} fill="transparent" />
                  <circle cx={x(i)} cy={y(p.v)} r={hover === i ? 5.5 : 3.5} fill="#fff" stroke="#059669" strokeWidth="2.5" />
                </g>
              ))}
              {labelIdx.map((i) => (
                <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="11" fontWeight="700" fill="#64748b">{shortDate(points[i].d, bn)}</text>
              ))}
            </svg>
            {cur && (
              <div className="absolute top-0 right-0 bg-slate-900 text-white text-xs font-bold rounded-xl px-3 py-1.5 shadow-lg pointer-events-none">
                {shortDate(cur.d, bn)} · ৳{cur.v}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
