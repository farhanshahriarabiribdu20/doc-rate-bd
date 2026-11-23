import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Lock, ShieldCheck, Plus, Trash2, Download, Upload, RotateCcw, Check, Settings,
  Bird, Phone, MessageSquareText, CloudUpload, LogOut, ChevronDown, ChevronUp, CalendarClock, Egg, AlertTriangle, ClipboardPaste, Undo2, History, Megaphone, FileSpreadsheet, Inbox, ImagePlus, Store
} from 'lucide-react';
import WhatsAppPastePanel from './WhatsAppPastePanel';
import VersionHistoryPanel from './VersionHistoryPanel';
import ExcelImportPanel from './ExcelImportPanel';
import ReadyExcelPanel from './ReadyExcelPanel';
import SubmissionsPanel from './SubmissionsPanel';
import GalleryAdminPanel from './GalleryAdminPanel';
import MarketAdminPanel from './MarketAdminPanel';
import { fetchMarketAdmin, marketAdminAction } from '../services/market';
import { applyReadyPlan } from '../utils/readyExcel';
import { applyExcelPlan } from '../utils/excelRates';
import { clearZoneRates } from '../data/zones';
import {
  adminLogin, publishSiteData, fetchFeedbacks, deleteFeedback, clearAllFeedbacks, saveRateDays,
  fetchRateSubmissions, fetchGalleryFull, deleteRateSubmissions, sendTelegram
} from '../services/api';
import { todayISO } from '../utils/date';
import { buildShareText } from '../utils/shareText';
import { DIVISIONS } from '../data/initialData';

const SESSION_KEY = 'fosholnexa_admin_key'; // sessionStorage only: cleared when the tab closes

const getSavedKey = () => {
  try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch { return ''; }
};
const saveKey = (key) => {
  try {
    if (key) sessionStorage.setItem(SESSION_KEY, key);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(iso));
  } catch { return ''; }
};

const READY_FIELDS = [
  { key: 'broilerGrill', label: 'ব্রয়লার গ্রিল' },
  { key: 'broilerMedium', label: 'মিডিয়াম' },
  { key: 'broilerBig', label: 'বড়' },
  { key: 'colorBird', label: 'কালার' },
  { key: 'sonali', label: 'সোনালী' },
  { key: 'sonaliSuper', label: 'সুপার' },
  { key: 'eggBrown', label: 'লাল ডিম', step: '0.01' },
  { key: 'eggWhite', label: 'সাদা ডিম', step: '0.01' },
  { key: 'psCull', label: 'পিএস কাল' }
];

export default function AdminModal(props) {
  if (!props.isOpen) return null;
  return <AdminModalContent {...props} />;
}

function AdminModalContent({
  onClose,
  rates,
  setRates,
  readyRates,
  setReadyRates,
  notice,
  setNotice,
  settings,
  setSettings,
  dirty,
  updatedAt,
  onPublished,
  onResetDefaults,
  onOpenPostKit
}) {
  const [adminKey, setAdminKey] = useState('');
  const [checking, setChecking] = useState(() => Boolean(getSavedKey()));
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);

  const [activeTab, setActiveTab] = useState('doc'); // 'doc' | 'ready' | 'submissions' | 'feedback' | 'settings'
  const [toast, setToast] = useState({ msg: '', type: 'ok' });
  const [publishing, setPublishing] = useState(false);

  // feedback inbox (loaded from the server only for an authenticated admin)
  const [feedbacks, setFeedbacks] = useState([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState('');
  const [selectedFbCat, setSelectedFbCat] = useState('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  // visitor-submitted rates waiting for approval
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState('');

  // DOC editor state
  const [expandedId, setExpandedId] = useState(null);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newCompanyEn, setNewCompanyEn] = useState('');
  const [newCategory, setNewCategory] = useState('broiler');
  const [newBreed, setNewBreed] = useState('Cobb 500');
  const [newTodayRate, setNewTodayRate] = useState(58);
  const [newYesterdayRate, setNewYesterdayRate] = useState(56);
  const [newStatus, setNewStatus] = useState('available');

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 3500);
  }, []);

  const logout = useCallback(() => {
    saveKey('');
    setAdminKey('');
    setPassword('');
  }, []);

  // Re-use a password verified earlier in this browser tab.
  useEffect(() => {
    const saved = getSavedKey();
    if (!saved) return undefined;
    let cancelled = false;
    adminLogin(saved).then((r) => {
      if (cancelled) return;
      if (r.ok) setAdminKey(saved);
      else saveKey('');
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoginBusy(true);
    setLoginError('');
    const r = await adminLogin(password);
    setLoginBusy(false);
    if (r.ok) {
      saveKey(password);
      setAdminKey(password);
      setNotConfigured(false);
    } else if (r.reason === 'not_configured') {
      setNotConfigured(true);
    } else if (r.reason === 'wrong') {
      setLoginError('ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।');
    } else {
      setLoginError('সার্ভারে যোগাযোগ করা যাচ্ছে না। ইন্টারনেট চেক করুন (লোকালে চালালে `vercel dev` ব্যবহার করুন)।');
    }
  };

  // ---- visitor-submitted rates (approval queue) ----
  const loadSubs = useCallback(async () => {
    setSubsLoading(true);
    setSubsError('');
    const list = await fetchRateSubmissions(adminKey);
    if (list === null) setSubsError('ইউজারদের রেট লোড করা যায়নি। আবার রিফ্রেশ করুন।');
    else setSubs(list);
    setSubsLoading(false);
  }, [adminKey]);

  // loaded right after login (for the badge) and again whenever the tab is opened
  const onSubsTab = activeTab === 'submissions';
  useEffect(() => {
    if (adminKey) loadSubs();
  }, [adminKey, onSubsTab, loadSubs]);

  const handleApproveSub = async (sub) => {
    if (sub.kind === 'ready') {
      if (!readyRates.some((r) => r.id === sub.targetId)) return;
      forceSnapshotRef.current = true; // the state before approving stays in history, so it can be undone
      setReadyRates((prev) => prev.map((r) => (r.id === sub.targetId ? { ...r, ...sub.values } : r)));
      setSettings((prev) => (prev.readyDateISO === todayISO() ? prev : { ...prev, readyDateISO: todayISO() }));
    } else {
      if (!rates.some((r) => r.id === sub.targetId)) return;
      forceSnapshotRef.current = true;
      const rate = Number(sub.values?.rate);
      setRates((prev) => prev.map((item) => {
        if (item.id !== sub.targetId) return item;
        if (sub.zoneId) return { ...item, zoneRates: { ...(item.zoneRates || {}), [sub.zoneId]: rate } };
        return { ...item, todayRate: rate, rateDate: '' };
      }));
    }
    const ok = await deleteRateSubmissions(adminKey, [sub.id]);
    setSubs((prev) => prev.filter((x) => x.id !== sub.id));
    showToast(ok ? '✅ রেট অনুমোদিত হয়েছে। কিছুক্ষণের মধ্যে অটো-প্রকাশ হবে।' : '✅ রেট বসানো হয়েছে, কিন্তু তালিকা থেকে মুছতে পারিনি (রিফ্রেশ করুন)।', ok ? undefined : 'error');
  };

  const handleRejectSub = async (sub) => {
    const ok = await deleteRateSubmissions(adminKey, [sub.id]);
    if (ok) {
      setSubs((prev) => prev.filter((x) => x.id !== sub.id));
      showToast('রেটটি বাতিল করা হয়েছে।');
    } else showToast('বাতিল করা যায়নি। আবার চেষ্টা করুন।', 'error');
  };

  // ---- rate pictures (gallery) ----
  // { images, v }: the newest copy wins (the server's, or the one this browser saved after its last change)
  const [gallery, setGalleryState] = useState({ images: [], v: 0 });
  const setGallery = useCallback((next) => {
    setGalleryState(next);
    try { localStorage.setItem('fn_gallery_admin', JSON.stringify(next)); } catch { /* ignore */ }
  }, []);
  const onGalleryTab = activeTab === 'gallery';
  useEffect(() => {
    if (!adminKey || !onGalleryTab) return;
    let local = null;
    try { local = JSON.parse(localStorage.getItem('fn_gallery_admin') || 'null'); } catch { /* ignore */ }
    fetchGalleryFull().then((srv) => {
      const best = [srv, local].filter((x) => x && Array.isArray(x.images)).sort((a, b) => (b.v || 0) - (a.v || 0))[0];
      if (best) setGalleryState(best);
    });
  }, [adminKey, onGalleryTab]);

  // ---- seller marketplace moderation ----
  const [market, setMarket] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');

  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    setMarketError('');
    const data = await fetchMarketAdmin(adminKey);
    if (data === null) setMarketError('বিক্রেতাদের বিজ্ঞাপন লোড করা যায়নি। আবার রিফ্রেশ করুন।');
    else setMarket(data);
    setMarketLoading(false);
  }, [adminKey]);

  const onMarketTab = activeTab === 'market';
  useEffect(() => {
    if (adminKey) loadMarket();
  }, [adminKey, onMarketTab, loadMarket]);

  const handleMarketAction = async (payload) => {
    const r = await marketAdminAction(adminKey, payload);
    if (r.ok) {
      setMarket({ items: r.items, banned: r.banned, requireApproval: r.requireApproval });
      showToast('✅ হয়েছে।');
    } else showToast(r.error || 'করা যায়নি। আবার চেষ্টা করুন।', 'error');
  };

  // ---- feedback inbox ----
  const loadFeedbacks = useCallback(async () => {
    setFbLoading(true);
    setFbError('');
    const list = await fetchFeedbacks(adminKey);
    if (list === null) setFbError('মতামত লোড করা যায়নি। আবার রিফ্রেশ করুন।');
    else setFeedbacks(list);
    setFbLoading(false);
  }, [adminKey]);

  useEffect(() => {
    if (adminKey && activeTab === 'feedback') loadFeedbacks();
  }, [adminKey, activeTab, loadFeedbacks]);

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (selectedFbCat !== 'all' && fb.category !== selectedFbCat) return false;
    if (feedbackSearch.trim()) {
      const q = feedbackSearch.toLowerCase();
      return (
        (fb.name && fb.name.toLowerCase().includes(q)) ||
        (fb.phone && fb.phone.includes(q)) ||
        (fb.feedback && fb.feedback.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // ---- publish (automatic) ----
  // Every admin edit is published on its own a few seconds after the last change,
  // so there is no separate "publish" step. The button stays as a manual retry.
  const AUTO_PUBLISH_DELAY_MS = 2500;
  const [autoError, setAutoError] = useState('');
  const [historyToken, setHistoryToken] = useState(0);
  const forceSnapshotRef = useRef(false);
  const latestRef = useRef({ rates, readyRates, notice, settings });
  const dirtyRef = useRef(dirty);
  const adminKeyRef = useRef(adminKey);
  const publishingRef = useRef(false);
  const onPublishedRef = useRef(onPublished);

  useEffect(() => {
    latestRef.current = { rates, readyRates, notice, settings };
    dirtyRef.current = dirty;
    adminKeyRef.current = adminKey;
    onPublishedRef.current = onPublished;
  });

  const publishLatest = useCallback(async ({ silent = false } = {}) => {
    if (publishingRef.current || !adminKeyRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    const payload = latestRef.current;
    const force = forceSnapshotRef.current;
    forceSnapshotRef.current = false;
    const r = await publishSiteData(adminKeyRef.current, force ? { ...payload, snapshot: 'force' } : payload);
    publishingRef.current = false;
    setPublishing(false);
    if (r.ok) {
      setAutoError('');
      setHistoryToken((n) => n + 1);
      // Edits made while the request was in flight stay "dirty" and go out next.
      const changedMeanwhile = latestRef.current !== payload
        && (latestRef.current.rates !== payload.rates
          || latestRef.current.readyRates !== payload.readyRates
          || latestRef.current.notice !== payload.notice
          || latestRef.current.settings !== payload.settings);
      onPublishedRef.current({ ...payload, updatedAt: r.updatedAt }, { keepDirty: changedMeanwhile });
      if (!silent) showToast('✅ সফলভাবে প্রকাশিত হয়েছে! সব ভিজিটর এখন নতুন রেট দেখবে (১-২ মিনিটের মধ্যে)।');
      else showToast('✅ অটো-প্রকাশিত হয়েছে');
    } else if (r.status === 401) {
      logout();
      showToast('পাসওয়ার্ড মেলেনি, আবার লগইন করুন।', 'error');
    } else {
      if (force) forceSnapshotRef.current = true;
      setAutoError(r.error || 'unknown');
      showToast(`প্রকাশ করা যায়নি: ${r.error}। "প্রকাশ করুন" বাটন চেপে আবার চেষ্টা করুন।`, 'error');
    }
  }, [logout, showToast]);

  const handlePublish = () => publishLatest({ silent: false });

  // Debounced auto-publish: waits for the admin to stop typing.
  useEffect(() => {
    if (!adminKey || !dirty) return undefined;
    const t = setTimeout(() => {
      if (publishingRef.current) return;
      publishLatest({ silent: true });
    }, AUTO_PUBLISH_DELAY_MS);
    return () => clearTimeout(t);
  }, [adminKey, dirty, rates, readyRates, notice, settings, publishLatest]);

  // If the admin closes the panel while an edit is still waiting, send it right away.
  useEffect(() => () => {
    if (dirtyRef.current && adminKeyRef.current && !publishingRef.current) {
      publishSiteData(adminKeyRef.current, latestRef.current).then((r) => {
        if (r.ok) onPublishedRef.current({ ...latestRef.current, updatedAt: r.updatedAt }, { keepDirty: false });
      });
    }
  }, []);

  // ---- DOC rate actions ----
  const handleDocChange = (id, field, value) => {
    // Typing a new rate by hand makes it today's rate again.
    const rateField = field === 'todayRate';
    setRates((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value, ...(rateField ? { rateDate: '' } : {}) } : item)));
  };

  const handleDivisionChange = (id, division, value) => {
    setRates((prev) => prev.map((item) => (
      item.id === id ? { ...clearZoneRates(item, division), rateDate: '', divisionRates: { ...(item.divisionRates || {}), [division]: value } } : item
    )));
  };

  const handleSyncDivisions = (item) => {
    const base = Number(item.todayRate) || 0;
    const zones = Object.fromEntries(DIVISIONS.filter((d) => d.id !== 'all').map((d) => [d.id, base]));
    setRates((prev) => prev.map((r) => (r.id === item.id ? { ...clearZoneRates(r, 'all'), divisionRates: zones } : r)));
    showToast('সব জোনের রেট আজকের রেটের সমান করা হয়েছে (প্রয়োজনে আলাদা করে বদলান)');
  };

  const handleDeleteDoc = (id) => {
    if (window.confirm('আপনি কি নিশ্চিত এই বাচ্চার রেট মুছে ফেলতে চান?')) {
      setRates((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleAddDoc = (e) => {
    e.preventDefault();
    if (!newCompany || !newTodayRate) return;
    const base = Number(newTodayRate);
    setRates((prev) => [{
      id: `doc-${Date.now()}`,
      company: newCompany,
      companyEn: newCompanyEn || newCompany,
      category: newCategory,
      breed: newBreed,
      todayRate: base,
      yesterdayRate: Number(newYesterdayRate),
      status: newStatus,
      minBooking: 500,
      bookingPhone: settings.whatsapp || settings.hotline || '',
      notes: 'সরাসরি কোম্পানি সরবরাহ',
      divisionRates: Object.fromEntries(DIVISIONS.filter((d) => d.id !== 'all').map((d) => [d.id, base]))
    }, ...prev]);
    setShowAddDoc(false);
    setNewCompany('');
    setNewCompanyEn('');
    showToast('নতুন বাচ্চার রেট যুক্ত হয়েছে (প্রকাশ করতে ভুলবেন না)');
  };

  // New day: today's rates become "yesterday" so the ▲▼ change indicators work.
  const handleRollover = () => {
    if (window.confirm('নতুন দিন শুরু করবেন? সব কোম্পানির "আজকের রেট" → "গতকালের রেট" হিসেবে সেভ হবে। এরপর নতুন রেট বসান।')) {
      setRates((prev) => prev.map((r) => ({ ...r, yesterdayRate: r.todayRate })));
      setSettings((prev) => ({ ...prev, reportDateISO: todayISO() }));
      showToast('নতুন দিন শুরু হয়েছে। এখন আজকের রেটগুলো বসান।');
    }
  };

  // Paste from WhatsApp: set today's rates for the chosen companies (auto-published afterwards).
  const [showPaste, setShowPaste] = useState(false);
  const handleApplyPaste = (updates, newDay) => {
    const divisionIds = DIVISIONS.filter((d) => d.id !== 'all').map((d) => d.id);
    const byItem = new Map();
    updates.forEach((u) => { if (!byItem.has(u.id)) byItem.set(u.id, []); byItem.get(u.id).push(u); });

    setRates((prev) => prev.map((r) => {
      let next = newDay ? { ...r, yesterdayRate: r.todayRate } : r;
      const list = byItem.get(r.id);
      if (!list) return next;
      let division = { ...(next.divisionRates || {}) };
      let main = next.todayRate;
      let divisionTouched = false;
      let mainSet = false;
      // 1) whole-country / main-rate lines first, 2) then region-specific lines override them
      list.filter((u) => u.region === 'all' || u.region === 'national').forEach((u) => {
        main = u.rate; mainSet = true;
        if (u.region === 'all') divisionIds.forEach((id) => { division[id] = u.rate; });
      });
      list.filter((u) => u.region !== 'all' && u.region !== 'national').forEach((u) => {
        division[u.region] = u.rate; divisionTouched = true;
      });
      // The main rate is the national average of the regions; keep it in step when regions changed.
      if (divisionTouched && !mainSet && divisionIds.every((id) => Number.isFinite(Number(division[id])))) {
        main = Math.round(divisionIds.reduce((sum, id) => sum + Number(division[id]), 0) / divisionIds.length);
      }
      next = { ...next, todayRate: main, rateDate: '' };
      // zone rates under a division that was just overwritten would be stale; the division rate applies instead
      if (list.some((u) => u.region === 'all')) next = clearZoneRates(next, 'all');
      else list.filter((u) => u.region !== 'national').forEach((u) => { next = clearZoneRates(next, u.region); });
      if (next.divisionRates || divisionTouched || list.some((u) => u.region === 'all')) next.divisionRates = division;
      return next;
    }));
    if (newDay) setSettings((prev) => ({ ...prev, reportDateISO: todayISO() }));
    setShowPaste(false);
    showToast(`✅ ${updates.length}টি রেট বসানো হয়েছে। কিছুক্ষণের মধ্যে অটো-প্রকাশ হবে।`);
  };

  // Excel upload: today's rates from the chosen date sheet (auto-published afterwards).
  const handleApplyExcel = ({ sheet, plan, archive }) => {
    forceSnapshotRef.current = true; // the state before the import stays in history, so it can be undone
    setRates((prev) => applyExcelPlan(prev, plan.rows, {
      dateISO: sheet.dateISO,
      previousDateISO: settings.reportDateISO,
      bookingPhone: settings.whatsapp || settings.hotline || ''
    }));
    setSettings((prev) => ({ ...prev, reportDateISO: sheet.dateISO }));
    setActiveTab('doc');
    showToast(`✅ ${plan.rows.length}টি রেট এক্সেল থেকে বসানো হয়েছে। কিছুক্ষণের মধ্যে অটো-প্রকাশ হবে।`);
    if (archive?.length) {
      saveRateDays(adminKey, archive).then((r) => {
        if (r.ok) showToast(`📅 ${r.saved}টি আগের তারিখের রেট "তারিখ অনুযায়ী রেট"-এর জন্য সংরক্ষিত হয়েছে।`);
        else showToast('আগের তারিখগুলো সংরক্ষণ করা যায়নি। আবার আপলোড করে দেখুন।', 'error');
      });
    }
  };

  // Ready broiler/color Excel: the 21 mokam rates (auto-published afterwards).
  const handleApplyReadyExcel = ({ sheet, plan, archive }) => {
    forceSnapshotRef.current = true; // the state before the import stays in history, so it can be undone
    setReadyRates((prev) => applyReadyPlan(prev, plan.rows));
    if (sheet.dateISO) setSettings((prev) => ({ ...prev, readyDateISO: sheet.dateISO }));
    showToast(`✅ ${plan.rows.length}টি মোকামের রেডি রেট (${sheet.name}) বসানো হয়েছে। কিছুক্ষণের মধ্যে অটো-প্রকাশ হবে।`);
    if (archive?.length) {
      saveRateDays(adminKey, archive, 'ready').then((r) => {
        if (r.ok) showToast(`📅 ${r.saved}টি আগের তারিখের মোকাম রেট সংরক্ষিত হয়েছে।`);
        else showToast('আগের তারিখগুলো সংরক্ষণ করা যায়নি। আবার আপলোড করে দেখুন।', 'error');
      });
    }
  };

  // Undo: load an earlier version back into the editor; auto-publish then publishes it.
  const handleRestoreVersion = (data) => {
    if (!Array.isArray(data.rates) || !Array.isArray(data.readyRates)) {
      showToast('এই ভার্সনটি ঠিকমতো লোড হয়নি।', 'error');
      return;
    }
    forceSnapshotRef.current = true; // keep the current state in history too, so an undo can be undone
    setRates(data.rates);
    setReadyRates(data.readyRates);
    setNotice(typeof data.notice === 'string' ? data.notice : '');
    if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
    setActiveTab('doc');
    showToast('↩️ আগের অবস্থা ফিরে এসেছে। কিছুক্ষণের মধ্যে সবার জন্য প্রকাশ হবে।');
  };

  // ---- ready market ----
  const handleReadyChange = (id, field, value) => {
    setReadyRates((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setSettings((prev) => (prev.readyDateISO === todayISO() ? prev : { ...prev, readyDateISO: todayISO() })); // hand-edited rates are today's
  };

  // ---- backup ----
  const handleExportJSON = () => {
    const backupData = { rates, readyRates, notice, settings };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `fosholnexa-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.rates)) throw new Error('rates missing');
        if (!window.confirm('ব্যাকআপ ফাইল থেকে ডাটা ইমপোর্ট করবেন? বর্তমান ডাটা বদলে অটো-প্রকাশ হয়ে যাবে।')) return;
        setRates(data.rates);
        if (Array.isArray(data.readyRates)) setReadyRates(data.readyRates);
        if (typeof data.notice === 'string') setNotice(data.notice);
        if (data.settings && typeof data.settings === 'object') {
          const { adminPin, ...safe } = data.settings; // never import an old PIN
          void adminPin;
          setSettings((prev) => ({ ...prev, ...safe }));
        }
        showToast('ইমপোর্ট সম্পন্ন। যাচাই করে "প্রকাশ করুন" চাপুন।');
      } catch {
        showToast('ফাইলটি সঠিক ব্যাকআপ ফাইল নয়।', 'error');
      }
    };
    reader.readAsText(file);
  };

  const tabClass = (id) => `px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
    activeTab === id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">FosholNexa এডমিন ড্যাশবোর্ড</h3>
              <p className="text-xs text-slate-500">
                {updatedAt ? `সর্বশেষ প্রকাশ: ${formatDateTime(updatedAt)}` : 'এখনো কিছু প্রকাশ করা হয়নি'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminKey && onOpenPostKit && (
              <button
                onClick={onOpenPostKit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition cursor-pointer"
                title="ফেসবুক/হোয়াটসঅ্যাপে পোস্টের টেক্সট ও ছবি"
              >
                <Megaphone className="w-4 h-4" /> <span className="hidden sm:inline">পোস্ট কিট</span>
              </button>
            )}
            {adminKey && (
              <button
                onClick={async () => {
                  if (!window.confirm('আজকের রেট টেলিগ্রাম চ্যানেলে পোস্ট হবে। পাঠাব?')) return;
                  const r = await sendTelegram(adminKey, buildShareText({ rates, notice, settings }));
                  if (r.ok) showToast('✅ টেলিগ্রাম চ্যানেলে পাঠানো হয়েছে।');
                  else if (r.notConfigured) showToast('টেলিগ্রাম এখনো সেট করা হয়নি (Vercel-এ TELEGRAM_BOT_TOKEN ও TELEGRAM_CHAT_ID দিন)।', 'error');
                  else showToast(`পাঠানো যায়নি: ${r.error}`, 'error');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition cursor-pointer"
                title="আজকের রেট টেলিগ্রাম চ্যানেলে পাঠান"
              >
                <span aria-hidden="true">✈️</span> <span className="hidden sm:inline">টেলিগ্রামে পাঠান</span>
              </button>
            )}
            {adminKey && (
              <button
                onClick={() => setActiveTab('history')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                title="আগের অবস্থায় ফিরুন (আনডু)"
              >
                <Undo2 className="w-4 h-4" /> <span className="hidden sm:inline">আনডু</span>
              </button>
            )}
            {adminKey && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-60 ${
                  dirty
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title="পরিবর্তন কয়েক সেকেন্ড পরে নিজে থেকেই প্রকাশ হয়। চাইলে এখনই প্রকাশ করুন।"
              >
                <CloudUpload className="w-4 h-4" />
                <span>{publishing ? 'প্রকাশ হচ্ছে...' : autoError && dirty ? 'প্রকাশ হয়নি — আবার চেষ্টা করুন' : dirty ? 'অটো-প্রকাশ হচ্ছে... (এখনই করুন)' : '✓ অটো-প্রকাশ চালু'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Login */}
        {!adminKey ? (
          <div className="p-8 max-w-sm mx-auto text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">এডমিন পাসওয়ার্ড দিয়ে আনলক করুন</h4>
            <p className="text-xs text-slate-500">শুধুমাত্র অনুমোদিত ব্যবহারকারীর জন্য</p>

            {checking ? (
              <p className="text-xs text-slate-500">যাচাই করা হচ্ছে...</p>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  placeholder="পাসওয়ার্ড"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-center text-lg font-bold py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                {loginError && <p className="text-xs text-red-600 font-medium">{loginError}</p>}

                <button
                  type="submit"
                  disabled={loginBusy}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition cursor-pointer"
                >
                  {loginBusy ? 'যাচাই হচ্ছে...' : 'প্রবেশ করুন'}
                </button>
              </form>
            )}

            {notConfigured && (
              <div className="text-left text-xs bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl p-4 space-y-1.5">
                <p className="font-black flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" /> সার্ভারে পাসওয়ার্ড সেট করা নেই</p>
                <p>Vercel → আপনার প্রজেক্ট → <b>Settings → Environment Variables</b>-এ গিয়ে <code className="bg-white px-1 rounded">ADMIN_PASSWORD</code> নামে একটি শক্ত পাসওয়ার্ড (১২+ অক্ষর) দিন, তারপর <b>Redeploy</b> করুন।</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6">
            {toast.msg && (
              <div className={`p-3 border rounded-xl text-xs font-bold flex items-center gap-2 ${
                toast.type === 'error'
                  ? 'bg-red-50 border-red-300 text-red-800'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-800'
              }`}>
                {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                {toast.msg}
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
              <button onClick={() => setActiveTab('doc')} className={tabClass('doc')}>
                <Bird className="w-4 h-4" /> বাচ্চার দর (DOC)
              </button>
              <button onClick={() => setActiveTab('ready')} className={tabClass('ready')}>
                <Egg className="w-4 h-4" /> রেডি মুরগি ও ডিম
              </button>
              <button onClick={() => setActiveTab('submissions')} className={tabClass('submissions')}>
                <Inbox className="w-4 h-4" /> ইউজার রেট
                {subs.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">{subs.length}</span>
                )}
              </button>
              <button onClick={() => setActiveTab('gallery')} className={tabClass('gallery')}>
                <ImagePlus className="w-4 h-4" /> রেট চার্ট ও ছবি
              </button>
              <button onClick={() => setActiveTab('market')} className={tabClass('market')}>
                <Store className="w-4 h-4" /> বিক্রেতার বিজ্ঞাপন
                {(market?.items || []).some((i) => i.status === 'pending') && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">{market.items.filter((i) => i.status === 'pending').length}</span>
                )}
              </button>
              <button onClick={() => setActiveTab('feedback')} className={tabClass('feedback')}>
                <MessageSquareText className="w-4 h-4" /> মতামত ও পরামর্শ
                {feedbacks.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">{feedbacks.length}</span>
                )}
              </button>
              <button onClick={() => setActiveTab('excel')} className={tabClass('excel')}>
                <FileSpreadsheet className="w-4 h-4" /> এক্সেল আপলোড
              </button>
              <button onClick={() => setActiveTab('history')} className={tabClass('history')}>
                <History className="w-4 h-4" /> ইতিহাস ও আনডু
              </button>
              <button onClick={() => setActiveTab('settings')} className={tabClass('settings')}>
                <Settings className="w-4 h-4" /> সেটিংস ও নোটিশ
              </button>
            </div>

            {/* TAB: DOC RATES */}
            {activeTab === 'doc' && (
              <div className="space-y-4">
                {/* Effective date + daily rollover */}
                <div className="flex flex-wrap items-end justify-between gap-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">রেট কার্যকর তারিখ</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={settings.reportDateISO || todayISO()}
                        onChange={(e) => e.target.value && setSettings((prev) => ({ ...prev, reportDateISO: e.target.value }))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                      />
                      <button
                        onClick={() => setSettings((prev) => ({ ...prev, reportDateISO: todayISO() }))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        আজকের তারিখ
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{settings.reportDateBn}</p>
                  </div>
                  <button
                    onClick={handleRollover}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold cursor-pointer"
                    title="আজকের রেট গতকালের ঘরে সরিয়ে তারিখ আজকের করে"
                  >
                    <CalendarClock className="w-4 h-4" /> নতুন দিন শুরু করুন
                  </button>
                  <button
                    onClick={() => setShowPaste((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer"
                    title="WhatsApp-এর রেটের মেসেজ পেস্ট করে একসাথে সব রেট বসান"
                  >
                    <ClipboardPaste className="w-4 h-4" /> WhatsApp থেকে পেস্ট
                  </button>
                </div>

                {showPaste && (
                  <WhatsAppPastePanel
                    rates={rates}
                    reportDateISO={settings.reportDateISO}
                    onApply={handleApplyPaste}
                    onClose={() => setShowPaste(false)}
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setShowAddDoc(!showAddDoc)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন বাচ্চার রেট যোগ করুন</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> ব্যাকআপ ইমপোর্ট
                      <input type="file" accept="application/json,.json" onChange={handleImportJSON} className="hidden" />
                    </label>
                    <button
                      onClick={handleExportJSON}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> ব্যাকআপ ডাউনলোড
                    </button>
                  </div>
                </div>

                {showAddDoc && (
                  <form onSubmit={handleAddDoc} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-emerald-900">নতুন বাচ্চার তথ্য যোগ করুন</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">কোম্পানির নাম</label>
                        <input type="text" required placeholder="যেমন: কাজী ফার্মস" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">ইংরেজি নাম (ব্যানারের জন্য)</label>
                        <input type="text" placeholder="e.g. Kazi Farms" value={newCompanyEn} onChange={(e) => setNewCompanyEn(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs">
                          <option value="broiler">ব্রয়লার (Broiler)</option>
                          <option value="sonali">সোনালী (Sonali)</option>
                          <option value="layer_brown">লেয়ার বাদামী</option>
                          <option value="layer_white">লেয়ার সাদা</option>
                          <option value="cockerel">ককরেল / দেশি</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">জাত/ভ্যারাইটি</label>
                        <input type="text" value={newBreed} onChange={(e) => setNewBreed(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">আজকের রেট (৳)</label>
                        <input type="number" required value={newTodayRate} onChange={(e) => setNewTodayRate(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">গতকালের রেট (৳)</label>
                        <input type="number" required value={newYesterdayRate} onChange={(e) => setNewYesterdayRate(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">স্ট্যাটাস</label>
                        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs">
                          <option value="available">প্রস্তুত (Available)</option>
                          <option value="booking_open">বুকিং চালু</option>
                          <option value="limited">সীমিত স্টক</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowAddDoc(false)} className="px-3 py-1.5 text-xs text-slate-600 bg-white border rounded-lg cursor-pointer">বাতিল</button>
                      <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg cursor-pointer">যুক্ত করুন</button>
                    </div>
                  </form>
                )}

                {/* Quick rate edit */}
                <div className="space-y-2">
                  {rates.map((item) => (
                    <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-xl">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-[180px]">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 block">{item.company}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{item.breed} ({item.category})</span>
                          {item.rateDate && item.rateDate !== settings.reportDateISO && (
                            <span className="block text-[10px] font-black text-amber-700">⚠️ এই তারিখের রেট নেই — সাইটে দেখানো হচ্ছে না (রেট বসালে দেখাবে)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-[10px] text-slate-500 block">আজকের (৳)</span>
                            <input type="number" value={item.todayRate} onChange={(e) => handleDocChange(item.id, 'todayRate', Number(e.target.value))} className="w-16 px-2 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 text-center" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">গতকালের (৳)</span>
                            <input type="number" value={item.yesterdayRate} onChange={(e) => handleDocChange(item.id, 'yesterdayRate', Number(e.target.value))} className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 text-center" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">স্ট্যাটাস</span>
                            <select value={item.status} onChange={(e) => handleDocChange(item.id, 'status', e.target.value)} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold">
                              <option value="available">প্রস্তুত</option>
                              <option value="booking_open">বুকিং চালু</option>
                              <option value="limited">সীমিত</option>
                            </select>
                          </div>
                          <button
                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg cursor-pointer"
                            title="জোনভিত্তিক রেট"
                          >
                            {expandedId === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDeleteDoc(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {expandedId === item.id && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-600">বিভাগভিত্তিক রেট (৳)</span>
                            <button onClick={() => handleSyncDivisions(item)} className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer">
                              সব জোন = আজকের রেট
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {DIVISIONS.filter((d) => d.id !== 'all').map((d) => (
                              <div key={d.id}>
                                <span className="text-[10px] text-slate-500 block truncate">{d.nameBn.split(' (')[0]}</span>
                                <input
                                  type="number"
                                  value={item.divisionRates?.[d.id] ?? item.todayRate}
                                  onChange={(e) => handleDivisionChange(item.id, d.id, Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-center"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: READY MARKET */}
            {activeTab === 'ready' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800">রেডি ব্রয়লার, সোনালী, কালার, ডিম ও পিএস কাল (মোকামভিত্তিক)</h4>
                <p className="text-[11px] text-slate-500">ব্রয়লার/সোনালী/কালার/পিএস কাল — ৳/কেজি। ডিম — ৳/পিস। বদলানোর পর উপরের "প্রকাশ করুন" চাপুন।</p>
                <div className="flex flex-wrap items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-xs font-bold text-emerald-900">📅 এই রেটগুলো কোন তারিখের:</span>
                  <input
                    type="date"
                    value={settings.readyDateISO || ''}
                    onChange={(e) => e.target.value && setSettings((p) => ({ ...p, readyDateISO: e.target.value }))}
                    className="px-2 py-1 border rounded-lg text-xs font-bold bg-white"
                  />
                  <button type="button" onClick={() => setSettings((p) => ({ ...p, readyDateISO: todayISO() }))} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold">আজ</button>
                  <span className="text-[11px] text-emerald-800">Excel দিলে শিটের তারিখ নিজে বসে; হাতে রেট বদলালে আজকের তারিখ বসে।</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="py-2 px-3 text-left font-bold sticky left-0 bg-slate-100">মোকাম</th>
                        {READY_FIELDS.map((f) => (
                          <th key={f.key} className="py-2 px-1.5 font-bold whitespace-nowrap">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {readyRates.map((r) => (
                        <tr key={r.id}>
                          <td className="py-1.5 px-3 font-bold text-slate-900 whitespace-nowrap sticky left-0 bg-white">{r.regionBn}</td>
                          {READY_FIELDS.map((f) => (
                            <td key={f.key} className="py-1 px-1">
                              <input
                                type="number"
                                step={f.step || '1'}
                                value={r[f.key]}
                                onChange={(e) => handleReadyChange(r.id, f.key, Number(e.target.value))}
                                className="w-16 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-center font-semibold"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: FEEDBACKS */}
            {activeTab === 'submissions' && (
              <SubmissionsPanel
                subs={subs}
                loading={subsLoading}
                error={subsError}
                readyRates={readyRates}
                rates={rates}
                onReload={loadSubs}
                onApprove={handleApproveSub}
                onReject={handleRejectSub}
              />
            )}

            {activeTab === 'gallery' && (
              <GalleryAdminPanel adminKey={adminKey} gallery={gallery} onChange={setGallery} showToast={showToast} />
            )}

            {activeTab === 'market' && (
              <MarketAdminPanel data={market} loading={marketLoading} error={marketError} onReload={loadMarket} onAction={handleMarketAction} />
            )}

            {activeTab === 'feedback' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <span>💬 ভিজিটরদের মতামত ও পরামর্শ</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold">{feedbacks.length}টি</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">শুধু আপনি (এডমিন) এগুলো দেখতে পান। ভিজিটরদের ব্রাউজারে কিছু জমা হয় না।</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={loadFeedbacks} disabled={fbLoading} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1">
                      <RotateCcw className={`w-3.5 h-3.5 ${fbLoading ? 'animate-spin' : ''}`} />
                      <span>রিফ্রেশ</span>
                    </button>
                    {feedbacks.length > 0 && (
                      <button
                        onClick={async () => {
                          if (window.confirm('আপনি কি নিশ্চিত সকল মতামত মুছে ফেলতে চান?')) {
                            const ok = await clearAllFeedbacks(adminKey);
                            if (ok) { setFeedbacks([]); showToast('সকল মতামত মুছে ফেলা হয়েছে'); }
                            else showToast('মুছতে ব্যর্থ হয়েছে', 'error');
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>সকল মতামত ক্লিয়ার করুন</span>
                      </button>
                    )}
                  </div>
                </div>

                {fbError && <p className="text-xs font-semibold text-red-600">{fbError}</p>}

                {feedbacks.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1">
                      {['all', 'পরামর্শ', 'তথ্য আপডেট', 'সমস্যা', 'সাধারণ'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedFbCat(cat)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                            selectedFbCat === cat ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat === 'all' ? 'সকল' : cat}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="নাম, ফোন বা বার্তা দিয়ে খুঁজুন..."
                      value={feedbackSearch}
                      onChange={(e) => setFeedbackSearch(e.target.value)}
                      className="w-full sm:w-64 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {fbLoading && feedbacks.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">লোড হচ্ছে...</p>
                ) : filteredFeedbacks.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                    <MessageSquareText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">কোনো মতামত পাওয়া যায়নি</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredFeedbacks.map((fb) => (
                      <div key={fb.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-emerald-300 transition space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">{fb.category}</span>
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{fb.name}</span>
                            {fb.phone && <span className="text-xs font-semibold text-slate-500">📞 {fb.phone}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>🕒 {fb.date}</span>
                            <button
                              onClick={async () => {
                                if (window.confirm('এই মতামতটি মুছে ফেলতে চান?')) {
                                  const ok = await deleteFeedback(adminKey, fb.id);
                                  if (ok) { setFeedbacks((prev) => prev.filter((f) => f.id !== fb.id)); showToast('মতামত মুছে ফেলা হয়েছে'); }
                                  else showToast('মুছতে ব্যর্থ হয়েছে', 'error');
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50/70 p-3 rounded-xl border border-slate-100">{fb.feedback}</p>

                        {fb.phone && fb.phone.replace(/[^0-9]/g, '').length >= 10 && (
                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={`https://wa.me/88${fb.phone.replace(/[^0-9]/g, '').replace(/^88/, '')}?text=${encodeURIComponent('আসসালামু আলাইকুম, ফসলনেক্সা (FosholNexa) ওয়েবসাইট উন্নয়ন মতামত প্রদানের জন্য আপনাকে ধন্যবাদ।')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                            >
                              <span>WhatsApp-এ উত্তর দিন</span>
                            </a>
                            <a
                              href={`tel:${fb.phone.replace(/[^0-9+]/g, '')}`}
                              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                            >
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>সরাসরি কল</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: EXCEL UPLOAD */}
            {activeTab === 'excel' && (
              <div className="space-y-5">
                <ExcelImportPanel rates={rates} reportDateISO={settings.reportDateISO} bookingPhone={settings.whatsapp || settings.hotline || ''} onApply={handleApplyExcel} />
                <ReadyExcelPanel readyRates={readyRates} onApply={handleApplyReadyExcel} />
              </div>
            )}

            {/* TAB: HISTORY / UNDO */}
            {activeTab === 'history' && (
              <VersionHistoryPanel adminKey={adminKey} onRestore={handleRestoreVersion} refreshToken={historyToken} />
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">হটলাইন / কল নম্বর</label>
                    <input type="text" value={settings.hotline || ''} onChange={(e) => setSettings((p) => ({ ...p, hotline: e.target.value }))} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp নম্বর (বুকিংয়ের জন্য)</label>
                    <input type="text" value={settings.whatsapp || ''} onChange={(e) => setSettings((p) => ({ ...p, whatsapp: e.target.value }))} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                  </div>
                  <div className="sm:col-span-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">✈️ Telegram চ্যানেলের লিংক (ভিজিটররা জয়েন করবে)</label>
                      <input type="url" placeholder="https://t.me/..." value={settings.telegramUrl || ''} onChange={(e) => setSettings((p) => ({ ...p, telegramUrl: e.target.value }))} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                    </div>
                    <p className="text-xs font-black text-slate-800">📥 ছবি ডাউনলোডের আগে ফলো করার লিংক</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">YouTube চ্যানেলের লিংক</label>
                        <input type="url" placeholder="https://www.youtube.com/@..." value={settings.youtubeUrl || ''} onChange={(e) => setSettings((p) => ({ ...p, youtubeUrl: e.target.value }))} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Facebook পেজের লিংক</label>
                        <input type="url" placeholder="https://www.facebook.com/..." value={settings.followFbUrl || ''} onChange={(e) => setSettings((p) => ({ ...p, followFbUrl: e.target.value }))} className="w-full px-3 py-2 border rounded-xl text-xs font-bold" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">ফাঁকা রাখলে সাইটের ডিফল্ট YouTube চ্যানেল ও Facebook পেজ লিংক ব্যবহার হয় (হেডার, ফুটার ও ডাউনলোডের পপ-আপে)।</p>
                  </div>
                  <label className="sm:col-span-2 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showLiveVisitors !== false}
                      onChange={(e) => setSettings((p) => ({ ...p, showLiveVisitors: e.target.checked }))}
                      className="mt-0.5 cursor-pointer"
                    />
                    <span><b>"এখন অনলাইনে N জন" দেখান</b> — সাইটের উপরের বারে এই মুহূর্তে কতজন সাইটে আছে তা দেখায়। (বিনা খরচে চলে; সংখ্যাটি আনুমানিক। সবসময় নিখুঁত সংখ্যা চাইলে পরে Upstash Redis যুক্ত করা যাবে।)</span>
                  </label>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ব্র্যান্ড নাম</label>
                    <input type="text" value={settings.brandName || ''} onChange={(e) => setSettings((p) => ({ ...p, brandName: e.target.value }))} className="w-full px-3 py-2 border rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">রেট কার্যকর তারিখ</label>
                    <input
                      type="date"
                      value={settings.reportDateISO || todayISO()}
                      onChange={(e) => e.target.value && setSettings((p) => ({ ...p, reportDateISO: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl text-xs font-semibold text-emerald-800"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">বাংলা/ইংরেজি তারিখ স্বয়ংক্রিয়ভাবে তৈরি হয়: {settings.reportDateBn}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <label className="block text-xs font-bold text-amber-900 mb-1">লাইভ স্ক্রলিং নোটিশ (বিজ্ঞপ্তি)</label>
                  <textarea rows={2} value={notice} onChange={(e) => setNotice(e.target.value)} className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-800" />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600">
                  <p className="font-bold text-slate-800 mb-1">🔐 এডমিন পাসওয়ার্ড</p>
                  <p>পাসওয়ার্ড এখন সার্ভারে (Vercel → Settings → Environment Variables → <code className="bg-white px-1 rounded">ADMIN_PASSWORD</code>) থাকে। বদলাতে হলে ওখানে বদলে Redeploy করুন।</p>
                </div>

                <div className="pt-2 flex flex-wrap justify-between items-center gap-3">
                  <button
                    onClick={() => {
                      if (window.confirm('সবকিছু প্রোগ্রামের ডিফল্ট ডাটাতে ফিরিয়ে নিতে চান? (এটা অটো-প্রকাশ হয়ে সব ভিজিটরের কাছে চলে যাবে)')) {
                        onResetDefaults();
                        showToast('ডিফল্ট ডাটা বসানো হয়েছে। প্রকাশ করতে ভুলবেন না।');
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> ডিফল্ট ডাটায় রিসেট
                  </button>
                  <button
                    onClick={() => { logout(); showToast('লগআউট হয়েছে'); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> লগআউট
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
