import React from 'react';
import { Pill, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function MedicineSection({ medicines, settings, lang }) {
  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
              {lang === 'bn' ? 'অত্যাবশ্যকীয় পোল্ট্রি ভ্যাকসিন ও মেডিসিনের দর' : 'Poultry Vaccines & Essentials'}
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            {lang === 'bn' ? 'খামারীদের জন্য নিয়মিত ব্যবহারের ভ্যাকসিন ও ওষুধের সরকার ও কোম্পানি নির্ধারিত দর' : 'Approved standard prices for poultry medicines and vaccines'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {medicines.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                  {item.type}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {item.packSize}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 text-base">{item.nameBn}</h4>
              <p className="text-xs text-slate-500 font-medium mb-2">{item.company}</p>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 leading-relaxed mb-3">
                <span className="font-bold text-slate-700 block mb-0.5">ব্যবহার নির্দেশিকা:</span>
                {item.indication}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">বর্তমান বাজারদর</span>
                <span className="text-2xl font-black text-emerald-700">৳{item.todayRate}</span>
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> স্টক প্রস্তুত
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
