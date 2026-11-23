import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';

export default function PriceChart({ rates = [], lang }) {
  const [selectedCat, setSelectedCat] = useState('broiler');

  const catOptions = [
    { id: 'broiler', labelBn: 'ব্রয়লার', labelEn: 'Broiler' },
    { id: 'sonali', labelBn: 'সোনালী', labelEn: 'Sonali' },
    { id: 'layer', labelBn: 'লেয়ার', labelEn: 'Layer' }
  ];

  // Helper to extract clean readable company name without cutoff
  const getCompanyName = (item, isBn) => {
    if (isBn) {
      // Primary Bengali company name
      const bn = item.company.split('(')[0].trim();
      return bn.replace(/\s+(লিমিটেড)$/, '').trim() || bn;
    }
    // Clean English company name
    return (item.companyEn || item.company)
      .replace(/\s+(Ltd\.?|Limited|Group|Agro)$/i, '')
      .trim();
  };

  // Filter rates based on category
  const filtered = rates
    .filter(r => {
      if (selectedCat === 'broiler') return r.category === 'broiler';
      if (selectedCat === 'sonali') return r.category === 'sonali';
      return (r.category || '').startsWith('layer');
    })
    .sort((a, b) => a.todayRate - b.todayRate)
    .slice(0, 8); // Top 8 companies for clean bar layout

  const maxPrice = filtered.length ? Math.max(...filtered.map(d => d.todayRate)) + 4 : 50;
  const minPrice = filtered.length ? Math.max(0, Math.min(...filtered.map(d => d.todayRate)) - 4) : 0;
  const range = maxPrice - minPrice || 1;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg">
              {lang === 'bn' ? 'শীর্ষ কোম্পানির আজকের লাইভ দর তুলনা' : 'Top Companies Live Rate Comparison'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {lang === 'bn' ? 'কোম্পানিগুলোর আজকের রেট তুলনা করে সঠিক ও সাশ্রয়ী দামে বাচ্চা বেছে নিন' : 'Compare verified rates across top companies to buy at best wholesale price'}
          </p>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl gap-1 border border-slate-200/60">
          {catOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedCat(opt.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCat === opt.id
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? opt.labelBn : opt.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Bar Chart Visualization with full height clearance and no clipped labels */}
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div className="min-w-[640px] sm:min-w-0 grid grid-cols-8 gap-2 sm:gap-4 px-2 sm:px-3">
          {filtered.map((item, idx) => {
            const heightPercent = Math.min(100, Math.max(22, ((item.todayRate - minPrice) / range) * 100));
            const companyDisplay = getCompanyName(item, lang === 'bn');

            return (
              <div key={idx} className="flex flex-col items-center group cursor-default">
                {/* Upper Section: Price + Bar sitting flush on the baseline */}
                <div className="w-full flex flex-col items-center justify-end h-40 pb-0 border-b-2 border-slate-200/90 group-hover:border-emerald-500 transition-colors">
                  {/* Rate Value */}
                  <span className="text-xs sm:text-sm font-black mb-2 text-slate-900 group-hover:text-emerald-700 transition-transform group-hover:scale-110 tracking-tight">
                    ৳{item.todayRate}
                  </span>

                  {/* Bar Track & Fill */}
                  <div className="w-full max-w-[46px] bg-slate-100/80 rounded-t-2xl h-28 flex items-end overflow-hidden p-0.5 border-t border-x border-slate-200/70 shadow-2xs">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full rounded-t-xl bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 group-hover:from-emerald-500 group-hover:to-teal-300 transition-all duration-300 shadow-xs"
                    ></div>
                  </div>
                </div>

                {/* Lower Section: Company Name & Breed BELOW baseline - NO clipping, NO truncation */}
                <div className="pt-2.5 pb-2 w-full flex flex-col items-center text-center px-0.5">
                  <span
                    className="text-xs sm:text-[13px] font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight text-center break-words max-w-full"
                    title={item.company}
                  >
                    {companyDisplay}
                  </span>
                  <span
                    className="text-[10px] sm:text-[11px] text-slate-500 font-semibold leading-normal mt-1 text-center truncate max-w-full"
                    title={item.breed}
                  >
                    {item.breed}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
