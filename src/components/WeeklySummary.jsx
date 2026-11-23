import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Copy, Check } from 'lucide-react';
import { fetchRateTrend } from '../services/api';
import { weeklySummary, weeklyText, toBn } from '../utils/weeklySummary';

const Row = ({ r, up }) => (
  <li className="flex items-center justify-between gap-2 text-xs">
    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{r.label}</span>
    <span className={`shrink-0 font-black ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? '+' : '−'}৳{toBn(Math.abs(r.diff))}
    </span>
  </li>
);

/** "This week in the DOC market": biggest movers over the last ~7 days. Hidden until there is enough history. */
export default function WeeklySummary({ lang }) {
  const [trend, setTrend] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { let on = true; fetchRateTrend().then((t) => on && setTrend(t)); return () => { on = false; }; }, []);
  const s = useMemo(() => weeklySummary(trend), [trend]);
  if (!s || lang !== 'bn') return null;

  const copy = async () => {
    try { await navigator.clipboard.writeText(weeklyText(s)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  const avgUp = s.avgDiff > 0;
  return (
    <section className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5" aria-label="সাপ্তাহিক সারসংক্ষেপ">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-900 dark:text-white">📊 এই সপ্তাহের বাজার</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{toBn(s.from)} থেকে {toBn(s.to)} · {toBn(s.count)}টি ফার্ম</p>
        </div>
        <button onClick={copy} className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'কপি হয়েছে' : 'কপি'}
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
        গড় রেট <b>৳{toBn(s.avgFrom)}</b> → <b>৳{toBn(s.avgTo)}</b>{' '}
        <span className={`font-black ${s.avgDiff === 0 ? 'text-slate-500' : avgUp ? 'text-emerald-600' : 'text-red-500'}`}>
          {s.avgDiff === 0 ? '(অপরিবর্তিত)' : `(${avgUp ? '+' : '−'}৳${toBn(Math.abs(s.avgDiff))})`}
        </span>
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {s.up.length > 0 && (
          <div>
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1.5"><TrendingUp className="w-4 h-4" /> বেশি বেড়েছে</p>
            <ul className="space-y-1">{s.up.map((r) => <Row key={r.key} r={r} up />)}</ul>
          </div>
        )}
        {s.down.length > 0 && (
          <div>
            <p className="text-xs font-black text-red-600 dark:text-red-400 flex items-center gap-1 mb-1.5"><TrendingDown className="w-4 h-4" /> বেশি কমেছে</p>
            <ul className="space-y-1">{s.down.map((r) => <Row key={r.key} r={r} up={false} />)}</ul>
          </div>
        )}
      </div>
    </section>
  );
}
