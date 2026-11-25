import React from 'react';

/** Small tag shown next to a rate that a visitor gave (not the admin's own sheet). */
export default function UserRateTag({ lang = 'bn', label, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-300 whitespace-nowrap ${className}`}
      title={lang === 'bn' ? 'এই রেটটি সাইটের কোনো ভিজিটর দিয়েছেন, অফিসিয়াল শিট থেকে নয়' : 'This rate was given by a visitor, not from the official sheet'}
    >
      👤 {label || (lang === 'bn' ? 'ইউজারের দেওয়া রেট' : 'Provided by user')}
    </span>
  );
}
