import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { RefreshCw, Loader2, BarChart3 } from 'lucide-react';
import { fetchStats } from '../services/api';

const bnNum = (n) => new Intl.NumberFormat('bn-BD').format(Math.round(n));

const TAB_BN = { doc: 'বাচ্চার রেট (DOC)', ready: 'রেডি মুরগি ও ডিম', market: 'বিক্রির বাজার' };
const SRC_BN = { direct: 'সরাসরি / লিংক', facebook: 'ফেসবুক', whatsapp: 'হোয়াটসঅ্যাপ', telegram: 'টেলিগ্রাম', search: 'গুগল/সার্চ', youtube: 'ইউটিউব', other: 'অন্যান্য' };
const DEV_BN = { mobile: 'মোবাইল', desktop: 'কম্পিউটার' };
const TOOL_BN = { fcr: 'FCR ও ফিড', diary: 'ব্যাচ ডায়েরি', vaccine: 'টিকা সূচি', brooding: 'ব্রুডিং গাইড', space: 'শেড ও জায়গা', risk: 'দামের ঝুঁকি', layer: 'লেয়ার ডিম', mix: 'ফিড মিক্স', mort: 'মৃত্যুহার ক্ষতি' };
const ACTION_BN = { calc: 'ক্যালকুলেটর খোলা', share: 'শেয়ার খোলা' };

const addDays = (iso, n) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

function Bars({ rows, tone = 'bg-emerald-500' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-xs text-slate-400">এখনো তথ্য নেই</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs"><span className="font-bold text-slate-700 truncate pr-2">{r.label}</span><span className="font-black text-slate-900">{bnNum(r.value)}</span></div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${tone}`} style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Admin: visitors and what they use. Numbers come from anonymous event counters (see api/live-visitors.js). */
export default function AnalyticsPanel({ adminKey, rates = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState(14);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    const r = await fetchStats(adminKey);
    if (!r) setFailed(true); else setData(r);
    setLoading(false);
  }, [adminKey]);
  useEffect(() => { load(); }, [load]);

  const view = useMemo(() => {
    if (!data) return null;
    const today = data.today;
    const dates = Array.from({ length: range }, (_, i) => addDays(today, i - range + 1));
    const sumOver = (list, key) => list.reduce((s, d) => s + (data.days[d]?.[key] || 0), 0);
    const totals = {};
    dates.forEach((d) => Object.entries(data.days[d] || {}).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; }));
    const group = (prefix, labels) => Object.entries(totals).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => ({ label: labels?.[k.slice(prefix.length)] || k.slice(prefix.length), value: v })).sort((a, b) => b.value - a.value);
    const nameOf = (id) => { const r = rates.find((x) => String(x.id).toLowerCase().replace(/[^a-z0-9_:.-]/g, '').slice(0, 40) === id); return r ? `${r.company} (${r.breed})` : id; };
    return {
      daily: dates.map((d) => ({ d, v: data.days[d]?.visit || 0 })),
      today: sumOver([today], 'visit'),
      yesterday: sumOver([addDays(today, -1)], 'visit'),
      week: sumOver(dates.slice(-7), 'visit'),
      total: totals.visit || 0,
      tabs: group('tab:', TAB_BN),
      sources: group('src:', SRC_BN),
      devices: group('dev:', DEV_BN),
      tools: group('tool:', TOOL_BN),
      books: group('book:').map((r) => ({ ...r, label: nameOf(r.label) })).slice(0, 8),
      actions: Object.entries(ACTION_BN).map(([k, label]) => ({ label, value: totals[k] || 0 })).filter((r) => r.value > 0)
    };
  }, [data, range, rates]);

  const maxDay = view ? Math.max(1, ...view.daily.map((x) => x.v)) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-black text-slate-900"><BarChart3 className="w-5 h-5 text-emerald-700" /> সাইটের পরিসংখ্যান</div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            {[7, 14, 30].map((n) => (
              <button key={n} onClick={() => setRange(n)} className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${range === n ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}>{bnNum(n)} দিন</button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} রিফ্রেশ
          </button>
        </div>
      </div>

      {failed && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">পরিসংখ্যান লোড করা যায়নি</div>}

      {view && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[['আজকের ভিজিট', view.today], ['গতকাল', view.yesterday], ['গত ৭ দিন', view.week], [`${bnNum(range)} দিনে মোট`, view.total]].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="block text-[11px] font-bold text-slate-500">{l}</span><span className="block text-xl font-black text-slate-900">{bnNum(v)}</span></div>
            ))}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">প্রতিদিনের ভিজিট</p>
            <div className="flex items-end gap-1 h-32 border-b border-slate-200">
              {view.daily.map((x) => (
                <div key={x.d} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group relative" title={`${x.d}: ${x.v}`}>
                  <span className="text-[9px] font-bold text-slate-500 leading-none mb-0.5">{x.v || ''}</span>
                  <div className={`w-full rounded-t ${x.d === data.today ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ height: `${(x.v / maxDay) * 85}%`, minHeight: x.v ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{view.daily[0].d.slice(5)}</span><span>আজ</span></div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div><p className="text-xs font-black text-slate-800 mb-2">কোন ট্যাব বেশি দেখা হয়</p><Bars rows={view.tabs} /></div>
            <div><p className="text-xs font-black text-slate-800 mb-2">ভিজিটর কোথা থেকে এসেছে</p><Bars rows={view.sources} tone="bg-sky-500" /></div>
            <div><p className="text-xs font-black text-slate-800 mb-2">মোবাইল বনাম কম্পিউটার</p><Bars rows={view.devices} tone="bg-violet-500" /></div>
            <div><p className="text-xs font-black text-slate-800 mb-2">বুকিং বাটনে সবচেয়ে বেশি চাপ</p><Bars rows={view.books} tone="bg-amber-500" /></div>
            {view.tools.length > 0 && <div><p className="text-xs font-black text-slate-800 mb-2">খামার টুলস ব্যবহার</p><Bars rows={view.tools} tone="bg-rose-500" /></div>}
            {view.actions.length > 0 && <div><p className="text-xs font-black text-slate-800 mb-2">অন্যান্য</p><Bars rows={view.actions} /></div>}
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
            {data.mode === 'redis'
              ? 'সঠিক গণনা (Redis চালু)। ভিজিট = একটি ব্রাউজার সেশন। কোনো আইপি, কুকি বা ব্যক্তিগত তথ্য রাখা হয় না।'
              : 'আনুমানিক গণনা: Blob কোটা বাঁচাতে গণনা প্রতি ৩ ঘণ্টায় একবার জমা হয়, তাই সার্ভার রিস্টার্ট হলে সাম্প্রতিক কিছু ভিজিট বাদ পড়তে পারে। সঠিক সংখ্যার জন্য Vercel-এ ফ্রি Upstash Redis যোগ করুন। ভিজিট = একটি ব্রাউজার সেশন; কোনো আইপি বা ব্যক্তিগত তথ্য রাখা হয় না।'}
          </p>
        </>
      )}
    </div>
  );
}
