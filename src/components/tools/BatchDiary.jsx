import React, { useState } from 'react';
import { NumField, Stat, Note, Grid, Field, inputCls, money, signed, fix, useSaved } from './ui';
import { isoToday, daysBetween, fcrOf, n } from '../../utils/farmCalc';

const uid = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export default function BatchDiary() {
  const [batches, setBatches] = useSaved('fn_tools_diary', []);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(null); // new-batch form
  const [entry, setEntry] = useState({ date: isoToday(), feedKg: '', dead: '', expense: '', note: '' });
  const [copied, setCopied] = useState(false);

  const batch = batches.find((b) => b.id === (activeId || batches[0]?.id));
  const patch = (id, fn) => setBatches(batches.map((b) => (b.id === id ? fn(b) : b)));

  const createBatch = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const b = { id: uid(), name: form.name.trim(), start: form.start, chicks: n(form.chicks), chickPrice: n(form.chickPrice), bag: n(form.bag), entries: [], sale: { kg: '', rate: '' } };
    setBatches([b, ...batches]);
    setActiveId(b.id);
    setForm(null);
  };

  const addEntry = (e) => {
    e.preventDefault();
    if (!entry.feedKg && !entry.dead && !entry.expense && !entry.note) return;
    patch(batch.id, (b) => ({ ...b, entries: [...b.entries, { id: uid(), ...entry, feedKg: n(entry.feedKg), dead: n(entry.dead), expense: n(entry.expense) }].sort((a, c) => a.date.localeCompare(c.date)) }));
    setEntry({ ...entry, feedKg: '', dead: '', expense: '', note: '' });
  };

  const sum = (k) => (batch ? batch.entries.reduce((s, x) => s + n(x[k]), 0) : 0);
  const feedKg = sum('feedKg');
  const dead = sum('dead');
  const otherExp = sum('expense');
  const feedCost = (feedKg * n(batch?.bag)) / 50;
  const chickCost = batch ? batch.chicks * batch.chickPrice : 0;
  const total = chickCost + feedCost + otherExp;
  const soldKg = n(batch?.sale?.kg);
  const revenue = soldKg * n(batch?.sale?.rate);
  const profit = revenue - total;
  const age = batch ? Math.max(1, daysBetween(batch.start, isoToday()) + 1) : 0;
  const mort = batch && batch.chicks > 0 ? (dead / batch.chicks) * 100 : 0;
  const fcr = fcrOf(feedKg, soldKg);

  const report = () => {
    const t = `🐔 ব্যাচ রিপোর্ট: ${batch.name}\nবাচ্চা ${batch.chicks} টি, ${batch.start} থেকে ${age} দিন\nমৃত্যু ${dead} টি (${fix(mort, 1)}%)\nমোট ফিড ${Math.round(feedKg)} কেজি\nমোট খরচ ${money(total)}${soldKg ? `\nবিক্রি ${soldKg} কেজি, FCR ${fix(fcr)}\n${profit >= 0 ? 'লাভ' : 'ক্ষতি'} ${signed(profit)}` : ''}\n— fosholnexa.com`;
    navigator.clipboard?.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  if (form) {
    return (
      <form onSubmit={createBatch} className="space-y-4">
        <Grid>
          <Field label="ব্যাচের নাম"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: ডিসেম্বর ব্যাচ-১" className={inputCls} autoFocus /></Field>
          <Field label="বাচ্চা তোলার তারিখ"><input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inputCls} /></Field>
          <NumField label="বাচ্চার সংখ্যা" value={form.chicks} onChange={(v) => setForm({ ...form, chicks: v })} />
          <NumField label="বাচ্চার দাম (৳/পিস)" value={form.chickPrice} onChange={(v) => setForm({ ...form, chickPrice: v })} />
          <NumField label="ফিড বস্তা ৫০ কেজি (৳)" value={form.bag} onChange={(v) => setForm({ ...form, bag: v })} />
        </Grid>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold cursor-pointer">ব্যাচ শুরু করুন</button>
          <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer">বাতিল</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {batches.map((b) => (
          <button key={b.id} onClick={() => setActiveId(b.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${b.id === batch?.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}>{b.name}</button>
        ))}
        <button onClick={() => setForm({ name: '', start: isoToday(), chicks: 1000, chickPrice: 40, bag: 3400 })} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-emerald-400 text-emerald-700 cursor-pointer">+ নতুন ব্যাচ</button>
      </div>

      {!batch ? (
        <Note>এখনো কোনো ব্যাচ নেই। "নতুন ব্যাচ" চেপে বাচ্চা তোলার হিসাব দিয়ে শুরু করুন, তারপর প্রতিদিনের ফিড, মৃত্যু ও খরচ লিখুন। শেষে লাভ-ক্ষতি ও FCR নিজে নিজে বের হবে।</Note>
      ) : (
        <>
          <Grid cols={4}>
            <Stat label="বয়স" value={`${age} দিন`} />
            <Stat label="মৃত্যু" value={`${dead} টি`} sub={`${fix(mort, 1)}%`} tone={mort <= 4 ? 'good' : mort <= 7 ? 'warn' : 'bad'} />
            <Stat label="মোট ফিড" value={`${Math.round(feedKg)} কেজি`} sub={`${fix(feedKg / 50, 1)} বস্তা`} />
            <Stat label="মোট খরচ" value={money(total)} sub={`ফিড ${money(feedCost)}`} tone="warn" />
          </Grid>

          <form onSubmit={addEntry} className="rounded-2xl border border-slate-200 p-3 space-y-3">
            <p className="text-xs font-black text-slate-800">আজকের হিসাব লিখুন</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Field label="তারিখ"><input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} className={inputCls} /></Field>
              <NumField label="ফিড (কেজি)" value={entry.feedKg} onChange={(v) => setEntry({ ...entry, feedKg: v })} />
              <NumField label="মৃত্যু (পিস)" value={entry.dead} onChange={(v) => setEntry({ ...entry, dead: v })} />
              <NumField label="অন্য খরচ (৳)" value={entry.expense} onChange={(v) => setEntry({ ...entry, expense: v })} />
            </div>
            <div className="flex gap-2">
              <input value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} placeholder="নোট (ওষুধ, টিকা, ইত্যাদি)" className={inputCls} />
              <button type="submit" className="px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold cursor-pointer shrink-0">যোগ</button>
            </div>
          </form>

          {batch.entries.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 sticky top-0"><tr><th className="p-2 text-left">তারিখ</th><th className="p-2">ফিড</th><th className="p-2">মৃত্যু</th><th className="p-2">খরচ</th><th className="p-2 text-left">নোট</th><th /></tr></thead>
                <tbody>
                  {batch.entries.map((x) => (
                    <tr key={x.id} className="border-t border-slate-100 text-center">
                      <td className="p-2 text-left whitespace-nowrap">{x.date.slice(5)}</td><td className="p-2">{x.feedKg || ''}</td><td className="p-2">{x.dead || ''}</td><td className="p-2">{x.expense || ''}</td><td className="p-2 text-left text-slate-500">{x.note}</td>
                      <td className="p-1"><button onClick={() => patch(batch.id, (b) => ({ ...b, entries: b.entries.filter((e) => e.id !== x.id) }))} aria-label="মুছুন" className="text-slate-400 hover:text-rose-600 cursor-pointer">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
            <p className="text-xs font-black text-emerald-900">বিক্রির পর (ব্যাচ শেষ)</p>
            <Grid>
              <NumField label="মোট বিক্রি (কেজি)" value={batch.sale?.kg ?? ''} onChange={(v) => patch(batch.id, (b) => ({ ...b, sale: { ...b.sale, kg: v } }))} />
              <NumField label="বিক্রয় দর (৳/কেজি)" value={batch.sale?.rate ?? ''} onChange={(v) => patch(batch.id, (b) => ({ ...b, sale: { ...b.sale, rate: v } }))} />
            </Grid>
            {soldKg > 0 && (
              <Grid cols={3}>
                <Stat label="FCR" value={fix(fcr)} tone={fcr <= 1.7 ? 'good' : fcr <= 1.9 ? 'warn' : 'bad'} />
                <Stat label="আয়" value={money(revenue)} />
                <Stat label={profit >= 0 ? 'লাভ' : 'ক্ষতি'} value={signed(profit)} tone={profit >= 0 ? 'good' : 'bad'} sub={`প্রতি কেজিতে ${signed(profit / soldKg)}`} />
              </Grid>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={report} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">{copied ? '✓ কপি হয়েছে' : 'রিপোর্ট কপি করুন'}</button>
            <button onClick={() => { if (window.confirm(`"${batch.name}" ব্যাচ মুছে ফেলবেন?`)) { setBatches(batches.filter((b) => b.id !== batch.id)); setActiveId(null); } }} className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer">ব্যাচ মুছুন</button>
          </div>
          <Note>ডায়েরি শুধু এই ফোন/ব্রাউজারে সেভ থাকে (সার্ভারে যায় না), তাই ব্রাউজারের ডেটা মুছলে হারিয়ে যাবে। গুরুত্বপূর্ণ হিসাব "রিপোর্ট কপি" করে নিজের কাছে রাখুন।</Note>
        </>
      )}
    </div>
  );
}
