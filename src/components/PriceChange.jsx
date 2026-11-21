import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/** ▲▼ change of today's national rate against yesterday's. Hidden when yesterday is unknown. */
export default function PriceChange({ today, yesterday, lang = 'bn', compact = false }) {
  const t = Number(today);
  const y = Number(yesterday);
  if (!y || !t) return null;
  const diff = t - y;

  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
        <Minus className="w-3 h-3" />
        {!compact && <span>{lang === 'bn' ? 'অপরিবর্তিত' : 'No change'}</span>}
      </span>
    );
  }

  const up = diff > 0;
  const abs = Math.abs(diff);
  // For farmers buying chicks, a price rise is bad news (red), a fall is good news (green).
  const cls = up ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  const Icon = up ? TrendingUp : TrendingDown;
  const label = compact
    ? `${up ? '+' : '-'}৳${abs}`
    : lang === 'bn'
      ? `গতকালের চেয়ে ৳${abs} ${up ? 'বেশি' : 'কম'}`
      : `${up ? '+' : '-'}৳${abs} vs yesterday`;

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
}
