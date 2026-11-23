import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISS_KEY = 'fn_install_dismissed';
const DISMISS_DAYS = 14;

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const recentlyDismissed = () => {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return t && Date.now() - t < DISMISS_DAYS * 864e5;
  } catch { return false; }
};

/** "Install the app" card: Chrome/Edge/Android get the real install prompt, iPhone gets the Add to Home Screen steps. */
export default function InstallPrompt({ lang = 'bn' }) {
  const bn = lang === 'bn';
  const [deferred, setDeferred] = useState(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return undefined;

    const ua = navigator.userAgent || '';
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let timer;
    if (isIos) {
      setIos(true);
      timer = setTimeout(() => setOpen(true), 20000);
    }

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      timer = setTimeout(() => setOpen(true), 15000); // let the visitor read the rates first
    };
    const onInstalled = () => { setOpen(false); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
    setOpen(false);
  };

  if (!open || (!deferred && !ios)) return null;

  return (
    <div role="dialog" aria-label={bn ? 'অ্যাপ ইনস্টল' : 'Install app'}
      className="fixed z-40 left-3 right-3 sm:right-auto sm:left-5 bottom-20 sm:bottom-5 sm:max-w-sm bg-white border border-emerald-200 rounded-2xl shadow-2xl p-4 flex gap-3 items-start print:hidden">
      <img src="/icon-192.png" alt="" className="w-12 h-12 rounded-xl border border-slate-200 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-black text-sm text-slate-900">{bn ? 'ফোনে অ্যাপ হিসেবে রাখুন' : 'Keep it on your phone'}</p>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
          {bn ? 'এক ট্যাপে আজকের রেট খুলুন, ইন্টারনেট না থাকলেও শেষ রেট দেখা যাবে।' : 'Open today’s rates in one tap; last rates work even offline.'}
        </p>
        {deferred ? (
          <button onClick={install} className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer">
            <Download className="w-4 h-4" /> {bn ? 'ইনস্টল করুন' : 'Install'}
          </button>
        ) : (
          <p className="mt-2 text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 leading-relaxed">
            {bn ? 'নিচের ' : 'Tap '}<Share className="inline w-3.5 h-3.5 -mt-0.5" />{bn ? ' শেয়ার বাটনে চাপুন, তারপর “Add to Home Screen” বেছে নিন।' : ' Share, then “Add to Home Screen”.'}
          </p>
        )}
      </div>
      <button onClick={dismiss} aria-label={bn ? 'বন্ধ করুন' : 'Close'} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
