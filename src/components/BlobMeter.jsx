import React, { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw, Loader2 } from 'lucide-react';
import { fetchBlobUsage } from '../services/api';

const LABELS = {
  publish: 'রেট প্রকাশ', snapshot: 'আনডু কপি', archive: 'দিনের আর্কাইভ/ট্রেন্ড', backup: 'অটো ব্যাকআপ', stats: 'ভিজিট পরিসংখ্যান',
  votes: 'ভোট', report: 'জেলা রেট রিপোর্ট', submission: 'ইউজারের রেট', feedback: 'মতামত', ad: 'মার্কেট বিজ্ঞাপন', adrate: 'বিক্রেতা রেটিং',
  adedit: 'বিজ্ঞাপন সম্পাদনা (বিক্রেতা)', poll: 'বাজার পোল', gallery: 'গ্যালারি', feeds: 'ফিডের দাম', admin: 'অ্যাডমিন তালিকা দেখা', meter: 'এই মিটার', other: 'অন্যান্য'
};
const bnNum = (n) => new Intl.NumberFormat('bn-BD').format(n);

/** Admin settings card: how many of the free plan's 2,000 monthly storage writes are used (an estimate). */
export default function BlobMeter({ adminKey }) {
  const [m, setM] = useState(undefined); // undefined = loading, null = failed
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setBusy(true); setM(await fetchBlobUsage(adminKey)); setBusy(false); }, [adminKey]);
  useEffect(() => { load(); }, [load]);

  const pct = m ? Math.min(100, Math.round((m.total / m.limit) * 100)) : 0;
  const tone = !m ? 'bg-slate-300' : m.total >= m.stopAt ? 'bg-red-600' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-600';
  const rows = m ? Object.entries(m.by).sort((a, b) => b[1] - a[1]).slice(0, 8) : [];

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-black text-slate-900 text-sm"><Database className="w-4 h-4 text-emerald-700" /> স্টোরেজ ব্যবহার (এই মাস)</div>
        <button onClick={load} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} রিফ্রেশ
        </button>
      </div>
      {m === undefined && <p className="text-xs text-slate-500">লোড হচ্ছে...</p>}
      {m === null && <p className="text-xs text-red-600 font-bold">মিটার লোড করা যায়নি (স্টোর ব্লক থাকতে পারে)।</p>}
      {m && (
        <>
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>আনুমানিক {bnNum(m.total)} / {bnNum(m.limit)} লেখা</span><span>{bnNum(pct)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full ${tone}`} style={{ width: `${pct}%` }} /></div>
          </div>
          <p className="text-xs text-slate-600">
            {m.total >= m.stopAt
              ? `সীমার কাছে পৌঁছেছে: নতুন মাস না আসা পর্যন্ত ভিজিটরদের পাঠানো বিজ্ঞাপন/রেট/মতামত নেওয়া বন্ধ (আপনার প্রকাশ চলবে)।`
              : `${bnNum(m.stopAt)} পার হলে ভিজিটরদের পাঠানো বিজ্ঞাপন, রেট ও মতামত মাসের বাকি দিন নেওয়া বন্ধ হবে, যাতে ${bnNum(m.limit)} কখনো পার না হয়।`}
          </p>
          {rows.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
              {rows.map(([k, n]) => <div key={k} className="flex justify-between gap-2"><span>{LABELS[k] || k}</span><b>{bnNum(n)}</b></div>)}
            </div>
          )}
          {m.store === 'supabase' && <p className="text-[10px] text-emerald-700 font-bold">টেক্সট ডেটা এখন Supabase-এ; এখানে শুধু ছবির লেখা গোনা হয়।</p>}
          <p className="text-[10px] text-slate-500">এটি অনুমান, Vercel-এর আসল সংখ্যা Vercel → Usage-এ দেখুন।</p>
        </>
      )}
    </div>
  );
}
