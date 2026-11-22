import React, { useCallback, useEffect, useState } from 'react';
import { Undo2, RefreshCw, History } from 'lucide-react';
import { fetchHistory, fetchHistoryVersion } from '../services/api';

const fmt = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(iso));
  } catch { return '—'; }
};

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
    </div>
  );
}
