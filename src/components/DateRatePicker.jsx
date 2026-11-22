import React, { useState } from 'react';
import { CalendarDays, RotateCcw, X } from 'lucide-react';
import { formatBn, formatEn } from '../utils/date';

/**
 * "Date-wise rate" button. The site normally shows the latest rates; here a visitor can pick an earlier date.
 * A date with no rates shows the latest earlier day that has some (the server resolves that).
 */
export default function DateRatePicker({ lang, liveDate, dates, viewing, notice, busy, onPick, onBackToLive }) {
  const [open, setOpen] = useState(false);
  const bn = lang === 'bn';
  const fmt = (iso) => (bn ? formatBn(iso) : formatEn(iso));
  const recent = dates.filter((d) => d !== liveDate).slice(0, 7);

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 text-slate-800 text-xs sm:text-sm font-black shadow-xs cursor-pointer"
        >
          <CalendarDays className="w-4 h-4 text-emerald-600" />
          {bn ? 'তারিখ অনুযায়ী রেট দেখুন' : 'View rates by date'}
        </button>
        {viewing ? (
          <>
            <span className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold">
              📅 {bn ? 'দেখানো হচ্ছে:' : 'Showing:'} {fmt(viewing)}
            </span>
            <button
              type="button"
              onClick={() => { onBackToLive(); setOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {bn ? 'সর্বশেষ রেটে ফিরুন' : 'Back to latest'}
            </button>
          </>
        ) : (
          <span className="text-xs font-semibold text-slate-500">
            {bn ? `এখন দেখানো হচ্ছে: সর্বশেষ রেট (${fmt(liveDate)})` : `Showing the latest rates (${fmt(liveDate)})`}
          </span>
        )}
      </div>

      {notice && <p className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{notice}</p>}

      {open && (
        <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-black text-slate-700">{bn ? 'তারিখ বেছে নিন' : 'Pick a date'}</label>
            <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer" aria-label="close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="date"
            max={liveDate}
            value={viewing || liveDate}
            disabled={busy}
            onChange={(e) => e.target.value && onPick(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          {recent.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recent.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={busy}
                  onClick={() => onPick(d)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${viewing === d ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'}`}
                >
                  {fmt(d).split('(')[0].trim()}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            {bn ? 'যে তারিখে রেট নেই, সেখানে তার আগের সবচেয়ে কাছের তারিখের রেট দেখানো হবে।' : 'If a date has no rates, the closest earlier date with rates is shown.'}
          </p>
        </div>
      )}
    </div>
  );
}
