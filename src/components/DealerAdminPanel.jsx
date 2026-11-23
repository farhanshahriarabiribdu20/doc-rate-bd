import React, { useState } from 'react';
import { Plus, Trash2, Save, ClipboardPaste } from 'lucide-react';
import { DISTRICTS } from '../data/districts';
import { saveDealers } from '../services/api';

const PHONE_RE = /^(?:\+?88)?(01[3-9]\d{8})$/;
const en = (v) => String(v || '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
const blank = { name: '', company: '', district: '', address: '', phone: '', note: '' };
const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm';

export default function DealerAdminPanel({ adminKey, dealers, onChange, showToast }) {
  const [form, setForm] = useState(blank);
  const [paste, setPaste] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (list) => { onChange(list); setDirty(true); };
  const add = () => {
    if (form.name.trim().length < 2) return showToast?.('নাম দিন');
    if (!PHONE_RE.test(en(form.phone).replace(/[\s-]/g, ''))) return showToast?.('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
    set([{ ...form, id: `dl-${Date.now()}` }, ...dealers]);
    setForm(blank);
  };
  // lines: কোম্পানি, নাম, জেলা, ঠিকানা, ফোন  (comma or tab separated, e.g. copied from Excel)
  const importPaste = () => {
    const added = [];
    let bad = 0;
    paste.split('\n').forEach((line, i) => {
      if (!line.trim()) return;
      const p = line.split(/\t|,/).map((x) => x.trim());
      const [company, name, district, address, phone] = p;
      if (!name || !PHONE_RE.test(en(phone || '').replace(/[\s-]/g, ''))) { bad += 1; return; }
      added.push({ id: `dl-${Date.now()}-${i}`, company, name, district, address, phone, note: '' });
    });
    if (added.length) set([...added, ...dealers]);
    setPaste('');
    showToast?.(`${added.length} জন যোগ হয়েছে${bad ? `, ${bad} লাইন বাদ (নাম/ফোন ঠিক নেই)` : ''}`);
  };
  const save = async () => {
    setSaving(true);
    const r = await saveDealers(adminKey, dealers);
    setSaving(false);
    if (r.ok) { onChange(r.dealers); setDirty(false); showToast?.('ডিলার তালিকা সেভ হয়েছে'); }
    else showToast?.(r.error);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black text-slate-800">ডিলার / এজেন্ট ({dealers.length})</h3>
        <button onClick={save} disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white disabled:opacity-40 cursor-pointer">
          <Save className="w-4 h-4" /> {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
        </button>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={inp} placeholder="নাম *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inp} placeholder="কোম্পানি (যেমন: আকিজ)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <select className={inp} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
          <option value="">জেলা</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input className={inp} placeholder="মোবাইল *" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={`${inp} sm:col-span-2`} placeholder="ঠিকানা" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <button onClick={add} className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">
          <Plus className="w-4 h-4" /> তালিকায় যোগ করুন
        </button>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><ClipboardPaste className="w-4 h-4" /> একসাথে পেস্ট (Excel থেকে কপি)</p>
        <p className="text-[11px] text-slate-500">প্রতি লাইনে: কোম্পানি, নাম, জেলা, ঠিকানা, ফোন</p>
        <textarea className={`${inp} h-24`} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="আকিজ, করিম ট্রেডার্স, বগুড়া, শেরপুর রোড, 01712345678" />
        <button onClick={importPaste} disabled={!paste.trim()} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer">যোগ করুন</button>
      </div>

      <div className="space-y-2">
        {dealers.map((d) => (
          <div key={d.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 break-words">{d.name} <span className="text-xs font-normal text-slate-500">{d.company}</span></p>
              <p className="text-xs text-slate-500 break-words">{[d.address, d.district, d.phone].filter(Boolean).join(' · ')}</p>
            </div>
            <button onClick={() => set(dealers.filter((x) => x.id !== d.id))} aria-label="মুছুন" className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
