import React, { useState } from 'react';
import { Plus, Trash2, Save, ClipboardPaste } from 'lucide-react';
import { FEED_TYPES } from '../data/feedTypes';
import { saveFeeds } from '../services/feed';

const en = (v) => String(v || '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/[,\s]/g, '');
const blank = { company: '', product: '', type: FEED_TYPES[0], weight: '৫০ কেজি', price: '' };
const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm';
const validPrice = (p) => { const n = Number(en(p)); return Number.isFinite(n) && n >= 100 && n <= 20000; };

export default function FeedAdminPanel({ adminKey, feeds, onChange, showToast }) {
  const [form, setForm] = useState(blank);
  const [paste, setPaste] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (list) => { onChange(list); setDirty(true); };
  const add = () => {
    if (!form.company.trim() || !form.product.trim()) return showToast?.('কোম্পানি ও পণ্যের নাম দিন');
    if (!validPrice(form.price)) return showToast?.('সঠিক দাম দিন');
    set([{ ...form, price: Number(en(form.price)), id: `fd-${Date.now()}` }, ...feeds]);
    setForm({ ...blank, company: form.company, type: form.type });
  };
  // lines: কোম্পানি, প্রোডাক্ট, ধরন, ওজন, দাম  (ধরন/ওজন খালি রাখা যায়)
  const importPaste = () => {
    const added = []; let bad = 0;
    paste.split('\n').forEach((line, i) => {
      if (!line.trim()) return;
      const [company, product, type, weight, price] = line.split(/\t|,/).map((x) => x.trim());
      if (!company || !product || !validPrice(price)) { bad += 1; return; }
      added.push({ id: `fd-${Date.now()}-${i}`, company, product, type: FEED_TYPES.includes(type) ? type : 'অন্যান্য', weight: weight || '৫০ কেজি', price: Number(en(price)) });
    });
    if (added.length) set([...added, ...feeds]);
    setPaste('');
    showToast?.(`${added.length}টি যোগ হয়েছে${bad ? `, ${bad} লাইন বাদ (নাম/দাম ঠিক নেই)` : ''}`);
  };
  const setPrice = (id, v) => set(feeds.map((f) => (f.id === id ? { ...f, price: v === '' ? '' : Number(en(v)) || 0 } : f)));
  const save = async () => {
    setSaving(true);
    const r = await saveFeeds(adminKey, feeds.filter((f) => validPrice(f.price)));
    setSaving(false);
    if (r.ok) { onChange(r.feeds); setDirty(false); showToast?.('ফিডের দাম সেভ হয়েছে'); } else showToast?.(r.error);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black text-slate-800">ফিডের দাম ({feeds.length})</h3>
        <button onClick={save} disabled={!dirty || saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white disabled:opacity-40 cursor-pointer">
          <Save className="w-4 h-4" /> {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">দাম বদলে সেভ করলে সাইটে আগের দাম ও বাড়া/কমা নিজে থেকে দেখাবে।</p>

      <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={inp} placeholder="কোম্পানি *" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input className={inp} placeholder="পণ্যের নাম * (যেমন: ব্রয়লার স্টার্টার ক্রাম্বল)" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
        <select className={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {FEED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex gap-2">
          <input className={inp} placeholder="ওজন" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <input className={inp} placeholder="দাম ৳ *" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <button onClick={add} className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">
          <Plus className="w-4 h-4" /> তালিকায় যোগ করুন
        </button>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><ClipboardPaste className="w-4 h-4" /> একসাথে পেস্ট (Excel থেকে কপি)</p>
        <p className="text-[11px] text-slate-500">প্রতি লাইনে: কোম্পানি, পণ্য, ধরন, ওজন, দাম</p>
        <textarea className={`${inp} h-24`} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="আকিজ, স্টার্টার ক্রাম্বল, ব্রয়লার স্টার্টার, ৫০ কেজি, ৩২০০" />
        <button onClick={importPaste} disabled={!paste.trim()} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer">যোগ করুন</button>
      </div>

      <div className="space-y-2">
        {feeds.map((f) => (
          <div key={f.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 break-words">{f.product}</p>
              <p className="text-xs text-slate-500 break-words">{f.company} · {f.type} · {f.weight}</p>
            </div>
            <input value={f.price} onChange={(e) => setPrice(f.id, e.target.value)} inputMode="numeric" aria-label="দাম"
              className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-right" />
            <button onClick={() => set(feeds.filter((x) => x.id !== f.id))} aria-label="মুছুন" className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
