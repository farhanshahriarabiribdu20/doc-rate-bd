import { normalizeGrade, GRADE_STYLE, hasGradeRates } from '../data/grades';
import GradeRates from './GradeRates';
import React from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import PriceChange from './PriceChange';
import FavStar from './FavStar';
import RateVote from './RateVote';
import { rateForRegion, zoneRegionName } from '../data/zones';
import { formatBn, formatEn, todayISO } from '../utils/date';

export default function RateCard({ item, selectedDivision, isStale = false, rateDateISO, isLowest = false, vote, fav, lang }) {
  const currentRate = rateForRegion(item, selectedDivision);
  const rateDateLabel = rateDateISO ? (lang === 'bn' ? formatBn(rateDateISO) : formatEn(rateDateISO)).split('(')[0].trim() : '';
  const isToday = rateDateISO === todayISO();


  const divisionRegionNames = {
    dhaka: { bn: 'সেন্ট্রাল জোন (ঢাকা বিভাগ)', en: 'Central Zone (Dhaka)' },
    mymensingh: { bn: 'সেন্ট্রাল জোন (ময়মনসিংহ বিভাগ)', en: 'Central Zone (Mymensingh)' },
    chittagong: { bn: 'ইস্ট জোন (চট্টগ্রাম বিভাগ)', en: 'East Zone (Chittagong)' },
    sylhet: { bn: 'ইস্ট জোন (সিলেট বিভাগ)', en: 'East Zone (Sylhet)' },
    rajshahi: { bn: 'নর্থ জোন (রাজশাহী বিভাগ)', en: 'North Zone (Rajshahi)' },
    rangpur: { bn: 'নর্থ জোন (রংপুর বিভাগ)', en: 'North Zone (Rangpur)' },
    khulna: { bn: 'সাউথ জোন (খুলনা বিভাগ)', en: 'South Zone (Khulna)' },
    barisal: { bn: 'সাউথ জোন (বরিশাল বিভাগ)', en: 'South Zone (Barisal)' }
  };

  const currentRegion = zoneRegionName(selectedDivision, lang) || ((selectedDivision !== 'all' && divisionRegionNames[selectedDivision])
    ? (lang === 'bn' ? divisionRegionNames[selectedDivision].bn : divisionRegionNames[selectedDivision].en)
    : (lang === 'bn' ? (item.regionBn || 'সেন্ট্রাল ও ইস্ট জোন') : (item.regionEn || 'Central & East Zone')));

  const getCategoryTheme = (cat) => {
    switch(cat) {
      case 'broiler':
        return { label: lang === 'bn' ? 'ব্রয়লার' : 'Broiler', bg: 'bg-orange-50 text-orange-700 border-orange-200/80', dot: 'bg-orange-500' };
      case 'sonali':
        return { label: lang === 'bn' ? 'সোনালী' : 'Sonali', bg: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' };
      case 'layer_brown':
        return { label: lang === 'bn' ? 'লেয়ার বাদামী' : 'Layer Brown', bg: 'bg-yellow-50 text-yellow-800 border-yellow-200/80', dot: 'bg-yellow-600' };
      case 'layer_white':
        return { label: lang === 'bn' ? 'লেয়ার সাদা' : 'Layer White', bg: 'bg-slate-50 text-slate-700 border-slate-200/80', dot: 'bg-slate-500' };
      default:
        return { label: lang === 'bn' ? 'ককরেল/অন্যান্য' : 'Cockerel', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' };
    }
  };

  const catTag = getCategoryTheme(item.category);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      {/* Top Header Card */}
      <div className="p-5 border-b border-slate-100 relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${catTag.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${catTag.dot}`}></span>
            <span>{catTag.label}</span>
          </span>

          {isStale ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
              <AlertTriangle className="w-3 h-3" />
              <span>{lang === 'bn' ? 'পুরনো রেট' : 'Outdated'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{lang === 'bn' ? 'ভেরিফাইড রেট' : 'Verified'}</span>
            </span>
          )}
        </div>

        {/* Company info */}
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition leading-snug break-words" title={item.company}>
            {item.company}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {lang === 'bn' ? 'জাত:' : 'Breed:'} <span className="text-slate-800 font-bold">{item.breed}</span>
          </p>
          {normalizeGrade(item.grade) !== 'none' && !hasGradeRates(item) && (
            <span className={`inline-flex items-center gap-1 mt-2 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs ${GRADE_STYLE[normalizeGrade(item.grade)]}`}>
              <span>★</span>
              <span>{lang === 'bn' ? `গ্রেড-${{ A: 'এ', B: 'বি', C: 'সি' }[normalizeGrade(item.grade)]} (Grade-${normalizeGrade(item.grade)})` : `Grade-${normalizeGrade(item.grade)}`}</span>
            </span>
          )}
        </div>

        <GradeRates item={item} region={selectedDivision} lang={lang} />

        {/* Region / Zone */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-900 bg-emerald-50/80 border border-emerald-200/70 px-2.5 py-1 rounded-xl w-fit">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-bold text-emerald-900">{lang === 'bn' ? 'অঞ্চল:' : 'Region:'}</span>
          <span className="font-semibold text-emerald-950 truncate max-w-[210px]" title={currentRegion}>
            {currentRegion}
          </span>
        </div>
      </div>

      {/* Middle Price Section */}
      <div className="p-5 bg-gradient-to-b from-slate-50/60 to-white flex-1 flex flex-col justify-between">
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {isToday
                ? (lang === 'bn' ? 'আজকের নির্ধারিত বাজারদর' : "Today's Official Rate")
                : (lang === 'bn' ? 'নির্ধারিত বাজারদর' : 'Official Rate')}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">৳{currentRate}</span>
              <span className="text-xs font-bold text-slate-500">/{lang === 'bn' ? 'পিস' : 'pc'}</span>
            </div>
            {isLowest && (
              <span className="inline-flex items-center gap-1 mt-1 ml-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white">
                💰 {lang === 'bn' ? 'সবচেয়ে কম দাম' : 'Lowest price'}
              </span>
            )}
            {rateDateLabel && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${isToday ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                📅 {rateDateLabel}
              </span>
            )}
          </div>

          <div className="text-right space-y-1">
            {selectedDivision === 'all' && (
              <PriceChange today={item.todayRate} yesterday={item.yesterdayRate} lang={lang} />
            )}
            <span className="block text-[10px] text-slate-500 font-semibold">
              {lang === 'bn' ? 'অফিসিয়াল রেট শিট' : 'Official rate sheet'}
            </span>
          </div>
        </div>

        {fav && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>{lang === 'bn' ? 'পছন্দের তালিকায়' : 'Favourite'}</span>
            <FavStar on={fav.on} onToggle={fav.onToggle} label={lang === 'bn' ? 'পছন্দের তালিকায় যোগ/বাদ' : 'Toggle favourite'} />
          </div>
        )}

        {vote && <RateVote item={item} counts={vote.counts} mine={vote.mine} onVote={vote.onVote} />}

        {/* Company note (only when there is one) */}
        {item.notes && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end text-xs">
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[11px]">
              {item.notes}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
