import React, { useState } from 'react';
import { NumField, Stat, Note, Grid, money, signed } from './ui';
import { batchProfit, n } from '../../utils/farmCalc';

const loadSaved = () => { try { return JSON.parse(localStorage.getItem('fn_calc_inputs')) || {}; } catch { return {}; } };

export default function PriceRisk() {
  const sv = loadSaved();
  const [chicks, setChicks] = useState(sv.chickCount ?? 1000);
  const [chickPrice, setChickPrice] = useState(sv.chickPrice ?? 40);
  const [bag, setBag] = useState(sv.feedBagPrice ?? 3400);
  const [feedPer, setFeedPer] = useState(sv.feedPerBirdKg ?? 3);
  const [med, setMed] = useState(sv.medCostPerBird ?? 15);
  const [mort, setMort] = useState(sv.mortalityRate ?? 4);
  const [wt, setWt] = useState(sv.targetWeightKg ?? 1.8);
  const [sale, setSale] = useState(sv.sellingPricePerKg ?? 185);

  const base = { chicks, chickPrice, feedBagPrice: bag, feedPerBirdKg: feedPer, medPerBird: med, mortalityPct: mort, weightKg: wt, salePerKg: sale };
  const r = batchProfit(base);
  const saleSteps = [-20, -10, 0, 10, 20];
  const feedSteps = [-300, -150, 0, 150, 300];
  const short = (v) => { const a = Math.abs(Math.round(v)); const t = a >= 100000 ? `${(a / 100000).toFixed(1)}লা` : a.toLocaleString('en-US'); return `${v >= 0 ? '+' : '-'}${t}`; };

  return (
    <div className="space-y-5">
      <Grid cols={4}>
        <NumField label="বাচ্চা (পিস)" value={chicks} onChange={setChicks} />
        <NumField label="বাচ্চার দাম (৳)" value={chickPrice} onChange={setChickPrice} />
        <NumField label="ফিড বস্তা ৫০ কেজি (৳)" value={bag} onChange={setBag} />
        <NumField label="ফিড/মুরগি (কেজি)" value={feedPer} onChange={setFeedPer} step="0.1" />
        <NumField label="ওষুধ/মুরগি (৳)" value={med} onChange={setMed} />
        <NumField label="মৃত্যুহার (%)" value={mort} onChange={setMort} />
        <NumField label="গড় ওজন (কেজি)" value={wt} onChange={setWt} step="0.05" />
        <NumField label="বিক্রয় দর (৳/কেজি)" value={sale} onChange={setSale} />
      </Grid>
      <Grid cols={3}>
        <Stat label="ব্রেক-ইভেন বিক্রয় দর" value={`${money(r.breakEvenPerKg)}/কেজি`} tone="warn" />
        <Stat label="বর্তমান লাভ/ক্ষতি" value={signed(r.profit)} tone={r.profit >= 0 ? 'good' : 'bad'} />
        <Stat label="মোট বিনিয়োগ" value={money(r.invest)} />
      </Grid>
      <div>
        <p className="text-xs font-bold text-slate-700 mb-2">ফিডের বস্তার দাম বনাম মুরগি বিক্রির দর — লাভ/ক্ষতি (৳)</p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[11px] sm:text-xs text-center">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="p-2 text-left">ফিড ↓ / বিক্রয় →</th>{saleSteps.map((d) => <th key={d} className="p-2">৳{n(sale) + d}</th>)}</tr>
            </thead>
            <tbody>
              {feedSteps.map((f) => (
                <tr key={f} className="border-t border-slate-100">
                  <td className="p-2 text-left font-bold whitespace-nowrap">বস্তা ৳{n(bag) + f}</td>
                  {saleSteps.map((d) => {
                    const p = batchProfit({ ...base, feedBagPrice: n(bag) + f, salePerKg: n(sale) + d }).profit;
                    return <td key={d} className={`p-2 font-black whitespace-nowrap ${p >= 0 ? 'text-emerald-700 bg-emerald-50/60' : 'text-rose-700 bg-rose-50/60'} ${f === 0 && d === 0 ? 'ring-2 ring-inset ring-amber-400' : ''}`}>{short(p)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Note>ঘর সবুজ মানে লাভ, লাল মানে ক্ষতি। মাঝের হলুদ ঘেরা ঘর আপনার বর্তমান হিসাব। ক্যালকুলেটরে সর্বশেষ দেওয়া সংখ্যা এখানে স্বয়ংক্রিয়ভাবে আসে।</Note>
    </div>
  );
}
