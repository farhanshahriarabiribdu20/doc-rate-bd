import { normalizeGrade, GRADE_STYLE, hasGradeRates } from '../data/grades';
import GradeRates from './GradeRates';
import FavStar from './FavStar';
import React from 'react';
import { Printer, MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';
import PriceChange from './PriceChange';
import { rateForRegion, zoneRegionName } from '../data/zones';
import UserRateTag from './UserRateTag';
import { formatBn, formatEn } from '../utils/date';

export default function RateTable({ rates, selectedDivision, isStale = false, rateDateISO, favFor, lang }) {
  const handlePrint = () => {
    window.print();
  };


  const divisionRegionNames = {
    dhaka: { bn: 'সেন্ট্রাল জোন (ঢাকা)', en: 'Central Zone (Dhaka)' },
    mymensingh: { bn: 'সেন্ট্রাল জোন (ময়মনসিংহ)', en: 'Central Zone (Mymensingh)' },
    chittagong: { bn: 'ইস্ট জোন (চট্টগ্রাম)', en: 'East Zone (Chittagong)' },
    sylhet: { bn: 'ইস্ট জোন (সিলেট)', en: 'East Zone (Sylhet)' },
    rajshahi: { bn: 'নর্থ জোন (রাজশাহী)', en: 'North Zone (Rajshahi)' },
    rangpur: { bn: 'নর্থ জোন (রংপুর)', en: 'North Zone (Rangpur)' },
    khulna: { bn: 'সাউথ জোন (খুলনা)', en: 'South Zone (Khulna)' },
    barisal: { bn: 'সাউথ জোন (বরিশাল)', en: 'South Zone (Barisal)' }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900 text-sm sm:text-base">
              {lang === 'bn' ? 'সকল কোম্পানির পূর্ণাঙ্গ রেট তালিকা' : 'Complete Company Rate Sheet'}
            </h3>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {rates.length}টি লাইভ
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {lang === 'bn' ? 'প্রতিটি কোম্পানির অফিসিয়াল দর ও জোনভিত্তিক রেট' : 'Official rates and zone-wise prices across all brands'}
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs print:hidden"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>{lang === 'bn' ? 'শিট প্রিন্ট করুন' : 'Print Sheet'}</span>
        </button>
      </div>

      {/* Table responsive */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">{lang === 'bn' ? 'কোম্পানি' : 'Company / Brand'}</th>
              <th className="py-3.5 px-4">{lang === 'bn' ? 'ক্যাটাগরি, জাত ও অঞ্চল' : 'Category, Breed & Zone'}</th>
              <th className="py-3.5 px-4 text-right">{lang === 'bn' ? 'আজকের রেট' : "Today's Rate"}</th>
              <th className="py-3.5 px-4">{lang === 'bn' ? 'অফিসিয়াল কোম্পানি নোট' : 'Company Note'}</th>
              <th className="py-3.5 px-4 text-center">{lang === 'bn' ? 'ভেরিফিকেশন' : 'Verification'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rates.map((item) => {
              const currentRate = rateForRegion(item, selectedDivision);
              const byUser = selectedDivision === 'all' ? !!item.userAll : !!item.userZones?.[selectedDivision];
              const currentRegion = zoneRegionName(selectedDivision, lang) || ((selectedDivision !== 'all' && divisionRegionNames[selectedDivision])
                ? (lang === 'bn' ? divisionRegionNames[selectedDivision].bn : divisionRegionNames[selectedDivision].en)
                : (lang === 'bn' ? (item.regionBn || 'সেন্ট্রাল ও ইস্ট জোন') : (item.regionEn || 'Central & East Zone')));

              return (
                <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-3.5 px-4">
                    {favFor && <FavStar {...favFor(item)} label="পছন্দের তালিকায় যোগ/বাদ" />}
                    <span className="font-extrabold text-slate-900">{item.company}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800">{item.breed}</span>
                    {normalizeGrade(item.grade) !== 'none' && !hasGradeRates(item) && (
                      <span className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full align-middle ${GRADE_STYLE[normalizeGrade(item.grade)]}`}>★ Grade-{normalizeGrade(item.grade)}</span>
                    )}
                    <GradeRates item={item} region={selectedDivision} lang={lang} compact />
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-800">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-600">{currentRegion}</span>
                    </div>
                    <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-500 uppercase">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900">৳{currentRate}</span>
                    <span className="text-xs text-slate-500 font-semibold"> /পিস</span>
                    {rateDateISO && (
                      <div className="text-[10px] font-bold text-slate-500">📅 {(lang === 'bn' ? formatBn(rateDateISO) : formatEn(rateDateISO)).split('(')[0].trim()}</div>
                    )}
                    {selectedDivision === 'all' && (
                      <div className="mt-0.5"><PriceChange today={item.todayRate} yesterday={item.yesterdayRate} lang={lang} compact /></div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {item.notes ? (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold text-[11px]">
                        {item.notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {byUser ? (
                      <UserRateTag lang={lang} />
                    ) : isStale ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        <span>পুরনো রেট</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>যাচাইকৃত</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
