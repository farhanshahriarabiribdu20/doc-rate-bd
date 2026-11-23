import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Ticker from './components/Ticker';
import StatsOverview from './components/StatsOverview';
import FilterBar from './components/FilterBar';
import RateCard from './components/RateCard';
import RateTable from './components/RateTable';
import PriceChart from './components/PriceChart';
import TrendChart from './components/TrendChart';
import CompareModal from './components/CompareModal';
import InstallPrompt from './components/InstallPrompt';
import Calculator from './components/Calculator';
import FarmTools from './components/FarmTools';
import ShareModal from './components/ShareModal';
import BookingModal from './components/BookingModal';
import BannerGeneratorModal from './components/BannerGeneratorModal';
import AdminModal from './components/AdminModal';
import FeedbackWidget from './components/FeedbackWidget';
import ReadyMarketSection from './components/ReadyMarketSection';
import Footer from './components/Footer';
import { fetchSiteData, fetchRateDates, fetchRateDay, fetchGallery } from './services/api';
import { ageInDays, formatBn, formatEn, toBnDigits } from './utils/date';
import {
  INITIAL_RATES,
  INITIAL_FEEDS,
  INITIAL_TICKER_NOTICE,
  SITE_SETTINGS
} from './data/initialData';
import { INITIAL_READY_RATES } from './data/readyMarketData';
import { Bird, AlertTriangle } from 'lucide-react';
import { rateForRegion } from './data/zones';
import DateRatePicker from './components/DateRatePicker';
import RateSubmitModal from './components/RateSubmitModal';
import RateCta from './components/RateCta';
import GallerySection from './components/GallerySection';
import MarketSection from './components/MarketSection';
import SellerModal from './components/SellerModal';
import { useLiveVisitors } from './utils/useLiveVisitors';

const CHIP_TONES = {
  plain: 'bg-slate-100 text-slate-700 border-slate-200',
  ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warn: 'bg-amber-50 text-amber-900 border-amber-300'
};

// Section heading shown at the top of every tab.
function PageHead({ title, sub, chips = [] }) {
  return (
    <div className="pagehead flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-4 border-b border-slate-200">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">{title}</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl">{sub}</p>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 shrink-0">
          {chips.map((c, i) => (
            <span key={i} className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border ${CHIP_TONES[c.tone] || CHIP_TONES.plain}`}>
              {c.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('fn_theme') === 'dark'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('fn_theme', isDark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [isDark]);
  // Text size: 0 = normal, 1 = large, 2 = extra large (kept in this browser only)
  const [fontLevel, setFontLevel] = useState(() => {
    try { const v = Number(localStorage.getItem('fn_fontscale')); return v === 1 || v === 2 ? v : 0; } catch { return 0; }
  });
  useEffect(() => {
    document.documentElement.style.setProperty('--fs', ['1', '1.125', '1.25'][fontLevel]);
    try { localStorage.setItem('fn_fontscale', String(fontLevel)); } catch { /* ignore */ }
  }, [fontLevel]);
  const [activeTab, setActiveTab] = useState('doc'); // 'doc' | 'ready' | 'market'

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

  // Date-wise view: visitors can look at an earlier day. Default = the latest published rates.
  const [archiveDates, setArchiveDates] = useState([]);
  const [archive, setArchive] = useState(null); // { date, rates } while an earlier day is shown
  const [archiveNotice, setArchiveNotice] = useState('');
  const [archiveBusy, setArchiveBusy] = useState(false);
  useEffect(() => { fetchRateDates().then(setArchiveDates); }, []);

  // Same date-wise view for the ready-market (mokam) rates.
  const [readyDates, setReadyDates] = useState([]);
  const [readyArchive, setReadyArchive] = useState(null); // { date, rates }
  const [readyNotice, setReadyNotice] = useState('');
  const [readyBusy, setReadyBusy] = useState(false);
  useEffect(() => { fetchRateDates('ready').then(setReadyDates); }, []);

  // rate pictures uploaded by the admin
  const [gallery, setGallery] = useState([]);
  useEffect(() => { fetchGallery().then((g) => { if (g) setGallery(g); }); }, []);
  const backToLatestReady = () => { setReadyArchive(null); setReadyNotice(''); };
  const handlePickReadyDate = async (date) => {
    const live = settings.readyDateISO;
    if (!live || date >= live) { backToLatestReady(); return; }
    setReadyBusy(true);
    const result = await fetchRateDay(date, 'ready');
    setReadyBusy(false);
    if (!result || !result.date || !result.rates.length) {
      setReadyNotice(lang === 'bn' ? 'এই তারিখে বা এর আগে কোনো মোকাম রেট সংরক্ষিত নেই।' : 'No mokam rates are saved for this date or any earlier date.');
      return;
    }
    if (result.date >= live) { backToLatestReady(); return; }
    setReadyArchive({ date: result.date, rates: result.rates });
    setReadyNotice(result.exact ? '' : (lang === 'bn'
      ? `${formatBn(date)} তারিখে রেট নেই, তাই ${formatBn(result.date)} তারিখের রেট দেখানো হচ্ছে।`
      : `No rates on ${formatEn(date)}; showing ${formatEn(result.date)} instead.`));
  };

  const backToLatest = () => { setArchive(null); setArchiveNotice(''); };
  const handlePickDate = async (date) => {
    const live = settings.reportDateISO;
    if (!live || date >= live) { backToLatest(); return; }
    setArchiveBusy(true);
    const result = await fetchRateDay(date);
    setArchiveBusy(false);
    if (!result || !result.date || !result.rates.length) {
      setArchiveNotice(lang === 'bn' ? 'এই তারিখে বা এর আগে কোনো রেট সংরক্ষিত নেই।' : 'No rates are saved for this date or any earlier date.');
      return;
    }
    if (result.date >= live) { backToLatest(); return; }
    setArchive({ date: result.date, rates: result.rates });
    setArchiveNotice(result.exact ? '' : (lang === 'bn'
      ? `${formatBn(date)} তারিখে রেট নেই, তাই ${formatBn(result.date)} তারিখের রেট দেখানো হচ্ছে।`
      : `No rates on ${formatEn(date)}; showing ${formatEn(result.date)} instead.`));
  };

  // Warn before leaving the page with unpublished admin changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const handlePublished = (payload, { keepDirty = false } = {}) => {
    if (!keepDirty) {
      dirtyRef.current = false;
      setDirty(false);
    }
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
  // What the public sections show: an archived day while one is picked, otherwise the latest rates.
  const liveRates = rates.filter((r) => !r.rateDate || r.rateDate === settings.reportDateISO);
  const shownRates = archive ? archive.rates : liveRates;
  const shownStale = archive ? false : isStale;
  const shownDateISO = archive ? archive.date : settings.reportDateISO;

  // Filters & Views
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('cards');
  const [compareIds, setCompareIds] = useState([]); // up to 3 rate cards picked for comparison
  const [compareOpen, setCompareOpen] = useState(false);

  // Modals
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const live = useLiveVisitors(settings.showLiveVisitors !== false);
  const [sellerOpen, setSellerOpen] = useState(false); // seller login / ads modal
  const [marketKey, setMarketKey] = useState(0); // bump to reload the public listings
  const [submitKind, setSubmitKind] = useState(null); // visitor rate form: null | 'ready' | 'doc'
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [bookingItem, setBookingItem] = useState(null);

  // Listen for secret #admin in URL and secret shortcut (Ctrl + Shift + A)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
        // Drop the hash so a page refresh does not open the admin panel again.
        try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch { /* ignore */ }
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
  const filteredRates = shownRates.filter((item) => {
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

  // Cheapest rate in each category (needs 3+ companies to be meaningful), for the "lowest price" badge.
  const lowestIds = (() => {
    const groups = {};
    shownRates.forEach((r) => {
      const g = (r.category || '').startsWith('layer') ? 'layer' : (r.category || 'other');
      const v = Number(rateForRegion(r, selectedDivision));
      if (Number.isFinite(v) && v > 0) (groups[g] = groups[g] || []).push({ id: r.id, v });
    });
    const ids = new Set();
    Object.values(groups).forEach((list) => {
      if (list.length < 3) return;
      const min = Math.min(...list.map((x) => x.v));
      if (min === Math.max(...list.map((x) => x.v))) return;
      list.filter((x) => x.v === min).forEach((x) => ids.add(x.id));
    });
    return ids;
  })();

  const sortedRates = [...filteredRates].sort((a, b) => {
    const rateA = rateForRegion(a, selectedDivision);
    const rateB = rateForRegion(b, selectedDivision);

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
          onOpenCalculator={() => setIsToolsOpen(true)}
          onOpenBanner={() => setIsBannerOpen(true)}
          isDark={isDark}
          toggleTheme={() => setIsDark((d) => !d)}
          fontLevel={fontLevel}
          onCycleFont={() => setFontLevel((l) => (l + 1) % 3)}
          settings={settings}
          liveVisitors={live}
        />
        <Ticker notice={notice} lang={lang} />
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Outdated-rate warning */}
        {shownStale && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-semibold leading-relaxed">
              {lang === 'bn'
                ? `⚠️ এই রেটগুলো ${toBnDigits(reportAge)} দিন আগের (${settings.reportDateBn})। বুকিংয়ের আগে আজকের সঠিক দর জানতে কল করুন: ${settings.hotline}`
                : `⚠️ These rates are ${reportAge} days old (${settings.reportDateEn}). Please call ${settings.hotline} to confirm today's price before booking.`}
            </p>
          </div>
        )}

        {/* Tab 1: DOC Rates */}
        {activeTab === 'doc' && (
          <div className="flex flex-col gap-5 sm:gap-6">
            <PageHead
              title={lang === 'bn' ? 'আজকের বাচ্চার বাজার দর' : 'Day-Old Chick (DOC) Rates'}
              sub={lang === 'bn' ? 'সকল কোম্পানির ব্রয়লার, কালার, সোনালী ও লেয়ার বাচ্চার নির্ভরযোগ্য পাইকারি বাজারদর' : 'Reliable wholesale rates of Broiler, Color, Sonali and Layer chicks'}
              chips={[
                { text: `${shownRates.length}${lang === 'bn' ? 'টি জাত/কোম্পানি' : ' companies/breeds'}`, tone: 'plain' },
                { text: `${shownStale ? '⚠️ ' : archive ? '📅 ' : '✅ '}${lang === 'bn' ? (archive ? `রেটের তারিখ: ${formatBn(archive.date)}` : `সর্বশেষ আপডেট: ${settings.reportDateBn}`) : (archive ? `Rates of: ${formatEn(archive.date)}` : `Updated: ${settings.reportDateEn}`)}`, tone: shownStale ? 'warn' : 'ok' }
              ]}
            />

            <div className="grid lg:grid-cols-2 gap-4 items-stretch">
            <DateRatePicker
              lang={lang}
              liveDate={settings.reportDateISO}
              dates={archiveDates}
              viewing={archive?.date || null}
              notice={archiveNotice}
              busy={archiveBusy}
              onPick={handlePickDate}
              onBackToLive={backToLatest}
            />

            <RateCta lang={lang} onClick={() => setSubmitKind('doc')} />
            </div>

            <StatsOverview rates={shownRates} lang={lang} isStale={shownStale} />

            <GallerySection images={gallery} kind="doc" lang={lang} settings={settings} />

            {/* Real Top Hatcheries Live Price Comparison Chart */}
            <PriceChart rates={shownRates} lang={lang} />
            <TrendChart lang={lang} />

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
                    isStale={shownStale}
                    rateDateISO={shownDateISO}
                    isLowest={lowestIds.has(item.id)}
                    compare={{
                      selected: compareIds.includes(item.id),
                      disabled: compareIds.length >= 3,
                      onToggle: () => setCompareIds((ids) => (ids.includes(item.id) ? ids.filter((x) => x !== item.id) : ids.length < 3 ? [...ids, item.id] : ids))
                    }}
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
                isStale={shownStale}
                rateDateISO={shownDateISO}
                lang={lang}
              />
            )}

            {/* Quick Explore Ready Market Banner */}
            <div className="bg-white text-slate-900 p-5 sm:p-6 rounded-3xl border border-emerald-200 shadow-md border-l-4 border-l-emerald-600 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl shrink-0">
                  🍗
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    {lang === 'bn' ? 'রেডি ব্রয়লার, কালার, সোনালী ও ডিমের আঞ্চলিক মোকাম রেট' : 'Ready Broiler, Sonali & Wholesale Egg Rates'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {lang === 'bn' ? 'দেশের শীর্ষ ২১টি আঞ্চলিক মোকামের লাইভ রেট ও কর্মকর্তার যোগাযোগ দেখতে ক্লিক করুন।' : 'View live wholesale rates from 21 regional poultry trading hubs.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('ready');
                  window.scrollTo({ top: 380, behavior: 'smooth' });
                }}
                className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm transition shadow-md shrink-0 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{lang === 'bn' ? 'রেডি মুরগি ও ডিমের রেট দেখুন' : 'View Ready Rates'}</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Ready Broiler, Color, Sonali & Egg Market Section */}
        {activeTab === 'ready' && (
          <div className="flex flex-col gap-5 sm:gap-6">
            <PageHead
              title={lang === 'bn' ? 'রেডি মুরগি ও ডিমের মোকাম রেট' : 'Ready Poultry & Egg Market Rates'}
              sub={lang === 'bn' ? 'দেশের আঞ্চলিক মোকাম অনুযায়ী ব্রয়লার, কালার, সোনালী ও ডিমের পাইকারি দর' : 'Wholesale rates of broiler, color, sonali and eggs across regional hubs'}
              chips={settings.readyDateISO ? [{ text: `📅 ${lang === 'bn' ? formatBn(readyArchive?.date || settings.readyDateISO) : formatEn(readyArchive?.date || settings.readyDateISO)}`, tone: 'ok' }] : []}
            />
            <div className="grid lg:grid-cols-2 gap-4 items-stretch">
            {settings.readyDateISO && (
              <DateRatePicker
                  lang={lang}
                  liveDate={settings.readyDateISO}
                  dates={readyDates}
                  viewing={readyArchive?.date || null}
                  notice={readyNotice}
                  busy={readyBusy}
                  onPick={handlePickReadyDate}
                  onBackToLive={backToLatestReady}
                />
            )}

            <RateCta lang={lang} onClick={() => setSubmitKind('ready')} />
            </div>
            <GallerySection images={gallery} kind="ready" lang={lang} settings={settings} />

            <ReadyMarketSection
              readyRates={readyArchive ? readyArchive.rates : readyRates}
              lang={lang}
              settings={readyArchive ? { ...settings, readyDateISO: readyArchive.date } : settings}
            />

            {/* Quick Return to DOC Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white p-5 sm:p-6 rounded-3xl border border-emerald-700/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
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
                className="px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{lang === 'bn' ? 'বাচ্চার রেট দেখুন' : 'View DOC Rates'}</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        )}

        {/* Community Facebook Group Banner */}
        <div className="mt-6 sm:mt-8 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-blue-800/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
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
        {activeTab === 'market' && (
          <MarketSection lang={lang} onOpenSeller={() => setSellerOpen(true)} refreshKey={marketKey} />
        )}
      </main>

      {/* Modals */}
      {sellerOpen && <SellerModal onClose={() => setSellerOpen(false)} onChanged={() => setMarketKey((k) => k + 1)} />}
      {submitKind && (
        <RateSubmitModal
          lang={lang}
          initialKind={submitKind}
          readyRates={readyRates}
          docRates={liveRates}
          onClose={() => setSubmitKind(null)}
        />
      )}
      {compareIds.length > 0 && activeTab === 'doc' && !compareOpen && (
        <div className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900 text-white rounded-2xl shadow-2xl pl-4 pr-2 py-2 print:hidden">
          <span className="text-xs font-bold">{lang === 'bn' ? `${compareIds.length}টি বাছা হয়েছে` : `${compareIds.length} selected`}</span>
          <button
            disabled={compareIds.length < 2}
            onClick={() => setCompareOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-50 cursor-pointer"
          >
            {compareIds.length < 2 ? (lang === 'bn' ? 'আরও ১টি বাছুন' : 'Pick one more') : (lang === 'bn' ? 'তুলনা করুন' : 'Compare')}
          </button>
          <button onClick={() => setCompareIds([])} className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer">{lang === 'bn' ? 'মুছুন' : 'Clear'}</button>
        </div>
      )}
      {compareOpen && (
        <CompareModal
          lang={lang}
          items={compareIds.map((id) => liveRates.find((r) => r.id === id) || shownRates.find((r) => r.id === id)).filter(Boolean)}
          onClose={() => setCompareOpen(false)}
          onRemove={(id) => setCompareIds((ids) => { const next = ids.filter((x) => x !== id); if (next.length < 2) setCompareOpen(false); return next; })}
        />
      )}
      <InstallPrompt lang={lang} />
      <BannerGeneratorModal
        isOpen={isBannerOpen}
        onClose={() => setIsBannerOpen(false)}
        rates={liveRates}
        readyRates={readyRates}
        feeds={feeds}
        settings={settings}
        notice={notice}
        lang={lang}
      />

      <FarmTools
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        onOpenProfit={() => { setIsToolsOpen(false); setIsCalculatorOpen(true); }}
      />

      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        rates={liveRates}
        lang={lang}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        rates={liveRates}
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
        onOpenPostKit={() => { setIsAdminOpen(false); setIsBannerOpen(true); }}
        lang={lang}
      />

      {/* Floating Website Feedback Widget (Bottom-Right) */}
      <FeedbackWidget
        lang={lang}
        whatsappNumber={settings.whatsapp?.replace(/[^0-9]/g, '') || "8801619500178"}
      />

      {/* Footer */}
      <Footer lang={lang} isStale={isStale} settings={settings} />
    </div>
  );
}
