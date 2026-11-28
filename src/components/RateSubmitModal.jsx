import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { submitRate } from '../services/api';
import { ZONES, ZONE_GROUPS } from '../data/zones';
import { recordRate, bnNum } from '../utils/contributor';

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

const PREF_KEY = 'fn_rate_pref';
const readPref = () => { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch { return {}; } };
const savePref = (p) => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* private mode: nothing to remember */ } };

const isEgg = (key) => /^egg/.test(key);
const fmt = (n) => String(Math.round(Number(n) * 100) / 100);
const num = (v) => (String(v).trim() === '' ? NaN : Number(v));

/** − / number / + : tap to move a rate away from today's one, or type it. */
function Stepper({ value, base, steps, onChange, className }) {
  const bump = (d) => {
    const from = Number.isFinite(num(value)) ? num(value) : Number(base) || 0;
    onChange(fmt(Math.max(0, from + d)));
  };
  const btn = 'shrink-0 px-2 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-black text-slate-700 cursor-pointer select-none';
  return (
    <div className="flex items-stretch gap-1">
      {steps.slice().reverse().map((d) => <button type="button" key={`-${d}`} onClick={() => bump(-d)} className={btn}>−{d}</button>)}
      <input type="number" inputMode="decimal" step="any" min="0" value={value} placeholder={base ? fmt(base) : ''} onChange={(e) => onChange(e.target.value)} className={`min-w-0 flex-1 text-center font-black ${className}`} />
      {steps.map((d) => <button type="button" key={`+${d}`} onClick={() => bump(d)} className={btn}>+{d}</button>)}
    </div>
  );
}

/**
 * Visitors send a rate: pick a company / mokam, tap the rate up or down from today's one (or type it), send.
 * No name or phone is needed; the choices are remembered in the browser. It goes live at once, tagged "ইউজারের দেওয়া রেট".
 */
export default function RateSubmitModal({ lang = 'bn', readyRates = [], docRates = [], initialKind = 'ready', onSent, onClose }) {
  const bn = lang === 'bn';
  const pref = readPref();
  const [kind, setKind] = useState(initialKind);
  const [targetId, setTargetId] = useState(pref[initialKind === 'doc' ? 'docTarget' : 'readyTarget'] || '');
  const [zoneId, setZoneId] = useState(pref.zoneId || '');
  const [values, setValues] = useState({});
  const [rate, setRate] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [name, setName] = useState(pref.name || '');
  const [phone, setPhone] = useState(pref.phone || '');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState('idle'); // idle | sending | saved | failed
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const targets = kind === 'ready'
    ? readyRates.map((r) => ({ id: r.id, label: `${r.regionBn || r.regionEn}${r.regionEn && r.regionBn && r.regionBn !== r.regionEn ? ` (${r.regionEn})` : ''}` }))
    : docRates.map((r) => ({ id: r.id, label: `${r.company} — ${r.breed}` }));
  const target = targets.find((t) => t.id === targetId);
  const item = (kind === 'ready' ? readyRates : docRates).find((r) => r.id === targetId);

  // today's rate on the site, the starting point for the − / + buttons
  const docBase = item ? Number((zoneId && item.zoneRates?.[zoneId]) || item.todayRate) || 0 : 0;
  const readyFields = READY_SUBMIT_FIELDS.filter((f) => item && (showAllFields || Number(item[f.key]) > 0));
  const hasMoreFields = item && READY_SUBMIT_FIELDS.some((f) => !(Number(item[f.key]) > 0));

  const hasValue = kind === 'ready' ? Object.values(values).some((v) => String(v).trim() !== '') : String(rate).trim() !== '';

  const switchKind = (k) => {
    setKind(k); setTargetId(readPref()[k === 'doc' ? 'docTarget' : 'readyTarget'] || '');
    setValues({}); setRate(''); setShowAllFields(false); setError(''); setStatus('idle');
  };
  const pickTarget = (id) => { setTargetId(id); setValues({}); setRate(''); setShowAllFields(false); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    setError('');
    if (!target) { setError(bn ? (kind === 'ready' ? 'মোকাম বেছে নিন।' : 'কোম্পানি/ব্রিড বেছে নিন।') : 'Please choose one.'); return; }
    if (!hasValue) { setError(bn ? 'রেট লিখুন বা + / − চাপুন।' : 'Enter a rate or tap + / −.'); return; }
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
      savePref({ ...readPref(), [kind === 'doc' ? 'docTarget' : 'readyTarget']: targetId, ...(kind === 'doc' ? { zoneId } : {}), name: name.trim(), phone: phone.trim() });
      setStats(recordRate(result.who));
      setStatus('saved');
      onSent?.();
    } else {
      setStatus('failed');
      setError(result.error || (bn ? 'পাঠানো যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।' : 'Could not send. Please try again.'));
    }
  };

  const again = () => { setValues({}); setRate(''); setNote(''); setError(''); setStatus('idle'); setTargetId(''); };

  const input = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const tab = (active) => `flex-1 px-3 py-2.5 rounded-xl text-sm font-black cursor-pointer ${active ? 'bg-emerald-700 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-emerald-900 text-white rounded-t-3xl">
          <div>
            <h3 className="font-black text-base">{bn ? '✍️ আপনার এলাকার রেট জানান' : '✍️ Share a rate'}</h3>
            <p className="text-[11px] text-emerald-100">{bn ? 'নাম বা ফোন লাগবে না। পাঠালেই "ইউজারের দেওয়া রেট" হিসেবে প্রকাশ হবে।' : 'No name or phone needed. Goes live tagged "Provided by user".'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {status === 'saved' ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
            <p className="font-black text-slate-900 text-lg">{bn ? 'ধন্যবাদ! আপনার রেট সাইটে প্রকাশ হয়েছে।' : 'Thank you! Your rate is now live.'}</p>
            <p className="text-sm text-slate-600">{bn ? 'রেটটি "ইউজারের দেওয়া রেট" হিসেবে চিহ্নিত হয়ে ওয়েবসাইটে দেখা যাবে (কিছুক্ষণ সময় লাগতে পারে)।' : 'It shows on the site tagged "Provided by user" (it can take a short moment).'}</p>
            {stats && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-slate-800 space-y-1.5">
                <p className="font-black">{stats.badge?.icon} আপনি মোট {bnNum(stats.total)}টি রেট দিয়েছেন{stats.streak > 1 ? ` · 🔥 টানা ${bnNum(stats.streak)} দিন` : ''}</p>
                {stats.nextBadge
                  ? <><div className="h-2.5 rounded-full bg-amber-200 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${Math.max(4, stats.pct)}%` }} /></div>
                    <p className="text-xs font-bold text-slate-600">আর {bnNum(stats.nextBadge.min - stats.total)}টি রেট দিলেই {stats.nextBadge.icon} {stats.nextBadge.name} ব্যাজ পাবেন</p></>
                  : <p className="text-xs font-bold text-emerald-800">🎉 আপনি সর্বোচ্চ ব্যাজে আছেন, ধন্যবাদ!</p>}
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <button onClick={again} className="px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-800 font-black text-sm cursor-pointer">{bn ? 'আরেকটি রেট দিন' : 'Send another'}</button>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm cursor-pointer">{bn ? 'ঠিক আছে' : 'Done'}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => switchKind('doc')} className={tab(kind === 'doc')}>🐣 {bn ? 'বাচ্চার (DOC) রেট' : 'DOC rate'}</button>
              <button type="button" onClick={() => switchKind('ready')} className={tab(kind === 'ready')}>🐔 {bn ? 'রেডি মুরগী ও ডিম' : 'Ready bird & egg'}</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{kind === 'ready' ? (bn ? 'মোকাম *' : 'Mokam *') : (bn ? 'কোম্পানি ও ব্রিড *' : 'Company & breed *')}</label>
              <select value={targetId} onChange={(e) => pickTarget(e.target.value)} className={input}>
                <option value="">{bn ? '— বেছে নিন —' : '— choose —'}</option>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {target && kind === 'doc' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {bn ? 'আপনি যে রেটে পাচ্ছেন (৳) *' : 'Rate you get (৳) *'}
                    {docBase > 0 && <span className="font-normal text-slate-500"> — {bn ? `সাইটে এখন ${fmt(docBase)}` : `site shows ${fmt(docBase)}`}</span>}
                  </label>
                  <Stepper value={rate} base={docBase} steps={[1, 5]} onChange={setRate} className={input} />
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

            {target && kind === 'ready' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-600">{bn ? 'যে রেটগুলো জানেন শুধু সেগুলো দিন। ঘর খালি রাখলে সেটা যাবে না।' : 'Fill only the rates you know; empty ones are not sent.'}</p>
                {readyFields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {bn ? f.bn : f.en} <span className="font-normal text-slate-500">({f.unit}){Number(item[f.key]) > 0 ? ` — ${bn ? 'এখন' : 'now'} ${fmt(item[f.key])}` : ''}</span>
                    </label>
                    <Stepper value={values[f.key] ?? ''} base={item[f.key]} steps={isEgg(f.key) ? [0.5, 1] : [1, 5]} onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))} className={input} />
                  </div>
                ))}
                {hasMoreFields && !showAllFields && (
                  <button type="button" onClick={() => setShowAllFields(true)} className="text-xs font-black text-emerald-800 underline cursor-pointer">{bn ? '+ আরও রেট যোগ করুন' : '+ Add more rates'}</button>
                )}
              </div>
            )}

            <div>
              <button type="button" onClick={() => setShowMore((v) => !v)} className="text-xs font-bold text-slate-600 underline cursor-pointer">
                {showMore ? (bn ? '▲ কম দেখান' : '▲ Less') : (bn ? '▼ নাম, ফোন, মন্তব্য (ঐচ্ছিক)' : '▼ Name, phone, note (optional)')}
              </button>
              {showMore && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? 'আপনার নাম' : 'Your name'}</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={input} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? 'ফোন' : 'Phone'}</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} className={input} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">{bn ? 'মন্তব্য' : 'Note'}</label>
                    <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={input} placeholder={bn ? 'যেমন: আজ সকালের রেট, পাইকারি' : 'e.g. this morning, wholesale'} />
                  </div>
                </div>
              )}
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
            <p className="text-[11px] text-slate-500 text-center">{bn ? 'সঠিক রেট দিন — ভুল রেট অ্যাডমিন মুছে দিতে পারেন।' : 'Please send the correct rate — the admin can remove wrong ones.'}</p>
          </form>
        )}
      </div>
    </div>
  );
}
