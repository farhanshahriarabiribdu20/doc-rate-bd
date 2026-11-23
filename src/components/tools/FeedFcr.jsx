import React, { useState } from 'react';
import { NumField, Stat, Note, Grid, fix } from './ui';
import { fcrOf, refFcrAt, feedPlan, n } from '../../utils/farmCalc';

export default function FeedFcr() {
  const [mode, setMode] = useState('fcr');
  const [chicks, setChicks] = useState(1000);
  const [dead, setDead] = useState(40);
  const [avgW, setAvgW] = useState(1.8);
  const [feedKg, setFeedKg] = useState(3200);
  const [age, setAge] = useState(32);
  const [target, setTarget] = useState(35);

  const alive = Math.max(0, n(chicks) - n(dead));
  const totalW = alive * n(avgW);
  const fcr = fcrOf(feedKg, totalW);
  const ref = refFcrAt(age);
  const diff = fcr - ref;
  const wastedKg = diff > 0 ? diff * totalW : 0;
  const plan = feedPlan(alive || chicks, target);

  return (
    <div className="space-y-5">
      <div className="flex bg-slate-100 p-1 rounded-xl">
        {[['fcr', 'FCR বের করুন'], ['plan', 'ফিড কত লাগবে']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg cursor-pointer ${mode === k ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}>{l}</button>
        ))}
      </div>

      <Grid>
        <NumField label="বাচ্চা তোলা হয়েছিল (পিস)" value={chicks} onChange={setChicks} />
        {mode === 'fcr' && <NumField label="মৃত্যু (পিস)" value={dead} onChange={setDead} />}
      </Grid>

      {mode === 'fcr' ? (
        <>
          <Grid>
            <NumField label="গড় ওজন (কেজি)" value={avgW} onChange={setAvgW} step="0.05" />
            <NumField label="এ পর্যন্ত মোট ফিড খাওয়ানো (কেজি)" value={feedKg} onChange={setFeedKg} hint="৫০ কেজির বস্তা × বস্তার সংখ্যা" />
            <NumField label="বয়স (দিন)" value={age} onChange={setAge} />
          </Grid>
          <Grid cols={3}>
            <Stat label="আপনার FCR" value={fix(fcr)} tone={fcr === 0 ? 'plain' : diff <= 0.05 ? 'good' : diff <= 0.2 ? 'warn' : 'bad'} />
            <Stat label={`${n(age)} দিনে আদর্শ FCR (আনুমানিক)`} value={fix(ref)} />
            <Stat label="বাড়তি ফিড খরচ" value={wastedKg > 0 ? `${Math.round(wastedKg)} কেজি` : 'নেই'} tone={wastedKg > 0 ? 'bad' : 'good'} sub={wastedKg > 0 ? `≈ ${fix(wastedKg / 50, 1)} বস্তা` : undefined} />
          </Grid>
          <Note>FCR = মোট ফিড ÷ মোট জীবিত ওজন। যত কম, তত ভালো। FCR ০.১ বাড়লে ১০০০ মুরগিতে প্রায় ১৮০ কেজি বেশি ফিড লাগে।</Note>
        </>
      ) : (
        <>
          <Grid>
            <NumField label="কত দিন পর্যন্ত পালবেন" value={target} onChange={setTarget} />
            <NumField label="মৃত্যু ধরে নিন (পিস)" value={dead} onChange={setDead} />
          </Grid>
          <Grid cols={3}>
            <Stat label="মোট ফিড" value={`${Math.round(plan.totalKg).toLocaleString('en-US')} কেজি`} />
            <Stat label="৫০ কেজির বস্তা" value={`${Math.ceil(plan.totalBags)} টি`} tone="good" />
            <Stat label="শেষ সপ্তাহে প্রতিদিন" value={`${fix(plan.rows[plan.rows.length - 1]?.perDayKg || 0, 1)} কেজি`} />
          </Grid>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-2 text-left">সপ্তাহ</th><th className="p-2">প্রতিদিন (কেজি)</th><th className="p-2">সপ্তাহে (কেজি)</th><th className="p-2">বস্তা</th></tr></thead>
              <tbody>
                {plan.rows.map((r) => (
                  <tr key={r.week} className="border-t border-slate-100 text-center">
                    <td className="p-2 text-left font-bold">{r.week}ম</td><td className="p-2">{fix(r.perDayKg, 1)}</td><td className="p-2">{Math.round(r.kg)}</td><td className="p-2 font-bold">{fix(r.bags, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>ব্রয়লারের ক্যাটালগভিত্তিক গড় খাবারের হিসাব (আনুমানিক)। জাত, আবহাওয়া ও ফিডের মানে কমবেশি হয়।</Note>
        </>
      )}
    </div>
  );
}
