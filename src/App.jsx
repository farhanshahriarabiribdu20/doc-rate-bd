import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Ticker from './components/Ticker';
import StatsOverview from './components/StatsOverview';
import FilterBar from './components/FilterBar';
import RateCard from './components/RateCard';
import RateTable from './components/RateTable';
import PriceChart from './components/PriceChart';
import FeedSection from './components/FeedSection';
import MedicineSection from './components/MedicineSection';
import Calculator from './components/Calculator';
import ShareModal from './components/ShareModal';
import BookingModal from './components/BookingModal';
import BannerGeneratorModal from './components/BannerGeneratorModal';
import AdminModal from './components/AdminModal';
import FeedbackWidget from './components/FeedbackWidget';
import ReadyMarketSection from './components/ReadyMarketSection';
import Footer from './components/Footer';
import { 
  fetchFeedbacks, 
  submitFeedback, 
  deleteFeedback, 
  clearAllFeedbacks 
} from './services/feedbackService';
import { 
  INITIAL_RATES, 
  INITIAL_FEEDS, 
  INITIAL_MEDICINES, 
  INITIAL_TICKER_NOTICE, 
  SITE_SETTINGS 
} from './data/initialData';
import { INITIAL_READY_RATES } from './data/readyMarketData';
import { Bird, AlertCircle } from 'lucide-react';

// Rates saved in localStorage must not outlive a new deploy of the bundled data.
// The hash changes automatically whenever INITIAL_* data (or report date / notice) changes,
// so returning visitors always get the latest published rates instead of a stale cache.
const hashString = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return String(h >>> 0);
};
const DATA_HASH = hashString(JSON.stringify([
  INITIAL_RATES,
  INITIAL_READY_RATES,
  SITE_SETTINGS.reportDateBn,
  SITE_SETTINGS.reportDateEn,
  INITIAL_TICKER_NOTICE
]));
const DATA_HASH_KEY = 'fosholnexa_data_hash';
const isCacheFresh = (() => {
  try { return localStorage.getItem(DATA_HASH_KEY) === DATA_HASH; } catch { return false; }
})();
const loadCached = (key) => {
  if (!isCacheFresh) return null;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
};

export default function App() {
  const [lang, setLang] = useState('bn');
  const [activeTab, setActiveTab] = useState('doc'); // 'doc' | 'feed' | 'medicine'

  // Settings
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('fosholnexa_settings_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.hotline === '01711-000000') {
          parsed.hotline = '01619-500178';
          parsed.whatsapp = '01619500178';
        }
        if (!isCacheFresh) {
          parsed.reportDateBn = SITE_SETTINGS.reportDateBn;
          parsed.reportDateEn = SITE_SETTINGS.reportDateEn;
        }
        return parsed;
      } catch (e) {}
    }
    return SITE_SETTINGS;
  });

  // Rates
  const [rates, setRates] = useState(() => loadCached('fosholnexa_rates_sheet_v3_clean') || INITIAL_RATES);

  // Ready Poultry & Egg Rates
  const [readyRates, setReadyRates] = useState(() => loadCached('fosholnexa_ready_rates') || INITIAL_READY_RATES);

  // Mark the cache as belonging to the current bundled data
  useEffect(() => {
    localStorage.setItem(DATA_HASH_KEY, DATA_HASH);
  }, []);

  useEffect(() => {
    localStorage.setItem('fosholnexa_ready_rates', JSON.stringify(readyRates));
  }, [readyRates]);

  // Feeds
  const [feeds, setFeeds] = useState(() => {
    const saved = localStorage.getItem('fosholnexa_feeds');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_FEEDS;
  });

  // Medicines
  const [medicines, setMedicines] = useState(() => {
    const saved = localStorage.getItem('fosholnexa_medicines');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_MEDICINES;
  });

  // Ticker Notice
  const [notice, setNotice] = useState(() => {
    if (!isCacheFresh) return INITIAL_TICKER_NOTICE;
    try { return localStorage.getItem('fosholnexa_notice') || INITIAL_TICKER_NOTICE; } catch { return INITIAL_TICKER_NOTICE; }
  });

  // User Feedbacks synced across all devices via Vercel Cloud Storage
  const [feedbacks, setFeedbacks] = useState(() => {
    const saved = localStorage.getItem('fosholnexa_user_feedbacks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Fetch latest feedbacks from cloud on mount
  useEffect(() => {
    fetchFeedbacks().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setFeedbacks(data);
      }
    });
  }, []);

  const handleAddFeedback = async (newFb) => {
    // 1. Optimistic local update
    const tempEntry = {
      id: `fb-${Date.now()}`,
      date: new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date()),
      dateRaw: new Date().toISOString(),
      ...newFb
    };
    setFeedbacks(prev => [tempEntry, ...(prev || [])]);

    // 2. Persist to Cloud API across all devices
    try {
      const saved = await submitFeedback(newFb);
      if (saved && saved.id) {
        setFeedbacks(prev => [saved, ...(prev.filter(f => f.id !== tempEntry.id))]);
      }
    } catch (err) {
      console.error('Feedback cloud submit failed:', err);
    }
  };

  const handleDeleteFeedback = async (id) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
    await deleteFeedback(id);
  };

  const handleClearAllFeedbacks = async () => {
    setFeedbacks([]);
    await clearAllFeedbacks();
  };

  const handleRefreshFeedbacks = async () => {
    const data = await fetchFeedbacks();
    if (Array.isArray(data)) {
      setFeedbacks(data);
    }
  };

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

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('fosholnexa_settings_v2', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('fosholnexa_rates_sheet_v3_clean', JSON.stringify(rates));
  }, [rates]);

  useEffect(() => {
    localStorage.setItem('fosholnexa_feeds', JSON.stringify(feeds));
  }, [feeds]);

  useEffect(() => {
    localStorage.setItem('fosholnexa_medicines', JSON.stringify(medicines));
  }, [medicines]);

  useEffect(() => {
    localStorage.setItem('fosholnexa_notice', notice);
  }, [notice]);

  const handleResetDefaults = () => {
    setRates(INITIAL_RATES);
    setReadyRates(INITIAL_READY_RATES);
    setFeeds(INITIAL_FEEDS);
    setMedicines(INITIAL_MEDICINES);
    setNotice(INITIAL_TICKER_NOTICE);
    setSettings(SITE_SETTINGS);
    [
      'fosholnexa_settings_v2',
      'fosholnexa_rates_sheet_v3_clean',
      'fosholnexa_ready_rates',
      'fosholnexa_feeds',
      'fosholnexa_medicines',
      'fosholnexa_notice'
    ].forEach((k) => localStorage.removeItem(k));
  };

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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-extrabold border border-emerald-400/30">
                <span>🛡️</span>
                <span>{lang === 'bn' ? '১০০% নিশ্চিত মার্কেট ডাটা' : '100% Verified Market Data'}</span>
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
            <StatsOverview rates={rates} lang={lang} />

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
        feeds={feeds}
        settings={settings}
        notice={notice}
        lang={lang}
      />

      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
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
        lang={lang}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        rates={rates}
        setRates={setRates}
        feeds={feeds}
        setFeeds={setFeeds}
        medicines={medicines}
        setMedicines={setMedicines}
        feedbacks={feedbacks}
        setFeedbacks={setFeedbacks}
        onDeleteFeedback={handleDeleteFeedback}
        onClearFeedbacks={handleClearAllFeedbacks}
        onRefreshFeedbacks={handleRefreshFeedbacks}
        notice={notice}
        setNotice={setNotice}
        settings={settings}
        setSettings={setSettings}
        onResetDefaults={handleResetDefaults}
        lang={lang}
      />

      {/* Floating Website Feedback Widget (Bottom-Right) */}
      <FeedbackWidget 
        lang={lang} 
        whatsappNumber={settings.whatsapp?.replace(/[^0-9]/g, '') || "8801619500178"} 
        onAddFeedback={handleAddFeedback}
      />

      {/* Footer */}
      <Footer lang={lang} />
    </div>
  );
}
