import React from 'react';
import { Flame, Sparkles, Egg, ShieldCheck, CheckCircle } from 'lucide-react';

export default function StatsOverview({ rates, lang }) {
  const broilerRates = rates.filter(r => r.category === 'broiler');
  const sonaliRates = rates.filter(r => r.category === 'sonali');
  const layerRates = rates.filter(r => r.category.startsWith('layer'));

  const getAvg = (list) => {
    if (!list.length) return 0;
    const sum = list.reduce((acc, curr) => acc + (Number(curr.todayRate) || 0), 0);
    return Math.round(sum / list.length);
  };

  const getMinMax = (list) => {
    if (!list.length) return { min: 0, max: 0 };
    const nums = list.map(r => Number(r.todayRate) || 0).filter(n => n > 0);
    return { min: Math.min(...nums), max: Math.max(...nums) };
  };

  const broilerAvg = getAvg(broilerRates);
  const broilerRange = getMinMax(broilerRates);

  const sonaliAvg = getAvg(sonaliRates);
  const sonaliRange = getMinMax(sonaliRates);

  const layerAvg = getAvg(layerRates);
  const layerRange = getMinMax(layerRates);

  const renderVerifiedBadge = () => (
    <span className="flex items-center text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300/80">
      <CheckCircle className="w-2.5 h-2.5 mr-1 text-emerald-600" /> {lang === 'bn' ? 'যাচাইকৃত' : 'Verified'}
    </span>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
      {/* Broiler Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600">
              {lang === 'bn' ? 'ব্রয়লার গড় দর' : 'Avg Broiler'}
            </span>
          </div>
          {renderVerifiedBadge()}
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">৳{broilerAvg}</span>
          <span className="text-xs text-slate-400 font-semibold">/{lang === 'bn' ? 'পিস' : 'pc'}</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
          <span>{lang === 'bn' ? `${broilerRates.length}টি কোম্পানি` : `${broilerRates.length} brands`}</span>
          <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/70">
            ৳{broilerRange.min} - ৳{broilerRange.max}
          </span>
        </div>
      </div>

      {/* Sonali Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600">
              {lang === 'bn' ? 'সোনালী গড় দর' : 'Avg Sonali'}
            </span>
          </div>
          {renderVerifiedBadge()}
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">৳{sonaliAvg}</span>
          <span className="text-xs text-slate-400 font-semibold">/{lang === 'bn' ? 'পিস' : 'pc'}</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
          <span>{lang === 'bn' ? `${sonaliRates.length}টি কোম্পানি` : `${sonaliRates.length} brands`}</span>
          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
            ৳{sonaliRange.min} - ৳{sonaliRange.max}
          </span>
        </div>
      </div>

      {/* Layer Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-600"></div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-yellow-50 text-yellow-700 border border-yellow-200/80 flex items-center justify-center font-bold">
              <Egg className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600">
              {lang === 'bn' ? 'লেয়ার গড় দর' : 'Avg Layer'}
            </span>
          </div>
          {renderVerifiedBadge()}
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">৳{layerAvg}</span>
          <span className="text-xs text-slate-400 font-semibold">/{lang === 'bn' ? 'পিস' : 'pc'}</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
          <span>{lang === 'bn' ? `${layerRates.length}টি কোম্পানি` : `${layerRates.length} brands`}</span>
          <span className="font-bold text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-200/70">
            ৳{layerRange.min} - ৳{layerRange.max}
          </span>
        </div>
      </div>

      {/* Total Verified Hatcheries Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600">
              {lang === 'bn' ? 'মোট কোম্পানি' : 'Total Companies'}
            </span>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
            ১০০% অথেনটিক
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{rates.length}টি</span>
          <span className="text-xs text-slate-400 font-semibold">/প্রতিষ্ঠান</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
          <span>{lang === 'bn' ? 'সরাসরি রেট শিট' : 'Direct Sheets'}</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
            ৮ বিভাগ কভার্ড
          </span>
        </div>
      </div>
    </div>
  );
}
