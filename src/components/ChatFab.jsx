import React from 'react';

/** Floating "live chat" button: opens the Telegram group chat (link comes from Admin > Settings). */
export default function ChatFab({ url, lang = 'bn' }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={lang === 'bn' ? 'টেলিগ্রামে লাইভ চ্যাট' : 'Live chat on Telegram'}
      className="fixed bottom-4 left-3 sm:bottom-5 sm:left-5 z-40 flex items-center gap-2 h-12 px-4 rounded-full bg-[#29A9EB] hover:bg-sky-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-sky-900/30 border border-white/30 active:scale-95 transition"
    >
      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
      </svg>
      <span>{lang === 'bn' ? 'লাইভ চ্যাট' : 'Live chat'}</span>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
      </span>
    </a>
  );
}
