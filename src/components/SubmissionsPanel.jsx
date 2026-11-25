import React from 'react';
import { Trash2, RefreshCw, Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { READY_SUBMIT_FIELDS } from './RateSubmitModal';
import { ZONE_BY_ID, rateForRegion } from '../data/zones';

const LABEL = Object.fromEntries(READY_SUBMIT_FIELDS.map((f) => [f.key, f.bn]));
LABEL.sonaliSuper = 'সোনালী সুপার';

const when = (iso) => {
  try {
    return new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(iso));
  } catch { return ''; }
};

/** A submitted value that is far from the current one is flagged so the admin looks twice. */
const far = (now, next) => Number(now) > 0 && Math.abs(Number(next) - Number(now)) / Number(now) > 0.25;

/**
 * Visitor-submitted rates. They are already live on the site (tagged "ইউজারের দেওয়া রেট"), no approval needed;
 * the admin can delete a wrong or spam one.
 */
export default function SubmissionsPanel({ subs, loading, error, readyRates, rates, onReload, onDelete }) {
  const rows = subs.map((sub) => {
    if (sub.kind === 'ready') {
      const item = readyRates.find((r) => r.id === sub.targetId) || null;
      const changes = Object.entries(sub.values || {}).map(([key, next]) => ({
        label: LABEL[key] || key, was: item ? Number(item[key]) : null, next: Number(next)
      }));
      return { sub, item, title: item ? (item.regionBn || item.regionEn) : sub.targetLabel, changes };
    }
    const item = rates.find((r) => r.id === sub.targetId) || null;
    const zone = ZONE_BY_ID[sub.zoneId];
    const was = item ? Number(rateForRegion(item, zone ? zone.id : 'all')) : null;
    return {
      sub, item,
      title: item ? `${item.company} — ${item.breed}` : sub.targetLabel,
      changes: [{ label: zone ? `${zone.bn} জোনের রেট` : 'সারা দেশের রেট', was, next: Number(sub.values?.rate) }]
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5"><Inbox className="w-4 h-4 text-emerald-700" /> ইউজারদের দেওয়া রেট</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold">{subs.length}টি</span>
        </div>
        <button onClick={onReload} disabled={loading} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} রিফ্রেশ
        </button>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        এখানকার রেটগুলো অনুমোদন ছাড়াই সাইটে "ইউজারের দেওয়া রেট" ট্যাগসহ প্রকাশ হয়ে গেছে (আপনার নিজের রেট বদলায় না)।
        ভুল বা স্প্যাম রেট দেখলে "মুছুন" চাপুন — সাথে সাথে সাইট থেকে সরে যাবে। ২৫%-এর বেশি পার্থক্য হলে ⚠️ চিহ্ন দেখাবে।
      </p>

      {error && <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5">{error}</div>}

      {!loading && rows.length === 0 ? (
        <div className="text-center text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl p-8">এখনো কোনো ইউজার রেট দেননি।</div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ sub, item, title, changes }) => (
            <div key={sub.id} className="border border-slate-200 rounded-2xl p-3.5 bg-white space-y-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-black text-slate-900 text-sm">
                    <span className="mr-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">{sub.kind === 'ready' ? 'রেডি/ডিম' : 'DOC'}</span>
                    {title}
                    {!item && <span className="ml-1.5 text-[11px] text-red-600 font-bold">(সাইটে আর নেই)</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {sub.name}{sub.phone ? ` · 📞 ${sub.phone}` : ''} · {when(sub.createdAt)} · রেটের তারিখ {sub.rateDate}
                  </div>
                  {sub.note && <div className="text-[11px] text-slate-600 mt-0.5">💬 {sub.note}</div>}
                </div>
                <button onClick={() => onDelete(sub)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> মুছুন
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {changes.map((c) => (
                  <span key={c.label} className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${c.was !== null && far(c.was, c.next) ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    {c.was !== null && far(c.was, c.next) && <AlertTriangle className="inline w-3 h-3 mr-0.5 -mt-0.5" />}
                    {c.label}: {c.was ? `${c.was} → ` : ''}<b>{c.next}</b>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
