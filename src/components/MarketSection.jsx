import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Phone, MessageCircle, MapPin, Loader2, RefreshCw, Store, Search, Share2, Star, BadgeCheck } from 'lucide-react';
import { fetchListings, rateSeller, PRODUCT_OPTIONS, prodOf, UNIT_BN, ageUnitBn } from '../services/market';
import { DISTRICT_GROUPS, districtOf } from '../data/districts';

const bnNum = (n) => new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 2 }).format(n);

const ago = (ms) => {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return 'এইমাত্র';
  if (m < 60) return `${bnNum(m)} মিনিট আগে`;
  const h = Math.round(m / 60);
  if (h < 24) return `${bnNum(h)} ঘণ্টা আগে`;
  return `${bnNum(Math.round(h / 24))} দিন আগে`;
};

/** WhatsApp wants the number with the country code and no leading zero. */
const waLink = (phone, text) => `https://wa.me/88${String(phone).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

const RATED_KEY = 'fn_rated_listings';
const loadRated = () => { try { return JSON.parse(localStorage.getItem(RATED_KEY)) || {}; } catch { return {}; } };

const shareListing = async (it, prod, unit) => {
  const text = `${prod.emoji} ${prod.bn} বিক্রি হবে — ${bnNum(it.quantity)} ${unit.bn}, ${it.price > 0 ? `৳${bnNum(it.price)} ${unit.per}` : 'দর আলোচনা সাপেক্ষে'}\n📍 ${it.location}\n📞 ${it.sellerName}: ${it.phone}\n\nআরও বিজ্ঞাপন: https://fosholnexa.com`;
  try {
    if (navigator.share) { await navigator.share({ title: `${prod.bn} বিক্রি`, text }); return; }
  } catch { return; } // user closed the share sheet
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
};

/** Stars + count; with onRate the buyer can tap a star to rate the seller. */
function Rating({ rating, onRate, rated, busy }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {rating ? (
        <span className="inline-flex items-center gap-0.5 text-xs font-black text-amber-600"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{bnNum(rating.avg)} <span className="font-semibold text-slate-500">({bnNum(rating.count)} জন)</span></span>
      ) : <span className="text-[11px] text-slate-400">এখনো রেটিং নেই</span>}
      {rated ? (
        <span className="text-[11px] font-bold text-emerald-700">✓ আপনি রেটিং দিয়েছেন</span>
      ) : open ? (
        <span className="inline-flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} disabled={busy} onClick={() => { setOpen(false); onRate(n); }} aria-label={`${n} স্টার`} className="p-0.5 cursor-pointer text-slate-300 hover:text-amber-500"><Star className="w-5 h-5 fill-current" /></button>
          ))}
        </span>
      ) : (
        <button onClick={() => setOpen(true)} className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer">রেটিং দিন</button>
      )}
    </div>
  );
}

/**
 * Public marketplace: live listings posted by registered sellers. The site only connects buyers and
 * sellers; price and delivery are settled between them.
 */
export default function MarketSection({ lang, onOpenSeller, refreshKey }) {
  const bn = lang === 'bn';
  const [items, setItems] = useState(null); // null = loading
  const [viewer, setViewer] = useState(null); // { imgs, i } picture being viewed full screen
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('');
  const [rated, setRated] = useState(loadRated);
  const [rateBusy, setRateBusy] = useState(false);
  const [rateMsg, setRateMsg] = useState('');

  const load = useCallback(async () => {
    setFailed(false);
    const list = await fetchListings();
    if (list === null) setFailed(true);
    setItems(list || []);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || []).filter((it) => (filter === 'all' || it.product === filter)
      && (!district || districtOf(it) === district)
      && (!q || `${it.location} ${it.sellerName} ${it.details}`.toLowerCase().includes(q)));
  }, [items, filter, query, district]);

  // districts that have at least one ad (with counts), so buyers never pick an empty one
  const districtCounts = useMemo(() => {
    const m = {};
    (items || []).forEach((it) => { const d = districtOf(it); if (d) m[d] = (m[d] || 0) + 1; });
    return m;
  }, [items]);

  const onRate = async (it, stars) => {
    setRateBusy(true); setRateMsg('');
    const r = await rateSeller(it.id, stars);
    setRateBusy(false);
    if (r.ok || r.status === 409) {
      const next = { ...rated, [it.id]: stars };
      setRated(next);
      try { localStorage.setItem(RATED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      if (r.ok) setItems((list) => (list || []).map((x) => (x.sellerName === it.sellerName && x.phone === it.phone ? { ...x, rating: r.rating } : x)));
      setRateMsg(r.ok ? 'ধন্যবাদ, আপনার রেটিং যোগ হয়েছে' : (r.error || ''));
    } else setRateMsg(r.error || 'রেটিং দেওয়া যায়নি');
    setTimeout(() => setRateMsg(''), 3500);
  };

  return (
    <section className="space-y-5">
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Store className="w-6 h-6" /></div>
          <div>
            <h2 className="font-black text-lg sm:text-xl">{bn ? 'বিক্রির বাজার — সরাসরি বিক্রেতার কাছ থেকে' : 'Marketplace — buy direct from sellers'}</h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">
              {bn ? 'রেডি মুরগি, ডিম বা হাঁস বিক্রি করতে চান? লগইন ছাড়াই নাম, নম্বর ও এলাকা দিয়ে ফ্রি বিজ্ঞাপন দিন।' : 'Want to sell ready birds or eggs? Post a free ad with just your name, number and location — no login.'}
            </p>
          </div>
        </div>
        <button onClick={onOpenSeller} className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-sm cursor-pointer shrink-0">
          🧑‍🌾 {bn ? 'বিজ্ঞাপন দিন (লগইন ছাড়া)' : 'Post an ad (no login)'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {[{ key: 'all', bn: 'সব', emoji: '🛒' }, ...PRODUCT_OPTIONS].map((p) => (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-black border transition cursor-pointer ${filter === p.key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'}`}
            >
              {p.emoji} {p.bn}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="জেলা" className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-48">
            <option value="">{bn ? 'সব জেলা' : 'All districts'}</option>
            {DISTRICT_GROUPS.map((g) => {
              const ds = g.districts.filter((d) => districtCounts[d]);
              return ds.length ? (
                <optgroup key={g.division} label={g.division}>
                  {ds.map((d) => <option key={d} value={d}>{d} ({bnNum(districtCounts[d])})</option>)}
                </optgroup>
              ) : null;
            })}
          </select>
          <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={bn ? 'এলাকা বা বিক্রেতার নাম খুঁজুন' : 'Search area or seller'}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button onClick={load} aria-label="Reload" className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>
      {rateMsg && <div className="text-center text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl py-2">{rateMsg}</div>}

      {items === null ? (
        <div className="py-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : shown.length === 0 ? (
        <div className="py-14 text-center bg-white border border-dashed border-slate-300 rounded-2xl space-y-2">
          <div className="text-4xl">🐔</div>
          <p className="font-black text-slate-800">
            {failed ? (bn ? 'বিজ্ঞাপন লোড করা যায়নি' : 'Could not load listings') : (bn ? 'এখনো কোনো বিজ্ঞাপন নেই' : 'No listings yet')}
          </p>
          <p className="text-sm text-slate-500">{bn ? 'এখানে বিজ্ঞাপন দিন' : 'Post your ad here'}</p>
          <button onClick={onOpenSeller} className="mt-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-sm cursor-pointer">
            ➕ {bn ? 'বিজ্ঞাপন দিন' : 'Post an ad'}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((it) => {
            const prod = prodOf(it);
            const unit = UNIT_BN[it.unit] || UNIT_BN.kg;
            const msg = `আসসালামু আলাইকুম, ফসলনেক্সা সাইটে আপনার "${prod.bn}" বিক্রির বিজ্ঞাপন দেখলাম। বিস্তারিত জানতে চাই।`;
            return (
              <article key={it.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                {it.imgs?.length > 0 && (
                  <div className={`grid gap-1.5 -mx-1 ${it.imgs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {it.imgs.map((src, i) => (
                      <button key={src} type="button" onClick={() => setViewer({ imgs: it.imgs, i })} aria-label={`ছবি ${i + 1} বড় করে দেখুন`} className="block overflow-hidden rounded-xl bg-slate-100 cursor-zoom-in">
                        <img src={src} alt={`${prod.bn} — ${it.location}`} loading="lazy" className={`w-full object-cover ${it.imgs.length > 1 ? 'h-32' : 'h-44'}`} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl">{prod.emoji}</div>
                    <div>
                      <h3 className="font-black text-slate-900 leading-tight">{prod.bn}</h3>
                      <p className="text-[11px] text-slate-500">{ago(it.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {it.price > 0 ? (
                      <>
                        <div className="font-black text-emerald-700 text-lg leading-none">৳{bnNum(it.price)}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{unit.per}</div>
                      </>
                    ) : (
                      <div className="text-xs font-black text-amber-700">{bn ? 'দর আলোচনা সাপেক্ষে' : 'Negotiable'}</div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-slate-700 space-y-1">
                  <p><span className="font-black">{bn ? 'পরিমাণ:' : 'Quantity:'}</span> {bnNum(it.quantity)} {unit.bn}</p>
                  {it.age > 0 && <p><span className="font-black">{bn ? 'বয়স:' : 'Age:'}</span> {bnNum(it.age)} {ageUnitBn(it.ageUnit)}</p>}
                  <p className="flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" /> <span>{it.location}</span></p>
                  {it.details && <p className="text-slate-600 whitespace-pre-line break-words">{it.details}</p>}
                </div>

                <div className="mt-auto pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">{bn ? 'বিক্রেতা:' : 'Seller:'} <span className="font-black text-slate-800">{it.sellerName}</span>
                    {it.verified && <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800"><BadgeCheck className="w-3 h-3" />{bn ? 'যাচাইকৃত' : 'Verified'}</span>}
                  </p>
                  <div className="mb-2"><Rating rating={it.rating} rated={rated[it.id]} busy={rateBusy} onRate={(n) => onRate(it, n)} /></div>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <a href={`tel:${it.phone}`} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs">
                      <Phone className="w-4 h-4" /> {bn ? 'কল করুন' : 'Call'}
                    </a>
                    <a href={waLink(it.phone, msg)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                    <button onClick={() => shareListing(it, prod, unit)} aria-label={bn ? 'শেয়ার করুন' : 'Share'} className="flex items-center justify-center px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-[11px] sm:text-xs text-slate-500 text-center leading-relaxed">
        {bn
          ? '⚠️ বিজ্ঞাপন বিক্রেতারা নিজেরা দেন। লেনদেনের আগে পণ্য ও বিক্রেতা যাচাই করে নিন — দাম, ডেলিভারি ও পেমেন্ট ক্রেতা-বিক্রেতার নিজস্ব বিষয়, ফসলনেক্সা এর দায় নেয় না।'
          : 'Ads are posted by sellers. Verify before you pay — price, delivery and payment are between buyer and seller.'}
      </p>
      {viewer && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-3" onClick={() => setViewer(null)} role="dialog" aria-label="ছবি">
          <img src={viewer.imgs[viewer.i]} alt="" className="max-w-full max-h-[80dvh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          {viewer.imgs.length > 1 && (
            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              {viewer.imgs.map((_, j) => (
                <button key={j} onClick={() => setViewer({ ...viewer, i: j })} className={`w-11 h-11 rounded-full text-sm font-black cursor-pointer ${j === viewer.i ? 'bg-white text-slate-900' : 'bg-white/20 text-white'}`}>{j + 1}</button>
              ))}
            </div>
          )}
          <button onClick={() => setViewer(null)} aria-label="বন্ধ করুন" className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/20 text-white text-xl cursor-pointer">✕</button>
        </div>
      )}
    </section>
  );
}
