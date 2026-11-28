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
export default function FollowGateModal({ image, file, youtubeUrl, facebookUrl, onClose }) {
  // `file` = { url, name, what } for something that is not a picture (a book PDF)
  const what = file?.what || 'ছবিটি';
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasYt = Boolean(youtubeUrl);
  // the visitor must open each follow link (step 1 and 2) before the tick box (step 3) unlocks
  const [ytOpened, setYtOpened] = useState(false);
  const [fbOpened, setFbOpened] = useState(false);
  const linksDone = fbOpened && (!hasYt || ytOpened);
  const complete = linksDone && agreed; // only then the Download button appears

  const go = async () => {
    if (!complete || busy) return;
    setBusy(true);
    try { localStorage.setItem(FOLLOW_KEY, '1'); } catch { /* private mode */ }
    await (file ? downloadPicture(file.url, file.name) : downloadPicture(image.url, `fosholnexa-${image.id}.jpg`));
    setBusy(false);
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4" onClick={() => onClose(false)}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-emerald-900 text-white">
          <div>
            <h3 className="font-black text-base">📥 {what} ডাউনলোড করুন</h3>
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
              <a href={youtubeUrl} onClick={() => setYtOpened(true)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm">
                {ytOpened ? '✔' : '1.'} ▶ YouTube ফলো করুন
              </a>
            )}
            <a href={facebookUrl} onClick={() => setFbOpened(true)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm">
              {fbOpened ? '✔' : (hasYt ? '2.' : '1.')} f Facebook ফলো করুন
            </a>
          </div>

          <label className={`flex items-start gap-2.5 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/60 ${linksDone ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
            <input type="checkbox" checked={agreed} disabled={!linksDone} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed" />
            <span className="text-sm font-bold text-slate-800">
              {hasYt ? 'আমি আপনাদের YouTube ও Facebook ফলো করেছি।' : 'আমি আপনাদের Facebook পেজ ফলো করেছি।'}
            </span>
          </label>

          {!linksDone && (
            <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {hasYt ? 'আগে উপরের দুটো বাটনে চেপে ফলো করুন, তারপর নিচের টিক বক্সটি চালু হবে।' : 'আগে উপরের বাটনে চেপে ফলো করুন, তারপর নিচের টিক বক্সটি চালু হবে।'}
            </p>
          )}
          {linksDone && !agreed && (
            <p className="text-xs font-bold text-emerald-700">✔ ফলো করা হয়েছে — এবার নিচের বক্সে টিক দিন, তাহলেই ডাউনলোড বাটন আসবে।</p>
          )}
          {complete && (
            <button
              onClick={go}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} ডাউনলোড করুন
            </button>
          )}
          <p className="text-[11px] text-slate-500 text-center">আপনার সম্মতি এই ব্রাউজারে মনে রাখা হবে, পরের বার আবার জিজ্ঞেস করা হবে না।</p>
        </div>
      </div>
    </div>
  );
}
