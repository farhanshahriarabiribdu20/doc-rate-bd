import React, { useState, useEffect } from 'react';

export const inputCls =
  'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-500 outline-none';

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

export function NumField({ label, value, onChange, step, hint, min = 0 }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={inputCls}
      />
    </Field>
  );
}

export function Stat({ label, value, tone = 'plain', sub }) {
  const tones = {
    plain: 'bg-slate-50 border-slate-200 text-slate-900',
    good: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    bad: 'bg-rose-50 border-rose-200 text-rose-800',
    warn: 'bg-amber-50 border-amber-200 text-amber-800'
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <span className="block text-[11px] font-bold opacity-70">{label}</span>
      <span className="block text-lg font-black leading-tight">{value}</span>
      {sub && <span className="block text-[11px] font-medium opacity-70 mt-0.5">{sub}</span>}
    </div>
  );
}

export function Note({ children }) {
  return <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">{children}</p>;
}

export const Grid = ({ cols = 2, children }) => (
  <div className={`grid grid-cols-2 ${cols === 3 ? 'sm:grid-cols-3' : cols === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} gap-3`}>{children}</div>
);

export const money = (v) => `৳${Math.round(v).toLocaleString('en-US')}`;
export const signed = (v) => `${v >= 0 ? '+' : '-'}৳${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
export const fix = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** useState that persists in localStorage (per device). */
export function useSaved(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      return Array.isArray(initial) ? (Array.isArray(parsed) ? parsed : initial) : { ...initial, ...parsed };
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      /* storage unavailable */
    }
  }, [key, val]);
  return [val, setVal];
}
