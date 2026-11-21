import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Ticker from './components/Ticker';
import StatsOverview from './components/StatsOverview';
import FilterBar from './components/FilterBar';
import RateCard from './components/RateCard';
import RateTable from './components/RateTable';
import PriceChart from './components/PriceChart';
import Calculator from './components/Calculator';
import ShareModal from './components/ShareModal';
import BookingModal from './components/BookingModal';
import BannerGeneratorModal from './components/BannerGeneratorModal';
import AdminModal from './components/AdminModal';
import FeedbackWidget from './components/FeedbackWidget';
import ReadyMarketSection from './components/ReadyMarketSection';
import Footer from './components/Footer';
import { fetchSiteData } from './services/api';
import { ageInDays, formatBn, formatEn, toBnDigits } from './utils/date';
import {
  INITIAL_RATES,
  INITIAL_FEEDS,
  INITIAL_TICKER_NOTICE,
  SITE_SETTINGS
} from './data/initialData';
import { INITIAL_READY_RATES } from './data/readyMarketData';
import { Bird, AlertTriangle } from 'lucide-react';

// Last data published by the admin (kept for instant load / offline use).
const CACHE_KEY = 'fosholnexa_published_v1';
// Rates older than this many days are clearly marked as outdated.
const STALE_AFTER_DAYS = 2;
// Old per-browser keys from earlier versions (incl. cached visitor feedback) are removed.
const LEGACY_KEYS = [
  'fosholnexa_settings_v2',
  'fosholnexa_rates_sheet_v3_clean',
  'fosholnexa_ready_rates',
  'fosholnexa_feeds',
  'fosholnexa_medicines',
  'fosholnexa_notice',
  'fosholnexa_user_feedbacks',
  'fosholnexa_data_hash'
];

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Bundled defaults < published settings. Dates are always derived from reportDateISO.
const buildSettings = (published) => {
  const merged = { ...SITE_SETTINGS, ...(published || {}) };
  if (merged.reportDateISO) {
    merged.reportDateBn = formatBn(merged.reportDateISO);
    merged.reportDateEn = formatEn(merged.reportDateISO);
  }
  return merged;
};

export default function App() {
  const [cached] = useState(readCache);
  const [lang, setLang] = useState('bn');
  const [activeTab, setActiveTab] = useState('doc'); // 'doc' | 'ready'

  // Site data: published (server) data wins over bundled defaults.
  const [settings, setSettings] = useState(() => buildSettings(cached?.settings));
  const [rates, setRates] = useState(() => (cached?.rates?.length ? cached.rates : INITIAL_RATES));
  const [readyRates, setReadyRates] = useState(() => (cached?.readyRates?.length ? cached.readyRates : INITIAL_READY_RATES));
  const [notice, setNotice] = useState(() => cached?.notice || INITIAL_TICKER_NOTICE);
  const [updatedAt, setUpdatedAt] = useState(cached?.updatedAt || null);
  const feeds = INITIAL_FEEDS;

  // Admin drafts: edits stay local until the admin presses "Publish".
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const draft = (setter) => (value) => {
    dirtyRef.current = true;
    setDirty(true);
    setter(value);
  };
  const setRatesDraft = draft(setRates);
  const setReadyRatesDraft = draft(setReadyRates);
  const setNoticeDraft = draft(setNotice);
  const setSettingsDraft = draft((value) => setSettings((prev) => buildSettings(typeof value === 'function' ? value(prev) : value)));

  // Load the latest published data for every visitor.
  useEffect(() => {
    LEGACY_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
    let cancelled = false;
    fetchSiteData().then((data) => {
      if (cancelled || !data || dirtyRef.current) return;
      if (Array.isArray(data.rates) && data.rates.length) setRates(data.rates);
      if (Array.isArray(data.readyRates) && data.readyRates.length) setReadyRates(data.readyRates);
      if (data.notice) setNotice(data.notice);
      if (data.settings) setSettings(buildSettings(data.settings));
      if (data.updatedAt) setUpdatedAt(data.updatedAt);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    });
    return () => { cancelled = true; };
  }, []);

  // Warn before leaving the page with unpublished admin changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const handlePublished = (payload) => {
    dirtyRef.current = false;
    setDirty(false);
    if (payload.updatedAt) setUpdatedAt(payload.updatedAt);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
  };

  const handleResetDefaults = () => {
    setRatesDraft(INITIAL_RATES);
    setReadyRatesDraft(INITIAL_READY_RATES);
    setNoticeDraft(INITIAL_TICKER_NOTICE);
    setSettingsDraft(SITE_SETTINGS);
  };

  // Data freshness: very old rates must never look "verified".
  const reportAge = ageInDays(settings.reportDateISO);
  const isStale = reportAge !== null && reportAge >= STALE_AFTER_DAYS;

  // Filters & Views
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('cards');

  // Modals
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [bookingItem, setBookingItem] = useState(null);

  // Listen for secret #admin in URL and secret shortcut (Ctrl + Shift + A)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', checkHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter pipeline for DOC rates
  const filteredRates = rates.filter((item) => {
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'layer_brown' && item.category !== 'layer_brown') return false;
      if (selectedCategory === 'layer_white' && item.category !== 'layer_white') return false;
      if (selectedCategory === 'broiler' && item.category !== 'broiler') return false;
      if (selectedCategory === 'sonali' && item.category !== 'sonali') return false;
      if (selectedCategory === 'cockerel' && item.category !== 'cockerel') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp = (item.company && item.company.toLowerCase().includes(q)) ||
                        (item.companyEn && item.companyEn.toLowerCase().includes(q));
      const matchBreed = item.breed && item.breed.toLowerCase().includes(q);
      const matchCat = item.category && item.category.toLowerCase().includes(q);
      if (!matchComp && !matchBreed && !matchCat) return false;
    }

    return true;
  });

  const sortedRates = [...filteredRates].sort((a, b) => {
    const rateA = (selectedDivision !== 'all' && a.divisionRates && a.divisionRates[selectedDivision]) ? a.divisionRates[selectedDivision] : a.todayRate;
    const rateB = (selectedDivision !== 'all' && b.divisionRates && b.divisionRates[selectedDivision]) ? b.divisionRates[selectedDivision] : b.todayRate;

    if (sortBy === 'price_asc') return rateA - rateB;
    if (sortBy === 'price_desc') return rateB - rateA;
    if (sortBy === 'name_asc') return a.company.localeCompare(b.company);
    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Sticky Floating Header (Navbar + Floating Ticker) */}
      <div className="sticky top-0 z-40 shadow-md">
        <Navbar
          lang={lang}
          setLang={setLang}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenBanner={() => setIsBannerOpen(true)}
          settings={settings}
        />
        <Ticker notice={notice} lang={lang} />
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Outdated-rate warning */}
        {isStale && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-semibold leading-relaxed">
              {lang === 'bn'
                ? `⚠️ এই রেটগুলো ${toBnDigits(reportAge)} দিন আগের (${settings.reportDateBn})। বুকিংয়ের আগে আজকের সঠিক দর জানতে কল করুন: ${settings.hotline}`
                : `⚠️ These rates are ${reportAge} days old (${settings.reportDateEn}). Please call ${settings.hotline} to confirm today's price before booking.`}
            </p>
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-emerald-950/20 relative overflow-hidden border border-emerald-800/40">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-2.5 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{lang === 'bn' ? '🇧🇩 ফসলনেক্সা (FosholNexa) অফিসিয়াল পোর্টাল' : 'FosholNexa Official Portal'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {lang === 'bn' ? 'আজকের বাচ্চার বাজার দর' : 'Live Day-Old-Chicks (DOC) Market Rates'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-2.5 font-medium leading-relaxed">
              {lang === 'bn' 
                ? 'সকল কোম্পানির ব্রয়লার, কালার, সোনালী এবং লেয়ার বাচ্চার নির্ভরযোগ্য পাইকারি বাজারদর এবং নিরাপদ সরবরাহ।' 
                : 'Reliable wholesale market rates and safe supply of Broiler, Color, Sonali and Layer chicks from all companies.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold border border-white/10">
                <span>📈 {rates.length}টি জাত/কোম্পানির লাইভ দর</span>
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                isStale
                  ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                  : 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
              }`}>
                <span>{isStale ? '⚠️' : '🛡️'}</span>
                <span>{lang === 'bn' ? `সর্বশেষ আপডেট: ${settings.reportDateBn}` : `Updated: ${settings.reportDateEn}`}</span>
              </span>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap gap-2.5">
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="px-5 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-950/20 cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <span>📊 {lang === 'bn' ? 'ব্যাচ খরচ হিসাব' : 'Batch Calculator'}</span>
            </button>
          </div>

          <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 text-9xl opacity-10 select-none pointer-events-none">
            🌾
          </div>
        </div>

        {/* Primary Market Section Switcher Tabs */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs gap-1.5">
            <button
              onClick={() => setActiveTab('doc')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'doc'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>🐣</span>
              <span>{lang === 'bn' ? 'বাচ্চার বাজার দর (DOC)' : 'Day-Old Chicks (DOC)'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                {rates.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ready')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'ready'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>🍗</span>
              <span>{lang === 'bn' ? 'রেডি মুরগি ও ডিমের দর' : 'Ready Birds & Eggs'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black animate-pulse">
                {readyRates.length} মোকাম
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: DOC Rates */}
        {activeTab === 'doc' && (
          <>
            {/* Live Averages & Stats Overview */}
            <StatsOverview rates={rates} lang={lang} isStale={isStale} />

            {/* Real Top Hatcheries Live Price Comparison Chart */}
            <PriceChart rates={rates} lang={lang} />

            {/* Filters */}
            <FilterBar
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedDivision={selectedDivision}
              setSelectedDivision={setSelectedDivision}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
              lang={lang}
            />

            {/* Rates Cards / Table */}
            {sortedRates.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <Bird className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">কোনো বাচ্চার তথ্য পাওয়া যায়নি</h4>
                <button
                  onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  সবগুলো দেখান
                </button>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {sortedRates.map((item) => (
                  <RateCard
                    key={item.id}
                    item={item}
                    selectedDivision={selectedDivision}
                    settings={settings}
                    onOpenBooking={(it) => setBookingItem(it)}
                    isStale={isStale}
                    lang={lang}
                  />
                ))}
              </div>
            ) : (
              <RateTable
                rates={sortedRates}
                selectedDivision={selectedDivision}
                settings={settings}
                onOpenBooking={(it) => setBookingItem(it)}
                isStale={isStale}
                lang={lang}
              />
            )}

            {/* Quick Explore Ready Market Banner */}
            <div className="mt-8 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white p-5 sm:p-6 rounded-3xl border border-emerald-700/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-2xl shrink-0">
                  🍗
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">
                    {lang === 'bn' ? 'রেডি ব্রয়লার, কালার, সোনালী ও ডিমের আঞ্চলিক মোকাম রেট' : 'Ready Broiler, Sonali & Wholesale Egg Rates'}
                  </h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    {lang === 'bn' ? 'দেশের শীর্ষ ২১টি আঞ্চলিক মোকামের লাইভ রেট ও কর্মকর্তার যোগাযোগ দেখতে ক্লিক করুন।' : 'View live wholesale rates from 21 regional poultry trading hubs.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('ready');
                  window.scrollTo({ top: 380, behavior: 'smooth' });
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{lang === 'bn' ? 'রেডি মুরগি ও ডিমের রেট দেখুন' : 'View Ready Rates'}</span>
                <span>➔</span>
              </button>
            </div>
          </>
        )}

        {/* Tab 2: Ready Broiler, Color, Sonali & Egg Market Section */}
        {activeTab === 'ready' && (
          <>
            <ReadyMarketSection
              readyRates={readyRates}
              lang={lang}
              settings={settings}
            />

            {/* Quick Return to DOC Banner */}
            <div className="mt-8 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white p-5 sm:p-6 rounded-3xl border border-emerald-700/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center text-2xl shrink-0">
                  🐣
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">
                    {lang === 'bn' ? 'আজকের বাচ্চার বাজার দর ও কোম্পানি রেট' : "Today's Day-Old Chicks (DOC) Rates"}
                  </h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    {lang === 'bn' ? 'কাজী, সিপি, নারিশ, আফতাব সহ শীর্ষ কোম্পানির অফিসিয়াল বাচ্চার রেট দেখুন।' : 'View verified chick rates from Kazi, CP, Nourish, Aftab & top hatcheries.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('doc');
                  window.scrollTo({ top: 380, behavior: 'smooth' });
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{lang === 'bn' ? 'বাচ্চার রেট দেখুন' : 'View DOC Rates'}</span>
                <span>➔</span>
              </button>
            </div>
          </>
        )}

        {/* Community Facebook Group Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-blue-800/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                {lang === 'bn' ? 'আমাদের ফেসবুক গ্রুপের সাথে যুক্ত হোন' : 'Join our Facebook Community'}
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {lang === 'bn' ? 'প্রতিদিনের বাজারদর আপডেট, খামারিদের অভিজ্ঞতা ও পরামর্শ পেতে আমাদের গ্রুপে যোগ দিন।' : 'Get daily price updates, poultry farming tips and discussions.'}
              </p>
            </div>
          </div>
          <a
            href="https://www.facebook.com/share/g/18vu9Y5cja/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-xs transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>{lang === 'bn' ? 'আমাদের ফেসবুক গ্রুপের সাথে যুক্ত হোন' : 'Join Group Now'}</span>
            <span>➔</span>
          </a>
        </div>
      </main>

      {/* Modals */}
      <BannerGeneratorModal
        isOpen={isBannerOpen}
        onClose={() => setIsBannerOpen(false)}
        rates={rates}
        readyRates={readyRates}
        feeds={feeds}
        settings={settings}
        notice={notice}
        lang={lang}
      />

      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        rates={rates}
        lang={lang}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        rates={rates}
        notice={notice}
        settings={settings}
        lang={lang}
      />

      <BookingModal
        isOpen={!!bookingItem}
        onClose={() => setBookingItem(null)}
        selectedItem={bookingItem}
        settings={settings}
        lang={lang}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        rates={rates}
        setRates={setRatesDraft}
        readyRates={readyRates}
        setReadyRates={setReadyRatesDraft}
        notice={notice}
        setNotice={setNoticeDraft}
        settings={settings}
        setSettings={setSettingsDraft}
        dirty={dirty}
        updatedAt={updatedAt}
        onPublished={handlePublished}
        onResetDefaults={handleResetDefaults}
        lang={lang}
      />

      {/* Floating Website Feedback Widget (Bottom-Right) */}
      <FeedbackWidget
        lang={lang}
        whatsappNumber={settings.whatsapp?.replace(/[^0-9]/g, '') || "8801619500178"}
      />

      {/* Footer */}
      <Footer lang={lang} isStale={isStale} />
    </div>
  );
}
