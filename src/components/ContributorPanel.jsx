import React, { useEffect, useState } from 'react';
import { X, Trophy, Share2 } from 'lucide-react';
import { fetchTopContributors } from '../services/api';
import { getStats, BADGES, bnNum } from '../utils/contributor';

const SITE = 'https://fosholnexa.com';

/** Panel for the people who give rates: their own record and badge, and today's top rate givers. */
export default function ContributorPanel({ onClose, onGiveRate }) {
  const [tab, setTab] = useState('me');
  const [stats, setStats] = useState(getStats());
  const [board, setBoard] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sync = () => setStats(getStats());
    window.addEventListener('fn-contrib-changed', sync);
    return () => window.removeEventListener('fn-contrib-changed', sync);
  }, []);
  useEffect(() => {
    if (tab !== 'top' || board) return;
    fetchTopContributors().then((r) => (r ? setBoard(r) : setFailed(true)));
  }, [tab, board]);

  const shareText = `আমি ফসল নেক্সায় ${bnNum(stats.total)}টি রেট দিয়েছি${stats.badge ? ` (${stats.badge.icon} ${stats.badge.name})` : ''}। আপনিও আপনার এলাকার বাচ্চা, মুরগি ও ডিমের রেট দিন, সবাই উপকৃত হবে: ${SITE}`;
  const tabCls = (a) => `flex-1 px-3 py-2.5 rounded-xl text-sm font-black cursor-pointer ${a ? 'bg-emerald-700 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;
  const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : bnNum(r));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-emerald-900 text-white rounded-t-3xl">
          <div>
            <h3 className="font-black text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-300" /> রেটদাতা প্যানেল</h3>
            <p className="text-[11px] text-emerald-100">যাঁরা রেট দিয়ে সবাইকে সাহায্য করছেন, তাঁদের জন্য</p>
          </div>
          <button onClick={onClose} aria-label="বন্ধ করুন" className="p-1.5 rounded-full hover:bg-white/15 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setTab('me')} className={tabCls(tab === 'me')}>🙋 আমার অবস্থান</button>
            <button onClick={() => setTab('top')} className={tabCls(tab === 'top')}>🏆 সেরা রেটদাতা</button>
          </div>

          {tab === 'me' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-amber-50 border border-emerald-200 p-4 text-center">
                <div className="text-5xl">{stats.badge ? stats.badge.icon : '🎯'}</div>
                <p className="mt-1 font-black text-slate-900 text-lg">{stats.badge ? stats.badge.name : 'এখনও কোনো রেট দেননি'}</p>
                <p className="text-xs text-slate-600">{stats.total ? `আপনি মোট ${bnNum(stats.total)}টি রেট দিয়েছেন` : 'প্রথম রেটটি দিয়ে ব্যাজ জিতুন'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[['মোট রেট', stats.total], ['আজ', stats.todayCount], ['টানা দিন 🔥', stats.streak]].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-slate-50 border border-slate-200 py-2.5">
                    <div className="text-2xl font-black text-emerald-800">{bnNum(v)}</div>
                    <div className="text-[11px] font-bold text-slate-600">{l}</div>
                  </div>
                ))}
              </div>

              {stats.nextBadge ? (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>পরের ব্যাজ: {stats.nextBadge.icon} {stats.nextBadge.name}</span>
                    <span>আর {bnNum(stats.nextBadge.min - stats.total)}টি</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.max(4, stats.pct)}%` }} /></div>
                </div>
              ) : <p className="text-sm font-black text-emerald-800 text-center">🎉 আপনি সর্বোচ্চ ব্যাজে পৌঁছে গেছেন!</p>}

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-black text-slate-800 mb-2">ব্যাজগুলো</p>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {BADGES.map((b) => (
                    <div key={b.min} className={stats.total >= b.min ? '' : 'opacity-35 grayscale'}>
                      <div className="text-2xl">{b.icon}</div>
                      <div className="text-[10px] font-bold text-slate-700">{bnNum(b.min)}+</div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center">হিসাবটি এই ফোন/ব্রাউজারে জমা থাকে। ব্রাউজারের ডেটা মুছলে শুরু থেকে গণনা হবে।</p>

              <div className="flex gap-2">
                {onGiveRate && <button onClick={() => { onClose(); onGiveRate(); }} className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm cursor-pointer">✍️ এখনই রেট দিন</button>}
                {stats.total > 0 && (
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#1fb857] text-white font-black text-sm">
                    <Share2 className="w-4 h-4" /> শেয়ার
                  </a>
                )}
              </div>
            </div>
          )}

          {tab === 'top' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">গত {bnNum(board?.days || 3)} দিনে সবচেয়ে বেশি রেট দিয়েছেন যাঁরা। নাম দিলে নাম দেখানো হয়, না দিলে "ভিজিটর"। ফোন নম্বর কখনও দেখানো হয় না।</p>
              {!board && !failed && <p className="text-center text-sm text-slate-500 py-6">লোড হচ্ছে…</p>}
              {failed && <p className="text-center text-sm text-red-600 py-6">তালিকা আনা যায়নি। পরে আবার চেষ্টা করুন।</p>}
              {board && !board.top.length && <p className="text-center text-sm text-slate-600 py-6">এখনও কেউ রেট দেননি। প্রথম রেটদাতা আপনিই হোন! 🥇</p>}
              {board?.top.map((t) => {
                const me = stats.who && stats.who === t.who;
                return (
                  <div key={t.who} className={`flex items-center gap-3 rounded-xl border p-3 ${me ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                    <div className="w-8 text-center text-xl font-black">{medal(t.rank)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 truncate">{t.name || 'ভিজিটর'}{me ? ' (আপনি)' : ''}</p>
                      <p className="text-[11px] text-slate-500">আজ {bnNum(t.today)}টি</p>
                    </div>
                    <div className="text-right"><div className="text-lg font-black text-emerald-800">{bnNum(t.count)}</div><div className="text-[10px] text-slate-500">রেট</div></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
