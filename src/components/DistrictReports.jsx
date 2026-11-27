import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Send, X, Loader2, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { DISTRICT_GROUPS } from '../data/districts';
import { fetchReports, sendReport } from '../services/reports';

const FIELDS = [
  { key: 'broiler', bn: 'ব্রয়লার', unit: '৳/কেজি' },
  { key: 'colorBird', bn: 'কালার বার্ড', unit: '৳/কেজি' },
  { key: 'sonali', bn: 'সোনালী', unit: '৳/কেজি' },
  { key: 'eggBrown', bn: 'লাল ডিম', unit: '৳/পিস' },
  { key: 'eggWhite', bn: 'সাদা ডিম', unit: '৳/পিস' }
];
const toBn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const fmt = (n) => toBn(Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, ''));

const median = (nums) => {
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

// Per field: one report = its value, two or more = their median.
export function summarize(list) {
  const out = {};
  for (const f of FIELDS) {
    const vals = list.map((r) => r.f?.[f.key]).filter((v) => Number.isFinite(v));
    if (vals.length) out[f.key] = { v: median(vals), n: vals.length };
  }
  return out;
}

const ago = (t) => {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${toBn(m)} মিনিট আগে`;
  return `${toBn(Math.round(m / 60))} ঘণ্টা আগে`;
};

const input = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500';

export function ReportModal({ initialDistrict, onClose, onSent }) {
  const [district, setDistrict] = useState(initialDistrict || '');
  const [values, setValues] = useState({});
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    if (!district) { setError('জেলা বেছে নিন।'); return; }
    const filled = Object.fromEntries(Object.entries(values).filter(([, v]) => String(v).trim() !== ''));
    if (!Object.keys(filled).length) { setError('অন্তত একটি রেট লিখুন।'); return; }
    setError(''); setStatus('sending');
    const r = await sendReport({ district, values: filled, name: name.trim(), website });
    if (r.ok) {
      try { localStorage.setItem('fn_report_district', district); } catch { /* ignore */ }
      setStatus('saved'); onSent();
    } else { setStatus('idle'); setError(r.error || 'পাঠানো যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 bg-emerald-900 text-white rounded-t-3xl">
          <div>
            <h3 className="font-black text-base">📍 আপনার জেলার আজকের রেট</h3>
            <p className="text-[11px] text-emerald-100">পাঠালেই সাথে সাথে সাইটে দেখা যাবে।</p>
          </div>
          <button onClick={onClose} aria-label="বন্ধ করুন" className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        {status === 'saved' ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
            <p className="font-black text-slate-900 text-lg">ধন্যবাদ! রেট প্রকাশ হয়েছে।</p>
            <p className="text-sm text-slate-600">একই জেলায় আরও কেউ দিলে মধ্যমান (median) দেখানো হবে।</p>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm cursor-pointer">ঠিক আছে</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">জেলা *</label>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className={input}>
                <option value="">— বেছে নিন —</option>
                {DISTRICT_GROUPS.map((g) => (
                  <optgroup key={g.division} label={g.division}>
                    {g.districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{f.bn} <span className="font-normal text-slate-500">({f.unit})</span></label>
                  <input type="number" inputMode="decimal" step="any" min="0" value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className={input} />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 -mt-2">যে রেটগুলো জানেন শুধু সেগুলো লিখুন।</p>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">আপনার নাম (ঐচ্ছিক)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={input} />
            </div>
            <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden="true" />
            {error && (
              <div role="alert" className="flex items-start gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <button type="submit" disabled={status === 'sending'} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm cursor-pointer">
              {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} রেট পাঠান
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Today's rates sent by visitors for the 64 districts (public). */
export default function DistrictReports() {
  const [data, setData] = useState({});
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const load = () => fetchReports().then(setData);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    window.addEventListener('fn-reports-changed', load);
    return () => window.removeEventListener('fn-reports-changed', load);
  }, []);

  const rows = useMemo(() => Object.entries(data)
    .filter(([, list]) => list?.length)
    .map(([district, list]) => ({ district, n: list.length, last: Math.max(...list.map((r) => r.t)), sum: summarize(list) }))
    .filter((r) => !q.trim() || r.district.includes(q.trim()))
    .sort((a, b) => b.last - a.last), [data, q]);
  const total = Object.values(data).filter((l) => l?.length).length;
  let saved = '';
  try { saved = localStorage.getItem('fn_report_district') || ''; } catch { /* ignore */ }

  return (
    <section className="scroll-mt-40" aria-labelledby="dr-title" data-search-anchor="district-reports">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="dr-title" className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white"><MapPin className="w-5 h-5 text-emerald-600" /> জেলা অনুযায়ী আজকের রেট</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">খামারি ও ব্যবসায়ীদের পাঠানো রেট · একজন দিলে তার রেট, দুই বা বেশি জন দিলে মধ্যমান। অনানুমোদিত — মোকামের অফিসিয়াল রেট নয়।</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm cursor-pointer">✍️ আপনার জেলার রেট দিন</button>
      </div>

      {total > 4 && (
        <div className="relative mt-3 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="জেলা খুঁজুন" className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 text-center">আজ এখনো কোনো জেলার রেট আসেনি। আপনি প্রথম হোন!</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <div key={r.district} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-slate-900 dark:text-white">{r.district}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">{toBn(r.n)} জন · {ago(r.last)}</span>
              </div>
              <dl className="mt-2 space-y-1">
                {FIELDS.filter((f) => r.sum[f.key]).map((f) => (
                  <div key={f.key} className="flex items-baseline justify-between gap-2 text-sm">
                    <dt className="text-slate-600 dark:text-slate-300">{f.bn}</dt>
                    <dd className="font-black text-slate-900 dark:text-white">৳{fmt(r.sum[f.key].v)} <span className="text-[10px] font-normal text-slate-500">{f.unit.replace('৳', '')}</span></dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
      {open && <ReportModal initialDistrict={saved} onClose={() => setOpen(false)} onSent={load} />}
    </section>
  );
}

/** Big, hard-to-miss call to action: asks everyone to share today's ready-bird and egg rates. */
export function ReportBanner({ onDocRate, people = 0 }) {
  const [open, setOpen] = useState(false);
  let saved = '';
  try { saved = localStorage.getItem('fn_report_district') || ''; } catch { /* ignore */ }
  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-5 sm:p-7 shadow-xl border border-amber-300/60">
        <div className="absolute -right-6 -top-6 text-[120px] sm:text-[160px] opacity-15 select-none leading-none" aria-hidden="true">🐔</div>
        <div className="relative flex flex-col gap-4 sm:gap-5">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-black tracking-wider uppercase bg-white/20 inline-block px-2.5 py-1 rounded-full">📢 সবার প্রতি অনুরোধ</p>
            <h2 className="mt-2 text-2xl sm:text-4xl font-black leading-tight drop-shadow-sm">বাচ্চা, মুরগি ও ডিমের রেট দিন!</h2>
            <p className="mt-1.5 text-sm sm:text-base font-bold text-white/95 leading-relaxed">আপনার জানা বাচ্চার, রেডি মুরগি বা ডিমের রেট জানান — সবাই উপকৃত হবে।</p>
            {people > 0 && <p className="mt-1 text-xs sm:text-sm font-black text-white bg-white/20 inline-block px-2.5 py-1 rounded-full">✅ আজ {String(people).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d])} জন রেট দিয়েছেন</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 sm:max-w-2xl">
            <button onClick={() => setOpen(true)} className="w-full px-5 py-3.5 sm:py-4 rounded-2xl bg-white text-orange-700 hover:bg-orange-50 font-black text-base sm:text-lg shadow-lg cursor-pointer">
              🐔 মুরগি ও ডিমের রেট দিন
            </button>
            {onDocRate && (
              <button onClick={onDocRate} className="w-full px-5 py-3.5 sm:py-4 rounded-2xl bg-white/15 hover:bg-white/25 border-2 border-white text-white font-black text-base sm:text-lg cursor-pointer">
                🐣 বাচ্চার রেট দিন
              </button>
            )}
          </div>
        </div>
      </div>
      {open && <ReportModal initialDistrict={saved} onClose={() => setOpen(false)} onSent={() => window.dispatchEvent(new Event('fn-reports-changed'))} />}
    </>
  );
}
