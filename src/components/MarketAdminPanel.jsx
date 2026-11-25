import React, { useState } from 'react';
import { Check, X, Ban, EyeOff, Trash2, Pencil, RefreshCw, Loader2, Store, UserCheck, BadgeCheck, Star } from 'lucide-react';
import { prodOf, PRODUCT_OPTIONS, UNIT_OPTIONS, UNIT_BN } from '../services/market';
import { DISTRICT_GROUPS } from '../data/districts';

const bnNum = (n) => new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 2 }).format(n);
const when = (ms) => {
  try { return new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(ms)); } catch { return ''; }
};

const STATUS = {
  pending: ['অনুমোদনের অপেক্ষায়', 'bg-amber-100 text-amber-800'],
  live: ['চালু', 'bg-emerald-100 text-emerald-800'],
  sold: ['বিক্রি', 'bg-slate-200 text-slate-700'],
  hidden: ['লুকানো', 'bg-red-100 text-red-700'],
  expired: ['মেয়াদ শেষ', 'bg-slate-200 text-slate-700']
};

const fld = 'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const lbl = 'block text-[11px] font-bold text-slate-600 mb-0.5';

/** Inline edit form for one ad (admin can fix any field except the seller's phone). */
function EditForm({ it, onSave, onCancel }) {
  const [f, setF] = useState({
    sellerName: it.sellerName || '', product: it.product, customName: it.customName || '', quantity: it.quantity,
    unit: it.unit, price: it.price || '', district: it.district || '', location: it.location || '', details: it.details || ''
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => { setBusy(true); await onSave(f); setBusy(false); };
  return (
    <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><label className={lbl}>বিক্রেতার নাম</label><input className={fld} value={f.sellerName} onChange={set('sellerName')} maxLength={60} /></div>
        <div className={f.product === 'other' ? '' : 'col-span-2'}>
          <label className={lbl}>পণ্য</label>
          <select className={fld} value={f.product} onChange={set('product')}>
            {PRODUCT_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.emoji} {p.bn}</option>)}
          </select>
        </div>
        {f.product === 'other' && <div><label className={lbl}>পণ্যের নাম</label><input className={fld} value={f.customName} onChange={set('customName')} maxLength={40} /></div>}
        <div><label className={lbl}>পরিমাণ</label><input type="number" min="1" step="any" className={fld} value={f.quantity} onChange={set('quantity')} /></div>
        <div>
          <label className={lbl}>একক</label>
          <select className={fld} value={f.unit} onChange={set('unit')}>{UNIT_OPTIONS.map((u) => <option key={u.key} value={u.key}>{u.bn}</option>)}</select>
        </div>
        <div className="col-span-2"><label className={lbl}>দাম (৳) — ফাঁকা বা ০ হলে "দর আলোচনা সাপেক্ষে"</label><input type="number" min="0" step="any" className={fld} value={f.price} onChange={set('price')} /></div>
        <div>
          <label className={lbl}>জেলা</label>
          <select className={fld} value={f.district} onChange={set('district')}>
            <option value="">জেলা</option>
            {DISTRICT_GROUPS.map((g) => <optgroup key={g.division} label={g.division}>{g.districts.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>)}
          </select>
        </div>
        <div><label className={lbl}>এলাকা / ঠিকানা</label><input className={fld} value={f.location} onChange={set('location')} maxLength={80} /></div>
        <div className="col-span-2"><label className={lbl}>বিবরণ</label><textarea className={fld} rows={2} value={f.details} onChange={set('details')} maxLength={300} /></div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer disabled:opacity-60">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} সেভ করুন</button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs cursor-pointer">বাতিল</button>
      </div>
    </div>
  );
}

/** Admin: delete seller ads, block a seller, verified tick, rating reset (ads need no approval). */
export default function MarketAdminPanel({ data, loading, error, onReload, onAction }) {
  const items = data?.items || [];
  const banned = data?.banned || [];
  const [editId, setEditId] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-black text-slate-900"><Store className="w-5 h-5 text-emerald-700" /> বিক্রেতাদের বিজ্ঞাপন</div>
        <button onClick={onReload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} রিফ্রেশ
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>}

      <p className="text-xs text-slate-600 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        নতুন বিজ্ঞাপন সরাসরি সাইটে চালু হয়ে যায়, অনুমোদন লাগে না। আপনি শুধু আপত্তিকর বিজ্ঞাপন <b>মুছতে</b> বা বিক্রেতাকে <b>ব্লক</b> করতে পারবেন।
      </p>

      {items.length === 0 && !loading && (
        <div className="py-10 text-center text-slate-500 text-sm">এখনো কোনো বিজ্ঞাপন নেই</div>
      )}

      <div className="space-y-3">
        {items.map((it) => {
          const [stText, stCls] = STATUS[it.status] || STATUS.live;
          const prod = prodOf(it);
          const isBanned = banned.includes(it.userId);
          return (
            <div key={it.id} className={`border rounded-2xl p-3 space-y-2 ${it.status === 'pending' ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-900">{prod.emoji} {prod.bn} — {bnNum(it.quantity)} {UNIT_BN[it.unit]?.bn}</p>
                  <p className="text-xs text-slate-600">
                    {it.price > 0 ? `৳${bnNum(it.price)} ${UNIT_BN[it.unit]?.per}` : 'দর আলোচনা সাপেক্ষে'} · {it.location}
                  </p>
                  {it.details && <p className="text-xs text-slate-600 mt-1 whitespace-pre-line break-words">{it.details}</p>}
                  {it.imgs?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {it.imgs.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" loading="lazy" className="w-20 h-20 rounded-lg object-cover border border-slate-200" /></a>)}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    {it.sellerName} · {it.phone} · {when(it.createdAt)}
                  </p>
                  <p className="text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                    {it.district && <span className="text-slate-500">জেলা: {it.district}</span>}
                    {it.verified && <span className="inline-flex items-center gap-0.5 font-black text-emerald-700"><BadgeCheck className="w-3 h-3" /> যাচাইকৃত</span>}
                    {it.rating && <span className="inline-flex items-center gap-0.5 font-black text-amber-600"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{bnNum(it.rating.avg)} ({bnNum(it.rating.count)})</span>}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${stCls}`}>{stText}</span>
              </div>
              {editId === it.id && (
                <EditForm it={it} onCancel={() => setEditId(null)} onSave={async (fields) => { const ok = await onAction({ op: 'edit', id: it.id, fields }); if (ok) setEditId(null); }} />
              )}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditId(editId === it.id ? null : it.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-black text-xs cursor-pointer"><Pencil className="w-3.5 h-3.5" /> এডিট</button>
                <button onClick={() => { if (window.confirm('বিজ্ঞাপনটি মুছে ফেলবেন?')) onAction({ op: 'delete', id: it.id }); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> মুছুন</button>
                <button onClick={() => onAction({ op: it.verified ? 'unverify' : 'verify', userId: it.userId })} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-black text-xs cursor-pointer ${it.verified ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}><BadgeCheck className="w-3.5 h-3.5" /> {it.verified ? 'যাচাই বাতিল' : 'যাচাইকৃত করুন'}</button>
                {it.rating && (
                  <button onClick={() => { if (window.confirm(`${it.userId} এর সব রেটিং মুছে ফেলবেন?`)) onAction({ op: 'resetRating', userId: it.userId }); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs cursor-pointer"><Star className="w-3.5 h-3.5" /> রেটিং রিসেট</button>
                )}
                {isBanned ? (
                  <button onClick={() => onAction({ op: 'unban', userId: it.userId })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs cursor-pointer"><UserCheck className="w-3.5 h-3.5" /> ব্লক খুলুন</button>
                ) : (
                  <button onClick={() => { if (window.confirm(`${it.userId} কে ব্লক করবেন? তার সব বিজ্ঞাপন লুকিয়ে যাবে।`)) onAction({ op: 'ban', userId: it.userId }); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs cursor-pointer"><Ban className="w-3.5 h-3.5" /> বিক্রেতা ব্লক</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {banned.length > 0 && (
        <div className="p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
          <p className="font-black text-slate-800 mb-1.5">ব্লক করা বিক্রেতা</p>
          <div className="flex flex-wrap gap-2">
            {banned.map((u) => (
              <button key={u} onClick={() => onAction({ op: 'unban', userId: u })} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold cursor-pointer">{u} <X className="w-3 h-3" /></button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
