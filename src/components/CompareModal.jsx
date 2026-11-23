import React from 'react';
import { X, Scale } from 'lucide-react';
import { rateForRegion } from '../data/zones';
import { DIVISIONS } from '../data/initialData';
import { DIVISION_IDS } from '../data/regions';

const divName = (id, bn) => {
  const d = DIVISIONS.find((x) => x.id === id);
  return (bn ? d?.nameBn : d?.nameEn || d?.nameBn || id).split('(')[0].trim();
};

/** Side-by-side comparison of 2-3 companies: national rate, change vs yesterday, and every division. */
export default function CompareModal({ items, onClose, onRemove, lang = 'bn' }) {
  const bn = lang === 'bn';
  if (!items || items.length < 2) return null;

  const rows = [
    { key: 'all', label: bn ? 'জাতীয় রেট' : 'National rate', get: (it) => Number(it.todayRate), strong: true },
    ...DIVISION_IDS.map((id) => ({ key: id, label: divName(id, bn), get: (it) => Number(rateForRegion(it, id)) }))
  ];
  const lowest = (get) => {
    const vals = items.map(get).filter((v) => Number.isFinite(v) && v > 0);
    return vals.length ? Math.min(...vals) : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div role="dialog" aria-label={bn ? 'কোম্পানি তুলনা' : 'Compare companies'} onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-4 sm:p-5 bg-white/95 backdrop-blur-xs border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0"><Scale className="w-4 h-4" /></span>
            <div className="min-w-0">
              <h3 className="font-black text-slate-900 text-base sm:text-lg">{bn ? 'কোম্পানি তুলনা' : 'Compare companies'}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">{bn ? 'সবুজ ঘর = ওই সারির সবচেয়ে কম দাম' : 'Green cell = lowest price in that row'}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={bn ? 'বন্ধ করুন' : 'Close'} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-2 sm:p-5 overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-bold text-slate-500 p-1 sm:p-2 w-16 sm:w-40" />
                {items.map((it) => (
                  <th key={it.id} className="p-1 sm:p-2 align-top text-center sm:min-w-[7.5rem]">
                    <p className="font-black text-slate-900 text-xs sm:text-sm leading-snug">{it.companyEn || it.company}</p>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{it.breed}</p>
                    <button onClick={() => onRemove(it.id)} className="mt-1 text-[11px] font-bold text-rose-600 hover:underline cursor-pointer">{bn ? 'বাদ দিন' : 'Remove'}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const min = lowest(row.get);
                return (
                  <tr key={row.key}>
                    <td className={`p-2 border-t border-slate-100 text-xs ${row.strong ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{row.label}</td>
                    {items.map((it) => {
                      const v = row.get(it);
                      const best = min != null && v === min && items.length > 1 && items.some((o) => row.get(o) !== min);
                      return (
                        <td key={it.id} className="p-1 border-t border-slate-100 text-center">
                          <span className={`inline-block min-w-[3.4rem] sm:min-w-[4.5rem] px-1.5 sm:px-2 py-1.5 rounded-lg font-black ${row.strong ? 'text-base' : 'text-sm'} ${best ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'text-slate-800'}`}>
                            {Number.isFinite(v) && v > 0 ? `৳${v}` : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr>
                <td className="p-2 border-t border-slate-100 text-xs font-bold text-slate-600">{bn ? 'গতকালের তুলনায়' : 'vs yesterday'}</td>
                {items.map((it) => {
                  const d = Number(it.todayRate) - Number(it.yesterdayRate);
                  const has = Number(it.yesterdayRate) > 0;
                  return (
                    <td key={it.id} className="p-2 border-t border-slate-100 text-center text-xs font-black">
                      {!has ? '—' : d === 0 ? <span className="text-slate-500">{bn ? 'অপরিবর্তিত' : 'No change'}</span>
                        : <span className={d > 0 ? 'text-rose-700' : 'text-emerald-700'}>{d > 0 ? '▲' : '▼'} ৳{Math.abs(d)}</span>}
                    </td>
                  );
                })}
              </tr>
              {items.some((it) => it.notes) && (
                <tr>
                  <td className="p-2 border-t border-slate-100 text-xs font-bold text-slate-600">{bn ? 'নোট' : 'Note'}</td>
                  {items.map((it) => <td key={it.id} className="p-2 border-t border-slate-100 text-center text-[11px] font-semibold text-slate-600">{it.notes || '—'}</td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
