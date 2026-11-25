import React, { useState, useEffect } from 'react';
import { ShoppingBag, MapPin, Search, LayoutGrid, Table as TableIcon, Egg, Bird } from 'lucide-react';
import { getReadyMarketStats } from '../data/readyMarketData';
import { formatBn, formatEn, todayISO } from '../utils/date';
import UserRateTag from './UserRateTag';
import { READY_SUBMIT_FIELDS } from './RateSubmitModal';

// "ইউজারের দেওয়া: গ্রিল, লাল ডিম" — which of the shown rates a visitor gave
const FIELD_BN = Object.fromEntries(READY_SUBMIT_FIELDS.map((f) => [f.key, f.bn]));
FIELD_BN.sonaliSuper = 'সোনালী সুপার';
const userFieldsLabel = (item, lang) => {
  const keys = Object.keys(item.userFields || {});
  if (!keys.length) return '';
  return lang === 'bn' ? `ইউজারের দেওয়া: ${keys.map((k) => FIELD_BN[k] || k).join(', ')}` : `Provided by user: ${keys.map((k) => FIELD_BN[k] || k).join(', ')}`;
};

// A rate that was not in the sheet is 0: show a dash instead of ৳0.
const money = (v) => (Number(v) > 0 ? `৳${v}` : '—');

export default function ReadyMarketSection({ readyRates = [], lang = 'bn', settings = {}, presetSearch }) {
  const [search, setSearch] = useState('');
  // the master search can fill the box (n changes on every request)
  useEffect(() => { if (presetSearch?.n) setSearch(presetSearch.q || ''); }, [presetSearch?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedProduct, setSelectedProduct] = useState('all'); // 'all' | 'broiler' | 'sonali' | 'color' | 'egg' | 'ps'
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'cards' : 'table')); // 'table' | 'cards' (phones start with cards)

  // phones: show a few hubs first, then a "show more" button
  const PHONE_CARDS = 8;
  const [limit, setLimit] = useState(PHONE_CARDS);
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setIsPhone(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  useEffect(() => { setLimit(PHONE_CARDS); }, [search, selectedProduct]);

  const stats = getReadyMarketStats(readyRates);
  const dateISO = settings.readyDateISO;
  const dateLabel = dateISO ? (lang === 'bn' ? formatBn(dateISO) : formatEn(dateISO)).split('(')[0].trim() : '';
  const dateIsToday = dateISO === todayISO();

  const productTabs = [
    { id: 'all', labelBn: 'সকল আইটেম', labelEn: 'All Items' },
    { id: 'broiler', labelBn: '🍗 রেডি ব্রয়লার', labelEn: 'Broiler' },
    { id: 'sonali', labelBn: '🐓 সোনালী মুরগি', labelEn: 'Sonali' },
    { id: 'color', labelBn: '🎨 কালার বার্ড', labelEn: 'Color Bird' },
    { id: 'egg', labelBn: '🥚 ডিম (লাল ও সাদা)', labelEn: 'Eggs' },
    { id: 'ps', labelBn: '🐔 পিএস কাল', labelEn: 'PS-Cull' }
  ];

  const filtered = readyRates.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.regionEn.toLowerCase().includes(q) ||
      item.regionBn.includes(q)
    );
  });

  return (
    <section id="ready-market" className="space-y-5 sm:space-y-6">
      {/* Section Header */}
      <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-2 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{lang === 'bn' ? '🔴 লাইভ আঞ্চলিক মোকাম রেট' : 'Live Regional Market Rates'}</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              {lang === 'bn' 
                ? 'রেডি ব্রয়লার, কালার, সোনালী মুরগি ও ডিমের পাইকারি বাজার দর' 
                : 'Ready Broiler, Color, Sonali Birds & Wholesale Egg Rates'}
            </h2>

            <p className="text-xs sm:text-sm text-emerald-50 mt-2 font-medium max-w-3xl leading-relaxed">
              {lang === 'bn'
                ? 'দেশের শীর্ষ ২১টি আঞ্চলিক মোকাম/পোল্ট্রি হাবের লাইভ পাইকারি বাজার দর।'
                : 'Verified live wholesale rates from 21 regional poultry trading hubs across Bangladesh.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dateLabel && (
              <span className={`px-3.5 py-1.5 rounded-2xl text-xs font-black border ${dateIsToday ? 'bg-emerald-400/25 text-emerald-100 border-emerald-300/40' : 'bg-amber-400/25 text-amber-100 border-amber-300/50'}`}>
                📅 {lang === 'bn' ? 'রেটের তারিখ' : 'Rate date'}: {dateLabel}
              </span>
            )}
            <span className="px-3.5 py-1.5 rounded-2xl bg-white/10 text-emerald-200 text-xs font-bold border border-white/15">
              📍 {readyRates.length} {lang === 'bn' ? 'টি আঞ্চলিক মোকাম' : 'Hubs'}
            </span>
          </div>
        </div>
      </div>

      {/* Top National Average Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">🍗 ব্রয়লার (গ্রিল)</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">৳{stats.avgGrill}<span className="text-xs font-semibold text-slate-500">/কেজি</span></span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">মিডিয়াম ৳{stats.avgMedium} | বড় ৳{stats.avgBig}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">🐓 সোনালী মুরগি</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">৳{stats.avgSonali}<span className="text-xs font-semibold text-slate-500">/কেজি</span></span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">সুপার সাইজ: ৳{stats.avgSonaliSuper}/কেজি</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">🎨 কালার বার্ড</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">৳{stats.avgColor}<span className="text-xs font-semibold text-slate-500">/কেজি</span></span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">রঙিন ব্রয়লার জাত</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">🥚 লাল/বাদামী ডিম</span>
            <span className="text-lg font-black text-amber-700 mt-1 block">৳{stats.avgEggBrown}<span className="text-xs font-semibold text-slate-500">/টি</span></span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">১০০টি: ৳{(stats.avgEggBrown * 100).toFixed(0)}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">🥚 সাদা ডিম</span>
            <span className="text-lg font-black text-slate-700 mt-1 block">৳{stats.avgEggWhite}<span className="text-xs font-semibold text-slate-500">/টি</span></span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">১০০টি: ৳{(stats.avgEggWhite * 100).toFixed(0)}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">🐔 পিএস কাল (Cull)</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">৳{stats.avgPsCull}<span className="text-xs font-semibold text-slate-500">/কেজি</span></span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">প্যারেন্ট স্টক কাল</span>
          </div>
        </div>
      )}

      {/* Control Bar: Product Selector, Search & View Toggle */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Product Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {productTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedProduct(tab.id)}
              className={`px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedProduct === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang === 'bn' ? tab.labelBn : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Right Search & View Mode */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'bn' ? 'মোকাম বা জেলা খুঁজুন...' : 'Search hub or district...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 sm:p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2.5 sm:p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">কোনো আঞ্চলিক মোকামের তথ্য পাওয়া যায়নি</p>
          <button
            onClick={() => { setSearch(''); setSelectedProduct('all'); }}
            className="mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            সবগুলো দেখান
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Detailed Comprehensive Table */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">{lang === 'bn' ? 'মোকাম / অঞ্চল' : 'Hub / Region'}</th>
                  
                  {(selectedProduct === 'all' || selectedProduct === 'broiler') && (
                    <th className="py-3.5 px-3 text-center bg-orange-50/50">
                      <div>{lang === 'bn' ? 'রেডি ব্রয়লার' : 'Broiler'}</div>
                      <div className="text-[10px] font-normal text-slate-500 normal-case">গ্রিল / মিডিয়াম / বড়</div>
                    </th>
                  )}

                  {(selectedProduct === 'all' || selectedProduct === 'sonali') && (
                    <th className="py-3.5 px-3 text-center bg-amber-50/50">
                      <div>{lang === 'bn' ? 'সোনালী মুরগি' : 'Sonali'}</div>
                      <div className="text-[10px] font-normal text-slate-500 normal-case">রেগুলার / সুপার</div>
                    </th>
                  )}

                  {(selectedProduct === 'all' || selectedProduct === 'color') && (
                    <th className="py-3.5 px-3 text-center">
                      <div>{lang === 'bn' ? 'কালার বার্ড' : 'Color Bird'}</div>
                      <div className="text-[10px] font-normal text-slate-500 normal-case">প্রতি কেজি</div>
                    </th>
                  )}

                  {(selectedProduct === 'all' || selectedProduct === 'egg') && (
                    <th className="py-3.5 px-3 text-center bg-yellow-50/40">
                      <div>{lang === 'bn' ? 'ডিম (Egg)' : 'Eggs'}</div>
                      <div className="text-[10px] font-normal text-slate-500 normal-case">লাল / সাদা (প্রতি পিস)</div>
                    </th>
                  )}

                  {(selectedProduct === 'all' || selectedProduct === 'ps') && (
                    <th className="py-3.5 px-3 text-center">
                      <div>{lang === 'bn' ? 'পিএস কাল' : 'PS-Cull'}</div>
                      <div className="text-[10px] font-normal text-slate-500 normal-case">প্রতি কেজি</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const regionDisplay = lang === 'bn' ? item.regionBn : item.regionEn;

                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                      {/* Region */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-extrabold text-slate-900 text-sm">{regionDisplay}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 block ml-5">{item.regionEn}</span>
                        {dateLabel && (
                          <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full border mt-1 ml-5 ${dateIsToday ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                            📅 {dateLabel}
                          </span>
                        )}
                        {item.userFields && <div className="mt-1 ml-5"><UserRateTag lang={lang} label={userFieldsLabel(item, lang)} /></div>}
                      </td>

                      {/* Broiler */}
                      {(selectedProduct === 'all' || selectedProduct === 'broiler') && (
                        <td className="py-3.5 px-3 text-center bg-orange-50/20">
                          <div className="font-black text-slate-900 text-xs sm:text-sm">
                            <span className="text-orange-700">{money(item.broilerGrill)}</span> / 
                            <span className="text-slate-800"> {money(item.broilerMedium)}</span> / 
                            <span className="text-slate-600"> {money(item.broilerBig)}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block">গ্রিল / মিডিয়াম / বড়</span>
                        </td>
                      )}

                      {/* Sonali */}
                      {(selectedProduct === 'all' || selectedProduct === 'sonali') && (
                        <td className="py-3.5 px-3 text-center bg-amber-50/20">
                          <div className="font-black text-slate-900 text-xs sm:text-sm">
                            <span className="text-amber-700">{money(item.sonali)}</span> / 
                            <span className="text-amber-900 font-extrabold"> {money(item.sonaliSuper)}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block">রেগুলার / সুপার</span>
                        </td>
                      )}

                      {/* Color Bird */}
                      {(selectedProduct === 'all' || selectedProduct === 'color') && (
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-black text-slate-900 text-xs sm:text-sm">{money(item.colorBird)}</span>
                        </td>
                      )}

                      {/* Egg */}
                      {(selectedProduct === 'all' || selectedProduct === 'egg') && (
                        <td className="py-3.5 px-3 text-center bg-yellow-50/20">
                          <div className="font-black text-xs sm:text-sm">
                            <span className="text-amber-700">{money(item.eggBrown)}</span> | 
                            <span className="text-slate-600"> {money(item.eggWhite)}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block">লাল | সাদা</span>
                        </td>
                      )}

                      {/* PS-Cull */}
                      {(selectedProduct === 'all' || selectedProduct === 'ps') && (
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-black text-slate-900 text-xs sm:text-sm">{money(item.psCull)}</span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {(isPhone ? filtered.slice(0, limit) : filtered).map((item) => {
            const regionDisplay = lang === 'bn' ? item.regionBn : item.regionEn;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-black text-slate-900 text-base">{regionDisplay}</h3>
                      <span className="text-xs text-slate-500">({item.regionEn})</span>
                    </div>
                    {dateLabel ? (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap ${dateIsToday ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                        📅 {dateLabel}
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        লাইভ মোকাম
                      </span>
                    )}
                  </div>

                  {item.userFields && <div className="mb-3 -mt-1"><UserRateTag lang={lang} label={userFieldsLabel(item, lang)} /></div>}

                  {/* Rates Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="bg-orange-50/60 p-2.5 rounded-2xl border border-orange-200/60">
                      <span className="text-[10px] font-bold text-orange-900 block">🍗 ব্রয়লার (কেজি)</span>
                      <div className="font-black text-slate-900 text-sm mt-0.5">
                        {money(item.broilerGrill)} <span className="text-[10px] font-normal text-slate-500">(গ্রিল)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">মিডিয়াম {money(item.broilerMedium)} | বড় {money(item.broilerBig)}</span>
                    </div>

                    <div className="bg-amber-50/60 p-2.5 rounded-2xl border border-amber-200/60">
                      <span className="text-[10px] font-bold text-amber-900 block">🐓 সোনালী (কেজি)</span>
                      <div className="font-black text-slate-900 text-sm mt-0.5">
                        {money(item.sonali)} <span className="text-[10px] font-normal text-slate-500">(রেগুলার)</span>
                      </div>
                      <span className="text-[10px] text-amber-800 font-bold block">সুপার: {money(item.sonaliSuper)}/কেজি</span>
                    </div>

                    <div className="bg-yellow-50/60 p-2.5 rounded-2xl border border-yellow-200/60">
                      <span className="text-[10px] font-bold text-yellow-900 block">🥚 ডিম (প্রতি পিস)</span>
                      <div className="font-black text-slate-900 text-sm mt-0.5">
                        লাল {money(item.eggBrown)}
                      </div>
                      <span className="text-[10px] text-slate-500 block">সাদা ডিম {money(item.eggWhite)}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-700 block">🎨 কালার ও পিএস</span>
                      <div className="font-black text-slate-900 text-xs mt-0.5">
                        কালার: {money(item.colorBird)}
                      </div>
                      <span className="text-[10px] text-slate-600 block">পিএস কাল: {money(item.psCull)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {isPhone && filtered.length > limit && (
          <button
            onClick={() => setLimit((n) => n + PHONE_CARDS)}
            className="mt-4 w-full py-3.5 rounded-2xl bg-white border-2 border-emerald-600 text-emerald-700 font-black text-sm active:scale-[0.99] cursor-pointer"
          >
            আরও {Math.min(PHONE_CARDS, filtered.length - limit).toLocaleString('bn-BD')}টি মোকাম দেখুন ({(filtered.length - limit).toLocaleString('bn-BD')}টি বাকি)
          </button>
        )}
        </>
      )}
    </section>
  );
}
