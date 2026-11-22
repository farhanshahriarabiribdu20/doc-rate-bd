import React from 'react';
import { Wheat, TrendingUp, TrendingDown, Minus, Phone, MessageCircle } from 'lucide-react';

export default function FeedSection({ feeds, settings, lang }) {
  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Wheat className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
              {lang === 'bn' ? 'পোল্ট্রি ফিডের বাজারদর (Feed Rates)' : 'Poultry Feed Market Rates'}
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            {lang === 'bn' ? 'প্রতি ৫০ কেজি বস্তার রেগুলার পাইকারি রেট' : '50kg commercial feed sack wholesale price'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeds.map((item) => {
          const diff = item.todayRate - item.yesterdayRate;
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    {item.weight}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {item.feedType}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base">{item.productName}</h4>
                <p className="text-xs text-slate-500 font-medium mb-3">{item.company}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">বর্তমান রেট</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">৳{item.todayRate}</span>
                    <span className="text-xs text-slate-500">/বস্তা</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">পূর্ববর্তী: ৳{item.yesterdayRate}</span>
                  {diff > 0 ? (
                    <span className="inline-flex items-center text-xs font-bold text-red-600">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> +৳{diff}
                    </span>
                  ) : diff < 0 ? (
                    <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                      <TrendingDown className="w-3 h-3 mr-0.5" /> -৳{Math.abs(diff)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium text-slate-500">
                      <Minus className="w-3 h-3 mr-0.5" /> অপরিবর্তিত
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
