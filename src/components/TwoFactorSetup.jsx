import React, { useEffect, useState } from 'react';
import { ShieldCheck, Copy, Loader2 } from 'lucide-react';
import { createTwoFactorKey, fetchTwoFactorStatus } from '../services/api';

/** Admin settings card: 2-step verification (authenticator app). The key is made here but switched on by adding it to Vercel. */
export default function TwoFactorSetup({ adminKey }) {
  const [on, setOn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => { fetchTwoFactorStatus().then(setOn); }, []);

  const make = async () => {
    setBusy(true); setErr('');
    const r = await createTwoFactorKey(adminKey);
    setBusy(false);
    if (r.ok) setKey(r); else setErr(r.error);
  };
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
      <div className="flex items-center gap-2 font-black text-slate-900 text-sm"><ShieldCheck className="w-4 h-4 text-emerald-700" /> ২-ধাপ যাচাই (2FA)
        {on !== null && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{on ? 'চালু আছে' : 'বন্ধ'}</span>}
      </div>
      {on ? (
        <p className="text-xs text-slate-600">লগইনে পাসওয়ার্ডের পাশাপাশি অথেনটিকেটর অ্যাপের ৬ সংখ্যার কোড লাগে। বন্ধ করতে Vercel থেকে <code className="bg-slate-100 px-1 rounded">ADMIN_TOTP_SECRET</code> মুছে Redeploy করুন।</p>
      ) : !key ? (
        <>
          <p className="text-xs text-slate-600">চালু করলে শুধু পাসওয়ার্ড দিয়ে আর এডমিনে ঢোকা যাবে না, ফোনের অথেনটিকেটর অ্যাপের কোডও লাগবে।</p>
          <button onClick={make} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black text-xs rounded-xl cursor-pointer">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} সেটআপ শুরু করুন
          </button>
        </>
      ) : (
        <div className="space-y-3 text-xs text-slate-700">
          <p><b>ধাপ ১:</b> ফোনে Google Authenticator (বা Authy / Microsoft Authenticator) খুলে <b>"+" → "Enter a setup key"</b> চাপুন। নাম: <b>FosholNexa</b>, key নিচেরটা দিন।</p>
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-2.5">
            <code className="font-black tracking-wider text-sm break-all flex-1 select-all">{key.secret}</code>
            <button onClick={() => copy(key.secret, 'k')} className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-300 font-bold cursor-pointer"><Copy className="w-3 h-3" /> {copied === 'k' ? 'কপি হয়েছে' : 'কপি'}</button>
          </div>
          <a href={key.uri} className="inline-block text-emerald-700 font-bold underline">ফোনে এই পেজ খুললে এখানে চাপলে অ্যাপে নিজেই যোগ হবে</a>
          <p><b>ধাপ ২:</b> Vercel → প্রজেক্ট → <b>Settings → Environment Variables</b>-এ নতুন variable দিন: নাম <code className="bg-slate-100 px-1 rounded">ADMIN_TOTP_SECRET</code>, মান উপরের key। তারপর <b>Redeploy</b> করুন।</p>
          <button onClick={() => copy('ADMIN_TOTP_SECRET', 'n')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-300 font-bold cursor-pointer"><Copy className="w-3 h-3" /> {copied === 'n' ? 'কপি হয়েছে' : 'নামটি কপি'}</button>
          <p><b>ধাপ ৩:</b> Redeploy শেষ হলে লগআউট করে আবার ঢুকুন, পাসওয়ার্ডের পর অ্যাপের ৬ সংখ্যার কোড চাইবে।</p>
          <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">এই key কাউকে দেবেন না, আর এখানে ফিরে এলে নতুন key তৈরি হবে (আগেরটা কাজ করবে না)। ফোন হারালে Vercel থেকে <b>ADMIN_TOTP_SECRET</b> মুছে Redeploy করলে 2FA বন্ধ হয়ে যাবে।</p>
        </div>
      )}
      {err && <p className="text-xs text-red-600 font-bold">{err}</p>}
    </div>
  );
}
