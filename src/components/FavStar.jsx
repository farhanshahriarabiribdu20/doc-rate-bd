import React from 'react';
import { Star } from 'lucide-react';

/** Small star toggle for "my favourite companies". */
export default function FavStar({ on, onToggle, label }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} aria-label={label}
      className={`inline-flex items-center justify-center p-1 rounded-md cursor-pointer ${on ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}>
      <Star className="w-4 h-4" fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}
