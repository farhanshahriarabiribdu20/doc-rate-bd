import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { submitFeedback } from '../services/api';

const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

/** "Is this rate correct?" – like / unlike; unlike opens an optional comment that goes to the admin's feedback inbox. */
export default function RateVote({ item, counts, mine, onVote }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [up, down] = counts || [0, 0];

  const choose = (v) => {
    if (mine) return;
    onVote(v);
    if (v === 'down') setOpen(true);
  };
  const sendComment = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const r = await submitFeedback({
      category: 'তথ্য আপডেট',
      name: 'রেট রিপোর্ট',
      feedback: `[রেট ঠিক নয়] ${item.company}${item.breed ? ` (${item.breed})` : ''} – সাইটে ৳${item.todayRate}\n${text.trim()}`
    });
    setBusy(false);
    if (r.ok) { setSent(true); setOpen(false); }
  };
  const btn = (v, on, Icon, n, color, label) => (
    <button type="button" onClick={() => choose(v)} disabled={Boolean(mine)} aria-pressed={on} aria-label={label}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border transition ${on ? `${color} text-white border-transparent` : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'} ${mine ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'}`}>
      <Icon className="w-3.5 h-3.5" /> {bn(n)}
    </button>
  );

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">এই রেট কি ঠিক আছে?</span>
        <div className="flex items-center gap-1.5">
          {btn('up', mine === 'up', ThumbsUp, up, 'bg-emerald-600', 'ঠিক আছে')}
          {btn('down', mine === 'down', ThumbsDown, down, 'bg-red-500', 'ঠিক নেই')}
        </div>
      </div>
      {open && !sent && (
        <div className="mt-2 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} rows={2} placeholder="সঠিক রেট কত বা কী ভুল? (ঐচ্ছিক)"
            className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
          <div className="flex gap-2">
            <button type="button" onClick={sendComment} disabled={!text.trim() || busy} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-40 cursor-pointer">{busy ? 'পাঠানো হচ্ছে…' : 'মন্তব্য পাঠান'}</button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 cursor-pointer">থাক</button>
          </div>
        </div>
      )}
      {sent && <p className="mt-2 text-[11px] font-bold text-emerald-700">ধন্যবাদ! আপনার মন্তব্য অ্যাডমিনের কাছে পৌঁছেছে।</p>}
    </div>
  );
}
