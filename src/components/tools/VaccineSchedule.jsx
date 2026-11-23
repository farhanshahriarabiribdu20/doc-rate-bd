import React from 'react';
import { Field, Note, inputCls, useSaved } from './ui';
import { vaccineRows, isoToday } from '../../utils/farmCalc';

const fmtDate = (d) => d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', weekday: 'short' });

export default function VaccineSchedule() {
  const [s, setS] = useSaved('fn_tools_vaccine', { hatch: isoToday(), type: 'broiler' });
  const rows = vaccineRows(s.hatch || isoToday(), s.type);
  const next = rows.find((r) => r.inDays >= 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="বাচ্চা তোলার তারিখ (১ম দিন)"><input type="date" value={s.hatch} onChange={(e) => setS({ ...s, hatch: e.target.value })} className={inputCls} /></Field>
        <Field label="মুরগির ধরন">
          <select value={s.type} onChange={(e) => setS({ ...s, type: e.target.value })} className={inputCls}>
            <option value="broiler">ব্রয়লার</option><option value="sonali">সোনালী/কালার</option><option value="layer">লেয়ার</option>
          </select>
        </Field>
      </div>
      {next && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm font-bold text-amber-900">
          পরের টিকা: {next.name} — {next.inDays === 0 ? 'আজই' : `${next.inDays} দিন পর`} ({fmtDate(next.date)})
        </div>
      )}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.day} className={`flex items-center gap-3 p-3 rounded-xl border ${r.inDays === 0 ? 'bg-amber-50 border-amber-300' : r.inDays < 0 ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
            <span className="w-14 shrink-0 text-center text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg py-1.5">{r.day} দিন</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{r.name}</p>
              <p className="text-[11px] text-slate-500">{r.note}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-700">{fmtDate(r.date)}</p>
              <p className={`text-[11px] font-black ${r.inDays < 0 ? 'text-slate-400' : r.inDays === 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{r.inDays < 0 ? '✓ হয়ে গেছে' : r.inDays === 0 ? 'আজ' : `${r.inDays} দিন বাকি`}</p>
            </div>
          </div>
        ))}
      </div>
      <Note>এটি বাংলাদেশে প্রচলিত সাধারণ সূচি। এলাকার রোগের অবস্থা ও কোম্পানির পরামর্শ অনুযায়ী পশুচিকিৎসক সময় বদলাতে পারেন। তারিখ আপনার ফোনে সেভ থাকে।</Note>
    </div>
  );
}
