import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle } from 'lucide-react';

export default function ShareModal(props) {
  if (!props.isOpen) return null;
  return <ShareModalContent {...props} />;
}

function ShareModalContent({ onClose, rates, notice, settings, lang }) {
  const [copied, setCopied] = useState(false);

  const fallbackDate = new Intl.DateTimeFormat('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const effectiveDate = settings?.reportDateBn || fallbackDate;

  // Build the text
  const broilerList = rates.filter(r => r.category === 'broiler').slice(0, 8);
  const sonaliList = rates.filter(r => r.category === 'sonali').slice(0, 6);
  const layerList = rates.filter(r => (r.category || '').startsWith('layer')).slice(0, 4);

  let shareText = `🌾 *আজকের মুরগির বাচ্চার বাজার দর (FosholNexa BD)* 🌾\n`;
  shareText += `📅 কার্যকর তারিখ: ${effectiveDate}\n`;
  shareText += `--------------------------------------\n\n`;

  shareText += `🔥 *ব্রয়লার বাচ্চার দর:* \n`;
  broilerList.forEach(r => {
    shareText += `▫️ ${r.companyEn || r.company}: ৳${r.todayRate}\n`;
  });

  shareText += `\n✨ *সোনালী বাচ্চার দর:* \n`;
  sonaliList.forEach(r => {
    shareText += `▫️ ${r.companyEn || r.company}: ৳${r.todayRate}\n`;
  });

  if (layerList.length > 0) {
    shareText += `\n🥚 *লেয়ার বাচ্চার দর:* \n`;
    layerList.forEach(r => {
      shareText += `▫️ ${r.companyEn || r.company}: ৳${r.todayRate}\n`;
    });
  }

  shareText += `\n📢 *মার্কেট নোট:* ${notice}\n`;
  shareText += `📞 বুকিং ও তথ্যের জন্য: ${settings?.hotline || '01619-500178'}\n`;
  shareText += `🌐 ভিজিট করুন: FosholNexa BD\n`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Fallback for browsers/contexts where the Clipboard API is unavailable
      const ta = document.createElement('textarea');
      ta.value = shareText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-lg">
              {lang === 'bn' ? 'সোশ্যাল মিডিয়ায় রেট শেয়ার করুন' : 'Share Rates on Social Media'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">
            {lang === 'bn' 
              ? 'নিচের রেট টেক্সটটি এক ক্লিকে কপি করে আপনার ফেসবুক পেজ, গ্রুপ বা হোয়াটসঅ্যাপে পোস্ট করতে পারেন:' 
              : 'Copy formatted rates to post directly on Facebook or WhatsApp groups:'}
          </p>

          <textarea
            readOnly
            rows={12}
            value={shareText}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 leading-relaxed focus:outline-none select-all"
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                copied ? 'bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'কপি করুন' : 'Copy Text')}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান' : 'Send WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
