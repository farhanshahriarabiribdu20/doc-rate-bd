import React from 'react';

/** Floating "live chat" button: opens the Telegram group chat (link comes from Admin > Settings). */
export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/B9A22d7rAQ4HfQyaRPwn4o';

/** Telegram group if the admin set one, otherwise the existing WhatsApp group. */
export default function ChatFab({ url, lang = 'bn' }) {
  const target = url || WHATSAPP_GROUP_URL;
  const wa = !url;
  return (
    <a
      href={target}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={lang === 'bn' ? (wa ? 'হোয়াটসঅ্যাপ গ্রুপে লাইভ চ্যাট' : 'টেলিগ্রামে লাইভ চ্যাট') : 'Live chat'}
      className={`fixed bottom-4 left-3 sm:bottom-5 sm:left-5 z-40 flex items-center gap-2 h-12 px-4 rounded-full ${wa ? 'bg-[#25D366] hover:bg-green-500' : 'bg-[#29A9EB] hover:bg-sky-500'} text-white font-black text-xs sm:text-sm shadow-xl shadow-black/25 border border-white/30 active:scale-95 transition`}
    >
      {wa ? (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.8h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.82 9.82 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.9 9.88zM20.5 3.49A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.44-8.42z"/>
        </svg>
      ) : (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
        </svg>
      )}
      <span>{lang === 'bn' ? 'লাইভ চ্যাট' : 'Live chat'}</span>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
      </span>
    </a>
  );
}
