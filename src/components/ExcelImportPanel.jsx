import React, { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Upload, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { parseCompetitorWorkbook, planExcelImport } from '../utils/excelRates';
import { formatBn } from '../utils/date';

/**
 * Upload the daily "Competitors DOC Rate" Excel, pick the date sheet, review, apply.
 * Nothing changes until "প্রয়োগ করুন"; the admin panel then auto-publishes.
 */
export default function ExcelImportPanel({ rates, reportDateISO, onApply }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState([]); // parsed date sheets, oldest first
  const [sheetIdx, setSheetIdx] = useState(-1);
  const [skip, setSkip] = useState(() => new Set()); // plan keys the admin unticked

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      // loaded on demand so the public site never downloads the Excel reader
      const { default: readExcelFile } = await import('read-excel-file/universal');
      const parsed = parseCompetitorWorkbook(await readExcelFile(file));
      const usable = parsed.filter((s) => s.columns.some((c) => c.count));
      if (!usable.length) throw new Error('এই ফাইলে তারিখ-ভিত্তিক কোনো রেটের শিট পাওয়া যায়নি।');
      setSheets(usable);
      setSheetIdx(usable.length - 1); // latest date by default
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
  const plan = useMemo(
    () => (sheet ? planExcelImport(sheet, sheets.slice(0, sheetIdx), rates) : null),
    [sheet, sheets, sheetIdx, rates]
  );
  const chosen = plan ? plan.rows.filter((r) => !skip.has(r.key)) : [];
  const toggle = (key) => setSkip((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <div className="border-2 border-emerald-300 bg-emerald-50/60 rounded-2xl p-4 space-y-3">
      <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
        <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> এক্সেল থেকে রেট আপলোড (Competitors DOC Rate)
      </h4>
      <p className="text-xs text-slate-600 leading-relaxed">
        প্রতিদিনের রেট-শিট (.xlsx) আপলোড করুন। শুধু <b>Prs</b> কলামের রেট নেওয়া হয়। জোনগুলো বিভাগে মিলিয়ে সাইটে বসে এবং নিজে থেকেই প্রকাশ হয়ে যায়।
      </p>

      <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-black cursor-pointer"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {fileName ? 'অন্য ফাইল বেছে নিন' : 'এক্সেল ফাইল বেছে নিন'}
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
            {reportDateISO && reportDateISO > sheet.dateISO && (
              <span className="text-[11px] font-bold text-amber-700">⚠️ সাইটের বর্তমান তারিখ এর চেয়ে নতুন ({formatBn(reportDateISO)})</span>
            )}
          </div>

          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-2 w-8"></th>
                  <th className="p-2 text-left">কোম্পানি — ব্রিড</th>
                  <th className="p-2 text-right">এখন সাইটে</th>
                  <th className="p-2 text-right">নতুন রেট</th>
                  <th className="p-2 text-right">আগের শিটে</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((r) => (
                  <tr key={r.key} className="border-t border-slate-100">
                    <td className="p-2">
                      <input type="checkbox" checked={!skip.has(r.key)} onChange={() => toggle(r.key)} className="cursor-pointer" />
                    </td>
                    <td className="p-2 font-semibold text-slate-800">
                      {r.label}
                      {r.isNew && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-black">নতুন যোগ হবে</span>}
                      {r.count < 20 && <span className="ml-1.5 text-[10px] text-amber-700 font-bold">({r.count}/২০ জোন)</span>}
                    </td>
                    <td className="p-2 text-right text-slate-500">{r.current ?? '—'}</td>
                    <td className="p-2 text-right font-black text-emerald-700">{r.todayRate}</td>
                    <td className="p-2 text-right text-slate-500">{r.prevRate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {plan.untouched.length > 0 && (
            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
              <b>এই শিটে রেট নেই, তাই আগের রেটই থাকবে ({plan.untouched.length}টি):</b>{' '}
              {plan.untouched.map((i) => `${String(i.company).split('(')[0].trim()} ${i.breed || ''}`.trim()).join(', ')}
              <br />দরকার হলে "বাচ্চার দর" ট্যাব থেকে এগুলো হাতে ঠিক করুন বা মুছে দিন।
            </div>
          )}

          <button
            onClick={() => onApply({ sheet, plan: { ...plan, rows: chosen } })}
            disabled={!chosen.length}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-black cursor-pointer"
          >
            <Check className="w-4 h-4" /> প্রয়োগ করুন ({chosen.length}টি রেট) ও প্রকাশ করুন
          </button>
        </div>
      )}
    </div>
  );
}
