import React, { useEffect, useState, useCallback } from 'react';
import { DISTRICT_GROUPS } from '../data/districts';
import { compressImage } from '../utils/compressImage';
import { X, Loader2, ImagePlus, CheckCircle2, AlertTriangle, Trash2, RefreshCw, BadgeCheck, PlusCircle } from 'lucide-react';
import {
  getMyAds, addMyAd, removeMyAd, getProfile, saveProfile, postListing, fetchMine, updateListing,
  PRODUCT_OPTIONS, PRODUCT_BN, UNIT_OPTIONS, UNIT_BN
} from '../services/market';

const input = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const label = 'block text-xs font-bold text-slate-700 mb-1';
const bnNum = (n) => new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 2 }).format(n);

const STATUS = {
  pending: { text: 'অ্যাডমিনের অনুমোদনের অপেক্ষায়', cls: 'bg-amber-100 text-amber-800' },
  live: { text: 'সাইটে চালু আছে', cls: 'bg-emerald-100 text-emerald-800' },
  sold: { text: 'বিক্রি হয়ে গেছে', cls: 'bg-slate-200 text-slate-700' },
  hidden: { text: 'অ্যাডমিন লুকিয়েছে', cls: 'bg-red-100 text-red-700' },
  expired: { text: 'মেয়াদ শেষ', cls: 'bg-slate-200 text-slate-700' }
};

const MAX_PHOTOS = 1;
const emptyForm = { product: 'broiler', quantity: '', unit: 'kg', price: '', district: '', location: '', details: '' };

/**
 * Post an ad without any account: name, mobile number, location and the product. The ad waits for the
 * admin's approval unless the admin turned that off. This browser remembers its own ads (with a
 * private edit key) so the poster can mark them sold, renew or delete them.
 */
export default function SellerModal({ onClose, onChanged }) {
  const [profile, setProfile] = useState(() => ({ name: '', phone: '', ...getProfile() }));
  const [website, setWebsite] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [mine, setMine] = useState(null);
  const [photos, setPhotos] = useState([]); // compressed JPEG data URLs, at most MAX_PHOTOS
  const [view, setView] = useState(() => (getMyAds().length ? 'mine' : 'new')); // 'mine' | 'new'
  const [openedAt, setOpenedAt] = useState(() => Date.now());

  const loadMine = useCallback(async () => {
    const refs = getMyAds();
    if (!refs.length) { setMine([]); return; }
    const r = await fetchMine(refs);
    if (!r.ok) { setMine([]); return; }
    // ads the server no longer has (deleted / expired away) are forgotten
    const known = new Set(r.items.map((it) => it.id));
    refs.forEach((x) => { if (!known.has(x.id)) removeMyAd(x.id); });
    setMine(r.items);
  }, []);

  useEffect(() => { loadMine(); }, [loadMine]);

  // Phone photos are 3-8 MB: shrink them here so the upload is small and fast (target under ~400 KB).
  const addPhotos = async (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    setError('');
    const room = MAX_PHOTOS - photos.length;
    const out = [];
    for (const f of files.slice(0, room)) {
      try {
        let url = await compressImage(f, 1000, 0.75);
        if (url.length > 540000) url = await compressImage(f, 800, 0.6);
        if (url.length > 540000) { setError('একটি ছবি এখনো বড় থেকে গেছে, অন্য ছবি দিন'); continue; }
        out.push(url);
      } catch { setError('ছবিটি পড়া যায়নি, অন্য ছবি দিন'); }
    }
    if (files.length > room) setError(`সর্বোচ্চ ${MAX_PHOTOS}টি ছবি দেওয়া যায়`);
    if (out.length) setPhotos((p) => [...p, ...out].slice(0, MAX_PHOTOS));
  };

  const setP = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitListing = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    const r = await postListing({ ...form, name: profile.name, phone: profile.phone, website, images: photos, formMs: Date.now() - openedAt });
    setBusy(false);
    if (!r.ok) { setError(r.error || 'বিজ্ঞাপন জমা হয়নি'); return; }
    if (r.id && r.editKey) addMyAd(r.id, r.editKey);
    saveProfile({ name: profile.name, phone: profile.phone });
    setForm(emptyForm);
    setPhotos([]);
    setOpenedAt(Date.now());
    setView('mine');
    setNotice(r.status === 'pending' ? 'বিজ্ঞাপন জমা হয়েছে। অ্যাডমিন অনুমোদন দিলে সাইটে দেখা যাবে।' : 'বিজ্ঞাপন সাইটে চালু হয়েছে!');
    await loadMine();
    onChanged?.();
  };

  const act = async (id, op) => {
    if (op === 'delete' && !window.confirm('বিজ্ঞাপনটি মুছে ফেলবেন?')) return;
    setBusy(true); setError(''); setNotice('');
    const ad = getMyAds().find((x) => x.id === id);
    const r = await updateListing(id, ad?.key, op);
    setBusy(false);
    if (!r.ok) { setError(r.error || 'সমস্যা হয়েছে'); return; }
    if (op === 'delete') removeMyAd(id);
    await loadMine();
    onChanged?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-emerald-900 text-white rounded-t-3xl">
          <div>
            <h3 className="font-black text-base">🧑‍🌾 বিজ্ঞাপন দিন</h3>
            <p className="text-[11px] text-emerald-100">কোনো লগইন লাগবে না — নাম, মোবাইল নম্বর ও এলাকা দিলেই হবে।</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</div>}
          {notice && <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {notice}</div>}

          <>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setView('mine'); setNotice(''); }} className={`px-3 py-2.5 rounded-xl text-xs font-black border-2 cursor-pointer transition ${view === 'mine' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'}`}>📋 আমার বিজ্ঞাপন</button>
                <button onClick={() => { setView('new'); setNotice(''); }} className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-black border-2 cursor-pointer transition ${view === 'new' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'}`}><PlusCircle className="w-4 h-4" /> নতুন বিজ্ঞাপন</button>
              </div>

              {view === 'new' ? (
                <form onSubmit={submitListing} className="space-y-3">
                  <div>
                    <label className={label}>আপনার নাম / ফার্মের নাম *</label>
                    <input className={input} value={profile.name} onChange={setP('name')} maxLength={60} required autoComplete="name" placeholder="যেমন: রহিম পোল্ট্রি ফার্ম" />
                  </div>
                  <div>
                    <label className={label}>মোবাইল নম্বর * <span className="font-normal text-slate-500">(ক্রেতারা এই নম্বরে যোগাযোগ করবে)</span></label>
                    <input className={input} value={profile.phone} onChange={setP('phone')} inputMode="tel" autoComplete="tel" maxLength={20} required placeholder="01XXXXXXXXX" />
                  </div>
                  <div>
                    <label className={label}>কী বিক্রি করবেন? *</label>
                    <select className={input} value={form.product} onChange={setF('product')}>
                      {PRODUCT_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.emoji} {p.bn}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>পরিমাণ *</label>
                      <input type="number" min="1" step="any" className={input} value={form.quantity} onChange={setF('quantity')} required placeholder="যেমন: 500" />
                    </div>
                    <div>
                      <label className={label}>একক *</label>
                      <select className={input} value={form.unit} onChange={setF('unit')}>
                        {UNIT_OPTIONS.map((u) => <option key={u.key} value={u.key}>{u.bn}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={label}>{UNIT_BN[form.unit].per} দাম (৳) <span className="font-normal text-slate-500">— ফাঁকা রাখলে "দর আলোচনা সাপেক্ষে"</span></label>
                    <input type="number" min="0" step="any" className={input} value={form.price} onChange={setF('price')} placeholder="যেমন: 145" />
                  </div>
                  <div>
                    <label className={label}>জেলা *</label>
                    <select className={input} value={form.district} onChange={setF('district')} required>
                      <option value="">জেলা বাছাই করুন</option>
                      {DISTRICT_GROUPS.map((g) => (
                        <optgroup key={g.division} label={g.division}>
                          {g.districts.map((d) => <option key={d} value={d}>{d}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label}>এলাকা / ঠিকানা *</label>
                    <input className={input} value={form.location} onChange={setF('location')} maxLength={80} required placeholder="যেমন: কালিয়াকৈর, গাজীপুর" />
                  </div>
                  <div>
                    <label className={label}>অন্যান্য তথ্য <span className="font-normal text-slate-500">(ঐচ্ছিক, সর্বোচ্চ ৩০০ অক্ষর)</span></label>
                    <textarea className={input} rows={3} value={form.details} onChange={setF('details')} maxLength={300} placeholder="যেমন: ওজন ১.৮ কেজির মতো, ফার্ম থেকে সরাসরি, ডেলিভারি আছে" />
                  </div>
                  <div>
                    <label className={label}>ছবি <span className="font-normal text-slate-500">(ঐচ্ছিক, ১টি — ছবি থাকলে ক্রেতা বেশি আগ্রহ দেখায়)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((src, i) => (
                        <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} aria-label="ছবি সরান" className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {photos.length < MAX_PHOTOS && (
                        <label className="w-24 h-24 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 text-emerald-700 flex flex-col items-center justify-center gap-1 text-[11px] font-black cursor-pointer hover:bg-emerald-50">
                          <ImagePlus className="w-6 h-6" />
                          ছবি দিন
                          <input type="file" accept="image/*" className="hidden" onChange={addPhotos} />
                        </label>
                      )}
                    </div>
                  </div>
                  {/* honeypot: real people never see or fill this */}
                  <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" className="hidden" />
                  <button disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm cursor-pointer">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} বিজ্ঞাপন জমা দিন
                  </button>
                  <p className="text-[11px] text-slate-500">বিজ্ঞাপন ১০ দিন চালু থাকে। আপনার নাম ও নম্বর বিজ্ঞাপনের সাথে সবাইকে দেখানো হবে। অ্যাডমিন যাচাই করে অনুমোদন দিলে সাইটে দেখা যাবে।</p>
                </form>
              ) : (
                <div className="space-y-3">
                  {mine === null ? (
                    <div className="py-10 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                  ) : mine.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <div className="text-4xl">📭</div>
                      <p className="font-black text-slate-800">এই ফোন/ব্রাউজার থেকে কোনো বিজ্ঞাপন দেওয়া হয়নি</p>
                      <button onClick={() => setView('new')} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer">+ প্রথম বিজ্ঞাপন দিন</button>
                    </div>
                  ) : mine.map((it) => {
                    const st = STATUS[it.status] || STATUS.pending;
                    const canRenew = it.status === 'live' || it.status === 'pending' || it.status === 'expired';
                    return (
                      <div key={it.id} className="border border-slate-200 rounded-2xl p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-black text-slate-900">{(PRODUCT_BN[it.product] || PRODUCT_BN.other).emoji} {(PRODUCT_BN[it.product] || PRODUCT_BN.other).bn}</p>
                            <p className="text-xs text-slate-600">{bnNum(it.quantity)} {UNIT_BN[it.unit]?.bn} · {it.price > 0 ? `৳${bnNum(it.price)} ${UNIT_BN[it.unit]?.per}` : 'দর আলোচনা সাপেক্ষে'} · {it.location}</p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${st.cls}`}>{st.text}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {it.status !== 'sold' && it.status !== 'hidden' && (
                            <button disabled={busy} onClick={() => act(it.id, 'sold')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs cursor-pointer"><BadgeCheck className="w-3.5 h-3.5" /> বিক্রি হয়ে গেছে</button>
                          )}
                          {canRenew && (
                            <button disabled={busy} onClick={() => act(it.id, 'renew')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-black text-xs cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> আরও ১০ দিন</button>
                          )}
                          <button disabled={busy} onClick={() => act(it.id, 'delete')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> মুছুন</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </>
        </div>
      </div>
    </div>
  );
}
