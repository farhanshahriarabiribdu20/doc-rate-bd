import React, { useState, useEffect } from 'react';
import { track } from '../services/track';
import { X, Wrench, Wheat, BookOpen, Ruler, Syringe, Thermometer, TrendingUp, Egg, FlaskConical, HeartPulse, Calculator as CalcIcon } from 'lucide-react';
import FeedFcr from './tools/FeedFcr';
import BatchDiary from './tools/BatchDiary';
import ShedSpace from './tools/ShedSpace';
import VaccineSchedule from './tools/VaccineSchedule';
import Brooding from './tools/Brooding';
import PriceRisk from './tools/PriceRisk';
import LayerEggs from './tools/LayerEggs';
import FeedMix from './tools/FeedMix';
import Mortality from './tools/Mortality';

const TOOLS = [
  { id: 'fcr', label: 'FCR ও ফিড', icon: Wheat, desc: 'FCR বের করুন, ব্যাচে কত বস্তা ফিড লাগবে জানুন', C: FeedFcr },
  { id: 'diary', label: 'ব্যাচ ডায়েরি', icon: BookOpen, desc: 'প্রতিদিনের ফিড, মৃত্যু, খরচ লিখুন; শেষে লাভ-ক্ষতি', C: BatchDiary },
  { id: 'vaccine', label: 'টিকা সূচি', icon: Syringe, desc: 'বাচ্চা তোলার তারিখ দিলে টিকার তারিখ', C: VaccineSchedule },
  { id: 'brooding', label: 'ব্রুডিং গাইড', icon: Thermometer, desc: 'বয়স অনুযায়ী তাপমাত্রা, আর্দ্রতা ও আলো', C: Brooding },
  { id: 'space', label: 'শেড ও জায়গা', icon: Ruler, desc: 'শেডে কয়টি মুরগি ধরবে, ফিডার-ড্রিংকার কয়টি', C: ShedSpace },
  { id: 'risk', label: 'দামের ঝুঁকি', icon: TrendingUp, desc: 'ফিড ও বিক্রয়দর বদলালে লাভ-ক্ষতির ছক', C: PriceRisk },
  { id: 'layer', label: 'লেয়ার ডিম', icon: Egg, desc: 'হেন-ডে, প্রতি ডিমের খরচ, দৈনিক লাভ', C: LayerEggs },
  { id: 'mix', label: 'ফিড মিক্স', icon: FlaskConical, desc: 'নিজের ফিড ফর্মুলার প্রোটিন, শক্তি ও খরচ', C: FeedMix },
  { id: 'mort', label: 'মৃত্যুহার ক্ষতি', icon: HeartPulse, desc: 'মুরগি মরলে কত টাকা ক্ষতি', C: Mortality }
];

export default function FarmTools({ isOpen, onClose, onOpenProfit, initialTool }) {
  const [active, setActive] = useState('fcr');
  useEffect(() => { if (isOpen && initialTool && TOOLS.some((t) => t.id === initialTool)) setActive(initialTool); }, [isOpen, initialTool]);
  useEffect(() => { if (isOpen) track(`tool:${active}`); }, [isOpen, active]);
  if (!isOpen) return null;
  const tool = TOOLS.find((t) => t.id === active) || TOOLS[0];
  const Body = tool.C;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div role="dialog" aria-label="খামার টুলস" onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-3xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Wrench className="w-5 h-5" /></span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">খামার টুলস</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">খামারির হিসাব-নিকাশের ক্যালকুলেটর</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="বন্ধ করুন" className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto px-3 sm:px-4 py-2.5 border-b border-slate-100 shrink-0">
          <button onClick={onOpenProfit} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 cursor-pointer"><CalcIcon className="w-3.5 h-3.5" />লাভ-ক্ষতি</button>
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActive(t.id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition ${t.id === tool.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <p className="text-xs text-slate-500 mb-4">{tool.desc}</p>
          <Body key={tool.id} />
        </div>
      </div>
    </div>
  );
}
