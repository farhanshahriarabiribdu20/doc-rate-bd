import React, { useMemo, useState } from 'react';
import { Bell, TrendingUp, TrendingDown } from 'lucide-react';

const KEY = 'fn_fav_seen';
const toBn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };

/**
 * Tells the visitor when the rate of one of their favourite companies changed since they last looked.
 * "Last seen" rates live only in this browser. Shown for live rates, never for an archived day.
 */
export default function FavAlert({ rates, favKeys }) {
  const [hidden, setHidden] = useState(false);
  const changes = useMemo(() => {
    const seen = read();
    const next = { ...seen };
    const out = [];
    for (const k of favKeys) {
      const r = rates.find((x) => `${x.company}|${x.breed || ''}` === k);
      const rate = Number(r?.todayRate);
      if (!r || !(rate > 0)) continue;
      const prev = Number(seen[k]);
      if (prev > 0 && prev !== rate) out.push({ k, label: `${r.company}${r.breed ? ` (${r.breed})` : ''}`, from: prev, to: rate });
      else if (!(prev > 0)) next[k] = rate; // first time: just remember it
    }
    if (JSON.stringify(next) !== JSON.stringify(seen)) write(next);
    return out;
  }, [rates, favKeys]);

  if (hidden || !changes.length) return null;
  const dismiss = () => {
    const seen = read();
    changes.forEach((c) => { seen[c.k] = c.to; });
    write(seen);
    setHidden(true);
  };
  return (
    <div role="status" className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
      <p className="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5"><Bell className="w-4 h-4" /> পছন্দের ফার্মের রেট বদলেছে</p>
      <ul className="mt-2 space-y-1">
        {changes.map((c) => {
          const up = c.to > c.from;
          return (
            <li key={c.k} className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-200">
              <span className="min-w-0 truncate font-bold">{c.label}</span>
              <span className={`shrink-0 inline-flex items-center gap-1 font-black ${up ? 'text-red-600' : 'text-emerald-600'}`}>
                ৳{toBn(c.from)} → ৳{toBn(c.to)}
                {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              </span>
            </li>
          );
        })}
      </ul>
      <button onClick={dismiss} className="mt-3 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white cursor-pointer">ঠিক আছে</button>
    </div>
  );
}
