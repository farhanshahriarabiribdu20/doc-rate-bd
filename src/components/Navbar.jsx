import React from 'react';
import { Calendar, PhoneCall, ShieldCheck, Calculator as CalcIcon, Moon, Sun } from 'lucide-react';

export default function Navbar({ 
  lang, 
  setLang, 
  activeTab, 
  setActiveTab,
  onOpenAdmin, 
  onOpenShare, 
  onOpenCalculator,
  onOpenBanner,
  isDark,
  toggleTheme,
  settings 
}) {
  const today = new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      {/* Top Micro Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 text-emerald-100 text-xs py-1.5 px-4 border-b border-emerald-900/40">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          {/* Left status & date */}
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{settings.brandName || 'FosholNexa'}</span>
            </span>
            <span className="text-emerald-800 hidden sm:inline">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-200/90 text-[11px] font-medium">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {today}
            </span>
          </div>

          {/* Right hotline & language */}
          <div className="flex items-center gap-3">
            <a 
              href={`tel:${settings.hotline || '01619500178'}`} 
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-emerald-200 hover:text-white transition font-semibold text-[11px] border border-white/10"
            >
              <PhoneCall className="w-3 h-3 text-emerald-400" />
              <span>{lang === 'bn' ? 'হটলাইন:' : 'Hotline:'} {settings.hotline || '01619-500178'}</span>
            </a>
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Light mode' : 'Dark mode'}
              title={isDark ? 'লাইট মোড' : 'ডার্ক মোড'}
              className="flex items-center justify-center w-7 h-6 rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 transition cursor-pointer"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="font-bold tracking-wider text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/60 transition cursor-pointer"
            >
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Brand info */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <img 
              src="/logo.jpg" 
              alt="FosholNexa BD Logo" 
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover shadow-sm ring-2 ring-emerald-500/30 group-hover:ring-emerald-500 transition duration-300" 
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                FosholNexa <span className="text-emerald-600 font-black">BD</span>
              </h1>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100/90 text-emerald-800 tracking-wider border border-emerald-300/80 shadow-2xs">
                OFFICIAL
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-tight">
              {settings.taglineBn || 'সঠিক তথ্য, সচেতন খামারি, সমৃদ্ধ কৃষি।'}
            </p>
          </div>
        </div>

        {/* Middle Section Navigation Tabs */}
        <nav className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
          <button
            onClick={() => setActiveTab('doc')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'doc'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🐣</span>
            <span>{lang === 'bn' ? 'বাচ্চার দর (DOC)' : 'DOC Rates'}</span>
          </button>
          <button
            onClick={() => setActiveTab('ready')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ready'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🍗</span>
            <span>{lang === 'bn' ? 'রেডি মুরগি ও ডিম' : 'Ready & Eggs'}</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          </button>
        </nav>

        {/* Action Buttons: Facebook, WhatsApp, Calculator */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Facebook Page Button */}
          <a
            href="https://www.facebook.com/profile.php?id=61582752186760"
            target="_blank"
            rel="noopener noreferrer"
            title={lang === 'bn' ? 'আমাদের অফিসিয়াল ফেসবুক পেজ ভিজিট করুন' : 'Official Facebook Page'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50/90 hover:bg-blue-100 text-[#1877F2] border border-blue-200/90 transition shadow-2xs font-bold text-xs cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="hidden sm:inline">{lang === 'bn' ? 'ফেসবুক পেজ' : 'Page'}</span>
          </a>

          {/* WhatsApp Group Button */}
          <a
            href="https://chat.whatsapp.com/B9A22d7rAQ4HfQyaRPwn4o"
            target="_blank"
            rel="noopener noreferrer"
            title={lang === 'bn' ? 'আমাদের হোয়াটসঅ্যাপ গ্রুপে যুক্ত হোন' : 'Join WhatsApp Group'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 text-[#075E54] border border-emerald-200/90 transition shadow-2xs font-bold text-xs cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 fill-[#25D366] shrink-0" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.587 1.745.882 2.791.882 3.181 0 5.768-2.587 5.768-5.766.001-3.181-2.585-5.768-5.768-5.768zm0-2.172c4.386 0 7.94 3.554 7.94 7.938 0 4.385-3.554 7.939-7.94 7.939-1.258 0-2.457-.308-3.528-.863l-4.503 1.18 1.203-4.397c-.636-1.121-.972-2.386-.972-3.859 0-4.384 3.554-7.938 7.94-7.938z"/>
            </svg>
            <span className="hidden sm:inline">{lang === 'bn' ? 'হোয়াটসঅ্যাপ গ্রুপ' : 'Group'}</span>
          </a>

          {/* Calculator Button */}
          <button
            onClick={onOpenCalculator}
            title={lang === 'bn' ? 'বাচ্চা ও ফিড খরচ ক্যালকুলেটর' : 'Farm Cost Calculator'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-xs cursor-pointer active:scale-95"
          >
            <CalcIcon className="w-4 h-4 text-slate-950" />
            <span className="hidden md:inline">{lang === 'bn' ? 'ক্যালকুলেটর' : 'Calculator'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
