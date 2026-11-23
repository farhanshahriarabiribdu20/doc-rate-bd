import React from 'react';
import { Note, Stat, Grid, fix, money, inputCls, useSaved } from './ui';
import { INGREDIENTS, FEED_TARGETS, feedMix } from '../../utils/farmCalc';

const DEFAULT_ROWS = [
  { key: 'maize', pct: 58.5, price: 30 },
  { key: 'sbm', pct: 33, price: 60 },
  { key: 'oil', pct: 4.5, price: 150 },
  { key: 'dcp', pct: 2, price: 50 },
  { key: 'limestone', pct: 1.2, price: 10 },
  { key: 'salt', pct: 0.3, price: 20 },
  { key: 'premix', pct: 0.5, price: 300 }
];

const status = (v, [lo, hi]) => (v < lo ? ['কম', 'bad'] : v > hi ? ['বেশি', 'warn'] : ['ঠিক আছে', 'good']);

export default function FeedMix() {
  const [rows, setRows] = useSaved('fn_tools_feedmix', DEFAULT_ROWS);
  const r = feedMix(rows);
  const upd = (i, k, v) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: v === '' ? '' : k === 'key' ? v : Number(v) } : x)));
  const unused = Object.keys(INGREDIENTS).filter((k) => !rows.some((x) => x.key === k));
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_4.5rem_4.5rem_2rem] gap-2 text-[11px] font-bold text-slate-500 px-1"><span>উপাদান</span><span className="text-center">%</span><span className="text-center">৳/কেজি</span><span /></div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_4.5rem_4.5rem_2rem] gap-2 items-center">
            <select value={row.key} onChange={(e) => upd(i, 'key', e.target.value)} className={inputCls}>
              {Object.entries(INGREDIENTS).filter(([k]) => k === row.key || unused.includes(k)).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <input type="number" step="0.1" value={row.pct} onChange={(e) => upd(i, 'pct', e.target.value)} className={`${inputCls} text-center px-1`} />
            <input type="number" value={row.price} onChange={(e) => upd(i, 'price', e.target.value)} className={`${inputCls} text-center px-1`} />
            <button onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="মুছুন" className="text-slate-400 hover:text-rose-600 cursor-pointer text-lg">×</button>
          </div>
        ))}
        <div className="flex gap-3 pt-1">
          {unused.length > 0 && <button onClick={() => setRows([...rows, { key: unused[0], pct: 0, price: 0 }])} className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">+ উপাদান যোগ করুন</button>}
          <button onClick={() => setRows(DEFAULT_ROWS)} className="text-xs font-bold text-slate-500 hover:underline cursor-pointer">নমুনা ফর্মুলা</button>
        </div>
      </div>
      <Grid cols={4}>
        <Stat label="মোট %" value={fix(r.total, 1)} tone={Math.abs(r.total - 100) < 0.05 ? 'good' : 'bad'} sub={Math.abs(r.total - 100) < 0.05 ? '' : '১০০ হতে হবে'} />
        <Stat label="প্রোটিন (CP)" value={`${fix(r.cp, 1)}%`} />
        <Stat label="শক্তি (ME)" value={`${Math.round(r.me)} kcal`} />
        <Stat label="প্রতি কেজি খরচ" value={`৳${fix(r.costPerKg, 1)}`} sub={`বস্তা (৫০ কেজি): ${money(r.costPerBag)}`} tone="warn" />
      </Grid>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.entries(FEED_TARGETS).map(([k, t]) => {
          const [cs, ct] = status(r.cp, t.cp);
          const [es, et] = status(r.me, t.me);
          const tone = { good: 'bg-emerald-50 border-emerald-200', bad: 'bg-rose-50 border-rose-200', warn: 'bg-amber-50 border-amber-200' };
          return (
            <div key={k} className="rounded-xl border border-slate-200 p-3 text-xs">
              <p className="font-black text-slate-900 mb-1.5">{t.label}</p>
              <p className={`rounded-lg border px-2 py-1 mb-1 ${tone[ct]}`}>প্রোটিন {t.cp[0]}–{t.cp[1]}%: <b>{cs}</b></p>
              <p className={`rounded-lg border px-2 py-1 ${tone[et]}`}>শক্তি {t.me[0]}–{t.me[1]}: <b>{es}</b></p>
            </div>
          );
        })}
      </div>
      <Note>উপাদানের পুষ্টিমান সাধারণ গড় ধরা হয়েছে। এই হিসাবে ক্যালসিয়াম, ফসফরাস, অ্যামাইনো অ্যাসিড ধরা হয়নি, তাই ফর্মুলা চালুর আগে পুষ্টিবিদের পরামর্শ নিন।</Note>
    </div>
  );
}
