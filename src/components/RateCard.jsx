import React from 'react';
import { Phone, MessageCircle, Check, Clock, AlertTriangle, MapPin, ShieldCheck, Building2 } from 'lucide-react';

export default function RateCard({ item, selectedDivision, settings, onOpenBooking, lang }) {
  const currentRate = (selectedDivision !== 'all' && item.divisionRates && item.divisionRates[selectedDivision]) 
    ? item.divisionRates[selectedDivision] 
    : item.todayRate;

  const rawPhone = (settings?.whatsapp || item.bookingPhone || '01619500178').replace(/[^0-9]/g, '');
  let cleanPhone = rawPhone;
  if (rawPhone.startsWith('880')) {
    cleanPhone = rawPhone;
  } else if (rawPhone.startsWith('0')) {
    cleanPhone = '880' + rawPhone.slice(1);
  } else {
    cleanPhone = '880' + rawPhone;
  }

  const hotline = settings?.hotline || item.bookingPhone || '01619-500178';

  const waMessage = encodeURIComponent(
    `আসসালামু আলাইকুম, আমি ফসলনেক্সা (FosholNexa BD) পোর্টাল থেকে ${item.company} (${item.breed}) বাচ্চার আজকের দর ৳${currentRate} দেখেছি। আমি বাচ্চা বুকিং দিতে চাই।`
  );

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

  const currentRegion = (selectedDivision !== 'all' && divisionRegionNames[selectedDivision])
    ? (lang === 'bn' ? divisionRegionNames[selectedDivision].bn : divisionRegionNames[selectedDivision].en)
    : (lang === 'bn' ? (item.regionBn || 'সেন্ট্রাল ও ইস্ট জোন') : (item.regionEn || 'Central & East Zone'));

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

          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{lang === 'bn' ? 'ভেরিফাইড রেট' : 'Verified'}</span>
          </span>
        </div>

        {/* Company info */}
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition leading-snug break-words" title={item.company}>
            {item.company}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {lang === 'bn' ? 'জাত:' : 'Breed:'} <span className="text-slate-800 font-bold">{item.breed}</span>
          </p>
        </div>

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
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {lang === 'bn' ? 'আজকের নির্ধারিত বাজারদর' : "Today's Official Rate"}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">৳{currentRate}</span>
              <span className="text-xs font-bold text-slate-500">/{lang === 'bn' ? 'পিস' : 'pc'}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-full shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>১০০% নিশ্চিত</span>
            </span>
            <span className="block text-[10px] text-slate-400 mt-1 font-semibold">
              অফিসিয়াল রেট শিট
            </span>
          </div>
        </div>

        {/* Notes & Extra Info */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            {lang === 'bn' ? `ন্যূনতম বুকিং: ${item.minBooking || 500} পিস` : `Min: ${item.minBooking || 500} pcs`}
          </span>
          {item.notes ? (
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[11px]">
              {item.notes}
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">{lang === 'bn' ? 'ডেলিভারি প্রস্তুত' : 'Ready Delivery'}</span>
          )}
        </div>
      </div>

      {/* Action Buttons: WhatsApp & Direct Call */}
      <div className="p-3.5 sm:p-4 bg-slate-50/90 border-t border-slate-100 grid grid-cols-2 gap-2.5">
        <a
          href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
        >
          <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.587 1.745.882 2.791.882 3.181 0 5.768-2.587 5.768-5.766.001-3.181-2.585-5.768-5.768-5.768zm0-2.172c4.386 0 7.94 3.554 7.94 7.938 0 4.385-3.554 7.939-7.94 7.939-1.258 0-2.457-.308-3.528-.863l-4.503 1.18 1.203-4.397c-.636-1.121-.972-2.386-.972-3.859 0-4.384 3.554-7.938 7.94-7.938z"/>
          </svg>
          <span>{lang === 'bn' ? 'WhatsApp বুকিং' : 'WhatsApp'}</span>
        </a>

        <a
          href={`tel:${hotline.replace(/[^0-9+]/g, '')}`}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-600" />
          <span>{lang === 'bn' ? 'সরাসরি কল' : 'Call Now'}</span>
        </a>
      </div>
    </div>
  );
}
