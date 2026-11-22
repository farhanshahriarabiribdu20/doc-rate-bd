import React, { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
export { FB_PAGE_URL as DEFAULT_FB_PAGE } from '../data/links';

export const FOLLOW_KEY = 'fn_follow_ok';

/** Saves a picture to the device; if the browser refuses (cross-site file) it opens in a new tab instead. */
export async function downloadPicture(url, name) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch');
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

/**
 * Before a picture can be downloaded the visitor ticks "I follow our YouTube channel and Facebook
 * page". This is a promise (we cannot check it), shown with the links so they can follow right here.
 */
export default function FollowGateModal({ image, youtubeUrl, facebookUrl, onClose }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasYt = Boolean(youtubeUrl);

  const go = async () => {
    if (!agreed || busy) return;
    setBusy(true);
    try { localStorage.setItem(FOLLOW_KEY, '1'); } catch { /* private mode */ }
    await downloadPicture(image.url, `fosholnexa-${image.id}.jpg`);
    setBusy(false);
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4" onClick={() => onClose(false)}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-emerald-900 text-white">
          <div>
            <h3 className="font-black text-base">📥 ছবিটি ডাউনলোড করুন</h3>
            <p className="text-[11px] text-emerald-100">{hasYt ? 'আমাদের YouTube ও Facebook ফলো করলে ডাউনলোড করতে পারবেন।' : 'আমাদের Facebook পেজ ফলো করলে ডাউনলোড করতে পারবেন।'}</p>
          </div>
          <button onClick={() => onClose(false)} aria-label="Close" className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {hasYt ? 'ডাউনলোড করতে হলে আগে আমাদের ' : 'ডাউনলোড করতে হলে আগে আমাদের '}
            <b>{hasYt ? 'YouTube চ্যানেল ও Facebook পেজ' : 'Facebook পেজ'}</b> ফলো করুন। নিচের বাটনে চাপলেই খুলে যাবে।
          </p>

          <div className={`grid gap-2 ${hasYt ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {hasYt && (
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm">
                ▶ YouTube ফলো করুন
              </a>
            )}
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm">
              f Facebook ফলো করুন
            </a>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/60 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 accent-emerald-600 cursor-pointer" />
            <span className="text-sm font-bold text-slate-800">
              {hasYt ? 'আমি আপনাদের YouTube ও Facebook ফলো করেছি।' : 'আমি আপনাদের Facebook পেজ ফলো করেছি।'}
            </span>
          </label>

          <button
            onClick={go}
            disabled={!agreed || busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black text-sm cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} ডাউনলোড করুন
          </button>
          <p className="text-[11px] text-slate-500 text-center">আপনার সম্মতি এই ব্রাউজারে মনে রাখা হবে, পরের বার আবার জিজ্ঞেস করা হবে না।</p>
        </div>
      </div>
    </div>
  );
}
