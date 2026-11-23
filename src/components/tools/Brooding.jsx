import React, { useState } from 'react';
import { NumField, Stat, Note, Grid } from './ui';
import { BROODING, brooderFor, cToF, n } from '../../utils/farmCalc';

export default function Brooding() {
  const [age, setAge] = useState(3);
  const [chicks, setChicks] = useState(1000);
  const b = brooderFor(age);
  const area = Math.round(n(chicks) * 0.3);
  return (
    <div className="space-y-5">
      <Grid>
        <NumField label="বাচ্চার বয়স (দিন)" value={age} onChange={setAge} />
        <NumField label="বাচ্চার সংখ্যা" value={chicks} onChange={setChicks} />
      </Grid>
      <Grid cols={3}>
        <Stat label="আদর্শ তাপমাত্রা" value={`${b.tempC[0]}–${b.tempC[1]}°C`} tone="good" sub={`${cToF(b.tempC[0])}–${cToF(b.tempC[1])}°F`} />
        <Stat label="আর্দ্রতা" value={b.humidity} />
        <Stat label="আলো" value={`${b.lightH} ঘণ্টা`} />
      </Grid>
      <Stat label="ব্রুডার গার্ডের জায়গা (প্রথম সপ্তাহ)" value={`${area} বর্গফুট`} sub="প্রতি বাচ্চায় প্রায় ০.৩ বর্গফুট, এরপর প্রতিদিন গার্ড বাড়ান" />
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-2 text-left">বয়স</th><th className="p-2">তাপমাত্রা</th><th className="p-2">আর্দ্রতা</th><th className="p-2">আলো</th></tr></thead>
          <tbody>
            {BROODING.map((r) => (
              <tr key={r.from} className={`border-t border-slate-100 text-center ${b === r ? 'bg-emerald-50 font-bold' : ''}`}>
                <td className="p-2 text-left">{r.from === 0 ? 1 : r.from}–{r.to > 90 ? 'শেষ' : r.to} দিন</td><td className="p-2">{r.tempC[0]}–{r.tempC[1]}°C</td><td className="p-2">{r.humidity}</td><td className="p-2">{r.lightH} ঘণ্টা</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>থার্মোমিটার বাচ্চার উচ্চতায় (মেঝে থেকে ২ ইঞ্চি) রাখুন। বাচ্চা হিটারের নিচে জড়ো হলে ঠান্ডা, দূরে সরে হাঁপালে গরম। ব্রয়লার গাইডের আনুমানিক মান।</Note>
    </div>
  );
}
