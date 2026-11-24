import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Loader2, Save } from 'lucide-react';
import { galleryAdmin } from '../services/api';
import { compressImage } from '../utils/compressImage';

const TARGETS = [['all', 'দুই ট্যাবেই'], ['doc', 'বাচ্চার (DOC) ট্যাবে'], ['ready', 'রেডি মুরগি ট্যাবে']];
const input = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

/** Admin: upload rate pictures (they are shrunk in the browser first), caption them, choose the tab, delete. */
export default function GalleryAdminPanel({ adminKey, gallery, onChange, showToast }) {
  const images = gallery.images;
  const latest = useRef(gallery); // newest list + version, sent with every change so nothing older overwrites it
  useEffect(() => { if ((gallery.v || 0) >= (latest.current.v || 0)) latest.current = gallery; }, [gallery]);
  const send = async (payload) => {
    const r = await galleryAdmin(adminKey, { ...payload, known: latest.current.images, knownV: latest.current.v });
    if (r.ok && r.images) {
      latest.current = { images: r.images, v: r.v };
      onChange(latest.current);
    }
    return r;
  };
  const fileRef = useRef(null);
  const [caption, setCaption] = useState('');
  const [target, setTarget] = useState('all');
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState({}); // id -> { caption, target }

  const upload = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    if (!caption.trim()) { showToast('আগে ক্যাপশন লিখুন — ছবির নিচে সবাই এটা দেখবে (যেমন: আজকের রেডি ব্রয়লারের রেট)', 'error'); return; }
    setBusy(true);
    let done = 0;
    for (const file of files) {
      try {
        const dataUrl = await compressImage(file);
        const r = await send({ action: 'add', image: dataUrl, caption, target });
        if (!r.ok) { showToast(r.error || 'ছবি আপলোড হয়নি', 'error'); break; }
        done += 1;
      } catch { showToast(`"${file.name}" ছবিটি পড়া যায়নি`, 'error'); }
    }
    setBusy(false);
    // the caption stays in the box (handy when several pictures share it); change it for the next one
    if (done) showToast(`✅ ${done}টি ছবি প্রকাশ হয়েছে — ${TARGETS.find(([k]) => k === target)?.[1]} দেখাবে।`);
  };

  const editsRef = useRef(edits);
  editsRef.current = edits;
  const timers = useRef({});

  const save = async (img, quiet = false) => {
    clearTimeout(timers.current[img.id]);
    const ed = editsRef.current[img.id];
    if (!ed) return;
    const sent = { caption: ed.caption ?? img.caption, target: ed.target ?? img.target };
    const r = await send({ action: 'update', id: img.id, ...sent });
    if (r.ok) {
      // keep anything typed while the request was on its way
      setEdits((p) => {
        const cur = p[img.id];
        if (!cur || ((cur.caption ?? img.caption) === sent.caption && (cur.target ?? img.target) === sent.target)) {
          const n = { ...p }; delete n[img.id]; return n;
        }
        return p;
      });
      if (!quiet) showToast('✅ সংরক্ষিত।');
    } else showToast(r.error || 'ক্যাপশন সংরক্ষণ হয়নি, আবার চেষ্টা করুন', 'error');
  };

  // captions save by themselves 1.5 s after you stop typing (and when the box loses focus)
  const edit = (img, patch) => {
    setEdits((p) => ({ ...p, [img.id]: { ...p[img.id], ...patch } }));
    clearTimeout(timers.current[img.id]);
    timers.current[img.id] = setTimeout(() => save(img, true), 1500);
  };
  // leaving the tab: save whatever is still unsaved
  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
    Object.keys(editsRef.current).forEach((id) => {
      const img = latest.current.images.find((x) => x.id === id);
      if (img) save(img, true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (img) => {
    if (!window.confirm('ছবিটি মুছে ফেলবেন?')) return;
    setBusy(true);
    const r = await send({ action: 'delete', id: img.id });
    setBusy(false);
    if (r.ok) showToast('ছবিটি মুছে ফেলা হয়েছে।');
    else showToast(r.error || 'মোছা যায়নি', 'error');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-black text-slate-900"><ImagePlus className="w-5 h-5 text-emerald-700" /> রেট চার্ট ও ছবি (সাইটে প্রকাশ হবে)</div>

      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাপশন * <span className="font-normal text-slate-500">(ছবির নিচে সবাইকে দেখানো হবে)</span></label>
            <input className={input} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} placeholder="যেমন: ২২ নভেম্বরের রেডি ব্রয়লার ও ডিমের রেট" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কোথায় দেখাবে</label>
            <select className={input} value={target} onChange={(e) => setTarget(e.target.value)}>
              {TARGETS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={upload} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} ছবি বাছাই করে আপলোড করুন
        </button>
        <p className="text-[11px] text-slate-500">ছবি আপলোডের আগে আপনা-আপনি ছোট করা হয় (ফ্রি স্টোরেজ বাঁচাতে)। সর্বোচ্চ ৪০টি ছবি রাখা যায়। একসাথে একাধিক ছবিও দেওয়া যায়।</p>
      </div>

      {images.length > 0 && (
        <p className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          সাইটে এখন: বাচ্চার (DOC) ট্যাবে <span className="text-emerald-700">{images.filter((i) => i.target !== 'ready').length}টি</span> · রেডি মুরগি ট্যাবে <span className="text-emerald-700">{images.filter((i) => i.target !== 'doc').length}টি</span> ছবি দেখাচ্ছে।
          কোনো ছবি যে ট্যাবে চান সেখানে না দেখালে, ছবির পাশের "দুই ট্যাবেই" বেছে নিন।
        </p>
      )}

      {images.length === 0 ? (
        <div className="py-10 text-center text-slate-500 text-sm">এখনো কোনো ছবি নেই</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {images.map((img) => {
            const ed = edits[img.id] || {};
            const cap = ed.caption ?? img.caption;
            const tgt = ed.target ?? img.target;
            const dirty = ed.caption !== undefined || ed.target !== undefined;
            return (
              <div key={img.id} className="border border-slate-200 rounded-2xl p-3 flex gap-3">
                <img src={img.url} alt="" className="w-24 h-28 object-cover rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <input className={input} value={cap} maxLength={120} placeholder="ক্যাপশন" onChange={(e) => edit(img, { caption: e.target.value })} onBlur={() => save(img, true)} />
                  <select className={`${input} ${tgt === 'all' ? '' : 'border-amber-400 bg-amber-50'}`} value={tgt} onChange={(e) => edit(img, { target: e.target.value })}>
                    {TARGETS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                  </select>
                  <div className="flex gap-2">
                    {dirty && <span className="self-center text-[11px] font-bold text-amber-700">সংরক্ষণ হচ্ছে…</span>}
                    {dirty && <button disabled={busy} onClick={() => save(img)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer"><Save className="w-3.5 h-3.5" /> সেভ</button>}
                    <button disabled={busy} onClick={() => remove(img)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> মুছুন</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
