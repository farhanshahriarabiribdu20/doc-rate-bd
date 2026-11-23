import React from 'react';
import {  } from 'lucide-react';

const EXTRA_BN = 'আমাদের সকল রেট আপডেট সবার আগে এই ওয়েবসাইটে দেওয়া হয়, তারপর ফেসবুক ও অন্যান্য জায়গায় — তাই সবার আগে আপডেট পেতে ওয়েবসাইটে নজর রাখুন।';
const EXTRA_EN = 'All our rate updates go on this website first, then Facebook and elsewhere — keep an eye on the website to get every update before anyone else.';

export default function Ticker({ notice, lang }) {
  const extra = lang === 'bn' ? EXTRA_BN : EXTRA_EN;
  // The chick-sale (booking) announcement is no longer shown, wherever the notice was saved from.
  const base = (notice || '').split(/(?<=[।.!])\s*/).filter((x) => x && !x.includes('বাচ্চার বুকিং')).join(' ');
  const text = base.includes(extra) ? base : `${base}  ${extra}`;
  return (
    <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white shadow-xs border-y border-emerald-800/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{lang === 'bn' ? 'লাইভ আপডেট' : 'Live Update'}</span>
        </div>

        <div className="relative w-full overflow-hidden whitespace-nowrap text-xs sm:text-sm font-medium text-emerald-100 tracking-wide">
          <div className="animate-marquee inline-block">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
