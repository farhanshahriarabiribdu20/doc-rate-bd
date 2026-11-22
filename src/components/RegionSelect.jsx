import React from 'react';
import { DIVISIONS } from '../data/initialData';

/** Which region the shared rates are for. Rates differ by division, so this is always shown. */
export default function RegionSelect({ value, onChange, withMatrix = false, dark = false }) {
  return (
    <label className={`flex flex-wrap items-center gap-2 text-xs font-bold ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
      📍 অঞ্চল:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${dark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
      >
        <option value="all">সমগ্র বাংলাদেশ (জাতীয় গড়)</option>
        {withMatrix && <option value="matrix">সব বিভাগ একসাথে (লিস্ট)</option>}
        {DIVISIONS.filter((d) => d.id !== 'all').map((d) => (
          <option key={d.id} value={d.id}>{d.nameBn.split('(')[0].trim()}</option>
        ))}
      </select>
    </label>
  );
}
