import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Phone, MessageCircle, MapPin, Loader2, RefreshCw, Store, Search } from 'lucide-react';
import { fetchListings, PRODUCT_OPTIONS, PRODUCT_BN, UNIT_BN } from '../services/market';

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

/**
 * Public marketplace: live listings posted by registered sellers. The site only connects buyers and
 * sellers; price and delivery are settled between them.
 */
export default function MarketSection({ lang, onOpenSeller, refreshKey }) {
  const bn = lang === 'bn';
  const [items, setItems] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

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
      && (!q || `${it.location} ${it.sellerName} ${it.details}`.toLowerCase().includes(q)));
  }, [items, filter, query]);

  return (
    <section className="space-y-5">
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Store className="w-6 h-6" /></div>
          <div>
            <h2 className="font-black text-lg sm:text-xl">{bn ? 'বিক্রির বাজার — সরাসরি বিক্রেতার কাছ থেকে' : 'Marketplace — buy direct from sellers'}</h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">
              {bn ? 'রেডি মুরগি, ডিম বা হাঁস বিক্রি করতে চান? ফ্রি অ্যাকাউন্ট খুলে বিজ্ঞাপন দিন।' : 'Want to sell ready birds or eggs? Open a free account and post an ad.'}
            </p>
          </div>
        </div>
        <button onClick={onOpenSeller} className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-sm cursor-pointer shrink-0">
          🧑‍🌾 {bn ? 'বিক্রি করুন / লগইন' : 'Sell / Login'}
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
        <div className="flex items-center gap-2">
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

      {items === null ? (
        <div className="py-16 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : shown.length === 0 ? (
        <div className="py-14 text-center bg-white border border-dashed border-slate-300 rounded-2xl space-y-2">
          <div className="text-4xl">🐔</div>
          <p className="font-black text-slate-800">
            {failed ? (bn ? 'বিজ্ঞাপন লোড করা যায়নি' : 'Could not load listings') : (bn ? 'এখনো কোনো বিজ্ঞাপন নেই' : 'No listings yet')}
          </p>
          <p className="text-sm text-slate-500">{bn ? 'প্রথম বিজ্ঞাপনটি আপনিই দিন!' : 'Be the first to post one!'}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((it) => {
            const prod = PRODUCT_BN[it.product] || PRODUCT_BN.other;
            const unit = UNIT_BN[it.unit] || UNIT_BN.kg;
            const msg = `আসসালামু আলাইকুম, ফসলনেক্সা সাইটে আপনার "${prod.bn}" বিক্রির বিজ্ঞাপন দেখলাম। বিস্তারিত জানতে চাই।`;
            return (
              <article key={it.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
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
                  <p className="flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" /> <span>{it.location}</span></p>
                  {it.details && <p className="text-slate-600 whitespace-pre-line break-words">{it.details}</p>}
                </div>

                <div className="mt-auto pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">{bn ? 'বিক্রেতা:' : 'Seller:'} <span className="font-black text-slate-800">{it.sellerName}</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`tel:${it.phone}`} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs">
                      <Phone className="w-4 h-4" /> {bn ? 'কল করুন' : 'Call'}
                    </a>
                    <a href={waLink(it.phone, msg)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
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
    </section>
  );
}
