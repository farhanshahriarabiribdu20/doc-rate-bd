import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Trash2, Loader2, UploadCloud, Link2, Save } from 'lucide-react';
import { booksAdmin, fetchBooks } from '../services/api';
import { compressImage } from '../utils/compressImage';

const input = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const MAX_PDF = 50 * 1024 * 1024; // Supabase free plan limit per file

/** PUT a file to a signed Supabase address, with progress (0-100). */
function putFile(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('cacheControl', '31536000');
    fd.append('', file);
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status} ${String(xhr.responseText || '').slice(0, 160)}`)));
    xhr.onerror = () => reject(new Error('নেটওয়ার্ক/CORS ত্রুটি'));
    xhr.send(fd);
  });
}

/** Admin: publish books (cover picture + PDF). The PDF goes straight to storage; a link (e.g. Google Drive) also works. */
export default function BooksAdminPanel({ adminKey, showToast }) {
  const [books, setBooks] = useState(null);
  const [form, setForm] = useState({ title: '', author: '', desc: '' });
  const [coverFile, setCoverFile] = useState(null);
  const [pdf, setPdf] = useState(null);        // { url, kb, name } once uploaded
  const [link, setLink] = useState('');
  const [progress, setProgress] = useState(-1); // -1 idle, 0-100 uploading
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState({});
  const coverRef = useRef(null);
  const pdfRef = useRef(null);

  const load = async () => { const r = await fetchBooks(true); if (r) setBooks(r.books); };
  useEffect(() => { load(); }, []);

  const pickPdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { showToast('শুধু PDF ফাইল দিন', 'error'); return; }
    if (file.size > MAX_PDF) { showToast('PDF ফাইলটি ৫০ MB-এর বেশি। ছোট করুন, অথবা লিংক দিন।', 'error'); return; }
    setProgress(0);
    const s = await booksAdmin(adminKey, { action: 'sign' });
    if (!s.ok) { setProgress(-1); showToast(s.error || 'আপলোড শুরু করা যায়নি', 'error'); return; }
    try {
      await putFile(s.uploadUrl, file, setProgress);
      setPdf({ url: s.publicUrl, kb: Math.round(file.size / 1024), name: file.name });
      setLink('');
      showToast('✅ PDF আপলোড হয়েছে। এবার "বই প্রকাশ করুন" চাপুন।');
    } catch (err) {
      showToast(`PDF আপলোড হয়নি: ${err.message}। আবার চেষ্টা করুন, অথবা PDF-এর লিংক দিন।`, 'error');
    }
    setProgress(-1);
  };

  const publish = async () => {
    if (!form.title.trim()) { showToast('বইয়ের নাম লিখুন', 'error'); return; }
    const pdfUrl = pdf?.url || link.trim();
    if (!pdfUrl) { showToast('PDF আপলোড করুন অথবা PDF-এর লিংক দিন', 'error'); return; }
    setBusy(true);
    let cover = '';
    try { if (coverFile) cover = await compressImage(coverFile, 900, 0.85); } catch { setBusy(false); showToast('কভার ছবিটি পড়া যায়নি', 'error'); return; }
    const r = await booksAdmin(adminKey, { action: 'add', ...form, cover, pdfUrl, pdfKb: pdf?.kb || 0 });
    setBusy(false);
    if (!r.ok) { showToast(r.error || 'বই প্রকাশ হয়নি', 'error'); return; }
    setBooks(r.books);
    setForm({ title: '', author: '', desc: '' }); setCoverFile(null); setPdf(null); setLink('');
    showToast('✅ বই সাইটে প্রকাশ হয়েছে।');
  };

  const saveEdit = async (b) => {
    const ed = edits[b.id];
    if (!ed) return;
    setBusy(true);
    const r = await booksAdmin(adminKey, { action: 'update', id: b.id, title: ed.title ?? b.title, author: ed.author ?? b.author, desc: ed.desc ?? b.desc });
    setBusy(false);
    if (!r.ok) { showToast(r.error || 'সংরক্ষণ হয়নি', 'error'); return; }
    setBooks(r.books);
    setEdits((p) => { const n = { ...p }; delete n[b.id]; return n; });
    showToast('✅ সংরক্ষিত।');
  };

  const remove = async (b) => {
    if (!window.confirm(`"${b.title}" বইটি মুছে ফেলবেন?`)) return;
    setBusy(true);
    const r = await booksAdmin(adminKey, { action: 'delete', id: b.id });
    setBusy(false);
    if (r.ok) { setBooks(r.books); showToast('বইটি মুছে ফেলা হয়েছে।'); } else showToast(r.error || 'মোছা যায়নি', 'error');
  };

  const uploading = progress >= 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-black text-slate-900"><BookOpen className="w-5 h-5 text-emerald-700" /> বই (সাইটে প্রকাশ হবে, PDF ফলো করে ডাউনলোড)</div>

      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">বইয়ের নাম *</label>
            <input className={input} value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="যেমন: ব্রয়লার মুরগি পালন গাইড" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">লেখকের নাম</label>
            <input className={input} value={form.author} maxLength={80} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">সংক্ষিপ্ত পরিচিতি <span className="font-normal text-slate-500">(১–২ লাইন)</span></label>
          <textarea className={input} rows={3} maxLength={600} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="বইটি কী নিয়ে, কাদের কাজে লাগবে" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="block text-xs font-bold text-slate-700 mb-1">কভার ছবি <span className="font-normal text-slate-500">(ঐচ্ছিক)</span></p>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setCoverFile(e.target.files?.[0] || null); e.target.value = ''; }} />
            <button type="button" onClick={() => coverRef.current?.click()} className="w-full px-3 py-2.5 rounded-xl border-2 border-dashed border-emerald-300 bg-white text-sm font-bold text-emerald-800 cursor-pointer text-left truncate">
              {coverFile ? `✔ ${coverFile.name}` : '🖼️ কভার ছবি বাছাই করুন'}
            </button>
          </div>
          <div>
            <p className="block text-xs font-bold text-slate-700 mb-1">বইয়ের PDF * <span className="font-normal text-slate-500">(সর্বোচ্চ ৫০ MB)</span></p>
            <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={pickPdf} />
            <button type="button" disabled={uploading || busy} onClick={() => pdfRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {uploading ? `আপলোড হচ্ছে… ${progress}%` : pdf ? `✔ ${pdf.name} (${Math.round(pdf.kb / 1024 * 10) / 10} MB)` : 'PDF বাছাই করে আপলোড করুন'}
            </button>
            {uploading && <div className="h-1.5 mt-1.5 rounded-full bg-emerald-100 overflow-hidden"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} /></div>}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1"><Link2 className="w-3.5 h-3.5" /> অথবা PDF-এর লিংক দিন <span className="font-normal text-slate-500">(আপলোড না করলে, যেমন Google Drive)</span></label>
          <input className={input} value={link} disabled={!!pdf} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/..." />
        </div>

        <button onClick={publish} disabled={busy || uploading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-black text-sm cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />} বই প্রকাশ করুন
        </button>
      </div>

      {books === null ? (
        <div className="py-8 text-center text-slate-500 text-sm">লোড হচ্ছে…</div>
      ) : books.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">এখনো কোনো বই প্রকাশ করা হয়নি</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {books.map((b) => {
            const ed = edits[b.id] || {};
            const dirty = Object.keys(ed).length > 0;
            return (
              <div key={b.id} className="border border-slate-200 rounded-2xl p-3 flex gap-3">
                <div className="w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-emerald-100 flex items-center justify-center">
                  {b.cover ? <img src={b.cover} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-6 h-6 text-emerald-700" />}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input className={input} value={ed.title ?? b.title} maxLength={120} onChange={(e) => setEdits({ ...edits, [b.id]: { ...ed, title: e.target.value } })} />
                  <input className={input} value={ed.author ?? b.author} maxLength={80} placeholder="লেখক" onChange={(e) => setEdits({ ...edits, [b.id]: { ...ed, author: e.target.value } })} />
                  <textarea className={input} rows={2} value={ed.desc ?? b.desc} maxLength={600} placeholder="পরিচিতি" onChange={(e) => setEdits({ ...edits, [b.id]: { ...ed, desc: e.target.value } })} />
                  <div className="flex gap-2 flex-wrap">
                    <a href={b.pdfUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs">PDF দেখুন</a>
                    {dirty && <button disabled={busy} onClick={() => saveEdit(b)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer"><Save className="w-3.5 h-3.5" /> সেভ</button>}
                    <button disabled={busy} onClick={() => remove(b)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> মুছুন</button>
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
