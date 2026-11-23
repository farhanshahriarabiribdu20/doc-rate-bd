import React from 'react';
import { YOUTUBE_URL, FB_PAGE_URL } from '../data/links';
import { Phone, MessageCircle, MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function Footer({ lang, isStale = false, settings }) {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs mt-16 border-t border-slate-800">
      {/* Top Banner Disclaimer */}
      <div className="bg-slate-900/90 py-4 px-4 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3 text-slate-300">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs leading-relaxed">
            {lang === 'bn' 
              ? 'সতর্কবার্তা ও নিয়মাবলী: প্রতিদিনের বাচ্চার রেট কোম্পানির নিজস্ব পলিসি, এলাকাভিত্তিক পরিবহন ও ডিলার কমিশনের উপর ভিত্তি করে কিছুটা কম-বেশি হতে পারে। অর্ডার বুকিং করার আগে নিশ্চিত রেট যাচাই করে নেওয়া জরুরি।' 
              : 'Disclaimer: DOC rates are indicative and subject to change based on company daily declarations, regional transportation, and local market demand.'}
          </p>
        </div>
      </div>

      {/* Main Footer content */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="FosholNexa BD" 
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-md" 
            />
            <div>
              <span className="text-xl font-black text-white tracking-tight leading-none block">
                FosholNexa <span className="text-emerald-500">BD</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mt-1">
                Official Agritech Portal
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-300 font-medium">
            সঠিক তথ্য, সচেতন খামারি, সমৃদ্ধ কৃষি।
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            {lang === 'bn' 
              ? 'বাংলাদেশের পোল্ট্রি খামারীদের জন্য এক বিশ্বস্ত ডিজিটাল মার্কেট প্ল্যাটফর্ম। সঠিক তথ্য ও সাশ্রয়ী মূল্যে বাচ্চা বুকিংয়ের নিশ্চয়তা।' 
              : 'Empowering poultry farmers across Bangladesh with accurate live daily chick prices and verified booking.'}
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
            {lang === 'bn' ? 'বাচ্চার জাতসমূহ' : 'Chick Breeds'}
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>ব্রয়লার বাচ্চা (Cobb 500 / Ross 308)</span>
            </li>
            <li className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>সোনালী সুপার ও এ-গ্রেড বাচ্চা</span>
            </li>
            <li className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              <span>লেয়ার বাদামী (Hy-Line / Novogen)</span>
            </li>
            <li className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span>লেয়ার সাদা (BV 300)</span>
            </li>
            <li className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
              <span>ককরেল ও কালার মুরগির বাচ্চা</span>
            </li>
          </ul>
        </div>

        {/* Top Companies */}
        <div>
          <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
            {lang === 'bn' ? 'শীর্ষস্থানীয় কোম্পানিসমূহ' : 'Partner Companies'}
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li className="hover:text-emerald-400 transition cursor-pointer">কাজী ফার্মস লিমিটেড (Kazi Farms)</li>
            <li className="hover:text-emerald-400 transition cursor-pointer">প্যারাগন গ্রুপ (Paragon Group)</li>
            <li className="hover:text-emerald-400 transition cursor-pointer">নারিশ পোল্ট্রি (Nourish Poultry)</li>
            <li className="hover:text-emerald-400 transition cursor-pointer">সিপি বাংলাদেশ (CP Bangladesh)</li>
            <li className="hover:text-emerald-400 transition cursor-pointer">আফতাব, কোয়ালিটি ও প্রভিটা গ্রুপ</li>
          </ul>
        </div>

        {/* Helpline & Social Links */}
        <div className="space-y-4">
          <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
            {lang === 'bn' ? 'জরুরি যোগাযোগ ও সোশ্যাল' : 'Helpline & Social'}
          </h4>
          <div className="space-y-2.5 text-xs">
            <a href="tel:01619500178" className="flex items-center gap-2 text-slate-300 hover:text-white transition">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">01619-500178</span>
              <span className="text-[10px] text-slate-500">(সকাল ৮টা - রাত ১০টা)</span>
            </a>

            <a href="https://wa.me/8801619500178" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-300 hover:text-white transition">
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>হোয়াটসঅ্যাপ: 01619-500178</span>
            </a>

            <a href="https://chat.whatsapp.com/B9A22d7rAQ4HfQyaRPwn4o" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold transition">
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>হোয়াটসঅ্যাপ গ্রুপে যুক্ত হোন</span>
            </a>

            <a href="https://www.facebook.com/share/g/18vu9Y5cja/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-300 hover:text-blue-200 font-bold transition">
              <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-[10px] font-black shrink-0">f</span>
              <span>আমাদের ফেসবুক গ্রুপের সাথে যুক্ত হোন</span>
            </a>

            <a href={FB_PAGE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition">
              <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-[10px] font-black shrink-0">f</span>
              <span>অফিসিয়াল ফেসবুক পেজ</span>
            </a>

            <a href={YOUTUBE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-red-400 hover:text-red-300 font-semibold transition">
              <span className="w-4 h-4 rounded bg-[#FF0000] text-white flex items-center justify-center text-[8px] font-black shrink-0">▶</span>
              <span>আমাদের ইউটিউব চ্যানেল</span>
            </a>

            {settings?.telegramUrl && (
              <a href={settings.telegramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sky-400 hover:text-sky-300 font-semibold transition">
                <span className="w-4 h-4 text-[12px] leading-none shrink-0">✈️</span>
                <span>টেলিগ্রামে প্রতিদিনের রেট আপডেট</span>
              </a>
            )}

            <div className="flex items-center gap-2 text-slate-400 pt-1">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>ঢাকা, বাংলাদেশ (সারাদেশে সরবরাহ)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-slate-900 pt-5 pb-24 sm:pb-20 px-4 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between max-w-7xl mx-auto gap-3">
        <p className="font-medium">
          © {new Date().getFullYear()} FosholNexa BD. সর্বস্বত্ব সংরক্ষিত (All rights reserved).
        </p>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> {isStale ? 'রেট হালনাগাদের অপেক্ষায়' : 'রেট শিট অনুযায়ী বাজার তথ্য'}
          </span>
          <a 
            href="#admin" 
            title="Owner Login" 
            className="text-slate-800 hover:text-slate-500 transition select-none cursor-pointer"
          >
            🔒
          </a>
        </div>
      </div>
    </footer>
  );
}
