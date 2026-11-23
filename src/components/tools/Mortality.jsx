import React from 'react';
import { NumField, Stat, Note, Grid, money, fix, useSaved } from './ui';
import { mortalityLoss, n } from '../../utils/farmCalc';

const WEEKS = [[3, '১ম সপ্তাহ'], [10, '২য় সপ্তাহ'], [17, '৩য় সপ্তাহ'], [24, '৪র্থ সপ্তাহ'], [31, '৫ম সপ্তাহ'], [38, '৬ষ্ঠ সপ্তাহ']];

export default function Mortality() {
  const [s, setS] = useSaved('fn_tools_mort', { chicks: 1000, chickPrice: 40, bag: 3400, med: 15, w: [12, 6, 5, 5, 8, 4] });
  const set = (k) => (v) => setS({ ...s, [k]: v });
  const deaths = WEEKS.map(([day], i) => ({ day, count: n(s.w[i]) }));
  const r = mortalityLoss({ chicks: s.chicks, chickPrice: s.chickPrice, feedPricePerKg: n(s.bag) / 50, medPerBird: s.med, deaths });
  const tone = r.mortalityPct <= 4 ? 'good' : r.mortalityPct <= 7 ? 'warn' : 'bad';
  return (
    <div className="space-y-5">
      <Grid cols={4}>
        <NumField label="বাচ্চা (পিস)" value={s.chicks} onChange={set('chicks')} />
        <NumField label="বাচ্চার দাম (৳)" value={s.chickPrice} onChange={set('chickPrice')} />
        <NumField label="ফিড বস্তা ৫০ কেজি (৳)" value={s.bag} onChange={set('bag')} />
        <NumField label="ওষুধ/মুরগি (৳)" value={s.med} onChange={set('med')} />
      </Grid>
      <div>
        <p className="text-xs font-bold text-slate-700 mb-2">কোন সপ্তাহে কয়টি মারা গেছে</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {WEEKS.map(([, label], i) => (
            <label key={label} className="block text-center">
              <span className="block text-[11px] text-slate-500 mb-1">{label}</span>
              <input type="number" min="0" value={s.w[i]} onChange={(e) => setS({ ...s, w: s.w.map((x, j) => (j === i ? (e.target.value === '' ? '' : Number(e.target.value)) : x)) })} className="w-full px-2 py-2 border border-slate-200 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none" />
            </label>
          ))}
        </div>
      </div>
      <Grid cols={3}>
        <Stat label="মোট মৃত্যু" value={`${r.dead} টি`} sub={`মৃত্যুহার ${fix(r.mortalityPct, 1)}%`} tone={tone} />
        <Stat label="মোট ক্ষতি" value={money(r.loss)} tone="bad" sub="বাচ্চা + এ পর্যন্ত খাওয়া ফিড + ওষুধ" />
        <Stat label="প্রতি জীবিত মুরগিতে ক্ষতি" value={`৳${fix(r.lossPerSurvivor, 1)}`} tone="warn" />
      </Grid>
      <Note>ব্রয়লারে ৪–৫% পর্যন্ত মৃত্যুহার সহনীয় ধরা হয়। বড় বয়সে মরলে ক্ষতি বেশি, কারণ তার পেছনের ফিড ও ওষুধের টাকাও যায়। ইনপুট আপনার ফোনে সেভ থাকে।</Note>
    </div>
  );
}
