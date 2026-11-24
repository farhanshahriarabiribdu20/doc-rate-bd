import React from 'react';
import { MASTER_GRADES, gradeRateFor, hasGradeRates } from '../data/grades';

/** A / M / B+ / B rates of an item for the chosen region (shown only for items that came from the Master Grades Excel). */
export default function GradeRates({ item, region, lang, compact = false }) {
  if (!hasGradeRates(item)) return null;
  return (
    <div className={compact ? 'mt-1' : 'mt-3'}>
      {!compact && <p className="text-[10px] font-bold text-slate-500 mb-1">{lang === 'bn' ? 'গ্রেড অনুযায়ী রেট' : 'Rate by grade'}</p>}
      <div className="flex flex-wrap gap-1">
        {MASTER_GRADES.map((g) => {
          const v = gradeRateFor(item, g, region);
          return (
            <span key={g} className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[11px] font-black ${v == null ? 'bg-slate-50 border-slate-200 text-slate-400' : g === 'A' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-800'}`}>
              <span className="text-[10px] font-bold text-slate-500">{g}</span>
              {v == null ? '—' : `৳${v}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}
