import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { submitRate } from '../services/api';
import { ZONES, ZONE_GROUPS } from '../data/zones';

// Rates a visitor can tell us for a mokam (everything is optional, but at least one is needed).
export const READY_SUBMIT_FIELDS = [
  { key: 'broilerGrill', bn: 'ব্রয়লার (গ্রিল)', en: 'Broiler (Grill)', unit: '৳/কেজি' },
  { key: 'broilerMedium', bn: 'ব্রয়লার (মিডিয়াম)', en: 'Broiler (Medium)', unit: '৳/কেজি' },
  { key: 'broilerBig', bn: 'ব্রয়লার (বড়)', en: 'Broiler (Big)', unit: '৳/কেজি' },
  { key: 'colorBird', bn: 'কালার বার্ড', en: 'Color bird', unit: '৳/কেজি' },
  { key: 'sonali', bn: 'সোনালী', en: 'Sonali', unit: '৳/কেজি' },
  { key: 'eggBrown', bn: 'লাল ডিম', en: 'Brown egg', unit: '৳/পিস' },
  { key: 'eggWhite', bn: 'সাদা ডিম', en: 'White egg', unit: '৳/পিস' },
  { key: 'psCull', bn: 'পিএস কাল', en: 'PS cull', unit: '৳/কেজি' }
];

/**
 * Visitors propose a rate. Nothing is published: it goes to the admin's approval list.
 */
export default function RateSubmitModal({ lang = 'bn', readyRates = [], docRates = [], initialKind = 'ready', onClose }) {
  const bn = lang === 'bn';
  const [kind, setKind] = useState(initialKind);
  const [targetId, setTargetId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [values, setValues] = useState({});
  const [rate, setRate] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState('idle'); // idle | sending | saved | failed
  const [error, setError] = useState('');

  const targets = kind === 'ready'
    ? readyRates.map((r) => ({ id: r.id, label: `${r.regionBn || r.regionEn}${r.regionEn && r.regionBn && r.regionBn !== r.regionEn ? ` (${r.regionEn})` : ''}` }))
    : docRates.map((r) => ({ id: r.id, label: `${r.company} — ${r.breed}` }));
  const target = targets.find((t) => t.id === targetId);

  const hasValue = kind === 'ready' ? Object.values(values).some((v) => String(v).trim() !== '') : String(rate).trim() !== '';

  const switchKind = (k) => { setKind(k); setTargetId(''); setError(''); setStatus('idle'); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    setError('');
    if (!target) { setError(bn ? (kind === 'ready' ? 'মোকাম বেছে নিন।' : 'কোম্পানি/ব্রিড বেছে নিন।') : 'Please choose one.'); return; }
    if (!hasValue) { setError(bn ? 'অন্তত একটি রেট লিখুন।' : 'Enter at least one rate.'); return; }
    setStatus('sending');
    const result = await submitRate({
      kind,
      targetId,
      targetLabel: target.label,
      ...(kind === 'ready'
        ? { values: Object.fromEntries(Object.entries(values).filter(([, v]) => String(v).trim() !== '')) }
        : { rate, zoneId }),
      name: name.trim(),
      phone: phone.trim(),
      note: note.trim(),
      website
    });
    if (result.ok) {
      setStatus('saved');
    } else {
      setStatus('failed');
      setError(result.error || (bn ? 'পাঠানো যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।' : 'Could not send. Please try again.'));
    }
  };

  const input = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 bg-emerald-900 text-white rounded-t-3xl">
          <div>
            <h3 className="font-black text-base">{bn ? '✍️ আপনার এলাকার রেট জানান' : '✍️ Share a rate'}</h3>
            <p className="text-[11px] text-emerald-100">{bn ? 'যাচাই করে অ্যাডমিন অনুমোদন দিলে সাইটে প্রকাশ হবে।' : 'Published after the admin verifies and approves it.'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {status === 'saved' ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
            <p className="font-black text-slate-900 text-lg">{bn ? 'ধন্যবাদ! রেট পাঠানো হয়েছে।' : 'Thank you! Your rate was sent.'}</p>
            <p className="text-sm text-slate-600">{bn ? 'অ্যাডমিন যাচাই করে অনুমোদন দিলে এটি ওয়েবসাইটে দেখা যাবে।' : 'It will appear on the site once the admin approves it.'}</p>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm cursor-pointer">{bn ? 'ঠিক আছে' : 'Done'}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[['ready', bn ? '🍗 রেডি মুরগি/ডিম (মোকাম)' : '🍗 Ready birds/eggs'], ['doc', bn ? '🐣 বাচ্চার (DOC) রেট' : '🐣 DOC rate']].map(([k, label]) => (
                <button key={k} type="button" onClick={() => switchKind(k)} className={`px-3 py-2.5 rounded-xl text-xs font-black border-2 cursor-pointer transition ${kind === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{kind === 'ready' ? (bn ? 'মোকাম *' : 'Mokam *') : (bn ? 'কোম্পানি ও ব্রিড *' : 'Company & breed *')}</label>
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={input}>
                <option value="">{bn ? '— বেছে নিন —' : '— choose —'}</option>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {kind === 'ready' ? (
              <div className="grid grid-cols-2 gap-3">
                {READY_SUBMIT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? f.bn : f.en} <span className="font-normal text-slate-500">({f.unit})</span></label>
                    <input type="number" inputMode="decimal" step="any" min="0" value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className={input} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? 'বাচ্চার রেট (৳) *' : 'Chick rate (৳) *'}</label>
                  <input type="number" inputMode="decimal" step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={input} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? 'কোন জোনের রেট' : 'Zone'}</label>
                  <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={input}>
                    <option value="">{bn ? 'সারা দেশ' : 'Nationwide'}</option>
                    {ZONE_GROUPS.map((g) => (
                      <optgroup key={g.id} label={bn ? g.bn : g.en}>
                        {ZONES.filter((z) => z.group === g.id).map((z) => <option key={z.id} value={z.id}>{bn ? z.bn : z.en}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? 'আপনার নাম' : 'Your name'}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={input} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? 'ফোন (যাচাইয়ের জন্য)' : 'Phone (for verification)'}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} className={input} />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? 'মন্তব্য (ঐচ্ছিক)' : 'Note (optional)'}</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={input} placeholder={bn ? 'যেমন: আজ সকালের রেট, পাইকারি' : 'e.g. this morning, wholesale'} />
            </div>
            <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden="true" />

            {error && (
              <div className="flex items-start gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={status === 'sending'} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm cursor-pointer">
              {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {bn ? 'রেট পাঠান' : 'Send rate'}
            </button>
            <p className="text-[11px] text-slate-500 text-center">{bn ? 'আপনার পাঠানো রেট সরাসরি প্রকাশ হয় না — আগে অ্যাডমিন যাচাই করেন।' : 'Rates are never published directly — the admin checks them first.'}</p>
          </form>
        )}
      </div>
    </div>
  );
}
