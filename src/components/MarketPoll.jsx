import React, { useEffect, useState } from 'react';
import { fetchPoll, votePoll } from '../services/api';

const OPTIONS = [
  { key: 'good', emoji: '📈', bn: 'ভালো', en: 'Good', bar: 'bg-emerald-500' },
  { key: 'mid', emoji: '😐', bn: 'মোটামুটি', en: 'So-so', bar: 'bg-amber-400' },
  { key: 'bad', emoji: '📉', bn: 'খারাপ', en: 'Bad', bar: 'bg-rose-500' }
];
const bnNum = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const todayKey = (date) => `fn_poll_${date}`;

/** One-tap poll: "how is the market today?". No login; one vote per device per day. */
export default function MarketPoll({ lang = 'bn' }) {
  const bn = lang === 'bn';
  const [poll, setPoll] = useState(null);
  const [mine, setMine] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchPoll().then((p) => {
      if (!alive || !p) return;
      setPoll(p);
      try { setMine(localStorage.getItem(todayKey(p.date)) || ''); } catch { /* ignore */ }
    });
    return () => { alive = false; };
  }, []);

  if (!poll) return null;
  const total = poll.c.reduce((a, b) => a + b, 0);
  const showResult = !!mine;

  const vote = async (key) => {
    if (busy) return;
    setBusy(true); setError('');
    const r = await votePoll(key);
    setBusy(false);
    if (!r.ok) { setError(r.error || (bn ? 'ভোট যায়নি, আবার চেষ্টা করুন।' : 'Could not vote, try again.')); return; }
    setPoll({ date: r.date, c: r.c });
    setMine(key);
    try { localStorage.setItem(todayKey(r.date), key); } catch { /* ignore */ }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <p className="font-black text-slate-900 text-sm sm:text-base">🗳️ {bn ? 'আজ বাজার কেমন?' : 'How is the market today?'}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{bn ? 'এক ট্যাপে আপনার মত জানান (নাম বা লগইন লাগবে না)।' : 'Tap once to tell us (no name or login).'}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map((o, i) => {
          const n = poll.c[i] || 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <button key={o.key} type="button" disabled={busy || showResult} onClick={() => vote(o.key)}
              className={`relative overflow-hidden rounded-xl border px-2 py-3 text-center cursor-pointer disabled:cursor-default ${mine === o.key ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-slate-200 hover:bg-slate-50'}`}>
              {showResult && <span className={`absolute inset-x-0 bottom-0 ${o.bar} opacity-20`} style={{ height: `${pct}%` }} aria-hidden="true" />}
              <span className="relative block text-xl">{o.emoji}</span>
              <span className="relative block text-xs font-black text-slate-800 mt-0.5">{bn ? o.bn : o.en}</span>
              {showResult && <span className="relative block text-[11px] font-bold text-slate-600">{bn ? bnNum(pct) : pct}% ({bn ? bnNum(n) : n})</span>}
            </button>
          );
        })}
      </div>
      {showResult && <p className="mt-2 text-[11px] text-slate-500">{bn ? `আজ ${bnNum(total)} জন মত দিয়েছেন। ধন্যবাদ!` : `${total} votes today. Thank you!`}</p>}
      {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}
