import React, { useState, useEffect } from 'react';
import { X, Calculator as CalcIcon, Coins, Copy, Check } from 'lucide-react';

export default function Calculator(props) {
  if (!props.isOpen) return null;
  return <CalculatorContent {...props} />;
}

// Average of today's live rates for one category (0 when none)
const averageRate = (rates, category) => {
  const nums = (rates || []).filter((r) => r.category === category).map((r) => Number(r.todayRate)).filter((n) => n > 0);
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
};

const SAVE_KEY = 'fn_calc_inputs';
const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function CalculatorContent({ onClose, rates, lang }) {
  const saved = loadSaved();
  const liveBroiler = averageRate(rates, 'broiler');
  const liveSonali = averageRate(rates, 'sonali');
  const [chickType, setChickType] = useState(saved.chickType || 'broiler');
  const [chickCount, setChickCount] = useState(saved.chickCount ?? 1000);
  const [chickPrice, setChickPrice] = useState(saved.chickPrice ?? (liveBroiler || 40)); // live broiler average
  const [feedBagPrice, setFeedBagPrice] = useState(saved.feedBagPrice ?? (3400)); // 50kg bag
  const [feedPerBirdKg, setFeedPerBirdKg] = useState(saved.feedPerBirdKg ?? (3.0)); // 3kg per broiler
  const [medCostPerBird, setMedCostPerBird] = useState(saved.medCostPerBird ?? (15));
  const [mortalityRate, setMortalityRate] = useState(saved.mortalityRate ?? (4)); // 4%
  const [targetWeightKg, setTargetWeightKg] = useState(saved.targetWeightKg ?? (1.8));
  const [sellingPricePerKg, setSellingPricePerKg] = useState(saved.sellingPricePerKg ?? (185));

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ chickType, chickCount, chickPrice, feedBagPrice, feedPerBirdKg, medCostPerBird, mortalityRate, targetWeightKg, sellingPricePerKg }));
    } catch { /* storage unavailable */ }
  }, [chickType, chickCount, chickPrice, feedBagPrice, feedPerBirdKg, medCostPerBird, mortalityRate, targetWeightKg, sellingPricePerKg]);

  // Auto preset switch
  const handleTypeChange = (type) => {
    setChickType(type);
    if (type === 'broiler') {
      setChickPrice(liveBroiler || 40);
      setFeedPerBirdKg(3.0);
      setTargetWeightKg(1.8);
      setSellingPricePerKg(185);
      setMedCostPerBird(15);
    } else if (type === 'sonali') {
      setChickPrice(liveSonali || 63);
      setFeedPerBirdKg(2.2);
      setTargetWeightKg(0.85);
      setSellingPricePerKg(310);
      setMedCostPerBird(25);
    }
  };

  // Calculations
  const totalChickCost = chickCount * chickPrice;
  const feedCostPerKg = feedBagPrice / 50;
  const totalFeedKg = chickCount * feedPerBirdKg;
  const totalFeedCost = totalFeedKg * feedCostPerKg;
  const totalMedCost = chickCount * medCostPerBird;
  const totalInvestment = totalChickCost + totalFeedCost + totalMedCost;

  const survivingBirds = Math.round(chickCount * (1 - mortalityRate / 100));
  const totalWeightKg = Math.round(survivingBirds * targetWeightKg);
  const totalRevenue = totalWeightKg * sellingPricePerKg;
  const netProfit = totalRevenue - totalInvestment;
  const profitPerBird = survivingBirds > 0 ? Math.round(netProfit / survivingBirds) : 0;
  const costPerKgLive = totalWeightKg > 0 ? Math.round(totalInvestment / totalWeightKg) : 0;
  const fcr = totalWeightKg > 0 ? totalFeedKg / totalWeightKg : 0;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const scenarios = [-20, -10, 0, 10, 20].map((d) => ({ d, price: sellingPricePerKg + d, profit: totalWeightKg * (sellingPricePerKg + d) - totalInvestment }));
  const fmt = (n) => `${n >= 0 ? '+' : '-'}৳${Math.abs(Math.round(n)).toLocaleString()}`;
  const fmtShort = (n) => { const v = Math.abs(Math.round(n)); const t = v >= 10000000 ? `${(v / 10000000).toFixed(1)}কো` : v >= 100000 ? `${(v / 100000).toFixed(1)}লা` : v.toLocaleString(); return `${n >= 0 ? '+' : '-'}${t}`; };
  const copySummary = async () => {
    const bn = lang === 'bn';
    const text = bn
      ? `🐔 ব্যাচ হিসাব (FosholNexa BD)\nবাচ্চা: ${num(chickCount)} পিস × ৳${num(chickPrice)}\nমোট বিনিয়োগ: ৳${Math.round(totalInvestment).toLocaleString()}\nউৎপাদন খরচ: ৳${costPerKgLive}/কেজি, FCR ${fcr.toFixed(2)}\nবিক্রয় দর ৳${num(sellingPricePerKg)}/কেজিতে ${netProfit >= 0 ? 'লাভ' : 'ক্ষতি'}: ${fmt(netProfit)}\nfosholnexa.com`
      : `Batch estimate (FosholNexa BD)\nChicks: ${num(chickCount)} x ৳${num(chickPrice)}\nInvestment: ৳${Math.round(totalInvestment).toLocaleString()}\nCost: ৳${costPerKgLive}/kg, FCR ${fcr.toFixed(2)}\nAt ৳${num(sellingPricePerKg)}/kg: ${fmt(netProfit)}\nfosholnexa.com`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <CalcIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                {lang === 'bn' ? 'বাচ্চা ও খামার লাভ-ক্ষতি ক্যালকুলেটর' : 'Poultry Farm Profit Calculator'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'বাচ্চার রেট ও ফিডের দাম দিয়ে পুরো ব্যাচের বাজেট করুন' : 'Calculate chick cost, feed and net profit per batch'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Preset switch */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handleTypeChange('broiler')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                chickType === 'broiler' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'ব্রয়লার ব্যাচ' : 'Broiler Batch'}
            </button>
            <button
              onClick={() => handleTypeChange('sonali')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                chickType === 'sonali' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'সোনালী ব্যাচ' : 'Sonali Batch'}
            </button>
          </div>

          {/* Form inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'বাচ্চার সংখ্যা (পিস)' : 'Number of Chicks'}
              </label>
              <input
                type="number"
                value={chickCount}
                onChange={(e) => setChickCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'বাচ্চার দর (৳ প্রতি পিস)' : 'Chick Price (৳/pc)'}
              </label>
              {(chickType === 'broiler' ? liveBroiler : liveSonali) > 0 && (
                <button
                  type="button"
                  onClick={() => setChickPrice(chickType === 'broiler' ? liveBroiler : liveSonali)}
                  className="mb-1 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  {lang === 'bn'
                    ? `📈 আজকের লাইভ গড় রেট: ৳${chickType === 'broiler' ? liveBroiler : liveSonali} — ব্যবহার করুন`
                    : `📈 Today's live average: ৳${chickType === 'broiler' ? liveBroiler : liveSonali} — use it`}
                </button>
              )}
              <input
                type="number"
                value={chickPrice}
                onChange={(e) => setChickPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'ফিড প্রতি ৫০ কেজি বস্তা (৳)' : 'Feed 50kg Bag Price (৳)'}
              </label>
              <input
                type="number"
                value={feedBagPrice}
                onChange={(e) => setFeedBagPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'প্রতি মুরগিতে ফিড খাবে (কেজি)' : 'Feed per bird (kg)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={feedPerBirdKg}
                onChange={(e) => setFeedPerBirdKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'ওষুধ, টিকা ও অন্যান্য (৳/মুরগি)' : 'Medicine/Misc cost (৳/bird)'}
              </label>
              <input
                type="number"
                value={medCostPerBird}
                onChange={(e) => setMedCostPerBird(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'মর্টালিটি বা মৃত্যুহার (%)' : 'Expected Mortality (%)'}
              </label>
              <input
                type="number"
                value={mortalityRate}
                onChange={(e) => setMortalityRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'বিক্রয়কালীন গড় ওজন (কেজি)' : 'Avg Weight per Bird (kg)'}
              </label>
              <input
                type="number"
                step="0.05"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'প্রত্যাশিত বিক্রয় রেডি দর (৳/কেজি)' : 'Expected Sale Rate (৳/kg)'}
              </label>
              <input
                type="number"
                value={sellingPricePerKg}
                onChange={(e) => setSellingPricePerKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xl">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
              <Coins className="w-4 h-4" />
              {lang === 'bn' ? 'আনুমানিক ফলাফল ও লাভ-ক্ষতির চিত্র' : 'Cost & Profit Projections'}
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm border-b border-slate-700/80 pb-4 mb-4">
              <div>
                <span className="text-slate-400 block">{lang === 'bn' ? 'বাচ্চার মোট খরচ' : 'Total Chick Cost'}</span>
                <span className="text-base font-bold text-white">৳{totalChickCost.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'bn' ? 'ফিডের মোট খরচ' : 'Total Feed Cost'}</span>
                <span className="text-base font-bold text-white">৳{Math.round(totalFeedCost).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'bn' ? 'ওষুধ ও অন্যান্য' : 'Medicine Cost'}</span>
                <span className="text-base font-bold text-white">৳{totalMedCost.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-500 block">{lang === 'bn' ? 'মোট বিনিয়োগ' : 'Total Investment'}</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400">৳{Math.round(totalInvestment).toLocaleString()}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">উৎপাদন খরচ: ৳{costPerKgLive}/কেজি</span>
              </div>

              <div className={`p-3.5 rounded-xl border ${
                netProfit >= 0 ? 'bg-emerald-950/60 border-emerald-500/50' : 'bg-red-950/60 border-red-500/50'
              }`}>
                <span className="text-xs text-slate-300 block">
                  {lang === 'bn' ? (netProfit >= 0 ? 'আনুমানিক মোট লাভ' : 'আনুমানিক ক্ষতি') : 'Net Profit / Loss'}
                </span>
                <span className={`text-xl sm:text-2xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netProfit >= 0 ? '+' : ''}৳{Math.round(netProfit).toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-300 block mt-0.5">
                  প্রতি মুরগিতে: {netProfit >= 0 ? '+' : ''}৳{profitPerBird}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700">
                <span className="text-[11px] text-slate-400 block">FCR</span>
                <span className="text-base font-black text-white">{fcr ? fcr.toFixed(2) : '—'}</span>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700">
                <span className="text-[11px] text-slate-400 block">{lang === 'bn' ? 'লাভের হার' : 'Margin'}</span>
                <span className={`text-base font-black ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalRevenue > 0 ? `${margin.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700">
                <span className="text-[11px] text-slate-400 block">{lang === 'bn' ? 'ব্রেক-ইভেন দর' : 'Break-even'}</span>
                <span className="text-base font-black text-amber-400">{costPerKgLive ? `৳${costPerKgLive}` : '—'}</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] font-bold text-slate-400 mb-2">{lang === 'bn' ? 'বিক্রয় দর কমলে/বাড়লে লাভ-ক্ষতি (৳/কেজি)' : 'Profit if sale rate changes (৳/kg)'}</p>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {scenarios.map((sc) => (
                  <div key={sc.d} className={`rounded-lg py-2 px-1 border ${sc.d === 0 ? 'border-amber-400/70 bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}>
                    <span className="text-[10px] text-slate-400 block">৳{sc.price}</span>
                    <span className={`text-[10px] sm:text-xs whitespace-nowrap font-black ${sc.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtShort(sc.profit)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={copySummary} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer transition">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (lang === 'bn' ? 'হিসাব কপি করুন (শেয়ারের জন্য)' : 'Copy summary to share')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
