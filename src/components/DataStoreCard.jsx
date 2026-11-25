import React, { useCallback, useEffect, useState } from 'react';
import { HardDriveDownload, Loader2, RefreshCw, Server } from 'lucide-react';
import { exportEverything, fetchStoreStatus, migrateBlobToSupabase } from '../services/api';

/** Admin settings card: where the site data lives (Vercel Blob or Supabase), a full backup download and the Blob → Supabase copy. */
export default function DataStoreCard({ adminKey }) {
  const [st, setSt] = useState(undefined); // undefined = loading, null = failed
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => { setBusy('status'); setSt(await fetchStoreStatus(adminKey)); setBusy(''); }, [adminKey]);
  useEffect(() => { load(); }, [load]);

  const backup = async () => {
    setBusy('export'); setMsg('');
    try {
      const data = await exportEverything(adminKey);
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fosholnexa-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setMsg(`✅ ${data.count}টি ফাইলের ব্যাকআপ নামানো হয়েছে।`);
    } catch (err) { setMsg(`❌ ব্যাকআপ হয়নি: ${err.message}`); }
    setBusy('');
  };

  const migrate = async () => {
    if (!window.confirm('Vercel Blob-এর সব ডেটা Supabase-এ কপি হবে (Blob অক্ষত থাকবে)। এগোবেন?')) return;
    setBusy('migrate'); setMsg('');
    const r = await migrateBlobToSupabase(adminKey);
    setMsg(r.ok ? `✅ ${r.found}টির মধ্যে ${r.copied}টি কপি হয়েছে${r.failed?.length ? `, ${r.failed.length}টি পড়া যায়নি` : ''}।` : `❌ কপি হয়নি: ${r.error}`);
    setBusy('');
  };

  const isSb = st?.store === 'supabase';
  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-black text-slate-900 text-sm"><Server className="w-4 h-4 text-emerald-700" /> ডেটা স্টোর</div>
        <button onClick={load} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer">
          {busy === 'status' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} রিফ্রেশ
        </button>
      </div>
      {st === undefined && <p className="text-xs text-slate-500">লোড হচ্ছে...</p>}
      {st === null && <p className="text-xs text-red-600 font-bold">অবস্থা জানা যায়নি।</p>}
      {st && (
        <div className="text-xs text-slate-700 space-y-1">
          <p>বর্তমান স্টোর: <b>{isSb ? 'Supabase' : 'Vercel Blob'}</b> · পড়া: <b className={st.readOk ? 'text-emerald-700' : 'text-red-600'}>{st.readOk ? 'ঠিক আছে' : 'ব্যর্থ'}</b></p>
          {!st.readOk && st.error && <p className="text-red-600 break-all">{st.error}</p>}
          {!isSb && <p>Supabase চালু করতে: Vercel-এ <code className="bg-slate-100 px-1 rounded">SUPABASE_URL</code>, <code className="bg-slate-100 px-1 rounded">SUPABASE_SERVICE_KEY</code> দিন → এখানে “কপি” চাপুন → <code className="bg-slate-100 px-1 rounded">STORE=supabase</code> দিয়ে Redeploy।{st.supabaseKeys ? ' (কী পাওয়া গেছে ✔)' : ''}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={backup} disabled={!!busy} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer">
          {busy === 'export' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDriveDownload className="w-3.5 h-3.5" />} সব ডেটার ব্যাকআপ নামান
        </button>
        {st && !isSb && st.supabaseKeys && (
          <button onClick={migrate} disabled={!!busy} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
            {busy === 'migrate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />} Blob → Supabase কপি
          </button>
        )}
      </div>
      {msg && <p className="text-xs font-bold text-slate-800">{msg}</p>}
    </div>
  );
}
