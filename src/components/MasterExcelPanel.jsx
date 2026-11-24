import React, { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Upload, Check, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { parseMasterWorkbook, planMasterImport, verifyMasterApplied } from '../utils/masterGrades';
import { MASTER_GRADES } from '../data/grades';
import { formatBn } from '../utils/date';

const SHOW = 25;

/**
 * Upload the "DOC Rate Master Grades" Excel: every company/breed with its A / M / B+ / B rate in each of the 20 zones.
 * The whole file is checked first. If anything is wrong the exact cells are listed and nothing can be applied.
 * After applying, the result is counted again against the file.
 */
export default function MasterExcelPanel({ rates, reportDateISO, onApply }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState([]);
  const [sheetIdx, setSheetIdx] = useState(-1);
  const [showAllWarn, setShowAllWarn] = useState(false);
  const [applied, setApplied] = useState(null); // { rows, count } waiting to be verified once `rates` has the new values

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setApplied(null);
    try {
      const { default: readExcelFile } = await import('read-excel-file/universal');
      const parsed = parseMasterWorkbook(await readExcelFile(file));
      if (!parsed.length) throw new Error('তারিখ-ভিত্তিক কোনো শিট পাওয়া যায়নি। শিটের নামে তারিখ থাকতে হবে, যেমন 24-11-2026।');
      setSheets(parsed);
      setSheetIdx(parsed.length - 1);
      setFileName(file.name);
      setShowAllWarn(false);
    } catch (err) {
      setSheets([]); setSheetIdx(-1);
      setError(err?.message || 'ফাইলটি পড়া যায়নি। এটি .xlsx ফাইল কি না দেখুন।');
    } finally { setBusy(false); }
  };

  const sheet = sheets[sheetIdx];
  const plan = useMemo(() => (sheet && !sheet.errors.length ? planMasterImport(sheet, rates) : null), [sheet, rates]);
  const canApply = Boolean(sheet && !sheet.errors.length && sheet.cells > 0 && plan?.rows.length);

  const check = useMemo(() => (applied ? verifyMasterApplied(rates, applied.rows) : null), [applied, rates]);

  const apply = () => {
    if (!canApply) return;
    setApplied({ rows: plan.rows, count: sheet.cells, name: sheet.name });
    onApply({ sheet, plan });
  };

  return (
    <div className="border-2 border-sky-300 bg-sky-50/60 rounded-2xl p-4 space-y-3">
      <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
        <FileSpreadsheet className="w-4 h-4 text-sky-700" /> মাস্টার গ্রেড এক্সেল আপলোড (A / M / B+ — ২০ জোন)
      </h4>
      <p className="text-xs text-slate-600 leading-relaxed">
        "DOC Rate Master Grades" ফাইল (.xlsx) আপলোড করুন। ফাইলের সব ঘর আগে যাচাই হয়। কোনো ভুল থাকলে ঠিক কোন ঘরে ভুল তা দেখানো হবে এবং কিছুই বসবে না।
        কার্ডের মূল রেট হবে <b>A গ্রেড</b>, আর A, M ও B+ — এই তিনটি গ্রেডের রেট কার্ডে দেখা যাবে। B গ্রেডের কলাম বাদ যাবে, সেখানে কিছু লেখা থাকলেও নেওয়া হবে না।
      </p>

      <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-xl text-xs font-black cursor-pointer">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {fileName ? 'অন্য ফাইল বেছে নিন' : 'মাস্টার এক্সেল বেছে নিন'}
      </button>
      {fileName && <span className="ml-2 text-xs text-slate-500 break-all">{fileName}</span>}

      {error && (
        <div className="flex items-start gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {sheet && (
        <div className="space-y-3">
          {sheets.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold text-slate-700">কোন তারিখের শিট:</label>
              <select value={sheetIdx} onChange={(e) => { setSheetIdx(Number(e.target.value)); setApplied(null); }} className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold">
                {sheets.map((s, i) => <option key={s.name} value={i}>{formatBn(s.dateISO)}{i === sheets.length - 1 ? ' — সর্বশেষ' : ''}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[['তারিখ', formatBn(sheet.dateISO).split('(')[0].trim()], ['পাওয়া রেট', sheet.cells], ['কোম্পানি-ব্রিড', sheet.columns.length], ['জোন', `${sheet.zonesFound}/২০`]].map(([k, v]) => (
              <div key={k} className="bg-white border border-slate-200 rounded-xl p-2">
                <p className="text-[10px] font-bold text-slate-500">{k}</p>
                <p className="text-sm font-black text-slate-900">{v}</p>
              </div>
            ))}
          </div>
          {reportDateISO && reportDateISO > sheet.dateISO && (
            <p className="text-[11px] font-bold text-amber-700">⚠️ সাইটের বর্তমান তারিখ এই ফাইলের চেয়ে নতুন ({formatBn(reportDateISO)})</p>
          )}

          {sheet.errors.length > 0 ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm font-black text-red-800"><XCircle className="w-4 h-4" /> {sheet.errors.length}টি ভুল পাওয়া গেছে — ঠিক করে আবার আপলোড করুন, কিছুই বসানো হয়নি</p>
              <ul className="text-xs text-red-900 space-y-0.5 max-h-56 overflow-y-auto">
                {sheet.errors.slice(0, 100).map((er, i) => (
                  <li key={i}><b className="font-mono bg-white border border-red-200 rounded px-1 mr-1">{er.cell}</b>{er.msg}</li>
                ))}
                {sheet.errors.length > 100 && <li>… আরও {sheet.errors.length - 100}টি</li>}
              </ul>
            </div>
          ) : sheet.cells === 0 ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs font-bold text-amber-900">ফাইলের রেটের ঘরগুলো ফাঁকা। রেট বসিয়ে আবার আপলোড করুন।</div>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-black text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5"><CheckCircle2 className="w-4 h-4" /> কোনো ভুল নেই — {sheet.cells}টি রেট বসানোর জন্য তৈরি</p>
          )}

          {sheet.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-black text-amber-900">⚠️ {sheet.warnings.length}টি সতর্কতা (বসানো আটকাবে না, তবে একবার দেখে নিন)</p>
              <ul className="text-[11px] text-amber-900 space-y-0.5">
                {(showAllWarn ? sheet.warnings : sheet.warnings.slice(0, SHOW)).map((w, i) => (
                  <li key={i}>{w.cell && <b className="font-mono bg-white border border-amber-200 rounded px-1 mr-1">{w.cell}</b>}{w.msg}</li>
                ))}
              </ul>
              {sheet.warnings.length > SHOW && (
                <button onClick={() => setShowAllWarn((v) => !v)} className="text-[11px] font-black text-amber-800 underline cursor-pointer">{showAllWarn ? 'কম দেখান' : `সব ${sheet.warnings.length}টি দেখুন`}</button>
              )}
            </div>
          )}

          {plan && plan.rows.length > 0 && (
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl max-h-80">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">কোম্পানি — ব্রিড</th>
                    <th className="p-2 text-right">এখন সাইটে</th>
                    <th className="p-2 text-right">নতুন (মূল)</th>
                    {MASTER_GRADES.map((g) => <th key={g} className="p-2 text-right">{g}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((r) => (
                    <tr key={r.key} className="border-t border-slate-100">
                      <td className="p-2 font-semibold text-slate-800">
                        {r.label}
                        {r.isNew && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-black">নতুন</span>}
                        {r.primary !== 'A' && <span className="ml-1.5 text-[10px] text-amber-700 font-bold">(A নেই, {r.primary} মূল ধরা হয়েছে)</span>}
                      </td>
                      <td className="p-2 text-right text-slate-500">{r.current ?? '—'}</td>
                      <td className="p-2 text-right font-black text-emerald-700">{r.todayRate}</td>
                      {MASTER_GRADES.map((g) => <td key={g} className="p-2 text-right text-slate-600">{r.gradeRates[g] ? Object.keys(r.gradeRates[g]).length : '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="p-2 text-[10px] text-slate-500">A/M/B+ কলামে সংখ্যাটি হলো সেই গ্রেডে কতটি জোনের রেট আছে।</p>
            </div>
          )}

          <button onClick={apply} disabled={!canApply} className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-sm font-black cursor-pointer">
            <Check className="w-4 h-4" /> প্রয়োগ করুন ({sheet.cells}টি রেট) ও প্রকাশ করুন
          </button>

          {check && applied && (
            <div className={`rounded-xl border-2 p-3 text-sm font-black ${check.found === check.expected ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
              {check.found === check.expected
                ? `✅ কাজ শেষ — ফাইলের ${check.expected}টি রেটের সবগুলো ঠিকঠাক বসেছে (মিলিয়ে দেখা হয়েছে)। কিছুক্ষণের মধ্যে সাইটে প্রকাশ হবে।`
                : `❌ ফাইলের ${check.expected}টির মধ্যে ${check.found}টি বসেছে। বাকি ${check.expected - check.found}টি বসেনি: ${check.missing.slice(0, 5).join(', ')}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
