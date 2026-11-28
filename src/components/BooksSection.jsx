import React, { useEffect, useState } from 'react';
import { Download, BookOpen } from 'lucide-react';
import FollowGateModal, { FOLLOW_KEY, downloadPicture } from './FollowGateModal';
import { fetchBooks } from '../services/api';
import { YOUTUBE_URL, FB_PAGE_URL } from '../data/links';

const bnNum = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const sizeText = (kb) => (!kb ? '' : kb >= 1024 ? `${bnNum((kb / 1024).toFixed(1))} MB` : `${bnNum(Math.round(kb))} KB`);
const fileName = (title) => `${String(title || 'book').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60) || 'book'}.pdf`;

/** Books the admin published. The PDF can be downloaded after the visitor confirms following our Facebook page + YouTube channel. */
export default function BooksSection({ settings }) {
  const [books, setBooks] = useState([]);
  const [gateFor, setGateFor] = useState(null);
  useEffect(() => { let on = true; fetchBooks().then((r) => { if (on && r) setBooks(r.books); }); return () => { on = false; }; }, []);
  if (!books.length) return null;

  const request = (b) => {
    const file = { url: b.pdfUrl, name: fileName(b.title), what: 'বইটি' };
    let ok = false;
    try { ok = localStorage.getItem(FOLLOW_KEY) === '1'; } catch { /* ignore */ }
    if (ok) downloadPicture(file.url, file.name); else setGateFor(file);
  };

  return (
    <section id="books" className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs scroll-mt-40" aria-label="আমাদের বই">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center"><BookOpen className="w-5 h-5" /></span>
        <div>
          <h2 className="font-black text-slate-900 text-base sm:text-lg leading-tight">📚 আমাদের বই</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">বিনামূল্যে PDF ডাউনলোড করুন</p>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((b) => (
          <article key={b.id} className="flex gap-3.5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/40 p-3 sm:p-4">
            <div className="w-24 sm:w-28 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-emerald-100 border border-emerald-200 shadow-md flex items-center justify-center">
              {b.cover ? <img src={b.cover} alt={b.title} loading="lazy" className="w-full h-full object-cover" /> : <BookOpen className="w-8 h-8 text-emerald-700" />}
            </div>
            <div className="min-w-0 flex flex-col flex-1">
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug line-clamp-3">{b.title}</h3>
              {b.author && <p className="text-xs font-bold text-emerald-800 mt-0.5">✍️ {b.author}</p>}
              {b.desc && <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-4">{b.desc}</p>}
              <div className="mt-auto pt-3"><button onClick={() => request(b)} className="self-start inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-sm cursor-pointer active:scale-95 transition">
                <Download className="w-4 h-4" /> PDF ডাউনলোড {b.pdfKb ? <span className="font-bold opacity-80">({sizeText(b.pdfKb)})</span> : null}
              </button></div>
            </div>
          </article>
        ))}
      </div>
      {gateFor && (
        <FollowGateModal file={gateFor} youtubeUrl={settings?.youtubeUrl || YOUTUBE_URL} facebookUrl={settings?.followFbUrl || FB_PAGE_URL} onClose={() => setGateFor(null)} />
      )}
    </section>
  );
}
