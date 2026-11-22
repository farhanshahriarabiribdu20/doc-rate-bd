import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle } from 'lucide-react';
import { buildShareText, copyToClipboard } from '../utils/shareText';

export default function ShareModal(props) {
  if (!props.isOpen) return null;
  return <ShareModalContent {...props} />;
}

function ShareModalContent({ onClose, rates, notice, settings, lang }) {
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText({ rates, notice, settings });

  const handleCopy = async () => {
    await copyToClipboard(shareText);
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
