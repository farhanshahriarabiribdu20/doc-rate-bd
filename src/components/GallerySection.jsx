import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Rate pictures the admin uploaded (rate charts, price lists, photos). `kind` = 'doc' | 'ready' picks
 * the pictures meant for that tab (pictures marked "both" show everywhere).
 */
export default function GallerySection({ images, kind, lang }) {
  const bn = lang === 'bn';
  const [open, setOpen] = useState(-1);
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
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📸</span>
        <h3 className="font-black text-slate-900 text-base sm:text-lg">{bn ? 'রেট চার্ট ও ছবি' : 'Rate charts & pictures'}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">{shown.length}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {shown.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setOpen(idx)}
            className="group text-left bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition cursor-pointer"
          >
            <div className="aspect-[4/5] bg-slate-100 overflow-hidden">
              <img src={img.url} alt={img.caption || 'rate'} loading="lazy" className="w-full h-full object-contain group-hover:scale-[1.02] transition duration-300" />
            </div>
            {img.caption && <p className="px-3 py-2 text-xs font-bold text-slate-700 line-clamp-2">{img.caption}</p>}
          </button>
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
            <img src={cur.url} alt={cur.caption || 'rate'} className="max-h-[82vh] max-w-full rounded-xl shadow-2xl object-contain" />
            {cur.caption && <figcaption className="text-white text-sm font-bold text-center">{cur.caption}</figcaption>}
          </figure>
        </div>
      )}
    </section>
  );
}
