import React, { useMemo, useState } from 'react';
import { ClipboardPaste, Check, X, AlertTriangle, Wand2 } from 'lucide-react';
import { parseWhatsAppRates } from '../utils/whatsappParser';
import { todayISO } from '../utils/date';
import { DIVISIONS } from '../data/initialData';

const divName = (id) => (DIVISIONS.find((d) => d.id === id)?.nameBn || id).split('(')[0].trim();

const shortName = (it) => `${String(it.company || '').split('(')[0].trim()} — ${it.breed || it.category}`;

/**
 * Paste the WhatsApp rate message, review what was understood, then apply.
 * Nothing changes until the admin presses "প্রয়োগ করুন".
 */
export default function WhatsAppPastePanel({ rates, reportDateISO, onApply, onClose }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null); // { rows, skipped }
  const [rows, setRows] = useState([]); // editable copy: { ...row, include }
  const [newDay, setNewDay] = useState(reportDateISO !== todayISO());

  const byId = useMemo(() => new Map(rates.map((r) => [r.id, r])), [rates]);

  const handleParse = () => {
    const result = parseWhatsAppRates(text, rates);
    setParsed(result);
    setRows(result.rows.map((r) => ({ ...r, region: r.division || 'national', include: Boolean(r.itemId) })));
  };

  const update = (i, patch) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const ready = rows.filter((r) => r.include && r.itemId && Number.isFinite(Number(r.rate)) && Number(r.rate) > 0);
  const needsChoice = rows.filter((r) => !r.itemId).length;
  const noRegion = rows.filter((r) => r.include && r.itemId && r.region === 'national').length;

  const handleApply = () => {
    // [{ id, region, rate }] — region: a division id, 'all' (every region) or 'national' (main rate only)
    const updates = ready.map((r) => ({ id: r.itemId, region: r.region, rate: Number(r.rate) }));
    onApply(updates, newDay);
  };

  return (
    <div className="border-2 border-emerald-300 bg-emerald-50/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
          <ClipboardPaste className="w-4 h-4 text-emerald-700" /> WhatsApp থেকে রেট পেস্ট করুন
        </h4>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:bg-white cursor-pointer" aria-label="বন্ধ করুন">
          <X className="w-4 h-4" />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={'WhatsApp-এর রেটের মেসেজটি এখানে পেস্ট করুন। যেমন:\nকাজী ৪১\nপ্যারাগন ৪৩\nসিপি ৩৮'}
        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
      />
      <button
        onClick={handleParse}
        disabled={!text.trim()}
        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black cursor-pointer"
      >
        <Wand2 className="w-4 h-4" /> রেট বুঝে নিন
      </button>

      {parsed && (
        <div className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-xl p-3">
              কোনো কোম্পানির নাম ও রেট খুঁজে পাওয়া যায়নি। কোম্পানির নাম আর রেট একই লাইনে আছে কিনা দেখুন।
            </p>
          ) : (
            <>
              <p className="text-[11px] text-slate-600">
                {rows.length}টি লাইন বোঝা গেছে। ভুল থাকলে ঠিক করুন, তারপর "প্রয়োগ করুন" চাপুন।
                {needsChoice > 0 && <b className="text-amber-700"> {needsChoice}টিতে কোম্পানি বেছে দিতে হবে।</b>}
                {noRegion > 0 && <b className="text-amber-700"> {noRegion}টিতে অঞ্চল পাওয়া যায়নি, শুধু জাতীয় গড় রেট বদলাবে। অঞ্চল বেছে দিন।</b>}
              </p>
              <div className="space-y-2">
                {rows.map((r, i) => {
                  const it = r.itemId ? byId.get(r.itemId) : null;
                  const old = it ? ((r.region !== 'national' && r.region !== 'all' && it.divisionRates?.[r.region]) || it.todayRate) : null;
                  const big = old && Number(r.rate) && Math.abs(Number(r.rate) - old) / old > 0.4;
                  return (
                    <div key={i} className={`bg-white border rounded-xl p-2.5 flex flex-wrap items-center gap-2 ${r.itemId ? 'border-slate-200' : 'border-amber-400'}`}>
                      <input
                        type="checkbox"
                        checked={r.include && Boolean(r.itemId)}
                        disabled={!r.itemId}
                        onChange={(e) => update(i, { include: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600"
                        aria-label="এই লাইনটি প্রয়োগ করুন"
                      />
                      <span className="text-[11px] text-slate-500 flex-1 min-w-[120px] truncate" title={r.line}>{r.line}</span>
                      <select
                        value={r.itemId || ''}
                        onChange={(e) => update(i, { itemId: e.target.value || null, include: Boolean(e.target.value) })}
                        className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold max-w-[220px]"
                      >
                        <option value="">— কোম্পানি বাছুন —</option>
                        {r.candidates.length > 1 && (
                          <optgroup label="সম্ভাব্য">
                            {r.candidates.map((id) => byId.get(id) && <option key={`c-${id}`} value={id}>{shortName(byId.get(id))}</option>)}
                          </optgroup>
                        )}
                        <optgroup label="সব কোম্পানি">
                          {rates.map((it) => <option key={it.id} value={it.id}>{shortName(it)}</option>)}
                        </optgroup>
                      </select>
                      <select
                        value={r.region}
                        onChange={(e) => update(i, { region: e.target.value })}
                        className={`px-2 py-1 border rounded-lg text-xs font-semibold max-w-[170px] ${r.region === 'national' ? 'border-amber-400 bg-amber-50' : 'border-slate-300'}`}
                        title="কোন অঞ্চলের রেট"
                      >
                        <option value="national">অঞ্চল নেই (শুধু জাতীয় গড়)</option>
                        <option value="all">সব অঞ্চলে একই রেট</option>
                        {DIVISIONS.filter((d) => d.id !== 'all').map((d) => <option key={d.id} value={d.id}>{divName(d.id)}</option>)}
                      </select>
                      {r.via && <span className="text-[10px] text-slate-500">({r.via} → {divName(r.division)})</span>}
                      {r.assumed && <span className="text-[10px] font-bold text-amber-700">ব্রয়লার ধরা হয়েছে</span>}
                      <span className="text-[11px] text-slate-500">{old != null ? `${old} →` : ''}</span>
                      <input
                        type="number"
                        value={r.rate}
                        onChange={(e) => update(i, { rate: e.target.value })}
                        className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-xs font-black text-center"
                      />
                      {big && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                          <AlertTriangle className="w-3 h-3" /> অনেক পরিবর্তন
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {parsed.skipped.length > 0 && (
            <details className="text-[11px] text-slate-500">
              <summary className="cursor-pointer font-semibold">বাদ পড়া {parsed.skipped.length}টি লাইন দেখুন</summary>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {parsed.skipped.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </details>
          )}

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={newDay} onChange={(e) => setNewDay(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                নতুন দিন হিসেবে বসান (আজকের রেট → গতকাল, তারিখ আজকের)
              </label>
              <button
                onClick={handleApply}
                disabled={ready.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black cursor-pointer"
              >
                <Check className="w-4 h-4" /> {ready.length}টি রেট প্রয়োগ করুন
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
