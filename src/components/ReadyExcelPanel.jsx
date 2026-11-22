import React, { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Upload, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { parseReadyWorkbook, planReadyImport, buildReadyArchiveDays, READY_FIELDS } from '../utils/readyExcel';
import { formatBn } from '../utils/date';

/**
 * Upload the daily "Ready Broiler & Color sheet" Excel, pick the date sheet, review, apply.
 * Nothing changes until "প্রয়োগ করুন"; the admin panel then auto-publishes.
 */
export default function ReadyExcelPanel({ readyRates, onApply }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState([]);
  const [sheetIdx, setSheetIdx] = useState(-1);
  const [skip, setSkip] = useState(() => new Set());
  const [saveAll, setSaveAll] = useState(true); // also keep every other date of the file for the date-wise view

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      // loaded on demand so the public site never downloads the Excel reader
      const { default: readExcelFile } = await import('read-excel-file/universal');
      const parsed = parseReadyWorkbook(await readExcelFile(file));
      if (!parsed.length) throw new Error('এই ফাইলে রেডি ব্রয়লার/কালার শিটের কোনো তারিখ-ভিত্তিক শিট পাওয়া যায়নি।');
      setSheets(parsed);
      setSheetIdx(parsed.length - 1); // latest date by default
      setSkip(new Set());
      setFileName(file.name);
    } catch (err) {
      setSheets([]);
      setSheetIdx(-1);
      setError(err?.message || 'ফাইলটি পড়া যায়নি। এটি .xlsx ফাইল কি না দেখুন।');
    } finally {
      setBusy(false);
    }
  };

  const sheet = sheets[sheetIdx];
  const plan = useMemo(() => (sheet ? planReadyImport(sheet, readyRates) : null), [sheet, readyRates]);
  const chosen = plan ? plan.rows.filter((r) => !skip.has(r.index)) : [];
  const toggle = (i) => setSkip((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  const cell = (row, key) => {
    const was = row.current ? Number(row.current[key]) : null;
    const now = row.next[key];
    return (
      <td key={key} className={`p-1.5 text-right whitespace-nowrap ${was !== null && was !== now ? 'font-black text-emerald-700' : 'text-slate-600'}`}>
        {now || '—'}
      </td>
    );
  };

  return (
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-2xl p-4 space-y-3">
      <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
        <FileSpreadsheet className="w-4 h-4 text-amber-700" /> রেডি ব্রয়লার ও কালার শিট আপলোড (২১ মোকাম)
      </h4>
      <p className="text-xs text-slate-600 leading-relaxed">
        প্রতিদিনের Ready Broiler &amp; Color sheet (.xlsx) আপলোড করুন। প্রতিটি মোকামের ব্রয়লার, কালার, সোনালী, ডিম ও পিএস-কাল রেট সাইটের রেডি মুরগির দরে বসবে এবং নিজে থেকেই প্রকাশ হবে।
      </p>

      <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl text-xs font-black cursor-pointer"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {fileName ? 'অন্য ফাইল বেছে নিন' : 'রেডি শিট বেছে নিন'}
      </button>
      {fileName && <span className="ml-2 text-xs text-slate-500 break-all">{fileName}</span>}

      {error && (
        <div className="flex items-start gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {plan && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold text-slate-700">কোন তারিখের শিট:</label>
            <select
              value={sheetIdx}
              onChange={(e) => { setSheetIdx(Number(e.target.value)); setSkip(new Set()); }}
              className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
            >
              {sheets.map((s, i) => (
                <option key={s.dateISO} value={i}>{formatBn(s.dateISO)}{i === sheets.length - 1 ? ' — সর্বশেষ' : ''}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-1.5 w-7"></th>
                  <th className="p-1.5 text-left">মোকাম</th>
                  {READY_FIELDS.map((f) => <th key={f.key} className="p-1.5 text-right whitespace-nowrap">{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((r) => (
                  <tr key={r.index} className="border-t border-slate-100">
                    <td className="p-1.5">
                      <input type="checkbox" checked={!skip.has(r.index)} onChange={() => toggle(r.index)} className="cursor-pointer" />
                    </td>
                    <td className="p-1.5 font-semibold text-slate-800 whitespace-nowrap">
                      {r.regionEn}
                      {r.isNew && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-black">নতুন মোকাম</span>}
                    </td>
                    {READY_FIELDS.map((f) => cell(r, f.key))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">সবুজ মোটা সংখ্যা = আগের চেয়ে বদলেছে। শিটে নেই এমন সংখ্যা আগের মতোই থাকবে (যেমন সোনালী "সুপার" রেট শিটে নেই)।</p>

          {plan.untouched.length > 0 && (
            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <b>এই শিটে নেই, তাই আগের রেটই থাকবে ({plan.untouched.length}টি):</b> {plan.untouched.map((i) => i.regionEn).join(', ')}
            </div>
          )}

          {sheets.length > 1 && (
            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input type="checkbox" checked={saveAll} onChange={(e) => setSaveAll(e.target.checked)} className="mt-0.5 cursor-pointer" />
              <span>ফাইলের অন্য {sheets.length - 1}টি তারিখের রেটও সংরক্ষণ করুন (সাইটে "তারিখ অনুযায়ী রেট দেখুন" বাটনে দেখা যাবে)</span>
            </label>
          )}

          <button
            onClick={() => onApply({
              sheet,
              plan: { ...plan, rows: chosen },
              archive: saveAll ? buildReadyArchiveDays(sheets, sheet.dateISO, readyRates) : []
            })}
            disabled={!chosen.length}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-black cursor-pointer"
          >
            <Check className="w-4 h-4" /> প্রয়োগ করুন ({chosen.length}টি মোকাম) ও প্রকাশ করুন
          </button>
        </div>
      )}
    </div>
  );
}
