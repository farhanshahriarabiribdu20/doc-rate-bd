import React from 'react';
import { Phone, Printer, MapPin, ShieldCheck } from 'lucide-react';

export default function RateTable({ rates, selectedDivision, settings, onOpenBooking, lang }) {
  const handlePrint = () => {
    window.print();
  };

  const rawPhone = (settings?.whatsapp || '01619500178').replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.startsWith('880') ? rawPhone : (rawPhone.startsWith('0') ? '880' + rawPhone.slice(1) : '880' + rawPhone);
  const hotline = settings?.hotline || '01619-500178';

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
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden mb-6">
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
            {lang === 'bn' ? 'প্রতিটি কোম্পানির অফিশিয়াল দর, জোন ও বুকিং সরাসরি সম্পন্ন করুন' : 'Official rates, zones, and direct booking across all brands'}
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
              <th className="py-3.5 px-4 text-center print:hidden">{lang === 'bn' ? 'সরাসরি বুকিং' : 'Direct Booking'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rates.map((item) => {
              const currentRate = (selectedDivision !== 'all' && item.divisionRates && item.divisionRates[selectedDivision]) 
                ? item.divisionRates[selectedDivision] 
                : item.todayRate;
              const currentRegion = (selectedDivision !== 'all' && divisionRegionNames[selectedDivision])
                ? (lang === 'bn' ? divisionRegionNames[selectedDivision].bn : divisionRegionNames[selectedDivision].en)
                : (lang === 'bn' ? (item.regionBn || 'সেন্ট্রাল ও ইস্ট জোন') : (item.regionEn || 'Central & East Zone'));

              const waMessage = encodeURIComponent(
                `আসসালামু আলাইকুম, আমি ফসলনেক্সা (FosholNexa BD) তালিকা থেকে ${item.company} (${item.breed}) বাচ্চার রেট ৳${currentRate} দেখেছি। আমি বুকিং দিতে চাই।`
              );

              return (
                <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-slate-900">{item.company}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800">{item.breed}</span>
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
                    <span className="text-xs text-slate-400 font-semibold"> /পিস</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {item.notes ? (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold text-[11px]">
                        {item.notes}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">ন্যূনতম {item.minBooking || 500} পিস</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>১০০% নিশ্চিত</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center print:hidden">
                    <div className="flex items-center justify-center gap-1.5">
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp Booking"
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.587 1.745.882 2.791.882 3.181 0 5.768-2.587 5.768-5.766.001-3.181-2.585-5.768-5.768-5.768zm0-2.172c4.386 0 7.94 3.554 7.94 7.938 0 4.385-3.554 7.939-7.94 7.939-1.258 0-2.457-.308-3.528-.863l-4.503 1.18 1.203-4.397c-.636-1.121-.972-2.386-.972-3.859 0-4.384 3.554-7.938 7.94-7.938z"/>
                        </svg>
                      </a>
                      <a
                        href={`tel:${hotline.replace(/[^0-9+]/g, '')}`}
                        title="Call Hotline"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200 active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      </a>
                    </div>
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
