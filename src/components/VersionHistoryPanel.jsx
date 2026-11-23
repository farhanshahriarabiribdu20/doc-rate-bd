import React, { useCallback, useEffect, useState } from 'react';
import { Undo2, RefreshCw, History, DatabaseBackup, Download, Loader2 } from 'lucide-react';
import { fetchHistory, fetchHistoryVersion, fetchBackups, fetchBackup, runBackupNow } from '../services/api';

const fmt = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(iso));
  } catch { return '—'; }
};

const kb = (n) => (Number(n) > 0 ? `${Math.max(1, Math.round(Number(n) / 1024)).toLocaleString('bn-BD')} KB` : '');

/** Daily automatic backups (rates, settings, marketplace, gallery list): download or restore the rates. */
function BackupsSection({ adminKey, onRestore }) {
  const [backups, setBackups] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const list = await fetchBackups(adminKey);
    setBackups(list || []);
    if (!list) setMsg('ব্যাকআপের তালিকা লোড করা যায়নি।');
  }, [adminKey]);
  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setBusy('run'); setMsg('');
    const ok = await runBackupNow(adminKey);
    setBusy('');
    setMsg(ok ? 'ব্যাকআপ নেওয়া হয়েছে।' : 'ব্যাকআপ নেওয়া যায়নি। আবার চেষ্টা করুন।');
    if (ok) load();
  };

  const download = async (b) => {
    setBusy(`dl${b.id}`); setMsg('');
    const data = await fetchBackup(adminKey, b.id);
    setBusy('');
    if (!data) { setMsg('ব্যাকআপটি লোড করা যায়নি।'); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `fosholnexa-backup-${b.day}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const restore = async (b) => {
    if (!window.confirm(`${b.day} তারিখের ব্যাকআপ থেকে রেট ও সেটিংস ফিরিয়ে আনবেন?\nএখনকার রেটও ইতিহাসে থাকবে। (বিক্রির বাজার ও গ্যালারি ফিরবে না, সেগুলোর জন্য ফাইল ডাউনলোড করে রাখুন)`)) return;
    setBusy(`rs${b.id}`); setMsg('');
    const data = await fetchBackup(adminKey, b.id);
    setBusy('');
    if (!data?.site) { setMsg('এই ব্যাকআপে রেটের তথ্য নেই।'); return; }
    onRestore(data.site);
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-5 mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-900 flex items-center gap-1.5"><DatabaseBackup className="w-4 h-4 text-emerald-700" /> দৈনিক অটো-ব্যাকআপ</p>
          <p className="text-xs text-slate-600 mt-0.5">প্রতিদিন রাত ৩টায় (বাংলাদেশ সময়) রেট, সেটিংস, বিক্রির বাজার ও গ্যালারির তালিকার ব্যাকআপ হয়। সর্বশেষ ১৪ দিন থাকে।</p>
        </div>
        <button onClick={runNow} disabled={busy === 'run'} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-black cursor-pointer">
          {busy === 'run' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DatabaseBackup className="w-3.5 h-3.5" />} এখনই ব্যাকআপ নিন
        </button>
      </div>
      {msg && <p className="text-xs font-bold text-emerald-800">{msg}</p>}
      {backups === null && <p className="text-xs text-slate-500">লোড হচ্ছে...</p>}
      {backups && backups.length === 0 && !msg && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">এখনো কোনো ব্যাকআপ নেই। রাত ৩টার পর এখানে দেখা যাবে, অথবা "এখনই ব্যাকআপ নিন" চাপুন।</p>
      )}
      {backups && backups.map((b) => (
        <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black text-slate-800">{b.day} <span className="font-medium text-slate-500">· {fmt(b.uploadedAt)} {kb(b.size) && `· ${kb(b.size)}`}</span></p>
          <div className="flex gap-2">
            <button onClick={() => download(b)} disabled={!!busy} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg text-xs font-bold cursor-pointer"><Download className="w-3.5 h-3.5" /> ডাউনলোড</button>
            <button onClick={() => restore(b)} disabled={!!busy} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 disabled:opacity-60 text-amber-900 border border-amber-300 rounded-lg text-xs font-black cursor-pointer"><Undo2 className="w-3.5 h-3.5" /> রেট ফিরিয়ে আনুন</button>
          </div>
        </div>
      ))}

    </div>
  );
}

/** Earlier published versions. Restoring loads one back; the panel then auto-publishes it. */
export default function VersionHistoryPanel({ adminKey, onRestore, refreshToken }) {
  const [versions, setVersions] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setVersions(null);
    setError('');
    const list = await fetchHistory(adminKey);
    if (list) setVersions(list);
    else { setVersions([]); setError('ইতিহাস লোড করা যায়নি। আবার চেষ্টা করুন।'); }
  }, [adminKey]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const restore = async (v) => {
    if (!window.confirm(`${fmt(v.replacedAt)}-এর আগের অবস্থায় ফিরে যাবেন?\nএখনকার রেটও ইতিহাসে থাকবে, চাইলে আবার ফিরতে পারবেন।`)) return;
    setBusyId(v.id);
    const data = await fetchHistoryVersion(adminKey, v.id);
    setBusyId('');
    if (!data) { setError('এই ভার্সনটি লোড করা যায়নি।'); return; }
    onRestore(data);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-600">
          প্রতিটি পরিবর্তনের আগের অবস্থা এখানে জমা থাকে (সর্বশেষ ৪০টি)। ভুল রেট প্রকাশ হয়ে গেলে এক ক্লিকে আগের অবস্থায় ফিরুন।
        </p>
        <button onClick={load} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold cursor-pointer shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ
        </button>
      </div>

      {error && <p className="text-xs font-bold text-red-600">{error}</p>}
      {versions === null && <p className="text-xs text-slate-500">লোড হচ্ছে...</p>}
      {versions && versions.length === 0 && !error && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          এখনো কোনো আগের ভার্সন জমা হয়নি। প্রথম প্রকাশের পর থেকে এখানে দেখা যাবে।
        </p>
      )}

      {versions && versions.map((v, idx) => (
        <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              {fmt(v.replacedAt)}-এর আগের অবস্থা
              {idx === 0 && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">সর্বশেষ</span>}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              রেটের তারিখ: {v.reportDateISO || '—'} · {v.companies}টি কোম্পানি{v.preview?.length ? ` · ${v.preview.join(', ')}…` : ''}
            </p>
          </div>
          <button
            onClick={() => restore(v)}
            disabled={busyId === v.id}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 disabled:opacity-60 text-amber-900 border border-amber-300 rounded-lg text-xs font-black cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" /> {busyId === v.id ? 'লোড হচ্ছে...' : 'এই অবস্থায় ফিরুন'}
          </button>
        </div>
      ))}

      <BackupsSection adminKey={adminKey} onRestore={onRestore} />
    </div>
  );
}
