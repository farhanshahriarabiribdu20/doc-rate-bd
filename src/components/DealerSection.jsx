import React, { useMemo, useState } from 'react';
import { Phone, MessageCircle, MapPin, Search, Users } from 'lucide-react';

/** Public dealer / agent contact list. Renders nothing until the admin adds dealers. */
export default function DealerSection({ dealers }) {
  const [company, setCompany] = useState('');
  const [district, setDistrict] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(12);

  const list = dealers || [];
  const companies = useMemo(() => [...new Set(list.map((d) => d.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'bn')), [list]);
  const districts = useMemo(() => {
    const m = new Map();
    list.forEach((d) => d.district && m.set(d.district, (m.get(d.district) || 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'bn'));
  }, [list]);

  if (!list.length) return null;

  const needle = q.trim().toLowerCase();
  const shown = list.filter((d) =>
    (!company || d.company === company) &&
    (!district || d.district === district) &&
    (!needle || `${d.name} ${d.company} ${d.address} ${d.district} ${d.phone}`.toLowerCase().includes(needle))
  );
  const reset = (fn) => (e) => { fn(e.target.value); setLimit(12); };
  const sel = 'w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200';

  return (
    <section className="mt-8" aria-labelledby="dealer-title">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-emerald-600" />
        <h2 id="dealer-title" className="text-lg font-black text-slate-900 dark:text-white">ডিলার / এজেন্ট তালিকা</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">({list.length} জন)</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={reset(setQ)} placeholder="নাম, এলাকা বা নম্বর খুঁজুন"
            className={`${sel} pl-9`} />
        </div>
        <select value={company} onChange={reset(setCompany)} className={sel} aria-label="কোম্পানি">
          <option value="">সব কোম্পানি</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={district} onChange={reset(setDistrict)} className={sel} aria-label="জেলা">
          <option value="">সব জেলা</option>
          {districts.map(([d, n]) => <option key={d} value={d}>{d} ({n})</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">কোনো ডিলার পাওয়া যায়নি</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.slice(0, limit).map((d) => (
            <div key={d.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-slate-900 dark:text-white break-words min-w-0">{d.name}</p>
                {d.company && <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">{d.company}</span>}
              </div>
              {(d.district || d.address) && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1 break-words">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="min-w-0">{[d.address, d.district].filter(Boolean).join(', ')}</span>
                </p>
              )}
              {d.note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-words">{d.note}</p>}
              <div className="mt-3 flex gap-2">
                <a href={`tel:+88${d.phone}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold py-2">
                  <Phone className="w-3.5 h-3.5" /> {d.phone}
                </a>
                <a href={`https://wa.me/88${d.phone}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                  className="inline-flex items-center justify-center rounded-xl bg-green-500 text-white px-3 py-2">
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      {shown.length > limit && (
        <button onClick={() => setLimit((n) => n + 12)} className="mt-3 w-full text-sm font-bold text-emerald-700 dark:text-emerald-300 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950">
          আরও দেখুন ({shown.length - limit})
        </button>
      )}
    </section>
  );
}
