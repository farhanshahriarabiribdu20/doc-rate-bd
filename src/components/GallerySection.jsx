import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import FollowGateModal, { FOLLOW_KEY, downloadPicture } from './FollowGateModal';
import { YOUTUBE_URL, FB_PAGE_URL } from '../data/links';

/**
 * Rate pictures the admin uploaded (rate charts, price lists, photos). `kind` = 'doc' | 'ready' picks
 * the pictures meant for that tab (pictures marked "both" show everywhere).
 */
export default function GallerySection({ images, kind, lang, settings }) {
  const bn = lang === 'bn';
  const fmt = (ms) => { try { return new Intl.DateTimeFormat('bn-BD', { dateStyle: 'long', timeZone: 'Asia/Dhaka' }).format(new Date(ms)); } catch { return ''; } };
  // every picture always carries a title, so people know what it is even when no caption was typed
  const titleOf = (img) => img.caption || (bn ? 'রেট চার্ট' : 'Rate chart');
  const [open, setOpen] = useState(-1);
  const [gateFor, setGateFor] = useState(null); // picture waiting for the follow confirmation
  const requestDownload = (img) => {
    let ok = false;
    try { ok = localStorage.getItem(FOLLOW_KEY) === '1'; } catch { /* ignore */ }
    if (ok) downloadPicture(img.url, `fosholnexa-${img.id}.jpg`);
    else setGateFor(img);
  };
  const shown = (images || []).filter((i) => i.target === 'all' || i.target === kind);

  useEffect(() => {
    if (open < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(-1);
      if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % shown.length);
      if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + shown.length) % shown.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, shown.length]);

  if (!shown.length) return null;
  const cur = open >= 0 ? shown[open] : null;

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📸</span>
        <h3 className="font-black text-slate-900 text-base sm:text-lg">{bn ? 'রেট চার্ট ও ছবি' : 'Rate charts & pictures'}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">{shown.length}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {shown.map((img, idx) => (
          <div key={img.id} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition flex flex-col">
          <button onClick={() => setOpen(idx)} className="text-left cursor-pointer flex-1">
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              <img src={img.url} alt={titleOf(img)} loading="lazy" className="w-full h-full object-contain group-hover:scale-[1.02] transition duration-300" />
            </div>
            <div className="px-3 py-2.5 border-t border-slate-100">
              <p className="text-xs sm:text-sm font-black text-slate-800 leading-snug line-clamp-2">{titleOf(img)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">📅 {fmt(img.createdAt)}</p>
            </div>
          </button>
          <div className="px-3 pb-3">
            <button onClick={() => requestDownload(img)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer">
              <Download className="w-4 h-4" /> {bn ? 'ডাউনলোড' : 'Download'}
            </button>
          </div>
          </div>
        ))}
      </div>

      {cur && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3" onClick={() => setOpen(-1)}>
          <button onClick={() => setOpen(-1)} aria-label="Close" className="absolute top-3 right-3 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"><X className="w-6 h-6" /></button>
          {shown.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setOpen((i) => (i - 1 + shown.length) % shown.length); }} aria-label="Previous" className="absolute left-2 sm:left-5 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={(e) => { e.stopPropagation(); setOpen((i) => (i + 1) % shown.length); }} aria-label="Next" className="absolute right-2 sm:right-5 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"><ChevronRight className="w-6 h-6" /></button>
            </>
          )}
          <figure className="max-w-4xl max-h-full flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <img src={cur.url} alt={titleOf(cur)} className="max-h-[82vh] max-w-full rounded-xl shadow-2xl object-contain" />
            <figcaption className="text-white text-center">
              <span className="block text-sm sm:text-base font-black">{titleOf(cur)}</span>
              <span className="block text-xs text-white/70">📅 {fmt(cur.createdAt)}</span>
            </figcaption>
            <button onClick={() => requestDownload(cur)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm cursor-pointer">
              <Download className="w-4 h-4" /> {bn ? 'ডাউনলোড' : 'Download'}
            </button>
          </figure>
        </div>
      )}
      {gateFor && (
        <FollowGateModal
          image={gateFor}
          youtubeUrl={settings?.youtubeUrl || YOUTUBE_URL}
          facebookUrl={settings?.followFbUrl || FB_PAGE_URL}
          onClose={() => setGateFor(null)}
        />
      )}
    </section>
  );
}
