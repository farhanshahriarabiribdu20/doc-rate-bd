import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, Loader2, Save } from 'lucide-react';
import { galleryAdmin } from '../services/api';
import { compressImage } from '../utils/compressImage';

const TARGETS = [['all', 'দুই ট্যাবেই'], ['doc', 'বাচ্চার (DOC) ট্যাবে'], ['ready', 'রেডি মুরগি ট্যাবে']];
const input = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

/** Admin: upload rate pictures (they are shrunk in the browser first), caption them, choose the tab, delete. */
export default function GalleryAdminPanel({ adminKey, images, onChange, showToast }) {
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
    let list = images;
    let done = 0;
    for (const file of files) {
      try {
        const dataUrl = await compressImage(file);
        const r = await galleryAdmin(adminKey, { action: 'add', image: dataUrl, caption, target });
        if (!r.ok) { showToast(r.error || 'ছবি আপলোড হয়নি', 'error'); break; }
        list = r.images; done += 1;
      } catch { showToast(`"${file.name}" ছবিটি পড়া যায়নি`, 'error'); }
    }
    setBusy(false);
    if (done) { onChange(list); setCaption(''); showToast(`✅ ${done}টি ছবি প্রকাশ হয়েছে।`); }
  };

  const save = async (img) => {
    const ed = edits[img.id] || {};
    setBusy(true);
    const r = await galleryAdmin(adminKey, { action: 'update', id: img.id, caption: ed.caption ?? img.caption, target: ed.target ?? img.target });
    setBusy(false);
    if (r.ok) { onChange(r.images); setEdits((p) => { const n = { ...p }; delete n[img.id]; return n; }); showToast('✅ সংরক্ষিত।'); }
    else showToast(r.error || 'সংরক্ষণ হয়নি', 'error');
  };

  const remove = async (img) => {
    if (!window.confirm('ছবিটি মুছে ফেলবেন?')) return;
    setBusy(true);
    const r = await galleryAdmin(adminKey, { action: 'delete', id: img.id });
    setBusy(false);
    if (r.ok) { onChange(r.images); showToast('ছবিটি মুছে ফেলা হয়েছে।'); }
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
                  <input className={input} value={cap} maxLength={120} placeholder="ক্যাপশন" onChange={(e) => setEdits((p) => ({ ...p, [img.id]: { ...p[img.id], caption: e.target.value } }))} />
                  <select className={input} value={tgt} onChange={(e) => setEdits((p) => ({ ...p, [img.id]: { ...p[img.id], target: e.target.value } }))}>
                    {TARGETS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                  </select>
                  <div className="flex gap-2">
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
