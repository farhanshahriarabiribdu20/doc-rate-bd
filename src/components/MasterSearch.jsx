import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import { PAGES, TOOLS_META, PROFIT } from '../data/searchIndex';

const RECENT_KEY = 'fn_recent_search';
const norm = (v) => String(v || '').toLowerCase().replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).trim();
const readRecent = () => { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 5) : []; } catch { return []; } };
const bd = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const hit = (hay, words) => words.every((w) => hay.includes(w));

/**
 * Master search: one box for the whole site (rates, ready-market hubs, feed prices, tools, pages).
 * `onGo(action)` is handled by the app (switch tab, filter, open a tool, scroll...).
 */
export default function MasterSearch({ rates, readyRates, feeds, onGo }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    setRecent(readRecent());
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [open]);

  const words = norm(q).split(/\s+/).filter(Boolean);

  const groups = useMemo(() => {
    if (!words.length) return [];
    const g = [];
    const pages = PAGES.filter((p) => hit(norm(`${p.label} ${p.desc} ${p.kw}`), words)).map((p) => ({ key: p.id, icon: p.icon, title: p.label, sub: p.desc, go: p.go }));
    const tools = [...TOOLS_META, PROFIT].filter((t) => hit(norm(`${t.label} ${t.desc} ${t.kw}`), words))
      .map((t) => ({ key: `t-${t.id}`, icon: t.icon, title: t.label, sub: t.desc, go: t.id === 'profit' ? { type: 'profit' } : { type: 'tool', id: t.id } }));
    const doc = (rates || []).filter((r) => hit(norm(`${r.company} ${r.companyEn} ${r.breed} ${r.category}`), words))
      .map((r) => ({ key: `r-${r.id}`, icon: '🐣', title: `${r.company}${r.breed ? ` (${r.breed})` : ''}`, sub: `বাচ্চার রেট ৳${bd(r.todayRate)}`, go: { type: 'rate', company: r.company } }));
    const ready = (readyRates || []).filter((r) => hit(norm(`${r.regionBn} ${r.regionEn} ${r.officerName}`), words))
      .map((r) => ({ key: `y-${r.id}`, icon: '🍗', title: r.regionBn || r.regionEn, sub: `রেডি মুরগি ও ডিমের রেট${Number(r.broilerMedium) > 0 ? ` · ব্রয়লার ৳${bd(r.broilerMedium)}` : ''}`, go: { type: 'ready', name: r.regionBn || r.regionEn } }));
    const feed = (feeds || []).filter((f) => hit(norm(`${f.company} ${f.product} ${f.type}`), words))
      .map((f) => ({ key: `f-${f.id}`, icon: '🌾', title: `${f.product} (${f.company})`, sub: `ফিড · ৳${bd(f.price)} / ${f.weight}`, go: { type: 'feed' } }));
    if (doc.length) g.push({ name: 'বাচ্চার রেট', items: doc.slice(0, 5) });
    if (ready.length) g.push({ name: 'রেডি মুরগি ও ডিম', items: ready.slice(0, 5) });
    if (feed.length) g.push({ name: 'ফিডের দাম', items: feed.slice(0, 5) });
    if (tools.length) g.push({ name: 'খামার টুলস', items: tools.slice(0, 5) });
    if (pages.length) g.push({ name: 'পেজ ও সেকশন', items: pages.slice(0, 5) });
    return g;
  }, [q, rates, readyRates, feeds]); // eslint-disable-line react-hooks/exhaustive-deps

  const popular = useMemo(() => [
    ...PAGES.slice(0, 4).map((p) => ({ key: p.id, icon: p.icon, title: p.label, go: p.go })),
    { key: 't-fcr', icon: '🌾', title: 'FCR ও ফিড হিসাব', go: { type: 'tool', id: 'fcr' } },
    { key: 't-vaccine', icon: '💉', title: 'টিকা সূচি', go: { type: 'tool', id: 'vaccine' } },
    { key: 't-profit', icon: '🧮', title: 'লাভ-ক্ষতি ক্যালকুলেটর', go: { type: 'profit' } }
  ], []);
  const firms = useMemo(() => [...new Set((rates || []).map((r) => r.company).filter(Boolean))].slice(0, 6), [rates]);

  const run = (go, label) => {
    if (label || q.trim()) {
      const term = (label || q).trim();
      try { localStorage.setItem(RECENT_KEY, JSON.stringify([term, ...readRecent().filter((x) => x !== term)].slice(0, 5))); } catch { /* ignore */ }
    }
    setOpen(false);
    setQ('');
    onGo(go);
  };
  const first = groups[0]?.items[0];
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const Row = ({ it, label }) => (
    <button type="button" onClick={() => run(it.go, label)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 focus:bg-emerald-50 outline-none cursor-pointer">
      <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-base" aria-hidden="true">{it.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900 truncate">{it.title}</span>
        {it.sub && <span className="block text-[11px] text-slate-500 truncate">{it.sub}</span>}
      </span>
      <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
    </button>
  );
  const chip = (text, onClick, icon) => (
    <button key={text} type="button" onClick={onClick} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-100 text-xs font-bold text-slate-700 cursor-pointer">
      {icon}{text}
    </button>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="সব তথ্য খুঁজুন"
        className="w-full flex items-center gap-2.5 bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl px-4 py-3 text-left shadow-xs transition cursor-pointer">
        <Search className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="flex-1 min-w-0 text-sm text-slate-500 truncate">রেট, ফিড, মুরগি, টুলস, যা খুশি খুঁজুন…</span>
        <kbd className="hidden sm:inline text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 sm:p-6 pt-[8vh] bg-black/60 backdrop-blur-xs" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="মাস্টার সার্চ" onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Search className="w-5 h-5 text-emerald-600 shrink-0" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && first) run(first.go); }}
                placeholder="কোম্পানি, জেলা, ফিড, টুল বা পেজ লিখুন…" className="flex-1 min-w-0 outline-none text-sm font-bold text-slate-900 placeholder:font-medium py-1" />
              <button type="button" onClick={() => setOpen(false)} aria-label="বন্ধ করুন" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto p-3 space-y-4">
              {!words.length ? (
                <>
                  {recent.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black text-slate-400 mb-1.5 px-1">সাম্প্রতিক খোঁজ</p>
                      <div className="flex flex-wrap gap-2">{recent.map((t) => chip(t, () => setQ(t), <Clock className="w-3 h-3" />))}</div>
                    </div>
                  )}
                  {firms.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black text-slate-400 mb-1.5 px-1">কোম্পানির রেট দেখুন</p>
                      <div className="flex flex-wrap gap-2">{firms.map((f) => chip(f, () => run({ type: 'rate', company: f }, f)))}</div>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-black text-slate-400 mb-1 px-1">জনপ্রিয়</p>
                    {popular.map((it) => <Row key={it.key} it={it} label={it.title} />)}
                  </div>
                </>
              ) : total === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm font-bold text-slate-700">“{q.trim()}” নামে কিছু পাওয়া যায়নি</p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">অন্য শব্দে খুঁজুন, বা এগুলো দেখুন:</p>
                  <div className="flex flex-wrap justify-center gap-2">{popular.slice(0, 5).map((it) => chip(it.title, () => run(it.go, it.title), <span aria-hidden="true">{it.icon}</span>))}</div>
                </div>
              ) : (
                groups.map((g) => (
                  <div key={g.name}>
                    <p className="text-[11px] font-black text-slate-400 mb-1 px-1">{g.name}</p>
                    {g.items.map((it) => <Row key={it.key} it={it} />)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
