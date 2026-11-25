import React from 'react';

/** "Share a rate" call-to-action strip shown above the DOC and the ready-bird rates. */
export default function RateCta({ lang, onClick }) {
  const bn = lang === 'bn';
  return (
    <div className="h-full flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">🤝</div>
        <div className="min-w-0">
          <p className="font-black text-sm sm:text-base text-amber-900 leading-snug">
            {bn ? 'আপনার এলাকার রেট জানান — খামারি ভাইদের সঠিক সিদ্ধান্তে সাহায্য করুন' : 'Share your area rate — help fellow farmers decide right'}
          </p>
          <p className="text-xs sm:text-sm text-amber-800 mt-0.5 leading-relaxed">
            {bn
              ? 'আপনি নিজে বাঁচুন, অন্য খামারিকেও বাঁচান — আমাদের উদ্দেশ্য খামার বাঁচানো। আপনার জানা রেটটি পাঠান, সাথে সাথে সবার জন্য "ইউজারের দেওয়া রেট" হিসেবে প্রকাশ হবে।'
              : 'Save yourself and help other farmers too — our goal is to keep farms alive. Send the rate you know; it is published for everyone after checking.'}
          </p>
        </div>
      </div>
      <button onClick={onClick} className="mt-auto w-full px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-sm cursor-pointer">
        ✍️ {bn ? 'রেট জানান' : 'Share a rate'}
      </button>
    </div>
  );
}
