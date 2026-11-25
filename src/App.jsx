import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import ChatFab, { WHATSAPP_GROUP_URL } from './components/ChatFab';
import Navbar from './components/Navbar';
import Ticker from './components/Ticker';
import StatsOverview from './components/StatsOverview';
import FilterBar from './components/FilterBar';
import RateCard from './components/RateCard';
import RateTable from './components/RateTable';
import PriceChart from './components/PriceChart';
import TrendChart from './components/TrendChart';
import InstallPrompt from './components/InstallPrompt';
const Calculator = lazy(() => import('./components/Calculator'));
import { track, trackVisit } from './services/track';
const FarmTools = lazy(() => import('./components/FarmTools'));
import ShareModal from './components/ShareModal';
import BookingModal from './components/BookingModal';
const BannerGeneratorModal = lazy(() => import('./components/BannerGeneratorModal'));
const AdminModal = lazy(() => import('./components/AdminModal'));
import FavAlert from './components/FavAlert';
import MasterSearch from './components/MasterSearch';
import { fetchVotes, sendVote } from './services/votes';
import WeeklySummary from './components/WeeklySummary';
import FeedbackWidget from './components/FeedbackWidget';
import ReadyMarketSection from './components/ReadyMarketSection';
import DistrictReports, { ReportBanner } from './components/DistrictReports';
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
import GallerySection from './components/GallerySection';
import FeedPrices from './components/FeedPrices';
import { fetchFeeds } from './services/feed';
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

// Mount a lazily loaded panel the first time it is opened, then keep it mounted (its state survives closing).
function useEverTrue(flag) {
  const [seen, setSeen] = useState(Boolean(flag));
  useEffect(() => { if (flag) setSeen(true); }, [flag]);
  return flag || seen;
}

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
  // favourite companies (this browser only), keyed by company|breed
  const [favKeys, setFavKeys] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem('fn_favs') || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 100) : []; } catch { return []; }
  });
  const favKeyOf = (it) => `${it.company}|${it.breed || ''}`;
  const toggleFav = (it) => setFavKeys((cur) => {
    const k = favKeyOf(it);
    const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
    try { localStorage.setItem('fn_favs', JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  const favFor = (it) => ({ on: favKeys.includes(favKeyOf(it)), onToggle: () => toggleFav(it) });
  useEffect(() => { trackVisit(); }, []);
  useEffect(() => { track(`tab:${activeTab}`); }, [activeTab]);

  // Site data: published (server) data wins over bundled defaults.
  const [settings, setSettings] = useState(() => buildSettings(cached?.settings));
  const [rates, setRates] = useState(() => (cached?.rates?.length ? cached.rates : INITIAL_RATES));
  const [readyRates, setReadyRates] = useState(() => (cached?.readyRates?.length ? cached.readyRates : INITIAL_READY_RATES));
  const [notice, setNotice] = useState(() => cached?.notice || INITIAL_TICKER_NOTICE);
  const [updatedAt, setUpdatedAt] = useState(cached?.updatedAt || null);
  const [feedPrices, setFeedPrices] = useState([]);
  useEffect(() => { fetchFeeds().then(setFeedPrices); }, []);
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

  const voteDate = !archive && /^\d{4}-\d{2}-\d{2}$/.test(settings.reportDateISO || '') ? settings.reportDateISO : '';
  useEffect(() => { if (voteDate) fetchVotes(voteDate).then(setVoteCounts); }, [voteDate]);
  const voteFor = (it) => {
    if (!voteDate) return null;
    const key = favKeyOf(it);
    const mk = `${voteDate}|${key}`;
    return {
      counts: voteCounts[key] || [0, 0],
      mine: myVotes[mk] || null,
      onVote: (v) => {
        if (myVotes[mk]) return;
        const next = { ...myVotes, [mk]: v };
        // keep only the last 200 votes in this browser
        const keep = Object.fromEntries(Object.entries(next).slice(-200));
        setMyVotes(keep);
        try { localStorage.setItem('fn_rate_votes', JSON.stringify(keep)); } catch { /* ignore */ }
        setVoteCounts((c) => { const cur = c[key] || [0, 0]; return { ...c, [key]: v === 'up' ? [cur[0] + 1, cur[1]] : [cur[0], cur[1] + 1] }; });
        sendVote(voteDate, key, v);
      }
    };
  };

  // Filters & Views
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  // phones show the first few company cards and a "show more" button instead of one endless scroll
  const [showMiniTabs, setShowMiniTabs] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShowMiniTabs(window.scrollY > 280));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  const MOBILE_CARDS = 8;
  const [cardLimit, setCardLimit] = useState(MOBILE_CARDS);
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setIsPhone(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  useEffect(() => { setCardLimit(MOBILE_CARDS); }, [selectedCategory, selectedDivision, searchQuery, sortBy]);
  const [viewMode, setViewMode] = useState('cards');
  // "is this rate correct?" votes for the live report date
  const [voteCounts, setVoteCounts] = useState({});
  const [myVotes, setMyVotes] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem('fn_rate_votes') || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
  });

  // Modals
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  useEffect(() => { if (isCalculatorOpen) track('calc'); }, [isCalculatorOpen]);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  useEffect(() => { if (isShareOpen) track('share'); }, [isShareOpen]);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const live = useLiveVisitors(settings.showLiveVisitors !== false);
  const [sellerOpen, setSellerOpen] = useState(false); // seller login / ads modal
  const [marketKey, setMarketKey] = useState(0); // bump to reload the public listings
  const [submitKind, setSubmitKind] = useState(null); // visitor rate form: null | 'ready' | 'doc'
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [toolStart, setToolStart] = useState('fcr');
  const [readyPreset, setReadyPreset] = useState({ q: '', n: 0 });
  const scrollToId = (sel) => setTimeout(() => { document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250);
  // master search: jump to the thing the visitor picked
  const handleSearchGo = (go) => {
    if (!go) return;
    if (go.type === 'tab') { setActiveTab(go.tab); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (go.type === 'rate') { setActiveTab('doc'); setSelectedCategory('all'); setSearchQuery(go.company); scrollToId('[data-search-anchor="rates"]'); }
    else if (go.type === 'ready') { setActiveTab('ready'); setReadyPreset((p) => ({ q: go.name, n: p.n + 1 })); scrollToId('[data-search-anchor="ready"]'); }
    else if (go.type === 'feed') { setActiveTab('doc'); scrollToId('#feed-title'); }
    else if (go.type === 'weekly') { setActiveTab('doc'); scrollToId('[aria-label="সাপ্তাহিক সারসংক্ষেপ"]'); }
    else if (go.type === 'trend') { setActiveTab('doc'); scrollToId('#trend-chart'); }
    else if (go.type === 'tool') { setToolStart(go.id); setIsToolsOpen(true); }
    else if (go.type === 'profit') setIsCalculatorOpen(true);
  };
  const mountBanner = useEverTrue(isBannerOpen);
  const mountTools = useEverTrue(isToolsOpen);
  const mountCalc = useEverTrue(isCalculatorOpen);
  const mountAdmin = useEverTrue(isAdminOpen);
  const [bookingItem, setBookingItem] = useState(null);
  useEffect(() => { if (bookingItem) track(`book:${bookingItem.id}`); }, [bookingItem]);

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
    if (selectedCategory === 'fav') return favKeys.includes(favKeyOf(item));
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
      {/* Phones: once the tall header has scrolled away, a slim sticky tab bar keeps the 3 tabs reachable */}
      {showMiniTabs && (
        <div className="sm:hidden fixed top-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md px-3 py-1.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/90">
            {[['doc', '🐣', 'বাচ্চার দর'], ['ready', '🍗', 'রেডি মুরগি'], ['market', '🛒', 'বিক্রির বাজার']].map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); window.scrollTo({ top: 0 }); }}
                className={`flex-1 flex items-center justify-center gap-1 whitespace-nowrap px-1.5 py-2 rounded-xl font-black text-xs cursor-pointer transition ${activeTab === id ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600'}`}
              >
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header (Navbar + Floating Ticker) — sticky on larger screens only; on phones it is too tall to pin */}
      <div className="sm:sticky sm:top-0 z-40 shadow-md">
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
        {/* Master search: one box for the whole site */}
        <div className="mb-5 sm:mb-6">
          <MasterSearch rates={liveRates} readyRates={readyRates} feeds={feedPrices} onGo={handleSearchGo} />
        </div>

        {/* Outdated-rate warning */}
        {shownStale && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-semibold leading-relaxed">
              {lang === 'bn'
                ? `এই রেট ${toBnDigits(reportAge)} দিন আগের (${settings.reportDateBn})। আজকের সঠিক দর জানতে কল করুন: ${settings.hotline}`
                : `These rates are ${reportAge} days old (${settings.reportDateEn}). Call ${settings.hotline} for today's price.`}
            </p>
          </div>
        )}

        {/* Tab 1: DOC Rates */}
        {activeTab === 'doc' && (
          <div className="flex flex-col gap-5 sm:gap-6">
            <ReportBanner onDocRate={() => setSubmitKind('doc')} />
            <PageHead
              title={lang === 'bn' ? 'আজকের বাচ্চার বাজার দর' : 'Day-Old Chick (DOC) Rates'}
              sub={lang === 'bn' ? 'সকল কোম্পানির ব্রয়লার, কালার, সোনালী ও লেয়ার বাচ্চার নির্ভরযোগ্য পাইকারি বাজারদর' : 'Reliable wholesale rates of Broiler, Color, Sonali and Layer chicks'}
              chips={[
                { text: `${shownRates.length}${lang === 'bn' ? 'টি জাত/কোম্পানি' : ' companies/breeds'}`, tone: 'plain' },
                { text: `${shownStale ? '⚠️ ' : archive ? '📅 ' : '✅ '}${lang === 'bn' ? (archive ? `রেটের তারিখ: ${formatBn(archive.date)}` : `সর্বশেষ আপডেট: ${settings.reportDateBn}`) : (archive ? `Rates of: ${formatEn(archive.date)}` : `Updated: ${settings.reportDateEn}`)}`, tone: shownStale ? 'warn' : 'ok' }
              ]}
            />

            <div className="grid gap-4">
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

            </div>

            {!archive && favKeys.length > 0 && <FavAlert rates={liveRates} favKeys={favKeys} />}

            <StatsOverview rates={shownRates} lang={lang} isStale={shownStale} />

            <GallerySection images={gallery} kind="doc" lang={lang} settings={settings} />

            {/* Real Top Hatcheries Live Price Comparison Chart */}
            <PriceChart rates={shownRates} lang={lang} />
            <WeeklySummary lang={lang} />
            <TrendChart lang={lang} />

            <FeedPrices feeds={feedPrices} />

            {/* Filters */}
            <div data-search-anchor="rates" className="-mb-3 scroll-mt-40" />
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
              favCount={favKeys.length}
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
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {(isPhone ? sortedRates.slice(0, cardLimit) : sortedRates).map((item) => (
                  <RateCard
                    key={item.id}
                    item={item}
                    selectedDivision={selectedDivision}
                    settings={settings}
                    onOpenBooking={(it) => setBookingItem(it)}
                    isStale={shownStale}
                    rateDateISO={shownDateISO}
                    isLowest={lowestIds.has(item.id)}
                    fav={favFor(item)}
                    vote={voteFor(item)}
                    lang={lang}
                  />
                ))}
              </div>
              {isPhone && sortedRates.length > cardLimit && (
                <button
                  onClick={() => setCardLimit((n) => n + MOBILE_CARDS)}
                  className="mt-4 w-full py-3.5 rounded-2xl bg-white border-2 border-emerald-600 text-emerald-700 font-black text-sm active:scale-[0.99] cursor-pointer"
                >
                  আরও {Math.min(MOBILE_CARDS, sortedRates.length - cardLimit).toLocaleString('bn-BD')}টি কোম্পানি দেখুন ({(sortedRates.length - cardLimit).toLocaleString('bn-BD')}টি বাকি)
                </button>
              )}
              </>
            ) : (
              <RateTable
                rates={sortedRates}
                selectedDivision={selectedDivision}
                settings={settings}
                onOpenBooking={(it) => setBookingItem(it)}
                isStale={shownStale}
                rateDateISO={shownDateISO}
                favFor={favFor}
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
            <ReportBanner onDocRate={() => setSubmitKind('doc')} />
            <div className="grid gap-4">
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

            </div>
            <GallerySection images={gallery} kind="ready" lang={lang} settings={settings} />

            <div data-search-anchor="ready" className="scroll-mt-40" />
            <ReadyMarketSection
              presetSearch={readyPreset}
              readyRates={readyArchive ? readyArchive.rates : readyRates}
              lang={lang}
              settings={readyArchive ? { ...settings, readyDateISO: readyArchive.date } : settings}
            />

            {!readyArchive && <DistrictReports />}

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

        {/* WhatsApp live-chat group banner (shown until a Telegram link is set in Admin > Settings) */}
        {!(settings?.telegramChatUrl || settings?.telegramUrl) && (
          <div className="mt-4 bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-emerald-700/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366]/25 border border-[#25D366]/40 flex items-center justify-center shrink-0 text-2xl" aria-hidden="true">💬</div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {lang === 'bn' ? 'আমাদের হোয়াটসঅ্যাপ লাইভ চ্যাট গ্রুপে যুক্ত হোন' : 'Join our WhatsApp live chat group'}
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  {lang === 'bn' ? 'খামারিদের সাথে কথা বলুন, আজকের রেট ও বাজারের খবর শেয়ার করুন।' : 'Talk with farmers and share today\'s rates and market news.'}
                </p>
              </div>
            </div>
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-green-500 text-white font-bold text-xs transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপ গ্রুপে যুক্ত হোন' : 'Join WhatsApp Group'}</span>
              <span>➔</span>
            </a>
          </div>
        )}

        {/* Telegram group banner (link comes from Admin > Settings) */}
        {(settings?.telegramChatUrl || settings?.telegramUrl) && (
          <div className="mt-4 bg-gradient-to-r from-sky-900 via-sky-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-sky-800/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-sky-600/30 border border-sky-400/30 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 fill-[#29A9EB]" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {lang === 'bn' ? 'আমাদের টেলিগ্রাম গ্রুপের সাথে যুক্ত হোন' : 'Join our Telegram Group'}
                </h3>
                <p className="text-xs text-sky-200 mt-0.5">
                  {lang === 'bn' ? (settings.telegramChatUrl ? 'লাইভ চ্যাটে খামারিদের সাথে কথা বলুন, রেট ও বাজারের খবর শেয়ার করুন।' : 'প্রতিদিনের বাচ্চার রেট ও বাজার আপডেট সবার আগে টেলিগ্রামে পেতে যোগ দিন।') : 'Get the daily rates and market updates first on Telegram.'}
                </p>
              </div>
            </div>
            <a
              href={settings.telegramChatUrl || settings.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#29A9EB] hover:bg-sky-500 text-white font-bold text-xs transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <span>{lang === 'bn' ? 'আমাদের টেলিগ্রাম গ্রুপের সাথে যুক্ত হোন' : 'Join Telegram Now'}</span>
              <span>➔</span>
            </a>
          </div>
        )}
        {activeTab === 'market' && (
          <MarketSection lang={lang} onOpenSeller={() => setSellerOpen(true)} refreshKey={marketKey} />
        )}
      </main>

      <ChatFab url={settings?.telegramChatUrl} lang={lang} />

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
      <InstallPrompt lang={lang} />
      {mountBanner && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {mountTools && (
        <Suspense fallback={null}>
          <FarmTools
            isOpen={isToolsOpen}
            initialTool={toolStart}
            onClose={() => setIsToolsOpen(false)}
            onOpenProfit={() => { setIsToolsOpen(false); setIsCalculatorOpen(true); }}
          />
        </Suspense>
      )}

      {mountCalc && (
        <Suspense fallback={null}>
          <Calculator
            isOpen={isCalculatorOpen}
            onClose={() => setIsCalculatorOpen(false)}
            rates={liveRates}
            lang={lang}
          />
        </Suspense>
      )}

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

      {mountAdmin && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

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
