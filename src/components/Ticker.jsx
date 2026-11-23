import React from 'react';
import {  } from 'lucide-react';

export default function Ticker({ notice, lang }) {
  return (
    <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white shadow-xs border-y border-emerald-800/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-1.5 sm:py-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{lang === 'bn' ? 'লাইভ আপডেট' : 'Live Update'}</span>
        </div>

        <div className="relative w-full overflow-hidden whitespace-nowrap text-xs sm:text-sm font-medium text-emerald-100 tracking-wide">
          <div className="animate-marquee inline-block">
            {notice}
          </div>
        </div>
      </div>
    </div>
  );
}
