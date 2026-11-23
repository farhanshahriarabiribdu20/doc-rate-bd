import React, { useMemo, useState } from 'react';
import { Wheat, TrendingUp, TrendingDown, Search } from 'lucide-react';
const toBn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

/** Poultry feed price list (public). Renders nothing until the admin adds prices. */
export default function FeedPrices({ feeds }) {
  const [company, setCompany] = useState('');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const list = feeds || [];
  const companies = useMemo(() => [...new Set(list.map((f) => f.company))].sort((a, b) => a.localeCompare(b, 'bn')), [list]);
  const types = useMemo(() => [...new Set(list.map((f) => f.type))], [list]);
  if (!list.length) return null;

  const needle = q.trim().toLowerCase();
  const shown = list
    .filter((f) => (!company || f.company === company) && (!type || f.type === type) && (!needle || `${f.company} ${f.product}`.toLowerCase().includes(needle)))
    .sort((a, b) => a.company.localeCompare(b.company, 'bn') || a.price - b.price);
  const latest = list.reduce((m, f) => (f.changed > m ? f.changed : m), '');
  const sel = 'w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200';

  return (
    <section className="mt-8 scroll-mt-40" aria-labelledby="feed-title">
      <div className="flex items-center gap-2">
        <Wheat className="w-5 h-5 text-amber-600" />
        <h2 id="feed-title" className="scroll-mt-40 text-lg font-black text-slate-900 dark:text-white">পোল্ট্রি ফিডের দাম</h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">বস্তা প্রতি পাইকারি দাম{latest ? ` · সর্বশেষ আপডেট ${toBn(latest)}` : ''}। এলাকাভেদে সামান্য ভিন্ন হতে পারে।</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="কোম্পানি বা পণ্য খুঁজুন" className={`${sel} pl-9`} />
        </div>
        <select value={company} onChange={(e) => setCompany(e.target.value)} className={sel} aria-label="কোম্পানি">
          <option value="">সব কোম্পানি</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel} aria-label="ধরন">
          <option value="">সব ধরন</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">কিছু পাওয়া যায়নি</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((f) => {
            const diff = f.prevPrice ? f.price - f.prevPrice : 0;
            return (
              <div key={f.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-w-0">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">{f.type}</span>
                  <span className="text-slate-500 dark:text-slate-400">{f.weight}</span>
                </div>
                <p className="mt-2 font-black text-slate-900 dark:text-white break-words">{f.product}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{f.company}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-2">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">৳{toBn(f.price.toLocaleString('en-US'))}</p>
                  {diff !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-black ${diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {diff > 0 ? '+' : '−'}৳{toBn(Math.abs(diff))}
                    </span>
                  )}
                </div>
                {diff !== 0 && <p className="text-[10px] text-slate-400 mt-1">আগে ৳{toBn(f.prevPrice)} · {toBn(f.changed)}</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
